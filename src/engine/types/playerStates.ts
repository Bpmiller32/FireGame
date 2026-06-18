/* -------------------------------------------------------------------------- */
/*                            PLAYER STATE MACHINE                            */
/* -------------------------------------------------------------------------- */
/*
 * Defines all possible states for the player character.
 * 
 * The player state machine controls:
 * - Animation selection (idle, running, jumping animations)
 * - Physics behavior (ground friction, air control, climbing)
 * - Input handling (what actions are available in each state)
 * - State transitions (when to switch between states)
 * 
 * Each state has an associated handler function in player/state/
 */
/* -------------------------------------------------------------------------- */

/**
 * Player state constants
 * 
 * @example
 * ```typescript
 * // Check player state
 * if (player.state === PlayerStates.IDLE) {
 *   // Player is standing still
 * }
 * 
 * // Transition to new state
 * if (input.isJumpPressed && isTouching.ground) {
 *   player.state = PlayerStates.JUMPING;
 *   player.timeJumpWasEntered = time.elapsed;
 * }
 * ```
 */
const PlayerStates = {
  /**
   * Player is standing still on the ground
   * 
   * Transitions to:
   * - RUNNING: When horizontal input is pressed
   * - JUMPING: When jump is pressed
   * - FALLING: When leaving ground (walked off edge)
   * - CLIMBING: When on ladder and up/down pressed
   */
  IDLE: "idle",
  
  /**
   * Player is moving horizontally on the ground
   * 
   * Transitions to:
   * - IDLE: When horizontal input is released
   * - JUMPING: When jump is pressed
   * - FALLING: When leaving ground
   * - CLIMBING: When on ladder and up/down pressed
   */
  RUNNING: "running",
  
  /**
   * Player is ascending (going up)
   * 
   * Transitions to:
   * - FALLING: When jump button released or max jump time reached
   * - IDLE/RUNNING: When landing on ground
   * - CLIMBING: When on ladder and up/down pressed
   */
  JUMPING: "jumping",
  
  /**
   * Player is descending (going down)
   * 
   * Transitions to:
   * - IDLE/RUNNING: When landing on ground
   * - CLIMBING: When on ladder and up/down pressed
   */
  FALLING: "falling",
  
  /**
   * Player is on a ladder
   * 
   * Transitions to:
   * - IDLE: When reaching ladder top/bottom
   * - FALLING: When leaving ladder
   * - JUMPING: When jump is pressed while on ladder
   */
  CLIMBING: "climbing",
} as const;

/**
 * Type for player state values
 * Ensures only valid states are used
 */
export type PlayerState = typeof PlayerStates[keyof typeof PlayerStates];

/**
 * Helper function to check if player is airborne
 * 
 * @param state - The player's current state
 * @returns True if player is jumping or falling
 * 
 * @example
 * ```typescript
 * if (isAirborne(player.state)) {
 *   // Apply air control physics
 *   applyAirDrag();
 * }
 * ```
 */
export function isAirborne(state: PlayerState): boolean {
  return state === PlayerStates.JUMPING || state === PlayerStates.FALLING;
}

/**
 * Helper function to check if player is grounded
 * 
 * @param state - The player's current state
 * @returns True if player is idle or running
 * 
 * @example
 * ```typescript
 * if (isGrounded(player.state)) {
 *   // Reset double jump, apply ground friction
 *   player.canDoubleJump = true;
 * }
 * ```
 */
export function isGrounded(state: PlayerState): boolean {
  return state === PlayerStates.IDLE || state === PlayerStates.RUNNING;
}

/**
 * Helper function to check if player is moving horizontally
 * 
 * @param state - The player's current state
 * @returns True if player is running
 */
export function isMovingHorizontally(state: PlayerState): boolean {
  return state === PlayerStates.RUNNING;
}

/**
 * Helper function to check if player can jump
 * 
 * @param state - The player's current state
 * @param isTouchingGround - Whether player is touching ground
 * @param coyoteTimeAvailable - Whether coyote time is still active
 * @returns True if jump input should be processed
 * 
 * @example
 * ```typescript
 * if (input.isJumpPressed && canJump(player.state, player.isTouching.ground, player.coyoteAvailable)) {
 *   player.state = PlayerStates.JUMPING;
 * }
 * ```
 */
export function canJump(
  state: PlayerState,
  isTouchingGround: boolean,
  coyoteTimeAvailable: boolean
): boolean {
  // Can jump if grounded or if coyote time is active
  return isGrounded(state) || (isAirborne(state) && (isTouchingGround || coyoteTimeAvailable));
}

export default PlayerStates;
