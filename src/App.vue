<script setup lang="ts">
import { onMounted, ref } from "vue";
import Experience from "./webgl/experience.ts";

const webglRef = ref<HTMLCanvasElement | null>(null);

onMounted(async () => {
  const webglExperience = Experience.getInstance();
  await webglExperience.configure(webglRef.value);
});
</script>

<template>
  <div class="absolute w-full h-full">
    <p class="text-white">firePlatformerEngine v0.1.0</p>
  </div>
  <canvas ref="webglRef" class=""></canvas>
</template>
