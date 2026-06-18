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

  private hasTriggeredGameOver!: boolean;

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

    this.createHitBoxCollider();
    this.createSpriteGraphics();

    // Set collision groups and masks for both colliders
    // Collider 0: Player bounding box - collides with platforms AND enemies
    this.setCollisionGroup(CollisionGroups.PLAYER_BOUNDING_BOX, 0);
    this.setCollisionMask(CollisionGroups.PLATFORM | CollisionGroups.ENEMY, 0);
    
    // Collider 1: Player hit box - collides with enemies (sensor)
    this.setCollisionGroup(CollisionGroups.PLAYER_HIT_BOX, 1);
    this.setCollisionMask(CollisionGroups.ENEMY, 1);

    // Enable collision events on both colliders for the event-driven collision system
    if (this.PhysicsBody) {
      this.PhysicsBody.collider(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      this.PhysicsBody.collider(1).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
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
    this.hasTriggeredGameOver = false;

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

  private createHitBoxCollider() {
    // Create a smaller hit box collider for enemy detection (62.5% of full height)
    const collider = this.createCollider(
      { width: this.InitialSize.x, height: this.InitialSize.y * 0.625 },
      GameObjectType.CUBE
    );

    // Make hit box a sensor - sensors detect intersections without physical collision
    // This allows enemies to pass through while still being detected
    collider.setSensor(true);

    // Attach collider to player's physics body
    this.Physics.World.createCollider(collider, this.PhysicsBody);
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
          GameUtils.IsOneWayPlatformAndActive(collider, EntityType.ONE_WAY_PLATFORM)
        )
    );

    // Get the actual translation possible from the physics computation
    const correctiveMovement = this.CharacterController.computedMovement();

    // Apply the actual translation to the next kinematic translation
    this.PhysicsBody!.setNextKinematicTranslation({
      x: this.CurrentTranslation.x + correctiveMovement.x,
      y: this.CurrentTranslation.y + correctiveMovement.y,
    });

    // Check if character controller hit an enemy during movement
    // The character controller computes collisions internally, so we need to check its results
    const numCollisions = this.CharacterController.numComputedCollisions();
    for (let i = 0; i < numCollisions; i++) {
      const collision = this.CharacterController.computedCollision(i);
      if (collision && collision.collider && GameUtils.IsColliderName(collision.collider, EntityType.ENEMY) && !this.hasTriggeredGameOver) {
        this.hasTriggeredGameOver = true;
        Emitter.emit("gameOver");
        break;
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
      GameUtils.IsColliderName(downCast.collider, EntityType.WALL) == false &&
      GameUtils.IsOneWayPlatformAndActive(
        downCast.collider,
        EntityType.ONE_WAY_PLATFORM
      ) == false
    ) {
      // Establish that ground is being touched
      this.IsTouching.ground = true;

      // Handle specific platform types
      this.CurrentFloor = GameUtils.GetDataFromCollider(
        downCast.collider
      ).value0;

      if (GameUtils.GetDataFromCollider(downCast.collider).value1 > 0) {
        this.IsTouching.edgePlatform = true;
      } else {
        this.IsTouching.edgePlatform = false;
      }
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
      GameUtils.IsColliderName(leftCast.collider, EntityType.ONE_WAY_PLATFORM) == false
    ) {
      this.IsTouching.leftSide = true;
    }

    // Detect right wall collisions, ignore OneWayPlatforms
    const rightCast = shapeCasts.right;
    if (
      rightCast &&
      rightCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderName(rightCast.collider, EntityType.ONE_WAY_PLATFORM) == false
    ) {
      this.IsTouching.rightSide = true;
    }

    // Detect ceiling collisions, ignore OneWayPlatforms
    const upCast = shapeCasts.up;
    if (
      upCast &&
      upCast.time_of_impact <= this.ColliderOffsetThreshold &&
      GameUtils.IsColliderName(upCast.collider, EntityType.ONE_WAY_PLATFORM) == false
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
        if (GameUtils.IsOneWayPlatformAndActive(collider, EntityType.ONE_WAY_PLATFORM)) {
          return false;
        }

        // Ignore enemies! They shouldn't be treated as solid ground
        if (GameUtils.IsColliderName(collider, EntityType.ENEMY)) {
          return false;
        }
        
        // This collider is solid platform - include it in results
        return true;
      }
    );

    return hit;
  }

  /**
   * Check for enemy collisions using the hit box sensor
   * This detects when enemies enter the player's sensor zone
   */
  private checkEnemyCollisions() {
    if (this.hasTriggeredGameOver) return;

    // Check sensor intersections with enemies
    this.Physics.World.intersectionPairsWith(
      this.PhysicsBody!.collider(1),
      (otherCollider) => {
        if (GameUtils.IsColliderName(otherCollider, EntityType.ENEMY) && !this.hasTriggeredGameOver) {
          this.hasTriggeredGameOver = true;
          Emitter.emit("gameOver");
        }
      }
    );
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
    this.updateTranslation();  // This also checks for enemy collisions via character controller
    this.detectCollisions();
    this.checkEnemyCollisions();  // Check for enemies in sensor zone
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
