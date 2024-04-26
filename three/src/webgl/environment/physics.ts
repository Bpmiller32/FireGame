/* -------------------------------------------------------------------------- */
/*          2d Physics world that meshes are bound to, using Rapier2d         */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "../experience";
import RAPIER from "@dimforge/rapier2d";

export default class Physics {
  private experience = Experience.getInstance();
  private scene = this.experience.scene;
  private mesh?: THREE.LineSegments<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;

  public world?: RAPIER.World;

  public async configure() {
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

  public destroy() {
    // TODO
  }
}
