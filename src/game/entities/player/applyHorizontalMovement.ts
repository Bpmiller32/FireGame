import Player from "./player";
import PlayerDirection from "../../../engine/types/playerDirection";
import GameUtils from "../../gameUtils";

/**
 * Shared horizontal (X-axis) movement for the running, jumping, and falling
 * states: accelerate toward the directional target speed (or decelerate toward
 * 0 when neutral), then stop dead on a wall. Air control intentionally uses the
 * same ground accel/decel. Returns true if a wall was hit this frame — the
 * running handler uses that to keep its wall animation playing.
 */
const applyHorizontalMovement = (player: Player): boolean => {
  let targetSpeed = 0;
  let acceleration = 0;

  // Decelerate when neutral, otherwise accelerate toward the directional target
  if (player.direction === PlayerDirection.NEUTRAL) {
    targetSpeed = 0;
    acceleration = player.groundDeceleration;
  } else {
    targetSpeed = player.direction * player.maxGroundSpeed;
    acceleration = player.groundAcceleration;
  }

  // Set desired velocity
  player.nextTranslation.x = GameUtils.moveTowardsPoint(
    player.nextTranslation.x,
    targetSpeed,
    acceleration * player.time.delta
  );

  // Stop movement on wall collision
  const hitWall =
    (player.isTouching.leftSide && player.direction === PlayerDirection.LEFT) ||
    (player.isTouching.rightSide && player.direction === PlayerDirection.RIGHT);
  if (hitWall) {
    player.nextTranslation.x = 0;
  }

  return hitWall;
};

export default applyHorizontalMovement;
