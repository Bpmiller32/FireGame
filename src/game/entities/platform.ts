import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import CollisionGroups from "../types/gameCollisionGroups";
import Player from "./player/player";
import EntityType from "../types/entityType";

export default class Platform extends GameObject {
  private isOneWayPlatform: boolean;
  private oneWayEnablePoint: number;

  // Named, typed metadata (replaces the old anonymous userData value0/1/3).
  public FloorLevel: number = 0;
  public IsEdge: boolean = false;
  // For a one-way platform: is it currently pass-through-from-below active?
  // (Only ever true for one-way platforms — regular platforms never toggle it.)
  public IsOneWayActive: boolean = false;

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

    // Determine platform's routing type
    const objectName = isOneWayPlatform
      ? EntityType.ONE_WAY_PLATFORM
      : EntityType.PLATFORM;

    // Create the physics object based on the shape
    this.createObjectPhysics(objectName, objectType, size, position, rotation);

    // Handle one-way platform-specific properties
    this.isOneWayPlatform = isOneWayPlatform;
    this.SetType(objectName);
    // this.createObjectGraphicsDebug(graphicsColor);

    // Set collision groups and masks
    this.setCollisionGroup(CollisionGroups.PLATFORM);
    this.setCollisionMask(CollisionGroups.DEFAULT);
  }

  // The floor level this platform represents (used for enemy/player floor logic)
  public SetPlatformFloorLevel(value?: number) {
    this.FloorLevel = value ?? 0;
  }

  // Whether this is an edge platform (enemies turn around at its edge)
  public SetEdgePlatform(value?: number) {
    this.IsEdge = (value ?? 0) > 0;
  }

  // The enable-point Y for OneWay pass-through (needed for ComplexColliders)
  public SetOneWayEnablePoint(value: number) {
    this.oneWayEnablePoint = value;
  }

  public Update(player: Player) {
    // Exit early if not a OneWayPlatform
    if (!this.isOneWayPlatform) {
      return;
    }

    if (
      player &&
      this.isOneWayPlatform &&
      player.CurrentTranslation.y - player.CurrentSize.y / 2 >
        this.oneWayEnablePoint
    ) {
      this.IsOneWayActive = false;
    } else {
      this.IsOneWayActive = true;
    }

    // While the player is climbing, force this platform to pass-through so the
    // player can move up/down a ladder without landing on one-way platforms.
    if (player.State === "climbing") {
      this.IsOneWayActive = true;
    }
  }
}
