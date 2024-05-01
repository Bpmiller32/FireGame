import PlayerDynamic from "../playerDynamic";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";
import RAPIER from "@dimforge/rapier2d";

const playerRunning = (player: PlayerDynamic) => {
  let direction = 0;
  let isMoveInput = false;

  //   Left
  if (player.input.isLeftPressed && !player.input.isrightPressed) {
    // Set sprite
    player.isFacingRight = false;
    player.nextAnimation = PlayerSpriteAnimations.RUN_LEFT;

    direction = -1;
    isMoveInput = true;
  }
  //   Right
  else if (!player.input.isLeftPressed && player.input.isrightPressed) {
    player.isFacingRight = true;
    player.nextAnimation = PlayerSpriteAnimations.RUN_RIGHT;

    direction = 1;
    isMoveInput = true;
  }
  //   Neither
  else if (!player.input.isLeftPressed && !player.input.isrightPressed) {
    direction = 0;
    isMoveInput = false;
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
    isMoveInput = false;
  }

  //   Weird friction issue from character controller's moveandslide
  if (Math.abs(player.velocity.x) < 0.01) {
    player.velocity.x = 0;
  }

  const targetSpeed = direction * player.maxSpeed;
  const speedDifference = targetSpeed - player.velocity.x;

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

  player.body.setLinvel(
    new RAPIER.Vector2(
      movement * player.time.delta + player.velocity.x,
      player.velocity.y
    ),
    true
  );

  // // Debug
  // console.log({
  //   targetSpeed: targetSpeed,
  //   velocity: player.velocity.x,
  //   speedDifference: speedDifference,
  //   accelerationRate: accelerationRate,
  //   // movement: movement,
  //   friction: friction,
  // });

  // Check for transition to idle state
  if (
    Math.abs(player.velocity.x) <= 1 &&
    !player.input.isLeftPressed &&
    !player.input.isrightPressed
  ) {
    player.velocity.x = 0;
    player.state = PlayerStates.IDLE;
  }

  // Check for transition to jumping state
  if (player.input.isUpPressed) {
    player.state = PlayerStates.JUMPING;
  }
};

export default playerRunning;
