import Camera from "../../camera";

const debugCamera = (camera: Camera) => {
  camera.debug = camera.experience.debug;
  camera.input = camera.experience.input;

  const cameraDebug = camera.debug.ui?.addFolder("cameraDebug");
  cameraDebug?.open();
  cameraDebug?.add(camera.instance.position, "x").name("xPosition").listen();
  cameraDebug
    ?.add(camera.instance.position, "y")
    .name("yPosition")
    .min(0.001)
    .step(0.001)
    .listen();
  cameraDebug?.add(camera.instance.position, "z").name("zPosition").listen();
};
export default debugCamera;
