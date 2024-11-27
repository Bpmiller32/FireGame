/* -------------------------------------------------------------------------- */
/*             The camera and camera controls for the webgl scene             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import Sizes from "./utils/sizes";
import SpriteAnimations from "./world/player/state/spriteAnimations";
import Debug from "./utils/debug";
import Player from "./world/player/player";
import { debugCamera, debugCameraUpdate } from "./utils/debug/debugCamera";
import Input from "./utils/input";
import Time from "./utils/time";

export default class Camera {
  private experience: Experience;
  private sizes: Sizes;
  private scene: THREE.Scene;
  public time: Time;

  public input?: Input;
  private debug?: Debug;

  public initialPosition: THREE.Vector3;
  private currentPositionX!: THREE.Vector3;
  private currentPositionY!: THREE.Vector3;
  private currentPositionZ!: THREE.Vector3;
  private targetPosition!: THREE.Vector3;

  private isCameraFollowOn!: boolean;
  private xLookahead!: number;
  private lerpTimings!: THREE.Vector3;

  public lastToggleTime: number;
  public instance: THREE.Camera;
  public cameraType!: string;
  public perspectiveCamera!: THREE.PerspectiveCamera;
  public orthographicCamera?: THREE.OrthographicCamera;
  public aspectRatio: number;
  public frustumSize!: number;
  public zoomFactor!: number;

  constructor(initialPosition: THREE.Vector3) {
    this.experience = Experience.getInstance();
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.time = this.experience.time;

    this.initialPosition = initialPosition;

    this.initalizePerspectiveInstance();
    this.initializeCameraLookAhead();

    // Default use the perspective camera
    this.instance = this.perspectiveCamera;
    this.cameraType = "perspective";
    this.lastToggleTime = 0;
    this.aspectRatio = this.sizes.width / this.sizes.height;

    // Debug
    if (this.experience.debug.isActive) {
      this.initializeOrthographicInstance();
      this.input = this.experience.input;
      this.debug = this.experience.debug;
      debugCamera(this, this.debug);
    }
  }

  private initalizePerspectiveInstance() {
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      500
    );
    this.perspectiveCamera.position.copy(this.initialPosition);
    this.scene.add(this.perspectiveCamera);
  }

  private initializeOrthographicInstance() {
    this.frustumSize = 40;
    this.zoomFactor = 0.5;

    this.orthographicCamera = new THREE.OrthographicCamera(
      (-this.frustumSize * this.aspectRatio) / 2,
      (this.frustumSize * this.aspectRatio) / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      0.1,
      500
    );
    this.orthographicCamera.position.copy(this.initialPosition);
    this.scene.add(this.orthographicCamera);
  }

  private initializeCameraLookAhead() {
    // Using Vector3's from THREE because they have built in lerping function, save needing to import a library
    this.currentPositionX = new THREE.Vector3().copy(this.initialPosition);
    this.currentPositionY = new THREE.Vector3().copy(this.initialPosition);
    this.currentPositionZ = new THREE.Vector3().copy(this.initialPosition);
    this.targetPosition = new THREE.Vector3().copy(this.initialPosition);

    this.isCameraFollowOn = false;
    // this.xLookahead = 12.5;
    this.xLookahead = 0;
    this.lerpTimings = new THREE.Vector3(1, 3, 1);
  }

  public setCameraFollow(value: boolean) {
    if (value) {
      this.xLookahead = 12.5;
      this.isCameraFollowOn = true;
    } else {
      this.xLookahead = 0;
      this.isCameraFollowOn = false;
    }
  }

  public switchCamera() {
    if (this.instance instanceof THREE.OrthographicCamera) {
      this.instance = this.perspectiveCamera;
      this.cameraType = "perspective";
    } else {
      if (this.orthographicCamera) {
        this.instance = this.orthographicCamera;
        this.cameraType = "orthographic";
      }
    }
  }

  public changePositionY(newValue: number) {
    if (this.targetPosition.y !== newValue) {
      this.targetPosition.setY(newValue);
    }
  }

  public changePositionZ(newValue: number) {
    if (this.targetPosition.z !== newValue) {
      this.targetPosition.setZ(newValue);
    }
  }

  public resize() {
    // Needed for both cameras
    this.aspectRatio = this.sizes.width / this.sizes.height;

    // Orthographic camera
    if (this.instance instanceof THREE.OrthographicCamera) {
      this.instance.left = (-this.frustumSize * this.aspectRatio) / 2;
      this.instance.right = (this.frustumSize * this.aspectRatio) / 2;
      this.instance.top = this.frustumSize / 2;
      this.instance.bottom = -this.frustumSize / 2;

      this.instance.updateProjectionMatrix();
      return;
    }

    // Perspective camera
    if (this.instance instanceof THREE.PerspectiveCamera) {
      this.perspectiveCamera.aspect = this.aspectRatio;
      this.instance.updateProjectionMatrix();
      return;
    }
  }

  public teleportToPosition(x: number, y: number, z: number) {
    this.currentPositionX.set(x, y, z);
    this.currentPositionY.set(x, y, z);
    this.currentPositionZ.set(x, y, z);

    this.targetPosition.set(x, y, z);

    this.instance.position.set(x, y, z);
  }

  public update(player?: Player) {
    // Guard against player not loaded yet
    if (!player || !player.currentTranslation) {
      // Slightly prevents initial camera X movement positioning, better would be to not go into switch statement below until check but this is fine
      this.currentPositionX.x = 0;
      return;
    }

    // Run debug camera logic if needed
    if (this.debug) {
      debugCameraUpdate(this);
      return;
    }

    // Update the targetPosition based on player location
    if (this.isCameraFollowOn) {
      this.targetPosition.setX(player.currentPosition.x);

      // Set X lookahead and lerpTimings based on player state
      switch (player.spriteAnimator.state) {
        case SpriteAnimations.IDLE_LEFT:
        case SpriteAnimations.IDLE_RIGHT:
          // this.targetPosition.x = 0;
          this.lerpTimings.x = 0.5; // Slower x lerp for resting/idle transition that movement
          break;
        case SpriteAnimations.RUN_LEFT:
        case SpriteAnimations.JUMP_LEFT:
        case SpriteAnimations.FALL_LEFT:
          if (player.nextTranslation.x > 0) {
            return;
          }
          this.targetPosition.x -= this.xLookahead;
          this.lerpTimings.x = 1;
          break;
        case SpriteAnimations.RUN_RIGHT:
        case SpriteAnimations.JUMP_RIGHT:
        case SpriteAnimations.FALL_RIGHT:
          if (Math.abs(player.nextTranslation.x) <= 0) {
            return;
          }
          this.targetPosition.x += this.xLookahead;
          this.lerpTimings.x = 1;
          break;
        default:
          this.targetPosition.x += this.xLookahead;
          this.lerpTimings.x = 1;
      }
    }

    // Individual vector lerps for different axis speed
    this.currentPositionX.lerp(
      this.targetPosition,
      this.lerpTimings.x * this.experience.time.delta
    );
    this.currentPositionY.lerp(
      this.targetPosition,
      this.lerpTimings.y * this.experience.time.delta
    );
    this.currentPositionZ.lerp(
      this.targetPosition,
      this.lerpTimings.z * this.experience.time.delta
    );

    // Set camera position after lerp calculations
    this.instance.position.set(
      this.currentPositionX.x,
      this.currentPositionY.y,
      this.currentPositionZ.z
    );
  }

  public destroy() {
    // Remove camera instance from the scene
    this.scene.remove(this.instance);
  }
}
