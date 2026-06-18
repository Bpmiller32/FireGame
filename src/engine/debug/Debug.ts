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
  init?(ui: dat.GUI): void;
  update?(): void;
  destroy?(): void;
}

/**
 * A collision/sensor log sink the game can plug in. The engine Physics asks the
 * coordinator to log events; the coordinator forwards to whatever sink the game
 * registered (or no-ops if none). Keeps the engine free of game log formatting.
 */
export interface CollisionLogSink {
  logCollisions: boolean;
  logSensors: boolean;
  logCollisionEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit"): void;
  logSensorEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit"): void;
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
  public isActive: boolean;
  public ui?: dat.GUI;
  public stats?: Stats;

  // Expose logger flags directly — Physics reads these to decide whether to log.
  // Delegates to the game-registered sink (false if none registered).
  public get logCollisions() { return this._logSink?.logCollisions ?? false; }
  public set logCollisions(v: boolean) { if (this._logSink) this._logSink.logCollisions = v; }
  public get logSensors() { return this._logSink?.logSensors ?? false; }
  public set logSensors(v: boolean) { if (this._logSink) this._logSink.logSensors = v; }

  private _camera = new CameraDebug();
  private _physics = new PhysicsDebug();

  // Game-registered modules and an optional game-registered collision log sink.
  private _modules: DebugModule[] = [];
  private _logSink?: CollisionLogSink;

  constructor() {
    // Enable debug mode with #debug in URL, or always on in dev builds
    this.isActive = import.meta.env.DEV || window.location.hash === "#debug";

    if (this.isActive) {
      this._initPanel();
      this._initStats();
    }
  }

  // ── Game module registration ────────────────────────────────────────────────

  /**
   * Register a game-provided debug module. If the panel is already active its
   * init() runs immediately; otherwise registration is a no-op-ish store.
   */
  public registerModule(module: DebugModule) {
    this._modules.push(module);
    if (this.isActive && this.ui && module.init) {
      module.init(this.ui);
    }
  }

  /**
   * Register the game-provided collision/sensor log sink. Engine Physics routes
   * its log calls here; with no sink registered, logging is a no-op.
   */
  public registerCollisionLogSink(sink: CollisionLogSink) {
    this._logSink = sink;
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  public initCameraDebug(camera: Camera) {
    this._camera.init(this.ui!, camera);
  }

  public updateCameraDebug(camera: Camera) {
    this._camera.update(camera);
  }

  // ── Physics ───────────────────────────────────────────────────────────────

  public initPhysicsDebug(physics: Physics) {
    this._physics.init(this.ui!, physics);
  }

  public updatePhysicsDebug(physics: Physics) {
    this._physics.update(physics);
  }

  // ── Logging ───────────────────────────────────────────────────────────────

  public logCollisionEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit") {
    this._logSink?.logCollisionEvent(obj1, obj2, eventType);
  }

  public logSensorEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit") {
    this._logSink?.logSensorEvent(obj1, obj2, eventType);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  public destroy() {
    this.ui?.destroy();
    this.stats?.dom.parentNode?.removeChild(this.stats.dom);
    for (const module of this._modules) {
      module.destroy?.();
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _initPanel() {
    this.ui = new dat.GUI({ width: 300, hideable: false });
  }

  private _initStats() {
    this.stats = new Stats();
    this.stats.dom.style.cssText =
      "position:fixed;top:0;right:315px;cursor:pointer;opacity:0.9;z-index:10000";

    const panels = this.stats.dom.children;
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i] as HTMLElement;
      panel.style.display = "block";
      panel.style.position = "relative";
    }

    document.body.appendChild(this.stats.dom);

    const hasMemory = !!(performance as any).memory;
    console.log("📊 Stats Monitor Active — FPS / MS" + (hasMemory ? " / MB" : " (no memory panel — Chrome flag required)"));
  }
}
