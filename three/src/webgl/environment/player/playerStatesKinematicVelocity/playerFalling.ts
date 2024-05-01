import Player from "../playerKinematicVelocity";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

const playerFalling = (player: Player) => {
  // Apply gravity
  player.body.setLinvel(
    {
      x: player.velocity.x,
      y: (player.velocity.y -= player.gravity * player.time.delta),
    },
    true
  );

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
  //   Both and neither
  else if (
    (player.input.isLeftPressed && player.input.isrightPressed) ||
    (!player.input.isLeftPressed && !player.input.isrightPressed)
  ) {
    if (player.currentAnimation == PlayerSpriteAnimations.RUN_LEFT) {
      player.nextAnimation = PlayerSpriteAnimations.IDLE_LEFT;
    }
    if (player.currentAnimation == PlayerSpriteAnimations.RUN_RIGHT) {
      player.nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
    }

    direction = 0;
  }

  const targetSpeed = direction * player.maxSpeed * player.fallScale;
  const speedDifference = targetSpeed - player.velocity.x;

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

  player.velocity.x += movement * player.time.delta;

  // Check for collision with ground to transition to idle or running state
  if (player.isTouchingGround) {
    player.velocity.y = 0;

    if (player.input.isLeftPressed || player.input.isrightPressed) {
      player.state = PlayerStates.RUNNING;
    } else {
      player.state = PlayerStates.IDLE;
    }
  }
};

export default playerFalling;
