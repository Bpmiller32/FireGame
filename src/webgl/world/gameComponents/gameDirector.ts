import * as THREE from "three";
import Experience from "../../experience";
import World from "../levels/world";
import Player from "../player/player";
import GameSensor from "./gameSensor";
import GameObjectType from "../../utils/types/gameObjectType";
import LevelData from "../../utils/types/levelData";
import TestLevel0 from "../levels/testLevel0.json";
import BlenderExport from "../levels/blenderExport.json";
import setCelesteAttributes from "../player/attributes/setCelesteAttributes";
import Platform from "../gameStructures/platform";
import Enemy from "../gameStructures/enemy";
import TrashCan from "../gameStructures/trashCan";

export default class GameDirector {
  private experience: Experience;
  private world: World;
  private player: Player;

  constructor() {
    this.experience = Experience.getInstance();
    this.world = this.experience.world;
    this.player = this.world.player!;
  }

  public loadLevelData(levelName?: string) {
    // Load level by name, load default level if none specified
    let levelToLoad: LevelData = TestLevel0;

    if (levelName == "testLevel0") {
      levelToLoad = TestLevel0;
      setCelesteAttributes(this.player);
    } else if (levelName == "blenderExport") {
      levelToLoad = BlenderExport;
    }

    // Import platforms
    for (const [_, value] of Object.entries(levelToLoad)) {
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
        true,
        value.visible
      );

      platform.setObjectValue(value.value);

      this.world.platforms.push(platform);
    }

    // Import walls
    for (const [_, value] of Object.entries(levelToLoad)) {
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
        false,
        value.visible
      );

      wall.setObjectName("Wall");

      this.world.walls.push(wall);
    }

    // Import trashcans
    for (const [_, value] of Object.entries(levelToLoad)) {
      if (value.type != "trashCan") {
        continue;
      }

      this.world.trashCans.push(
        new TrashCan(
          {
            width: value.width,
            height: value.depth,
            depth: value.height,
          },
          { x: value.position[0], y: value.position[2] },
          -value.rotation[1]
        )
      );
    }

    // Import camera sensors
    for (const [_, value] of Object.entries(levelToLoad)) {
      if (value.type != "cameraSensor") {
        continue;
      }

      this.world.cameraSensors.push(
        new GameSensor(
          "CameraSensor",
          GameObjectType.CUBE,
          { width: value.width, height: value.depth },
          { x: value.position[0], y: value.position[2] },
          -value.rotation[1],
          this.player.physicsBody,
          new THREE.Vector3(0, value.value, 0)
        )
      );
    }

    // Import ladder sensors
    for (const [_, value] of Object.entries(levelToLoad)) {
      if (value.type != "ladderCoreSensor") {
        continue;
      }

      const ladderCoreSensor = new GameSensor(
        "LadderCoreSensor",
        GameObjectType.CUBE,
        { width: value.width, height: value.depth },
        { x: value.position[0], y: value.position[2] },
        -value.rotation[1],
        this.player.physicsBody,
        undefined,
        value.value
      );

      ladderCoreSensor.setIsConnectedLadder(value.isConnectedLadder);

      this.world.ladderCoreSensors.push(ladderCoreSensor);
    }

    // Import ladder top sensors
    for (const [_, value] of Object.entries(levelToLoad)) {
      if (value.type != "ladderTopSensor") {
        continue;
      }

      this.world.ladderTopSensors.push(
        new GameSensor(
          "LadderTopSensor",
          GameObjectType.CUBE,
          { width: value.width, height: value.depth },
          { x: value.position[0], y: value.position[2] },
          -value.rotation[1],
          this.player.physicsBody
        )
      );
    }
    // Import ladder bottom sensors
    for (const [_, value] of Object.entries(levelToLoad)) {
      if (value.type != "ladderBottomSensor") {
        continue;
      }

      this.world.ladderBottomSensors.push(
        new GameSensor(
          "LadderBottomSensor",
          GameObjectType.CUBE,
          { width: value.width, height: value.depth },
          { x: value.position[0], y: value.position[2] },
          -value.rotation[1],
          this.player.physicsBody,
          undefined,
          value.value
        )
      );
    }
  }

  public spawnEnemy() {
    this.world.enemies.push(
      // new Enemy(
      //   1,
      //   {
      //     x: GameUtils.getRandomNumber(-15, 0),
      //     y: GameUtils.getRandomNumber(0, 15),
      //   },
      //   true
      // )
      new Enemy(
        1,
        {
          x: -15,
          y: 50,
        },
        true
      )
    );
  }

  public spawnEnemiesWithRandomInterval() {
    const spawnEnemy = () => {
      this.spawnEnemy();

      // Generate a random delay between 2 and 3 seconds (in milliseconds)
      const randomDelay = Math.random() * (3000 - 2000) + 2000;

      // Schedule the next enemy spawn
      setTimeout(spawnEnemy, randomDelay);
    };

    // Start the spawning loop
    setTimeout(() => {
      spawnEnemy();
    }, 3000);
  }

  public despawnAllEnemies() {
    this.world.enemies.forEach((enemy) => {
      enemy.destroy();
    });
  }

  public destroy() {}
}
