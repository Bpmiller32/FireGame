import Component from '../component';
import PhysicsComponent from './physicsComponent';
import TransformComponent from './transformComponent';
import GraphicsComponent from './graphicsComponent';

export default abstract class BehaviorComponent extends Component {
    protected transform: TransformComponent | null = null;
    protected physics: PhysicsComponent | null = null;
    protected graphics: GraphicsComponent | null = null;

    public async initialize(): Promise<void> {
        if (!this.entity) return;

        // Get required components
        const transform = this.entity.getComponent(TransformComponent);
        const physics = this.entity.getComponent(PhysicsComponent);
        const graphics = this.entity.getComponent(GraphicsComponent);

        if (!transform || !physics || !graphics) {
            console.error('BehaviorComponent requires Transform, Physics, and Graphics components');
            return;
        }

        this.transform = transform;
        this.physics = physics;
        this.graphics = graphics;

        // Call behavior-specific initialization
        await this.onInitialize();
    }

    protected abstract onInitialize(): Promise<void>;

    public update(deltaTime: number): void {
        if (!this.transform || !this.physics || !this.graphics) return;
        this.onUpdate(deltaTime);
    }

    protected abstract onUpdate(deltaTime: number): void;

    public destroy(): void {
        this.onDestroy();
        this.transform = null;
        this.physics = null;
        this.graphics = null;
    }

    protected abstract onDestroy(): void;
}
