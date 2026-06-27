// Movement-intent source (keyboard today; touch/gamepad/network/replay drop in via CaptureInto).
// Entities depend on THIS interface, not the device — swapping a source needs no entity edits.

import InputState from "./inputState";

export default interface InputSource {
  // Fill the given InputState snapshot from this source for the current frame.
  CaptureInto(state: InputState): void;
}
