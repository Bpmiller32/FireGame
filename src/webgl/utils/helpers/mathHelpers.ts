/* -------------------------------------------------------------------------- */
/*                          MATH HELPER FUNCTIONS                             */
/* -------------------------------------------------------------------------- */
/*
 * Generic math utility functions used throughout the game.
 * Pure functions with no dependencies on game state.
 */
/* -------------------------------------------------------------------------- */

/**
 * Moves a value towards a target by a maximum delta
 * 
 * Useful for smooth interpolation and damping effects.
 * 
 * @param current - The current value
 * @param target - The target value to move towards
 * @param maxDelta - The maximum change that can be applied
 * @returns The new value after moving towards target
 * 
 * @example
 * ```typescript
 * // Smoothly move player velocity towards target speed
 * const currentSpeed = 5;
 * const targetSpeed = 10;
 * const acceleration = 2;
 * 
 * const newSpeed = moveTowards(currentSpeed, targetSpeed, acceleration);
 * // Result: 7 (moved 2 units towards 10)
 * 
 * // If close enough, snaps to target
 * const almostThere = moveTowards(9.5, 10, 2);
 * // Result: 10 (snapped to target since difference < maxDelta)
 * ```
 */
export function moveTowards(
  current: number,
  target: number,
  maxDelta: number
): number {
  // If already at target or close enough, return target
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  // Move towards target by maxDelta
  return current + Math.sign(target - current) * maxDelta;
}

/**
 * Converts radians to degrees
 * 
 * @param radians - Angle in radians
 * @returns Angle in degrees
 * 
 * @example
 * ```typescript
 * const degrees = radiansToDegrees(Math.PI);     // 180
 * const degrees2 = radiansToDegrees(Math.PI / 2); // 90
 * ```
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Converts degrees to radians
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 * 
 * @example
 * ```typescript
 * const radians = degreesToRadians(180); // Math.PI
 * const radians2 = degreesToRadians(90); // Math.PI / 2
 * ```
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates if a random event should occur based on probability
 * 
 * @param probability - Probability of event occurring (0 to 1)
 * @returns true if event should occur, false otherwise
 * 
 * @example
 * ```typescript
 * // 50% chance
 * if (percentChance(0.5)) {
 *   console.log("Coin flip: Heads!");
 * }
 * 
 * // 25% chance for enemy to change direction
 * if (percentChance(0.25)) {
 *   enemy.changeDirection();
 * }
 * ```
 */
export function percentChance(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * Returns a random number between min and max (inclusive)
 * 
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random number between min and max
 * 
 * @example
 * ```typescript
 * const randomSpeed = randomRange(5, 10);      // 5.0 to 10.0
 * const randomX = randomRange(-100, 100);      // -100 to 100
 * const randomDelay = randomRange(0.5, 2.0);   // 0.5s to 2.0s
 * ```
 */
export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min and max (inclusive)
 * 
 * @param min - Minimum integer value
 * @param max - Maximum integer value
 * @returns Random integer between min and max
 * 
 * @example
 * ```typescript
 * const dice = randomInt(1, 6);           // 1, 2, 3, 4, 5, or 6
 * const enemyCount = randomInt(3, 8);     // 3 to 8 enemies
 * ```
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamps a value between min and max
 * 
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 * 
 * @example
 * ```typescript
 * const health = clamp(playerHealth, 0, 100);     // Keep health 0-100
 * const speed = clamp(velocity, -maxSpeed, maxSpeed);
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * 
 * @param start - Starting value
 * @param end - Ending value
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated value
 * 
 * @example
 * ```typescript
 * const midpoint = lerp(0, 100, 0.5);    // 50
 * const quarter = lerp(0, 100, 0.25);    // 25
 * const color = lerp(0, 255, 0.7);       // 178.5
 * ```
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
