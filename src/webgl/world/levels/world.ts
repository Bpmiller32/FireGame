/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import Emitter from "../../utils/eventEmitter.ts";
import Experience from "../../experience.ts";
import Player from "../player/player.ts";
import Camera from "../../camera.ts";
import GameSensor from "../gameComponents/gameSensor.ts";
import GameDirector from "../gameComponents/gameDirector.ts";
import Platform from "../gameStructures/platform.ts";
import Enemy from "../gameStructures/enemy.ts";
import GameUtils from "../../utils/gameUtils.ts";
import TrashCan from "../gameStructures/trashCan.ts";
import CrazyEnemy from "../gameStructures/crazyEnemy.ts";
import setDkAttributes from "../player/attributes/setDkAttributes.ts";

export default class World {
  private experience: Experience;
  private camera: Camera;

  // World assets
  public gameDirector?: GameDirector;

  public player!: Player;
  public cameraSensors: GameSensor[];

  public enemies: Enemy[];
  public crazyEnemies: CrazyEnemy[];

  public trashCans: TrashCan[];
  public teleporters: GameSensor[];

  public platforms: Platform[];
  public walls: Platform[];

  public ladderCoreSensors: GameSensor[];
  public ladderTopSensors: GameSensor[];
  public ladderBottomSensors: GameSensor[];

  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera;

    this.cameraSensors = [];

    // this.playerSpawn

    this.enemies = [];
    this.crazyEnemies = [];

    this.trashCans = [];
    this.teleporters = [];

    this.platforms = [];
    this.walls = [];

    this.ladderCoreSensors = [];
    this.ladderTopSensors = [];
    this.ladderBottomSensors = [];

    // Events
    Emitter.on("resourcesReady", () => {
      this.player = new Player({ width: 2, height: 4 }, { x: -6.752, y: 3 });

      this.gameDirector = new GameDirector();

      this.gameDirector.loadLevelData("blenderExport");
      setDkAttributes(this.player);

      // this.gameDirector.loadLevelData();
      // setCelesteAttributes(this.player);
      // this.player.teleportRelative(0, 10);

      Emitter.emit("gameStart");
    });

    // Place everything back in inital state
    Emitter.on("gameReset", () => {
      this.player.teleportToPosition(
        this.player.initialPosition.x,
        this.player.initialPosition.y
      );

      this.enemies.forEach((enemy) => enemy.destroy());
      this.crazyEnemies.forEach((crazyEnemy) => crazyEnemy.destroy());
      this.trashCans.forEach((trashCan) => (trashCan.isOnFire = false));
    });

    // Remove world objects here instead of in their instances
    Emitter.on("gameObjectRemoved", (removedGameObject) => {
      removedGameObject.destroy();
    });

    // Periodically remove destroyed objects from gameObject arrays
    setInterval(() => {
      this.enemies = GameUtils.removeDestroyedObjects(this.enemies);
      this.crazyEnemies = GameUtils.removeDestroyedObjects(this.crazyEnemies);
    }, 5000);
  }

  public update() {
    // Guard against player not ready yet
    if (!this.player) {
      return;
    }

    // Camera
    this.camera.update(this.player);

    // Player
    this.player.update();

    // Enemies
    this.enemies.forEach((enemy) => {
      enemy.update(this.player, this.trashCans[0]);
    });

    // CrazyEnemies
    this.crazyEnemies.forEach((crazyEnemy) => {
      crazyEnemy.update(this.trashCans[0]);
    });

    // Teleporters
    this.teleporters.forEach((teleporter) => {});

    // OneWayPlatforms
    this.platforms.forEach((platform) => {
      platform.update(this.player);

      if (this.player.state == "climbing") {
        platform.setOneWayPlatformActive(true);
      }
    });

    // Camera sensors
    this.cameraSensors.forEach((sensor) => {
      sensor.update(() => {
        if (sensor.isIntersectingTarget) {
          this.camera.changePositionY(sensor.positionData.y);
          return;
        }
      });
    });

    // Ladder top detection
    this.player.isTouching.ladderTop = GameUtils.isObjectTouchingAnySensor(
      this.ladderTopSensors
    );

    // Ladder core detection
    this.player.isTouching.ladderCore = GameUtils.isObjectFullyInsideAnySensor(
      this.ladderCoreSensors,
      this.player
    );

    // Ladder bottom detection
    this.player.isTouching.ladderBottom = GameUtils.isObjectTouchingAnySensor(
      this.ladderBottomSensors
    );
  }

  public destroy() {}
}
