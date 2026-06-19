import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d-compat";
import Experience from "../core/experience";
import Physics from "../physics/physics";
import GameObjectType from "../types/gameObjectType";
import UserData from "../types/userData";
import GameUtils from "../../game/gameUtils";

export default class GameObject {
  protected experience!: Experience;
  protected scene!: THREE.Scene;
  public Physics!: Physics;  // Made public for GameUtils temporary sensor checking

  protected gameObjectType!: string;

  protected geometry?:
    | THREE.BoxGeometry
    | THREE.SphereGeometry
    | THREE.CapsuleGeometry;
  protected material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
  protected mesh?: THREE.Mesh | THREE.Sprite | THREE.Group;
  protected spriteScale?: number;
  protected vertices?: number[];

  public PhysicsBody?: RAPIER.RigidBody;

  public InitialSize!: RAPIER.Vector2;
  public CurrentSize!: RAPIER.Vector2;
  public InitialTranslation!: RAPIER.Vector2;
  public CurrentTranslation!: RAPIER.Vector;
  public CurrentRotation!: number;

  public IsBeingDestroyed!: boolean;

  // ============================================================================
  // COLLISION CALLBACKS - Override these in subclasses to handle collisions
  // ============================================================================

  /**
   * Called when this GameObject starts colliding with another solid GameObject
   * Override this method in subclasses to define collision behavior
   * 
   * @param other - The GameObject this object collided with
   * 
   * @example
   * ```typescript
   * protected onCollisionEnter(other: GameObject) {
   *   if (other instanceof Player) {
   *     console.log("Enemy hit player!");
   *     Emitter.emit("gameOver");
   *   }
   * }
   * ```
   */
  public OnCollisionEnter?(other: GameObject): void;

  /**
   * Called when this GameObject stops colliding with another solid GameObject
   * Override this method in subclasses to define collision exit behavior
   *
   * @param other - The GameObject this object stopped colliding with
   */
  public OnCollisionExit?(other: GameObject): void;

  // ============================================================================
  // SENSOR CALLBACKS - Override these in subclasses to handle sensor triggers
  // ============================================================================

  /**
   * Called when this GameObject (as a sensor) detects another GameObject entering
   * Override this method in subclasses to define sensor trigger behavior
   * 
   * @param other - The GameObject that entered this sensor
   * 
   * @example
   * ```typescript
   * protected onSensorEnter(other: GameObject) {
   *   if (other instanceof Player) {
   *     console.log("Player entered ladder zone!");
   *     this.camera.changePosition(this.targetPosition);
   *   }
   * }
   * ```
   */
  public OnSensorEnter?(other: GameObject): void;

  /**
   * Called when this GameObject (as a sensor) detects another GameObject exiting
   * Override this method in subclasses to define sensor exit behavior
   *
   * @param other - The GameObject that exited this sensor
   */
  public OnSensorExit?(other: GameObject): void;

  constructor() {
    this.initializeAttributes();
  }

  private initializeAttributes() {
    this.experience = Experience.GetInstance();
    this.scene = this.experience.Scene;
    this.Physics = this.experience.Physics;

    this.InitialSize = new RAPIER.Vector2(0, 0);
    this.CurrentSize = new RAPIER.Vector2(0, 0);
    this.InitialTranslation = new RAPIER.Vector2(0, 0);
    this.CurrentTranslation = new RAPIER.Vector2(0, 0);
    this.CurrentRotation = 0;

    this.gameObjectType = "";

    this.IsBeingDestroyed = false;
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
    this.InitialTranslation = new RAPIER.Vector2(position.x, position.y);
    this.InitialSize = new RAPIER.Vector2(size.width, size.height);
    this.CurrentSize = new RAPIER.Vector2(size.width, size.height);
    this.gameObjectType = gameObjectType;

    // Physics setup based on object type
    const collider = this.createCollider(size, gameObjectType);

    // Create physicsBody/rigidBody, set type, position, rotation (in radians), userdata
    this.PhysicsBody = this.Physics.World.createRigidBody(
      specifiedRigidBodyType
    );

    this.PhysicsBody.setTranslation({ x: position.x, y: position.y }, true);
    this.CurrentTranslation = this.PhysicsBody.translation();

    this.PhysicsBody.setRotation(rotation, true);
    this.CurrentRotation = this.PhysicsBody.rotation();

    // The game supplies the identity. `type` is the shared routing flag (many
    // entities can share one); `name` is the per-instance id, defaulting to the
    // type until SetType/SetName change it. The engine treats both as opaque.
    this.PhysicsBody.userData = {
      type: name,
      name: name,
    } as UserData;

    // Create and attach collider to physicsBody/rigidbody
    this.Physics.World.createCollider(collider, this.PhysicsBody);

    // Register this GameObject with the physics system for collision/sensor callbacks
    this.Physics.RegisterGameObject(this);

    // Auto-enable collision/sensor events if callbacks are defined
    this.enablePhysicsEvents();
  }

  /**
   * Automatically enable collision/sensor events if the GameObject has callbacks defined
   * This allows the event system to efficiently only process events for objects that need them
   */
  private enablePhysicsEvents() {
    if (!this.PhysicsBody) {
      return;
    }

    const collider = this.PhysicsBody.collider(0);

    // Determine which events to enable based on callbacks defined
    let eventsToEnable = 0;

    // Enable collision events if any collision callbacks are defined.
    // Physics only dispatches enter/exit (no per-frame "stay") — see Physics.handleCollisionEvents.
    if (this.OnCollisionEnter || this.OnCollisionExit) {
      eventsToEnable |= RAPIER.ActiveEvents.COLLISION_EVENTS;
    }

    // Enable intersection events if any sensor callbacks are defined
    // Note: In Rapier, sensors use collision events, not separate intersection events
    if (this.OnSensorEnter || this.OnSensorExit) {
      eventsToEnable |= RAPIER.ActiveEvents.COLLISION_EVENTS;
    }

    // Set the active events if any callbacks are defined
    if (eventsToEnable > 0) {
      collider.setActiveEvents(eventsToEnable);
    }
  }

  /**
   * Explicitly arm collision/sensor events on a collider so this entity takes
   * part in the contact-rule system even when it defines no collision or sensor
   * callback of its own (its interactions live in the declarative contact table
   * instead). Entities that DO define a callback are armed automatically above.
   */
  protected enableContactEvents(colliderIndex: number = 0) {
    this.PhysicsBody?.collider(colliderIndex)?.setActiveEvents(
      RAPIER.ActiveEvents.COLLISION_EVENTS
    );
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

  private createMeshGroup() {
    if (this.mesh) {
      return;
    }

    this.mesh = new THREE.Group();
  }

  private async addMeshesToGroupAsync(meshes: any[], batchSize: number) {
    // Needed to load meshes from BlenderScene async, otherwise operation is blocking with too many synchronous loads to THREE.Scene
    for (let i = 0; i < meshes.length; i += batchSize) {
      const batchOfMeshes = meshes.slice(i, i + batchSize);

      batchOfMeshes.forEach((mesh) => this.mesh!.add(mesh));

      // Allow other operations to execute
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    this.scene.add(this.mesh!);
  }

  private disposeMeshHelper(object: THREE.Object3D) {
    if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
      // Dispose geometry
      object.geometry?.dispose();

      // Dispose material(s)
      let materials: THREE.Material[];
      if (Array.isArray(object.material)) {
        materials = object.material;
      } else {
        materials = [object.material];
      }
      materials.forEach((material) => material?.dispose());
    }
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
          new THREE.BoxGeometry(this.CurrentSize.x, this.CurrentSize.y, 1)
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
        this.setGeometry(new THREE.SphereGeometry(this.CurrentSize.x));
        this.setMaterial(
          new THREE.MeshBasicMaterial({
            color: meshColor,
            opacity: opacity,
            transparent: isMaterialTransparent,
          })
        );
        this.mesh = new THREE.Mesh(this.geometry, this.material);
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
    if (this.IsBeingDestroyed || !this.PhysicsBody) {
      return;
    }

    this.CurrentTranslation = this.PhysicsBody.translation();
    this.mesh?.position.set(
      this.CurrentTranslation.x + meshOffset.x,
      this.CurrentTranslation.y + meshOffset.y,
      meshOffset.z
    );

    this.CurrentRotation = this.PhysicsBody.rotation();
    this.mesh?.rotation.set(
      this.mesh?.rotation.x,
      this.mesh?.rotation.y,
      this.CurrentRotation
    );
  }

  protected setCollisionGroup(
    collisionGroups: number,
    colliderIndex: number = 0
  ) {
    // Physics body needs to be created
    if (!this.PhysicsBody) {
      return;
    }

    // Extract the current mask (upper 16 bits)
    const currentMask =
      this.PhysicsBody.collider(colliderIndex).collisionGroups() >> 16;

    // Set the group, keep the current mask
    this.PhysicsBody
      .collider(colliderIndex)
      .setCollisionGroups(collisionGroups | (currentMask << 16));
  }

  protected setCollisionMask(collisionMask: number, colliderIndex: number = 0) {
    // Physics body needs to be created
    if (!this.PhysicsBody) {
      return;
    }

    // Extract the current group (lower 16 bits)
    const currentGroup =
      this.PhysicsBody.collider(colliderIndex).collisionGroups() & 0xffff;

    // Set the mask, keep the current group
    this.PhysicsBody
      .collider(colliderIndex)
      .setCollisionGroups(currentGroup | (collisionMask << 16));
  }

  /**
   * Set this entity's TYPE flag — the shared routing identity. Used to specialize
   * an entity after construction (a generic shape becomes a more specific kind,
   * e.g. a Platform becomes a "Wall"). Keeps `name` mirroring `type` as a sensible
   * default; call SetName afterwards for a distinct per-instance id.
   */
  public SetType(newType?: string) {
    if (!newType) {
      return;
    }

    const userData = GameUtils.GetDataFromPhysicsBody(this.PhysicsBody);
    userData.type = newType;
    userData.name = newType;
  }

  /**
   * Set this entity's per-INSTANCE name (e.g. "SpecificEnemy2"), leaving its
   * routing `type` unchanged so type-flag matching still groups it with its kind.
   */
  public SetName(newName?: string) {
    if (!newName) {
      return;
    }

    GameUtils.GetDataFromPhysicsBody(this.PhysicsBody).name = newName;
  }

  public ChangeColliderSize(newSize: { width: number; height: number }) {
    // Remove the old collider (assuming there's only one collider attached)
    this.Physics.World.removeCollider(this.PhysicsBody!.collider(0), true);

    // Create a new collider with the updated size
    const newCollider = this.createCollider(newSize, this.gameObjectType);

    // Attach the new collider to the rigid body
    this.Physics.World.createCollider(newCollider, this.PhysicsBody);

    // Update the current size property
    this.CurrentSize = new RAPIER.Vector2(newSize.width, newSize.height);
  }

  // Teleport GameObject by x units relative from current location
  public TeleportRelative(newX: number, newY: number) {
    this.PhysicsBody!.setTranslation(
      {
        x: this.CurrentTranslation.x + newX,
        y: this.CurrentTranslation.y + newY,
      },
      true
    );
  }

  // Teleport GameObject to a specific global coordinate
  public TeleportToPosition(targetX: number, targetY: number) {
    // Calculate the difference (relative distance) to the target position
    const deltaX = targetX - this.CurrentTranslation.x;
    const deltaY = targetY - this.CurrentTranslation.y;

    // Use teleportRelative to move to the target position
    this.TeleportRelative(deltaX, deltaY);
  }

  public async CreateObjectGraphics(resourceFromLoader: any) {
    // Create the MeshGroup if it doesn't exist
    this.createMeshGroup();

    const blenderMeshes = resourceFromLoader.scene.children
      .filter((child: any) => child?.isMesh)
      // Clone meshes without affecting the original blenderScene meshes' parent
      .map((mesh: THREE.Mesh) => mesh.clone());

    // Add meshes to the scene in batches of 5
    await this.addMeshesToGroupAsync(blenderMeshes, 5);

    this.syncGraphicsToPhysics();
  }

  public Destroy() {
    // Set immediately — guards concurrent collision callbacks from firing on a partially-destroyed object
    this.IsBeingDestroyed = true;

    // Remove the main mesh from the scene if it exists
    if (this.mesh) {
      this.disposeMeshHelper(this.mesh);
      this.scene.remove(this.mesh);

      // Dispose and remove all children of the mesh
      this.mesh.children.forEach((child) => {
        this.disposeMeshHelper(child);
      });

      // Clear mesh's children and reference
      this.mesh.clear();
      this.mesh = undefined;
    }

    // Dispose of geometry and material if they exist
    this.geometry?.dispose();
    this.material?.dispose();

    // Unregister from collision event system, then remove physics body
    // removeRigidBody also removes all attached colliders, so no manual collider removal needed
    if (this.PhysicsBody) {
      this.Physics.UnregisterGameObject(this);
      this.Physics.World.removeRigidBody(this.PhysicsBody);
      this.PhysicsBody = undefined;
    }

  }
}
