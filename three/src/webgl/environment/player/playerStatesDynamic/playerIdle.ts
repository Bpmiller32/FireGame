import PlayerDynamic from "../playerDynamic";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

const playerIdle = (player: PlayerDynamic) => {
  // Set animation
  if (player.isFacingRight == true) {
    player.nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
  } else {
    player.nextAnimation = PlayerSpriteAnimations.IDLE_LEFT;
  }

  // Check for transition to falling state
  if (!player.isTouchingGround) {
    player.state = PlayerStates.FALLING;
  }

  // Check for transition to running state
  if (player.input.isLeftPressed || player.input.isrightPressed) {
    player.state = PlayerStates.RUNNING;
  }

  // Check for transition to jumping state
  if (player.input.isUpPressed) {
    player.state = PlayerStates.JUMPING;
  }
};

export default playerIdle;
