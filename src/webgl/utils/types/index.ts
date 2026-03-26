/* -------------------------------------------------------------------------- */
/*                         TYPES INDEX - CENTRALIZED EXPORTS                  */
/* -------------------------------------------------------------------------- */
/*
 * Central export point for all game engine types.
 * 
 * Import types from here instead of individual files for cleaner code:
 * 
 * BEFORE:
 * import PlayerStates from './types/playerStates';
 * import PlayerDirection from './types/playerDirection';
 * import ContactPoints from './types/contactPoints';
 * 
 * AFTER:
 * import { PlayerStates, PlayerDirection, ContactPoints } from './types';
 */
/* -------------------------------------------------------------------------- */

// ===== COMMON TYPES =====
// Vectors
export type { Vector2D, Vector3D } from './vectors';

// Sizes
export type { Size2D, Size3D } from './sizes';

// Colors
export type { RGBColor, RGBAColor } from './colors';

// Geometry
export type { Rectangle, TimeData } from './geometry';

// Callbacks
export type {
  VoidCallback,
  GameObjectCallback,
  CollisionCallback,
  ErrorCallback,
  ProgressCallback
} from './callbacks';

// ===== COLLISION & PHYSICS =====
export { default as CollisionGroups } from './collisionGroups';
export type { CollisionGroup } from './collisionGroups';

export type { default as ContactPoints } from './contactPoints';
export type { ContactPointKey } from './contactPoints';
export { createDefaultContactPoints } from './contactPoints';

export { default as GameObjectType } from './gameObjectType';
export type { GameObjectShapeType } from './gameObjectType';
export { isValidGameObjectType } from './gameObjectType';

export type { default as UserData } from './userData';
export { createDefaultUserData } from './userData';

// ===== PLAYER =====
export { default as PlayerDirection } from './playerDirection';
export type { Direction, HorizontalDirection, VerticalDirection } from './playerDirection';
export { 
  getOppositeDirection,
  isHorizontalDirection,
  isVerticalDirection
} from './playerDirection';

export { default as PlayerStates } from './playerStates';
export type { PlayerState } from './playerStates';
export {
  isAirborne,
  isGrounded,
  isMovingHorizontally,
  canJump
} from './playerStates';

// ===== RESOURCES & ASSETS =====
export type { default as Resource } from './resource';
export type { ResourceType, ResourceCollection } from './resource';
export { createTextureResource, createModelResource } from './resource';

export type { default as SpriteState } from './spriteState';
export { createUniformSpriteState, createSpriteStateFromRange } from './spriteState';

// ===== LEVELS & WORLD =====
export type { default as LevelData } from './levelData';
export type { LevelEntity } from './levelData';
export { validateLevelData } from './levelData';

// ===== INPUT =====
export type { default as Key } from './key';
export { CommonKeys, createKey } from './key';

/* -------------------------------------------------------------------------- */
/*                         USAGE EXAMPLES                                     */
/* -------------------------------------------------------------------------- */

/**
 * @example
 * ```typescript
 * // Import multiple types at once
 * import {
 *   PlayerStates,
 *   PlayerDirection,
 *   ContactPoints,
 *   Vector2D,
 *   Size2D
 * } from '@/webgl/utils/types';
 * 
 * // Use the types
 * const position: Vector2D = { x: 10, y: 20 };
 * const size: Size2D = { width: 5, height: 10 };
 * 
 * if (player.state === PlayerStates.IDLE) {
 *   player.velocity.x = PlayerDirection.NEUTRAL;
 * }
 * 
 * // Import helper functions
 * import { createDefaultContactPoints, isAirborne } from '@/webgl/utils/types';
 * 
 * const contacts = createDefaultContactPoints();
 * if (isAirborne(player.state)) {
 *   // Apply air physics
 * }
 * ```
 */
