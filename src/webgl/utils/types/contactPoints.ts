export default interface GameObjectContactPoints {
  ground: boolean;
  ceiling: boolean;
  leftSide: boolean;
  rightSide: boolean;

  edgePlatform: boolean;

  ladderCore: boolean;
  ladderTop: boolean;
  ladderBottom: boolean;
}
