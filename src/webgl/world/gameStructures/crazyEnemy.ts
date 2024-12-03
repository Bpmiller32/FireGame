import RAPIER from "@dimforge/rapier2d";
import GameUtils from "../../utils/gameUtils";
import Emitter from "../../utils/eventEmitter";
import CollisionGroups from "../../utils/types/collisionGroups";
import TrashCan from "./trashCan";
import Time from "../../utils/time";
import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";

export default class CrazyEnemy extends GameObject {
  private time!: Time;

  private targetPositions!: RAPIER.Vector[];
  private targetPositionIndex!: number;
  private targetReached!: boolean;
  private currentSpeed!: number;
  private enemyRotation!: number;
  private maxSpeed!: number;
  private acceleration!: number;
  private stopThreshold!: number;
  private directionVector!: RAPIER.Vector;
  private distanceToTarget!: number;

  constructor(
    size: number,
    position: { x: number; y: number },
    rotation: number = 0
  ) {
    super();

    this.createObjectPhysics(
      "Enemy",
      GameObjectType.SPHERE,
      { width: size, height: size },
      position,
      rotation,
      RAPIER.RigidBodyDesc.dynamic()
    );

    this.initalizeAttributes();
    this.createObjectGraphicsDebug("orange");

    this.setCollisionGroup(CollisionGroups.ENEMY);
    this.setCollisionMask(CollisionGroups.PLAYER_HIT_BOX);
  }

  private initalizeAttributes() {
    this.time = this.experience.time;

    this.targetPositionIndex = 0;

    this.targetPositions = [];
    this.targetPositions.push(new RAPIER.Vector2(-15, 2));
    this.targetPositions.push(new RAPIER.Vector2(-50, 2));

    this.targetReached = false;
    this.currentSpeed = 0;
    this.enemyRotation = 0;
    this.maxSpeed = 14;
    this.acceleration = 18;
    this.stopThreshold = 0.5;
    this.directionVector = new RAPIER.Vector2(0, 0);
    this.distanceToTarget = 1;
  }

  private checkCollisionsAndDestruction(trashCan: TrashCan) {
    // Exit early if object is destroyed
    if (this.isBeingDestroyed) {
      return;
    }

    // Check for all collisions
    this.physics.world.contactPairsWith(
      this.physicsBody!.collider(0),
      (otherCollider) => {
        // Check for collision with trashcan, destroy object
        if (GameUtils.getDataFromCollider(otherCollider).name == "TrashCan") {
          // Remove through event not directly, helps remove targets from GameSensors
          Emitter.emit("gameObjectRemoved", this);

          // Light the trash can on fire
          trashCan.isOnFire = true;
          return;
        }

        // Check for collision with player
        if (GameUtils.getDataFromCollider(otherCollider).name == "Player") {
          Emitter.emit("gameOver");

          return;
        }
      }
    );
  }

  private calculateDirection() {
    // Calculate the direction vector
    this.directionVector = new RAPIER.Vector2(
      this.targetPositions[this.targetPositionIndex].x -
        this.currentTranslation.x,
      this.targetPositions[this.targetPositionIndex].y -
        this.currentTranslation.y
    );

    // Calculate the distance to the target
    this.distanceToTarget = Math.sqrt(
      this.directionVector.x ** 2 + this.directionVector.y ** 2
    );
  }

  private updateMovement() {
    if (this.distanceToTarget > this.stopThreshold) {
      // Reset the targetReached flag when moving toward a target
      this.targetReached = false;

      // Normalize the direction vector
      const normalizedDirection = new RAPIER.Vector2(
        this.directionVector.x / this.distanceToTarget,
        this.directionVector.y / this.distanceToTarget
      );

      // Gradually increase the current speed toward maxSpeed
      this.currentSpeed = Math.min(
        this.currentSpeed + this.acceleration * this.time.delta,
        this.maxSpeed
      );

      // Scale the direction vector by the speed
      const velocity = new RAPIER.Vector2(
        normalizedDirection.x * this.currentSpeed,
        normalizedDirection.y * this.currentSpeed
      );

      // Set the linear velocity of the rigidbody
      this.physicsBody!.setLinvel(velocity, true);

      // Update the rotation angle based on current speed, multiply by delta time for smooth rotation
      this.enemyRotation += this.currentSpeed * this.time.delta;
      this.enemyRotation %= 2 * Math.PI;
      this.physicsBody!.setRotation(this.enemyRotation, true);
    } else {
      // Stop the rigidbody by setting its velocity to zero
      this.physicsBody!.setLinvel(new RAPIER.Vector2(0, 0), true);

      // Reset the current speed for future movements
      this.currentSpeed = 0;

      // Increment targetPositionIndex only once
      if (
        !this.targetReached &&
        this.targetPositionIndex < this.targetPositions.length - 1
      ) {
        this.targetPositionIndex++;
        this.targetReached = true;
      }
    }
  }

  public update(trashCan: TrashCan) {
    this.checkCollisionsAndDestruction(trashCan);

    if (this.isBeingDestroyed) {
      return;
    }

    this.calculateDirection();
    this.updateMovement();

    this.syncGraphicsToPhysics();
  }
}
