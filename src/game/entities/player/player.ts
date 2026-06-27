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

  // Hoisted predicates + scratch vectors so the per-frame hot path (5 shapecasts + KCC
  // move) allocates nothing — created once, not per call. Main fix for GC stutter.
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
  // STRICT flatness (~0.8°): true only on truly axis-aligned ground. Drives the grounded
  // down-stick and the de-pen gate (de-pen's surfaceTop math is only valid for flat cuboids).
  public GroundIsFlat = true;
  // "Treat as flat for FEEL": ground normal within FlatToleranceDegrees of vertical (~7°).
  // Drives the run→fall edge launch. Wider than GroundIsFlat on purpose — don't unify.
  public GroundIsWalkableFlat = true;
  // Surface gradient dy/dx (= -normal.x/normal.y) from the last grounded frame; ~0 on flat.
  // Grounded stick sets vy = GroundSlopeDyDx * vx so ground speed equals flat speed on slopes.
  public GroundSlopeDyDx = 0;
  // Last frame's final ground verdict — feeds the snap-grace (see getShapeCastCollisions),
  // so a one-frame down-cast miss while walking a slope doesn't flicker RUNNING<->FALLING.
  private wasGroundedLastFrame = false;
  // Edge-platform flag from the LAST grounded frame. Read when leaving a platform (ground
  // already lost, so IsTouching.edgePlatform has cleared) to pick soft vs firm launch.
  public WasOnEdgePlatform = false;

  // KCC vertical movement on the LAST GROUNDED frame; handlePlayerRunning carries it into
  // the fall launch so running off a slope edge is seamless. Gate is load-bearing — ungated
  // it stores the first free-fall frame (the very frame the transition reads). Reset on teleport.
  public LastGroundedMoveY = 0;

  // De-pen DEEP-warn throttle: last Time.Elapsed the regression canary fired (see depenetrate).
  private lastDepenWarnTime = -1;

  // Capsule collider tuning (Feel-Lab tunable; set in baseFeel).
  public AirColliderHeightScale!: number; // fraction of full half-height kept airborne
  public AirColliderGrowDistance!: number; // ground clearance (toi) to grow back in air
  public SnapToGroundDistance!: number; // KCC snap-to-ground distance
  public MaxSlopeClimbDegrees!: number; // steepest slope the player can climb
  public MinSlopeSlideDegrees!: number; // slope angle past which it slides down
  public FlatToleranceDegrees!: number; // ramps within this of horizontal feel/launch as FLAT

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
    position: { x: number; y: number },
  ) {
    super();

    this.initializePlayerAttributes();
    this.setSpriteAnimator();
    this.setCharacterController();

    this.createObjectPhysics(
      EntityType.PLAYER,
      // Capsule: rounded bottom glides over slopes/steps instead of catching on a flat
      // cuboid corner. createCollider maps {1.75 x 4} -> capsule(1.125, 0.875).
      GameObjectType.CAPSULE,
      size,
      position,
      0,
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations(),
    );

    this.createSpriteGraphics();

    // Cache the capsule dimensions for the air-shrink (the collider exists now).
    this.cacheColliderSizes();

    // Collider 0: Player bounding box — collides with platforms AND enemies. Death fires
    // from this full bounding box via the contact table (any touch registers).
    this.setCollisionGroup(CollisionGroups.PLAYER_BOUNDING_BOX, 0);
    this.setCollisionMask(CollisionGroups.PLATFORM | CollisionGroups.ENEMY, 0);

    // Enable collision events on the bounding box so it feeds the contact system
    if (this.PhysicsBody) {
      this.PhysicsBody.collider(0).setActiveEvents(
        RAPIER.ActiveEvents.COLLISION_EVENTS,
      );
    }

    // Debug — the game registers its player debug module with the engine
    // coordinator; the engine never imports PlayerDebug.
    if (this.experience.Debug.IsActive) {
      this.Debug = this.experience.Debug;
      this.Debug.RegisterModule(new PlayerDebug(this));
    }
  }

  // --- Setup ---

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
    // Slightly wider than ColliderOffset so the down-cast keeps ground contact while
    // walking down slopes (prevents micro-falling).
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
    this.SpriteAnimator = new SpriteAnimator(
      this.Resources.Items.randy as THREE.Texture,
      4,
      6,
    );
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
      this.ColliderOffset,
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
      (this.MaxSlopeClimbDegrees * Math.PI) / 180,
    );
    this.CharacterController.setMinSlopeSlideAngle(
      (this.MinSlopeSlideDegrees * Math.PI) / 180,
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

  // --- Commands ---

  // Shrink (airborne) / restore (grounded) the player's capsule HEIGHT. Use setShape NOT
  // setHalfHeight: setShape also updates Rapier's cached collider.shape, which the 4
  // shapecasts read — so they stay in lockstep. Center-fixed (body never moves). Idempotent.
  public SetColliderAirborne(airborne: boolean) {
    if (airborne === this.colliderIsAirborne) return;
    const collider = this.PhysicsBody?.collider(0);
    if (!collider) return;
    // Air half-height computed LIVE from the scale, so the Feel-Lab slider tunes it live.
    const halfHeight = airborne
      ? this.fullHalfHeight * this.AirColliderHeightScale
      : this.fullHalfHeight;
    collider.setShape(new RAPIER.Capsule(halfHeight, this.colliderRadius));
    this.colliderIsAirborne = airborne;
  }

  // Update ladder contact state from external sensor detection
  // Called by GameDirector until ladder sensors use proper callbacks
  public UpdateLadderState(top: boolean, core: boolean, bottom: boolean) {
    this.IsTouching.ladderTop = top;
    this.IsTouching.ladderCore = core;
    this.IsTouching.ladderBottom = bottom;
  }

  // --- Per-frame ---

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

    // Decide the airborne capsule shrink/grow BEFORE the move is computed, so the KCC clamps
    // against the same shape World.step applies next step. See updateAirCollider.
    this.updateAirCollider();

    // Compute the actual movement given obstacles. moveFilter: don't collide with sensors
    // or active OneWayPlatforms; DO collide with enemies (they stop the player).
    this.CharacterController.computeColliderMovement(
      this.PhysicsBody!.collider(0),
      this.scratchDesired,
      undefined,
      undefined,
      this.moveFilter,
    );

    // Apply the actual translation to the next kinematic translation (scratch reuse).
    const correctiveMovement = this.CharacterController.computedMovement();

    // Rapier's own grounded verdict from this move — a robust OR in ground detection
    // so a slope/step descent doesn't flicker RUNNING<->FALLING (see getShapeCast).
    this.kccGrounded = this.CharacterController.computedGrounded();

    // Remember the vertical movement on the LAST GROUNDED frame (see LastGroundedMoveY). Gate
    // is load-bearing — ungated it stores the first free-fall frame the transition reads.
    if (this.kccGrounded) {
      this.LastGroundedMoveY = correctiveMovement.y;
    }

    this.scratchNext.x = this.CurrentTranslation.x + correctiveMovement.x;
    this.scratchNext.y = this.CurrentTranslation.y + correctiveMovement.y;
    this.PhysicsBody!.setNextKinematicTranslation(this.scratchNext);

    // Feed the KCC's own contacts into the contact table as ENTER/EXIT EDGES. A kinematic
    // mover keeps a skin gap, so Rapier fires NO collision event for it — but the controller
    // reports what blocked it this frame. Diff vs last frame so an "enter" rule (Enemy =
    // gameOver) fires ONCE, not every frame. Skip while paused so game-over doesn't churn.
    if (!this.Physics.IsPaused) {
      this.currentContacts.clear();
      const numCollisions = this.CharacterController.numComputedCollisions();
      for (let i = 0; i < numCollisions; i++) {
        const collision = this.CharacterController.computedCollision(i);
        if (!collision?.collider) {
          continue;
        }
        const other = this.Physics.GetGameObjectFromCollider(
          collision.collider,
        );
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
    // Ground/wall contact sensing is ShapeCast-based here. (KCC's numComputedCollisions is
    // fed into the contact registry separately, in updateTranslation.)
    this.resetCollisions();
    this.getShapeCastCollisions();
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
  private isActiveOneWayPlatform(collider: RAPIER.Collider): boolean {
    const platform = this.getPlatform(collider);
    if (!platform) return false;
    return platform.IsOneWayActive;
  }

  private getShapeCastCollisions() {
    // ShapeCast in all directions
    const shapeCasts = {
      down: this.shapeCast(PlayerDirection.NEUTRAL, PlayerDirection.DOWN),
      left: this.shapeCast(PlayerDirection.LEFT, PlayerDirection.NEUTRAL),
      right: this.shapeCast(PlayerDirection.RIGHT, PlayerDirection.NEUTRAL),
      up: this.shapeCast(PlayerDirection.NEUTRAL, PlayerDirection.UP),
    };

    // Detect ground, ignoring walls and active OneWayPlatforms. Solid down-cast = ground if
    // toi is within the tight threshold (STRICT), OR within SnapToGroundDistance while
    // grounded+descending (SNAP-GRACE). Snap-grace stops the RUNNING<->FALLING flicker when a
    // slope-walk blips above the tight threshold but snap-to-ground re-glues the feet anyway.
    const downCast = shapeCasts.down;
    const downIsSolidFloor =
      downCast !== null &&
      GameUtils.IsColliderType(downCast.collider, EntityType.WALL) === false &&
      this.isActiveOneWayPlatform(downCast.collider) === false;
    const strictGround =
      downIsSolidFloor &&
      downCast!.time_of_impact <= this.ColliderOffsetThreshold;
    const snapGraceGround =
      downIsSolidFloor &&
      this.wasGroundedLastFrame &&
      this.NextTranslation.y <= 0 &&
      downCast!.time_of_impact <= this.SnapToGroundDistance;

    if (strictGround || snapGraceGround) {
      // Establish that ground is being touched
      this.IsTouching.ground = true;

      // Read floor / edge from the platform we're standing on (named fields)
      const platform = this.getPlatform(downCast!.collider);
      if (platform) {
        this.CurrentFloor = platform.FloorLevel;
        this.IsTouching.edgePlatform = platform.IsEdge;
      } else {
        this.CurrentFloor = 0;
        this.IsTouching.edgePlatform = false;
      }

      // Slope-ness from the contact normal (|y| ≈ 1 flat, < 1 sloped): GroundIsFlat is STRICT
      // (axis-aligned), GroundIsWalkableFlat is within FlatToleranceDegrees. See field docs.
      const ny = downCast!.normal1.y;
      const normalY = Math.abs(ny);
      this.GroundIsFlat = normalY > 0.9999;
      this.GroundIsWalkableFlat =
        normalY >= Math.cos((this.FlatToleranceDegrees * Math.PI) / 180);
      // Surface gradient for the slope-follow stick (see applyGroundedStick). Guard a
      // near-zero ny (only happens on near-vertical walls, which aren't walkable ground).
      if (Math.abs(ny) > 0.001) {
        this.GroundSlopeDyDx = -downCast!.normal1.x / ny;
      } else {
        this.GroundSlopeDyDx = 0;
      }
    }

    // Also count grounded if Rapier's controller says so — prevents the 1-frame
    // RUNNING<->FALLING flicker on slope/step descents the tiny down-cast threshold misses.
    if (this.kccGrounded) {
      this.IsTouching.ground = true;
    }

    // Remember the edge state while grounded, so the FALLING transition can read it
    // after ground is lost (IsTouching.edgePlatform clears the moment you leave).
    if (this.IsTouching.ground) {
      this.WasOnEdgePlatform = this.IsTouching.edgePlatform;
    }

    // Latch this frame's final ground verdict for next frame's snap-grace test.
    this.wasGroundedLastFrame = this.IsTouching.ground;

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
      GameUtils.IsColliderType(
        leftCast.collider,
        EntityType.ONE_WAY_PLATFORM,
      ) === false
    ) {
      this.IsTouching.leftSide = true;
    }

    // Detect right wall collisions, ignore OneWayPlatforms
    const rightCast = shapeCasts.right;
    if (
      rightCast &&
      rightCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderType(
        rightCast.collider,
        EntityType.ONE_WAY_PLATFORM,
      ) === false
    ) {
      this.IsTouching.rightSide = true;
    }

    // Detect ceiling collisions, ignore OneWayPlatforms
    const upCast = shapeCasts.up;
    if (
      upCast &&
      upCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderType(upCast.collider, EntityType.ONE_WAY_PLATFORM) ===
        false
    ) {
      this.IsTouching.ceiling = true;
    }

    // Safety net: a clamped, positional-only catch for any residual floor overlap (see
    // depenetrate).
    this.depenetrate(shapeCasts.down, shapeCasts.up);
  }

  private shapeCast(xDirection: number, yDirection: number) {
    // Without offset here, the x shapeCast collides with the shape's inner wall. Reuse
    // scratch vectors so the 4 casts per frame allocate nothing.
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
      this.shapeCastFilter,
    );

    return hit;
  }

  // Choose airborne (shrunk) vs grounded (full) capsule BEFORE computeColliderMovement, so
  // the move uses the shape World.step applies. GROW guard refuses to grow back to full while
  // airborne near the surface (a center-fixed grow drops the feet into it). Reads last frame's
  // IsTouching.ground — detectCollisions hasn't run yet this step.
  private updateAirCollider() {
    const downProbe = this.shapeCast(
      PlayerDirection.NEUTRAL,
      PlayerDirection.DOWN,
    );
    const descending = this.NextTranslation.y <= 0;
    const feetDelta = this.fullHalfHeight * (1 - this.AirColliderHeightScale);
    const groundWithinGrow =
      downProbe !== null &&
      downProbe.time_of_impact <= this.AirColliderGrowDistance &&
      GameUtils.IsColliderType(downProbe.collider, EntityType.WALL) === false &&
      this.isActiveOneWayPlatform(downProbe.collider) === false;

    let shouldBeAirborne =
      !this.IsTouching.ground && !(descending && groundWithinGrow);

    // GROW guard: block the shrunk→full transition in mid-air when the feet are within
    // feetDelta+skin of the surface (growing there pushes the full feet below it).
    if (
      this.colliderIsAirborne &&
      !shouldBeAirborne &&
      !this.IsTouching.ground &&
      downProbe &&
      downProbe.time_of_impact <= feetDelta + this.ColliderOffset
    ) {
      shouldBeAirborne = true;
    }

    this.SetColliderAirborne(shouldBeAirborne);
  }

  // Safety net: clamped, positional-only de-penetration. If the full feet end up below a FLAT
  // solid surface, nudge the kinematic target UP to rest — never down, never a positive vy (so
  // no superbounce). Gated to flat ground + solid current-ground contact + vy<=0; clamped per
  // frame and by up-cast clearance so it can't pop the head through a ceiling.
  // Frequent/deep fires are the regression canary.
  private depenetrate(downCast: any, upCast: any) {
    const MAX_LIFT = 0.1; // per fixed step; heals the ~0.17u grow residual over ~2 frames
    const EPS = this.ColliderOffset; // resting-on-skin counts as "not penetrating"

    if (!this.IsTouching.ground || !this.GroundIsFlat) return;
    if (!downCast?.collider) return;
    if (this.isActiveOneWayPlatform(downCast.collider)) return;
    if (this.NextTranslation.y > 0) return;

    const he = (downCast.collider.shape as any).halfExtents;
    if (!he) return; // flat (axis-aligned) cuboid only

    const col = this.PhysicsBody!.collider(0);
    const feetBottomNext =
      this.scratchNext.y - (col.halfHeight() + col.radius());
    const surfaceTop = downCast.collider.translation().y + he.y;
    const penetration = surfaceTop - feetBottomNext; // > 0 ⇒ feet below the surface
    if (penetration <= EPS) return;

    // Never push the head into a ceiling: clamp the lift by the up-cast clearance.
    const ceilingClearance = upCast
      ? Math.max(0, upCast.time_of_impact - this.ColliderOffset)
      : Infinity;
    const lift = Math.min(penetration, MAX_LIFT, ceilingClearance);
    if (lift <= 0) return;

    this.scratchNext.y += lift;
    this.PhysicsBody!.setNextKinematicTranslation(this.scratchNext);
    // Positional only: never write a positive vy; kill residual downward drive so the next
    // step doesn't immediately re-bury the feet.
    if (this.NextTranslation.y < 0) this.NextTranslation.y = 0;

    // Deeper than the known grow residual ⇒ tunneling / a prevention regression, not the
    // expected ~0.17u grounded-grow drop. Warn loudly (rate-limited to ~2x/sec).
    if (penetration > 0.2 && this.Time.Elapsed - this.lastDepenWarnTime > 0.5) {
      this.lastDepenWarnTime = this.Time.Elapsed;
      console.warn(
        `[depen] DEEP ${penetration.toFixed(3)}u lift=${lift.toFixed(3)} ` +
          `state=${this.State} toi=${downCast.time_of_impact.toFixed(3)} ` +
          `halfH=${col.halfHeight().toFixed(3)} vy=${this.NextTranslation.y.toFixed(2)}`,
      );
    }
  }

  // Force full collider size on teleport/reset, so a teleport while airborne (small)
  // doesn't land the player small for a frame. (super does the move + interp snap.)
  public TeleportToPosition(targetX: number, targetY: number) {
    super.TeleportToPosition(targetX, targetY);
    this.SetColliderAirborne(false);
    // Reset the slope-edge carry so a respawn right after a descent can't leak a stale
    // downward velocity into the first airborne frame.
    this.LastGroundedMoveY = 0;
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

  // --- Teardown ---

  public Destroy() {
    // Do NOT emit "gameObjectRemoved" here — the director's handler calls .Destroy(), so
    // self-emitting is unbounded recursion. Whatever removes the player owns the emit.

    // Remove character controller from the physics world
    this.Physics.World.removeCharacterController(this.CharacterController);

    // Dispose of the sprite animator
    this.SpriteAnimator.Destroy();

    // Destroy base class resources
    super.Destroy();
  }
}
