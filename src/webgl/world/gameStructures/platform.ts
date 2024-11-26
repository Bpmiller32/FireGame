import GameUtils from "../../utils/gameUtils";
import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";
import CollisionGroups from "../../utils/types/collisionGroups";
import Player from "../player/player";

export default class Platform extends GameObject {
  private isOneWayPlatform: boolean;

  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number,
    isOneWayPlatform: boolean = false
  ) {
    super();
    this.createObjectPhysics(
      "Platform",
      GameObjectType.CUBE,
      size,
      position,
      rotation
    );

    this.isOneWayPlatform = isOneWayPlatform;
    if (isOneWayPlatform) {
      this.setObjectName("OneWayPlatform");
      this.createObjectGraphicsDebug("red");
    } else {
      this.createObjectGraphicsDebug("pink");
    }

    this.setCollisionGroup(CollisionGroups.PLATFORM);
    this.setCollisionMask(CollisionGroups.DEFAULT);
  }

  public setOneWayPlatform(value: boolean) {
    GameUtils.getDataFromPhysicsBody(this.physicsBody).isOneWayPlatformActive =
      value;
  }

  public update(player: Player) {
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
