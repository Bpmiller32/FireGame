import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import CollisionGroups from "../types/gameCollisionGroups";

export default class TrashCan extends GameObject {
  public isOnFire: boolean;

  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number
  ) {
    super();

    this.createObjectPhysics(
      "TrashCan",
      GameObjectType.CUBE,
      size,
      position,
      rotation
    );

    // this.createObjectGraphicsDebug("cyan");
    this.isOnFire = false;

    this.setCollisionGroup(CollisionGroups.DEFAULT);
    this.setCollisionMask(CollisionGroups.DEFAULT);
  }
}
