import dat from "dat.gui";
import { DebugModule } from "../../engine/debug/debug";
import { LEVEL_REGISTRY } from "../config/levelRegistry";
import type GameDirector from "../gameDirector";

// Adds a "🗺️ Level" folder to dat.GUI: dropdown bound DIRECTLY to GameDirector.CurrentLevelName via .listen().
// Picking loads that level; F2 cycling reflects back (dat.gui polls the bound field) — no per-frame sync code.
// Feel is registry-driven (single source of truth, applied only on level load) so there's no live feel control here.
// Registered as a DebugModule by the game; engine never imports this. GameDirector is a TYPE-ONLY import (no cycle).
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
