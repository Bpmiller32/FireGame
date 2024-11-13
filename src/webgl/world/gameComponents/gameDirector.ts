import * as THREE from "three";
import Experience from "../../experience";
import Emitter from "../../utils/eventEmitter";
import UserData from "../../utils/types/userData";
import Cube from "../gameEntities/cube";
import World from "../levels/world";
import Player from "../player/player";
import GameSensor from "./gameSensor";
import GameObjectType from "../../utils/types/gameObjectType";
import LevelData from "../../utils/types/levelData";
import TestLevel0 from "../levels/testLevel0.json";
import BlenderExport from "../levels/blenderExport.json";
import Physics from "../../physics";
import setCelesteAttributes from "../player/attributes/setCelesteAttributes";
import Platform from "../gameStructures/platform";

export default class GameDirector {
  private experience: Experience;
  private physics: Physics;
  private world: World;
  private player: Player;

  public isGameUpdating: boolean;

  constructor() {
    this.experience = Experience.getInstance();
    this.physics = this.experience.physics;
    this.world = this.experience.world;
    this.player = this.world.player!;

    this.isGameUpdating = true;

    // Events
    Emitter.on("objectRemoved", () => {
      this.player = null as any;
    });
  }

  public loadLevelData(levelName?: string) {
    // Load level by name, default load some level if none specified
    let levelToLoad: LevelData = TestLevel0;

    if (levelName == "testLevel0") {
      levelToLoad = TestLevel0;
      setCelesteAttributes(this.player);
    } else if (levelName == "blenderExport") {
      levelToLoad = BlenderExport;
    }

    // Random colors for visualizing physics platforms
    const randomColors = ["red", "orange", "yellow", "green", "blue", "purple"];

    // Import platforms
    for (const [_, value] of Object.entries(levelToLoad)) {
      if (value.type != "platform") {
        continue;
      }

      this.world.platforms.push(
        // new Cube(
        //   "OneWayPlatform",
        //   {
        //     width: value.width,
        //     height: value.depth,
        //     depth: value.height,
        //   },
        //   { x: value.position[0], y: value.position[2] },
        //   -value.rotation[1],
        //   value.visible,
        //   new THREE.MeshBasicMaterial({
        //     color:
        //       randomColors[Math.floor(Math.random() * randomColors.length)],
        //   })
        // )
        new Platform(
          {
            width: value.width,
            height: value.depth,
            depth: value.height,
          },
          { x: value.position[0], y: value.position[2] },
          -value.rotation[1],
          true,
          true
        )
      );
    }

    // Import walls
    for (const [_, value] of Object.entries(levelToLoad)) {
      if (value.type != "wall") {
        continue;
      }

      this.world.walls.push(
        new Cube(
          "Wall",
          {
            width: value.width,
            height: value.depth,
            depth: value.height,
          },
          { x: value.position[0], y: value.position[2] },
          -value.rotation[1],
          value.visible,
          new THREE.MeshBasicMaterial({
            color:
              randomColors[Math.floor(Math.random() * randomColors.length)],
          })
        )
      );
    }

    // Import sensors
    for (const [_, value] of Object.entries(levelToLoad)) {
      if (value.type != "sensor") {
        continue;
      }

      this.world.sensors.push(
        new GameSensor(
          "CameraSensor",
          GameObjectType.CUBE,
          { width: value.width, height: value.depth },
          { x: value.position[0], y: value.position[2] },
          this.player.physicsBody,
          new THREE.Vector3(0, value.value, 0)
        )
      );
    }
  }

  public update() {
    // Exit early if object is destroyed
    if (!this.physics) {
      return;
    }

    // Check if need to pause simulation
    if (!this.isGameUpdating) {
      this.physics.isPaused = true;
    } else {
      this.physics.isPaused = false;
    }

    // Guard against player not being loaded yet
    if (!this.player) {
      return;
    }

    for (
      let i = 0;
      i < this.player.characterController.numComputedCollisions();
      i++
    ) {
      const collision = this.player.characterController.computedCollision(i);

      if (
        (collision!.collider?.parent()?.userData as UserData).name === "Enemy"
      ) {
        console.log("hit enemy");
        // this.player.teleportRelative(-10, 0);
      }
    }
  }

  public destroy() {
    // Clear event listeners
    Emitter.off("objectRemoved");

    // Nullify all properties to release references
    this.experience = null as any;
    this.physics = null as any;
    this.world = null as any;
    this.player = null as any;

    this.isGameUpdating = null as any;
  }
}
