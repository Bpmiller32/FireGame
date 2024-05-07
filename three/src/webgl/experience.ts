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
import Input from "./utils/input";
import Physics from "./physics";

export default class Experience {
  // Class prop instance and "new" blocking constructor for Singleton
  private static instance: Experience;
  private constructor() {}

  public debug!: Debug;
  public sizes!: Sizes;
  public time!: Time;
  public input!: Input;
  public resources!: ResourceLoader;

  public targetElement!: HTMLCanvasElement | null;

  public scene!: THREE.Scene;
  public camera!: Camera;
  public renderer!: Renderer;
  public physics!: Physics;
  public world!: World;

  // Singleton check/constructor
  public static getInstance(): Experience {
    if (!Experience.instance) {
      Experience.instance = new Experience();
    }
    return Experience.instance;
  }

  // Replacement public constructor
  public async configure(canvas: HTMLCanvasElement | null) {
    this.debug = new Debug();
    this.sizes = new Sizes();
    this.time = new Time();
    this.input = new Input();
    this.resources = new ResourceLoader([
      { name: "boat", type: "gltfModel", path: "/boat.glb" },
      { name: "mario", type: "texture", path: "/mario.png" },
      { name: "test", type: "texture", path: "/testSheet.png" },
    ]);

    this.targetElement = canvas;

    this.scene = new THREE.Scene();
    this.camera = new Camera();
    this.renderer = new Renderer();
    this.physics = new Physics();
    await this.physics.configure();
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

  public resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  public update() {
    if (this.debug.isActive) {
      this.debug.stats?.begin();
    }

    this.camera.update();
    this.physics.update();
    this.world.update();
    this.renderer.update();

    if (this.debug.isActive) {
      this.debug.stats?.end();
    }
  }

  public destroy() {
    // Event listeners
    this.sizes.destroy();
    this.time.destroy();

    // Scene items first
    this.world.destroy();
    // this.physics.destroy();

    // Camera then renderer
    this.camera.destroy();
    this.renderer.destroy();

    // Debug menu
    if (this.debug.isActive) {
      this.debug.destroy();
    }
  }
}
