/* -------------------------------------------------------------------------- */
/*                              SIZE TYPES                                    */
/* -------------------------------------------------------------------------- */
/*
 * 2D and 3D size/dimension types for object dimensions and collider sizes.
 */
/* -------------------------------------------------------------------------- */

/**
 * 2D Size/Dimensions - Used for object sizes, collider dimensions
 * 
 * @example
 * ```typescript
 * const playerSize: Size2D = { width: 1.75, height: 4 };
 * const platformSize: Size2D = { width: 20, height: 2 };
 * ```
 */
export interface Size2D {
  width: number;
  height: number;
}

/**
 * 3D Size/Dimensions - Used for 3D object sizes, level geometry
 * 
 * @example
 * ```typescript
 * const boxSize: Size3D = { width: 10, height: 5, depth: 3 };
 * ```
 */
export interface Size3D {
  width: number;
  height: number;
  depth: number;
}
