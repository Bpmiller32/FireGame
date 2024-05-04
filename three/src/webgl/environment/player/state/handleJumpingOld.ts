import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameMath from "../../../utils/gameMath";

function executeJump(player: Player) {
  if (
    !player.endedJumpEarly &&
    !player.isTouching.ground &&
    !player.input.isUp() &&
    player.nextTranslation.y > 0
  ) {
    player.endedJumpEarly = true;
  }

  if (!player.jumpToConsume && !player.bufferJumpAvailable) {
    return;
  }

  // Execute jump
  if (player.isTouching.ground || player.canUseCoyote) {
    player.endedJumpEarly = false;
    player.timeJumpWasEntered = 0;
    player.bufferJumpUsable = false;
    player.coyoteUseable = false;
    player.nextTranslation.y = player.JumpPower;
  }

  player.jumpToConsume = false;
  // player.state = PlayerStates.FALLING;
}

const playerJumping = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                    Debug                                   */
  /* -------------------------------------------------------------------------- */

  // player.body.setTranslation(
  //   {
  //     x: player.currentTranslation.x,
  //     y: player.currentTranslation.y + 3,
  //   },
  //   true
  // );

  // Set buffer jump
  if (
    player.bufferJumpUsable &&
    player.time.elapsed < player.timeJumpWasEntered + player.jumpBufferTime
  ) {
    player.bufferJumpAvailable = player.bufferJumpUsable;
  } else {
    player.bufferJumpAvailable = false;
  }

  // Set coyote jump
  if (
    player.coyoteUseable &&
    !player.isTouching.ground &&
    player.time.elapsed < player.frameLeftGrounded + player.coyoteTime
  ) {
    player.canUseCoyote = true;
  } else {
    player.canUseCoyote = false;
  }

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

  /* -------------------------------------------------------------------------- */
  /*                                 Handle jump                                */
  /* -------------------------------------------------------------------------- */
  executeJump(player);

  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  if (player.currentTranslation.y >= player.JumpPower) {
    player.state = PlayerStates.FALLING;
  }
};

export default playerJumping;
