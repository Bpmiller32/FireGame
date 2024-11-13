/* -------------------------------------------------------------------------- */
/*                  Convenience functions and utils for game                  */
/* -------------------------------------------------------------------------- */

import { Collider } from "@dimforge/rapier2d";

export default class GameUtils {
  // Moves a value current towards target
  // current: the current value, target: the value to move towards, maxDelta: the maximum change applied to the current value
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

  // Sets the collision group for a collider
  static setCollisionGroup(collider: Collider, group: number): void {
    const currentMask = collider.collisionGroups() >> 16; // Extract the current mask (upper 16 bits)
    collider.setCollisionGroups(group | (currentMask << 16)); // Set the group, keep the current mask
  }

  // Updates the collision mask for a collider
  static setCollisionMask(collider: Collider, mask: number): void {
    const currentGroup = collider.collisionGroups() & 0xffff; // Extract the current group (lower 16 bits)
    collider.setCollisionGroups(currentGroup | (mask << 16)); // Set the mask, keep the current group
  }

  static calculateCollisionMask(group: number, mask: number) {
    const groupString = group.toString(2).padStart(16, "0");
    const maskString = mask.toString(2).padStart(16, "0");

    const combinedString = maskString + groupString;

    return parseInt(combinedString, 2);
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
