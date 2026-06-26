import Player from "../entities/player/player";

// Shared base feel applied first by every profile, so common DK/Celeste values live in one place; each profile overrides on top.
const applyBaseFeel = (player: Player) => {
  // Climbing (shared)
  // The top vertical movement speed while climbing
  player.MaxClimbSpeed = 4;
  // The player's capacity to gain vertical speed when climbing
  player.ClimbAcceleration = 30;
  // The pace at which the player comes to a stop when climbing
  player.ClimbDeceleration = 8;

  // Jump / coyote / buffer (shared)
  // Early-jump-ended latch: set true when jump is released mid-rise (variable
  // height), reset at every jump entry and on the ground. Seeded here so the
  // flag holds a real boolean before the first jump.
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

  // Capsule collider + character-controller tuning (all Feel-Lab tunable; great to
  // dial live in the slope lab).
  // Fraction of the capsule's full HALF-HEIGHT kept while airborne (jump/fall) — a
  // shorter collider so the player clears obstacles. The center is fixed, so the
  // feet rise; the sprite never moves.
  player.AirColliderHeightScale = 0.85;
  // Ground clearance (down-shapecast time-of-impact) at which the airborne collider
  // grows back to full size — done in FREE AIR before touchdown, so it never grows
  // INTO the floor (no landing pop). Must exceed one fall-step (~1 unit).
  player.AirColliderGrowDistance = 1.2;
  // KCC snap-to-ground distance: how far the controller pulls the feet down to stay
  // glued to slopes/steps. Bigger = smoother downhill (less staircasing) but lets
  // steeper slopes stay walkable. (Was a tiny 0.02 — the main downhill-feel fix.)
  player.SnapToGroundDistance = 0.15;
  // Slope limits (degrees): the player can climb up to Max; past Min it slides down.
  player.MaxSlopeClimbDegrees = 45;
  player.MinSlopeSlideDegrees = 30;
  // Flat tolerance (degrees): any ramp whose surface is within this of horizontal is
  // treated as a FLAT platform for FEEL — the player walks/launches off it exactly like a
  // flat platform (the loved edge feel applies), no slope launch. The KCC still physically
  // follows the surface (the down-stick glues you), so only the feel changes. Bump this if
  // gentle ramps still feel "slopey"; lower it if real slopes start feeling too flat.
  // Default 8 so ~7.5° DK ramps are comfortably inside the flat band.
  player.FlatToleranceDegrees = 8;

  // Sprite-animation pacing divisor (faster horizontal move → faster animation)
  player.AnimationScalingFactor = 1.6;
};

export default applyBaseFeel;
