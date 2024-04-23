/* -------------------------------------------------------------------------- */
/*                 The webgl renderer, its settings and events                */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import Sizes from "./utils/sizes";
import Camera from "./camera";

export default class Renderer {
  experience: Experience;
  canvas?: HTMLCanvasElement | null;
  sizes?: Sizes;
  scene?: THREE.Scene;
  camera?: Camera;
  instance?: THREE.WebGLRenderer;

  constructor() {
    this.experience = Experience.getInstance();

    this.canvas = this.experience.targetElement;
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.camera = this.experience.camera;

    this.setInstance();
    this.resize();
  }

  setInstance() {
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas!,
      antialias: true,
    });

    this.instance.setClearColor("#211d20");
    this.instance.setSize(this.sizes!.width, this.sizes!.height);
    this.instance.setPixelRatio(this.sizes!.pixelRatio);
  }

  resize() {
    this.instance?.setSize(this.sizes!.width, this.sizes!.height);
    this.instance?.setPixelRatio(this.sizes!.pixelRatio);
  }

  update() {
    this.instance?.render(this.scene!, this.camera?.instance!);
  }

  destroy() {
    this.instance?.dispose();
  }
}
