import * as RAPIER from "@dimforge/rapier2d";
import Entity from "../entity";
import TransformComponent from "../components/transformComponent";
import PhysicsComponent from "../components/physicsComponent";
import GraphicsComponent from "../components/graphicsComponent";
import PlatformBehavior, { PlatformType } from "../components/behaviors/platformBehavior";
import GameObjectType from "../../../utils/types/gameObjectType";
import CollisionGroups from "../../../utils/types/collisionGroups";

export interface PlatformConfig {
    width: number;
    height: number;
    position: { x: number; y: number };
    rotation?: number;
    isEdgePlatform?: boolean;
    vertices?: number[];
    floorLevel?: number;
    oneWayEnablePoint?: number;
}

export async function createPlatform(
    config: PlatformConfig,
    type: PlatformType = "Platform"
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
        config.isEdgePlatform || type === "EdgeOneWayPlatform" || type === "LineOneWayPlatform"
            ? GameObjectType.POLYLINE
            : GameObjectType.CUBE,
        RAPIER.RigidBodyDesc.fixed(),
        type
    );
    entity.addComponent(physics);

    // Set collision properties
    if (physics.rigidBody) {
        physics.setCollisionGroup(CollisionGroups.PLATFORM);
        physics.setCollisionMask(
            CollisionGroups.PLAYER_BOUNDING_BOX | CollisionGroups.ENEMY | CollisionGroups.PLAYER_HIT_BOX
        );

        // Set platform data
        const userData = physics.rigidBody.userData as any;
        if (config.floorLevel !== undefined) {
            userData.value0 = config.floorLevel;
        }
        if (config.isEdgePlatform) {
            userData.value1 = 1;
        }
        if (config.oneWayEnablePoint !== undefined) {
            userData.value2 = config.oneWayEnablePoint;
        }
    }

    // Add Graphics Component
    const graphics = new GraphicsComponent(
        config.isEdgePlatform || type === "EdgeOneWayPlatform" || type === "LineOneWayPlatform"
            ? GameObjectType.POLYLINE
            : GameObjectType.CUBE
    );
    entity.addComponent(graphics);

    // Initialize graphics with appropriate debug color
    await graphics.initialize();
    const debugColor = type.includes("OneWay") ? "#888888" : "#666666";
    graphics.createDebugGraphics(debugColor, 0.5);

    // Add and initialize platform behavior if needed
    if (type !== "Platform") {
        const behavior = new PlatformBehavior(
            type,
            config.oneWayEnablePoint,
            config.floorLevel
        );
        entity.addComponent(behavior);
        await behavior.initialize();
    }

    return entity;
}
