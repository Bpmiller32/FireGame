import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameMath from "../../../utils/gameMath";

const playerFalling = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to idle or running state
  if (player.isTouching.ground) {
    if (
      player.input.isNeitherLeftRight() &&
      Math.abs(player.nextTranslation.x) < player.maxGroundSpeed * 0.01
    ) {
      player.state = PlayerStates.IDLE;
    } else {
      player.state = PlayerStates.RUNNING;
    }

    player.nextTranslation.y = 0;
    return;
  }

  // Allow transition into jumping state when otherwise should be falling - coyote time
  if (
    player.input.isUp() &&
    player.coyoteAvailable &&
    player.time.elapsed < player.timeFallWasEntered + player.coyoteTime
  ) {
    player.debugCoyoteCount += 1;

    player.nextTranslation.y = 0;
    player.coyoteAvailable = false;
    player.timeJumpWasEntered = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                            Handle Falling state                            */
  /* -------------------------------------------------------------------------- */
  // Timer
  player.timeInFallState = player.time.elapsed - player.timeFallWasEntered;

  // Give buffer jump
  if (player.groundWithinBufferRange && !player.input.isUp()) {
    player.bufferJumpAvailable = true;
  }

  // Take coyote jump if too much time has passed falling
  if (player.time.elapsed >= player.timeFallWasEntered + player.coyoteTime) {
    player.coyoteAvailable = false;
  }

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  //   Left
  if (player.input.isLeft()) {
    player.horizontalDirection = PlayerDirection.LEFT;
    player.spriteAnimator.changeState(SpriteAnimations.FALL_LEFT);
  }
  //   Right
  else if (player.input.isRight()) {
    player.horizontalDirection = PlayerDirection.RIGHT;
    player.spriteAnimator.changeState(SpriteAnimations.FALL_RIGHT);
  }
  //   Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo()
  ) {
    player.horizontalDirection = PlayerDirection.NEUTRAL;

    if (
      player.spriteAnimator.state == SpriteAnimations.IDLE_LEFT ||
      player.spriteAnimator.state == SpriteAnimations.RUN_LEFT ||
      player.spriteAnimator.state == SpriteAnimations.JUMP_LEFT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.FALL_LEFT);
    }
    if (
      player.spriteAnimator.state == SpriteAnimations.IDLE_RIGHT ||
      player.spriteAnimator.state == SpriteAnimations.RUN_RIGHT ||
      player.spriteAnimator.state == SpriteAnimations.JUMP_RIGHT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.FALL_RIGHT);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Gravity                                  */
  /* -------------------------------------------------------------------------- */
  let inAirGravity = player.fallAcceleration;

  if (player.endedJumpEarly && player.nextTranslation.y > 0) {
    inAirGravity *= player.jumpEndedEarlyGravityModifier;
  }

  player.nextTranslation.y = GameMath.moveTowardsPoint(
    player.nextTranslation.y,
    -player.maxFallSpeed,
    inAirGravity * player.time.delta
  );

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
};

export default playerFalling;
