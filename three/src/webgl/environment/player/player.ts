import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Debug from "../../utils/debug";
import SpritePlayer from "../../utils/spritePlayer";
import PlayerStateManager from "./playerStateManager";

export default class Player {
  // Setup
  private experience = Experience.getInstance();
  private scene = this.experience.scene;
  private resources = this.experience.resources;
  private physics = this.experience.physics;
  private time = this.experience.time;
  private input = this.experience.input;

  public spritePlayer = new SpritePlayer(this.resources.items.test, 8, 8);
  public stateManager = new PlayerStateManager(
    this.input,
    this.spritePlayer,
    new RAPIER.Vector2(0, 0),
    false
  );

  // Constructor setup
  public mesh?: THREE.Sprite;
  public body?: RAPIER.RigidBody;

  private bodyCollider?: RAPIER.Collider;
  private characterController?: RAPIER.KinematicCharacterController;

  private debug?: Debug;
  isTouchingGround?: boolean;

  public constructor() {
    this.setMesh();
    this.setPhysics();

    // Debug
    if (this.experience.debug?.isActive) {
      this.debug = this.experience.debug;

      const playerStateDebug = this.debug?.ui?.addFolder("PlayerStateManager");
      playerStateDebug?.open();

      playerStateDebug
        ?.add(this.stateManager, "currentState")
        .name("currentState")
        .listen();
      playerStateDebug
        ?.add(this.stateManager, "isFacingRight")
        .name("isFacingRight")
        .listen();
      playerStateDebug
        ?.add(this.stateManager, "friction")
        .name("friction")
        .min(0.001)
        .max(0.009)
        .step(0.001);
    }
  }

  private setMesh() {
    this.mesh = new THREE.Sprite(this.spritePlayer?.material);
    this.scene?.add(this.mesh);
  }

  private setPhysics() {
    const shape = RAPIER.ColliderDesc.cuboid(0.25, 0.5);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicVelocityBased().lockRotations()
    );

    this.bodyCollider = this.physics?.world?.createCollider(shape, this.body);

    this.characterController =
      this.physics?.world?.createCharacterController(0.01);
  }

  private computeNextPosition(bodyPosition: RAPIER.Vector2) {
    const correctedMovement = this.characterController!.computedMovement();

    return new RAPIER.Vector2(
      (bodyPosition.x += correctedMovement.x),
      (bodyPosition.y += correctedMovement.y)
    );
  }

  private detectCollisions(nextPosition: RAPIER.Vector2) {
    this.characterController?.computeColliderMovement(
      this.bodyCollider!,
      nextPosition
    );

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
        console.log("wtf");
        this.body?.setLinvel(
          new RAPIER.Vector2(this.body.linvel().x, 0.01),
          true
        );
        this.isTouchingGround = true;
      } else {
        this.isTouchingGround = false;
      }
    }
  }

  public update() {
    // Set THREE mesh position to physics body
    const bodyPosition = this.body!.translation();
    this.mesh?.position.set(bodyPosition.x, bodyPosition.y, 0);

    // Calculate body's next position
    const nextPosition = this.computeNextPosition(bodyPosition);

    // Detect potential kinematic body collisions
    this.detectCollisions(nextPosition);

    // Set player state
    this.stateManager.update(
      this.time.delta,
      this.body!.linvel(),
      this.isTouchingGround!
    );

    // Set player velocity
    if (this.isTouchingGround) {
      this.body?.setLinvel(
        new RAPIER.Vector2(
          this.stateManager.newVelocity.x / this.physics!.world!.timestep,
          0 / this.physics!.world!.timestep
        ),
        true
      );
    } else {
      this.body?.setLinvel(
        new RAPIER.Vector2(
          this.stateManager.newVelocity.x / this.physics!.world!.timestep,
          this.stateManager.newVelocity.y / this.physics!.world!.timestep
        ),
        true
      );
    }

    // Set kinematic body's next position
    this.body?.setNextKinematicTranslation(nextPosition);
  }
}
