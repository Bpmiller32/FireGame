/* -------------------------------------------------------------------------- */
/*        Maps engine F-key device state to this game's flow events           */
/* -------------------------------------------------------------------------- */

import Emitter from "../../engine/events/eventBus";
import Input from "../../engine/input/input";

/**
 * The engine Input only exposes HELD-state booleans (isF1Pressed, etc.); it
 * stays pure and names no game events. This game-side binding watches those
 * booleans each frame, detects the press EDGE itself (a false->true transition
 * since last frame), and emits the matching game event once per press:
 *   F1 -> "gameReset", F2 -> "switchLevel", F3 -> "manualCameraControl".
 * Plain old-school edge detection: remember last frame's three booleans.
 */
export default class InputBindings {
  private input: Input;

  private wasF1Pressed: boolean;
  private wasF2Pressed: boolean;
  private wasF3Pressed: boolean;

  constructor(input: Input) {
    this.input = input;

    this.wasF1Pressed = false;
    this.wasF2Pressed = false;
    this.wasF3Pressed = false;
  }

  public Update() {
    // F1 -> gameReset
    if (this.input.IsF1Pressed && !this.wasF1Pressed) {
      Emitter.emit("gameReset");
    }
    this.wasF1Pressed = this.input.IsF1Pressed;

    // F2 -> switchLevel
    if (this.input.IsF2Pressed && !this.wasF2Pressed) {
      Emitter.emit("switchLevel");
    }
    this.wasF2Pressed = this.input.IsF2Pressed;

    // F3 -> manualCameraControl
    if (this.input.IsF3Pressed && !this.wasF3Pressed) {
      Emitter.emit("manualCameraControl");
    }
    this.wasF3Pressed = this.input.IsF3Pressed;
  }
}
