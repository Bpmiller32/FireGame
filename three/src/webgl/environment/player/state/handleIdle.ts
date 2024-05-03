import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";

const playerIdle = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                              Handle animation                              */
  /* -------------------------------------------------------------------------- */
  switch (player.direction) {
    case PlayerDirection.LEFT:
      player.nextAnimation = SpriteAnimations.IDLE_LEFT;
      break;
    case PlayerDirection.RIGHT:
      player.nextAnimation = SpriteAnimations.IDLE_RIGHT;
      break;

    // PlayerDirection == NEUTRAL
    default:
      if (
        player.currentAnimation == SpriteAnimations.IDLE_LEFT ||
        player.currentAnimation == SpriteAnimations.IDLE_RIGHT
      ) {
        break;
      }
      if (player.currentAnimation == SpriteAnimations.RUN_LEFT) {
        player.nextAnimation = SpriteAnimations.IDLE_LEFT;
      }
      if (player.currentAnimation == SpriteAnimations.RUN_RIGHT) {
        player.nextAnimation = SpriteAnimations.IDLE_RIGHT;
      }
      break;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to falling state
  if (!player.isTouching.ground && player.nextTranslation.y <= 0) {
    player.state = PlayerStates.FALLING;
  }

  // Transition to running state
  if (player.input.isLeft() || player.input.isRight()) {
    player.state = PlayerStates.RUNNING;
  }

  // Transition to jumping state
  if (player.input.isUp()) {
    player.timeJumpWasPressed = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
  }
};

export default playerIdle;