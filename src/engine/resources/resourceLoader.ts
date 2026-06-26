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

  // Level-node type vocabulary, INJECTED by the game (RegisterLevelTypes). The
  // engine's GLB parser is type-blind — it no longer mirrors EntityType by hand.
  private levelTypes: Record<string, string> = {};

  constructor(sources: Resource[]) {
    this.sources = sources;
    this.Items = {};
    this.toLoad = sources.length;
    this.loaded = 0;

    // Set up GLTF loader with DRACO compression support
    // DRACO significantly reduces file sizes for 3D models
    this.gltfLoader = new GLTFLoader();
    // BASE_URL-relative so a sub-path deploy (e.g. GitHub Pages /FireGame/) still
    // finds the decoder instead of 404-ing and silently breaking every GLB load.
    const dracoLoader = new DRACOLoader().setDecoderPath(
      import.meta.env.BASE_URL + "draco/gltf/"
    );
    this.gltfLoader.setDRACOLoader(dracoLoader);

    // Set up Texture loader for images
    this.textureLoader = new THREE.TextureLoader();

    // NOTE: loading is deliberately NOT kicked off here. The caller invokes
    // StartLoading() only AFTER the "resourcesReady" listener (GameDirector) is
    // subscribed — otherwise, if every asset resolves during the await window in
    // Experience.Configure (RAPIER.init etc.), the completion event would fire
    // into zero listeners and be lost (mitt does not buffer/replay), hanging the
    // boot on the loading screen forever.
  }

  // Asset loading (textures & models)

  // Start loading all resources defined in the sources array. Call this AFTER
  // the "resourcesReady" listener is wired (see the constructor note). Emits
  // "resourcesReady" once every asset has loaded or failed.
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
    // The game's manifest supplies the URL directly: a bundled (Vite ?url) asset
    // already resolves to a full path; a public-folder asset just needs a leading
    // slash. The engine no longer hardcodes any game asset.
    if (!source.path) return undefined;
    if (source.path.startsWith("/") || source.path.includes("://")) {
      return source.path;
    }
    return `/${source.path}`;
  }

  // Level parsing (GLB to game data)

  // Inject the game's level-node type vocabulary (name token -> game type). Call
  // before parsing any level (App.vue does, at boot). Keeps the engine parser from
  // ever naming a game type.
  public RegisterLevelTypes(types: Record<string, string>) {
    this.levelTypes = types;
  }

  // Parse a GLB file (exported from BlockBench) into LevelData for the game.
  // glbPath: any URL — here resolved by the level registry's levelUrl() (a hashed
  // /assets/... URL), but a raw public-folder path or an imported `?url` works too.
  // Returns the parsed LevelData ready for game use.
  public async ParseLevel(glbPath: string): Promise<LevelData> {
    // Load the GLB file
    const gltf = await this.loadGLB(glbPath);
    
    // Parse the 3D scene hierarchy into game objects
    const parsedObjects = this.parseScene(gltf.scene);
    
    // Convert to LevelData format compatible with your game
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

  // Recursively parse the 3D scene hierarchy.
  // Type comes from a node's NAME (its first "_"-token), not its folder path —
  // editors like BlockBench flatten/rename the group hierarchy on glTF export, so
  // the name is the one stable channel. A node whose name resolves to a known
  // type becomes ONE game object built from its whole subtree's geometry, and we
  // do NOT recurse into it. That single rule covers two export shapes:
  //   - a normal single-material cube → one THREE.Mesh named e.g. "Platform";
  //   - a MULTI-material cube (a metadata texture on only some faces) → Three
  //     splits it into per-face primitive meshes under an (unnamed) GROUP that
  //     keeps the "Platform" name. Reading the group name + merging the split
  //     primitives recovers it as one collider — otherwise the unnamed pieces
  //     (named "mesh_N") were silently skipped and the platform VANISHED.
  // A leaf mesh whose name is NOT a known type is a genuinely mis-named cube and
  // warns; structural (untyped) groups are just walked through.
  // node: Three.js Object3D node to parse.
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

  // Build ONE game-object row from a typed node and its subtree (position,
  // rotation, size, metadata). The meshes are the node itself for a normal cube,
  // or the per-face primitives of a multi-material cube — merged here into one.
  private parseTypedNode(
    node: THREE.Object3D,
    type: string
  ): ParsedLevelObject | null {
    // Graphics-only objects carry no physics/gameplay.
    if (type === "GraphicsObject") {
      return null;
    }

    // Collect every mesh in this node's subtree: the node itself for a normal
    // single-material cube, or the per-face primitive meshes that Three split a
    // MULTI-material cube into (see parseScene). They share the node's local
    // frame, so they are merged back into the one cube below.
    const meshes: THREE.Mesh[] = [];
    node.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    if (meshes.length === 0) {
      return null;
    }

    // Per-entity metadata rides on the cube's TEXTURE name(s). For a multi-
    // material cube the metadata texture may sit on a single face, so scan every
    // primitive and merge what is found.
    const meta = this.readMeta(meshes);

    // Decompose the node's full WORLD transform (parents included) into
    // translation / rotation / scale, so a cube nested under translated or
    // rotated groups still resolves correctly.
    node.updateWorldMatrix(true, false);
    const worldTranslation = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    node.matrixWorld.decompose(worldTranslation, worldQuaternion, worldScale);

    // Collider rotation from the WORLD quaternion. For a tilted cube (a slope)
    // built in BlockBench's X×Y plane, the angle lands in rotation.z (rotation
    // about glTF Z, which is the game's depth axis); it is remapped into the
    // game-rotation slot below and the entity factory negates it. (Reading the
    // LOCAL quaternion was the old bug — it ignored any parent-group rotation.)
    const rotation = new THREE.Euler().setFromQuaternion(worldQuaternion);

    // Combined LOCAL geometry box, unioned across every primitive (all share the
    // node's local frame). Using the local extent (not a world AABB) keeps a
    // rotated slope's size true instead of inflating it to its tilted envelope.
    const localBox = new THREE.Box3();
    for (const mesh of meshes) {
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        localBox.union(mesh.geometry.boundingBox);
      }
    }

    // Size = the LOCAL geometry extent scaled by the world-scale MAGNITUDE. The
    // extent (not a world AABB via setFromObject) keeps a rotated cube's size
    // true instead of inflating it to its tilted envelope; abs() guards a
    // mirrored element — whose decomposed scale is negative — from yielding a
    // negative half-extent (a degenerate collider). Byte-identical to the old
    // world-AABB for an axis-aligned, unmirrored cube.
    const size = new THREE.Vector3();
    localBox.getSize(size).multiply(
      new THREE.Vector3(
        Math.abs(worldScale.x),
        Math.abs(worldScale.y),
        Math.abs(worldScale.z)
      )
    );

    // Position = the geometry's WORLD CENTER, not the node origin. BlockBench
    // bakes pivot offsets into the vertices of stretched / multi-cube elements,
    // so the node origin is often a corner; centering on the geometry makes the
    // collider land exactly where the cube is drawn (WYSIWYG), and stays correct
    // under rotation.
    const position = new THREE.Vector3();
    localBox.getCenter(position).applyMatrix4(node.matrixWorld);

    // ── glTF → game AXIS TRANSLATION (the single place this happens) ─────────
    // BlockBench/glTF and this 2D game share axes: gameX = glTF X (horizontal),
    // gameUP = glTF Y (vertical), gameDEPTH = glTF Z (into-screen). So a platform
    // you build along BlockBench's X (wide) × Y (tall) plane maps straight to the
    // game's horizontal × vertical plane. (Previously the parser treated glTF Z
    // as "up", forcing you to build along BlockBench's Z — that's the bug being
    // fixed here.)
    //
    // The downstream readers (entity factories + setPlayerStart/setCameraStart)
    // consume a fixed SLOT order, so we remap into it ONCE here:
    //   position/rotation slots = [ gameX , gameDEPTH , gameUP ]
    //     factories read slot[0]=x, slot[2]=up; setCameraStart reads slot[1]=depth.
    //   size = width(gameX) / height(gameUP) / depth(gameDEPTH).
    // A slope's angle is a rotation about glTF Z → it lands in slot[1]. We negate
    // it so the factory's `-rotation[1]` nets to +rotation.z, making a BlockBench
    // CCW rotation read as the SAME direction in-game (without the negation it
    // came out mirrored). Single-axis slopes only; flip this sign if a slope ever
    // tilts the wrong way.
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

  // Read the metadata-carrying texture name off a mesh.
  // Collision geometry and graphics are separate layers, so a collision mesh's
  // texture is a free data carrier: its NAME (e.g. "floor=1 oneway=8") encodes
  // per-entity metadata. Three.js copies the glTF texture name verbatim onto
  // material.map.name (it does NOT sanitize it the way it does node names), so
  // "=", ".", "_" and spaces all survive. Returns "" when the mesh has no
  // textured material.
  private readTextureName(mesh: THREE.Mesh): string {
    let material = mesh.material;
    if (Array.isArray(mesh.material)) material = mesh.material[0];
    const map = (material as THREE.MeshStandardMaterial | undefined)?.map;
    const name = map?.name ?? "";
    // Drop a trailing image-file extension. A texture that inherited its image's
    // filename (e.g. "edge=1.png" instead of "edge=1") would otherwise parse the
    // value as "1.png" — not-a-number — so the flag would silently read as 0.
    return name.replace(/\.(png|jpe?g|webp|gif|bmp|tga)$/i, "");
  }

  // Merge the metadata from every textured primitive of a (possibly multi-material)
  // cube into one key->value bag. Untextured faces contribute nothing; on a key
  // conflict the later face wins.
  private readMeta(meshes: THREE.Mesh[]): Record<string, string> {
    const meta: Record<string, string> = {};
    for (const mesh of meshes) {
      const textureName = this.readTextureName(mesh);
      if (!textureName) continue;
      Object.assign(meta, this.parseMetadata(textureName));
    }
    return meta;
  }

  // Parse a metadata texture name into a key->value map.
  // Format: `key=value` tokens separated by whitespace, comma, OR semicolon —
  // e.g. "floor=1 edge=1 oneway=8", "floor=1,edge=1", or "floor=1;edge=1". (All
  // three work, so authors use whatever their editor lets them type in a texture
  // name.) A bare token (no "=") is a flag and maps to "1" (so "edge" ==
  // "edge=1"). Multi-number values use "_" between components (e.g. "cam=3.5_2_-1")
  // — "_" is NOT a token separator, so those stay intact.
  // Values stay as strings here and are emitted as a generic `meta` bag; per-type
  // interpretation (numbers, "_"-separated coord lists) happens GAME-side in the
  // entity factories. Keys are lower-cased. The engine never reads a game key.
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

  // Resolve a node's game object type from its NAME (exact canonical-token match,
  // case-insensitive): the first "_"-token, lower-cased, looked up in the
  // game-injected levelTypes map (so "OneWayPlatform", "OneWayPlatform_2", and
  // Three's auto-deduped "OneWayPlatform_1" all resolve to the same type, and
  // OneWayPlatform stays distinct from Platform). Returns undefined for a name that
  // is not a known type (a structural group, or a mis-named cube) — the caller
  // decides whether to recurse into it or warn. The vocabulary now lives in the
  // GAME (config/levelNodeTypes.ts), injected via RegisterLevelTypes — the engine
  // no longer holds a hand-synced mirror of EntityType.
  private lookupCanonicalType(name: string): string | undefined {
    const token = name.split("_")[0].toLowerCase();
    return this.levelTypes[token];
  }

  // Warn that a leaf mesh's name did not resolve to a known type, so it was
  // skipped — far less surprising than the old fallback that spawned an invisible
  // solid platform. Lists the valid type names.
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

  // Convert parsed objects to LevelData format.
  // This creates the final data structure that your game expects. LevelData is a
  // dictionary mapping object names to their properties.
  private convertToLevelData(parsedObjects: ParsedLevelObject[]): LevelData {
    const levelData: LevelData = {};

    for (const obj of parsedObjects) {
      // The dictionary key must be unique per cube or the loser is silently
      // DROPPED. GLTFLoader dedups duplicate node names, but its counter is
      // per-base-name, so a hand-suffixed cube ("Platform_2") collides with a
      // plain cube whose name auto-deduped to the same string (the 3rd "Platform"
      // -> "Platform_2"). Disambiguate with a "#n" suffix so every cube survives;
      // the suffix is only the map key (entities are matched by type, not name).
      let key = obj.name;
      for (let n = 2; key in levelData; n++) {
        key = `${obj.name}#${n}`;
      }
      if (key !== obj.name) {
        console.warn(
          `⚠️ Duplicate cube name "${obj.name}" (GLTFLoader name-dedup collision) — kept as "${key}" so it isn't dropped. Use distinct names to silence.`
        );
      }

      // Pass the parsed texture-name metadata straight through as a generic bag.
      // The game-side entity factories interpret the keys per type — the engine
      // parser deliberately does NOT know any game-specific key (floor/cam/etc.).
      levelData[key] = {
        width: obj.width,
        height: obj.height,
        depth: obj.depth,
        position: obj.position,
        rotation: obj.rotation,
        type: obj.type,
        meta: obj.meta ?? {},
      };
    }

    return levelData;
  }

  // Cleanup

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
        // GLTF object — stored via gltfLoader which returns { scene, animations, ... }
        // The items type doesn't capture this but the loader stores GLTF objects directly
        const gltf = item as { scene: THREE.Object3D };
        this.disposeObject3D(gltf.scene);
      }
    }
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
}
