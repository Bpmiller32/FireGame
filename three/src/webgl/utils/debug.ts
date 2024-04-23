/* -------------------------------------------------------------------------- */
/*                       Dat.Gui debug panel for ThreeJs                      */
/* -------------------------------------------------------------------------- */

import dat from "dat.gui";
import Stats from "stats.js";

export default class Debug {
  isActive: boolean;
  ui?: dat.GUI;
  stats?: Stats;

  constructor() {
    this.isActive = window.location.hash === "#debug";

    if (this.isActive) {
      this.ui = new dat.GUI();

      this.stats = new Stats();
      this.stats.showPanel(0);
      document.body.appendChild(this.stats.dom);
    }
  }

  destroy() {
    this.ui?.destroy();
  }
}
