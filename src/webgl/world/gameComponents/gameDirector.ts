import * as THREE from "three";
import Experience from "../../experience";
import World from "../levels/world";
import Player from "../player/player";
import GameSensor from "./gameSensor";
import GameObjectType from "../../utils/types/gameObjectType";
import LevelData from "../../utils/types/levelData";
import TestLevel from "../levels/testLevel.json";
import BlenderExport from "../levels/blenderExport.json";
import Platform from "../gameStructures/platform";
import Enemy from "../gameStructures/enemy";
import TrashCan from "../gameStructures/trashCan";
import Emitter from "../../utils/eventEmitter";
import CrazyEnemy from "../gameStructures/crazyEnemy";
import Time from "../../utils/time";
import Camera from "../../camera";
import setCelesteAttributes from "../player/attributes/setCelesteAttributes";
import setDkAttributes from "../player/attributes/setDkAttributes";

export default class GameDirector {
  private experience: Experience;
  private world: World;
  private time: Time;
  private camera: Camera;
  private player: Player;

  private playerHasBeenSpawned!: boolean;

  private levelData!: LevelData;

  private isSpawningEnemies!: boolean;
  private spawningInterval!: number;
  private timeSinceLastSpawn!: number;
  private initialDelay!: number;
  private spawnInterval!: number;
  private enemyCount!: number;

  constructor() {
    this.experience = Experience.getInstance();
    this.world = this.experience.world;
    this.time = this.experience.time;
    this.camera = this.experience.camera;
    this.player = this.world.player!;

    this.initializeAttributes();

    // Events
    Emitter.on("gameStart", () => {
      this.isSpawningEnemies = true;

      // // Start a timer or game loop for spawning logic, runs roughly 60 times per second with 16
      // this.spawningInterval = setInterval(() => {
      //   this.spawnEnemiesWithLogic();
      // }, 16);
    });

    Emitter.on("gameOver", () => {
      this.isSpawningEnemies = false;
      clearInterval(this.spawningInterval);
    });

    Emitter.on("gameReset", () => {
      this.isSpawningEnemies = true;

      // Reset spawner values
      this.timeSinceLastSpawn = 0;
      this.initialDelay = 0;
      this.spawnInterval = 0;
      this.enemyCount = 0;

      clearInterval(this.spawningInterval);

      this.spawningInterval = setInterval(() => {
        this.spawnEnemiesWithLogic();
      }, 16);
    });

    Emitter.on("switchLevel", () => {
      clearInterval(this.spawnInterval);
      this.unloadLevelData();

      let nextLevel: LevelData = BlenderExport;
      if (this.levelData === BlenderExport) {
        nextLevel = TestLevel;
      }

      this.loadLevelData(nextLevel, () => {
        if (nextLevel === TestLevel) {
          this.camera.setCameraFollow(true);
          setCelesteAttributes(this.player);
        } else {
          this.camera.setCameraFollow(false);
          setDkAttributes(this.player);
        }
      });
    });
  }

  private initializeAttributes() {
    // Set default level to load
    this.levelData = TestLevel;

    this.playerHasBeenSpawned = false;
    this.isSpawningEnemies = false;

    // Id for setInterval, used to clear interval
    this.spawningInterval = 0;
    // Tracks time since last spawn
    this.timeSinceLastSpawn = 0;
    // Delay before starting spawning (in seconds)
    this.initialDelay = 0;
    // Tracks the current spawn interval (randomized)
    this.spawnInterval = 0;
    // Tracks the total number of enemies spawned
    this.enemyCount = 0;
  }

  private importLevelObjects(
    gameObjectType: string,
    callback: (value: any) => void
  ) {
    for (const value of Object.values(this.levelData)) {
      if (value.type === gameObjectType) {
        callback(value);
      }
    }
  }

  private importCameraSensors() {
    this.importLevelObjects("CameraSensor", (value) => {
      const sensor = new GameSensor(
        "CameraSensor",
        GameObjectType.CUBE,
        { width: value.width, height: value.depth },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1]
      );

      sensor.setIntersectingTarget(this.player.physicsBody!);
      sensor.setPositionData(new THREE.Vector3(0, value.value0, 0));

      this.world.cameraSensors.push(sensor);
    });
  }

  private importWalls() {
    this.importLevelObjects("Wall", (value) => {
      const wall = new Platform(
        {
          width: value.width,
          height: value.depth,
          depth: value.height,
        },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1],
        false
      );

      wall.setObjectName("Wall");

      this.world.walls.push(wall);
    });
  }

  private importPlatforms() {
    const platformTypes = ["Platform", "OneWayPlatform"];

    platformTypes.forEach((type) =>
      this.importLevelObjects(type, (value) => {
        const platform = new Platform(
          { width: value.width, height: value.depth, depth: value.height },
          { x: value.position[0], y: value.position[2] },
          -value.rotation[1],
          type === "OneWayPlatform"
        );

        // Used to check what floor the player is touching
        platform.setObjectValue0(value.value0);

        // Used to check if the platform is an edge platform, useful for gamefeel and coyoteJump
        platform.setEdgePlatform(value.value1);

        this.world.platforms.push(platform);
      })
    );
  }

  private importTrashCans() {
    this.importLevelObjects("TrashCan", (value) => {
      const trashCan = new TrashCan(
        { width: value.width, height: value.depth, depth: value.height },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1]
      );

      trashCan.setObjectName("Wall");

      this.world.trashCans.push(trashCan);
    });
  }

  private importLadderSensors() {
    const ladderSensorTypes = [
      "LadderTopSensor",
      "LadderCoreSensor",
      "LadderBottomSensor",
    ];

    ladderSensorTypes.forEach((type) => {
      console.log(type);

      this.importLevelObjects(type, (value) => {
        const ladderSensor = new GameSensor(
          type,
          GameObjectType.CUBE,
          { width: value.width, height: value.depth },
          { x: value.position[0], y: value.position[2] },
          -value.rotation[1],
          value.value0
        );

        ladderSensor.setIntersectingTarget(this.player.physicsBody!);

        if (type == "LadderTopSensor") {
          this.world.ladderTopSensors.push(ladderSensor);
        } else if (type == "LadderCoreSensor") {
          this.world.ladderCoreSensors.push(ladderSensor);
        } else if (type == "LadderBottomSensor") {
          this.world.ladderBottomSensors.push(ladderSensor);
        }
      });
    });
  }

  private importTeleporters() {
    for (const [_, value] of Object.entries(this.levelData)) {
    }
  }

  private setPlayerStart() {
    for (const value of Object.values(this.levelData)) {
      if (value.type !== "PlayerStart") continue;

      const [x, , z] = value.position;

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
    for (const value of Object.values(this.levelData)) {
      if (value.type !== "CameraStart") continue;

      const [x, y, z] = value.position;
      this.camera.teleportToPosition(x, z, y);
    }
  }

  public loadLevelData(levelData?: LevelData, callback?: () => void) {
    // Set level json data to parse through
    if (levelData) {
      this.levelData = levelData;
    } else {
      // Default level to load
      this.levelData = BlenderExport;
    }

    // Set player attributes if included
    if (callback) {
      callback();
    }

    // Must load player first to avoid problems with setting sensorTargets
    this.setPlayerStart();
    this.setCameraStart();

    this.importCameraSensors();
    this.importWalls();
    this.importPlatforms();
    this.importLadderSensors();
    this.importTrashCans();
  }

  public unloadLevelData() {
    const destroyEntities = (entities: any[]) =>
      entities.forEach((entity) => entity.destroy());

    // Enemies and trashcans
    destroyEntities(this.world.enemies);
    destroyEntities(this.world.crazyEnemies);
    destroyEntities(this.world.trashCans);

    // Camera sensors
    destroyEntities(this.world.cameraSensors);

    // Ladders
    destroyEntities(this.world.ladderTopSensors);
    destroyEntities(this.world.ladderCoreSensors);
    destroyEntities(this.world.ladderBottomSensors);

    // Walls and platforms
    destroyEntities(this.world.walls);
    destroyEntities(this.world.platforms);
  }

  public spawnEnemy(position: { x: number; y: number } = { x: -15, y: 50 }) {
    this.world.enemies.push(
      new Enemy(1, {
        x: position.x,
        y: position.y,
      })
    );
  }

  public spawnCrazyEnemy(
    position: { x: number; y: number } = { x: -15, y: 50 }
  ) {
    this.world.crazyEnemies.push(
      new CrazyEnemy(1, {
        x: position.x,
        y: position.y,
      })
    );
  }

  public spawnEnemiesWithLogic() {
    // Stop if spawning is disabled
    if (!this.isSpawningEnemies) {
      return;
    }

    // Accumulate time
    this.timeSinceLastSpawn += this.time.delta;

    // Handle the initial delay
    if (
      this.spawnInterval === 0 &&
      this.timeSinceLastSpawn >= this.initialDelay
    ) {
      this.spawnCrazyEnemy(); // Spawn the first crazyEnemy
      this.timeSinceLastSpawn = 0;
      this.spawnInterval = Math.random() * (4 - 3) + 3; // Random delay between 3 and 4 seconds
      return;
    }

    // Check if it's time to spawn the next enemy
    if (
      this.spawnInterval > 0 &&
      this.timeSinceLastSpawn >= this.spawnInterval
    ) {
      this.enemyCount++;

      // Spawn a crazyEnemy every 8th spawn
      if (this.enemyCount % 8 === 0) {
        this.spawnCrazyEnemy();
      } else {
        this.spawnEnemy();
      }

      // Reset time and randomize the next spawn interval
      this.timeSinceLastSpawn = 0;
      this.spawnInterval = Math.random() * (3 - 2) + 2;
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
