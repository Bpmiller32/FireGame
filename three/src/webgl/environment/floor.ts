import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader";
import Physics from "./physics";

export default class Floor {
  experience: Experience;
  scene?: THREE.Scene;
  resources?: ResourceLoader;

  geometry?: THREE.PlaneGeometry;
  material?: THREE.MeshBasicMaterial;
  mesh?: THREE.Mesh;

  physics?: Physics;
  body?: RAPIER.RigidBody;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.physics = this.experience.physics2d;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();
    this.setPhysics();
  }

  setGeometry() {
    this.geometry = new THREE.PlaneGeometry(10, 10);
  }

  setMaterial() {
    this.material = new THREE.MeshBasicMaterial({
      //   wireframe: true,
      color: "green",
    });
  }

  setMesh() {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    // Planes are instatiated in XY plane, need to be rotated for floor
    this.mesh.rotation.x = -Math.PI * 0.5;
    this.scene?.add(this.mesh);
  }

  setPhysics() {
    const shape = RAPIER.ColliderDesc.cuboid(20, 0);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
    );

    this.physics?.world?.createCollider(shape, this.body);
  }
}
