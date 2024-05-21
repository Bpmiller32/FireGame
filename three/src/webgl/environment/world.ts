/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader.ts";
import Box from "./objects/box.ts";
import Player from "./player/player.ts";
import BlenderExport from "./objects/blenderExport.json";
import Camera from "../camera.ts";
import GameSensor from "./objects/gameSensor.ts";
import GameObjectType from "../utils/types/gameObjectType.ts";
import Sphere from "./objects/sphere.ts";
import RAPIER from "@dimforge/rapier2d";
import CameraSensor from "./objects/cameraSensor.ts";

export default class World {
  private experience: Experience;
  private resources: ResourceLoader;
  private camera: Camera;

  // World assets
  public player?: Player;
  public platforms: Box[];
  public sensors: CameraSensor[];
  sensor?: GameSensor;
  ball?: Sphere;

  constructor() {
    this.experience = Experience.getInstance();
    this.resources = this.experience.resources;
    this.camera = this.experience.camera;

    this.platforms = [];
    this.sensors = [];

    const randomColors = ["red", "orange", "yellow", "green", "blue", "purple"];
    this.camera.changeXLookahead(12.5);
    this.camera.changePositionZ(65);

    // Resources
    this.resources?.on("ready", () => {
      // Player
      this.player = new Player({ width: 2, height: 4 }, { x: -20, y: 20 });

      // Test dynamic ball
      this.ball = new Sphere(
        2,
        { x: 10, y: 25 },
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
          new CameraSensor(
            GameObjectType.CUBE,
            { width: value.width, height: value.depth },
            { x: value.position[0], y: value.position[2] },
            new THREE.Vector3(0, value.value, 0),
            this.player.body
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

    this.sensors.forEach((element) => {
      element.update();
      if (element.isIntersectingTarget) {
        this.camera.changePositionY(element.cameraValue.y);
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

    if (this.player) {
      this.player.debugSpriteAnimationMultiplier =
        this.player.spriteAnimator.timingMultiplier;
    }
  }

  public destroy() {
    this.player?.destroy();
  }
}
