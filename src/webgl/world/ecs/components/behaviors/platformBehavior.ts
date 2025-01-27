import * as RAPIER from "@dimforge/rapier2d";
import BehaviorComponent from '../behaviorComponent';
import GameUtils from '../../../../utils/gameUtils';

export type PlatformType = 
    | "Platform"
    | "OneWayPlatform"
    | "EdgeOneWayPlatform"
    | "LineOneWayPlatform";

export default class PlatformBehavior extends BehaviorComponent {
    private platformType: PlatformType;
    private enablePoint: number;
    private floorLevel: number;

    constructor(type: PlatformType, enablePoint: number = 0, floorLevel: number = 0) {
        super();
        this.platformType = type;
        this.enablePoint = enablePoint;
        this.floorLevel = floorLevel;
    }

    protected async onInitialize(): Promise<void> {
        if (!this.physics?.rigidBody) return;

        // Set platform data in physics body user data
        const userData = GameUtils.getDataFromPhysicsBody(this.physics.rigidBody);
        userData.value0 = this.floorLevel;
        userData.value1 = this.isEdgePlatform() ? 1 : 0;
        userData.value2 = this.enablePoint;

        // For one-way platforms, we need to handle collision filtering
        if (this.isOneWayPlatform()) {
            this.experience.physics.world.intersectionPairsWith(
                this.physics.rigidBody.collider(0),
                (otherCollider) => {
                    if (GameUtils.isColliderName(otherCollider, "Player")) {
                        this.handleOneWayCollision(otherCollider);
                    }
                }
            );
        }
    }

    private isOneWayPlatform(): boolean {
        return this.platformType.includes("OneWay");
    }

    private isEdgePlatform(): boolean {
        return this.platformType === "EdgeOneWayPlatform" || this.platformType === "LineOneWayPlatform";
    }

    private handleOneWayCollision(otherCollider: RAPIER.Collider): void {
        // Get player position and velocity
        const playerBody = otherCollider.parent();
        if (!playerBody) return;

        const playerPos = playerBody.translation();
        const playerVel = playerBody.linvel();

        // Only enable collision when:
        // 1. Player is above the platform's enable point
        // 2. Player is moving downward
        const isAboveEnablePoint = playerPos.y > this.enablePoint;
        const isMovingDown = playerVel.y < 0;

        if (isAboveEnablePoint && isMovingDown) {
            // Enable collision
            this.physics?.rigidBody?.collider(0).setSensor(false);
        } else {
            // Disable collision
            this.physics?.rigidBody?.collider(0).setSensor(true);
        }
    }

    protected onUpdate(deltaTime: number): void {
        // Update any platform effects or animations
    }

    protected onDestroy(): void {
        // Clean up any platform-specific resources
    }
}
