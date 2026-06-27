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
    IsWKeyPressed: boolean;
    IsSKeyPressed: boolean;
    IsAKeyPressed: boolean;
    IsDKeyPressed: boolean;
    IsQKeyPressed: boolean;
    IsEKeyPressed: boolean;
    Is1KeyPressed: boolean;
    Is2KeyPressed: boolean;
    IsTildePressed: boolean;
  };
  Time: { Elapsed: number };
  SwitchCamera: () => void;
  // Camera-follow feel knobs (mirrors Camera.Tuning — see camera.ts CameraTuning).
  Tuning: {
    lookaheadX: number;
    lookaheadRate: number;
    horizontalRate: number;
    verticalRateGround: number;
    verticalRateUp: number;
    verticalRateDown: number;
    climbLeadY: number;
    fallBufferY: number;
    fallLeadY: number;
  };
};

const MOVE_SPEED = 0.5; // world units per frame for WASD pan
const ROTATE_SPEED = 0.02; // radians per frame for A/D yaw

// Adds a Camera Debug folder to dat.GUI; handles per-frame WASD/QE/12/~ camera movement.
export default class CameraDebug {
  // --- Setup ---

  // Build the Camera dat.GUI folder: transform readouts + tuning knobs.
  public Init(ui: dat.GUI, camera: Camera) {
    const folder = ui.addFolder("📷 Camera Debug");
    folder.close();

    folder.add(camera, "CameraType").name("Type").listen();
    folder.add(camera, "ManualControl").name("Manual Control").listen();
    folder
      .add(camera.Instance.position, "x")
      .name("Position X")
      .min(-1000)
      .max(1000)
      .step(0.1)
      .listen();
    folder
      .add(camera.Instance.position, "y")
      .name("Position Y")
      .min(-1000)
      .max(1000)
      .step(0.1)
      .listen();
    folder
      .add(camera.Instance.position, "z")
      .name("Position Z")
      .min(0.001)
      .max(1000)
      .step(0.1)
      .listen();
    folder
      .add(camera, "FrustumSize")
      .name("Zoom")
      .min(1)
      .max(200)
      .step(0.5)
      .listen();

    // Camera-follow feel knobs — dial the Mario-style pan live while playing.
    const tuning = folder.addFolder("🎥 Camera Tuning");
    tuning.add(camera.Tuning, "lookaheadX").name("Look-ahead X").min(0).max(30).step(0.5);
    tuning.add(camera.Tuning, "lookaheadRate").name("Look-ahead Rate").min(0.5).max(15).step(0.5);
    tuning.add(camera.Tuning, "horizontalRate").name("Horizontal Rate").min(0.5).max(20).step(0.5);
    tuning.add(camera.Tuning, "verticalRateGround").name("Vert Rate (Ground)").min(0.5).max(20).step(0.5);
    tuning.add(camera.Tuning, "verticalRateUp").name("Vert Rate (Climb Up)").min(0.5).max(20).step(0.5);
    tuning.add(camera.Tuning, "verticalRateDown").name("Vert Rate (Fall)").min(0.5).max(20).step(0.5);
    tuning.add(camera.Tuning, "climbLeadY").name("Climb Lead Y").min(0).max(10).step(0.25);
    tuning.add(camera.Tuning, "fallBufferY").name("Fall Buffer Y").min(0).max(15).step(0.25);
    tuning.add(camera.Tuning, "fallLeadY").name("Fall Lead Y").min(-10).max(10).step(0.25);
    tuning.close();
  }

  // --- Per-frame ---

  // Per-frame manual camera move: WASD/QE pan, 1/2 zoom or raise, ~ toggle.
  public Update(camera: Camera) {
    // Camera forward/right flattened onto the ground plane.
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.Instance.quaternion,
    );
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const isOrtho = camera.Instance instanceof THREE.OrthographicCamera;

    if (camera.Input?.IsWKeyPressed) {
      if (isOrtho)
        camera.Instance.position.addScaledVector(
          new THREE.Vector3(0, 1, 0),
          MOVE_SPEED,
        );
      else camera.Instance.position.addScaledVector(forward, MOVE_SPEED);
    } else if (camera.Input?.IsSKeyPressed) {
      if (isOrtho)
        camera.Instance.position.addScaledVector(
          new THREE.Vector3(0, -1, 0),
          MOVE_SPEED,
        );
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

  // Adjust orthographic frustum size and recompute its bounds.
  private zoom(camera: Camera, zoomIn: boolean) {
    let delta = camera.ZoomFactor;
    if (zoomIn) delta = -camera.ZoomFactor;
    camera.FrustumSize = Math.max(1, camera.FrustumSize + delta);
    const ortho = camera.OrthographicCamera!;
    ortho.left = (-camera.FrustumSize * camera.AspectRatio) / 2;
    ortho.right = (camera.FrustumSize * camera.AspectRatio) / 2;
    ortho.top = camera.FrustumSize / 2;
    ortho.bottom = -camera.FrustumSize / 2;
    ortho.updateProjectionMatrix();
  }
}
