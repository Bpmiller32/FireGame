/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Emitter from "../utils/eventEmitter.ts";
import Experience from "../experience.ts";
import Box from "./gameEntities/box.ts";
import Player from "./player/player.ts";
import BlenderExport from "./levels/testLevel0.json";
import Camera from "../camera.ts";
import GameSensor from "./gameElements/gameSensor.ts";
import GameObjectType from "../utils/types/gameObjectType.ts";
import Sphere from "./gameEntities/sphere.ts";
import RAPIER from "@dimforge/rapier2d";

export default class World {
  private experience: Experience;
  private camera: Camera;

  // World assets
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
      this.player = new Player({ width: 2, height: 4 }, { x: -20, y: 20 });

      // Test dynamic ball
      this.ball = new Sphere(
        2,
        { x: -5, y: 25 },
        true,
        undefined,
        RAPIER.RigidBodyDesc.dynamic()
      );

      // Imported platforms
      for (const [_, value] of Object.entries(BlenderExport)) {
        if (value.type != "platform") {
          continue;
        }

        this.platforms.push(
          new Box(
            { width: value.width, height: value.depth, depth: value.height },
            { x: value.position[0], y: value.position[2] },
            true,
            new THREE.MeshBasicMaterial({
              color:
                randomColors[Math.floor(Math.random() * randomColors.length)],
            })
          )
        );
      }

      // Imported sensors
      for (const [_, value] of Object.entries(BlenderExport)) {
        if (value.type != "sensor") {
          continue;
        }

        this.sensors.push(
          new GameSensor(
            GameObjectType.CUBE,
            { width: value.width, height: value.depth },
            { x: value.position[0], y: value.position[2] },
            this.player.physicsBody,
            new THREE.Vector3(0, value.value, 0)
          )
        );
      }
    });
  }

  public update() {
    this.player?.update();

    this.camera.update(
      this.player?.currentTranslation,
      this.player?.spriteAnimator.state
    );

    this.sensors.forEach((sensor) => {
      sensor.update();
      if (sensor.isIntersectingTarget) {
        this.camera.changePositionY(sensor.cameraPosition!.y);
      }
    });

    this.ball?.update();

    // TODO: remove after debug
    if (
      this.player &&
      this.player.mesh!.position.y > this.player.debugMaxHeightJumped
    ) {
      this.player.debugMaxHeightJumped = this.player.mesh!.position.y;
    }

    // if (this.player) {
    //   this.player.debugSpriteAnimationMultiplier =
    //     this.player.spriteAnimator.timingMultiplier;
    // }
  }

  public destroy() {
    this.player?.destroy();
  }
}
