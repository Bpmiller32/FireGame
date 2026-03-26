/* -------------------------------------------------------------------------- */
/*                           COLLISION GROUP MASKS                            */
/* -------------------------------------------------------------------------- */
/*
 * Bit masks for Rapier physics collision groups.
 * 
 * Collision groups determine which objects can collide with each other.
 * Each group is represented by a single bit in a 16-bit integer.
 * 
 * HOW IT WORKS:
 * - Each object has a "group" (what it is) and a "mask" (what it collides with)
 * - Collision occurs when: (obj1.group & obj2.mask) AND (obj2.group & obj1.mask)
 * - Use bitwise OR (|) to combine multiple groups/masks
 * 
 * EXAMPLE:
 * ```typescript
 * // Player collides with platforms and enemies
 * player.setCollisionGroup(CollisionGroups.PLAYER_BOUNDING_BOX);
 * player.setCollisionMask(CollisionGroups.PLATFORM | CollisionGroups.ENEMY);
 * 
 * // Enemy collides with player and platforms
 * enemy.setCollisionGroup(CollisionGroups.ENEMY);
 * enemy.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX | CollisionGroups.PLATFORM);
 * ```
 */
/* -------------------------------------------------------------------------- */

/**
 * Collision group bit masks
 * Each value uses binary notation (0b...) for clarity
 */
const CollisionGroups = {
  /* ===== PLAYER COLLISION GROUPS ===== */
  
  /**
   * Player's main collision box
   * Used for solid collisions with platforms and enemies
   */
  PLAYER_BOUNDING_BOX: 0b0000000000000001, // Bit 0
  
  /**
   * Player's hit detection sensor
   * Used for detecting enemy hits without blocking movement
   * This is a sensor that triggers game over on enemy contact
   */
  PLAYER_HIT_BOX: 0b0000000000000010, // Bit 1
  
  /* ===== ENEMY COLLISION GROUPS ===== */
  
  /**
   * Enemy collision group
   * Collides with player (both bounding box and hit box) and platforms
   */
  ENEMY: 0b0000000000000100, // Bit 2
  
  /* ===== WORLD COLLISION GROUPS ===== */
  
  /**
   * Platform collision group
   * Includes regular platforms, one-way platforms, walls, etc.
   */
  PLATFORM: 0b0000000000001000, // Bit 3
  
  /* ===== SPECIAL MASKS ===== */
  
  /**
   * Collides with all groups
   * Use sparingly - can cause performance issues
   */
  ALL: 0b1111111111111111,
  
  /**
   * Default collision group
   * Equivalent to ALL - collides with everything
   */
  DEFAULT: 0b1111111111111111,
  
  /**
   * Collides with nothing
   * Useful for disabled objects or pure sensors
   */
  NONE: 0b0000000000000000,
} as const;

/**
 * Type for collision group values
 * Ensures type safety when using collision groups
 */
export type CollisionGroup = typeof CollisionGroups[keyof typeof CollisionGroups];

export default CollisionGroups;
