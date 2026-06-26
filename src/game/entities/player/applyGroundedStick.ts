import Player from "./player";

// Grounded vertical "stick": keeps the player glued to the ground each frame WITHOUT
// distorting horizontal speed. Three cases by surface:
//
//  • Truly flat (GroundIsFlat) → 0. There is no surface to follow, and a constant downward
//    push would pin the player into a flat floor (the Bug-1 "stuck in the platform" case).
//
//  • Walkable-flat slope (GroundIsWalkableFlat, ≤ FlatToleranceDegrees) → follow the surface
//    in the direction of motion: vy = gradient · vx. The desired move (vx, vy) then runs
//    exactly along the slope tangent, so the KCC does NOT slide-project the horizontal — top
//    speed equals flat-ground speed both up and down (no climb-slow / slide-fast). The KCC's
//    skin + snap-to-ground keep the feet seated; ~0 gradient on flat makes this just `0`.
//
//  • Steeper slope (real slope, > tolerance) → the firm -MaxFallSpeed stick. The per-frame
//    surface drop there can exceed what snap-to-ground follows, so the heavy downward intent
//    is what keeps the player glued; the resulting speed change reads as intended slope feel.
//
// Run this AFTER horizontal movement so it uses this frame's vx (NextTranslation.x).
const applyGroundedStick = (player: Player) => {
  if (player.GroundIsFlat) {
    player.NextTranslation.y = 0;
  } else if (player.GroundIsWalkableFlat) {
    player.NextTranslation.y = player.GroundSlopeDyDx * player.NextTranslation.x;
  } else {
    player.NextTranslation.y = -player.MaxFallSpeed;
  }
};

export default applyGroundedStick;
