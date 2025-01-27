import BehaviorComponent from '../behaviorComponent';
import { ITrashCan } from '../../types/gameTypes';

export default class TrashCanBehavior extends BehaviorComponent implements ITrashCan {
    private _isOnFire: boolean = false;

    get isOnFire(): boolean {
        return this._isOnFire;
    }

    set isOnFire(value: boolean) {
        this._isOnFire = value;
        // TODO: Add fire effect when graphics system is ready
    }

    protected async onInitialize(): Promise<void> {
        // Initialize any trashcan-specific resources
    }

    protected onUpdate(deltaTime: number): void {
        // Update fire effects if needed
    }

    protected onDestroy(): void {
        // Clean up any trashcan-specific resources
    }
}
