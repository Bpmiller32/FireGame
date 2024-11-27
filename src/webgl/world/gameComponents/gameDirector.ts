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

export default class GameDirector {
  private experience: Experience;
  private world: World;
  private time: Time;
  private player: Player;

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

      this.spawningInterval = setInterval(() => {
        this.spawnEnemiesWithLogic();
      }, 16);
    });
  }

  private initializeAttributes() {
    // Set default level to load
    this.levelData = TestLevel;

    this.isSpawningEnemies = false;

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

  private importCameraSensors() {
    for (const [_, value] of Object.entries(this.levelData)) {
      if (value.type != "cameraSensor") {
        continue;
      }

      const cameraSensor = new GameSensor(
        "CameraSensor",
        GameObjectType.CUBE,
        { width: value.width, height: value.depth },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1]
      );

      cameraSensor.setIntersectingTarget(this.player.physicsBody!);
      cameraSensor.setPositionData(new THREE.Vector3(0, value.value0, 0));

      this.world.cameraSensors.push(cameraSensor);
    }
  }

  private importWalls() {
    for (const [_, value] of Object.entries(this.levelData)) {
      if (value.type != "wall") {
        continue;
      }

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
    }
  }

  private importPlatforms() {
    // Normal Platforms
    for (const [_, value] of Object.entries(this.levelData)) {
      if (value.type != "platform") {
        continue;
      }

      const platform = new Platform(
        {
          width: value.width,
          height: value.depth,
          depth: value.height,
        },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1],
        false
      );

      // Used to check what floor the player is touching
      platform.setObjectValue0(value.value0);
      // Used to check if the platform is an edge platform, useful for gamefeel and coyoteJump
      platform.setEdgePlatform(value.value1);

      this.world.platforms.push(platform);
    }

    // OneWayPlatforms
    for (const [_, value] of Object.entries(this.levelData)) {
      if (value.type != "oneWayPlatform") {
        continue;
      }

      const oneWayPlatform = new Platform(
        {
          width: value.width,
          height: value.depth,
          depth: value.height,
        },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1],
        true
      );

      // Used to check what floor the player is touching
      oneWayPlatform.setObjectValue0(value.value0);
      // Used to check if the platform is an edge platform, useful for gamefeel and coyoteJump
      oneWayPlatform.setEdgePlatform(value.value1);

      this.world.platforms.push(oneWayPlatform);
    }
  }

  private importTrashCans() {
    for (const [_, value] of Object.entries(this.levelData)) {
      if (value.type != "trashCan") {
        continue;
      }

      const trashCan = new TrashCan(
        { width: value.width, height: value.depth, depth: value.height },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1]
      );

      this.world.trashCans.push(trashCan);
    }
  }

  private importLadderTopSensors() {
    for (const [_, value] of Object.entries(this.levelData)) {
      if (value.type != "ladderTopSensor") {
        continue;
      }

      const ladderTopSensor = new GameSensor(
        "LadderTopSensor",
        GameObjectType.CUBE,
        { width: value.width, height: value.depth },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1],
        value.value0
      );

      ladderTopSensor.setIntersectingTarget(this.player.physicsBody!);

      this.world.ladderTopSensors.push(ladderTopSensor);
    }
  }

  private importLadderCoreSensors() {
    for (const [_, value] of Object.entries(this.levelData)) {
      if (value.type != "ladderCoreSensor") {
        continue;
      }

      const ladderCoreSensor = new GameSensor(
        "LadderCoreSensor",
        GameObjectType.CUBE,
        { width: value.width, height: value.depth },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1],
        value.value0
      );

      ladderCoreSensor.setIntersectingTarget(this.player.physicsBody!);

      this.world.ladderCoreSensors.push(ladderCoreSensor);
    }
  }

  private importLadderBottomSensors() {
    for (const [_, value] of Object.entries(this.levelData)) {
      if (value.type != "ladderBottomSensor") {
        continue;
      }

      const ladderBottomSensor = new GameSensor(
        "LadderBottomSensor",
        GameObjectType.CUBE,
        { width: value.width, height: value.depth },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1],
        value.value0
      );

      ladderBottomSensor.setIntersectingTarget(this.player.physicsBody!);

      this.world.ladderBottomSensors.push(ladderBottomSensor);
    }
  }

  private importTeleporters() {
    for (const [_, value] of Object.entries(this.levelData)) {
    }
  }

  public loadLevelData(levelName?: string) {
    if (levelName && levelName == "blenderExport") {
      this.levelData = BlenderExport;
    }

    this.importCameraSensors();
    this.importWalls();
    this.importPlatforms();
    this.importTrashCans();

    this.importLadderTopSensors();
    this.importLadderCoreSensors();
    this.importLadderBottomSensors();
  }

  public spawnEnemy() {
    this.world.enemies.push(
      new Enemy(1, {
        x: -15,
        y: 50,
      })
    );
  }

  public spawnCrazyEnemy() {
    this.world.crazyEnemies.push(
      new CrazyEnemy(1, {
        x: -15,
        y: 50,
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
      this.spawnInterval = Math.random() * (3 - 2) + 2; // Random delay between 2 and 3 seconds
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

  public destroy() {}
}
