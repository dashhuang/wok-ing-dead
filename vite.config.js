import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  define: {
    __GAME_RELEASE__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.GAME_RELEASE || "local",
    ),
  },
  resolve: {
    // Add-ons from three/examples import "three"; point that at the engine embedded in game.js.
    alias: [
      {
        find: /^three$/,
        replacement: fileURLToPath(
          new URL("./src/engine/three.js", import.meta.url),
        ),
      },
    ],
  },
  build: { target: "es2022", sourcemap: true },
  server: { port: 5173, strictPort: true },
});
