// Single identity source for entities: each carries a string `type`. Rapier callbacks return a raw
// Collider (not a class), so type-based routing survives where instanceof can't. One const map keeps
// the spawn side and routing side from drifting (mirrors PlayerStates / CollisionGroups).
// NOTE: values are the exact strings level data and the engine's resourceLoader emit — don't change a
// value without changing those too, or routing breaks silently.

// Entity name constants — the verbatim identity strings used across the game
const EntityType = {
  PLAYER: "Player",
  WALL: "Wall",
  PLATFORM: "Platform",
  ONE_WAY_PLATFORM: "OneWayPlatform",
  ENEMY: "Enemy",
  TRASH_CAN: "TrashCan",
  WIN_FLAG: "WinFlag",
  LADDER_TOP_SENSOR: "LadderTopSensor",
  LADDER_CORE_SENSOR: "LadderCoreSensor",
  LADDER_BOTTOM_SENSOR: "LadderBottomSensor",
  LADDER_SENSOR: "LadderSensor",
  CAMERA_SENSOR: "CameraSensor",
  TELEPORTER: "Teleporter",
  PLAYER_START: "PlayerStart",
  CAMERA_START: "CameraStart",
} as const;

// Type for entity name values — only valid entity names allowed
export type EntityType = typeof EntityType[keyof typeof EntityType];

export default EntityType;
