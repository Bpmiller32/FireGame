import Player from "../player";
import PlayerStates from "./playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";
import { Vector2 } from "@dimforge/rapier2d";

const playerRunning = (player: Player) => {
  const currentVelocity = player.body?.linvel();
  console.log(currentVelocity);
  let direction = 0;

  // Apply acceleration based on input
  //   Left
  if (player.input.left && !player.input.right) {
    // Set sprite
    player.isFacingRight = false;
    player.nextAnimation = PlayerSpriteAnimations.RUN_LEFT;

    direction = -1;
  }
  //   Right
  else if (!player.input.left && player.input.right) {
    player.isFacingRight = true;
    player.nextAnimation = PlayerSpriteAnimations.RUN_RIGHT;

    direction = 1;
  }
  //   Neither
  else if (!player.input.left && !player.input.right) {
    direction = 0;
  }

  //   Calculate direction to move in and desired velocity
  const targetSpeed = direction * player.maxSpeed;
  //   Calculate difference between current and desired velocity
  const speedDifference = targetSpeed - currentVelocity!.x;
  //   Change acceleration rate depending on situation
  let accelerationRate;
  if (Math.abs(targetSpeed) > 0.01) {
    accelerationRate = player.acceleration;
  } else {
    accelerationRate = player.decelleration;
  }
  //   Apply acceleration to speed difference, raise to a set power so acceleration increases with higher speeds
  const movement =
    Math.pow(
      Math.abs(speedDifference) * accelerationRate,
      player.velocityPower
    ) * Math.sign(speedDifference);

  //   player.body?.addForce(new Vector2(movement, 0), false);
  player.nextPosition.x = movement;

  //   // Still moving
  //   if (player.playerVelocity.x > 0) {
  //     player.state = PlayerStates.RUNNING;
  //     player.newVelocity.x -= player.friction;

  //     if (player.newVelocity.x < 0) {
  //       player.newVelocity.x = 0;
  //     }

  //     return;
  //   }
  //   if (player.playerVelocity.x < 0) {
  //     player.state = PlayerStates.RUNNING;
  //     player.newVelocity.x += player.friction;

  //     if (player.newVelocity.x > 0) {
  //       player.newVelocity.x = 0;
  //     }

  //     return;
  //   }

  // Check for transition to idle state
  if (!player.input.left && !player.input.right) {
    player.state = PlayerStates.IDLE;
  }

  // Check for transition to jumping state
  if (player.input.up) {
    player.state = PlayerStates.JUMPING;
  }
};

export default playerRunning;
