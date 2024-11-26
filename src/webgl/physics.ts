/* -------------------------------------------------------------------------- */
/*          2d Physics world that meshes are bound to, using Rapier2d         */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import RAPIER from "@dimforge/rapier2d";
import Debug from "./utils/debug";
import { debugPhysics, debugPhysicsUpdate } from "./utils/debug/debugPhysics";
import Emitter from "./utils/eventEmitter";

export default class Physics {
  private experience!: Experience;
  private debug?: Debug;
  public scene!: THREE.Scene;

  public mesh?: THREE.LineSegments<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;

  public world!: RAPIER.World;
  public isPaused!: boolean;

  public renderObjectCount!: number;
  public phyiscsObjectCount!: number;

  // Replacement constructor to accomodate async
  public async configure() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;

    const rapier = await import("@dimforge/rapier2d");
    this.world = new rapier.World({ x: 0.0, y: -9.81 });
    this.isPaused = false;

    // Events
    Emitter.on("gameStart", () => {
      this.isPaused = false;
    });
    Emitter.on("gameOver", () => {
      this.isPaused = true;
    });
    Emitter.on("gameReset", () => {
      this.isPaused = false;
    });

    // Debug
    if (this.experience.debug.isActive) {
      this.debug = this.experience.debug;
      debugPhysics(this, this.debug);
    }
  }

  public update() {
    if (this.isPaused) {
      return;
    }

    // Set the physics simulation timestep, advance the simulation one step
    this.world.timestep = Math.min(this.experience.time.delta, 0.1);
    this.world.step();

    // Run debug physics logic if needed
    if (this.debug) {
      debugPhysicsUpdate(this);
    }
  }

  public destroy() {
    // Dispose of the Rapier world
    this.world.free();

    // Dispose of the debug mesh if it exists
    if (this.mesh) {
      // Remove the mesh from the scene
      this.scene.remove(this.mesh);

      // Dispose of the geometry and material
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
