/* -------------------------------------------------------------------------- */
/*    Used to pass all window/dom element sizes to Element and its children   */
/* -------------------------------------------------------------------------- */

import EventEmitter from "./eventEmitter";
import EventMap from "./types/eventMap";

export default class Sizes extends EventEmitter<EventMap> {
  // Setup
  public width = window.innerWidth;
  public height = window.innerHeight;
  public pixelRatio = Math.min(window.devicePixelRatio, 2);

  constructor() {
    super();

    // Resize event
    window.addEventListener("resize", () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.pixelRatio = Math.min(window.devicePixelRatio, 2);

      this.emit("resize");
    });
  }

  public destroy() {
    this.off("resize");
    window.addEventListener("resize", () => {});
  }
}
