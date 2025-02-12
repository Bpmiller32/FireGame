import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  assetsInclude: ["**/*.wasm"], // Handle WASM files from DRACO
  build: {
    assetsInlineLimit: 0, // Ensure assets are properly handled
  },
});
