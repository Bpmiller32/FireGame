import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObjectType from "../../engine/types/gameObjectType";
import GameSensor from "../../engine/entities/gameSensor";
import EntityType from "../types/entityType";

// LadderSensor - marks a ladder region.
// Ladder detection is intentionally NOT event-driven: it is the hard-won
// "fully inside" climb behavior (D9), polled by GameDirector / read by the
// player + enemy. That path is preserved and deferred — this sensor defines no
// contact callbacks, so it arms no physics events.
export default class LadderSensor extends GameSensor {
  // Climb direction: positive = right, negative = left, 0 = neutral
  public Direction: number = 0;

  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0
  ) {
    super();

    // Cuboid sensor — this is a cuboid/sphere engine. (Ladders were always boxes
    // anyway; the polyline path was never reached.)
    this.createObjectPhysics(
      EntityType.LADDER_SENSOR,
      GameObjectType.CUBE,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.setAsSensor(true);

    // Uncomment to visualize ladder sensors in debug mode
    // this.createObjectGraphicsDebug("blue", 0.5);
  }

  // Set the ladder direction value
  // Positive = right, Negative = left, 0 = neutral
  public SetLadderValue(value: number) {
    this.Direction = value;
  }
}
