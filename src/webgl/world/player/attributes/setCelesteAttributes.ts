import RAPIER from "@dimforge/rapier2d";
import PlayerDirection from "../../../utils/types/playerDirection";
import PlayerStates from "../../../utils/types/playerStates";
import Player from "../player";

const setCelesteAttributes = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                       State, animation, and collision                      */
  /* -------------------------------------------------------------------------- */
  player.state = PlayerStates.IDLE;
  player.horizontalDirection = PlayerDirection.NEUTRAL;
  player.colliderOffset = 0.01;
  player.currentPositionX = 0;
  player.currentPositionY = 0;
  player.nextTranslation = new RAPIER.Vector2(0, 0);

  player.isTouching = {
    ground: false,
    ceiling: false,
    leftSide: false,
    rightSide: false,
  };

  /* -------------------------------------------------------------------------- */
  /*                          Speeds and accelerations                          */
  /* -------------------------------------------------------------------------- */
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
  player.bufferJumpAvailable = false;

  player.bufferJumpRange = 4;
  player.groundWithinBufferRange = false;
  player.bufferJumpAvailable = false;

  /* -------------------------------------------------------------------------- */
  /*                            Jump and fall timers                            */
  /* -------------------------------------------------------------------------- */
  player.timeJumpWasEntered = 0;
  player.timeFallWasEntered = 0;

  player.minJumpTime = 0.19;
  player.maxJumpTime = 0.25;
  player.coyoteTime = 0.07;
};

export default setCelesteAttributes;
