import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Debug from "../../utils/debug";
import SpriteAnimator from "../../utils/spriteAnimator";
import PlayerStates from "./playerStatesKinematicPosition/playerStates";
import PlayerSpriteAnimations from "./playerSpriteAnimations";
import playerIdle from "./playerStatesKinematicPosition/playerIdle";
import playerFalling from "./playerStatesKinematicPosition/playerFalling";
import playerRunning from "./playerStatesKinematicPosition/playerRunning";
import playerJumping from "./playerStatesKinematicPosition/playerJumping";

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

  currentTranslation = new RAPIER.Vector2(0, 0);
  nextTranslation = new RAPIER.Vector2(0, 0);

  isFacingRight = true;
  isTouchingGround = false;

  moveScale = 1;
  fallScale = 0.35;

  maxSpeed = 14 * this.moveScale;
  acceleration = 5 * this.moveScale;
  decelleration = 24 * this.moveScale;
  velocityPower = 0.87 * this.moveScale;
  friction = 0.25 * this.moveScale;

  gravity = 9;
  jumpSpeed = 1;
  jumpTimerOriginal = 0.15;
  jumpTimer = this.jumpTimerOriginal;
  lastPressedJumpTime = 0;
  lastOnGroundTime = 0;

  // Debug
  nextTranslationDebugX: any;
  nextTranslationDebugY: any;

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
        ?.add(this.nextTranslation, "x")
        .name("velocityX")
        .min(0.001)
        .step(0.001)
        .listen();
      status
        ?.add(this.nextTranslation, "y")
        .name("velocityY")
        .min(0.001)
        .step(0.001)
        .listen();

      const variables = playerDebug?.addFolder("variables");
      variables?.open();

      variables
        ?.add(this, "jumpSpeed")
        .name("jumpSpeed")
        .min(0)
        .max(5)
        .step(0.1);
      variables
        ?.add(this, "jumpTimer")
        .name("jumpTimer")
        .min(0.01)
        .max(1)
        .step(0.01);
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
    const shape = RAPIER.ColliderDesc.cuboid(0.25, 0.5).setFriction(0);

    this.body = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
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
    this.currentTranslation = this.body!.translation();
    this.mesh?.position.set(
      this.currentTranslation.x,
      this.currentTranslation.y,
      0
    );

    // Given a desired translation, compute the actual translation that we can apply to the collider based on the obstacles.
    this.characterController?.computeColliderMovement(
      this.body!.collider(0),
      new RAPIER.Vector2(
        this.nextTranslation.x * this.time.delta,
        this.nextTranslation.y * this.time.delta
      )
    );

    const correctiveMovement = this.characterController?.computedMovement();

    // Apply the actual translation to the next kinematic translation
    this.body?.setNextKinematicTranslation(
      new RAPIER.Vector2(
        this.currentTranslation.x + correctiveMovement!.x,
        this.currentTranslation.y + correctiveMovement!.y
      )
    );
  }

  private detectCollisions() {
    // Detect space underneath footing using raycast
    const floorRay = new RAPIER.Ray(
      { x: this.currentTranslation.x, y: this.currentTranslation.y - 0.501 },
      { x: 0, y: -1 }
    );

    const hit = this.physics.world.castRay(floorRay, 1000, false);

    if (!hit) {
      return;
    }

    const hitPoint = floorRay.pointAt(hit.toi);
    const distanceToHitPoint = floorRay.origin.y - hitPoint.y;
    console.log(distanceToHitPoint);
    if (distanceToHitPoint <= 0.01) {
      this.isTouchingGround = true;
    } else {
      this.isTouchingGround = false;
    }

    // const floorRayDebug = new THREE.Raycaster(
    //   {
    //     x: currentTranslation.x,
    //     y: currentTranslation.y - 0.501,
    //     z: 0,
    //   } as THREE.Vector3,
    //   { x: 0, y: -1, z: 0 } as THREE.Vector3
    // this.experience.scene.add(
    //   new THREE.ArrowHelper(
    //     floorRayDebug.ray.direction,
    //     floorRayDebug.ray.origin,
    //     300,
    //     0xff0000
    //   )
    // );

    // // Works but does not include toi for dynamic rigidbodies for some reason....
    // const hit = this.physics.world.castShape(
    //   { x: currentTranslation.x, y: currentTranslation.y - 0.51 },
    //   0,
    //   { x: 0, y: -1 },
    //   this.body.collider(0).shape,
    //   1000,
    //   true,
    //   RAPIER.QueryFilterFlags.ONLY_FIXED && RAPIER.QueryFilterFlags.ONLY_DYNAMIC
    // );
    // if (hit) {
    //   const distanceToHitPoint = hit.witness1.y - hit.witness2.y;
    //   console.log(distanceToHitPoint);
    //   if (distanceToHitPoint <= 0.01) {
    //     this.isTouchingGround = true;
    //   } else {
    //     this.isTouchingGround = false;
    //   }
    // }

    // for (let i = 0; i < this.characterController.numComputedCollisions(); i++) {
    //   const collision = this.characterController.computedCollision(i);

    //   if (!collision) {
    //     continue;
    //   }

    //   // Ground detection
    //   if (collision.normal2.y < -0.5) {
    //     this.isTouchingGround = true;
    //   } else {
    //     this.isTouchingGround = false;
    //   }

    //   // Reset velocity if colliding with wall
    //   if (Math.abs(collision.normal2.x) > 0.5) {
    //     this.nextTranslation.x = 0;
    //   }

    //   // if (objectCollidedWith?.name == "Floor") {
    //   //   this.isTouchingGround = true;
    //   // }
    // }
  }

  public update() {
    this.updatePlayerState();
    this.updatePlayerSprite();
    this.updateTranslation();
    this.detectCollisions();
  }
}
