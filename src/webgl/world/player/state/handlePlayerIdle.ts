import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";

const handlePlayerIdle = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Check for edge case where verical direction is positive before entering idle
  if (
    player.nextTranslation.y >= 0 &&
    (player.input.isLeft() || player.input.isRight())
  ) {
    player.nextTranslation.y = -player.maxFallSpeed;
    return;
  }

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
  if (player.input.isJump() && player.bufferJumpAvailable) {
    // Make the collider smaller in air for better feel
    player.changeColliderSize({ width: 1.75, height: 2.5 });

    player.timeJumpWasEntered = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
    return;
  }

  // Transition to climbing state
  if (
    player.isTouching.ladderCore &&
    (player.input.isUp() || player.input.isDown()) &&
    !(player.isTouching.ladderTop && player.input.isUp()) &&
    !(player.isTouching.ladderBottom && player.input.isDown())
  ) {
    player.nextTranslation.x = 0;
    player.nextTranslation.y = 0;

    player.state = PlayerStates.CLIMBING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                              Handle Idle state                             */
  /* -------------------------------------------------------------------------- */
  // In a grounded state, give coyote and reset early jump gravity
  player.coyoteAvailable = true;
  player.endedJumpEarly = false;
  if (!player.input.isJump()) {
    player.bufferJumpAvailable = true;
  }

  // Simple max gravity in non-vertical state to fix downward movement on slopes, maintain touching ground
  player.nextTranslation.y = -player.maxFallSpeed;

  /* -------------------------------------------------------------------------- */
  /*                                  Animation                                 */
  /* -------------------------------------------------------------------------- */
  switch (player.direction) {
    case PlayerDirection.LEFT:
      player.spriteAnimator.changeState(SpriteAnimations.IDLE_LEFT);
      break;
    case PlayerDirection.RIGHT:
      player.spriteAnimator.changeState(SpriteAnimations.IDLE_RIGHT);
      break;

    // PlayerDirection == NEUTRAL
    default:
      const currentState = player.spriteAnimator.state;

      // If already in idle state, no need to change
      if (
        currentState === SpriteAnimations.IDLE_LEFT ||
        currentState === SpriteAnimations.IDLE_RIGHT
      ) {
        break;
      }

      // Transitioned into idle state, match with correct idle orientation
      if (
        currentState === SpriteAnimations.RUN_LEFT ||
        currentState === SpriteAnimations.FALL_LEFT
      ) {
        player.spriteAnimator.changeState(SpriteAnimations.IDLE_LEFT);
      } else if (
        currentState === SpriteAnimations.RUN_RIGHT ||
        currentState === SpriteAnimations.FALL_RIGHT
      ) {
        player.spriteAnimator.changeState(SpriteAnimations.IDLE_RIGHT);
      }
      break;
  }
};

export default handlePlayerIdle;
