import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Cube from "../gameEntities/cube";
import Player from "../player/player";
import UserData from "../../utils/types/userData";
import CollisionGroups from "../../utils/types/collisionGroups";
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
      (this.physicsBody.userData as UserData).name = "OneWayPlatform";
    }

    // this.physicsBody
    //   .collider(0)
    //   .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    // this.physicsBody
    //   .collider(0)
    //   .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);

    GameUtils.setCollisionGroup(
      this.physicsBody.collider(0),
      CollisionGroups.PLATFORM
    );
    GameUtils.setCollisionMask(
      this.physicsBody.collider(0),
      CollisionGroups.PLATFORM
    );

    console.log(
      "hello darkness my old friend: ",
      (this.physicsBody.userData as UserData).isOneWayPlatformActive
    );
  }

  public updateOneWayPlatform(player: Player) {
    if (
      player &&
      this.isOneWayPlatform &&
      player.currentTranslation.y - player.initalSize.y / 2 >
        this.currentTranslation.y
    ) {
      (this.physicsBody.userData as UserData).isOneWayPlatformActive = false;
    } else {
      (this.physicsBody.userData as UserData).isOneWayPlatformActive = true;
    }
  }
}
