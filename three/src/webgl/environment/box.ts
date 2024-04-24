import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader";
import Keyboard from "../utils/keyboard";
import Physics from "./physics";

export default class Box {
  experience: Experience;
  scene?: THREE.Scene;
  resources?: ResourceLoader;

  geometry?: THREE.BoxGeometry;
  material?: THREE.MeshBasicMaterial;
  mesh?: THREE.Mesh;

  physics?: Physics;
  body?: RAPIER.RigidBody;

  keyboard?: Keyboard;
  isInteractive?: boolean;
  movementSpeed = 1;

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
    const shape = RAPIER.ColliderDesc.cuboid(0.5, 0.5);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
    );

    this.physics?.world?.createCollider(shape, this.body);
  }

  update() {
    const bodyPosition = this.body!.translation();
    this.mesh?.position.set(bodyPosition.x, bodyPosition.y, 0);
  }
}
