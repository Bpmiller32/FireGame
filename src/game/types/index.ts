/* -------------------------------------------------------------------------- */
/*                         GAME TYPES INDEX                                   */
/* -------------------------------------------------------------------------- */
/*
 * Central export point for GAME-specific types (this game's taxonomy and
 * level schema). Engine-generic types are NOT laundered through this barrel —
 * game files import those directly from `engine/types`.
 */
/* -------------------------------------------------------------------------- */

// ===== COLLISION GROUPS (this game's named categories) =====
export { default as CollisionGroups } from "./gameCollisionGroups";
export type { CollisionGroup } from "./gameCollisionGroups";

// ===== LEVEL DATA (game level schema + validation) =====
export type { default as LevelData } from "./levelData";
export type { LevelEntity } from "./levelData";
export { validateLevelData } from "./levelData";
