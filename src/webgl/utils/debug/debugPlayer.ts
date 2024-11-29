import Player from "../../world/player/player";
import Debug from "../debug";

const debugPlayer = (player: Player, debug: Debug) => {
  const playerDebug = debug.ui?.addFolder("playerDebug");
  playerDebug?.open();
  playerDebug?.add(player, "state").name("state").listen();
  playerDebug?.add(player, "currentFloor").name("floor").listen();

  const movement = playerDebug?.addFolder("movement");
  // movement?.open();
  movement?.add(player, "direction").name("direction").listen();
  movement
    ?.add(player.currentPosition, "x")
    .name("positionX")
    .min(0.001)
    .step(0.001)
    .listen();
  movement
    ?.add(player.currentPosition, "y")
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
  isTouching?.open();
  isTouching?.add(player.isTouching, "ground").name("ground").listen();
  isTouching?.add(player.isTouching, "ceiling").name("ceiling").listen();
  isTouching?.add(player.isTouching, "leftSide").name("leftSide").listen();
  isTouching?.add(player.isTouching, "rightSide").name("rightSide").listen();
  isTouching
    ?.add(player.isTouching, "edgePlatform")
    .name("edgePlatform")
    .listen();

  const ladders = playerDebug?.addFolder("ladders");
  // ladders?.open();
  ladders?.add(player.isTouching, "ladderTop").name("ladderTop").listen();
  ladders?.add(player.isTouching, "ladderCore").name("ladderCore").listen();
  ladders?.add(player.isTouching, "ladderBottom").name("ladderBottom").listen();

  const jumping = playerDebug?.addFolder("jumping");
  // jumping?.open();
  jumping?.add(player, "coyoteAvailable").name("coyoteAvailable").listen();
  jumping?.add(player, "coyoteCount").name("coyoteCount").listen();
  jumping
    ?.add(player, "bufferJumpAvailable")
    .name("bufferJumpAvailable")
    .listen();
  jumping?.add(player, "bufferJumpCount").name("bufferJumpCount").listen();

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
