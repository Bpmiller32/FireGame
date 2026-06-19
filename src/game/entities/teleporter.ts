import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObjectType from "../../engine/types/gameObjectType";
import GameSensor from "../../engine/entities/gameSensor";
import EntityType from "../types/entityType";

/**
 * Teleporter - Teleports objects to a destination when they enter.
 *
 * The "who triggers it and what happens" rule lives in the declarative contact
 * table (game/config/contactRules.ts): Player enters Teleporter -> teleport to
 * Destination. This class just owns the destination and the sensor.
 */
export default class Teleporter extends GameSensor {
  private positionData: RAPIER.Vector2;

  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0
  ) {
    super();

    this.createObjectPhysics(
      EntityType.TELEPORTER,
      GameObjectType.SPHERE,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.positionData = new RAPIER.Vector2(0, 0);

    this.setAsSensor(true);
    // Take part in the contact table even though we define no callback here.
    this.enableContactEvents();
    this.SetTeleportPosition(0, 0);

    this.createObjectGraphicsDebug("teal", 0.1);
  }

  public SetTeleportPosition(x: number, y: number) {
    this.positionData = new RAPIER.Vector2(x, y);
  }

  /** Where this teleporter sends whatever enters it. */
  public get Destination(): RAPIER.Vector2 {
    return this.positionData;
  }
}
