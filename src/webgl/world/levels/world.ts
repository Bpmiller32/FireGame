/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import Emitter from "../../utils/eventEmitter.ts";
import Experience from "../../experience.ts";
import Player from "../player/player.ts";
import Camera from "../../camera.ts";
import GameDirector from "../gameComponents/gameDirector.ts";
import Platform from "../gameEntities/platform.ts";
import Enemy from "../gameEntities/enemy.ts";
import GameUtils from "../../utils/gameUtils.ts";
import TrashCan from "../gameEntities/trashCan.ts";
import CrazyEnemy from "../gameEntities/crazyEnemy.ts";
import DkLevelData from "./blenderExport.json";
import CameraSensor from "../gameEntities/cameraSensor.ts";
import LadderSensor from "../gameEntities/ladderSensor.ts";
import Teleporter from "../gameEntities/teleporter.ts";
import WinFlag from "../gameEntities/winFlag.ts";

export default class World {
  private experience: Experience;
  private camera: Camera;

  // World assets
  public gameDirector?: GameDirector;

  public player!: Player;
  public cameraSensors: CameraSensor[];

  public enemies: Enemy[];
  public crazyEnemies: CrazyEnemy[];

  public trashCans: TrashCan[];
  public winFlags: WinFlag[];
  public teleporters: Teleporter[];

  public platforms: Platform[];
  public walls: Platform[];

  public ladderCoreSensors: LadderSensor[];
  public ladderTopSensors: LadderSensor[];
  public ladderBottomSensors: LadderSensor[];

  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera;

    this.cameraSensors = [];

    this.enemies = [];
    this.crazyEnemies = [];

    this.trashCans = [];
    this.winFlags = [];
    this.teleporters = [];

    this.platforms = [];
    this.walls = [];

    this.ladderCoreSensors = [];
    this.ladderTopSensors = [];
    this.ladderBottomSensors = [];

    // Events
    Emitter.on("resourcesReady", async () => {
      this.gameDirector = new GameDirector();
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

    // Teleporters - now automatic via sensor callbacks! No update needed

    // WinFlag
    this.winFlags.forEach((winFlag) => {
      winFlag.update();
    });

    // Platforms - update one-way platform collision state
    GameUtils.updatePlatforms(this.platforms, this.player);

    // Camera sensors - now automatic via sensor callbacks! No manual update needed

    // Ladder detection - TODO: Convert to sensor callbacks when Player is refactored
    // For now, keeping manual detection since Player still uses the old system
    this.player.isTouching.ladderTop = GameUtils.isAnySensorTriggered(
      this.ladderTopSensors
    );

    this.player.isTouching.ladderCore =
      GameUtils.isAnySensorTriggeredObjectFullyInside(
        this.ladderCoreSensors,
        this.player
      );

    this.player.isTouching.ladderBottom = GameUtils.isAnySensorTriggered(
      this.ladderBottomSensors
    );
  }

  public destroy() {}
}
