import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import CollisionGroups from "../types/gameCollisionGroups";
import EntityType from "../types/entityType";

// TrashCan — the oil can; ignites when an enemy falls in.
export default class TrashCan extends GameObject {
  public IsOnFire: boolean; // true once an enemy fell in and lit it

  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number
  ) {
    super();

    this.createObjectPhysics(
      EntityType.TRASH_CAN,
      GameObjectType.CUBE,
      size,
      position,
      rotation
    );

    this.IsOnFire = false;

    // Collide with the default world so enemies can fall in.
    this.setCollisionGroup(CollisionGroups.DEFAULT);
    this.setCollisionMask(CollisionGroups.DEFAULT);

    // Arm our collider for the contact table (Enemy + TrashCan -> ignite); don't rely
    // on the enemy's auto-armed collider to cover us.
    this.enableContactEvents();
  }
}
