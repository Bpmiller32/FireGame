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

// Feel constants
// Horizontal roll speed along a girder.
const GROUND_SPEED = 14;
// Downward velocity pinned every frame while rolling — hugs the girders and
// slopes. Coincides with gravity but is hand-applied, not engine gravity.
const ROLL_FALL_SPEED = 9.8;
// Ladder-descent speed = GROUND_SPEED * this (≈9.1) — a touch slower than rolling.
const LADDER_DESCEND_FACTOR = 0.65;
// Seconds the ladder-bottom trigger is suppressed after a descent ends, so the
// barrel doesn't oscillate in and out of the descent at the foot of the ladder.
const LADDER_BOTTOM_COOLDOWN = 1.0;
// Chance to take a ladder once the oil can is lit (max static difficulty). While
// the can is unlit the barrel ALWAYS takes ladders — see DecideTakeLadder.
const LADDER_TAKE_CHANCE = 0.75;

// Crazy-barrel (BOUNCING) feel constants
// Downward acceleration integrated each frame for the crazy barrel's bounce arc
// (hand-applied, like ROLL_FALL_SPEED — not engine gravity, so it's predictable).
const BOUNCE_GRAVITY = 80;
// Terminal fall speed of a bouncing barrel.
const BOUNCE_MAX_FALL = 40;
// Upward velocity kicked on each girder contact — sets the bounce height.
const BOUNCE_IMPULSE = 28;
// Horizontal drift speed while bouncing (gentler than a roll so the toss reads as
// mostly vertical). Direction flips at walls.
const BOUNCE_DRIFT_SPEED = 8;

// Enemy — a DK barrel, two flavors picked at spawn (D28: data-driven, old CrazyEnemy folded in here).
// NORMAL barrel → starts ROLLING; rolls the girders and may take ladders (ROLLING ⇄ DESCENDING).
// CRAZY barrel → starts BOUNCING; vertically-tossed wild barrel, bounces girder-to-girder down the screen, never takes ladders.
// A crazy barrel never leaves BOUNCING and a normal never enters it, so State === BOUNCING is the "is this crazy?" discriminator.
// Explicit state machine mirroring the player FSM (ADR-0003). Its own movement reactions (reverse at walls, turn at
// edges, track grounded, bounce) live in the collision callbacks below; cross-entity GAME interactions
// (kills the Player, ignites the TrashCan) are NOT here — they live in the contact table (game/config/contactRules.ts).
export default class Enemy extends GameObject {
  private time!: Time; // engine clock; delta drives bounce integration

  // Roll movement (NORMAL barrel)
  private groundSpeed!: number;
  private direction!: number;
  private ladderSensorValue!: number;

  // Bounce movement (CRAZY barrel)
  private bounceVelocityY!: number; // current vertical velocity, integrated by gravity
  private bounceDirection!: number; // horizontal drift sign (+1 right / -1 left)

  // FSM state — DESCENDING means the barrel is taking a ladder. Public so the
  // engine StateMachine can read/dispatch it.
  public State!: EnemyState;
  private fsm!: StateMachine<Enemy, EnemyState>;

  // Per-frame inputs the handlers read. Refreshed at the top of Update.
  public IsGrounded!: boolean; // on a girder (event-owned by the collision callbacks)
  public IsInsideLadder!: boolean; // fully inside a ladder core this frame
  public IsAtLadderBottom!: boolean; // touching a ladder bottom (cooldown-gated)
  public DidJudgeLadder!: boolean; // rolled the take-ladder dice for this entry

  private ladderBottomCooldown!: number; // anti-oscillation timer at the ladder foot
  private currentTrashCan?: TrashCan; // the oil can, stashed each frame for the decision

  // Hoisted scratch + callback so the per-frame hot path allocates nothing (these
  // multiply with on-screen barrel count, the exact time you least want GC churn).
  private scratchVel = { x: 0, y: 0 };
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

    // At the ladder bottom — flag it (the DESCENDING handler ends the descent here)
    // AND arm the anti-oscillation cooldown immediately, on first contact in ANY
    // state, so a descent through an overlapping core+bottom sensor completes.
    if (
      GameUtils.IsColliderType(otherCollider, EntityType.LADDER_BOTTOM_SENSOR) &&
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
    crazy: boolean = false,
    bounceDirection: number = 1
  ) {
    super();

    this.createObjectPhysics(
      EntityType.ENEMY,
      GameObjectType.SPHERE,
      { width: size, height: size },
      position,
      rotation,
      RAPIER.RigidBodyDesc.dynamic()
    );

    this.initializeEnemyAttributes(crazy, bounceDirection);

    // Collides with platforms and the player box. (Defining the collision
    // callbacks below auto-arms contact events — no enableContactEvents needed.)
    this.setCollisionGroup(CollisionGroups.ENEMY);
    this.setCollisionMask(
      CollisionGroups.PLATFORM | CollisionGroups.PLAYER_BOUNDING_BOX
    );
  }

  // initialize movement, flags, and the state machine
  private initializeEnemyAttributes(crazy: boolean, bounceDirection: number) {
    this.time = this.experience.Time;

    this.groundSpeed = GROUND_SPEED;
    this.direction = 1;
    this.ladderSensorValue = 0;

    this.bounceVelocityY = 0; // starts falling under integrated gravity
    if (bounceDirection >= 0) this.bounceDirection = 1;
    else this.bounceDirection = -1;

    this.IsGrounded = true; // assume grounded at spawn
    this.IsInsideLadder = false;
    this.IsAtLadderBottom = false;
    this.DidJudgeLadder = false;
    this.ladderBottomCooldown = 0;

    // The state machine dispatches to the handler for the enemy's current state
    // each frame; the enemy owns `State`, and handlers reassign it to transition.
    // The barrel flavor is chosen here by its starting state and never changes.
    if (crazy) this.State = EnemyStates.BOUNCING;
    else this.State = EnemyStates.ROLLING;
    this.fsm = new StateMachine<Enemy, EnemyState>(this, {
      [EnemyStates.ROLLING]: handleEnemyRolling,
      [EnemyStates.DESCENDING]: handleEnemyDescending,
      [EnemyStates.BOUNCING]: handleEnemyBouncing,
    });
  }

  // --- Callbacks ---

  // The barrel's own movement reactions to the world it rolls through: reverse at walls, track grounded
  // on platforms. (Killing the player / igniting the can are cross-entity verdicts — they live in contactRules.ts.)
  public OnCollisionEnter(other: GameObject): void {
    const otherCollider = other.PhysicsBody?.collider(0);
    if (!otherCollider) return;

    // CRAZY barrel: bounce off girders, flip drift at walls. Never grounds/rolls.
    if (this.State === EnemyStates.BOUNCING) {
      if (GameUtils.IsColliderType(otherCollider, EntityType.WALL)) {
        this.bounceDirection = this.bounceDirection * -1;
        return;
      }

      if (
        GameUtils.IsColliderType(otherCollider, EntityType.PLATFORM) ||
        GameUtils.IsColliderType(otherCollider, EntityType.ONE_WAY_PLATFORM)
      ) {
        // Only bounce when coming DOWN onto a girder (ignore contacts while
        // already rising), so a single landing produces one clean kick.
        if (this.bounceVelocityY <= 0) {
          this.bounceVelocityY = BOUNCE_IMPULSE;
        }
      }
      return;
    }

    // NORMAL barrel below — wall reverse + grounded tracking.

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

  // Leaving a platform: no longer grounded, and (while rolling) turn around so the barrel doesn't walk
  // off the edge. Suppressed while DESCENDING — taking a ladder intentionally leaves the platform downward.
  public OnCollisionExit(other: GameObject): void {
    // Crazy barrels don't ground or edge-turn — nothing to do on exit.
    if (this.State === EnemyStates.BOUNCING) return;

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

  // Decide whether to take the ladder the barrel is currently inside. Always take it while the oil can is
  // unlit (the relentless DK opening, until the first barrel lights the can); otherwise a fixed max-difficulty chance.
  public DecideTakeLadder(): boolean {
    if (!this.currentTrashCan?.IsOnFire) return true;
    return GameUtils.CalculatePercentChance(LADDER_TAKE_CHANCE);
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

    let vx = -this.groundSpeed;
    if (this.direction >= 0) vx = this.groundSpeed;
    this.scratchVel.x = vx;
    this.scratchVel.y = -ROLL_FALL_SPEED;
    this.PhysicsBody!.setLinvel(this.scratchVel, true);
  }

  // Take the ladder: drop platform collisions and move straight down.
  public DescendLadder() {
    // Drop PLATFORM so the barrel passes through girders; ALWAYS keep the player
    // box so it can still kill the player while descending.
    this.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX);
    this.scratchVel.x = 0;
    this.scratchVel.y = -this.groundSpeed * LADDER_DESCEND_FACTOR;
    this.PhysicsBody!.setLinvel(this.scratchVel, true);
  }

  // CRAZY barrel: integrate the bounce arc. Gravity pulls the vertical velocity down each frame (clamped to a
  // terminal speed); the upward kick is applied on girder contact in OnCollisionEnter. Horizontal drift carries it
  // across the girders down the screen. Keeps PLATFORM in its mask the whole time so it bounces off (and stays able to kill the player).
  public Bounce() {
    this.bounceVelocityY -= BOUNCE_GRAVITY * this.time.Delta;
    if (this.bounceVelocityY < -BOUNCE_MAX_FALL) {
      this.bounceVelocityY = -BOUNCE_MAX_FALL;
    }

    let vx = -BOUNCE_DRIFT_SPEED;
    if (this.bounceDirection >= 0) vx = BOUNCE_DRIFT_SPEED;
    this.scratchVel.x = vx;
    this.scratchVel.y = this.bounceVelocityY;
    this.PhysicsBody!.setLinvel(this.scratchVel, true);
  }

  // --- Per-frame ---

  // Refresh this frame's ladder inputs by polling sensor intersections (NOT event-driven — the hard-won
  // "fully inside" climb idiom, D9), gated by the bottom cooldown. The handlers consume these flags.
  private checkLadderIntersections() {
    if (this.ladderBottomCooldown > 0) {
      this.ladderBottomCooldown -= this.time.Delta;
    }

    this.IsInsideLadder = false;
    this.IsAtLadderBottom = false;

    // Poll intersections with the hoisted callback (this.onLadderIntersection) — no
    // per-frame closure allocation. (Not event-driven: the "fully inside" climb
    // idiom, D9, needs continuous polling.)
    this.Physics.World.intersectionPairsWith(
      this.PhysicsBody!.collider(0),
      this.onLadderIntersection
    );
  }

  public Update(player: Player, trashCan?: TrashCan) {
    // Uniform update contract: the enemy ignores the player (it doesn't track or
    // chase) and reads the trash can (the oil can) for its ladder decision.
    void player;

    if (this.IsBeingDestroyed) {
      return;
    }

    // Stash this frame's inputs, refresh ladder state, run the current state.
    // Crazy (BOUNCING) barrels never take ladders, so skip the poll for them.
    this.currentTrashCan = trashCan;
    if (this.State !== EnemyStates.BOUNCING) {
      this.checkLadderIntersections();
    }
    this.fsm.Update();

    this.syncGraphicsToPhysics();
  }
}
