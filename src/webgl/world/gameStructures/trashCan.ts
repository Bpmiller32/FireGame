import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";
import CollisionGroups from "../../utils/types/collisionGroups";

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

    this.createObjectGraphicsDebug("cyan");
    this.isOnFire = false;

    this.setCollisionGroup(CollisionGroups.DEFAULT);
    this.setCollisionMask(CollisionGroups.DEFAULT);
  }
}
