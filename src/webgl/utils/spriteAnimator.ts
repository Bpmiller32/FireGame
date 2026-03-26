/* -------------------------------------------------------------------------- */
/*             Used to animate a THREE sprite using a spritesheet             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import SpriteState from "./types/spriteState";

export default class SpriteAnimator {
  private currentTile: number;
  private elapsedTime: number;
  private runningTileIndex: number;
  private tilesHorizontal: number;
  private tilesVertical: number;
  private timingMultiplier: number;

  public state: SpriteState;
  public material!: THREE.SpriteMaterial;

  constructor(
    spriteSheet: THREE.Texture,
    tilesHorizontal: number,
    tilesVerical: number
  ) {
    this.currentTile = 0;
    this.elapsedTime = 0;
    this.runningTileIndex = 0;
    this.tilesHorizontal = tilesHorizontal;
    this.tilesVertical = tilesVerical;

    this.state = {
      indicies: [],
      timing: [],
    };
    this.timingMultiplier = 1;

    this.setMaterial(spriteSheet);
  }

  private setMaterial(spriteSheet: THREE.Texture) {
    spriteSheet.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.SpriteMaterial({
      map: spriteSheet,
    });

    // CRITICAL: Texture filtering settings for pixel-perfect rendering
    // These settings are ESSENTIAL for sharp pixel art that doesn't blur during motion
    
    // magFilter: Used when texture is scaled UP (magnified) - viewing pixels larger than original
    // Setting to NearestFilter means each pixel maintains hard edges with no smoothing
    this.material.map!.magFilter = THREE.NearestFilter;
    
    // minFilter: Used when texture is scaled DOWN (minified) - viewing from far away
    // Also set to NearestFilter to prevent blur when sprite is smaller on screen
    // Without this, THREE.js defaults to LinearFilter which causes blurriness!
    this.material.map!.minFilter = THREE.NearestFilter;
    
    // anisotropy: Controls filtering quality at oblique angles
    // Set to 1 (minimum) for pixel art - higher values add blur to "improve" quality,
    // but we want pure pixel rendering with no filtering enhancements
    this.material.map!.anisotropy = 1;
    
    // Set texture repeat to show one tile from the spritesheet at a time
    this.material.map!.repeat.set(
      1 / this.tilesHorizontal,
      1 / this.tilesVertical
    );
  }

  public changeState(newState: { indicies: number[]; timing: number[] }) {
    // Don't call spritesToLoop every frame
    if (this.state == newState) {
      return;
    }

    this.state = newState;
    this.timingMultiplier = 1;
    this.runningTileIndex = 0;
    this.currentTile = this.state.indicies[this.runningTileIndex];
    this.elapsedTime = this.state.timing[this.runningTileIndex]; // Force play new animation instead of waiting a loop
  }

  public changeAnimationTiming(newTimingMultiplier: number) {
    // Don't change timing unless needed
    if (this.timingMultiplier == newTimingMultiplier) {
      return;
    }

    this.timingMultiplier = newTimingMultiplier;
  }

  public update(deltaTime: number) {
    this.elapsedTime += deltaTime;

    // Check if there is a timing interval and if the elapsed time has reached it
    if (
      this.state.timing[this.runningTileIndex] * this.timingMultiplier > 0 &&
      this.elapsedTime >=
        this.state.timing[this.runningTileIndex] * this.timingMultiplier
    ) {
      // Reset elapsed time
      this.elapsedTime = 0;

      // Move to the next tile index, looping back to the beginning if necessary
      this.runningTileIndex =
        (this.runningTileIndex + 1) % this.state.indicies.length;

      // Set the current tile to the new index
      this.currentTile = this.state.indicies[this.runningTileIndex];

      // Calculate the texture offset based on the current tile position
      const offsetX =
        (this.currentTile % this.tilesHorizontal) / this.tilesHorizontal;
      const offsetY =
        (this.tilesVertical -
          Math.floor(this.currentTile / this.tilesHorizontal) -
          1) /
        this.tilesVertical;

      // Update the texture's offset on the material to show the new tile
      this.material.map!.offset.x = offsetX;
      this.material.map!.offset.y = offsetY;
    }
  }

  public destroy() {
    // Remove the reference to the texture to prevent memory leaks
    if (this.material.map) {
      this.material.map.dispose();
    }

    // Nullify the material to break references
    this.material.dispose();
  }
}
