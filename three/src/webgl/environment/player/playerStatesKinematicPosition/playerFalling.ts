import Player from "../playerKinematicPosition";
import PlayerStates from "../../../utils/types/playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";
import GameMath from "../../../utils/gameMath";
import PlayerDirection from "../../../utils/types/playerDirection";

const playerFalling = (player: Player) => {
  player.handledFalling += 1;

  if (player.jumpStateTimer.isOn) {
    console.log("stopping stopwatch: ", player.time.elapsed);

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
  /*                               Handle gravity                               */
  /* -------------------------------------------------------------------------- */
  if (player.isTouchingGround && player.nextTranslation.y <= 0) {
    player.nextTranslation.y = player.GroundingForce;
  } else {
    let inAirGravity = player.FallAcceleration;

    if (player.endedJumpEarly && player.nextTranslation.y > 0) {
      inAirGravity *= player.JumpEndEarlyGravityModifier;
    }

    player.nextTranslation.y = GameMath.moveTowardsPoint(
      player.nextTranslation.y,
      -player.MaxFallSpeed,
      inAirGravity * player.time.delta
    );
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
      player.AirDeceleration * player.time.delta
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Stay in falling state
  if (!player.isTouchingGround) {
    return;
  }

  // Transition to idle or running state
  if (
    player.input.isNeitherLeftRight() &&
    Math.abs(player.nextTranslation.x) < player.maxSpeed * 0.01
  ) {
    player.fromFallingToIdle += 1;
    player.state = PlayerStates.IDLE;
  } else {
    player.state = PlayerStates.RUNNING;
  }
};

export default playerFalling;
