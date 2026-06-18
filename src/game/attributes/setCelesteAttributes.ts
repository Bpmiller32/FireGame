import Player from "../entities/player/player";
import applyBaseFeel from "./baseFeel";

const setCelesteAttributes = (player: Player) => {
  // Shared base feel first, then the Celeste-specific overrides below.
  applyBaseFeel(player);

  /* -------------------------------------------------------------------------- */
  /*                    Celeste overrides (differ from base feel)               */
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

  // Jump strength
  player.jumpPower = 64;

  // Distance at which a buffered jump is registered before landing
  player.bufferJumpRange = 4;

  // Minimum time a jump lasts even on a tap
  player.minJumpTime = 0.19;
};

export default setCelesteAttributes;
