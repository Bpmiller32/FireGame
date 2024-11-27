import * as RAPIER from "@dimforge/rapier2d";
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

export default class Player extends GameObject {
  // Experience
  public time: Time;
  public input: Input;
  public debug?: Debug;
  public resources: ResourceLoader;

  // Player state
  public direction!: number;
  public currentPosition!: RAPIER.Vector2;
  public nextTranslation!: RAPIER.Vector2;

  public state!: string;
  public stateHandlers!: Record<string, Function>;

  public characterController!: RAPIER.KinematicCharacterController;
  public colliderOffset!: number;
  public colliderOffsetThreshold!: number;
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

  public constructor(
    size: { width: number; height: number },
    position: { x: number; y: number }
  ) {
    super();

    this.time = this.experience.time;
    this.input = this.experience.input;
    this.resources = this.experience.resources;

    this.initalizePlayerAttributes();
    this.setSpriteAnimator();
    this.setCharacterController();
    this.createObjectPhysics(
      "Player",
      GameObjectType.SPRITE,
      size,
      position,
      0,
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );
    this.createObjectGraphicsDebug("white");

    // Debug
    if (this.experience.debug.isActive) {
      this.debug = this.experience.debug;
      debugPlayer(this, this.debug);
    }
  }

  private initalizePlayerAttributes() {
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
    this.colliderOffsetThreshold = this.colliderOffset + 0.001;
    this.currentPosition = new RAPIER.Vector2(0, 0);
    this.nextTranslation = new RAPIER.Vector2(0, 0);

    this.currentFloor = 0;

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
    this.spriteAnimator = new SpriteAnimator(this.resources.items.randy, 4, 6);
    this.spriteAnimator.state = SpriteAnimations.IDLE_RIGHT;
    this.setMaterial(this.spriteAnimator.material, 4);
  }

  private setCharacterController() {
    // Independent character controller attached to physics world, attaching here since this one is exclusively used for Player
    this.characterController = this.physics.world.createCharacterController(
      this.colliderOffset
    );
    // Snap to the ground if the vertical distance to the ground is smaller than collider offset.
    this.characterController.enableSnapToGround(this.colliderOffset);
    // Autostep if the step height is smaller than 0.5, its width is larger than 0.2, and allow stepping on dynamic bodies.
    this.characterController.enableAutostep(0.5, 0.2, true);
    // Don’t allow climbing slopes larger than 45 degrees.
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
      // Don't collide with sensors or OneWayPlatforms while under them
      (collider) =>
        !(
          collider.isSensor() ||
          GameUtils.getDataFromCollider(collider).isOneWayPlatformActive
        )
    );

    // Get the actual translation possible from the physics computation
    const correctiveMovement = this.characterController.computedMovement();

    // Apply the actual translation to the next kinematic translation
    this.physicsBody!.setNextKinematicTranslation({
      x: this.currentTranslation.x + correctiveMovement.x,
      y: this.currentTranslation.y + correctiveMovement.y,
    });
  }

  private detectCollisions() {
    // Only using ShapeCasting for collisions, saves on previously used CharacterController's numComputedCollision
    this.resetCollisions();
    this.getShapeCastCollisions();
  }

  private resetCollisions() {
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

  private getShapeCastCollisions() {
    // ShapeCast in all directions
    const shapeCasts = {
      down: this.shapeCast(PlayerDirection.NEUTRAL, PlayerDirection.DOWN),
      left: this.shapeCast(PlayerDirection.LEFT, PlayerDirection.NEUTRAL),
      right: this.shapeCast(PlayerDirection.RIGHT, PlayerDirection.NEUTRAL),
      up: this.shapeCast(PlayerDirection.NEUTRAL, PlayerDirection.UP),
    };

    // Detect ground collisions, ignore walls
    const downCast = shapeCasts.down;
    if (
      downCast &&
      downCast.toi <= this.colliderOffsetThreshold &&
      GameUtils.getDataFromCollider(downCast.collider).name !== "Wall" &&
      !GameUtils.getDataFromCollider(downCast.collider).isOneWayPlatformActive
    ) {
      // Establish that ground is being touched
      this.isTouching.ground = true;

      // Handle specific platform types
      this.currentFloor = GameUtils.getDataFromCollider(
        downCast.collider
      ).value0;

      if (GameUtils.getDataFromCollider(downCast.collider).isEdgePlatform) {
        this.isTouching.edgePlatform = true;
      } else {
        this.isTouching.edgePlatform = false;
      }
    }

    // Detect ground within buffer jump range
    if (
      !this.isTouching.ground &&
      downCast &&
      downCast.toi <= this.bufferJumpRange &&
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
      leftCast.toi <= this.colliderOffsetThreshold &&
      GameUtils.getDataFromCollider(leftCast.collider).name !== "OneWayPlatform"
    ) {
      this.isTouching.leftSide = true;
    }

    // Detect right wall collisions, ignore OneWayPlatforms
    const rightCast = shapeCasts.right;
    if (
      rightCast &&
      rightCast.toi <= this.colliderOffsetThreshold &&
      GameUtils.getDataFromCollider(rightCast.collider).name !==
        "OneWayPlatform"
    ) {
      this.isTouching.rightSide = true;
    }

    // Detect ceiling collisions, ignore OneWayPlatforms
    const upCast = shapeCasts.up;
    if (
      upCast &&
      upCast.toi <= this.colliderOffsetThreshold &&
      GameUtils.getDataFromCollider(upCast.collider).name !== "OneWayPlatform"
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

    const hit = this.physics.world.castShape(
      { x: offsetX, y: offsetY },
      0,
      { x: xDirection, y: yDirection },
      this.physicsBody!.collider(0).shape,
      1000,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      // Don't collide with sensors or OneWayPlatforms while under them
      (collider) =>
        !(
          collider.isSensor() ||
          GameUtils.getDataFromCollider(collider).isOneWayPlatformActive
        )
    );

    return hit || null;
  }

  public update() {
    // Exit early if object is destroyed
    if (this.isBeingDestroyed) {
      return;
    }

    this.syncGraphicsToPhysics();
    this.updatePlayerState();
    this.updateTranslation();
    this.detectCollisions();
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
