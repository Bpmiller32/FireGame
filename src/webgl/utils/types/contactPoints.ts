export default interface GameObjectContactPoints {
  // Allow dynamic keys
  [key: string]: boolean;

  ground: boolean;
  ceiling: boolean;
  leftSide: boolean;
  rightSide: boolean;

  edgePlatform: boolean;

  ladderCore: boolean;
  ladderTop: boolean;
  ladderBottom: boolean;
}
