import * as RAPIER from "@dimforge/rapier2d";
import GameObjectType from "../../utils/types/gameObjectType";
import GameSensor from "../gameComponents/gameSensor";

export default class Teleporter extends GameSensor {
  private positionData: RAPIER.Vector2;

  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0
  ) {
    super();

    this.createObjectPhysics(
      "Teleporter",
      GameObjectType.SPHERE,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.positionData = new RAPIER.Vector2(0, 0);

    this.setAsSensor(true);
    this.setTeleportPosition(0, 0);

    this.createObjectGraphicsDebug("teal", 0.1);
  }

  public setTeleportPosition(x: number, y: number) {
    this.setObjectValue0(x);
    this.setObjectValue1(y);

    this.positionData = new RAPIER.Vector2(x, y);
  }

  public update() {
    const foundCollider = this.anyIntersectionCheck();

    if (!foundCollider) {
      return;
    }

    foundCollider.parent()?.setTranslation(this.positionData, true);
  }
}
