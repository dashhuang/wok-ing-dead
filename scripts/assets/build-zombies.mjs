// Turns the converted Mixamo GLBs (FBX2glTF output) into game-ready files:
//   node build-zombies.mjs <dir with *.glb from FBX2glTF> <out dir>
// Only the sources that are in the directory are built, so a new character can be added
// without the others' originals at hand.
// Needs @gltf-transform/{core,extensions,functions}, meshoptimizer and sharp on the module path.
// - bones lose their "mixamorigN:" prefix so every clip drives every character
// - spec/gloss leftovers become plain dielectric PBR, hair/lashes become alpha-tested
// - textures are capped at 2K and stored as WebP
// - clips are written one per file, without meshes
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  resample,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error("usage: build-zombies.mjs <src> <out>");
fs.mkdirSync(out, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const strip = (doc) => {
  for (const n of doc.getRoot().listNodes())
    n.setName(n.getName().replace(/^mixamorig\d*:/, ""));
};

const CHARACTERS = {
  // file: { out, simplify ratio, alphaTest material names }
  ch10: { out: "romero", ratio: 0.55 },
  cop: { out: "cop", cut: ["glass_hair_M", "body_M1"] },
  war: { out: "soldier" },
  girl: { out: "girl", cut: ["ZombieGirl_Material"] },
  // the firing range's trial characters (see docs/assets.md)
  yaku: { out: "yaku", cut: ["yifu"] },
  prisoner: { out: "prisoner" },
  whiteclown: { out: "whiteclown" },
  parasite: { out: "parasite", cut: ["parasitezombie_Material"] },
  // (its glow map is dropped: the game puts its own emissive wash over the dead)
  skeletonzombie: {
    out: "skeletonzombie",
    cut: ["skeletonZombie_Material"],
    noGlow: true,
  },
  pumpkinhulk: { out: "pumpkinhulk" },
  mutant: { out: "mutant" },
};
const CLIPS = {
  anim_zombie_idle: "idle",
  anim_zombie_walk: "walk",
  anim_zombie_run: "run",
  anim_zombie_attack: "attack",
  anim_zombie_scream: "scream",
  anim_zombie_death: "death_back",
  anim_zombie_dying: "death_front",
  anim_zombie_crawl: "crawl",
  anim_running_crawl: "crawl_fast",
};

await MeshoptSimplifier.ready;
for (const [file, cfg] of Object.entries(CHARACTERS)) {
  if (!fs.existsSync(path.join(src, file + ".glb"))) continue;
  const doc = await io.read(path.join(src, file + ".glb"));
  const root = doc.getRoot();
  for (const a of root.listAnimations()) a.dispose();
  strip(doc);
  for (const m of root.listMaterials()) {
    const cut = (cfg.cut || []).includes(m.getName());
    const base = m.getBaseColorFactor();
    m.setBaseColorFactor([1, 1, 1, 1]);
    m.setMetallicFactor(0);
    m.setRoughnessFactor(m.getMetallicRoughnessTexture() ? 1 : 0.78);
    m.setAlphaMode(cut ? "MASK" : "OPAQUE");
    if (cut) m.setAlphaCutoff(0.4).setDoubleSided(true);
    if (cfg.noGlow) m.setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]);
    void base;
  }
  // vertex colours on the girl are authoring leftovers (all white) and would only cost memory
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives()) p.setAttribute("COLOR_0", null);
  await doc.transform(
    dedup(),
    weld(),
    ...(cfg.ratio
      ? [
          simplify({
            simplifier: MeshoptSimplifier,
            ratio: cfg.ratio,
            error: 0.0015,
          }),
        ]
      : []),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [2048, 2048],
      quality: 88,
    }),
    prune(),
  );
  const file2 = path.join(out, cfg.out + ".glb");
  await io.write(file2, doc);
  console.log(cfg.out, (fs.statSync(file2).size / 1048576).toFixed(1) + " MB");
}
for (const [file, name] of Object.entries(CLIPS)) {
  if (!fs.existsSync(path.join(src, file + ".glb"))) continue;
  const doc = await io.read(path.join(src, file + ".glb"));
  const root = doc.getRoot();
  strip(doc);
  root.listAnimations().forEach((a) => a.setName(name));
  for (const m of root.listMeshes()) m.dispose();
  await doc.transform(resample(), prune({ keepLeaves: true }));
  const file2 = path.join(out, "clip_" + name + ".glb");
  await io.write(file2, doc);
  console.log(
    "clip",
    name,
    (fs.statSync(file2).size / 1024).toFixed(0) + " KB",
  );
}
