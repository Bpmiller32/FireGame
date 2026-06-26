// Player direction constants — signed numeric values for movement (velocity), collision (shapecast), and animation (sprite flip). NEUTRAL = no directional input.
const PlayerDirection = {
  // No direction / centered — no input or vertical-only checks
  NEUTRAL: 0,

  // Rightward — positive X (+1)
  RIGHT: 1,

  // Leftward — negative X (-1)
  LEFT: -1,

  // Upward — positive Y (+1); jumping, climbing up, ceiling detection
  UP: 1,

  // Downward — negative Y (-1); falling, climbing down, ground detection
  DOWN: -1,
} as const;

export default PlayerDirection;
