import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameMath from "../../../utils/gameMath";

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
    !player.input.isUp() &&
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
  // Timer
  player.timeInJumpState = player.time.elapsed - player.timeJumpWasEntered;
  player.coyoteAvailable = false;
  player.bufferJumpAvailable = false;

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  //   Left
  if (player.input.isLeft()) {
    player.horizontalDirection = PlayerDirection.LEFT;
    player.spriteAnimator.changeState(SpriteAnimations.JUMP_LEFT);
  }
  //   Right
  else if (player.input.isRight()) {
    player.horizontalDirection = PlayerDirection.RIGHT;
    player.spriteAnimator.changeState(SpriteAnimations.JUMP_RIGHT);
  }
  //   Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo()
  ) {
    player.horizontalDirection = PlayerDirection.NEUTRAL;

    if (
      player.spriteAnimator.state == SpriteAnimations.IDLE_LEFT ||
      player.spriteAnimator.state == SpriteAnimations.RUN_LEFT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.JUMP_LEFT);
    }
    if (
      player.spriteAnimator.state == SpriteAnimations.IDLE_RIGHT ||
      player.spriteAnimator.state == SpriteAnimations.RUN_RIGHT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.JUMP_RIGHT);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                    Jump                                    */
  /* -------------------------------------------------------------------------- */
  // Apply jump
  player.nextTranslation.y = GameMath.moveTowardsPoint(
    player.nextTranslation.y,
    player.jumpPower,
    player.jumpAcceleration * player.time.delta
  );

  /* -------------------------------------------------------------------------- */
  /*                               Handle movement                              */
  /* -------------------------------------------------------------------------- */
  // Accelerate
  if (player.horizontalDirection != PlayerDirection.NEUTRAL) {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      player.horizontalDirection * player.maxGroundSpeed,
      player.groundAcceleration * player.time.delta
    );
  }
  // Decelerate
  else {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      0,
      player.groundDeceleration * player.time.delta
    );
  }

  // Hitting a wall
  if (
    (player.isTouching.leftSide &&
      player.horizontalDirection == PlayerDirection.LEFT) ||
    (player.isTouching.rightSide &&
      player.horizontalDirection == PlayerDirection.RIGHT)
  ) {
    player.nextTranslation.x = 0;
  }
};

export default handlePlayerJumping;
