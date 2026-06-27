// State machine states; each has a handler in player/states/. Drives anim, physics, transitions.
const PlayerStates = {
  IDLE: "idle", // -> RUNNING, JUMPING, FALLING (walk off), CLIMBING
  RUNNING: "running", // -> IDLE, JUMPING, FALLING, CLIMBING
  JUMPING: "jumping", // ascending -> FALLING (release/max time), land, CLIMBING
  FALLING: "falling", // descending -> land, CLIMBING
  CLIMBING: "climbing", // on a ladder -> IDLE (top/bottom), FALLING, JUMPING
} as const;

// const + type derived from it so PlayerState works as both a value and a type.
export type PlayerState = typeof PlayerStates[keyof typeof PlayerStates];

export default PlayerStates;
