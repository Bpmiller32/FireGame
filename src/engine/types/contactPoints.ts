// Which surfaces a GameObject is touching; updated each frame during collision detection.
export default interface ContactPoints {
  ground: boolean; // enables jumping, resets coyote
  ceiling: boolean; // cancels upward velocity
  leftSide: boolean; // blocks leftward movement
  rightSide: boolean; // blocks rightward movement
  edgePlatform: boolean; // on an edge platform (edge-specific launch)
  ladderCore: boolean; // inside a ladder's climbable core
  ladderTop: boolean; // at a ladder top
  ladderBottom: boolean; // at a ladder bottom
}
