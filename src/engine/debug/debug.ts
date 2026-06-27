import * as THREE from "three";
import dat from "dat.gui";
import Stats from "stats.js";
import CameraDebug from "./cameraDebug";
import PhysicsDebug from "./physicsDebug";
import GameObject from "../entities/gameObject";

// Forward types to avoid circular imports — Camera/Physics all depend on
// Experience which depends on Debug. Sub-modules carry their own forward types.
type Camera = any;
type Physics = any;

// A debug panel/overlay the game plugs in; engine knows only this shape, never a concrete module.
// Init(ui): build dat.GUI folders when ready. Destroy(): optional teardown.
export interface DebugModule {
  Init?(ui: dat.GUI): void;
  Destroy?(): void;
}

// A collision/sensor log sink the game plugs in; Physics forwards log events here, no-op if none registered.
export interface CollisionLogSink {
  LogCollisions: boolean;
  LogSensors: boolean;
  LogCollisionEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit"): void;
  LogSensorEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit"): void;
}

// Debug coordinator: owns the dat.GUI panel + Stats.js monitor, delegates to focused sub-modules.
// Camera/Physics wired in-engine; game sub-modules register via RegisterModule() so engine names no game concepts.
export default class Debug {
  public IsActive: boolean;
  public Ui?: dat.GUI;
  public Stats?: Stats;

  // Expose logger flags directly — Physics reads these to decide whether to log.
  // Delegates to the game-registered sink (false if none registered).
  public get LogCollisions() {
    if (this.logSink) return this.logSink.LogCollisions;
    return false;
  }
  public set LogCollisions(v: boolean) { if (this.logSink) this.logSink.LogCollisions = v; }
  public get LogSensors() {
    if (this.logSink) return this.logSink.LogSensors;
    return false;
  }
  public set LogSensors(v: boolean) { if (this.logSink) this.logSink.LogSensors = v; }

  private camera = new CameraDebug();
  private physics = new PhysicsDebug();

  // Game-registered modules and an optional game-registered collision log sink.
  private modules: DebugModule[] = [];
  private logSink?: CollisionLogSink;

  // --- Setup ---

  constructor() {
    // Enable debug mode with #debug in URL, or always on in dev builds
    this.IsActive = import.meta.env.DEV || window.location.hash === "#debug";

    if (this.IsActive) {
      this.initPanel();
      this.initStats();
    }
  }

  // --- Commands ---

  // --- Game module registration ---

  // Register a game-provided debug module; runs Init() now if the panel is already active, else just stores it.
  public RegisterModule(module: DebugModule) {
    this.modules.push(module);
    if (this.IsActive && this.Ui && module.Init) {
      module.Init(this.Ui);
    }
  }

  // Register the game's collision/sensor log sink; Physics routes log calls here, no-op if none registered.
  public RegisterCollisionLogSink(sink: CollisionLogSink) {
    this.logSink = sink;
  }

  // --- Camera ---

  // Wire camera debug controls into the GUI panel
  public InitCameraDebug(camera: Camera) {
    this.camera.Init(this.Ui!, camera);
  }

  // Refresh camera debug readouts each frame
  public UpdateCameraDebug(camera: Camera) {
    this.camera.Update(camera);
  }

  // --- Physics ---

  // Wire physics debug controls into the GUI panel
  public InitPhysicsDebug(physics: Physics) {
    this.physics.Init(this.Ui!, physics);
  }

  // Refresh physics wireframes/readouts each frame
  public UpdatePhysicsDebug(physics: Physics) {
    this.physics.Update(physics);
  }

  // Tear down the physics debug wireframes
  public DestroyPhysicsDebug() {
    this.physics.Destroy();
  }

  // Inject the game's wireframe palette (entity-type -> color); engine forwards it opaquely to PhysicsDebug.
  // Safe to call when inactive — PhysicsDebug only reads it while rendering, which only runs when active.
  public SetPhysicsTypeColors(colors: Map<string, THREE.Color>) {
    this.physics.SetTypeColors(colors);
  }

  // --- Logging ---

  // Forward a collision log event to the game sink
  public LogCollisionEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit") {
    this.logSink?.LogCollisionEvent(obj1, obj2, eventType);
  }

  // Forward a sensor log event to the game sink
  public LogSensorEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit") {
    this.logSink?.LogSensorEvent(obj1, obj2, eventType);
  }

  // --- Private ---

  // Build the dat.GUI control panel
  private initPanel() {
    this.Ui = new dat.GUI({ width: 300, hideable: false });
  }

  // Build and mount the Stats.js FPS/MS monitor
  private initStats() {
    this.Stats = new Stats();
    this.Stats.dom.style.cssText =
      "position:fixed;top:0;right:315px;cursor:pointer;opacity:0.9;z-index:10000";

    const panels = this.Stats.dom.children;
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i] as HTMLElement;
      panel.style.display = "block";
      panel.style.position = "relative";
    }

    document.body.appendChild(this.Stats.dom);

    // Memory panel only exists behind a Chrome flag
    const hasMemory = (performance as any).memory !== undefined;
    let suffix = " (no memory panel — Chrome flag required)";
    if (hasMemory) suffix = " / MB";
    console.log("📊 Stats Monitor Active — FPS / MS" + suffix);
  }

  // --- Teardown ---

  // Tear down panel, stats monitor, and registered modules
  public Destroy() {
    this.Ui?.destroy();
    this.Stats?.dom.parentNode?.removeChild(this.Stats.dom);
    for (const module of this.modules) {
      module.Destroy?.();
    }
  }
}
