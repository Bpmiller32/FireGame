import * as RAPIER from "@dimforge/rapier2d";
import Component from '../component';
import TransformComponent from './transformComponent';
import GameObjectType from '../../../utils/types/gameObjectType';
import UserData from '../../../utils/types/userData';

export default class PhysicsComponent extends Component {
    public rigidBody: RAPIER.RigidBody | null = null;
    private physics = this.experience.physics;
    private gameObjectType: string = GameObjectType.CUBE;
    private transform: TransformComponent | null = null;

    constructor(
        gameObjectType: string = GameObjectType.CUBE,
        bodyType: RAPIER.RigidBodyDesc = RAPIER.RigidBodyDesc.fixed(),
        name: string = "GameObject"
    ) {
        super();
        this.gameObjectType = gameObjectType;
        this.initPhysics(bodyType, name);
    }

    private initPhysics(bodyType: RAPIER.RigidBodyDesc, name: string): void {
        if (!this.entity) return;

        const transform = this.entity.getComponent(TransformComponent);
        if (!transform) {
            console.error('PhysicsComponent requires a TransformComponent');
            return;
        }
        this.transform = transform;

        // Create rigid body
        this.rigidBody = this.physics.world.createRigidBody(bodyType);
        
        // Set initial transform
        this.rigidBody.setTranslation(
            { 
                x: this.transform.initialPosition.x, 
                y: this.transform.initialPosition.y 
            }, 
            true
        );
        this.rigidBody.setRotation(this.transform.rotation, true);

        // Create and attach collider
        const collider = this.createCollider();
        this.physics.world.createCollider(collider, this.rigidBody);

        // Set user data
        this.rigidBody.userData = {
            name: name,
            gameEntityType: this.entity.constructor.name,
            value0: 0,
            value1: 0,
            value2: 0,
            value3: 0
        } as UserData;
    }

    private createCollider(): RAPIER.ColliderDesc {
        if (!this.transform) return RAPIER.ColliderDesc.cuboid(0.5, 0.5);

        const size = this.transform.currentSize;
        
        switch (this.gameObjectType) {
            case GameObjectType.SPHERE:
                return RAPIER.ColliderDesc.ball(size.x / 2);
            case GameObjectType.CAPSULE:
                return RAPIER.ColliderDesc.capsule(size.y / 2, size.x);
            case GameObjectType.CUBE:
            default:
                return RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2);
        }
    }

    public setCollisionGroup(collisionGroups: number, colliderIndex: number = 0): void {
        if (!this.rigidBody) return;

        const currentMask = this.rigidBody.collider(colliderIndex).collisionGroups() >> 16;
        this.rigidBody.collider(colliderIndex)
            .setCollisionGroups(collisionGroups | (currentMask << 16));
    }

    public setCollisionMask(collisionMask: number, colliderIndex: number = 0): void {
        if (!this.rigidBody) return;

        const currentGroup = this.rigidBody.collider(colliderIndex).collisionGroups() & 0xffff;
        this.rigidBody.collider(colliderIndex)
            .setCollisionGroups(currentGroup | (collisionMask << 16));
    }

    public teleportRelative(x: number, y: number): void {
        if (!this.rigidBody || !this.transform) return;

        const newPos = {
            x: this.transform.currentPosition.x + x,
            y: this.transform.currentPosition.y + y
        };
        this.rigidBody.setTranslation(newPos, true);
    }

    public teleportToPosition(x: number, y: number): void {
        if (!this.rigidBody) return;
        this.rigidBody.setTranslation({ x, y }, true);
    }

    public setLinearVelocity(x: number, y: number): void {
        if (!this.rigidBody) return;
        this.rigidBody.setLinvel({ x, y }, true);
    }

    public update(deltaTime: number): void {
        if (!this.rigidBody || !this.transform) return;

        // Update transform component with physics state
        const translation = this.rigidBody.translation();
        this.transform.setPosition(translation.x, translation.y);
        this.transform.setRotation(this.rigidBody.rotation());
    }

    public destroy(): void {
        if (!this.rigidBody) return;

        // Remove collider and rigid body from physics world
        this.physics.world.removeCollider(this.rigidBody.collider(0), true);
        this.physics.world.removeRigidBody(this.rigidBody);
        this.rigidBody = null;
    }
}
