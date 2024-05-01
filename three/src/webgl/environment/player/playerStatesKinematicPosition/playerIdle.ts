import Player from "../playerKinematicPosition";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

const playerIdle = (player: Player) => {
  // Set animation
  if (player.isFacingRight == true) {
    player.nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
  } else {
    player.nextAnimation = PlayerSpriteAnimations.IDLE_LEFT;
  }

  const targetSpeed = 0;
  const speedDifference = targetSpeed - player.nextTranslation.x;

  let accelerationRate = 0;
  if (Math.abs(speedDifference) > 0.1) {
    accelerationRate = player.acceleration;
  } else {
    accelerationRate = player.decelleration;
  }

  const movement =
    Math.pow(
      Math.abs(speedDifference) * accelerationRate,
      player.velocityPower
    ) * Math.sign(speedDifference);

  // Check for transition to idle state
  if (
    Math.abs(player.nextTranslation.x) > 0 &&
    !player.input.isLeftPressed &&
    !player.input.isrightPressed
  ) {
    player.nextTranslation.x +=
      (movement * player.time.delta) / player.body.mass();
    if (!player.isTouchingGround) {
      player.nextTranslation.y = -player.gravity;
    }
  }

  // Check for transition to falling state
  if (!player.isTouchingGround) {
    player.nextTranslation.y = 0;

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
