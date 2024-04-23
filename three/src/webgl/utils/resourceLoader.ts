/* -------------------------------------------------------------------------- */
/*          Used to centralize all asset loading in a dedicated class         */
/* -------------------------------------------------------------------------- */

import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import EventEmitter from "./eventEmitter";

interface IResource {
  name: string;
  type: string;
  path: string;
}

export default class ResourceLoader extends EventEmitter {
  sources: IResource[];
  items: { [key: string]: any };
  toLoad: number;
  loaded: number;

  gltfLoader?: GLTFLoader;
  dracoLoader?: DRACOLoader;

  constructor(sources: IResource[]) {
    super();

    this.sources = sources;
    this.items = {};
    this.toLoad = this.sources.length;
    this.loaded = 0;

    this.setLoaders();
    this.startLoading();
  }

  setLoaders() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);
  }

  startLoading() {
    for (const source of this.sources) {
      if (source.type === "gltfModel") {
        this.gltfLoader?.load(source.path, (file) => {
          this.sourceLoaded(source, file);
        });
      }
    }
  }

  sourceLoaded(source: IResource, file: any) {
    this.items[source.name] = file;
    this.loaded++;

    if (this.loaded === this.toLoad) {
      this.trigger("ready");
    }
  }
}
