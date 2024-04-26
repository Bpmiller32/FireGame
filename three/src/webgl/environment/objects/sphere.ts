import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";

export default class Sphere {
  // Setup
  private experience = Experience.getInstance();
  private scene = this.experience.scene;
  // private resources = this.experience.resources;
  private physics = this.experience.physics;

  // Constructor setup
  public geometry?: THREE.SphereGeometry;
  public material?: THREE.MeshBasicMaterial;
  public mesh?: THREE.Mesh;
  public body?: RAPIER.RigidBody;

  constructor() {
    this.setGeometry();
    this.setMaterial();
    this.setMesh();
    this.setPhysics();
  }

  private setGeometry() {
    this.geometry = new THREE.SphereGeometry(1);
  }

  private setMaterial() {
    this.material = new THREE.MeshBasicMaterial({
      //   wireframe: true,
      color: "yellow",
    });
  }

  private setMesh() {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene?.add(this.mesh);
  }

  private setPhysics() {
    const shape = RAPIER.ColliderDesc.ball(1);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
    );

    this.physics?.world?.createCollider(shape, this.body);
  }

  public update() {
    const bodyPosition = this.body!.translation();
    this.mesh?.position.set(bodyPosition.x, bodyPosition.y, 0);
  }
}
