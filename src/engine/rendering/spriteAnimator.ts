// Used to animate a THREE sprite using a spritesheet

import * as THREE from "three";

// One spritesheet animation: which tiles to show and for how long.
interface SpriteState {
  indicies: number[]; // tile indices, left-to-right top-to-bottom from 0 (typo kept on purpose)
  timing: number[]; // seconds per frame; same length as indicies
}

export default class SpriteAnimator {
  private currentTile: number;
  private elapsedTime: number;
  private runningTileIndex: number; // position within State.indicies, not the tile id
  private tilesHorizontal: number;
  private tilesVertical: number;
  private timingMultiplier: number; // scales frame durations to speed/slow playback

  public State: SpriteState;
  public Material!: THREE.SpriteMaterial;

  constructor(
    spriteSheet: THREE.Texture,
    tilesHorizontal: number,
    tilesVertical: number,
  ) {
    this.currentTile = 0;
    this.elapsedTime = 0;
    this.runningTileIndex = 0;
    this.tilesHorizontal = tilesHorizontal;
    this.tilesVertical = tilesVertical;

    this.State = {
      indicies: [],
      timing: [],
    };
    this.timingMultiplier = 1;

    this.setMaterial(spriteSheet);
  }

  // build the sprite material with pixel-perfect filtering
  private setMaterial(spriteSheet: THREE.Texture) {
    spriteSheet.colorSpace = THREE.SRGBColorSpace;

    this.Material = new THREE.SpriteMaterial({
      map: spriteSheet,
    });

    // CRITICAL: Texture filtering settings for pixel-perfect rendering
    // These settings are ESSENTIAL for sharp pixel art that doesn't blur during motion

    // magFilter: Used when texture is scaled UP (magnified) - viewing pixels larger than original
    // Setting to NearestFilter means each pixel maintains hard edges with no smoothing
    this.Material.map!.magFilter = THREE.NearestFilter;

    // minFilter: Used when texture is scaled DOWN (minified) - viewing from far away
    // Also set to NearestFilter to prevent blur when sprite is smaller on screen
    // Without this, THREE.js defaults to LinearFilter which causes blurriness!
    this.Material.map!.minFilter = THREE.NearestFilter;

    // anisotropy: Controls filtering quality at oblique angles
    // Set to 1 (minimum) for pixel art - higher values add blur to "improve" quality,
    // but we want pure pixel rendering with no filtering enhancements
    this.Material.map!.anisotropy = 1;

    // Set texture repeat to show one tile from the spritesheet at a time
    this.Material.map!.repeat.set(
      1 / this.tilesHorizontal,
      1 / this.tilesVertical,
    );
  }

  public ChangeState(newState: { indicies: number[]; timing: number[] }) {
    // Skip if already in this state (don't reset the animation every frame)
    if (this.State === newState) {
      return;
    }

    this.State = newState;
    this.timingMultiplier = 1;
    this.runningTileIndex = 0;
    this.currentTile = this.State.indicies[this.runningTileIndex];
    this.elapsedTime = this.State.timing[this.runningTileIndex]; // Force play new animation instead of waiting a loop
  }

  public ChangeAnimationTiming(newTimingMultiplier: number) {
    // Don't change timing unless needed
    if (this.timingMultiplier === newTimingMultiplier) {
      return;
    }

    this.timingMultiplier = newTimingMultiplier;
  }

  public Update(deltaTime: number) {
    this.elapsedTime += deltaTime;

    // Check if there is a timing interval and if the elapsed time has reached it
    if (
      this.State.timing[this.runningTileIndex] * this.timingMultiplier > 0 &&
      this.elapsedTime >=
        this.State.timing[this.runningTileIndex] * this.timingMultiplier
    ) {
      // Reset elapsed time
      this.elapsedTime = 0;

      // Move to the next tile index, looping back to the beginning if necessary
      this.runningTileIndex =
        (this.runningTileIndex + 1) % this.State.indicies.length;

      // Set the current tile to the new index
      this.currentTile = this.State.indicies[this.runningTileIndex];

      // Calculate the texture offset based on the current tile position
      const offsetX =
        (this.currentTile % this.tilesHorizontal) / this.tilesHorizontal;
      const offsetY =
        (this.tilesVertical -
          Math.floor(this.currentTile / this.tilesHorizontal) -
          1) /
        this.tilesVertical;

      // Update the texture's offset on the material to show the new tile
      this.Material.map!.offset.x = offsetX;
      this.Material.map!.offset.y = offsetY;
    }
  }

  public Destroy() {
    // Dispose ONLY the material — NOT this.Material.map. The map is the shared
    // spritesheet texture owned by ResourceLoader (Resources.Items.randy) and is
    // reused by any future player; disposing it here would leave the next
    // SpriteAnimator rendering a freed texture (a use-after-free that only shows up
    // once the player is ever destroyed+recreated — respawn, character select, MP
    // join). ResourceLoader.Destroy() frees the texture once at teardown.
    this.Material.dispose();
  }
}
