import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";

const handlePlayerIdle = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to falling state
  if (!player.isTouching.ground && player.nextTranslation.y <= 0) {
    player.timeFallWasEntered = player.time.elapsed;
    player.state = PlayerStates.FALLING;
    return;
  }

  // Transition to running state
  if (player.input.isLeft() || player.input.isRight()) {
    player.state = PlayerStates.RUNNING;
    return;
  }

  // Transition to jumping state
  if (player.input.isUp() && player.bufferJumpAvailable) {
    player.timeJumpWasEntered = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                              Handle Idle state                             */
  /* -------------------------------------------------------------------------- */
  // In a grounded state, give coyote and reset early jump gravity
  player.coyoteAvailable = true;
  player.endedJumpEarly = false;
  if (!player.input.isUp()) {
    player.bufferJumpAvailable = true;
  }

  // Simple max gravity, TODO: explain and/or make section
  player.nextTranslation.y = -player.maxFallSpeed;

  /* -------------------------------------------------------------------------- */
  /*                                  Animation                                 */
  /* -------------------------------------------------------------------------- */
  switch (player.horizontalDirection) {
    case PlayerDirection.LEFT:
      player.spriteAnimator.changeState(SpriteAnimations.IDLE_LEFT);
      break;
    case PlayerDirection.RIGHT:
      player.spriteAnimator.changeState(SpriteAnimations.IDLE_RIGHT);
      break;

    // PlayerDirection == NEUTRAL
    default:
      if (
        player.spriteAnimator.state == SpriteAnimations.IDLE_LEFT ||
        player.spriteAnimator.state == SpriteAnimations.IDLE_RIGHT
      ) {
        break;
      }
      if (
        player.spriteAnimator.state == SpriteAnimations.RUN_LEFT ||
        player.spriteAnimator.state == SpriteAnimations.FALL_LEFT
      ) {
        player.spriteAnimator.changeState(SpriteAnimations.IDLE_LEFT);
      }
      if (
        player.spriteAnimator.state == SpriteAnimations.RUN_RIGHT ||
        player.spriteAnimator.state == SpriteAnimations.FALL_RIGHT
      ) {
        player.spriteAnimator.changeState(SpriteAnimations.IDLE_RIGHT);
      }
      break;
  }
};

export default handlePlayerIdle;
