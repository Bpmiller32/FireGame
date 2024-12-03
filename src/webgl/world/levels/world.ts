/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import Emitter from "../../utils/eventEmitter.ts";
import Experience from "../../experience.ts";
import Player from "../player/player.ts";
import Camera from "../../camera.ts";
import GameDirector from "../gameComponents/gameDirector.ts";
import Platform from "../gameStructures/platform.ts";
import Enemy from "../gameStructures/enemy.ts";
import GameUtils from "../../utils/gameUtils.ts";
import TrashCan from "../gameStructures/trashCan.ts";
import CrazyEnemy from "../gameStructures/crazyEnemy.ts";
import DkLevelData from "./blenderExport.json";
import CameraSensor from "../gameStructures/cameraSensor.ts";
import LadderSensor from "../gameStructures/ladderSensor.ts";
import Teleporter from "../gameStructures/teleporter.ts";
import ResourceLoader from "../../utils/resourceLoader.ts";

export default class World {
  private experience: Experience;
  private camera: Camera;
  private resources: ResourceLoader;

  // World assets
  public gameDirector?: GameDirector;

  public player!: Player;
  public cameraSensors: CameraSensor[];

  public enemies: Enemy[];
  public crazyEnemies: CrazyEnemy[];

  public trashCans: TrashCan[];
  public teleporters: Teleporter[];

  public platforms: Platform[];
  public walls: Platform[];

  public ladderCoreSensors: LadderSensor[];
  public ladderTopSensors: LadderSensor[];
  public ladderBottomSensors: LadderSensor[];

  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera;
    this.resources = this.experience.resources;

    this.cameraSensors = [];

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
    Emitter.on("resourcesReady", async () => {
      this.gameDirector = new GameDirector();
      await this.gameDirector.graphicsObject.createObjectGraphics(
        this.resources.items.dkGraphicsData
      );
      this.gameDirector.loadLevelData(DkLevelData);

      Emitter.emit("gameStart");
    });

    // Place everything back in inital state
    Emitter.on("gameReset", () => {
      // Player
      this.player.teleportToPosition(
        this.player.initialTranslation.x,
        this.player.initialTranslation.y
      );

      // Camera
      this.camera.teleportToPosition(
        this.camera.initialPosition.x,
        this.camera.initialPosition.y,
        this.camera.initialPosition.z
      );

      // Clear enemies, put water on TrashCan
      this.enemies.forEach((enemy) => Emitter.emit("gameObjectRemoved", enemy));
      this.crazyEnemies.forEach((crazyEnemy) =>
        Emitter.emit("gameObjectRemoved", crazyEnemy)
      );
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
    if (!this.player || !this.player.physicsBody) {
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
    this.teleporters.forEach((teleporter) => {
      teleporter.update();
    });

    // Platforms
    GameUtils.updatePlatforms(this.platforms, this.player);

    // Camera sensors
    GameUtils.updateCameraSensors(this.camera, this.cameraSensors);

    // Ladder top detection
    this.player.isTouching.ladderTop = GameUtils.isAnySensorTriggered(
      this.ladderTopSensors
    );

    // Ladder core detection
    this.player.isTouching.ladderCore =
      GameUtils.isAnySensorTriggeredObjectFullyInside(
        this.ladderCoreSensors,
        this.player
      );

    // Ladder bottom detection
    this.player.isTouching.ladderBottom = GameUtils.isAnySensorTriggered(
      this.ladderBottomSensors
    );
  }

  public destroy() {}
}
