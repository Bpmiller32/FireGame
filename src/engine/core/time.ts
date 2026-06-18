/* -------------------------------------------------------------------------- */
/*    Used to pass all time and tick related to Experience and its children   */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Emitter from "../events/eventBus";

export default class Time {
  public Clock: THREE.Clock;
  public Start: number;
  public Elapsed: number;
  public Delta: number;

  private previous: number;
  private animationFrameId: number = 0;

  constructor() {
    this.Clock = new THREE.Clock();
    this.Start = this.Clock.startTime;
    this.Elapsed = this.Clock.getElapsedTime();
    this.Delta = 1 / 60; // Seconds per frame at 60fps. Do NOT use 0 — physics uses this as a timestep
    this.previous = 0;

    // Instead of calling tick() immediately, wait 1 frame for delta time subtraction
    this.animationFrameId = window.requestAnimationFrame(() => {
      this.tick();
    });
  }

  private tick() {
    this.Elapsed = this.Clock.getElapsedTime();
    // Clamp this value to a minimum framerate, this way when tab is suspended the deltaTime does not get huge
    this.Delta = Math.min(this.Elapsed - this.previous, 1 / 30);
    this.previous = this.Elapsed;

    Emitter.emit("tick");

    // Recursively keep calling tick
    this.animationFrameId = window.requestAnimationFrame(() => {
      this.tick();
    });
  }

  public Destroy() {
    // Stop the animation frame loop
    window.cancelAnimationFrame(this.animationFrameId);
  }
}
