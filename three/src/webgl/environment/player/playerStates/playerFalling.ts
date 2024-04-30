import Player from "../player";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

const playerFalling = (player: Player) => {
  // Apply gravity
  player.nextPosition.y -= player.gravity;

  // Check for collision with ground to transition to idle or running state
  if (player.isTouchingGround) {
    if (player.input.left || player.input.right) {
      player.state = PlayerStates.RUNNING;
    } else {
      player.state = PlayerStates.IDLE;
    }
  }
};

export default playerFalling;
