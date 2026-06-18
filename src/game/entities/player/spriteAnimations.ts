const SpriteAnimations = {
  IDLE_LEFT: {
    indicies: [1, 2],
    timing: [5, 0.1],
  },
  IDLE_RIGHT: {
    indicies: [5, 6],
    timing: [0.1, 5],
  },

  RUN_LEFT: {
    indicies: [8, 9, 10, 11],
    timing: [0.25, 0.25, 0.25, 0.25],
  },
  JUMP_LEFT: {
    indicies: [17, 18],
    timing: [0.25, 0.25],
  },
  FALL_LEFT: {
    indicies: [17, 18],
    timing: [0.25, 0.25],
  },

  RUN_RIGHT: {
    indicies: [12, 13, 14, 15],
    timing: [0.25, 0.25, 0.25, 0.25],
  },
  JUMP_RIGHT: {
    indicies: [21, 22],
    timing: [0.25, 0.25],
  },
  FALL_RIGHT: {
    indicies: [21, 22],
    timing: [0.25, 0.25],
  },
};

export default SpriteAnimations;
