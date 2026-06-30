// Live-tunable enemy/barrel knobs — ONE mutable source of truth. Enemy movement methods and
// GameDirector's spawner read these fresh every frame, and enemyDebug.ts binds dat.gui sliders to
// them (the same idea as camera.Tuning), so edits take effect on the next frame. The values here are
// the hand-tuned DK defaults. Exception: a barrel's collider WIDTH is baked at spawn, so changing
// seekWidthMul only affects barrels spawned afterwards.

const EnemyTuning = {
  // --- Rolling barrel (you jump over it) ---
  // Horizontal roll speed along a girder.
  groundSpeed: 14,
  // Downward velocity pinned every frame while rolling to hug girders/slopes.
  rollFallSpeed: 9.8,
  // Ladder-descent speed = groundSpeed * this (a touch slower than rolling).
  ladderDescendFactor: 0.65,
  // Chance to take a ladder once the oil can is lit (always takes one while unlit).
  ladderTakeChance: 0.75,

  // --- Bouncing barrel (you stand under it) ---
  // Upward velocity kicked on each girder contact — sets the bounce height. Bumped from 28 so a
  // well-positioned player can let one bounce clear over their head.
  bounceImpulse: 33,
  // Downward accel integrated each frame for the bounce arc.
  bounceGravity: 80,
  // Terminal fall speed of a bouncing barrel.
  bounceMaxFall: 40,
  // Horizontal drift speed while bouncing; direction flips at walls.
  bounceDriftSpeed: 8,

  // --- Seeking "sideways" barrel (ignores platforms, beelines through waypoints) ---
  // Constant straight-line speed toward the current waypoint.
  seekSpeed: 12,
  // Distance to a waypoint at which it counts as reached, advancing to the next.
  seekArrivalRadius: 1.0,
  // Collider width multiplier vs a normal barrel — its WIDER hitbox. Baked at spawn.
  seekWidthMul: 1.6,
  // After the last waypoint, keep drifting in the last heading this long, then despawn.
  seekDriftTime: 2.5,

  // --- Despawn ---
  // Kill-plane: any barrel whose Y falls below this is removed (off-screen cleanup).
  killY: -25,

  // --- Spawn cadence (seconds; read by GameDirector.trySpawn) ---
  // Delay before Kong's opening (oil-can) barrel.
  firstDelayMin: 3,
  firstDelayMax: 4,
  // Gap between subsequent barrels.
  spawnIntervalMin: 2,
  spawnIntervalMax: 3,
  // Flavor cadence by spawn count: every Nth barrel is bouncing, every Mth is seeking. Seeking wins
  // ties and only spawns when the level actually has waypoints. 0 disables that flavor.
  bouncingEveryN: 8,
  seekingEveryN: 6,
};

export default EnemyTuning;
