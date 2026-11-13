// Builds the showcase (models, upgrade card, hands) as one self-contained HTML file: no
// firing bench, which needs the zombie models and street textures. Two builds use it:
//
//   node arsenal/scripts/single.mjs   arsenal/dist-single/arsenal-showcase.html, a file that
//                                     opens straight from disk or on a phone
//   the game's own build              dist/gallery/index.html: the weapon gallery, a room of
//                                     the game with a way back to the title page and on to
//                                     the firing range (vite.config.js)
import { build } from "vite";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/**
 * o: { out (the HTML file to write), title, boot (the line shown while it loads),
 *      home (where the game is from that file, e.g. "../": the showcase is then a room of
 *      the game; absent for a file that stands alone) }
 */
export async function buildShowcase(o) {
  const out = path.resolve(o.out);
  const tmp = path.join(path.dirname(out), ".showcase-tmp");
  await fs.rm(tmp, { recursive: true, force: true });
  await build({
    root,
    configFile: false,
    publicDir: false,
    logLevel: "warn",
    define: {
      __ARSENAL_SOLO__: "true",
      ...(o.home ? { __ARSENAL_HOME__: JSON.stringify(o.home) } : {}),
    },
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
        output: {
          format: "es",
          codeSplitting: false,
          entryFileNames: "app.js",
        },
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
    <meta name="theme-color" content="#07080a" />
    <title>${esc(o.title || "鬼市 · 军械展柜")}</title>${o.home ? `\n    <link rel="icon" type="image/svg+xml" href="${esc(o.home)}favicon.svg" />` : ""}
    <style>${css}</style>
  </head>
  <body>
    <canvas id="view" tabindex="0"></canvas>
    <div id="ui"></div>
    <div id="boot">${esc(o.boot || "军械展柜 · 载入中")}</div>
    <script type="module">${js}</script>
  </body>
</html>
`;
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, html);
  await fs.rm(tmp, { recursive: true, force: true });
  return { out, bytes: html.length };
}
