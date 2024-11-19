import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";

export default class Sphere extends GameObject {
  constructor(
    name: string = "SphereObject",
    size: number,
    position: { x: number; y: number },
    material?: THREE.MeshBasicMaterial,
    rigidBodyType?: RAPIER.RigidBodyDesc,
    drawGraphics?: boolean
  ) {
    super();

    if (drawGraphics) {
      this.setGeometry(new THREE.SphereGeometry(size));
      this.setMaterial(material);
      this.drawGraphics = true;
    }

    this.createObject(
      name,
      GameObjectType.SPHERE,
      { width: size, height: size },
      position,
      0,
      rigidBodyType
    );

    this.syncGraphicsToPhysics();
  }

  public update() {
    this.syncGraphicsToPhysics();
  }
}