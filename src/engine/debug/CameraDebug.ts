import * as THREE from "three";
import dat from "dat.gui";

// Forward type — Camera → Experience → Debug → CameraDebug → Camera would cycle.
// Top-level fields mirror the Camera class (PascalCase); the nested Time/Input
// shapes mirror their classes (Time.Elapsed, Input.IsWKeyPressed, ...).
type Camera = {
  Instance: THREE.Camera;
  CameraType: string;
  ManualControl: boolean;
  FrustumSize: number;
  ZoomFactor: number;
  AspectRatio: number;
  LastToggleTime: number;
  OrthographicCamera?: THREE.OrthographicCamera;
  Input?: {
    IsWKeyPressed: boolean; IsSKeyPressed: boolean;
    IsAKeyPressed: boolean; IsDKeyPressed: boolean;
    IsQKeyPressed: boolean; IsEKeyPressed: boolean;
    Is1KeyPressed: boolean; Is2KeyPressed: boolean;
    IsTildePressed: boolean;
  };
  Time: { Elapsed: number };
  SwitchCamera: () => void;
};

const MOVE_SPEED = 0.5;
const ROTATE_SPEED = 0.02;

/**
 * Adds a Camera Debug folder to the dat.GUI panel and handles per-frame
 * manual camera movement via WASD/QE/12/~ keys.
 */
export default class CameraDebug {
  public Init(ui: dat.GUI, camera: Camera) {
    const folder = ui.addFolder("📷 Camera Debug");
    folder.open();

    folder.add(camera, "CameraType").name("Type").listen();
    folder.add(camera, "ManualControl").name("Manual Control").listen();
    folder.add(camera.Instance.position, "x").name("Position X").min(-1000).max(1000).step(0.1).listen();
    folder.add(camera.Instance.position, "y").name("Position Y").min(-1000).max(1000).step(0.1).listen();
    folder.add(camera.Instance.position, "z").name("Position Z").min(0.001).max(1000).step(0.1).listen();
    folder.add(camera, "FrustumSize").name("Zoom").min(1).max(200).step(0.5).listen();
  }

  public Update(camera: Camera) {
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(camera.Instance.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const isOrtho = camera.Instance instanceof THREE.OrthographicCamera;

    if (camera.Input?.IsWKeyPressed) {
      if (isOrtho) camera.Instance.position.addScaledVector(new THREE.Vector3(0, 1, 0), MOVE_SPEED);
      else camera.Instance.position.addScaledVector(forward, MOVE_SPEED);
    } else if (camera.Input?.IsSKeyPressed) {
      if (isOrtho) camera.Instance.position.addScaledVector(new THREE.Vector3(0, -1, 0), MOVE_SPEED);
      else camera.Instance.position.addScaledVector(forward, -MOVE_SPEED);
    } else if (camera.Input?.IsAKeyPressed) {
      if (isOrtho) camera.Instance.position.addScaledVector(right, -MOVE_SPEED);
      else camera.Instance.rotateY(ROTATE_SPEED);
    } else if (camera.Input?.IsDKeyPressed) {
      if (isOrtho) camera.Instance.position.addScaledVector(right, MOVE_SPEED);
      else camera.Instance.rotateY(-ROTATE_SPEED);
    } else if (camera.Input?.IsQKeyPressed && !isOrtho) {
      camera.Instance.position.addScaledVector(right, -MOVE_SPEED);
    } else if (camera.Input?.IsEKeyPressed && !isOrtho) {
      camera.Instance.position.addScaledVector(right, MOVE_SPEED);
    } else if (camera.Input?.Is1KeyPressed) {
      if (isOrtho) this.zoom(camera, true);
      else camera.Instance.position.y += MOVE_SPEED;
    } else if (camera.Input?.Is2KeyPressed) {
      if (isOrtho) this.zoom(camera, false);
      else camera.Instance.position.y -= MOVE_SPEED;
    }

    if (
      camera.Input?.IsTildePressed &&
      camera.Time.Elapsed - camera.LastToggleTime >= 0.25
    ) {
      camera.SwitchCamera();
      camera.LastToggleTime = camera.Time.Elapsed;
      console.log(`📷 Switched to ${camera.CameraType} camera`);
    }
  }

  private zoom(camera: Camera, zoomIn: boolean) {
    camera.FrustumSize = Math.max(
      1,
      camera.FrustumSize + (zoomIn ? -camera.ZoomFactor : camera.ZoomFactor)
    );
    const ortho = camera.OrthographicCamera!;
    ortho.left = (-camera.FrustumSize * camera.AspectRatio) / 2;
    ortho.right = (camera.FrustumSize * camera.AspectRatio) / 2;
    ortho.top = camera.FrustumSize / 2;
    ortho.bottom = -camera.FrustumSize / 2;
    ortho.updateProjectionMatrix();
  }
}
