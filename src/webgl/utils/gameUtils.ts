/* -------------------------------------------------------------------------- */
/*                  Convenience functions and utils for game                  */
/* -------------------------------------------------------------------------- */

import RAPIER, { Collider, RigidBody } from "@dimforge/rapier2d";
import UserData from "./types/userData";
import GameObject from "../world/gameComponents/gameObject";
import GameSensor from "../world/gameComponents/gameSensor";

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

  // Check if GameObject is fully inside any of the sensors in the given array
  public static isObjectFullyInsideAnySensor<
    T extends GameObject,
    U extends GameSensor
  >(gameSensors: U[], gameObject: T) {
    let isFullyInsideSensor = false;

    gameSensors.forEach((sensor) => {
      sensor.update(() => {
        if (
          sensor.isIntersectingTarget &&
          gameObject.currentTranslation.x - gameObject.initialSize.x / 2 >
            sensor.initalPosition.x - sensor.initialSize.x / 2 &&
          gameObject.currentTranslation.x + gameObject.initialSize.x / 2 <
            sensor.initalPosition.x + sensor.initialSize.x / 2
        ) {
          isFullyInsideSensor = true;
        }
      });
    });

    return isFullyInsideSensor;
  }

  // Same as above but for one sensor given it's collider
  public static isObjectFullyInsideSensor<
    T extends GameObject,
    U extends RAPIER.Collider
  >(collider: U, gameObject: T) {
    if (
      gameObject.currentTranslation.x - gameObject.initialSize.x / 2 >
        collider.translation().x -
          (collider.shape as RAPIER.Cuboid).halfExtents.x &&
      gameObject.currentTranslation.x + gameObject.initialSize.x / 2 <
        collider.translation().x +
          (collider.shape as RAPIER.Cuboid).halfExtents.x
    ) {
      return true;
    } else {
      return false;
    }
  }

  public static isObjectTouchingAnySensor<U extends GameSensor>(
    gameSensors: U[]
  ) {
    let isTouchingSensor = false;

    gameSensors.forEach((sensor) => {
      sensor.update(() => {
        if (sensor.isIntersectingTarget) {
          isTouchingSensor = true;
        }
      });
    });

    return isTouchingSensor;
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
