import Player from "../entities/player/player";
import applyBaseFeel from "./baseFeel";

const setDkAttributes = (player: Player) => {
  // Shared base feel first, then the DK-specific overrides below.
  applyBaseFeel(player);

  // DK overrides (differ from base feel)
  // The top horizontal movement speed
  player.MaxGroundSpeed = 11.8;
  // The player's capacity to gain horizontal speed (on the ground)
  player.GroundAcceleration = 50;
  // The pace at which the player comes to a stop (on the ground)
  player.GroundDeceleration = 20;
  // Air control — accel/decel while airborne. Default equal to ground (no air
  // difference); diverge in the Feel Lab for floatier or draggier air control.
  player.AirAcceleration = 50;
  player.AirDeceleration = 20;

  // Jump arc time-scaled ~2x from the original labbed feel (slow-mo -> snappy):
  // velocities x2, accelerations x4, jump times x0.5 — SAME apex height, half the
  // airtime. Tune live in the Feel Lab. (Original: JumpPower 12 / RiseGravity 18 /
  // Fall 20 / MaxFall 20 / ApexHang 2x0.5 / MinJumpTime 0.1.)

  // The maximum vertical movement speed (terminal fall velocity)
  player.MaxFallSpeed = 40;
  // Downward accel while falling — the fall half of the jump arc
  player.FallAcceleration = 80;
  // Upward decel during the rise — the rise half. Lighter than the fall gives a
  // floatier ascent; the apex emerges where this brings vertical velocity to 0.
  player.RiseGravity = 72;
  // Multiplier on rise gravity once the jump is released early (variable height)
  player.JumpEndedEarlyGravityModifier = 3;
  // Near the apex (|vy| below the window) rise gravity is scaled down for a brief
  // floaty hang at the top of a full (held) jump.
  player.ApexHangThreshold = 4;
  player.ApexHangMult = 0.5;

  // Jump strength — the upward launch velocity; rise gravity decelerates it
  player.JumpPower = 24;

  // Distance at which a buffered jump is registered before landing
  player.BufferJumpRange = 1.5;

  // Minimum time a jump lasts even on a tap (the variable-height floor)
  player.MinJumpTime = 0.05;
};

export default setDkAttributes;
