import Experience from "../../experience";
import GameObject from "../../world/gameComponents/gameObject";

/**
 * Logs collision and sensor events to the console with colored output.
 * Controlled by the logCollisions and logSensors flags on the Debug coordinator.
 */
export default class CollisionLogger {
  public logCollisions = false;
  public logSensors = false;

  private experience?: Experience;

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
      `%c${symbol} [${timestamp}] COLLISION ${eventType.toUpperCase()}: %c${
        obj1.constructor.name
      } %c↔ %c${obj2.constructor.name}`,
      `color: ${color}; font-weight: bold;`,
      "color: #4fc3f7; font-weight: bold;",
      "color: #999;",
      "color: #ffb74d; font-weight: bold;"
    );
  }

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
      `%c${symbol} [${timestamp}] SENSOR ${eventType.toUpperCase()}: %c${
        obj1.constructor.name
      } %c↔ %c${obj2.constructor.name}`,
      `color: ${color}; font-weight: bold;`,
      "color: #9c27b0; font-weight: bold;",
      "color: #999;",
      "color: #4caf50; font-weight: bold;"
    );
  }

  private getTimestamp(): string {
    if (!this.experience) {
      try {
        this.experience = Experience.getInstance();
      } catch {
        return "0.00s";
      }
    }
    return `${this.experience.time.elapsed.toFixed(2)}s`;
  }
}
