import Player from "../player";

const setCelesteAttributes = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                          Speeds and accelerations                          */
  /* -------------------------------------------------------------------------- */
  // The top vertical movement speed while climbing
  player.maxClimbSpeed = 4;
  // The player's capacity to gain vertical speed when climbing
  player.climbAcceleration = 30;
  // The pace at which the player comes to a stop when climbing
  player.climbDeceleration = 8;

  // The top horizontal movement speed
  player.maxGroundSpeed = 25;
  // The player's capacity to gain horizontal speed
  player.groundAcceleration = 120;
  // The pace at which the player comes to a stop
  player.groundDeceleration = 30;

  // The maximum vertical movement speed
  player.maxFallSpeed = 40;
  // The player's capacity to gain fall speed aka In Air Gravity
  player.fallAcceleration = 110;
  // Multiplier on fallAcceleration if player ended their jump early
  player.jumpEndedEarlyGravityModifier = 3;

  /* -------------------------------------------------------------------------- */
  /*                                    Jump                                    */
  /* -------------------------------------------------------------------------- */
  player.jumpPower = 64;
  player.jumpAcceleration = 9001;

  player.coyoteAvailable = false;
  player.coyoteCount = 0;

  player.bufferJumpAvailable = false;
  player.bufferJumpRange = 4;
  player.groundWithinBufferRange = false;
  player.wasBufferJumpUsed = false;
  player.bufferJumpCount = 0;

  /* -------------------------------------------------------------------------- */
  /*                            Jump and fall timers                            */
  /* -------------------------------------------------------------------------- */
  player.timeJumpWasEntered = 0;
  player.timeFallWasEntered = 0;

  player.minJumpTime = 0.19;
  player.maxJumpTime = 0.25;
  player.coyoteTime = 0.033;
};

export default setCelesteAttributes;
