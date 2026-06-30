// Single identity source for entities via a string `type`: Rapier callbacks return a raw Collider, so
// type-based routing works where instanceof can't.
// NOTE: values are the exact strings level data and resourceLoader emit — change both or routing breaks silently.

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
  ENEMY_SPAWN: "EnemySpawn",
  WAYPOINT: "Waypoint",
} as const;

// Type for entity name values — only valid entity names allowed
export type EntityType = typeof EntityType[keyof typeof EntityType];

export default EntityType;
