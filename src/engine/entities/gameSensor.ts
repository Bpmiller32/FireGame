import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObject from "./gameObject";

// GameSensor — a sensor (non-solid) GameObject that detects others entering/exiting.
// Override OnSensorEnter(other)/OnSensorExit(other) to respond. Some sensors are
// ALSO polled every frame (GameDirector's IsAnySensorTriggered* / IsFullyInside) —
// the D9 ladder "fully inside" climb path depends on that continuous polling, not
// on enter/exit events.
export default class GameSensor extends GameObject {
  // Set this GameObject's collider as a sensor
  // Sensors don't create solid collisions but still trigger collision events
  // value: true to make this a sensor, false to make it solid
  protected setAsSensor(value: boolean) {
    if (!this.PhysicsBody) {
      return;
    }
    
    this.PhysicsBody.collider(0).setSensor(value);
    
    // Set active collision types so the sensor can detect kinematic and fixed objects
    this.PhysicsBody
      .collider(0)
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
  }

  // True only if `other` is fully inside this sensor HORIZONTALLY (X axis only).
  // The ladder "fully inside" climb gate relies on this X-axis containment check.
  public IsFullyInside(other: GameObject): boolean {
    // X-axis AABB: object edges must fall within the sensor edges
    const sensorMinX = this.CurrentTranslation.x - this.CurrentSize.x / 2;
    const sensorMaxX = this.CurrentTranslation.x + this.CurrentSize.x / 2;

    const objectMinX = other.CurrentTranslation.x - other.CurrentSize.x / 2;
    const objectMaxX = other.CurrentTranslation.x + other.CurrentSize.x / 2;

    return objectMinX > sensorMinX && objectMaxX < sensorMaxX;
  }
}
