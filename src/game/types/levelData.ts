/* -------------------------------------------------------------------------- */
/*                         LEVEL DATA STRUCTURE                               */
/* -------------------------------------------------------------------------- */
/*
 * Defines the structure for level data.
 * 
 * Levels can be loaded from:
 * - JSON files (hand-authored or exported from level editor)
 * - GLB files (exported from 3D tools like Shapr3D or Blockbench)
 * 
 * The LevelData format is a dictionary mapping entity names to their properties.
 * Each entity contains position, size, rotation, type, and optional metadata.
 */
/* -------------------------------------------------------------------------- */

/**
 * Single entity within a level
 * Represents one GameObject that will be created (platform, wall, enemy, etc.)
 * 
 * @example
 * ```typescript
 * const platform: LevelEntity = {
 *   width: 20,
 *   height: 2,
 *   depth: 1,
 *   position: [0, 10, 0],
 *   rotation: [0, 0, 0],
 *   type: "Platform",
 *   value0: 1,  // Floor level
 *   value1: 0,  // Not an edge platform
 *   value2: 10  // One-way enable point
 * };
 * ```
 */
interface LevelEntity {
  /**
   * Entity width (X axis)
   * For 2D games, this is the horizontal size
   */
  width: number;
  
  /**
   * Entity depth (Y axis in your coordinate system)
   * For 2D games, this is often 1 or minimal
   */
  depth: number;
  
  /**
   * Entity height (Z axis in your coordinate system)
   * For 2D games, this is the vertical size
   */
  height: number;
  
  /**
   * World position [x, y, z]
   * In your 2D game: [horizontal, depth, vertical]
   */
  position: number[];
  
  /**
   * Euler rotation [x, y, z] in radians
   * Most 2D objects use [0, 0, 0] or [0, rotation, 0]
   */
  rotation: number[];
  
  /**
   * Entity type identifier
   * 
   * Common types:
   * - "Platform": Solid platforms
   * - "Wall": Solid walls
   * - "OneWayPlatform": Jump-through platforms
   * - "EdgeOneWayPlatform", "LineOneWayPlatform": Special platform variants
   * - "LadderTopSensor", "LadderCoreSensor", "LadderBottomSensor": Ladder zones
   * - "CameraSensor": Camera trigger zones
   * - "PlayerStart": Player spawn point
   * - "CameraStart": Initial camera position
   * - "Enemy": Enemy spawn point
   * - "TrashCan", "WinFlag", "Teleporter": Interactive objects
   */
  type: string;
  
  /**
   * Optional vertex array for complex shapes
   * Used for line platforms, edge platforms, or custom collision shapes
   * Format: [[x1, y1], [x2, y2], ...]
   */
  vertices?: number[][];
  
  /* ===== METADATA FIELDS ===== */
  /*
   * value0-3 store entity-specific metadata.
   * See UserData type for detailed usage by entity type.
   */
  
  /**
   * Generic metadata field 0
   * Usage varies by entity type (see UserData documentation)
   */
  value0?: number;
  
  /**
   * Generic metadata field 1
   * Usage varies by entity type (see UserData documentation)
   */
  value1?: number;
  
  /**
   * Generic metadata field 2
   * Usage varies by entity type (see UserData documentation)
   */
  value2?: number;
  
  /**
   * Generic metadata field 3
   * Usage varies by entity type (see UserData documentation)
   */
  value3?: number;
}

/**
 * Level data structure
 * 
 * A dictionary mapping entity names (keys) to their properties (values).
 * The GameDirector iterates through this structure to spawn all level entities.
 * 
 * @example
 * ```typescript
 * const level: LevelData = {
 *   "Player_Start": {
 *     width: 1.75, height: 4, depth: 1,
 *     position: [0, 0, 10],
 *     rotation: [0, 0, 0],
 *     type: "PlayerStart"
 *   },
 *   "Platform_Ground": {
 *     width: 50, height: 2, depth: 1,
 *     position: [0, 0, 0],
 *     rotation: [0, 0, 0],
 *     type: "Platform",
 *     value0: 0  // Ground floor
 *   }
 * };
 * 
 * // Load the level
 * await gameDirector.loadLevelData(level);
 * ```
 */
interface LevelData {
  /**
   * Dictionary of entities
   * Key: Unique entity name (used for debugging, identification)
   * Value: Entity properties and metadata
   */
  [entityName: string]: LevelEntity;
}

export default LevelData;
export type { LevelEntity };

/**
 * Helper function to validate level data
 * Checks for common issues like missing required fields
 * 
 * @param levelData - The level data to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateLevelData(levelData: LevelData): string[] {
  const errors: string[] = [];
  
  for (const [name, entity] of Object.entries(levelData)) {
    if (!entity.type) {
      errors.push(`Entity "${name}" is missing required "type" field`);
    }
    if (!entity.position || entity.position.length !== 3) {
      errors.push(`Entity "${name}" has invalid position (must be [x, y, z])`);
    }
    if (!entity.rotation || entity.rotation.length !== 3) {
      errors.push(`Entity "${name}" has invalid rotation (must be [x, y, z])`);
    }
    if (entity.width === undefined || entity.width <= 0) {
      errors.push(`Entity "${name}" has invalid width`);
    }
    if (entity.height === undefined || entity.height <= 0) {
      errors.push(`Entity "${name}" has invalid height`);
    }
  }
  
  return errors;
}
