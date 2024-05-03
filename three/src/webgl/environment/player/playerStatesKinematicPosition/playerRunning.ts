import Player from "../playerKinematicPosition";
import PlayerStates from "../../../utils/types/playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";
import GameMath from "../../../utils/gameMath";
import PlayerDirection from "../../../utils/types/playerDirection";

const playerRunning = (player: Player) => {
  player.handledRunning += 1;

  if (player.jumpStateTimer.isOn) {
    console.log(
      "time in jumpState: ",
      player.time.elapsed - player.jumpStateTimer.time
    );

    player.jumpStateTimer.isOn = false;
    player.jumpStateTimer.time = 0;
  }

  /* -------------------------------------------------------------------------- */
  /*                         Handle input and animation                         */
  /* -------------------------------------------------------------------------- */
  //   Left
  if (player.input.isLeft()) {
    player.direction = PlayerDirection.LEFT;
    player.nextAnimation = PlayerSpriteAnimations.RUN_LEFT;
  }
  //   Right
  else if (player.input.isRight()) {
    player.direction = PlayerDirection.RIGHT;
    player.nextAnimation = PlayerSpriteAnimations.RUN_RIGHT;
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
      player.direction * player.maxSpeed,
      player.acceleration * player.time.delta
    );
  }
  // Decelerate
  else {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      0,
      player.GroundDeceleration * player.time.delta
    );
  }

  // Hitting a wall
  if (
    (player.isTouchingLeftFace && player.direction == PlayerDirection.LEFT) ||
    (player.isTouchingRightFace && player.direction == PlayerDirection.RIGHT)
  ) {
    player.nextTranslation.x = 0;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to falling state
  if (!player.isTouchingGround) {
    player.state = PlayerStates.FALLING;
  }

  // Transition to idle state
  if (
    Math.abs(player.nextTranslation.x) <= player.maxSpeed * 0.01 &&
    (player.input.isNeitherLeftRight() || player.input.isLeftRightCombo())
  ) {
    // if velocity is 1% of topspeed, smooth to 0 and stateChange
    player.nextTranslation.x = 0;
    player.state = PlayerStates.IDLE;
  }

  // Transition to jumping state
  if (player.input.isUp()) {
    player.jumpToConsume = true;
    player.timeJumpWasPressed = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
  }
};

export default playerRunning;
