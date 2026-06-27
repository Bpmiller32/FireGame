<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import Experience from "./engine/core/experience.ts";
import Emitter from "./engine/events/eventBus.ts";
import GameDirector from "./game/gameDirector.ts";
import InputBindings from "./game/config/inputBindings.ts";
import registerContactRules from "./game/config/contactRules.ts";
import CollisionLogger from "./game/debug/collisionLogger.ts";
import LevelDebug from "./game/debug/levelDebug.ts";
import DEBUG_TYPE_COLORS from "./game/config/debugColors.ts";
import GAME_ASSETS from "./game/config/assetManifest.ts";
import LEVEL_NODE_TYPES from "./game/config/levelNodeTypes.ts";

const webglRef = ref<HTMLCanvasElement | null>(null);
const statusRef = ref<HTMLElement | null>(null);

const isResetButtonVisible = ref(false);

// Loading screen: starts up so it covers initial asset loading, then the engine/
// game emit loadingStarted/loadingFinished around every level (GLB) load. The
// presentation layer (Vue) owns the overlay; the game just signals via events.
// `loadProgress` drives a real bar during the initial multi-asset load
// (loadingProgress events); it's cleared for level loads (a single GLB parse has
// no per-item count) so the overlay falls back to a plain "Loading…".
const isLoading = ref(true);
const loadProgress = ref<{ loaded: number; total: number; item: string } | null>(
  null
);

// Engine/game instances — script-scoped so onUnmounted can tear them down (HMR /
// route change). Inside onMounted they're used via non-null locals.
let webglExperience: Experience | null = null;
let gameDirector: GameDirector | null = null;

// Named event-handler refs so onUnmounted removes EXACTLY ours from the shared bus.
// (A bare Emitter.off(event) would wipe other modules' listeners; anonymous handlers
// can't be removed at all, so they'd double-register on hot-reload and fire twice.)
const onLoadingStarted = () => {
  isLoading.value = true;
  loadProgress.value = null; // level loads are a single GLB parse — no per-item bar
};
const onLoadingFinished = () => {
  isLoading.value = false;
};
const onLoadingProgress = (p: { loaded: number; total: number; item: string }) => {
  loadProgress.value = p;
};
const onGameWin = () => {
  if (statusRef.value) statusRef.value.innerText = "Game Win!";
  isResetButtonVisible.value = true;
};
const onGameOver = () => {
  if (statusRef.value) statusRef.value.innerText = "Game Over!";
  isResetButtonVisible.value = true;
};
const onGameReset = () => {
  if (statusRef.value) statusRef.value.innerText = "";
  isResetButtonVisible.value = false;
};
// A (re)start — boot or a level switch — clears any lingering game-over/win UI.
const onGameStart = () => {
  if (statusRef.value) statusRef.value.innerText = "";
  isResetButtonVisible.value = false;
};

onMounted(async () => {
  // Register the loading-screen listeners FIRST — before Configure — so a fast
  // boot load can't fire loadingFinished before we're listening.
  Emitter.on("loadingStarted", onLoadingStarted);
  Emitter.on("loadingFinished", onLoadingFinished);
  Emitter.on("loadingProgress", onLoadingProgress);

  // Non-null local for use here; the script-scoped ref is for onUnmounted.
  const exp = Experience.GetInstance();
  webglExperience = exp;

  // The game supplies its own asset manifest; the engine names none of these.
  await exp.Configure(webglRef.value, GAME_ASSETS);

  // The game injects its level-node type vocabulary into the engine GLB parser (so
  // the engine never hardcodes a mirror of the game's EntityType). Before any load.
  exp.Resources.RegisterLevelTypes(LEVEL_NODE_TYPES);

  // The game declares its cross-entity contact rules into the engine's registry; it
  // owns its collision-log sink + debug wireframe palette (D3), injected into Debug.
  registerContactRules(exp.Physics.Contacts);
  exp.Debug.RegisterCollisionLogSink(new CollisionLogger());
  exp.Debug.SetPhysicsTypeColors(DEBUG_TYPE_COLORS);

  // The game owns its director (built after the engine is configured so scene/camera
  // exist) and its F-key bindings.
  const director = new GameDirector();
  gameDirector = director;
  const inputBindings = new InputBindings(exp.Input);

  // Debug level select (dat.gui) — no-op store when debug is inactive.
  exp.Debug.RegisterModule(new LevelDebug(director));

  // SIM each fixed step (input + game logic); RENDER once per frame (interpolate +
  // camera). The engine calls both back, staying free of game names.
  exp.OnGameUpdate = () => {
    inputBindings.Update();
    director.Update();
  };
  exp.OnRenderUpdate = (alpha: number) => {
    director.RenderUpdate(alpha);
  };

  Emitter.on("gameWin", onGameWin);
  Emitter.on("gameOver", onGameOver);
  Emitter.on("gameReset", onGameReset);
  Emitter.on("gameStart", onGameStart);

  // Kick off asset loading LAST — everything that listens for the boot
  // ("resourcesReady" → GameDirector) and per-asset progress is now wired.
  exp.Resources.StartLoading();
});

// Teardown on unmount (HMR / route change): remove EXACTLY our bus listeners, then
// destroy the game + engine. Symmetric with the wiring above — and the reason the
// engine subsystems' Destroy paths are finally exercised at all.
onUnmounted(() => {
  Emitter.off("loadingStarted", onLoadingStarted);
  Emitter.off("loadingFinished", onLoadingFinished);
  Emitter.off("loadingProgress", onLoadingProgress);
  Emitter.off("gameWin", onGameWin);
  Emitter.off("gameOver", onGameOver);
  Emitter.off("gameReset", onGameReset);
  Emitter.off("gameStart", onGameStart);

  gameDirector?.Destroy();
  webglExperience?.Destroy();
});

// Reset button: emit gameReset; the onGameReset listener clears the win/over
// status and hides this button (same single path the F1 keybinding uses).
const handleButtonClicked = () => {
  Emitter.emit("gameReset");
};

// Loading-bar fill percent from loaded/total (empty -> 0%)
const barWidth = () => {
  if (!loadProgress.value || !loadProgress.value.total) return "0%";
  return (loadProgress.value.loaded / loadProgress.value.total) * 100 + "%";
};
</script>

<template>
  <div class="absolute w-full h-full">
    <p class="text-white">firePlatformerEngine</p>
    <p ref="statusRef" class="text-white"></p>
    <button
      v-if="isResetButtonVisible"
      @click="handleButtonClicked"
      class="text-green-500 mt-2 ml-2 px-3 py-1 border rounded-md"
    >
      Reset
    </button>
  </div>
  <canvas ref="webglRef" class=""></canvas>

  <!-- Loading overlay — covers the canvas during any level/asset load: progress bar while initial assets load, plain "Loading…" while a level GLB parses. -->
  <div
    v-if="isLoading"
    class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-50"
  >
    <template v-if="loadProgress">
      <p class="text-white text-sm tracking-widest">
        Loading {{ loadProgress.loaded }} / {{ loadProgress.total }}
        <span v-if="loadProgress.item"> · {{ loadProgress.item }}</span>
      </p>
      <div class="w-64 h-2 rounded bg-white/20">
        <div
          class="h-full rounded bg-white transition-all duration-150"
          :style="{ width: barWidth() }"
        ></div>
      </div>
    </template>
    <p v-else class="text-white text-2xl tracking-widest animate-pulse">
      Loading…
    </p>
  </div>
</template>
