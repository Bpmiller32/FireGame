import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Physics from "../../physics";
import GameObjectType from "../../utils/types/gameObjectType";
import UserData from "../../utils/types/userData";
import GameUtils from "../../utils/gameUtils";

export default class GameObject {
  protected experience!: Experience;
  protected scene!: THREE.Scene;
  protected physics!: Physics;

  protected gameObjectType!: string;

  protected geometry?:
    | THREE.BoxGeometry
    | THREE.SphereGeometry
    | THREE.CapsuleGeometry;
  protected material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
  protected mesh?: THREE.Mesh | THREE.Sprite;
  protected spriteScale?: number;
  protected vertices?: number[];

  public physicsBody?: RAPIER.RigidBody;

  public initialSize!: RAPIER.Vector2;
  public currentSize!: RAPIER.Vector2;
  public initialTranslation!: RAPIER.Vector2;
  public currentTranslation!: RAPIER.Vector;
  public currentRotation!: number;

  public isBeingDestroyed!: boolean;

  constructor() {
    this.initializeAttributes();
  }

  protected initializeAttributes() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.physics = this.experience.physics;

    this.initialSize = new RAPIER.Vector2(0, 0);
    this.currentSize = new RAPIER.Vector2(0, 0);
    this.initialTranslation = new RAPIER.Vector2(0, 0);
    this.currentTranslation = new RAPIER.Vector2(0, 0);
    this.currentRotation = 0;

    this.gameObjectType = "";

    this.isBeingDestroyed = false;
  }

  protected createObjectPhysics(
    name: string = "GameObject",
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number },
    rotation: number,
    specifiedRigidBodyType: RAPIER.RigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
  ) {
    // Set object position, size, and type. Inital size in particular so I don't have to look for it in physicsBody.collider.shape.halfExtents later
    this.initialTranslation = new RAPIER.Vector2(position.x, position.y);
    this.initialSize = new RAPIER.Vector2(size.width, size.height);
    this.currentSize = new RAPIER.Vector2(size.width, size.height);
    this.gameObjectType = gameObjectType;

    // Physics setup based on object type
    const collider = this.createCollider(size, gameObjectType);

    // Create physicsBody/rigidBody, set type, position, rotation (in radians), userdata
    this.physicsBody = this.physics.world.createRigidBody(
      specifiedRigidBodyType
    );

    this.physicsBody.setTranslation({ x: position.x, y: position.y }, true);
    this.currentTranslation = this.physicsBody.translation();

    this.physicsBody.setRotation(rotation, true);
    this.currentRotation = this.physicsBody.rotation();

    this.physicsBody.userData = {
      name: name,
      gameEntityType: this.constructor.name,
    } as UserData;

    // Create and attach collider to physicsBody/rigidbody
    this.physics.world.createCollider(collider, this.physicsBody);
  }

  protected createCollider(
    size: { width: number; height: number },
    gameObjectType: string
  ) {
    switch (gameObjectType) {
      case GameObjectType.CUBE:
        return RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
      case GameObjectType.SPHERE:
        return RAPIER.ColliderDesc.ball(size.width / 2);
      case GameObjectType.CAPSULE:
        return RAPIER.ColliderDesc.capsule(size.height / 2, size.width);
      case GameObjectType.CONVEX_MESH:
        if (this.vertices && this.vertices.length > 0) {
          return RAPIER.ColliderDesc.convexHull(
            new Float32Array(this.vertices)
          )!;
        } else {
          return RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
        }
      case GameObjectType.POLYLINE:
        if (this.vertices && this.vertices.length > 0) {
          return RAPIER.ColliderDesc.polyline(new Float32Array(this.vertices));
        } else {
          return RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
        }
      default:
        return RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
    }
  }

  protected setVertices(vertices: number[]) {
    this.vertices = vertices.flat();
  }

  protected setGeometry(geometry?: THREE.BoxGeometry | THREE.SphereGeometry) {
    this.geometry = geometry;
  }

  protected setMaterial(
    material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial,
    spriteScale?: number
  ) {
    this.material = material;
    this.spriteScale = spriteScale;
  }

  protected createObjectGraphicsDebug(meshColor: string, opacity: number = 1) {
    // Check to set transparent property on MeshBasicMaterial
    let isMaterialTransparent: boolean;

    if (opacity < 1) {
      isMaterialTransparent = true;
    } else {
      isMaterialTransparent = false;
    }

    // Render setup based on object type
    switch (this.gameObjectType) {
      case GameObjectType.CUBE:
        this.setGeometry(
          new THREE.BoxGeometry(this.currentSize.x, this.currentSize.y, 1)
        );
        this.setMaterial(
          new THREE.MeshBasicMaterial({
            color: meshColor,
            opacity: opacity,
            transparent: isMaterialTransparent,
          })
        );
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        break;

      case GameObjectType.SPHERE:
        this.setGeometry(new THREE.SphereGeometry(this.currentSize.x));
        this.setMaterial(
          new THREE.MeshBasicMaterial({
            color: meshColor,
            opacity: opacity,
            transparent: isMaterialTransparent,
          })
        );
        this.mesh = new THREE.Mesh(
          this.geometry,
          new THREE.ShaderMaterial({
            uniforms: {
              // First stripe color
              stripeColor1: { value: new THREE.Color(0xffffff) },
              // Second stripe color
              stripeColor2: { value: new THREE.Color(0x000000) },
              // Stripe width
              stripeWidth: { value: 2.0 },
            },
            vertexShader: `
            varying vec3 vUv; 
            void main() {
              vUv = position; 
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
            fragmentShader: `
            uniform vec3 stripeColor1;
            uniform vec3 stripeColor2;
            uniform float stripeWidth;
            varying vec3 vUv;
  
            void main() {
              float stripes = mod(floor(vUv.y * stripeWidth), 2.0); // Alternating stripes
              vec3 color = mix(stripeColor1, stripeColor2, stripes);
              gl_FragColor = vec4(color, 1.0);
            }
          `,
          })
        );
        break;

      default:
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        break;
    }

    this.scene.add(this.mesh);
    this.syncGraphicsToPhysics();
  }

  protected syncGraphicsToPhysics(
    meshOffset: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
  ) {
    // Exit early if object is destroyed or physicsBody not ready yet
    if (this.isBeingDestroyed || !this.physicsBody) {
      return;
    }

    this.currentTranslation = this.physicsBody.translation();
    this.mesh?.position.set(
      this.currentTranslation.x + meshOffset.x,
      this.currentTranslation.y + meshOffset.y,
      meshOffset.z
    );

    this.currentRotation = this.physicsBody.rotation();
    this.mesh?.rotation.set(
      this.mesh?.rotation.x,
      this.mesh?.rotation.y,
      this.currentRotation
    );
  }

  protected setCollisionGroup(
    collisionGroups: number,
    colliderIndex: number = 0
  ) {
    // Physics body needs to be created
    if (!this.physicsBody) {
      return;
    }

    // Extract the current mask (upper 16 bits)
    const currentMask =
      this.physicsBody.collider(colliderIndex).collisionGroups() >> 16;

    // Set the group, keep the current mask
    this.physicsBody
      .collider(colliderIndex)
      .setCollisionGroups(collisionGroups | (currentMask << 16));
  }

  protected setCollisionMask(collisionMask: number, colliderIndex: number = 0) {
    // Physics body needs to be created
    if (!this.physicsBody) {
      return;
    }

    // Extract the current group (lower 16 bits)
    const currentGroup =
      this.physicsBody.collider(colliderIndex).collisionGroups() & 0xffff;

    // Set the mask, keep the current group
    this.physicsBody
      .collider(colliderIndex)
      .setCollisionGroups(currentGroup | (collisionMask << 16));
  }

  public setObjectName(newName?: string) {
    if (!newName) {
      return;
    }

    GameUtils.getDataFromPhysicsBody(this.physicsBody).name = newName;
  }

  public setObjectValue0(newValue?: number) {
    if (!newValue) {
      GameUtils.getDataFromPhysicsBody(this.physicsBody).value0 = 0;
      return;
    }

    GameUtils.getDataFromPhysicsBody(this.physicsBody).value0 = newValue;
  }

  public setObjectValue1(newValue?: number) {
    if (!newValue) {
      GameUtils.getDataFromPhysicsBody(this.physicsBody).value1 = 0;
      return;
    }

    GameUtils.getDataFromPhysicsBody(this.physicsBody).value1 = newValue;
  }

  public setObjectValue2(newValue?: number) {
    if (!newValue) {
      GameUtils.getDataFromPhysicsBody(this.physicsBody).value2 = 0;
      return;
    }

    GameUtils.getDataFromPhysicsBody(this.physicsBody).value2 = newValue;
  }

  public setObjectValue3(newValue?: number) {
    if (!newValue) {
      GameUtils.getDataFromPhysicsBody(this.physicsBody).value3 = 0;
      return;
    }

    GameUtils.getDataFromPhysicsBody(this.physicsBody).value3 = newValue;
  }

  public changeColliderSize(newSize: { width: number; height: number }) {
    // Remove the old collider (assuming there's only one collider attached)
    this.physics.world.removeCollider(this.physicsBody!.collider(0), true);

    // Create a new collider with the updated size
    const newCollider = this.createCollider(newSize, this.gameObjectType);

    // Attach the new collider to the rigid body
    this.physics.world.createCollider(newCollider, this.physicsBody);

    // Update the current size property
    this.currentSize = new RAPIER.Vector2(newSize.width, newSize.height);
  }

  // Teleport GameObject by x units relative from current location
  public teleportRelative(newX: number, newY: number) {
    this.physicsBody!.setTranslation(
      {
        x: this.currentTranslation.x + newX,
        y: this.currentTranslation.y + newY,
      },
      true
    );
  }

  // Teleport GameObject to a specific global coordinate
  public teleportToPosition(targetX: number, targetY: number) {
    // Calculate the difference (relative distance) to the target position
    const deltaX = targetX - this.currentTranslation.x;
    const deltaY = targetY - this.currentTranslation.y;

    // Use teleportRelative to move to the target position
    this.teleportRelative(deltaX, deltaY);
  }

  public destroy() {
    // Remove mesh from the scene if it exists
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.scene.remove(this.mesh);
    }

    // Dispose of geometry and material if they exist
    this.geometry?.dispose();
    this.material?.dispose();

    // Remove physics body and collider from the physics world
    if (this.physicsBody) {
      this.physics.world.removeCollider(this.physicsBody.collider(0), true);
      this.physics.world.removeRigidBody(this.physicsBody);

      // Part of fix to defer destruction
      this.physicsBody = undefined;
    }

    // Flag that object is being destroyed to avoid out of sync RAPIER calls -> errors
    this.isBeingDestroyed = true;
  }
}
