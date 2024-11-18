import Camera from "../../camera";
import Debug from "../debug";

export const debugCamera = (camera: Camera, debug: Debug) => {
  const cameraDebug = debug.ui?.addFolder("cameraDebug");
  cameraDebug?.open();
  cameraDebug?.add(camera.instance.position, "x").name("xPosition").listen();
  cameraDebug?.add(camera.instance.position, "y").name("yPosition").listen();
  cameraDebug?.add(camera.instance.position, "z").name("zPosition").listen();
};

export const debugCameraUpdate = (camera: Camera) => {
  if (camera.input?.isWKeyPressed) {
    camera.changePositionY(camera.instance.position.y + 1);
    return;
  }

  if (camera.input?.isSKeyPressed) {
    camera.changePositionY(camera.instance.position.y - 1);
    return;
  }
};
