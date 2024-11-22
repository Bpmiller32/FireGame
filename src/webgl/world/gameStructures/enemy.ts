import * as THREE from "three";
import RAPIER, { Cuboid } from "@dimforge/rapier2d";
import Player from "../player/player";
import GameUtils from "../../utils/gameUtils";
import Sphere from "../gameEntities/sphere";
import Emitter from "../../utils/eventEmitter";
import CollisionGroups from "../../utils/types/collisionGroups";
import TrashCan from "./trashCan";
import Time from "../../utils/time";
import PlayerStates from "../../utils/types/playerStates";

export default class Enemy extends Sphere {
  private time!: Time;
  private currentPercentChance!: number;
  private currentFloor: number = 0;

  private groundSpeed!: number;
  private direction!: number;
  private ladderSensorValue!: number;

  private isCollidingWithPlatforms!: boolean;

  private isInsideLadder!: boolean;
  private didRunSpecialRollCheckOnce!: boolean;
  private performSpecialRoll!: boolean;

  constructor(
    size: number,
    position: { x: number; y: number },
    drawGraphics?: boolean
  ) {
    super(
      "Enemy",
      size,
      position,
      new THREE.MeshBasicMaterial({ color: "white" }),
      RAPIER.RigidBodyDesc.dynamic(),
      drawGraphics
    );

    this.setAttributes();
    this.setCollisionGroups();
  }

  private setAttributes() {
    this.time = this.experience.time;
    this.currentPercentChance = 1;

    this.groundSpeed = 14;
    this.direction = 1;
    this.ladderSensorValue = 0;
    this.isCollidingWithPlatforms = true;
    this.isInsideLadder = false;
    this.didRunSpecialRollCheckOnce = false;
    this.performSpecialRoll = false;
  }

  private setCollisionGroups() {
    // Set default collision groups
    GameUtils.setCollisionGroup(
      this.physicsBody.collider(0),
      CollisionGroups.ENEMY
    );
    GameUtils.setCollisionMask(
      this.physicsBody.collider(0),
      CollisionGroups.PLATFORM | CollisionGroups.PLAYER
    );
  }

  private validateDestroyCondition(trashCan: TrashCan) {
    // Exit early if object is destroyed
    if (this.isBeingDestroyed) {
      return true;
    }

    // Crappy workaround for the return in private function not catching the destroy in time somehow, TODO: revisit
    this.physics.world.contactPairsWith(
      this.physicsBody.collider(0),
      (otherCollider) => {
        // Check for collision with trashcan, destroy object
        if (GameUtils.getDataFromCollider(otherCollider).name == "TrashCan") {
          // Remove through event not directly to be consistent with GameDirector's purpose
          Emitter.emit("gameObjectRemoved", this);

          // Light the trash can on fire
          trashCan.isOnFire = true;
          return;
        }
      }
    );

    // Exit on the remainder of this call after is destroyed
    if (this.isBeingDestroyed) {
      return true;
    }
  }

  private checkCollisions() {
    // Reset colliding with platforms in case enemy is in freefall
    this.isCollidingWithPlatforms = false;

    // Check for all collisions
    this.physics.world.contactPairsWith(
      this.physicsBody.collider(0),
      (otherCollider) => {
        // Check for collision with wall
        if (GameUtils.getDataFromCollider(otherCollider).name == "Wall") {
          this.direction = this.direction * -1;
          return;
        }

        // Check for collision with player
        if (GameUtils.getDataFromCollider(otherCollider).name == "Player") {
          Emitter.emit("gameOver", true);
          return;
        }

        // Check for collision with platform
        if (
          GameUtils.getDataFromCollider(otherCollider).name == "OneWayPlatform"
        ) {
          // Above the platform collide, otherwise phase through
          if (
            this.physicsBody.translation().y > otherCollider.translation().y
          ) {
            this.isCollidingWithPlatforms = true;
          }

          this.currentFloor =
            GameUtils.getDataFromCollider(otherCollider).value;
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
      this.physicsBody.collider(0),
      (otherCollider) => {
        // Check for touching ladder core
        if (
          // TODO: clean this up with initialsize instead of 0.5 and GameUtil away the cast to cuboid
          GameUtils.getDataFromCollider(otherCollider).name ===
            "LadderCoreSensor" &&
          // GameUtils.getDataFromCollider(otherCollider).isConnectedLadder ===
          //   true &&
          this.currentTranslation.x - 0.5 >
            otherCollider.translation().x -
              (otherCollider.shape as Cuboid).halfExtents.x &&
          this.currentTranslation.x + 0.5 <
            otherCollider.translation().x +
              (otherCollider.shape as Cuboid).halfExtents.x
        ) {
          this.ladderSensorValue =
            GameUtils.getDataFromCollider(otherCollider).value;
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

        // Set the difficulty modifier based on elapsed time
        if (this.time.elapsed < 33) {
          this.currentPercentChance = 0.25;
        } else if (this.time.elapsed >= 33 && this.time.elapsed < 100) {
          this.currentPercentChance = 0.5;
        } else {
          this.currentPercentChance = 0.75;
        }

        // Roll dice for special roll based on difficulty probability
        this.performSpecialRoll = GameUtils.calculatePercentChance(
          this.currentPercentChance
        );

        // Override: if on the same floor as the player, never special roll
        if (
          this.currentFloor == player.currentFloor &&
          player.state != PlayerStates.CLIMBING
        ) {
          this.performSpecialRoll = false;
        }

        // Override: player is climbing the ladder and underneath the barrel, always special roll
        if (
          this.currentFloor - 1 == player.currentFloor &&
          player.state == PlayerStates.CLIMBING
        ) {
          this.performSpecialRoll = true;
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
      if (this.ladderSensorValue >= 0) {
        this.direction = 1;
      } else {
        this.direction = -1;
      }
    }
  }

  private updateCollisionMask() {
    // Set collision mask
    if (this.isCollidingWithPlatforms && this.performSpecialRoll == false) {
      GameUtils.setCollisionMask(
        this.physicsBody.collider(0),
        CollisionGroups.PLATFORM | CollisionGroups.PLAYER
      );
    } else {
      GameUtils.setCollisionMask(
        this.physicsBody.collider(0),
        CollisionGroups.PLAYER
      );
    }
  }

  private updateMovement() {
    // Set constant movement
    if (this.direction >= 0) {
      this.physicsBody.setLinvel({ x: this.groundSpeed, y: -9.8 }, true);
    } else {
      this.physicsBody.setLinvel({ x: -this.groundSpeed, y: -9.8 }, true);
    }

    if (this.performSpecialRoll) {
      this.physicsBody.setLinvel({ x: 0, y: -this.groundSpeed * 0.65 }, true);
    }
  }

  public updateEnemy(player: Player, trashCan: TrashCan) {
    if (this.validateDestroyCondition(trashCan)) {
      return;
    }

    this.checkCollisions();
    this.checkIntersections();
    this.calculateSpecialRoll(player, trashCan);
    this.updateCollisionMask();
    this.updateMovement();

    super.update();
  }
}
