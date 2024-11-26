<script setup lang="ts">
import { onMounted, ref } from "vue";
import Experience from "./webgl/experience.ts";
import Emitter from "./webgl/utils/eventEmitter.ts";

const webglRef = ref<HTMLCanvasElement | null>(null);
const statusRef = ref<HTMLElement | null>(null);

const isResetButtonVisible = ref<boolean | null>(null);

onMounted(async () => {
  const webglExperience = Experience.getInstance();
  await webglExperience.configure(webglRef.value);

  Emitter.on("gameOver", () => {
    if (statusRef.value) {
      statusRef.value.innerText = "Game Over!";
    }

    isResetButtonVisible.value = true;
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
    <p class="text-white">firePlatformerEngine v0.1.0</p>
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
