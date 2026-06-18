/* -------------------------------------------------------------------------- */
/*                         SPRITE ANIMATION STATE                             */
/* -------------------------------------------------------------------------- */
/*
 * Defines a sprite animation state for spritesheets.
 * 
 * A sprite animation consists of:
 * - indices: Which frames to show (tile numbers from the spritesheet)
 * - timing: How long to show each frame (in seconds)
 * 
 * The SpriteAnimator cycles through these frames to create animation.
 */
/* -------------------------------------------------------------------------- */

/**
 * Sprite animation state definition
 * 
 * Represents one animation (idle, run, jump, etc.) from a spritesheet.
 * 
 * @example
 * ```typescript
 * // Idle animation: tiles 0, 1, 2, 1, each shown for 0.15 seconds
 * const idleAnim: SpriteState = {
 *   indices: [0, 1, 2, 1],
 *   timing: [0.15, 0.15, 0.15, 0.15]
 * };
 * 
 * // Fast running animation: tiles 4-7, each shown for 0.08 seconds
 * const runAnim: SpriteState = {
 *   indices: [4, 5, 6, 7],
 *   timing: [0.08, 0.08, 0.08, 0.08]
 * };
 * 
 * // Apply animation
 * spriteAnimator.changeState(idleAnim);
 * ```
 */
export default interface SpriteState {
  /**
   * Array of tile indices from the spritesheet
   * 
   * Each number represents a frame to display.
   * Tiles are numbered left-to-right, top-to-bottom starting at 0.
   * 
   * @example
   * ```
   * For a 4x6 spritesheet (4 columns, 6 rows):
   * Tile indices:
   *   0  1  2  3
   *   4  5  6  7
   *   8  9 10 11
   *  12 13 14 15
   *  16 17 18 19
   *  20 21 22 23
   * ```
   */
  indicies: number[]; // Note: Keeping typo for backwards compatibility
  
  /**
   * Array of timing values in seconds
   * 
   * Each value corresponds to how long the frame at that index should be displayed.
   * Must be the same length as `indicies` array.
   * 
   * Timing is affected by timingMultiplier in SpriteAnimator (for speed control).
   * 
   * @example
   * ```typescript
   * // Show frame 0 for 0.2s, frame 1 for 0.1s, frame 2 for 0.3s
   * timing: [0.2, 0.1, 0.3]
   * ```
   */
  timing: number[];
}

/**
 * Helper function to create a sprite state with uniform timing
 * 
 * @param indices - Frame indices to display
 * @param frameDuration - How long each frame should be shown (seconds)
 * @returns A properly formatted SpriteState
 * 
 * @example
 * ```typescript
 * // All frames shown for 0.1 seconds
 * const anim = createUniformSpriteState([0, 1, 2, 3], 0.1);
 * ```
 */
export function createUniformSpriteState(indices: number[], frameDuration: number): SpriteState {
  return {
    indicies: indices,
    timing: new Array(indices.length).fill(frameDuration)
  };
}

/**
 * Helper function to create a sprite state from frame range
 * 
 * @param startFrame - First frame index (inclusive)
 * @param endFrame - Last frame index (inclusive)
 * @param frameDuration - How long each frame should be shown (seconds)
 * @returns A properly formatted SpriteState
 * 
 * @example
 * ```typescript
 * // Frames 4 through 7, each shown for 0.08 seconds
 * const runAnim = createSpriteStateFromRange(4, 7, 0.08);
 * // Results in: { indicies: [4, 5, 6, 7], timing: [0.08, 0.08, 0.08, 0.08] }
 * ```
 */
export function createSpriteStateFromRange(
  startFrame: number,
  endFrame: number,
  frameDuration: number
): SpriteState {
  const indices: number[] = [];
  for (let i = startFrame; i <= endFrame; i++) {
    indices.push(i);
  }
  return createUniformSpriteState(indices, frameDuration);
}
