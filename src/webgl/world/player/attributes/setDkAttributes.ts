import RAPIER from "@dimforge/rapier2d";
import PlayerDirection from "../../../utils/types/playerDirection";
import PlayerStates from "../../../utils/types/playerStates";
import Player from "../player";

const setDkAttributes = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                       State, animation, and collision                      */
  /* -------------------------------------------------------------------------- */
  player.state = PlayerStates.IDLE;
  player.horizontalDirection = PlayerDirection.NEUTRAL;

  /* -------------------------------------------------------------------------- */
  /*                          Speeds and accelerations                          */
  /* -------------------------------------------------------------------------- */
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
  player.bufferJumpAvailable = false;

  player.bufferJumpRange = 4;
  player.groundWithinBufferRange = false;
  player.bufferJumpAvailable = false;

  /* -------------------------------------------------------------------------- */
  /*                            Jump and fall timers                            */
  /* -------------------------------------------------------------------------- */
  player.timeJumpWasEntered = 0;
  player.timeFallWasEntered = 0;

  player.minJumpTime = 0.25;
  player.maxJumpTime = 0.25;
  player.coyoteTime = 0.07;
};

export default setDkAttributes;
