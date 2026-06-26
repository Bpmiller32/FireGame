// Helpers for Rapier bodies/colliders: extract userData, check names, collision math.

import { Collider, RigidBody } from "@dimforge/rapier2d-compat";
import UserData from "../types/userData";
import GameObject from "../entities/gameObject";

// Get UserData from a Rapier RigidBody, or empty default if body is undefined.
export function getUserData(physicsBody?: RigidBody): UserData {
  if (physicsBody) {
    return physicsBody.userData as UserData;
  }

  // Return empty default data
  return { type: "", name: "" };
}

// Does this GameObject carry the given TYPE flag? Contact system matches "by type"; reads opaque userData.type.
export function matchesType(gameObject: GameObject, type: string): boolean {
  const userData = gameObject.PhysicsBody?.userData as UserData | undefined;
  return userData?.type === type;
}

// Does this collider's parent carry the given TYPE flag? Collider-based sibling of matchesType for Rapier shapecast/intersection callbacks.
export function isColliderType(collider: Collider, type: string): boolean {
  const userData = collider.parent()?.userData as UserData | undefined;
  return userData?.type === type;
}
