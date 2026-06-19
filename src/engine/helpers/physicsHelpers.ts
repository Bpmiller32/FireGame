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
import GameObject from "../entities/gameObject";

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
 * if (userData.type === someType) {
 *   // handle it
 * }
 * ```
 */
export function getUserData(physicsBody?: RigidBody): UserData {
  if (physicsBody) {
    return physicsBody.userData as UserData;
  }

  // Return empty default data
  return { type: "", name: "" };
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
  const defaultData: UserData = { type: "", name: "" };

  if (!collider) return defaultData;

  const parent = collider.parent();
  if (!parent) return defaultData;

  return parent.userData as UserData;
}

/**
 * Does this GameObject carry the given TYPE flag?
 *
 * The contact system matches "by type" with this: many entities can share one
 * type, so a single rule covers all of them. Reads the opaque userData.type
 * string — the engine assigns it no meaning.
 *
 * @param gameObject - the GameObject to test
 * @param type - the type flag to match (a game-layer string)
 * @returns true if the object's userData.type equals `type`
 */
export function matchesType(gameObject: GameObject, type: string): boolean {
  const userData = gameObject.PhysicsBody?.userData as UserData | undefined;
  return userData?.type === type;
}

/**
 * Does this GameObject carry the given per-INSTANCE name?
 *
 * The contact system matches "by name" with this — for singling out one specific
 * entity. Reads the opaque userData.name string.
 *
 * @param gameObject - the GameObject to test
 * @param name - the instance name to match (a game-layer string)
 * @returns true if the object's userData.name equals `name`
 */
export function matchesName(gameObject: GameObject, name: string): boolean {
  const userData = gameObject.PhysicsBody?.userData as UserData | undefined;
  return userData?.name === name;
}

/**
 * Does this collider's parent carry the given TYPE flag?
 *
 * Collider-based sibling of matchesType, for Rapier shapecast/intersection
 * callbacks that hand back a raw Collider rather than a GameObject.
 *
 * @param collider - the collider to check
 * @param type - the type flag to match (a game-layer string)
 * @returns true if the collider's parent userData.type equals `type`
 *
 * @example
 * ```typescript
 * if (isColliderType(hit.collider, someType)) {
 *   // matched — react to the contact
 * }
 * ```
 */
export function isColliderType(collider: Collider, type: string): boolean {
  const userData = collider.parent()?.userData as UserData;
  return userData.type === type;
}
