import Enemy from "../enemy";
import EnemyStates from "../enemyStates";

// ROLLING — owns the per-frame roll and the ladder decision (wall-reverse/edge-turn live in
// collision callbacks). Rolls the ladder dice once per entry: always take it while the oil can is unlit.
const handleEnemyRolling = (enemy: Enemy) => {
  // Change state
  if (enemy.IsInsideLadder) {
    // Decide once per continuous occupancy of the ladder core.
    if (!enemy.DidJudgeLadder) {
      enemy.DidJudgeLadder = true;

      if (enemy.DecideTakeLadder()) {
        enemy.SnapDirectionToLadder();
        enemy.State = EnemyStates.DESCENDING;
        enemy.DescendLadder(); // begin the descent on this same frame
        return;
      }
    }
  } else {
    // Off the ladder — re-arm the decision for the next ladder entered.
    enemy.DidJudgeLadder = false;
  }

  // Handle Rolling state
  enemy.RollHorizontally();
};

export default handleEnemyRolling;
