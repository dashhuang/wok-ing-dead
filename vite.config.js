import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { socialPreview } from "./scripts/social.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));

// The weapon gallery is a room of the game: the showcase of arsenal/ as one self-contained
// page at gallery/ (src/chinatown/doors.js has the addresses). Every build of the site makes
// it, so it is deployed with the game and never a version behind it. On the dev server there
// is nothing built: gallery/ hands over to the lab's own server (npm run arsenal) and tells
// it where the game is, so its way back works.
function gallery() {
  let site = null;
  return {
    name: "wok-ing-dead:gallery",
    configResolved(c) {
      const out = path.resolve(c.root, c.build.outDir);
      // (only the site itself: the single-file build of the game has no rooms)
      site =
        c.command === "build" && out === path.join(root, "dist") ? out : null;
    },
    async closeBundle() {
      if (!site) return;
      const { buildShowcase } = await import("./arsenal/scripts/showcase.mjs");
      const { bytes } = await buildShowcase({
        out: path.join(site, "gallery", "index.html"),
        home: "../",
        title: "守护夜排档 · 家伙陈列",
        boot: "家伙陈列 · 载入中",
      });
      console.log(
        `dist/gallery/index.html  ${(bytes / 1048576).toFixed(2)} MB (the weapon gallery)`,
      );
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [at, q] = (req.url || "").split("?");
        if (at !== "/gallery" && at !== "/gallery/") return next();
        const home = encodeURIComponent(`http://${req.headers.host}/`);
        res.statusCode = 302;
        res.setHeader(
          "Location",
          `http://127.0.0.1:5311/?home=${home}${q ? "&" + q : ""}`,
        );
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [gallery(), socialPreview()],
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
