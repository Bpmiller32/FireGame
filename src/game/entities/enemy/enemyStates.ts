// Enemy state machine for the barrel enemy (DK normal/crazy); game-side per ADR-0003 / D3.

const EnemyStates = {
  // Rolling along a girder; at an unjudged ladder it decides whether to descend. -> DESCENDING
  ROLLING: "rolling",

  // Taking a ladder — straight down, passing through platforms. -> ROLLING at the bottom sensor
  DESCENDING: "descending",

  // Bouncing barrel: bounces girder-to-girder, never takes ladders. Terminal.
  BOUNCING: "bouncing",

  // Seeking "sideways" barrel: ignores platforms, beelines waypoint-to-waypoint, then drifts off. Terminal.
  SEEKING: "seeking",
} as const;

// Type for enemy state values — ensures only valid states are used.
export type EnemyState = (typeof EnemyStates)[keyof typeof EnemyStates];

export default EnemyStates;
