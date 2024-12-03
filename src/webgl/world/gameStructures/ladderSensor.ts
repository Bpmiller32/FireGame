import * as RAPIER from "@dimforge/rapier2d";
import GameObjectType from "../../utils/types/gameObjectType";
import GameSensor from "../gameComponents/gameSensor";

export default class LadderSensor extends GameSensor {
  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0
  ) {
    super();

    this.createObjectPhysics(
      "LadderSensor",
      GameObjectType.CUBE,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.setAsSensor(true);
    this.setLadderValue(0);

    this.createObjectGraphicsDebug("blue", 0.5);
  }

  public setLadderValue(value: number) {
    this.setObjectValue0(value);
  }

  public update() {
    this.targetIntersectionCheck();
  }
}
