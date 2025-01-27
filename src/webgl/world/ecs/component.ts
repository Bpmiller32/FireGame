import Entity from './entity';
import Experience from '../../experience';

export default abstract class Component {
    protected experience: Experience;
    public entity: Entity | null = null;

    constructor() {
        this.experience = Experience.getInstance();
    }

    public abstract update(deltaTime: number): void;
    public abstract destroy(): void;
}
