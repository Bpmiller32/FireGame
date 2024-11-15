/* -------------------------------------------------------------------------- */
/*          2d Physics world that meshes are bound to, using Rapier2d         */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import RAPIER from "@dimforge/rapier2d";

export default class Physics {
  private experience!: Experience;
  private scene!: THREE.Scene;

  private mesh?: THREE.LineSegments<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;

  public world!: RAPIER.World;
  public isPaused!: boolean;

  // Replacement constructor to accomodate async
  public async configure() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;

    const rapier = await import("@dimforge/rapier2d");
    this.world = new rapier.World({ x: 0.0, y: -9.81 });
    this.isPaused = false;

    // Set debug mesh if nessasary
    if (this.experience.debug.isActive) {
      this.mesh = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: "lime" })
      );
      this.mesh.frustumCulled = false;
      this.scene.add(this.mesh);
    }
  }

  public update() {
    if (this.isPaused) {
      return;
    }

    // Set the physics simulation timestep, advance the simulation one step
    this.world.timestep = Math.min(this.experience.time.delta, 0.1);
    this.world.step();

    if (this.experience.debug.isActive) {
      // Extracts just the verticies out of the physics debug render
      const { vertices } = this.world.debugRender();

      // Sends those verticies to the vertex shader's position attribute
      this.mesh!.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(vertices, 2)
      );
      this.mesh!.visible = true;
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
