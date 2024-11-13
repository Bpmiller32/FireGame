import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";

export default class Cube extends GameObject {
  constructor(
    name: string = "CubeObject",
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number,
    drawGraphics?: boolean,
    material?: THREE.MeshBasicMaterial,
    rigidBodyType?: RAPIER.RigidBodyDesc
  ) {
    super();

    if (drawGraphics) {
      this.setGeometry(
        new THREE.BoxGeometry(size.width, size.height, size.depth)
      );
      this.setMaterial(material);
    }

    this.createObject(
      name,
      GameObjectType.CUBE,
      size,
      position,
      rotation,
      rigidBodyType
    );
    this.syncGraphicsToPhysics();
  }

  public update() {
    this.syncGraphicsToPhysics();
  }
}
