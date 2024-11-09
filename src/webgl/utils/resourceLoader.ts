/* -------------------------------------------------------------------------- */
/*          Used to centralize all asset loading in a dedicated class         */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import Emitter from "./eventEmitter";
import Resource from "./types/resource";

export default class ResourceLoader {
  private sources: Resource[];

  private gltfLoader?: GLTFLoader;
  private textureLoader?: THREE.TextureLoader;

  public items: { [key: string]: any };
  public toLoad: number;
  public loaded: number;

  constructor(sources: Resource[]) {
    this.sources = sources;
    this.items = {};
    this.toLoad = this.sources.length;
    this.loaded = 0;

    this.setLoaders();
    this.startLoading();
  }

  private setLoaders() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.textureLoader = new THREE.TextureLoader();
  }

  private startLoading() {
    for (const source of this.sources) {
      switch (source.type) {
        case "gltfModel":
          this.gltfLoader?.load(source.path, (file) => {
            this.sourceLoaded(source, file);
          });
          break;

        case "texture":
          this.textureLoader?.load(source.path, (file) => {
            this.sourceLoaded(source, file);
          });
          break;

        default:
          break;
      }
    }
  }

  private sourceLoaded(source: Resource, file: any) {
    this.items[source.name] = file;
    this.loaded++;

    if (this.loaded === this.toLoad) {
      Emitter.emit("resourcesReady");
    }
  }

  public destroy() {
    // Clear event listeners
    Emitter.off("resourcesReady");

    // Dispose of loaded textures
    for (const key in this.items) {
      const item = this.items[key];

      if (item instanceof THREE.Texture) {
        // Dispose of texture
        item.dispose();
      } else if (item instanceof THREE.Mesh) {
        // Dispose of the meshes if loaded (to free geometries, materials, etc.)
        if (item.geometry) {
          item.geometry.dispose();
        }

        if (item.material) {
          item.material.dispose();
        }
      }
    }

    // Nullify items and sources to release references
    this.items = {};
    this.sources = [];

    // Nullify loaders
    this.gltfLoader = null as any;
    this.textureLoader = null as any;
  }
}
