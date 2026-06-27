// Used to pass all window/dom element sizes to Experience and its children

import Emitter from "../events/eventBus";

export default class Sizes {
  public Width: number;
  public Height: number;
  public PixelRatio: number;

  private onResize: () => void; // stored handler so we can remove it later

  // capture initial size and register the resize listener
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

  // stop listening for window resize
  public Destroy() {
    window.removeEventListener("resize", this.onResize);
  }
}
