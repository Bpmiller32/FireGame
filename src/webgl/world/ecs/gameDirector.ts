import * as THREE from "three";
import Experience from "../../experience";
import World from "./world";
import LevelData, { LevelEntity } from "../../utils/types/levelData";
import TestLevel from "../levels/testLevel.json";
import BlenderExport from "../levels/blenderExport.json";
import Emitter from "../../utils/eventEmitter";
import Time from "../../utils/time";
import Camera from "../../camera";
import ResourceLoader from "../../utils/resourceLoader";
import { createEnemy } from "./factories/enemyFactory";
import { createPlatform } from "./factories/platformFactory";
import { createSensor } from "./factories/sensorFactory";
import { createInteractiveObject } from "./factories/interactiveObjectFactory";
import Entity from "./entity";
import GraphicsComponent from "./components/graphicsComponent";

export default class GameDirector {
    private experience: Experience;
    private scene: THREE.Scene;
    private world: World;
    private time: Time;
    private camera: Camera;
    private resources: ResourceLoader;

    private playerHasBeenSpawned: boolean = false;
    public levelData: LevelData;
    private ambientLight?: THREE.AmbientLight;

    private isSpawningEnemies: boolean = false;
    private spawningInterval: number = 0;
    private timeSinceLastSpawn: number = 0;
    private initialDelay: number = 0;
    private enemyCount: number = 0;
    private intervalIds: number[] = [];
    private currentSpawnInterval: number = 0;

    constructor() {
        this.experience = Experience.getInstance();
        this.scene = this.experience.scene;
        this.world = this.experience.world;
        this.time = this.experience.time;
        this.camera = this.experience.camera;
        this.resources = this.experience.resources;
        this.levelData = TestLevel;

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        Emitter.on("gameStart", () => {
            this.isSpawningEnemies = true;
        });

        Emitter.on("gameOver", () => {
            this.isSpawningEnemies = false;
            this.intervalIds.forEach((id) => clearInterval(id));
        });

        Emitter.on("gameReset", () => {
            this.resetSpawner();
        });

        Emitter.on("switchLevel", async () => {
            await this.switchLevel();
        });
    }

    private resetSpawner(): void {
        this.isSpawningEnemies = true;
        this.timeSinceLastSpawn = 0;
        this.initialDelay = 0;
        this.currentSpawnInterval = 0;
        this.enemyCount = 0;

        this.intervalIds.forEach((id) => clearInterval(id));

        this.spawningInterval = window.setInterval(async () => {
            await this.spawnEnemiesWithLogic();
        }, 16);

        this.intervalIds.push(this.spawningInterval);
    }

    private isValidLevelEntity(data: any): data is LevelEntity {
        return (
            typeof data === 'object' &&
            data !== null &&
            typeof data.width === 'number' &&
            typeof data.depth === 'number' &&
            typeof data.height === 'number' &&
            Array.isArray(data.position) &&
            Array.isArray(data.rotation) &&
            typeof data.type === 'string' &&
            data.type !== null
        );
    }

    private validateLevelData(data: any): LevelData {
        const validatedData: LevelData = {};
        Object.entries(data).forEach(([key, value]) => {
            if (
                value &&
                typeof value === 'object' &&
                'type' in value &&
                typeof value.type === 'string' &&
                this.isValidLevelEntity(value)
            ) {
                validatedData[key] = value;
            }
        });
        return validatedData;
    }

    private async switchLevel(): Promise<void> {
        this.intervalIds.forEach((id) => clearInterval(id));
        this.unloadLevelData();

        const rawNextLevel = this.levelData === TestLevel ? BlenderExport : TestLevel;
        const nextLevel = this.validateLevelData(rawNextLevel);
        await this.loadLevelData(nextLevel);
    }

    private async createEntityFromLevelData(importedData: LevelEntity): Promise<Entity | null> {
        try {
            const config = {
                width: importedData.width,
                height: importedData.depth,
                position: { x: importedData.position[0], y: importedData.position[2] },
                rotation: -importedData.rotation[1],
                vertices: importedData.vertices,
                value0: importedData.value0,
                value1: importedData.value1,
                value2: importedData.value2,
                floorLevel: importedData.value0,
                oneWayEnablePoint: importedData.value2,
                isEdgePlatform: importedData.type === "EdgeOneWayPlatform" || importedData.type === "LineOneWayPlatform"
            };

            switch (importedData.type) {
                case "Wall":
                    return await createPlatform(config, "Platform");

                case "Platform":
                case "OneWayPlatform":
                case "EdgeOneWayPlatform":
                case "LineOneWayPlatform":
                    return await createPlatform(config, importedData.type);

                case "CameraSensor":
                case "LadderTopSensor":
                case "LadderCoreSensor":
                case "LadderBottomSensor":
                    return await createSensor(config, importedData.type);

                case "TrashCan":
                case "WinFlag":
                case "Teleporter":
                    return await createInteractiveObject(config, importedData.type);

                default:
                    console.warn(`Unknown entity type: ${importedData.type}`);
                    return null;
            }
        } catch (error) {
            console.error(`Error creating entity of type ${importedData.type}:`, error);
            return null;
        }
    }

    public async loadLevelData(levelData?: LevelData): Promise<void> {
        this.levelData = levelData ? 
            this.validateLevelData(levelData) : 
            this.validateLevelData(BlenderExport);

        if (!this.ambientLight) {
            this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
            this.scene.add(this.ambientLight);
        }

        // Load level objects
        const entities = await Promise.all(
            Object.values(this.levelData).map(async (importedData) => {
                const entity = await this.createEntityFromLevelData(importedData);
                return { entity, type: importedData.type };
            })
        );

        // Add entities to appropriate collections
        entities.forEach(({ entity, type }) => {
            if (!entity) return;

            // Add entity to appropriate collection and world
            switch (type) {
                case "Wall":
                    this.world.walls.push(entity);
                    break;
                case "Platform":
                case "OneWayPlatform":
                case "EdgeOneWayPlatform":
                case "LineOneWayPlatform":
                    this.world.platforms.push(entity);
                    break;
                case "CameraSensor":
                    this.world.cameraSensors.push(entity);
                    break;
                case "LadderTopSensor":
                    this.world.ladderTopSensors.push(entity);
                    break;
                case "LadderCoreSensor":
                    this.world.ladderCoreSensors.push(entity);
                    break;
                case "LadderBottomSensor":
                    this.world.ladderBottomSensors.push(entity);
                    break;
                case "TrashCan":
                    this.world.trashCans.push(entity);
                    break;
                case "WinFlag":
                    this.world.winFlags.push(entity);
                    break;
                case "Teleporter":
                    this.world.teleporters.push(entity);
                    break;
            }
            this.world.addEntity(entity);
        });
    }

    public unloadLevelData(): void {
        // Clear all entity collections
        [
            this.world.enemies,
            this.world.crazyEnemies,
            this.world.trashCans,
            this.world.winFlags,
            this.world.cameraSensors,
            this.world.ladderTopSensors,
            this.world.ladderCoreSensors,
            this.world.ladderBottomSensors,
            this.world.walls,
            this.world.platforms,
            this.world.teleporters
        ].forEach(collection => {
            collection.forEach(entity => {
                entity.destroy();
                this.world.removeEntity(entity.id);
            });
            collection.length = 0;
        });

        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = undefined;
        }
    }

    public async spawnEnemy(position: { x: number; y: number } = { x: -13, y: 50 }): Promise<void> {
        try {
            const enemy = await createEnemy(1, position);
            if (!enemy) {
                console.error("Failed to create enemy");
                return;
            }

            this.world.enemies.push(enemy);
            this.world.addEntity(enemy);

            // Initialize graphics after adding to world
            const graphics = enemy.getComponent(GraphicsComponent);
            if (graphics) {
                await graphics.createModelGraphics(this.resources.items.enemy);
            }
        } catch (error) {
            console.error("Error spawning enemy:", error);
        }
    }

    private async spawnEnemiesWithLogic(): Promise<void> {
        if (!this.isSpawningEnemies) return;

        this.timeSinceLastSpawn += this.time.delta;

        if (this.currentSpawnInterval === 0 && this.timeSinceLastSpawn >= this.initialDelay) {
            await this.spawnEnemy();
            this.timeSinceLastSpawn = 0;
            this.currentSpawnInterval = Math.random() * (4 - 3) + 3;
            return;
        }

        if (this.currentSpawnInterval > 0 && this.timeSinceLastSpawn >= this.currentSpawnInterval) {
            this.enemyCount++;
            await this.spawnEnemy();
            this.timeSinceLastSpawn = 0;
            this.currentSpawnInterval = Math.random() * (3 - 2) + 2;
        }
    }

    public destroy(): void {
        Emitter.off("gameStart");
        Emitter.off("gameOver");
        Emitter.off("gameReset");
        Emitter.off("switchLevel");
        this.unloadLevelData();
    }
}
