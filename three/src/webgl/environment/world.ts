/* -------------------------------------------------------------------------- */
/*         The "World" in which all resources for the webgl scene live        */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader";
import Player from "./player";
import Floor from "./floor";

export default class World {
  experience: Experience;
  scene?: THREE.Scene;
  resources?: ResourceLoader;
  player?: Player;
  player2?: Player;
  floor?: Floor;

  constructor() {
    this.experience = Experience.getInstance();
    this.resources = this.experience.resources;

    this.scene = this.experience.scene;

    // Resources
    this.resources?.on("ready", () => {
      this.floor = new Floor();

      this.player = new Player();
      this.player.body!.position.y += 3;
      this.player.isInteractive = true;

      this.player2 = new Player();
      this.player2.isInteractive = false;
      this.player2.body!.position.x += 3;
      this.player2.body!.position.y += 3;
    });
  }

  update() {
    this.player?.update();
    this.player2?.update();
  }

  destroy() {}
}
