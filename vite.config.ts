import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Ignore git internals and build artifacts so git operations don't trigger page reloads
      ignored: [
        "**/.git/**",
        "**/src-tauri/**",
        "**/target/**",
        "**/dist/**",
        "**/node_modules/**",
        "**/*.test.ts",
        "**/*.test.tsx",
      ],
    },
  },
});
