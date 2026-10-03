import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

function ignoreGitAndTauriUpdates(): Plugin {
  return {
    name: "ignore-git-and-tauri-updates",
    handleHotUpdate({ file }) {
      const normalized = file.replace(/\\/g, "/");
      if (
        normalized.includes("/.git/") ||
        normalized.endsWith("/.git") ||
        normalized.includes("/src-tauri/") ||
        normalized.includes("/target/") ||
        normalized.includes("/dist/") ||
        normalized.includes("/node_modules/") ||
        normalized.endsWith(".lock")
      ) {
        return [];
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ignoreGitAndTauriUpdates()],
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
      ignored: (filePath: string) => {
        const normalized = filePath.replace(/\\/g, "/");
        return (
          normalized.includes("/.git/") ||
          normalized.endsWith("/.git") ||
          normalized.includes("/src-tauri/") ||
          normalized.includes("/target/") ||
          normalized.includes("/dist/") ||
          normalized.includes("/node_modules/") ||
          normalized.endsWith(".lock") ||
          normalized.includes(".test.")
        );
      },
    },
  },
});
