import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObject from "./gameObject";

export default class Sphere extends GameObject {
  constructor(
    size: number,
    position: { x: number; y: number },
    material?: THREE.MeshBasicMaterial,
    rigidBodyType?: RAPIER.RigidBodyDesc
  ) {
    super();

    if (!rigidBodyType) {
      rigidBodyType = RAPIER.RigidBodyDesc.dynamic();
    }

    this.setGeometry(new THREE.SphereGeometry(size));
    this.setMaterial(material);
    this.setMesh();
    this.setPhysics({ width: size, height: size }, position, rigidBodyType);
  }

  public update() {
    this.syncGraphicsToPhysics();
  }
}
