// Turns the Poly Haven downloads (see fetch-polyhaven.mjs) into game-ready files:
//   node build-chinatown.mjs <cache dir> <public/assets dir>
// Needs @gltf-transform/{core,extensions,functions}, meshoptimizer and sharp on the module path.
// - texture sets become <name>_{diff,nor,arm}.webp (diffuse/normal 1K, AO-rough-metal 512)
// - models become one GLB each: welded, simplified to the manifest budget, maps capped and stored as WebP
// - props/index.json lists every top-level part with its size, so placement code can pick variants
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  getBounds,
  prune,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const [cache, out] = process.argv.slice(2);
if (!cache || !out) throw new Error("usage: build-chinatown.mjs <cache> <out>");
const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(here, "chinatown-manifest.json"), "utf8"));
const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

// ---------- textures ----------
const texOut = path.join(out, "textures");
fs.mkdirSync(texOut, { recursive: true });
for (const [name, cfg] of Object.entries(manifest.textures)) {
  if (only && !only.has(name)) continue;
  const dir = path.join(cache, "textures", name);
  const size = cfg.size || 1024;
  await sharp(path.join(dir, "diff.jpg"))
    .resize(size, size)
    .webp({ quality: 84 })
    .toFile(path.join(texOut, name + "_diff.webp"));
  await sharp(path.join(dir, "nor.jpg"))
    .resize(size, size)
    .webp({ quality: 90 })
    .toFile(path.join(texOut, name + "_nor.webp"));
  await sharp(path.join(dir, "arm.jpg"))
    .resize(size / 2, size / 2)
    .webp({ quality: 82 })
    .toFile(path.join(texOut, name + "_arm.webp"));
  console.log("texture", name);
}

// ---------- models ----------
const propOut = path.join(out, "props");
fs.mkdirSync(propOut, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const indexFile = path.join(propOut, "index.json");
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, "utf8")) : {};
const tris = (doc) => {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      const idx = p.getIndices();
      n += (idx ? idx.getCount() : p.getAttribute("POSITION").getCount()) / 3;
    }
  return Math.round(n);
};
const r3 = (v) => v.map((x) => +x.toFixed(3));

for (const [id, cfg] of Object.entries(manifest.models)) {
  if (only && !only.has(id)) continue;
  const doc = await io.read(path.join(cache, "models", id, id + ".gltf"));
  const root = doc.getRoot();
  const before = tris(doc);
  await doc.transform(dedup(), weld());
  if (before > cfg.tris)
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio: cfg.tris / before, error: 0.04 }),
    );
  await doc.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [cfg.tex, cfg.tex],
      quality: 84,
    }),
    prune(),
  );
  const parts = [];
  for (const scene of root.listScenes())
    for (const node of scene.listChildren()) {
      const b = getBounds(node);
      parts.push({ name: node.getName(), min: r3(b.min), max: r3(b.max) });
    }
  const file = path.join(propOut, id + ".glb");
  await io.write(file, doc);
  index[id] = { tris: tris(doc), parts };
  console.log(
    id.padEnd(30),
    String(before).padStart(7),
    "->",
    String(index[id].tris).padStart(6),
    "tris",
    (fs.statSync(file).size / 1024).toFixed(0).padStart(6) + " KB",
    parts.length + " part(s)",
  );
}
fs.writeFileSync(indexFile, JSON.stringify(index, null, 1));
