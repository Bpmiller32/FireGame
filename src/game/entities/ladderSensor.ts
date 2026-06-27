import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObjectType from "../../engine/types/gameObjectType";
import GameSensor from "../../engine/entities/gameSensor";
import EntityType from "../types/entityType";

// LadderSensor - marks a ladder region. Detection is polled (not event-driven),
// so it defines no contact callbacks and arms no physics events.
export default class LadderSensor extends GameSensor {
  // Climb direction: positive = right, negative = left, 0 = neutral
  public Direction: number = 0;

  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0
  ) {
    super();

    // Cuboid sensor — this is a cuboid/sphere engine.
    this.createObjectPhysics(
      EntityType.LADDER_SENSOR,
      GameObjectType.CUBE,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.setAsSensor(true);
  }

  // Set the ladder direction value
  // Positive = right, Negative = left, 0 = neutral
  public SetLadderValue(value: number) {
    this.Direction = value;
  }
}
