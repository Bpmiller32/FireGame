import Player from "../playerKinematicVelocity";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";
import RAPIER from "@dimforge/rapier2d";

const playerRunning = (player: Player) => {
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
  //   Neither
  else if (!player.input.isLeftKeyPressed && !player.input.isRightKeyPressed) {
    direction = 0;
  }
  //   Both
  else if (player.input.isLeftKeyPressed && player.input.isRightKeyPressed) {
    if (player.currentAnimation == PlayerSpriteAnimations.RUN_LEFT) {
      player.nextAnimation = PlayerSpriteAnimations.IDLE_LEFT;
    }
    if (player.currentAnimation == PlayerSpriteAnimations.RUN_RIGHT) {
      player.nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
    }

    direction = 0;
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

  //   // Debug
  //   console.log({
  //     targetSpeed: targetSpeed,
  //     speedDifference: speedDifference,
  //     accelerationRate: accelerationRate,
  //     nextTranslation: player.nextTranslation.x,
  //   });

  // player.body.setLinvel(
  //   {
  //     x: movement * player.time.delta + player.velocity.x,
  //     y: player.velocity.y,
  //   },
  //   true
  // );

  player.body.setLinvel(
    new RAPIER.Vector2(
      movement * player.time.delta + player.velocity.x,
      player.velocity.y
    ),
    true
  );
  console.log(player.body.linvel());

  // // Check for transition to idle state
  // if (
  //   player.velocity.x == 0 &&
  //   !player.input.isLeftPressed &&
  //   !player.input.isrightPressed
  // ) {
  //   player.state = PlayerStates.IDLE;
  // }

  // Check for transition to jumping state
  if (player.input.isUpKeyPressed) {
    player.state = PlayerStates.JUMPING;
  }
};

export default playerRunning;
