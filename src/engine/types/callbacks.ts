/* -------------------------------------------------------------------------- */
/*                            CALLBACK TYPES                                  */
/* -------------------------------------------------------------------------- */
/*
 * Common callback function signatures used throughout the game engine.
 */
/* -------------------------------------------------------------------------- */

/**
 * Generic callback with no parameters
 * 
 * @example
 * ```typescript
 * const onComplete: VoidCallback = () => {
 *   console.log("Task completed!");
 * };
 * ```
 */
export type VoidCallback = () => void;

/**
 * Callback that receives a single GameObject
 * 
 * @example
 * ```typescript
 * const onSpawn: GameObjectCallback<Player> = (player) => {
 *   console.log(`Player spawned at ${player.currentPosition}`);
 * };
 * ```
 */
export type GameObjectCallback<T = any> = (gameObject: T) => void;

/**
 * Callback that receives two GameObjects (collision/sensor events)
 * 
 * @example
 * ```typescript
 * const onCollision: CollisionCallback<Player, Enemy> = (player, enemy) => {
 *   console.log(`Player hit enemy!`);
 *   gameOver();
 * };
 * ```
 */
export type CollisionCallback<T = any, U = any> = (obj1: T, obj2: U) => void;

/**
 * Error callback
 * 
 * @example
 * ```typescript
 * const onError: ErrorCallback = (error) => {
 *   console.error(`Error occurred: ${error}`);
 * };
 * ```
 */
export type ErrorCallback = (error: Error | string) => void;

/**
 * Progress callback (0-1 normalized)
 * 
 * @example
 * ```typescript
 * const onLoadProgress: ProgressCallback = (progress) => {
 *   console.log(`Loading: ${(progress * 100).toFixed(0)}%`);
 * };
 * ```
 */
export type ProgressCallback = (progress: number) => void;
