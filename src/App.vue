<script setup lang="ts">
import { onMounted, ref } from "vue";
import Experience from "./webgl/experience.ts";
import Emitter from "./webgl/utils/eventEmitter.ts";

const webglRef = ref<HTMLCanvasElement | null>(null);
const statusRef = ref<HTMLElement | null>(null);

onMounted(async () => {
  const webglExperience = Experience.getInstance();
  await webglExperience.configure(webglRef.value);

  Emitter.on("gameOver", (value) => {
    if (statusRef.value && value == true) {
      statusRef.value.innerText = "Game Over!";
    }
  });
});
</script>

<template>
  <div class="absolute w-full h-full">
    <p class="text-white">firePlatformerEngine v0.1.0</p>
    <p ref="statusRef" class="text-white"></p>
  </div>
  <canvas ref="webglRef" class=""></canvas>
</template>
