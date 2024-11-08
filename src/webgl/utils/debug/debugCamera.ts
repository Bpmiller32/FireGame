import Camera from "../../camera";
import Debug from "../debug";

const debugCamera = (camera: Camera, debug: Debug) => {
  const cameraDebug = debug.ui?.addFolder("cameraDebug");
  cameraDebug?.open();
  cameraDebug?.add(camera.instance.position, "x").name("xPosition").listen();
  cameraDebug?.add(camera.instance.position, "y").name("yPosition").listen();
  cameraDebug?.add(camera.instance.position, "z").name("zPosition").listen();
};

export default debugCamera;
