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

  if (player.input.isUpKeyPressed) {
    // player.nextTranslation.y += player.jumpSpeed;
  }

  // Check for transition to falling state
  if (!player.isTouchingGround) {
    player.state = PlayerStates.FALLING;
  }

  // Check for transition to running state
  if (player.input.isLeftKeyPressed || player.input.isRightKeyPressed) {
    player.state = PlayerStates.RUNNING;
  }

  // Check for transition to jumping state
  if (player.input.isUpKeyPressed) {
    player.state = PlayerStates.JUMPING;
  }
};

export default playerJumping;
