/* -------------------------------------------------------------------------- */
/*                    UNIFIED DEBUG SYSTEM FOR GAME ENGINE                     */
/* -------------------------------------------------------------------------- */
/*
 * This is your ONE-STOP DEBUG PANEL for the entire game engine.
 * Includes:
 * - dat.GUI panel for live tweaking
 * - Stats.js for FPS, CPU, and Memory monitoring
 * - Camera debug controls (movement, rotation, zoom)
 * - Player debug info (state, position, collisions, jumping)
 * - Physics debug rendering (collision shapes)
 * - World stats (entity counts)
 * 
 * Everything is centralized here for easy maintenance and access.
 */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import dat from "dat.gui";
import Stats from "stats.js";
import GameObject from "../world/gameComponents/gameObject";
import Experience from "../experience";

// Forward declarations for types (avoids circular dependencies)
type Camera = any;
type Physics = any;
type Player = any;

/* -------------------------------------------------------------------------- */
/*                            MAIN DEBUG CLASS                                */
/* -------------------------------------------------------------------------- */

export default class Debug {
  public isActive: boolean;
  public ui?: dat.GUI;
  public stats?: Stats;

  // Debug logging flags (for collision/sensor events)
  public logCollisions: boolean = false;
  public logSensors: boolean = false;

  private experience?: Experience;

  constructor() {
    // Enable debug mode with #debug in URL, or always on for development
    // this.isActive = window.location.hash === "#debug";
    this.isActive = true;

    if (this.isActive) {
      this.initializeDebugPanel();
      this.initializeStatsMonitor();
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                         INITIALIZATION METHODS                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Initialize the dat.GUI debug panel
   * Creates the right-side control panel for live tweaking
   */
  private initializeDebugPanel() {
    this.ui = new dat.GUI({ 
      width: 300, 
      hideable: false 
    });
  }

  /**
   * Initialize Stats.js performance monitor
   * 
   * Shows FPS and MS (CPU usage) in real-time.
   * Panels are displayed simultaneously, stacked vertically.
   * 
   * Note: Memory (MB) panel requires Chrome with --enable-precise-memory-info flag,
   * so it may not always be available. FPS and MS are always shown.
   */
  private initializeStatsMonitor() {
    this.stats = new Stats();
    
    // Configure the stats display to show all panels
    // Panel 0 = FPS (frames per second) - GREEN
    // Panel 1 = MS (milliseconds to render a frame) - YELLOW
    // Panel 2 = MB (megabytes of memory) - RED (only in Chrome with memory flag)
    
    // Style the container to show all panels stacked vertically
    this.stats.dom.style.cssText = 'position:fixed;top:0;right:315px;cursor:pointer;opacity:0.9;z-index:10000';
    
    // Make all panels visible (Stats.js creates 3 by default)
    const panels = this.stats.dom.children;
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i] as HTMLElement;
      panel.style.display = 'block';
      panel.style.position = 'relative';
    }
    
    // Check if memory monitoring is available
    const hasMemory = !!(performance as any).memory;
    
    // Add to DOM
    document.body.appendChild(this.stats.dom);
    
    // Log helpful info with detailed explanations
    console.log("📊 Stats Monitor Active:");
    console.log("");
    console.log("🟢 FPS (Frames Per Second) - TOP PANEL:");
    console.log("   • Shows how many frames are rendered each second");
    console.log("   • Target: 60 FPS (smooth gameplay)");
    console.log("   • If below 30 FPS, you may notice stuttering");
    console.log("");
    console.log("🟡 MS (Milliseconds) - MIDDLE PANEL:");
    console.log("   • Shows how long each frame takes to render");
    console.log("   • This is your CPU usage for rendering");
    console.log("   • At 60 FPS: each frame should take ~16.7ms");
    console.log("   • At 30 FPS: each frame takes ~33ms");
    console.log("   • Lower MS = better performance");
    console.log("   • If you see 0-1ms, your game is rendering VERY efficiently!");
    console.log("");
    
    if (hasMemory) {
      console.log("🔴 MB (Memory) - BOTTOM PANEL:");
      console.log("   • Shows memory usage in megabytes");
      console.log("   • Watch for steady increases (possible memory leak)");
      console.log("   • Memory should stabilize after initial loading");
    } else {
      console.log("⚠️ Memory (MB) panel not available");
      console.log("   • Requires Chrome browser with --enable-precise-memory-info flag");
      console.log("   • FPS and MS panels are sufficient for most debugging");
    }
    console.log("");
    console.log("💡 TIP: Click the stats panel to cycle between detailed views");
  }

  /* -------------------------------------------------------------------------- */
  /*                         CAMERA DEBUG CONTROLS                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Initialize camera debug controls in dat.GUI
   * 
   * Adds a folder with controls for:
   * - Camera type (perspective/orthographic)
   * - Manual control toggle
   * - Camera position (x, y, z)
   * - Zoom level (for orthographic camera)
   * 
   * @param camera - The game camera instance
   */
  public initCameraDebug(camera: Camera) {
    const cameraDebug = this.ui?.addFolder("📷 Camera Debug");
    cameraDebug?.open();
    
    // Camera type (perspective or orthographic)
    cameraDebug?.add(camera, "cameraType")
      .name("Type")
      .listen();
    
    // Manual control toggle (allows WASD movement)
    cameraDebug?.add(camera, "manualControl")
      .name("Manual Control")
      .listen();
    
    // Camera position controls
    cameraDebug?.add(camera.instance.position, "x")
      .name("Position X")
      .min(-1000)
      .max(1000)
      .step(0.1)
      .listen();
    
    cameraDebug?.add(camera.instance.position, "y")
      .name("Position Y")
      .min(-1000)
      .max(1000)
      .step(0.1)
      .listen();
    
    cameraDebug?.add(camera.instance.position, "z")
      .name("Position Z")
      .min(0.001)
      .max(1000)
      .step(0.1)
      .listen();
    
    // Zoom control (only for orthographic camera)
    cameraDebug?.add(camera, "frustumSize")
      .name("Zoom")
      .min(1)
      .max(200)
      .step(0.5)
      .listen();
  }

  /**
   * Update camera based on manual control input (WASD movement)
   * 
   * This is called every frame when manual camera control is enabled.
   * Controls:
   * - W/S: Forward/backward (perspective) or Up/down (orthographic)
   * - A/D: Rotate left/right (perspective) or Strafe left/right (orthographic)
   * - Q/E: Strafe left/right (perspective only)
   * - 1/2: Up/down or Zoom in/out (depends on camera type)
   * - ~ (tilde): Switch between perspective and orthographic cameras
   * 
   * @param camera - The game camera instance
   */
  public updateCameraDebug(camera: Camera) {
    // Camera movement speeds
    const moveSpeed = 0.5;
    const rotateSpeed = 0.02;

    // Get the camera's forward direction (where it's looking)
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(camera.instance.quaternion);
    forward.y = 0; // Keep movement horizontal
    forward.normalize();

    // Get the right direction (perpendicular to forward)
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    // ===== PERSPECTIVE CAMERA HELPERS =====
    
    const movePerspective = (direction: THREE.Vector3, speed: number) => {
      camera.instance.position.addScaledVector(direction, speed);
    };

    const rotatePerspective = (angle: number) => {
      camera.instance.rotateY(angle);
    };

    // ===== ORTHOGRAPHIC CAMERA HELPERS =====
    
    const moveOrthographic = (direction: THREE.Vector3, speed: number) => {
      camera.instance.position.addScaledVector(direction, speed);
    };

    const zoomOrthographic = (zoomIn: boolean) => {
      // Adjust frustum size (smaller = more zoomed in)
      camera.frustumSize = Math.max(
        1,
        camera.frustumSize + (zoomIn ? -camera.zoomFactor : camera.zoomFactor)
      );

      // Update orthographic camera frustum dimensions
      camera.orthographicCamera!.left = (-camera.frustumSize * camera.aspectRatio) / 2;
      camera.orthographicCamera!.right = (camera.frustumSize * camera.aspectRatio) / 2;
      camera.orthographicCamera!.top = camera.frustumSize / 2;
      camera.orthographicCamera!.bottom = -camera.frustumSize / 2;

      // Apply changes
      camera.orthographicCamera!.updateProjectionMatrix();
    };

    // ===== MOVEMENT INPUT HANDLING =====
    
    const isOrthographic = camera.instance instanceof THREE.OrthographicCamera;

    // W key - Forward/Up
    if (camera.input?.isWKeyPressed) {
      if (isOrthographic) {
        moveOrthographic(new THREE.Vector3(0, moveSpeed, 0), moveSpeed);
      } else {
        movePerspective(forward, moveSpeed);
      }
    }
    
    // S key - Backward/Down
    else if (camera.input?.isSKeyPressed) {
      if (isOrthographic) {
        moveOrthographic(new THREE.Vector3(0, -moveSpeed, 0), moveSpeed);
      } else {
        movePerspective(forward, -moveSpeed);
      }
    }
    
    // A key - Rotate left/Strafe left
    else if (camera.input?.isAKeyPressed) {
      if (isOrthographic) {
        moveOrthographic(right, -moveSpeed);
      } else {
        rotatePerspective(rotateSpeed);
      }
    }
    
    // D key - Rotate right/Strafe right
    else if (camera.input?.isDKeyPressed) {
      if (isOrthographic) {
        moveOrthographic(right, moveSpeed);
      } else {
        rotatePerspective(-rotateSpeed);
      }
    }
    
    // Q key - Strafe left (perspective only)
    else if (camera.input?.isQKeyPressed && !isOrthographic) {
      movePerspective(right, -moveSpeed);
    }
    
    // E key - Strafe right (perspective only)
    else if (camera.input?.isEKeyPressed && !isOrthographic) {
      movePerspective(right, moveSpeed);
    }
    
    // 1 key - Zoom in/Move up
    else if (camera.input?.is1KeyPressed) {
      if (isOrthographic) {
        zoomOrthographic(true);
      } else {
        camera.instance.position.y += moveSpeed;
      }
    }
    
    // 2 key - Zoom out/Move down
    else if (camera.input?.is2KeyPressed) {
      if (isOrthographic) {
        zoomOrthographic(false);
      } else {
        camera.instance.position.y -= moveSpeed;
      }
    }

    // ===== CAMERA SWITCHING =====
    
    // Tilde key (~) - Switch camera type (with cooldown to prevent spam)
    if (
      camera.input?.isTildePressed &&
      camera.time.elapsed - camera.lastToggleTime >= 0.25
    ) {
      camera.switchCamera();
      camera.lastToggleTime = camera.time.elapsed;
      console.log(`📷 Switched to ${camera.cameraType} camera`);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                         PLAYER DEBUG CONTROLS                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Initialize player debug controls in dat.GUI
   * 
   * Adds a comprehensive debug panel for the player with:
   * - Basic info (state, floor level)
   * - Noclip/teleport mode (click to teleport anywhere)
   * - Movement data (position, velocity, direction)
   * - Collision detection (ground, walls, ceiling)
   * - Ladder detection
   * - Jump mechanics (coyote time, buffer jumps)
   * - Timers (elapsed time, jump/fall times)
   * 
   * @param player - The player instance
   */
  public initPlayerDebug(player: Player) {
    const experience = Experience.getInstance();
    
    const playerDebug = this.ui?.addFolder("🎮 Player Debug");
    playerDebug?.open();
    
    // Basic player state
    playerDebug?.add(player, "state")
      .name("Current State")
      .listen();
    
    playerDebug?.add(player, "currentFloor")
      .name("Current Floor")
      .listen();

    // ===== NOCLIP / TELEPORT MODE =====
    const noclipConfig = {
      enabled: false
    };

    const noclip = playerDebug?.addFolder("🚀 Noclip / Teleport");
    noclip?.open();
    
    // Toggle noclip mode - click anywhere on canvas to teleport
    noclip?.add(noclipConfig, "enabled")
      .name("Enable Click-to-Teleport")
      .onChange((enabled: boolean) => {
        if (enabled) {
          console.log("🚀 Noclip enabled! Click anywhere on the canvas to teleport the player.");
          this.setupClickToTeleport(player, experience);
        } else {
          console.log("🛑 Noclip disabled.");
          this.removeClickToTeleport();
        }
      });

    // ===== MOVEMENT DATA =====
    const movement = playerDebug?.addFolder("🏃 Movement");
    
    movement?.add(player, "direction")
      .name("Direction")
      .listen();
    
    movement?.add(player.currentPosition, "x")
      .name("Position X")
      .step(0.001)
      .listen();
    
    movement?.add(player.currentPosition, "y")
      .name("Position Y")
      .step(0.001)
      .listen();
    
    movement?.add(player.nextTranslation, "x")
      .name("Velocity X")
      .step(0.001)
      .listen();
    
    movement?.add(player.nextTranslation, "y")
      .name("Velocity Y")
      .step(0.001)
      .listen();

    // ===== COLLISION DETECTION =====
    const isTouching = playerDebug?.addFolder("💥 Collisions");
    
    isTouching?.add(player.isTouching, "ground")
      .name("Ground")
      .listen();
    
    isTouching?.add(player.isTouching, "ceiling")
      .name("Ceiling")
      .listen();
    
    isTouching?.add(player.isTouching, "leftSide")
      .name("Left Wall")
      .listen();
    
    isTouching?.add(player.isTouching, "rightSide")
      .name("Right Wall")
      .listen();
    
    isTouching?.add(player.isTouching, "edgePlatform")
      .name("Edge Platform")
      .listen();

    // ===== LADDER DETECTION =====
    const ladders = playerDebug?.addFolder("🪜 Ladders");
    
    ladders?.add(player.isTouching, "ladderTop")
      .name("Top Sensor")
      .listen();
    
    ladders?.add(player.isTouching, "ladderCore")
      .name("Core Sensor")
      .listen();
    
    ladders?.add(player.isTouching, "ladderBottom")
      .name("Bottom Sensor")
      .listen();

    // ===== JUMP MECHANICS =====
    const jumping = playerDebug?.addFolder("🦘 Jump Mechanics");
    
    jumping?.add(player, "coyoteAvailable")
      .name("Coyote Available")
      .listen();
    
    jumping?.add(player, "coyoteCount")
      .name("Coyote Count")
      .listen();
    
    jumping?.add(player, "bufferJumpAvailable")
      .name("Buffer Jump Available")
      .listen();
    
    jumping?.add(player, "bufferJumpCount")
      .name("Buffer Jump Count")
      .listen();

    // ===== TIMERS =====
    const timers = playerDebug?.addFolder("⏱️ Timers");
    
    timers?.add(player.time, "elapsed")
      .name("Elapsed Time")
      .listen();
    
    timers?.add(player, "timeJumpWasEntered")
      .name("Jump Entered Time")
      .listen();
    
    timers?.add(player, "timeFallWasEntered")
      .name("Fall Entered Time")
      .listen();
  }

  /* -------------------------------------------------------------------------- */
  /*                         PHYSICS DEBUG CONTROLS                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Initialize physics debug rendering
   * 
   * Sets up:
   * - Visual debug rendering of collision shapes (green wireframes)
   * - Entity count tracking (render objects vs physics objects)
   * 
   * @param physics - The physics world instance
   */
  public initPhysicsDebug(physics: Physics) {
    // Initialize counters
    physics.renderObjectCount = 0;
    physics.phyiscsObjectCount = 0;

    // Create debug mesh for rendering collision shapes
    // This draws green wireframes showing all collision boundaries
    physics.mesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: "lime" })
    );
    physics.mesh.frustumCulled = false; // Always render, even off-screen
    physics.scene.add(physics.mesh);

    // Add debug controls to GUI
    const worldDebug = this.ui?.addFolder("🌍 World Debug");
    worldDebug?.open();
    
    worldDebug?.add(physics, "renderObjectCount")
      .name("Render Objects")
      .listen();
    
    worldDebug?.add(physics, "phyiscsObjectCount")
      .name("Physics Objects")
      .listen();
  }

  /**
   * Update physics debug rendering
   * 
   * Called every frame to:
   * - Update entity counts
   * - Render collision shapes as green wireframes
   * 
   * @param physics - The physics world instance
   */
  public updatePhysicsDebug(physics: Physics) {
    // Count render objects (all visible entities in scene)
    let entityCount = 0;
    physics.scene.traverse(() => {
      entityCount++;
    });
    physics.renderObjectCount = entityCount;

    // Count physics objects (all collision bodies)
    physics.phyiscsObjectCount = physics.world.colliders.len();

    // Update debug wireframe rendering
    // Extract vertices from Rapier's debug render
    const { vertices } = physics.world.debugRender();

    // Send vertices to GPU for rendering
    physics.mesh!.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 2)
    );
    physics.mesh!.visible = true;
  }

  /* -------------------------------------------------------------------------- */
  /*                         NOCLIP HELPER FUNCTIONS                            */
  /* -------------------------------------------------------------------------- */

  private clickHandler: ((event: MouseEvent) => void) | null = null;

  /**
   * Setup click-to-teleport functionality for noclip mode
   * 
   * Uses Three.js raycasting to accurately convert screen coordinates to world coordinates.
   * Works with both perspective and orthographic cameras.
   * 
   * @param player - The player instance to teleport
   * @param experience - The game experience instance (for canvas/camera access)
   */
  private setupClickToTeleport(player: Player, experience: Experience) {
    // Remove existing handler if any
    if (this.clickHandler) {
      this.removeClickToTeleport();
    }

    // Create click handler
    this.clickHandler = (event: MouseEvent) => {
      const canvas = experience.targetElement;
      if (!canvas) {
        console.error('❌ Canvas not found!');
        return;
      }

      // Get click position relative to canvas
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Check if click is within canvas bounds
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        return; // Ignore clicks outside canvas
      }

      // Convert to normalized device coordinates (-1 to +1)
      const mouse = new THREE.Vector2();
      mouse.x = (x / rect.width) * 2 - 1;
      mouse.y = -(y / rect.height) * 2 + 1; // Flip Y axis (WebGL coordinates)

      // Create a raycaster to convert screen coordinates to world coordinates
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, experience.camera.instance);

      // Define the plane where the game exists (z = player's current z position)
      // For a 2D game, we cast a ray to a plane at the player's depth
      const playerZ = player.currentTranslation.z || 0;
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -playerZ);

      // Calculate intersection point between ray and plane
      const worldPosition = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, worldPosition);

      // Teleport player to the clicked world position
      // Use worldPosition.x and worldPosition.y (your game's 2D coordinates)
      player.teleportToPosition(worldPosition.x, worldPosition.y);
      
      console.log(`🎯 Teleported player to (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)})`);
    };

    // Attach listener to window to catch all clicks
    window.addEventListener('click', this.clickHandler);
    console.log('✅ Click-to-teleport enabled! Click anywhere on the canvas to teleport.');
  }

  /**
   * Remove click-to-teleport functionality
   */
  private removeClickToTeleport() {
    if (this.clickHandler) {
      window.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                         LOGGING UTILITIES                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Log a collision event with colored console output
   * 
   * @param obj1 - First GameObject in collision
   * @param obj2 - Second GameObject in collision
   * @param eventType - "enter" or "exit"
   */
  public logCollisionEvent(
    obj1: GameObject,
    obj2: GameObject,
    eventType: "enter" | "exit"
  ) {
    if (!this.logCollisions) return;

    const timestamp = this.getTimestamp();
    const color = eventType === "enter" ? "#00ff00" : "#ff6666";
    const symbol = eventType === "enter" ? "💥" : "↔️";

    console.log(
      `%c${symbol} [${timestamp}] COLLISION ${eventType.toUpperCase()}: %c${
        obj1.constructor.name
      } %c↔ %c${obj2.constructor.name}`,
      `color: ${color}; font-weight: bold;`,
      "color: #4fc3f7; font-weight: bold;",
      "color: #999;",
      "color: #ffb74d; font-weight: bold;"
    );
  }

  /**
   * Log a sensor event with colored console output
   * 
   * @param obj1 - Sensor GameObject
   * @param obj2 - GameObject entering/exiting sensor
   * @param eventType - "enter" or "exit"
   */
  public logSensorEvent(
    obj1: GameObject,
    obj2: GameObject,
    eventType: "enter" | "exit"
  ) {
    if (!this.logSensors) return;

    const timestamp = this.getTimestamp();
    const color = eventType === "enter" ? "#00ddff" : "#ff88ff";
    const symbol = eventType === "enter" ? "📡" : "⚪";

    console.log(
      `%c${symbol} [${timestamp}] SENSOR ${eventType.toUpperCase()}: %c${
        obj1.constructor.name
      } %c↔ %c${obj2.constructor.name}`,
      `color: ${color}; font-weight: bold;`,
      "color: #9c27b0; font-weight: bold;",
      "color: #999;",
      "color: #4caf50; font-weight: bold;"
    );
  }

  /**
   * Get formatted timestamp for logging
   * Returns elapsed time since game start
   */
  private getTimestamp(): string {
    if (!this.experience) {
      try {
        this.experience = Experience.getInstance();
      } catch (e) {
        return "0.00s";
      }
    }

    return `${this.experience.time.elapsed.toFixed(2)}s`;
  }

  /* -------------------------------------------------------------------------- */
  /*                              CLEANUP                                       */
  /* -------------------------------------------------------------------------- */

  /**
   * Clean up debug resources
   * Removes GUI and stats monitor from DOM
   */
  public destroy() {
    this.ui?.destroy();
    this.stats?.dom.parentNode?.removeChild(this.stats.dom);
    this.removeClickToTeleport();
  }
}
