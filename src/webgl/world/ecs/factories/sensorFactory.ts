import * as RAPIER from "@dimforge/rapier2d";
import * as THREE from "three";
import Entity from "../entity";
import TransformComponent from "../components/transformComponent";
import PhysicsComponent from "../components/physicsComponent";
import GraphicsComponent from "../components/graphicsComponent";
import CameraSensorBehavior from "../components/behaviors/cameraSensorBehavior";
import LadderSensorBehavior from "../components/behaviors/ladderSensorBehavior";
import GameObjectType from "../../../utils/types/gameObjectType";
import CollisionGroups from "../../../utils/types/collisionGroups";

export interface SensorConfig {
    width: number;
    height: number;
    position: { x: number; y: number };
    rotation?: number;
    vertices?: number[];
    value0?: number;  // Camera position data or ladder direction
    value1?: number;  // Camera position data
    value2?: number;  // Camera position data
}

export type SensorType = 
    | "CameraSensor"
    | "LadderTopSensor"
    | "LadderCoreSensor"
    | "LadderBottomSensor";

export async function createSensor(
    config: SensorConfig,
    type: SensorType
): Promise<Entity> {
    const entity = new Entity();

    // Add Transform Component
    const transform = new TransformComponent(
        config.position,
        { width: config.width, height: config.height },
        config.rotation || 0
    );
    entity.addComponent(transform);

    // Add Physics Component with sensor enabled
    const physics = new PhysicsComponent(
        config.vertices ? GameObjectType.POLYLINE : GameObjectType.CUBE,
        RAPIER.RigidBodyDesc.fixed(),
        type
    );
    entity.addComponent(physics);

    // Set collision properties
    if (physics.rigidBody) {
        // Set sensor-specific collision properties
        switch (type) {
            case "CameraSensor":
                physics.setCollisionGroup(CollisionGroups.NONE);
                physics.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX);
                break;
            case "LadderTopSensor":
            case "LadderCoreSensor":
            case "LadderBottomSensor":
                physics.setCollisionGroup(CollisionGroups.NONE);
                physics.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX | CollisionGroups.ENEMY);
                break;
        }

        // Set sensor data
        const userData = physics.rigidBody.userData as any;
        if (config.value0 !== undefined) userData.value0 = config.value0;
        if (config.value1 !== undefined) userData.value1 = config.value1;
        if (config.value2 !== undefined) userData.value2 = config.value2;

        // Enable sensor mode for all colliders
        physics.rigidBody.collider(0).setSensor(true);
    }

    // Add Graphics Component for debug visualization
    const graphics = new GraphicsComponent(
        config.vertices ? GameObjectType.POLYLINE : GameObjectType.CUBE
    );
    entity.addComponent(graphics);

    // Initialize and setup debug graphics with different colors for different sensor types
    // Initialize graphics with appropriate debug color
    await graphics.initialize();
    const debugColor = type === "CameraSensor" 
        ? "#00ff00"  // Green for camera sensors
        : type === "LadderCoreSensor" 
            ? "#ff00ff"  // Magenta for ladder core
            : "#0000ff"; // Blue for other sensors
    graphics.createDebugGraphics(debugColor, 0.3);

    // Add and initialize behavior component based on type
    switch (type) {
        case "CameraSensor":
            const cameraPosition = new THREE.Vector3(
                config.value0 || 0,
                config.value1 || 0,
                config.value2 || 0
            );
            const cameraBehavior = new CameraSensorBehavior(cameraPosition);
            entity.addComponent(cameraBehavior);
            await cameraBehavior.initialize();
            break;

        case "LadderTopSensor":
            const topBehavior = new LadderSensorBehavior("top", config.value0);
            entity.addComponent(topBehavior);
            await topBehavior.initialize();
            break;

        case "LadderCoreSensor":
            const coreBehavior = new LadderSensorBehavior("core", config.value0);
            entity.addComponent(coreBehavior);
            await coreBehavior.initialize();
            break;

        case "LadderBottomSensor":
            const bottomBehavior = new LadderSensorBehavior("bottom", config.value0);
            entity.addComponent(bottomBehavior);
            await bottomBehavior.initialize();
            break;
    }

    return entity;
}
