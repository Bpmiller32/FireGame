/* -------------------------------------------------------------------------- */
/*    Used to pass all window/dom element sizes to Element and its children   */
/* -------------------------------------------------------------------------- */

import Emitter from "../events/eventBus";

export default class Sizes {
  public Width: number;
  public Height: number;
  public PixelRatio: number;

  private onResize: () => void;

  constructor() {
    this.Width = window.innerWidth;
    this.Height = window.innerHeight;
    this.PixelRatio = Math.min(window.devicePixelRatio, 2);

    this.onResize = () => {
      this.Width = window.innerWidth;
      this.Height = window.innerHeight;
      this.PixelRatio = Math.min(window.devicePixelRatio, 2);

      Emitter.emit("resize");
    };

    window.addEventListener("resize", this.onResize);
  }

  public Destroy() {
    window.removeEventListener("resize", this.onResize);
  }
}
