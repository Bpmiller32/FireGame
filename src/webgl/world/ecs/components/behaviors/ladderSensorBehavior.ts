import * as RAPIER from "@dimforge/rapier2d";
import SensorBehavior from './sensorBehavior';
import GameUtils from '../../../../utils/gameUtils';

export type LadderSensorType = "top" | "core" | "bottom";

export default class LadderSensorBehavior extends SensorBehavior {
    private ladderType: LadderSensorType;
    private ladderValue: number;

    constructor(type: LadderSensorType, ladderValue: number = 0) {
        super();
        this.ladderType = type;
        this.ladderValue = ladderValue;
    }

    protected async onInitialize(): Promise<void> {
        if (!this.physics?.rigidBody) return;

        // Set ladder value in physics body user data
        const userData = GameUtils.getDataFromPhysicsBody(this.physics.rigidBody);
        userData.value0 = this.ladderValue;

        // Listen for both player and enemy intersections
        this.experience.physics.world.intersectionPairsWith(
            this.physics.rigidBody.collider(0),
            (otherCollider) => {
                if (GameUtils.isColliderName(otherCollider, "Player")) {
                    this.onPlayerIntersection(otherCollider);
                } else if (GameUtils.isColliderName(otherCollider, "Enemy")) {
                    this.onEnemyIntersection(otherCollider);
                }
            }
        );
    }

    private onPlayerIntersection(otherCollider: RAPIER.Collider): void {
        // Player-specific ladder behavior
        switch (this.ladderType) {
            case "core":
                // Core ladder allows climbing
                // The player component will check the ladder value to determine climb direction
                break;
            case "top":
                // Top ladder helps with getting off the ladder
                break;
            case "bottom":
                // Bottom ladder helps with getting on the ladder
                break;
        }
    }

    private onEnemyIntersection(otherCollider: RAPIER.Collider): void {
        // Enemy-specific ladder behavior
        // The enemy component will check the ladder value to determine movement direction
    }

    protected onUpdate(deltaTime: number): void {
        // Update any ladder effects
    }

    protected onDestroy(): void {
        super.onDestroy();
    }
}
