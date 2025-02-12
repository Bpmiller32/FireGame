import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { DRACOLoader } from "three/examples/jsm/Addons.js";
import Emitter from "./eventEmitter";
import Resource from "./types/resource";

import dkGraphicsModel from "../../assets/models/dkGraphicsData.glb?url";
import enemyModel from "../../assets/models/enemy.glb?url";
import spriteSheet from "../../assets/textures/randySpriteSheet.png?url";

export default class ResourceLoader {
  private sources: Resource[];
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  public items: { [key: string]: THREE.Object3D | THREE.Texture };
  private toLoad: number;
  private loaded: number;

  constructor(sources: Resource[]) {
    this.sources = sources;
    this.items = {};
    this.toLoad = sources.length;
    this.loaded = 0;

    // Set up GLTF and DRACO loaders
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader().setDecoderPath("/draco/gltf/");
    this.gltfLoader.setDRACOLoader(dracoLoader);

    // Set up Texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Start loading all resources
    this.startLoading();
  }

  private startLoading() {
    // console.log("Starting to load resources:", this.sources);

    for (const source of this.sources) {
      // Get the file path of the asset
      const assetPath = this.getAssetPath(source);

      // Skip if there's no valid path
      if (!assetPath) {
        console.warn(`No valid path for ${source.name}`);
        continue;
      }

      // Load the resource
      // console.log(`Loading resource ${source.name} from path:`, assetPath);
      this.loadResource(source, assetPath);
    }
  }

  private loadResource(source: Resource, path: string) {
    // Callback when resource successfully loads
    const onLoad = (file: THREE.Object3D | THREE.Texture) => {
      // console.log(`Successfully loaded ${source.name}`);
      this.items[source.name] = file;
      this.loaded++;

      if (this.loaded === this.toLoad) {
        // console.log("All resources successfully loaded");
        Emitter.emit("resourcesReady");
      }
    };

    // Callback when resource fails to load
    const onError = () => {
      console.error(`Failed to load ${source.name}`);
    };

    // Load based on type
    if (source.type === "gltfModel") {
      this.gltfLoader.load(path, onLoad as any, undefined, onError);
    } else if (source.type === "texture") {
      this.textureLoader.load(path, onLoad as any, undefined, onError);
    } else {
      console.warn(`Unknown resource type for ${source.name}`);
    }
  }

  private getAssetPath(source: Resource): string | undefined {
    // Use the imported URLs if available, otherwise use the provided path
    const assetPaths: { [key: string]: string } = {
      dkGraphicsData: dkGraphicsModel,
      enemy: enemyModel,
      randy: spriteSheet,
    };

    // If we have a predefined path in assetPaths, use that
    if (source.name in assetPaths) {
      return assetPaths[source.name];
    }

    // Otherwise use the provided path, ensuring it starts with a forward slash
    return source.path.startsWith("/") ? source.path : `/${source.path}`;
  }

  public destroy() {
    // Remove event listeners
    Emitter.off("resourcesReady");

    // Loop through loaded items and dispose of them properly
    for (const key in this.items) {
      const item = this.items[key];

      if (item instanceof THREE.Texture) {
        // Free texture memory
        item.dispose();
      } else if (item instanceof THREE.Mesh) {
        // Dispose of geometry
        item.geometry?.dispose();

        // Dispose of material(s)
        if (Array.isArray(item.material)) {
          item.material.forEach((mat) => mat.dispose());
        } else {
          item.material?.dispose();
        }
      }
    }
  }
}
