import Player from "./player";

// Grounded vertical "stick": glues the player to the ground each frame without distorting
// horizontal speed. By surface:
//  • Flat → 0. A constant downward push would pin the player into a flat floor.
//  • Walkable-flat slope → vy = gradient·vx, so the move runs along the tangent and the KCC
//    doesn't slide-project the horizontal (top speed = flat-ground speed up and down).
//  • Steeper slope → firm -MaxFallSpeed; the per-frame drop can exceed snap-to-ground, so the
//    heavy downward intent keeps the feet glued.
// Run AFTER horizontal movement so it uses this frame's vx (NextTranslation.x).
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
