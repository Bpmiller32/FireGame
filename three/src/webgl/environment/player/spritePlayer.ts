import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import PlayerState from "./playerState";
import Debug from "../../utils/debug";

export default class SpritePlayer {
  private experience = Experience.getInstance();
  private scene = this.experience.scene;
  private resources = this.experience.resources;
  private physics = this.experience.physics;
  private input = this.experience.input;
  private debug?: Debug;

  public material?: THREE.SpriteMaterial;
  public mesh?: THREE.Sprite;
  public body?: RAPIER.RigidBody;

  movementSpeed = 3;
  staticCollision = false;
  characterController?: RAPIER.KinematicCharacterController;
  collider: RAPIER.Collider | undefined;
  bodyCollider: RAPIER.Collider | undefined;

  currentTile = 0;
  tilesHorizontal = 2;
  tilesVertical = 2;

  currentState = PlayerState.FALLING;

  private playSpriteIndices: number[] = [];
  private runningTileArrayIndex = 0;
  private maxDisplayTime = 0;

  maxSpeed = 5; // Example maximum running speed, adjust as needed
  acceleration = 0.2; // Example acceleration value, adjust as needed
  jumpSpeed = 2; // Example jump speed, adjust as needed
  gravity = -0.1; // Example gravity value, adjust as needed
  maxJumpTime = 20; // Example max time for holding jump button, adjust as needed
  jumpTime = 0; // Time player has been holding jump button
  isTouchingGround = false;
  isJumping = false;

  public constructor() {
    this.setMaterial();
    this.setMesh();
    this.setPhysics();

    if (this.experience.debug?.isActive) {
      this.debug = this.experience.debug;

      const playerStateDebug = this.debug?.ui?.addFolder("PlayerState");
      playerStateDebug?.open();

      playerStateDebug?.add(this, "currentState").name("currentState").listen();
      playerStateDebug
        ?.add(this, "isTouchingGround")
        .name("isTouchingGround")
        .listen();
    }
  }

  private setMaterial() {
    this.material = new THREE.SpriteMaterial({
      map: this.resources?.items.mario,
    });

    this.material.map!.magFilter = THREE.NearestFilter;
    this.material.map?.repeat.set(
      1 / this.tilesHorizontal,
      1 / this.tilesVertical
    );
  }

  private setMesh() {
    this.mesh = new THREE.Sprite(this.material);
    this.scene?.add(this.mesh);
  }

  private setPhysics() {
    const shape = RAPIER.ColliderDesc.cuboid(0.25, 0.5);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );

    this.bodyCollider = this.physics?.world?.createCollider(shape, this.body);

    this.characterController =
      this.physics?.world?.createCharacterController(0.01);

    // this.characterController!.enableSnapToGround(1);
  }

  public loop(playSpriteIndicies: number[], totalDuration: number) {
    this.playSpriteIndices = playSpriteIndicies;
    this.runningTileArrayIndex = 0;
    this.currentTile = playSpriteIndicies[this.runningTileArrayIndex];
    this.maxDisplayTime = totalDuration / this.playSpriteIndices.length;
  }

  public update() {
    // Set THREE mesh position to physics body
    const bodyPosition = this.body!.translation();
    this.mesh?.position.set(bodyPosition.x, bodyPosition.y, 0);

    let velocityX = 0;
    let velocityY = 0;

    // // Sprite flipbook
    // if (xVector != 0) {
    //   this.elapsedTime += this.experience.time!.delta;

    //   if (this.maxDisplayTime > 0 && this.elapsedTime >= this.maxDisplayTime) {
    //     this.elapsedTime = 0;
    //     this.runningTileArrayIndex =
    //       (this.runningTileArrayIndex + 1) % this.playSpriteIndices.length;
    //     this.currentTile = this.playSpriteIndices[this.runningTileArrayIndex];

    //     this.material!.map!.offset.x =
    //       (this.currentTile % this.tilesHorizontal) / this.tilesHorizontal;
    //     this.material!.map!.offset.y =
    //       (this.tilesVertical -
    //         Math.floor(this.currentTile / this.tilesHorizontal) -
    //         1) /
    //       this.tilesVertical;
    //   }
    // }

    // Detect collisions
    for (
      let i = 0;
      i < this.characterController!.numComputedCollisions();
      i++
    ) {
      // Contact with floor
      if (
        this.characterController?.computedCollision(i)?.collider?.handle ==
        this.experience.world?.floor?.body?.handle
      ) {
        this.isTouchingGround = true;
      }
    }

    // Calculate player state
    switch (this.currentState) {
      case PlayerState.IDLE:
        // Check for transition to running state
        if (this.input?.keys.left.isDown || this.input?.keys.right.isDown) {
          this.currentState = PlayerState.RUNNING;
        }

        // Check for transition to jumping state
        if (this.input?.keys.up.isDown) {
          this.isJumping = true;
          this.isTouchingGround = false;
          this.currentState = PlayerState.JUMPING;
        }
        break;

      case PlayerState.RUNNING:
        // Apply acceleration based on input
        if (this.input?.keys.left.isDown) {
          velocityX -= this.acceleration;
          if (velocityX < -this.maxSpeed) {
            velocityX = -this.maxSpeed;
          }
        } else if (this.input?.keys.right.isDown) {
          velocityX += this.acceleration;
          if (velocityX > this.maxSpeed) {
            velocityX = this.maxSpeed;
          }
        }

        // Check for transition to idle state
        if (!this.input?.keys.left.isDown && !this.input?.keys.right.isDown) {
          this.currentState = PlayerState.IDLE;
        }

        // Check for transition to jumping state
        if (this.input?.keys.up.isDown) {
          this.isJumping = true;
          this.isTouchingGround = false;
          this.currentState = PlayerState.JUMPING;
        }
        break;

      case PlayerState.JUMPING:
        // Apply jump logic
        if (this.input!.keys.up.isDown && this.jumpTime < this.maxJumpTime) {
          // Apply additional jump force while jump button is held
          velocityY += this.jumpSpeed;
          this.jumpTime++;
        } else {
          this.jumpTime = 0;
        }

        // Apply gravity
        // this.isTouchingGround = false;
        velocityY += this.gravity;

        if (this.body!.linvel().y < 0.01) {
          this.currentState = PlayerState.FALLING;
        }
        break;

      case PlayerState.FALLING:
        // Apply gravity
        velocityY += this.gravity;

        // Check for collision with ground to transition to idle or running state
        if (this.isTouchingGround) {
          if (this.input?.keys.left.isDown || this.input?.keys.right.isDown) {
            this.currentState = PlayerState.RUNNING;
          } else {
            this.currentState = PlayerState.IDLE;
          }
        }

        break;
    }

    // Calculate and kinematic body's next position
    const test = new RAPIER.Vector2(velocityX, velocityY);
    this.characterController!.computeColliderMovement(this.bodyCollider!, test);

    const correctedMovement = this.characterController!.computedMovement();
    const nextPosition = new RAPIER.Vector2(
      (bodyPosition.x += correctedMovement.x),
      (bodyPosition.y += correctedMovement.y)
    );

    this.body?.setNextKinematicTranslation(nextPosition);
  }
}
