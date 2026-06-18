<script setup lang="ts">
import { onMounted, ref } from "vue";
import Experience from "./engine/core/experience.ts";
import Emitter from "./engine/events/eventBus.ts";
import GameDirector from "./game/gameDirector.ts";
import InputBindings from "./game/config/inputBindings.ts";
import CollisionLogger from "./game/debug/CollisionLogger.ts";

const webglRef = ref<HTMLCanvasElement | null>(null);
const statusRef = ref<HTMLElement | null>(null);

const isResetButtonVisible = ref<boolean | null>(null);

onMounted(async () => {
  const webglExperience = Experience.getInstance();
  await webglExperience.configure(webglRef.value);

  // The game owns its collision-log formatting; it registers the sink with the
  // engine Debug coordinator, which Physics routes collision/sensor events to.
  webglExperience.debug.registerCollisionLogSink(new CollisionLogger());

  // The game owns its director (constructed after the engine is configured so
  // the scene/camera exist) and its F-key bindings. The engine calls back into
  // these each frame via onGameUpdate, keeping the engine free of game names.
  const gameDirector = new GameDirector();
  const inputBindings = new InputBindings(webglExperience.input);

  webglExperience.onGameUpdate = () => {
    inputBindings.update();
    gameDirector.update();
  };

  Emitter.on("gameWin", () => {
    if (statusRef.value) {
      statusRef.value.innerText = "Game Win!";
    }

    isResetButtonVisible.value = true;
  });

  Emitter.on("gameOver", () => {
    if (statusRef.value) {
      statusRef.value.innerText = "Game Over!";
    }

    isResetButtonVisible.value = true;
  });

  Emitter.on("gameReset", () => {
    if (statusRef.value) {
      statusRef.value.innerText = "";
    }

    isResetButtonVisible.value = false;
  });
});

const handleButtonClicked = () => {
  Emitter.emit("gameReset");

  if (statusRef.value) {
    statusRef.value.innerText = "";
  }

  isResetButtonVisible.value = false;
};
</script>

<template>
  <div class="absolute w-full h-full">
    <p class="text-white">firePlatformerEngine v0.2.0</p>
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
</template>
