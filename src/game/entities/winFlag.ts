import GameObjectType from "../../engine/types/gameObjectType";
import GameSensor from "../../engine/entities/gameSensor";
import EntityType from "../types/entityType";

// WinFlag — the level goal. Reaching it wins the level.
// A pass-through sensor zone: the win is triggered by the declarative contact
// table (game/config/contactRules.ts) — Player enters WinFlag -> "gameWin". You
// walk into the goal rather than bonking into a solid wall. (Was a solid box
// that self-detected with a per-frame 4-direction shapecast; that proof-of-
// concept hack is gone now that the contact system exists.)
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
