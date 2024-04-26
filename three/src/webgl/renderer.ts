/* -------------------------------------------------------------------------- */
/*                 The webgl renderer, its settings and events                */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";

export default class Renderer {
  // Setup
  private experience = Experience.getInstance();
  private canvas = this.experience.targetElement;
  private sizes = this.experience.sizes;
  private scene = this.experience.scene;
  private camera = this.experience.camera;

  // Constructor setup
  public instance?: THREE.WebGLRenderer;

  constructor() {
    this.setInstance();
    this.resize();
  }

  private setInstance() {
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas!,
      antialias: true,
    });

    this.instance.setClearColor("#211d20");
    this.instance.setSize(this.sizes!.width, this.sizes!.height);
    this.instance.setPixelRatio(this.sizes!.pixelRatio);
  }

  public resize() {
    this.instance?.setSize(this.sizes!.width, this.sizes!.height);
    this.instance?.setPixelRatio(this.sizes!.pixelRatio);
  }

  public update() {
    this.instance?.render(this.scene!, this.camera?.instance!);
  }

  public destroy() {
    this.instance?.dispose();
  }
}
