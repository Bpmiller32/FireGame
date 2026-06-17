import * as THREE from "three";
import dat from "dat.gui";

// Forward type — Camera → Experience → Debug → CameraDebug → Camera would cycle.
type Camera = {
  instance: THREE.Camera;
  cameraType: string;
  manualControl: boolean;
  frustumSize: number;
  zoomFactor: number;
  aspectRatio: number;
  lastToggleTime: number;
  orthographicCamera?: THREE.OrthographicCamera;
  input?: {
    isWKeyPressed: boolean; isSKeyPressed: boolean;
    isAKeyPressed: boolean; isDKeyPressed: boolean;
    isQKeyPressed: boolean; isEKeyPressed: boolean;
    is1KeyPressed: boolean; is2KeyPressed: boolean;
    isTildePressed: boolean;
  };
  time: { elapsed: number };
  switchCamera: () => void;
};

const MOVE_SPEED = 0.5;
const ROTATE_SPEED = 0.02;

/**
 * Adds a Camera Debug folder to the dat.GUI panel and handles per-frame
 * manual camera movement via WASD/QE/12/~ keys.
 */
export default class CameraDebug {
  public init(ui: dat.GUI, camera: Camera) {
    const folder = ui.addFolder("📷 Camera Debug");
    folder.open();

    folder.add(camera, "cameraType").name("Type").listen();
    folder.add(camera, "manualControl").name("Manual Control").listen();
    folder.add(camera.instance.position, "x").name("Position X").min(-1000).max(1000).step(0.1).listen();
    folder.add(camera.instance.position, "y").name("Position Y").min(-1000).max(1000).step(0.1).listen();
    folder.add(camera.instance.position, "z").name("Position Z").min(0.001).max(1000).step(0.1).listen();
    folder.add(camera, "frustumSize").name("Zoom").min(1).max(200).step(0.5).listen();
  }

  public update(camera: Camera) {
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(camera.instance.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const isOrtho = camera.instance instanceof THREE.OrthographicCamera;

    if (camera.input?.isWKeyPressed) {
      if (isOrtho) camera.instance.position.addScaledVector(new THREE.Vector3(0, 1, 0), MOVE_SPEED);
      else camera.instance.position.addScaledVector(forward, MOVE_SPEED);
    } else if (camera.input?.isSKeyPressed) {
      if (isOrtho) camera.instance.position.addScaledVector(new THREE.Vector3(0, -1, 0), MOVE_SPEED);
      else camera.instance.position.addScaledVector(forward, -MOVE_SPEED);
    } else if (camera.input?.isAKeyPressed) {
      if (isOrtho) camera.instance.position.addScaledVector(right, -MOVE_SPEED);
      else camera.instance.rotateY(ROTATE_SPEED);
    } else if (camera.input?.isDKeyPressed) {
      if (isOrtho) camera.instance.position.addScaledVector(right, MOVE_SPEED);
      else camera.instance.rotateY(-ROTATE_SPEED);
    } else if (camera.input?.isQKeyPressed && !isOrtho) {
      camera.instance.position.addScaledVector(right, -MOVE_SPEED);
    } else if (camera.input?.isEKeyPressed && !isOrtho) {
      camera.instance.position.addScaledVector(right, MOVE_SPEED);
    } else if (camera.input?.is1KeyPressed) {
      if (isOrtho) this._zoom(camera, true);
      else camera.instance.position.y += MOVE_SPEED;
    } else if (camera.input?.is2KeyPressed) {
      if (isOrtho) this._zoom(camera, false);
      else camera.instance.position.y -= MOVE_SPEED;
    }

    if (
      camera.input?.isTildePressed &&
      camera.time.elapsed - camera.lastToggleTime >= 0.25
    ) {
      camera.switchCamera();
      camera.lastToggleTime = camera.time.elapsed;
      console.log(`📷 Switched to ${camera.cameraType} camera`);
    }
  }

  private _zoom(camera: Camera, zoomIn: boolean) {
    camera.frustumSize = Math.max(
      1,
      camera.frustumSize + (zoomIn ? -camera.zoomFactor : camera.zoomFactor)
    );
    const ortho = camera.orthographicCamera!;
    ortho.left = (-camera.frustumSize * camera.aspectRatio) / 2;
    ortho.right = (camera.frustumSize * camera.aspectRatio) / 2;
    ortho.top = camera.frustumSize / 2;
    ortho.bottom = -camera.frustumSize / 2;
    ortho.updateProjectionMatrix();
  }
}
