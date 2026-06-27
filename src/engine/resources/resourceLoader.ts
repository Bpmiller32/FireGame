// Unified resource loader & level parser: loads textures and GLB models, and parses GLB level files into LevelData.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { DRACOLoader } from "three/examples/jsm/Addons.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import Emitter from "../events/eventBus";
import LevelData from "../types/levelData";

// Type definitions

// Internal representation of a parsed object from a GLB level file.
// Contains all data needed to create game objects (platforms, walls, etc.).
interface ParsedLevelObject {
  name: string;                          // Object name from 3D software
  type: string;                          // Game object type (Platform, Wall, etc.)
  position: [number, number, number];    // game slots: [gameX, gameDepth, gameUp]
  rotation: [number, number, number];    // game slots: [-, gameRotation(z), -]
  width: number;                         // game horizontal extent (glTF X)
  height: number;                        // game vertical extent (glTF Y)
  depth: number;                         // game depth extent (glTF Z)
  meta?: Record<string, string>;         // Metadata parsed from the mesh's texture name
}

// Which Three.js loader an asset needs.
type ResourceType = "texture" | "gltfModel";

// One loadable asset, batch-loaded by ResourceLoader at startup. Exported so the
// game can declare its asset manifest (see game/config/assetManifest.ts).
export interface Resource {
  name: string;       // unique key to fetch the loaded asset from Items
  type: ResourceType; // picks the loader
  path: string;       // public-relative path, absolute URL, or Vite-imported URL
}

// Resource loader class

export default class ResourceLoader {
  // Asset loading
  private sources: Resource[];
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  // A loaded gltfModel is stored as the whole GLTF object (its .scene is read by
  // CreateObjectGraphics); a texture is stored as a THREE.Texture.
  public Items: { [key: string]: GLTF | THREE.Texture };
  private toLoad: number;
  private loaded: number;

  // Level-node type vocabulary, INJECTED by the game (RegisterLevelTypes); the
  // engine's GLB parser stays type-blind.
  private levelTypes: Record<string, string> = {};

  constructor(sources: Resource[]) {
    this.sources = sources;
    this.Items = {};
    this.toLoad = sources.length;
    this.loaded = 0;

    // GLTF loader with DRACO compression support.
    this.gltfLoader = new GLTFLoader();
    // BASE_URL-relative so a sub-path deploy (e.g. GitHub Pages /FireGame/) still
    // finds the decoder instead of 404-ing and silently breaking every GLB load.
    const dracoLoader = new DRACOLoader().setDecoderPath(
      import.meta.env.BASE_URL + "draco/gltf/"
    );
    this.gltfLoader.setDRACOLoader(dracoLoader);

    // Set up Texture loader for images
    this.textureLoader = new THREE.TextureLoader();

    // Loading is NOT kicked off here: caller must subscribe the "resourcesReady"
    // listener first, then call StartLoading() — else a fast finish fires the
    // completion event into zero listeners (mitt doesn't replay) and boot hangs.
  }

  // Asset loading (textures & models)

  // Load all resources; emits "resourcesReady" once every asset loads or fails.
  // Call AFTER the "resourcesReady" listener is wired (see constructor note).
  public StartLoading() {
    // Seed a 0/total so a progress bar can appear immediately, before the first
    // asset resolves.
    Emitter.emit("loadingProgress", {
      loaded: 0,
      total: this.toLoad,
      item: "",
    });

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

  // Load a single resource (texture or 3D model)
  private loadResource(source: Resource, path: string) {
    // Callback when resource successfully loads
    const onLoad = (file: GLTF | THREE.Texture) => {
      this.Items[source.name] = file;
      this.loaded++;

      // Report progress so the loading screen can advance its bar.
      Emitter.emit("loadingProgress", {
        loaded: this.loaded,
        total: this.toLoad,
        item: source.name,
      });

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

      // Still advance the bar — a failed asset is "done" as far as progress goes.
      Emitter.emit("loadingProgress", {
        loaded: this.loaded,
        total: this.toLoad,
        item: source.name,
      });

      // If this was the last outstanding resource, let the game start anyway.
      if (this.loaded === this.toLoad) {
        Emitter.emit("resourcesReady");
      }
    };

    // Load based on type
    if (source.type === "gltfModel") {
      this.gltfLoader.load(path, onLoad, undefined, onError);
    } else if (source.type === "texture") {
      this.textureLoader.load(path, onLoad, undefined, onError);
    } else {
      console.warn(`⚠️ Unknown resource type for ${source.name}`);
    }
  }

  // Get the file path for an asset.
  // Uses imported URLs for bundled assets, or provided paths for public assets.
  private getAssetPath(source: Resource): string | undefined {
    // Manifest supplies the URL: a bundled (Vite ?url) asset is already a full
    // path; a public-folder asset just needs a leading slash.
    if (!source.path) return undefined;
    if (source.path.startsWith("/") || source.path.includes("://")) {
      return source.path;
    }
    return `/${source.path}`;
  }

  // Level parsing (GLB to game data)

  // Inject the game's level-node type vocabulary (name token -> game type). Call
  // before parsing any level, so the engine parser never names a game type.
  public RegisterLevelTypes(types: Record<string, string>) {
    this.levelTypes = types;
  }

  // Parse a GLB file (exported from BlockBench) into LevelData for the game.
  // glbPath: any URL (hashed /assets/, public path, or imported ?url).
  public async ParseLevel(glbPath: string): Promise<LevelData> {
    // Load the GLB file
    const gltf = await this.loadGLB(glbPath);
    
    // Parse the 3D scene hierarchy into game objects
    const parsedObjects = this.parseScene(gltf.scene);
    
    // Convert to LevelData the entity factories consume
    const levelData = this.convertToLevelData(parsedObjects);
    
    return levelData;
  }

  // Load a GLB file and return the GLTF data. Private helper for ParseLevel().
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

  // Recursively parse the 3D scene hierarchy. Type comes from a node's NAME (first
  // "_"-token), not its folder path — editors flatten the hierarchy on export, so
  // the name is the one stable channel. A typed node becomes ONE game object from
  // its whole subtree; do NOT recurse into it. This also merges a multi-material
  // cube's per-face primitives (under an unnamed group keeping the name) back into
  // one collider — else those "mesh_N" pieces are skipped and the platform VANISHES.
  // An untyped leaf mesh is a mis-named cube (warn); untyped groups are walked through.
  private parseScene(node: THREE.Object3D): ParsedLevelObject[] {
    const objects: ParsedLevelObject[] = [];

    const type = this.lookupCanonicalType(node.name);
    if (type) {
      // Typed node: one game object for the whole subtree; do not recurse into it.
      const parsed = this.parseTypedNode(node, type);
      if (parsed) {
        objects.push(parsed);
      }
      return objects;
    }

    // Untyped: a leaf mesh with an unrecognized name is a mis-named cube (warn);
    // a structural group is just walked through.
    if (node instanceof THREE.Mesh) {
      this.warnUnknownType(node.name);
      return objects;
    }

    for (const child of node.children) {
      for (const childObj of this.parseScene(child)) objects.push(childObj);
    }

    return objects;
  }

  // Build ONE game-object row (position, rotation, size, metadata) from a typed
  // node and its subtree, merging any multi-material per-face primitives into one.
  private parseTypedNode(
    node: THREE.Object3D,
    type: string
  ): ParsedLevelObject | null {
    // Graphics-only objects carry no physics/gameplay.
    if (type === "GraphicsObject") {
      return null;
    }

    // Collect every mesh in this node's subtree (a single cube, or the per-face
    // primitives of a multi-material cube). They share the node's local frame.
    const meshes: THREE.Mesh[] = [];
    node.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    if (meshes.length === 0) {
      return null;
    }

    // Per-entity metadata rides on the cube's TEXTURE name(s); a multi-material
    // cube may carry it on one face only, so scan every primitive and merge.
    const meta = this.readMeta(meshes);

    // Decompose the node's full WORLD transform (parents included) so a cube
    // nested under translated/rotated groups still resolves correctly.
    node.updateWorldMatrix(true, false);
    const worldTranslation = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    node.matrixWorld.decompose(worldTranslation, worldQuaternion, worldScale);

    // Collider rotation from the WORLD quaternion (LOCAL would ignore parent-group
    // rotation). A slope's tilt lands in rotation.z (glTF Z = game depth axis),
    // remapped into the game-rotation slot below.
    const rotation = new THREE.Euler().setFromQuaternion(worldQuaternion);

    // Combined LOCAL geometry box, unioned across primitives. Local extent (not a
    // world AABB) keeps a rotated slope's size true, not its tilted envelope.
    const localBox = new THREE.Box3();
    for (const mesh of meshes) {
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        localBox.union(mesh.geometry.boundingBox);
      }
    }

    // Size = LOCAL extent scaled by world-scale MAGNITUDE: abs() guards a mirrored
    // element (negative scale) from yielding a negative half-extent (degenerate collider).
    const size = new THREE.Vector3();
    localBox.getSize(size).multiply(
      new THREE.Vector3(
        Math.abs(worldScale.x),
        Math.abs(worldScale.y),
        Math.abs(worldScale.z)
      )
    );

    // Position = geometry's WORLD CENTER, not the node origin: BlockBench bakes
    // pivot offsets into vertices, so the origin is often a corner — centering
    // lands the collider where the cube is drawn (WYSIWYG), correct under rotation.
    const position = new THREE.Vector3();
    localBox.getCenter(position).applyMatrix4(node.matrixWorld);

    // glTF → game AXIS TRANSLATION (the single place this happens). Axes: gameX =
    // glTF X, gameUP = glTF Y, gameDEPTH = glTF Z. Remap into the fixed downstream
    // SLOT order ONCE here: position/rotation slots = [ gameX, gameDEPTH, gameUP ].
    // Negate the slope angle (slot[1]) so the factory's `-rotation[1]` nets to
    // +rotation.z. Single-axis slopes only; flip this sign if a slope tilts wrong.
    const parsedObject: ParsedLevelObject = {
      name: node.name,
      type: type,
      position: [position.x, position.z, position.y],
      rotation: [rotation.x, -rotation.z, rotation.y],
      width: size.x,   // game horizontal <- glTF X
      height: size.y,  // game vertical   <- glTF Y
      depth: size.z,   // game depth      <- glTF Z
      meta,
    };

    return parsedObject;
  }

  // Read the metadata-carrying texture name off a mesh. The texture NAME (e.g.
  // "floor=1 oneway=8") is a free data carrier — Three.js copies it verbatim onto
  // map.name (unlike node names, no sanitizing). Returns "" if untextured.
  private readTextureName(mesh: THREE.Mesh): string {
    let material = mesh.material;
    if (Array.isArray(mesh.material)) material = mesh.material[0];
    const map = (material as THREE.MeshStandardMaterial | undefined)?.map;
    let name = "";
    if (map && map.name) {
      name = map.name;
    }
    // Drop a trailing image-file extension, else "edge=1.png" parses its value as
    // "1.png" (not-a-number) and the flag silently reads as 0.
    return name.replace(/\.(png|jpe?g|webp|gif|bmp|tga)$/i, "");
  }

  // Merge metadata from every textured primitive into one key->value bag.
  // Untextured faces contribute nothing; on a key conflict the later face wins.
  private readMeta(meshes: THREE.Mesh[]): Record<string, string> {
    const meta: Record<string, string> = {};
    for (const mesh of meshes) {
      const textureName = this.readTextureName(mesh);
      if (!textureName) continue;
      Object.assign(meta, this.parseMetadata(textureName));
    }
    return meta;
  }

  // Parse a metadata texture name into a key->value map. Tokens are separated by
  // whitespace, comma, OR semicolon; a bare token (no "=") is a flag -> "1".
  // "_" is NOT a separator, so multi-number values (e.g. "cam=3.5_2_-1") stay intact.
  // Keys lower-cased; values stay strings, interpreted GAME-side. Engine never reads a game key.
  private parseMetadata(textureName: string): Record<string, string> {
    const meta: Record<string, string> = {};
    if (!textureName) return meta;

    for (const token of textureName.trim().split(/[\s,;]+/)) {
      if (!token) continue;
      const eq = token.indexOf("=");
      if (eq === -1) {
        meta[token.toLowerCase()] = "1"; // bare flag
      } else {
        meta[token.slice(0, eq).toLowerCase()] = token.slice(eq + 1);
      }
    }

    return meta;
  }

  // Resolve a node's game type from its NAME: first "_"-token, lower-cased, looked
  // up in the game-injected levelTypes map (so "Platform" and auto-deduped
  // "Platform_1" share a type, while OneWayPlatform stays distinct from Platform).
  // Returns undefined for an unknown name (structural group or mis-named cube).
  private lookupCanonicalType(name: string): string | undefined {
    const token = name.split("_")[0].toLowerCase();
    return this.levelTypes[token];
  }

  // Warn that a leaf mesh's name didn't resolve to a known type (so it was
  // skipped). Lists the valid type names.
  private warnUnknownType(name: string): void {
    const token = name.split("_")[0].toLowerCase();
    const seen: string[] = [];
    for (const v of Object.values(this.levelTypes)) {
      if (!seen.includes(v)) seen.push(v);
    }
    const validTypes = seen.join(", ");
    console.warn(
      `⚠️ Unknown object type for mesh "${name}" (token "${token}") — skipped.`
    );
    console.warn(
      `💡 Name the cube by its type (case-insensitive), optional "_suffix" for a 2nd instance. Valid: ${validTypes}`
    );
  }

  // Convert parsed objects to the LevelData dictionary (name -> properties)
  // consumed by the game's entity factories.
  private convertToLevelData(parsedObjects: ParsedLevelObject[]): LevelData {
    const levelData: LevelData = {};

    for (const obj of parsedObjects) {
      // Key must be unique per cube or the loser is silently DROPPED: a hand-
      // suffixed "Platform_2" can collide with a cube GLTFLoader auto-deduped to
      // the same name. Disambiguate with a "#n" suffix (map key only; entities
      // match by type, not name) so every cube survives.
      let key = obj.name;
      for (let n = 2; key in levelData; n++) {
        key = `${obj.name}#${n}`;
      }
      if (key !== obj.name) {
        console.warn(
          `⚠️ Duplicate cube name "${obj.name}" (GLTFLoader name-dedup collision) — kept as "${key}" so it isn't dropped. Use distinct names to silence.`
        );
      }

      // Pass texture-name metadata through as a generic bag; the engine parser
      // knows no game-specific key. Always set by parseTypedNode; default {} defensively.
      let meta = obj.meta;
      if (!meta) {
        meta = {};
      }
      levelData[key] = {
        width: obj.width,
        height: obj.height,
        depth: obj.depth,
        position: obj.position,
        rotation: obj.rotation,
        type: obj.type,
        meta: meta,
      };
    }

    return levelData;
  }

  // Recursively dispose every mesh's geometry + material(s) under a root object.
  private disposeObject3D(root: THREE.Object3D) {
    root.traverse((child) => {
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

  // --- Teardown ---

  // Clean up all loaded resources and free memory.
  // Call this when destroying the game or switching to a new level.
  public Destroy() {
    // Loop through all loaded items and dispose of them properly
    for (const key in this.Items) {
      const item = this.Items[key];

      if (item instanceof THREE.Texture) {
        // Free GPU texture memory
        item.dispose();
      } else if (item && typeof item === "object" && "scene" in item) {
        // GLTF object (gltfLoader returns { scene, animations, ... }).
        const gltf = item as { scene: THREE.Object3D };
        this.disposeObject3D(gltf.scene);
      }
    }
  }
}
