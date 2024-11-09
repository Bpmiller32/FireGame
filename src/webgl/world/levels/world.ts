/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Emitter from "../../utils/eventEmitter.ts";
import Experience from "../../experience.ts";
import Box from "../gameEntities/box.ts";
import Player from "../player/player.ts";
import TestLevel0 from "../levels/blenderExport.json";
import Camera from "../../camera.ts";
import GameSensor from "../gameElements/gameSensor.ts";
import GameObjectType from "../../utils/types/gameObjectType.ts";
import Sphere from "../gameEntities/sphere.ts";
import RAPIER from "@dimforge/rapier2d";
import GameDirector from "../gameElements/gameDirector.ts";

export default class World {
  private experience: Experience;
  private camera: Camera;

  // World assets
  public gameManager?: GameDirector;
  public player?: Player;
  public platforms: Box[];
  public sensors: GameSensor[];
  sensor?: GameSensor;
  ball?: Sphere;

  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera;

    this.platforms = [];
    this.sensors = [];

    const randomColors = ["red", "orange", "yellow", "green", "blue", "purple"];
    this.camera.changeLookaheadX(12.5);
    this.camera.changePositionZ(65);

    // Resources
    Emitter.on("resourcesReady", () => {
      // Player
      this.player = new Player({ width: 2, height: 4 }, { x: 0, y: 10 });

      // Test dynamic ball
      this.ball = new Sphere(
        2,
        { x: -5, y: 25 },
        "Enemy",
        true,
        undefined,
        RAPIER.RigidBodyDesc.dynamic()
      );

      // Imported platforms
      for (const [_, value] of Object.entries(TestLevel0)) {
        if (value.type != "platform") {
          continue;
        }

        this.platforms.push(
          new Box(
            {
              width: value.width * 2,
              height: value.depth,
              depth: value.height,
            },
            { x: value.position[0], y: value.position[2] },
            -value.rotation[1],
            "Platform",
            true,
            new THREE.MeshBasicMaterial({
              color:
                randomColors[Math.floor(Math.random() * randomColors.length)],
            })
          )
        );
      }

      // Imported sensors
      for (const [_, value] of Object.entries(TestLevel0)) {
        if (value.type != "sensor") {
          continue;
        }

        this.sensors.push(
          new GameSensor(
            GameObjectType.CUBE,
            { width: value.bb_width, height: value.bb_depth },
            { x: value.position[0], y: value.position[2] },
            this.player.physicsBody,
            new THREE.Vector3(0, value.value, 0)
          )
        );
      }

      // Game manager
      this.gameManager = new GameDirector();
    });
  }

  public update() {
    if (!this.gameManager?.isGameUpdating) {
      return;
    }

    this.gameManager?.update();
    this.camera.update(this.player);
    this.player?.update();

    this.sensors.forEach((sensor) => {
      sensor.update();
      if (sensor.isIntersectingTarget) {
        this.camera.changePositionY(sensor.targetCameraPosition!.y);
      }
    });

    this.ball?.update();
  }

  public destroy() {}
}
