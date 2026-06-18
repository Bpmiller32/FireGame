/* -------------------------------------------------------------------------- */
/*                              COLOR TYPES                                   */
/* -------------------------------------------------------------------------- */
/*
 * RGB and RGBA color types for materials, debug rendering, and UI.
 */
/* -------------------------------------------------------------------------- */

/**
 * RGB Color - Used for mesh materials, debug rendering
 * Values should be 0-255 for standard RGB or 0-1 for normalized colors
 * 
 * @example
 * ```typescript
 * const red: RGBColor = { r: 255, g: 0, b: 0 };
 * const green: RGBColor = { r: 0, g: 1, b: 0 }; // Normalized
 * ```
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * RGBA Color - RGB with alpha channel for transparency
 * Alpha: 0 = fully transparent, 1 = fully opaque
 * 
 * @example
 * ```typescript
 * const semiTransparentRed: RGBAColor = { r: 255, g: 0, b: 0, a: 0.5 };
 * ```
 */
export interface RGBAColor extends RGBColor {
  a: number;
}
