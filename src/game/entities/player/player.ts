import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d-compat";
import Time from "../../../engine/core/time";
import InputSource from "../../../engine/types/inputSource";
import Debug from "../../../engine/debug/debug";
import PlayerDebug from "../../debug/playerDebug";
import ResourceLoader from "../../../engine/resources/resourceLoader";
import PlayerDirection from "../../../engine/types/playerDirection";
import InputState from "../../../engine/types/inputState";
import SpriteAnimator from "../../../engine/rendering/spriteAnimator";
import SpriteAnimations from "./spriteAnimations";
import PlayerStates, { PlayerState } from "../../../engine/types/playerStates";
import handlePlayerIdle from "./states/handlePlayerIdle";
import handlePlayerFalling from "./states/handlePlayerFalling";
import handlePlayerRunning from "./states/handlePlayerRunning";
import handlePlayerJumping from "./states/handlePlayerJumping";
import GameObject from "../../../engine/entities/gameObject";
import StateMachine from "../../../engine/entities/stateMachine";
import ContactPoints from "../../../engine/types/contactPoints";
import GameObjectType from "../../../engine/types/gameObjectType";
import setDkAttributes from "../../attributes/setDkAttributes";
import GameUtils from "../../gameUtils";
import handlePlayerClimbing from "./states/handlePlayerClimbing";
import CollisionGroups from "../../types/gameCollisionGroups";
import EntityType from "../../types/entityType";
import Platform from "../platform";

export default class Player extends GameObject {
  // Experience
  public Time!: Time;
  public Input!: InputState;
  // Depends on the InputSource INTERFACE, not the concrete keyboard device, so a
  // touch / gamepad / network / replay source drops in with no Player changes.
  private inputDevice!: InputSource;
  public Debug?: Debug;
  public Resources!: ResourceLoader;

  // Player state
  public Direction!: number;
  public CurrentPosition!: RAPIER.Vector2;
  public NextTranslation!: RAPIER.Vector2;

  public State!: PlayerState;
  private fsm!: StateMachine<Player, PlayerState>;

  // Hoisted predicates + scratch vectors so the per-frame hot path (4 shapecasts +
  // the KCC move) allocates NOTHING: these are created ONCE, not per call. (Rapier
  // reads the vectors synchronously, so reusing them across calls is safe.) This is
  // the main fix for periodic GC stutter.
  private moveFilter = (collider: RAPIER.Collider): boolean =>
    !(collider.isSensor() || this.isActiveOneWayPlatform(collider));
  private shapeCastFilter = (collider: RAPIER.Collider): boolean => {
    // Penetrate sensors, active one-way platforms, and enemies — only solid
    // platform/ground counts as a shapecast hit.
    if (collider.isSensor()) return false;
    if (this.isActiveOneWayPlatform(collider)) return false;
    if (GameUtils.IsColliderType(collider, EntityType.ENEMY)) return false;
    return true;
  };
  private scratchDesired = { x: 0, y: 0 };
  private scratchNext = { x: 0, y: 0 };
  private scratchCastOrigin = { x: 0, y: 0 };
  private scratchCastDir = { x: 0, y: 0 };

  // KCC contact edge tracking: diff this frame's character-controller contacts vs
  // last frame's so we dispatch true "enter"/"exit" EDGES (not "enter" every frame).
  private currentContacts = new Set<GameObject>();
  private previousContacts = new Set<GameObject>();

  public CharacterController!: RAPIER.KinematicCharacterController;
  public ColliderOffset!: number;
  public ColliderOffsetThreshold!: number;
  public IsTouching!: ContactPoints;
  public CurrentFloor!: number;

  // Capsule collider tuning (Feel-Lab tunable; set in baseFeel).
  public AirColliderHeightScale!: number; // fraction of full half-height kept airborne
  public AirColliderGrowDistance!: number; // ground clearance (toi) to grow back in air
  public SnapToGroundDistance!: number; // KCC snap-to-ground distance
  public MaxSlopeClimbDegrees!: number; // steepest slope the player can climb
  public MinSlopeSlideDegrees!: number; // slope angle past which it slides down

  // Cached capsule sizes (read off the collider after creation) for the air-shrink.
  private fullHalfHeight = 0;
  private colliderRadius = 0;
  private colliderIsAirborne = false;
  // Rapier's own grounded verdict from the last move — robust ground signal that
  // doesn't flicker on slope/step descents like the tiny down-shapecast threshold.
  private kccGrounded = false;

  public SpriteAnimator!: SpriteAnimator;

  // Player attributes
  public MaxClimbSpeed!: number;
  public ClimbAcceleration!: number;
  public ClimbDeceleration!: number;

  public MaxGroundSpeed!: number;
  public GroundAcceleration!: number;
  public GroundDeceleration!: number;
  public AirAcceleration!: number;
  public AirDeceleration!: number;

  public MaxFallSpeed!: number;
  public FallAcceleration!: number;
  public RiseGravity!: number;
  public JumpEndedEarlyGravityModifier!: number;
  public ApexHangThreshold!: number;
  public ApexHangMult!: number;
  public EndedJumpEarly!: boolean;

  public JumpPower!: number;

  public CoyoteAvailable!: boolean;
  public CoyoteCount!: number;

  public BufferJumpRange!: number;
  public GroundWithinBufferRange!: boolean;
  public BufferJumpAvailable!: boolean;
  public WasBufferJumpUsed!: boolean;
  public BufferJumpCount!: number;

  public TimeJumpWasEntered!: number;
  public TimeFallWasEntered!: number;
  public MinJumpTime!: number;
  public CoyoteTime!: number;

  public AnimationScalingFactor!: number; // sprite animation playback speed scale

  public constructor(
    size: { width: number; height: number },
    position: { x: number; y: number }
  ) {
    super();

    this.initializePlayerAttributes();
    this.setSpriteAnimator();
    this.setCharacterController();

    this.createObjectPhysics(
      EntityType.PLAYER,
      // Capsule: the rounded bottom glides over slopes/steps instead of catching on
      // a flat cuboid corner (fixes the downhill staircasing). createCollider maps
      // {1.75 x 4} -> capsule(1.125, 0.875).
      GameObjectType.CAPSULE,
      size,
      position,
      0,
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );

    this.createSpriteGraphics();

    // Cache the capsule dimensions for the air-shrink (the collider exists now).
    this.cacheColliderSizes();

    // Collider 0: Player bounding box — collides with platforms AND enemies.
    // Death now fires from this full bounding box via the contact table ("any
    // touch registers"); the old 62.5% hit-box sensor + its per-frame poll were
    // removed as dead code (re-add on demand if a stomp mechanic ever wants it).
    this.setCollisionGroup(CollisionGroups.PLAYER_BOUNDING_BOX, 0);
    this.setCollisionMask(CollisionGroups.PLATFORM | CollisionGroups.ENEMY, 0);

    // Enable collision events on the bounding box so it feeds the contact system
    if (this.PhysicsBody) {
      this.PhysicsBody.collider(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    }

    // Debug — the game registers its player debug module with the engine
    // coordinator; the engine never imports PlayerDebug.
    if (this.experience.Debug.IsActive) {
      this.Debug = this.experience.Debug;
      this.Debug.RegisterModule(new PlayerDebug(this));
    }
  }

  // set up experience refs, attributes, FSM, and contact flags
  private initializePlayerAttributes() {
    // Experience fields
    this.Time = this.experience.Time;
    this.inputDevice = this.experience.Input;
    this.Resources = this.experience.Resources;

    // Per-entity input snapshot, refreshed from the device each frame (D10:
    // input-as-data — a network/replay/AI source could fill this instead).
    this.Input = {
      isLeft: false,
      isRight: false,
      isLeftRightCombo: false,
      isNeitherLeftRight: true,
      isJump: false,
      isUp: false,
      isDown: false,
      isUpDownCombo: false,
      isNeitherUpDown: true,
    };

    // Set initial state and direction
    this.State = PlayerStates.IDLE;
    this.Direction = PlayerDirection.NEUTRAL;

    // Set movement, speed, jump, timer attributes special to game feel
    setDkAttributes(this);

    // The state machine dispatches to the handler for the player's current state
    // each frame; the player owns `state`, and handlers reassign it to transition.
    this.fsm = new StateMachine<Player, PlayerState>(this, {
      [PlayerStates.IDLE]: handlePlayerIdle,
      [PlayerStates.RUNNING]: handlePlayerRunning,
      [PlayerStates.FALLING]: handlePlayerFalling,
      [PlayerStates.JUMPING]: handlePlayerJumping,
      [PlayerStates.CLIMBING]: handlePlayerClimbing,
    });

    // Set physics variables
    this.ColliderOffset = 0.01;
    // Increased threshold significantly for better slope detection and prevent micro-falling
    // This allows player to maintain ground contact when moving down slopes
    this.ColliderOffsetThreshold = this.ColliderOffset + 0.015;
    this.CurrentPosition = new RAPIER.Vector2(0, 0);
    this.NextTranslation = new RAPIER.Vector2(0, 0);

    this.CurrentFloor = 0;

    this.IsTouching = {
      ground: false,
      ceiling: false,
      leftSide: false,
      rightSide: false,

      edgePlatform: false,

      ladderCore: false,
      ladderTop: false,
      ladderBottom: false,
    };
  }

  private setSpriteAnimator() {
    // Set initial sprite loop
    this.SpriteAnimator = new SpriteAnimator(this.Resources.Items.randy as THREE.Texture, 4, 6);
    this.SpriteAnimator.State = SpriteAnimations.IDLE_RIGHT;
    this.setMaterial(this.SpriteAnimator.Material, 4);
  }

  // build the sprite mesh and add it to the scene
  private createSpriteGraphics() {
    this.mesh = new THREE.Sprite(this.material as THREE.SpriteMaterial);

    if (this.spriteScale) {
      this.mesh.scale.set(this.spriteScale, this.spriteScale, this.spriteScale);
    }

    this.scene.add(this.mesh);
    this.syncGraphicsToPhysics();
  }

  private setCharacterController() {
    // Independent character controller (exclusively the Player's).
    this.CharacterController = this.Physics.World.createCharacterController(
      this.ColliderOffset
    );
    // Autostep over short ledges (height <= 0.5, min width 0.2, include dynamics).
    this.CharacterController.enableAutostep(0.5, 0.2, true);
    // Snap-to-ground + slope limits come from Feel attributes, (re)applied each
    // frame in applyControllerTuning so they're live-tunable in the slope lab.
    this.applyControllerTuning();
  }

  // (Re)apply the Feel-Lab-tunable controller settings. Called each frame so snap +
  // slope limits can be dialed live; cheap (a few wasm setter calls).
  private applyControllerTuning() {
    this.CharacterController.enableSnapToGround(this.SnapToGroundDistance);
    this.CharacterController.setMaxSlopeClimbAngle(
      (this.MaxSlopeClimbDegrees * Math.PI) / 180
    );
    this.CharacterController.setMinSlopeSlideAngle(
      (this.MinSlopeSlideDegrees * Math.PI) / 180
    );
  }

  // Cache the capsule's full + airborne half-heights and its radius for the
  // air-shrink (read off the live collider after creation).
  private cacheColliderSizes() {
    const collider = this.PhysicsBody?.collider(0);
    if (!collider) return;
    this.fullHalfHeight = collider.halfHeight();
    this.colliderRadius = collider.radius();
    this.colliderIsAirborne = false;
  }

  // Shrink (airborne) / restore (grounded) the player's capsule HEIGHT. Uses
  // setShape — NOT setHalfHeight — because Rapier lazily caches collider.shape:
  // setShape updates BOTH the wasm collider and that cache, so the 4 ground/wall
  // shapecasts (which read collider(0).shape) stay in lockstep with the controller.
  // Center-fixed (the capsule is centered on the body), so the body never moves and
  // the sprite never pops; shrinking simply raises the feet. Idempotent.
  public SetColliderAirborne(airborne: boolean) {
    if (airborne === this.colliderIsAirborne) return;
    const collider = this.PhysicsBody?.collider(0);
    if (!collider) return;
    // Compute the air half-height LIVE from the scale, so the Feel-Lab slider tunes
    // it without a reload.
    const halfHeight = airborne
      ? this.fullHalfHeight * this.AirColliderHeightScale
      : this.fullHalfHeight;
    collider.setShape(new RAPIER.Capsule(halfHeight, this.colliderRadius));
    this.colliderIsAirborne = airborne;
  }

  // advance the state machine and the sprite animation
  private updatePlayerState() {
    this.fsm.Update();

    // Update the sprite state
    this.SpriteAnimator.Update(this.Time.Delta);
  }

  // move the kinematic body and dispatch its contacts
  private updateTranslation() {
    // Re-apply the live-tunable controller settings (snap, slope limits) each step.
    this.applyControllerTuning();

    // Update player position to a variable
    const position = this.PhysicsBody!.translation();
    this.CurrentPosition.x = position.x;
    this.CurrentPosition.y = position.y;

    // Desired translation scaled by the (fixed) timestep — reuse a scratch object.
    this.scratchDesired.x = this.NextTranslation.x * this.Time.Delta;
    this.scratchDesired.y = this.NextTranslation.y * this.Time.Delta;

    // Given a desired translation, compute the actual translation possible given
    // obstacles. Predicate is hoisted (this.moveFilter) — don't collide with sensors
    // or active OneWayPlatforms; we DO collide with enemies (they stop the player).
    // (Tried CollisionGroups/filterGroups and EventQueue here — only the predicate
    // works usefully in Rapier 0.14.x.)
    this.CharacterController.computeColliderMovement(
      this.PhysicsBody!.collider(0),
      this.scratchDesired,
      undefined,
      undefined,
      this.moveFilter
    );

    // Apply the actual translation to the next kinematic translation (scratch reuse).
    const correctiveMovement = this.CharacterController.computedMovement();

    // Rapier's own grounded verdict from this move — a robust OR in ground detection
    // so a slope/step descent doesn't flicker RUNNING<->FALLING (see getShapeCast).
    this.kccGrounded = this.CharacterController.computedGrounded();

    this.scratchNext.x = this.CurrentTranslation.x + correctiveMovement.x;
    this.scratchNext.y = this.CurrentTranslation.y + correctiveMovement.y;
    this.PhysicsBody!.setNextKinematicTranslation(this.scratchNext);

    // Feed the character controller's own contacts into the contact table as proper
    // ENTER/EXIT EDGES. A kinematic character keeps a skin gap from the solids it
    // moves into, so Rapier fires NO collision event for the player-as-mover — but
    // the controller reports what it was blocked by THIS frame. numComputedCollisions
    // is a per-frame "currently touching" set, so we diff it against last frame and
    // dispatch only the edges. That keeps an "enter" rule (Enemy<->Player = gameOver)
    // firing ONCE on contact instead of every frame, and gives rules a real "exit".
    // Skip while paused so a frozen game-over screen doesn't churn.
    if (!this.Physics.IsPaused) {
      this.currentContacts.clear();
      const numCollisions = this.CharacterController.numComputedCollisions();
      for (let i = 0; i < numCollisions; i++) {
        const collision = this.CharacterController.computedCollision(i);
        if (!collision?.collider) {
          continue;
        }
        const other = this.Physics.GetGameObjectFromCollider(collision.collider);
        if (other && !other.IsBeingDestroyed) {
          this.currentContacts.add(other);
        }
      }

      // New contacts this frame → "enter".
      for (const other of this.currentContacts) {
        if (!this.previousContacts.has(other)) {
          this.Physics.Contacts.Dispatch("enter", this, other);
        }
      }
      // Contacts gone since last frame → "exit".
      for (const other of this.previousContacts) {
        if (!this.currentContacts.has(other) && !other.IsBeingDestroyed) {
          this.Physics.Contacts.Dispatch("exit", this, other);
        }
      }

      // Swap the two sets (no allocation); next frame clears `current` before refill.
      const swap = this.previousContacts;
      this.previousContacts = this.currentContacts;
      this.currentContacts = swap;
    }
  }

  private detectCollisions() {
    // Ground/wall contact sensing for the player is ShapeCast-based here. (The
    // CharacterController's numComputedCollisions() is separately fed into the
    // contact registry in updateTranslation above — the KCC two-sided dispatch.)
    this.resetCollisions();
    this.getShapeCastCollisions();
  }

  // Update ladder contact state from external sensor detection
  // Called by GameDirector until ladder sensors use proper callbacks
  public UpdateLadderState(top: boolean, core: boolean, bottom: boolean) {
    this.IsTouching.ladderTop = top;
    this.IsTouching.ladderCore = core;
    this.IsTouching.ladderBottom = bottom;
  }

  private resetCollisions() {
    // Use assign instead of replacing with a JS Object, fixes issue with dat.gui
    Object.assign(this.IsTouching, {
      ground: false,
      ceiling: false,
      leftSide: false,
      rightSide: false,
      edgePlatform: false,
      ladderCore: false,
      ladderTop: false,
      ladderBottom: false,
    });
  }

  // Resolve a collider to the Platform it belongs to (or undefined), so shapecasts
  // read named fields (FloorLevel / IsEdge / IsOneWayActive) not anonymous userData
  private getPlatform(collider: RAPIER.Collider): Platform | undefined {
    const go = this.Physics.GetGameObjectFromCollider(collider);
    if (go instanceof Platform) return go;
    return undefined;
  }

  // Is this collider an active one-way platform (currently pass-through)?
  // Replaces the old userData.value3 check; reads the platform's typed flag.
  private isActiveOneWayPlatform(collider: RAPIER.Collider): boolean {
    return this.getPlatform(collider)?.IsOneWayActive ?? false;
  }

  private getShapeCastCollisions() {
    // ShapeCast in all directions
    const shapeCasts = {
      down: this.shapeCast(PlayerDirection.NEUTRAL, PlayerDirection.DOWN),
      left: this.shapeCast(PlayerDirection.LEFT, PlayerDirection.NEUTRAL),
      right: this.shapeCast(PlayerDirection.RIGHT, PlayerDirection.NEUTRAL),
      up: this.shapeCast(PlayerDirection.NEUTRAL, PlayerDirection.UP),
    };

    // Detect ground collisions, ignore walls and active OneWayPlatforms
    const downCast = shapeCasts.down;
    if (
      downCast &&
      downCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderType(downCast.collider, EntityType.WALL) === false &&
      this.isActiveOneWayPlatform(downCast.collider) === false
    ) {
      // Establish that ground is being touched
      this.IsTouching.ground = true;

      // Read floor / edge from the platform we're standing on (named fields)
      const platform = this.getPlatform(downCast.collider);
      if (platform) this.CurrentFloor = platform.FloorLevel;
      else this.CurrentFloor = 0;
      if (platform) this.IsTouching.edgePlatform = platform.IsEdge;
      else this.IsTouching.edgePlatform = false;
    }

    // Robustness: also count grounded if Rapier's controller says so this frame.
    // Prevents the 1-frame RUNNING<->FALLING flicker (visible as staircasing) on
    // slope/step descents where the tiny down-cast threshold momentarily misses.
    if (this.kccGrounded) {
      this.IsTouching.ground = true;
    }

    // Detect ground within buffer jump range
    if (
      !this.IsTouching.ground &&
      downCast &&
      downCast.time_of_impact <= this.BufferJumpRange &&
      this.NextTranslation.y <= 0
    ) {
      this.GroundWithinBufferRange = true;
    } else {
      this.GroundWithinBufferRange = false;
    }

    // Detect left wall collisions, ignore OneWayPlatforms
    const leftCast = shapeCasts.left;
    if (
      leftCast &&
      leftCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderType(leftCast.collider, EntityType.ONE_WAY_PLATFORM) === false
    ) {
      this.IsTouching.leftSide = true;
    }

    // Detect right wall collisions, ignore OneWayPlatforms
    const rightCast = shapeCasts.right;
    if (
      rightCast &&
      rightCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderType(rightCast.collider, EntityType.ONE_WAY_PLATFORM) === false
    ) {
      this.IsTouching.rightSide = true;
    }

    // Detect ceiling collisions, ignore OneWayPlatforms
    const upCast = shapeCasts.up;
    if (
      upCast &&
      upCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderType(upCast.collider, EntityType.ONE_WAY_PLATFORM) === false
    ) {
      this.IsTouching.ceiling = true;
    }

    // ── Air collider shrink/grow (height-only, center-fixed, via setShape) ──────
    // Shrink the capsule while airborne so the player clears obstacles; grow it back
    // as the ground approaches while DESCENDING — in free air, before touchdown — so
    // it never grows INTO the floor (no landing pop). Full size whenever grounded.
    const descending = this.NextTranslation.y <= 0;
    const groundWithinGrow =
      !!downCast &&
      downCast.time_of_impact <= this.AirColliderGrowDistance &&
      GameUtils.IsColliderType(downCast.collider, EntityType.WALL) === false &&
      this.isActiveOneWayPlatform(downCast.collider) === false;
    const shouldBeAirborne =
      !this.IsTouching.ground && !(descending && groundWithinGrow);
    this.SetColliderAirborne(shouldBeAirborne);
  }

  private shapeCast(xDirection: number, yDirection: number) {
    // Without offset here, the x shapeCast collides with the shape's inner wall for
    // some reason. Reuse scratch vectors (Rapier reads them synchronously) so the 4
    // casts per frame allocate nothing.
    this.scratchCastOrigin.x =
      this.CurrentTranslation.x + this.ColliderOffset * xDirection;
    this.scratchCastOrigin.y =
      this.CurrentTranslation.y + this.ColliderOffset * yDirection;
    this.scratchCastDir.x = xDirection;
    this.scratchCastDir.y = yDirection;

    // Rapier 0.14.x castShape with a HOISTED predicate (this.shapeCastFilter) that
    // penetrates sensors / active one-way platforms / enemies to find solid ground.
    const hit = this.Physics.World.castShape(
      this.scratchCastOrigin,
      0,
      this.scratchCastDir,
      this.PhysicsBody!.collider(0).shape,
      0.0,
      1000,
      true,
      undefined, // filterFlags
      undefined, // filterGroups
      this.PhysicsBody!.collider(0), // Exclude collider 0
      this.PhysicsBody, // Exclude entire player rigid body (its single collider)
      this.shapeCastFilter
    );

    return hit;
  }

  // Force full collider size on teleport/reset, so a teleport while airborne (small)
  // doesn't land the player small for a frame. (super does the move + interp snap.)
  public TeleportToPosition(targetX: number, targetY: number) {
    super.TeleportToPosition(targetX, targetY);
    this.SetColliderAirborne(false);
  }

  public Update() {
    // Exit early if object is destroyed
    if (this.IsBeingDestroyed) {
      return;
    }

    // Refresh this entity's input snapshot before the state handlers read it.
    this.inputDevice.CaptureInto(this.Input);

    this.syncGraphicsToPhysics();
    this.updatePlayerState();
    this.updateTranslation();
    this.detectCollisions();
  }

  public Destroy() {
    // NOTE: do NOT emit "gameObjectRemoved" here. The director's handler for that
    // event calls .Destroy(), so self-emitting was unbounded recursion. Whatever
    // removes the player owns the emit (the same way enemies are removed).

    // Remove character controller from the physics world
    this.Physics.World.removeCharacterController(this.CharacterController);

    // Dispose of the sprite animator
    this.SpriteAnimator.Destroy();

    // Destroy base class resources
    super.Destroy();
  }
}
