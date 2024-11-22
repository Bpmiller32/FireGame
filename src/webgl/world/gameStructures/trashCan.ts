import * as THREE from "three";
import GameUtils from "../../utils/gameUtils";
import CollisionGroups from "../../utils/types/collisionGroups";
import GameObject from "../gameComponents/gameObject";

export default class Platform extends GameObject {
  public isOnFire: boolean;

  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number,
    isOneWayPlatform: boolean = false,
    drawGraphics?: boolean
  ) {
    super();

    this.isOnFire = false;

    GameUtils.setCollisionGroup(
      this.physicsBody.collider(0),
      CollisionGroups.PLATFORM
    );

    if (isOneWayPlatform) {
      GameUtils.getDataFromPhysicsBody(this.physicsBody).name =
        "OneWayPlatform";
    }
  }
}
