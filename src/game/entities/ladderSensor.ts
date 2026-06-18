import * as RAPIER from "@dimforge/rapier2d-compat";
import GameObjectType from "../../engine/types/gameObjectType";
import GameSensor from "../../engine/entities/gameSensor";
import GameObject from "../../engine/entities/gameObject";
import Player from "./player/player";
import EntityType from "../types/entityType";

/**
 * LadderSensor - Detects when the player is touching a ladder
 *
 * Ladder sensors now use the event-driven callback system.
 * No need to call update() or check manually - it's automatic!
 */
export default class LadderSensor extends GameSensor {
  constructor(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number = 0,
    verticies: number[] = []
  ) {
    super();

    // Determine if the ladder uses complex collider with vertices or a cube shape
    const isComplexCollider = verticies.length > 0;
    let objectType;

    if (isComplexCollider) {
      objectType = GameObjectType.CONVEX_MESH;
      this.setVertices(verticies);
    } else {
      objectType = GameObjectType.CUBE;
    }

    this.createObjectPhysics(
      EntityType.LADDER_SENSOR,
      objectType,
      { width: size.width, height: size.height },
      position,
      rotation,
      RAPIER.RigidBodyDesc.fixed()
    );

    this.setAsSensor(true);

    // Uncomment to visualize ladder sensors in debug mode
    // this.createObjectGraphicsDebug("blue", 0.5);
  }

  /**
   * Set the ladder direction value
   * Positive = right, Negative = left, 0 = neutral
   */
  public SetLadderValue(value: number) {
    this.SetObjectValue0(value);
  }

  /**
   * SENSOR CALLBACK - Called when something enters this ladder sensor
   * This is automatically triggered by the physics system
   */
  public OnSensorEnter(other: GameObject): void {
    if (other instanceof Player) {
      // TODO: Notify player they're touching a ladder
      // This will be handled when we refactor Player to use callbacks
      // console.log("🪜 Player entered ladder zone");
    }
  }

  /**
   * SENSOR CALLBACK - Called when something exits this ladder sensor
   */
  public OnSensorExit(other: GameObject): void {
    if (other instanceof Player) {
      // console.log("🪜 Player exited ladder zone");
    }
  }
}
