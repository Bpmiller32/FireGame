import Player from "../entities/player/player";

/**
 * Shared base feel applied by every attribute profile FIRST, so the values DK
 * and Celeste have in common live in exactly one place and can't silently drift
 * apart. Each profile calls this, then applies its own overrides on top.
 */
const applyBaseFeel = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                          Climbing (shared)                                 */
  /* -------------------------------------------------------------------------- */
  // The top vertical movement speed while climbing
  player.MaxClimbSpeed = 4;
  // The player's capacity to gain vertical speed when climbing
  player.ClimbAcceleration = 30;
  // The pace at which the player comes to a stop when climbing
  player.ClimbDeceleration = 8;

  /* -------------------------------------------------------------------------- */
  /*                          Jump / coyote / buffer (shared)                   */
  /* -------------------------------------------------------------------------- */
  player.JumpAcceleration = 9001;

  player.CoyoteAvailable = false;
  player.CoyoteCount = 0;

  // Buffer-jump runtime flags/counters (the RANGE differs per profile)
  player.BufferJumpAvailable = false;
  player.GroundWithinBufferRange = false;
  player.WasBufferJumpUsed = false;
  player.BufferJumpCount = 0;

  /* -------------------------------------------------------------------------- */
  /*                          Jump and fall timers (shared)                     */
  /* -------------------------------------------------------------------------- */
  player.TimeJumpWasEntered = 0;
  player.TimeFallWasEntered = 0;

  player.MaxJumpTime = 0.25;
  player.CoyoteTime = 0.033; // 2 frames

  // Sprite-animation pacing divisor (faster horizontal move → faster animation)
  player.AnimationScalingFactor = 1.6;
};

export default applyBaseFeel;
