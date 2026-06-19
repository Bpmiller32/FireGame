/* -------------------------------------------------------------------------- */
/*                          ENTITY FACTORY REGISTRY                            */
/* -------------------------------------------------------------------------- */
/*
 * One factory function per level-data-placed entity type. The GameDirector used
 * to have a separate import* method for each type (importCameraSensors,
 * importWalls, importPlatforms, importLadderSensors, importTrashCans,
 * importWinFlags) — open-closed sprawl. This collapses them into a plain const
 * map keyed by the EntityType string the level data and resourceLoader emit, so
 * loadLevelData can iterate the parsed entities and call ENTITY_FACTORIES[type].
 *
 * The factory BODIES are lifted verbatim from the old import* methods — same
 * axis mapping (position[0]/[2] horizontal/vertical, [1] = depth), same
 * { width, height: depth, depth: height } size remap, same -rotation[1]
 * negation, same value0-3 -> constructor-arg wiring, same setObjectName calls.
 *
 * Only LEVEL-DATA-PLACED types live here. The runtime enemy spawner
 * (Enemy/CrazyEnemy) and the non-entity level steps (ambient light, level
 * graphics) are NOT factories — GameDirector keeps them as explicit steps.
 *
 * Identity table: this map is keyed off the same EntityType const that the
 * routing side uses, so the spawn side and the name table cannot drift. The
 * NAME -> type resolution is just data.type (the resourceLoader already emits
 * the exact EntityType strings), so the set of keys below IS the list of types
 * the loader knows how to place.
 */
/* -------------------------------------------------------------------------- */

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

/**
 * Derived query views the rest of the game genuinely indexes by type.
 * Factories push the entity they build into the right array(s) AS the entity is
 * created — these are populated views, not a separate registry. Kept separate
 * (not one undifferentiated list) because the code queries trashCans[0] for the
 * enemy and the ladder sub-arrays for the fully-inside climb checks.
 */
export interface FactoryContext {
  camera: Camera;

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

/**
 * A factory builds one entity from its level-data row and pushes it into the
 * matching derived view(s) on the context. `type` is the resolved EntityType
 * string for this row — passed so the shared platform/ladder factories can
 * branch exactly as the old import* methods did.
 *
 * `data` is typed `any` to match the old import* callbacks VERBATIM — those
 * received `(data: any)` (see the deleted importLevelObjects), and the level
 * rows carry loose value0-3 / vertices the constructors accept untyped. Keeping
 * `any` here is a true no-op vs. the original behavior, not a new looseness.
 */
type EntityFactory = (
  data: any,
  ctx: FactoryContext,
  type: string
) => GameObject;

/* -------------------------------------------------------------------------- */
/*                              FACTORY BODIES                                */
/*       (lifted verbatim from GameDirector's import* methods)               */
/* -------------------------------------------------------------------------- */

// FROM importCameraSensors
const createCameraSensor: EntityFactory = (data, ctx) => {
  const sensor = new CameraSensor(
    { width: data.width, height: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1],
    ctx.camera
  );
  sensor.SetCameraPositionData(
    new THREE.Vector3(data.value0, data.value1, data.value2)
  );
  ctx.cameraSensors.push(sensor);
  return sensor;
};

// FROM importWalls
const createWall: EntityFactory = (data, ctx) => {
  const wall = new Platform(
    { width: data.width, height: data.depth, depth: data.height },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  wall.SetType(EntityType.WALL);
  ctx.walls.push(wall);
  return wall;
};

// FROM importPlatforms (handles Platform + Edge/Line one-way variants)
const createPlatform: EntityFactory = (data, ctx, type) => {
  const isOneWay =
    type === EntityType.EDGE_ONE_WAY_PLATFORM ||
    type === EntityType.LINE_ONE_WAY_PLATFORM;
  const platform = new Platform(
    { width: data.width, height: data.depth, depth: data.height },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1],
    isOneWay,
    data.vertices
  );

  platform.SetPlatformFloorLevel(data.value0);
  platform.SetEdgePlatform(data.value1);
  platform.SetOneWayEnablePoint(data.value2 || data.position[2]);

  ctx.platforms.push(platform);
  return platform;
};

// FROM importLadderSensors (handles Top/Core/Bottom variants)
const createLadderSensor: EntityFactory = (data, ctx, type) => {
  const sensor = new LadderSensor(
    { width: data.width, height: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1],
    data.vertices
  );
  sensor.SetLadderValue(data.value0);
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
    { width: data.width, height: data.depth, depth: data.height },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  ctx.trashCans.push(trashCan);
  return trashCan;
};

// FROM importWinFlags
const createWinFlag: EntityFactory = (data, ctx) => {
  const winFlag = new WinFlag(
    { width: data.width, height: data.depth, depth: data.height },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  ctx.winFlags.push(winFlag);
  return winFlag;
};

// NEW: Teleporter — there was NO importTeleporters, so a Blender-placed
// teleporter was silently dropped (teleporters[] was declared + destroyed but
// never filled). Wired now, mirroring the other sensors. Destination comes from
// value0/value1 (x, y) — the exact pair resourceLoader maps from the GLB
// "destination" extras (see resourceLoader.getMetadataValue, case "Teleporter").
const createTeleporter: EntityFactory = (data, ctx) => {
  const teleporter = new Teleporter(
    { width: data.width, height: data.depth },
    { x: data.position[0], y: data.position[2] },
    -data.rotation[1]
  );
  teleporter.SetTeleportPosition(data.value0, data.value1);
  ctx.teleporters.push(teleporter);
  return teleporter;
};

/* -------------------------------------------------------------------------- */
/*                            THE REGISTRY                                    */
/* -------------------------------------------------------------------------- */

/**
 * EntityType string -> factory. Keyed off the EntityType const so spawn side and
 * routing side share one identity table. A level-data row whose `type` is not a
 * key here is not a placeable entity (PlayerStart/CameraStart are handled
 * separately as spawn points; GraphicsObject/Unknown are skipped).
 */
const ENTITY_FACTORIES: Record<string, EntityFactory> = {
  [EntityType.CAMERA_SENSOR]: createCameraSensor,
  [EntityType.WALL]: createWall,
  [EntityType.PLATFORM]: createPlatform,
  [EntityType.EDGE_ONE_WAY_PLATFORM]: createPlatform,
  [EntityType.LINE_ONE_WAY_PLATFORM]: createPlatform,
  [EntityType.LADDER_TOP_SENSOR]: createLadderSensor,
  [EntityType.LADDER_CORE_SENSOR]: createLadderSensor,
  [EntityType.LADDER_BOTTOM_SENSOR]: createLadderSensor,
  [EntityType.TRASH_CAN]: createTrashCan,
  [EntityType.WIN_FLAG]: createWinFlag,
  [EntityType.TELEPORTER]: createTeleporter,
};

export default ENTITY_FACTORIES;
