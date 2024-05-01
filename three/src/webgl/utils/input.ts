/* -------------------------------------------------------------------------- */
/*                    Used to handle keyboard input events                    */
/* -------------------------------------------------------------------------- */

import Key from "./types/key";

export default class Input {
  // Setup
  public isLeftPressed = false;
  public isrightPressed = false;
  public isUpPressed = false;
  public isDownPressed = false;

  public keys: Key[] = [
    {
      keyCode: "ArrowLeft",
      isPressed: (eventResult: boolean) => {
        this.isLeftPressed = eventResult;
      },
    },
    {
      keyCode: "ArrowRight",
      isPressed: (eventResult: boolean) => {
        this.isrightPressed = eventResult;
      },
    },
    {
      keyCode: "ArrowUp",
      isPressed: (eventResult: boolean) => {
        this.isUpPressed = eventResult;
      },
    },
    {
      keyCode: "ArrowDown",
      isPressed: (eventResult: boolean) => {
        this.isDownPressed = eventResult;
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

  public inputLeft() {}
  public inputRight() {}
  public inputUp() {}
  public inputDown() {}

  public destroy() {
    window.addEventListener("keydown", () => {});
    window.addEventListener("keyup", () => {});
  }
}
