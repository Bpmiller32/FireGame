import Player from "./player";

const debugPlayer = (player: Player) => {
  player.debug = player.experience.debug;

  const playerDebug = player.debug.ui?.addFolder("playerDebug");
  playerDebug?.open();

  // Status debug
  const status = playerDebug?.addFolder("status");
  status?.open();
  status?.add(player, "state").name("state").listen();
  status?.add(player, "direction").name("xDirection").listen();
  status?.add(player.isTouching, "ground").name("isTouchingGround").listen();
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

  // Statemanager debug
  const stateDebug = playerDebug?.addFolder("stateDebug");
  stateDebug?.open();
};

export default debugPlayer;
