// Level data from the GLB parser (ResourceLoader.ParseLevel); GLB is the single permanent source. Maps entity names to properties.

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

  // Entity type identifier (Platform, Wall, OneWayPlatform, Enemy, Teleporter, etc.); factories switch on it
  type: string;

  // Per-entity metadata from the mesh's TEXTURE name in the GLB: space-separated key=value tokens (e.g. "floor=1 oneway=8").
  // Engine parser stays generic — never interprets a game-specific key; only the game-side factories do.
  meta?: Record<string, string>;
}

// Dictionary of entity name -> properties; GameDirector iterates it to spawn all level entities.
interface LevelData {
  // Key: unique entity name (used for debugging/identification). Value: entity properties and metadata.
  [entityName: string]: LevelEntity;
}

export default LevelData;
