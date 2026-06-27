import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d-compat";
import Experience from "../core/experience";
import Physics from "../physics/physics";
import GameObjectType from "../types/gameObjectType";
import UserData from "../types/userData";
import { getUserData } from "../helpers/physicsHelpers";

export default class GameObject {
  protected experience!: Experience;
  protected scene!: THREE.Scene;
  public Physics!: Physics;  // Made public for GameUtils temporary sensor checking

  protected gameObjectType!: string;

  // THREE render side: shape, surface, scene node
  protected geometry?:
    | THREE.BoxGeometry
    | THREE.SphereGeometry
    | THREE.CapsuleGeometry;
  protected material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
  protected mesh?: THREE.Mesh | THREE.Sprite | THREE.Group;
  protected spriteScale?: number;

  public PhysicsBody?: RAPIER.RigidBody;

  // cached size/translation/rotation, mirrored from the physics body
  public InitialSize!: RAPIER.Vector2;
  public CurrentSize!: RAPIER.Vector2;
  public InitialTranslation!: RAPIER.Vector2;
  public CurrentTranslation!: RAPIER.Vector;
  private CurrentRotation!: number;

  // Render interpolation: the previous sim transform plus the latest, so the render
  // pass can lerp between them and stay smooth above the sim rate. RenderTranslation
  // is the interpolated position other systems (e.g. the camera) should follow.
  protected previousRenderTranslation = { x: 0, y: 0 };
  protected previousRenderRotation = 0;
  public RenderTranslation = { x: 0, y: 0 };

  public IsBeingDestroyed!: boolean; // true while tearing down, blocks callbacks

  // --- Callbacks ---

  // Called when this object starts colliding with another solid object; override in subclasses.
  public OnCollisionEnter?(other: GameObject): void;

  // Called when this object stops colliding with another solid object; override in subclasses.
  public OnCollisionExit?(other: GameObject): void;

  // --- Sensor callbacks ---

  // Called when this object (as a sensor) detects another object entering; override in subclasses.
  public OnSensorEnter?(other: GameObject): void;

  // Called when this object (as a sensor) detects another object exiting; override in subclasses.
  public OnSensorExit?(other: GameObject): void;

  // --- Setup ---

  constructor() {
    this.initializeAttributes();
  }

  // grab engine singletons, zero out transform fields
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

  // build rigid body + collider for this object
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

  // Auto-enable collision/sensor events only for objects that define callbacks.
  private enablePhysicsEvents() {
    if (!this.PhysicsBody) {
      return;
    }

    const collider = this.PhysicsBody.collider(0);

    // Enable event reporting only if this object defines a collision OR sensor callback.
    // Physics only dispatches enter/exit (no per-frame "stay") — see Physics.handleCollisionEvents.
    // Note: in Rapier, sensors are reported through collision events, not separate intersection events.
    if (
      this.OnCollisionEnter ||
      this.OnCollisionExit ||
      this.OnSensorEnter ||
      this.OnSensorExit
    ) {
      collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    }
  }

  // Arm collision/sensor events on a collider for entities that use the declarative contact
  // table instead of their own callback (callback-defining entities are armed automatically above).
  protected enableContactEvents(colliderIndex: number = 0) {
    this.PhysicsBody?.collider(colliderIndex)?.setActiveEvents(
      RAPIER.ActiveEvents.COLLISION_EVENTS
    );
  }

  // pick collider shape from the object type
  protected createCollider(
    size: { width: number; height: number },
    gameObjectType: string
  ) {
    switch (gameObjectType) {
      case GameObjectType.SPHERE:
        return RAPIER.ColliderDesc.ball(size.width / 2);
      case GameObjectType.CAPSULE:
        // capsule(halfHeight, radius): total height = 2*halfHeight + 2*radius,
        // total width = 2*radius. So radius = width/2 and halfHeight = (height-width)/2
        // reproduces a {width x height} envelope as a y-aligned capsule (height >= width).
        return RAPIER.ColliderDesc.capsule(
          Math.max(0, (size.height - size.width) / 2),
          size.width / 2
        );
      // CUBE — and any unrecognized type — fall through to a cuboid. Slopes are
      // rotated cubes and complex shapes are overlapped cubes (no polyline or
      // convex-mesh).
      case GameObjectType.CUBE:
      default:
        return RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2);
    }
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

  // lazily create the empty mesh group
  private createMeshGroup() {
    if (this.mesh) {
      return;
    }

    this.mesh = new THREE.Group();
  }

  // add meshes in batches so loading does not block
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

  // dispose geometry and material(s) of one object
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

  // build a simple solid debug mesh
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

  // --- Per-frame ---

  // copy physics translation/rotation onto the mesh
  protected syncGraphicsToPhysics(
    meshOffset: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
  ) {
    // Exit early if object is destroyed or physicsBody not ready yet
    if (this.IsBeingDestroyed || !this.PhysicsBody) {
      return;
    }

    // Record the previous sim transform so the render pass can interpolate toward
    // the new one (see InterpolateGraphics).
    this.previousRenderTranslation.x = this.CurrentTranslation.x;
    this.previousRenderTranslation.y = this.CurrentTranslation.y;
    this.previousRenderRotation = this.CurrentRotation;

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

  // Render-interpolated mesh placement: lerp between the previous and current sim
  // transforms by alpha (0..1 — how far into the next step we are). Called once per
  // RENDER frame for MOVING entities (Player, Enemies) so motion stays smooth above
  // the sim rate; static entities are positioned once by syncGraphicsToPhysics and
  // don't need it. Records the interpolated position in RenderTranslation so the
  // camera can follow the smooth visual position, not the stepped sim position.
  public InterpolateGraphics(
    alpha: number,
    meshOffset: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
  ) {
    if (this.IsBeingDestroyed || !this.mesh) {
      return;
    }

    const x =
      this.previousRenderTranslation.x +
      (this.CurrentTranslation.x - this.previousRenderTranslation.x) * alpha;
    const y =
      this.previousRenderTranslation.y +
      (this.CurrentTranslation.y - this.previousRenderTranslation.y) * alpha;

    this.RenderTranslation.x = x;
    this.RenderTranslation.y = y;

    this.mesh.position.set(x + meshOffset.x, y + meshOffset.y, meshOffset.z);

    // Interpolate rotation along the SHORTEST arc. The Rapier 2D angle wraps at ±π,
    // so a rolling barrel's angle jumps from ~+π to ~-π between steps; a naive lerp
    // would spin the long way round (a visible one-frame backspin). atan2(sin,cos)
    // wraps the delta into (-π, π] so we always take the short way.
    let dRot = this.CurrentRotation - this.previousRenderRotation;
    dRot = Math.atan2(Math.sin(dRot), Math.cos(dRot));
    const rot = this.previousRenderRotation + dRot * alpha;
    this.mesh.rotation.set(this.mesh.rotation.x, this.mesh.rotation.y, rot);
  }

  // set group bits, preserve the current mask
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

  // set mask bits, preserve the current group
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

  // --- Commands ---

  // Set this entity's TYPE routing flag and mirror name to it; call SetName after for a distinct id.
  public SetType(newType?: string) {
    if (!newType) {
      return;
    }

    const userData = getUserData(this.PhysicsBody);
    userData.type = newType;
    userData.name = newType;
  }

  // Set this entity's per-INSTANCE name, leaving its routing type unchanged.
  public SetName(newName?: string) {
    if (!newName) {
      return;
    }

    getUserData(this.PhysicsBody).name = newName;
  }

  // Teleport GameObject by x units relative from current location
  private TeleportRelative(newX: number, newY: number) {
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

    // Snap the render-interpolation state to the new position so the mesh JUMPS to
    // the teleport target instead of sliding across the level over one frame (reset,
    // teleporter). Without this, prev=old/curr=new would lerp the whole distance.
    this.CurrentTranslation = this.PhysicsBody!.translation();
    this.previousRenderTranslation.x = this.CurrentTranslation.x;
    this.previousRenderTranslation.y = this.CurrentTranslation.y;
    this.RenderTranslation.x = this.CurrentTranslation.x;
    this.RenderTranslation.y = this.CurrentTranslation.y;
  }

  // clone Blender scene meshes onto this object
  public async CreateObjectGraphics(resourceFromLoader: any) {
    // Create the MeshGroup if it doesn't exist
    this.createMeshGroup();

    // Clone meshes without affecting the original blenderScene meshes' parent.
    // Clone geometry + material too so THIS instance OWNS its GPU buffers: a plain
    // .clone() SHARES them with the source asset, so disposing a dead entity (e.g.
    // a barrel on contact, every couple seconds) would free buffers still used by
    // the source and every other live clone. Owning them makes Destroy() free only
    // our own.
    const blenderMeshes: THREE.Mesh[] = [];
    for (const child of resourceFromLoader.scene.children) {
      if (child?.isMesh) {
        const cloned: THREE.Mesh = child.clone();
        cloned.geometry = child.geometry.clone();
        // Clone the material too so this instance owns its own (array materials cloned one by one).
        if (Array.isArray(child.material)) {
          cloned.material = child.material.map((m: THREE.Material) => m.clone());
        } else {
          cloned.material = child.material.clone();
        }
        blenderMeshes.push(cloned);
      }
    }

    // Add meshes to the scene in batches of 5
    await this.addMeshesToGroupAsync(blenderMeshes, 5);

    this.syncGraphicsToPhysics();
  }

  // --- Teardown ---

  // tear down mesh, geometry, and physics body
  public Destroy() {
    // Idempotent: a second Destroy() (e.g. a re-entrant "gameObjectRemoved") is a
    // no-op instead of double-freeing the body or recursing.
    if (this.IsBeingDestroyed) {
      return;
    }

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
