import path from "path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      "@wsvaio/use": path.resolve(__dirname, "../src/index.ts"),
      "@": path.resolve(__dirname),
    },
  },
  server: {
    proxy: {
      // "/api": {
      //   target: "http://127.0.0.1:7001",
      //   changeOrigin: true,
      //   rewrite: path => path.replace(/^\/api/, "")
      // }

    },

  },
  plugins: [vue()],
});
