import * as THREE from "three";
import dat from "dat.gui";
import Experience from "../../engine/core/experience";
import { DebugModule } from "../../engine/debug/debug";

// Forward type — Player → Experience → Debug → PlayerDebug → Player would cycle.
// Top-level fields mirror the Player class (PascalCase); nested data-shape fields
// (ContactPoints flags, Rapier vector x/y/z) stay camelCase like the real types.
type Player = {
  State: string;
  CurrentFloor: number;
  Direction: number;
  CurrentPosition: { x: number; y: number };
  NextTranslation: { x: number; y: number };
  CurrentTranslation: { x?: number; y?: number; z?: number };
  IsTouching: {
    ground: boolean;
    ceiling: boolean;
    leftSide: boolean;
    rightSide: boolean;
    edgePlatform: boolean;
    ladderTop: boolean;
    ladderCore: boolean;
    ladderBottom: boolean;
  };
  CoyoteAvailable: boolean;
  CoyoteCount: number;
  BufferJumpAvailable: boolean;
  BufferJumpCount: number;
  TimeJumpWasEntered: number;
  TimeFallWasEntered: number;
  Time: { Elapsed: number };
  TeleportToPosition: (x: number, y: number) => void;

  // Feel attributes (live-editable via the Feel Lab sliders)
  MaxClimbSpeed: number;
  ClimbAcceleration: number;
  ClimbDeceleration: number;
  MaxGroundSpeed: number;
  GroundAcceleration: number;
  GroundDeceleration: number;
  AirAcceleration: number;
  AirDeceleration: number;
  MaxFallSpeed: number;
  FallAcceleration: number;
  RiseGravity: number;
  JumpEndedEarlyGravityModifier: number;
  ApexHangThreshold: number;
  ApexHangMult: number;
  JumpPower: number;
  BufferJumpRange: number;
  MinJumpTime: number;
  CoyoteTime: number;
  AnimationScalingFactor: number;

  // Capsule collider + character-controller tuning (live-editable)
  AirColliderHeightScale: number;
  AirColliderGrowDistance: number;
  SnapToGroundDistance: number;
  MaxSlopeClimbDegrees: number;
  MinSlopeSlideDegrees: number;
};

// Adds a Player Debug folder to dat.GUI: live state/movement readouts + click-to-teleport noclip mode.
// Registered as a DebugModule (init/destroy) by the game when a Player is set up; engine never imports this.
export default class PlayerDebug implements DebugModule {
  private player: Player; // the player whose live state we mirror
  private clickHandler: ((e: MouseEvent) => void) | null = null; // active teleport click listener, null when off

  constructor(player: Player) {
    this.player = player;
  }

  // Build the Player dat.GUI folder: readouts, noclip, Feel Lab sliders.
  public Init(ui: dat.GUI) {
    const player = this.player;
    const experience = Experience.GetInstance();
    const folder = ui.addFolder("🎮 Player Debug");
    folder.close();

    folder.add(player, "State").name("Current State").listen();
    folder.add(player, "CurrentFloor").name("Current Floor").listen();

    // Noclip / teleport
    const noclipConfig = { enabled: false };
    const noclip = folder.addFolder("🚀 Noclip / Teleport");
    noclip.close();
    noclip
      .add(noclipConfig, "enabled")
      .name("Enable Teleport")
      .onChange((enabled: boolean) => {
        if (enabled) {
          this.setupClickToTeleport(player, experience);
        } else {
          this.removeClickToTeleport();
        }
      });

    // Movement
    const movement = folder.addFolder("🏃 Movement");
    movement.add(player, "Direction").name("Direction").listen();
    movement
      .add(player.CurrentPosition, "x")
      .name("Position X")
      .step(0.001)
      .listen();
    movement
      .add(player.CurrentPosition, "y")
      .name("Position Y")
      .step(0.001)
      .listen();
    movement
      .add(player.NextTranslation, "x")
      .name("Velocity X")
      .step(0.001)
      .listen();
    movement
      .add(player.NextTranslation, "y")
      .name("Velocity Y")
      .step(0.001)
      .listen();

    // Collisions
    const collisions = folder.addFolder("💥 Collisions");
    collisions.add(player.IsTouching, "ground").name("Ground").listen();
    collisions.add(player.IsTouching, "ceiling").name("Ceiling").listen();
    collisions.add(player.IsTouching, "leftSide").name("Left Wall").listen();
    collisions.add(player.IsTouching, "rightSide").name("Right Wall").listen();
    collisions
      .add(player.IsTouching, "edgePlatform")
      .name("Edge Platform")
      .listen();

    // Ladders
    const ladders = folder.addFolder("🪜 Ladders");
    ladders.add(player.IsTouching, "ladderTop").name("Top Sensor").listen();
    ladders.add(player.IsTouching, "ladderCore").name("Core Sensor").listen();
    ladders
      .add(player.IsTouching, "ladderBottom")
      .name("Bottom Sensor")
      .listen();

    // Jump mechanics
    const jumping = folder.addFolder("🦘 Jump Mechanics");
    jumping.add(player, "CoyoteAvailable").name("Coyote Available").listen();
    jumping.add(player, "CoyoteCount").name("Coyote Count").listen();
    jumping
      .add(player, "BufferJumpAvailable")
      .name("Buffer Jump Available")
      .listen();
    jumping.add(player, "BufferJumpCount").name("Buffer Jump Count").listen();

    // Timers
    const timers = folder.addFolder("⏱️ Timers");
    timers.add(player.Time, "Elapsed").name("Elapsed Time").listen();
    timers.add(player, "TimeJumpWasEntered").name("Jump Entered Time").listen();
    timers.add(player, "TimeFallWasEntered").name("Fall Entered Time").listen();

    // ── 🎚️ Feel Lab — live writable tuning sliders ───────────────────────────
    // Handlers read these fields fresh each frame, so a slider mutates feel
    // instantly. The base profile itself is applied on level load from the
    // registry (single source of truth); Dump prints the tuned values paste-ready.
    const feel = folder.addFolder("🎚️ Feel Lab");

    const jump = feel.addFolder("🦘 Jump (Y)");
    jump
      .add(player, "JumpPower")
      .name("Jump Power (impulse)")
      .min(0)
      .max(200)
      .step(0.5)
      .listen();
    jump
      .add(player, "RiseGravity")
      .name("Rise Gravity")
      .min(1)
      .max(800)
      .step(1)
      .listen();
    jump
      .add(player, "FallAcceleration")
      .name("Fall Gravity")
      .min(1)
      .max(800)
      .step(1)
      .listen();
    jump
      .add(player, "MaxFallSpeed")
      .name("Max Fall Speed")
      .min(0)
      .max(150)
      .step(0.5)
      .listen();
    jump
      .add(player, "JumpEndedEarlyGravityModifier")
      .name("Early-Release Mult")
      .min(1)
      .max(8)
      .step(0.1)
      .listen();
    jump
      .add(player, "ApexHangThreshold")
      .name("Apex Hang Window")
      .min(0)
      .max(50)
      .step(0.5)
      .listen();
    jump
      .add(player, "ApexHangMult")
      .name("Apex Hang Mult")
      .min(0.05)
      .max(1)
      .step(0.05)
      .listen();
    jump
      .add(player, "MinJumpTime")
      .name("Min Jump Time")
      .min(0)
      .max(0.5)
      .step(0.005)
      .listen();

    const horizontal = feel.addFolder("🏃 Horizontal (X)");
    horizontal
      .add(player, "MaxGroundSpeed")
      .name("Max Speed")
      .min(0)
      .max(40)
      .step(0.1)
      .listen();
    horizontal
      .add(player, "GroundAcceleration")
      .name("Ground Accel")
      .min(0)
      .max(200)
      .step(1)
      .listen();
    horizontal
      .add(player, "GroundDeceleration")
      .name("Ground Decel")
      .min(0)
      .max(100)
      .step(1)
      .listen();
    horizontal
      .add(player, "AirAcceleration")
      .name("Air Accel")
      .min(0)
      .max(200)
      .step(1)
      .listen();
    horizontal
      .add(player, "AirDeceleration")
      .name("Air Decel")
      .min(0)
      .max(100)
      .step(1)
      .listen();
    horizontal
      .add(player, "AnimationScalingFactor")
      .name("Anim Scaling")
      .min(0.1)
      .max(5)
      .step(0.1)
      .listen();

    const assists = feel.addFolder("🅰️ Assists");
    assists
      .add(player, "CoyoteTime")
      .name("Coyote Time")
      .min(0)
      .max(0.2)
      .step(0.005)
      .listen();
    assists
      .add(player, "BufferJumpRange")
      .name("Buffer Range (dist)")
      .min(0)
      .max(8)
      .step(0.1)
      .listen();

    const climb = feel.addFolder("🪜 Climb");
    climb
      .add(player, "MaxClimbSpeed")
      .name("Max Climb Speed")
      .min(0)
      .max(15)
      .step(0.1)
      .listen();
    climb
      .add(player, "ClimbAcceleration")
      .name("Climb Accel")
      .min(0)
      .max(100)
      .step(1)
      .listen();
    climb
      .add(player, "ClimbDeceleration")
      .name("Climb Decel")
      .min(0)
      .max(50)
      .step(1)
      .listen();

    // Collider + slope tuning — dial these live in the slope lab. Snap/slope are
    // re-applied to the controller each frame; the air-shrink reads its values live.
    const colliderFolder = feel.addFolder("🧍 Collider / Slopes");
    colliderFolder
      .add(player, "SnapToGroundDistance")
      .name("Snap To Ground")
      .min(0)
      .max(0.6)
      .step(0.01)
      .listen();
    colliderFolder
      .add(player, "MaxSlopeClimbDegrees")
      .name("Max Climb Angle°")
      .min(0)
      .max(80)
      .step(1)
      .listen();
    colliderFolder
      .add(player, "MinSlopeSlideDegrees")
      .name("Min Slide Angle°")
      .min(0)
      .max(80)
      .step(1)
      .listen();
    colliderFolder
      .add(player, "AirColliderHeightScale")
      .name("Air Height Scale")
      .min(0.3)
      .max(1)
      .step(0.01)
      .listen();
    colliderFolder
      .add(player, "AirColliderGrowDistance")
      .name("Air Grow Dist")
      .min(0)
      .max(4)
      .step(0.05)
      .listen();

    // Feel is registry/level-driven (single source of truth); no live profile-
    // swap here. Dump prints the player's current feel values paste-ready.
    const actions = {
      dump: () => this.dumpFeelValues(),
    };
    feel.add(actions, "dump").name("📋 Dump Feel Values");
  }

  // Cleanup: drop the teleport click listener.
  public Destroy() {
    this.removeClickToTeleport();
  }

  // Prints the player's current feel values as a paste-ready block, split by
  // where each field lives (shared baseFeel.ts vs the per-profile setters), and
  // copies it to the clipboard so a tuned-in-the-lab feel can be saved by hand.
  private dumpFeelValues() {
    const p = this.player;
    const block = [
      "// ── baseFeel.ts (shared) ──",
      `player.MaxClimbSpeed = ${p.MaxClimbSpeed};`,
      `player.ClimbAcceleration = ${p.ClimbAcceleration};`,
      `player.ClimbDeceleration = ${p.ClimbDeceleration};`,
      `player.CoyoteTime = ${p.CoyoteTime};`,
      `player.AnimationScalingFactor = ${p.AnimationScalingFactor};`,
      `player.AirColliderHeightScale = ${p.AirColliderHeightScale};`,
      `player.AirColliderGrowDistance = ${p.AirColliderGrowDistance};`,
      `player.SnapToGroundDistance = ${p.SnapToGroundDistance};`,
      `player.MaxSlopeClimbDegrees = ${p.MaxSlopeClimbDegrees};`,
      `player.MinSlopeSlideDegrees = ${p.MinSlopeSlideDegrees};`,
      "",
      "// ── profile overrides (setDkAttributes.ts / setCelesteAttributes.ts) ──",
      `player.MaxGroundSpeed = ${p.MaxGroundSpeed};`,
      `player.GroundAcceleration = ${p.GroundAcceleration};`,
      `player.GroundDeceleration = ${p.GroundDeceleration};`,
      `player.AirAcceleration = ${p.AirAcceleration};`,
      `player.AirDeceleration = ${p.AirDeceleration};`,
      `player.MaxFallSpeed = ${p.MaxFallSpeed};`,
      `player.FallAcceleration = ${p.FallAcceleration};`,
      `player.RiseGravity = ${p.RiseGravity};`,
      `player.JumpEndedEarlyGravityModifier = ${p.JumpEndedEarlyGravityModifier};`,
      `player.ApexHangThreshold = ${p.ApexHangThreshold};`,
      `player.ApexHangMult = ${p.ApexHangMult};`,
      `player.JumpPower = ${p.JumpPower};`,
      `player.BufferJumpRange = ${p.BufferJumpRange};`,
      `player.MinJumpTime = ${p.MinJumpTime};`,
    ].join("\n");

    console.log("🎚️ Current feel values:\n" + block);
    const copy = navigator.clipboard?.writeText(block);
    if (copy) {
      copy
        .then(() => console.log("📋 Copied to clipboard."))
        .catch(() =>
          console.log("⚠️ Clipboard blocked — copy from the log above."),
        );
    }
  }

  // Raycast each click onto the player's plane and teleport there.
  private setupClickToTeleport(player: Player, experience: Experience) {
    this.removeClickToTeleport();

    this.clickHandler = (event: MouseEvent) => {
      const canvas = experience.TargetElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      const mouse = new THREE.Vector2(
        (x / rect.width) * 2 - 1,
        -(y / rect.height) * 2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, experience.Camera.Instance);

      const playerZ = player.CurrentTranslation.z ?? 0;
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -playerZ);
      const worldPosition = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, worldPosition);

      player.TeleportToPosition(worldPosition.x, worldPosition.y);
      console.log(
        `🎯 Teleported to (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)})`,
      );
    };

    window.addEventListener("click", this.clickHandler);
    console.log("🚀 Click-to-teleport enabled!");
  }

  // Detach the teleport click listener if one is active.
  private removeClickToTeleport() {
    if (this.clickHandler) {
      window.removeEventListener("click", this.clickHandler);
      this.clickHandler = null;
    }
  }
}
