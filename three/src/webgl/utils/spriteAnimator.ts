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
  // TODO: change back to private after debug
  public timingMultiplier: number;

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

    this.material.map!.magFilter = THREE.NearestFilter;
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
    this.elapsedTime = this.state.timing[this.runningTileIndex]; // force to play new animation instead of waiting a loop
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

    if (
      this.state.timing[this.runningTileIndex] * this.timingMultiplier > 0 &&
      this.elapsedTime >=
        this.state.timing[this.runningTileIndex] * this.timingMultiplier
    ) {
      this.elapsedTime = 0;
      this.runningTileIndex =
        (this.runningTileIndex + 1) % this.state.indicies.length;
      this.currentTile = this.state.indicies[this.runningTileIndex];

      const offsetX =
        (this.currentTile % this.tilesHorizontal) / this.tilesHorizontal;
      const offsetY =
        (this.tilesVertical -
          Math.floor(this.currentTile / this.tilesHorizontal) -
          1) /
        this.tilesVertical;

      this.material.map!.offset.x = offsetX;
      this.material.map!.offset.y = offsetY;
    }
  }
}
