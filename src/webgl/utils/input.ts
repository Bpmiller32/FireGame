/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

import Key from "./types/key";

export default class Input {
  private isLeftKeyPressed: boolean;
  private isRightKeyPressed: boolean;
  private isUpKeyPressed: boolean;
  private isDownKeyPressed: boolean;

  private isSpacebarPressed: boolean;

  private isWKeyPressed: boolean;
  private isAKeyPressed: boolean;
  private isSKeyPressed: boolean;
  private isDKeyPressed: boolean;

  private keys: Key[];

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
    ];

    // Event listeners
    window.addEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        this.onKeyDown(event.code);
      },
      false
    );
    window.addEventListener(
      "keyup",
      (event: KeyboardEvent) => {
        this.onKeyUp(event.code);
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

  public destroy() {
    // Clear event listeners
    window.removeEventListener("keydown", () => {});
    window.removeEventListener("keyup", () => {});
  }
}
