/* -------------------------------------------------------------------------- */
/*    Used to pass all time and tick related to Experience and its children   */
/* -------------------------------------------------------------------------- */

import EventEmitter from "./eventEmitter";
import EventMap from "./types/eventMap";
import * as THREE from "three";

export default class Time extends EventEmitter<EventMap> {
  // Setup
  public clock = new THREE.Clock();
  public start = this.clock.startTime;
  public elapsed = this.clock.getElapsedTime();
  public delta = 16; // 16 because at 60 fps delta for 1 frame is ~16. Avoid using 0 for bugs
  public previous = 0;

  constructor() {
    super();

    // instead of calling tick() immediately, wait 1 frame for delta time subtraction
    window.requestAnimationFrame(() => {
      this.tick();
    });
  }

  private tick() {
    this.elapsed = this.clock.getElapsedTime();
    //   Clamp this value to a minimum framerate, this way when tab is suspended the deltaTime does not get huge
    this.delta = Math.min(this.elapsed - this.previous, 1 / 30);
    this.previous = this.elapsed;

    this.emit("tick");

    window.requestAnimationFrame(() => {
      this.tick();
    });
  }

  public destroy() {
    this.off("tick");
  }
}
