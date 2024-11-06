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
  <canvas ref="webglRef" class=""></canvas>
</template>
