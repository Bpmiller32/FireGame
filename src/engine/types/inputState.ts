// InputState — plain per-frame snapshot of input intent, filled from an input source (keyboard today; could be network/replay/AI later). Controllers read these booleans instead of the live input device, so the input source can change without touching movement code.
// Field names mirror the input device's intent methods exactly, so a handler reads `player.input.isLeft` where it used to call `player.input.isLeft()` — same value, one less pair of parens.
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
