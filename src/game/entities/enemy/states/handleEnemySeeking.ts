import Enemy from "../enemy";

// SEEKING — the "sideways" barrel: ignores platform geometry and beelines straight through the
// shared waypoint sequence, then drifts off and despawns. Kills the player on contact. Terminal.
const handleEnemySeeking = (enemy: Enemy) => {
  enemy.SeekWaypoint();
};

export default handleEnemySeeking;
