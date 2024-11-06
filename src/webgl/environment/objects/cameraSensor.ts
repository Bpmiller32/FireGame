import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import GameSensor from "./gameSensor";

export default class CameraSensor extends GameSensor {
  public cameraValue: THREE.Vector3;

  constructor(
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number },
    cameraValue: THREE.Vector3,
    targetBody?: RAPIER.RigidBody
  ) {
    super(gameObjectType, size, position, targetBody);

    this.cameraValue = cameraValue;
  }
}
