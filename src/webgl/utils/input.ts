/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

import Emitter from "./eventEmitter";
import Key from "./types/key";
import InputState from "./types/inputState";

export default class Input {
  private isLeftKeyPressed: boolean;
  private isRightKeyPressed: boolean;
  private isUpKeyPressed: boolean;
  private isDownKeyPressed: boolean;

  private isSpacebarPressed: boolean;

  public isWKeyPressed: boolean;
  public isAKeyPressed: boolean;
  public isSKeyPressed: boolean;
  public isDKeyPressed: boolean;

  public isQKeyPressed: boolean;
  public isEKeyPressed: boolean;

  public is1KeyPressed: boolean;
  public is2KeyPressed: boolean;

  public isTildePressed: boolean;
  public isF1Pressed: boolean;
  public isF2Pressed: boolean;
  public isF3Pressed: boolean;
  public isF4Pressed: boolean;
  public isF5Pressed: boolean;

  private keys: Key[];
  private keyPressStates: Map<string, boolean>;

  private _onKeyDown: (event: KeyboardEvent) => void;
  private _onKeyUp: (event: KeyboardEvent) => void;

  constructor() {
    this.isLeftKeyPressed = false;
    this.isRightKeyPressed = false;
    this.isUpKeyPressed = false;
    this.isDownKeyPressed = false;

    this.isSpacebarPressed = false;

    this.isWKeyPressed = false;
    this.isAKeyPressed = false;
    this.isSKeyPressed = false;
    this.isDKeyPressed = false;

    this.isQKeyPressed = false;
    this.isEKeyPressed = false;

    this.is1KeyPressed = false;
    this.is2KeyPressed = false;

    this.isTildePressed = false;
    this.isF1Pressed = false;
    this.isF2Pressed = false;
    this.isF3Pressed = false;
    this.isF4Pressed = false;
    this.isF5Pressed = false;

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
          this.isWKeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyA",
        isPressed: (eventResult: boolean) => {
          this.isAKeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyS",
        isPressed: (eventResult: boolean) => {
          this.isSKeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyD",
        isPressed: (eventResult: boolean) => {
          this.isDKeyPressed = eventResult;
        },
      },

      // 12QE
      {
        keyCode: "Digit1",
        isPressed: (eventResult: boolean) => {
          this.is1KeyPressed = eventResult;
        },
      },
      {
        keyCode: "Digit2",
        isPressed: (eventResult: boolean) => {
          this.is2KeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyQ",
        isPressed: (eventResult: boolean) => {
          this.isQKeyPressed = eventResult;
        },
      },
      {
        keyCode: "KeyE",
        isPressed: (eventResult: boolean) => {
          this.isEKeyPressed = eventResult;
        },
      },

      // Tilde
      {
        keyCode: "Backquote",
        isPressed: (eventResult: boolean) => {
          this.isTildePressed = eventResult;
        },
      },
      // Function Keys
      {
        keyCode: "F1",
        isPressed: (eventResult: boolean) => {
          this.isF1Pressed = eventResult;
          this.handleSinglePress("F1", eventResult, () => {
            Emitter.emit("gameReset");
          });
        },
      },
      {
        keyCode: "F2",
        isPressed: (eventResult: boolean) => {
          this.isF2Pressed = eventResult;
          this.handleSinglePress("F2", eventResult, () => {
            Emitter.emit("switchLevel");
          });
        },
      },
      {
        keyCode: "F3",
        isPressed: (eventResult: boolean) => {
          this.isF3Pressed = eventResult;
          this.handleSinglePress("F3", eventResult, () => {
            Emitter.emit("manualCameraControl");
          });
        },
      },
      {
        keyCode: "F4",
        isPressed: (eventResult: boolean) => {
          this.isF4Pressed = eventResult;
        },
      },
      {
        keyCode: "F5",
        isPressed: (eventResult: boolean) => {
          this.isF5Pressed = eventResult;
        },
      },
    ];

    // KeyPressStates to track if key has already run
    this.keyPressStates = new Map();

    // Store bound references so they can be removed in destroy()
    this._onKeyDown = (event: KeyboardEvent) => this.onKeyDown(event.code);
    this._onKeyUp = (event: KeyboardEvent) => this.onKeyUp(event.code);

    window.addEventListener("keydown", this._onKeyDown, false);
    window.addEventListener("keyup", this._onKeyUp, false);
  }

  // Handle firing a potential function but only once
  private handleSinglePress(
    key: string,
    eventResult: boolean,
    callback: () => void
  ) {
    if (eventResult) {
      // On key press check if key is in map, add and run callback
      if (!this.keyPressStates.get(key)) {
        this.keyPressStates.set(key, true);
        callback();
      }
    } else {
      // On key release
      this.keyPressStates.set(key, false);
    }
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
  public isLeft() {
    if (this.isLeftKeyPressed && !this.isRightKeyPressed) {
      return true;
    }
    return false;
  }
  public isRight() {
    if (!this.isLeftKeyPressed && this.isRightKeyPressed) {
      return true;
    }
    return false;
  }
  public isLeftRightCombo() {
    if (this.isLeftKeyPressed && this.isRightKeyPressed) {
      return true;
    }
    return false;
  }
  public isNeitherLeftRight() {
    if (!this.isLeftKeyPressed && !this.isRightKeyPressed) {
      return true;
    }
    return false;
  }

  public isJump() {
    if (this.isSpacebarPressed) {
      return true;
    }
    return false;
  }

  public isUp() {
    if (this.isUpKeyPressed && !this.isDownKeyPressed) {
      return true;
    }
    return false;
  }
  public isDown() {
    if (!this.isUpKeyPressed && this.isDownKeyPressed) {
      return true;
    }
    return false;
  }
  public isUpDownCombo() {
    if (this.isUpKeyPressed && this.isDownKeyPressed) {
      return true;
    }
    return false;
  }
  public isNeitherUpDown() {
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
  public captureInto(state: InputState): void {
    state.isLeft = this.isLeft();
    state.isRight = this.isRight();
    state.isLeftRightCombo = this.isLeftRightCombo();
    state.isNeitherLeftRight = this.isNeitherLeftRight();
    state.isJump = this.isJump();
    state.isUp = this.isUp();
    state.isDown = this.isDown();
    state.isUpDownCombo = this.isUpDownCombo();
    state.isNeitherUpDown = this.isNeitherUpDown();
  }

  public destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }
}
