import Player from "../../world/player/player";
import Debug from "../debug";

const debugPlayer = (player: Player, debug: Debug) => {
  const playerDebug = debug.ui?.addFolder("playerDebug");
  playerDebug?.open();
  playerDebug?.add(player, "state").name("state").listen();
  playerDebug?.add(player, "currentFloor").name("floor").listen();

  const movement = playerDebug?.addFolder("movement");
  // movement?.open();
  movement?.add(player, "direction").name("xDirection").listen();
  movement
    ?.add(player, "currentPositionX")
    .name("positionX")
    .min(0.001)
    .step(0.001)
    .listen();
  movement
    ?.add(player, "currentPositionY")
    .name("positionY")
    .min(0.001)
    .step(0.001)
    .listen();
  movement
    ?.add(player.nextTranslation, "x")
    .name("velocityX")
    .min(0.001)
    .step(0.001)
    .listen();
  movement
    ?.add(player.nextTranslation, "y")
    .name("velocityY")
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

  const ladders = playerDebug?.addFolder("ladders");
  // ladders?.open();
  ladders?.add(player.isTouching, "ladderTop").name("ladderTop").listen();
  ladders?.add(player.isTouching, "ladderCore").name("ladderCore").listen();
  ladders?.add(player.isTouching, "ladderBottom").name("ladderBottom").listen();

  const jumping = playerDebug?.addFolder("jumping");
  // jumping?.open();
  jumping?.add(player, "coyoteAvailable").name("coyoteAvailable").listen();
  jumping?.add(player, "debugCoyoteCount").name("coyoteCount").listen();

  const timers = playerDebug?.addFolder("timers");
  // timers?.open();
  timers?.add(player.time, "elapsed").name("elapsedTime").min(0.001).listen();
  timers
    ?.add(player, "timeJumpWasEntered")
    .name("timeJumpWasEntered")
    .min(0.001)
    .listen();
  timers
    ?.add(player, "timeFallWasEntered")
    .name("timeFallWasEntered")
    .min(0.001)
    .listen();
};

export default debugPlayer;
