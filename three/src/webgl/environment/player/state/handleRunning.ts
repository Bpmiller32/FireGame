import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameMath from "../../../utils/gameMath";

const playerRunning = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                         Handle input and animation                         */
  /* -------------------------------------------------------------------------- */
  //   Left
  if (player.input.isLeft()) {
    player.direction = PlayerDirection.LEFT;
    player.nextAnimation = SpriteAnimations.RUN_LEFT;
  }
  //   Right
  else if (player.input.isRight()) {
    player.direction = PlayerDirection.RIGHT;
    player.nextAnimation = SpriteAnimations.RUN_RIGHT;
  }
  //   Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo()
  ) {
    player.direction = PlayerDirection.NEUTRAL;
  }

  /* -------------------------------------------------------------------------- */
  /*                               Handle movement                              */
  /* -------------------------------------------------------------------------- */
  // Accelerate
  if (player.direction != PlayerDirection.NEUTRAL) {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      player.direction * player.maxGroundSpeed,
      player.groundAcceleration * player.time.delta
    );
  }
  // Decelerate
  else {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      0,
      player.groundDeceleration * player.time.delta
    );
  }

  // Hitting a wall
  if (
    (player.isTouching.leftSide && player.direction == PlayerDirection.LEFT) ||
    (player.isTouching.rightSide && player.direction == PlayerDirection.RIGHT)
  ) {
    player.nextTranslation.x = 0;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to falling state
  if (!player.isTouching.ground) {
    player.state = PlayerStates.FALLING;
  }

  // Transition to idle state
  if (
    Math.abs(player.nextTranslation.x) <= player.maxGroundSpeed * 0.01 &&
    (player.input.isNeitherLeftRight() || player.input.isLeftRightCombo())
  ) {
    // if velocity is 1% of topspeed, smooth to 0 and stateChange
    player.nextTranslation.x = 0;
    player.state = PlayerStates.IDLE;
  }

  // Transition to jumping state
  if (player.input.isUp()) {
    player.timeJumpWasPressed = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
  }
};

export default playerRunning;
