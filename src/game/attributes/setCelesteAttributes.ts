import Player from "../entities/player/player";
import applyBaseFeel from "./baseFeel";

const setCelesteAttributes = (player: Player) => {
  // Shared base feel first, then the Celeste-specific overrides below.
  applyBaseFeel(player);

  // Celeste overrides (differ from base feel)
  // The top horizontal movement speed
  player.MaxGroundSpeed = 25;
  // The player's capacity to gain horizontal speed (on the ground)
  player.GroundAcceleration = 120;
  // The pace at which the player comes to a stop (on the ground)
  player.GroundDeceleration = 30;
  // Air control — accel/decel while airborne. Default equal to ground (no air
  // difference); diverge in the Feel Lab for floatier or draggier air control.
  player.AirAcceleration = 120;
  player.AirDeceleration = 30;

  // Jump arc time-scaled ~2x from the original labbed feel (slow-mo -> snappy):
  // velocities x2, accelerations x4, jump times x0.5 — SAME apex height, half the
  // airtime. Tune live in the Feel Lab. (Original: JumpPower 64 / RiseGravity 90 /
  // Fall 110 / MaxFall 40 / ApexHang 10x0.5 / MinJumpTime 0.12.)

  // The maximum vertical movement speed (terminal fall velocity)
  player.MaxFallSpeed = 80;
  // Downward accel while falling — the fall half of the jump arc
  player.FallAcceleration = 440;
  // Upward decel during the rise — lighter than the fall = a floatier ascent
  player.RiseGravity = 360;
  // Multiplier on rise gravity once the jump is released early (variable height)
  player.JumpEndedEarlyGravityModifier = 3;
  // Near-apex float for the signature Celeste hang at the top of a full jump.
  player.ApexHangThreshold = 20;
  player.ApexHangMult = 0.5;

  // Jump strength — the upward launch velocity; rise gravity decelerates it
  player.JumpPower = 128;

  // Distance at which a buffered jump is registered before landing
  player.BufferJumpRange = 4;

  // Minimum time a jump lasts even on a tap (the variable-height floor)
  player.MinJumpTime = 0.06;
};

export default setCelesteAttributes;
