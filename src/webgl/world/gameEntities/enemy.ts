import Emitter from "../../utils/eventEmitter";
import Time from "../../utils/time";
import GameUtils from "../../utils/gameUtils";
import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";
import CollisionGroups from "../../utils/types/collisionGroups";
import RAPIER from "@dimforge/rapier2d-compat";
import Player from "../player/player";
import PlayerStates from "../../utils/types/playerStates";
import TrashCan from "./trashCan";
import UserData from "../../utils/types/userData";
// import ResourceLoader from "../../utils/resourceLoader";

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
      "Enemy",
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
  public onCollisionEnter(other: GameObject): void {
    const otherCollider = other.physicsBody?.collider(0);
    if (!otherCollider) return;

    // Player collision - trigger game over
    const userData = other.physicsBody?.userData as UserData;
    if (userData && userData.name === "Player") {
      Emitter.emit("gameOver");
      return;
    }

    // TrashCan collision - destroy enemy and light can on fire
    if (GameUtils.isColliderName(otherCollider, "TrashCan")) {
      Emitter.emit("gameObjectRemoved", this);
      (other as TrashCan).isOnFire = true;
      return;
    }

    // Wall collision - reverse direction
    if (GameUtils.isColliderName(otherCollider, "Wall")) {
      this.direction = this.direction * -1;
      return;
    }

    // OneWayPlatform collision - check if enemy is above platform
    if (GameUtils.isColliderName(otherCollider, "OneWayPlatform")) {
      if (this.physicsBody!.translation().y > otherCollider.translation().y) {
        this.isCollidingWithPlatforms = true;
        this.currentFloor = GameUtils.getDataFromCollider(otherCollider).value0;
      }
      return;
    }

    // Platform collision - set grounded state
    if (GameUtils.isColliderName(otherCollider, "Platform")) {
      this.isCollidingWithPlatforms = true;
      return;
    }
  }

  /**
   * Collision exit callback - handles when enemy stops colliding with objects
   */
  public onCollisionExit(other: GameObject): void {
    const otherCollider = other.physicsBody?.collider(0);
    if (!otherCollider) return;

    // Ignore sensors - they don't have physics
    if (otherCollider.isSensor()) return;

    // Leaving a platform - update collision state and turn around
    if (
      GameUtils.isColliderName(otherCollider, "OneWayPlatform") ||
      GameUtils.isColliderName(otherCollider, "Platform")
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
    this.time = this.experience.time;
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
      this.ladderBottomCooldown -= this.time.delta;
    }

    // Reset intersecting with ladders
    this.isInsideLadder = false;

    // Check for all sensor intersections
    this.physics.world.intersectionPairsWith(
      this.physicsBody!.collider(0),
      (otherCollider) => {
        // Check for touching ladder core, also fully inside the ladder core
        if (
          GameUtils.isColliderName(otherCollider, "LadderCoreSensor") &&
          GameUtils.getDataFromCollider(otherCollider).value0 !== 0 &&
          GameUtils.isObjectFullyInsideSensor(otherCollider, this)
        ) {
          this.ladderSensorValue =
            GameUtils.getDataFromCollider(otherCollider).value0;
          this.isInsideLadder = true;
        }

        // Check for touching ladder bottom - reset to horizontal rolling
        // Only trigger if cooldown has expired to prevent oscillation
        if (GameUtils.isColliderName(otherCollider, "LadderBottomSensor") && this.ladderBottomCooldown <= 0) {
          this.performSpecialRoll = false;
          this.isCollidingWithPlatforms = true;
          // Set cooldown to 1 second to prevent immediate re-triggering
          this.ladderBottomCooldown = 1.0;
        }
      }
    );
  }

  private calculateSpecialRoll(player: Player, trashCan: TrashCan) {
    // Check if wanting to roll down a ladder or do a crazy roll
    if (this.isInsideLadder) {
      if (!this.didRunSpecialRollCheckOnce) {
        this.didRunSpecialRollCheckOnce = true;
        let currentPercentChance = 1;

        // Set the difficulty modifier based on elapsed time
        if (this.time.elapsed < 33) {
          currentPercentChance = 0.25;
        } else if (this.time.elapsed >= 33 && this.time.elapsed < 100) {
          currentPercentChance = 0.5;
        } else {
          currentPercentChance = 0.75;
        }

        // Roll dice for special roll based on difficulty probability
        this.performSpecialRoll =
          GameUtils.calculatePercentChance(currentPercentChance);

        // Override: if on the same floor as the player, never special roll
        if (
          this.currentFloor == player.currentFloor &&
          player.state != PlayerStates.CLIMBING
        ) {
          // this.performSpecialRoll = false;
          this.performSpecialRoll = GameUtils.calculatePercentChance(0.1);
        }

        // Override: if the trashCan is not yet on fire, always special roll
        if (!trashCan.isOnFire) {
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
      this.physicsBody!.setLinvel({ x: this.groundSpeed, y: -9.8 }, true);
    } else {
      this.physicsBody!.setLinvel({ x: -this.groundSpeed, y: -9.8 }, true);
    }

    if (this.performSpecialRoll) {
      this.physicsBody!.setLinvel({ x: 0, y: -this.groundSpeed * 0.65 }, true);
    }
  }

  public update(player: Player, trashCan: TrashCan) {
    // Exit early if object is destroyed
    if (this.isBeingDestroyed) {
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
