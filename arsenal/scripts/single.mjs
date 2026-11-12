// Builds arsenal/dist-single/arsenal-showcase.html: the showcase (models, upgrade card, hands)
// as one self-contained file that opens straight from disk or on a phone. No firing range:
// that needs the zombie models and street textures, which would make the file ~25 MB.
//
//   node arsenal/scripts/single.mjs
import { build } from "vite";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const tmp = path.join(root, "dist-single", ".tmp");
const out = path.join(root, "dist-single", "arsenal-showcase.html");

await fs.rm(tmp, { recursive: true, force: true });
await build({
  root,
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  define: { __ARSENAL_SOLO__: "true" },
  build: {
    outDir: tmp,
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    target: "es2022",
    chunkSizeWarningLimit: 8192,
    assetsInlineLimit: Infinity,
    rolldownOptions: {
      input: path.join(root, "src/main.js"),
      output: { format: "es", codeSplitting: false, entryFileNames: "app.js" },
    },
  },
});
const files = await fs.readdir(tmp);
if (files.some((f) => f.endsWith(".js") && f !== "app.js"))
  throw new Error("expected a single JS chunk, got: " + files.join(", "));
const js = (await fs.readFile(path.join(tmp, "app.js"), "utf8")).replace(
  /<\/script/gi,
  "<\\/script",
);
const css = await fs.readFile(path.join(root, "src/ui/lab.css"), "utf8");
const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <title>鬼市 · 军械展柜</title>
    <style>${css}</style>
  </head>
  <body>
    <canvas id="view" tabindex="0"></canvas>
    <div id="ui"></div>
    <div id="boot">军械展柜 · 载入中</div>
    <script type="module">${js}</script>
  </body>
</html>
`;
await fs.writeFile(out, html);
await fs.rm(tmp, { recursive: true, force: true });
console.log(`wrote ${out} (${(html.length / 1048576).toFixed(2)} MB)`);
