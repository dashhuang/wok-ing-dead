// A look at the procedural vehicles without opening the game: builds one with a stand-in kit
// and draws it with a small software rasteriser into a PNG. For checking shapes (folds, gaps,
// proportions, where lamps and strips land); paint, glass and lighting are only roughly like
// the game's.
//
//   node scripts/vehicles/preview.mjs <kind> <out.png> [views] [key=value …]
//
// kind: taxi | saloon | hatch | van | minibus | lorry | army | bus
// views: comma-separated, default f34,r34,side,front,rear,eye (also top, eyeside, eyerear)
// options: color=8a9096  load=tilt  rack=1 livery=1 lights=1 hazard=1 dead=1 far=1
//          w=760 h=470 (size of one view)  zebra=1 (stripes in the reflections, to show kinks)
//          eye=x,y,z target=x,y,z fov=50 with the view "custom" (x forward, y up, metres)
import path from "node:path";
import fs from "node:fs";
import zlib from "node:zlib";
import * as THREE from "three";
import { createVehicles } from "../../src/chinatown/vehicles.js";

const [kind, outArg, viewArg, ...rest] = process.argv.slice(2);
if (!kind || !outArg) {
  console.error(
    "usage: node scripts/vehicles/preview.mjs <kind> <out.png> [views] [key=value …]",
  );
  process.exit(1);
}
const out = path.resolve(outArg);
const opt = Object.fromEntries(
  (viewArg && viewArg.includes("=") ? [viewArg, ...rest] : rest).map((s) =>
    s.split("="),
  ),
);
const views = viewArg && !viewArg.includes("=") ? viewArg : "";

// ---------------------------------------------------------------- stand-in kit
let seed = 7;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const tris = []; // { p: [x,y,z]*3, n: [x,y,z]*3, m }
const mk = (hex, o = {}) => ({ hex, userData: {}, ...o });
const canvasStub = () => {
  const ctx = new Proxy(
    {},
    {
      get: (t, k) => (k in t ? t[k] : () => {}),
      set: (t, k, v) => ((t[k] = v), true),
    },
  );
  return { width: 0, height: 0, getContext: () => ctx };
};
globalThis.document = { createElement: canvasStub };
const _v = new THREE.Vector3(),
  _n = new THREE.Vector3(),
  _nm = new THREE.Matrix3();
const kit = {
  rnd: (a, b) => a + (b - a) * rand(),
  pick: (a) => a[Math.floor(rand() * a.length)],
  aniso: 1,
  flat: (c, o = {}) =>
    mk(c, {
      rough: o.rough ?? 0.6,
      metal: o.metal ?? 0,
      coat: !!o.coat,
      key: o.key,
      double: !!o.side,
    }),
  game: () => mk(0x0b0b0c, { rough: 0.9, metal: 0 }),
  glow: (c) => mk(c, { emissive: true }),
  painted: () => mk(0xd8d2a0, { rough: 0.5, metal: 0 }),
  glowMap: () => mk(0xffe0a0, { emissive: true }),
  solid: () => {},
  prop: () => {},
  xform(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")),
      new THREE.Vector3(sx, sy, sz),
    );
  },
  add(mat, geo, matrix) {
    const pos = geo.attributes.position,
      nrm = geo.attributes.normal;
    const m = mat.isMaterial
      ? {
          hex: mat.color.getHex(),
          rough: mat.roughness,
          metal: mat.metalness,
          alpha: mat.transparent ? mat.opacity : 1,
          double: mat.side === THREE.DoubleSide,
          key: mat.name,
        }
      : mat;
    if (matrix) _nm.getNormalMatrix(matrix);
    const P = [],
      N = [];
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      if (matrix) _v.applyMatrix4(matrix);
      P.push([_v.x, _v.y, _v.z]);
      if (nrm) {
        _n.fromBufferAttribute(nrm, i);
        if (matrix) _n.applyMatrix3(_nm).normalize();
        N.push([_n.x, _n.y, _n.z]);
      } else N.push([0, 1, 0]);
    }
    const ix = geo.index;
    const count = ix ? ix.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const a = ix ? ix.getX(i) : i,
        b = ix ? ix.getX(i + 1) : i + 1,
        c = ix ? ix.getX(i + 2) : i + 2;
      tris.push({ p: [P[a], P[b], P[c]], n: [N[a], N[b], N[c]], m });
    }
  },
};
const G = {
  mats: {
    adopt: () => {},
    get: () => mk(0x101010),
    emissive: (c) => mk(c, { emissive: true }),
  },
  physics: { groundHeight: () => 0 },
  render: {},
};
const ctx = { kit, G, emitters: [], updaters: [] };
const cars = createVehicles(ctx);
const po = {};
for (const k of ["far", "lights", "hazard", "rack", "livery", "dead"])
  if (opt[k]) po[k] = true;
if (opt.color) po.color = parseInt(opt.color, 16);
if (opt.load) po.load = opt.load;
const placed = cars.place(kind, 0, 0, Math.PI / 2, po);
const [LEN, WID, HGT] = placed.size;

// ---------------------------------------------------------------- rasteriser
const lin = (c) => Math.pow(c / 255, 2.2);
const rgb = (hex) => [
  lin((hex >> 16) & 255),
  lin((hex >> 8) & 255),
  lin(hex & 255),
];
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// what a glossy surface mirrors: dark street below, a bright band at the horizon, dusk above,
// and thin bright lines every few degrees so kinks in a surface show up as broken lines
function sky(r) {
  const e = Math.asin(Math.max(-1, Math.min(1, r[1])));
  if (e < 0) return [0.03, 0.03, 0.035];
  const t = e / (Math.PI / 2);
  const hz = Math.exp(-t * 7);
  let c = [0.25 + 0.9 * hz, 0.2 + 0.45 * hz, 0.32 + 0.15 * hz];
  if (opt.zebra) {
    const s = Math.abs((((e * 180) / Math.PI / 9) % 1) - 0.5);
    if (s < 0.08) c = c.map((v) => v + 0.9);
  }
  return c;
}
const LIGHT = norm([0.35, 0.8, 0.5]);
function shade(m, N, V) {
  const base = rgb(m.hex);
  if (m.emissive) return base.map((c) => Math.min(1, c * 1.6 + 0.1));
  const nl = Math.max(0, dot(N, LIGHT));
  const amb = 0.3 + 0.2 * N[1];
  const metal = m.metal ?? 0,
    rough = m.rough ?? 0.6;
  const nv = Math.max(0, dot(N, V));
  const R = sub(
    N.map((c) => c * 2 * nv),
    V,
  );
  const gloss = Math.max(0, 1 - rough * 1.6);
  const fres = Math.pow(1 - nv, 5);
  const env = sky(norm(R));
  return [0, 1, 2].map((k) => {
    const f0 = 0.04 + (base[k] - 0.04) * metal;
    const f = f0 + (1 - f0) * fres;
    const diff = base[k] * (1 - metal) * (nl * 0.85 + amb);
    let spec = env[k] * f * gloss + env[k] * f0 * (1 - gloss) * 0.4;
    if (m.coat) spec += env[k] * (0.04 + 0.96 * fres) * 0.9;
    return diff + spec;
  });
}
function render(W, H, eye, target, fov) {
  const SS = 2,
    w = W * SS,
    h = H * SS;
  const col = new Float32Array(w * h * 3),
    depth = new Float32Array(w * h).fill(Infinity);
  for (let i = 0; i < w * h; i++) {
    const y = Math.floor(i / w) / h;
    col[i * 3] = 0.16 - 0.06 * y;
    col[i * 3 + 1] = 0.17 - 0.06 * y;
    col[i * 3 + 2] = 0.2 - 0.06 * y;
  }
  const fwd = norm(sub(target, eye));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const f = 1 / Math.tan((fov * Math.PI) / 180 / 2);
  const proj = (p) => {
    const d = sub(p, eye);
    const z = dot(d, fwd);
    return [
      (0.5 + (dot(d, right) * f) / z / 2 / (w / h)) * w,
      (0.5 - (dot(d, up) * f) / z / 2) * h,
      z,
    ];
  };
  const draw = (t, blend) => {
    const s = t.p.map(proj);
    if (s[0][2] < 0.05 || s[1][2] < 0.05 || s[2][2] < 0.05) return;
    const area =
      (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) -
      (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]);
    if (Math.abs(area) < 1e-9) return;
    const back = area > 0; // y runs down, so counter-clockwise comes out negative
    if (back && !t.m.double) return;
    const x0 = Math.max(0, Math.floor(Math.min(s[0][0], s[1][0], s[2][0]))),
      x1 = Math.min(w - 1, Math.ceil(Math.max(s[0][0], s[1][0], s[2][0]))),
      y0 = Math.max(0, Math.floor(Math.min(s[0][1], s[1][1], s[2][1]))),
      y1 = Math.min(h - 1, Math.ceil(Math.max(s[0][1], s[1][1], s[2][1])));
    const iz = s.map((q) => 1 / q[2]);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5,
          py = y + 0.5;
        let b0 =
            ((s[1][0] - px) * (s[2][1] - py) -
              (s[2][0] - px) * (s[1][1] - py)) /
            area,
          b1 =
            ((s[2][0] - px) * (s[0][1] - py) -
              (s[0][0] - px) * (s[2][1] - py)) /
            area,
          b2 = 1 - b0 - b1;
        if (b0 < -1e-6 || b1 < -1e-6 || b2 < -1e-6) continue;
        const q = b0 * iz[0] + b1 * iz[1] + b2 * iz[2];
        const z = 1 / q;
        const i = y * w + x;
        if (z >= depth[i]) continue;
        b0 = (b0 * iz[0]) / q;
        b1 = (b1 * iz[1]) / q;
        b2 = (b2 * iz[2]) / q;
        let N = norm(
          [0, 1, 2].map(
            (k) => t.n[0][k] * b0 + t.n[1][k] * b1 + t.n[2][k] * b2,
          ),
        );
        const P = [0, 1, 2].map(
          (k) => t.p[0][k] * b0 + t.p[1][k] * b1 + t.p[2][k] * b2,
        );
        const V = norm(sub(eye, P));
        if (back) N = N.map((c) => -c);
        const c = shade(t.m, N, V);
        if (blend) {
          const a = t.m.alpha;
          for (let k = 0; k < 3; k++)
            col[i * 3 + k] = col[i * 3 + k] * (1 - a) + c[k] * a;
        } else {
          depth[i] = z;
          col[i * 3] = c[0];
          col[i * 3 + 1] = c[1];
          col[i * 3 + 2] = c[2];
        }
      }
  };
  // a ground plane, so the stance reads
  const gm = mk(0x6a6d72, { rough: 0.95, metal: 0, double: true });
  const up3 = [
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
  ];
  for (let gx = -12; gx < 12; gx++)
    for (let gz = -12; gz < 12; gz++) {
      draw(
        {
          p: [
            [gx, 0, gz],
            [gx + 1, 0, gz],
            [gx + 1, 0, gz + 1],
          ],
          n: up3,
          m: gm,
        },
        false,
      );
      draw(
        {
          p: [
            [gx, 0, gz],
            [gx + 1, 0, gz + 1],
            [gx, 0, gz + 1],
          ],
          n: up3,
          m: gm,
        },
        false,
      );
    }
  for (const t of tris) if ((t.m.alpha ?? 1) >= 1) draw(t, false);
  for (const t of tris) if ((t.m.alpha ?? 1) < 1) draw(t, true);
  const px = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      for (let k = 0; k < 3; k++) {
        let v = 0;
        for (let dy = 0; dy < SS; dy++)
          for (let dx = 0; dx < SS; dx++)
            v += col[((y * SS + dy) * w + x * SS + dx) * 3 + k];
        px[(y * W + x) * 3 + k] = Math.round(
          255 * Math.pow(Math.max(0, Math.min(1, v / (SS * SS))), 1 / 2.2),
        );
      }
  return px;
}

// ---------------------------------------------------------------- views
const tgt = [0, HGT * 0.48, 0];
const orbit = (az, el, d, fov = 34) => {
  const a = (az * Math.PI) / 180,
    e = (el * Math.PI) / 180;
  return {
    eye: [
      tgt[0] + d * Math.cos(e) * Math.cos(a),
      tgt[1] + d * Math.sin(e),
      tgt[2] + d * Math.cos(e) * Math.sin(a),
    ],
    target: tgt,
    fov,
  };
};
const D = Math.max(LEN * 1.35, HGT * 2.6) + 2.2;
const VIEWS = {
  f34: orbit(35, 13, D),
  r34: orbit(145, 13, D),
  side: orbit(90, 3, D * 1.05),
  front: orbit(0, 6, D * 0.8),
  rear: orbit(180, 6, D * 0.8),
  top: orbit(62, 58, D),
  // standing in the street in front of it, as in the game
  eye: {
    eye: [LEN / 2 + 2.2, 1.6, 0.9],
    target: [LEN / 2 - 0.6, 1.15, 0],
    fov: 72,
  },
  eyeside: { eye: [0.6, 1.6, WID / 2 + 2.4], target: [0.2, 1.1, 0], fov: 72 },
  eyerear: {
    eye: [-LEN / 2 - 2.2, 1.6, -0.9],
    target: [-LEN / 2 + 0.6, 1.1, 0],
    fov: 72,
  },
};
if (opt.eye)
  VIEWS.custom = {
    eye: opt.eye.split(",").map(Number),
    target: (opt.target || "0,1,0").split(",").map(Number),
    fov: +(opt.fov || 50),
  };
const names = (
  views && views !== "all" ? views : "f34,r34,side,front,rear,eye"
).split(",");
const cw = +(opt.w || 760),
  chh = +(opt.h || 470);
const cols = names.length > 1 ? 2 : 1,
  rows = Math.ceil(names.length / cols);
const sheet = new Uint8Array(cw * cols * chh * rows * 3);
names.forEach((name, i) => {
  const v = VIEWS[name];
  const px = render(cw, chh, v.eye, v.target, v.fov);
  const ox = (i % cols) * cw,
    oy = Math.floor(i / cols) * chh;
  for (let y = 0; y < chh; y++)
    sheet.set(
      px.subarray(y * cw * 3, (y + 1) * cw * 3),
      ((oy + y) * cw * cols + ox) * 3,
    );
});

// ---------------------------------------------------------------- png
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const SW = cw * cols,
  SH = chh * rows;
const raw = Buffer.alloc((SW * 3 + 1) * SH);
for (let y = 0; y < SH; y++) {
  raw[y * (SW * 3 + 1)] = 0;
  Buffer.from(sheet.buffer, y * SW * 3, SW * 3).copy(raw, y * (SW * 3 + 1) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SW, 0);
ihdr.writeUInt32BE(SH, 4);
ihdr[8] = 8;
ihdr[9] = 2;
fs.writeFileSync(
  out,
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
console.log(
  `${kind}: ${tris.length} triangles, ${placed.size.join(" x ")} m -> ${out}`,
);
