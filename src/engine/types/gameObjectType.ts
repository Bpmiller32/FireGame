/* -------------------------------------------------------------------------- */
/*                         GAME OBJECT SHAPE TYPES                            */
/* -------------------------------------------------------------------------- */
/*
 * Defines the physics collider shapes available for GameObjects.
 * 
 * Each type corresponds to a Rapier2D collider shape:
 * - CUBE: Rectangle/box collider (most common)
 * - SPHERE: Circle collider (for round objects)
 * - CAPSULE: Rounded rectangle (smooth corners)
 * - CONVEX_MESH: Custom convex polygon from vertices
 * - POLYLINE: Chain of connected line segments
 * 
 * The shape determines collision detection behavior and physics interactions.
 */
/* -------------------------------------------------------------------------- */

/**
 * GameObject physics collider shapes
 * 
 * @example
 * ```typescript
 * // Player uses a box collider
 * this.createObjectPhysics(
 *   "Player",
 *   GameObjectType.CUBE,
 *   { width: 1.75, height: 4 },
 *   { x: 0, y: 10 }
 * );
 * 
 * // Enemy uses a sphere collider for smooth rolling
 * this.createObjectPhysics(
 *   "Enemy",
 *   GameObjectType.SPHERE,
 *   { width: 1, height: 1 },
 *   { x: 5, y: 20 }
 * );
 * ```
 */
const GameObjectType = {
  /**
   * Rectangular/box collider shape
   * 
   * Best for: Players, platforms, walls, most game objects
   * - Fast collision detection
   * - Predictable physics behavior
   * - Works well for grid-aligned objects
   */
  CUBE: "cube",
  
  /**
   * Circular collider shape
   * 
   * Best for: Enemies, projectiles, collectible items
   * - Smooth rotation
   * - Good for rolling/bouncing behavior
   * - No sharp corners to get stuck on
   */
  SPHERE: "sphere",
  
  /**
   * Rounded rectangle collider shape
   * 
   * Best for: Characters with smooth movement
   * - Combines stability of boxes with smoothness of circles
   * - Won't get caught on small ledges
   * - Good for platformer characters
   */
  CAPSULE: "capsule",
  
  /**
   * Custom convex polygon collider
   * 
   * Best for: Complex shapes, sloped platforms
   * - Requires vertex data
   * - Shape must be convex (no concave angles)
   * - More expensive than basic shapes
   * - Use sparingly for performance
   */
  CONVEX_MESH: "convex_mesh",
  
  /**
   * Chain of connected line segments
   * 
   * Best for: One-way platforms, slopes, terrain
   * - Requires vertex data
   * - Creates thin collision boundaries
   * - Can be concave
   * - Useful for precise ground shapes
   */
  POLYLINE: "polyline",
} as const;

/**
 * Type for GameObjectType values
 * Ensures type safety when specifying collider shapes
 */
export type GameObjectShapeType = typeof GameObjectType[keyof typeof GameObjectType];

/**
 * Helper function to validate if a string is a valid GameObjectType
 * 
 * @param type - The string to validate
 * @returns True if the type is valid
 * 
 * @example
 * ```typescript
 * if (isValidGameObjectType(userInput)) {
 *   createObject(userInput);
 * }
 * ```
 */
export function isValidGameObjectType(type: string): type is GameObjectShapeType {
  return Object.values(GameObjectType).includes(type as GameObjectShapeType);
}

export default GameObjectType;
