import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObjectType from "../../utils/types/gameObjectType";
import GameSensor from "../gameComponents/gameSensor";
import Camera from "../../camera";
import GameObject from "../gameComponents/gameObject";
import Player from "../player/player";

/**
 * CameraSensor - Changes camera position when player enters
 * 
 * Camera sensors now use the event-driven callback system.
 * The camera automatically adjusts when the player enters the zone!
 */
export default class CameraSensor extends GameSensor {
  public positionData: THREE.Vector3;
  private camera: Camera;

  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0,
    camera: Camera
  ) {
    super();

    this.positionData = new THREE.Vector3(0, 0, 0);
    this.camera = camera;

    this.createObjectPhysics(
      "CameraSensor",
      GameObjectType.CUBE,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.setAsSensor(true);
    
    // Uncomment to visualize camera sensors in debug mode
    // this.createObjectGraphicsDebug("yellow", 0.1);
  }

  /**
   * Set the camera position that should be used when player enters
   */
  public setCameraPositionData(newPositionData: THREE.Vector3) {
    this.positionData = newPositionData;
  }

  /**
   * SENSOR CALLBACK - Called when something enters this camera sensor
   * Automatically adjusts camera position when player enters
   */
  public onSensorEnter(other: GameObject): void {
    if (other instanceof Player) {
      console.log("📷 Player entered camera zone - adjusting camera");
      this.camera.changePositionY(this.positionData.y);
    }
  }

  /**
   * SENSOR CALLBACK - Called when something exits this camera sensor
   */
  public onSensorExit(other: GameObject): void {
    if (other instanceof Player) {
      console.log("📷 Player exited camera zone");
    }
  }
}
