/* -------------------------------------------------------------------------- */
/*                      HELPERS INDEX - CENTRALIZED EXPORTS                   */
/* -------------------------------------------------------------------------- */
/*
 * Central export point for all helper functions.
 * 
 * Import helpers from here instead of individual files:
 * 
 * EXAMPLE:
 * import { moveTowards, lerp, getUserData } from '@/webgl/utils/helpers';
 */
/* -------------------------------------------------------------------------- */

// ===== MATH HELPERS =====
export {
  moveTowards,
  radiansToDegrees,
  degreesToRadians,
  percentChance,
  randomRange,
  randomInt,
  clamp,
  lerp
} from './mathHelpers';

// ===== PHYSICS HELPERS =====
export {
  getUserData,
  getUserDataFromCollider,
  isColliderName,
  isOneWayPlatformActive
} from './physicsHelpers';
