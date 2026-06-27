import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObject from "./gameObject";

// GameSensor — non-solid GameObject that detects others entering/exiting.
// Override OnSensorEnter/OnSensorExit to respond. Some sensors are also polled
// every frame (IsFullyInside); the D9 ladder climb depends on that polling, not enter/exit events.
export default class GameSensor extends GameObject {
  // Make this collider a sensor: no solid collision, but still fires collision events.
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
