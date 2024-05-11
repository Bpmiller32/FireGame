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
import ImportedGeometry from "./objects/importedGeometry.ts";
import blenderData from "./objects/blenderExport.json";
import RAPIER from "@dimforge/rapier2d";

export default class World {
  private experience: Experience;
  private resources: ResourceLoader;

  // World assets
  public player?: Player;

  public box1?: Box;
  public box2?: Box;
  public sphere?: Sphere;
  importedGeometry?: ImportedGeometry;

  public allPlatforms: Floor[];
  public importedPlatforms: Box[];
  public mediumSizedPlatforms: THREE.Vec2[];

  constructor() {
    this.experience = Experience.getInstance();
    this.resources = this.experience.resources;
    this.allPlatforms = [];
    this.importedPlatforms = [];
    this.mediumSizedPlatforms = [
      { x: -5.0, y: 3.0 },
      { x: -10.0, y: 6.0 },
      { x: -12.5, y: 9.0 },
    ];

    // Resources
    this.resources?.on("ready", () => {
      // this.importedGeometry = new ImportedGeometry();

      // Initial floor
      this.allPlatforms.push(
        new Floor(
          { width: 200, height: 0.75, depth: 2 },
          { x: 0, y: -2 },
          new THREE.MeshBasicMaterial({
            color: "green",
            opacity: 1,
            transparent: true,
          }),
          "MainFloor"
        )
      );

      // Imported platforms
      for (const [key, value] of Object.entries(blenderData)) {
        this.importedPlatforms.push(
          new Box(
            { width: value.width, height: value.depth },
            { x: value.position[0], y: value.position[2] },
            // undefined,
            new THREE.MeshBasicMaterial({
              color: "blue",
              opacity: 1,
              transparent: true,
            }),
            RAPIER.RigidBodyDesc.fixed()
          )
        );
      }

      // // Platforms
      // for (let i = 0; i < this.mediumSizedPlatforms.length; i++) {
      //   this.allPlatforms.push(
      //     new Floor(
      //       { width: 1.5, height: 0.75, depth: 2 },
      //       {
      //         x: this.mediumSizedPlatforms[i].x,
      //         y: this.mediumSizedPlatforms[i].y,
      //       },
      //       new THREE.MeshBasicMaterial({
      //         color: "green",
      //         opacity: 1,
      //         transparent: true,
      //       }),
      //       "Floor:" + i
      //     )
      //   );
      // }

      // // Random dynamic objects
      // this.box1 = new Box(
      //   { width: 1, height: 1 },
      //   { x: 7, y: 3 },
      //   new THREE.MeshBasicMaterial({ color: "blue" })
      // );

      // this.box2 = new Box(
      //   { width: 1, height: 1 },
      //   { x: 3, y: 3 },
      //   new THREE.MeshBasicMaterial({ color: "blue" })
      // );

      // this.sphere = new Sphere(
      //   1,
      //   { x: 5, y: 2 },
      //   new THREE.MeshBasicMaterial({ color: "yellow" })
      // );

      this.player = new Player({ width: 0.5, height: 1 }, { x: 2, y: 100 });
    });
  }

  public update() {
    this.box1?.update();
    this.box2?.update();
    this.sphere?.update();
    this.player?.update();

    this.importedPlatforms.forEach((element) => {
      element.update();
    });

    // Camera follow
    if (this.player?.mesh.position) {
      this.experience.camera.instance.position.x = this.player.mesh.position.x;

      // this.experience.camera.instance.position.y = this.player.mesh.position.y;
    }
  }

  public destroy() {
    this.box1?.destroy();
    this.box2?.destroy();

    this.sphere?.destroy();

    this.player?.destroy();
  }
}
