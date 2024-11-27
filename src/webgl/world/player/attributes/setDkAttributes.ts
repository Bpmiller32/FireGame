import Player from "../player";

const setDkAttributes = (player: Player) => {
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
  player.maxGroundSpeed = 11.8;
  // The player's capacity to gain horizontal speed
  player.groundAcceleration = 50;
  // The pace at which the player comes to a stop
  player.groundDeceleration = 20;

  // The maximum vertical movement speed
  player.maxFallSpeed = 20;
  // The player's capacity to gain fall speed aka In Air Gravity
  player.fallAcceleration = 20;
  // Multiplier on fallAcceleration if player ended their jump early
  player.jumpEndedEarlyGravityModifier = 9001;

  /* -------------------------------------------------------------------------- */
  /*                                    Jump                                    */
  /* -------------------------------------------------------------------------- */
  player.jumpPower = 12;
  player.jumpAcceleration = 9001;

  player.coyoteAvailable = false;
  player.coyoteCount = 0;

  player.bufferJumpAvailable = false;
  player.bufferJumpRange = 1.5;
  player.groundWithinBufferRange = false;
  player.wasBufferJumpUsed = false;
  player.bufferJumpCount = 0;

  /* -------------------------------------------------------------------------- */
  /*                            Jump and fall timers                            */
  /* -------------------------------------------------------------------------- */
  player.timeJumpWasEntered = 0;
  player.timeFallWasEntered = 0;

  player.minJumpTime = 0.25;
  player.maxJumpTime = 0.25;
  player.coyoteTime = 0.033; // 2 frames
};

export default setDkAttributes;
