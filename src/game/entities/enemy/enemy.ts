import RAPIER from "@dimforge/rapier2d-compat";
import Time from "../../../engine/core/time";
import GameObject from "../../../engine/entities/gameObject";
import GameObjectType from "../../../engine/types/gameObjectType";
import StateMachine from "../../../engine/entities/stateMachine";
import GameUtils from "../../gameUtils";
import CollisionGroups from "../../types/gameCollisionGroups";
import EntityType from "../../types/entityType";
import Player from "../player/player";
import TrashCan from "../trashCan";
import LadderSensor from "../ladderSensor";
import EnemyStates, { EnemyState } from "./enemyStates";
import handleEnemyRolling from "./states/handleEnemyRolling";
import handleEnemyDescending from "./states/handleEnemyDescending";
import handleEnemyBouncing from "./states/handleEnemyBouncing";
import handleEnemySeeking from "./states/handleEnemySeeking";
import EnemyTuning from "./enemyTuning";
import Emitter from "../../../engine/events/eventBus";

// All barrel feel lives in EnemyTuning (read fresh each frame; dat.gui sliders mutate it live). The one
// fixed mechanic constant stays here: the ladder-bottom trigger is suppressed this long after a descent,
// to stop oscillation at the ladder foot.
const LADDER_BOTTOM_COOLDOWN = 1.0;

// Enemy — a DK barrel, flavor picked at spawn by its starting FSM state (and never changed):
//  • ROLLING — rolls girders, may take ladders (ROLLING ⇄ DESCENDING); you jump over it.
//  • BOUNCING — bounces girder-to-girder down the screen, never takes ladders; you stand under it.
//  • SEEKING — "sideways" barrel: ignores platform geometry, wider hitbox, beelines through the shared
//    waypoint list then drifts off and despawns.
// Movement reactions live in the collision callbacks below; cross-entity verdicts (kill Player, ignite TrashCan) live in contactRules.ts.
export default class Enemy extends GameObject {
  private time!: Time; // engine clock; delta drives bounce integration

  // Roll movement (ROLLING barrel)
  private direction!: number;
  private ladderSensorValue!: number;

  // Bounce movement (BOUNCING barrel)
  private bounceVelocityY!: number; // current vertical velocity, integrated by gravity
  private bounceDirection!: number; // horizontal drift sign (+1 right / -1 left)

  // Seek movement (SEEKING "sideways" barrel)
  private waypoints!: { x: number; y: number }[]; // shared ordered path, beelined in order
  private waypointIndex!: number; // index of the waypoint currently being sought
  private driftRemaining!: number; // post-last-waypoint drift countdown before despawn

  // FSM state — DESCENDING means taking a ladder. Public so the StateMachine can read/dispatch it.
  public State!: EnemyState;
  private fsm!: StateMachine<Enemy, EnemyState>;

  // Per-frame inputs the handlers read. Refreshed at the top of Update.
  public IsGrounded!: boolean; // on a girder (event-owned by the collision callbacks)
  public IsInsideLadder!: boolean; // fully inside a ladder core this frame
  public IsAtLadderBottom!: boolean; // touching a ladder bottom (cooldown-gated)
  public DidJudgeLadder!: boolean; // rolled the take-ladder dice for this entry

  private ladderBottomCooldown!: number; // anti-oscillation timer at the ladder foot
  private currentTrashCan?: TrashCan; // the oil can, stashed each frame for the decision

  // Hoisted scratch + callback so the per-frame hot path allocates nothing (avoids GC churn with many barrels).
  private scratchVel = { x: 0, y: 0 };
  private lastSeekVel = { x: 0, y: 0 }; // last seek heading, reused while drifting off after the final waypoint
  private onLadderIntersection = (otherCollider: RAPIER.Collider) => {
    const ladder = this.Physics.GetGameObjectFromCollider(otherCollider);

    // Fully inside a ladder core with a climb direction — a descent candidate.
    if (
      GameUtils.IsColliderType(otherCollider, EntityType.LADDER_CORE_SENSOR) &&
      ladder instanceof LadderSensor &&
      ladder.Direction !== 0 &&
      GameUtils.IsObjectFullyInsideSensor(otherCollider, this)
    ) {
      this.ladderSensorValue = ladder.Direction;
      this.IsInsideLadder = true;
    }

    // At the ladder bottom — flag it, and arm the cooldown immediately on first
    // contact in ANY state, so a descent through an overlapping core+bottom sensor completes.
    if (
      GameUtils.IsColliderType(
        otherCollider,
        EntityType.LADDER_BOTTOM_SENSOR,
      ) &&
      this.ladderBottomCooldown <= 0
    ) {
      this.IsAtLadderBottom = true;
      this.ladderBottomCooldown = LADDER_BOTTOM_COOLDOWN;
    }
  };

  // --- Setup ---

  constructor(
    size: number,
    position: { x: number; y: number },
    rotation: number = 0,
    startState: EnemyState = EnemyStates.ROLLING,
    bounceDirection: number = 1,
    waypoints: { x: number; y: number }[] = [],
  ) {
    super();

    // Seeking barrels get a WIDER cuboid hitbox; rolling/bouncing keep the round barrel.
    const isSeeking = startState === EnemyStates.SEEKING;
    let shape: string = GameObjectType.SPHERE;
    let colliderSize = { width: size, height: size };
    if (isSeeking) {
      shape = GameObjectType.CUBE;
      colliderSize = { width: size * EnemyTuning.seekWidthMul, height: size };
    }

    this.createObjectPhysics(
      EntityType.ENEMY,
      shape,
      colliderSize,
      position,
      rotation,
      RAPIER.RigidBodyDesc.dynamic(),
    );

    this.initializeEnemyAttributes(startState, bounceDirection, waypoints);

    // Defining the collision callbacks below auto-arms contact events. Seeking barrels IGNORE platform
    // geometry (player box only); rolling/bouncing collide with platforms too.
    this.setCollisionGroup(CollisionGroups.ENEMY);
    if (isSeeking) {
      this.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX);
      // Seeking barrels fully drive their own velocity — no engine gravity, so the path stays a true
      // straight-line beeline (matches the other barrels' "hand-applied, not engine gravity" approach).
      this.PhysicsBody!.setGravityScale(0, true);
    } else {
      this.setCollisionMask(
        CollisionGroups.PLATFORM | CollisionGroups.PLAYER_BOUNDING_BOX,
      );
    }
  }

  // initialize movement, flags, and the state machine
  private initializeEnemyAttributes(
    startState: EnemyState,
    bounceDirection: number,
    waypoints: { x: number; y: number }[],
  ) {
    this.time = this.experience.Time;

    this.direction = 1;
    this.ladderSensorValue = 0;

    this.bounceVelocityY = 0; // starts falling under integrated gravity
    if (bounceDirection >= 0) this.bounceDirection = 1;
    else this.bounceDirection = -1;

    this.waypoints = waypoints;
    this.waypointIndex = 0;
    this.driftRemaining = 0;

    this.IsGrounded = true; // assume grounded at spawn
    this.IsInsideLadder = false;
    this.IsAtLadderBottom = false;
    this.DidJudgeLadder = false;
    this.ladderBottomCooldown = 0;

    // FSM dispatches to the current state's handler each frame; handlers reassign `State` to transition.
    // Barrel flavor is chosen here by its starting state and never changes.
    this.State = startState;
    this.fsm = new StateMachine<Enemy, EnemyState>(this, {
      [EnemyStates.ROLLING]: handleEnemyRolling,
      [EnemyStates.DESCENDING]: handleEnemyDescending,
      [EnemyStates.BOUNCING]: handleEnemyBouncing,
      [EnemyStates.SEEKING]: handleEnemySeeking,
    });
  }

  // --- Callbacks ---

  // The barrel's own movement reactions: reverse at walls, track grounded on platforms.
  // (Kill-player / ignite-can are cross-entity verdicts — they live in contactRules.ts.)
  public OnCollisionEnter(other: GameObject): void {
    const otherCollider = other.PhysicsBody?.collider(0);
    if (!otherCollider) return;

    // SEEKING barrel ignores platforms/walls (not in its mask); player-kill is handled in contactRules. Nothing to react to.
    if (this.State === EnemyStates.SEEKING) return;

    // BOUNCING barrel: bounce off girders, flip drift at walls. Never grounds/rolls.
    if (this.State === EnemyStates.BOUNCING) {
      if (GameUtils.IsColliderType(otherCollider, EntityType.WALL)) {
        this.bounceDirection = this.bounceDirection * -1;
        return;
      }

      if (
        GameUtils.IsColliderType(otherCollider, EntityType.PLATFORM) ||
        GameUtils.IsColliderType(otherCollider, EntityType.ONE_WAY_PLATFORM)
      ) {
        // Only bounce when coming DOWN (ignore contacts while rising) so one landing = one kick.
        if (this.bounceVelocityY <= 0) {
          this.bounceVelocityY = EnemyTuning.bounceImpulse;
        }
      }
      return;
    }

    // ROLLING barrel below — wall reverse + grounded tracking.

    // Wall — reverse direction.
    if (GameUtils.IsColliderType(otherCollider, EntityType.WALL)) {
      this.direction = this.direction * -1;
      return;
    }

    // One-way platform — grounded only when landing on top of it.
    if (GameUtils.IsColliderType(otherCollider, EntityType.ONE_WAY_PLATFORM)) {
      if (this.PhysicsBody!.translation().y > otherCollider.translation().y) {
        this.IsGrounded = true;
      }
      return;
    }

    // Solid platform — grounded.
    if (GameUtils.IsColliderType(otherCollider, EntityType.PLATFORM)) {
      this.IsGrounded = true;
      return;
    }
  }

  // Leaving a platform: no longer grounded, and (while ROLLING) turn around so it doesn't walk off the edge.
  // Suppressed while DESCENDING — taking a ladder intentionally leaves the platform downward.
  public OnCollisionExit(other: GameObject): void {
    // Bouncing/seeking barrels don't ground or edge-turn — nothing to do on exit.
    if (
      this.State === EnemyStates.BOUNCING ||
      this.State === EnemyStates.SEEKING
    )
      return;

    const otherCollider = other.PhysicsBody?.collider(0);
    if (!otherCollider) return;

    if (otherCollider.isSensor()) return;

    if (
      GameUtils.IsColliderType(otherCollider, EntityType.ONE_WAY_PLATFORM) ||
      GameUtils.IsColliderType(otherCollider, EntityType.PLATFORM)
    ) {
      this.IsGrounded = false;

      if (this.State === EnemyStates.ROLLING) {
        this.direction = this.direction * -1;
      }
    }
  }

  // --- Commands ---

  // Decide whether to take the ladder the barrel is inside. Always take it while the oil can is unlit;
  // otherwise a fixed chance.
  public DecideTakeLadder(): boolean {
    if (!this.currentTrashCan?.IsOnFire) return true;
    return GameUtils.CalculatePercentChance(EnemyTuning.ladderTakeChance);
  }

  // Face the roll the way the ladder sensor points (used when descent ends).
  public SnapDirectionToLadder() {
    if (this.ladderSensorValue > 0) {
      this.direction = 1;
    } else if (this.ladderSensorValue < 0) {
      this.direction = -1;
    }
  }

  // Roll along the girder. Keeps platform collisions while grounded.
  public RollHorizontally() {
    let mask: number = CollisionGroups.PLAYER_BOUNDING_BOX;
    if (this.IsGrounded) {
      mask = CollisionGroups.PLATFORM | CollisionGroups.PLAYER_BOUNDING_BOX;
    }
    this.setCollisionMask(mask);

    let vx = -EnemyTuning.groundSpeed;
    if (this.direction >= 0) vx = EnemyTuning.groundSpeed;
    this.scratchVel.x = vx;
    this.scratchVel.y = -EnemyTuning.rollFallSpeed;
    this.PhysicsBody!.setLinvel(this.scratchVel, true);
  }

  // Take the ladder: drop platform collisions and move straight down.
  public DescendLadder() {
    // Drop PLATFORM to pass through girders; ALWAYS keep the player box so it can still kill while descending.
    this.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX);
    this.scratchVel.x = 0;
    this.scratchVel.y =
      -EnemyTuning.groundSpeed * EnemyTuning.ladderDescendFactor;
    this.PhysicsBody!.setLinvel(this.scratchVel, true);
  }

  // BOUNCING barrel: integrate the bounce arc. Gravity pulls velocity down each frame (clamped to terminal); the upward
  // kick is applied on girder contact in OnCollisionEnter. Keeps PLATFORM in its mask the whole time so it bounces off.
  public Bounce() {
    this.bounceVelocityY -= EnemyTuning.bounceGravity * this.time.Delta;
    if (this.bounceVelocityY < -EnemyTuning.bounceMaxFall) {
      this.bounceVelocityY = -EnemyTuning.bounceMaxFall;
    }

    let vx = -EnemyTuning.bounceDriftSpeed;
    if (this.bounceDirection >= 0) vx = EnemyTuning.bounceDriftSpeed;
    this.scratchVel.x = vx;
    this.scratchVel.y = this.bounceVelocityY;
    this.PhysicsBody!.setLinvel(this.scratchVel, true);
  }

  // SEEKING barrel: ignores platforms and beelines straight at the current waypoint at a constant speed.
  // Reaching a waypoint advances to the next; past the last one it drifts in the final heading, then despawns.
  public SeekWaypoint() {
    // Finished the sequence (or no path) — coast in the last heading, then remove off-screen.
    if (this.waypointIndex >= this.waypoints.length) {
      this.driftOff();
      return;
    }

    const target = this.waypoints[this.waypointIndex];
    const pos = this.PhysicsBody!.translation();
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Reached it — advance. If that was the last waypoint, start the drift-off countdown.
    if (dist <= EnemyTuning.seekArrivalRadius) {
      this.waypointIndex = this.waypointIndex + 1;
      if (this.waypointIndex >= this.waypoints.length) {
        this.driftRemaining = EnemyTuning.seekDriftTime;
      }
    }

    // Straight-line constant-speed beeline toward the target (remember the heading for the drift-off).
    // Math.max guards a divide-by-zero when sitting exactly on the waypoint, so the heading stays valid.
    const inv = EnemyTuning.seekSpeed / Math.max(dist, 0.0001);
    this.scratchVel.x = dx * inv;
    this.scratchVel.y = dy * inv;
    this.lastSeekVel.x = this.scratchVel.x;
    this.lastSeekVel.y = this.scratchVel.y;
    this.PhysicsBody!.setLinvel(this.scratchVel, true);
  }

  // Post-last-waypoint: keep the last heading for a beat, then despawn (off-screen exit).
  private driftOff() {
    this.driftRemaining = this.driftRemaining - this.time.Delta;
    this.scratchVel.x = this.lastSeekVel.x;
    this.scratchVel.y = this.lastSeekVel.y;
    this.PhysicsBody!.setLinvel(this.scratchVel, true);
    if (this.driftRemaining <= 0) {
      Emitter.emit("gameObjectRemoved", this);
    }
  }

  // --- Per-frame ---

  // Refresh this frame's ladder inputs by polling sensor intersections — NOT event-driven; the "fully inside"
  // climb idiom needs continuous polling. Gated by the bottom cooldown.
  private checkLadderIntersections() {
    if (this.ladderBottomCooldown > 0) {
      this.ladderBottomCooldown -= this.time.Delta;
    }

    this.IsInsideLadder = false;
    this.IsAtLadderBottom = false;

    // Poll with the hoisted callback (onLadderIntersection) — no per-frame closure allocation.
    this.Physics.World.intersectionPairsWith(
      this.PhysicsBody!.collider(0),
      this.onLadderIntersection,
    );
  }

  public Update(player: Player, trashCan?: TrashCan) {
    // Uniform update contract: enemy ignores the player (no chasing); reads the trash can for its ladder decision.
    void player;

    if (this.IsBeingDestroyed) {
      return;
    }

    // Stash inputs, refresh ladder state, run the current state. Only rolling/descending barrels use ladders.
    this.currentTrashCan = trashCan;
    if (
      this.State === EnemyStates.ROLLING ||
      this.State === EnemyStates.DESCENDING
    ) {
      this.checkLadderIntersections();
    }
    this.fsm.Update();

    this.syncGraphicsToPhysics();
  }
}
