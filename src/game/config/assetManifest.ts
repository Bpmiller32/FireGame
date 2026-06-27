// The game's boot asset manifest, handed to the engine via Experience.Configure.
// ResourceLoader loads the given URLs and stores each by `name`; a different game
// supplies its own manifest and reuses engine/ unchanged.

import type { Resource } from "../../engine/resources/resourceLoader";

// Vite resolves these `?url` imports to bundled, content-hashed URLs at build time.
import randyUrl from "../../assets/textures/randySpriteSheet.png?url";
import enemyUrl from "../../assets/models/enemy.glb?url";
import dkGraphicsUrl from "../../assets/models/dkGraphicsData.glb?url";

// `name` is the key the game fetches the loaded asset by (Resources.Items[name]).
const GAME_ASSETS: Resource[] = [
  { name: "randy", type: "texture", path: randyUrl },
  { name: "enemy", type: "gltfModel", path: enemyUrl },
  { name: "dkGraphicsData", type: "gltfModel", path: dkGraphicsUrl },
];

export default GAME_ASSETS;
