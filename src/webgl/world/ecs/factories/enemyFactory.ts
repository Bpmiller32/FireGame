import * as RAPIER from "@dimforge/rapier2d";
import Entity from "../entity";
import TransformComponent from "../components/transformComponent";
import PhysicsComponent from "../components/physicsComponent";
import GraphicsComponent from "../components/graphicsComponent";
import EnemyBehavior from "../components/behaviors/enemyBehavior";
import GameObjectType from "../../../utils/types/gameObjectType";

export function createEnemy(
    size: number,
    position: { x: number; y: number },
    rotation: number = 0
): Entity {
    const enemy = new Entity();

    // Add Transform Component
    const transform = new TransformComponent(
        position,
        { width: size, height: size },
        rotation
    );
    enemy.addComponent(transform);

    // Add Physics Component
    const physics = new PhysicsComponent(
        GameObjectType.SPHERE,
        RAPIER.RigidBodyDesc.dynamic(),
        "Enemy"
    );
    enemy.addComponent(physics);

    // Add Graphics Component
    const graphics = new GraphicsComponent(GameObjectType.SPHERE);
    enemy.addComponent(graphics);
    
    // Initialize graphics after adding to entity
    graphics.initialize();

    // Add Behavior Component
    const behavior = new EnemyBehavior();
    enemy.addComponent(behavior);
    
    // Initialize behavior after adding to entity
    behavior.initialize();

    return enemy;
}
