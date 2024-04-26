/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

import KeyList from "./types/keyList";

export default class Input {
  // Setup
  public keys: KeyList = {
    left: { keyCode: "ArrowLeft", isPressed: false },
    right: {
      keyCode: "ArrowRight",
      isPressed: false,
    },
    up: {
      keyCode: "ArrowUp",
      isPressed: false,
    },
    down: {
      keyCode: "ArrowDown",
      isPressed: false,
    },
  };

  constructor() {
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
        this.keys[keyIndex].isPressed = true;
      }
    }
  }

  private onKeyUp(keyName: string) {
    for (const keyIndex in this.keys) {
      if (keyName == this.keys[keyIndex].keyCode) {
        this.keys[keyIndex].isPressed = false;
      }
    }
  }

  public destroy() {
    window.addEventListener("keydown", () => {});
    window.addEventListener("keyup", () => {});
  }
}
