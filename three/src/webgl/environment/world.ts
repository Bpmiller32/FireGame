/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import Experience from "../experience";
import Box from "./objects/box.ts";
import Floor from "./objects/floor.ts";
import Sphere from "./objects/sphere.ts";
import { Vector2 } from "@dimforge/rapier2d";
import Player from "./player/playerKinematicPosition.ts";
import PlayerDynamic from "./player/playerDynamic.ts";

export default class World {
  // Setup
  private experience = Experience.getInstance();
  private resources = this.experience.resources;

  // Constuctor setup
  public floor?: Floor;
  public box1?: Box;
  public box2?: Box;
  public sphere?: Sphere;
  public spritePlayer?: Player;
  spritePlayerDynamic?: PlayerDynamic;
  floor2?: Floor;

  constructor() {
    // Resources
    this.resources?.on("ready", () => {
      this.floor = new Floor({ x: 200, y: 0 });
      this.floor2 = new Floor({ x: 10, y: 0 });
      this.floor2.body?.setTranslation({ x: 1, y: 2 }, true);

      this.box1 = new Box();
      this.box1.body?.setTranslation(new Vector2(7, 3), true);

      this.box2 = new Box();
      this.box2.body?.setTranslation(new Vector2(3, 3), true);

      this.sphere = new Sphere();
      this.sphere.body?.setTranslation(new Vector2(5, 2), true);

      this.spritePlayer = new Player();
      this.spritePlayer.body?.setTranslation(new Vector2(2, 3), true);

      // this.spritePlayerDynamic = new PlayerDynamic();
      // this.spritePlayerDynamic.body?.setTranslation(new Vector2(1, 1), true);
    });
  }

  public update() {
    this.box1?.update();
    this.box2?.update();
    this.sphere?.update();
    this.spritePlayer?.update();
    // this.spritePlayerDynamic?.update();
    if (this.spritePlayer?.mesh?.position) {
      this.experience.camera.instance.position.x =
        this.spritePlayer.mesh.position.x;

      // this.experience.camera!.instance!.position.y =
      //   this.spritePlayer.mesh.position.y;
    }
  }

  public destroy() {
    // TODO
  }
}
