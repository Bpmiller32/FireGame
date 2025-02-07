interface LevelEntity {
  width: number;
  depth: number;
  height: number;
  position: number[];
  rotation: number[];
  type: string;
  value0?: number;
  value1?: number;
  value2?: number;
  value3?: number;
}

interface LevelData {
  [key: string]: LevelEntity;
}

export default LevelData;
