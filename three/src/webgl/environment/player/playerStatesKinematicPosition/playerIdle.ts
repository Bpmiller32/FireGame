import Player from "../playerKinematicPosition";
import PlayerStates from "../../../utils/types/playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";

const playerIdle = (player: Player) => {
  player.handledIdle += 1;

  if (player.jumpStateTimer.isOn) {
    console.log(
      "time in jumpState: ",
      player.time.elapsed - player.jumpStateTimer.time
    );

    player.jumpStateTimer.isOn = false;
    player.jumpStateTimer.time = 0;
  }

  /* -------------------------------------------------------------------------- */
  /*                              Handle animation                              */
  /* -------------------------------------------------------------------------- */
  switch (player.direction) {
    case PlayerDirection.LEFT:
      player.nextAnimation = PlayerSpriteAnimations.IDLE_LEFT;
      break;
    case PlayerDirection.RIGHT:
      player.nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
      break;

    // PlayerDirection == NEUTRAL
    default:
      if (
        player.currentAnimation == PlayerSpriteAnimations.IDLE_LEFT ||
        player.currentAnimation == PlayerSpriteAnimations.IDLE_RIGHT
      ) {
        break;
      }
      if (player.currentAnimation == PlayerSpriteAnimations.RUN_LEFT) {
        player.nextAnimation = PlayerSpriteAnimations.IDLE_LEFT;
      }
      if (player.currentAnimation == PlayerSpriteAnimations.RUN_RIGHT) {
        player.nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
      }
      break;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to falling state
  if (!player.isTouchingGround && player.nextTranslation.y <= 0) {
    player.fromIdleToFalling += 1;
    player.state = PlayerStates.FALLING;
  }

  // Transition to running state
  if (player.input.isLeft() || player.input.isRight()) {
    player.state = PlayerStates.RUNNING;
  }

  // Transition to jumping state
  if (player.input.isUp()) {
    player.jumpToConsume = true;
    player.timeJumpWasPressed = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
  }
};

export default playerIdle;
