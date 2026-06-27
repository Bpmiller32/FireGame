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

// One frame of player physics state for the diagnostic ring buffer (Bug-1 capture).
// Mirrored to CSV by DumpDiagnostics; the named fields map 1:1 to the dump columns.
interface PlayerDiagFrame {
  frame: number;
  elapsed: number;
  state: string;
  vx: number;
  vyPre: number; // NextTranslation.y BEFORE the de-pen vy-clamp
  vyPost: number; // NextTranslation.y AFTER de-pen
  desY: number; // scratchDesired.y fed to the KCC
  movX: number; // computedMovement().x the KCC allowed
  movY: number; // computedMovement().y the KCC allowed
  lastGroundedMoveY: number; // the Bug-2 grounded-gated carry
  kccGrounded: boolean;
  ground: boolean;
  ceiling: boolean;
  groundIsFlat: boolean; // STRICT (~0.8°)
  walkableFlat: boolean; // within FlatToleranceDegrees (treated as flat for feel)
  snapGrace: boolean; // ground came from the snap-grace, not the strict cast
  toi: number; // down-cast time_of_impact
  downN1y: number;
  downN2y: number;
  halfHeight: number; // collider half-height this frame (shrunk vs full)
  radius: number;
  airborne: boolean; // colliderIsAirborne (which shape is live)
  centerY: number;
  dy: number; // per-step vertical delta of the body center
  feetBottom: number;
  surfaceTop: number; // flat down-contact top (NaN on slopes)
  feetGap: number; // feetBottom - surfaceTop; negative ⇒ penetration
  penetration: number; // de-pen measured overlap this frame
  depenLift: number; // de-pen lift applied this frame
  contactType: string; // EntityType of the down-contact body
  oneWayActive: boolean;
  snapDist: number;
  growDist: number;
  airScale: number;
  offsetThresh: number;
  maxFall: number;
}

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

  // Hoisted predicates + scratch vectors so the per-frame hot path (5 shapecasts — 4 in
  // detectCollisions + 1 in updateAirCollider — plus the KCC move) allocates NOTHING:
  // these are created ONCE, not per call. (Rapier
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
  // STRICT flatness (~0.8°): true only on truly axis-aligned ground. Drives the grounded
  // down-"stick" (flat → 0, slope → -MaxFallSpeed adhesion so the player follows slopes
  // DOWN) and the de-pen gate (its surfaceTop math is only valid for axis-aligned cuboids).
  public GroundIsFlat = true;
  // "Treat as flat for FEEL": true when the ground normal is within FlatToleranceDegrees of
  // vertical (default 7°). Drives the run→fall edge launch, so a shallow ramp gets the loved
  // flat soft-launch instead of the slope carry. Wider than GroundIsFlat on purpose.
  public GroundIsWalkableFlat = true;
  // Surface gradient dy/dx (= -normal.x/normal.y) from the last grounded frame. On a
  // walkable-flat slope the grounded stick sets vy = GroundSlopeDyDx * vx so the desired
  // move runs exactly along the slope tangent — the KCC then doesn't slide-project the
  // horizontal, so ground speed equals flat-ground speed both up and down. ~0 on flat.
  public GroundSlopeDyDx = 0;
  // Last frame's final ground verdict — feeds the snap-grace (see getShapeCastCollisions),
  // so a one-frame down-cast miss while walking a slope doesn't flicker RUNNING<->FALLING.
  private wasGroundedLastFrame = false;
  // The edge-platform flag from the LAST grounded frame. Used when leaving a
  // platform (ground already lost, so IsTouching.edgePlatform has cleared) to give
  // an edge platform a soft launch and a non-edge one a firm launch.
  public WasOnEdgePlatform = false;

  // Bug-2 (slope-edge launch): the KCC's vertical movement on the LAST GROUNDED frame
  // (gated to kccGrounded in updateTranslation). On a downhill slope this holds the
  // slope-clamped descent (~ -vx*tan θ); handlePlayerRunning carries it into the FALLING
  // launch so running off a slope edge is seamless instead of an anti-gravity "notch".
  // Gating to grounded frames is essential — an ungated capture would store the first
  // FREE-FALL frame (~ -MaxFallSpeed*dt), which is exactly the frame the transition
  // reads. Reset on teleport so a respawn can't leak a stale descent.
  public LastGroundedMoveY = 0;

  // ── Diagnostics (Bug-1 capture) + de-pen safety-net telemetry ───────────────────
  public DiagnosticLogLive = false; // dat.gui toggle: live console log each frame
  // Frames the de-pen net has corrected. Stays LOW if prevention holds — a slow/edge
  // touchdown can still seat shrunk then grow-embed the full feet ~0.17u (healed in ~2
  // frames); a climbing count or a DEEP (>0.2u) warn from depenetrate is the real canary.
  public DepenFireCount = 0;
  private static readonly DIAG_CAPACITY = 180; // ~3s @ fixed 60fps
  private diagRing: PlayerDiagFrame[] = []; // grown on demand to capacity, then mutated in place
  private diagHead = 0;
  private diagFilled = 0;
  private diagFrame = 0; // monotonic sim-step counter (orders frames, rate-limits warns)
  private diagPrevCenterY = 0;
  private diagVyPre = 0; // NextTranslation.y snapshot before the de-pen clamp
  private diagDesY = 0;
  private diagMoveX = 0;
  private diagMoveY = 0;
  private lastDepenLift = 0;
  private lastDepenPenetration = 0;
  private lastDepenWarnFrame = -999;
  private diagSnapGrace = false; // did the snap-grace (not the strict cast) supply ground?

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
      // Capsule: the rounded bottom glides over slopes/steps instead of catching on
      // a flat cuboid corner (fixes the downhill staircasing). createCollider maps
      // {1.75 x 4} -> capsule(1.125, 0.875).
      GameObjectType.CAPSULE,
      size,
      position,
      0,
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations(),
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

    // Bug-1 prevention: decide the airborne capsule shrink/grow HERE, BEFORE the move is
    // computed, so the shape the KCC clamps against is the SAME shape World.step applies
    // the committed move with next step. (It used to run at the end of detectCollisions —
    // AFTER the move was committed — so a grow dropped the full feet ~0.17u into the floor
    // a frame later, and the KCC never de-penetrates an embedded start. See
    // updateAirCollider.)
    this.diagVyPre = this.NextTranslation.y;
    this.updateAirCollider();

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
      this.moveFilter,
    );

    // Apply the actual translation to the next kinematic translation (scratch reuse).
    const correctiveMovement = this.CharacterController.computedMovement();

    // Rapier's own grounded verdict from this move — a robust OR in ground detection
    // so a slope/step descent doesn't flicker RUNNING<->FALLING (see getShapeCast).
    this.kccGrounded = this.CharacterController.computedGrounded();

    // Bug-2 carry: remember the vertical movement the controller actually produced on the
    // LAST GROUNDED frame. The gate is load-bearing — an ungated capture would store the
    // first free-fall frame (~ -MaxFallSpeed*dt), the exact frame the running→falling
    // transition reads, defeating the fix. While glued to a downhill slope this holds the
    // slope-clamped descent that handlePlayerRunning carries into the launch.
    if (this.kccGrounded) {
      this.LastGroundedMoveY = correctiveMovement.y;
    }

    // Diagnostic raw captures (consumed by captureDiagnostics at the end of the frame).
    this.diagDesY = this.scratchDesired.y;
    this.diagMoveX = correctiveMovement.x;
    this.diagMoveY = correctiveMovement.y;

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
    // Ground/wall contact sensing for the player is ShapeCast-based here. (The
    // CharacterController's numComputedCollisions() is separately fed into the
    // contact registry in updateTranslation above — the KCC two-sided dispatch.)
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
  // Replaces the old userData.value3 check; reads the platform's typed flag.
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

    // Detect ground, ignoring walls and active OneWayPlatforms. A solid down-cast counts
    // as ground if its toi is within the tight threshold (STRICT), OR within
    // SnapToGroundDistance while we're grounded+descending (SNAP-GRACE). The snap-grace
    // exists because the tight down-cast threshold (0.025) is far tighter than the snap
    // distance (0.15) that actually re-glues the feet: while walking a slope the feet blip
    // a frame above 0.025 even though snap-to-ground will pull them right back, which used
    // to flicker RUNNING<->FALLING (and felt like "climbing up / sliding down"). Counting
    // "solid floor within snap distance, descending, grounded last frame" as grounded kills
    // that at the source — without making a real jump (it rises) or a run-off-an-edge (no
    // floor within snap) sticky.
    const downCast = shapeCasts.down;
    const downIsSolidFloor =
      downCast !== null &&
      GameUtils.IsColliderType(downCast.collider, EntityType.WALL) === false &&
      this.isActiveOneWayPlatform(downCast.collider) === false;
    const strictGround =
      downIsSolidFloor && downCast!.time_of_impact <= this.ColliderOffsetThreshold;
    const snapGraceGround =
      downIsSolidFloor &&
      this.wasGroundedLastFrame &&
      this.NextTranslation.y <= 0 &&
      downCast!.time_of_impact <= this.SnapToGroundDistance;
    this.diagSnapGrace = !strictGround && snapGraceGround;

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

      // Slope-ness from the contact normal (|y| ≈ 1 flat, < 1 sloped), two thresholds:
      //  • GroundIsFlat — STRICT (~0.8°): truly axis-aligned. Drives the down-stick and the
      //    de-pen gate (de-pen's surfaceTop math only holds for axis-aligned cuboids).
      //  • GroundIsWalkableFlat — within FlatToleranceDegrees (default 7°): "treat as flat
      //    for feel", drives the run→fall edge launch so a shallow ramp launches like flat.
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

    // Robustness: also count grounded if Rapier's controller says so this frame.
    // Prevents the 1-frame RUNNING<->FALLING flicker (visible as staircasing) on
    // slope/step descents where the tiny down-cast threshold momentarily misses.
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

    // The air-collider shrink/grow decision now runs in updateAirCollider() BEFORE the
    // move is computed (Bug-1 prevention) — it is intentionally NOT here anymore.

    // Bug-1 safety net + per-frame diagnostic capture. depenetrate() is a clamped,
    // positional-only catch for any residual overlap; captureDiagnostics() records this
    // frame (post-de-pen, final shape) into the ring buffer.
    this.depenetrate(shapeCasts.down, shapeCasts.up);
    this.captureDiagnostics(shapeCasts.down);
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
      this.shapeCastFilter,
    );

    return hit;
  }

  // Bug-1 PREVENTION: choose the airborne (shrunk) vs grounded (full) capsule and apply
  // it BEFORE computeColliderMovement, using a FRESH down-cast — so the move is computed
  // with the same shape World.step later applies it with. The GROW guard refuses to grow
  // back to full while still airborne and within feetDelta of the surface: a center-fixed
  // grow drops the feet ~feetDelta and the KCC can't de-penetrate an embedded start, so in
  // that case it stays shrunk and lets the grounded grow + the de-pen net seat the feet.
  // (Reads last frame's IsTouching.ground — detectCollisions hasn't run yet this step —
  // plus a fresh toi; that's intentional and sufficient for the clearance check.)
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

    // GROW guard: block ONLY the shrunk→full transition in mid-air when the (shrunk) feet
    // are within feetDelta+skin of the surface (growing there pushes the full feet below
    // it). Never re-shrinks an already-full collider near ground.
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

  // Bug-1 SAFETY NET: clamped, positional-only de-penetration. If the (full) feet end up
  // below a FLAT solid surface (the rare grounded-grow residual, or any stray overlap),
  // nudge the pending kinematic target UP to rest — never down, never a positive velocity,
  // so a Halo-2-style superbounce is structurally impossible (a kinematic body has no
  // velocity integrator to turn depth into an impulse). Gated to flat ground (slopes are
  // rotated cubes — left to the KCC snap), to a solid CURRENT-ground contact (never fights
  // one-way pass-through), and to vy<=0. Clamped per frame AND by the up-cast clearance so
  // it can't pop the head through a low ceiling. After the prevention this should fire
  // almost never; frequent/deep fires are the regression canary, so it logs.
  private depenetrate(downCast: any, upCast: any) {
    this.lastDepenLift = 0;
    this.lastDepenPenetration = 0;

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

    this.lastDepenPenetration = penetration;
    this.lastDepenLift = lift;
    this.DepenFireCount++;

    // Deeper than the known grow residual ⇒ tunneling / a prevention regression, not the
    // expected ~0.17u grounded-grow drop. Warn loudly (rate-limited to ~2x/sec).
    if (penetration > 0.2 && this.diagFrame - this.lastDepenWarnFrame > 30) {
      this.lastDepenWarnFrame = this.diagFrame;
      console.warn(
        `[depen] DEEP ${penetration.toFixed(3)}u lift=${lift.toFixed(3)} ` +
          `state=${this.State} toi=${downCast.time_of_impact.toFixed(3)} ` +
          `halfH=${col.halfHeight().toFixed(3)} vy=${this.NextTranslation.y.toFixed(2)}`,
      );
    } else if (this.DiagnosticLogLive) {
      console.log(
        `[depen] pen=${penetration.toFixed(3)} lift=${lift.toFixed(3)} state=${this.State}`,
      );
    }
  }

  // Record this frame into the ring buffer (mutate-in-place; no per-frame GC). Runs every
  // frame so a rare glitch is already captured when DumpDiagnostics is clicked after it.
  private captureDiagnostics(downCast: any) {
    this.diagFrame++;

    const col = this.PhysicsBody!.collider(0);
    const halfHeight = col.halfHeight();
    const radius = col.radius();
    const centerY = this.CurrentTranslation.y;
    const feetBottom = centerY - (halfHeight + radius);

    let toi = NaN;
    let n1y = NaN;
    let n2y = NaN;
    let surfaceTop = NaN;
    let feetGap = NaN;
    let contactType = "-";
    let oneWayActive = false;
    if (downCast?.collider) {
      toi = downCast.time_of_impact;
      n1y = downCast.normal1?.y ?? NaN;
      n2y = downCast.normal2?.y ?? NaN;
      const he = (downCast.collider.shape as any).halfExtents;
      if (he) {
        surfaceTop = downCast.collider.translation().y + he.y;
        feetGap = feetBottom - surfaceTop;
      }
      contactType =
        (downCast.collider.parent()?.userData as any)?.type ?? "-";
      oneWayActive = this.isActiveOneWayPlatform(downCast.collider);
    }

    const dy = centerY - this.diagPrevCenterY;
    this.diagPrevCenterY = centerY;

    // Pre-grow the ring once, then overwrite in place.
    let f = this.diagRing[this.diagHead];
    if (!f) {
      f = {} as PlayerDiagFrame;
      this.diagRing[this.diagHead] = f;
    }
    f.frame = this.diagFrame;
    f.elapsed = this.Time.Elapsed;
    f.state = this.State;
    f.vx = this.NextTranslation.x;
    f.vyPre = this.diagVyPre;
    f.vyPost = this.NextTranslation.y;
    f.desY = this.diagDesY;
    f.movX = this.diagMoveX;
    f.movY = this.diagMoveY;
    f.lastGroundedMoveY = this.LastGroundedMoveY;
    f.kccGrounded = this.kccGrounded;
    f.ground = this.IsTouching.ground;
    f.ceiling = this.IsTouching.ceiling;
    f.groundIsFlat = this.GroundIsFlat;
    f.walkableFlat = this.GroundIsWalkableFlat;
    f.snapGrace = this.diagSnapGrace;
    f.toi = toi;
    f.downN1y = n1y;
    f.downN2y = n2y;
    f.halfHeight = halfHeight;
    f.radius = radius;
    f.airborne = this.colliderIsAirborne;
    f.centerY = centerY;
    f.dy = dy;
    f.feetBottom = feetBottom;
    f.surfaceTop = surfaceTop;
    f.feetGap = feetGap;
    f.penetration = this.lastDepenPenetration;
    f.depenLift = this.lastDepenLift;
    f.contactType = contactType;
    f.oneWayActive = oneWayActive;
    f.snapDist = this.SnapToGroundDistance;
    f.growDist = this.AirColliderGrowDistance;
    f.airScale = this.AirColliderHeightScale;
    f.offsetThresh = this.ColliderOffsetThreshold;
    f.maxFall = this.MaxFallSpeed;

    this.diagHead = (this.diagHead + 1) % Player.DIAG_CAPACITY;
    this.diagFilled = Math.min(this.diagFilled + 1, Player.DIAG_CAPACITY);

    if (this.DiagnosticLogLive) {
      const fmt = (v: number) => (Number.isNaN(v) ? "-" : v.toFixed(3));
      console.log(
        `[diag f${f.frame}] st=${f.state} grnd=${f.ground ? 1 : 0} ` +
          `kcc=${f.kccGrounded ? 1 : 0} flat=${f.groundIsFlat ? 1 : 0} ` +
          `vy=${f.vyPost.toFixed(1)} toi=${fmt(f.toi)} feetGap=${fmt(f.feetGap)} ` +
          `halfH=${f.halfHeight.toFixed(3)} air=${f.airborne ? 1 : 0} lift=${f.depenLift.toFixed(3)}`,
      );
    }
  }

  // Build a CSV of the last ~3s ring buffer (chronological) for the dat.gui dump button.
  public DumpDiagnostics(): string {
    const cols: (keyof PlayerDiagFrame)[] = [
      "frame", "elapsed", "state", "vx", "vyPre", "vyPost", "desY", "movX",
      "movY", "lastGroundedMoveY", "kccGrounded", "ground", "ceiling",
      "groundIsFlat", "walkableFlat", "snapGrace", "toi", "downN1y", "downN2y",
      "halfHeight", "radius",
      "airborne", "centerY", "dy", "feetBottom", "surfaceTop", "feetGap",
      "penetration", "depenLift", "contactType", "oneWayActive", "snapDist",
      "growDist", "airScale", "offsetThresh", "maxFall",
    ];
    const rows: string[] = [cols.join(",")];
    const cap = Player.DIAG_CAPACITY;
    const start = (this.diagHead - this.diagFilled + cap) % cap;
    for (let i = 0; i < this.diagFilled; i++) {
      const f = this.diagRing[(start + i) % cap];
      if (!f) continue;
      rows.push(
        cols
          .map((c) => {
            const v = f[c];
            if (typeof v === "number") {
              return Number.isFinite(v) ? String(+v.toFixed(4)) : "";
            }
            if (typeof v === "boolean") return v ? "1" : "0";
            return String(v);
          })
          .join(","),
      );
    }
    return rows.join("\n");
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
