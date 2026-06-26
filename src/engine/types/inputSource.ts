// An input source the game reads movement intent from. The keyboard Input
// implements it today; a touch, gamepad, network, or replay source drops in by
// implementing CaptureInto (the per-entity InputState snapshot seam). Player and
// other controllable entities depend on THIS interface, not the concrete device —
// so swapping/adding an input source is a one-file change with no entity edits.

import InputState from "./inputState";

export default interface InputSource {
  // Fill the given InputState snapshot from this source for the current frame.
  CaptureInto(state: InputState): void;
}
