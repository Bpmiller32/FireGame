import * as RAPIER from "@dimforge/rapier2d";
import Entity from "../entity";
import TransformComponent from "../components/transformComponent";
import PhysicsComponent from "../components/physicsComponent";
import GraphicsComponent from "../components/graphicsComponent";
import GameObjectType from "../../../utils/types/gameObjectType";
import CollisionGroups from "../../../utils/types/collisionGroups";
import TrashCanBehavior from "../components/behaviors/trashCanBehavior";
import WinFlagBehavior from "../components/behaviors/winFlagBehavior";
import TeleporterBehavior from "../components/behaviors/teleporterBehavior";

export interface InteractiveObjectConfig {
    width: number;
    height: number;
    position: { x: number; y: number };
    rotation?: number;
    value0?: number;
    value1?: number;
    value2?: number;
}

export type InteractiveObjectType = 
    | "TrashCan"
    | "WinFlag"
    | "Teleporter";

export async function createInteractiveObject(
    config: InteractiveObjectConfig,
    type: InteractiveObjectType
): Promise<Entity> {
    const entity = new Entity();

    // Add Transform Component
    const transform = new TransformComponent(
        config.position,
        { width: config.width, height: config.height },
        config.rotation || 0
    );
    entity.addComponent(transform);

    // Add Physics Component
    const physics = new PhysicsComponent(
        GameObjectType.CUBE,
        RAPIER.RigidBodyDesc.fixed(),
        type
    );
    entity.addComponent(physics);

    // Set collision properties
    if (physics.rigidBody) {
        // Set collision properties based on type
        switch (type) {
            case "TrashCan":
                physics.setCollisionGroup(CollisionGroups.PLATFORM);
                physics.setCollisionMask(CollisionGroups.ENEMY);
                break;
            case "WinFlag":
                physics.setCollisionGroup(CollisionGroups.NONE);
                physics.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX);
                physics.rigidBody.collider(0).setSensor(true);
                break;
            case "Teleporter":
                physics.setCollisionGroup(CollisionGroups.NONE);
                physics.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX);
                physics.rigidBody.collider(0).setSensor(true);
                break;
        }

        // Set object data
        const userData = physics.rigidBody.userData as any;
        if (config.value0 !== undefined) userData.value0 = config.value0;
        if (config.value1 !== undefined) userData.value1 = config.value1;
        if (config.value2 !== undefined) userData.value2 = config.value2;
    }

    // Add Graphics Component
    const graphics = new GraphicsComponent(GameObjectType.CUBE);
    entity.addComponent(graphics);

    // Initialize graphics component with debug colors
    await graphics.initialize();
    const debugColor = type === "TrashCan" 
        ? "#ff0000"  // Red for trash cans
        : type === "WinFlag" 
            ? "#ffff00"  // Yellow for win flag
            : "#00ffff"; // Cyan for teleporters
    graphics.createDebugGraphics(debugColor, 0.5);

    // Add and initialize behavior component based on type
    let behavior;
    switch (type) {
        case "TrashCan":
            behavior = new TrashCanBehavior();
            entity.addComponent(behavior);
            await behavior.initialize();
            break;
        case "WinFlag":
            behavior = new WinFlagBehavior();
            entity.addComponent(behavior);
            await behavior.initialize();
            break;
        case "Teleporter":
            behavior = new TeleporterBehavior();
            entity.addComponent(behavior);
            await behavior.initialize();
            break;
    }

    return entity;
}
