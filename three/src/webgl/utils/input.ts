/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

import Key from "./types/key";

export default class Input {
  // Setup
  public left = false;
  public right = false;
  public up = false;
  public down = false;

  public keys: Key[] = [
    {
      keyCode: "ArrowLeft",
      isPressed: (eventResult: boolean) => {
        this.left = eventResult;
      },
    },
    {
      keyCode: "ArrowRight",
      isPressed: (eventResult: boolean) => {
        this.right = eventResult;
      },
    },
    {
      keyCode: "ArrowUp",
      isPressed: (eventResult: boolean) => {
        this.up = eventResult;
      },
    },
    {
      keyCode: "ArrowDown",
      isPressed: (eventResult: boolean) => {
        this.down = eventResult;
      },
    },
  ];

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

  public destroy() {
    window.addEventListener("keydown", () => {});
    window.addEventListener("keyup", () => {});
  }
}
