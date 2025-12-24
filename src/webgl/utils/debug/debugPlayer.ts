import Player from "../../world/player/player";
import Debug from "../debug";
import Experience from "../../experience";

const debugPlayer = (player: Player, debug: Debug) => {
  const experience = Experience.getInstance();
  
  const playerDebug = debug.ui?.addFolder("playerDebug");
  playerDebug?.open();
  playerDebug?.add(player, "state").name("state").listen();
  playerDebug?.add(player, "currentFloor").name("floor").listen();

  // ============================================================================
  // NOCLIP / TELEPORT MODE
  // ============================================================================
  const noclipConfig = {
    enabled: false,
    clickToTeleport: () => {
      console.log("👆 Click anywhere on the canvas to teleport the player!");
    }
  };

  const noclip = playerDebug?.addFolder("🎮 Noclip / Teleport");
  noclip?.open();
  
  // Toggle noclip mode
  noclip?.add(noclipConfig, "enabled")
    .name("Enable Noclip")
    .onChange((enabled: boolean) => {
      if (enabled) {
        console.log("🚀 Noclip enabled! Click on the canvas to teleport.");
        setupClickToTeleport(player, experience);
      } else {
        console.log("🛑 Noclip disabled.");
        removeClickToTeleport(experience);
      }
    });

  // Manual teleport button
  noclip?.add(noclipConfig, "clickToTeleport")
    .name("Enable Click-to-Teleport");

  const movement = playerDebug?.addFolder("movement");
  // movement?.open();
  movement?.add(player, "direction").name("direction").listen();
  movement
    ?.add(player.currentPosition, "x")
    .name("positionX")
    .min(0.001)
    .step(0.001)
    .listen();
  movement
    ?.add(player.currentPosition, "y")
    .name("positionY")
    .min(0.001)
    .step(0.001)
    .listen();
  movement
    ?.add(player.nextTranslation, "x")
    .name("velocityX")
    .min(0.001)
    .step(0.001)
    .listen();
  movement
    ?.add(player.nextTranslation, "y")
    .name("velocityY")
    .min(0.001)
    .step(0.001)
    .listen();

  const isTouching = playerDebug?.addFolder("isTouching");
  // isTouching?.open();
  isTouching?.add(player.isTouching, "ground").name("ground").listen();
  isTouching?.add(player.isTouching, "ceiling").name("ceiling").listen();
  isTouching?.add(player.isTouching, "leftSide").name("leftSide").listen();
  isTouching?.add(player.isTouching, "rightSide").name("rightSide").listen();
  isTouching
    ?.add(player.isTouching, "edgePlatform")
    .name("edgePlatform")
    .listen();

  const ladders = playerDebug?.addFolder("ladders");
  // ladders?.open();
  ladders?.add(player.isTouching, "ladderTop").name("ladderTop").listen();
  ladders?.add(player.isTouching, "ladderCore").name("ladderCore").listen();
  ladders?.add(player.isTouching, "ladderBottom").name("ladderBottom").listen();

  const jumping = playerDebug?.addFolder("jumping");
  // jumping?.open();
  jumping?.add(player, "coyoteAvailable").name("coyoteAvailable").listen();
  jumping?.add(player, "coyoteCount").name("coyoteCount").listen();
  jumping
    ?.add(player, "bufferJumpAvailable")
    .name("bufferJumpAvailable")
    .listen();
  jumping?.add(player, "bufferJumpCount").name("bufferJumpCount").listen();

  const timers = playerDebug?.addFolder("timers");
  // timers?.open();
  timers?.add(player.time, "elapsed").name("elapsedTime").min(0.001).listen();
  timers
    ?.add(player, "timeJumpWasEntered")
    .name("timeJumpWasEntered")
    .min(0.001)
    .listen();
  timers
    ?.add(player, "timeFallWasEntered")
    .name("timeFallWasEntered")
    .min(0.001)
    .listen();
};

// ============================================================================
// HELPER FUNCTIONS FOR CLICK-TO-TELEPORT
// ============================================================================

let clickHandler: ((event: MouseEvent) => void) | null = null;

/**
 * Setup click-to-teleport functionality
 * Converts screen coordinates to world coordinates and teleports the player
 */
function setupClickToTeleport(player: Player, experience: Experience) {
  // Remove existing handler if any
  if (clickHandler) {
    removeClickToTeleport(experience);
  }

  // Create new click handler - attach to window to catch all clicks
  clickHandler = (event: MouseEvent) => {
    console.log('🖱️ Window click detected!', event.target);
    
    const canvas = experience.targetElement;
    if (!canvas) {
      console.error('❌ Canvas not found!');
      return;
    }

    // Check if click is on canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is within canvas bounds
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      console.log('⚠️ Click outside canvas - ignoring');
      return;
    }

    console.log('✅ Click on canvas!');
    console.log(`📍 Click position: (${x.toFixed(2)}, ${y.toFixed(2)})`);

    // Convert to normalized device coordinates (-1 to +1)
    const ndcX = (x / rect.width) * 2 - 1;
    const ndcY = -(y / rect.height) * 2 + 1; // Flip Y axis

    console.log(`📐 NDC coords: (${ndcX.toFixed(2)}, ${ndcY.toFixed(2)})`);

    // Get camera position to determine the Z plane
    const cameraPos = experience.camera.instance.position;
    const cameraZ = cameraPos.z;

    console.log(`📷 Camera: pos(${cameraPos.x.toFixed(2)}, ${cameraPos.y.toFixed(2)}, ${cameraPos.z.toFixed(2)})`);

    // Calculate world coordinates
    // Since this is a 2D game with orthographic camera, we need to account for camera position
    const worldX = ndcX * (experience.sizes.width / experience.sizes.height) * (cameraZ / 2) + cameraPos.x;
    const worldY = ndcY * (cameraZ / 2) + cameraPos.y;

    console.log(`🌍 World coords: (${worldX.toFixed(2)}, ${worldY.toFixed(2)})`);

    // Teleport player
    player.teleportToPosition(worldX, worldY);
    
    console.log(`🎯 Teleported player to (${worldX.toFixed(2)}, ${worldY.toFixed(2)})`);
  };

  // Add click event listener to window (captures all clicks)
  console.log('🔗 Attaching click listener to window');
  window.addEventListener('click', clickHandler);
  console.log('✅ Click listener attached to window!');
}

/**
 * Remove click-to-teleport functionality
 */
function removeClickToTeleport(experience: Experience) {
  if (clickHandler) {
    window.removeEventListener('click', clickHandler);
    clickHandler = null;
    console.log('🔗 Click listener removed from window');
  }
}

export default debugPlayer;
