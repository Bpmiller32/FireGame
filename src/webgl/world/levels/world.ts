/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import Emitter from "../../utils/eventEmitter.ts";
import Experience from "../../experience.ts";
import RAPIER from "@dimforge/rapier2d";
import Player from "../player/player.ts";
import Camera from "../../camera.ts";
import GameSensor from "../gameComponents/gameSensor.ts";
import Sphere from "../gameEntities/sphere.ts";
import GameDirector from "../gameComponents/gameDirector.ts";
import Platform from "../gameStructures/platform.ts";
import Cube from "../gameEntities/cube.ts";

export default class World {
  private experience: Experience;
  private camera: Camera;

  // World assets
  public gameDirector?: GameDirector;

  public player?: Player;
  public enemies: Sphere[];

  public walls: Cube[];
  public platforms: Platform[];
  public cameraSensors: GameSensor[];

  public ladderSensors: GameSensor[];
  public ladderTopSensors: GameSensor[];
  public ladderBottomSensors: GameSensor[];

  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera;

    this.enemies = [];

    this.walls = [];
    this.platforms = [];
    this.cameraSensors = [];
    this.ladderSensors = [];
    this.ladderTopSensors = [];
    this.ladderBottomSensors = [];

    // Resources
    Emitter.on("resourcesReady", () => {
      // Player
      this.player = new Player({ width: 2, height: 4 }, { x: -6.752, y: 3 });

      // Load enemies (will do this from levelData later)
      this.enemies.push(
        new Sphere(
          "Enemy",
          1,
          { x: 10, y: 5 },
          true,
          undefined,
          RAPIER.RigidBodyDesc.dynamic()
        )
      );

      this.enemies[0].physicsBody.setLinvel(
        { x: -14, y: this.enemies[0].physicsBody.linvel().y },
        true
      );

      // Level loader
      this.gameDirector = new GameDirector();
      this.gameDirector.loadLevelData("blenderExport");
    });
  }

  public update() {
    // this.camera.update(this.player);
    this.player?.update();

    this.enemies.forEach((enemy) => {
      enemy.update();
    });

    // OneWayPlatforms
    this.platforms.forEach((platform) => {
      if (!this.player) {
        return;
      }

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

    // Ladder detection
    let ladderDetected = false;

    this.ladderSensors.forEach((sensor) => {
      sensor.update(() => {
        if (
          sensor.isIntersectingTarget &&
          this.player!.currentTranslation.x - this.player!.initalSize.x / 2 >
            sensor.initalPosition.x - sensor.initialSize.x / 2 &&
          this.player!.currentTranslation.x + this.player!.initalSize.x / 2 <
            sensor.initalPosition.x + sensor.initialSize.x / 2
        ) {
          ladderDetected = true;
        }
      });
    });

    // After all sensors are checked, update player
    if (this.player) {
      this.player.isTouching.ladder = ladderDetected;
    }

    // Ladder top detection
    let ladderTopDetected = false;

    this.ladderTopSensors.forEach((sensor) => {
      sensor.update(() => {
        if (
          sensor.isIntersectingTarget &&
          this.player!.currentTranslation.x - this.player!.initalSize.x / 2 >
            sensor.initalPosition.x - sensor.initialSize.x / 2 &&
          this.player!.currentTranslation.x + this.player!.initalSize.x / 2 <
            sensor.initalPosition.x + sensor.initialSize.x / 2
        ) {
          ladderTopDetected = true;
        }
      });
    });

    // After all sensors are checked, update player
    if (this.player) {
      this.player.isTouching.ladderTop = ladderTopDetected;
    }

    // Ladder bottom detection
    let ladderBottomDetected = false;

    this.ladderBottomSensors.forEach((sensor) => {
      sensor.update(() => {
        if (
          sensor.isIntersectingTarget &&
          this.player!.currentTranslation.x - this.player!.initalSize.x / 2 >
            sensor.initalPosition.x - sensor.initialSize.x / 2 &&
          this.player!.currentTranslation.x + this.player!.initalSize.x / 2 <
            sensor.initalPosition.x + sensor.initialSize.x / 2
        ) {
          ladderBottomDetected = true;
        }
      });
    });

    // After all sensors are checked, update player
    if (this.player) {
      this.player.isTouching.ladderBottom = ladderBottomDetected;
    }
  }

  public destroy() {}
}
