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
import UserData from "../../utils/types/userData.ts";
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
  public sensors: GameSensor[];

  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera;

    this.enemies = [];

    this.walls = [];
    this.platforms = [];
    this.sensors = [];

    this.camera.changeLookaheadX(12.5);
    this.camera.changePositionZ(65);

    // Resources
    Emitter.on("resourcesReady", () => {
      // Player
      this.player = new Player({ width: 2, height: 4 }, { x: -6.752, y: 3 });

      this.experience.physics.player = this.player;

      // Load enemies (will do this from levelData in GameDirector later)
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

      console.log(this.enemies[0].physicsBody.collider(0).collisionGroups());
      console.log(this.player.physicsBody.collider(0).collisionGroups());

      this.enemies[0].physicsBody.setLinvel(
        // { x: -8.46, y: this.enemies[0].physicsBody.linvel().y },
        { x: -14, y: this.enemies[0].physicsBody.linvel().y },
        true
      );

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
      // if (
      //   this.player &&
      //   (platform.physicsBody.userData as UserData).name == "OneWayPlatform" &&
      //   this.player.currentTranslation.y - 2 > platform.currentTranslation.y
      // ) {
      //   platform.physicsBody.collider(0).setSensor(false);
      // } else if ((platform.physicsBody.userData as UserData).name == "Wall") {
      //   platform.physicsBody.collider(0).setSensor(false);
      // } else {
      //   platform.physicsBody.collider(0).setSensor(true);
      // }
      // if (this.player) {
      //   platform.updateCollisions(this.player);
      // }

      if (this.player) {
        platform.updateOneWayPlatform(this.player);
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
