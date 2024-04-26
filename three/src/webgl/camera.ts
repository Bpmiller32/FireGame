/* -------------------------------------------------------------------------- */
/*             The camera and camera controls for the webgl scene             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import { OrbitControls } from "three/examples/jsm/Addons.js";

export default class Camera {
  // Setup
  private experience = Experience.getInstance();
  private sizes = this.experience.sizes;
  private scene = this.experience.scene;
  private canvas = this.experience.targetElement;

  // Constructor setup
  public instance?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;

  constructor() {
    this.setInstance();
    this.setOrbitControls();
  }

  private setInstance() {
    this.instance = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      500
    );

    this.instance.position.set(0, 5, 12);
    this.scene?.add(this.instance);
  }

  private setOrbitControls() {
    this.controls = new OrbitControls(this.instance!, this.canvas!);
    this.controls.enableDamping = true;
  }

  public resize() {
    this.instance!.aspect = this.sizes.width / this.sizes.height;
    this.instance!.updateProjectionMatrix();
  }

  public update() {
    this.controls?.update();
  }

  public destroy() {
    this.controls?.dispose();
  }
}
