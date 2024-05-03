/* -------------------------------------------------------------------------- */
/*             The camera and camera controls for the webgl scene             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Sizes from "./utils/sizes";

export default class Camera {
  private experience: Experience;
  private sizes: Sizes;
  private scene: THREE.Scene;
  private canvas: HTMLCanvasElement;

  public instance!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;

  constructor() {
    this.experience = Experience.getInstance();
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.canvas = this.experience.targetElement as HTMLCanvasElement;

    this.setInstance();
    // this.setOrbitControls();
  }

  private setInstance() {
    this.instance = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      500
    );

    this.instance.position.set(0, 5, 30);
    this.scene.add(this.instance);
  }

  private setOrbitControls() {
    this.controls = new OrbitControls(this.instance, this.canvas);
    this.controls.enableDamping = true;
  }

  public resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  public update() {
    this.controls?.update();
  }

  public destroy() {
    this.controls?.dispose();
  }
}
