import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObjectType from "../../engine/types/gameObjectType";
import GameSensor from "../../engine/entities/gameSensor";
import Camera from "../../engine/camera/camera";
import EntityType from "../types/entityType";

/**
 * CameraSensor - Adjusts the camera when the player enters its zone.
 *
 * The trigger rule (Player enters -> adjust camera) lives in the declarative
 * contact table (game/config/contactRules.ts). This class owns the target
 * position and the camera reference, and exposes the action it performs.
 */
export default class CameraSensor extends GameSensor {
  public PositionData: THREE.Vector3;
  private camera: Camera;

  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0,
    camera: Camera
  ) {
    super();

    this.PositionData = new THREE.Vector3(0, 0, 0);
    this.camera = camera;

    this.createObjectPhysics(
      EntityType.CAMERA_SENSOR,
      GameObjectType.CUBE,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.setAsSensor(true);
    // Take part in the contact table even though we define no callback here.
    this.enableContactEvents();

    // Uncomment to visualize camera sensors in debug mode
    // this.createObjectGraphicsDebug("yellow", 0.1);
  }

  /**
   * Set the camera position that should be used when player enters
   */
  public SetCameraPositionData(newPositionData: THREE.Vector3) {
    this.PositionData = newPositionData;
  }

  /** Apply this sensor's camera position. Called by the contact rule on enter. */
  public ApplyCameraOnEnter() {
    this.camera.ChangePositionY(this.PositionData.y);
  }
}
