/* -------------------------------------------------------------------------- */
/*                       Dat.Gui debug panel for ThreeJs                      */
/* -------------------------------------------------------------------------- */

import dat from "dat.gui";
import Stats from "stats.js";
import GameObject from "../world/gameComponents/gameObject";
import Experience from "../experience";

export default class Debug {
  public isActive: boolean;
  public ui?: dat.GUI;
  public stats?: Stats;

  // Debug logging flags
  public logCollisions: boolean = false;
  public logSensors: boolean = false;

  private experience?: Experience;

  constructor() {
    // this.isActive = window.location.hash === "#debug";
    this.isActive = true;

    if (this.isActive) {
      // Debug gui
      this.ui = new dat.GUI({ width: 300, hideable: false });

      // FPS counter
      this.stats = new Stats();
      this.stats.showPanel(0);

      // // CPU and memory counters
      // this.stats.addPanel(new Stats.Panel("CPU", "#ff8", "#221"));
      // this.stats.addPanel(new Stats.Panel("Memory", "#f08", "#201"));

      this.stats.dom.style.left = "";
      this.stats.dom.style.right = "315px";

      document.body.appendChild(this.stats.dom);

      // Add debug logging controls
      this.setupLoggingControls();
    }
  }

  /**
   * Set up logging control toggles in the debug panel
   */
  private setupLoggingControls() {
    if (!this.ui) return;

    const loggingFolder = this.ui.addFolder("Event Logging");
    loggingFolder.add(this, "logCollisions").name("Log Collisions");
    loggingFolder.add(this, "logSensors").name("Log Sensors");
    // loggingFolder.open();
  }

  /**
   * Log a collision event with colored console output and timestamp
   * @param obj1 - First GameObject in collision
   * @param obj2 - Second GameObject in collision
   * @param eventType - "enter" or "exit"
   */
  public logCollisionEvent(
    obj1: GameObject,
    obj2: GameObject,
    eventType: "enter" | "exit"
  ) {
    if (!this.logCollisions) return;

    const timestamp = this.getTimestamp();
    const color = eventType === "enter" ? "#00ff00" : "#ff6666";
    const symbol = eventType === "enter" ? "💥" : "↔️";

    console.log(
      `%c${symbol} [${timestamp}] COLLISION ${eventType.toUpperCase()}: %c${obj1.constructor.name} %c↔ %c${obj2.constructor.name}`,
      `color: ${color}; font-weight: bold;`,
      "color: #4fc3f7; font-weight: bold;",
      "color: #999;",
      "color: #ffb74d; font-weight: bold;"
    );
  }

  /**
   * Log a sensor event with colored console output and timestamp
   * @param obj1 - Sensor GameObject
   * @param obj2 - GameObject entering/exiting sensor
   * @param eventType - "enter" or "exit"
   */
  public logSensorEvent(
    obj1: GameObject,
    obj2: GameObject,
    eventType: "enter" | "exit"
  ) {
    if (!this.logSensors) return;

    const timestamp = this.getTimestamp();
    const color = eventType === "enter" ? "#00ddff" : "#ff88ff";
    const symbol = eventType === "enter" ? "📡" : "⚪";

    console.log(
      `%c${symbol} [${timestamp}] SENSOR ${eventType.toUpperCase()}: %c${obj1.constructor.name} %c↔ %c${obj2.constructor.name}`,
      `color: ${color}; font-weight: bold;`,
      "color: #9c27b0; font-weight: bold;",
      "color: #999;",
      "color: #4caf50; font-weight: bold;"
    );
  }

  /**
   * Get formatted timestamp for logging
   */
  private getTimestamp(): string {
    if (!this.experience) {
      // Try to get experience instance
      try {
        this.experience = Experience.getInstance();
      } catch (e) {
        return "0.00s";
      }
    }

    return `${this.experience.time.elapsed.toFixed(2)}s`;
  }

  public destroy() {
    this.ui?.destroy();
    this.stats?.dom.parentNode?.removeChild(this.stats.dom);
  }
}
