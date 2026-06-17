import dat from "dat.gui";
import Stats from "stats.js";
import CameraDebug from "./CameraDebug";
import PlayerDebug from "./PlayerDebug";
import PhysicsDebug from "./PhysicsDebug";
import CollisionLogger from "./CollisionLogger";
import GameObject from "../../world/gameComponents/gameObject";

// Forward types to avoid circular imports — Camera/Physics/Player all depend on
// Experience which depends on Debug. Sub-modules carry their own forward types.
type Camera = any;
type Physics = any;
type Player = any;

/**
 * Debug coordinator. Owns the dat.GUI panel and Stats.js monitor.
 * Delegates all domain-specific behavior to focused sub-modules.
 *
 * Public API is intentionally identical to the old monolithic Debug class
 * so no other files need to change.
 */
export default class Debug {
  public isActive: boolean;
  public ui?: dat.GUI;
  public stats?: Stats;

  // Expose logger flags directly — Physics reads these to decide whether to log
  public get logCollisions() { return this._logger.logCollisions; }
  public set logCollisions(v: boolean) { this._logger.logCollisions = v; }
  public get logSensors() { return this._logger.logSensors; }
  public set logSensors(v: boolean) { this._logger.logSensors = v; }

  private _camera = new CameraDebug();
  private _player = new PlayerDebug();
  private _physics = new PhysicsDebug();
  private _logger = new CollisionLogger();

  constructor() {
    // Enable debug mode with #debug in URL, or always on in dev builds
    this.isActive = import.meta.env.DEV || window.location.hash === "#debug";

    if (this.isActive) {
      this._initPanel();
      this._initStats();
    }
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  public initCameraDebug(camera: Camera) {
    this._camera.init(this.ui!, camera);
  }

  public updateCameraDebug(camera: Camera) {
    this._camera.update(camera);
  }

  // ── Player ────────────────────────────────────────────────────────────────

  public initPlayerDebug(player: Player) {
    this._player.init(this.ui!, player);
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
    this._logger.logCollisionEvent(obj1, obj2, eventType);
  }

  public logSensorEvent(obj1: GameObject, obj2: GameObject, eventType: "enter" | "exit") {
    this._logger.logSensorEvent(obj1, obj2, eventType);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  public destroy() {
    this.ui?.destroy();
    this.stats?.dom.parentNode?.removeChild(this.stats.dom);
    this._player.destroy();
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
