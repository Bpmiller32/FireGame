/* -------------------------------------------------------------------------- */
/*    Used to pass all window/dom element sizes to Element and its children   */
/* -------------------------------------------------------------------------- */

import Emitter from "../events/eventBus";

export default class Sizes {
  public width: number;
  public height: number;
  public pixelRatio: number;

  private _onResize: () => void;

  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this._onResize = () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.pixelRatio = Math.min(window.devicePixelRatio, 2);

      Emitter.emit("resize");
    };

    window.addEventListener("resize", this._onResize);
  }

  public destroy() {
    window.removeEventListener("resize", this._onResize);
  }
}
