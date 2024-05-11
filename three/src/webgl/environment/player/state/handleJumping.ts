import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameMath from "../../../utils/gameMath";

const playerJumping = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                         Handle input and animation                         */
  /* -------------------------------------------------------------------------- */
  //   Left
  if (player.input.isLeft()) {
    player.horizontalDirection = PlayerDirection.LEFT;
    player.nextAnimation = SpriteAnimations.RUN_LEFT;
  }
  //   Right
  else if (player.input.isRight()) {
    player.horizontalDirection = PlayerDirection.RIGHT;
    player.nextAnimation = SpriteAnimations.RUN_RIGHT;
  }
  //   Both and neither
  else if (
    player.input.isNeitherLeftRight() ||
    player.input.isLeftRightCombo()
  ) {
    player.horizontalDirection = PlayerDirection.NEUTRAL;
  }

  // Timer
  player.timeInJumpState = player.time.elapsed - player.timeJumpWasEntered;
  player.bufferJumpAvailable = false;

  // Apply minimum jump
  if (player.time.elapsed < player.timeJumpWasEntered + player.minJumpTime) {
    player.nextTranslation.y = player.JumpPower;
  } else {
    player.state = PlayerStates.FALLING;
  }

  // If still holding input.jump(), continue to apply jump until maxJump
  if (player.input.isUp()) {
    if (player.time.elapsed < player.timeJumpWasEntered + player.maxJumpTime) {
      player.state = PlayerStates.JUMPING;
    } else {
      player.endedJumpEarly = false;
    }
  } else {
    player.endedJumpEarly = true;
  }

  /* -------------------------------------------------------------------------- */
  /*                               Handle movement                              */
  /* -------------------------------------------------------------------------- */
  // Accelerate
  if (player.horizontalDirection != PlayerDirection.NEUTRAL) {
    player.nextTranslation.x = GameMath.moveTowardsPoint(
      player.nextTranslation.x,
      player.horizontalDirection * player.maxGroundSpeed,
      player.fallAcceleration * player.time.delta
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

  // Hitting a ceiling
  if (player.isTouching.ceiling && player.nextTranslation.y >= 0) {
    player.nextTranslation.y = 0;
    player.state = PlayerStates.FALLING;
  }
};

export default playerJumping;
