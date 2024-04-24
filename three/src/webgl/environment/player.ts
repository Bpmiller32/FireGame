import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader";
import Keyboard from "../utils/keyboard";
import Physics from "./physics";

export default class Player {
  experience: Experience;
  scene?: THREE.Scene;
  resources?: ResourceLoader;

  geometry?: THREE.CapsuleGeometry;
  material?: THREE.MeshBasicMaterial;
  mesh?: THREE.Mesh;

  physics?: Physics;
  body?: RAPIER.RigidBody;

  keyboard?: Keyboard;
  isInteractive?: boolean;
  movementSpeed = 3;
  staticCollision = false;
  characterController?: RAPIER.KinematicCharacterController;
  collider: RAPIER.Collider | undefined;
  bodyCollider: RAPIER.Collider | undefined;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.physics = this.experience.physics2d;
    this.resources = this.experience.resources;
    this.keyboard = this.experience.keyboard;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();
    this.setPhysics();

    this.isInteractive = false;
  }

  setGeometry() {
    this.geometry = new THREE.CapsuleGeometry(0.25, 1);
  }

  setMaterial() {
    this.material = new THREE.MeshBasicMaterial({
      //   wireframe: true,
      color: "purple",
    });
  }

  setMesh() {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene?.add(this.mesh);
  }

  setPhysics() {
    const shape = RAPIER.ColliderDesc.capsule(0.5, 0.25);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().lockRotations()
    );

    this.bodyCollider = this.physics?.world?.createCollider(shape, this.body);

    this.characterController =
      this.physics?.world?.createCharacterController(0.01);

    // this.characterController!.enableSnapToGround(1);
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
