import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameObjectType from "../../utils/types/gameObjectType";
import GameSensor from "../gameComponents/gameSensor";
import Camera from "../../camera";

export default class CameraSensor extends GameSensor {
  public positionData: THREE.Vector3;

  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0
  ) {
    super();

    this.positionData = new THREE.Vector3(0, 0, 0);

    this.createObjectPhysics(
      "CameraSensor",
      GameObjectType.CUBE,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.setAsSensor(true);
    this.createObjectGraphicsDebug("yellow", 0.1);
  }

  public setCameraPositionData(newPositionData: THREE.Vector3) {
    this.positionData = newPositionData;
  }

  public update(camera: Camera) {
    this.targetIntersectionCheck();

    if (this.isIntersectingTarget) {
      camera.changePositionY(this.positionData.y);
      return;
    }
  }
}
