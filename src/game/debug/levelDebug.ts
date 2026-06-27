import dat from "dat.gui";
import { DebugModule } from "../../engine/debug/debug";
import { LEVEL_REGISTRY } from "../config/levelRegistry";
import type GameDirector from "../gameDirector";

// "🗺️ Level" folder: dropdown bound to GameDirector.CurrentLevelName via .listen() so F2 cycling reflects back.
// GameDirector is a TYPE-ONLY import to avoid a cycle; engine never imports this.
export default class LevelDebug implements DebugModule {
  private director: GameDirector;

  constructor(director: GameDirector) {
    this.director = director;
  }

  // Build the Level folder and bind the level dropdown.
  public Init(ui: dat.GUI) {
    const director = this.director;
    const folder = ui.addFolder("🗺️ Level");
    folder.open();

    // Level select — picking loads that level; F2 cycling reflects here.
    folder
      .add(director, "CurrentLevelName", LEVEL_REGISTRY.map((level) => level.name))
      .name("Level (F2 cycles)")
      .listen()
      .onChange((name: string) => director.LoadLevelByName(name));
  }
}
