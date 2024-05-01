import Player from "../playerKinematicPosition";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

const playerJumping = (player: Player) => {
  // Set animation
  if (player.isFacingRight == true) {
    player.nextAnimation = PlayerSpriteAnimations.RUN_RIGHT;
  } else {
    player.nextAnimation = PlayerSpriteAnimations.RUN_LEFT;
  }

  player.jumpTimer -= player.time.delta;

  player.isTouchingGround = false;
  player.nextTranslation.y += player.jumpSpeed / player.body.mass();

  let direction = 0;
  // direction
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

  // movement
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

  player.nextTranslation.x +=
    (movement * player.time.delta) / player.body.mass();

  // if (player.input.isUpPressed) {
  //   player.nextTranslation.y += player.jumpSpeed;
  // }

  // Check for transition to falling state
  if (!player.isTouchingGround) {
    player.state = PlayerStates.FALLING;
  }

  if (player.jumpTimer > 0) {
    player.state = PlayerStates.JUMPING;
  } else {
    player.jumpTimer = player.jumpTimerOriginal;
  }

  // // Check for transition to running state
  // if (player.input.isLeftPressed || player.input.isrightPressed) {
  //   player.state = PlayerStates.RUNNING;
  // }

  // // Check for transition to jumping state
  // if (player.input.isUpPressed) {
  //   player.state = PlayerStates.JUMPING;
  // }
};

export default playerJumping;
