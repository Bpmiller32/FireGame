import * as THREE from "three";
import Experience from "../../experience";
import World from "../levels/world";
import Player from "../player/player";
import LevelData from "../../utils/types/levelData";
import TestLevel from "../levels/testLevel.json";
import BlenderExport from "../levels/blenderExport.json";
import Platform from "../gameEntities/platform";
import Enemy from "../gameEntities/enemy";
import TrashCan from "../gameEntities/trashCan";
import Emitter from "../../utils/eventEmitter";
import CrazyEnemy from "../gameEntities/crazyEnemy";
import Time from "../../utils/time";
import Camera from "../../camera";
import setCelesteAttributes from "../player/attributes/setCelesteAttributes";
import setDkAttributes from "../player/attributes/setDkAttributes";
import CameraSensor from "../gameEntities/cameraSensor";
import LadderSensor from "../gameEntities/ladderSensor";
// import Teleporter from "../gameEntities/teleporter";
import ResourceLoader from "../../utils/resourceLoader";
import WinFlag from "../gameEntities/winFlag";
import GameObject from "./gameObject";

export default class GameDirector {
  private experience!: Experience;
  private scene!: THREE.Scene;
  private world!: World;
  private time!: Time;
  private camera!: Camera;
  private resources!: ResourceLoader;
  private player!: Player;

  private playerHasBeenSpawned!: boolean;

  public levelData!: LevelData;
  public graphicsObject!: GameObject;
  private ambientLight?: THREE.AmbientLight;

  private isSpawningEnemies!: boolean;
  private spawningInterval!: number;
  private timeSinceLastSpawn!: number;
  private initialDelay!: number;
  private enemyCount!: number;

  private intervalIds!: number[];
  private currentSpawnInterval!: number;

  constructor() {
    this.initializeAttributes();

    // Events
    Emitter.on("gameStart", async () => {
      // // Set initial camera and player settings for BlenderExport level
      // this.camera.setCameraFollow(false);
      // setDkAttributes(this.player);

      // // Load graphics since we're starting with BlenderExport level
      // await this.graphicsObject.createObjectGraphics(
      //   this.resources.items.dkGraphicsData
      // );

      this.isSpawningEnemies = true;
    });

    Emitter.on("gameOver", () => {
      this.isSpawningEnemies = false;
      this.intervalIds.forEach((id) => clearInterval(id));
    });

    Emitter.on("gameReset", () => {
      this.isSpawningEnemies = true;

      // Reset spawner values
      this.timeSinceLastSpawn = 0;
      this.initialDelay = 0;
      this.currentSpawnInterval = 0;
      this.enemyCount = 0;

      this.intervalIds.forEach((id) => clearInterval(id));

      this.spawningInterval = setInterval(async () => {
        await this.spawnEnemiesWithLogic();
      }, 16);

      this.intervalIds.push(this.spawningInterval);
    });

    Emitter.on("switchLevel", async () => {
      this.intervalIds.forEach((id) => clearInterval(id));
      this.unloadLevelData();

      // Level switching logic, revist when more levels are made
      let nextLevel: LevelData = BlenderExport;
      if (this.levelData === BlenderExport) {
        nextLevel = TestLevel;
      }

      if (nextLevel === TestLevel) {
        // PlayerData
        this.camera.setCameraFollow(true);
        setCelesteAttributes(this.player);

        // LevelData
        this.loadLevelData(nextLevel);
      } else {
        // PlayerData
        this.camera.setCameraFollow(false);
        setDkAttributes(this.player);

        // LevelData
        this.loadLevelData(nextLevel);
        // Graphics
        await this.graphicsObject.createObjectGraphics(
          this.resources.items.dkGraphicsData
        );
      }
    });
  }

  private initializeAttributes() {
    // Experience fields
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.world = this.experience.world;
    this.time = this.experience.time;
    this.camera = this.experience.camera;
    this.resources = this.experience.resources;
    this.player = this.world.player!;

    // Set default level to load
    this.levelData = BlenderExport;
    this.graphicsObject = new GameObject();

    this.playerHasBeenSpawned = false;
    this.isSpawningEnemies = false;

    // Id for setInterval, used to clear interval
    this.intervalIds = [];
    this.spawningInterval = 0;
    // Tracks time since last spawn
    this.timeSinceLastSpawn = 0;
    // Delay before starting spawning (in seconds)
    this.initialDelay = 0;
    // Tracks the current spawn interval (randomized)
    this.currentSpawnInterval = 0;
    // Tracks the total number of enemies spawned
    this.enemyCount = 0;
  }

  private importLevelObjects(
    gameObjectType: string,
    callback: (importedData: any) => void
  ) {
    for (const importedData of Object.values(this.levelData)) {
      if (importedData.type === gameObjectType) {
        callback(importedData);
      }
    }
  }

  private importCameraSensors() {
    this.importLevelObjects("CameraSensor", (importedData) => {
      const sensor = new CameraSensor(
        { width: importedData.width, height: importedData.depth },
        { x: importedData.position[0], y: importedData.position[2] },
        -importedData.rotation[1]
      );

      // Value table: [0] is the destination X position for the Camera to move to, [1] is Y, [2] is Z
      sensor.setIntersectingTarget(this.player);
      sensor.setCameraPositionData(
        new THREE.Vector3(
          importedData.value0,
          importedData.value1,
          importedData.value2
        )
      );

      this.world.cameraSensors.push(sensor);
    });
  }

  private importWalls() {
    this.importLevelObjects("Wall", (importedData) => {
      const wall = new Platform(
        {
          width: importedData.width,
          height: importedData.depth,
          depth: importedData.height,
        },
        { x: importedData.position[0], y: importedData.position[2] },
        -importedData.rotation[1]
      );

      wall.setObjectName("Wall");

      this.world.walls.push(wall);
    });
  }

  private importPlatforms() {
    const platformTypes = [
      "Platform",
      // "OneWayPlatform",
      "EdgeOneWayPlatform",
      "LineOneWayPlatform",
    ];

    platformTypes.forEach((type) =>
      this.importLevelObjects(type, (importedData) => {
        const platform = new Platform(
          {
            width: importedData.width,
            height: importedData.depth,
            depth: importedData.height,
          },
          { x: importedData.position[0], y: importedData.position[2] },
          -importedData.rotation[1],
          type === "EdgeOneWayPlatform" || type === "LineOneWayPlatform",
          importedData.vertices
        );

        // Used to check what floor the player is touching
        platform.setPlatformFloorLevel(importedData.value0);

        // Used to check if the platform is an edge platform, useful for gamefeel and coyoteJump
        platform.setEdgePlatform(importedData.value1);

        // Used to set the point where a OneWayPlatform is solid on a complex shape, default is the Y coord of the middle of the object
        if (importedData.value2 != 0) {
          platform.setOneWayEnablePoint(importedData.value2);
        } else {
          platform.setOneWayEnablePoint(importedData.position[2]);
        }

        this.world.platforms.push(platform);
      })
    );
  }

  private importTrashCans() {
    this.importLevelObjects("TrashCan", (importedData) => {
      const trashCan = new TrashCan(
        {
          width: importedData.width,
          height: importedData.depth,
          depth: importedData.height,
        },
        { x: importedData.position[0], y: importedData.position[2] },
        -importedData.rotation[1]
      );

      this.world.trashCans.push(trashCan);
    });
  }

  private importWinFlags() {
    this.importLevelObjects("WinFlag", (importedData) => {
      const winFlag = new WinFlag(
        {
          width: importedData.width,
          height: importedData.depth,
          depth: importedData.height,
        },
        { x: importedData.position[0], y: importedData.position[2] },
        -importedData.rotation[1]
      );

      this.world.winFlags.push(winFlag);
    });
  }

  private importLadderSensors() {
    const ladderSensorTypes = [
      "LadderTopSensor",
      "LadderCoreSensor",
      "LadderBottomSensor",
    ];

    ladderSensorTypes.forEach((type) => {
      this.importLevelObjects(type, (importedData) => {
        const ladderSensor = new LadderSensor(
          { width: importedData.width, height: importedData.depth },
          { x: importedData.position[0], y: importedData.position[2] },
          -importedData.rotation[1],
          importedData.vertices
        );

        // Value table: [0] is which direction the Enemy should move after touching this ladder
        ladderSensor.setIntersectingTarget(this.player);
        ladderSensor.setLadderValue(importedData.value0);

        if (type == "LadderTopSensor") {
          ladderSensor.setObjectName("LadderTopSensor");
          this.world.ladderTopSensors.push(ladderSensor);
        } else if (type == "LadderCoreSensor") {
          ladderSensor.setObjectName("LadderCoreSensor");
          this.world.ladderCoreSensors.push(ladderSensor);
        } else if (type == "LadderBottomSensor") {
          ladderSensor.setObjectName("LadderBottomSensor");
          this.world.ladderBottomSensors.push(ladderSensor);
        }
      });
    });
  }

  // private importTeleporters() {
  //   this.importLevelObjects("Teleporter", (importedData) => {
  //     const teleporter = new Teleporter(
  //       {
  //         width: importedData.width,
  //         height: importedData.depth,
  //       },
  //       { x: importedData.position[0], y: importedData.position[2] },
  //       -importedData.rotation[1]
  //     );

  //     // Value table: [0] is teleport destination X, [1] is teleport destination Y
  //     teleporter.setTeleportPosition(importedData.value0, importedData.value1);

  //     this.world.teleporters.push(teleporter);
  //   });
  // }

  private setPlayerStart() {
    for (const importedData of Object.values(this.levelData)) {
      if (importedData.type !== "PlayerStart") {
        continue;
      }

      const [x, , z] = importedData.position;

      if (this.playerHasBeenSpawned) {
        // Teleport existing player if already spawned
        this.player.teleportToPosition(x, z);
        return;
      }

      // Create a new player if not yet spawned
      this.world.player = new Player({ width: 1.75, height: 4 }, { x, y: z });
      this.player = this.world.player;
      this.playerHasBeenSpawned = true;

      // Exit loop once player is set
      return;
    }
  }

  private setCameraStart() {
    for (const importedData of Object.values(this.levelData)) {
      if (importedData.type !== "CameraStart") {
        continue;
      }

      const [x, y, z] = importedData.position;
      this.camera.teleportToPosition(x, z, y);
    }
  }

  public async loadLevelData(levelData?: LevelData) {
    // Set level json data to parse through
    if (levelData) {
      this.levelData = levelData;
    } else {
      // Default level to load
      this.levelData = BlenderExport;
    }

    // Create an AmbientLight for all PBR materials to be seen, not needed later when lighting is baked into MeshBasicMaterial
    if (!this.ambientLight) {
      this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
      this.experience.scene.add(this.ambientLight);
    }

    // Must load player first to avoid problems with setting sensorTargets
    this.setPlayerStart();
    this.setCameraStart();

    this.importCameraSensors();
    this.importWalls();
    this.importPlatforms();
    this.importLadderSensors();
    this.importTrashCans();
    this.importWinFlags();
    // this.importTeleporters();

    // Load graphics if this is the BlenderExport level
    if (this.levelData === BlenderExport) {
      await this.graphicsObject.createObjectGraphics(
        this.resources.items.dkGraphicsData
      );
    }
  }

  public unloadLevelData() {
    const destroyEntities = (entities: any[]) => {
      entities.forEach((entity) => Emitter.emit("gameObjectRemoved", entity));
      entities.length = 0;
    };

    // Enemies and trashcans and winflags
    destroyEntities(this.world.enemies);
    destroyEntities(this.world.crazyEnemies);
    destroyEntities(this.world.trashCans);
    destroyEntities(this.world.winFlags);

    // Camera sensors
    destroyEntities(this.world.cameraSensors);

    // Ladders
    destroyEntities(this.world.ladderTopSensors);
    destroyEntities(this.world.ladderCoreSensors);
    destroyEntities(this.world.ladderBottomSensors);

    // Walls and platforms
    destroyEntities(this.world.walls);
    destroyEntities(this.world.platforms);

    // Teleporters
    destroyEntities(this.world.teleporters);

    // Graphics
    this.graphicsObject.destroy();

    // Remove the ambientLight
    if (!this.ambientLight) {
      this.scene.remove(this.ambientLight!);
      this.ambientLight = undefined;
    }
  }

  public async loadGraphicsData(graphicsData: any) {
    if (!graphicsData) {
      return;
    }

    await this.graphicsObject.createObjectGraphics(graphicsData);
  }

  public async spawnEnemy(
    position: { x: number; y: number } = { x: -13, y: 50 }
  ) {
    const enemy = new Enemy(1, {
      x: position.x,
      y: position.y,
    });

    await enemy.createObjectGraphics(this.resources.items.enemy);

    this.world.enemies.push(enemy);
  }

  public async spawnCrazyEnemy(
    position: { x: number; y: number } = { x: -13, y: 50 }
  ) {
    const crazyEnemy = new CrazyEnemy(1, {
      x: position.x,
      y: position.y,
    });

    await crazyEnemy.createObjectGraphics(this.resources.items.enemy);

    this.world.crazyEnemies.push(crazyEnemy);
  }

  public async spawnEnemiesWithLogic() {
    // Stop if spawning is disabled
    if (!this.isSpawningEnemies) {
      return;
    }

    // Accumulate time
    this.timeSinceLastSpawn += this.time.delta;

    // Handle the initial delay
    if (
      this.currentSpawnInterval === 0 &&
      this.timeSinceLastSpawn >= this.initialDelay
    ) {
      // Spawn the first crazyEnemy
      this.spawnCrazyEnemy();
      this.timeSinceLastSpawn = 0;
      this.currentSpawnInterval = Math.random() * (4 - 3) + 3; // Random delay between 3 and 4 seconds
      return;
    }

    // Check if it's time to spawn the next enemy
    if (
      this.currentSpawnInterval > 0 &&
      this.timeSinceLastSpawn >= this.currentSpawnInterval
    ) {
      this.enemyCount++;

      // Spawn a crazyEnemy every 8th spawn
      if (this.enemyCount % 8 === 0) {
        await this.spawnCrazyEnemy();
      } else {
        await this.spawnEnemy();
      }

      // Reset time and randomize the next spawn interval
      this.timeSinceLastSpawn = 0;
      this.currentSpawnInterval = Math.random() * (3 - 2) + 2;
    }
  }

  public destroy() {
    // Events
    Emitter.off("gameStart");
    Emitter.off("gameOver");
    Emitter.off("gameReset");
    Emitter.off("switchLevel");

    // Level data
    this.unloadLevelData();
  }
}
