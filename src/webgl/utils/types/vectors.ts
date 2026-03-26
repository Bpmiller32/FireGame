/* -------------------------------------------------------------------------- */
/*                              VECTOR TYPES                                  */
/* -------------------------------------------------------------------------- */
/*
 * 2D and 3D vector types for positions, velocities, and directions.
 */
/* -------------------------------------------------------------------------- */

/**
 * 2D Vector - Used for positions, velocities, sizes in 2D space
 * 
 * @example
 * ```typescript
 * const playerPos: Vector2D = { x: 10.5, y: 25.3 };
 * const velocity: Vector2D = { x: 5, y: -2 };
 * ```
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * 3D Vector - Used for positions in 3D space (camera, scene objects)
 * 
 * @example
 * ```typescript
 * const cameraPos: Vector3D = { x: 0, y: 25, z: 100 };
 * ```
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}
