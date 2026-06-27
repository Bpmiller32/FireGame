// Used to pass all time and tick related to Experience and its children

import * as THREE from "three";
import Emitter from "../events/eventBus";

export default class Time {
  // Fixed simulation timestep so physics + gameplay are frame-rate-independent (see Experience.onTick).
  public static readonly FixedTimestep = 1 / 60;

  public Clock: THREE.Clock;
  public Elapsed: number;
  // Simulation timestep the integrators read; set to FixedTimestep before each step. Never 0.
  public Delta: number;
  // The REAL wall-clock time since the last rendered frame (clamped). Drives the
  // fixed-step accumulator only; NOT used for integration.
  public FrameDelta: number;

  private previous: number; // last frame's elapsed time, used for delta
  private animationFrameId: number = 0;

  constructor() {
    this.Clock = new THREE.Clock();
    this.Elapsed = this.Clock.getElapsedTime();
    this.Delta = Time.FixedTimestep; // integrators default to the fixed step
    this.FrameDelta = 0;
    this.previous = 0;

    // Instead of calling tick() immediately, wait 1 frame for delta time subtraction
    this.animationFrameId = window.requestAnimationFrame(() => {
      this.tick();
    });
  }

  // per-frame: refresh elapsed, compute the clamped REAL frame delta, emit tick
  private tick() {
    this.Elapsed = this.Clock.getElapsedTime();
    // Clamp so a suspended tab can't make a huge catch-up delta (bounds fixed steps; no spiral of death).
    this.FrameDelta = Math.min(this.Elapsed - this.previous, 1 / 30);
    this.previous = this.Elapsed;

    // A throw in a tick listener must NOT stop the loop; next frame is scheduled below regardless.
    try {
      Emitter.emit("tick");
    } catch (error) {
      console.error("Frame loop error (loop continues):", error);
    }

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
