import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameMath from "../../../utils/gameMath";

const playerFalling = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                    Timer                                   */
  /* -------------------------------------------------------------------------- */
  player.timeInFallState = player.time.elapsed - player.timeFallWasEntered;

  /* -------------------------------------------------------------------------- */
  /*                         Handle input and animation                         */
  /* -------------------------------------------------------------------------- */
  //   Left
  if (player.input.isLeft()) {
    player.horizontalDirection = PlayerDirection.LEFT;
    player.nextAnimation = SpriteAnimations.RUN_LEFT;
  }
  //   Right
  else if (player.input.isRight()) {
    player.horizontalDirection = PlayerDirection.RIGHT;
    player.nextAnimation = SpriteAnimations.RUN_RIGHT;
  }
  //   Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo()
  ) {
    player.horizontalDirection = PlayerDirection.NEUTRAL;
  }

  /* -------------------------------------------------------------------------- */
  /*                               Handle gravity                               */
  /* -------------------------------------------------------------------------- */
  if (player.isTouching.ground && player.nextTranslation.y <= 0) {
    player.nextTranslation.y = 0;
  } else {
    let inAirGravity = player.fallAcceleration;

    if (player.endedJumpEarly && player.nextTranslation.y > 0) {
      inAirGravity *= player.JumpEndEarlyGravityModifier;
    }

    player.nextTranslation.y = GameMath.moveTowardsPoint(
      player.nextTranslation.y,
      -player.maxFallSpeed,
      inAirGravity * player.time.delta
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                               Handle movement                              */
  /* -------------------------------------------------------------------------- */
  // Accelerate
  if (player.horizontalDirection != PlayerDirection.NEUTRAL) {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      player.horizontalDirection * player.maxGroundSpeed,
      player.fallAcceleration * player.time.delta
    );
  }
  // Decelerate
  else {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      0,
      player.fallDeceleration * player.time.delta
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  if (player.groundWithinBufferRange && !player.input.isUp()) {
    console.log("gave buffer jump");
    player.bufferJumpAvailable = true;
  }

  if (!player.isTouching.ground) {
    // Allow transition into jumping state when otherwise should be falling
    // Coyote time
    if (
      player.input.isUp() &&
      player.coyoteAvailable &&
      player.time.elapsed < player.timeFallWasEntered + player.coyoteTime
    ) {
      console.log("COYOTE!");
      player.coyoteAvailable = false;
      player.timeJumpWasEntered = player.time.elapsed;
      player.state = PlayerStates.JUMPING;
    }

    // Stay in falling state
    return;
  }

  // Transition to idle or running state
  if (
    player.input.isNeitherLeftRight() &&
    Math.abs(player.nextTranslation.x) < player.maxGroundSpeed * 0.01
  ) {
    player.state = PlayerStates.IDLE;
  } else {
    player.state = PlayerStates.RUNNING;
  }
};

export default playerFalling;
