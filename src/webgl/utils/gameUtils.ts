/* -------------------------------------------------------------------------- */
/*                      GAME UTILITIES - BACKWARD COMPATIBLE                  */
/* -------------------------------------------------------------------------- */
/*
 * Backward-compatible GameUtils class that delegates to the new helper system.
 * 
 * NEW CODE SHOULD USE:
 * - helpers/mathHelpers.ts - Math utilities (moveTowards, lerp, random, etc.)
 * - helpers/physicsHelpers.ts - Physics utilities (getUserData, isColliderName, etc.)
 * - gameUtils functions - Game-specific logic (removeDestroyedObjects, updatePlatforms, etc.)
 * 
 * This class exists for backward compatibility with existing code.
 * Gradually migrate to direct imports from helpers/ and gameUtils functions.
 */
/* -------------------------------------------------------------------------- */

import RAPIER from "@dimforge/rapier2d-compat";
import GameObject from "../world/gameComponents/gameObject";
import GameSensor from "../world/gameComponents/gameSensor";
import Platform from "../world/gameEntities/platform";
import Player from "../world/player/player";

// Import all helper functions
import * as MathHelpers from "./helpers/mathHelpers";
import * as PhysicsHelpers from "./helpers/physicsHelpers";

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
  public static moveTowardsPoint = MathHelpers.moveTowards;

  /**
   * @deprecated Use `radiansToDegrees` from helpers/mathHelpers instead
   */
  public static radiansToDegrees = MathHelpers.radiansToDegrees;

  /**
   * @deprecated Use `percentChance` from helpers/mathHelpers instead
   */
  public static calculatePercentChance = MathHelpers.percentChance;

  /**
   * @deprecated Use `randomRange` from helpers/mathHelpers instead
   */
  public static getRandomNumber = MathHelpers.randomRange;

  /* -------------------------------------------------------------------------- */
  /*                         PHYSICS HELPERS DELEGATION                         */
  /* -------------------------------------------------------------------------- */

  /**
   * @deprecated Use `getUserData` from helpers/physicsHelpers instead
   */
  public static getDataFromPhysicsBody = PhysicsHelpers.getUserData;

  /**
   * @deprecated Use `getUserDataFromCollider` from helpers/physicsHelpers instead
   */
  public static getDataFromCollider = PhysicsHelpers.getUserDataFromCollider;

  /**
   * @deprecated Use `isColliderName` from helpers/physicsHelpers instead
   */
  public static isColliderName = PhysicsHelpers.isColliderName;

  /**
   * @deprecated Use `isOneWayPlatformActive` from helpers/physicsHelpers instead
   */
  public static isOneWayPlatformAndActive = PhysicsHelpers.isOneWayPlatformActive;

  /**
   * @deprecated Use `calculateCollisionMask` from helpers/physicsHelpers instead
   */
  public static calculateCollisionMask = PhysicsHelpers.calculateCollisionMask;

  /* -------------------------------------------------------------------------- */
  /*                         GAME-SPECIFIC FUNCTIONS                            */
  /* -------------------------------------------------------------------------- */

  /**
   * Remove destroyed objects from an array
   * 
   * @param existingArray - Array of GameObjects to filter
   * @returns New array containing only active objects
   */
  public static removeDestroyedObjects<T extends GameObject>(
    existingArray: T[]
  ): T[] {
    return existingArray.filter((object) => !object.isBeingDestroyed);
  }

  /**
   * Check if a GameObject is fully inside a sensor
   * 
   * @param collider - The sensor collider
   * @param gameObject - The GameObject to check
   * @returns true if GameObject is fully inside
   */
  public static isObjectFullyInsideSensor<
    T extends RAPIER.Collider,
    U extends GameObject
  >(collider: T, gameObject: U): boolean {
    const objectMinX =
      gameObject.currentTranslation.x - gameObject.currentSize.x / 2;
    const objectMaxX =
      gameObject.currentTranslation.x + gameObject.currentSize.x / 2;

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
  public static isAnySensorTriggered<T extends GameSensor>(
    gameSensors: T[]
  ): boolean {
    for (const sensor of gameSensors) {
      if (!sensor.physicsBody?.collider(0) || !sensor.physics?.world) {
        continue;
      }

      let isIntersecting = false;
      sensor.physics.world.intersectionPairsWith(
        sensor.physicsBody.collider(0),
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
  public static isAnySensorTriggeredObjectFullyInside<
    T extends GameObject,
    U extends GameSensor
  >(gameSensors: U[], gameObject: T): boolean {
    for (const sensor of gameSensors) {
      if (!sensor.physicsBody?.collider(0) || !sensor.physics?.world) {
        continue;
      }

      let isIntersecting = false;
      sensor.physics.world.intersectionPairsWith(
        sensor.physicsBody.collider(0),
        () => {
          isIntersecting = true;
        }
      );

      if (isIntersecting && sensor.isFullyInside(gameObject)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update all platforms with player state
   * 
   * @param platforms - Array of platforms to update
   * @param player - The player instance
   */
  public static updatePlatforms(platforms: Platform[], player: Player): void {
    const isClimbing = player.state === "climbing";

    platforms.forEach((platform) => {
      platform.update(player);

      if (isClimbing) {
        platform.setOneWayPlatformActive(1);
      }
    });
  }
}
