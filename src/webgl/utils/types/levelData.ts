interface LevelEntity {
  width: number;
  depth: number;
  height: number;
  position: number[];
  rotation: number[];
  type: string;
  visible?: boolean;
  value?: number;
}

interface LevelData {
  [key: string]: LevelEntity;
}

export default LevelData;
