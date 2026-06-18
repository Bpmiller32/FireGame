import dat from "dat.gui";
import Stats from "stats.js";
import CameraDebug from "./CameraDebug";
import PhysicsDebug from "./PhysicsDebug";
import GameObject from "../entities/gameObject";

// Forward types to avoid circular imports — Camera/Physics all depend on
// Experience which depends on Debug. Sub-modules carry their own forward types.
type Camera = any;
type Physics = any;

/**
 * A debug panel/overlay the game can plug in. The engine only knows this tiny
 * shape — it never names a concrete game debug module. The game registers its
 * own modules (player readouts, etc.) from its App entry.
 *
 * - init(ui): build dat.GUI folders when the panel is ready
 * - update(): optional per-frame work (most modules don't need it)
 * - destroy(): optional teardown (remove listeners, etc.)
 */
export interface DebugModule {
  Init?(ui: dat.GUI): void;
  update?(): void;
  Destroy?(): void;
}

/**
 * A collision/sensor log sink the game can plug in. The engine Physics asks the
 * coordinator to log events; the coordinator forwards to whatever sink the game
 * registered (or no-ops if none). Keeps the engine free of game log formatting.
 */
export interface CollisionLogSink {
  LogCollisions: boolean;
  LogSensors: boolean;
  LogCollisionEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit"): void;
  LogSensorEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit"): void;
}

/**
 * Debug coordinator. Owns the dat.GUI panel and Stats.js monitor.
 * Delegates all domain-specific behavior to focused sub-modules.
 *
 * Engine-generic sub-modules (Camera/Physics) are wired in the engine. Game
 * sub-modules are registered by the game layer via registerModule() — the
 * coordinator never imports them, so the engine names zero game concepts.
 */
export default class Debug {
  public IsActive: boolean;
  public Ui?: dat.GUI;
  public Stats?: Stats;

  // Expose logger flags directly — Physics reads these to decide whether to log.
  // Delegates to the game-registered sink (false if none registered).
  public get LogCollisions() { return this.logSink?.LogCollisions ?? false; }
  public set LogCollisions(v: boolean) { if (this.logSink) this.logSink.LogCollisions = v; }
  public get LogSensors() { return this.logSink?.LogSensors ?? false; }
  public set LogSensors(v: boolean) { if (this.logSink) this.logSink.LogSensors = v; }

  private camera = new CameraDebug();
  private physics = new PhysicsDebug();

  // Game-registered modules and an optional game-registered collision log sink.
  private modules: DebugModule[] = [];
  private logSink?: CollisionLogSink;

  constructor() {
    // Enable debug mode with #debug in URL, or always on in dev builds
    this.IsActive = import.meta.env.DEV || window.location.hash === "#debug";

    if (this.IsActive) {
      this.initPanel();
      this.initStats();
    }
  }

  // ── Game module registration ────────────────────────────────────────────────

  /**
   * Register a game-provided debug module. If the panel is already active its
   * init() runs immediately; otherwise registration is a no-op-ish store.
   */
  public RegisterModule(module: DebugModule) {
    this.modules.push(module);
    if (this.IsActive && this.Ui && module.Init) {
      module.Init(this.Ui);
    }
  }

  /**
   * Register the game-provided collision/sensor log sink. Engine Physics routes
   * its log calls here; with no sink registered, logging is a no-op.
   */
  public RegisterCollisionLogSink(sink: CollisionLogSink) {
    this.logSink = sink;
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  public InitCameraDebug(camera: Camera) {
    this.camera.Init(this.Ui!, camera);
  }

  public UpdateCameraDebug(camera: Camera) {
    this.camera.Update(camera);
  }

  // ── Physics ───────────────────────────────────────────────────────────────

  public InitPhysicsDebug(physics: Physics) {
    this.physics.Init(this.Ui!, physics);
  }

  public UpdatePhysicsDebug(physics: Physics) {
    this.physics.Update(physics);
  }

  public DestroyPhysicsDebug() {
    this.physics.Destroy();
  }

  // ── Logging ───────────────────────────────────────────────────────────────

  public LogCollisionEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit") {
    this.logSink?.LogCollisionEvent(obj1, obj2, eventType);
  }

  public LogSensorEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit") {
    this.logSink?.LogSensorEvent(obj1, obj2, eventType);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  public Destroy() {
    this.Ui?.destroy();
    this.Stats?.dom.parentNode?.removeChild(this.Stats.dom);
    for (const module of this.modules) {
      module.Destroy?.();
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private initPanel() {
    this.Ui = new dat.GUI({ width: 300, hideable: false });
  }

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

    const hasMemory = !!(performance as any).memory;
    console.log("📊 Stats Monitor Active — FPS / MS" + (hasMemory ? " / MB" : " (no memory panel — Chrome flag required)"));
  }
}
