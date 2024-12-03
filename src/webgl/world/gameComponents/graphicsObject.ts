import * as THREE from "three";
import Experience from "../../experience";
import ResourceLoader from "../../utils/resourceLoader";

export default class GraphicsObject {
  protected experience!: Experience;
  protected scene!: THREE.Scene;
  protected resources!: ResourceLoader;

  protected meshGroup?: THREE.Group;
  protected ambientLight?: THREE.AmbientLight;

  public initialSize!: THREE.Vector2;
  public currentSize!: THREE.Vector2;
  public initialTranslation!: THREE.Vector2;
  public currentTranslation!: THREE.Vector2;
  public currentRotation!: number;

  public isBeingDestroyed!: boolean;

  constructor() {
    this.initializeAttributes();
  }

  protected initializeAttributes() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    // TODO: later allow scaling, positioning, rotation of MeshGroup
    this.initialSize = new THREE.Vector2(0, 0);
    this.currentSize = new THREE.Vector2(0, 0);
    this.initialTranslation = new THREE.Vector2(0, 0);
    this.currentTranslation = new THREE.Vector2(0, 0);
    this.currentRotation = 0;

    this.isBeingDestroyed = false;
  }

  private async addMeshesAsync(meshes: any[], batchSize: number) {
    // Needed to load meshes from BlenderScene async, otherwise operation is blocking with too many synchronous loads to THREE.Scene
    for (let i = 0; i < meshes.length; i += batchSize) {
      const batchOfMeshes = meshes.slice(i, i + batchSize);

      batchOfMeshes.forEach((mesh) => this.meshGroup!.add(mesh));

      // Allow other operations to execute
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    this.scene.add(this.meshGroup!);
  }

  private createMeshGroup() {
    if (this.meshGroup) {
      return;
    }

    this.meshGroup = new THREE.Group();
  }

  private createAmbientLight() {
    // Create an AmbientLight for all PBR materials to be seen, not needed later when lighting is baked into MeshBasicMaterial
    if (this.ambientLight) {
      return;
    }

    this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(this.ambientLight);
  }

  public async createObjectGraphics(resourceFromLoader: any) {
    // Create an Ambient Light if it doesn't exist
    this.createAmbientLight();

    // Create the MeshGroup if it doesn't exist
    this.createMeshGroup();

    const blenderMeshes = resourceFromLoader.scene.children
      .filter((child: any) => child?.isMesh)
      // Clone meshes without affecting the original blenderScene meshes' parent
      .map((mesh: THREE.Mesh) => mesh.clone());

    // Add meshes to the scene in batches of 5
    await this.addMeshesAsync(blenderMeshes, 5);
  }

  // Teleport GameObject by x units relative from current location
  public teleportRelative(newX: number, newY: number, newZ: number = 0) {
    this.meshGroup?.position.set(
      this.currentTranslation.x + newX,
      this.currentTranslation.y + newY,
      this.currentTranslation.y + newZ
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
    // Remove the ambientLight
    if (!this.ambientLight) {
      this.scene.remove(this.ambientLight!);
      this.ambientLight = undefined;
    }

    // Remove all meshes from the meshGroup and clean up resources
    if (this.meshGroup) {
      this.meshGroup.children.forEach((mesh) => {
        if (!(mesh instanceof THREE.Mesh)) {
          return;
        }

        // Dispose geometry
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        // Dispose material
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });

      // Remove the group from the scene
      this.scene.remove(this.meshGroup);

      // Clear the meshGroup's children
      this.meshGroup.clear();
      this.meshGroup = undefined;
    }

    // Flag that object is being destroyed to avoid out of sync RAPIER calls -> errors
    this.isBeingDestroyed = true;
  }
}
