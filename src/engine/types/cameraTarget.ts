// CameraTarget — per-frame follow input the engine Camera consumes (roadmap C5 decouple).
// Plain data snapshot so the engine Camera names ZERO game concepts (D3) — no Player import.
// The game builds one each frame from its Player and passes it to Camera.Update.

// Camera vertical-follow modes in engine terms (no game PlayerState). The game maps its own state in:
// GROUNDED: rest at baseline (re-baseline to target Y while grounded); CLIMBING: track up with a lead; FALLING: follow down past a buffer, capped; JUMPING: hold the baseline (don't chase the arc).
export const CameraFollowState = {
  GROUNDED: "grounded",
  CLIMBING: "climbing",
  FALLING: "falling",
  JUMPING: "jumping",
} as const;

// const + type derived via (typeof X)[keyof typeof X] (same idiom as playerStates.ts).
// One shared name, so CameraFollowState is usable as BOTH a value and a type.
export type CameraFollowState =
  (typeof CameraFollowState)[keyof typeof CameraFollowState];

// Per-frame follow input the camera reads. Data-shape interface (camelCase fields, D15).
export interface CameraTarget {
  x: number; // world X to follow
  y: number; // world Y to follow
  velocityX: number; // horizontal velocity -> look-ahead direction
  followState: CameraFollowState; // vertical-follow mode (mapped from the game's state)
  isGrounded: boolean; // truly on the ground -> grounded re-baseline
}
