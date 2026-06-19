import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d-compat";
import Time from "../../../engine/core/time";
import Input from "../../../engine/input/input";
import Debug from "../../../engine/debug";
import PlayerDebug from "../../debug/PlayerDebug";
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
import Emitter from "../../../engine/events/eventBus";
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
  private inputDevice!: Input;
  public Debug?: Debug;
  public Resources!: ResourceLoader;

  // Player state
  public Direction!: number;
  public CurrentPosition!: RAPIER.Vector2;
  public NextTranslation!: RAPIER.Vector2;

  public State!: PlayerState;
  private fsm!: StateMachine<Player, PlayerState>;

  public CharacterController!: RAPIER.KinematicCharacterController;
  public ColliderOffset!: number;
  public ColliderOffsetThreshold!: number;
  public HasColliderUpdated!: boolean;
  public IsTouching!: ContactPoints;
  public CurrentFloor!: number;

  public SpriteAnimator!: SpriteAnimator;

  // Player attributes
  public MaxClimbSpeed!: number;
  public ClimbAcceleration!: number;
  public ClimbDeceleration!: number;

  public MaxGroundSpeed!: number;
  public GroundAcceleration!: number;
  public GroundDeceleration!: number;

  public MaxFallSpeed!: number;
  public FallAcceleration!: number;
  public JumpEndedEarlyGravityModifier!: number;
  public EndedJumpEarly!: boolean;

  public JumpPower!: number;
  public JumpAcceleration!: number;

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
  public MaxJumpTime!: number;
  public CoyoteTime!: number;

  public AnimationScalingFactor!: number;

  public constructor(
    size: { width: number; height: number },
    position: { x: number; y: number }
  ) {
    super();

    this.initalizePlayerAttributes();
    this.setSpriteAnimator();
    this.setCharacterController();

    this.createObjectPhysics(
      EntityType.PLAYER,
      GameObjectType.CUBE,
      size,
      position,
      0,
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );

    this.createSpriteGraphics();

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

  private initalizePlayerAttributes() {
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

    // Set inital state and direction
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

    this.HasColliderUpdated = false;

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

  private createSpriteGraphics() {
    this.mesh = new THREE.Sprite(this.material as THREE.SpriteMaterial);

    if (this.spriteScale) {
      this.mesh.scale.set(this.spriteScale, this.spriteScale, this.spriteScale);
    }

    this.scene.add(this.mesh);
    this.syncGraphicsToPhysics();
  }

  private setCharacterController() {
    // Independent character controller attached to physics world, attaching here since this one is exclusively used for Player
    this.CharacterController = this.Physics.World.createCharacterController(
      this.ColliderOffset
    );
    // Snap to the ground if the vertical distance to the ground is smaller than snap distance
    // Increased to 0.02 for better slope handling and prevent micro-falling
    this.CharacterController.enableSnapToGround(0.02);
    // Autostep if the step height is smaller than 0.5, its width is larger than 0.2, and allow stepping on dynamic bodies.
    this.CharacterController.enableAutostep(0.5, 0.2, true);
    // Don't allow climbing slopes larger than 45 degrees.
    this.CharacterController.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
    // Automatically slide down on slopes smaller than 30 degrees.
    this.CharacterController.setMinSlopeSlideAngle((30 * Math.PI) / 180);
  }

  private updatePlayerState() {
    this.fsm.Update();

    // Update the sprite state
    this.SpriteAnimator.Update(this.Time.Delta);
  }

  private updateTranslation() {
    // Update player position to a variable
    const position = this.PhysicsBody!.translation();
    this.CurrentPosition.x = position.x;
    this.CurrentPosition.y = position.y;

    // Compute the desired translation scaled by the time delta
    const desiredTranslation = {
      x: this.NextTranslation.x * this.Time.Delta,
      y: this.NextTranslation.y * this.Time.Delta,
    };

    // Given a desired translation, compute the actual translation that we can apply to the collider based on the obstacles.
    this.CharacterController.computeColliderMovement(
      this.PhysicsBody!.collider(0),
      desiredTranslation,
      // Tried CollisionGroups, filterGroups in this function and class. Tried EventQueue and drainCollisionEvents in Physics class, either don't work at all as documented or don't work in a useful way.... Resorting to only using predicate
      undefined,
      undefined,
      // Don't collide with sensors or OneWayPlatforms while active
      // NOTE: We DO collide with enemies - they should stop the player!
      (collider: RAPIER.Collider) =>
        !(
          collider.isSensor() ||
          this.isActiveOneWayPlatform(collider)
        )
    );

    // Get the actual translation possible from the physics computation
    const correctiveMovement = this.CharacterController.computedMovement();

    // Apply the actual translation to the next kinematic translation
    this.PhysicsBody!.setNextKinematicTranslation({
      x: this.CurrentTranslation.x + correctiveMovement.x,
      y: this.CurrentTranslation.y + correctiveMovement.y,
    });

    // Feed the character controller's own contacts into the contact table.
    // A kinematic character keeps a skin gap from solids it moves into, so Rapier
    // fires NO collision event for the player-as-mover — but the controller still
    // reports what it was blocked by this frame. Dispatch those as contacts so the
    // same declarative rules (Enemy<->Player = gameOver, etc.) fire in BOTH
    // directions. (Confirmed via runtime logging: ccBlockedBy=[Enemy] yet zero
    // Rapier events for the player.) Skip while paused so a game-over doesn't
    // re-fire every frame on the freeze screen.
    if (!this.Physics.IsPaused) {
      const numCollisions = this.CharacterController.numComputedCollisions();
      for (let i = 0; i < numCollisions; i++) {
        const collision = this.CharacterController.computedCollision(i);
        if (!collision?.collider) {
          continue;
        }

        const other = this.Physics.GetGameObjectFromCollider(collision.collider);
        if (other) {
          this.Physics.Contacts.Dispatch("enter", this, other);
        }
      }
    }
  }

  private detectCollisions() {
    // Only using ShapeCasting for collisions, saves on previously used CharacterController's numComputedCollision
    this.resetCollisions();
    this.getShapeCastCollisions();
  }

  /**
   * Update ladder contact state from external sensor detection
   * Called by GameDirector until ladder sensors use proper callbacks
   */
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

  /**
   * Resolve a collider to the Platform it belongs to (or undefined). Lets the
   * shapecasts read a platform's named fields (FloorLevel / IsEdge / IsOneWayActive)
   * instead of anonymous userData numbers.
   */
  private getPlatform(collider: RAPIER.Collider): Platform | undefined {
    const go = this.Physics.GetGameObjectFromCollider(collider);
    return go instanceof Platform ? go : undefined;
  }

  /**
   * Is this collider an active one-way platform (currently pass-through)?
   * Replaces the old userData.value3 check; reads the platform's typed flag.
   */
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
      GameUtils.IsColliderType(downCast.collider, EntityType.WALL) == false &&
      this.isActiveOneWayPlatform(downCast.collider) == false
    ) {
      // Establish that ground is being touched
      this.IsTouching.ground = true;

      // Read floor / edge from the platform we're standing on (named fields)
      const platform = this.getPlatform(downCast.collider);
      this.CurrentFloor = platform ? platform.FloorLevel : 0;
      this.IsTouching.edgePlatform = platform ? platform.IsEdge : false;
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
      GameUtils.IsColliderType(leftCast.collider, EntityType.ONE_WAY_PLATFORM) == false
    ) {
      this.IsTouching.leftSide = true;
    }

    // Detect right wall collisions, ignore OneWayPlatforms
    const rightCast = shapeCasts.right;
    if (
      rightCast &&
      rightCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderType(rightCast.collider, EntityType.ONE_WAY_PLATFORM) == false
    ) {
      this.IsTouching.rightSide = true;
    }

    // Detect ceiling collisions, ignore OneWayPlatforms
    const upCast = shapeCasts.up;
    if (
      upCast &&
      upCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderType(upCast.collider, EntityType.ONE_WAY_PLATFORM) == false
    ) {
      this.IsTouching.ceiling = true;
    }
  }

  private shapeCast(xDirection: number, yDirection: number) {
    // Without offset here, the x shapeCast collides with the shape's inner wall for some reason
    const offsetX =
      this.CurrentTranslation.x + this.ColliderOffset * xDirection;
    const offsetY =
      this.CurrentTranslation.y + this.ColliderOffset * yDirection;

    // Rapier 0.14.x API - castShape with predicate to exclude:
    // 1. Player's own colliders
    // 2. Sensors (camera sensors, ladder sensors, etc.)
    // 3. Active one-way platforms
    const hit = this.Physics.World.castShape(
      { x: offsetX, y: offsetY },
      0,
      { x: xDirection, y: yDirection },
      this.PhysicsBody!.collider(0).shape,
      0.0,
      1000,
      true,
      undefined,  // filterFlags
      undefined,  // filterGroups
      this.PhysicsBody!.collider(0),  // Exclude collider 0
      this.PhysicsBody,  // Exclude entire player rigid body (both colliders!)
      // CRITICAL: Predicate function to filter collisions
      // This is called for EVERY potential hit, allowing shapeCast to penetrate through
      // sensors and find solid ground beneath them
      (collider: RAPIER.Collider) => {
        // Ignore sensors (camera sensors, ladder sensors, etc.)
        if (collider.isSensor()) {
          return false;
        }
        
        // Ignore active one-way platforms
        if (this.isActiveOneWayPlatform(collider)) {
          return false;
        }

        // Ignore enemies! They shouldn't be treated as solid ground
        if (GameUtils.IsColliderType(collider, EntityType.ENEMY)) {
          return false;
        }
        
        // This collider is solid platform - include it in results
        return true;
      }
    );

    return hit;
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
    // Emit an event to signal the player's removal
    Emitter.emit("gameObjectRemoved", this);

    // Remove character controller from the physics world
    this.Physics.World.removeCharacterController(this.CharacterController);

    // Dispose of the sprite animator
    this.SpriteAnimator.Destroy();

    // Destroy base class resources
    super.Destroy();
  }
}
