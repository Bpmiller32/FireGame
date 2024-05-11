import blenderData from "./blenderExport.json";
import Box from "./box";

export default class ImportedGeometry {
  public allPlatforms: Box[];

  constructor() {
    this.allPlatforms = [];

    for (const [key, value] of Object.entries(blenderData)) {
      this.allPlatforms.push(
        new Box(
          { width: value.width, height: value.height },
          { x: value.position[0], y: value.position[2] }
        )
      );
    }
  }
}
