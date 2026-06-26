import Enemy from "../enemy";
import EnemyStates from "../enemyStates";

// ROLLING — barrel travels along a girder; wall-reverse and edge-turn live in its collision
// callbacks, this handler owns the per-frame roll and the ladder decision. Inside an unjudged
// ladder it rolls the dice once per entry: always take it while the oil can is unlit (the
// relentless DK opening), else a fixed max-difficulty chance; taking it snaps direction and descends.
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
