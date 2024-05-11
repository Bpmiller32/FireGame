import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Physics from "../../physics";

export default class GameObject {
  protected experience: Experience;
  protected scene: THREE.Scene;
  protected physics: Physics;

  public geometry!:
    | THREE.Sprite
    | THREE.PlaneGeometry
    | THREE.BoxGeometry
    | THREE.SphereGeometry
    | THREE.CapsuleGeometry;
  public material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
  public mesh!: THREE.Mesh | THREE.Sprite;
  public body!: RAPIER.RigidBody;
  public currentTranslation!: RAPIER.Vector;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.physics = this.experience.physics;
  }

  protected setGeometry(
    geometry:
      | THREE.Sprite
      | THREE.PlaneGeometry
      | THREE.BoxGeometry
      | THREE.SphereGeometry
      | THREE.CapsuleGeometry
  ) {
    this.geometry = geometry;
  }

  protected setMaterial(
    material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial
  ) {
    this.material = material;
  }

  protected setMesh() {
    switch (true) {
      case this.geometry instanceof THREE.PlaneGeometry:
        this.geometry = this.geometry as THREE.PlaneGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        break;
      case this.geometry instanceof THREE.BoxGeometry:
        this.geometry = this.geometry as THREE.BoxGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        break;
      case this.geometry instanceof THREE.SphereGeometry:
        this.geometry = this.geometry as THREE.SphereGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        break;
      case this.geometry instanceof THREE.CapsuleGeometry:
        this.geometry = this.geometry as THREE.CapsuleGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        break;

      // No geometry == sprite
      default:
        this.mesh = new THREE.Sprite(this.material as THREE.SpriteMaterial);
        break;
    }

    this.scene.add(this.mesh);
  }

  protected setPhysics(
    size: { width: number; height: number },
    position: { x: number; y: number },
    rigidBodyType: RAPIER.RigidBodyDesc
  ) {
    let shape;

    switch (true) {
      case this.geometry instanceof THREE.PlaneGeometry:
        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
        break;
      case this.geometry instanceof THREE.BoxGeometry:
        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
        break;
      case this.geometry instanceof THREE.SphereGeometry:
        shape = RAPIER.ColliderDesc.ball(size.width);
        break;
      case this.geometry instanceof THREE.CapsuleGeometry:
        shape = RAPIER.ColliderDesc.capsule(size.height / 2, size.width);
        break;

      default:
        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
        break;
    }

    this.body = this.physics.world.createRigidBody(rigidBodyType);
    this.body.setTranslation({ x: position.x, y: position.y }, true);
    this.body.userData = { name: this.constructor.name };

    this.physics.world.createCollider(shape!, this.body);
  }

  protected syncGraphicsToPhysics() {
    this.currentTranslation = this.body.translation();
    this.mesh.position.set(
      this.currentTranslation.x,
      this.currentTranslation.y,
      0
    );
  }

  public destroy() {
    if (
      this.geometry instanceof THREE.BoxGeometry ||
      this.geometry instanceof THREE.SphereGeometry ||
      this.geometry instanceof THREE.PlaneGeometry
    ) {
      this.geometry.dispose();
    }
    this.material?.dispose();
  }
}
