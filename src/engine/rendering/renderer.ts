// The webgl renderer, its settings and events

import * as THREE from "three";
import Experience from "../core/experience";
import Sizes from "../core/sizes";
import Camera from "../camera/camera";

export default class Renderer {
  private experience: Experience;
  private canvas: HTMLElement;
  private sizes: Sizes;
  private scene: THREE.Scene;
  private camera: Camera;

  private Instance!: THREE.WebGLRenderer; // the raw THREE WebGL renderer

  // --- Setup ---

  constructor() {
    this.experience = Experience.GetInstance();
    this.canvas = this.experience.TargetElement as HTMLElement;
    this.sizes = this.experience.Sizes;
    this.scene = this.experience.Scene;
    this.camera = this.experience.Camera;

    this.setInstance();
    this.Resize();
  }

  // build and configure the WebGL renderer
  private setInstance() {
    this.Instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      // must stay off for pixel art — antialiasing blurs the edges
      antialias: false,
    });

    this.Instance.setClearColor("#211d20");
    this.Instance.setSize(this.sizes.Width, this.sizes.Height);
    this.Instance.setPixelRatio(this.sizes.PixelRatio);
  }

  // --- Commands ---

  // resize renderer to the current window size
  public Resize() {
    this.Instance?.setSize(this.sizes.Width, this.sizes.Height);
    this.Instance?.setPixelRatio(this.sizes.PixelRatio);
  }

  // --- Per-frame ---

  // render the scene through the active camera
  public Update() {
    this.Instance?.render(this.scene, this.camera.Instance);
  }

  // --- Teardown ---

  public Destroy() {
    // Dispose of the WebGL renderer
    this.Instance.dispose();
  }
}
