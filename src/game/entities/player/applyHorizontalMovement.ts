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
  if (player.Direction === PlayerDirection.NEUTRAL) {
    targetSpeed = 0;
    acceleration = player.GroundDeceleration;
  } else {
    targetSpeed = player.Direction * player.MaxGroundSpeed;
    acceleration = player.GroundAcceleration;
  }

  // Set desired velocity
  player.NextTranslation.x = GameUtils.MoveTowardsPoint(
    player.NextTranslation.x,
    targetSpeed,
    acceleration * player.Time.Delta
  );

  // Stop movement on wall collision
  const hitWall =
    (player.IsTouching.leftSide && player.Direction === PlayerDirection.LEFT) ||
    (player.IsTouching.rightSide && player.Direction === PlayerDirection.RIGHT);
  if (hitWall) {
    player.NextTranslation.x = 0;
  }

  return hitWall;
};

export default applyHorizontalMovement;
