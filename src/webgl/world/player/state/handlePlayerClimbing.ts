import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameUtils from "../../../utils/gameUtils";

const ANIMATION_SCALING_FACTOR = 1.6;

const handlePlayerClimbing = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Helper variables for touching ladder top and bottom
  const atLadderBottom =
    player.isTouching.ladderBottom &&
    (player.input.isDown() ||
      player.input.isNeitherUpDown() ||
      player.input.isUpDownCombo());

  const atLadderTop =
    player.isTouching.ladderTop &&
    (player.input.isUp() ||
      player.input.isNeitherUpDown() ||
      player.input.isUpDownCombo());

  // Transition to idle state
  if (!player.isTouching.ladderCore || atLadderBottom || atLadderTop) {
    if (atLadderTop) {
      player.nextTranslation.y = player.maxClimbSpeed;
    } else {
      player.nextTranslation.y = -player.maxClimbSpeed;
    }

    player.isTouching.ground = true;
    player.state = PlayerStates.IDLE;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  if (player.input.isUp()) {
    player.direction = PlayerDirection.UP;
  } else if (player.input.isDown()) {
    player.direction = PlayerDirection.DOWN;
  } else {
    player.direction = PlayerDirection.NEUTRAL;
  }

  // Controls accelerating or decellerating the sprite animation transitions
  // Denominator determines the scaling factor relative to player speed, faster/slower move horizontally - faster/slower animation updates
  // Numerator inverts the scaling factor so that larger movements == faster animation, slower movements == slower animations
  if (Math.abs(player.nextTranslation.x) > 0) {
    player.spriteAnimator.changeAnimationTiming(
      1 / (Math.abs(player.nextTranslation.x) / ANIMATION_SCALING_FACTOR)
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                           Movement Logic (X axis)                          */
  /* -------------------------------------------------------------------------- */
  let targetSpeed = 0;
  let acceleration = 0;

  // Accellerate climbing up
  if (player.direction === PlayerDirection.UP) {
    targetSpeed = player.direction * player.maxClimbSpeed;
    acceleration = player.climbAcceleration * player.time.delta;
  }
  // Accellerate climbing down
  else if (player.direction === PlayerDirection.DOWN) {
    targetSpeed = player.direction * player.maxClimbSpeed;
    acceleration = player.climbAcceleration * player.time.delta;
  }
  // Decellerate
  else {
    targetSpeed = 0;
    acceleration = player.climbDeceleration * player.time.delta;
  }

  // Set desired velocity
  player.nextTranslation.y = GameUtils.moveTowardsPoint(
    player.nextTranslation.y,
    targetSpeed,
    acceleration
  );
};

export default handlePlayerClimbing;
