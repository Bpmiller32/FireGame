import Entity from "./entity";
import Experience from "../../experience";
import { IWorld } from "./types/gameTypes";
import Component from "./component";

export default class World implements IWorld {
    private static instance: World;
    private experience: Experience;
    private entities: Map<string, Entity>;
    
    public player?: any; // TODO: Replace with Player entity
    public trashCan?: any; // TODO: Replace with TrashCan entity

    // Entity collections
    public enemies: Entity[] = [];
    public crazyEnemies: Entity[] = [];
    public trashCans: Entity[] = [];
    public winFlags: Entity[] = [];
    public cameraSensors: Entity[] = [];
    public ladderTopSensors: Entity[] = [];
    public ladderCoreSensors: Entity[] = [];
    public ladderBottomSensors: Entity[] = [];
    public walls: Entity[] = [];
    public platforms: Entity[] = [];
    public teleporters: Entity[] = [];

    private constructor() {
        this.experience = Experience.getInstance();
        this.entities = new Map();
    }

    public static getInstance(): World {
        if (!World.instance) {
            World.instance = new World();
        }
        return World.instance;
    }

    public addEntity(entity: Entity): void {
        this.entities.set(entity.id, entity);
    }

    public removeEntity(entityId: string): void {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.destroy();
            this.entities.delete(entityId);
        }
    }

    public getEntity(entityId: string): Entity | undefined {
        return this.entities.get(entityId);
    }

    public getEntitiesWithComponent<T extends Component>(
        componentType: { new(...args: any[]): T }
    ): Entity[] {
        return Array.from(this.entities.values()).filter(entity => 
            entity.hasComponent(componentType)
        );
    }

    public update(deltaTime: number): void {
        // Update all entities
        this.entities.forEach(entity => {
            // Get all components and update them
            Array.from(entity['components'].values()).forEach(component => {
                (component as Component).update(deltaTime);
            });
        });
    }

    public destroy(): void {
        this.entities.forEach(entity => entity.destroy());
        this.entities.clear();
    }
}
