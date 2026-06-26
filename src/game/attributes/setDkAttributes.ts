import Player from "../entities/player/player";
import applyBaseFeel from "./baseFeel";

const setDkAttributes = (player: Player) => {
  // Shared base feel first, then the DK-specific overrides below.
  applyBaseFeel(player);

  // DK overrides (differ from base feel)
  // The top horizontal movement speed (kept — barrel-jump reach + pacing depend on it)
  player.MaxGroundSpeed = 11.8;
  // The player's capacity to gain horizontal speed (on the ground). Snappy: top speed in
  // ~8 frames so a run starts planted, not slidey.
  player.GroundAcceleration = 90;
  // The pace at which the player comes to a stop (on the ground). High = a near-instant
  // dead stop (the DK-stumpy planted feel; kills the old ice-slide).
  player.GroundDeceleration = 100;
  // Air control — now DIVERGED from ground: a bit less authority in the air so a jump
  // commits more, while keeping enough drift to steer over barrels and arc naturally.
  player.AirAcceleration = 70;
  player.AirDeceleration = 45;

  // Jump arc retuned in the existing velocity + rise-gravity model (no reparametrization).
  // Apex height PRESERVED (~4.25u discrete, so barrel jumps still clear vertically); the
  // changes are FEEL: snappier rise, a brief 3-frame apex hang, a weighty asymmetric fall
  // (fall gravity ~1.42x rise gravity — the Meat-Boy/Celeste signature), and crisp
  // tap-vs-hold. NOTE total airtime drops ~13% (faster fall) — a deliberate tightening;
  // if any existing barrel jump becomes too tight, recover airtime WITHOUT touching apex
  // by lowering FallAcceleration toward ~95-100. One-knob scaling: JumpPower is master —
  // RiseGravity ~3.13*JumpPower, FallAcceleration ~1.42*RiseGravity, ApexHangThreshold
  // ~0.10*JumpPower, MaxFallSpeed ~1.43*JumpPower; keep Mult/EarlyModifier/MinJumpTime fixed.

  // The maximum vertical movement speed (terminal fall velocity). 36 (was 40): a same-level
  // jump never reaches it, so it's a rarely-hit safety cap — and the lower per-step fall
  // displacement (0.60u vs 0.67u) widens the KCC's anti-penetration margin (helps Bug-1).
  player.MaxFallSpeed = 36;
  // Downward accel while falling — the fall half of the arc. Heavier than rise = weighty.
  player.FallAcceleration = 112;
  // Upward decel during the rise — the rise half. Lighter than the fall gives a floatier
  // ascent; the apex emerges where this brings vertical velocity to 0.
  player.RiseGravity = 79;
  // Multiplier on rise gravity once the jump is released early (variable height). 3.5 =
  // a crisp cut so a tap clearly peaks lower (~52% of a full hold).
  player.JumpEndedEarlyGravityModifier = 3.5;
  // Near the apex (|vy| below the window) rise gravity is scaled down for a brief floaty
  // hang at the top of a full (held) jump. 2.5 (was 4) = a distinct ~3-frame beat, not a
  // long balloon.
  player.ApexHangThreshold = 2.5;
  player.ApexHangMult = 0.5;

  // Jump strength — the upward launch velocity; rise gravity decelerates it.
  player.JumpPower = 25.2;

  // Distance at which a buffered jump is registered before landing
  player.BufferJumpRange = 1.5;

  // Minimum time a jump lasts even on a tap (the variable-height floor). Kept at 0.05:
  // 0.06 is a no-op at 60fps (the early-cut latch fires at frame 4 for both; only >=0.067
  // changes it, which would also raise the minimum tap height).
  player.MinJumpTime = 0.05;
};

export default setDkAttributes;
