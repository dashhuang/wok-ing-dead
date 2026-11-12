// Renders CORDON 9's procedural sound bank (synthBank in src/audio/audio.js) to 16-bit WAV.
import fs from "node:fs"; import path from "node:path";
const [srcFile, outDir] = process.argv.slice(2);
const lines = fs.readFileSync(srcFile, "utf8").split("\n");
const end = lines.findIndex((l) => l.startsWith("var NEAR2"));
const { B, SR } = new Function(lines.slice(0, end).join("\n") + "\nreturn synthBank();")();
const CAT = {
  weapons: "rifle pistol rifleTail pistolTail dry pDry lowMag rlStart magOut magDrop magGrab magIn boltBack boltFwd pMagOut pMagDrop pMagIn slide casing",
  impacts: "hitConcrete hitMetal hitWood hitGlass hitFlesh headshot ricochet",
  player: "step stepWet skid cloth playerHurt heart",
  zombies: "groan snarl hurt death bodyfall zstep",
  ui: "uiTick uiStep uiOk uiBack hitmark killmark pickAmmo pickMed uavPing uavCall uavRelease",
  music: "waveStart waveClear dead pads pulse tick bell stab",
  ambience: "rainLoop cityLoop genLoop fireLoop buzzLoop droneLoop siren thunder",
};
const catOf = {}; for (const [c, ks] of Object.entries(CAT)) for (const k of ks.split(" ")) catOf[k] = c;
const wav = (chs, sr) => {
  const n = chs[0].length, nc = chs.length, b = Buffer.alloc(44 + n * nc * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * nc * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(nc, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * nc * 2, 28); b.writeUInt16LE(nc * 2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * nc * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (const c of chs) { b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, c[i])) * 32767), o); o += 2; }
  return b;
};
const index = {};
for (const [k, v] of Object.entries(B)) {
  const cat = catOf[k]; if (!cat) throw new Error("uncategorised sound " + k);
  fs.mkdirSync(path.join(outDir, cat), { recursive: true });
  const list = Array.isArray(v) ? v : [v];
  const e = (index[k] = { category: cat, sampleRate: SR[k], loop: /Loop$/.test(k) || k === "heart", files: [] });
  list.forEach((f, i) => {
    const chs = f instanceof Float32Array ? [f] : [f.l, f.r];
    const name = `${cat}/${k}${list.length > 1 ? "_" + String(i + 1).padStart(2, "0") : ""}.wav`;
    fs.writeFileSync(path.join(outDir, name), wav(chs, SR[k]));
    e.channels = chs.length;
    e.files.push({ file: name, seconds: +(chs[0].length / SR[k]).toFixed(3) });
  });
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 1) + "\n");
console.log(Object.keys(B).length, "sounds,", Object.values(index).reduce((a, x) => a + x.files.length, 0), "files");
