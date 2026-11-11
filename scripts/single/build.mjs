// Builds dist-single/ghost-market.html: one self-contained file (code, CSS, textures, models,
// audio, fonts) that opens straight from disk, e.g. after being sent as a WeChat file.
//
//   npm run build:single
//
// Assets stay base64 in inert <script type="text/plain"> blocks; a small shim maps the
// game's "assets/..." URLs onto them (fetch, <img>.src, FontFace) so game code is unchanged.
// Interface and in-world fonts are local files under public/assets/fonts and load through
// FontFace, so the build needs no network access.
import { build } from "vite";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const tmp = path.join(root, "dist-single", ".tmp");
const out = path.join(root, "dist-single", "ghost-market.html");

// ---------- 1. bundle all JS into one ES module ----------
await fs.rm(tmp, { recursive: true, force: true });
await build({
  root,
  configFile: path.join(root, "vite.config.js"),
  base: "./",
  publicDir: false,
  logLevel: "warn",
  build: {
    outDir: tmp,
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4096,
    assetsInlineLimit: Infinity,
    rolldownOptions: {
      input: path.join(root, "scripts/single/entry.js"),
      output: {
        format: "es",
        codeSplitting: false,
        entryFileNames: "app.js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
const files = await fs.readdir(tmp);
if (files.some((f) => f.endsWith(".js") && f !== "app.js"))
  throw new Error("expected a single JS chunk, got: " + files.join(", "));
const js = await fs.readFile(path.join(tmp, "app.js"), "utf8");
const css = (
  await Promise.all(
    files
      .filter((f) => f.endsWith(".css"))
      .map((f) => fs.readFile(path.join(tmp, f), "utf8")),
  )
).join("\n");

// ---------- 2. page shell: reuse index.html's <head> metadata and #app markup ----------
const indexHtml = await fs.readFile(path.join(root, "index.html"), "utf8");
const pick = (re, what) => {
  const m = indexHtml.match(re);
  if (!m) throw new Error("index.html: could not find " + what);
  return m[1];
};
const pageTitle = pick(/<title>([^<]*)<\/title>/, "<title>");
const themeColor = pick(/name="theme-color" content="([^"]+)"/, "theme-color");
const appMarkup = pick(/(<div id="app">[\s\S]*?\n {4}<\/div>)\n/, "#app");

// ---------- 3. game assets ----------
const TYPES = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  glb: "model/gltf-binary",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  woff2: "font/woff2",
  json: "application/json",
};
const assetsDir = path.join(root, "public");
const assetBlocks = [];
let assetBytes = 0;
for (const rel of (
  await fs.readdir(path.join(assetsDir, "assets"), { recursive: true })
)
  .map((p) => "assets/" + p.split(path.sep).join("/"))
  .sort()) {
  const ext = rel.split(".").pop();
  if (!TYPES[ext]) continue;
  const buf = await fs.readFile(path.join(assetsDir, rel));
  assetBytes += buf.length;
  assetBlocks.push(
    `<script type="text/plain" data-asset="${rel}" data-type="${TYPES[ext]}">${buf.toString("base64")}</script>`,
  );
}

const favicon = await fs.readFile(path.join(root, "public/favicon.svg"));

// ---------- 4. runtime shim ----------
const shim = `(() => {
  let table = null;
  const find = (u) => {
    if (u == null) return null;
    u = typeof u === "string" ? u : u.url || String(u);
    if (u.startsWith("data:") || u.startsWith("blob:")) return null;
    const i = u.indexOf("assets/");
    if (i < 0) return null;
    if (!table) {
      table = new Map();
      for (const el of document.querySelectorAll("script[data-asset]")) table.set(el.dataset.asset, el);
    }
    return table.get(decodeURIComponent(u.slice(i).split(/[?#]/)[0])) || null;
  };
  const dataUrl = (el) => "data:" + el.dataset.type + ";base64," + el.textContent;
  const bytes = (el) => {
    const s = el.textContent;
    if (Uint8Array.fromBase64) return Uint8Array.fromBase64(s);
    const bin = atob(s), b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  };
  const blobs = new Map();
  const blob = (el) => {
    let b = blobs.get(el);
    if (!b) blobs.set(el, (b = new Blob([bytes(el)], { type: el.dataset.type })));
    return b;
  };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const el = find(input);
    if (!el) return nativeFetch(input, init);
    const b = blob(el);
    return Promise.resolve(new Response(b, { status: 200, headers: { "Content-Type": b.type, "Content-Length": String(b.size) } }));
  };

  const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    ...src,
    set(v) { const el = find(v); src.set.call(this, el ? dataUrl(el) : v); },
  });

  if (window.FontFace) {
    const NativeFontFace = window.FontFace;
    window.FontFace = class extends NativeFontFace {
      constructor(family, source, desc) {
        if (typeof source === "string")
          source = source.replace(/url\\((['"]?)([^)'"]+)\\1\\)/g, (m, q, u) => { const el = find(u); return el ? "url(" + dataUrl(el) + ")" : m; });
        super(family, source, desc);
      }
    };
  }
})();`;

// ---------- 5. assemble ----------
const safeJs = js.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="${themeColor}" />
<title>${pageTitle}</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${favicon.toString("base64")}" />
<style>${css}</style>
<script>${shim}</script>
</head>
<body>
${appMarkup}
${assetBlocks.join("\n")}
<script type="module">${safeJs}</script>
</body>
</html>
`;
await fs.writeFile(out, html);
await fs.rm(tmp, { recursive: true, force: true });
const mb = (n) => (n / 1048576).toFixed(1) + " MB";
console.log(
  `wrote ${path.relative(root, out)}: ${mb(Buffer.byteLength(html))} (${assetBlocks.length} assets, ${mb(assetBytes)} raw; js ${mb(js.length)})`,
);
