import Player from "../playerKinematicPosition";
import PlayerStates from "../../../utils/types/playerStates";
import PlayerSpriteAnimations from "../playerSpriteAnimations";

function HandleJump(player: Player) {
  if (
    !player.endedJumpEarly &&
    !player.isTouchingGround &&
    !player.input.isUp() &&
    player.nextTranslation.y > 0
  ) {
    player.handledJumping2 += 1;
    player.endedJumpEarly = true;
    player.state = PlayerStates.FALLING;
    player.timeInJump = 0;
  }

  if (!player.jumpToConsume && !player.HasBufferedJump) {
    player.handledJumping3 += 1;

    return;
  }

  // Execute jump
  if (player.isTouchingGround || player.canUseCoyote) {
    player.handledJumping4 += 1;

    console.log("executing jump");
    player.endedJumpEarly = false;
    player.timeJumpWasPressed = 0;
    player.bufferJumpUsable = false;
    player.coyoteUseable = false;
    player.nextTranslation.y = player.JumpPower;
  }

  player.handledJumping5 += 1;
  player.jumpToConsume = false;
  // player.state = PlayerStates.FALLING;
}

const playerJumping = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                    Debug                                   */
  /* -------------------------------------------------------------------------- */
  player.handledJumping1 += 1;
  player.timeInJump += player.time.delta;

  if (!player.jumpStateTimer.isOn) {
    console.log("starting stopwatch: ", player.time.elapsed);
    player.jumpStateTimer.isOn = true;
    player.jumpStateTimer.time = player.time.elapsed;
  }

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
    player.time.elapsed < player.timeJumpWasPressed + player.JumpBuffer
  ) {
    player.HasBufferedJump = player.bufferJumpUsable;
  } else {
    player.HasBufferedJump = false;
  }

  // Set coyote jump
  if (
    player.coyoteUseable &&
    !player.isTouchingGround &&
    player.time.elapsed < player.frameLeftGrounded + player.coyoteTime
  ) {
    player.canUseCoyote = true;
  } else {
    player.canUseCoyote = false;
  }

  /* -------------------------------------------------------------------------- */
  /*                         Handle input and animation                         */
  /* -------------------------------------------------------------------------- */
  //   Up
  // if (player.input.isUp()) {
  //   player.direction = PlayerDirection.LEFT;
  //   player.nextAnimation = PlayerSpriteAnimations.RUN_LEFT;
  // }

  /* -------------------------------------------------------------------------- */
  /*                                 Handle jump                                */
  /* -------------------------------------------------------------------------- */
  HandleJump(player);
  // console.log(player.currentTranslation.y);

  if (
    player.currentTranslation.y >= player.JumpPower ||
    player.timeInJump > 1
  ) {
    player.handledJumping6 += 1;
    player.state = PlayerStates.FALLING;
  }
};

export default playerJumping;
