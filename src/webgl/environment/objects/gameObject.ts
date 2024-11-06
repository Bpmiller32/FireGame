import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Physics from "../../physics";
import GameObjectType from "../../utils/types/gameObjectType";

export default class GameObject {
  protected experience: Experience;
  protected scene: THREE.Scene;
  protected physics: Physics;

  public geometry?:
    | THREE.BoxGeometry
    | THREE.SphereGeometry
    | THREE.CapsuleGeometry;
  public material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
  public mesh?: THREE.Mesh | THREE.Sprite;
  public spriteScale?: number;

  public body!: RAPIER.RigidBody;
  public currentTranslation!: RAPIER.Vector;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.physics = this.experience.physics;
  }

  // Combines setMesh and setPhysics, hopefully less ambiguous with gameObjectType
  protected createObject(
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number },
    specifiedRigidBodyType?: RAPIER.RigidBodyDesc
  ) {
    let shape;

    switch (gameObjectType) {
      case GameObjectType.SPRITE:
        // Three
        this.mesh = new THREE.Sprite(this.material as THREE.SpriteMaterial);
        if (this.spriteScale) {
          this.mesh.scale.set(
            this.spriteScale,
            this.spriteScale,
            this.spriteScale
          );
        }
        this.scene.add(this.mesh);

        // Rapier
        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
        break;
      case GameObjectType.CUBE:
        this.geometry = this.geometry as THREE.BoxGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
        break;
      case GameObjectType.SPHERE:
        this.geometry = this.geometry as THREE.SphereGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        shape = RAPIER.ColliderDesc.ball(size.width);
        break;
      case GameObjectType.CAPSULE:
        this.geometry = this.geometry as THREE.CapsuleGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        shape = RAPIER.ColliderDesc.capsule(size.height / 2, size.width);
        break;
      case GameObjectType.MAP_STRUCTURE:
        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
        break;
    }

    // Default rigidbody type is the cheapest - fixed
    if (!specifiedRigidBodyType) {
      specifiedRigidBodyType = RAPIER.RigidBodyDesc.fixed();
    }

    this.body = this.physics.world.createRigidBody(specifiedRigidBodyType);
    this.body.setTranslation({ x: position.x, y: position.y }, true);
    this.body.userData = { name: this.constructor.name };

    this.physics.world.createCollider(shape!, this.body);
  }

  protected setGeometry(
    geometry?: THREE.BoxGeometry | THREE.SphereGeometry | THREE.CapsuleGeometry
  ) {
    this.geometry = geometry;
  }

  protected setMaterial(
    material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial,
    spriteScale?: number
  ) {
    this.material = material;
    this.spriteScale = spriteScale;
  }

  protected syncGraphicsToPhysics() {
    this.currentTranslation = this.body.translation();
    this.mesh?.position.set(
      this.currentTranslation.x,
      this.currentTranslation.y,
      0
    );
  }

  public destroy() {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
