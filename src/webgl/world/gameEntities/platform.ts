import GameUtils from "../../utils/gameUtils";
import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";
import CollisionGroups from "../../utils/types/collisionGroups";
import Player from "../player/player";

export default class Platform extends GameObject {
  private isOneWayPlatform: boolean;
  private oneWayEnablePoint: number;

  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number,
    isOneWayPlatform: boolean = false,
    verticies: number[] = []
  ) {
    super();

    // Determine if the platform uses complex collider with vertices or a cube shape
    const isComplexCollider = verticies.length > 0;
    let objectType;

    if (isComplexCollider) {
      objectType = GameObjectType.POLYLINE;
      this.setVertices(verticies);
      this.oneWayEnablePoint = 0;
    } else {
      objectType = GameObjectType.CUBE;
      this.oneWayEnablePoint = position.y;
    }

    // Determine platform's objectName
    let objectName: string;

    if (isOneWayPlatform) {
      objectName = "OneWayPlatform";
      this.setOneWayPlatformActive(1);
    } else {
      objectName = "Platform";
      this.setOneWayPlatformActive(0);
    }

    // Create the physics object based on the shape
    this.createObjectPhysics(objectName, objectType, size, position, rotation);

    // Handle one-way platform-specific properties
    this.isOneWayPlatform = isOneWayPlatform;
    this.setObjectName(objectName);
    // this.createObjectGraphicsDebug(graphicsColor);

    // Set collision groups and masks
    this.setCollisionGroup(CollisionGroups.PLATFORM);
    this.setCollisionMask(CollisionGroups.DEFAULT);
  }

  // GameObjectValue[0] is the floor level of the platform
  public setPlatformFloorLevel(value: number) {
    this.setObjectValue0(value);
  }

  // GameObjectValue[1] is whether or not the platform is an edge platform
  public setEdgePlatform(value: number) {
    this.setObjectValue1(value);
  }

  // GameObjectValue[2] is the enable point Y coordinate for OneWay, needed for ComplexColliders
  public setOneWayEnablePoint(value: number) {
    this.oneWayEnablePoint = value;
  }

  // GameObjectValue[3] is whether or not the platform is currently OneWay
  public setOneWayPlatformActive(value: number) {
    this.setObjectValue3(value);
  }

  public update(player: Player) {
    // Exit early if not a OneWayPlatform
    if (!this.isOneWayPlatform) {
      return;
    }

    if (
      player &&
      this.isOneWayPlatform &&
      player.currentTranslation.y - player.currentSize.y / 2 >
        this.oneWayEnablePoint
    ) {
      GameUtils.getDataFromPhysicsBody(this.physicsBody).value3 = 0;
    } else {
      GameUtils.getDataFromPhysicsBody(this.physicsBody).value3 = 1;
    }
  }
}
