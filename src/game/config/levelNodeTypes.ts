// Level-node name token (lower-cased) -> the game type its factory spawns.
// Injected into the type-blind GLB parser via ResourceLoader.RegisterLevelTypes (see App.vue).
// Values come straight from EntityType so the two can't drift. Only level-PLACEABLE types +
// spawn points + GraphicsObject belong here — runtime-only types (e.g. Enemy spawns) do not.

import EntityType from "../types/entityType";

const LEVEL_NODE_TYPES: Record<string, string> = {
  wall: EntityType.WALL,
  platform: EntityType.PLATFORM,
  onewayplatform: EntityType.ONE_WAY_PLATFORM,
  trashcan: EntityType.TRASH_CAN,
  winflag: EntityType.WIN_FLAG,
  teleporter: EntityType.TELEPORTER,
  camerasensor: EntityType.CAMERA_SENSOR,
  laddertopsensor: EntityType.LADDER_TOP_SENSOR,
  laddercoresensor: EntityType.LADDER_CORE_SENSOR,
  ladderbottomsensor: EntityType.LADDER_BOTTOM_SENSOR,
  playerstart: EntityType.PLAYER_START,
  camerastart: EntityType.CAMERA_START,
  graphics: "GraphicsObject",
  graphicsobject: "GraphicsObject",
};

export default LEVEL_NODE_TYPES;
