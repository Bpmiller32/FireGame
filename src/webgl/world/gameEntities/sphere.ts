import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObject from "../gameElements/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";

export default class Sphere extends GameObject {
  constructor(
    size: number,
    position: { x: number; y: number },
    drawGraphics?: boolean,
    material?: THREE.MeshBasicMaterial,
    rigidBodyType?: RAPIER.RigidBodyDesc
  ) {
    super();

    if (drawGraphics) {
      this.setGeometry(new THREE.SphereGeometry(size));
      this.setMaterial(material);
    }

    this.createObject(
      GameObjectType.SPHERE,
      { width: size, height: size },
      position,
      rigidBodyType
    );
    this.syncGraphicsToPhysics();
  }

  public update() {
    this.syncGraphicsToPhysics();
  }
}
