// Rapier collision group bit masks — object.group = what it is, object.mask = what it collides with.
// Collision occurs when (a.group & b.mask) AND (b.group & a.mask); combine groups/masks with bitwise OR.

// Collision group bit masks, binary notation (0b...) for clarity
const CollisionGroups = {
  // Player collision groups

  // Player's main collision box — solid collisions with platforms and enemies
  PLAYER_BOUNDING_BOX: 0b0000000000000001, // Bit 0

  // Bit 1 is free — was PLAYER_HIT_BOX (the player's 62.5% hit sensor), removed
  // when death detection moved to the full bounding box via the contact table.

  // Enemy collision groups

  // Enemy collision group — collides with the player's bounding box and platforms
  ENEMY: 0b0000000000000100, // Bit 2

  // World collision groups

  // Platform collision group — regular platforms, one-way platforms, walls, etc.
  PLATFORM: 0b0000000000001000, // Bit 3

  // Special masks

  // Default collision group — collides with everything
  DEFAULT: 0b1111111111111111,
} as const;

export default CollisionGroups;
