import * as THREE from "three";
import Camera from "../../camera";
import Debug from "../debug";

export const debugCamera = (camera: Camera, debug: Debug) => {
  const cameraDebug = debug.ui?.addFolder("cameraDebug");
  cameraDebug?.open();
  cameraDebug?.add(camera, "cameraType").name("type").listen();
  cameraDebug
    ?.add(camera.instance.position, "x")
    .name("xPosition")
    .min(0.001)
    .step(0.001)
    .listen();
  cameraDebug
    ?.add(camera.instance.position, "y")
    .name("yPosition")
    .min(0.001)
    .step(0.001)
    .listen();
  cameraDebug
    ?.add(camera.instance.position, "z")
    .name("zPosition")
    .min(0.001)
    .step(0.001)
    .listen();
  cameraDebug
    ?.add(camera, "frustumSize")
    .name("zoom")
    .min(0.001)
    .step(0.001)
    .listen();
};

export const debugCameraUpdate = (camera: Camera) => {
  const moveSpeed = 0.5;
  const rotateSpeed = 0.02;

  // Get the forward direction based on the camera's current rotation
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
    camera.instance.quaternion
  );
  forward.y = 0;
  forward.normalize();

  // Get the right direction (perpendicular to forward)
  const right = new THREE.Vector3()
    .crossVectors(forward, new THREE.Vector3(0, 1, 0))
    .normalize();

  // Helper functions for perspective camera movement
  const movePerspective = (direction: THREE.Vector3, speed: number) => {
    camera.instance.position.addScaledVector(direction, speed);
  };

  // Helper functions for perspective camera rotation
  const rotatePerspective = (angle: number) => {
    camera.instance.rotateY(angle);
  };

  // Helper functions for orthographic camera movement
  const moveOrthographic = (direction: THREE.Vector3, speed: number) => {
    camera.instance.position.addScaledVector(direction, speed);
  };

  // Helper functions for orthographic camera zoom
  const zoomOrthographic = (zoomIn: boolean) => {
    camera.frustumSize = Math.max(
      1,
      camera.frustumSize + (zoomIn ? -camera.zoomFactor : camera.zoomFactor)
    );

    // Update frustum dimensions for orthographic camera
    camera.orthographicCamera!.left =
      (-camera.frustumSize * camera.aspectRatio) / 2;
    camera.orthographicCamera!.right =
      (camera.frustumSize * camera.aspectRatio) / 2;
    camera.orthographicCamera!.top = camera.frustumSize / 2;
    camera.orthographicCamera!.bottom = -camera.frustumSize / 2;

    // Apply changes
    camera.orthographicCamera!.updateProjectionMatrix();
  };

  // Movement input section
  if (camera.input?.isWKeyPressed) {
    if (camera.instance instanceof THREE.OrthographicCamera) {
      moveOrthographic(new THREE.Vector3(0, moveSpeed, 0), moveSpeed); // Move up for orthographic
    } else {
      movePerspective(forward, moveSpeed); // Move forward for perspective
    }
  } else if (camera.input?.isSKeyPressed) {
    if (camera.instance instanceof THREE.OrthographicCamera) {
      moveOrthographic(new THREE.Vector3(0, -moveSpeed, 0), moveSpeed); // Move down for orthographic
    } else {
      movePerspective(forward, -moveSpeed); // Move backward for perspective
    }
  } else if (camera.input?.isAKeyPressed) {
    if (camera.instance instanceof THREE.OrthographicCamera) {
      moveOrthographic(right, -moveSpeed); // Strafe left for orthographic
    } else {
      rotatePerspective(rotateSpeed); // Rotate left for perspective
    }
  } else if (camera.input?.isDKeyPressed) {
    if (camera.instance instanceof THREE.OrthographicCamera) {
      moveOrthographic(right, moveSpeed); // Strafe right for orthographic
    } else {
      rotatePerspective(-rotateSpeed); // Rotate right for perspective
    }
  } else if (camera.input?.isQKeyPressed) {
    if (!(camera.instance instanceof THREE.OrthographicCamera)) {
      movePerspective(right, -moveSpeed); // Strafe left for perspective
    }
  } else if (camera.input?.isEKeyPressed) {
    if (!(camera.instance instanceof THREE.OrthographicCamera)) {
      movePerspective(right, moveSpeed); // Strafe right for perspective
    }
  } else if (camera.input?.is1KeyPressed) {
    if (camera.instance instanceof THREE.OrthographicCamera) {
      zoomOrthographic(true); // Zoom in for orthographic
    } else {
      camera.instance.position.y += moveSpeed; // Move up for perspective
    }
  } else if (camera.input?.is2KeyPressed) {
    if (camera.instance instanceof THREE.OrthographicCamera) {
      zoomOrthographic(false); // Zoom out for orthographic
    } else {
      camera.instance.position.y -= moveSpeed; // Move down for perspective
    }
  }

  // Camera switch logic
  if (
    camera.input?.isTildePressed &&
    camera.time.elapsed - camera.lastToggleTime >= 0.25
  ) {
    camera.switchCamera();
    camera.lastToggleTime = camera.time.elapsed;
  }
};
