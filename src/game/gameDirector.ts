/**
 * GameDirector - Central controller for all game state and world management
 *
 * Responsibilities:
 * - Load and unload levels (JSON and GLB formats)
 * - Manage all game entities (player, enemies, platforms, etc.)
 * - Handle game state (start, reset, game over, level switching)
 * - Update all game entities each frame
 * - Enemy spawning logic
 */

import * as THREE from "three";
import Experience from "../engine/core/experience";
import Player from "./entities/player/player";
import Platform from "./entities/platform";
import Enemy from "./entities/enemy";
import CrazyEnemy from "./entities/crazyEnemy";
import TrashCan from "./entities/trashCan";
import WinFlag from "./entities/winFlag";
import CameraSensor from "./entities/cameraSensor";
import LadderSensor from "./entities/ladderSensor";
import Teleporter from "./entities/teleporter";
import GameObject from "../engine/entities/gameObject";
import Camera from "../engine/camera/camera";
import Time from "../engine/core/time";
import ResourceLoader from "../engine/resources/resourceLoader";
import Emitter from "../engine/events/eventBus";
import GameUtils from "./gameUtils";
import LevelData from "./types/levelData";
import EntityType from "./types/entityType";
import ENTITY_FACTORIES, { FactoryContext } from "./config/entityFactories";
import TestLevel from "./levels/testLevel.json";
import BlenderExport from "./levels/blenderExport.json";
import setCelesteAttributes from "./attributes/setCelesteAttributes";
import setDkAttributes from "./attributes/setDkAttributes";

// Import GLB files as URLs (Vite will handle the path)
// Put your GLB files in src/webgl/world/levels/ and import them like this:
// import TestLevelNewUrl from "../levels/TestLevelNew.glb?url";

// A level-data entity the uniform update loop may tick. update() is optional so
// entities without one are simply skipped (optional chaining). The second arg is
// the trash can the enemy reads; entities that don't need it ignore it.
type UpdatableEntity = {
  Update?(player: Player, trashCan?: TrashCan): void;
};

export default class GameDirector {
  // Core systems
  private experience: Experience;
  private scene: THREE.Scene;
  private time: Time;
  private camera: Camera;
  private resources: ResourceLoader;

  // Game entities
  public Player!: Player;
  public Enemies: Enemy[] = [];
  public CrazyEnemies: CrazyEnemy[] = [];
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

  // Enemy spawning system
  private isSpawningEnemies = false;
  private spawningInterval = 0;
  private timeSinceLastSpawn = 0;
  private initialDelay = 0;
  private currentSpawnInterval = 0;
  private enemyCount = 0;
  private spawnIntervalIds: number[] = [];
  private cleanupIntervalId: number = 0;

  constructor() {
    // Initialize core systems
    this.experience = Experience.GetInstance();
    this.scene = this.experience.Scene;
    this.time = this.experience.Time;
    this.camera = this.experience.Camera;
    this.resources = this.experience.Resources;
    this.GraphicsObject = new GameObject();

    this.setupEventHandlers();
  }

  /**
   * Set up all event listeners for game lifecycle
   */
  private setupEventHandlers() {
    // Game initialization
    Emitter.on("resourcesReady", async () => {
      // FOR TESTING: Load your custom GLB level from public/ folder
      // Uncomment the line below to test your GLB file:
      await this.LoadGLBLevel("/levels/TestLevelNew.glb");

      // OR: Import from src/ and use the imported URL
      // await this.loadGLBLevel(TestLevelNewUrl);

      // Default: Load BlenderExport JSON level
      // await this.loadLevelData(BlenderExport);
      Emitter.emit("gameStart");
    });

    // Game start
    Emitter.on("gameStart", () => {
      this.experience.Physics.SetPaused(false);
      this.isSpawningEnemies = true;
    });

    // Game over
    Emitter.on("gameOver", () => {
      this.experience.Physics.SetPaused(true);
      this.isSpawningEnemies = false;
      this.stopAllSpawnTimers();
    });

    // Game reset
    Emitter.on("gameReset", () => {
      this.experience.Physics.SetPaused(false);
      this.resetGameState();
    });

    // Level switching
    Emitter.on("switchLevel", async () => {
      await this.switchToNextLevel();
    });

    // Cleanup destroyed objects
    Emitter.on("gameObjectRemoved", (removedGameObject) => {
      removedGameObject.Destroy();
    });

    // Periodic cleanup of destroyed entities — separate from spawn timers
    // so it keeps running after gameOver
    this.cleanupIntervalId = setInterval(() => {
      this.Enemies = GameUtils.RemoveDestroyedObjects(this.Enemies);
      this.CrazyEnemies = GameUtils.RemoveDestroyedObjects(this.CrazyEnemies);
    }, 5000) as unknown as number;
  }

  /**
   * Update all game entities (called every frame)
   */
  public Update() {
    // Guard: Player must be ready
    if (!this.Player?.PhysicsBody) return;

    // Update camera
    this.camera.Update(this.Player);

    // Update player
    this.Player.Update();

    // Update enemies (runtime-spawned, not level-data — kept on their own pass)
    const firstTrashCan = this.TrashCans[0];
    this.Enemies.forEach((enemy) => enemy.Update(this.Player, firstTrashCan));
    this.CrazyEnemies.forEach((crazyEnemy) =>
      crazyEnemy.Update(this.Player, firstTrashCan)
    );

    // Update every level-data entity that has an update, in one uniform loop.
    // Runs AFTER player.update() so the platform one-way toggle reads this
    // frame's player state. Entities without an update are skipped. Win flags
    // run before platforms, same relative order as before.
    const updatableLevelEntities: UpdatableEntity[] = [
      ...this.WinFlags,
      ...this.Platforms,
    ];
    for (const e of updatableLevelEntities) {
      e.Update?.(this.Player, firstTrashCan);
    }

    // Update ladder detection (manual for now, will convert to sensor callbacks later)
    this.Player.UpdateLadderState(
      GameUtils.IsAnySensorTriggered(this.LadderTopSensors),
      GameUtils.IsAnySensorTriggeredObjectFullyInside(this.LadderCoreSensors, this.Player),
      GameUtils.IsAnySensorTriggered(this.LadderBottomSensors)
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                            LEVEL MANAGEMENT                                */
  /* -------------------------------------------------------------------------- */

  /**
   * Load a level from a GLB file (Shapr3D/Blockbench export)
   * @param glbPath - Can be:
   *   - A URL path from public folder: "/levels/MyLevel.glb"
   *   - An imported URL from src: import MyLevelUrl from "../levels/MyLevel.glb?url"
   */
  public async LoadGLBLevel(glbPath: string) {
    // Use the unified ResourceLoader to parse the GLB level
    const parsedLevelData = await this.resources.ParseLevel(glbPath);
    await this.LoadLevelData(parsedLevelData);
  }

  /**
   * Load a level from LevelData (JSON or parsed GLB)
   */
  public async LoadLevelData(levelData?: LevelData) {
    this.LevelData = levelData || BlenderExport;

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

    // Load graphics for BlenderExport level
    if (this.LevelData === BlenderExport) {
      await this.GraphicsObject.CreateObjectGraphics(
        this.resources.Items.dkGraphicsData
      );
    }
  }

  /**
   * Build the factory context — a plain struct aliasing the typed query arrays
   * the factories push into and the camera the camera-sensor factory needs.
   * These are the SAME array instances the rest of the director queries
   * (trashCans[0] for the enemy, the ladder sub-arrays for the climb checks),
   * so factories populate them in place.
   */
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

  /**
   * Unload current level and cleanup all entities
   */
  public UnloadLevelData() {
    const destroyAll = (entities: any[]) => {
      entities.forEach((entity) => Emitter.emit("gameObjectRemoved", entity));
      entities.length = 0;
    };

    // Cleanup all entities
    destroyAll(this.Enemies);
    destroyAll(this.CrazyEnemies);
    destroyAll(this.TrashCans);
    destroyAll(this.WinFlags);
    destroyAll(this.CameraSensors);
    destroyAll(this.LadderTopSensors);
    destroyAll(this.LadderCoreSensors);
    destroyAll(this.LadderBottomSensors);
    destroyAll(this.Walls);
    destroyAll(this.Platforms);
    destroyAll(this.Teleporters);

    // Cleanup graphics and lighting
    this.GraphicsObject.Destroy();
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight = undefined;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                          LEVEL SPAWN POINTS                                */
  /* -------------------------------------------------------------------------- */

  private setPlayerStart() {
    for (const data of Object.values(this.LevelData)) {
      if (data.type !== EntityType.PLAYER_START) continue;

      const [x, , z] = data.position;

      if (this.playerHasBeenSpawned) {
        this.Player.TeleportToPosition(x, z);
        return;
      }

      this.Player = new Player({ width: 1.75, height: 4 }, { x, y: z });
      this.playerHasBeenSpawned = true;
      return;
    }
  }

  private setCameraStart() {
    for (const data of Object.values(this.LevelData)) {
      if (data.type !== EntityType.CAMERA_START) continue;
      const [x, y, z] = data.position;
      this.camera.TeleportToPosition(x, z, y);
      return;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                          GAME STATE MANAGEMENT                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Reset game to initial state
   */
  private resetGameState() {
    // Reset player position
    this.Player.TeleportToPosition(
      this.Player.InitialTranslation.x,
      this.Player.InitialTranslation.y
    );

    // Reset camera position
    this.camera.TeleportToPosition(
      this.camera.InitialPosition.x,
      this.camera.InitialPosition.y,
      this.camera.InitialPosition.z
    );

    // Clear enemies
    this.Enemies.forEach((enemy) => Emitter.emit("gameObjectRemoved", enemy));
    this.CrazyEnemies.forEach((crazyEnemy) =>
      Emitter.emit("gameObjectRemoved", crazyEnemy)
    );

    // Reset trash cans
    this.TrashCans.forEach((trashCan) => (trashCan.IsOnFire = false));

    // Reset spawner
    this.isSpawningEnemies = true;
    this.timeSinceLastSpawn = 0;
    this.initialDelay = 0;
    this.currentSpawnInterval = 0;
    this.enemyCount = 0;

    this.stopAllSpawnTimers();
    this.spawningInterval = setInterval(() => this.SpawnEnemiesWithLogic(), 16) as unknown as number;
    this.spawnIntervalIds.push(this.spawningInterval);
  }

  /**
   * Switch to next level
   */
  private async switchToNextLevel() {
    this.stopAllSpawnTimers();
    this.UnloadLevelData();

    // Determine next level
    const nextLevel =
      this.LevelData === BlenderExport ? TestLevel : BlenderExport;

    // Configure for level type
    if (nextLevel === TestLevel) {
      this.camera.SetCameraFollow(true);
      setCelesteAttributes(this.Player);
      await this.LoadLevelData(nextLevel);
    } else {
      this.camera.SetCameraFollow(false);
      setDkAttributes(this.Player);
      await this.LoadLevelData(nextLevel);
      await this.GraphicsObject.CreateObjectGraphics(
        this.resources.Items.dkGraphicsData
      );
    }
  }

  /**
   * Stop all spawn timers
   */
  private stopAllSpawnTimers() {
    this.spawnIntervalIds.forEach((id) => clearInterval(id));
    this.spawnIntervalIds = [];
  }

  /* -------------------------------------------------------------------------- */
  /*                            ENEMY SPAWNING                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Spawn a regular enemy
   */
  public async SpawnEnemy(position = { x: -13, y: 50 }) {
    const enemy = new Enemy(1, position);
    await enemy.CreateObjectGraphics(this.resources.Items.enemy);
    this.Enemies.push(enemy);
  }

  /**
   * Spawn a crazy enemy (faster, more aggressive)
   */
  public async SpawnCrazyEnemy(position = { x: -13, y: 50 }) {
    const crazyEnemy = new CrazyEnemy(1, position);
    await crazyEnemy.CreateObjectGraphics(this.resources.Items.enemy);
    this.CrazyEnemies.push(crazyEnemy);
  }

  /**
   * Enemy spawning logic with randomized intervals
   */
  public async SpawnEnemiesWithLogic() {
    if (!this.isSpawningEnemies) return;

    this.timeSinceLastSpawn += this.time.Delta;

    // Initial delay before first spawn
    if (
      this.currentSpawnInterval === 0 &&
      this.timeSinceLastSpawn >= this.initialDelay
    ) {
      await this.SpawnCrazyEnemy();
      this.timeSinceLastSpawn = 0;
      this.currentSpawnInterval = Math.random() * (4 - 3) + 3; // 3-4 seconds
      return;
    }

    // Subsequent spawns
    if (
      this.currentSpawnInterval > 0 &&
      this.timeSinceLastSpawn >= this.currentSpawnInterval
    ) {
      this.enemyCount++;

      // Every 8th spawn is a crazy enemy
      if (this.enemyCount % 8 === 0) {
        await this.SpawnCrazyEnemy();
      } else {
        await this.SpawnEnemy();
      }

      this.timeSinceLastSpawn = 0;
      this.currentSpawnInterval = Math.random() * (3 - 2) + 2; // 2-3 seconds
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              CLEANUP                                       */
  /* -------------------------------------------------------------------------- */

  public Destroy() {
    Emitter.off("resourcesReady");
    Emitter.off("gameStart");
    Emitter.off("gameOver");
    Emitter.off("gameReset");
    Emitter.off("switchLevel");
    Emitter.off("gameObjectRemoved");

    this.stopAllSpawnTimers();
    clearInterval(this.cleanupIntervalId);
    this.UnloadLevelData();
  }
}
