import * as THREE from "three";
import RAPIER, { Cuboid } from "@dimforge/rapier2d";
import Player from "../player/player";
import GameUtils from "../../utils/gameUtils";
import Sphere from "../gameComponents/sphere";
import Emitter from "../../utils/eventEmitter";
import CollisionGroups from "../../utils/types/collisionGroups";

export default class Enemy extends Sphere {
  private groundSpeed: number;
  private direction: number;
  private ladderSensorValue: number;

  private isCollidingWithPlatforms: boolean;

  private isInsideLadder: boolean;
  private didRunSpecialRollCheckOnce: boolean;
  private shouldPerformSpecialRoll: boolean;

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

    // Set fields
    this.groundSpeed = 18;
    this.direction = 1;
    this.ladderSensorValue = 0;
    this.isCollidingWithPlatforms = true;
    this.isInsideLadder = false;
    this.didRunSpecialRollCheckOnce = false;
    this.shouldPerformSpecialRoll = false;

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

  private checkCollisions() {
    // Reset colliding with platforms in case enemy is in freefall
    this.isCollidingWithPlatforms = false;

    // Check for all collisions
    this.physics.world.contactPairsWith(
      this.physicsBody.collider(0),
      (otherCollider) => {
        // Check for collision with trashcan, destroy object
        if (GameUtils.getDataFromCollider(otherCollider).name == "TrashCan") {
          // Remove through event not directly to be consistent with GameDirector's purpose
          Emitter.emit("gameObjectRemoved", this);
          return;
        }

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
          this.shouldPerformSpecialRoll = false;
        }
      }
    );
  }

  private calculateSpecialRolls() {
    // Check if wanting to roll down a ladder or do a crazy roll
    if (this.isInsideLadder) {
      if (!this.didRunSpecialRollCheckOnce) {
        this.didRunSpecialRollCheckOnce = true;

        this.shouldPerformSpecialRoll = GameUtils.getPercentChance(0.4);
        // this.shouldPerformSpecialRoll = GameUtils.getPercentChance(1);
      }
    } else {
      this.didRunSpecialRollCheckOnce = false;
    }

    // Special roll was selected
    if (this.shouldPerformSpecialRoll) {
      if (this.ladderSensorValue >= 0) {
        this.direction = 1;
      } else {
        this.direction = -1;
      }
    }
  }

  private updateCollisionMask() {
    // Set collision mask
    if (
      this.isCollidingWithPlatforms &&
      this.shouldPerformSpecialRoll == false
    ) {
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

    if (this.shouldPerformSpecialRoll) {
      this.physicsBody.setLinvel({ x: 0, y: -this.groundSpeed * 0.65 }, true);
    }
  }

  public updateEnemy(player: Player) {
    // Exit early if object is destroyed
    if (this.isBeingDestroyed) {
      return;
    }

    // Crappy workaround for the return in private function not catching the destroy in time somehow, TODO: revisit
    this.physics.world.contactPairsWith(
      this.physicsBody.collider(0),
      (otherCollider) => {
        // Check for collision with trashcan, destroy object
        if (GameUtils.getDataFromCollider(otherCollider).name == "TrashCan") {
          // Remove through event not directly to be consistent with GameDirector's purpose
          Emitter.emit("gameObjectRemoved", this);
          return;
        }
      }
    );

    // Exit on the remainder of this call after is destroyed
    if (this.isBeingDestroyed) {
      return;
    }

    this.checkCollisions();
    this.checkIntersections();
    this.calculateSpecialRolls();
    this.updateCollisionMask();
    this.updateMovement();

    super.update();
  }
}
