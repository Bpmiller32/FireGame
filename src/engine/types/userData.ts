/* -------------------------------------------------------------------------- */
/*                         PHYSICS BODY USER DATA                             */
/* -------------------------------------------------------------------------- */
/*
 * User data attached to Rapier physics bodies.
 *
 * Every physics body has userData containing:
 * - name: Entity-defined identifier (meaning assigned by the game layer)
 * - gameEntityType: Entity-defined type tag (meaning assigned by the game layer)
 * - value0-3: Generic metadata storage for entity-specific data
 *
 * This data is used for:
 * - Collision filtering (check what kind of object was hit)
 * - Entity-defined metadata (raw numeric values; meaning assigned by the game layer)
 * - Debug information
 */
/* -------------------------------------------------------------------------- */

/**
 * User data interface for physics bodies
 * 
 * Attached to every Rapier RigidBody via physicsBody.userData
 * 
 * @example
 * ```typescript
 * // Access user data from a physics body
 * const userData = physicsBody.userData as UserData;
 * if (userData.name === "someEntityName") {
 *   // Handle the collision
 * }
 *
 * // Set user data when creating an entity
 * this.physicsBody.userData = {
 *   name: "someEntityName",
 *   gameEntityType: "someEntityType",
 *   value0: 0,  // entity-defined metadata
 *   value1: 0,  // entity-defined metadata
 *   value2: 0,  // entity-defined metadata
 *   value3: 0   // entity-defined metadata
 * } as UserData;
 * ```
 */
export default interface UserData {
  /**
   * Entity name identifier
   *
   * Entity-defined string; meaning assigned by the game layer.
   */
  name: string;

  /**
   * Entity type tag
   * Entity-defined string; meaning assigned by the game layer.
   */
  gameEntityType: string;

  /* ===== GENERIC METADATA FIELDS ===== */
  /*
   * value0-3 are flexible fields that store raw numeric metadata.
   * Their meaning is entity-defined and assigned by the game layer.
   */

  /**
   * Generic metadata field 0
   * Entity-defined; meaning assigned by the game layer.
   */
  value0: number;

  /**
   * Generic metadata field 1
   * Entity-defined; meaning assigned by the game layer.
   */
  value1: number;

  /**
   * Generic metadata field 2
   * Entity-defined; meaning assigned by the game layer.
   */
  value2: number;

  /**
   * Generic metadata field 3
   * Entity-defined; meaning assigned by the game layer.
   */
  value3: number;
}

/**
 * Helper function to create default UserData
 * 
 * @param name - entity name (entity-defined; meaning assigned by the game layer)
 * @param gameEntityType - entity type tag (entity-defined; meaning assigned by the game layer)
 * @returns UserData with default values
 *
 * @example
 * ```typescript
 * this.physicsBody.userData = createDefaultUserData("someEntityName", "someEntityType");
 * ```
 */
export function createDefaultUserData(name: string, gameEntityType: string): UserData {
  return {
    name,
    gameEntityType,
    value0: 0,
    value1: 0,
    value2: 0,
    value3: 0,
  };
}
