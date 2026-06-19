/* -------------------------------------------------------------------------- */
/*                      GAME UTILITIES - BACKWARD COMPATIBLE                  */
/* -------------------------------------------------------------------------- */
/*
 * Backward-compatible GameUtils class that delegates to the new helper system.
 * 
 * NEW CODE SHOULD USE:
 * - helpers/mathHelpers.ts - Math utilities (moveTowards, lerp, random, etc.)
 * - helpers/physicsHelpers.ts - Physics utilities (getUserData, isColliderType, etc.)
 * - gameUtils functions - Game-specific logic (removeDestroyedObjects, etc.)
 *
 * This class exists for backward compatibility with existing code.
 * Gradually migrate to direct imports from helpers/ and gameUtils functions.
 */
/* -------------------------------------------------------------------------- */

import RAPIER from "@dimforge/rapier2d-compat";
import GameObject from "../engine/entities/gameObject";
import GameSensor from "../engine/entities/gameSensor";

// Import all helper functions
import * as MathHelpers from "../engine/helpers/mathHelpers";
import * as PhysicsHelpers from "../engine/helpers/physicsHelpers";

/**
 * GameUtils class - Backward compatible static utility methods
 * 
 * @deprecated Prefer importing specific functions from helpers/ or gameUtils
 * 
 * @example
 * ```typescript
 * // OLD WAY (still works):
 * import GameUtils from './gameUtils';
 * const newValue = GameUtils.moveTowardsPoint(current, target, delta);
 * 
 * // NEW WAY (preferred):
 * import { moveTowards } from './helpers/mathHelpers';
 * const newValue = moveTowards(current, target, delta);
 * ```
 */
export default class GameUtils {
  /* -------------------------------------------------------------------------- */
  /*                           MATH HELPERS DELEGATION                          */
  /* -------------------------------------------------------------------------- */

  /**
   * @deprecated Use `moveTowards` from helpers/mathHelpers instead
   */
  public static MoveTowardsPoint = MathHelpers.moveTowards;

  /**
   * @deprecated Use `radiansToDegrees` from helpers/mathHelpers instead
   */
  public static RadiansToDegrees = MathHelpers.radiansToDegrees;

  /**
   * @deprecated Use `percentChance` from helpers/mathHelpers instead
   */
  public static CalculatePercentChance = MathHelpers.percentChance;

  /**
   * @deprecated Use `randomRange` from helpers/mathHelpers instead
   */
  public static GetRandomNumber = MathHelpers.randomRange;

  /* -------------------------------------------------------------------------- */
  /*                         PHYSICS HELPERS DELEGATION                         */
  /* -------------------------------------------------------------------------- */

  /**
   * @deprecated Use `getUserData` from helpers/physicsHelpers instead
   */
  public static GetDataFromPhysicsBody = PhysicsHelpers.getUserData;

  /**
   * @deprecated Use `getUserDataFromCollider` from helpers/physicsHelpers instead
   */
  public static GetDataFromCollider = PhysicsHelpers.getUserDataFromCollider;

  /**
   * @deprecated Use `isColliderType` from helpers/physicsHelpers instead
   */
  public static IsColliderType = PhysicsHelpers.isColliderType;

  /* -------------------------------------------------------------------------- */
  /*                         GAME-SPECIFIC FUNCTIONS                            */
  /* -------------------------------------------------------------------------- */

  /**
   * Remove destroyed objects from an array
   * 
   * @param existingArray - Array of GameObjects to filter
   * @returns New array containing only active objects
   */
  public static RemoveDestroyedObjects<T extends GameObject>(
    existingArray: T[]
  ): T[] {
    return existingArray.filter((object) => !object.IsBeingDestroyed);
  }

  /**
   * Check if a GameObject is fully inside a sensor
   * 
   * @param collider - The sensor collider
   * @param gameObject - The GameObject to check
   * @returns true if GameObject is fully inside
   */
  public static IsObjectFullyInsideSensor<
    T extends RAPIER.Collider,
    U extends GameObject
  >(collider: T, gameObject: U): boolean {
    const objectMinX =
      gameObject.CurrentTranslation.x - gameObject.CurrentSize.x / 2;
    const objectMaxX =
      gameObject.CurrentTranslation.x + gameObject.CurrentSize.x / 2;

    const colliderMinX =
      collider.translation().x -
      (collider.shape as RAPIER.Cuboid).halfExtents.x;
    const colliderMaxX =
      collider.translation().x +
      (collider.shape as RAPIER.Cuboid).halfExtents.x;

    return objectMinX > colliderMinX && objectMaxX < colliderMaxX;
  }

  /**
   * TEMPORARY: Check if player is intersecting with any sensor
   * 
   * @deprecated Will be removed once Player uses callbacks
   */
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

  /**
   * TEMPORARY: Check if GameObject is fully inside any sensor
   * 
   * @deprecated Will be removed once Player uses callbacks
   */
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
