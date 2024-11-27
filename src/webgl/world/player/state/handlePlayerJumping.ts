import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameUtils from "../../../utils/gameUtils";

const handlePlayerJumping = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Hitting a ceiling
  if (player.isTouching.ceiling && player.nextTranslation.y >= 0) {
    player.nextTranslation.y = 0;
    player.timeFallWasEntered = player.time.elapsed;
    player.state = PlayerStates.FALLING;
    return;
  }

  // Max jump time exceeded
  if (player.time.elapsed >= player.timeJumpWasEntered + player.maxJumpTime) {
    player.endedJumpEarly = false;

    player.nextTranslation.y = 0;
    player.timeFallWasEntered = player.time.elapsed;
    player.state = PlayerStates.FALLING;
    return;
  }

  // Min jump time exceeded and not holding jump
  if (
    !player.input.isJump() &&
    player.time.elapsed > player.timeJumpWasEntered + player.minJumpTime
  ) {
    player.endedJumpEarly = true;

    player.nextTranslation.y = 0;
    player.timeFallWasEntered = player.time.elapsed;
    player.state = PlayerStates.FALLING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                            Handle Jumping state                            */
  /* -------------------------------------------------------------------------- */
  // Disable coyote and buffer jump availability
  player.coyoteAvailable = false;
  player.bufferJumpAvailable = false;

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  // Left
  if (player.input.isLeft()) {
    player.direction = PlayerDirection.LEFT;
    player.spriteAnimator.changeState(SpriteAnimations.JUMP_LEFT);
  }
  // Right
  else if (player.input.isRight()) {
    player.direction = PlayerDirection.RIGHT;
    player.spriteAnimator.changeState(SpriteAnimations.JUMP_RIGHT);
  }
  // Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo()
  ) {
    player.direction = PlayerDirection.NEUTRAL;

    const currentState = player.spriteAnimator.state;

    if (
      currentState === SpriteAnimations.IDLE_LEFT ||
      currentState === SpriteAnimations.RUN_LEFT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.JUMP_LEFT);
    }
    if (
      currentState === SpriteAnimations.IDLE_RIGHT ||
      currentState === SpriteAnimations.RUN_RIGHT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.JUMP_RIGHT);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                             Jump Logic (Y Axis)                            */
  /* -------------------------------------------------------------------------- */
  // Apply jump physics
  player.nextTranslation.y = GameUtils.moveTowardsPoint(
    player.nextTranslation.y,
    player.jumpPower,
    player.jumpAcceleration * player.time.delta
  );

  /* -------------------------------------------------------------------------- */
  /*                           Movement Logic (X Axis)                          */
  /* -------------------------------------------------------------------------- */
  let targetSpeed = 0;
  let acceleration = 0;

  // Decellerate x movement while jumping
  if (player.direction === PlayerDirection.NEUTRAL) {
    targetSpeed = 0;
    acceleration = player.groundDeceleration;
  }
  // Accellerate x movement while jumping
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

export default handlePlayerJumping;
