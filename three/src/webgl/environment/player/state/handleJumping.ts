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

  // // Check if ended jump early
  // if (
  //   !player.endedJumpEarly &&
  //   !player.isTouching.ground &&
  //   !player.input.isUp() &&
  //   player.nextTranslation.y > 0
  // ) {
  //   console.log("true");
  //   player.endedJumpEarly = true;
  // }

  // // Jump was ended early, apply inAirGravity but don't FallState immediately in case jump needs to be applied to reach minimum jump height
  // if (player.endedJumpEarly && player.nextTranslation.y > 0) {
  //   let inAirGravity = player.fallAcceleration;
  //   inAirGravity *= player.JumpEndEarlyGravityModifier;

  //   player.nextTranslation.y = GameMath.moveTowardsPoint(
  //     player.nextTranslation.y,
  //     -player.maxFallSpeed,
  //     inAirGravity * player.time.delta
  //   );
  // }

  // if (
  //   !(
  //     player.isTouching.ground &&
  //     player.time.elapsed < player.timeJumpWasPressed + player.JumpBuffer
  //   )
  // ) {
  // }
  //   console.log("leaving");
  //   player.timeJumpWasPressed = 0;
  //   player.state = PlayerStates.FALLING;
  // }

  // if (
  //   player.isTouching.ground ||
  //   (player.coyoteUseable &&
  //     !player.isTouching.ground &&
  //     player.time.elapsed < player.frameLeftGrounded + player.coyoteTime)
  // ) {
  //   player.endedJumpEarly = false;
  //   player.timeJumpWasPressed = 0;
  //   player.bufferJumpUsable = false;
  //   player.coyoteUseable = false;
  // player.nextTranslation.y = player.JumpPower;
  // }

  // player.jumpToConsume = false;

  // if (player.timeInJumpState < player.maxJumpTime * 0.5) {
  //   player.nextTranslation.y = GameMath.moveTowardsPoint(
  //     player.nextTranslation.y,
  //     player.JumpPower,
  //     player.fallAcceleration * player.time.delta
  //   );
  // } else {
  //   console.log("here");
  //   if (player.input.isUp()) {
  //     player.nextTranslation.y = GameMath.moveTowardsPoint(
  //       player.nextTranslation.y,
  //       player.JumpPower,
  //       player.fallAcceleration * player.time.delta
  //     );
  //   } else {
  //     player.timeInJumpState = 0;
  //     player.timeJumpWasPressed = 0;
  //     player.state = PlayerStates.FALLING;
  //   }
  // }

  // if (
  //   // player.nextTranslation.y == player.JumpPower ||
  //   player.timeInJumpState > player.maxJumpTime
  // ) {
  //   player.timeInJumpState = 0;
  //   player.timeJumpWasPressed = 0;
  //   player.state = PlayerStates.FALLING;
  // }
};

export default playerJumping;
