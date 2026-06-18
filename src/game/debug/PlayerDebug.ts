import * as THREE from "three";
import dat from "dat.gui";
import Experience from "../../engine/core/experience";
import { DebugModule } from "../../engine/debug/Debug";

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
    ground: boolean; ceiling: boolean;
    leftSide: boolean; rightSide: boolean;
    edgePlatform: boolean;
    ladderTop: boolean; ladderCore: boolean; ladderBottom: boolean;
  };
  CoyoteAvailable: boolean;
  CoyoteCount: number;
  BufferJumpAvailable: boolean;
  BufferJumpCount: number;
  TimeJumpWasEntered: number;
  TimeFallWasEntered: number;
  Time: { Elapsed: number };
  TeleportToPosition: (x: number, y: number) => void;
};

/**
 * Adds a Player Debug folder to the dat.GUI panel including live state/movement
 * readouts and a click-to-teleport noclip mode.
 *
 * Registered with the engine Debug coordinator as a DebugModule (init/destroy)
 * by the game when a Player is set up — the engine never imports this class.
 */
export default class PlayerDebug implements DebugModule {
  private player: Player;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(player: Player) {
    this.player = player;
  }

  public Init(ui: dat.GUI) {
    const player = this.player;
    const experience = Experience.GetInstance();
    const folder = ui.addFolder("🎮 Player Debug");
    folder.open();

    folder.add(player, "State").name("Current State").listen();
    folder.add(player, "CurrentFloor").name("Current Floor").listen();

    // Noclip / teleport
    const noclipConfig = { enabled: false };
    const noclip = folder.addFolder("🚀 Noclip / Teleport");
    noclip.open();
    noclip.add(noclipConfig, "enabled")
      .name("Enable Click-to-Teleport")
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
    movement.add(player.CurrentPosition, "x").name("Position X").step(0.001).listen();
    movement.add(player.CurrentPosition, "y").name("Position Y").step(0.001).listen();
    movement.add(player.NextTranslation, "x").name("Velocity X").step(0.001).listen();
    movement.add(player.NextTranslation, "y").name("Velocity Y").step(0.001).listen();

    // Collisions
    const collisions = folder.addFolder("💥 Collisions");
    collisions.add(player.IsTouching, "ground").name("Ground").listen();
    collisions.add(player.IsTouching, "ceiling").name("Ceiling").listen();
    collisions.add(player.IsTouching, "leftSide").name("Left Wall").listen();
    collisions.add(player.IsTouching, "rightSide").name("Right Wall").listen();
    collisions.add(player.IsTouching, "edgePlatform").name("Edge Platform").listen();

    // Ladders
    const ladders = folder.addFolder("🪜 Ladders");
    ladders.add(player.IsTouching, "ladderTop").name("Top Sensor").listen();
    ladders.add(player.IsTouching, "ladderCore").name("Core Sensor").listen();
    ladders.add(player.IsTouching, "ladderBottom").name("Bottom Sensor").listen();

    // Jump mechanics
    const jumping = folder.addFolder("🦘 Jump Mechanics");
    jumping.add(player, "CoyoteAvailable").name("Coyote Available").listen();
    jumping.add(player, "CoyoteCount").name("Coyote Count").listen();
    jumping.add(player, "BufferJumpAvailable").name("Buffer Jump Available").listen();
    jumping.add(player, "BufferJumpCount").name("Buffer Jump Count").listen();

    // Timers
    const timers = folder.addFolder("⏱️ Timers");
    timers.add(player.Time, "Elapsed").name("Elapsed Time").listen();
    timers.add(player, "TimeJumpWasEntered").name("Jump Entered Time").listen();
    timers.add(player, "TimeFallWasEntered").name("Fall Entered Time").listen();
  }

  public Destroy() {
    this.removeClickToTeleport();
  }

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
        -(y / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, experience.Camera.Instance);

      const playerZ = player.CurrentTranslation.z ?? 0;
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -playerZ);
      const worldPosition = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, worldPosition);

      player.TeleportToPosition(worldPosition.x, worldPosition.y);
      console.log(`🎯 Teleported to (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)})`);
    };

    window.addEventListener("click", this.clickHandler);
    console.log("🚀 Click-to-teleport enabled!");
  }

  private removeClickToTeleport() {
    if (this.clickHandler) {
      window.removeEventListener("click", this.clickHandler);
      this.clickHandler = null;
    }
  }
}
