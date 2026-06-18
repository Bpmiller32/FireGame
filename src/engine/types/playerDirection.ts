/* -------------------------------------------------------------------------- */
/*                          PLAYER DIRECTION CONSTANTS                        */
/* -------------------------------------------------------------------------- */
/*
 * Direction values for player movement and collision detection.
 * 
 * Uses numeric constants that work well with:
 * - Velocity calculations (multiply by direction for signed movement)
 * - Collision detection (shapecasting in specific directions)
 * - Animation states (flip sprite based on direction)
 * 
 * NEUTRAL is used when no directional input is active.
 */
/* -------------------------------------------------------------------------- */

/**
 * Player movement and collision direction constants
 * 
 * @example
 * ```typescript
 * // Apply horizontal velocity based on direction
 * velocity.x = speed * PlayerDirection.RIGHT; // Positive (right)
 * velocity.x = speed * PlayerDirection.LEFT;  // Negative (left)
 * 
 * // Shapecast for ground detection
 * const hit = shapeCast(PlayerDirection.NEUTRAL, PlayerDirection.DOWN);
 * if (hit) {
 *   player.isTouching.ground = true;
 * }
 * ```
 */
const PlayerDirection = {
  /**
   * No direction / centered
   * Used when no directional input or for vertical-only checks
   */
  NEUTRAL: 0,
  
  /**
   * Rightward direction
   * Positive X axis (+1)
   */
  RIGHT: 1,
  
  /**
   * Leftward direction
   * Negative X axis (-1)
   */
  LEFT: -1,
  
  /**
   * Upward direction
   * Positive Y axis (+1)
   * Used for jumping, climbing up, ceiling detection
   */
  UP: 1,
  
  /**
   * Downward direction
   * Negative Y axis (-1)
   * Used for falling, climbing down, ground detection
   */
  DOWN: -1,
} as const;

/**
 * Type for player direction values
 * Ensures only valid direction constants are used
 */
export type Direction = typeof PlayerDirection[keyof typeof PlayerDirection];

/**
 * Type for horizontal directions only
 * Useful for movement-specific logic
 */
export type HorizontalDirection = typeof PlayerDirection.LEFT | typeof PlayerDirection.RIGHT | typeof PlayerDirection.NEUTRAL;

/**
 * Type for vertical directions only
 * Useful for jump/fall logic
 */
export type VerticalDirection = typeof PlayerDirection.UP | typeof PlayerDirection.DOWN | typeof PlayerDirection.NEUTRAL;

/**
 * Helper function to get opposite direction
 * 
 * @param direction - The direction to flip
 * @returns The opposite direction
 * 
 * @example
 * ```typescript
 * const opposite = getOppositeDirection(PlayerDirection.RIGHT); // Returns LEFT (-1)
 * const flipped = getOppositeDirection(PlayerDirection.UP);     // Returns DOWN (-1)
 * ```
 */
export function getOppositeDirection(direction: Direction): Direction {
  if (direction === PlayerDirection.NEUTRAL) {
    return PlayerDirection.NEUTRAL;
  }
  return (direction * -1) as Direction;
}

/**
 * Helper function to check if direction is horizontal
 * 
 * @param direction - The direction to check
 * @returns True if direction is LEFT or RIGHT
 */
export function isHorizontalDirection(direction: Direction): direction is HorizontalDirection {
  return direction === PlayerDirection.LEFT || direction === PlayerDirection.RIGHT || direction === PlayerDirection.NEUTRAL;
}

/**
 * Helper function to check if direction is vertical
 * 
 * @param direction - The direction to check
 * @returns True if direction is UP or DOWN
 */
export function isVerticalDirection(direction: Direction): direction is VerticalDirection {
  return direction === PlayerDirection.UP || direction === PlayerDirection.DOWN || direction === PlayerDirection.NEUTRAL;
}

export default PlayerDirection;
