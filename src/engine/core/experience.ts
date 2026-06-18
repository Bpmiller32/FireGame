/* -------------------------------------------------------------------------- */
/*     Overall handler that mounts a webgl render to a dom canvas element     */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Emitter from "../events/eventBus";
import Sizes from "./sizes";
import Time from "./time";
import ResourceLoader from "../resources/resourceLoader";
import Camera from "../camera/camera";
import Renderer from "../rendering/renderer";
import Debug from "../debug";
import Input from "../input/input";
import Physics from "../physics/physics";

export default class Experience {
  // Class prop instance and "new" blocking constructor for Singleton
  private static instance: Experience;
  private constructor() {}

  public Debug!: Debug;
  public Sizes!: Sizes;
  public Time!: Time;
  public Input!: Input;
  public Resources!: ResourceLoader;

  public TargetElement!: HTMLCanvasElement | null;

  public Scene!: THREE.Scene;
  public Camera!: Camera;
  public Renderer!: Renderer;
  public Physics!: Physics;

  // Late-bound game update hook. The game layer assigns this; the engine just
  // calls it each frame between physics and renderer. Keeps the engine core
  // from naming any game class.
  public OnGameUpdate: (() => void) | null = null;

  // Stored event handler references for cleanup
  private onResize!: () => void;
  private onTick!: () => void;

  // Singleton check/constructor
  public static GetInstance(): Experience {
    if (!Experience.instance) {
      Experience.instance = new Experience();
    }
    return Experience.instance;
  }

  // Replacement public constructor
  public async Configure(canvas: HTMLCanvasElement | null) {
    this.Debug = new Debug();
    this.Sizes = new Sizes();
    this.Time = new Time();
    this.Input = new Input();
    this.Resources = new ResourceLoader([
      { name: "randy", type: "texture", path: "/assets/textures/randySpriteSheet.png" },
      { name: "enemy", type: "gltfModel", path: "/assets/models/enemy.glb" },
      {
        name: "dkGraphicsData",
        type: "gltfModel",
        path: "/assets/models/dkGraphicsData.glb",
      },
    ]);

    this.TargetElement = canvas;

    this.Scene = new THREE.Scene();
    this.Camera = new Camera(new THREE.Vector3(0, 25, 100));
    this.Renderer = new Renderer();
    this.Physics = new Physics();
    await this.Physics.Configure();

    // Sizes resize event — store ref for cleanup
    this.onResize = () => {
      this.Camera.Resize();
      this.Renderer.Resize();
    };
    Emitter.on("resize", this.onResize);

    // Time tick event — store ref for cleanup
    this.onTick = () => {
      if (this.Debug.IsActive) {
        this.Debug.Stats?.begin();
      }

      this.Physics.Update();
      this.OnGameUpdate?.();
      this.Renderer.Update();

      if (this.Debug.IsActive) {
        this.Debug.Stats?.end();
      }
    };
    Emitter.on("tick", this.onTick);
  }

  public Destroy() {
    // Remove our own event listeners first
    Emitter.off("resize", this.onResize);
    Emitter.off("tick", this.onTick);

    // Clear subsystem event listeners
    this.Sizes.Destroy();
    this.Time.Destroy();
    this.Input.Destroy();

    // Camera then physics then renderer then resources
    this.Camera.Destroy();
    this.Physics.Destroy();
    this.Renderer.Destroy();
    this.Resources.Destroy();

    // Debug menu
    if (this.Debug && this.Debug.IsActive) {
      this.Debug.Destroy();
    }
  }
}
