import * as THREE from "three";
import Cube from "../gameComponents/cube";
import Player from "../player/player";
import GameUtils from "../../utils/gameUtils";
import CollisionGroups from "../../utils/types/collisionGroups";

export default class Platform extends Cube {
  private isOneWayPlatform: boolean;

  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number,
    isOneWayPlatform: boolean = false,
    drawGraphics?: boolean
  ) {
    super(
      "Platform",
      size,
      position,
      rotation,
      new THREE.MeshBasicMaterial({ color: "red" }),
      undefined,
      drawGraphics
    );

    this.isOneWayPlatform = isOneWayPlatform;

    GameUtils.setCollisionGroup(
      this.physicsBody.collider(0),
      CollisionGroups.PLATFORM
    );

    if (isOneWayPlatform) {
      GameUtils.getDataFromPhysicsBody(this.physicsBody).name =
        "OneWayPlatform";
    }
  }

  public setOneWayPlatform(value: boolean) {
    GameUtils.getDataFromPhysicsBody(this.physicsBody).isOneWayPlatformActive =
      value;
  }

  public updateOneWayPlatform(player: Player) {
    if (
      player &&
      this.isOneWayPlatform &&
      player.currentTranslation.y - player.initalSize.y / 2 >
        this.currentTranslation.y
    ) {
      GameUtils.getDataFromPhysicsBody(
        this.physicsBody
      ).isOneWayPlatformActive = false;
    } else {
      GameUtils.getDataFromPhysicsBody(
        this.physicsBody
      ).isOneWayPlatformActive = true;
    }
  }
}
