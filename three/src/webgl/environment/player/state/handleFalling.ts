import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameMath from "../../../utils/gameMath";

const playerFalling = (player: Player) => {
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
  /*                               Handle gravity                               */
  /* -------------------------------------------------------------------------- */
  if (player.isTouching.ground && player.nextTranslation.y <= 0) {
    player.nextTranslation.y = player.groundingForce;
  } else {
    let inAirGravity = player.fallAcceleration;

    if (player.endedJumpEarly && player.nextTranslation.y > 0) {
      inAirGravity *= player.JumpEndEarlyGravityModifier;
    }

    player.nextTranslation.y = GameMath.moveTowardsPoint(
      player.nextTranslation.y,
      -player.maxFallSpeed,
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
      player.direction * player.maxGroundSpeed,
      player.groundAcceleration * player.time.delta
    );
  }
  // Decelerate
  else {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      0,
      player.fallDeceleration * player.time.delta
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Stay in falling state
  if (!player.isTouching.ground) {
    return;
  }

  // Transition to idle or running state
  if (
    player.input.isNeitherLeftRight() &&
    Math.abs(player.nextTranslation.x) < player.maxGroundSpeed * 0.01
  ) {
    player.state = PlayerStates.IDLE;
  } else {
    player.state = PlayerStates.RUNNING;
  }
};

export default playerFalling;
