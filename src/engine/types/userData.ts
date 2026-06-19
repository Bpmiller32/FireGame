/* -------------------------------------------------------------------------- */
/*                         PHYSICS BODY USER DATA                             */
/* -------------------------------------------------------------------------- */
/*
 * Identity attached to every Rapier physics body — what the contact system and
 * physics queries read off a collider.
 *
 * - type: TYPE flag — a shared routing identity. Many entities can carry the
 *         same type, so one contact rule can match all of them at once.
 * - name: Per-INSTANCE identifier — for singling out one specific entity.
 *
 * Meaning of both fields is assigned by the game layer; the engine treats them
 * as opaque strings. (Per-entity NUMERIC metadata is no longer carried here —
 * it lives as named, typed fields on the entity classes; level data is the only
 * place generic value0-3 still exist, as the on-disk wire format.)
 */
/* -------------------------------------------------------------------------- */

/**
 * User data interface for physics bodies
 *
 * Attached to every Rapier RigidBody via physicsBody.userData
 *
 * @example
 * ```typescript
 * const userData = physicsBody.userData as UserData;
 * if (userData.type === someType) {
 *   // handle any entity of that type
 * }
 * ```
 */
export default interface UserData {
  /**
   * TYPE flag — a shared routing identity.
   *
   * Entity-defined string; meaning assigned by the game layer. Many entities can
   * share one type, which is what lets the contact system match "by type".
   */
  type: string;

  /**
   * Per-INSTANCE identifier — for singling out one specific entity by name.
   *
   * Entity-defined string; meaning assigned by the game layer. Defaults to the
   * type until SetName overrides it.
   */
  name: string;
}

/**
 * Helper function to create default UserData
 *
 * @param type - entity type flag / routing identity (entity-defined)
 * @param name - per-instance id (entity-defined; defaults to the type)
 * @returns UserData
 *
 * @example
 * ```typescript
 * this.physicsBody.userData = createDefaultUserData(someType);
 * ```
 */
export function createDefaultUserData(type: string, name: string = type): UserData {
  return { type, name };
}
