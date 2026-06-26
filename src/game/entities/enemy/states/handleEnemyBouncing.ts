import Enemy from "../enemy";

// BOUNCING — crazy barrel: bounces girder-to-girder down the screen, never takes ladders.
// Terminal (whole life). The bounce arc (gravity + girder-contact kick) and horizontal drift
// live in enemy.Bounce; wall/girder reactions live in the enemy's collision callbacks.
const handleEnemyBouncing = (enemy: Enemy) => {
  enemy.Bounce();
};

export default handleEnemyBouncing;
