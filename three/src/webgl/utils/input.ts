/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

import Key from "./types/key";

export default class Input {
  public isLeftKeyPressed: boolean;
  public isRightKeyPressed: boolean;
  public isUpKeyPressed: boolean;
  public isDownKeyPressed: boolean;

  public keys: Key[];

  constructor() {
    this.isLeftKeyPressed = false;
    this.isRightKeyPressed = false;
    this.isUpKeyPressed = false;
    this.isDownKeyPressed = false;

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
    ];

    // Event listeners
    window.addEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        this.onKeyDown(event.key);
      },
      false
    );
    window.addEventListener(
      "keyup",
      (event: KeyboardEvent) => {
        this.onKeyUp(event.key);
      },
      false
    );
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

  public destroy() {
    window.addEventListener("keydown", () => {});
    window.addEventListener("keyup", () => {});
  }
}
