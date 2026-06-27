// Signed direction constants for movement, shapecasts, and sprite flip. NEUTRAL = no input.
const PlayerDirection = {
  NEUTRAL: 0, // no input / vertical-only checks
  RIGHT: 1, // +X
  LEFT: -1, // -X
  UP: 1, // +Y (jump, climb up, ceiling checks)
  DOWN: -1, // -Y (fall, climb down, ground checks)
} as const;

export default PlayerDirection;
