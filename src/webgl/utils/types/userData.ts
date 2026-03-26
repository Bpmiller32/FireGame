/* -------------------------------------------------------------------------- */
/*                         PHYSICS BODY USER DATA                             */
/* -------------------------------------------------------------------------- */
/*
 * User data attached to Rapier physics bodies.
 * 
 * Every physics body in the game has userData containing:
 * - name: Identifier for the GameObject (Player, Enemy, Platform, etc.)
 * - gameEntityType: The class/type of the entity
 * - value0-3: Generic metadata storage for entity-specific data
 * 
 * This data is used for:
 * - Collision filtering (check what type of object was hit)
 * - Level-specific metadata (floor levels, ladder directions, etc.)
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
 * if (userData.name === "Player") {
 *   // Handle player collision
 * }
 * 
 * // Set user data when creating a GameObject
 * this.physicsBody.userData = {
 *   name: "Enemy",
 *   gameEntityType: "Enemy",
 *   value0: 0,  // Enemy type ID
 *   value1: 0,  // Enemy behavior ID
 *   value2: 0,  // Unused
 *   value3: 0   // Unused
 * } as UserData;
 * ```
 */
export default interface UserData {
  /**
   * GameObject name identifier
   * 
   * Common values:
   * - "Player": The player character
   * - "Enemy": Enemy entities
   * - "Platform": Solid platforms
   * - "Wall": Solid walls
   * - "OneWayPlatform": Jump-through platforms
   * - "LadderTopSensor", "LadderCoreSensor", "LadderBottomSensor": Ladder zones
   * - "CameraSensor": Camera trigger zones
   * - "TrashCan", "WinFlag", etc.: Interactive objects
   */
  name: string;
  
  /**
   * GameObject class/constructor name
   * Typically matches the TypeScript class name
   * 
   * Examples: "Player", "Enemy", "Platform", "LadderSensor"
   */
  gameEntityType: string;
  
  /* ===== GENERIC METADATA FIELDS ===== */
  /*
   * value0-3 are flexible fields that store different data based on object type:
   * 
   * PLATFORMS (Platform, OneWayPlatform):
   *   value0: Floor level (for multi-story games)
   *   value1: Is edge platform (1 = yes, 0 = no)
   *   value2: One-way platform enable point (Y position)
   *   value3: Unused
   * 
   * LADDERS (LadderTopSensor, LadderCoreSensor, LadderBottomSensor):
   *   value0: Direction (-1 = left, 0 = neutral, 1 = right)
   *   value1-3: Unused
   * 
   * CAMERA SENSORS:
   *   value0: Target camera X position
   *   value1: Target camera Y position
   *   value2: Target camera Z position
   *   value3: Unused
   * 
   * TELEPORTERS:
   *   value0: Destination X position
   *   value1: Destination Y position
   *   value2-3: Unused
   */
  
  /**
   * Generic metadata field 0
   * Meaning varies by GameObject type (see above)
   */
  value0: number;
  
  /**
   * Generic metadata field 1
   * Meaning varies by GameObject type (see above)
   */
  value1: number;
  
  /**
   * Generic metadata field 2
   * Meaning varies by GameObject type (see above)
   */
  value2: number;
  
  /**
   * Generic metadata field 3
   * Meaning varies by GameObject type (see above)
   */
  value3: number;
}

/**
 * Helper function to create default UserData
 * 
 * @param name - GameObject name
 * @param gameEntityType - GameObject class name
 * @returns UserData with default values
 * 
 * @example
 * ```typescript
 * this.physicsBody.userData = createDefaultUserData("Platform", "Platform");
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
