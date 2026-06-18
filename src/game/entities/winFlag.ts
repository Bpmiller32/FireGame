import RAPIER from "@dimforge/rapier2d-compat";
import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import CollisionGroups from "../types/gameCollisionGroups";
import GameUtils from "../gameUtils";
import Emitter from "../../engine/events/eventBus";
import EntityType from "../types/entityType";
import Player from "./player/player";

export default class WinFlag extends GameObject {
  public ColliderOffset: number;
  public IsBeingTouched: boolean;

  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number
  ) {
    super();

    this.createObjectPhysics(
      EntityType.WIN_FLAG,
      GameObjectType.CUBE,
      size,
      position,
      rotation
    );

    // this.createObjectGraphicsDebug("cyan");

    this.ColliderOffset = 0.01;
    this.IsBeingTouched = false;

    this.setCollisionGroup(CollisionGroups.DEFAULT);
    this.setCollisionMask(CollisionGroups.DEFAULT);
  }

  private shapeCast(xDirection: number, yDirection: number) {
    // Without offset here, the x shapeCast collides with the shape's inner wall for some reason
    const offsetX =
      this.CurrentTranslation.x + this.ColliderOffset * xDirection;
    const offsetY =
      this.CurrentTranslation.y + this.ColliderOffset * yDirection;

    const hit = this.Physics.World.castShape(
      { x: offsetX, y: offsetY },
      0,
      { x: xDirection, y: yDirection },
      this.PhysicsBody!.collider(0).shape,
      0,      // targetDistance — distance at which shapes are considered touching
      1000,   // maxToi
      false,  // stopAtPenetration
      undefined,
      undefined,
      undefined,
      undefined,
      // Don't collide with sensors or OneWayPlatforms while under them
      (collider: RAPIER.Collider) =>
        !(
          collider.isSensor() ||
          GameUtils.GetDataFromCollider(collider).value3 > 0
        )
    );

    return hit || null;
  }

  private getShapeCastCollisions() {
    // ShapeCast in all directions
    const shapeCasts = {
      down: this.shapeCast(0, -1),
      left: this.shapeCast(-1, 0),
      right: this.shapeCast(1, 0),
      up: this.shapeCast(0, 1),
    };

    // Detect left wall collisions
    const leftCast = shapeCasts.left;
    if (
      leftCast &&
      leftCast.time_of_impact <= this.ColliderOffset &&
      GameUtils.GetDataFromCollider(leftCast.collider).name == EntityType.PLAYER
    ) {
      this.IsBeingTouched = true;
      return;
    }

    // Detect right wall collisions
    const rightCast = shapeCasts.right;
    if (
      rightCast &&
      rightCast.time_of_impact <= this.ColliderOffset &&
      GameUtils.GetDataFromCollider(rightCast.collider).name == EntityType.PLAYER
    ) {
      this.IsBeingTouched = true;
      return;
    }

    // Detect ceiling collisions
    const upCast = shapeCasts.up;
    if (
      upCast &&
      upCast.time_of_impact <= this.ColliderOffset &&
      GameUtils.GetDataFromCollider(upCast.collider).name == EntityType.PLAYER
    ) {
      this.IsBeingTouched = true;
      return;
    }
  }

  public Update(player?: Player) {
    // Uniform update contract (R1): WinFlag ignores the player arg — it detects
    // contact via its own shapecasts. Referenced here so the signature stays uniform.
    void player;

    // Reset flag for being touched
    this.IsBeingTouched = false;

    // Check if being touched
    this.getShapeCastCollisions();

    if (this.IsBeingTouched) {
      Emitter.emit("gameWin");
    }
  }
}
