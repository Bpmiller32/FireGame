/* -------------------------------------------------------------------------- */
/*                              ENTITY TYPE TABLE                              */
/* -------------------------------------------------------------------------- */
/*
 * The single identity source for this game's entities.
 *
 * Every entity carries a string `type` flag (set via createObjectPhysics / SetType).
 * Collision routing matches against that type — and Rapier shapecast/intersection
 * callbacks hand back a raw Collider, not a class, so type-based routing (not
 * `instanceof`) is what survives those callbacks. (A separate per-instance `name`
 * exists for singling out one specific entity; routing uses `type`.)
 *
 * Keeping every type in one const map means the spawn side (which writes it) and
 * the routing side (which matches it) can never silently drift apart. Mirrors the
 * PlayerStates / CollisionGroups pattern.
 *
 * NOTE: the VALUES here are the exact strings the level data and the engine's
 * resourceLoader emit — do NOT change a value without changing those too, or
 * routing breaks silently.
 */
/* -------------------------------------------------------------------------- */

/**
 * Entity name constants — the verbatim identity strings used across the game.
 *
 * @example
 * ```typescript
 * if (GameUtils.IsColliderType(collider, EntityType.ENEMY)) {
 *   // routed an enemy hit
 * }
 * ```
 */
const EntityType = {
  PLAYER: "Player",
  WALL: "Wall",
  PLATFORM: "Platform",
  ONE_WAY_PLATFORM: "OneWayPlatform",
  EDGE_ONE_WAY_PLATFORM: "EdgeOneWayPlatform",
  LINE_ONE_WAY_PLATFORM: "LineOneWayPlatform",
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

/**
 * Type for entity name values
 * Ensures only valid entity names are used
 */
export type EntityType = typeof EntityType[keyof typeof EntityType];

export default EntityType;
