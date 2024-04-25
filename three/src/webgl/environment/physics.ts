import * as THREE from "three";
import Experience from "../experience";
import RAPIER from "@dimforge/rapier2d";

export default class Physics {
  experience: Experience;
  scene?: THREE.Scene;

  world?: RAPIER.World;
  mesh?: THREE.LineSegments<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
  }

  async configure() {
    const rapier = await import("@dimforge/rapier2d");
    this.world = new rapier.World({ x: 0.0, y: -9.81 });

    this.mesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: "lime" })
    );
    this.mesh.frustumCulled = false;
    this.scene?.add(this.mesh);
  }

  update() {
    this.world?.step();

    const { vertices } = this.world!.debugRender();
    this.mesh?.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 2)
    );
    this.mesh!.visible = true;
  }
}
