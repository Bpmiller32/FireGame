// GameDirector - central controller for game state, entities, levels, spawning.

import * as THREE from "three";
import Experience from "../engine/core/experience";
import Player from "./entities/player/player";
import Platform from "./entities/platform";
import Enemy from "./entities/enemy/enemy";
import TrashCan from "./entities/trashCan";
import WinFlag from "./entities/winFlag";
import CameraSensor from "./entities/cameraSensor";
import LadderSensor from "./entities/ladderSensor";
import Teleporter from "./entities/teleporter";
import GameObject from "../engine/entities/gameObject";
import Camera from "../engine/camera/camera";
import PlayerStates from "../engine/types/playerStates";
import { CameraFollowState, CameraTarget } from "../engine/types/cameraTarget";
import Time from "../engine/core/time";
import ResourceLoader from "../engine/resources/resourceLoader";
import Emitter from "../engine/events/eventBus";
import GameUtils from "./gameUtils";
import LevelData from "../engine/types/levelData";
import EntityType from "./types/entityType";
import ENTITY_FACTORIES, { FactoryContext } from "./config/entityFactories";
import {
  LEVEL_REGISTRY,
  FEEL_PROFILES,
  FeelProfile,
  DEFAULT_LEVEL_INDEX,
} from "./config/levelRegistry";
import { seedRandom, randomRange } from "../engine/helpers/mathHelpers";

// A level-data entity the uniform update loop may tick. update() is optional so
// entities without one are simply skipped (optional chaining). The second arg is
// the trash can the enemy reads; entities that don't need it ignore it.
type UpdatableEntity = {
  Update?(player: Player, trashCan?: TrashCan): void;
};

// Fixed PRNG seed so a run is reproducible — the same barrel sequence every play
// (the determinism payoff). Change this, or seedRandom(Date.now()), for varied runs.
const RNG_SEED = 1337;

export default class GameDirector {
  // Core systems
  private experience: Experience;
  private scene: THREE.Scene;
  private time: Time;
  private camera: Camera;
  private resources: ResourceLoader;

  // Game entities
  public Player!: Player;
  // One unified barrel array now — normal and crazy barrels are both Enemy,
  // distinguished by their starting FSM state (D28 fold-in of the old CrazyEnemy).
  public Enemies: Enemy[] = [];
  public Platforms: Platform[] = [];
  public Walls: Platform[] = [];
  public TrashCans: TrashCan[] = [];
  public WinFlags: WinFlag[] = [];
  public Teleporters: Teleporter[] = [];
  public CameraSensors: CameraSensor[] = [];
  public LadderTopSensors: LadderSensor[] = [];
  public LadderCoreSensors: LadderSensor[] = [];
  public LadderBottomSensors: LadderSensor[] = [];

  // Level management
  public LevelData!: LevelData;
  public GraphicsObject: GameObject;
  private ambientLight?: THREE.AmbientLight;
  private playerHasBeenSpawned = false;

  // Registry-driven level selection. CurrentLevelName is public so the dat.gui
  // LevelDebug level dropdown binds to it directly (.listen() reflects F2
  // cycling); currentLevelIndex drives the cycle math. levelLoaded gates the
  // unload-before-load; isLoading is the loading-state lock (re-entrancy guard +
  // Update freeze) that the Vue loading screen mirrors via loading events.
  public CurrentLevelName: string = LEVEL_REGISTRY[DEFAULT_LEVEL_INDEX].name;
  private currentLevelIndex = -1;
  private levelLoaded = false;
  private isLoading = false;

  // Enemy spawning system — driven by the frame loop (Update → trySpawn), not a
  // wall-clock timer. These are the cadence counters (all in seconds via Time.Delta).
  private isSpawningEnemies = false;
  private timeSinceLastSpawn = 0;
  private currentSpawnInterval = 0;
  private enemyCount = 0;

  // Stored event-handler refs so Destroy() removes EXACTLY our listeners — a bare
  // Emitter.off("gameStart") on the shared bus would wipe other modules' handlers
  // (e.g. App.vue's). Arrow fields capture `this`; they're only invoked on events.
  private onResourcesReady = async () => {
    await this.loadLevelByIndex(DEFAULT_LEVEL_INDEX);
  };
  private onGameStart = () => {
    this.experience.Physics.SetPaused(false);
    this.isSpawningEnemies = true;
  };
  private onGameOver = () => {
    this.experience.Physics.SetPaused(true);
    this.isSpawningEnemies = false;
  };
  private onGameWin = () => {
    this.experience.Physics.SetPaused(true);
    this.isSpawningEnemies = false;
  };
  private onGameReset = () => {
    this.experience.Physics.SetPaused(false);
    this.resetGameState();
  };
  private onSwitchLevel = async () => {
    await this.switchToNextLevel();
  };
  private onGameObjectRemoved = (removed: GameObject) => {
    removed.Destroy();
  };

  constructor() {
    // Seed gameplay randomness deterministically (same seed -> same barrel
    // sequence). Pinning the seed is what makes a run reproducible.
    seedRandom(RNG_SEED);
    console.log(`[FireGame] RNG seed = ${RNG_SEED} (deterministic run)`);

    // Initialize core systems
    this.experience = Experience.GetInstance();
    this.scene = this.experience.Scene;
    this.time = this.experience.Time;
    this.camera = this.experience.Camera;
    this.resources = this.experience.Resources;
    this.GraphicsObject = new GameObject();

    this.setupEventHandlers();
  }

  // Wire game-lifecycle listeners using stored handler refs, so Destroy() can
  // remove exactly these (and no one else's) from the shared bus. Destroyed-barrel
  // cleanup is no longer a 5s wall-clock sweep — it's compacted in place each frame
  // in Update (GameUtils.CompactDestroyedObjects).
  private setupEventHandlers() {
    Emitter.on("resourcesReady", this.onResourcesReady);
    Emitter.on("gameStart", this.onGameStart);
    Emitter.on("gameOver", this.onGameOver);
    Emitter.on("gameWin", this.onGameWin);
    Emitter.on("gameReset", this.onGameReset);
    Emitter.on("switchLevel", this.onSwitchLevel);
    Emitter.on("gameObjectRemoved", this.onGameObjectRemoved);
  }

  // --- Level management ---

  // Load a level from a GLB file (Blender/Blockbench export). glbPath is the
  // bundled GLB URL, normally the registry entry's source (via levelRegistry.levelUrl).
  public async LoadGLBLevel(glbPath: string) {
    // Use the unified ResourceLoader to parse the GLB level
    const parsedLevelData = await this.resources.ParseLevel(glbPath);
    await this.LoadLevelData(parsedLevelData);
  }

  // Load a level from parsed LevelData (from the GLB parser). Graphics overlay +
  // feel/camera setup are applied by loadLevelByIndex; this is just the
  // data-source-agnostic spawn pass.
  public async LoadLevelData(levelData: LevelData) {
    this.LevelData = levelData;

    // Setup ambient light for PBR materials
    if (!this.ambientLight) {
      this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
      this.scene.add(this.ambientLight);
    }

    // Load spawn points first (player first so sensors have a target)
    this.setPlayerStart();
    this.setCameraStart();

    // Spawn every level-data-placed entity through the factory registry.
    // Each factory pushes the entity it builds into the right derived array on
    // the context (which aliases this director's typed query arrays). Rows whose
    // type has no factory (PlayerStart/CameraStart handled above, GraphicsObject,
    // Unknown) are simply skipped.
    const ctx = this.getFactoryContext();
    for (const data of Object.values(this.LevelData)) {
      const factory = ENTITY_FACTORIES[data.type];
      if (factory) factory(data, ctx, data.type);
    }

    // Fresh level → restart the spawn cadence cleanly (gameStart/reset gate
    // whether it's actually running via isSpawningEnemies).
    this.resetSpawner();
  }

  // Build the factory context — a plain struct aliasing the typed query arrays the
  // factories push into plus the camera the camera-sensor factory needs. Same array
  // instances the director queries (trashCans[0], ladder sub-arrays), populated in place.
  private getFactoryContext(): FactoryContext {
    return {
      camera: this.camera,
      walls: this.Walls,
      platforms: this.Platforms,
      trashCans: this.TrashCans,
      winFlags: this.WinFlags,
      teleporters: this.Teleporters,
      cameraSensors: this.CameraSensors,
      ladderTopSensors: this.LadderTopSensors,
      ladderCoreSensors: this.LadderCoreSensors,
      ladderBottomSensors: this.LadderBottomSensors,
    };
  }

  // All level-spawned entity arrays in one place. UnloadLevelData tears them ALL
  // down by iterating this, so a new entity kind is added to its typed field, the
  // factory context, and this list — never hand-listed in teardown again.
  private levelEntityArrays(): GameObject[][] {
    return [
      this.Enemies,
      this.TrashCans,
      this.WinFlags,
      this.CameraSensors,
      this.LadderTopSensors,
      this.LadderCoreSensors,
      this.LadderBottomSensors,
      this.Walls,
      this.Platforms,
      this.Teleporters,
    ];
  }

  // Unload current level and cleanup all entities
  public UnloadLevelData() {
    // emit removal for each entity, then empty the array in place (stable ref)
    const destroyAll = <T extends GameObject>(entities: T[]) => {
      entities.forEach((entity) => Emitter.emit("gameObjectRemoved", entity));
      entities.length = 0;
    };
    this.levelEntityArrays().forEach((arr) => destroyAll(arr));

    // Cleanup graphics and lighting. Destroy() is now idempotent (it latches
    // IsBeingDestroyed and won't run a second time), so the long-lived
    // GraphicsObject is replaced with a fresh instance for the next level's overlay
    // instead of being destroyed-then-reused (which left a permanent destroy latch).
    this.GraphicsObject.Destroy();
    this.GraphicsObject = new GameObject();
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight = undefined;
    }
  }

  // --- Level spawn points ---

  // Spawn or teleport the player to the level's PlayerStart
  private setPlayerStart() {
    for (const data of Object.values(this.LevelData)) {
      if (data.type !== EntityType.PLAYER_START) continue;

      const x = data.position[0];
      const z = data.position[2];

      if (this.playerHasBeenSpawned) {
        this.Player.TeleportToPosition(x, z);
        return;
      }

      this.Player = new Player({ width: 1.75, height: 4 }, { x, y: z });
      this.playerHasBeenSpawned = true;
      return;
    }
  }

  // Position the camera at the level's CameraStart point
  private setCameraStart() {
    for (const data of Object.values(this.LevelData)) {
      if (data.type !== EntityType.CAMERA_START) continue;
      const x = data.position[0];
      const y = data.position[1];
      const z = data.position[2];
      this.camera.TeleportToPosition(x, z, y);
      return;
    }
  }

  // --- Game state ---

  // Reset game to initial state
  private resetGameState() {
    // Re-seed so a reset replays the identical sequence (deterministic restart).
    seedRandom(RNG_SEED);

    // Reset player position
    this.Player.TeleportToPosition(
      this.Player.InitialTranslation.x,
      this.Player.InitialTranslation.y,
    );

    // Reset camera position
    this.camera.TeleportToPosition(
      this.camera.InitialPosition.x,
      this.camera.InitialPosition.y,
      this.camera.InitialPosition.z,
    );

    // Clear enemies
    this.Enemies.forEach((enemy) => Emitter.emit("gameObjectRemoved", enemy));

    // Reset trash cans
    this.TrashCans.forEach((trashCan) => (trashCan.IsOnFire = false));

    // Restart spawning from a clean slate (the frame loop drives it now).
    this.isSpawningEnemies = true;
    this.resetSpawner();
  }

  // Zero the spawn-cadence counters so frame-driven spawning restarts cleanly.
  private resetSpawner() {
    this.timeSinceLastSpawn = 0;
    this.currentSpawnInterval = 0;
    this.enemyCount = 0;
  }

  // REGISTRY-DRIVEN LEVEL SELECTION

  // Load a level by registry index — the single load path boot, the F2 cycle, and
  // the dat.gui level select all funnel through. Applies the entry's per-level setup
  // (feel profile, camera follow, optional graphics overlay), unloading the current
  // level first if one is loaded.
  // Guarded by isLoading: the GLB parse is async and callers are fire-and-forget, so
  // without the guard a second load (F2 mash / select mid-load) would interleave
  // teardown + respawn → double entities, leaked light, mismatched index. One boolean,
  // old-school (D5). loadingStarted/Finished bracket the window so the Vue loading
  // screen covers it.
  private async loadLevelByIndex(index: number) {
    const entry = LEVEL_REGISTRY[index];
    if (!entry || this.isLoading) return;

    this.isLoading = true;
    Emitter.emit("loadingStarted");

    // Remember the current level so a failed load can roll back to it instead of
    // leaving the player in an empty world with mismatched bookkeeping.
    const prevIndex = this.currentLevelIndex;
    const prevName = this.CurrentLevelName;

    try {
      // A registry row whose GLB couldn't be resolved (levelUrl miss) carries an
      // empty source. Fail loud HERE rather than letting "" reach the loader,
      // where gltfLoader.load("") fetches the HTML page and throws a confusing
      // parse error far from the real cause.
      if (!entry.source) {
        throw new Error(
          `level "${entry.name}" has no resolvable GLB source — is it in src/assets/levels?`,
        );
      }

      // Parse the GLB FIRST, BEFORE tearing down the current level. If the parse
      // throws (missing/corrupt GLB), the old level is still fully intact — we
      // catch, roll back, and the player never drops into emptiness.
      const parsedLevelData = await this.resources.ParseLevel(entry.source);

      // Validate the optional graphics-overlay asset is present BEFORE the unload,
      // so a missing/failed graphics item also fails into the rollback while the old
      // level is intact — rather than throwing AFTER teardown (the one remaining
      // post-unload throw path). LoadLevelData's spawn pass is deterministic.
      if (entry.graphics && !this.resources.Items[entry.graphics]) {
        throw new Error(
          `level "${entry.name}" graphics asset "${entry.graphics}" failed to load`,
        );
      }

      // Parse + validate succeeded — now it's safe to swap. Tear down the old level
      // (no-op on the first/boot load; spawning is already frozen by isLoading).
      if (this.levelLoaded) {
        this.UnloadLevelData();
      }

      this.currentLevelIndex = index;
      this.CurrentLevelName = entry.name;

      await this.LoadLevelData(parsedLevelData);

      // Optional detailed-art overlay drawn on top of the simple collision shapes
      // (collision/graphics separation). Only loaded when the entry names a
      // graphics resource; collision-only levels skip it.
      if (entry.graphics) {
        await this.GraphicsObject.CreateObjectGraphics(
          this.resources.Items[entry.graphics],
        );
      }

      // Per-level player/camera setup. Feel is registry-driven and the single
      // source of truth — applied only here.
      this.applyFeelProfile(entry.feelProfile);
      this.camera.SetCameraFollow(entry.cameraFollow);

      this.levelLoaded = true;

      // Go live on the freshly-loaded level: unpause + enable spawning + clear any
      // game-over/win UI (App.vue listens too). This is the SINGLE place the game
      // starts running — boot, the F2 switch, and the debug level select all funnel
      // through here. Only fires on a successful load (a throw skips to catch).
      Emitter.emit("gameStart");
    } catch (error) {
      // Roll back to the last good level so a failed switch is a no-op, not a
      // teardown into emptiness. Because the parse happens BEFORE the unload, a
      // parse failure leaves the current level untouched; this restores the
      // index/name bookkeeping to match. Logged loud, never rejected out (that would
      // surface as an unhandled rejection and skip the finally's overlay close).
      console.error(`Failed to load level "${entry.name}":`, error);
      this.currentLevelIndex = prevIndex;
      this.CurrentLevelName = prevName;
    } finally {
      this.isLoading = false;
      Emitter.emit("loadingFinished");
    }
  }

  // Load the level whose registry name matches — used by the dat.gui level select.
  // Fire-and-forget async (the isLoading guard serializes overlaps).
  public LoadLevelByName(name: string) {
    const index = LEVEL_REGISTRY.findIndex((level) => level.name === name);
    if (index >= 0) this.loadLevelByIndex(index);
  }

  // Cycle to the next level in the registry (F2 / switchLevel event).
  private async switchToNextLevel() {
    const next = (this.currentLevelIndex + 1) % LEVEL_REGISTRY.length;
    await this.loadLevelByIndex(next);
  }

  // --- Feel profiles ---

  // Apply a feel profile to the current player. Feel is the single source of truth:
  // set ONLY from the loading level's registry entry — no live debug swap bypasses
  // it. (A future "trigger sets the feel" mechanic would promote this to a public hook.)
  private applyFeelProfile(profile: FeelProfile) {
    if (!this.Player) return;
    FEEL_PROFILES[profile](this.Player);
  }

  // --- Enemy spawning ---

  // Frame-driven enemy spawning (called once per frame from Update). Replaces the old
  // wall-clock setInterval: one clock now (Time.Delta), and a fresh boot spawns
  // without needing a reset. Cadence preserved — the FIRST barrel is a crazy one Kong
  // throws at the oil can to light it, then a normal/crazy mix
  // every few seconds with every 8th crazy. The cadence counters are advanced BEFORE
  // the (async) spawn so a stutter frame can't double-spawn.
  private trySpawn() {
    if (!this.isSpawningEnemies || this.experience.Physics.IsPaused) return;

    this.timeSinceLastSpawn += this.time.Delta;

    // First barrel: Kong's opening throw — a crazy barrel aimed at the oil can.
    if (this.currentSpawnInterval === 0) {
      this.timeSinceLastSpawn = 0;
      this.currentSpawnInterval = randomRange(3, 4); // 3-4 seconds
      this.spawnOilCanBarrel();
      return;
    }

    // Subsequent barrels: mostly normal, every 8th crazy.
    if (this.timeSinceLastSpawn >= this.currentSpawnInterval) {
      this.timeSinceLastSpawn = 0;
      this.currentSpawnInterval = randomRange(2, 3); // 2-3 seconds
      this.enemyCount++;

      if (this.enemyCount % 8 === 0) {
        this.SpawnCrazyEnemy();
      } else {
        this.SpawnEnemy();
      }
    }
  }

  // The opening crazy barrel Kong hurls at the oil can to light it. Spawned at the
  // normal throw point but with its bounce drift aimed toward the can so it reaches
  // and ignites it (igniting also consumes the barrel, via the contact table). Drift
  // defaults rightward if the can is directly below or absent.
  private spawnOilCanBarrel() {
    const spawn = { x: -13, y: 50 };
    const can = this.TrashCans[0];
    let aim = 0;
    if (can) aim = Math.sign(can.CurrentTranslation.x - spawn.x);
    this.SpawnCrazyEnemy(spawn, aim);
  }

  // Spawn a NORMAL barrel (rolls the girders, may take ladders).
  public async SpawnEnemy(position = { x: -13, y: 50 }) {
    const enemy = new Enemy(1, position);
    await enemy.CreateObjectGraphics(this.resources.Items.enemy);
    this.Enemies.push(enemy);
  }

  // Spawn a CRAZY barrel (vertical toss that bounces down, never takes ladders).
  // bounceDirection is its horizontal drift sign.
  public async SpawnCrazyEnemy(
    position = { x: -13, y: 50 },
    bounceDirection = 1,
  ) {
    const enemy = new Enemy(1, position, 0, true, bounceDirection);
    await enemy.CreateObjectGraphics(this.resources.Items.enemy);
    this.Enemies.push(enemy);
  }

  // --- Per-frame ---

  // SIM update — runs inside the fixed-timestep loop (0..N times per frame), so all
  // movement integrates at the constant step. Camera + visual interpolation are NOT
  // here; they run once per FRAME in RenderUpdate, decoupled from the sim rate.
  public Update() {
    // Freeze game logic while a level is loading (entities are being torn down /
    // respawned; the Vue loading screen covers the canvas). Re-entrancy is also
    // guarded in loadLevelByIndex.
    if (this.isLoading) return;

    // Guard: Player must be ready
    if (!this.Player?.PhysicsBody) return;

    this.Player.Update();

    // Spawn + update enemies (runtime-spawned, not level-data), driven by the frame
    // clock here. Compact destroyed barrels in place right after — promptly, and
    // keeping the array reference stable (was a 5s wall-clock sweep).
    // TODO: uncomment for enemies
    // this.trySpawn();
    const firstTrashCan = this.TrashCans[0];
    this.Enemies.forEach((enemy) => enemy.Update(this.Player, firstTrashCan));
    GameUtils.CompactDestroyedObjects(this.Enemies);

    // Update every level-data entity that has an update, in one uniform loop.
    // Runs AFTER player.update() so the platform one-way toggle reads this frame's
    // player state. Entities without an update are skipped. (WinFlag no longer
    // updates — it wins via the contact table, not a per-frame shapecast.)
    const updatableLevelEntities: UpdatableEntity[] = this.Platforms;
    for (const e of updatableLevelEntities) {
      e.Update?.(this.Player, firstTrashCan);
    }

    // Update ladder detection (manual for now, will convert to sensor callbacks later)
    this.Player.UpdateLadderState(
      GameUtils.IsAnySensorTriggered(this.LadderTopSensors),
      GameUtils.IsAnySensorTriggeredObjectFullyInside(
        this.LadderCoreSensors,
        this.Player,
      ),
      GameUtils.IsAnySensorTriggered(this.LadderBottomSensors),
    );
  }

  // RENDER update — runs once per FRAME (Experience.OnRenderUpdate) with the
  // interpolation alpha. Lerps the moving entities between their last two sim states
  // so motion is smooth ABOVE the sim rate, then follows the interpolated player
  // with the camera. Render and sim rates are fully decoupled — buttery on a 144Hz
  // display, no judder on a 60Hz one.
  public RenderUpdate(alpha: number) {
    if (this.isLoading) return;
    if (!this.Player?.PhysicsBody) return;

    this.Player.InterpolateGraphics(alpha);
    for (const enemy of this.Enemies) {
      enemy.InterpolateGraphics(alpha);
    }

    // Camera follows the interpolated visual position (C5 decouple: plain snapshot).
    this.camera.Update(this.cameraTargetFromPlayer(this.Player));
  }

  // Map the Player into the engine's CameraTarget (C5 decouple). The camera reads
  // only these scalars, never the game Player/PlayerState directly — so camera.ts
  // no longer imports anything from game/.
  private cameraTargetFromPlayer(player: Player): CameraTarget {
    let followState: CameraFollowState;
    switch (player.State) {
      case PlayerStates.CLIMBING:
        followState = CameraFollowState.CLIMBING;
        break;
      case PlayerStates.FALLING:
        followState = CameraFollowState.FALLING;
        break;
      case PlayerStates.JUMPING:
        followState = CameraFollowState.JUMPING;
        break;
      default:
        followState = CameraFollowState.GROUNDED;
    }

    return {
      // Follow the INTERPOLATED render position (set by InterpolateGraphics just
      // before this in RenderUpdate) so the camera tracks the smooth visual player,
      // not the stepped sim position.
      x: player.RenderTranslation.x,
      y: player.RenderTranslation.y,
      velocityX: player.NextTranslation.x,
      followState,
      isGrounded: player.IsTouching.ground,
    };
  }

  // --- Teardown ---

  public Destroy() {
    // Remove EXACTLY our handlers (pass the ref) so we don't wipe other modules'
    // listeners on the shared bus. gameWin is removed too now (it used to leak).
    Emitter.off("resourcesReady", this.onResourcesReady);
    Emitter.off("gameStart", this.onGameStart);
    Emitter.off("gameOver", this.onGameOver);
    Emitter.off("gameWin", this.onGameWin);
    Emitter.off("gameReset", this.onGameReset);
    Emitter.off("switchLevel", this.onSwitchLevel);

    // Tear down level entities BEFORE removing the gameObjectRemoved handler:
    // UnloadLevelData EMITS gameObjectRemoved, and that handler is what turns it into
    // the actual entity.Destroy(). Removing it first would leak every entity's body
    // and meshes on teardown (HMR / unmount). Off it only after the teardown.
    this.UnloadLevelData();
    Emitter.off("gameObjectRemoved", this.onGameObjectRemoved);
  }
}
