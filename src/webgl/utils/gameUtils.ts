/* -------------------------------------------------------------------------- */
/*                  Convenience functions and utils for game                  */
/* -------------------------------------------------------------------------- */

import { Collider, RigidBody } from "@dimforge/rapier2d";
import UserData from "./types/userData";
import GameObject from "../world/gameComponents/gameObject";

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
      value: 0,
      gameEntityType: undefined,

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
      value: 0,
      gameEntityType: undefined,

      isOneWayPlatformActive: undefined,
    };
  }

  // Sets the collision group for a collider
  static setCollisionGroup(collider: Collider, group: number) {
    const currentMask = collider.collisionGroups() >> 16; // Extract the current mask (upper 16 bits)
    collider.setCollisionGroups(group | (currentMask << 16)); // Set the group, keep the current mask
  }

  // Updates the collision mask for a collider
  static setCollisionMask(collider: Collider, mask: number) {
    const currentGroup = collider.collisionGroups() & 0xffff; // Extract the current group (lower 16 bits)
    collider.setCollisionGroups(currentGroup | (mask << 16)); // Set the mask, keep the current group
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

  public static getPercentChance(probability: number) {
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
