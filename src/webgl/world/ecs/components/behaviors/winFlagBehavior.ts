import BehaviorComponent from '../behaviorComponent';
import PhysicsComponent from '../physicsComponent';
import GameUtils from '../../../../utils/gameUtils';
import Emitter from '../../../../utils/eventEmitter';

export default class WinFlagBehavior extends BehaviorComponent {
    private isTriggered: boolean = false;

    protected async onInitialize(): Promise<void> {
        if (!this.physics?.rigidBody) return;

        // Listen for collisions with player
        this.experience.physics.world.intersectionPairsWith(
            this.physics.rigidBody.collider(0),
            (otherCollider) => {
                if (!this.isTriggered && GameUtils.isColliderName(otherCollider, "Player")) {
                    this.isTriggered = true;
                    this.onWinCondition();
                }
            }
        );
    }

    private onWinCondition(): void {
        // Emit win event
        Emitter.emit("gameWin");

        // Optional: Add visual effects or animations here
        // this.graphics?.createDebugGraphics("#ffff00", 1.0);
    }

    protected onUpdate(deltaTime: number): void {
        // Update any win flag animations or effects
    }

    protected onDestroy(): void {
        this.isTriggered = false;
    }
}
