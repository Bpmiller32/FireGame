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
 * const userData = getUserData(someBody);
 * if (userData.name === "someEntityName") {
 *   console.log(`metadata value0 = ${userData.value0}`);
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
 *   if (userData.name === "someEntityName") {
 *     // Handle the collision
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
 * if (isColliderName(hit.collider, "someEntityName")) {
 *   // matched — react to the contact
 * }
 *
 * if (isColliderName(hit.collider, "anotherEntityName")) {
 *   // matched a different entity
 * }
 * ```
 */
export function isColliderName(collider: Collider, name: string): boolean {
  const userData = collider.parent()?.userData as UserData;
  return userData.name === name;
}

/**
 * Check if a collider matches the given name AND is currently toggled active
 *
 * A matching collider can be toggled on/off via its metadata. This checks both:
 * 1. Does the collider's name match the given name?
 * 2. Is it currently active? (value3 > 0)
 *
 * @param collider - The collider to check
 * @param name - The entity name to match against (game-layer defined)
 * @returns true if the collider matches the name and is toggled active
 *
 * @example
 * ```typescript
 * // In a shapeCast predicate - ignore matching colliders that are active
 * (collider) => {
 *   if (isOneWayPlatformActive(collider, "someEntityName")) {
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
