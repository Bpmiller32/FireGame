import * as THREE from "three";
import dat from "dat.gui";
import Experience from "../../engine/core/experience";
import { DebugModule } from "../../engine/debug/Debug";

// Forward type — Player → Experience → Debug → PlayerDebug → Player would cycle.
type Player = {
  state: string;
  currentFloor: number;
  direction: number;
  currentPosition: { x: number; y: number };
  nextTranslation: { x: number; y: number };
  currentTranslation: { x?: number; y?: number; z?: number };
  isTouching: {
    ground: boolean; ceiling: boolean;
    leftSide: boolean; rightSide: boolean;
    edgePlatform: boolean;
    ladderTop: boolean; ladderCore: boolean; ladderBottom: boolean;
  };
  coyoteAvailable: boolean;
  coyoteCount: number;
  bufferJumpAvailable: boolean;
  bufferJumpCount: number;
  timeJumpWasEntered: number;
  timeFallWasEntered: number;
  time: { elapsed: number };
  teleportToPosition: (x: number, y: number) => void;
};

/**
 * Adds a Player Debug folder to the dat.GUI panel including live state/movement
 * readouts and a click-to-teleport noclip mode.
 *
 * Registered with the engine Debug coordinator as a DebugModule (init/destroy)
 * by the game when a Player is set up — the engine never imports this class.
 */
export default class PlayerDebug implements DebugModule {
  private _player: Player;
  private _clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(player: Player) {
    this._player = player;
  }

  public init(ui: dat.GUI) {
    const player = this._player;
    const experience = Experience.getInstance();
    const folder = ui.addFolder("🎮 Player Debug");
    folder.open();

    folder.add(player, "state").name("Current State").listen();
    folder.add(player, "currentFloor").name("Current Floor").listen();

    // Noclip / teleport
    const noclipConfig = { enabled: false };
    const noclip = folder.addFolder("🚀 Noclip / Teleport");
    noclip.open();
    noclip.add(noclipConfig, "enabled")
      .name("Enable Click-to-Teleport")
      .onChange((enabled: boolean) => {
        if (enabled) {
          this._setupClickToTeleport(player, experience);
        } else {
          this._removeClickToTeleport();
        }
      });

    // Movement
    const movement = folder.addFolder("🏃 Movement");
    movement.add(player, "direction").name("Direction").listen();
    movement.add(player.currentPosition, "x").name("Position X").step(0.001).listen();
    movement.add(player.currentPosition, "y").name("Position Y").step(0.001).listen();
    movement.add(player.nextTranslation, "x").name("Velocity X").step(0.001).listen();
    movement.add(player.nextTranslation, "y").name("Velocity Y").step(0.001).listen();

    // Collisions
    const collisions = folder.addFolder("💥 Collisions");
    collisions.add(player.isTouching, "ground").name("Ground").listen();
    collisions.add(player.isTouching, "ceiling").name("Ceiling").listen();
    collisions.add(player.isTouching, "leftSide").name("Left Wall").listen();
    collisions.add(player.isTouching, "rightSide").name("Right Wall").listen();
    collisions.add(player.isTouching, "edgePlatform").name("Edge Platform").listen();

    // Ladders
    const ladders = folder.addFolder("🪜 Ladders");
    ladders.add(player.isTouching, "ladderTop").name("Top Sensor").listen();
    ladders.add(player.isTouching, "ladderCore").name("Core Sensor").listen();
    ladders.add(player.isTouching, "ladderBottom").name("Bottom Sensor").listen();

    // Jump mechanics
    const jumping = folder.addFolder("🦘 Jump Mechanics");
    jumping.add(player, "coyoteAvailable").name("Coyote Available").listen();
    jumping.add(player, "coyoteCount").name("Coyote Count").listen();
    jumping.add(player, "bufferJumpAvailable").name("Buffer Jump Available").listen();
    jumping.add(player, "bufferJumpCount").name("Buffer Jump Count").listen();

    // Timers
    const timers = folder.addFolder("⏱️ Timers");
    timers.add(player.time, "elapsed").name("Elapsed Time").listen();
    timers.add(player, "timeJumpWasEntered").name("Jump Entered Time").listen();
    timers.add(player, "timeFallWasEntered").name("Fall Entered Time").listen();
  }

  public destroy() {
    this._removeClickToTeleport();
  }

  private _setupClickToTeleport(player: Player, experience: Experience) {
    this._removeClickToTeleport();

    this._clickHandler = (event: MouseEvent) => {
      const canvas = experience.targetElement;
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
      raycaster.setFromCamera(mouse, experience.camera.instance);

      const playerZ = player.currentTranslation.z ?? 0;
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -playerZ);
      const worldPosition = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, worldPosition);

      player.teleportToPosition(worldPosition.x, worldPosition.y);
      console.log(`🎯 Teleported to (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)})`);
    };

    window.addEventListener("click", this._clickHandler);
    console.log("🚀 Click-to-teleport enabled!");
  }

  private _removeClickToTeleport() {
    if (this._clickHandler) {
      window.removeEventListener("click", this._clickHandler);
      this._clickHandler = null;
    }
  }
}
