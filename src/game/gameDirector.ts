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

// A level-data entity the uniform update loop may tick.
// update() is optional so entities without one are skipped.
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
  // Normal and crazy barrels are both Enemy, distinguished by their starting FSM state.
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

  // Registry-driven level selection. CurrentLevelName is public so dat.gui binds to it
  // (.listen() reflects F2 cycling). levelLoaded gates unload-before-load; isLoading is
  // the loading lock (re-entrancy guard + Update freeze), mirrored by the Vue loading screen.
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

  // Stored handler refs so Destroy() removes EXACTLY our listeners — a bare
  // Emitter.off("gameStart") on the shared bus would wipe other modules' handlers.
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

    // Initialize core systems
    this.experience = Experience.GetInstance();
    if (this.experience.Debug.IsActive) {
      console.log(`[FireGame] RNG seed = ${RNG_SEED} (deterministic run)`);
    }
    this.scene = this.experience.Scene;
    this.time = this.experience.Time;
    this.camera = this.experience.Camera;
    this.resources = this.experience.Resources;
    this.GraphicsObject = new GameObject();

    this.setupEventHandlers();
  }

  // Wire game-lifecycle listeners using stored handler refs, so Destroy() can
  // remove exactly these (and no one else's) from the shared bus.
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

  // Load a level from parsed LevelData — the data-source-agnostic spawn pass
  // (graphics overlay + feel/camera setup are applied by loadLevelByIndex).
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

    // Spawn every level-data-placed entity through the factory registry. Each factory
    // pushes into the right typed array via the context. Rows with no factory are skipped.
    const ctx = this.getFactoryContext();
    for (const data of Object.values(this.LevelData)) {
      const factory = ENTITY_FACTORIES[data.type];
      if (factory) factory(data, ctx, data.type);
    }

    // Fresh level → restart the spawn cadence cleanly (gameStart/reset gate
    // whether it's actually running via isSpawningEnemies).
    this.resetSpawner();
  }

  // Build the factory context — a struct aliasing the director's typed query arrays
  // (same instances, populated in place) plus the camera the camera-sensor factory needs.
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

  // All level-spawned entity arrays in one place; UnloadLevelData tears them all down
  // by iterating this. A new entity kind must be added here too, or it leaks on teardown.
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

    // Cleanup graphics and lighting. Destroy() is idempotent (latches IsBeingDestroyed),
    // so replace GraphicsObject with a fresh instance — reusing it stays latched-destroyed.
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

  // Load a level by registry index — the single load path (boot, F2 cycle, dat.gui select
  // all funnel through). Applies per-level setup (feel, camera follow, optional graphics),
  // unloading the current level first. Guarded by isLoading: the async parse + fire-and-forget
  // callers would otherwise interleave teardown + respawn into double entities / leaked light.
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
      // Empty source = GLB couldn't be resolved. Fail loud HERE rather than letting ""
      // reach the loader, where gltfLoader.load("") fetches the HTML page and throws far away.
      if (!entry.source) {
        throw new Error(
          `level "${entry.name}" has no resolvable GLB source — is it in src/assets/levels?`,
        );
      }

      // Parse the GLB FIRST, BEFORE teardown: if it throws, the old level is still
      // intact and we roll back instead of dropping the player into emptiness.
      const parsedLevelData = await this.resources.ParseLevel(entry.source);

      // Validate the optional graphics asset BEFORE the unload, so a missing item fails
      // into the rollback while the old level is intact rather than throwing after teardown.
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

      // Optional detailed-art overlay on top of the collision shapes. Only loaded when
      // the entry names a graphics resource; collision-only levels skip it.
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

      // Go live: unpause + enable spawning + clear game-over/win UI (App.vue listens too).
      // Only fires on a successful load — a throw skips to catch.
      Emitter.emit("gameStart");
    } catch (error) {
      // Roll back the index/name bookkeeping so a failed switch is a no-op. Logged loud,
      // never rejected out — that would be an unhandled rejection and skip finally's overlay close.
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
  // set ONLY from the loading level's registry entry — no live debug swap bypasses it.
  private applyFeelProfile(profile: FeelProfile) {
    if (!this.Player) return;
    FEEL_PROFILES[profile](this.Player);
  }

  // --- Enemy spawning ---

  // Frame-driven enemy spawning (once per frame from Update). First barrel is a crazy one
  // Kong throws at the oil can to light it, then a normal/crazy mix with every 8th crazy.
  // Counters are advanced BEFORE the async spawn so a stutter frame can't double-spawn.
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

  // The opening crazy barrel Kong hurls at the oil can to light it: spawned at the normal
  // throw point but with bounce drift aimed at the can. Drift defaults rightward if can absent.
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

  // SIM update — runs inside the fixed-timestep loop (0..N times per frame) so movement
  // integrates at the constant step. Camera + interpolation are NOT here; see RenderUpdate.
  public Update() {
    // Freeze game logic while a level is loading (entities being torn down / respawned).
    if (this.isLoading) return;

    // Guard: Player must be ready
    if (!this.Player?.PhysicsBody) return;

    this.Player.Update();

    // Spawn + update enemies (runtime-spawned, not level-data). Compact destroyed barrels
    // in place right after — keeps the array reference stable.
    // TODO: uncomment for enemies
    // this.trySpawn();
    const firstTrashCan = this.TrashCans[0];
    this.Enemies.forEach((enemy) => enemy.Update(this.Player, firstTrashCan));
    GameUtils.CompactDestroyedObjects(this.Enemies);

    // Update every level-data entity with an update, in one uniform loop. Runs AFTER
    // player.update() so the platform one-way toggle reads this frame's player state.
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

  // RENDER update — runs once per FRAME with the interpolation alpha. Lerps moving entities
  // between their last two sim states for smooth motion above the sim rate, then follows
  // the interpolated player with the camera. Render and sim rates are fully decoupled.
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

  // Map the Player into the engine's CameraTarget. The camera reads only these scalars,
  // never the game Player/PlayerState directly — so camera.ts imports nothing from game/.
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
      // Follow the INTERPOLATED render position (set by InterpolateGraphics just before),
      // so the camera tracks the smooth visual player, not the stepped sim position.
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
    // listeners on the shared bus.
    Emitter.off("resourcesReady", this.onResourcesReady);
    Emitter.off("gameStart", this.onGameStart);
    Emitter.off("gameOver", this.onGameOver);
    Emitter.off("gameWin", this.onGameWin);
    Emitter.off("gameReset", this.onGameReset);
    Emitter.off("switchLevel", this.onSwitchLevel);

    // Tear down entities BEFORE removing the gameObjectRemoved handler: UnloadLevelData
    // EMITS it to call entity.Destroy(); remove it first and every body + mesh leaks.
    this.UnloadLevelData();
    Emitter.off("gameObjectRemoved", this.onGameObjectRemoved);
  }
}
