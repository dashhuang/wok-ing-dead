// Downloads the Poly Haven (CC0) source files listed in chinatown-manifest.json.
//   node fetch-polyhaven.mjs <cache dir>
// Textures: 1k diffuse / GL normal / ARM as JPG. Models: the 1k glTF with its buffers and maps.
// Files already present are skipped, so the script can be re-run to resume.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cache = process.argv[2];
if (!cache) throw new Error("usage: fetch-polyhaven.mjs <cache dir>");
const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.join(here, "chinatown-manifest.json"), "utf8"),
);
const UA = { "User-Agent": "asset-fetch/1.0" };

async function json(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw new Error("failed: " + url);
}
async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) {
        fs.writeFileSync(file + ".part", Buffer.from(await r.arrayBuffer()));
        fs.renameSync(file + ".part", file);
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw new Error("failed: " + url);
}
async function pool(items, n, fn) {
  let i = 0;
  const failed = [];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const item = items[i++];
        try {
          await fn(item);
        } catch (e) {
          failed.push(String(e.message || e));
        }
      }
    }),
  );
  return failed;
}

const jobs = [];
for (const [name, cfg] of Object.entries(manifest.textures))
  jobs.push(async () => {
    const files = await json("https://api.polyhaven.com/files/" + cfg.id);
    const res = cfg.res || "1k";
    for (const [key, out] of [
      ["Diffuse", "diff"],
      ["nor_gl", "nor"],
      ["arm", "arm"],
    ]) {
      const entry = files[key] && files[key][res] && files[key][res].jpg;
      if (!entry) throw new Error(`${cfg.id}: no ${key} ${res} jpg`);
      await download(
        entry.url,
        path.join(cache, "textures", name, out + ".jpg"),
      );
    }
    console.log("texture", name);
  });
for (const id of Object.keys(manifest.models))
  jobs.push(async () => {
    const files = await json("https://api.polyhaven.com/files/" + id);
    const g = files.gltf && files.gltf["1k"] && files.gltf["1k"].gltf;
    if (!g) throw new Error(id + ": no 1k gltf");
    const dir = path.join(cache, "models", id);
    await download(g.url, path.join(dir, id + ".gltf"));
    for (const [rel, inc] of Object.entries(g.include || {}))
      await download(inc.url, path.join(dir, rel));
    console.log("model", id);
  });

const failed = await pool(jobs, 6, (job) => job());
console.log(
  failed.length ? "FAILED:\n" + failed.join("\n") : "all downloads complete",
);
