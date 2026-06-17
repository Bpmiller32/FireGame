/* -------------------------------------------------------------------------- */
/*                        PHYSICS HELPER FUNCTIONS                            */
/* -------------------------------------------------------------------------- */
/*
 * Helper functions for working with Rapier physics bodies and colliders.
 * These extract userData, check names, and perform collision calculations.
 */
/* -------------------------------------------------------------------------- */

import { Collider, RigidBody } from "@dimforge/rapier2d-compat";
import UserData from "../types/userData";

/**
 * Get UserData from a Rapier RigidBody
 * 
 * Safely extracts user data or returns default empty data if body is undefined.
 * 
 * @param physicsBody - The Rapier RigidBody to get data from
 * @returns UserData attached to the body, or empty default data
 * 
 * @example
 * ```typescript
 * const userData = getUserData(player.physicsBody);
 * if (userData.name === "Player") {
 *   console.log(`Player on floor ${userData.value0}`);
 * }
 * ```
 */
export function getUserData(physicsBody?: RigidBody): UserData {
  if (physicsBody) {
    return physicsBody.userData as UserData;
  }

  // Return empty default data
  return {
    name: "",
    gameEntityType: "",
    value0: 0,
    value1: 0,
    value2: 0,
    value3: 0,
  };
}

/**
 * Get UserData from a Rapier Collider
 * 
 * Extracts user data from the collider's parent RigidBody.
 * 
 * @param collider - The Rapier Collider to get data from
 * @returns UserData from the parent body, or empty default data
 * 
 * @example
 * ```typescript
 * // In collision detection
 * const hit = shapeCast(...);
 * if (hit) {
 *   const userData = getUserDataFromCollider(hit.collider);
 *   if (userData.name === "Enemy") {
 *     // Handle enemy collision
 *   }
 * }
 * ```
 */
export function getUserDataFromCollider(collider?: Collider): UserData {
  const defaultData: UserData = {
    name: "",
    gameEntityType: "",
    value0: 0,
    value1: 0,
    value2: 0,
    value3: 0,
  };

  if (!collider) return defaultData;

  const parent = collider.parent();
  if (!parent) return defaultData;

  return parent.userData as UserData;
}

/**
 * Check if a collider's name matches a specific name
 * 
 * @param collider - The collider to check
 * @param name - The name to match against
 * @returns true if collider's name matches
 * 
 * @example
 * ```typescript
 * if (isColliderName(hit.collider, "Platform")) {
 *   player.isTouching.ground = true;
 * }
 * 
 * if (isColliderName(hit.collider, "Enemy")) {
 *   gameOver();
 * }
 * ```
 */
export function isColliderName(collider: Collider, name: string): boolean {
  const userData = collider.parent()?.userData as UserData;
  return userData.name === name;
}

/**
 * Check if collider is a OneWayPlatform AND currently active
 * 
 * One-way platforms can be toggled on/off. This checks both:
 * 1. Is it a OneWayPlatform type?
 * 2. Is it currently active? (value3 > 0)
 * 
 * @param collider - The collider to check
 * @param name - Should be "OneWayPlatform"
 * @returns true if it's an active one-way platform
 * 
 * @example
 * ```typescript
 * // In shapeCast predicate - ignore active one-way platforms
 * (collider) => {
 *   if (isOneWayPlatformActive(collider, "OneWayPlatform")) {
 *     return false; // Don't collide
 *   }
 *   return true; // Collide with everything else
 * }
 * ```
 */
export function isOneWayPlatformActive(
  collider: Collider,
  name: string
): boolean {
  const userData = collider.parent()?.userData as UserData;
  return userData.name === name && userData.value3 > 0;
}
