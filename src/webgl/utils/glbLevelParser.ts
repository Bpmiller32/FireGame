/**
 * GLB Level Parser
 * 
 * Reads GLB files exported from Shapr3D and converts them to LevelData format.
 * Uses folder hierarchy to determine object types and reads metadata from GLTF extras field.
 * 
 * Folder Structure:
 * - Platforms/ → Platform objects
 * - Walls/ → Wall objects
 * - OneWayPlatforms/ → One-way platforms
 * - Ladders/Top/ → Ladder top sensors
 * - Ladders/Core/ → Ladder core sensors
 * - Ladders/Bottom/ → Ladder bottom sensors
 * - Sensors/Cameras/ → Camera sensors
 * - Entities/ → Special objects (player_start, camera_start, etc.)
 * - Graphics/ → Visual only (no physics)
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { DRACOLoader } from "three/examples/jsm/Addons.js";
import LevelData from "./types/levelData";

// Type definitions for parsed objects
interface ParsedObject {
  name: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  depth: number;
  vertices?: number[][];
  extras?: Record<string, any>;
}

export default class GLBLevelParser {
  private gltfLoader: GLTFLoader;
  
  constructor() {
    // Set up GLTF and DRACO loaders
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader().setDecoderPath("/draco/gltf/");
    this.gltfLoader.setDRACOLoader(dracoLoader);
  }

  /**
   * Load and parse a GLB file into LevelData format
   * @param path - Path to the GLB file
   * @returns Promise resolving to LevelData compatible with existing system
   */
  public async parse(path: string): Promise<LevelData> {
    // Load the GLB file
    const gltf = await this.loadGLB(path);
    
    // Parse the scene hierarchy
    const parsedObjects = this.parseScene(gltf.scene);
    
    // Convert to LevelData format
    const levelData = this.convertToLevelData(parsedObjects);
    
    return levelData;
  }

  /**
   * Load GLB file using GLTFLoader
   */
  private loadGLB(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      );
    });
  }

  /**
   * Recursively parse the scene hierarchy
   * @param node - Three.js Object3D node to parse
   * @param parentPath - Path of parent folders (for type detection)
   */
  private parseScene(
    node: THREE.Object3D,
    parentPath: string = ""
  ): ParsedObject[] {
    const objects: ParsedObject[] = [];

    // Build current path for type detection
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    // If this node has a mesh, it's a game object
    if (node instanceof THREE.Mesh) {
      const parsed = this.parseMeshObject(node, currentPath);
      if (parsed) {
        objects.push(parsed);
      }
    }

    // Recursively parse children
    for (const child of node.children) {
      objects.push(...this.parseScene(child, currentPath));
    }

    return objects;
  }

  /**
   * Parse a mesh object into game data
   */
  private parseMeshObject(
    mesh: THREE.Mesh,
    path: string
  ): ParsedObject | null {
    // Determine object type from folder path
    const type = this.getObjectType(path);
    
    // Skip graphics objects (visual only)
    if (type === "GraphicsObject") {
      return null;
    }

    // Get position (convert from Three.js Y-up to your Z-up coordinate system)
    const position = new THREE.Vector3();
    mesh.getWorldPosition(position);

    // Get rotation
    const rotation = new THREE.Euler();
    mesh.getWorldQuaternion(new THREE.Quaternion()).normalize();
    rotation.setFromQuaternion(mesh.quaternion);

    // Get bounding box for dimensions
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Read metadata from GLTF extras field
    const extras = (mesh.userData as any)?.gltfExtras || {};

    // Build parsed object
    const parsedObject: ParsedObject = {
      name: mesh.name,
      type: type,
      // Convert Three.js coordinates (Y-up) to your game coordinates (Z-up)
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      width: size.x,
      height: size.z,  // Your system uses Z as vertical
      depth: size.y,   // Your system uses Y as depth
      extras: extras,
    };

    // Extract vertices for complex shapes (if needed)
    if (type.includes("Line") || type.includes("Edge")) {
      parsedObject.vertices = this.extractVertices(mesh);
    }

    return parsedObject;
  }

  /**
   * Determine object type from folder path
   */
  private getObjectType(path: string): string {
    const lowerPath = path.toLowerCase();

    // Check folder hierarchy
    if (lowerPath.includes("platforms/")) return "Platform";
    if (lowerPath.includes("onewayplatforms/")) return "OneWayPlatform";
    if (lowerPath.includes("walls/")) return "Wall";
    
    // Ladder types
    if (lowerPath.includes("ladders/top/")) return "LadderTopSensor";
    if (lowerPath.includes("ladders/core/")) return "LadderCoreSensor";
    if (lowerPath.includes("ladders/bottom/")) return "LadderBottomSensor";
    
    // Sensors
    if (lowerPath.includes("sensors/cameras/")) return "CameraSensor";
    
    // Special entities (check name directly)
    if (lowerPath.includes("player_start")) return "PlayerStart";
    if (lowerPath.includes("camera_start")) return "CameraStart";
    if (lowerPath.includes("trash_can")) return "TrashCan";
    if (lowerPath.includes("teleporter")) return "Teleporter";
    if (lowerPath.includes("win_flag")) return "WinFlag";
    
    // Graphics (visual only)
    if (lowerPath.includes("graphics/")) return "GraphicsObject";

    // Default to platform if unclear
    console.warn(`Unknown object type for path: ${path}, defaulting to Platform`);
    return "Platform";
  }

  /**
   * Extract vertices from mesh geometry (for line/edge platforms)
   */
  private extractVertices(mesh: THREE.Mesh): number[][] | undefined {
    const geometry = mesh.geometry;
    if (!geometry.attributes.position) return undefined;

    const positions = geometry.attributes.position;
    const vertices: number[][] = [];

    // Extract unique vertices (simplified - you may need more sophisticated logic)
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i); // Your system uses Z as vertical
      vertices.push([x, z]);
    }

    return vertices.length > 0 ? vertices : undefined;
  }

  /**
   * Convert parsed objects to LevelData format (compatible with your existing system)
   */
  private convertToLevelData(parsedObjects: ParsedObject[]): LevelData {
    const levelData: LevelData = {};

    for (const obj of parsedObjects) {
      // Build the data structure matching your existing format
      levelData[obj.name] = {
        vertices: obj.vertices || [],
        width: obj.width,
        height: obj.height,
        depth: obj.depth,
        position: obj.position,
        rotation: obj.rotation,
        type: obj.type,
        // Apply metadata from extras field with sensible defaults
        value0: this.getMetadataValue(obj, "value0", 0),
        value1: this.getMetadataValue(obj, "value1", 0),
        value2: this.getMetadataValue(obj, "value2", 0),
        value3: this.getMetadataValue(obj, "value3", 0),
      };
    }

    return levelData;
  }

  /**
   * Get metadata value from extras field with fallback to defaults
   */
  private getMetadataValue(
    obj: ParsedObject,
    key: string,
    defaultValue: number
  ): number {
    if (!obj.extras) return defaultValue;

    // Map common metadata names to value fields
    switch (obj.type) {
      case "Platform":
      case "OneWayPlatform":
        if (key === "value0") return obj.extras.floorLevel ?? defaultValue;
        if (key === "value1") return obj.extras.isEdge ? 1 : 0;
        if (key === "value2") return obj.extras.enablePoint ?? defaultValue;
        break;

      case "LadderTopSensor":
      case "LadderCoreSensor":
      case "LadderBottomSensor":
        if (key === "value0") return obj.extras.direction ?? defaultValue;
        break;

      case "CameraSensor":
        if (key === "value0" && obj.extras.target?.[0] !== undefined)
          return obj.extras.target[0];
        if (key === "value1" && obj.extras.target?.[1] !== undefined)
          return obj.extras.target[1];
        if (key === "value2" && obj.extras.target?.[2] !== undefined)
          return obj.extras.target[2];
        break;

      case "Teleporter":
        if (key === "value0" && obj.extras.destination?.[0] !== undefined)
          return obj.extras.destination[0];
        if (key === "value1" && obj.extras.destination?.[1] !== undefined)
          return obj.extras.destination[1];
        break;
    }

    return defaultValue;
  }
}
