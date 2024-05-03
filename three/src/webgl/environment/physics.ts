/* -------------------------------------------------------------------------- */
/*          2d Physics world that meshes are bound to, using Rapier2d         */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "../experience";
import RAPIER from "@dimforge/rapier2d";

export default class Physics {
  private experience!: Experience;
  private scene!: THREE.Scene;

  public world!: RAPIER.World;
  private mesh?: THREE.LineSegments<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;

  // Replacement constructor to accomodate async
  public async configure() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;

    const rapier = await import("@dimforge/rapier2d");
    this.world = new rapier.World({ x: 0.0, y: -9.81 });

    if (this.experience.debug.isActive) {
      this.mesh = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: "lime" })
      );
      this.mesh.frustumCulled = false;
      this.scene?.add(this.mesh);
    }
  }

  public update() {
    this.world!.timestep = Math.min(this.experience.time!.delta, 0.1);
    this.world?.step();

    if (this.experience.debug.isActive) {
      const { vertices } = this.world!.debugRender();
      this.mesh?.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(vertices, 2)
      );
      this.mesh!.visible = true;
    }
  }
}
