import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameMath from "../../../utils/gameMath";

const handlePlayerRunning = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to falling state
  if (!player.isTouching.ground) {
    player.nextTranslation.y = 0;

    player.timeFallWasEntered = player.time.elapsed;
    player.state = PlayerStates.FALLING;
    return;
  }

  // Transition to idle state
  if (
    Math.abs(player.nextTranslation.x) <= player.maxGroundSpeed * 0.01 &&
    (player.input.isNeitherLeftRight() || player.input.isLeftRightCombo())
  ) {
    player.nextTranslation.x = 0;
    player.nextTranslation.y = 0;
    player.state = PlayerStates.IDLE;
    return;
  }

  // Transition to jumping state
  if (player.input.isUp() && player.bufferJumpAvailable) {
    player.nextTranslation.y = 0;

    player.timeJumpWasEntered = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                            Handle Running state                            */
  /* -------------------------------------------------------------------------- */
  // In a grounded state, give coyote and reset early jump gravity
  player.coyoteAvailable = true;
  player.endedJumpEarly = false;
  if (!player.input.isUp()) {
    player.bufferJumpAvailable = true;
  }

  // Controls accelerating or decellerating the sprite animation transitions
  player.spriteAnimator.changeAnimationTiming(
    1 / (Math.abs(player.nextTranslation.x) / 3)
  );

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  //   Left
  if (player.input.isLeft()) {
    player.horizontalDirection = PlayerDirection.LEFT;
    player.spriteAnimator.changeState(SpriteAnimations.RUN_LEFT);
  }
  //   Right
  else if (player.input.isRight()) {
    player.horizontalDirection = PlayerDirection.RIGHT;
    player.spriteAnimator.changeState(SpriteAnimations.RUN_RIGHT);
  }
  //   Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo()
  ) {
    player.horizontalDirection = PlayerDirection.NEUTRAL;

    if (
      player.spriteAnimator.state == SpriteAnimations.JUMP_LEFT ||
      player.spriteAnimator.state == SpriteAnimations.FALL_LEFT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.RUN_LEFT);
    }
    if (
      player.spriteAnimator.state == SpriteAnimations.JUMP_RIGHT ||
      player.spriteAnimator.state == SpriteAnimations.FALL_RIGHT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.RUN_RIGHT);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Movement                                  */
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

  // Simple Gravity in non-vertical state to fix movement downward on slopes, maintain touching ground
  player.nextTranslation.y = GameMath.moveTowardsPoint(
    player.nextTranslation.y,
    -player.maxFallSpeed,
    player.fallAcceleration * player.time.delta
  );

  // Hitting a wall
  if (
    (player.isTouching.leftSide &&
      player.horizontalDirection == PlayerDirection.LEFT) ||
    (player.isTouching.rightSide &&
      player.horizontalDirection == PlayerDirection.RIGHT)
  ) {
    player.nextTranslation.x = 0;

    // Play running animation even though hitting a wall (didn't want to put another if above for the same check)
    console.log(player.spriteAnimator);
    player.spriteAnimator.changeAnimationTiming(0.12);
  }
};

export default handlePlayerRunning;
