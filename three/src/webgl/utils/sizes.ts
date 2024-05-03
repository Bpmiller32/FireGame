/* -------------------------------------------------------------------------- */
/*    Used to pass all window/dom element sizes to Element and its children   */
/* -------------------------------------------------------------------------- */

import EventEmitter from "./eventEmitter";
import EventMap from "./types/eventMap";

export default class Sizes extends EventEmitter<EventMap> {
  public width: number;
  public height: number;
  public pixelRatio: number;

  constructor() {
    super();

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

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
