/* -------------------------------------------------------------------------- */
/*                  Convenience functions and utils for game                  */
/* -------------------------------------------------------------------------- */

import RAPIER, { Collider, RigidBody } from "@dimforge/rapier2d";
import UserData from "./types/userData";
import GameObject from "../world/gameComponents/gameObject";
import GameSensor from "../world/gameComponents/gameSensor";
import Camera from "../camera";
import Platform from "../world/gameStructures/platform";
import Player from "../world/player/player";
import CameraSensor from "../world/gameStructures/cameraSensor";

export default class GameUtils {
  // Moves a value current towards target. Current: the current value, target: the value to move towards, maxDelta: the maximum change applied to the current value
  public static moveTowardsPoint(
    current: number,
    target: number,
    maxDelta: number
  ) {
    if (Math.abs(target - current) <= maxDelta) {
      return target;
    }

    return current + Math.sign(target - current) * maxDelta;
  }

  // Get userData from physicsBody
  static getDataFromPhysicsBody(physicsBody?: RigidBody) {
    if (physicsBody) {
      return physicsBody.userData as UserData;
    }

    return {
      name: "",
      gameEntityType: undefined,

      value0: 0,
      value1: 0,

      isEdgePlatform: undefined,
      isOneWayPlatformActive: undefined,
    };
  }

  // Get userData from collider
  static getDataFromCollider(collider?: Collider) {
    if (collider) {
      return collider.parent()?.userData as UserData;
    }

    return {
      name: "",
      gameEntityType: undefined,

      value0: 0,
      value1: 0,

      isEdgePlatform: undefined,
      isOneWayPlatformActive: undefined,
    };
  }

  // Calculates what the collision mask on a collider must be without having the collider itself
  static calculateCollisionMask(group: number, mask: number) {
    const groupString = group.toString(2).padStart(16, "0");
    const maskString = mask.toString(2).padStart(16, "0");

    const combinedString = maskString + groupString;

    return parseInt(combinedString, 2);
  }

  // Remove destroyed objects, clear the existing enemy array and refill it with active objects
  public static removeDestroyedObjects<T extends GameObject>(
    existingArray: T[]
  ) {
    const activeObjects = existingArray.filter(
      (object) => !object.isBeingDestroyed
    );

    existingArray.length = 0;

    return activeObjects;
  }

  // Stop looping if any single sensor in the array is tripped and GameObject is fully inside the sensor's collider
  public static isAnySensorTriggeredObjectFullyInside<
    T extends GameObject,
    U extends GameSensor
  >(gameSensors: U[], gameObject: T): boolean {
    for (const sensor of gameSensors) {
      sensor.targetFullyInsideIntersectionCheck(gameObject);

      if (sensor.isIntersectingTarget && sensor.isTargetFullyInside) {
        return true;
      }
    }

    return false;
  }

  // Same as above but for one sensor given it's collider, same logic as sensor but used for enemy
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

    if (objectMinX > colliderMinX && objectMaxX < colliderMaxX) {
      return true;
    } else {
      return false;
    }
  }

  // Stop looping if any single sensor in the array is tripped
  public static isAnySensorTriggered<T extends GameSensor>(gameSensors: T[]) {
    for (const sensor of gameSensors) {
      sensor.targetIntersectionCheck();

      if (sensor.isIntersectingTarget) {
        // Return immediately if a sensor is intersecting
        return true;
      }
    }

    // No sensors are intersecting
    return false;
  }

  // Needed to check all CameraSensors, stop looping if any single sensor is tripped
  public static updateCameraSensors(
    camera: Camera,
    cameraSensors: CameraSensor[]
  ) {
    for (const sensor of cameraSensors) {
      sensor.update(camera);

      if (sensor.isIntersectingTarget) {
        break;
      }
    }
  }

  public static updatePlatforms(platforms: Platform[], player: Player) {
    // Check once to improve performance
    const isClimbing = player.state === "climbing";

    platforms.forEach((platform) => {
      platform.update(player);

      if (isClimbing) {
        platform.setOneWayPlatformActive(true);
      }
    });
  }

  public static radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  public static lerp(
    start: number,
    end: number,
    t: number,
    deltaTime: number,
    duration: number
  ): number {
    const clampedT = Math.min(Math.max(t, 0), 1); // Clamp t to [0, 1]
    const easedT = 0.5 * (1 - Math.cos(Math.PI * clampedT));
    return start + (end - start) * easedT * deltaTime * (1 / duration);
  }

  public static calculatePercentChance(probability: number) {
    return Math.random() < probability;
  }

  public static getRandomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  public static clamp(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  public static easeInOutSin(time: number) {
    return 0.5 * (1 - Math.cos(Math.PI * time));
  }
}
