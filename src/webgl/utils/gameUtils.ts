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
      value2: 0,
      value3: 0,
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
      value2: 0,
      value3: 0,
    };
  }

  // Helper function, checks just the name from the given collider
  static isColliderName(collider: Collider, name: string) {
    if ((collider.parent()?.userData as UserData).name == name) {
      return true;
    }

    return false;
  }

  // Helper function, checks if collider is a OneWayPlatform and if so is it active
  static isOneWayPlatformAndActive(collider: Collider, name: string) {
    if (
      GameUtils.isColliderName(collider, name) &&
      (collider.parent()?.userData as UserData).value3 > 0
    ) {
      return true;
    }

    return false;
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

  // Needed for Enemy, non-sesnors. Checks not only if the targetObject is intersecting with sensor, but is fully inside it
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

  // Convienence function to update OneWayPlatforms
  public static updatePlatforms(platforms: Platform[], player: Player) {
    // Check once to improve performance
    const isClimbing = player.state === "climbing";

    platforms.forEach((platform) => {
      platform.update(player);

      if (isClimbing) {
        platform.setOneWayPlatformActive(1);
      }
    });
  }

  public static radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  public static calculatePercentChance(probability: number) {
    return Math.random() < probability;
  }

  public static getRandomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
