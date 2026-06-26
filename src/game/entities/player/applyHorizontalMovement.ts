import Player from "./player";
import PlayerDirection from "../../../engine/types/playerDirection";
import GameUtils from "../../gameUtils";

// Shared X-axis movement for running/jumping/falling: accelerate toward the
// directional target speed (or decelerate to 0 when neutral), then stop dead on
// a wall. Ground and air use separate accel/decel, selected by the airborne flag
// (true from jumping/falling), so air control tunes independently; top speed
// (MaxGroundSpeed) is shared. Returns true if a wall was hit this frame — the
// running handler uses that to keep its wall animation playing.
const applyHorizontalMovement = (player: Player, airborne = false): boolean => {
  let accelRate = player.GroundAcceleration;
  if (airborne) accelRate = player.AirAcceleration;
  let decelRate = player.GroundDeceleration;
  if (airborne) decelRate = player.AirDeceleration;

  let targetSpeed = 0;
  let acceleration = 0;

  // Decelerate when neutral, otherwise accelerate toward the directional target
  if (player.Direction === PlayerDirection.NEUTRAL) {
    targetSpeed = 0;
    acceleration = decelRate;
  } else {
    targetSpeed = player.Direction * player.MaxGroundSpeed;
    acceleration = accelRate;
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
