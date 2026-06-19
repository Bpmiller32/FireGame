import Time from "../../engine/core/time";
import GameUtils from "../gameUtils";
import GameObject from "../../engine/entities/gameObject";
import GameObjectType from "../../engine/types/gameObjectType";
import CollisionGroups from "../types/gameCollisionGroups";
import RAPIER from "@dimforge/rapier2d-compat";
import Player from "./player/player";
import PlayerStates from "../../engine/types/playerStates";
import TrashCan from "./trashCan";
import Platform from "./platform";
import LadderSensor from "./ladderSensor";
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

    // Set collision groups: Enemy collides with platforms and the player box
    this.setCollisionGroup(CollisionGroups.ENEMY);
    this.setCollisionMask(
      CollisionGroups.PLATFORM | CollisionGroups.PLAYER_BOUNDING_BOX
    );
  }

  /**
   * Collision callback - the enemy's own MOVEMENT reactions to the world it
   * rolls through (reverse at walls, track grounded floor). The enemy's GAME
   * interactions (kills Player, ignites TrashCan) are NOT here — they live in
   * the declarative contact table (game/config/contactRules.ts).
   */
  public OnCollisionEnter(other: GameObject): void {
    const otherCollider = other.PhysicsBody?.collider(0);
    if (!otherCollider) return;

    // Wall collision - reverse direction
    if (GameUtils.IsColliderType(otherCollider, EntityType.WALL)) {
      this.direction = this.direction * -1;
      return;
    }

    // OneWayPlatform collision - check if enemy is above platform
    if (GameUtils.IsColliderType(otherCollider, EntityType.ONE_WAY_PLATFORM)) {
      if (this.PhysicsBody!.translation().y > otherCollider.translation().y) {
        this.isCollidingWithPlatforms = true;
        if (other instanceof Platform) {
          this.currentFloor = other.FloorLevel;
        }
      }
      return;
    }

    // Platform collision - set grounded state
    if (GameUtils.IsColliderType(otherCollider, EntityType.PLATFORM)) {
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
      GameUtils.IsColliderType(otherCollider, EntityType.ONE_WAY_PLATFORM) ||
      GameUtils.IsColliderType(otherCollider, EntityType.PLATFORM)
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
        const ladder = this.Physics.GetGameObjectFromCollider(otherCollider);

        // Check for touching ladder core, also fully inside the ladder core
        if (
          GameUtils.IsColliderType(otherCollider, EntityType.LADDER_CORE_SENSOR) &&
          ladder instanceof LadderSensor &&
          ladder.Direction !== 0 &&
          GameUtils.IsObjectFullyInsideSensor(otherCollider, this)
        ) {
          this.ladderSensorValue = ladder.Direction;
          this.isInsideLadder = true;
        }

        // Check for touching ladder bottom - reset to horizontal rolling
        // Only trigger if cooldown has expired to prevent oscillation
        if (GameUtils.IsColliderType(otherCollider, EntityType.LADDER_BOTTOM_SENSOR) && this.ladderBottomCooldown <= 0) {
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
        CollisionGroups.PLATFORM | CollisionGroups.PLAYER_BOUNDING_BOX
      );
    } else {
      this.setCollisionMask(CollisionGroups.PLAYER_BOUNDING_BOX);
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
