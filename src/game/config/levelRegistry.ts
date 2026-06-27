// Single source of truth for playable levels + per-level setup. Levels are GLB-only; ResourceLoader parses each source URL into LevelData.

import setDkAttributes from "../attributes/setDkAttributes";
import setCelesteAttributes from "../attributes/setCelesteAttributes";

// Auto-discover level GLBs in src/assets/levels (Vite-bundled, hashed). Eager glob bundles EVERY .glb in the folder whether referenced or not — delete unused ones to stay lean.
const levelGlbUrls = import.meta.glob("../../assets/levels/*.glb", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

// bare filename -> bundled hashed URL
const LEVEL_SOURCES: Record<string, string> = {};
for (const path of Object.keys(levelGlbUrls)) {
  const url = levelGlbUrls[path];
  const fileName = path.split("/").pop();
  if (fileName) LEVEL_SOURCES[fileName] = url;
}

// Resolve a level GLB's bundled URL by filename (e.g. "TestLevelNew.glb").
function levelUrl(fileName: string): string {
  const url = LEVEL_SOURCES[fileName];
  if (!url) {
    console.error(
      `Level GLB "${fileName}" not found in src/assets/levels. Available: ${
        Object.keys(LEVEL_SOURCES).join(", ") || "(none)"
      }`,
    );
    return "";
  }
  return url;
}

// Feel-profile name -> setter. One identity table so data and setter can't drift.
export const FEEL_PROFILES = {
  dk: setDkAttributes,
  celeste: setCelesteAttributes,
} as const;

export type FeelProfile = keyof typeof FEEL_PROFILES;

// One playable level and the per-level setup GameDirector applies on load.
interface LevelEntry {
  // dat.gui label + GameDirector.CurrentLevelName value.
  name: string;
  // Bundled GLB URL (set via levelUrl("file.glb")) parsed by ResourceLoader.ParseLevel.
  source: string;
  // Feel profile applied to the player when this level loads.
  feelProfile: FeelProfile;
  // Whether the camera follows the player (vs a fixed single-screen view).
  cameraFollow: boolean;
  // Optional ResourceLoader.Items key for a detailed-art overlay mesh (e.g. "dkGraphicsData"). Omit if a level has no art GLB yet.
  graphics?: string;
}

// The playable levels, in cycle order. Index 0 is the default boot level.
// Add a row as you export more GLB levels from the editor.
export const LEVEL_REGISTRY: LevelEntry[] = [
  {
    name: "Slopes Testing",
    source: levelUrl("TestLevel-Slopes.glb"),
    feelProfile: "dk",
    cameraFollow: true,
    // graphics: omitted — no matched art GLB yet (see the graphics? field above).
  },
  {
    name: "Camera Testing",
    source: levelUrl("TestLevel-Camera.glb"),
    feelProfile: "dk",
    cameraFollow: false,
    // graphics: omitted — no matched art GLB yet (see the graphics? field above).
  },
  {
    name: "Donkey Kong 1981",
    source: levelUrl("DonkeyKong.glb"),
    feelProfile: "dk",
    cameraFollow: false,
    // graphics: omitted — no matched art GLB yet (see the graphics? field above).
  },
];

// Index of the level loaded on boot.
export const DEFAULT_LEVEL_INDEX = 0;
