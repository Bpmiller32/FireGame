/* -------------------------------------------------------------------------- */
/*     Overall handler that mounts a webgl render to a dom canvas element     */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Sizes from "./utils/sizes";
import Time from "./utils/time";
import ResourceLoader from "./utils/resourceLoader";
import Camera from "./camera";
import Renderer from "./renderer";
import World from "./environment/world";
import Debug from "./utils/debug";
import Keyboard from "./utils/keyboard";
import Physics from "./environment/physics";

export default class Experience {
  // Class prop instance and "new" blocking constructor for Singleton
  private static instance: Experience;
  private constructor() {}

  // Definite assignment assertion to all props because of configure()....
  targetElement?: HTMLCanvasElement | null;

  debug?: Debug;
  sizes?: Sizes;
  time?: Time;

  scene?: THREE.Scene;
  camera?: Camera;
  renderer?: Renderer;
  keyboard?: Keyboard;
  physics2d?: Physics;
  world?: World;
  resources?: ResourceLoader;

  // Replacement public constructor
  async configure(canvas: HTMLCanvasElement | null) {
    // Setup
    this.debug = new Debug();
    this.targetElement = canvas;

    this.sizes = new Sizes();
    this.time = new Time();

    this.scene = new THREE.Scene();
    this.camera = new Camera();
    this.renderer = new Renderer();

    this.keyboard = new Keyboard();

    this.resources = new ResourceLoader([
      { name: "boat", type: "gltfModel", path: "/boat.glb" },
      { name: "mario", type: "texture", path: "/mario.png" },
    ]);
    this.physics2d = new Physics();
    await this.physics2d.configure();
    this.world = new World();

    // Sizes resize event
    this.sizes.on("resize", () => {
      this.resize();
    });

    // Time tick event
    this.time.on("tick", () => {
      this.update();
    });
  }

  // Singleton check/constructor
  static getInstance(): Experience {
    if (!Experience.instance) {
      Experience.instance = new Experience();
    }
    return Experience.instance;
  }

  resize() {
    this.camera?.resize();
    this.renderer?.resize();
  }
  update() {
    if (this.debug?.isActive) {
      this.debug?.stats?.begin();
    }

    this.camera?.update();
    this.physics2d?.update();
    this.world?.update();
    this.renderer?.update();

    if (this.debug?.isActive) {
      this.debug?.stats?.end();
    }
  }

  destroy() {
    // Event listeners
    this.sizes?.destroy();
    this.time?.destroy();

    // Scene items first
    this.world?.destroy();

    // Camera then renderer
    this.camera?.destroy();
    this.renderer?.destroy();

    // Debug menu
    if (this.debug?.isActive) {
      this.debug.destroy();
    }
  }
}
