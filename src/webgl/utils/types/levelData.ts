export interface LevelEntity {
  width: number;
  depth: number;
  height: number;
  position: number[];
  rotation: number[];
  type: string;
  vertices?: number[];
  value0?: number;
  value1?: number;
  value2?: number;
  value3?: number;
}

export interface LevelData {
  [key: string]: LevelEntity;
}

export type { LevelData as default };
