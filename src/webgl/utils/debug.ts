/* -------------------------------------------------------------------------- */
/*                       Dat.Gui debug panel for ThreeJs                      */
/* -------------------------------------------------------------------------- */

import dat from "dat.gui";
import Stats from "stats.js";

export default class Debug {
  public isActive: boolean;
  public ui?: dat.GUI;
  public stats?: Stats;

  constructor() {
    this.isActive = window.location.hash === "#debug";

    if (this.isActive) {
      // Debug gui
      this.ui = new dat.GUI({ width: 300, hideable: false });

      // FPS counter
      this.stats = new Stats();
      this.stats.showPanel(0);

      this.stats.dom.style.left = "";
      this.stats.dom.style.right = "315px";

      document.body.appendChild(this.stats.dom);
    }
  }

  public destroy() {
    this.ui?.destroy();
    this.stats?.dom.parentNode?.removeChild(this.stats.dom);

    // Nullify references to properties
    this.ui = null as any;
    this.stats = null as any;

    this.isActive = null as any;
  }
}