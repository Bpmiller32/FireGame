import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Physics from "../../physics";
import GameObjectType from "../../utils/types/gameObjectType";
import UserData from "../../utils/types/userData";
import GameUtils from "../../utils/gameUtils";

export default class GameObject {
  protected experience: Experience;
  protected scene: THREE.Scene;
  protected physics: Physics;

  protected initialSize: RAPIER.Vector2;

  protected geometry?:
    | THREE.BoxGeometry
    | THREE.SphereGeometry
    | THREE.CapsuleGeometry;
  protected material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
  protected mesh?: THREE.Mesh | THREE.Sprite;
  protected drawGraphics: boolean;

  protected spriteScale?: number;

  public physicsBody!: RAPIER.RigidBody;
  public currentTranslation!: RAPIER.Vector;
  public currentRotation!: number;
  public isBeingDestroyed: boolean;

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.physics = this.experience.physics;
    this.initialSize = new RAPIER.Vector2(1, 1);

    this.isBeingDestroyed = false;
    this.drawGraphics = false;
  }

  // Combines setMesh and setPhysics, hopefully less ambiguous with gameObjectType
  protected createObject(
    name: string,
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number,
    specifiedRigidBodyType?: RAPIER.RigidBodyDesc
  ) {
    let physicsShape;

    switch (gameObjectType) {
      case GameObjectType.SPRITE:
        // Graphics
        if (this.drawGraphics) {
          this.mesh = new THREE.Sprite(this.material as THREE.SpriteMaterial);
          if (this.spriteScale) {
            this.mesh.scale.set(
              this.spriteScale,
              this.spriteScale,
              this.spriteScale
            );
          }
          this.scene.add(this.mesh);
        }

        // Physics
        physicsShape = RAPIER.ColliderDesc.cuboid(
          size.width / 2,
          size.height / 2
        );
        break;
      case GameObjectType.CUBE:
        // Graphics
        if (this.drawGraphics) {
          this.geometry = this.geometry as THREE.BoxGeometry;
          this.mesh = new THREE.Mesh(this.geometry, this.material);
          this.scene.add(this.mesh);
        }

        // Physics
        physicsShape = RAPIER.ColliderDesc.cuboid(
          size.width / 2,
          size.height / 2
        );
        break;
      case GameObjectType.SPHERE:
        // Graphics
        if (this.drawGraphics) {
          this.geometry = this.geometry as THREE.SphereGeometry;
          this.mesh = new THREE.Mesh(this.geometry, this.material);
          this.scene.add(this.mesh);
        }

        // Physics
        physicsShape = RAPIER.ColliderDesc.ball(size.width);
        break;
      default:
        // Physics, default value to avoid undefined when creating collider
        physicsShape = RAPIER.ColliderDesc.cuboid(
          size.width / 2,
          size.height / 2
        );
    }

    // Default rigidbody type is the cheapest - fixed
    if (!specifiedRigidBodyType) {
      specifiedRigidBodyType = RAPIER.RigidBodyDesc.fixed();
    }

    // Create physicsBody/rigidBody, set type, position, rotation (in radians), userdata
    this.physicsBody = this.physics.world.createRigidBody(
      specifiedRigidBodyType
    );

    this.physicsBody.setTranslation({ x: position.x, y: position.y }, true);

    this.physicsBody.setRotation(rotation, true);

    this.physicsBody.userData = {
      name: name,
      gameEntityType: this.constructor.name,
    } as UserData;

    // Create and attach collider to physicsBody/rigidbody
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
    // Exit early if object is destroyed
    if (this.isBeingDestroyed) {
      return;
    }

    this.currentTranslation = this.physicsBody.translation();
    this.mesh?.position.set(
      this.currentTranslation.x,
      this.currentTranslation.y,
      0
    );

    this.currentRotation = this.physicsBody.rotation();
    this.mesh?.rotation.set(
      this.mesh?.rotation.x,
      this.mesh?.rotation.y,
      this.currentRotation
    );
  }

  public setObjectName(newName: string) {
    GameUtils.getDataFromPhysicsBody(this.physicsBody).name = newName;
  }

  public setObjectValue(newValue?: number) {
    if (!newValue) {
      return;
    }

    GameUtils.getDataFromPhysicsBody(this.physicsBody).value = newValue;
  }

  public destroy() {
    // Remove mesh from the scene if it exists
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }

    // Dispose of geometry and material if they exist
    this.geometry?.dispose();
    this.material?.dispose();

    // Remove physics body and collider from the physics world
    this.physics.world.removeCollider(this.physicsBody.collider(0), true);
    this.physics.world.removeRigidBody(this.physicsBody);

    // Flag that object is being destroyed to avoid out of sync RAPIER calls -> errors
    this.isBeingDestroyed = true;
  }
}
