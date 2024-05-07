import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObject from "./gameObject";

export default class Floor extends GameObject {
  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    material?: THREE.MeshBasicMaterial,
    name?: string,
    rigidBodyType?: RAPIER.RigidBodyDesc
  ) {
    super();

    if (!rigidBodyType) {
      rigidBodyType = RAPIER.RigidBodyDesc.fixed();
    }

    this.setGeometry(
      new THREE.BoxGeometry(size.width, size.height, size.depth)
    );
    this.setMaterial(material);
    this.setMesh();
    this.setPhysics(size, position, rigidBodyType);
    this.syncGraphicsToPhysics();

    this.body.userData = { name: name };
  }
}
