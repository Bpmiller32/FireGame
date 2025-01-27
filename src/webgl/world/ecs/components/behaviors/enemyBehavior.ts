import * as RAPIER from "@dimforge/rapier2d";
import BehaviorComponent from '../behaviorComponent';
import Time from '../../../../utils/time';
import GameUtils from '../../../../utils/gameUtils';
import CollisionGroups from '../../../../utils/types/collisionGroups';
import Emitter from '../../../../utils/eventEmitter';
import { IPlayer, ITrashCan, IWorld, IGameObject } from '../../types/gameTypes';
import PlayerStates from '../../../../utils/types/playerStates';

export default class EnemyBehavior extends BehaviorComponent {
    private world: IWorld;
    private time: Time;
    private groundSpeed: number = 14;
    private direction: number = 1;
    private ladderSensorValue: number = 0;
    private currentFloor: number = 0;

    private isCollidingWithPlatforms: boolean = false;
    private isInsideLadder: boolean = false;
    private didRunSpecialRollCheckOnce: boolean = false;
    private performSpecialRoll: boolean = false;

    constructor() {
        super();
        this.time = this.experience.time;
        this.world = {
            enemies: [],
            crazyEnemies: [],
            trashCans: [],
            winFlags: [],
            cameraSensors: [],
            ladderTopSensors: [],
            ladderCoreSensors: [],
            ladderBottomSensors: [],
            walls: [],
            platforms: [],
            teleporters: []
        };
    }

    protected async onInitialize(): Promise<void> {
        if (!this.physics) return;

        // Set collision properties
        this.physics.setCollisionGroup(CollisionGroups.ENEMY);
        this.physics.setCollisionMask(
            CollisionGroups.PLATFORM | CollisionGroups.PLAYER_HIT_BOX
        );
    }

    private checkCollisionsAndDestruction(trashCan: ITrashCan): void {
        if (!this.physics?.rigidBody) return;

        // Reset colliding with platforms in case enemy is in freefall
        this.isCollidingWithPlatforms = false;

        // Check for all collisions
        this.experience.physics.world.contactPairsWith(
            this.physics.rigidBody.collider(0),
            (otherCollider) => {
                // Check for collision with trashcan
                if (GameUtils.isColliderName(otherCollider, "TrashCan")) {
                    if (this.entity && this.physics?.rigidBody && this.transform) {
                        const gameObject: IGameObject = {
                            physicsBody: this.physics.rigidBody,
                            currentTranslation: this.physics.rigidBody.translation(),
                            currentSize: this.transform.currentSize,
                            isBeingDestroyed: true
                        };
                        Emitter.emit("gameObjectRemoved", gameObject);
                    }
                    trashCan.isOnFire = true;
                    return;
                }

                // Check for collision with wall
                if (GameUtils.isColliderName(otherCollider, "Wall")) {
                    this.direction *= -1;
                    return;
                }

                // Check for collision with player
                if (GameUtils.isColliderName(otherCollider, "Player")) {
                    Emitter.emit("gameOver");
                    return;
                }

                // Check for collision with platform
                if (GameUtils.isColliderName(otherCollider, "OneWayPlatform")) {
                    const rigidBody = this.physics?.rigidBody;
                    if (rigidBody && rigidBody.translation().y > otherCollider.translation().y) {
                        this.isCollidingWithPlatforms = true;
                    }

                    this.currentFloor = GameUtils.getDataFromCollider(otherCollider).value0;
                }
            }
        );
    }

    private checkIntersections(): void {
        if (!this.physics?.rigidBody) return;

        // Reset intersecting with ladders
        this.isInsideLadder = false;

        // Check for all sensor intersections
        this.experience.physics.world.intersectionPairsWith(
            this.physics.rigidBody.collider(0),
            (otherCollider) => {
                // Check for touching ladder core
                if (
                    GameUtils.isColliderName(otherCollider, "LadderCoreSensor") &&
                    GameUtils.getDataFromCollider(otherCollider).value0 !== 0 &&
                    this.physics?.rigidBody && this.transform && GameUtils.isObjectFullyInsideSensor(
                        otherCollider,
                        {
                            currentTranslation: this.physics.rigidBody.translation(),
                            currentSize: this.transform.currentSize
                        }
                    )
                ) {
                    this.ladderSensorValue = GameUtils.getDataFromCollider(otherCollider).value0;
                    this.isInsideLadder = true;
                }

                // Check for touching ladder bottom
                if (GameUtils.isColliderName(otherCollider, "LadderBottomSensor")) {
                    this.performSpecialRoll = false;
                }
            }
        );
    }

    private calculateSpecialRoll(player: IPlayer, trashCan: ITrashCan): void {
        if (this.isInsideLadder) {
            if (!this.didRunSpecialRollCheckOnce) {
                this.didRunSpecialRollCheckOnce = true;
                let currentPercentChance = 1;

                // Set difficulty based on elapsed time
                if (this.time.elapsed < 33) {
                    currentPercentChance = 0.25;
                } else if (this.time.elapsed >= 33 && this.time.elapsed < 100) {
                    currentPercentChance = 0.5;
                } else {
                    currentPercentChance = 0.75;
                }

                this.performSpecialRoll = GameUtils.calculatePercentChance(currentPercentChance);

                // Override: if on same floor as player
                if (this.currentFloor === player.currentFloor && player.state !== PlayerStates.CLIMBING) {
                    this.performSpecialRoll = GameUtils.calculatePercentChance(0.1);
                }

                // Override: if trashCan not yet on fire
                if (!trashCan.isOnFire) {
                    this.performSpecialRoll = true;
                }
            }
        } else {
            this.didRunSpecialRollCheckOnce = false;
        }

        // Set direction based on ladder value if special rolling
        if (this.performSpecialRoll) {
            this.direction = this.ladderSensorValue > 0 ? 1 : -1;
        }
    }

    private updateCollisionMask(): void {
        if (!this.physics) return;

        if (this.isCollidingWithPlatforms && !this.performSpecialRoll) {
            this.physics.setCollisionMask(
                CollisionGroups.PLATFORM | CollisionGroups.PLAYER_HIT_BOX
            );
        } else {
            this.physics.setCollisionMask(CollisionGroups.PLAYER_HIT_BOX);
        }
    }

    private updateMovement(): void {
        if (!this.physics) return;

        if (this.performSpecialRoll) {
            this.physics.setLinearVelocity(0, -this.groundSpeed * 0.65);
        } else {
            this.physics.setLinearVelocity(
                this.direction * this.groundSpeed,
                -9.8
            );
        }
    }

    protected onUpdate(deltaTime: number): void {
        const world = this.experience.world;
        if (!world.player || !world.trashCan) return;

        this.world = world;
        this.checkCollisionsAndDestruction(world.trashCan);
        this.checkIntersections();
        this.calculateSpecialRoll(world.player, world.trashCan);
        this.updateCollisionMask();
        this.updateMovement();
    }

    protected onDestroy(): void {
        // Clean up any enemy-specific resources
    }
}
