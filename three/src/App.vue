<script setup lang="ts">
import { onMounted, ref } from "vue";
import Experience from "./webgl/experience.ts";

const webglRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  const webglExperience = Experience.getInstance();
  webglExperience.configure(webglRef.value);
});
</script>

<template>
  <canvas ref="webglRef" class=""></canvas>
</template>
