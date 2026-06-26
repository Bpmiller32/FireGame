// Generic pure math utility functions, no game-state dependencies.

// Move a value towards a target by at most maxDelta.
export function moveTowards(
  current: number,
  target: number,
  maxDelta: number
): number {
  // If already at target or close enough, return target
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  // Move towards target by maxDelta
  return current + Math.sign(target - current) * maxDelta;
}

// ---- Seeded pseudo-random number generator (deterministic) ----------------
// A tiny mulberry32 PRNG so gameplay randomness is REPRODUCIBLE: the same seed
// always yields the same sequence. The game seeds it (see GameDirector); a replay,
// a lockstep peer, or a deterministic test just pins the same seed. This is the
// randomness half of the fixed-timestep determinism work — Math.random() has no
// seed and would desync any replay on the first roll.
let rngState = 0x9e3779b9;

// Seed the generator. Same seed in -> same random() sequence out.
export function seedRandom(seed: number): void {
  rngState = seed >>> 0;
}

// Next deterministic value in [0, 1). Drop-in for Math.random().
export function random(): number {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Deterministic value in [min, max).
export function randomRange(min: number, max: number): number {
  return min + random() * (max - min);
}

// True if a random event should occur given probability (0 to 1). Uses the
// seeded generator so chance-based gameplay stays reproducible.
export function percentChance(probability: number): boolean {
  return random() < probability;
}
