import Emitter from "../../utils/eventEmitter";
import Time from "../../utils/time";
import GameUtils from "../../utils/gameUtils";
import GameObject from "../gameComponents/gameObject";
import GameObjectType from "../../utils/types/gameObjectType";
import CollisionGroups from "../../utils/types/collisionGroups";
import RAPIER from "@dimforge/rapier2d";
import Player from "../player/player";
import PlayerStates from "../../utils/types/playerStates";
import TrashCan from "./trashCan";

export default class Enemy extends GameObject {
  private time!: Time;

  private groundSpeed!: number;
  private direction!: number;
  private ladderSensorValue!: number;
  private currentFloor!: number;

  private isCollidingWithPlatforms!: boolean;

  private isInsideLadder!: boolean;
  private didRunSpecialRollCheckOnce!: boolean;
  private performSpecialRoll!: boolean;

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
    this.setCollisionGroup(CollisionGroups.ENEMY);
    this.setCollisionMask(CollisionGroups.PLATFORM | CollisionGroups.PLAYER);

    this.createObjectGraphicsDebug("white");
  }

  private initalizeAttributes() {
    this.time = this.experience.time;

    this.groundSpeed = 14;
    this.direction = 1;
    this.ladderSensorValue = 0;
    this.currentFloor = 0;
    this.isCollidingWithPlatforms = true;
    this.isInsideLadder = false;
    this.didRunSpecialRollCheckOnce = false;
    this.performSpecialRoll = false;
  }

  private checkCollisionsAndDestruction(trashCan: TrashCan) {
    // Exit early if object is destroyed
    if (this.isBeingDestroyed) {
      return;
    }

    // Reset colliding with platforms in case enemy is in freefall
    this.isCollidingWithPlatforms = false;

    // Check for all collisions
    this.physics.world.contactPairsWith(
      this.physicsBody!.collider(0),
      (otherCollider) => {
        // Check for collision with trashcan, destroy object
        if (GameUtils.getDataFromCollider(otherCollider).name == "TrashCan") {
          // Remove through event not directly to be consistent with GameDirector's purpose and defering destroy, saves a 2nd loop through collision check
          Emitter.emit("gameObjectRemoved", this);

          // Light the trash can on fire
          trashCan.isOnFire = true;
          return;
        }

        // Check for collision with wall
        if (GameUtils.getDataFromCollider(otherCollider).name == "Wall") {
          this.direction = this.direction * -1;
          return;
        }

        // Check for collision with player
        if (GameUtils.getDataFromCollider(otherCollider).name == "Player") {
          Emitter.emit("gameOver");
          return;
        }

        // Check for collision with platform
        if (
          GameUtils.getDataFromCollider(otherCollider).name == "OneWayPlatform"
        ) {
          // Above the platform collide, otherwise phase through
          if (
            this.physicsBody!.translation().y > otherCollider.translation().y
          ) {
            this.isCollidingWithPlatforms = true;
          }

          // Set the current floor this enemy is on
          this.currentFloor =
            GameUtils.getDataFromCollider(otherCollider).value0;
          return;
        }
      }
    );
  }

  private checkIntersections() {
    // Reset intersecting with ladders
    this.isInsideLadder = false;

    // Check for all sensor intersections
    this.physics.world.intersectionPairsWith(
      this.physicsBody!.collider(0),
      (otherCollider) => {
        // Check for touching ladder core, also fully inside the ladder core
        if (
          GameUtils.getDataFromCollider(otherCollider).name ===
            "LadderCoreSensor" &&
          GameUtils.getDataFromCollider(otherCollider).value0 !== 0 &&
          GameUtils.isObjectFullyInsideSensor(otherCollider, this)
        ) {
          this.ladderSensorValue =
            GameUtils.getDataFromCollider(otherCollider).value0;
          this.isInsideLadder = true;
        }

        // Check for touching ladder bottom
        if (
          GameUtils.getDataFromCollider(otherCollider).name ===
          "LadderBottomSensor"
        ) {
          this.performSpecialRoll = false;
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
      } else {
        this.direction = -1;
      }
    }
  }

  private updateCollisionMask() {
    // Set collision mask
    if (this.isCollidingWithPlatforms && this.performSpecialRoll == false) {
      this.setCollisionMask(CollisionGroups.PLATFORM | CollisionGroups.PLAYER);
    } else {
      this.setCollisionMask(CollisionGroups.PLAYER);
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
    this.checkCollisionsAndDestruction(trashCan);

    if (this.isBeingDestroyed) {
      return;
    }

    this.checkIntersections();
    this.calculateSpecialRoll(player, trashCan);
    this.updateCollisionMask();
    this.updateMovement();

    this.syncGraphicsToPhysics();
  }
}
