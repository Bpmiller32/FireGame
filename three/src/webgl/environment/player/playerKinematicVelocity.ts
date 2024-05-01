import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Debug from "../../utils/debug";
import SpriteAnimator from "../../utils/spriteAnimator";
import PlayerStates from "./playerStatesKinematicVelocity/playerStates";
import PlayerSpriteAnimations from "./playerSpriteAnimations";
import playerIdle from "./playerStatesKinematicVelocity/playerIdle";
import playerFalling from "./playerStatesKinematicVelocity/playerFalling";
import playerRunning from "./playerStatesKinematicVelocity/playerRunning";
import playerJumping from "./playerStatesKinematicVelocity/playerJumping";
import { Vector } from "three/examples/jsm/Addons.js";

export default class Player {
  // Setup
  private experience = Experience.getInstance();
  private scene = this.experience.scene;
  private resources = this.experience.resources;
  private physics = this.experience.physics;
  public time = this.experience.time;
  public input = this.experience.input;

  public spritePlayer = new SpriteAnimator(this.resources.items.test, 8, 8);

  // Constructor setup
  public mesh!: THREE.Sprite;
  public body!: RAPIER.RigidBody;
  private characterController!: RAPIER.KinematicCharacterController;
  public debug?: Debug;

  // Character movement
  state = PlayerStates.IDLE;

  currentAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
  nextAnimation = PlayerSpriteAnimations.IDLE_RIGHT;
  animationDuration = 1;

  isFacingRight = true;
  isTouchingGround = true;

  moveScale = 1;
  fallScale = 0.35;

  maxSpeed = 14 * this.moveScale;
  acceleration = 5 * this.moveScale;
  decelleration = 24 * this.moveScale;
  velocityPower = 0.87 * this.moveScale;
  friction = 0.25 * this.moveScale;

  gravity = 9;
  jumpSpeed = 0.002;
  lastPressedJumpTime = 0;
  lastOnGroundTime = 0;

  // Debug
  nextTranslationDebugX: any;
  nextTranslationDebugY: any;
  velocity = new RAPIER.Vector2(0, 0);

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

      const playerDebug = this.debug.ui?.addFolder("playerDebug");
      playerDebug?.open();

      const status = playerDebug?.addFolder("status");
      status?.open();

      status?.add(this, "state").name("state").listen();
      status?.add(this, "isFacingRight").name("isFacingRight").listen();
      status?.add(this, "isTouchingGround").name("isTouchingGround").listen();
      status
        ?.add(this.velocity, "x")
        .name("velocityX")
        .min(0.001)
        .step(0.001)
        .listen();
      status
        ?.add(this.velocity, "y")
        .name("velocityY")
        .min(0.001)
        .step(0.001)
        .listen();

      const variables = playerDebug?.addFolder("variables");
      variables?.open();

      variables?.add(this, "maxSpeed").name("maxSpeed");
      variables?.add(this, "acceleration").name("acceleration");
      variables?.add(this, "decelleration").name("decelleration");
      variables?.add(this, "velocityPower").name("velocityPower");
    }
  }

  private setMesh() {
    this.mesh = new THREE.Sprite(this.spritePlayer?.material);
    this.scene?.add(this.mesh);
  }

  private setPhysics() {
    const shape = RAPIER.ColliderDesc.cuboid(0.25, 0.5);

    this.body = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicVelocityBased().lockRotations()
    );
    this.body.userData = { name: Player.name };

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
        playerJumping(this);
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
    const currentTranslation = this.body!.translation();
    this.mesh.position.set(currentTranslation.x, currentTranslation.y, 0);

    // // Given a desired translation, compute the actual translation that we can apply to the collider based on the obstacles.
    // this.characterController.computeColliderMovement(this.body.collider(0), {
    //   x: this.velocity.x / this.time.delta,
    //   y: this.velocity.y / this.time.delta,
    // });

    // const correctiveMovement = this.characterController.computedMovement();
    // console.log(correctiveMovement);

    // // Apply the actual translation to the next kinematic translation
    // this.body.setLinvel(
    //   new RAPIER.Vector2(correctiveMovement.x, correctiveMovement.y),
    //   true
    // );
  }

  private detectCollisions() {
    for (let i = 0; i < this.characterController.numComputedCollisions(); i++) {
      const collision = this.characterController.computedCollision(i);

      // console.log(collision);
      // if (collision && collision.normal2.y < -0.5) {
      //   this.isTouchingGround = true;
      // } else {
      //   this.isTouchingGround = false;
      // }

      if (collision && collision.collider?.parent()?.userData == "Floor") {
        this.isTouchingGround = true;
      }
    }
  }

  public update() {
    this.updatePlayerState();
    this.updatePlayerSprite();
    this.updateTranslation();
    // this.detectCollisions();
  }
}
