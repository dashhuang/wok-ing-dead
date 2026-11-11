import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
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
