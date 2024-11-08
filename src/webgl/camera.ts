/* -------------------------------------------------------------------------- */
/*             The camera and camera controls for the webgl scene             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import Sizes from "./utils/sizes";
import SpriteState from "./utils/types/spriteState";
import SpriteAnimations from "./world/player/state/spriteAnimations";
import Debug from "./utils/debug";
import debugCamera from "./utils/debug/debugCamera";

export default class Camera {
  private experience: Experience;
  private sizes: Sizes;
  private scene: THREE.Scene;

  private debug?: Debug;

  private currentX!: THREE.Vector3;
  private currentY!: THREE.Vector3;
  private currentZ!: THREE.Vector3;
  private targetX!: THREE.Vector3;
  private targetY!: THREE.Vector3;
  private targetZ!: THREE.Vector3;

  private xLookahead!: number;

  private xLerpTiming!: number;
  private yLerpTiming!: number;
  private zLerpTiming!: number;

  public instance!: THREE.PerspectiveCamera;

  constructor() {
    this.experience = Experience.getInstance();
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;

    this.setInstance();
    this.setLookAhead();

    if (this.experience.debug.isActive) {
      this.debug = this.experience.debug;
      debugCamera(this, this.debug);
    }
  }

  private setInstance() {
    this.instance = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      500
    );

    this.scene.add(this.instance);
  }

  private setLookAhead() {
    // Using Vector3's from THREE because they have built in lerping function, save needing to import a library
    this.currentX = new THREE.Vector3(0, 0, 0);
    this.currentY = new THREE.Vector3(0, 0, 0);
    this.currentZ = new THREE.Vector3(40, 40, 40); // Z of 40 makes player ~15% of screen

    this.targetX = new THREE.Vector3(0, 0, 0);
    this.targetY = new THREE.Vector3(0, 0, 0);
    this.targetZ = new THREE.Vector3(40, 40, 40);

    this.xLookahead = 12.5;

    this.xLerpTiming = 1;
    this.yLerpTiming = 3;
    this.zLerpTiming = 1;
  }

  public changeLookaheadX(newOffset: number) {
    this.xLookahead = newOffset;
  }

  public changePositionY(newOffset: number) {
    // Return early if unnessasary
    if (this.targetY.y == newOffset) {
      return;
    }

    this.targetY.setY(newOffset);
  }

  public changePositionZ(newOffset: number) {
    // Return early if unnessasary
    if (this.targetZ.z == newOffset) {
      return;
    }

    this.targetZ.setZ(newOffset);
  }

  public resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  public update(
    playerPosition?: { x: number; y: number },
    playerState?: SpriteState
  ) {
    // Guard against player not loaded yet
    if (!playerPosition) {
      playerPosition = { x: 0, y: 0 };
    }

    // Set X lookahead and timing to move to lookahead target based on player state
    switch (playerState) {
      // Slower x lerp for resting/idle transition that movement
      case SpriteAnimations.IDLE_LEFT:
        this.targetX.x = 0;
        this.xLerpTiming = 0.5;
        break;
      case SpriteAnimations.IDLE_RIGHT:
        this.targetX.x = 0;
        this.xLerpTiming = 0.5;
        break;
      case SpriteAnimations.RUN_LEFT:
        this.targetX.x = -this.xLookahead;
        this.xLerpTiming = 1;
        break;
      case SpriteAnimations.JUMP_LEFT:
        this.targetX.x = -this.xLookahead;
        this.xLerpTiming = 1;
        break;
      case SpriteAnimations.FALL_LEFT:
        this.targetX.x = -this.xLookahead;
        this.xLerpTiming = 1;
        break;
      case SpriteAnimations.RUN_RIGHT:
        this.targetX.x = this.xLookahead;
        this.xLerpTiming = 1;
        break;
      case SpriteAnimations.JUMP_RIGHT:
        this.targetX.x = this.xLookahead;
        this.xLerpTiming = 1;
        break;
      case SpriteAnimations.FALL_RIGHT:
        this.targetX.x = this.xLookahead;
        this.xLerpTiming = 1;
        break;

      // Default lookahead right
      default:
        this.targetX.x = this.xLookahead;
        this.xLerpTiming = 1;
        break;
    }

    // Individual vector lerps for different axis speed
    this.currentX.lerp(
      this.targetX,
      this.xLerpTiming * this.experience.time.delta
    );

    this.currentY.lerp(
      this.targetY,
      this.yLerpTiming * this.experience.time.delta
    );

    this.currentZ.lerp(
      this.targetZ,
      this.zLerpTiming * this.experience.time.delta
    );

    // Set camera position after lerp calculations
    this.instance.position.set(
      playerPosition.x + this.currentX.x,
      this.currentY.y,
      this.currentZ.z
    );
  }

  public destroy() {
    // Remove camera instance from the scene
    this.scene.remove(this.instance);

    // Nullify references to properties
    this.experience = null as any;
    this.sizes = null as any;
    this.scene = null as any;
    this.debug = null as any;
    this.currentX = null as any;
    this.currentY = null as any;
    this.currentZ = null as any;
    this.targetX = null as any;
    this.targetY = null as any;
    this.targetZ = null as any;
    this.instance = null as any;
  }
}
