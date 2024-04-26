import PlayerStates from "./playerStates";
import PlayerAnimations from "./playerSpriteAnimations";
import Input from "../../utils/input";
import SpritePlayer from "../../utils/spritePlayer";
import RAPIER, { Vector2 } from "@dimforge/rapier2d";

export default class PlayerStateManager {
  // Setup
  public currentState = PlayerStates.IDLE;
  public currentAnimation = PlayerAnimations.IDLE_RIGHT;
  public nextAnimation = PlayerAnimations.IDLE_RIGHT;
  public animationDuration = 1;
  public isFacingRight = true;

  public newVelocity = new RAPIER.Vector2(0, 0);

  public maxSpeed = 0.1;
  public acceleration = 0.02;
  public friction = 0.004;
  public gravity = 0.0001;

  // Constructor setup
  public input: Input;
  public spritePlayer: SpritePlayer;
  public playerVelocity: Vector2;
  public isTouchingGround: boolean;

  constructor(
    input: Input,
    spritePlayer: SpritePlayer,
    playerVelocity: Vector2,
    isTouchingGround: boolean
  ) {
    this.input = input;
    this.spritePlayer = spritePlayer;
    this.playerVelocity = playerVelocity;
    this.isTouchingGround = isTouchingGround;

    // Set initial sprite loop
    this.spritePlayer.spritesToLoop(
      this.currentAnimation,
      this.animationDuration
    );
  }

  updateState() {
    switch (this.currentState) {
      case PlayerStates.IDLE:
        // Set animation
        if (this.isFacingRight == true) {
          this.nextAnimation = PlayerAnimations.IDLE_RIGHT;
        } else {
          this.nextAnimation = PlayerAnimations.IDLE_LEFT;
        }

        // Check for transition to falling state
        if (!this.isTouchingGround) {
          this.currentState = PlayerStates.FALLING;
        }

        // Check for transition to running state
        if (this.input.keys.left.isPressed || this.input.keys.right.isPressed) {
          this.currentState = PlayerStates.RUNNING;
        }

        // Check for transition to jumping state
        if (this.input.keys.up.isPressed) {
          this.currentState = PlayerStates.JUMPING;
        }

        break;

      case PlayerStates.RUNNING:
        // Apply acceleration based on input
        if (
          this.input.keys.left.isPressed &&
          !this.input.keys.right.isPressed
        ) {
          // Set sprite
          this.isFacingRight = false;
          this.nextAnimation = PlayerAnimations.RUN_LEFT;

          // Apply acceleration until topspeed
          this.newVelocity.x -= this.acceleration;
          if (this.newVelocity.x < -this.maxSpeed) {
            this.newVelocity.x = -this.maxSpeed;
          }
        } else if (
          !this.input.keys.left.isPressed &&
          this.input.keys.right.isPressed
        ) {
          this.isFacingRight = true;
          this.nextAnimation = PlayerAnimations.RUN_RIGHT;

          // Apply acceleration until topspeed
          this.newVelocity.x += this.acceleration;
          if (this.newVelocity.x > this.maxSpeed) {
            this.newVelocity.x = this.maxSpeed;
          }
        }

        // Still moving
        if (this.playerVelocity.x > 0) {
          this.currentState = PlayerStates.RUNNING;
          this.newVelocity.x -= this.friction;

          if (this.newVelocity.x < 0) {
            this.newVelocity.x = 0;
          }

          break;
        }
        if (this.playerVelocity.x < 0) {
          this.currentState = PlayerStates.RUNNING;
          this.newVelocity.x += this.friction;

          if (this.newVelocity.x > 0) {
            this.newVelocity.x = 0;
          }

          break;
        }

        // Check for transition to idle state
        if (
          !this.input.keys.left.isPressed &&
          !this.input.keys.right.isPressed
        ) {
          this.currentState = PlayerStates.IDLE;
        }

        // Check for transition to jumping state
        if (this.input.keys.up.isPressed) {
          this.currentState = PlayerStates.JUMPING;
        }

        break;

      case PlayerStates.FALLING:
        // Apply gravity
        this.newVelocity.y -= this.gravity;

        // Check for collision with ground to transition to idle or running state
        if (this.isTouchingGround) {
          console.log("playerVelocity", this.playerVelocity.y);
          console.log("newVelocity", this.newVelocity.y);
          this.newVelocity.y = 0;

          if (
            this.input?.keys.left.isPressed ||
            this.input?.keys.right.isPressed
          ) {
            this.currentState = PlayerStates.RUNNING;
          } else {
            this.currentState = PlayerStates.IDLE;
          }
        }

        break;
    }
  }

  updateSprite(deltaTime: number) {
    // Don't call spritesToLoop every frame
    if (this.currentAnimation !== this.nextAnimation) {
      this.currentAnimation = this.nextAnimation;

      this.spritePlayer.spritesToLoop(
        this.currentAnimation,
        this.animationDuration
      );
    }

    this.spritePlayer.update(deltaTime);
  }

  update(
    deltaTime: number,
    playerVelocity: RAPIER.Vector2,
    isTouchingGround: boolean
  ) {
    this.playerVelocity = playerVelocity;
    this.isTouchingGround = isTouchingGround;

    this.updateState();
    this.updateSprite(deltaTime);
  }
}
