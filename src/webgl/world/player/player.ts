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
import GameObject from "../gameElements/gameObject";
import debugPlayer from "../../utils/debug/debugPlayer";
import ContactPoints from "../../utils/types/contactPoints";
import GameObjectType from "../../utils/types/gameObjectType";
import Emitter from "../../utils/eventEmitter";
import UserData from "../../utils/types/userData";

export default class Player extends GameObject {
  public time: Time;
  public input: Input;
  public debug?: Debug;
  public resources: ResourceLoader;
  public spriteAnimator!: SpriteAnimator;
  public characterController!: RAPIER.KinematicCharacterController;

  // Player variables
  public state!: string;
  public horizontalDirection!: number;
  public colliderOffset!: number;
  public nextTranslation!: RAPIER.Vector2;

  public isTouching!: ContactPoints;

  public maxGroundSpeed!: number;
  public groundAcceleration!: number;
  public groundDeceleration!: number;

  public maxFallSpeed!: number;
  public fallAcceleration!: number;
  public jumpEndedEarlyGravityModifier!: number;

  public jumpPower!: number;
  public jumpAcceleration!: number;
  public coyoteAvailable!: boolean;
  public endedJumpEarly!: boolean;

  public bufferJumpRange!: number;
  public groundWithinBufferRange!: boolean;
  public bufferJumpAvailable!: boolean;

  public timeJumpWasEntered!: number;
  public timeFallWasEntered!: number;
  public minJumpTime!: number;
  public maxJumpTime!: number;
  public coyoteTime!: number;

  // public MOVEMENT_SCALING: number = 0.4645;
  public MOVEMENT_SCALING: number = 1;

  // TODO: remove after debug
  debugCoyoteCount = 0;

  public constructor(
    size: { width: number; height: number },
    position: { x: number; y: number }
  ) {
    super();

    this.time = this.experience.time;
    this.input = this.experience.input;
    this.resources = this.experience.resources;

    this.setPlayerVariables();
    this.setSpriteAnimator();
    this.setCharacterController();
    this.createObject(
      "Player",
      GameObjectType.SPRITE,
      size,
      position,
      0,
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );

    // Debug
    if (this.experience.debug.isActive) {
      this.debug = this.experience.debug;
      debugPlayer(this, this.debug);
    }
  }

  private setPlayerVariables() {
    /* -------------------------------------------------------------------------- */
    /*                       State, animation, and collision                      */
    /* -------------------------------------------------------------------------- */
    this.state = PlayerStates.IDLE;
    this.horizontalDirection = PlayerDirection.NEUTRAL;
    this.colliderOffset = 0.01;
    this.nextTranslation = new RAPIER.Vector2(0, 0);

    this.isTouching = {
      ground: false,
      ceiling: false,
      leftSide: false,
      rightSide: false,
    };

    /* -------------------------------------------------------------------------- */
    /*                          Speeds and accelerations                          */
    /* -------------------------------------------------------------------------- */
    // The top horizontal movement speed
    this.maxGroundSpeed = 25 * this.MOVEMENT_SCALING;
    // The player's capacity to gain horizontal speed
    this.groundAcceleration = 120 * this.MOVEMENT_SCALING;
    // The pace at which the player comes to a stop
    this.groundDeceleration = 30 * this.MOVEMENT_SCALING;

    // The maximum vertical movement speed
    this.maxFallSpeed = 40 * this.MOVEMENT_SCALING;
    // The player's capacity to gain fall speed aka In Air Gravity
    this.fallAcceleration = 110 * this.MOVEMENT_SCALING;
    // Multiplier on fallAcceleration if player ended their jump early
    this.jumpEndedEarlyGravityModifier = 3 * this.MOVEMENT_SCALING;

    /* -------------------------------------------------------------------------- */
    /*                                    Jump                                    */
    /* -------------------------------------------------------------------------- */
    this.jumpPower = 64 * this.MOVEMENT_SCALING;
    this.jumpAcceleration = 9001 * this.MOVEMENT_SCALING;
    this.coyoteAvailable = false;
    this.bufferJumpAvailable = false;

    this.bufferJumpRange = 4 * this.MOVEMENT_SCALING;
    this.groundWithinBufferRange = false;
    this.bufferJumpAvailable = false;

    /* -------------------------------------------------------------------------- */
    /*                            Jump and fall timers                            */
    /* -------------------------------------------------------------------------- */
    this.timeJumpWasEntered = 0;
    this.timeFallWasEntered = 0;

    this.minJumpTime = 0.19 * this.MOVEMENT_SCALING;
    this.maxJumpTime = 0.25 * this.MOVEMENT_SCALING;
    this.coyoteTime = 0.07 * this.MOVEMENT_SCALING;
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
    switch (this.state) {
      case PlayerStates.IDLE:
        handlePlayerIdle(this);
        break;
      case PlayerStates.RUNNING:
        handlePlayerRunning(this);
        break;
      case PlayerStates.FALLING:
        handlePlayerFalling(this);
        break;
      case PlayerStates.JUMPING:
        handlePlayerJumping(this);
        break;
    }

    // Update the sprite state
    this.spriteAnimator.update(this.time.delta);
  }

  private updateTranslation() {
    // Given a desired translation, compute the actual translation that we can apply to the collider based on the obstacles.
    this.characterController.computeColliderMovement(
      this.physicsBody.collider(0),
      {
        x: this.nextTranslation.x * this.time.delta,
        y: this.nextTranslation.y * this.time.delta,
      },
      undefined,
      undefined,
      (collider) => {
        if (collider.isSensor()) {
          return false;
        }

        return true;
      }
    );

    // Get the actual translation possible from the physics computation
    const correctiveMovement = this.characterController.computedMovement();

    // Apply the actual translation to the next kinematic translation
    this.physicsBody.setNextKinematicTranslation({
      x: this.currentTranslation.x + correctiveMovement.x,
      y: this.currentTranslation.y + correctiveMovement.y,
    });
  }

  // Teleport player by x units relative from current location
  public teleportRelative(newX: number, newY: number) {
    this.physicsBody.setTranslation(
      {
        x: this.currentTranslation.x + newX,
        y: this.currentTranslation.y + newY,
      },
      true
    );
  }

  private detectCollisions() {
    // Get the collisions from the character controller
    this.getCollisionEvents();

    // ShapeCast downward
    const downCast = this.shapeCast({
      x: PlayerDirection.NEUTRAL,
      y: PlayerDirection.DOWN,
    });

    // ShapeCast leftward
    const leftCast = this.shapeCast({
      x: PlayerDirection.LEFT,
      y: PlayerDirection.NEUTRAL,
    });

    // ShapeCast rightward
    const rightCast = this.shapeCast({
      x: PlayerDirection.RIGHT,
      y: PlayerDirection.NEUTRAL,
    });

    // Detect ground buffer within range for buffer jump
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

    // Detect touching ground via shapeCast in case collision didn't
    if (
      !this.isTouching.ground &&
      downCast &&
      downCast.toi <= this.colliderOffset + 0.001
    ) {
      this.isTouching.ground = true;
    }

    // Detect touching walls via shapeCast in case collision didn't
    if (
      !this.isTouching.leftSide &&
      leftCast &&
      leftCast.toi <= this.colliderOffset + 0.001 &&
      (leftCast.collider.parent()?.userData as UserData).name != "Platform"
    ) {
      this.isTouching.leftSide = true;
    }

    if (
      !this.isTouching.rightSide &&
      rightCast &&
      rightCast.toi <= this.colliderOffset + 0.001 &&
      (rightCast.collider.parent()?.userData as UserData).name != "Platform"
    ) {
      this.isTouching.rightSide = true;
    }
  }

  private shapeCast(direction: { x: number; y: number }) {
    const hit = this.physics.world.castShape(
      {
        // Without offset here, the x shapeCast collides with the shape's inner wall for some reason
        x: this.currentTranslation.x + this.colliderOffset * direction.x,
        y: this.currentTranslation.y,
      },
      0,
      { x: direction.x, y: direction.y },
      this.physicsBody.collider(0).shape,
      1000,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      (collider) => {
        if (collider.isSensor()) {
          return false;
        }
        return true;
      }
    );

    if (hit) {
      return hit;
    }
  }

  private getCollisionEvents() {
    // Reset collisions, none detected
    this.isTouching.ground = false;
    this.isTouching.ceiling = false;
    this.isTouching.leftSide = false;
    this.isTouching.rightSide = false;

    for (
      let i = 0;
      i < this.characterController!.numComputedCollisions();
      i++
    ) {
      const collision = this.characterController.computedCollision(i);

      // y axis collision that happened to the character controller
      if (collision!.normal2.y == -1) {
        this.isTouching.ground = true;
      }
      if (collision!.normal2.y == 1) {
        this.isTouching.ceiling = true;
      }

      // x axis
      if (collision!.normal2.x == 1) {
        this.isTouching.rightSide = true;
      }
      if (collision!.normal2.x == -1) {
        this.isTouching.leftSide = true;
      }
    }
  }

  public update() {
    // Exit early if object is destroyed
    if (!this.mesh || !this.physicsBody) {
      return;
    }

    this.syncGraphicsToPhysics();
    this.updatePlayerState();
    this.updateTranslation();
    this.detectCollisions();
  }

  public destroy() {
    // Emit an event to signal the player's removal
    Emitter.emit("objectRemoved", (this.physicsBody.userData as UserData).name);

    // Remove character controller from the physics world
    this.physics.world.removeCharacterController(this.characterController);

    // Dispose of the sprite animator
    this.spriteAnimator.destroy();

    // Nullify all properties to release references
    this.MOVEMENT_SCALING = null as any;
    this.bufferJumpAvailable = null as any;
    this.bufferJumpRange = null as any;
    this.characterController = null as any;
    this.colliderOffset = null as any;
    this.coyoteAvailable = null as any;
    this.coyoteTime = null as any;
    this.debug = null as any;
    this.debugCoyoteCount = null as any;
    this.endedJumpEarly = null as any;
    this.fallAcceleration = null as any;
    this.groundAcceleration = null as any;
    this.groundDeceleration = null as any;
    this.groundWithinBufferRange = null as any;
    this.horizontalDirection = null as any;
    this.input = null as any;
    this.isTouching = null as any;
    this.jumpAcceleration = null as any;
    this.jumpEndedEarlyGravityModifier = null as any;
    this.jumpPower = null as any;
    this.maxFallSpeed = null as any;
    this.maxGroundSpeed = null as any;
    this.maxJumpTime = null as any;
    this.minJumpTime = null as any;
    this.nextTranslation = null as any;
    this.resources = null as any;
    this.spriteAnimator = null as any;
    this.state = null as any;
    this.time = null as any;
    this.timeFallWasEntered = null as any;
    this.timeJumpWasEntered = null as any;

    // Destroy base class resources
    super.destroy();
  }
}
