/* -------------------------------------------------------------------------- */
/*             The camera and camera controls for the webgl scene             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "../core/experience";
import Sizes from "../core/sizes";
import SpriteAnimations from "../../game/entities/player/spriteAnimations";
import Debug from "../debug";
import Player from "../../game/entities/player/player";
import Input from "../input/input";
import Time from "../core/time";
import Emitter from "../events/eventBus";

export default class Camera {
  private experience: Experience;
  private sizes: Sizes;
  private scene: THREE.Scene;
  public Time: Time;

  public Input?: Input;
  private debug?: Debug;

  public InitialPosition: THREE.Vector3;
  private currentPositionX!: THREE.Vector3;
  private currentPositionY!: THREE.Vector3;
  private currentPositionZ!: THREE.Vector3;
  private targetPosition!: THREE.Vector3;

  private isCameraFollowOn!: boolean;
  private xLookahead!: number;
  private lerpTimings!: THREE.Vector3;

  public ManualControl: boolean;
  public LastToggleTime: number;
  public Instance: THREE.Camera;
  public CameraType!: string;
  public PerspectiveCamera!: THREE.PerspectiveCamera;
  public OrthographicCamera?: THREE.OrthographicCamera;
  public AspectRatio: number;
  public FrustumSize!: number;
  public ZoomFactor!: number;

  private onManualCameraControl!: () => void;

  constructor(initialPosition: THREE.Vector3) {
    this.experience = Experience.GetInstance();
    this.sizes = this.experience.Sizes;
    this.scene = this.experience.Scene;
    this.Time = this.experience.Time;

    this.InitialPosition = initialPosition;

    this.initalizePerspectiveInstance();
    this.initializeCameraLookAhead();

    // Default use the perspective camera
    this.Instance = this.PerspectiveCamera;
    this.CameraType = "perspective";
    this.ManualControl = false;
    this.LastToggleTime = 0;
    this.AspectRatio = this.sizes.Width / this.sizes.Height;

    // Debug
    if (this.experience.Debug.IsActive) {
      this.initializeOrthographicInstance();
      this.Input = this.experience.Input;
      this.debug = this.experience.Debug;
      this.debug.InitCameraDebug(this);
    }

    // Events — store ref for cleanup in destroy()
    this.onManualCameraControl = () => { this.ManualControl = !this.ManualControl; };
    Emitter.on("manualCameraControl", this.onManualCameraControl);
  }

  private initalizePerspectiveInstance() {
    this.PerspectiveCamera = new THREE.PerspectiveCamera(
      35,
      this.sizes.Width / this.sizes.Height,
      0.1,
      500
    );
    this.PerspectiveCamera.position.copy(this.InitialPosition);
    this.scene.add(this.PerspectiveCamera);
  }

  private initializeOrthographicInstance() {
    this.FrustumSize = 40;
    this.ZoomFactor = 0.5;

    this.OrthographicCamera = new THREE.OrthographicCamera(
      (-this.FrustumSize * this.AspectRatio) / 2,
      (this.FrustumSize * this.AspectRatio) / 2,
      this.FrustumSize / 2,
      -this.FrustumSize / 2,
      0.1,
      500
    );
    this.OrthographicCamera.position.copy(this.InitialPosition);
    this.scene.add(this.OrthographicCamera);
  }

  private initializeCameraLookAhead() {
    // Using Vector3's from THREE because they have built in lerping function, save needing to import a library
    this.currentPositionX = new THREE.Vector3().copy(this.InitialPosition);
    this.currentPositionY = new THREE.Vector3().copy(this.InitialPosition);
    this.currentPositionZ = new THREE.Vector3().copy(this.InitialPosition);
    this.targetPosition = new THREE.Vector3().copy(this.InitialPosition);

    this.isCameraFollowOn = false;
    // this.xLookahead = 12.5;
    this.xLookahead = 0;
    this.lerpTimings = new THREE.Vector3(1, 3, 1);
  }

  public SetCameraFollow(value: boolean) {
    if (value) {
      this.xLookahead = 12.5;
      this.isCameraFollowOn = true;
    } else {
      this.xLookahead = 0;
      this.isCameraFollowOn = false;
    }
  }

  public SwitchCamera() {
    if (this.Instance instanceof THREE.OrthographicCamera) {
      this.Instance = this.PerspectiveCamera;
      this.CameraType = "perspective";
    } else {
      if (this.OrthographicCamera) {
        this.Instance = this.OrthographicCamera;
        this.CameraType = "orthographic";
      }
    }
  }

  public ChangePositionY(newValue: number) {
    if (this.targetPosition.y !== newValue) {
      this.targetPosition.setY(newValue);
    }
  }

  public ChangePositionZ(newValue: number) {
    if (this.targetPosition.z !== newValue) {
      this.targetPosition.setZ(newValue);
    }
  }

  public Resize() {
    // Needed for both cameras
    this.AspectRatio = this.sizes.Width / this.sizes.Height;

    // Orthographic camera
    if (this.Instance instanceof THREE.OrthographicCamera) {
      this.Instance.left = (-this.FrustumSize * this.AspectRatio) / 2;
      this.Instance.right = (this.FrustumSize * this.AspectRatio) / 2;
      this.Instance.top = this.FrustumSize / 2;
      this.Instance.bottom = -this.FrustumSize / 2;

      this.Instance.updateProjectionMatrix();
      return;
    }

    // Perspective camera
    if (this.Instance instanceof THREE.PerspectiveCamera) {
      this.PerspectiveCamera.aspect = this.AspectRatio;
      this.Instance.updateProjectionMatrix();
      return;
    }
  }

  public TeleportToPosition(x: number, y: number, z: number) {
    this.currentPositionX.set(x, y, z);
    this.currentPositionY.set(x, y, z);
    this.currentPositionZ.set(x, y, z);

    this.targetPosition.set(x, y, z);

    this.Instance.position.set(x, y, z);
  }

  public Update(player?: Player) {
    // Guard against player not loaded yet
    if (!player || !player.CurrentTranslation) {
      // Slightly prevents initial camera X movement positioning, better would be to not go into switch statement below until check but this is fine
      this.currentPositionX.x = 0;
      return;
    }

    // Run debug camera logic if needed
    if (this.debug) {
      this.debug.UpdateCameraDebug(this);

      if (!this.ManualControl) {
        this.PerspectiveCamera.rotation.y = 0;
      } else {
        return;
      }
    }

    // Update the targetPosition based on player location
    if (this.isCameraFollowOn) {
      this.targetPosition.setX(player.CurrentPosition.x);

      // Set X lookahead and lerpTimings based on player state
      switch (player.SpriteAnimator.State) {
        case SpriteAnimations.IDLE_LEFT:
        case SpriteAnimations.IDLE_RIGHT:
          // this.targetPosition.x = 0;
          this.lerpTimings.x = 0.5; // Slower x lerp for resting/idle transition that movement
          break;
        case SpriteAnimations.RUN_LEFT:
        case SpriteAnimations.JUMP_LEFT:
        case SpriteAnimations.FALL_LEFT:
          if (player.NextTranslation.x > 0) {
            return;
          }
          this.targetPosition.x -= this.xLookahead;
          this.lerpTimings.x = 1;
          break;
        case SpriteAnimations.RUN_RIGHT:
        case SpriteAnimations.JUMP_RIGHT:
        case SpriteAnimations.FALL_RIGHT:
          if (Math.abs(player.NextTranslation.x) <= 0) {
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
      this.lerpTimings.x * this.experience.Time.Delta
    );
    this.currentPositionY.lerp(
      this.targetPosition,
      this.lerpTimings.y * this.experience.Time.Delta
    );
    this.currentPositionZ.lerp(
      this.targetPosition,
      this.lerpTimings.z * this.experience.Time.Delta
    );

    // Set camera position after lerp calculations
    this.Instance.position.set(
      this.currentPositionX.x,
      this.currentPositionY.y,
      this.currentPositionZ.z
    );
  }

  public Destroy() {
    Emitter.off("manualCameraControl", this.onManualCameraControl);
    this.scene.remove(this.Instance);
  }
}
