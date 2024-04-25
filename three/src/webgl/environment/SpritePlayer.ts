import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader";
import Keyboard from "../utils/keyboard";
import Physics from "./physics";

export default class SpritePlayer {
  experience: Experience;
  scene?: THREE.Scene;
  resources?: ResourceLoader;

  geometry?: THREE.CapsuleGeometry;
  material?: THREE.SpriteMaterial;
  mesh?: THREE.Sprite;

  physics?: Physics;
  body?: RAPIER.RigidBody;

  keyboard?: Keyboard;
  isInteractive?: boolean;
  movementSpeed = 3;
  staticCollision = false;
  characterController?: RAPIER.KinematicCharacterController;
  collider: RAPIER.Collider | undefined;
  bodyCollider: RAPIER.Collider | undefined;

  currentTile = 0;
  tilesHorizontal = 2;
  tilesVertical = 2;

  private playSpriteIndices: number[] = [];
  private runningTileArrayIndex = 0;
  private maxDisplayTime = 0;
  private elapsedTime = 0;

  jumpSpeed = -10; // Example jump speed, adjust as needed
  gravity = 0.5; // Example gravity value, adjust as needed
  maxJumpTime = 10; // Example max time for holding jump button, adjust as needed
  jumpTime = 0; // Time player has been holding jump button
  jumping = false;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.physics = this.experience.physics2d;
    this.resources = this.experience.resources;
    this.keyboard = this.experience.keyboard;

    this.setMaterial();
    this.setMesh();
    this.setPhysics();

    this.isInteractive = false;
  }

  setMaterial() {
    this.material = new THREE.SpriteMaterial({
      map: this.resources?.items.mario,
    });

    this.material.map!.magFilter = THREE.NearestFilter;
    this.material.map?.repeat.set(
      1 / this.tilesHorizontal,
      1 / this.tilesVertical
    );
  }

  setMesh() {
    this.mesh = new THREE.Sprite(this.material);
    this.scene?.add(this.mesh);
  }

  setPhysics() {
    const shape = RAPIER.ColliderDesc.cuboid(0.25, 0.5);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );

    this.bodyCollider = this.physics?.world?.createCollider(shape, this.body);

    this.characterController =
      this.physics?.world?.createCharacterController(0.01);

    // this.characterController!.enableSnapToGround(1);
  }

  loop(playSpriteIndicies: number[], totalDuration: number) {
    this.playSpriteIndices = playSpriteIndicies;
    this.runningTileArrayIndex = 0;
    this.currentTile = playSpriteIndicies[this.runningTileArrayIndex];
    this.maxDisplayTime = totalDuration / this.playSpriteIndices.length;
    this.elapsedTime = this.maxDisplayTime; // force to play new animation
  }

  update() {
    // Set THREE mesh position to physics body
    const bodyPosition = this.body!.translation();
    this.mesh?.position.set(bodyPosition.x, bodyPosition.y, 0);

    // Calculate input
    let xVector = 0;
    let yVector = -0.1;
    if (this.keyboard?.keyStatus.left.isDown) {
      xVector = -0.1;
    }
    if (this.keyboard?.keyStatus.right.isDown) {
      xVector = 0.1;
    }
    if (this.keyboard?.keyStatus.up.isDown) {
      yVector = 0.1;
    }

    // Sprite flipbook
    if (xVector != 0) {
      this.elapsedTime += this.experience.time!.delta;

      if (this.maxDisplayTime > 0 && this.elapsedTime >= this.maxDisplayTime) {
        this.elapsedTime = 0;
        this.runningTileArrayIndex =
          (this.runningTileArrayIndex + 1) % this.playSpriteIndices.length;
        this.currentTile = this.playSpriteIndices[this.runningTileArrayIndex];

        this.material!.map!.offset.x =
          (this.currentTile % this.tilesHorizontal) / this.tilesHorizontal;
        this.material!.map!.offset.y =
          (this.tilesVertical -
            Math.floor(this.currentTile / this.tilesHorizontal) -
            1) /
          this.tilesVertical;
      }
    }

    // Calculate and kinematic body's next position
    this.characterController!.computeColliderMovement(
      this.bodyCollider!,
      new RAPIER.Vector2(xVector, yVector)
    );
    const correctedMovement = this.characterController!.computedMovement();
    const nextPosition = new RAPIER.Vector2(
      (bodyPosition.x += correctedMovement.x),
      (bodyPosition.y += correctedMovement.y)
    );

    this.body?.setNextKinematicTranslation(nextPosition);
  }
}
