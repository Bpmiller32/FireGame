import Experience from "../../engine/core/experience";
import GameObject from "../../engine/entities/gameObject";
import { CollisionLogSink } from "../../engine/debug/debug";

// Logs collision/sensor events to the console with colored output; toggled by LogCollisions/LogSensors.
// Registered with the engine Debug coordinator as a CollisionLogSink; engine Physics routes events here.
export default class CollisionLogger implements CollisionLogSink {
  public LogCollisions = false;
  public LogSensors = false;

  private experience?: Experience;

  // --- Commands ---

  // Print a colored collision enter/exit line to the console.
  public LogCollisionEvent(
    obj1: GameObject,
    obj2: GameObject,
    eventType: "enter" | "exit"
  ) {
    if (!this.LogCollisions) return;

    const timestamp = this.getTimestamp();
    let color = "#ff6666";
    if (eventType === "enter") color = "#00ff00";
    let symbol = "↔️";
    if (eventType === "enter") symbol = "💥";

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

  // Print a colored sensor enter/exit line to the console.
  public LogSensorEvent(
    obj1: GameObject,
    obj2: GameObject,
    eventType: "enter" | "exit"
  ) {
    if (!this.LogSensors) return;

    const timestamp = this.getTimestamp();
    let color = "#ff88ff";
    if (eventType === "enter") color = "#00ddff";
    let symbol = "⚪";
    if (eventType === "enter") symbol = "📡";

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

  // --- Per-frame ---

  // Elapsed-time stamp from the engine clock, lazily resolved.
  private getTimestamp(): string {
    if (!this.experience) {
      try {
        this.experience = Experience.GetInstance();
      } catch {
        return "0.00s";
      }
    }
    return `${this.experience.Time.Elapsed.toFixed(2)}s`;
  }
}
