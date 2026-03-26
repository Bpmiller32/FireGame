/* -------------------------------------------------------------------------- */
/*                         KEYBOARD INPUT KEY DEFINITION                      */
/* -------------------------------------------------------------------------- */
/*
 * Defines the structure for keyboard key tracking.
 * 
 * Used by the Input system to track key press/release states.
 * Each key has a keyCode and a method to update its pressed state.
 */
/* -------------------------------------------------------------------------- */

/**
 * Keyboard key definition
 * 
 * Represents a single keyboard key that the game tracks.
 * Used internally by the Input class to manage keyboard state.
 * 
 * @example
 * ```typescript
 * // Create a key object
 * const jumpKey: Key = {
 *   keyCode: ' ',  // Spacebar
 *   isPressed: (pressed: boolean) => {
 *     this.isJumpPressed = pressed;
 *   }
 * };
 * 
 * // In Input class
 * private keys: Key[] = [
 *   { keyCode: 'w', isPressed: (p) => this.isWKeyPressed = p },
 *   { keyCode: 'a', isPressed: (p) => this.isAKeyPressed = p },
 *   { keyCode: 's', isPressed: (p) => this.isSKeyPressed = p },
 *   { keyCode: 'd', isPressed: (p) => this.isDKeyPressed = p },
 *   { keyCode: ' ', isPressed: (p) => this.isSpacePressed = p }
 * ];
 * ```
 */
export default interface Key {
  /**
   * The keyboard key code to track
   * 
   * Uses KeyboardEvent.key values:
   * - Letter keys: 'a', 'b', 'c', etc.
   * - Number keys: '0', '1', '2', etc.
   * - Special keys: ' ' (space), 'Shift', 'Control', 'Alt', 'Enter', 'Escape'
   * - Arrow keys: 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
   */
  keyCode: string;
  
  /**
   * Callback function to update the pressed state
   * 
   * Called by the Input class when the key state changes.
   * The function should update the corresponding boolean flag in the Input class.
   * 
   * @param pressed - True if key was pressed, false if released
   */
  isPressed: (pressed: boolean) => void;
}

/**
 * Helper function to create a key definition
 * 
 * @param keyCode - The keyboard key code
 * @param callback - Function to call when key state changes
 * @returns A properly formatted Key object
 * 
 * @example
 * ```typescript
 * const keys = [
 *   createKey('w', (p) => this.isWPressed = p),
 *   createKey('a', (p) => this.isAPressed = p),
 *   createKey('s', (p) => this.isSPressed = p),
 *   createKey('d', (p) => this.isDPressed = p)
 * ];
 * ```
 */
export function createKey(keyCode: string, callback: (pressed: boolean) => void): Key {
  return { keyCode, isPressed: callback };
}

/**
 * Common key codes for easy reference
 * Use these constants to avoid typos in key codes
 */
export const CommonKeys = {
  // Letters
  W: 'w',
  A: 'a',
  S: 's',
  D: 'd',
  Q: 'q',
  E: 'e',
  
  // Numbers
  KEY_1: '1',
  KEY_2: '2',
  KEY_3: '3',
  KEY_4: '4',
  KEY_5: '5',
  
  // Special
  SPACE: ' ',
  SHIFT: 'Shift',
  CONTROL: 'Control',
  ALT: 'Alt',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  TILDE: '`',
  
  // Arrows
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
} as const;
