import Player from "../playerKinematicPosition";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

const playerRunning = (player: Player) => {
  let direction = 0;

  //   Left
  if (player.input.isLeftPressed && !player.input.isrightPressed) {
    // Set sprite
    player.isFacingRight = false;
    player.nextAnimation = PlayerSpriteAnimations.RUN_LEFT;

    direction = -1;
  }
  //   Right
  else if (!player.input.isLeftPressed && player.input.isrightPressed) {
    player.isFacingRight = true;
    player.nextAnimation = PlayerSpriteAnimations.RUN_RIGHT;

    direction = 1;
  }
  //   Neither
  else if (!player.input.isLeftPressed && !player.input.isrightPressed) {
    direction = 0;
  }
  //   Both
  else if (player.input.isLeftPressed && player.input.isrightPressed) {
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

  const targetSpeed = direction * player.maxSpeed;
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

  //   // Debug
  //   console.log({
  //     targetSpeed: targetSpeed,
  //     speedDifference: speedDifference,
  //     accelerationRate: accelerationRate,
  //     nextTranslation: player.nextTranslation.x,
  //   });

  player.nextTranslation.x +=
    (movement * player.time.delta) / player.body.mass();
  if (!player.isTouchingGround) {
    player.nextTranslation.y = -player.gravity;
  }

  // Check for transition to idle state
  if (
    Math.abs(player.nextTranslation.x) <= player.maxSpeed * 0.05 &&
    !player.input.isLeftPressed &&
    !player.input.isrightPressed
  ) {
    player.nextTranslation.x = 0;
    player.state = PlayerStates.IDLE;
  }

  // Check for transition to jumping state
  if (player.input.isUpPressed) {
    player.state = PlayerStates.JUMPING;
  }
};

export default playerRunning;
