// CameraTarget — per-frame follow input the engine Camera consumes (roadmap C5 decouple).
// Plain data snapshot so the engine Camera names ZERO game concepts (D3) — no Player/PlayerStates import. The GAME builds one each frame from its Player (PlayerState -> CameraFollowState) and passes it to Camera.Update; a different game or multi-player follow just fills it differently. Carries exactly the scalars the camera's follow easing reads, so the easing branching is preserved unchanged.

// Camera vertical-follow modes in engine terms (no game PlayerState). The game maps its own state in:
// GROUNDED: rest at baseline (re-baseline to target Y while grounded); CLIMBING: track up with a lead; FALLING: follow down past a buffer, capped; JUMPING: hold the baseline (don't chase the arc).
export const CameraFollowState = {
  GROUNDED: "grounded",
  CLIMBING: "climbing",
  FALLING: "falling",
  JUMPING: "jumping",
} as const;

// Same-named const + type (the playerStates.ts idiom) so `CameraFollowState` is
// usable as BOTH a value (CameraFollowState.CLIMBING) and a type annotation.
export type CameraFollowState =
  (typeof CameraFollowState)[keyof typeof CameraFollowState];

// Per-frame follow input the camera reads. Data-shape interface (camelCase fields, D15). Each field is the exact scalar the camera read off the Player directly, before the C5 decouple.
export interface CameraTarget {
  x: number; // world X to follow (was player.CurrentPosition.x)
  y: number; // world Y to follow (was player.CurrentPosition.y)
  velocityX: number; // horizontal velocity -> look-ahead direction (was NextTranslation.x)
  followState: CameraFollowState; // vertical-follow mode (mapped from the game's state)
  isGrounded: boolean; // truly on the ground -> grounded re-baseline (was IsTouching.ground)
}
