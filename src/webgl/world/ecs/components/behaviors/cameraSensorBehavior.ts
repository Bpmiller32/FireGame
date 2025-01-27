import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import SensorBehavior from './sensorBehavior';
import GameUtils from '../../../../utils/gameUtils';

export default class CameraSensorBehavior extends SensorBehavior {
    private cameraPosition: THREE.Vector3;

    constructor(cameraPosition: THREE.Vector3) {
        super("Player");
        this.cameraPosition = cameraPosition;
    }

    protected onTrigger(otherCollider: RAPIER.Collider): void {
        // Move camera to specified position
        const camera = this.experience.camera;
        if (camera) {
            camera.teleportToPosition(
                this.cameraPosition.x,
                this.cameraPosition.z,
                this.cameraPosition.y
            );
        }
    }
}
