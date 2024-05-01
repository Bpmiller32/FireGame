/* -------------------------------------------------------------------------- */
/*             Used to animate a THREE sprite using a spritesheet             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";

export default class SpriteAnimator {
  // Setup
  public currentTile = 0;

  private elapsedTime = 0;
  private maxDisplayTime = 0;
  private runningTileIndex = 0;
  private spriteIndices: number[] = [];

  // Constructor setup
  private tilesHorizontal = 0;
  private tilesVertical = 0;
  public material: THREE.SpriteMaterial;

  constructor(
    spriteSheet: THREE.Texture,
    tilesHorizontal: number,
    tilesVerical: number
  ) {
    this.tilesHorizontal = tilesHorizontal;
    this.tilesVertical = tilesVerical;

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

  public spritesToLoop(spriteIndices: number[], loopDuration: number) {
    this.spriteIndices = spriteIndices;
    this.runningTileIndex = 0;
    this.currentTile = spriteIndices[this.runningTileIndex];
    this.maxDisplayTime = loopDuration / this.spriteIndices.length;
    this.elapsedTime = this.maxDisplayTime; // force to play new animation
  }

  public update(deltaTime: number) {
    this.elapsedTime += deltaTime;

    if (this.maxDisplayTime > 0 && this.elapsedTime >= this.maxDisplayTime) {
      this.elapsedTime = 0;
      this.runningTileIndex =
        (this.runningTileIndex + 1) % this.spriteIndices.length;
      this.currentTile = this.spriteIndices[this.runningTileIndex];

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
