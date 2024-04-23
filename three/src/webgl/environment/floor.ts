import * as THREE from "three";
import * as CANNON from "cannon-es";
import Experience from "../experience";
import ResourceLoader from "../utils/resourceLoader";

export default class Floor {
  experience: Experience;
  scene?: THREE.Scene;
  resources?: ResourceLoader;
  geometry: any;
  material: any;
  mesh?: THREE.Mesh;
  physics: any;
  body?: CANNON.Body;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.physics = this.experience.physics;

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
    const shape = new CANNON.Plane();

    this.body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(),
      shape: shape,
    });

    // Planes are instatiated in XY plane, need to be rotated for floor
    this.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI * 0.5
    );

    this.physics.world.addBody(this.body);
  }
}
