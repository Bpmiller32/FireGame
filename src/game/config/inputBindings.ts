// Maps engine F-key device state to this game's flow events

import Emitter from "../../engine/events/eventBus";
import Input from "../../engine/input/input";

// Engine Input exposes only HELD-state booleans and names no game events.
// This watches them each frame, detects the press edge (false->true since last frame),
// and emits the matching game event once per press: remember last frame's booleans.
// F1 -> "gameReset", F2 -> "switchLevel", F3 -> "manualCameraControl".
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

  // per-frame: emit a game event on each F-key press edge
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
