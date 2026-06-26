// Level data shape emitted by the GLB parser (ResourceLoader.ParseLevel), consumed by the entity factories; GLB is the single permanent source. Dictionary mapping entity names to properties (position, size, rotation, type, optional metadata).

// Single entity within a level; one GameObject to create (platform, wall, enemy, etc.)
interface LevelEntity {
  // Entity width (X axis); horizontal size for 2D
  width: number;

  // Entity depth (Y axis in this coordinate system); often 1 or minimal for 2D
  depth: number;

  // Entity height (Z axis in this coordinate system); vertical size for 2D
  height: number;

  // World position [x, y, z]; in this 2D game [horizontal, depth, vertical]
  position: number[];

  // Euler rotation [x, y, z] in radians; usually [0,0,0] or [0, rotation, 0]
  rotation: number[];

  // Entity type identifier, e.g. Platform, Wall, OneWayPlatform, LadderTop/Core/BottomSensor, CameraSensor, PlayerStart, CameraStart, Enemy, TrashCan, WinFlag, Teleporter
  type: string;

  // Per-entity metadata parsed from the mesh's TEXTURE name in the GLB (space-separated key=value tokens, e.g. "floor=1 oneway=8").
  // Game-side factories interpret keys per type: floor/edge/oneway (platforms), dir (ladders), cam/dest (camera/teleporter).
  // Replaces the old generic value0-3 indices; engine parser stays generic and never interprets a game-specific key.
  meta?: Record<string, string>;
}

// Level data: dictionary mapping entity names (keys) to properties (values); GameDirector iterates it to spawn all level entities.
interface LevelData {
  // Key: unique entity name (used for debugging/identification). Value: entity properties and metadata.
  [entityName: string]: LevelEntity;
}

export default LevelData;
