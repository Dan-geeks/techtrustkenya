import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Identifies this build. Baked into the bundle via __BUILD_ID__ and written to
// dist/version.json, so a running tab can tell whether it is still current.
const buildId = process.env.VITE_BUILD_ID ?? Date.now().toString(36);

/**
 * Emits `version.json` beside index.html. firebase.json serves everything
 * outside /assets with `no-store`, so this file is always fetched fresh -
 * which is what lets a long-open tab notice that a deploy happened.
 */
const emitVersionFile = () => ({
  name: "emit-version-file",
  generateBundle() {
    this.emitFile({
      type: "asset" as const,
      fileName: "version.json",
      source: JSON.stringify({ buildId }),
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  // Firebase Hosting serves from the domain root; GitHub Pages serves from a
  // repo sub-path. VITE_BASE_PATH lets the Pages workflow ask for the latter.
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), emitVersionFile(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
