import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import CollisionGroups from "../types/gameCollisionGroups";
import Player from "./player/player";
import EntityType from "../types/entityType";

export default class Platform extends GameObject {
  private isOneWayPlatform: boolean; // true = pass-through-from-below platform
  private oneWayEnablePoint: number; // Y above which a one-way platform turns solid

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
    isOneWayPlatform: boolean = false
  ) {
    super();

    // The Y above which a one-way platform becomes solid (= the platform's own
    // height); the player passes up through it from below.
    this.oneWayEnablePoint = position.y;

    // Determine platform's routing type
    let objectName: string = EntityType.PLATFORM;
    if (isOneWayPlatform) objectName = EntityType.ONE_WAY_PLATFORM;

    // Cuboid collider — this is a cuboid/sphere engine (slopes = rotated cubes).
    this.createObjectPhysics(
      objectName,
      GameObjectType.CUBE,
      size,
      position,
      rotation
    );

    // Handle one-way platform-specific properties
    this.isOneWayPlatform = isOneWayPlatform;
    this.SetType(objectName);

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

  // The enable-point Y for OneWay pass-through
  public SetOneWayEnablePoint(value: number) {
    this.oneWayEnablePoint = value;
  }

  // Per-frame: toggle one-way pass-through from player Y/state.
  public Update(player: Player) {
    // Exit early if not a OneWayPlatform
    if (!this.isOneWayPlatform) {
      return;
    }

    // Solid once the player's feet rise above the enable point; pass-through below.
    if (
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
