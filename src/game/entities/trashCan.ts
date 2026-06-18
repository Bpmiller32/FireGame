import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import CollisionGroups from "../types/gameCollisionGroups";
import EntityType from "../types/entityType";

export default class TrashCan extends GameObject {
  public IsOnFire: boolean;

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

    // this.createObjectGraphicsDebug("cyan");
    this.IsOnFire = false;

    this.setCollisionGroup(CollisionGroups.DEFAULT);
    this.setCollisionMask(CollisionGroups.DEFAULT);
  }
}
