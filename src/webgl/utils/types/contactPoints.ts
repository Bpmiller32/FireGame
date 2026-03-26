/* -------------------------------------------------------------------------- */
/*                         CONTACT POINT DETECTION                            */
/* -------------------------------------------------------------------------- */
/*
 * Tracks which surfaces/objects a GameObject is currently touching.
 * 
 * Used primarily by the Player to determine:
 * - Ground contact (for jumping, landing)
 * - Wall contact (for wall sliding, blocking)
 * - Ceiling contact (for jump cancellation)
 * - Ladder contact (for climbing)
 * - Special platform types (edge platforms for animations)
 * 
 * All properties are booleans that are updated each frame during collision detection.
 */
/* -------------------------------------------------------------------------- */

/**
 * Contact points interface for GameObject collision states
 * 
 * @example
 * ```typescript
 * // In player update loop
 * if (player.isTouching.ground && !player.isTouching.ceiling) {
 *   // Player is standing on solid ground
 *   player.canJump = true;
 * }
 * 
 * if (player.isTouching.ladderCore && input.isUpPressed) {
 *   // Player can climb the ladder
 *   player.state = PlayerStates.CLIMBING;
 * }
 * ```
 */
export default interface ContactPoints {
  /* ===== BASIC COLLISION DIRECTIONS ===== */
  
  /**
   * Player is touching the ground
   * Enables jumping, resets coyote time, changes animation state
   */
  ground: boolean;
  
  /**
   * Player is touching a ceiling
   * Cancels upward velocity, prevents jumping through ceilings
   */
  ceiling: boolean;
  
  /**
   * Player is touching a wall on the left side
   * Blocks leftward movement, can enable wall slide mechanics
   */
  leftSide: boolean;
  
  /**
   * Player is touching a wall on the right side
   * Blocks rightward movement, can enable wall slide mechanics
   */
  rightSide: boolean;
  
  /* ===== SPECIAL PLATFORM TYPES ===== */
  
  /**
   * Player is on an edge platform
   * Edge platforms may have special behaviors like crumbling or bouncing
   * This flag allows triggering edge-specific animations or mechanics
   */
  edgePlatform: boolean;
  
  /* ===== LADDER COLLISION ZONES ===== */
  
  /**
   * Player is inside the core climbable area of a ladder
   * When true, player can climb up/down using directional input
   */
  ladderCore: boolean;
  
  /**
   * Player is at the top of a ladder
   * Used to transition from climbing to standing on the platform above
   */
  ladderTop: boolean;
  
  /**
   * Player is at the bottom of a ladder
   * Used to transition from climbing to standing on the ground below
   */
  ladderBottom: boolean;
  
  /* ===== DYNAMIC INDEXING ===== */
  
  /**
   * Allows dynamic property access for generic collision checking
   * Useful for loops or conditional logic based on string keys
   * 
   * @example
   * ```typescript
   * const directions = ['ground', 'ceiling', 'leftSide', 'rightSide'];
   * const touchingAny = directions.some(dir => isTouching[dir]);
   * ```
   */
  [key: string]: boolean;
}

/**
 * Helper type for contact point keys
 * Provides autocomplete and type safety when accessing contact points
 */
export type ContactPointKey = 
  | 'ground'
  | 'ceiling'
  | 'leftSide'
  | 'rightSide'
  | 'edgePlatform'
  | 'ladderCore'
  | 'ladderTop'
  | 'ladderBottom';

/**
 * Factory function to create a default ContactPoints object
 * All contact points initialized to false
 * 
 * @returns A new ContactPoints object with all values set to false
 * 
 * @example
 * ```typescript
 * this.isTouching = createDefaultContactPoints();
 * ```
 */
export function createDefaultContactPoints(): ContactPoints {
  return {
    ground: false,
    ceiling: false,
    leftSide: false,
    rightSide: false,
    edgePlatform: false,
    ladderCore: false,
    ladderTop: false,
    ladderBottom: false,
  };
}
