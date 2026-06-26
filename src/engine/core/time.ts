// Used to pass all time and tick related to Experience and its children

import * as THREE from "three";
import Emitter from "../events/eventBus";

export default class Time {
  // The fixed simulation timestep. The frame loop advances the sim in constant
  // steps of this size so physics + gameplay feel are frame-rate-independent and
  // reproducible (see Experience.onTick).
  public static readonly FixedTimestep = 1 / 60;

  public Clock: THREE.Clock;
  public Elapsed: number;
  // The SIMULATION timestep the integrators read (player/enemy/physics). The frame
  // loop sets this to FixedTimestep before each fixed step, so all integration uses
  // a constant dt regardless of display refresh rate. Never 0.
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
    // Clamp so a suspended tab doesn't produce a huge catch-up delta. This clamp
    // also bounds how many fixed steps a single frame can run — no spiral of death.
    this.FrameDelta = Math.min(this.Elapsed - this.previous, 1 / 30);
    this.previous = this.Elapsed;

    // A throw in any tick listener must NOT stop the loop: the next frame is
    // scheduled below regardless, so one transient bug can't black-screen the game.
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
