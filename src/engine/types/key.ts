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
 *   keyCode: 'Space',
 *   isPressed: (pressed: boolean) => {
 *     this.isJumpPressed = pressed;
 *   }
 * };
 *
 * // In Input class
 * private keys: Key[] = [
 *   { keyCode: 'KeyW', isPressed: (p) => this.isWKeyPressed = p },
 *   { keyCode: 'KeyA', isPressed: (p) => this.isAKeyPressed = p },
 *   { keyCode: 'KeyS', isPressed: (p) => this.isSKeyPressed = p },
 *   { keyCode: 'KeyD', isPressed: (p) => this.isDKeyPressed = p },
 *   { keyCode: 'Space', isPressed: (p) => this.isSpacePressed = p }
 * ];
 * ```
 */
export default interface Key {
  /**
   * The keyboard key code to track
   *
   * Uses KeyboardEvent.code values (physical key position, layout-independent):
   * - Letter keys: 'KeyA', 'KeyB', 'KeyC', etc.
   * - Number keys: 'Digit0', 'Digit1', 'Digit2', etc.
   * - Special keys: 'Space', 'ShiftLeft', 'ControlLeft', 'AltLeft', 'Enter', 'Escape'
   * - Arrow keys: 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
   * - Function keys: 'F1', 'F2', 'F3', etc.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
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
 * Common key codes for easy reference (KeyboardEvent.code values)
 * Use these constants to avoid typos in key codes
 */
export const CommonKeys = {
  // Letters
  W: 'KeyW',
  A: 'KeyA',
  S: 'KeyS',
  D: 'KeyD',
  Q: 'KeyQ',
  E: 'KeyE',

  // Numbers
  KEY_1: 'Digit1',
  KEY_2: 'Digit2',
  KEY_3: 'Digit3',
  KEY_4: 'Digit4',
  KEY_5: 'Digit5',

  // Special
  SPACE: 'Space',
  SHIFT_LEFT: 'ShiftLeft',
  SHIFT_RIGHT: 'ShiftRight',
  CONTROL_LEFT: 'ControlLeft',
  CONTROL_RIGHT: 'ControlRight',
  ALT_LEFT: 'AltLeft',
  ALT_RIGHT: 'AltRight',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  TILDE: 'Backquote',

  // Arrows
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',

  // Function keys
  F1: 'F1',
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
} as const;
