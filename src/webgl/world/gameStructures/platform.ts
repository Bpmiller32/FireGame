import * as THREE from "three";
import Cube from "../gameEntities/cube";
import Player from "../player/player";
import GameUtils from "../../utils/gameUtils";

export default class Platform extends Cube {
  public isOneWayPlatform: boolean;

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
      drawGraphics,
      new THREE.MeshBasicMaterial({ color: "red" })
    );

    this.isOneWayPlatform = isOneWayPlatform;

    if (isOneWayPlatform) {
      GameUtils.getPhysicsBodyData(this.physicsBody).name = "OneWayPlatform";
    }
  }

  public setOneWayPlatform(value: boolean) {
    GameUtils.getPhysicsBodyData(this.physicsBody).isOneWayPlatformActive =
      value;
  }

  public updateOneWayPlatform(player: Player) {
    if (
      player &&
      this.isOneWayPlatform &&
      player.currentTranslation.y - player.initalSize.y / 2 >
        this.currentTranslation.y
    ) {
      GameUtils.getPhysicsBodyData(this.physicsBody).isOneWayPlatformActive =
        false;
    } else {
      GameUtils.getPhysicsBodyData(this.physicsBody).isOneWayPlatformActive =
        true;
    }
  }
}
