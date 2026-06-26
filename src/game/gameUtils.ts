// Game utilities facade — the single entry point for game-layer helpers; game code goes through here, not engine helpers directly.

import RAPIER from "@dimforge/rapier2d-compat";
import GameObject from "../engine/entities/gameObject";
import GameSensor from "../engine/entities/gameSensor";

// Import helper functions used by this facade
import * as MathHelpers from "../engine/helpers/mathHelpers";
import * as PhysicsHelpers from "../engine/helpers/physicsHelpers";

// Static utility facade for game code.
export default class GameUtils {
  // Math helpers
  public static MoveTowardsPoint = MathHelpers.moveTowards; // move a value toward a target by a max step

  public static CalculatePercentChance = MathHelpers.percentChance; // true with the given percent probability

  // Physics helpers
  public static IsColliderType = PhysicsHelpers.isColliderType; // does a collider match a given entity type

  // Game-specific functions

  // Remove destroyed objects from an array
  public static RemoveDestroyedObjects<T extends GameObject>(
    existingArray: T[]
  ): T[] {
    const kept: T[] = [];
    for (const object of existingArray) {
      if (!object.IsBeingDestroyed) {
        kept.push(object);
      }
    }
    return kept;
  }

  // Remove destroyed objects from an array IN PLACE (swap-remove), keeping the SAME
  // array reference. Cheaper than rebuilding (no new array, no GC churn) and lets
  // long-lived systems hold a stable reference — the director runs this every frame
  // instead of a 5s wall-clock sweep, and its teardown list relies on the stable ref.
  public static CompactDestroyedObjects<T extends GameObject>(arr: T[]): void {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].IsBeingDestroyed) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
      }
    }
  }

  // Check if a GameObject is fully inside a sensor
  public static IsObjectFullyInsideSensor<
    T extends RAPIER.Collider,
    U extends GameObject
  >(collider: T, gameObject: U): boolean {
    // object's left/right X edges
    const objectMinX =
      gameObject.CurrentTranslation.x - gameObject.CurrentSize.x / 2;
    const objectMaxX =
      gameObject.CurrentTranslation.x + gameObject.CurrentSize.x / 2;

    // sensor collider's left/right X edges
    const colliderMinX =
      collider.translation().x -
      (collider.shape as RAPIER.Cuboid).halfExtents.x;
    const colliderMaxX =
      collider.translation().x +
      (collider.shape as RAPIER.Cuboid).halfExtents.x;

    return objectMinX > colliderMinX && objectMaxX < colliderMaxX;
  }

  // TEMPORARY: check if player is intersecting with any sensor; remove once Player uses callbacks
  public static IsAnySensorTriggered<T extends GameSensor>(
    gameSensors: T[]
  ): boolean {
    for (const sensor of gameSensors) {
      if (!sensor.PhysicsBody?.collider(0) || !sensor.Physics?.World) {
        continue;
      }

      let isIntersecting = false;
      sensor.Physics.World.intersectionPairsWith(
        sensor.PhysicsBody.collider(0),
        () => {
          isIntersecting = true;
        }
      );

      if (isIntersecting) {
        return true;
      }
    }

    return false;
  }

  // TEMPORARY: check if GameObject is fully inside any sensor; remove once Player uses callbacks
  public static IsAnySensorTriggeredObjectFullyInside<
    T extends GameObject,
    U extends GameSensor
  >(gameSensors: U[], gameObject: T): boolean {
    for (const sensor of gameSensors) {
      if (!sensor.PhysicsBody?.collider(0) || !sensor.Physics?.World) {
        continue;
      }

      let isIntersecting = false;
      sensor.Physics.World.intersectionPairsWith(
        sensor.PhysicsBody.collider(0),
        () => {
          isIntersecting = true;
        }
      );

      if (isIntersecting && sensor.IsFullyInside(gameObject)) {
        return true;
      }
    }

    return false;
  }
}
