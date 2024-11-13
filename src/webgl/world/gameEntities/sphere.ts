import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";
import CollisionGroups from "../../utils/types/collisionGroups";
import GameUtils from "../../utils/gameUtils";

export default class Sphere extends GameObject {
  constructor(
    name: string = "SphereObject",
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
      name,
      GameObjectType.SPHERE,
      { width: size, height: size },
      position,
      0,
      rigidBodyType
    );

    GameUtils.setCollisionGroup(
      this.physicsBody.collider(0),
      CollisionGroups.ENEMY
    );
    GameUtils.setCollisionMask(
      this.physicsBody.collider(0),
      CollisionGroups.PLATFORM
    );
    console.log("enemy: ", this.physicsBody.collider(0).collisionGroups());

    console.log(
      "calc enemy: ",
      GameUtils.calculateCollisionMask(
        CollisionGroups.ENEMY,
        CollisionGroups.ALL
      )
    );

    this.syncGraphicsToPhysics();
  }

  public update() {
    this.syncGraphicsToPhysics();
  }
}
