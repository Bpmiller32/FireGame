/* -------------------------------------------------------------------------- */
/*    Used to pass all window/dom element sizes to Element and its children   */
/* -------------------------------------------------------------------------- */

import EventEmitter from "./eventEmitter";

export default class Sizes extends EventEmitter {
  width: number;
  height: number;
  pixelRatio: number;

  constructor() {
    super();

    // Setup
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Resize event
    window.addEventListener("resize", () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.pixelRatio = Math.min(window.devicePixelRatio, 2);

      this.trigger("resize");
    });
  }

  destroy() {
    this.off("resize");
    window.addEventListener("resize", () => {});
  }
}
