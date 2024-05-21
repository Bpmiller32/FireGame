/* -------------------------------------------------------------------------- */
/*             The camera and camera controls for the webgl scene             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import Sizes from "./utils/sizes";
import SpriteState from "./utils/types/spriteState";
import SpriteAnimations from "./environment/player/state/spriteAnimations";
import Debug from "./utils/debug";
import Input from "./utils/input";
import debugCamera from "./utils/debug/debugCamera";

export default class Camera {
  private experience: Experience;
  private sizes: Sizes;
  private scene: THREE.Scene;

  private debug?: Debug;
  private input?: Input;

  private currentX!: THREE.Vector2;
  private currentY!: THREE.Vector2;
  private currentZ!: THREE.Vector2;
  private targetX!: THREE.Vector2;
  private targetY!: THREE.Vector2;
  private targetZ!: THREE.Vector2;

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
      debugCamera(this);
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
    this.currentX = new THREE.Vector2(0, 0);
    this.currentY = new THREE.Vector2(0, 0);
    this.currentZ = new THREE.Vector2(40, 40);
    // Z of 40 makes player ~15% of screen

    this.targetX = new THREE.Vector2(0, 0);
    this.targetY = new THREE.Vector2(0, 0);
    this.targetZ = new THREE.Vector2(40, 40);

    this.xLookahead = 12.5;

    this.xLerpTiming = 1;
    this.yLerpTiming = 3;
    this.zLerpTiming = 1;
  }

  public changeXLookahead(newOffset: number) {
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
    if (this.targetZ.x == newOffset) {
      return;
    }

    this.targetZ.setX(newOffset);
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

    // Debug manual controls
    if (this.experience.debug.isActive) {
      if (this.input?.isWKeyPressed) {
        this.changePositionY(this.instance.position.y + 1);
      }
      if (this.input?.isSKeyPressed) {
        this.changePositionY(this.instance.position.y - 1);
      }
    }

    // X lookahead based on player state
    switch (playerState) {
      case SpriteAnimations.IDLE_LEFT:
        this.targetX.x = 0;
        // Slower x lerp for resting/idle transition that movement
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
      case SpriteAnimations.RUN_RIGHT:
        this.targetX.x = this.xLookahead;
        this.xLerpTiming = 1;
        break;

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

    // Set camera final position
    this.instance.position.set(
      playerPosition.x + this.currentX.x,
      this.currentY.y,
      this.currentZ.x
    );
  }
}
