import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObject from "../gameElements/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";

export default class Box extends GameObject {
  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number,
    name: string = "BoxObject",
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
