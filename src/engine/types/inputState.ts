// InputState — per-frame snapshot of input intent, filled from an input source (keyboard/network/replay/AI). Controllers read these booleans, so the source can swap without touching movement code.
// Field names mirror the input device's intent methods, but as properties: `player.input.isLeft` not `player.input.isLeft()`.
export default interface InputState {
  // Horizontal intent (mutually-exclusive helpers mirror the input device)
  isLeft: boolean;
  isRight: boolean;
  isLeftRightCombo: boolean;
  isNeitherLeftRight: boolean;

  // Jump intent
  isJump: boolean;

  // Vertical intent (ladders)
  isUp: boolean;
  isDown: boolean;
  isUpDownCombo: boolean;
  isNeitherUpDown: boolean;
}
