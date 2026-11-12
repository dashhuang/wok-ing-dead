// Standalone weapon lab. Runs beside the game without touching it:
//   npx vite --config arsenal/vite.config.js
// It uses the stock three.js package (no alias to the engine embedded in src/game.js) and
// serves the game's public/ folder so zombies and textures can be reused.
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: here,
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  // own dependency cache so this server never invalidates the game's
  cacheDir: fileURLToPath(
    new URL("../node_modules/.vite-arsenal", import.meta.url),
  ),
  // no hot reload: captures and several editors share this server, and a reload mid-capture loses the run
  server: { host: "127.0.0.1", port: 5311, strictPort: true, hmr: false },
  preview: { host: "127.0.0.1", port: 5311 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    copyPublicDir: true,
  },
});
