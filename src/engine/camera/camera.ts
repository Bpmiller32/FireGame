// The camera and camera controls for the webgl scene

import * as THREE from "three";
import Experience from "../core/experience";
import Sizes from "../core/sizes";
import Debug from "../debug/debug";
import { CameraFollowState, CameraTarget } from "../types/cameraTarget";
import Input from "../input/input";
import Time from "../core/time";
import Emitter from "../events/eventBus";

// Camera-follow tuning knobs (live-editable via the Camera Debug GUI folder).
// Mario-Wonder-style pan: X eases a look-ahead toward travel direction; Y follows only
// sustained/intentional vertical motion (climb, fall past buffer, land), ignores jump arcs.
// *Rate = responsiveness for exponential smoothing (alpha = 1 - e^(-rate*dt)); distances in world units.
interface CameraTuning {
  lookaheadX: number; // horizontal offset placed ahead of the player
  lookaheadRate: number; // how fast the look-ahead eases toward its goal
  horizontalRate: number; // X follow responsiveness
  verticalRateGround: number; // grounded vertical follow (gentle)
  verticalRateUp: number; // climbing — track up briskly
  verticalRateDown: number; // falling — slower / capped descent
  climbLeadY: number; // look-ahead ABOVE the player while climbing
  fallBufferY: number; // player must drop this far below the camera before it follows
  fallLeadY: number; // lead relative to the player while falling (negative = below)
}

// Below this |velocity| the player counts as "not moving" → X look-ahead eases to 0.
const MOVE_EPSILON = 0.01;

export default class Camera {
  private experience: Experience;
  private sizes: Sizes;
  private scene: THREE.Scene;
  public Time: Time; // public so the Camera Debug mirror can read Time.Elapsed

  public Input?: Input;
  private debug?: Debug;

  public InitialPosition: THREE.Vector3;

  // Follow state
  private isCameraFollowOn!: boolean;
  private currentPosition!: THREE.Vector3; // the smoothed camera position we write each frame
  private currentLookaheadX!: number; // smoothed horizontal look-ahead offset
  private baselineX!: number; // horizontal rest anchor (CameraStart / CameraSensor zone)
  private baselineY!: number; // vertical rest anchor (player Y, or a pinned CameraSensor zone)
  private hasSensorBaseline!: boolean; // true while a CameraSensor has pinned the baseline

  public Tuning!: CameraTuning;

  public ManualControl: boolean;
  public LastToggleTime: number;
  public Instance: THREE.Camera;
  public CameraType!: string;
  private PerspectiveCamera!: THREE.PerspectiveCamera;
  public OrthographicCamera?: THREE.OrthographicCamera;
  public AspectRatio: number;
  public FrustumSize!: number;
  public ZoomFactor!: number;

  private onManualCameraControl!: () => void; // handler ref, removed in Destroy()

  // --- Setup ---

  // build cameras, follow state, debug, and events
  constructor(initialPosition: THREE.Vector3) {
    this.experience = Experience.GetInstance();
    this.sizes = this.experience.Sizes;
    this.scene = this.experience.Scene;
    this.Time = this.experience.Time;

    this.InitialPosition = initialPosition;

    this.initializePerspectiveInstance();
    this.initializeCameraFollow();

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
    this.onManualCameraControl = () => {
      this.ManualControl = !this.ManualControl;
    };
    Emitter.on("manualCameraControl", this.onManualCameraControl);
  }

  // create the default perspective camera
  private initializePerspectiveInstance() {
    this.PerspectiveCamera = new THREE.PerspectiveCamera(
      35,
      this.sizes.Width / this.sizes.Height,
      0.1,
      500
    );
    this.PerspectiveCamera.position.copy(this.InitialPosition);
    this.scene.add(this.PerspectiveCamera);
  }

  // create the debug-only orthographic camera
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

  // seed follow state and default tuning knobs
  private initializeCameraFollow() {
    this.isCameraFollowOn = false;
    this.currentPosition = new THREE.Vector3().copy(this.InitialPosition);
    this.currentLookaheadX = 0;
    this.baselineX = this.InitialPosition.x;
    this.baselineY = this.InitialPosition.y;
    this.hasSensorBaseline = false;

    // Starting feel values (dial live via the Camera Debug GUI folder).
    this.Tuning = {
      lookaheadX: 8,
      lookaheadRate: 3,
      horizontalRate: 6,
      verticalRateGround: 4,
      verticalRateUp: 6,
      verticalRateDown: 3,
      climbLeadY: 2,
      fallBufferY: 3,
      fallLeadY: -2,
    };
  }

  // --- Commands ---

  // toggle player-follow vs fixed-zone mode
  public SetCameraFollow(value: boolean) {
    this.isCameraFollowOn = value;
  }

  // flip between perspective and orthographic
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

  // Pin the camera's rest anchor to an authored CameraSensor zone (CameraSensor enter rule).
  // Non-follow level: eases to this anchor on BOTH axes (authored x,y spots).
  // Follow level: only Y matters — pins the grounded vertical baseline (follow drives X off the player);
  // an intentional vertical move (climb / real fall) releases the pin.
  public SetBaselinePosition(x: number, y: number) {
    this.baselineX = x;
    this.baselineY = y;
    this.hasSensorBaseline = true;
  }

  // recompute aspect and projection on viewport change
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

  // snap camera and baseline to a position
  public TeleportToPosition(x: number, y: number, z: number) {
    this.currentPosition.set(x, y, z);
    this.baselineX = x;
    this.baselineY = y;
    this.hasSensorBaseline = false;
    this.Instance.position.set(x, y, z);
  }

  // --- Per-frame ---

  // Frame-rate-correct exponential smoothing toward a target value. Uses FrameDelta
  // (real per-frame time) because the camera runs in the per-frame RENDER pass, not
  // the fixed-step sim — so it follows the interpolated player smoothly at the
  // display's refresh rate.
  private smooth(current: number, target: number, rate: number): number {
    const alpha = 1 - Math.exp(-rate * this.Time.FrameDelta);
    return current + (target - current) * alpha;
  }

  // per-frame follow or fixed-anchor positioning
  public Update(target?: CameraTarget) {
    // Guard against the follow target not being ready yet
    if (!target) {
      return;
    }

    // Run debug camera logic if needed
    if (this.debug) {
      this.debug.UpdateCameraDebug(this);

      // Manual fly-cam fully owns the camera while engaged
      if (this.ManualControl) {
        return;
      }
      this.PerspectiveCamera.rotation.y = 0;
    }

    let targetX: number;
    let targetY: number;
    let verticalRate: number;

    if (this.isCameraFollowOn) {
      // X: velocity-driven look-ahead, eased
      let lookaheadGoal = 0;
      if (target.velocityX > MOVE_EPSILON) {
        lookaheadGoal = this.Tuning.lookaheadX;
      } else if (target.velocityX < -MOVE_EPSILON) {
        lookaheadGoal = -this.Tuning.lookaheadX;
      }
      this.currentLookaheadX = this.smooth(
        this.currentLookaheadX,
        lookaheadGoal,
        this.Tuning.lookaheadRate
      );
      targetX = target.x + this.currentLookaheadX;

      // Y: follow sustained / intentional vertical motion only
      // Transient motion (jump arcs) is ignored; climbing / falling / landing tracked.
      targetY = this.baselineY;
      verticalRate = this.Tuning.verticalRateGround;

      switch (target.followState) {
        case CameraFollowState.CLIMBING:
          // Intent to ascend/descend: track the player with an upward lead so the
          // next handhold is visible. Re-baseline + release any sensor pin.
          targetY = target.y + this.Tuning.climbLeadY;
          verticalRate = this.Tuning.verticalRateUp;
          this.baselineY = target.y;
          this.hasSensorBaseline = false;
          break;

        case CameraFollowState.FALLING: {
          // Follow down only once the player drops past a buffer below the camera;
          // lead slightly into the fall so the landing zone is visible. Capped rate.
          const fallThreshold = this.currentPosition.y - this.Tuning.fallBufferY;
          if (target.y < fallThreshold) {
            targetY = target.y + this.Tuning.fallLeadY;
            verticalRate = this.Tuning.verticalRateDown;
            this.baselineY = target.y;
            this.hasSensorBaseline = false;
          } else {
            // Small drops / early fall: hold vertical (don't yank the camera).
            targetY = this.currentPosition.y;
            verticalRate = this.Tuning.verticalRateDown;
          }
          break;
        }

        case CameraFollowState.JUMPING:
          // Don't chase the jump arc — hold the vertical baseline.
          targetY = this.baselineY;
          verticalRate = this.Tuning.verticalRateGround;
          break;

        default:
          // IDLE / RUNNING (grounded). Rest at the authored baseline if a
          // CameraSensor pinned one; otherwise re-baseline to the player's standing
          // Y so walking up terrain pans the camera up (platform-snap on landing).
          if (target.isGrounded && !this.hasSensorBaseline) {
            this.baselineY = target.y;
          }
          targetY = this.baselineY;
          verticalRate = this.Tuning.verticalRateGround;
      }
    } else {
      // Non-follow level: the camera is a fixed/zone camera positioned by
      // CameraStart + CameraSensor zones (SetBaselinePosition). Ease toward the
      // authored anchor on BOTH axes (full x,y zones); the player is not tracked.
      targetX = this.baselineX;
      targetY = this.baselineY;
      verticalRate = this.Tuning.verticalRateGround;
    }

    // Smooth + write
    this.currentPosition.x = this.smooth(
      this.currentPosition.x,
      targetX,
      this.Tuning.horizontalRate
    );
    this.currentPosition.y = this.smooth(
      this.currentPosition.y,
      targetY,
      verticalRate
    );
    // z stays fixed at the initial depth

    this.Instance.position.copy(this.currentPosition);
  }

  // --- Teardown ---

  // unsubscribe events and remove the camera
  public Destroy() {
    Emitter.off("manualCameraControl", this.onManualCameraControl);
    this.scene.remove(this.Instance);
  }
}
