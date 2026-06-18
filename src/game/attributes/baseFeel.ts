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
  player.maxClimbSpeed = 4;
  // The player's capacity to gain vertical speed when climbing
  player.climbAcceleration = 30;
  // The pace at which the player comes to a stop when climbing
  player.climbDeceleration = 8;

  /* -------------------------------------------------------------------------- */
  /*                          Jump / coyote / buffer (shared)                   */
  /* -------------------------------------------------------------------------- */
  player.jumpAcceleration = 9001;

  player.coyoteAvailable = false;
  player.coyoteCount = 0;

  // Buffer-jump runtime flags/counters (the RANGE differs per profile)
  player.bufferJumpAvailable = false;
  player.groundWithinBufferRange = false;
  player.wasBufferJumpUsed = false;
  player.bufferJumpCount = 0;

  /* -------------------------------------------------------------------------- */
  /*                          Jump and fall timers (shared)                     */
  /* -------------------------------------------------------------------------- */
  player.timeJumpWasEntered = 0;
  player.timeFallWasEntered = 0;

  player.maxJumpTime = 0.25;
  player.coyoteTime = 0.033; // 2 frames

  // Sprite-animation pacing divisor (faster horizontal move → faster animation)
  player.animationScalingFactor = 1.6;
};

export default applyBaseFeel;
