import Enemy from "../enemy";

// BOUNCING — crazy barrel: bounces girder-to-girder down the screen, never takes ladders. Terminal.
const handleEnemyBouncing = (enemy: Enemy) => {
  enemy.Bounce();
};

export default handleEnemyBouncing;
