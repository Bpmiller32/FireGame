import Enemy from "../enemy";
import EnemyStates from "../enemyStates";

// DESCENDING — barrel takes a ladder: straight down, platform collisions off so it passes through
// girders. Resumes rolling at the ladder bottom sensor; a short cooldown there stops oscillation.
const handleEnemyDescending = (enemy: Enemy) => {
  // Change state
  if (enemy.IsAtLadderBottom) {
    // The cooldown was already armed when the bottom sensor fired (in the
    // enemy's ladder poll); just land and resume rolling on this same frame.
    enemy.IsGrounded = true; // landed at the ladder foot, back on the girder
    enemy.State = EnemyStates.ROLLING;
    enemy.RollHorizontally();
    return;
  }

  // Handle Descending state
  enemy.DescendLadder();
};

export default handleEnemyDescending;
