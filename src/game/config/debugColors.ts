import * as THREE from "three";
import EntityType from "../types/entityType";

// Debug wireframe color per entity type (dev-only — see engine/debug/physicsDebug).
// The one place to tweak the palette; PhysicsDebug looks up each collider's userData.type here. Unlisted types fall back to gray.
const DEBUG_TYPE_COLORS = new Map<string, THREE.Color>([
  [EntityType.PLAYER, new THREE.Color("#ffffff")], // white
  [EntityType.WALL, new THREE.Color("#888888")], // gray
  [EntityType.PLATFORM, new THREE.Color("#33dd55")], // green
  [EntityType.ONE_WAY_PLATFORM, new THREE.Color("#b6ff3a")], // lime
  [EntityType.ENEMY, new THREE.Color("#ff3b3b")], // red
  [EntityType.TRASH_CAN, new THREE.Color("#ff9a3b")], // orange
  [EntityType.WIN_FLAG, new THREE.Color("#ffe23b")], // gold
  [EntityType.TELEPORTER, new THREE.Color("#c44bff")], // purple
  [EntityType.CAMERA_SENSOR, new THREE.Color("#3bb0ff")], // blue
  [EntityType.LADDER_SENSOR, new THREE.Color("#ff8a44")], // amber
  [EntityType.LADDER_TOP_SENSOR, new THREE.Color("#ffcf6b")], // light amber
  [EntityType.LADDER_CORE_SENSOR, new THREE.Color("#ff8a44")], // amber
  [EntityType.LADDER_BOTTOM_SENSOR, new THREE.Color("#cc6a22")], // dark amber
]);

export default DEBUG_TYPE_COLORS;
