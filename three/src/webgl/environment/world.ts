/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import Experience from "../experience";
import Box from "./objects/box.ts";
import Floor from "./objects/floor.ts";
import Sphere from "./objects/sphere.ts";
import { Vector2 } from "@dimforge/rapier2d";
import SpritePlayer from "./player/spritePlayer.ts";

export default class World {
  private experience = Experience.getInstance();
  // private scene = this.experience.scene;
  private resources = this.experience.resources;

  public floor?: Floor;
  public box1?: Box;
  public box2?: Box;
  public sphere?: Sphere;
  public spritePlayer?: SpritePlayer;

  constructor() {
    // Resources
    this.resources?.on("ready", () => {
      this.floor = new Floor();

      this.box1 = new Box();
      this.box1.body?.setTranslation(new Vector2(7, 3), true);

      this.box2 = new Box();
      this.box2.body?.setTranslation(new Vector2(3, 3), true);

      this.sphere = new Sphere();
      this.sphere.body?.setTranslation(new Vector2(5, 2), true);

      this.spritePlayer = new SpritePlayer();
      this.spritePlayer.body?.setTranslation(new Vector2(0, 5), true);
      this.spritePlayer.loop([0, 1, 2, 3], 0.15);
    });
  }

  public update() {
    this.box1?.update();
    this.box2?.update();
    this.sphere?.update();
    this.spritePlayer?.update();
  }

  public destroy() {
    // TODO
  }
}
