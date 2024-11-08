import Player from "../../world/player/player";
import Debug from "../debug";

const debugPlayer = (player: Player, debug: Debug) => {
  const playerDebug = debug.ui?.addFolder("playerDebug");
  // playerDebug?.open();
  playerDebug?.add(player, "state").name("state").listen();
  playerDebug?.add(player, "horizontalDirection").name("xDirection").listen();
  playerDebug
    ?.add(player, "debugSpriteAnimationMultiplier")
    .name("spriteTiming")
    .min(0.001)
    .step(0.001)
    .listen();
  playerDebug
    ?.add(player.nextTranslation, "x")
    .name("xVelocity")
    .min(0.001)
    .step(0.001)
    .listen();
  playerDebug
    ?.add(player.nextTranslation, "y")
    .name("yVelocity")
    .min(0.001)
    .step(0.001)
    .listen();

  const isTouching = playerDebug?.addFolder("isTouching");
  // isTouching?.open();
  isTouching
    ?.add(player.isTouching, "ground")
    .name("isTouchingGround")
    .listen();
  isTouching
    ?.add(player.isTouching, "ceiling")
    .name("isTouchingCeiling")
    .listen();
  isTouching
    ?.add(player.isTouching, "leftSide")
    .name("isTouchingLeftSide")
    .listen();
  isTouching
    ?.add(player.isTouching, "rightSide")
    .name("isTouchingRightSide")
    .listen();

  const jumping = playerDebug?.addFolder("jumping");
  // jumping?.open();
  jumping?.add(player, "coyoteAvailable").name("coyoteAvailable").listen();
  jumping?.add(player, "debugCoyoteCount").name("coyoteCount").listen();
  jumping
    ?.add(player, "debugMaxHeightJumped")
    .name("maxHeightJumped")
    .min(0.001)
    .step(0.001)
    .listen();

  // Statemanager debug
  // const stateDebug = playerDebug?.addFolder("stateDebug");
  // stateDebug?.open();

  // stateDebug
  //   ?.add(player.time, "elapsed")
  //   .name("elapsedTime")
  //   .min(0.001)
  //   .listen();
  // stateDebug
  //   ?.add(player, "timeJumpWasEntered")
  //   .name("timeJumpWasEntered")
  //   .min(0.001)
  //   .listen();
  // stateDebug
  //   ?.add(player, "timeInJumpState")
  //   .name("timeInJumpState")
  //   .min(0.001)
  //   .listen();
  // stateDebug
  //   ?.add(player, "timeFallWasEntered")
  //   .name("timeFallWasEntered")
  //   .min(0.001)
  //   .listen();
  // stateDebug
  //   ?.add(player, "timeInFallState")
  //   .name("timeInFallState")
  //   .min(0.001)
  //   .listen();
};

export default debugPlayer;
