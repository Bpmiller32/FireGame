/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader.ts";
import Box from "./objects/box.ts";
import Floor from "./objects/floor.ts";
import Sphere from "./objects/sphere.ts";
import Player from "./player/player.ts";

export default class World {
  private experience: Experience;
  private resources: ResourceLoader;

  // World assets
  public floor1?: Floor;
  public box1?: Box;
  public box2?: Box;
  public sphere?: Sphere;
  public player?: Player;
  public floor2?: Floor;

  constructor() {
    this.experience = Experience.getInstance();
    this.resources = this.experience.resources;

    // Resources
    this.resources?.on("ready", () => {
      this.floor1 = new Floor(
        { width: 200, height: 0 },
        { x: 0, y: 0 },
        new THREE.MeshBasicMaterial({ color: "green" })
      );
      this.floor2 = new Floor(
        { width: 10, height: 0 },
        { x: 3, y: 2.5 },
        new THREE.MeshBasicMaterial({ color: "green" })
      );

      this.box1 = new Box(
        { width: 1, height: 1 },
        { x: 7, y: 3 },
        new THREE.MeshBasicMaterial({ color: "blue" })
      );

      this.box2 = new Box(
        { width: 1, height: 1 },
        { x: 3, y: 3 },
        new THREE.MeshBasicMaterial({ color: "blue" })
      );

      this.sphere = new Sphere(
        1,
        { x: 5, y: 2 },
        new THREE.MeshBasicMaterial({ color: "yellow" })
      );

      this.player = new Player({ width: 0.5, height: 1 }, { x: 2, y: 3 });
    });
  }

  public update() {
    this.box1?.update();
    this.box2?.update();
    this.sphere?.update();
    this.player?.update();

    // Camera follow
    if (this.player?.mesh.position) {
      this.experience.camera.instance.position.x = this.player.mesh.position.x;

      // this.experience.camera.instance.position.y = this.player.mesh.position.y;
    }
  }

  public destroy() {
    this.floor1?.destroy();
    this.floor2?.destroy();

    this.box1?.destroy();
    this.box2?.destroy();

    this.sphere?.destroy();

    this.player?.destroy();
  }
}
