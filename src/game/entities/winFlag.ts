import GameObjectType from "../../engine/types/gameObjectType";
import GameSensor from "../../engine/entities/gameSensor";
import EntityType from "../types/entityType";

// WinFlag — the level goal. Pass-through sensor zone; the win fires via the
// contact table (game/config/contactRules.ts): Player enters WinFlag -> "gameWin".
export default class WinFlag extends GameSensor {
  constructor(
    size: { width: number; height: number; depth: number },
    position: { x: number; y: number },
    rotation: number
  ) {
    super();

    this.createObjectPhysics(
      EntityType.WIN_FLAG,
      GameObjectType.CUBE,
      size,
      position,
      rotation
    );

    this.setAsSensor(true);
    // Take part in the contact table even though we define no callback here.
    this.enableContactEvents();
  }
}
