import * as RAPIER from "@dimforge/rapier2d";
import BehaviorComponent from '../behaviorComponent';
import GameUtils from '../../../../utils/gameUtils';

export default class SensorBehavior extends BehaviorComponent {
    private isTriggered: boolean = false;
    private targetName: string = "Player";

    constructor(targetName: string = "Player") {
        super();
        this.targetName = targetName;
    }

    protected async onInitialize(): Promise<void> {
        if (!this.physics?.rigidBody) return;

        // Listen for intersections with target
        this.experience.physics.world.intersectionPairsWith(
            this.physics.rigidBody.collider(0),
            (otherCollider) => {
                if (!this.isTriggered && GameUtils.isColliderName(otherCollider, this.targetName)) {
                    this.isTriggered = true;
                    this.onTrigger(otherCollider);
                }
            }
        );
    }

    protected onTrigger(otherCollider: RAPIER.Collider): void {
        // Override in derived classes
    }

    protected onUpdate(deltaTime: number): void {
        // Update any sensor effects
    }

    protected onDestroy(): void {
        this.isTriggered = false;
    }
}
