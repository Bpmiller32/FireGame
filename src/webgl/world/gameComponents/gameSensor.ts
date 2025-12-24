import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObject from "./gameObject";

/**
 * GameSensor - A sensor-based GameObject that detects other GameObjects
 * 
 * Sensors are non-solid colliders that detect when other objects enter/exit them.
 * Use the onSensorEnter() and onSensorExit() callbacks to respond to detections.
 * 
 * MODERN EVENT-DRIVEN VERSION:
 * - Override onSensorEnter(other: GameObject) to handle when objects enter
 * - Override onSensorExit(other: GameObject) to handle when objects exit
 * - No more manual polling needed!
 * 
 * Example:
 * ```typescript
 * export class MyCameraSensor extends GameSensor {
 *   public onSensorEnter(other: GameObject) {
 *     if (other instanceof Player) {
 *       console.log("Player entered camera zone!");
 *       // Do something with the camera
 *     }
 *   }
 * }
 * ```
 */
export default class GameSensor extends GameObject {
  constructor() {
    super();
  }

  /**
   * Set this GameObject's collider as a sensor
   * Sensors don't create solid collisions but still trigger collision events
   * 
   * @param value - true to make this a sensor, false to make it solid
   */
  protected setAsSensor(value: boolean) {
    if (!this.physicsBody) {
      return;
    }
    
    this.physicsBody.collider(0).setSensor(value);
    
    // Set active collision types so the sensor can detect kinematic and fixed objects
    this.physicsBody
      .collider(0)
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
  }

  /**
   * Helper: Check if a GameObject is fully inside this sensor's bounds
   * Useful for "must be completely inside" logic
   * 
   * @param other - The GameObject to check
   * @returns true if the GameObject is completely inside this sensor
   */
  public isFullyInside(other: GameObject): boolean {
    const sensorMinX = this.currentTranslation.x - this.currentSize.x / 2;
    const sensorMaxX = this.currentTranslation.x + this.currentSize.x / 2;

    const objectMinX = other.currentTranslation.x - other.currentSize.x / 2;
    const objectMaxX = other.currentTranslation.x + other.currentSize.x / 2;

    return objectMinX > sensorMinX && objectMaxX < sensorMaxX;
  }
}
