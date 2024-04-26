/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

import KeyList from "./types/keyList";

export default class Input {
  // Input keys here
  public keys: KeyList = {
    left: { keyCode: "ArrowLeft", isDown: false },
    right: {
      keyCode: "ArrowRight",
      isDown: false,
    },
    up: {
      keyCode: "ArrowUp",
      isDown: false,
    },
    down: {
      keyCode: "ArrowDown",
      isDown: false,
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
        this.keys[keyIndex].isDown = true;
      }
    }
  }

  private onKeyUp(keyName: string) {
    for (const keyIndex in this.keys) {
      if (keyName == this.keys[keyIndex].keyCode) {
        this.keys[keyIndex].isDown = false;
      }
    }
  }

  public getDirection() {
    if (this.keys.left.isDown && !this.keys.right.isDown) {
      return -1;
    }
    if (!this.keys.left.isDown && this.keys.right.isDown) {
      return 1;
    }

    return 0;
  }

  public getJump() {
    if (this.keys.up.isDown && !this.keys.down.isDown) {
      return true;
    }

    return false;
  }

  public destroy() {
    window.addEventListener("keydown", () => {});
    window.addEventListener("keyup", () => {});
  }
}
