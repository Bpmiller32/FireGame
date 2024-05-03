import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";

export default class Floor {
  // Setup
  private experience = Experience.getInstance();
  private scene = this.experience.scene;
  // private resources = this.experience.resources;
  private physics = this.experience.physics;

  // Constructor setup
  public geometry?: THREE.PlaneGeometry;
  public material?: THREE.MeshBasicMaterial;
  public mesh?: THREE.Mesh;
  public body?: RAPIER.RigidBody;
  size: RAPIER.Vector2;

  constructor(size: RAPIER.Vector2) {
    this.size = size;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();
    this.setPhysics();
  }

  private setGeometry() {
    this.geometry = new THREE.PlaneGeometry(10, 10);
  }

  private setMaterial() {
    this.material = new THREE.MeshBasicMaterial({
      //   wireframe: true,
      color: "green",
    });
  }

  private setMesh() {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    // Planes are instatiated in XY plane, need to be rotated for floor
    this.mesh.rotation.x = -Math.PI * 0.5;
    this.scene?.add(this.mesh);
  }

  private setPhysics() {
    const shape = RAPIER.ColliderDesc.cuboid(this.size.x, this.size.y);

    this.body = this.physics?.world?.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
    );
    this.body!.userData = { name: Floor.name };

    this.physics?.world?.createCollider(shape, this.body);
  }
}
