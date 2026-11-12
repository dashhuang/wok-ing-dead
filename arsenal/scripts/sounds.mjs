// Describes every weapon sound in numbers, for working on them where nobody can listen:
//   node arsenal/scripts/sounds.mjs [part of a name]
// Each is rendered the way the lab and the game render it and measured: how long it takes to
// fall 20 and 40 dB, how dense the loudest 50 ms is (crest: peak over RMS — the stock rifle
// is about 3 dB, a thin click 15 or more), where its weight sits (centroid) and how its
// energy is shared between sub (<120 Hz), low (<500), mid (<2k), high (<6k) and air.
// A phone speaker gives back almost nothing of the sub band: a sound that is mostly sub is
// a sound nobody hears there.
import { SOUNDS, render } from "../src/audio/sounds.js";
import { mulberry, hash } from "../src/audio/dsp.js";

const BANDS = [
  [0, 120],
  [120, 500],
  [500, 2000],
  [2000, 6000],
  [6000, 24000],
];
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}
export function measure(d, sr) {
  let peak = 0;
  let bad = 0;
  for (let i = 0; i < d.length; i++) {
    if (!Number.isFinite(d[i])) bad++;
    peak = Math.max(peak, Math.abs(d[i]));
  }
  // 5 ms loudness steps: how long after the loudest one it stays within 20 and 40 dB of it
  const w = Math.round(sr * 0.005);
  const env = [];
  for (let i = 0; i + w <= d.length; i += w) {
    let s = 0;
    for (let k = i; k < i + w; k++) s += d[k] * d[k];
    env.push(Math.sqrt(s / w));
  }
  const top = Math.max(...env);
  const at = env.indexOf(top);
  const fall = (db) => {
    const t = top * Math.pow(10, -db / 20);
    let j = at;
    for (let i = at; i < env.length; i++) if (env[i] > t) j = i;
    return Math.round(((j - at + 1) * w * 1000) / sr);
  };
  const w50 = Math.round(sr * 0.05);
  let best = 0;
  let acc = 0;
  for (let i = 0; i < d.length; i++) {
    acc += d[i] * d[i];
    if (i >= w50) acc -= d[i - w50] * d[i - w50];
    best = Math.max(best, acc);
  }
  let n = 1;
  while (n < d.length) n <<= 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  re.set(d);
  fft(re, im);
  const band = BANDS.map(() => 0);
  let total = 0;
  let centre = 0;
  for (let k = 1; k < n / 2; k++) {
    const f = (k * sr) / n;
    const p = re[k] * re[k] + im[k] * im[k];
    total += p;
    centre += p * f;
    for (let b = 0; b < BANDS.length; b++)
      if (f >= BANDS[b][0] && f < BANDS[b][1]) band[b] += p;
  }
  return {
    peak,
    bad,
    t20: fall(20),
    t40: fall(40),
    crest: 20 * Math.log10(peak / (Math.sqrt(best / w50) || 1e-9)),
    centroid: centre / (total || 1),
    bands: band.map((v) => Math.round((100 * v) / (total || 1))),
  };
}

if (process.argv[1] && process.argv[1].endsWith("sounds.mjs")) {
  const only = process.argv[2] || "";
  const pad = (v, n) => String(v).padStart(n);
  console.log(
    "sound".padEnd(22) + "  -20dB  -40dB  crest  centre   sub low mid  hi air",
  );
  let failed = 0;
  for (const [key, def] of Object.entries(SOUNDS)) {
    if (!key.includes(only)) continue;
    for (let v = 0; v < def.n; v++) {
      const r = render(key, v, 0, mulberry(hash(key) + v * 7919));
      const m = measure(r.data, r.sr);
      if (m.bad || !(m.peak > 0)) {
        failed++;
        console.log(
          `${key}#${v}: broken (${m.bad} bad samples, peak ${m.peak})`,
        );
      }
      if (v) continue;
      console.log(
        key.slice(2).padEnd(22) +
          `${pad(m.t20, 5)}ms${pad(m.t40, 5)}ms${pad(m.crest.toFixed(1), 5)}dB${pad(Math.round(m.centroid), 6)}Hz  ` +
          m.bands.map((b) => pad(b, 3)).join(" ") +
          (def.loop ? "  (loop)" : ""),
      );
    }
  }
  process.exit(failed ? 1 : 0);
}
