import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObjectType from "../../engine/types/gameObjectType";
import GameSensor from "../../engine/entities/gameSensor";
import Camera from "../../engine/camera/camera";
import EntityType from "../types/entityType";

// CameraSensor - repositions the camera when the player enters its zone.
// Trigger rule lives in the contact table (game/config/contactRules.ts).
export default class CameraSensor extends GameSensor {
  public PositionData: THREE.Vector3; // camera anchor to ease to on enter
  private camera: Camera; // engine camera this zone repositions

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
  }

  // Set the camera position that should be used when player enters
  public SetCameraPositionData(newPositionData: THREE.Vector3) {
    this.PositionData = newPositionData;
  }

  // Apply this sensor's camera position. Called by the contact rule on enter.
  public ApplyCameraOnEnter() {
    // Pins the camera's rest anchor to this zone's x,y. Follow levels use only Y.
    // Author the spot as `cam=x_y` on the sensor's texture.
    this.camera.SetBaselinePosition(this.PositionData.x, this.PositionData.y);
  }
}
