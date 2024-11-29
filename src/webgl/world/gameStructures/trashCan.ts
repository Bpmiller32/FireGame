import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";

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

    this.createObjectGraphicsDebug("purple");

    this.isOnFire = false;
  }
}
