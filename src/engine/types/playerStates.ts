// Player state constants for the player state machine; controls animation, physics behavior, input handling, and transitions. Each state has a handler in player/state/.

// Player state constants
const PlayerStates = {
  // Standing still on the ground; -> RUNNING (horizontal input), JUMPING (jump), FALLING (walk off edge), CLIMBING (ladder + up/down)
  IDLE: "idle",

  // Moving horizontally on the ground; -> IDLE (input released), JUMPING (jump), FALLING (leave ground), CLIMBING (ladder + up/down)
  RUNNING: "running",

  // Ascending; -> FALLING (jump released or max jump time), IDLE/RUNNING (land), CLIMBING (ladder + up/down)
  JUMPING: "jumping",

  // Descending; -> IDLE/RUNNING (land), CLIMBING (ladder + up/down)
  FALLING: "falling",

  // On a ladder; -> IDLE (reach top/bottom), FALLING (leave ladder), JUMPING (jump while on ladder)
  CLIMBING: "climbing",
} as const;

// Type for player state values; ensures only valid states are used
export type PlayerState = typeof PlayerStates[keyof typeof PlayerStates];

export default PlayerStates;
