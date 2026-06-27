// Entity factory registry: EntityType string -> factory, one per level-data-placed entity type.
// loadLevelData iterates parsed rows and calls ENTITY_FACTORIES[type].
// Axis mapping is load-bearing: position[0]/[2] -> x/y (horizontal/vertical), position[1] is depth;
// rotation is negated (-rotation[1]) so it isn't mirrored in-game.
// Only level-data-placed types live here — the runtime enemy/barrel spawner and ambient/graphics
// steps are NOT factories (GameDirector keeps those as explicit steps).

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

// Derived views the game indexes by type; factories push each entity into the right array(s) as built.
// Kept as separate arrays (not one list) because code queries trashCans[0] and the ladder sub-arrays directly.
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

// Builds one entity from its row and pushes it into the matching view(s). `type` is the resolved
// EntityType so shared platform/ladder factories can branch. `data` is `any` on purpose (loose meta bag).
type EntityFactory = (
  data: any,
  ctx: FactoryContext,
  type: string
) => GameObject;

// Metadata interpretation. The GLB parser hands each row a generic `meta` bag (Record<string,string>)
// parsed from the mesh's texture name but doesn't interpret the keys — the game does that here.
// These helpers coerce the string values.

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
  let raw = "";
  if (meta && meta[key]) {
    raw = meta[key];
  }
  const parts = raw.split("_");
  const result: number[] = [];
  for (const c of parts) {
    const n = Number(c);
    if (Number.isFinite(n)) result.push(n);
    else result.push(0);
  }
  return result;
}

// Factory bodies — one per entity type.

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

// Platform + OneWayPlatform
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

// Top/Core/Bottom ladder sensor variants
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

const createTrashCan: EntityFactory = (data, ctx) => {
  const trashCan = new TrashCan(
    { width: data.width, height: data.height, depth: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  ctx.trashCans.push(trashCan);
  return trashCan;
};

const createWinFlag: EntityFactory = (data, ctx) => {
  const winFlag = new WinFlag(
    { width: data.width, height: data.height, depth: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  ctx.winFlags.push(winFlag);
  return winFlag;
};

// Teleporter — destination comes from the texture-name "dest=<x>_<y>" metadata
// (parsed into data.meta.dest). Mirrors the other sensors.
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

// The registry. EntityType string -> factory. A row whose `type` isn't a key here isn't placeable
// (PlayerStart/CameraStart are spawn points; GraphicsObject/Unknown skipped).
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
