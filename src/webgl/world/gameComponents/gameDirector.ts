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
import Experience from "../../experience";
import Player from "../player/player";
import Platform from "../gameEntities/platform";
import Enemy from "../gameEntities/enemy";
import CrazyEnemy from "../gameEntities/crazyEnemy";
import TrashCan from "../gameEntities/trashCan";
import WinFlag from "../gameEntities/winFlag";
import CameraSensor from "../gameEntities/cameraSensor";
import LadderSensor from "../gameEntities/ladderSensor";
import Teleporter from "../gameEntities/teleporter";
import GameObject from "./gameObject";
import Camera from "../../camera";
import Time from "../../utils/time";
import ResourceLoader from "../../utils/resourceLoader";
import Emitter from "../../utils/eventEmitter";
import GameUtils from "../../utils/gameUtils";
import LevelData from "../../utils/types/levelData";
import TestLevel from "../levels/testLevel.json";
import BlenderExport from "../levels/blenderExport.json";
import setCelesteAttributes from "../player/attributes/setCelesteAttributes";
import setDkAttributes from "../player/attributes/setDkAttributes";

// Import GLB files as URLs (Vite will handle the path)
// Put your GLB files in src/webgl/world/levels/ and import them like this:
// import TestLevelNewUrl from "../levels/TestLevelNew.glb?url";

export default class GameDirector {
  // Core systems
  private experience: Experience;
  private scene: THREE.Scene;
  private time: Time;
  private camera: Camera;
  private resources: ResourceLoader;

  // Game entities
  public player!: Player;
  public enemies: Enemy[] = [];
  public crazyEnemies: CrazyEnemy[] = [];
  public platforms: Platform[] = [];
  public walls: Platform[] = [];
  public trashCans: TrashCan[] = [];
  public winFlags: WinFlag[] = [];
  public teleporters: Teleporter[] = [];
  public cameraSensors: CameraSensor[] = [];
  public ladderTopSensors: LadderSensor[] = [];
  public ladderCoreSensors: LadderSensor[] = [];
  public ladderBottomSensors: LadderSensor[] = [];

  // Level management
  public levelData!: LevelData;
  public graphicsObject: GameObject;
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
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.time = this.experience.time;
    this.camera = this.experience.camera;
    this.resources = this.experience.resources;
    this.graphicsObject = new GameObject();

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
      await this.loadGLBLevel("/levels/TestLevelNew.glb");

      // OR: Import from src/ and use the imported URL
      // await this.loadGLBLevel(TestLevelNewUrl);

      // Default: Load BlenderExport JSON level
      // await this.loadLevelData(BlenderExport);
      Emitter.emit("gameStart");
    });

    // Game start
    Emitter.on("gameStart", () => {
      this.isSpawningEnemies = true;
    });

    // Game over
    Emitter.on("gameOver", () => {
      this.isSpawningEnemies = false;
      this.stopAllSpawnTimers();
    });

    // Game reset
    Emitter.on("gameReset", () => {
      this.resetGameState();
    });

    // Level switching
    Emitter.on("switchLevel", async () => {
      await this.switchToNextLevel();
    });

    // Cleanup destroyed objects
    Emitter.on("gameObjectRemoved", (removedGameObject) => {
      removedGameObject.destroy();
    });

    // Periodic cleanup of destroyed entities — separate from spawn timers
    // so it keeps running after gameOver
    this.cleanupIntervalId = setInterval(() => {
      this.enemies = GameUtils.removeDestroyedObjects(this.enemies);
      this.crazyEnemies = GameUtils.removeDestroyedObjects(this.crazyEnemies);
    }, 5000) as unknown as number;
  }

  /**
   * Update all game entities (called every frame)
   */
  public update() {
    // Guard: Player must be ready
    if (!this.player?.physicsBody) return;

    // Update camera
    this.camera.update(this.player);

    // Update player
    this.player.update();

    // Update enemies
    const firstTrashCan = this.trashCans[0];
    this.enemies.forEach((enemy) => enemy.update(this.player, firstTrashCan));
    this.crazyEnemies.forEach((crazyEnemy) => crazyEnemy.update(firstTrashCan));

    // Update win flags
    this.winFlags.forEach((winFlag) => winFlag.update());

    // Update platform collision states
    GameUtils.updatePlatforms(this.platforms, this.player);

    // Update ladder detection (manual for now, will convert to sensor callbacks later)
    this.player.updateLadderState(
      GameUtils.isAnySensorTriggered(this.ladderTopSensors),
      GameUtils.isAnySensorTriggeredObjectFullyInside(this.ladderCoreSensors, this.player),
      GameUtils.isAnySensorTriggered(this.ladderBottomSensors)
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
  public async loadGLBLevel(glbPath: string) {
    // Use the unified ResourceLoader to parse the GLB level
    const parsedLevelData = await this.resources.parseLevel(glbPath);
    await this.loadLevelData(parsedLevelData);
  }

  /**
   * Load a level from LevelData (JSON or parsed GLB)
   */
  public async loadLevelData(levelData?: LevelData) {
    this.levelData = levelData || BlenderExport;

    // Setup ambient light for PBR materials
    if (!this.ambientLight) {
      this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
      this.scene.add(this.ambientLight);
    }

    // Load level objects (order matters: player first for sensor targets)
    this.setPlayerStart();
    this.setCameraStart();
    this.importCameraSensors();
    this.importWalls();
    this.importPlatforms();
    this.importLadderSensors();
    this.importTrashCans();
    this.importWinFlags();

    // Load graphics for BlenderExport level
    if (this.levelData === BlenderExport) {
      await this.graphicsObject.createObjectGraphics(
        this.resources.items.dkGraphicsData
      );
    }
  }

  /**
   * Unload current level and cleanup all entities
   */
  public unloadLevelData() {
    const destroyAll = (entities: any[]) => {
      entities.forEach((entity) => Emitter.emit("gameObjectRemoved", entity));
      entities.length = 0;
    };

    // Cleanup all entities
    destroyAll(this.enemies);
    destroyAll(this.crazyEnemies);
    destroyAll(this.trashCans);
    destroyAll(this.winFlags);
    destroyAll(this.cameraSensors);
    destroyAll(this.ladderTopSensors);
    destroyAll(this.ladderCoreSensors);
    destroyAll(this.ladderBottomSensors);
    destroyAll(this.walls);
    destroyAll(this.platforms);
    destroyAll(this.teleporters);

    // Cleanup graphics and lighting
    this.graphicsObject.destroy();
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight = undefined;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                          LEVEL OBJECT IMPORTING                            */
  /* -------------------------------------------------------------------------- */

  /**
   * Generic helper to import level objects by type
   */
  private importLevelObjects(type: string, callback: (data: any) => void) {
    Object.values(this.levelData).forEach((data) => {
      if (data.type === type) callback(data);
    });
  }

  private setPlayerStart() {
    for (const data of Object.values(this.levelData)) {
      if (data.type !== "PlayerStart") continue;

      const [x, , z] = data.position;

      if (this.playerHasBeenSpawned) {
        this.player.teleportToPosition(x, z);
        return;
      }

      this.player = new Player({ width: 1.75, height: 4 }, { x, y: z });
      this.playerHasBeenSpawned = true;
      return;
    }
  }

  private setCameraStart() {
    for (const data of Object.values(this.levelData)) {
      if (data.type !== "CameraStart") continue;
      const [x, y, z] = data.position;
      this.camera.teleportToPosition(x, z, y);
      return;
    }
  }

  private importCameraSensors() {
    this.importLevelObjects("CameraSensor", (data) => {
      const sensor = new CameraSensor(
        { width: data.width, height: data.depth },
        { x: data.position[0], y: data.position[2] },
        -data.rotation[1],
        this.camera
      );
      sensor.setCameraPositionData(
        new THREE.Vector3(data.value0, data.value1, data.value2)
      );
      this.cameraSensors.push(sensor);
    });
  }

  private importWalls() {
    this.importLevelObjects("Wall", (data) => {
      const wall = new Platform(
        { width: data.width, height: data.depth, depth: data.height },
        { x: data.position[0], y: data.position[2] },
        -data.rotation[1]
      );
      wall.setObjectName("Wall");
      this.walls.push(wall);
    });
  }

  private importPlatforms() {
    const types = ["Platform", "EdgeOneWayPlatform", "LineOneWayPlatform"];
    types.forEach((type) =>
      this.importLevelObjects(type, (data) => {
        const isOneWay =
          type === "EdgeOneWayPlatform" || type === "LineOneWayPlatform";
        const platform = new Platform(
          { width: data.width, height: data.depth, depth: data.height },
          { x: data.position[0], y: data.position[2] },
          -data.rotation[1],
          isOneWay,
          data.vertices
        );

        platform.setPlatformFloorLevel(data.value0);
        platform.setEdgePlatform(data.value1);
        platform.setOneWayEnablePoint(data.value2 || data.position[2]);

        this.platforms.push(platform);
      })
    );
  }

  private importLadderSensors() {
    const types = ["LadderTopSensor", "LadderCoreSensor", "LadderBottomSensor"];
    types.forEach((type) => {
      this.importLevelObjects(type, (data) => {
        const sensor = new LadderSensor(
          { width: data.width, height: data.depth },
          { x: data.position[0], y: data.position[2] },
          -data.rotation[1],
          data.vertices
        );
        sensor.setLadderValue(data.value0);
        sensor.setObjectName(type);

        if (type === "LadderTopSensor") this.ladderTopSensors.push(sensor);
        else if (type === "LadderCoreSensor")
          this.ladderCoreSensors.push(sensor);
        else if (type === "LadderBottomSensor")
          this.ladderBottomSensors.push(sensor);
      });
    });
  }

  private importTrashCans() {
    this.importLevelObjects("TrashCan", (data) => {
      const trashCan = new TrashCan(
        { width: data.width, height: data.depth, depth: data.height },
        { x: data.position[0], y: data.position[2] },
        -data.rotation[1]
      );
      this.trashCans.push(trashCan);
    });
  }

  private importWinFlags() {
    this.importLevelObjects("WinFlag", (data) => {
      const winFlag = new WinFlag(
        { width: data.width, height: data.depth, depth: data.height },
        { x: data.position[0], y: data.position[2] },
        -data.rotation[1]
      );
      this.winFlags.push(winFlag);
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                          GAME STATE MANAGEMENT                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Reset game to initial state
   */
  private resetGameState() {
    // Reset player position
    this.player.teleportToPosition(
      this.player.initialTranslation.x,
      this.player.initialTranslation.y
    );

    // Reset camera position
    this.camera.teleportToPosition(
      this.camera.initialPosition.x,
      this.camera.initialPosition.y,
      this.camera.initialPosition.z
    );

    // Clear enemies
    this.enemies.forEach((enemy) => Emitter.emit("gameObjectRemoved", enemy));
    this.crazyEnemies.forEach((crazyEnemy) =>
      Emitter.emit("gameObjectRemoved", crazyEnemy)
    );

    // Reset trash cans
    this.trashCans.forEach((trashCan) => (trashCan.isOnFire = false));

    // Reset spawner
    this.isSpawningEnemies = true;
    this.timeSinceLastSpawn = 0;
    this.initialDelay = 0;
    this.currentSpawnInterval = 0;
    this.enemyCount = 0;

    this.stopAllSpawnTimers();
    this.spawningInterval = setInterval(() => this.spawnEnemiesWithLogic(), 16) as unknown as number;
    this.spawnIntervalIds.push(this.spawningInterval);
  }

  /**
   * Switch to next level
   */
  private async switchToNextLevel() {
    this.stopAllSpawnTimers();
    this.unloadLevelData();

    // Determine next level
    const nextLevel =
      this.levelData === BlenderExport ? TestLevel : BlenderExport;

    // Configure for level type
    if (nextLevel === TestLevel) {
      this.camera.setCameraFollow(true);
      setCelesteAttributes(this.player);
      await this.loadLevelData(nextLevel);
    } else {
      this.camera.setCameraFollow(false);
      setDkAttributes(this.player);
      await this.loadLevelData(nextLevel);
      await this.graphicsObject.createObjectGraphics(
        this.resources.items.dkGraphicsData
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
  public async spawnEnemy(position = { x: -13, y: 50 }) {
    const enemy = new Enemy(1, position);
    await enemy.createObjectGraphics(this.resources.items.enemy);
    this.enemies.push(enemy);
  }

  /**
   * Spawn a crazy enemy (faster, more aggressive)
   */
  public async spawnCrazyEnemy(position = { x: -13, y: 50 }) {
    const crazyEnemy = new CrazyEnemy(1, position);
    await crazyEnemy.createObjectGraphics(this.resources.items.enemy);
    this.crazyEnemies.push(crazyEnemy);
  }

  /**
   * Enemy spawning logic with randomized intervals
   */
  public async spawnEnemiesWithLogic() {
    if (!this.isSpawningEnemies) return;

    this.timeSinceLastSpawn += this.time.delta;

    // Initial delay before first spawn
    if (
      this.currentSpawnInterval === 0 &&
      this.timeSinceLastSpawn >= this.initialDelay
    ) {
      await this.spawnCrazyEnemy();
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
        await this.spawnCrazyEnemy();
      } else {
        await this.spawnEnemy();
      }

      this.timeSinceLastSpawn = 0;
      this.currentSpawnInterval = Math.random() * (3 - 2) + 2; // 2-3 seconds
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              CLEANUP                                       */
  /* -------------------------------------------------------------------------- */

  public destroy() {
    Emitter.off("resourcesReady");
    Emitter.off("gameStart");
    Emitter.off("gameOver");
    Emitter.off("gameReset");
    Emitter.off("switchLevel");
    Emitter.off("gameObjectRemoved");

    this.stopAllSpawnTimers();
    clearInterval(this.cleanupIntervalId);
    this.unloadLevelData();
  }
}
