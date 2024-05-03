import PlayerDynamic from "../playerDynamic";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

const playerFalling = (player: PlayerDynamic) => {
  let direction = 0;

  //   Left
  if (player.input.isLeftKeyPressed && !player.input.isRightKeyPressed) {
    // Set sprite
    player.isFacingRight = false;
    player.nextAnimation = PlayerSpriteAnimations.RUN_LEFT;

    direction = -1;
  }
  //   Right
  else if (!player.input.isLeftKeyPressed && player.input.isRightKeyPressed) {
    player.isFacingRight = true;
    player.nextAnimation = PlayerSpriteAnimations.RUN_RIGHT;

    direction = 1;
  }
  //   Both and neither
  else if (
    (player.input.isLeftKeyPressed && player.input.isRightKeyPressed) ||
    (!player.input.isLeftKeyPressed && !player.input.isRightKeyPressed)
  ) {
    if (player.currentAnimation == PlayerSpriteAnimations.RUN_LEFT) {
      player.nextAnimation = PlayerSpriteAnimations.IDLE_LEFT;
    }
    if (player.currentAnimation == PlayerSpriteAnimations.RUN_RIGHT) {
      player.nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
    }

    direction = 0;
  }

  //   Weird friction issue from character controller's moveandslide
  if (Math.abs(player.nextTranslation.x) < 0.01) {
    player.nextTranslation.x = 0;
  }

  const targetSpeed = direction * player.maxSpeed * player.fallScale;
  const speedDifference = targetSpeed - player.nextTranslation.x;

  let accelerationRate = 0;
  if (Math.abs(speedDifference) > 0.1) {
    accelerationRate = player.acceleration * player.fallScale;
  } else {
    accelerationRate = player.decelleration * player.fallScale;
  }

  const movement =
    Math.pow(
      Math.abs(speedDifference) * accelerationRate,
      player.velocityPower * player.fallScale
    ) * Math.sign(speedDifference);

  player.nextTranslation.x += movement * player.time.delta;

  // Check for collision with ground to transition to idle or running state
  if (player.isTouchingGround) {
    player.nextTranslation.y = 0;

    if (player.input.isLeftKeyPressed || player.input.isRightKeyPressed) {
      player.state = PlayerStates.RUNNING;
    } else {
      player.state = PlayerStates.IDLE;
    }
  }
};

export default playerFalling;
