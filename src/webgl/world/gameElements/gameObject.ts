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

  public physicsBody!: RAPIER.RigidBody;
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
    let physicsShape;

    switch (gameObjectType) {
      case GameObjectType.SPRITE:
        // Graphics
        this.mesh = new THREE.Sprite(this.material as THREE.SpriteMaterial);
        if (this.spriteScale) {
          this.mesh.scale.set(
            this.spriteScale,
            this.spriteScale,
            this.spriteScale
          );
        }
        this.scene.add(this.mesh);

        // Physics
        physicsShape = RAPIER.ColliderDesc.cuboid(
          size.width / 2,
          size.height / 2
        );
        break;
      case GameObjectType.CUBE:
        // Graphics
        this.geometry = this.geometry as THREE.BoxGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        // Physics
        physicsShape = RAPIER.ColliderDesc.cuboid(
          size.width / 2,
          size.height / 2
        );
        break;
      case GameObjectType.SPHERE:
        // Graphics
        this.geometry = this.geometry as THREE.SphereGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        // Physics
        physicsShape = RAPIER.ColliderDesc.ball(size.width);
        break;
      case GameObjectType.CAPSULE:
        // Graphics
        this.geometry = this.geometry as THREE.CapsuleGeometry;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        // Physics
        physicsShape = RAPIER.ColliderDesc.capsule(size.height / 2, size.width);
        break;
      case GameObjectType.MAP_STRUCTURE:
        // Physics
        physicsShape = RAPIER.ColliderDesc.cuboid(
          size.width / 2,
          size.height / 2
        );
        break;

      default:
        // Physics, default value to avoid undefined when creating collider
        physicsShape = RAPIER.ColliderDesc.cuboid(1, 1);
    }

    // Default rigidbody type is the cheapest - fixed
    if (!specifiedRigidBodyType) {
      specifiedRigidBodyType = RAPIER.RigidBodyDesc.fixed();
    }

    this.physicsBody = this.physics.world.createRigidBody(
      specifiedRigidBodyType
    );
    this.physicsBody.setTranslation({ x: position.x, y: position.y }, true);
    this.physicsBody.userData = { name: this.constructor.name };

    this.physics.world.createCollider(physicsShape, this.physicsBody);
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
    this.currentTranslation = this.physicsBody.translation();
    this.mesh?.position.set(
      this.currentTranslation.x,
      this.currentTranslation.y,
      0
    );
  }

  public destroy() {
    // Remove mesh from the scene if it exists
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }

    // Dispose of geometry and material if they exist
    this.geometry?.dispose();
    this.material?.dispose();

    // Remove physics body from the physics world
    if (this.physicsBody) {
      this.physics.world.removeRigidBody(this.physicsBody);
    }

    // Set all properties to undefined or null to aid garbage collection
    this.geometry = null as any;
    this.material = null as any;
    this.mesh = null as any;
    this.physicsBody = null as any;
    this.currentTranslation = null as any;
  }
}
