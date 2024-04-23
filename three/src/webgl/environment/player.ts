import * as THREE from "three";
import * as CANNON from "cannon-es";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader";
import Keyboard from "../utils/keyboard";

export default class Player {
  experience: Experience;
  scene?: THREE.Scene;
  resources?: ResourceLoader;
  geometry: any;
  material: any;
  mesh?: THREE.Mesh;
  physics: any;
  body?: CANNON.Body;
  keyboard?: Keyboard;
  isInteractive?: boolean;
  movementSpeed = 1;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.physics = this.experience.physics;
    this.resources = this.experience.resources;
    this.keyboard = this.experience.keyboard;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();
    this.setPhysics();
  }

  setGeometry() {
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
  }

  setMaterial() {
    this.material = new THREE.MeshBasicMaterial({
      //   wireframe: true,
      color: "blue",
    });
  }

  setMesh() {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene?.add(this.mesh);
  }

  setPhysics() {
    // Cannon's length, width, height start from the origin, hense the 0.5 since the mesh is 1
    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));

    this.body = new CANNON.Body({
      mass: 5,
      position: new CANNON.Vec3(),
      shape: shape,
    });

    this.physics.world.addBody(this.body);
    this.isInteractive = false;
  }

  update() {
    this.mesh?.position.copy(this.body!.position);
    this.mesh?.quaternion.copy(this.body!.quaternion);

    if (this.isInteractive) {
      let direction = 0;

      if (this.keyboard?.keyStatus.left.isDown) {
        direction = -1;
      }
      if (this.keyboard?.keyStatus.right.isDown) {
        direction = 1;
      }

      this.body!.velocity.x = direction * this.movementSpeed;
    }
  }
}
