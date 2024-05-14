import Player from "./player";

const debugPlayer = (player: Player) => {
  player.debug = player.experience.debug;

  const playerDebug = player.debug.ui?.addFolder("playerDebug");
  playerDebug?.open();

  // Status debug
  const status = playerDebug?.addFolder("status");
  status?.open();
  status?.add(player, "state").name("state").listen();
  status?.add(player, "horizontalDirection").name("xDirection").listen();
  status?.add(player.isTouching, "ground").name("isTouchingGround").listen();
  status?.add(player.isTouching, "ceiling").name("isTouchingCeiling").listen();
  status?.add(player, "coyoteAvailable").name("coyoteAvailable").listen();
  status?.add(player, "debugCoyoteCount").name("coyoteCount").listen();
  status
    ?.add(player.nextTranslation, "x")
    .name("xVelocity")
    .min(0.001)
    .step(0.001)
    .listen();
  status
    ?.add(player.nextTranslation, "y")
    .name("yVelocity")
    .min(0.001)
    .step(0.001)
    .listen();
  status
    ?.add(player, "debugMaxHeightJumped")
    .name("maxHeightJumped")
    .min(0.001)
    .step(0.001)
    .listen();
  status
    ?.add(player, "debugSpriteAnimationMultiplier")
    .name("spriteTiming")
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
