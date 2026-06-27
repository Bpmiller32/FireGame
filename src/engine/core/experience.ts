// Overall handler that mounts a webgl render to a dom canvas element

import * as THREE from "three";
import Emitter from "../events/eventBus";
import Sizes from "./sizes";
import Time from "./time";
import ResourceLoader, { Resource } from "../resources/resourceLoader";
import Camera from "../camera/camera";
import Renderer from "../rendering/renderer";
import Debug from "../debug/debug";
import Input from "../input/input";
import Physics from "../physics/physics";

export default class Experience {
  // Singleton instance + private constructor. Nullable so Destroy() can clear it
  // and a fresh GetInstance()/Configure() works (HMR/tests/restart).
  private static instance: Experience | undefined;
  private constructor() {}

  // engine subsystems, instantiated in Configure()
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

  // Late-bound game update hook, called each sim step between physics and render.
  public OnGameUpdate: (() => void) | null = null;

  // Late-bound per-frame render hook, called once after the sim loop with the
  // interpolation alpha (accumulator / fixed step) in [0,1).
  public OnRenderUpdate: ((alpha: number) => void) | null = null;

  // Stored event handler references for cleanup
  private onResize!: () => void;
  private onTick!: () => void;

  // Fixed-timestep accumulator state (see onTick): carries leftover real time
  // between frames; maxStepsPerFrame caps catch-up so a long stall can't freeze.
  private accumulator = 0;
  private maxStepsPerFrame = 5;

  // Guards a double Configure() (HMR / restart) from overwriting live subsystems.
  private isConfigured = false;

  // --- Setup ---

  // Singleton check/constructor
  public static GetInstance(): Experience {
    if (!Experience.instance) {
      Experience.instance = new Experience();
    }
    return Experience.instance;
  }

  // Replacement public constructor. The game supplies its own asset manifest, so
  // the engine names none of the game's assets (reusability mile, #5).
  public async Configure(
    canvas: HTMLCanvasElement | null,
    resources: Resource[]
  ) {
    // Idempotent: a second Configure() (HMR / restart) is ignored rather than
    // overwriting live subsystems and leaking the previous world. Destroy first.
    if (this.isConfigured) {
      console.warn("Experience.Configure() ignored — already configured. Call Destroy() first.");
      return;
    }
    this.isConfigured = true;

    this.Debug = new Debug();
    this.Sizes = new Sizes();
    this.Time = new Time();
    this.Input = new Input();
    this.Resources = new ResourceLoader(resources);

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

      // Fixed-timestep sim: advance physics + game in constant FixedTimestep steps
      // so movement is frame-rate-independent. FrameDelta is clamped in Time;
      // maxStepsPerFrame is a final catch-up safety net.
      this.accumulator += this.Time.FrameDelta;
      const dt = Time.FixedTimestep;
      let steps = 0;
      while (this.accumulator >= dt && steps < this.maxStepsPerFrame) {
        this.Time.Delta = dt; // integrators read this as their timestep
        this.Physics.Update();
        this.OnGameUpdate?.();
        this.accumulator -= dt;
        steps++;
      }

      // Render once per frame, interpolated between the last two sim states by
      // alpha in [0,1). Render and sim rates are decoupled.
      const alpha = this.accumulator / dt;
      this.OnRenderUpdate?.(alpha);
      this.Renderer.Update();

      if (this.Debug.IsActive) {
        this.Debug.Stats?.end();
      }
    };
    Emitter.on("tick", this.onTick);
  }

  // --- Teardown ---

  public Destroy() {
    // Remove our own event listeners first
    Emitter.off("resize", this.onResize);
    Emitter.off("tick", this.onTick);

    // Optional chaining so Destroy after a partially-failed Configure tears down
    // whatever exists instead of throwing on the first missing subsystem.
    this.Sizes?.Destroy();
    this.Time?.Destroy();
    this.Input?.Destroy();

    // Camera then physics then renderer then resources
    this.Camera?.Destroy();
    this.Physics?.Destroy();
    this.Renderer?.Destroy();
    this.Resources?.Destroy();

    // Debug menu
    if (this.Debug && this.Debug.IsActive) {
      this.Debug.Destroy();
    }

    // Allow a fresh GetInstance()/Configure() after teardown (HMR, tests, restart).
    this.isConfigured = false;
    Experience.instance = undefined;
  }
}
