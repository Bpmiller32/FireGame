import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameUtils from "../../../utils/gameUtils";

const handlePlayerClimbing = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */

  if (
    !player.isTouching.ladderCore ||
    (player.isTouching.ladderBottom &&
      (player.input.isDown() ||
        player.input.isNeitherUpDown() ||
        player.input.isUpDownCombo())) ||
    (player.isTouching.ladderTop &&
      (player.input.isUp() ||
        player.input.isNeitherUpDown() ||
        player.input.isUpDownCombo()))
  ) {
    player.nextTranslation.y = 0;
    player.isTouching.ground = true;
    player.state = PlayerStates.IDLE;

    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                            Handle Climbing state                           */
  /* -------------------------------------------------------------------------- */
  // Controls accelerating or decellerating the sprite animation transitions
  // Denominator determines the scaling factor relative to player speed, faster/slower move horizontally - faster/slower animation updates
  // Numerator inverts the scaling factor so that larger movements == faster animation, slower movements == slower animations
  player.spriteAnimator.changeAnimationTiming(
    1 / (Math.abs(player.nextTranslation.x) / 1.6)
  );

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  // Up
  if (player.input.isUp()) {
    player.direction = PlayerDirection.UP;
  }
  // Down
  else if (player.input.isDown() && !player.isTouching.ladderBottom) {
    player.direction = PlayerDirection.DOWN;
  }
  // Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo() ||
    player.input.isLeft() ||
    player.input.isRight()
  ) {
    player.direction = PlayerDirection.NEUTRAL;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Movement                                  */
  /* -------------------------------------------------------------------------- */
  // Accelerate up
  if (player.direction == PlayerDirection.UP) {
    player.nextTranslation.y = GameUtils.moveTowardsPoint(
      player.nextTranslation.y,
      player.direction * player.maxClimbSpeed,
      player.climbAcceleration * player.time.delta
    );
  }
  // Accelerate down
  else if (player.direction == PlayerDirection.DOWN) {
    player.nextTranslation.y = GameUtils.moveTowardsPoint(
      player.nextTranslation.y,
      player.direction * player.maxClimbSpeed,
      player.climbDeceleration * player.time.delta
    );
  }
  // Decelerate
  else {
    player.nextTranslation.y = GameUtils.moveTowardsPoint(
      player.nextTranslation.y,
      0,
      player.climbDeceleration * player.time.delta
    );
  }
};

export default handlePlayerClimbing;
