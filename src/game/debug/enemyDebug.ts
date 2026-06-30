import dat from "dat.gui";
import { DebugModule } from "../../engine/debug/debug";
import EnemyTuning from "../entities/enemy/enemyTuning";
import type GameDirector from "../gameDirector";

// "🛢️ Enemies / Barrels" folder: live sliders bound to the shared EnemyTuning object (Enemy + the
// spawner read it fresh each frame, so edits take effect immediately) plus quick manual-spawn buttons.
// GameDirector is a TYPE-ONLY import to avoid a cycle; the engine never imports this.
export default class EnemyDebug implements DebugModule {
  private director: GameDirector;

  constructor(director: GameDirector) {
    this.director = director;
  }

  // Build the Enemy folder: spawn cadence + manual spawns, then per-flavor feel, then despawn.
  public Init(ui: dat.GUI) {
    const director = this.director;
    const folder = ui.addFolder("🛢️ Enemies / Barrels");
    folder.close();

    // Spawn cadence (seconds) + flavor mix.
    const spawn = folder.addFolder("⏱️ Spawning");
    spawn
      .add(EnemyTuning, "firstDelayMin")
      .name("First Delay Min")
      .min(0)
      .max(10)
      .step(0.25);
    spawn
      .add(EnemyTuning, "firstDelayMax")
      .name("First Delay Max")
      .min(0)
      .max(10)
      .step(0.25);
    spawn
      .add(EnemyTuning, "spawnIntervalMin")
      .name("Interval Min")
      .min(0.25)
      .max(10)
      .step(0.25);
    spawn
      .add(EnemyTuning, "spawnIntervalMax")
      .name("Interval Max")
      .min(0.25)
      .max(10)
      .step(0.25);
    spawn
      .add(EnemyTuning, "bouncingEveryN")
      .name("Bouncing every N")
      .min(0)
      .max(20)
      .step(1);
    spawn
      .add(EnemyTuning, "seekingEveryN")
      .name("Seeking every N")
      .min(0)
      .max(20)
      .step(1);

    // Quick manual spawns (ignore cadence) for testing a flavor on demand.
    const actions = {
      rolling: () => director.SpawnEnemy(),
      bouncing: () => director.SpawnBouncingEnemy(),
      seeking: () => director.SpawnSeekingEnemy(),
    };
    spawn.add(actions, "rolling").name("▶ Spawn Rolling");
    spawn.add(actions, "bouncing").name("▶ Spawn Bouncing");
    spawn.add(actions, "seeking").name("▶ Spawn Seeking");

    // Rolling barrel feel (jump over it).
    const rolling = folder.addFolder("🛢️ Rolling");
    rolling
      .add(EnemyTuning, "groundSpeed")
      .name("Ground Speed")
      .min(0)
      .max(40)
      .step(0.5);
    rolling
      .add(EnemyTuning, "rollFallSpeed")
      .name("Roll Fall Speed")
      .min(0)
      .max(40)
      .step(0.5);
    rolling
      .add(EnemyTuning, "ladderDescendFactor")
      .name("Ladder Descend x")
      .min(0)
      .max(2)
      .step(0.05);
    rolling
      .add(EnemyTuning, "ladderTakeChance")
      .name("Ladder Take Chance")
      .min(0)
      .max(1)
      .step(0.05);

    // Bouncing barrel feel — Bounce Impulse is the bounce HEIGHT (stand-under-it dodge).
    const bouncing = folder.addFolder("⤴️ Bouncing");
    bouncing
      .add(EnemyTuning, "bounceImpulse")
      .name("Bounce Impulse (height)")
      .min(0)
      .max(80)
      .step(0.5);
    bouncing
      .add(EnemyTuning, "bounceGravity")
      .name("Bounce Gravity")
      .min(1)
      .max(200)
      .step(1);
    bouncing
      .add(EnemyTuning, "bounceMaxFall")
      .name("Bounce Max Fall")
      .min(0)
      .max(120)
      .step(1);
    bouncing
      .add(EnemyTuning, "bounceDriftSpeed")
      .name("Bounce Drift Speed")
      .min(0)
      .max(40)
      .step(0.5);

    // Seeking ("sideways") barrel feel.
    const seeking = folder.addFolder("➡️ Seeking");
    seeking
      .add(EnemyTuning, "seekSpeed")
      .name("Seek Speed")
      .min(0)
      .max(40)
      .step(0.5);
    seeking
      .add(EnemyTuning, "seekArrivalRadius")
      .name("Arrival Radius")
      .min(0.1)
      .max(5)
      .step(0.1);
    seeking
      .add(EnemyTuning, "seekWidthMul")
      .name("Width x (next spawn)")
      .min(1)
      .max(4)
      .step(0.1);
    seeking
      .add(EnemyTuning, "seekDriftTime")
      .name("Drift-off Time")
      .min(0)
      .max(10)
      .step(0.25);

    // Despawn kill-plane.
    folder
      .add(EnemyTuning, "killY")
      .name("Kill-plane Y")
      .min(-200)
      .max(0)
      .step(1);
  }
}
