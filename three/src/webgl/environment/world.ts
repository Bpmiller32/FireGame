/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader";
import Box from "./box";
import Floor from "./floor";
import Sphere from "./sphere";
import { Vector2 } from "@dimforge/rapier2d";
import Player from "./player";
import SpritePlayer from "./SpritePlayer";

export default class World {
  experience: Experience;
  scene?: THREE.Scene;
  resources?: ResourceLoader;

  floor?: Floor;
  box1?: Box;
  box2?: Box;
  sphere?: Sphere;
  player?: Player;
  spritePlayer?: SpritePlayer;

  constructor() {
    this.experience = Experience.getInstance();
    this.resources = this.experience.resources;

    this.scene = this.experience.scene;

    // Resources
    this.resources?.on("ready", () => {
      this.floor = new Floor();

      this.box1 = new Box();
      this.box1.body?.setTranslation(new Vector2(7, 3), true);

      this.box2 = new Box();
      this.box2.body?.setTranslation(new Vector2(3, 3), true);

      this.sphere = new Sphere();
      this.sphere.body?.setTranslation(new Vector2(5, 2), true);

      // this.player = new Player();
      // this.player.body?.setTranslation(new Vector2(0, 5), true);

      this.spritePlayer = new SpritePlayer();
      this.spritePlayer.body?.setTranslation(new Vector2(0, 5), true);
      this.spritePlayer.loop([0, 1, 2, 3], 0.15);
    });
  }

  update() {
    this.box1?.update();
    this.box2?.update();
    this.sphere?.update();
    this.player?.update();
    this.spritePlayer?.update();
  }

  destroy() {}
}
