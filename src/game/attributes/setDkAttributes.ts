import Player from "../entities/player/player";
import applyBaseFeel from "./baseFeel";

const setDkAttributes = (player: Player) => {
  // Shared base feel first, then the DK-specific overrides below.
  applyBaseFeel(player);

  /* -------------------------------------------------------------------------- */
  /*                       DK overrides (differ from base feel)                 */
  /* -------------------------------------------------------------------------- */
  // The top horizontal movement speed
  player.MaxGroundSpeed = 11.8;
  // The player's capacity to gain horizontal speed
  player.GroundAcceleration = 50;
  // The pace at which the player comes to a stop
  player.GroundDeceleration = 20;

  // The maximum vertical movement speed
  player.MaxFallSpeed = 20;
  // The player's capacity to gain fall speed aka In Air Gravity
  player.FallAcceleration = 20;
  // Multiplier on fallAcceleration if player ended their jump early
  player.JumpEndedEarlyGravityModifier = 9001;

  // Jump strength
  player.JumpPower = 12;

  // Distance at which a buffered jump is registered before landing
  player.BufferJumpRange = 1.5;

  // Minimum time a jump lasts even on a tap
  player.MinJumpTime = 0.25;
};

export default setDkAttributes;
