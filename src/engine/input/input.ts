/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

import Key from "../types/key";
import InputState from "../types/inputState";

export default class Input {
  private isLeftKeyPressed: boolean;
  private isRightKeyPressed: boolean;
  private isUpKeyPressed: boolean;
  private isDownKeyPressed: boolean;

  private isSpacebarPressed: boolean;

  public IsWKeyPressed: boolean;
  public IsAKeyPressed: boolean;
  public IsSKeyPressed: boolean;
  public IsDKeyPressed: boolean;

  public IsQKeyPressed: boolean;
  public IsEKeyPressed: boolean;

  public Is1KeyPressed: boolean;
  public Is2KeyPressed: boolean;

  public IsTildePressed: boolean;
  public IsF1Pressed: boolean;
  public IsF2Pressed: boolean;
  public IsF3Pressed: boolean;
  public IsF4Pressed: boolean;
  public IsF5Pressed: boolean;

  private keys: Key[];

  private onKeyDownListener: (event: KeyboardEvent) => void;
  private onKeyUpListener: (event: KeyboardEvent) => void;

  constructor() {
    this.isLeftKeyPressed = false;
    this.isRightKeyPressed = false;
    this.isUpKeyPressed = false;
    this.isDownKeyPressed = false;

    this.isSpacebarPressed = false;

    this.IsWKeyPressed = false;
    this.IsAKeyPressed = false;
    this.IsSKeyPressed = false;
    this.IsDKeyPressed = false;

    this.IsQKeyPressed = false;
    this.IsEKeyPressed = false;

    this.Is1KeyPressed = false;
    this.Is2KeyPressed = false;

    this.IsTildePressed = false;
    this.IsF1Pressed = false;
    this.IsF2Pressed = false;
    this.IsF3Pressed = false;
    this.IsF4Pressed = false;
    this.IsF5Pressed = false;

    this.keys = [
      {
        keyCode: "ArrowLeft",
        isPressed: (eventResult: boolean) => {
          this.isLeftKeyPressed = eventResult;
        },
      },
      {
        keyCode: "ArrowRight",
        isPressed: (eventResult: boolean) => {
          this.isRightKeyPressed = eventResult;
        },
      },
      {
        keyCode: "ArrowUp",
        isPressed: (eventResult: boolean) => {
          this.isUpKeyPressed = eventResult;
        },
      },
      {
        keyCode: "ArrowDown",
        isPressed: (eventResult: boolean) => {
          this.isDownKeyPressed = eventResult;
        },
      },
      {
        keyCode: "Space",
        isPressed: (eventResult: boolean) => {
          this.isSpacebarPressed = eventResult;
        },
      },

      // WASD
      {
        keyCode: "KeyW",
        isPressed: (eventResult: boolean) => {
          this.IsWKeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyA",
        isPressed: (eventResult: boolean) => {
          this.IsAKeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyS",
        isPressed: (eventResult: boolean) => {
          this.IsSKeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyD",
        isPressed: (eventResult: boolean) => {
          this.IsDKeyPressed = eventResult;
        },
      },

      // 12QE
      {
        keyCode: "Digit1",
        isPressed: (eventResult: boolean) => {
          this.Is1KeyPressed = eventResult;
        },
      },
      {
        keyCode: "Digit2",
        isPressed: (eventResult: boolean) => {
          this.Is2KeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyQ",
        isPressed: (eventResult: boolean) => {
          this.IsQKeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyE",
        isPressed: (eventResult: boolean) => {
          this.IsEKeyPressed = eventResult;
        },
      },

      // Tilde
      {
        keyCode: "Backquote",
        isPressed: (eventResult: boolean) => {
          this.IsTildePressed = eventResult;
        },
      },
      // Function Keys
      {
        keyCode: "F1",
        isPressed: (eventResult: boolean) => {
          this.IsF1Pressed = eventResult;
        },
      },
      {
        keyCode: "F2",
        isPressed: (eventResult: boolean) => {
          this.IsF2Pressed = eventResult;
        },
      },
      {
        keyCode: "F3",
        isPressed: (eventResult: boolean) => {
          this.IsF3Pressed = eventResult;
        },
      },
      {
        keyCode: "F4",
        isPressed: (eventResult: boolean) => {
          this.IsF4Pressed = eventResult;
        },
      },
      {
        keyCode: "F5",
        isPressed: (eventResult: boolean) => {
          this.IsF5Pressed = eventResult;
        },
      },
    ];

    // Store bound references so they can be removed in destroy()
    this.onKeyDownListener = (event: KeyboardEvent) => this.onKeyDown(event.code);
    this.onKeyUpListener = (event: KeyboardEvent) => this.onKeyUp(event.code);

    window.addEventListener("keydown", this.onKeyDownListener, false);
    window.addEventListener("keyup", this.onKeyUpListener, false);
  }

  private onKeyDown(keyName: string) {
    for (const keyIndex in this.keys) {
      if (keyName == this.keys[keyIndex].keyCode) {
        this.keys[keyIndex].isPressed(true);
      }
    }
  }

  private onKeyUp(keyName: string) {
    for (const keyIndex in this.keys) {
      if (keyName == this.keys[keyIndex].keyCode) {
        this.keys[keyIndex].isPressed(false);
      }
    }
  }

  // Check for double/exclusive inputs
  public IsLeft() {
    if (this.isLeftKeyPressed && !this.isRightKeyPressed) {
      return true;
    }
    return false;
  }
  public IsRight() {
    if (!this.isLeftKeyPressed && this.isRightKeyPressed) {
      return true;
    }
    return false;
  }
  public IsLeftRightCombo() {
    if (this.isLeftKeyPressed && this.isRightKeyPressed) {
      return true;
    }
    return false;
  }
  public IsNeitherLeftRight() {
    if (!this.isLeftKeyPressed && !this.isRightKeyPressed) {
      return true;
    }
    return false;
  }

  public IsJump() {
    if (this.isSpacebarPressed) {
      return true;
    }
    return false;
  }

  public IsUp() {
    if (this.isUpKeyPressed && !this.isDownKeyPressed) {
      return true;
    }
    return false;
  }
  public IsDown() {
    if (!this.isUpKeyPressed && this.isDownKeyPressed) {
      return true;
    }
    return false;
  }
  public IsUpDownCombo() {
    if (this.isUpKeyPressed && this.isDownKeyPressed) {
      return true;
    }
    return false;
  }
  public IsNeitherUpDown() {
    if (!this.isUpKeyPressed && !this.isDownKeyPressed) {
      return true;
    }
    return false;
  }

  /**
   * Capture the current input intent into a snapshot struct (mutated in place,
   * so existing references — e.g. dat.gui bindings — stay valid). Lets each
   * entity hold its own per-frame InputState instead of reading the live
   * device directly: the seam that later allows network/replay/AI input.
   */
  public CaptureInto(state: InputState): void {
    state.isLeft = this.IsLeft();
    state.isRight = this.IsRight();
    state.isLeftRightCombo = this.IsLeftRightCombo();
    state.isNeitherLeftRight = this.IsNeitherLeftRight();
    state.isJump = this.IsJump();
    state.isUp = this.IsUp();
    state.isDown = this.IsDown();
    state.isUpDownCombo = this.IsUpDownCombo();
    state.isNeitherUpDown = this.IsNeitherUpDown();
  }

  public Destroy() {
    window.removeEventListener("keydown", this.onKeyDownListener);
    window.removeEventListener("keyup", this.onKeyUpListener);
  }
}
