/* -------------------------------------------------------------------------- */
/*                    UNIFIED RESOURCE LOADER & LEVEL PARSER                   */
/* -------------------------------------------------------------------------- */
/*
 * This class is your ONE-STOP SHOP for loading all game resources:
 * - Textures (sprites, UI elements, etc.)
 * - 3D Models (GLTF/GLB format with DRACO compression)
 * - Level Data (GLB files exported from 3D tools like Shapr3D or Blockbench)
 * 
 * Everything needed to load and parse game assets is centralized here for 
 * simplicity and maintainability.
 */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { DRACOLoader } from "three/examples/jsm/Addons.js";
import Emitter from "../events/eventBus";
import Resource from "../types/resource";
import LevelData from "../../game/types/levelData";

// Import your game assets (Vite handles the paths automatically)
import dkGraphicsModel from "../../assets/models/dkGraphicsData.glb?url";
import enemyModel from "../../assets/models/enemy.glb?url";
import spriteSheet from "../../assets/textures/randySpriteSheet.png?url";

/* -------------------------------------------------------------------------- */
/*                            TYPE DEFINITIONS                                */
/* -------------------------------------------------------------------------- */

/**
 * Internal representation of a parsed object from a GLB level file
 * Contains all data needed to create game objects (platforms, walls, etc.)
 */
interface ParsedLevelObject {
  name: string;                          // Object name from 3D software
  type: string;                          // Game object type (Platform, Wall, etc.)
  position: [number, number, number];    // World position [x, y, z]
  rotation: [number, number, number];    // Euler rotation [x, y, z]
  width: number;                         // Object width
  height: number;                        // Object height
  depth: number;                         // Object depth
  vertices?: number[][];                 // Optional vertices for complex shapes
  extras?: Record<string, any>;          // Optional metadata from GLTF extras field
}

/* -------------------------------------------------------------------------- */
/*                          RESOURCE LOADER CLASS                             */
/* -------------------------------------------------------------------------- */

export default class ResourceLoader {
  // Asset loading
  private sources: Resource[];
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  public Items: { [key: string]: THREE.Object3D | THREE.Texture };
  private toLoad: number;
  private loaded: number;

  constructor(sources: Resource[]) {
    this.sources = sources;
    this.Items = {};
    this.toLoad = sources.length;
    this.loaded = 0;

    // Set up GLTF loader with DRACO compression support
    // DRACO significantly reduces file sizes for 3D models
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader().setDecoderPath("/draco/gltf/");
    this.gltfLoader.setDRACOLoader(dracoLoader);

    // Set up Texture loader for images
    this.textureLoader = new THREE.TextureLoader();

    // Start loading all resources immediately
    this.startLoading();
  }

  /* -------------------------------------------------------------------------- */
  /*                        ASSET LOADING (TEXTURES & MODELS)                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Start loading all resources defined in sources array
   * Emits "resourcesReady" event when all assets are loaded
   */
  private startLoading() {
    for (const source of this.sources) {
      // Get the file path of the asset
      const assetPath = this.getAssetPath(source);

      // Skip if there's no valid path
      if (!assetPath) {
        console.warn(`⚠️ No valid path for resource: ${source.name}`);
        continue;
      }

      // Load the resource
      this.loadResource(source, assetPath);
    }
  }

  /**
   * Load a single resource (texture or 3D model)
   */
  private loadResource(source: Resource, path: string) {
    // Callback when resource successfully loads
    const onLoad = (file: THREE.Object3D | THREE.Texture) => {
      this.Items[source.name] = file;
      this.loaded++;

      // Check if all resources are loaded
      if (this.loaded === this.toLoad) {
        Emitter.emit("resourcesReady");
      }
    };

    // Callback when resource fails to load
    const onError = (error: any) => {
      console.error(`❌ Failed to load ${source.name}:`, error);

      // Count the failed load so a single 404 can't hang the loader forever,
      // and tell anyone listening which resource failed.
      this.loaded++;
      Emitter.emit("resourceLoadFailed", source.name);

      // If this was the last outstanding resource, let the game start anyway.
      if (this.loaded === this.toLoad) {
        Emitter.emit("resourcesReady");
      }
    };

    // Load based on type
    if (source.type === "gltfModel") {
      this.gltfLoader.load(path, onLoad as any, undefined, onError);
    } else if (source.type === "texture") {
      this.textureLoader.load(path, onLoad as any, undefined, onError);
    } else {
      console.warn(`⚠️ Unknown resource type for ${source.name}`);
    }
  }

  /**
   * Get the file path for an asset
   * Uses imported URLs for bundled assets, or provided paths for public assets
   */
  private getAssetPath(source: Resource): string | undefined {
    // Map of bundled assets (imported at top of file)
    const assetPaths: { [key: string]: string } = {
      dkGraphicsData: dkGraphicsModel,
      enemy: enemyModel,
      randy: spriteSheet,
    };

    // If we have a bundled asset, use its imported URL
    if (source.name in assetPaths) {
      return assetPaths[source.name];
    }

    // Otherwise use the provided path from public folder
    // Ensure it starts with a forward slash for proper URL resolution
    return source.path.startsWith("/") ? source.path : `/${source.path}`;
  }

  /* -------------------------------------------------------------------------- */
  /*                    LEVEL PARSING (GLB TO GAME DATA)                        */
  /* -------------------------------------------------------------------------- */

  /**
   * Parse a GLB file into LevelData format for your game
   * 
   * This is your main method for loading levels! It takes a GLB file exported 
   * from tools like Shapr3D or Blockbench and converts it into the LevelData 
   * format that your game understands.
   * 
   * @param glbPath - Path to GLB file. Can be:
   *   - Public folder path: "/levels/MyLevel.glb"
   *   - Imported URL: import MyLevel from "file.glb?url"
   * 
   * @returns Promise<LevelData> - Parsed level data ready for game use
   * 
   * @example
   * // Load from public folder
   * const level = await resourceLoader.parseLevel("/levels/TestLevel.glb");
   * 
   * @example
   * // Load from imported file
   * import MyLevelUrl from "../levels/MyLevel.glb?url";
   * const level = await resourceLoader.parseLevel(MyLevelUrl);
   */
  public async ParseLevel(glbPath: string): Promise<LevelData> {
    // Load the GLB file
    const gltf = await this.loadGLB(glbPath);
    
    // Parse the 3D scene hierarchy into game objects
    const parsedObjects = this.parseScene(gltf.scene);
    
    // Convert to LevelData format compatible with your game
    const levelData = this.convertToLevelData(parsedObjects);
    
    return levelData;
  }

  /**
   * Load a GLB file and return the GLTF data
   * Private helper for parseLevel()
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
   * Recursively parse the 3D scene hierarchy
   * 
   * Walks through the scene tree and extracts all mesh objects.
   * Uses folder paths and object names to determine game object types.
   * 
   * @param node - Three.js Object3D node to parse
   * @param parentPath - Accumulated folder path (for type detection)
   */
  private parseScene(
    node: THREE.Object3D,
    parentPath: string = ""
  ): ParsedLevelObject[] {
    const objects: ParsedLevelObject[] = [];

    // Build current path for type detection (e.g., "Platforms/Floor1")
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    // If this node has geometry, it's a game object we need to parse
    if (node instanceof THREE.Mesh) {
      const parsed = this.parseMeshObject(node, currentPath);
      if (parsed) {
        objects.push(parsed);
      }
    }

    // Recursively parse all children
    for (const child of node.children) {
      objects.push(...this.parseScene(child, currentPath));
    }

    return objects;
  }

  /**
   * Parse a single mesh object into game data
   * Extracts position, rotation, size, and metadata
   */
  private parseMeshObject(
    mesh: THREE.Mesh,
    path: string
  ): ParsedLevelObject | null {
    // Determine what type of game object this is
    const type = this.getObjectType(path);
    
    // Skip graphics-only objects (no physics/gameplay) and unknown-typed
    // meshes (see getObjectType fallback) — neither becomes a game object.
    if (type === "GraphicsObject" || type === "Unknown") {
      return null;
    }

    // Extract world position
    const position = new THREE.Vector3();
    mesh.getWorldPosition(position);

    // Extract world rotation
    const rotation = new THREE.Euler();
    mesh.getWorldQuaternion(new THREE.Quaternion()).normalize();
    rotation.setFromQuaternion(mesh.quaternion);

    // Calculate object dimensions from bounding box
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Read optional metadata from GLTF extras field
    // (You can add custom properties in your 3D software)
    const extras = (mesh.userData as any)?.gltfExtras || {};

    // Build parsed object with all data
    const parsedObject: ParsedLevelObject = {
      name: mesh.name,
      type: type,
      // Store position/rotation as-is from Three.js (Y-up coordinate system)
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      // Store dimensions (adapt to your game's coordinate conventions)
      width: size.x,
      height: size.z,  // Your game uses Z as vertical axis
      depth: size.y,   // Your game uses Y as depth axis
      extras: extras,
    };

    // Extract vertices for complex shapes (line platforms, edge platforms)
    if (type.includes("Line") || type.includes("Edge")) {
      parsedObject.vertices = this.extractVertices(mesh);
    }

    return parsedObject;
  }

  /**
   * Determine game object type from folder path OR object name
   * 
   * This method makes level creation flexible - you can use either:
   * 1. Folder hierarchy (Shapr3D style): "Platforms/Floor1", "Walls/Left"
   * 2. Object naming (Blockbench style): "platform-1", "wall-left"
   * 
   * The method checks both to maximize compatibility with different workflows.
   */
  private getObjectType(path: string): string {
    const lowerPath = path.toLowerCase();
    const lowerName = path.split("/").pop()?.toLowerCase() || "";

    // ===== NAME-BASED DETECTION (Works with any 3D software) =====
    
    // Platforms (floors, ground)
    if (lowerName.includes("platform") || lowerName.includes("floor") || lowerName.includes("ground")) {
      return "Platform";
    }
    
    // Walls (barriers, boundaries)
    if (lowerName.includes("wall") || lowerName.includes("barrier")) {
      return "Wall";
    }
    
    // Special spawn points
    if (lowerName.includes("player") || lowerName.includes("spawn")) {
      return "PlayerStart";
    }
    if (lowerName.includes("camera_start") || lowerName.includes("camerastart")) {
      return "CameraStart";
    }
    
    // Ladder sensors (climbing areas)
    if (lowerName.includes("ladder")) {
      if (lowerName.includes("top")) return "LadderTopSensor";
      if (lowerName.includes("core") || lowerName.includes("middle")) return "LadderCoreSensor";
      if (lowerName.includes("bottom") || lowerName.includes("base")) return "LadderBottomSensor";
      return "LadderCoreSensor"; // Default for generic "ladder" name
    }
    
    // Interactive objects
    if (lowerName.includes("trash") || lowerName.includes("can")) return "TrashCan";
    if (lowerName.includes("teleporter") || lowerName.includes("portal")) return "Teleporter";
    if (lowerName.includes("win") || lowerName.includes("flag") || lowerName.includes("goal")) return "WinFlag";
    if (lowerName.includes("enemy")) return "Enemy";
    if (lowerName.includes("sensor") || lowerName.includes("trigger")) return "CameraSensor";

    // ===== FOLDER-BASED DETECTION (Shapr3D hierarchy) =====
    // Useful when organizing complex levels with many objects
    
    if (lowerPath.includes("platforms/")) return "Platform";
    if (lowerPath.includes("onewayplatforms/")) return "OneWayPlatform";
    if (lowerPath.includes("walls/")) return "Wall";
    
    if (lowerPath.includes("ladders/top/")) return "LadderTopSensor";
    if (lowerPath.includes("ladders/core/")) return "LadderCoreSensor";
    if (lowerPath.includes("ladders/bottom/")) return "LadderBottomSensor";
    
    if (lowerPath.includes("sensors/cameras/")) return "CameraSensor";
    if (lowerPath.includes("graphics/")) return "GraphicsObject";

    // ===== FALLBACK: Unknown Type =====
    // If we can't determine the type, warn and skip it. Returning "Platform"
    // here used to spawn an invisible solid wall the player would hit for no
    // visible reason — skipping (like GraphicsObject) is far less surprising.
    console.warn(`⚠️ Unknown object type for: "${path}"`);
    console.warn(`💡 Tip: Name objects clearly like: "platform-1", "wall-left", "player-start"`);
    return "Unknown"; // Skipped in parseMeshObject (see GraphicsObject)
  }

  /**
   * Extract vertices from mesh geometry
   * Used for line platforms and edge platforms that need custom collision shapes
   */
  private extractVertices(mesh: THREE.Mesh): number[][] | undefined {
    const geometry = mesh.geometry;
    if (!geometry.attributes.position) return undefined;

    const positions = geometry.attributes.position;
    const vertices: number[][] = [];

    // Extract vertex positions
    // (You may need more sophisticated logic for complex shapes)
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i); // Z is vertical in your game
      vertices.push([x, z]);
    }

    return vertices.length > 0 ? vertices : undefined;
  }

  /**
   * Convert parsed objects to LevelData format
   * 
   * This creates the final data structure that your game expects.
   * LevelData is a dictionary mapping object names to their properties.
   */
  private convertToLevelData(parsedObjects: ParsedLevelObject[]): LevelData {
    const levelData: LevelData = {};

    for (const obj of parsedObjects) {
      // Build the data structure matching your existing game format
      levelData[obj.name] = {
        vertices: obj.vertices || [],
        width: obj.width,
        height: obj.height,
        depth: obj.depth,
        position: obj.position,
        rotation: obj.rotation,
        type: obj.type,
        // Extract metadata from GLTF extras field with sensible defaults
        // These value0-3 fields store game-specific data like floor levels,
        // ladder directions, camera targets, etc.
        value0: this.getMetadataValue(obj, "value0", 0),
        value1: this.getMetadataValue(obj, "value1", 0),
        value2: this.getMetadataValue(obj, "value2", 0),
        value3: this.getMetadataValue(obj, "value3", 0),
      };
    }

    return levelData;
  }

  /**
   * Get metadata value from GLTF extras field
   * 
   * Maps semantic metadata names to the generic value0-3 fields.
   * This allows you to use friendly names in your 3D software like "floorLevel"
   * instead of remembering which value index to use.
   * 
   * @example
   * In Blockbench/Shapr3D extras:
   * { "floorLevel": 2, "isEdge": true }
   * 
   * Gets mapped to:
   * { value0: 2, value1: 1, value2: 0, value3: 0 }
   */
  private getMetadataValue(
    obj: ParsedLevelObject,
    key: string,
    defaultValue: number
  ): number {
    if (!obj.extras) return defaultValue;

    // Map metadata based on object type
    // Each object type has different meaningful metadata fields
    switch (obj.type) {
      case "Platform":
      case "OneWayPlatform":
        // value0 = floor level (for multi-story games)
        if (key === "value0") return obj.extras.floorLevel ?? defaultValue;
        // value1 = is edge platform (1 = yes, 0 = no)
        if (key === "value1") return obj.extras.isEdge ? 1 : 0;
        // value2 = one-way platform enable point (Y position where it becomes solid)
        if (key === "value2") return obj.extras.enablePoint ?? defaultValue;
        break;

      case "LadderTopSensor":
      case "LadderCoreSensor":
      case "LadderBottomSensor":
        // value0 = direction (-1 for left, 1 for right, 0 for neutral)
        if (key === "value0") return obj.extras.direction ?? defaultValue;
        break;

      case "CameraSensor":
        // value0, value1, value2 = camera target position [x, y, z]
        if (key === "value0" && obj.extras.target?.[0] !== undefined)
          return obj.extras.target[0];
        if (key === "value1" && obj.extras.target?.[1] !== undefined)
          return obj.extras.target[1];
        if (key === "value2" && obj.extras.target?.[2] !== undefined)
          return obj.extras.target[2];
        break;

      case "Teleporter":
        // value0, value1 = destination position [x, y]
        if (key === "value0" && obj.extras.destination?.[0] !== undefined)
          return obj.extras.destination[0];
        if (key === "value1" && obj.extras.destination?.[1] !== undefined)
          return obj.extras.destination[1];
        break;
    }

    return defaultValue;
  }

  /* -------------------------------------------------------------------------- */
  /*                              CLEANUP                                       */
  /* -------------------------------------------------------------------------- */

  /**
   * Clean up all loaded resources and free memory
   * Call this when destroying the game or switching to a new level
   */
  public Destroy() {
    // Remove event listeners
    Emitter.off("resourcesReady");

    // Loop through all loaded items and dispose of them properly
    for (const key in this.Items) {
      const item = this.Items[key];

      if (item instanceof THREE.Texture) {
        // Free GPU texture memory
        item.dispose();
      } else if (item instanceof THREE.Object3D) {
        // Three.js Object3D (Group, Mesh, etc.) — traverse and dispose all children
        item.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: THREE.Material) => mat.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      } else if (item && typeof item === "object" && "scene" in item) {
        // GLTF object — stored via gltfLoader which returns { scene, animations, ... }
        // The items type doesn't capture this but the loader stores GLTF objects directly
        const gltf = item as { scene: THREE.Object3D };
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: THREE.Material) => mat.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
    }
  }
}
