/* -------------------------------------------------------------------------- */
/*                  Convenience functions and utils for game                  */
/* -------------------------------------------------------------------------- */

import { Vector2 } from "@dimforge/rapier2d";

export default class GameMath {
  // Moves a value current towards target
  // current: the current value, target: the value to move towards, maxDelta: the maximum change applied to the current value
  public static moveTowardsPoint(
    current: number,
    target: number,
    maxDelta: number
  ) {
    if (Math.abs(target - current) <= maxDelta) {
      return target;
    }

    return current + Math.sign(target - current) * maxDelta;
  }

  public static moveTowardsVector(
    current: Vector2,
    target: Vector2,
    maxDelta: number
  ) {
    const distance = new Vector2(target.x - current.x, target.y - current.y);
    const magnitude = Math.sqrt(
      distance.x * distance.x + distance.y * distance.y
    );

    if (magnitude <= maxDelta || magnitude == 0) {
      return target;
    }
    // // const newTarget = new Vector2(current.x + distance.x, current.y + distance.y)
    //     return current + a / magnitude * maxDistanceDelta;
  }

  public static lerp(
    start: number,
    end: number,
    t: number,
    deltaTime: number,
    duration: number
  ): number {
    const clampedT = Math.min(Math.max(t, 0), 1); // Clamp t to [0, 1]
    const easedT = 0.5 * (1 - Math.cos(Math.PI * clampedT));
    return start + (end - start) * easedT * deltaTime * (1 / duration);
  }

  public static getRandomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  public static clamp(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  public static easeInOutSin(time: number) {
    return 0.5 * (1 - Math.cos(Math.PI * time));
  }
}
