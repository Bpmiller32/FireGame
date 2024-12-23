import * as RAPIER from "@dimforge/rapier2d";
import GameObjectType from "../../utils/types/gameObjectType";
import GameSensor from "../gameComponents/gameSensor";

export default class LadderSensor extends GameSensor {
  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0,
    verticies: number[] = []
  ) {
    super();

    // Determine if the platform uses complex collider with vertices or a cube shape
    const isComplexCollider = verticies.length > 0;
    let objectType;

    if (isComplexCollider) {
      objectType = GameObjectType.CONVEX_MESH;
      this.setVertices(verticies);
    } else {
      objectType = GameObjectType.CUBE;
    }

    this.createObjectPhysics(
      "LadderSensor",
      objectType,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.setAsSensor(true);

    // this.createObjectGraphicsDebug("blue", 0.5);
  }

  public setLadderValue(value: number) {
    this.setObjectValue0(value);
  }

  public update() {
    this.targetIntersectionCheck();
  }
}
