import Player from "../playerKinematicVelocity";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

const playerJumping = (player: Player) => {
  player.isTouchingGround = false;

  // Set animation
  if (player.isFacingRight == true) {
    player.nextAnimation = PlayerSpriteAnimations.RUN_RIGHT;
  } else {
    player.nextAnimation = PlayerSpriteAnimations.RUN_LEFT;
  }

  if (player.input.isUpPressed) {
    // player.nextTranslation.y += player.jumpSpeed;
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

export default playerJumping;
