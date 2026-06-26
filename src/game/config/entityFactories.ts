// Entity factory registry — one factory per level-data-placed entity type.
// Replaces GameDirector's per-type import* methods (importCameraSensors, importWalls,
// importPlatforms, importLadderSensors, importTrashCans, importWinFlags) with a const map
// keyed by the EntityType string level data and resourceLoader emit, so loadLevelData
// iterates the parsed entities and calls ENTITY_FACTORIES[type].
// Factory bodies lifted verbatim from the old import* methods — same axis mapping
// (position[0]/[2] horizontal/vertical, [1] = depth), width/height/depth passed straight
// through (resourceLoader emits height=gameUp(glTF Y) and depth=gameDepth(glTF Z), no size
// remap), same -rotation[1] negation, texture-name meta -> constructor-arg wiring, same SetType calls.
// Only LEVEL-DATA-PLACED types live here. The runtime enemy spawner (Enemy — normal/crazy
// barrels) and non-entity level steps (ambient light, level graphics) are NOT factories —
// GameDirector keeps them as explicit steps.
// Identity table: keyed off the same EntityType const the routing side uses, so spawn side and
// name table cannot drift. NAME -> type resolution is just data.type (resourceLoader emits the
// exact EntityType strings), so the keys below ARE the list of types the loader can place.

import * as THREE from "three";
import GameObject from "../../engine/entities/gameObject";
import Camera from "../../engine/camera/camera";
import EntityType from "../types/entityType";
import Platform from "../entities/platform";
import TrashCan from "../entities/trashCan";
import WinFlag from "../entities/winFlag";
import CameraSensor from "../entities/cameraSensor";
import LadderSensor from "../entities/ladderSensor";
import Teleporter from "../entities/teleporter";

// Derived query views the rest of the game indexes by type. Factories push the entity they build
// into the right array(s) as it's created — populated views, not a separate registry. Kept separate
// (not one list) because the code queries trashCans[0] for the enemy and the ladder sub-arrays for
// the fully-inside climb checks.
export interface FactoryContext {
  camera: Camera; // engine camera handed to the camera-sensor factories

  walls: Platform[];
  platforms: Platform[];
  trashCans: TrashCan[];
  winFlags: WinFlag[];
  teleporters: Teleporter[];
  cameraSensors: CameraSensor[];
  ladderTopSensors: LadderSensor[];
  ladderCoreSensors: LadderSensor[];
  ladderBottomSensors: LadderSensor[];
}

// A factory builds one entity from its level-data row and pushes it into the matching derived
// view(s) on the context. `type` is the resolved EntityType string for this row — passed so the
// shared platform/ladder factories can branch exactly as the old import* methods did.
// `data` is typed `any` to match the old import* callbacks VERBATIM — those received (data: any)
// (see the deleted importLevelObjects), and the level rows carry a loose `meta` bag read untyped.
// Keeping `any` here is a true no-op vs the original behavior, not a new looseness.
type EntityFactory = (
  data: any,
  ctx: FactoryContext,
  type: string
) => GameObject;

// Metadata interpretation.
// The GLB parser hands each row a GENERIC `meta` bag (Record<string,string>), parsed from the
// mesh's texture name — it does NOT interpret the keys (the engine names zero game concepts).
// The GAME owns that interpretation here: each factory reads only the keys meaningful to its type.
// These helpers coerce the string values. (Replaces the old value0-3 index hop.)

// One numeric metadata value, e.g. meta.floor "1" -> 1. Missing/garbage -> fallback.
function metaNum(
  meta: Record<string, string> | undefined,
  key: string,
  fallback = 0
): number {
  const n = Number(meta?.[key]);
  if (Number.isFinite(n)) return n;
  return fallback;
}

// A "_"-separated coordinate list, e.g. meta.cam "3.5_2_-1" -> [3.5, 2, -1].
// Missing components read as 0. Used for camera target / teleporter destination.
function metaCoords(
  meta: Record<string, string> | undefined,
  key: string
): number[] {
  const parts = (meta?.[key] ?? "").split("_");
  const result: number[] = [];
  for (const c of parts) {
    const n = Number(c);
    if (Number.isFinite(n)) result.push(n);
    else result.push(0);
  }
  return result;
}

// Factory bodies (lifted from GameDirector's import* methods; metadata now read from the
// parsed texture-name `meta` bag instead of the old value0-3 indices).

// FROM importCameraSensors
const createCameraSensor: EntityFactory = (data, ctx) => {
  const sensor = new CameraSensor(
    { width: data.width, height: data.height },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1],
    ctx.camera
  );
  const cam = metaCoords(data.meta, "cam");
  const camX = cam[0];
  const camY = cam[1];
  const camZ = cam[2];
  sensor.SetCameraPositionData(
    new THREE.Vector3(camX ?? 0, camY ?? 0, camZ ?? 0)
  );
  ctx.cameraSensors.push(sensor);
  return sensor;
};

// FROM importWalls
const createWall: EntityFactory = (data, ctx) => {
  const wall = new Platform(
    { width: data.width, height: data.height, depth: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  wall.SetType(EntityType.WALL);
  ctx.walls.push(wall);
  return wall;
};

// FROM importPlatforms (handles Platform + OneWayPlatform)
const createPlatform: EntityFactory = (data, ctx, type) => {
  const isOneWay = type === EntityType.ONE_WAY_PLATFORM;
  const platform = new Platform(
    { width: data.width, height: data.height, depth: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1],
    isOneWay
  );

  platform.SetPlatformFloorLevel(metaNum(data.meta, "floor"));
  platform.SetEdgePlatform(metaNum(data.meta, "edge"));
  platform.SetOneWayEnablePoint(metaNum(data.meta, "oneway") || data.position[2]);

  ctx.platforms.push(platform);
  return platform;
};

// FROM importLadderSensors (handles Top/Core/Bottom variants)
const createLadderSensor: EntityFactory = (data, ctx, type) => {
  const sensor = new LadderSensor(
    { width: data.width, height: data.height },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  sensor.SetLadderValue(metaNum(data.meta, "dir"));
  sensor.SetType(type);

  if (type === EntityType.LADDER_TOP_SENSOR) ctx.ladderTopSensors.push(sensor);
  else if (type === EntityType.LADDER_CORE_SENSOR)
    ctx.ladderCoreSensors.push(sensor);
  else if (type === EntityType.LADDER_BOTTOM_SENSOR)
    ctx.ladderBottomSensors.push(sensor);

  return sensor;
};

// FROM importTrashCans
const createTrashCan: EntityFactory = (data, ctx) => {
  const trashCan = new TrashCan(
    { width: data.width, height: data.height, depth: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  ctx.trashCans.push(trashCan);
  return trashCan;
};

// FROM importWinFlags
const createWinFlag: EntityFactory = (data, ctx) => {
  const winFlag = new WinFlag(
    { width: data.width, height: data.height, depth: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  ctx.winFlags.push(winFlag);
  return winFlag;
};

// NEW: Teleporter — there was NO importTeleporters, so a Blender-placed
// teleporter was silently dropped (teleporters[] was declared + destroyed but
// never filled). Wired now, mirroring the other sensors. Destination comes from
// the texture-name "dest=<x>_<y>" metadata (parsed into data.meta.dest).
const createTeleporter: EntityFactory = (data, ctx) => {
  const teleporter = new Teleporter(
    { width: data.width, height: data.height },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  const dest = metaCoords(data.meta, "dest");
  const destX = dest[0];
  const destY = dest[1];
  teleporter.SetTeleportPosition(destX ?? 0, destY ?? 0);
  ctx.teleporters.push(teleporter);
  return teleporter;
};

// The registry.
// EntityType string -> factory. Keyed off the EntityType const so spawn side and routing side
// share one identity table. A level-data row whose `type` is not a key here is not a placeable
// entity (PlayerStart/CameraStart handled separately as spawn points; GraphicsObject/Unknown skipped).
const ENTITY_FACTORIES: Record<string, EntityFactory> = {
  [EntityType.CAMERA_SENSOR]: createCameraSensor,
  [EntityType.WALL]: createWall,
  [EntityType.PLATFORM]: createPlatform,
  [EntityType.ONE_WAY_PLATFORM]: createPlatform,
  [EntityType.LADDER_TOP_SENSOR]: createLadderSensor,
  [EntityType.LADDER_CORE_SENSOR]: createLadderSensor,
  [EntityType.LADDER_BOTTOM_SENSOR]: createLadderSensor,
  [EntityType.TRASH_CAN]: createTrashCan,
  [EntityType.WIN_FLAG]: createWinFlag,
  [EntityType.TELEPORTER]: createTeleporter,
};

export default ENTITY_FACTORIES;
