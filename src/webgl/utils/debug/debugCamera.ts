import Camera from "../../camera";
import Debug from "../debug";

export const debugCamera = (camera: Camera, debug: Debug) => {
  const cameraDebug = debug.ui?.addFolder("cameraDebug");
  cameraDebug?.open();
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
};

export const debugCameraUpdate = (camera: Camera) => {
  if (camera.input?.isWKeyPressed) {
    camera.instance.position.set(
      camera.instance.position.x,
      camera.instance.position.y + 0.5,
      camera.instance.position.z
    );
    return;
  }

  if (camera.input?.isSKeyPressed) {
    camera.instance.position.set(
      camera.instance.position.x,
      camera.instance.position.y - 0.5,
      camera.instance.position.z
    );
    return;
  }

  if (camera.input?.isAKeyPressed) {
    camera.instance.position.set(
      camera.instance.position.x - 0.5,
      camera.instance.position.y,
      camera.instance.position.z
    );
    return;
  }

  if (camera.input?.isDKeyPressed) {
    camera.instance.position.set(
      camera.instance.position.x + 0.5,
      camera.instance.position.y,
      camera.instance.position.z
    );
    return;
  }

  if (camera.input?.isQKeyPressed) {
    camera.instance.rotateY(0.01);
    return;
  }
  if (camera.input?.isEKeyPressed) {
    camera.instance.rotateY(-0.01);
    return;
  }
};
