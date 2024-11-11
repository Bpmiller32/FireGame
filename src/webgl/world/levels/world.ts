/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import Emitter from "../../utils/eventEmitter.ts";
import Experience from "../../experience.ts";
import Cube from "../gameEntities/cube.ts";
import Player from "../player/player.ts";
import Camera from "../../camera.ts";
import GameSensor from "../gameElements/gameSensor.ts";
import Sphere from "../gameEntities/sphere.ts";
import RAPIER from "@dimforge/rapier2d";
import GameDirector from "../gameElements/gameDirector.ts";
import UserData from "../../utils/types/userData.ts";

export default class World {
  private experience: Experience;
  private camera: Camera;

  // World assets
  public gameDirector?: GameDirector;
  public player?: Player;

  public enemies: Sphere[];

  public platforms: Cube[];
  public sensors: GameSensor[];

  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera;

    this.enemies = [];

    this.platforms = [];
    this.sensors = [];

    this.camera.changeLookaheadX(12.5);
    this.camera.changePositionZ(65);

    // Resources
    Emitter.on("resourcesReady", () => {
      // Player
      this.player = new Player({ width: 2, height: 4 }, { x: 0, y: 30 });

      // Load enemies (will do this from levelData in GameDirector later)
      // this.enemies.push(
      //   new Sphere(
      //     "Enemy",
      //     1,
      //     { x: -5, y: 25 },
      //     true,
      //     undefined,
      //     RAPIER.RigidBodyDesc.dynamic()
      //   )
      // );

      // Game director
      this.gameDirector = new GameDirector();
      this.gameDirector.loadLevelData("blenderExport");
    });
  }

  public update() {
    this.gameDirector?.update();
    // this.camera.update(this.player);
    this.player?.update();

    this.enemies.forEach((enemy) => {
      enemy.update();
    });

    // Quick hack to make 1 way platforms, TODO: make properly with collision groups
    this.platforms.forEach((platform) => {
      if (
        this.player &&
        (platform.physicsBody.userData as UserData).name == "Platform" &&
        this.player.currentTranslation.y > platform.currentTranslation.y
      ) {
        platform.physicsBody.collider(0).setSensor(false);
      } else if ((platform.physicsBody.userData as UserData).name == "Wall") {
        platform.physicsBody.collider(0).setSensor(false);
      } else {
        platform.physicsBody.collider(0).setSensor(true);
      }
    });

    this.sensors.forEach((sensor) => {
      sensor.update(() => {
        if (sensor.isIntersectingTarget) {
          this.camera.changePositionY(sensor.positionData!.y);
        }
      });
    });
  }

  public destroy() {}
}
