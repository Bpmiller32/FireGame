/* -------------------------------------------------------------------------- */
/*                            GEOMETRY TYPES                                  */
/* -------------------------------------------------------------------------- */
/*
 * Geometric shapes and time data for game calculations.
 */
/* -------------------------------------------------------------------------- */

/**
 * Rectangle bounds - Used for collision detection, UI layouts
 * 
 * @example
 * ```typescript
 * const platformBounds: Rectangle = { x: 0, y: 10, width: 20, height: 2 };
 * ```
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Time-related measurements
 * All values in seconds unless otherwise specified
 * 
 * @example
 * ```typescript
 * const timeData: TimeData = {
 *   elapsed: 45.2,    // 45.2 seconds since game start
 *   delta: 0.016,     // 16ms frame time (60 FPS)
 *   fps: 60           // Current frames per second
 * };
 * ```
 */
export interface TimeData {
  /** Current time since game start (seconds) */
  elapsed: number;
  /** Time since last frame (delta time, seconds) */
  delta: number;
  /** Current frames per second */
  fps?: number;
}
