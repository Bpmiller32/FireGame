import * as RAPIER from "@dimforge/rapier2d";
import Time from "../../utils/time";
import Input from "../../utils/input";
import Debug from "../../utils/debug";
import ResourceLoader from "../../utils/resourceLoader";
import PlayerDirection from "../../utils/types/playerDirection";
import SpriteAnimator from "../../utils/spriteAnimator";
import SpriteAnimations from "./state/spriteAnimations";
import PlayerStates from "../../utils/types/playerStates";
import handleIdle from "./state/handleIdle";
import handleFalling from "./state/handleFalling";
import handleRunning from "./state/handleRunning";
import handleJumping from "./state/handleJumping";
import GameObject from "../objects/gameObject";
import debugPlayer from "./debugPlayer";

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

  public currentAnimation!: number[];
  public nextAnimation!: number[];
  public animationDuration!: number;

  public isTouching!: {
    ground: boolean;
    ceiling: boolean;
    leftSide: boolean;
    rightSide: boolean;
  };

  public maxGroundSpeed!: number;
  public groundAcceleration!: number;
  public groundDeceleration!: number;

  public maxFallSpeed!: number;
  public fallAcceleration!: number;
  public fallDeceleration!: number;

  public JumpEndEarlyGravityModifier!: number;
  public bufferJumpAvailable!: boolean;

  public timeJumpWasEntered!: number;
  timeInJumpState = 0.001;
  timeFallWasEntered = 0;
  timeInFallState = 0.001;

  JumpPower = 16;
  minJumpTime = 0.15;
  maxJumpTime = 0.3;
  coyoteTime = 0.1;
  coyoteAvailable = false;

  public endedJumpEarly!: boolean;
  groundWithinBufferRange = false;
  bufferJumpRange = 1;

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
    this.setMesh();
    this.setPhysics(
      size,
      position,
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );

    // Debug
    if (this.experience.debug?.isActive) {
      debugPlayer(this);
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

    this.currentAnimation = SpriteAnimations.IDLE_RIGHT;
    this.nextAnimation = SpriteAnimations.IDLE_RIGHT;
    this.animationDuration = 1;

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
    this.maxGroundSpeed = 14;
    // The player's capacity to gain horizontal speed
    this.groundAcceleration = 120;
    // The pace at which the player comes to a stop
    this.groundDeceleration = 60;

    // The maximum vertical movement speed
    this.maxFallSpeed = 40;
    // The player's capacity to gain fall speed. a.k.a. In Air Gravity
    this.fallAcceleration = 110;
    // Deceleration in air only after stopping input mid-air
    this.fallDeceleration = 30;

    /* -------------------------------------------------------------------------- */
    /*                                    Jump                                    */
    /* -------------------------------------------------------------------------- */
    this.JumpEndEarlyGravityModifier = 3;
    // this.JumpBuffer = 0.2;
    this.bufferJumpAvailable = false;
    this.timeJumpWasEntered = 0;
  }

  private setSpriteAnimator() {
    this.spriteAnimator = new SpriteAnimator(this.resources.items.test, 8, 8);

    // Set initial sprite loop
    this.spriteAnimator.spritesToLoop(
      this.currentAnimation,
      this.animationDuration
    );

    this.material = this.spriteAnimator.material;
  }

  private setCharacterController() {
    // Independent character controller attached to physics world, attaching here since this one is exclusively used for Player
    this.characterController = this.physics?.world?.createCharacterController(
      this.colliderOffset
    );
    this.characterController.enableSnapToGround(this.colliderOffset);
  }

  private updatePlayerState() {
    switch (this.state) {
      case PlayerStates.IDLE:
        handleIdle(this);
        break;
      case PlayerStates.RUNNING:
        handleRunning(this);
        break;
      case PlayerStates.FALLING:
        handleFalling(this);
        break;
      case PlayerStates.JUMPING:
        handleJumping(this);
        break;
    }
  }

  private updatePlayerSprite() {
    // Don't call spritesToLoop every frame
    if (this.currentAnimation !== this.nextAnimation) {
      this.currentAnimation = this.nextAnimation;

      this.spriteAnimator.spritesToLoop(
        this.currentAnimation,
        this.animationDuration
      );
    }

    this.spriteAnimator.update(this.time.delta);
  }

  private updateTranslation() {
    // Given a desired translation, compute the actual translation that we can apply to the collider based on the obstacles.
    this.characterController?.computeColliderMovement(this.body!.collider(0), {
      x: this.nextTranslation.x * this.time.delta,
      y: this.nextTranslation.y * this.time.delta,
    });

    const correctiveMovement = this.characterController?.computedMovement();

    // Apply the actual translation to the next kinematic translation
    this.body?.setNextKinematicTranslation({
      x: this.currentTranslation.x + correctiveMovement!.x,
      y: this.currentTranslation.y + correctiveMovement!.y,
    });
  }

  private detectCollisions() {
    this.detectGround();
    this.detectWall(PlayerDirection.LEFT);
    this.detectWall(PlayerDirection.RIGHT);
  }

  private detectGround() {
    const groundHit = this.physics.world.castShape(
      this.currentTranslation,
      0,
      { x: 0, y: -1 },
      this.body.collider(0).shape,
      1000,
      false
    );

    if (!groundHit) {
      return;
    }

    if (
      groundHit.toi <= this.bufferJumpRange &&
      !this.isTouching.ground &&
      this.nextTranslation.y <= 0
    ) {
      // console.log({ toi: groundHit.toi });
      this.groundWithinBufferRange = true;
    } else {
      this.groundWithinBufferRange = false;
    }

    if (
      groundHit.toi <= this.colliderOffset + 0.001 &&
      !this.isTouching.ground
    ) {
      this.isTouching.ground = true;
    } else if (
      groundHit.toi > this.colliderOffset + 0.001 &&
      this.isTouching.ground
    ) {
      this.isTouching.ground = false;
      // this.frameLeftGrounded = this.time.elapsed;
    }
  }

  private detectWall(direction: number) {
    const wallHit = this.physics.world.castShape(
      {
        x: this.currentTranslation.x + this.colliderOffset * direction,
        y: this.currentTranslation.y,
      },
      0,
      { x: direction, y: 0 },
      this.body.collider(0).shape,
      1000,
      false
    );

    // Wall touched
    if (wallHit && Math.abs(wallHit.toi) <= this.colliderOffset) {
      // console.log({
      //   toi: wallHit.toi,
      //   direction: direction,
      //   body: wallHit.collider.parent()?.userData,
      // });

      if (direction == PlayerDirection.RIGHT) {
        this.isTouching.rightSide = true;
        return;
      }

      if (direction == PlayerDirection.LEFT) {
        this.isTouching.leftSide = true;
      }
    }
    // Wall not touched/too far away
    else {
      if (direction == PlayerDirection.RIGHT) {
        this.isTouching.rightSide = false;
        return;
      }

      if (direction == PlayerDirection.LEFT) {
        this.isTouching.leftSide = false;
      }
    }
  }

  public update() {
    this.updatePlayerState();
    this.updatePlayerSprite();
    this.syncThreeToRapier();
    this.updateTranslation();
    this.detectCollisions();
  }
}
