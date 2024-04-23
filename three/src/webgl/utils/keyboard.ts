/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

interface Key {
  keyCode: string;
  isDown: boolean;
}

interface KeyList {
  [key: string]: Key;
}

export default class Keyboard {
  keyStatus: KeyList;

  constructor() {
    // List of inputs here
    this.keyStatus = {
      left: { keyCode: "ArrowLeft", isDown: false },
      right: {
        keyCode: "ArrowRight",
        isDown: false,
      },
    };

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

  onKeyDown(keyName: string) {
    for (const keyIndex in this.keyStatus) {
      if (keyName == this.keyStatus[keyIndex].keyCode) {
        this.keyStatus[keyIndex].isDown = true;
        console.log(keyIndex);
      }
    }
  }

  onKeyUp(keyName: string) {
    for (const keyIndex in this.keyStatus) {
      if (keyName == this.keyStatus[keyIndex].keyCode) {
        this.keyStatus[keyIndex].isDown = false;
      }
    }
  }

  destroy() {
    window.addEventListener("keydown", () => {});
    window.addEventListener("keyup", () => {});
  }
}
