import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d-compat";
import Time from "../../utils/time";
import Input from "../../utils/input";
import Debug from "../../utils/debug";
import ResourceLoader from "../../utils/resourceLoader";
import PlayerDirection from "../../utils/types/playerDirection";
import SpriteAnimator from "../../utils/spriteAnimator";
import SpriteAnimations from "./state/spriteAnimations";
import PlayerStates from "../../utils/types/playerStates";
import handlePlayerIdle from "./state/handlePlayerIdle";
import handlePlayerFalling from "./state/handlePlayerFalling";
import handlePlayerRunning from "./state/handlePlayerRunning";
import handlePlayerJumping from "./state/handlePlayerJumping";
import GameObject from "../gameComponents/gameObject";
import debugPlayer from "../../utils/debug/debugPlayer";
import ContactPoints from "../../utils/types/contactPoints";
import GameObjectType from "../../utils/types/gameObjectType";
import Emitter from "../../utils/eventEmitter";
import setDkAttributes from "./attributes/setDkAttributes";
import GameUtils from "../../utils/gameUtils";
import handlePlayerClimbing from "./state/handlePlayerClimbing";
import CollisionGroups from "../../utils/types/collisionGroups";

export default class Player extends GameObject {
  // Experience
  public time!: Time;
  public input!: Input;
  public debug?: Debug;
  public resources!: ResourceLoader;

  // Player state
  public direction!: number;
  public currentPosition!: RAPIER.Vector2;
  public nextTranslation!: RAPIER.Vector2;

  public state!: string;
  public stateHandlers!: Record<string, Function>;

  public characterController!: RAPIER.KinematicCharacterController;
  public colliderOffset!: number;
  public colliderOffsetThreshold!: number;
  public hasColliderUpdated!: boolean;
  public isTouching!: ContactPoints;
  public currentFloor!: number;

  public spriteAnimator!: SpriteAnimator;

  // Player attributes
  public maxClimbSpeed!: number;
  public climbAcceleration!: number;
  public climbDeceleration!: number;

  public maxGroundSpeed!: number;
  public groundAcceleration!: number;
  public groundDeceleration!: number;

  public maxFallSpeed!: number;
  public fallAcceleration!: number;
  public jumpEndedEarlyGravityModifier!: number;
  public endedJumpEarly!: boolean;

  public jumpPower!: number;
  public jumpAcceleration!: number;

  public coyoteAvailable!: boolean;
  public coyoteCount!: number;

  public bufferJumpRange!: number;
  public groundWithinBufferRange!: boolean;
  public bufferJumpAvailable!: boolean;
  public wasBufferJumpUsed!: boolean;
  public bufferJumpCount!: number;

  public timeJumpWasEntered!: number;
  public timeFallWasEntered!: number;
  public minJumpTime!: number;
  public maxJumpTime!: number;
  public coyoteTime!: number;

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
      "Player",
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
    if (this.physicsBody) {
      this.physicsBody.collider(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      this.physicsBody.collider(1).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    }

    // Debug
    if (this.experience.debug.isActive) {
      this.debug = this.experience.debug;
      debugPlayer(this, this.debug);
    }
  }

  private initalizePlayerAttributes() {
    // Experience fields
    this.time = this.experience.time;
    this.input = this.experience.input;
    this.resources = this.experience.resources;

    // Set inital state and direction
    this.state = PlayerStates.IDLE;
    this.direction = PlayerDirection.NEUTRAL;

    // Set movement, speed, jump, timer attributes special to game feel
    setDkAttributes(this);

    // Init state handlers
    this.stateHandlers = {
      [PlayerStates.IDLE]: handlePlayerIdle,
      [PlayerStates.RUNNING]: handlePlayerRunning,
      [PlayerStates.FALLING]: handlePlayerFalling,
      [PlayerStates.JUMPING]: handlePlayerJumping,
      [PlayerStates.CLIMBING]: handlePlayerClimbing,
    };

    // Set physics variables
    this.colliderOffset = 0.01;
    // Increased threshold significantly for better slope detection and prevent micro-falling
    // This allows player to maintain ground contact when moving down slopes
    this.colliderOffsetThreshold = this.colliderOffset + 0.015;
    this.currentPosition = new RAPIER.Vector2(0, 0);
    this.nextTranslation = new RAPIER.Vector2(0, 0);

    this.hasColliderUpdated = false;

    this.currentFloor = 0;
    this.hasTriggeredGameOver = false;

    this.isTouching = {
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
    this.spriteAnimator = new SpriteAnimator(this.resources.items.randy as THREE.Texture, 4, 6);
    this.spriteAnimator.state = SpriteAnimations.IDLE_RIGHT;
    this.setMaterial(this.spriteAnimator.material, 4);
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
      { width: this.initialSize.x, height: this.initialSize.y * 0.625 },
      GameObjectType.CUBE
    );

    // Make hit box a sensor - sensors detect intersections without physical collision
    // This allows enemies to pass through while still being detected
    collider.setSensor(true);

    // Attach collider to player's physics body
    this.physics.world.createCollider(collider, this.physicsBody);
  }

  private setCharacterController() {
    // Independent character controller attached to physics world, attaching here since this one is exclusively used for Player
    this.characterController = this.physics.world.createCharacterController(
      this.colliderOffset
    );
    // Snap to the ground if the vertical distance to the ground is smaller than snap distance
    // Increased to 0.02 for better slope handling and prevent micro-falling
    this.characterController.enableSnapToGround(0.02);
    // Autostep if the step height is smaller than 0.5, its width is larger than 0.2, and allow stepping on dynamic bodies.
    this.characterController.enableAutostep(0.5, 0.2, true);
    // Don't allow climbing slopes larger than 45 degrees.
    this.characterController.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
    // Automatically slide down on slopes smaller than 30 degrees.
    this.characterController.setMinSlopeSlideAngle((30 * Math.PI) / 180);
  }

  private updatePlayerState() {
    const handler = this.stateHandlers[this.state];
    if (handler) {
      handler(this);
    }

    // Update the sprite state
    this.spriteAnimator.update(this.time.delta);
  }

  private updateTranslation() {
    // Update player position to a variable
    const position = this.physicsBody!.translation();
    this.currentPosition.x = position.x;
    this.currentPosition.y = position.y;

    // Compute the desired translation scaled by the time delta
    const desiredTranslation = {
      x: this.nextTranslation.x * this.time.delta,
      y: this.nextTranslation.y * this.time.delta,
    };

    // Given a desired translation, compute the actual translation that we can apply to the collider based on the obstacles.
    this.characterController.computeColliderMovement(
      this.physicsBody!.collider(0),
      desiredTranslation,
      // Tried CollisionGroups, filterGroups in this function and class. Tried EventQueue and drainCollisionEvents in Physics class, either don't work at all as documented or don't work in a useful way.... Resorting to only using predicate
      undefined,
      undefined,
      // Don't collide with sensors or OneWayPlatforms while active
      // NOTE: We DO collide with enemies - they should stop the player!
      (collider: RAPIER.Collider) =>
        !(
          collider.isSensor() ||
          GameUtils.isOneWayPlatformAndActive(collider, "OneWayPlatform")
        )
    );

    // Get the actual translation possible from the physics computation
    const correctiveMovement = this.characterController.computedMovement();

    // Apply the actual translation to the next kinematic translation
    this.physicsBody!.setNextKinematicTranslation({
      x: this.currentTranslation.x + correctiveMovement.x,
      y: this.currentTranslation.y + correctiveMovement.y,
    });

    // Check if character controller hit an enemy during movement
    // The character controller computes collisions internally, so we need to check its results
    const numCollisions = this.characterController.numComputedCollisions();
    for (let i = 0; i < numCollisions; i++) {
      const collision = this.characterController.computedCollision(i);
      if (collision && collision.collider && GameUtils.isColliderName(collision.collider, "Enemy") && !this.hasTriggeredGameOver) {
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

  private resetCollisions() {
    // Use assign instead of replacing with a JS Object, fixes issue with dat.gui
    Object.assign(this.isTouching, {
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
      downCast.time_of_impact <= this.colliderOffsetThreshold &&
      GameUtils.isColliderName(downCast.collider, "Wall") == false &&
      GameUtils.isOneWayPlatformAndActive(
        downCast.collider,
        "OneWayPlatform"
      ) == false
    ) {
      // Establish that ground is being touched
      this.isTouching.ground = true;

      // Handle specific platform types
      this.currentFloor = GameUtils.getDataFromCollider(
        downCast.collider
      ).value0;

      if (GameUtils.getDataFromCollider(downCast.collider).value1 > 0) {
        this.isTouching.edgePlatform = true;
      } else {
        this.isTouching.edgePlatform = false;
      }
    }

    // Detect ground within buffer jump range
    if (
      !this.isTouching.ground &&
      downCast &&
      downCast.time_of_impact <= this.bufferJumpRange &&
      this.nextTranslation.y <= 0
    ) {
      this.groundWithinBufferRange = true;
    } else {
      this.groundWithinBufferRange = false;
    }

    // Detect left wall collisions, ignore OneWayPlatforms
    const leftCast = shapeCasts.left;
    if (
      leftCast &&
      leftCast.time_of_impact <= this.colliderOffsetThreshold &&
      GameUtils.isColliderName(leftCast.collider, "OneWayPlatform") == false
    ) {
      this.isTouching.leftSide = true;
    }

    // Detect right wall collisions, ignore OneWayPlatforms
    const rightCast = shapeCasts.right;
    if (
      rightCast &&
      rightCast.time_of_impact <= this.colliderOffsetThreshold &&
      GameUtils.isColliderName(rightCast.collider, "OneWayPlatform") == false
    ) {
      this.isTouching.rightSide = true;
    }

    // Detect ceiling collisions, ignore OneWayPlatforms
    const upCast = shapeCasts.up;
    if (
      upCast &&
      upCast.time_of_impact <= this.colliderOffsetThreshold &&
      GameUtils.isColliderName(upCast.collider, "OneWayPlatform") == false
    ) {
      this.isTouching.ceiling = true;
    }
  }

  private shapeCast(xDirection: number, yDirection: number) {
    // Without offset here, the x shapeCast collides with the shape's inner wall for some reason
    const offsetX =
      this.currentTranslation.x + this.colliderOffset * xDirection;
    const offsetY =
      this.currentTranslation.y + this.colliderOffset * yDirection;

    // Rapier 0.14.x API - castShape with predicate to exclude:
    // 1. Player's own colliders
    // 2. Sensors (camera sensors, ladder sensors, etc.)
    // 3. Active one-way platforms
    const hit = this.physics.world.castShape(
      { x: offsetX, y: offsetY },
      0,
      { x: xDirection, y: yDirection },
      this.physicsBody!.collider(0).shape,
      0.0,
      1000,
      true,
      undefined,  // filterFlags
      undefined,  // filterGroups
      this.physicsBody!.collider(0),  // Exclude collider 0
      this.physicsBody,  // Exclude entire player rigid body (both colliders!)
      // CRITICAL: Predicate function to filter collisions
      // This is called for EVERY potential hit, allowing shapeCast to penetrate through
      // sensors and find solid ground beneath them
      (collider: RAPIER.Collider) => {
        // Ignore sensors (camera sensors, ladder sensors, etc.)
        if (collider.isSensor()) {
          return false;
        }
        
        // Ignore active one-way platforms
        if (GameUtils.isOneWayPlatformAndActive(collider, "OneWayPlatform")) {
          return false;
        }

        // Ignore enemies! They shouldn't be treated as solid ground
        if (GameUtils.isColliderName(collider, "Enemy")) {
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
    this.physics.world.intersectionPairsWith(
      this.physicsBody!.collider(1),
      (otherCollider) => {
        if (GameUtils.isColliderName(otherCollider, "Enemy") && !this.hasTriggeredGameOver) {
          this.hasTriggeredGameOver = true;
          Emitter.emit("gameOver");
        }
      }
    );
  }

  public update() {
    // Exit early if object is destroyed
    if (this.isBeingDestroyed) {
      return;
    }

    this.syncGraphicsToPhysics();
    this.updatePlayerState();
    this.updateTranslation();  // This also checks for enemy collisions via character controller
    this.detectCollisions();
    this.checkEnemyCollisions();  // Check for enemies in sensor zone
  }

  public destroy() {
    // Emit an event to signal the player's removal
    Emitter.emit("gameObjectRemoved", this);

    // Remove character controller from the physics world
    this.physics.world.removeCharacterController(this.characterController);

    // Dispose of the sprite animator
    this.spriteAnimator.destroy();

    // Destroy base class resources
    super.destroy();
  }
}
