import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObject from "./gameObject";

export default class Box extends GameObject {
  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    material?: THREE.MeshBasicMaterial,
    rigidBodyType?: RAPIER.RigidBodyDesc
  ) {
    super();

    if (!rigidBodyType) {
      rigidBodyType = RAPIER.RigidBodyDesc.dynamic();
    }

    this.setGeometry(new THREE.BoxGeometry(size.width, size.height));
    this.setMaterial(material);
    this.setMesh();
    this.setPhysics(size, position, rigidBodyType);
  }

  public update() {
    this.syncGraphicsToPhysics();
  }
}
