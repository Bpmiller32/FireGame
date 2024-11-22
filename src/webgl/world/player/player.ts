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
  public time: Time;
  public input: Input;
  private debug?: Debug;
  public resources: ResourceLoader;
  public spriteAnimator!: SpriteAnimator;
  public characterController!: RAPIER.KinematicCharacterController;

  // Player variables
  public initalSize!: RAPIER.Vector2;
  public state!: string;
  public direction!: number;
  public colliderOffset!: number;
  public currentPositionX!: number;
  public currentPositionY!: number;
  public nextTranslation!: RAPIER.Vector2;

  public isTouching!: ContactPoints;

  public currentFloor: number = 0;

  public maxClimbSpeed!: number;
  public climbAcceleration!: number;
  public climbDeceleration!: number;

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

  // TODO: remove after debug
  debugCoyoteCount = 0;
  debugMovementSpeedX = 0;

  public constructor(
    size: { width: number; height: number },
    position: { x: number; y: number }
  ) {
    super();

    this.time = this.experience.time;
    this.input = this.experience.input;
    this.resources = this.experience.resources;

    // Set inital size so I don't have to look for it in physicsBody.collider.shape.halfExtents later
    this.initalSize = { x: size.width, y: size.height };
    this.drawGraphics = true;

    setDkAttributes(this);
    this.setPhysicsAttributes();
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

  private setPhysicsAttributes() {
    this.colliderOffset = 0.01;
    this.currentPositionX = 0;
    this.currentPositionY = 0;
    this.nextTranslation = new RAPIER.Vector2(0, 0);

    this.isTouching = {
      ground: false,
      ceiling: false,
      leftSide: false,
      rightSide: false,

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

      case PlayerStates.CLIMBING:
        handlePlayerClimbing(this);
        break;
    }

    // Update the sprite state
    this.spriteAnimator.update(this.time.delta);
  }

  private updateTranslation() {
    // Update player position to a variable TODO: mostly for debug, remove?
    const position = this.physicsBody.translation();
    this.currentPositionX = position.x;
    this.currentPositionY = position.y;

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
        // Tried CollisionGroups, filterGroups in this function and class. Tried EventQueue and drainCollisionEvents in Physics class, either don't work at all as documented or don't work in a useful way.... Resorting to only using predicate

        // Don't collide with sensors or OneWayPlatforms while under them
        if (
          collider.isSensor() ||
          GameUtils.getDataFromCollider(collider).isOneWayPlatformActive == true
        ) {
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
    this.getCharacterControllerCollisions();
    this.getShapeCastCollisions();
  }

  private getCharacterControllerCollisions() {
    // Reset collisions, none detected
    this.isTouching.ground = false;
    this.isTouching.ceiling = false;
    this.isTouching.leftSide = false;
    this.isTouching.rightSide = false;

    // // CharacterController ground detection that saves a downCast later in shapeCastCollisions
    // if (this.characterController.computedGrounded()) {
    //   this.isTouching.ground = true;
    // }

    for (
      let i = 0;
      i < this.characterController!.numComputedCollisions();
      i++
    ) {
      const collision = this.characterController.computedCollision(i);

      // y axis collisions that happened to the character controller
      if (collision!.normal2.y == -1) {
        // this.isTouching.ground = true;

        // TODO: messy, revisit
        if (
          GameUtils.getDataFromCollider(collision!.collider!).name ==
          "OneWayPlatform"
        ) {
          this.currentFloor = GameUtils.getDataFromCollider(
            collision!.collider!
          ).value;
        }
      }
      if (
        collision!.normal2.y == 1 &&
        // Handle OneWayPlatforms
        GameUtils.getDataFromCollider(collision!.collider!).name !=
          "OneWayPlatform"
      ) {
        this.isTouching.ceiling = true;
      }

      // x axis
      if (collision!.normal2.x == 1) {
        // this.isTouching.rightSide = true;
      }
      if (collision!.normal2.x == -1) {
        // this.isTouching.leftSide = true;
      }
    }
  }

  private getShapeCastCollisions() {
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

    // Detect touching ground via shapeCast in case collision didn't, ignore Walls
    if (
      !this.isTouching.ground &&
      downCast &&
      downCast.toi <= this.colliderOffset + 0.001 &&
      GameUtils.getDataFromCollider(downCast.collider).name != "Wall" &&
      GameUtils.getDataFromCollider(downCast.collider).isOneWayPlatformActive ==
        false
    ) {
      this.isTouching.ground = true;
    }

    // Detect touching walls via shapeCast in case collision didn't, ignore OneWayPlatforms
    if (
      !this.isTouching.leftSide &&
      leftCast &&
      leftCast.toi <= this.colliderOffset + 0.001 &&
      GameUtils.getDataFromCollider(leftCast.collider).name != "OneWayPlatform"
    ) {
      this.isTouching.leftSide = true;
    }

    if (
      !this.isTouching.rightSide &&
      rightCast &&
      rightCast.toi <= this.colliderOffset + 0.001 &&
      GameUtils.getDataFromCollider(rightCast.collider).name != "OneWayPlatform"
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
