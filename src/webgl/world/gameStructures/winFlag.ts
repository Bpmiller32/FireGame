import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";
import CollisionGroups from "../../utils/types/collisionGroups";
import GameUtils from "../../utils/gameUtils";
import Emitter from "../../utils/eventEmitter";

export default class WinFlag extends GameObject {
  public colliderOffset: number;
  public isBeingTouched: boolean;

  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number
  ) {
    super();

    this.createObjectPhysics(
      "WinFlag",
      GameObjectType.CUBE,
      size,
      position,
      rotation
    );

    this.createObjectGraphicsDebug("cyan");

    this.colliderOffset = 0.01;
    this.isBeingTouched = false;

    this.setCollisionGroup(CollisionGroups.DEFAULT);
    this.setCollisionMask(CollisionGroups.DEFAULT);
  }

  private shapeCast(xDirection: number, yDirection: number) {
    // Without offset here, the x shapeCast collides with the shape's inner wall for some reason
    const offsetX =
      this.currentTranslation.x + this.colliderOffset * xDirection;
    const offsetY =
      this.currentTranslation.y + this.colliderOffset * yDirection;

    const hit = this.physics.world.castShape(
      { x: offsetX, y: offsetY },
      0,
      { x: xDirection, y: yDirection },
      this.physicsBody!.collider(0).shape,
      1000,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      // Don't collide with sensors or OneWayPlatforms while under them
      (collider) =>
        !(
          collider.isSensor() ||
          GameUtils.getDataFromCollider(collider).value3 > 0
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
      leftCast.toi <= this.colliderOffset &&
      GameUtils.getDataFromCollider(leftCast.collider).name == "Player"
    ) {
      this.isBeingTouched = true;
      return;
    }

    // Detect right wall collisions
    const rightCast = shapeCasts.right;
    if (
      rightCast &&
      rightCast.toi <= this.colliderOffset &&
      GameUtils.getDataFromCollider(rightCast.collider).name == "Player"
    ) {
      this.isBeingTouched = true;
      return;
    }

    // Detect ceiling collisions
    const upCast = shapeCasts.up;
    if (
      upCast &&
      upCast.toi <= this.colliderOffset &&
      GameUtils.getDataFromCollider(upCast.collider).name == "Player"
    ) {
      this.isBeingTouched = true;
      return;
    }
  }

  public update() {
    // Reset flag for being touched
    this.isBeingTouched = false;

    // Check if being touched
    this.getShapeCastCollisions();

    if (this.isBeingTouched) {
      Emitter.emit("gameWin");
    }
  }
}
