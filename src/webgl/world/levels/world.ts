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

export default class World {
  private experience: Experience;
  private camera: Camera;

  // World assets
  public gameDirector?: GameDirector;

  public player!: Player;
  public enemies: Enemy[];
  public crazyEnemies: CrazyEnemy[];

  public walls: Platform[];
  public platforms: Platform[];
  public cameraSensors: GameSensor[];

  public ladderCoreSensors: GameSensor[];
  public ladderTopSensors: GameSensor[];
  public ladderBottomSensors: GameSensor[];

  public trashCans: TrashCan[];

  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera;

    this.cameraSensors = [];

    this.enemies = [];
    this.crazyEnemies = [];
    this.trashCans = [];

    this.platforms = [];
    this.walls = [];

    this.ladderCoreSensors = [];
    this.ladderTopSensors = [];
    this.ladderBottomSensors = [];

    // Resources
    Emitter.on("resourcesReady", () => {
      // Player
      this.player = new Player({ width: 2, height: 4 }, { x: -6.752, y: 3 });

      // Level loader
      this.gameDirector = new GameDirector();
      this.gameDirector.loadLevelData("blenderExport");

      this.crazyEnemies.push(
        new CrazyEnemy(
          1,
          {
            x: -15,
            y: 50,
          },
          true
        )
      );
      // Throw 1 immediately, then interval
      // this.gameDirector?.spawnEnemy();

      this.gameDirector.spawnEnemiesWithRandomInterval();
    });

    // Events
    Emitter.on("gameObjectRemoved", (removedGameObject) => {
      removedGameObject.destroy();
    });

    // Periodically remove destroyed objects from gameObject arrays
    setInterval(() => {
      this.enemies = GameUtils.removeDestroyedObjects(this.enemies);
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
      enemy.updateEnemy(this.player, this.trashCans[0]);
    });

    // CrazyEnemies
    this.crazyEnemies.forEach((enemy) => {
      enemy.updateEnemy(this.trashCans[0]);
    });

    // OneWayPlatforms
    this.platforms.forEach((platform) => {
      platform.updateOneWayPlatform(this.player);

      if (this.player.state == "climbing") {
        platform.setOneWayPlatform(true);
      }
    });

    // Camera sensors
    this.cameraSensors.forEach((sensor) => {
      sensor.update(() => {
        if (sensor.isIntersectingTarget) {
          this.camera.changePositionY(sensor.positionData!.y);
        }
      });
    });

    // Ladder core detection
    let ladderCoreDetected = false;

    this.ladderCoreSensors.forEach((sensor) => {
      sensor.update(() => {
        if (
          sensor.isIntersectingTarget &&
          this.player.currentTranslation.x - this.player.initalSize.x / 2 >
            sensor.initalPosition.x - sensor.initialSize.x / 2 &&
          this.player.currentTranslation.x + this.player.initalSize.x / 2 <
            sensor.initalPosition.x + sensor.initialSize.x / 2
        ) {
          ladderCoreDetected = true;
        }
      });
    });

    this.player.isTouching.ladderCore = ladderCoreDetected;

    // Ladder top detection
    let ladderTopDetected = false;

    this.ladderTopSensors.forEach((sensor) => {
      sensor.update(() => {
        if (sensor.isIntersectingTarget) {
          ladderTopDetected = true;
        }
      });
    });

    this.player.isTouching.ladderTop = ladderTopDetected;

    // Ladder bottom detection
    let ladderBottomDetected = false;

    this.ladderBottomSensors.forEach((sensor) => {
      sensor.update(() => {
        if (sensor.isIntersectingTarget) {
          ladderBottomDetected = true;
        }
      });
    });

    this.player.isTouching.ladderBottom = ladderBottomDetected;
  }

  public destroy() {}
}
