import * as RAPIER from "@dimforge/rapier2d";
import Component from '../component';

export default class TransformComponent extends Component {
    public initialPosition: RAPIER.Vector2;
    public currentPosition: RAPIER.Vector2;
    public initialSize: RAPIER.Vector2;
    public currentSize: RAPIER.Vector2;
    public rotation: number;

    constructor(
        position: { x: number; y: number } = { x: 0, y: 0 },
        size: { width: number; height: number } = { width: 1, height: 1 },
        rotation: number = 0
    ) {
        super();
        this.initialPosition = new RAPIER.Vector2(position.x, position.y);
        this.currentPosition = new RAPIER.Vector2(position.x, position.y);
        this.initialSize = new RAPIER.Vector2(size.width, size.height);
        this.currentSize = new RAPIER.Vector2(size.width, size.height);
        this.rotation = rotation;
    }

    public setPosition(x: number, y: number): void {
        this.currentPosition = new RAPIER.Vector2(x, y);
    }

    public setSize(width: number, height: number): void {
        this.currentSize = new RAPIER.Vector2(width, height);
    }

    public setRotation(rotation: number): void {
        this.rotation = rotation;
    }

    public update(deltaTime: number): void {
        // Transform updates handled by physics or direct manipulation
    }

    public destroy(): void {
        // Clean up any transform-related resources
    }
}
