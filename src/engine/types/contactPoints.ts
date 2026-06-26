// Tracks which surfaces a GameObject is touching (ground/walls/ceiling/ladders/edge platforms); booleans updated each frame during collision detection.

// Contact points interface for GameObject collision states
export default interface ContactPoints {
  // ===== BASIC COLLISION DIRECTIONS =====

  // Player is touching the ground; enables jumping, resets coyote time, changes animation state
  ground: boolean;

  // Player is touching a ceiling; cancels upward velocity, prevents jumping through ceilings
  ceiling: boolean;

  // Player is touching a wall on the left side; blocks leftward movement, can enable wall slide
  leftSide: boolean;

  // Player is touching a wall on the right side; blocks rightward movement, can enable wall slide
  rightSide: boolean;

  // ===== SPECIAL PLATFORM TYPES =====

  // Player is on an edge platform; may have special behaviors, allows edge-specific animations/mechanics
  edgePlatform: boolean;

  // ===== LADDER COLLISION ZONES =====

  // Player is inside the core climbable area of a ladder; can climb up/down using directional input
  ladderCore: boolean;

  // Player is at the top of a ladder; transition from climbing to standing on the platform above
  ladderTop: boolean;

  // Player is at the bottom of a ladder; transition from climbing to standing on the ground below
  ladderBottom: boolean;
}
