import { v4 as uuidv4 } from 'uuid';
import Component from './component';

export default class Entity {
    public readonly id: string;
    private components: Map<string, Component>;

    constructor() {
        this.id = uuidv4();
        this.components = new Map();
    }

    public addComponent(component: Component): void {
        this.components.set(component.constructor.name, component);
        component.entity = this;
    }

    public getComponent<T extends Component>(componentType: { new(...args: any[]): T }): T | undefined {
        return this.components.get(componentType.name) as T;
    }

    public hasComponent<T extends Component>(componentType: { new(...args: any[]): T }): boolean {
        return this.components.has(componentType.name);
    }

    public removeComponent<T extends Component>(componentType: { new(...args: any[]): T }): void {
        const component = this.components.get(componentType.name);
        if (component) {
            component.destroy();
            this.components.delete(componentType.name);
        }
    }

    public destroy(): void {
        this.components.forEach(component => component.destroy());
        this.components.clear();
    }
}
