import Player from "../entities/player/player";

// Shared base feel applied first by every profile; each profile overrides on top.
const applyBaseFeel = (player: Player) => {
  // Climbing (shared)
  // The top vertical movement speed while climbing
  player.MaxClimbSpeed = 4;
  // The player's capacity to gain vertical speed when climbing
  player.ClimbAcceleration = 30;
  // The pace at which the player comes to a stop when climbing
  player.ClimbDeceleration = 8;

  // Jump / coyote / buffer (shared)
  // Early-jump-ended latch: true when jump is released mid-rise (variable height).
  // Seeded false so it's a real boolean before the first jump.
  player.EndedJumpEarly = false;

  // Coyote-jump runtime flags/counters
  player.CoyoteAvailable = false;
  player.CoyoteCount = 0;

  // Buffer-jump runtime flags/counters (the RANGE differs per profile)
  player.BufferJumpAvailable = false;
  player.GroundWithinBufferRange = false;
  player.WasBufferJumpUsed = false;
  player.BufferJumpCount = 0;

  // Jump and fall timers (shared)
  player.TimeJumpWasEntered = 0;
  player.TimeFallWasEntered = 0;

  player.CoyoteTime = 0.05; // 3 frames — slightly more forgiving edges

  // Capsule collider + character-controller tuning (Feel-Lab tunable).
  // Fraction of capsule HALF-HEIGHT kept while airborne — shorter collider clears
  // obstacles. Center is fixed, so the feet rise; the sprite never moves.
  player.AirColliderHeightScale = 0.85;
  // Ground clearance at which the airborne collider regrows to full size — must
  // happen in FREE AIR so it never grows INTO the floor. Must exceed one fall-step (~1 unit).
  player.AirColliderGrowDistance = 1.2;
  // KCC snap-to-ground: how far the feet pull down to stay glued to slopes/steps.
  // Bigger = smoother downhill but lets steeper slopes stay walkable.
  player.SnapToGroundDistance = 0.15;
  // Slope limits (degrees): the player can climb up to Max; past Min it slides down.
  player.MaxSlopeClimbDegrees = 45;
  player.MinSlopeSlideDegrees = 30;
  // Flat tolerance (deg): ramps within this of horizontal are treated as FLAT for FEEL
  // only (no slope launch); KCC still follows the surface physically. Default 8 so ~7.5° DK ramps land in the flat band.
  player.FlatToleranceDegrees = 8;

  // Sprite-animation pacing divisor (faster horizontal move → faster animation)
  player.AnimationScalingFactor = 1.6;
};

export default applyBaseFeel;
