import Emitter from "../../engine/events/eventBus";
import Time from "../../engine/core/time";
import GameUtils from "../gameUtils";
import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import CollisionGroups from "../types/gameCollisionGroups";
import RAPIER from "@dimforge/rapier2d-compat";
import Player from "./player/player";
import PlayerStates from "../../engine/types/playerStates";
import TrashCan from "./trashCan";
import UserData from "../../engine/types/userData";
import EntityType from "../types/entityType";
// import ResourceLoader from "../../engine/resources/resourceLoader";

export default class Enemy extends GameObject {
  private time!: Time;
  // private resources!: ResourceLoader;

  private groundSpeed!: number;
  private direction!: number;
  private ladderSensorValue!: number;
  private currentFloor!: number;

  private isCollidingWithPlatforms!: boolean;

  private isInsideLadder!: boolean;
  private didRunSpecialRollCheckOnce!: boolean;
  private performSpecialRoll!: boolean;
  private ladderBottomCooldown!: number;

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
    // this.createObjectGraphicsDebug("white");

    // Set collision groups: Enemy collides with platforms and both player colliders
    this.setCollisionGroup(CollisionGroups.ENEMY);
    this.setCollisionMask(
      CollisionGroups.PLATFORM |
        CollisionGroups.PLAYER_HIT_BOX |
        CollisionGroups.PLAYER_BOUNDING_BOX
    );
  }

  /**
   * Collision callback - handles all enemy collisions with game objects
   * Uses the event-driven collision system for better performance
   */
  public OnCollisionEnter(other: GameObject): void {
    const otherCollider = other.PhysicsBody?.collider(0);
    if (!otherCollider) return;

    // Player collision - trigger game over
    const userData = other.PhysicsBody?.userData as UserData;
    if (userData && userData.name === EntityType.PLAYER) {
      Emitter.emit("gameOver");
      return;
    }

    // TrashCan collision - destroy enemy and light can on fire
    if (GameUtils.IsColliderName(otherCollider, EntityType.TRASH_CAN)) {
      Emitter.emit("gameObjectRemoved", this);
      (other as TrashCan).IsOnFire = true;
      return;
    }

    // Wall collision - reverse direction
    if (GameUtils.IsColliderName(otherCollider, EntityType.WALL)) {
      this.direction = this.direction * -1;
      return;
    }

    // OneWayPlatform collision - check if enemy is above platform
    if (GameUtils.IsColliderName(otherCollider, EntityType.ONE_WAY_PLATFORM)) {
      if (this.PhysicsBody!.translation().y > otherCollider.translation().y) {
        this.isCollidingWithPlatforms = true;
        this.currentFloor = GameUtils.GetDataFromCollider(otherCollider).value0;
      }
      return;
    }

    // Platform collision - set grounded state
    if (GameUtils.IsColliderName(otherCollider, EntityType.PLATFORM)) {
      this.isCollidingWithPlatforms = true;
      return;
    }
  }

  /**
   * Collision exit callback - handles when enemy stops colliding with objects
   */
  public OnCollisionExit(other: GameObject): void {
    const otherCollider = other.PhysicsBody?.collider(0);
    if (!otherCollider) return;

    // Ignore sensors - they don't have physics
    if (otherCollider.isSensor()) return;

    // Leaving a platform - update collision state and turn around
    if (
      GameUtils.IsColliderName(otherCollider, EntityType.ONE_WAY_PLATFORM) ||
      GameUtils.IsColliderName(otherCollider, EntityType.PLATFORM)
    ) {
      // Mark as not colliding with platforms
      this.isCollidingWithPlatforms = false;
      
      // Turn around when leaving platform edge (prevents falling off)
      if (!this.performSpecialRoll) {
        this.direction = this.direction * -1;
      }
    }
  }

  private initalizeAttributes() {
    this.time = this.experience.Time;
    // this.resources = this.experience.resources;

    this.groundSpeed = 14;
    this.direction = 1;
    this.ladderSensorValue = 0;
    this.currentFloor = 0;
    this.isCollidingWithPlatforms = true;
    this.isInsideLadder = false;
    this.didRunSpecialRollCheckOnce = false;
    this.performSpecialRoll = false;
    this.ladderBottomCooldown = 0;
  }

  /**
   * Sensor intersections for ladders
   * Uses cooldown system to prevent getting stuck oscillating at ladder bottom
   */
  private checkLadderIntersections() {
    // Decrease cooldown timer
    if (this.ladderBottomCooldown > 0) {
      this.ladderBottomCooldown -= this.time.Delta;
    }

    // Reset intersecting with ladders
    this.isInsideLadder = false;

    // Check for all sensor intersections
    this.Physics.World.intersectionPairsWith(
      this.PhysicsBody!.collider(0),
      (otherCollider) => {
        // Check for touching ladder core, also fully inside the ladder core
        if (
          GameUtils.IsColliderName(otherCollider, EntityType.LADDER_CORE_SENSOR) &&
          GameUtils.GetDataFromCollider(otherCollider).value0 !== 0 &&
          GameUtils.IsObjectFullyInsideSensor(otherCollider, this)
        ) {
          this.ladderSensorValue =
            GameUtils.GetDataFromCollider(otherCollider).value0;
          this.isInsideLadder = true;
        }

        // Check for touching ladder bottom - reset to horizontal rolling
        // Only trigger if cooldown has expired to prevent oscillation
        if (GameUtils.IsColliderName(otherCollider, EntityType.LADDER_BOTTOM_SENSOR) && this.ladderBottomCooldown <= 0) {
          this.performSpecialRoll = false;
          this.isCollidingWithPlatforms = true;
          // Set cooldown to 1 second to prevent immediate re-triggering
          this.ladderBottomCooldown = 1.0;
        }
      }
    );
  }

  private calculateSpecialRoll(player: Player, trashCan: TrashCan | undefined) {
    // Check if wanting to roll down a ladder or do a crazy roll
    if (this.isInsideLadder) {
      if (!this.didRunSpecialRollCheckOnce) {
        this.didRunSpecialRollCheckOnce = true;
        let currentPercentChance = 1;

        // Set the difficulty modifier based on elapsed time
        if (this.time.Elapsed < 33) {
          currentPercentChance = 0.25;
        } else if (this.time.Elapsed >= 33 && this.time.Elapsed < 100) {
          currentPercentChance = 0.5;
        } else {
          currentPercentChance = 0.75;
        }

        // Roll dice for special roll based on difficulty probability
        this.performSpecialRoll =
          GameUtils.CalculatePercentChance(currentPercentChance);

        // Override: if on the same floor as the player, never special roll
        if (
          this.currentFloor == player.CurrentFloor &&
          player.State != PlayerStates.CLIMBING
        ) {
          // this.performSpecialRoll = false;
          this.performSpecialRoll = GameUtils.CalculatePercentChance(0.1);
        }

        // Override: if the trashCan is not yet on fire (or absent), always special roll
        if (!trashCan?.IsOnFire) {
          this.performSpecialRoll = true;
        }
      }
    } else {
      this.didRunSpecialRollCheckOnce = false;
    }

    // Special roll was selected
    if (this.performSpecialRoll) {
      if (this.ladderSensorValue > 0) {
        this.direction = 1;
      } else if (this.ladderSensorValue < 0) {
        this.direction = -1;
      }
    }
  }

  private updateCollisionMask() {
    // Set collision mask - MUST ALWAYS include PLAYER_BOUNDING_BOX!
    if (this.isCollidingWithPlatforms && this.performSpecialRoll == false) {
      this.setCollisionMask(
        CollisionGroups.PLATFORM |
          CollisionGroups.PLAYER_HIT_BOX |
          CollisionGroups.PLAYER_BOUNDING_BOX
      );
    } else {
      this.setCollisionMask(
        CollisionGroups.PLAYER_HIT_BOX | CollisionGroups.PLAYER_BOUNDING_BOX
      );
    }
  }

  private updateMovement() {
    // Set constant movement
    if (this.direction >= 0) {
      this.PhysicsBody!.setLinvel({ x: this.groundSpeed, y: -9.8 }, true);
    } else {
      this.PhysicsBody!.setLinvel({ x: -this.groundSpeed, y: -9.8 }, true);
    }

    if (this.performSpecialRoll) {
      this.PhysicsBody!.setLinvel({ x: 0, y: -this.groundSpeed * 0.65 }, true);
    }
  }

  public Update(player: Player, trashCan?: TrashCan) {
    // Exit early if object is destroyed
    if (this.IsBeingDestroyed) {
      return;
    }

    // DON'T reset isCollidingWithPlatforms here!
    // It's managed by onCollisionEnter (sets true) and onCollisionExit (sets false)

    // Check ladder sensor intersections
    this.checkLadderIntersections();

    // Calculate special roll behavior
    this.calculateSpecialRoll(player, trashCan);

    // Update collision mask based on platform state
    this.updateCollisionMask();

    // Update movement
    this.updateMovement();

    // Sync graphics to physics position
    this.syncGraphicsToPhysics();
  }
}
