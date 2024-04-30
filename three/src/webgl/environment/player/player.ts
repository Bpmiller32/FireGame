import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Debug from "../../utils/debug";
import SpritePlayer from "../../utils/spritePlayer";
import RigidBodyUserData from "../../utils/types/rigidbodyUserData";
import PlayerStates from "./playerStates/playerStates";
import PlayerSpriteAnimations from "./playerSpriteAnimations";
import playerIdle from "./playerStates/playerIdle";
import playerFalling from "./playerStates/playerFalling";
import playerRunning from "./playerStates/playerRunning";

export default class Player {
  // Setup
  private experience = Experience.getInstance();
  private scene = this.experience.scene;
  private resources = this.experience.resources;
  private physics = this.experience.physics;
  private time = this.experience.time;
  public input = this.experience.input;

  public spritePlayer = new SpritePlayer(this.resources.items.test, 8, 8);

  // Constructor setup
  public mesh?: THREE.Sprite;
  public body?: RAPIER.RigidBody;
  private characterController?: RAPIER.KinematicCharacterController;
  private debug?: Debug;

  // Character movement
  state = PlayerStates.IDLE;

  currentAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
  nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
  animationDuration = 1;

  currentPosition = new RAPIER.Vector2(0, 0);
  nextPosition = new RAPIER.Vector2(0, 0);

  isFacingRight = true;
  isTouchingGround = false;

  acceleration = 0.002;
  maxSpeed = 0.001;
  velocityPower = 1;
  decelleration = 0.002;
  gravity = 0.0001;

  public constructor() {
    this.setMesh();
    this.setPhysics();

    // Set initial sprite loop
    this.spritePlayer.spritesToLoop(
      this.currentAnimation,
      this.animationDuration
    );

    // Debug
    if (this.experience.debug?.isActive) {
      this.debug = this.experience.debug;

      const playerStateDebug = this.debug?.ui?.addFolder("PlayerStateManager");
      playerStateDebug?.open();

      playerStateDebug?.add(this, "state").name("state").listen();
      playerStateDebug
        ?.add(this, "isFacingRight")
        .name("isFacingRight")
        .listen();
      playerStateDebug
        ?.add(this, "isTouchingGround")
        .name("isTouchingGround")
        .listen();
    }
  }

  private setMesh() {
    this.mesh = new THREE.Sprite(this.spritePlayer?.material);
    this.scene?.add(this.mesh);
  }

  private setPhysics() {
    const shape = RAPIER.ColliderDesc.cuboid(0.25, 0.5);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );

    this.physics?.world?.createCollider(shape, this.body);

    // Independent character controller attached to physics world, attaching here since this one is exclusively used for Player
    this.characterController =
      this.physics?.world?.createCharacterController(0.01);
  }

  private updatePlayerState() {
    switch (this.state) {
      case PlayerStates.IDLE:
        playerIdle(this);
        break;
      case PlayerStates.RUNNING:
        playerRunning(this);
        break;
      case PlayerStates.FALLING:
        playerFalling(this);
        break;
      case PlayerStates.JUMPING:
        playerIdle(this);
        break;
    }
  }

  private updatePlayerSprite() {
    // Don't call spritesToLoop every frame
    if (this.currentAnimation !== this.nextAnimation) {
      this.currentAnimation = this.nextAnimation;

      this.spritePlayer.spritesToLoop(
        this.currentAnimation,
        this.animationDuration
      );
    }

    this.spritePlayer.update(this.time.delta);
  }

  private updateTranslation() {
    // Set THREE mesh position to physics body
    const bodyPosition = this.body!.translation();
    this.mesh?.position.set(bodyPosition.x, bodyPosition.y, 0);

    // Given a desired translation, compute the actual translation that we can apply to the collider based on the obstacles.
    this.characterController?.computeColliderMovement(
      this.body!.collider(0),
      new RAPIER.Vector2(this.nextPosition.x, this.nextPosition.y)
    );

    const correctiveMovement = this.characterController?.computedMovement();

    // Apply the actual translation to the next kinematic translation
    this.body?.setNextKinematicTranslation(
      new RAPIER.Vector2(
        bodyPosition.x + correctiveMovement!.x,
        bodyPosition.y + correctiveMovement!.y
      )
    );
  }

  private detectCollisions() {
    for (
      let i = 0;
      i < this.characterController!.numComputedCollisions();
      i++
    ) {
      const objectCollidedWith = this.characterController
        ?.computedCollision(i)
        ?.collider?.parent()?.userData as RigidBodyUserData;

      if (objectCollidedWith.name == "Floor") {
        this.isTouchingGround = true;
      }
    }
  }

  public update() {
    this.updatePlayerState();
    this.updatePlayerSprite();
    this.updateTranslation();
    this.detectCollisions();
  }
}
