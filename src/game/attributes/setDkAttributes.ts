import Player from "../entities/player/player";
import applyBaseFeel from "./baseFeel";

const setDkAttributes = (player: Player) => {
  // Shared base feel first, then the DK-specific overrides below.
  applyBaseFeel(player);

  /* -------------------------------------------------------------------------- */
  /*                       DK overrides (differ from base feel)                 */
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

  // Jump strength
  player.jumpPower = 12;

  // Distance at which a buffered jump is registered before landing
  player.bufferJumpRange = 1.5;

  // Minimum time a jump lasts even on a tap
  player.minJumpTime = 0.25;
};

export default setDkAttributes;
