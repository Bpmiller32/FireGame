import RAPIER from "@dimforge/rapier2d-compat";
import CollisionGroups from "../types/gameCollisionGroups";
import TrashCan from "./trashCan";
import Time from "../../engine/core/time";
import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import Player from "./player/player";
import EntityType from "../types/entityType";

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
      EntityType.ENEMY,
      GameObjectType.SPHERE,
      { width: size, height: size },
      position,
      rotation,
      RAPIER.RigidBodyDesc.dynamic()
    );

    this.initalizeAttributes();
    this.createObjectGraphicsDebug("orange");

    // Set collision groups: CrazyEnemy collides with platforms and the player box
    this.setCollisionGroup(CollisionGroups.ENEMY);
    this.setCollisionMask(
      CollisionGroups.PLATFORM | CollisionGroups.PLAYER_BOUNDING_BOX
    );

    // CrazyEnemy's interactions (kills Player, ignites TrashCan) are declared in
    // the contact table, not here — so arm contact events explicitly.
    this.enableContactEvents();
  }

  private initalizeAttributes() {
    this.time = this.experience.Time;

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

  private calculateDirection() {
    // Calculate the direction vector
    this.directionVector = new RAPIER.Vector2(
      this.targetPositions[this.targetPositionIndex].x -
        this.CurrentTranslation.x,
      this.targetPositions[this.targetPositionIndex].y -
        this.CurrentTranslation.y
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
        this.currentSpeed + this.acceleration * this.time.Delta,
        this.maxSpeed
      );

      // Scale the direction vector by the speed
      const velocity = new RAPIER.Vector2(
        normalizedDirection.x * this.currentSpeed,
        normalizedDirection.y * this.currentSpeed
      );

      // Set the linear velocity of the rigidbody
      this.PhysicsBody!.setLinvel(velocity, true);

      // Update the rotation angle based on current speed, multiply by delta time for smooth rotation
      this.enemyRotation += this.currentSpeed * this.time.Delta;
      this.enemyRotation %= 2 * Math.PI;
      this.PhysicsBody!.setRotation(this.enemyRotation, true);
    } else {
      // Stop the rigidbody by setting its velocity to zero
      this.PhysicsBody!.setLinvel(new RAPIER.Vector2(0, 0), true);

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

  public Update(player: Player, trashCan?: TrashCan) {
    // Uniform update contract (R1): CrazyEnemy ignores both args — it follows a
    // fixed target path. Referenced here so the shared signature stays uniform.
    void player;
    void trashCan;

    // Exit early if object is destroyed
    if (this.IsBeingDestroyed) {
      return;
    }

    // Calculate movement direction and update
    this.calculateDirection();
    this.updateMovement();

    // Sync graphics to physics position
    this.syncGraphicsToPhysics();
  }
}
