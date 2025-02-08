import * as RAPIER from "@dimforge/rapier2d-compat";
import Emitter from "../../utils/eventEmitter";
import GameUtils from "../../utils/gameUtils";
import GameObject from "./gameObject";

export default class GameSensor extends GameObject {
  public targetPhysicsBody?: RAPIER.RigidBody;
  public isIntersectingTarget!: boolean;
  public isTargetFullyInside!: boolean;

  constructor() {
    super();

    this.initializeSensorAttributes();

    // Remove targetPhysicsBody if it was destroyed
    Emitter.on("gameObjectRemoved", (removedGameObject) => {
      if (
        GameUtils.getDataFromPhysicsBody(removedGameObject.physicsBody).name ===
        GameUtils.getDataFromPhysicsBody(this.targetPhysicsBody).name
      ) {
        this.targetPhysicsBody = undefined;
      }
    });
  }

  private initializeSensorAttributes() {
    this.isIntersectingTarget = false;
    this.isTargetFullyInside = false;
  }

  protected setAsSensor(value: boolean) {
    this.physicsBody?.collider(0).setSensor(value);
    this.physicsBody
      ?.collider(0)
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
  }

  public setIntersectingTarget<T extends GameObject>(target: T) {
    this.isIntersectingTarget = false;
    this.targetPhysicsBody = target.physicsBody;
  }

  public targetIntersectionCheck() {
    // Exit early if object is destroyed, physicsBodies not ready or set
    if (
      this.isBeingDestroyed ||
      !this.physicsBody?.collider(0) ||
      !this.targetPhysicsBody?.collider(0)
    ) {
      return;
    }

    // Check if intersecting with target
    if (
      this.physics.world.intersectionPair(
        this.physicsBody.collider(0),
        this.targetPhysicsBody.collider(0)
      )
    ) {
      this.isIntersectingTarget = true;
    } else {
      this.isIntersectingTarget = false;
    }
  }

  public targetFullyInsideIntersectionCheck<T extends GameObject>(
    gameObject: T
  ) {
    // Exit early if object is destroyed, physicsBodies not ready or set
    if (
      this.isBeingDestroyed ||
      !this.physicsBody?.collider(0) ||
      !this.targetPhysicsBody?.collider(0)
    ) {
      return;
    }

    this.targetIntersectionCheck();

    this.isTargetFullyInside = false;

    const sensorMinX = this.currentTranslation.x - this.currentSize.x / 2;
    const sensorMaxX = this.currentTranslation.x + this.currentSize.x / 2;

    const objectMinX =
      gameObject.currentTranslation.x - gameObject.currentSize.x / 2;
    const objectMaxX =
      gameObject.currentTranslation.x + gameObject.currentSize.x / 2;

    if (objectMinX > sensorMinX && objectMaxX < sensorMaxX) {
      this.isTargetFullyInside = true;
    }
  }

  public anyIntersectionCheck() {
    // Exit early if object is destroyed, physicsBodies not ready or set
    if (this.isBeingDestroyed || !this.physicsBody?.collider(0)) {
      return;
    }

    this.isIntersectingTarget = false;
    let foundCollider: RAPIER.Collider | undefined;

    this.physics.world.intersectionPairsWith(
      this.physicsBody.collider(0),
      (otherCollider) => {
        this.isIntersectingTarget = true;

        // Early exit: return the first collider found
        foundCollider = otherCollider;
      }
    );

    return foundCollider;
  }

  public anyIntersectionFullyInside() {
    // Exit early if object is destroyed, physicsBodies not ready or set
    if (this.isBeingDestroyed || !this.physicsBody?.collider(0)) {
      return;
    }

    this.anyIntersectionCheck();

    this.isTargetFullyInside = false;
    let foundCollider: RAPIER.Collider | undefined;

    this.physics.world.intersectionPairsWith(
      this.physicsBody.collider(0),
      (otherCollider) => {
        const sensorMinX = this.currentTranslation.x - this.currentSize.x / 2;
        const sensorMaxX = this.currentTranslation.x + this.currentSize.x / 2;

        const colliderMinX =
          otherCollider.translation().x -
          (otherCollider.shape as RAPIER.Cuboid).halfExtents.x;
        const colliderMaxX =
          otherCollider.translation().x +
          (otherCollider.shape as RAPIER.Cuboid).halfExtents.x;

        if (colliderMinX > sensorMinX && colliderMaxX < sensorMaxX) {
          this.isTargetFullyInside = true;
          foundCollider = otherCollider;
          return;
        }
      }
    );

    return foundCollider;
  }
}
