import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameUtils from "../../../utils/gameUtils";

const handlePlayerFalling = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to idle or running state
  if (player.isTouching.ground) {
    if (
      (player.input.isNeitherLeftRight() || player.input.isLeftRightCombo()) &&
      Math.abs(player.nextTranslation.x) < player.maxGroundSpeed * 0.01
    ) {
      player.state = PlayerStates.IDLE;
    } else {
      player.state = PlayerStates.RUNNING;
    }

    // Reset gating mechanism for counting buffer jumps
    player.wasBufferJumpUsed = false;
    return;
  }

  // Allow transition into jumping state when otherwise should be falling - coyote time
  if (
    player.input.isJump() &&
    player.coyoteAvailable &&
    player.time.elapsed < player.timeFallWasEntered + player.coyoteTime
  ) {
    player.coyoteCount += 1;

    player.nextTranslation.y = 0;
    player.coyoteAvailable = false;
    player.timeJumpWasEntered = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                            Handle Falling state                            */
  /* -------------------------------------------------------------------------- */
  // Check if ground is within buffer range
  if (player.groundWithinBufferRange) {
    // Return collider to initial size
    player.changeColliderSize({
      width: player.initialSize.x,
      height: player.initialSize.y,
    });

    // Give buffer jump
    if (!player.input.isJump()) {
      player.bufferJumpAvailable = true;
    }
  }

  // Count buffer jumps
  if (
    player.bufferJumpAvailable &&
    player.input.isJump() &&
    !player.wasBufferJumpUsed
  ) {
    player.wasBufferJumpUsed = true;
    player.bufferJumpCount++;
  }

  // Take coyote jump if too much time has passed falling
  if (player.time.elapsed >= player.timeFallWasEntered + player.coyoteTime) {
    player.coyoteAvailable = false;
  }

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  // Left
  if (player.input.isLeft()) {
    player.direction = PlayerDirection.LEFT;
    player.spriteAnimator.changeState(SpriteAnimations.FALL_LEFT);
  }
  // Right
  else if (player.input.isRight()) {
    player.direction = PlayerDirection.RIGHT;
    player.spriteAnimator.changeState(SpriteAnimations.FALL_RIGHT);
  }
  // Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo()
  ) {
    player.direction = PlayerDirection.NEUTRAL;

    const isFacingLeft =
      player.spriteAnimator.state === SpriteAnimations.IDLE_LEFT ||
      player.spriteAnimator.state === SpriteAnimations.RUN_LEFT ||
      player.spriteAnimator.state === SpriteAnimations.JUMP_LEFT;

    const isFacingRight =
      player.spriteAnimator.state === SpriteAnimations.IDLE_RIGHT ||
      player.spriteAnimator.state === SpriteAnimations.RUN_RIGHT ||
      player.spriteAnimator.state === SpriteAnimations.JUMP_RIGHT;

    if (isFacingLeft) {
      player.spriteAnimator.changeState(SpriteAnimations.FALL_LEFT);
    }

    if (isFacingRight) {
      player.spriteAnimator.changeState(SpriteAnimations.FALL_RIGHT);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                           Gravity Logic (Y Axis)                           */
  /* -------------------------------------------------------------------------- */
  let inAirGravity = player.fallAcceleration;

  // Apply early jump gravity modifier if the jump ended early and player is moving up
  if (player.endedJumpEarly && player.nextTranslation.y > 0) {
    inAirGravity *= player.jumpEndedEarlyGravityModifier;
  }

  // Move player in the Y direction if coyote time is not available
  if (!player.coyoteAvailable) {
    player.nextTranslation.y = GameUtils.moveTowardsPoint(
      player.nextTranslation.y,
      -player.maxFallSpeed,
      inAirGravity * player.time.delta
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                           Movement Logic (X axis)                          */
  /* -------------------------------------------------------------------------- */
  let targetSpeed = 0;
  let acceleration = 0;

  // Decellerate x movement while falling
  if (player.direction === PlayerDirection.NEUTRAL) {
    targetSpeed = 0;
    acceleration = player.groundDeceleration;
  }
  // Accellerate x movement while falling
  else {
    targetSpeed = player.direction * player.maxGroundSpeed;
    acceleration = player.groundAcceleration;
  }

  // Set desired velocity
  player.nextTranslation.x = GameUtils.moveTowardsPoint(
    player.nextTranslation.x,
    targetSpeed,
    acceleration * player.time.delta
  );

  // Stop movement on wall collision
  if (
    (player.isTouching.leftSide && player.direction === PlayerDirection.LEFT) ||
    (player.isTouching.rightSide && player.direction === PlayerDirection.RIGHT)
  ) {
    player.nextTranslation.x = 0;
  }
};

export default handlePlayerFalling;
