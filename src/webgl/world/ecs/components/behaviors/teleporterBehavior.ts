import * as RAPIER from "@dimforge/rapier2d";
import BehaviorComponent from '../behaviorComponent';
import PhysicsComponent from '../physicsComponent';
import GameUtils from '../../../../utils/gameUtils';

export default class TeleporterBehavior extends BehaviorComponent {
    private destinationX: number = 0;
    private destinationY: number = 0;
    private isActive: boolean = true;
    private cooldownTime: number = 1000; // 1 second cooldown
    private lastTeleportTime: number = 0;

    protected async onInitialize(): Promise<void> {
        if (!this.physics?.rigidBody) return;

        // Get teleport destination from user data
        const userData = GameUtils.getDataFromPhysicsBody(this.physics.rigidBody);
        this.destinationX = userData.value0 || 0;
        this.destinationY = userData.value1 || 0;

        // Listen for collisions with player
        this.experience.physics.world.intersectionPairsWith(
            this.physics.rigidBody.collider(0),
            (otherCollider) => {
                if (this.isActive && GameUtils.isColliderName(otherCollider, "Player")) {
                    this.teleportPlayer(otherCollider.parent());
                }
            }
        );
    }

    private teleportPlayer(playerBody: RAPIER.RigidBody | null): void {
        if (!playerBody || !this.isActive) return;

        const currentTime = Date.now();
        if (currentTime - this.lastTeleportTime < this.cooldownTime) return;

        // Teleport the player
        playerBody.setTranslation(
            { x: this.destinationX, y: this.destinationY },
            true
        );

        // Start cooldown
        this.lastTeleportTime = currentTime;
        this.isActive = false;
        setTimeout(() => {
            this.isActive = true;
        }, this.cooldownTime);

        // Optional: Add teleport effect
        // this.graphics?.createDebugGraphics("#00ffff", 1.0);
    }

    protected onUpdate(deltaTime: number): void {
        // Update any teleporter animations or effects
    }

    protected onDestroy(): void {
        this.isActive = false;
    }
}
