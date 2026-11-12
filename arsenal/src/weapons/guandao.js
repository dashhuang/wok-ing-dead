// 青龙 · Green Dragon crescent blade (guandao, melee).
// Gun space: +Z along the weapon towards the blade tip, +Y up, +X shooter's left. Origin at the rear-hand
// grip on the shaft. The blade's flat faces look along ±X, the cutting edge points -Y, the spine +Y.
// About 2 m overall: iron butt spike at z ≈ -0.335, blade tip at z ≈ 1.665.

const R = 0.0165; // shaft radius
const Z_BUTT = -0.335;
const Z_SHAFT0 = -0.262;
const Z_SHAFT1 = 0.965;
const Z_DISC = 0.94;
const Z_TASSEL = 0.912;
const H = 0.0045; // half thickness of the blade flats
const N = 64; // samples along the blade

// blade silhouette (z, y), root to tip
const SPINE = [
  [1.03, 0.026],
  [1.12, 0.028],
  [1.22, 0.031],
  [1.32, 0.036],
  [1.42, 0.046],
  [1.5, 0.06],
  [1.57, 0.08],
  [1.622, 0.1],
  [1.665, 0.127],
];
const EDGE = [
  [1.03, -0.024],
  [1.09, -0.042],
  [1.16, -0.072],
  [1.24, -0.099],
  [1.32, -0.113],
  [1.4, -0.113],
  [1.47, -0.1],
  [1.54, -0.072],
  [1.597, -0.028],
  [1.638, 0.032],
  [1.658, 0.088],
  [1.665, 0.127],
];

function catmull(pts, n) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n,
        t2 = t * t,
        t3 = t2 * t;
      const f = (j) =>
        0.5 *
        (2 * p1[j] +
          (-p0[j] + p2[j]) * t +
          (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
          (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push(p1.map((_, j) => f(j)));
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

// resample a polyline to m points evenly spaced by arc length
function resample(poly, m) {
  const L = [0];
  for (let i = 1; i < poly.length; i++)
    L.push(L[i - 1] + Math.hypot(...poly[i].map((v, j) => v - poly[i - 1][j])));
  const tot = L[L.length - 1];
  const out = [];
  let k = 0;
  for (let i = 0; i < m; i++) {
    const s = (i / (m - 1)) * tot;
    while (k < L.length - 2 && L[k + 1] < s) k++;
    const f = (s - L[k]) / (L[k + 1] - L[k] || 1);
    out.push(poly[k].map((v, j) => v + (poly[k + 1][j] - v) * f));
  }
  return out;
}

const SP = resample(catmull(SPINE, 24), N);
const ED = resample(catmull(EDGE, 24), N);
const halfT = (u) =>
  u < 0.8 ? H : H - (H - 0.0007) * ((u - 0.8) / 0.2) ** 1.4;
// bevel line: a band of constant width set in from the edge
const BV = SP.map((s, i) => {
  const e = ED[i];
  const dz = s[0] - e[0],
    dy = s[1] - e[1];
  const d = Math.hypot(dz, dy) || 1;
  const bw = Math.min(0.019, d * 0.5);
  return [e[0] + (dz / d) * bw, e[1] + (dy / d) * bw];
});
// outward normal of the spine (pointing away from the edge)
const SN = SP.map((s, i) => {
  const a = SP[Math.max(0, i - 1)],
    b = SP[Math.min(N - 1, i + 1)];
  let nz = -(b[1] - a[1]),
    ny = b[0] - a[0];
  const l = Math.hypot(nz, ny) || 1;
  nz /= l;
  ny /= l;
  if (nz * (s[0] - ED[i][0]) + ny * (s[1] - ED[i][1]) < 0) {
    nz = -nz;
    ny = -ny;
  }
  return [nz, ny];
});
const lerp2 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

export default function build(kit) {
  const {
    THREE,
    M,
    prism,
    box,
    lathe,
    rod,
    cone,
    sweep,
    helix,
    sphere,
    torus,
    only,
    label,
    wrap,
    adopt,
  } = kit;
  const PI = Math.PI;
  const rng = (() => {
    let s = 19260817;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  })();

  // ------------------------------------------------------------------ helpers
  // quad grid between rows of [x, y, z] points with smooth normals, optional per-vertex colour and wear
  const grid = (rows, hint, colorFn, wear = 0) => {
    const nr = rows.length,
      nc = rows[0].length;
    const pos = [],
      col = [];
    rows.forEach((row, r) =>
      row.forEach((p, c) => {
        pos.push(p[0], p[1], p[2]);
        const k = colorFn ? colorFn(r / (nr - 1), c / (nc - 1)) : [1, 1, 1];
        col.push(k[0], k[1], k[2]);
      }),
    );
    const idx = [];
    for (let r = 0; r < nr - 1; r++)
      for (let c = 0; c < nc - 1; c++) {
        const a = r * nc + c,
          b = a + 1,
          d = a + nc,
          e = d + 1;
        idx.push(a, b, e, a, e, d);
      }
    // make sure the faces look outwards (hint: a vector pointing out of the surface)
    const v = (i) =>
      new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    const mid = Math.floor((nr - 1) / 2) * nc + Math.floor((nc - 1) / 2);
    const nrm = new THREE.Vector3().crossVectors(
      v(mid + 1).sub(v(mid)),
      v(mid + nc + 1).sub(v(mid)),
    );
    if (nrm.dot(hint) < 0)
      for (let i = 0; i < idx.length; i += 3)
        [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    let g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g = g.toNonIndexed();
    const n = g.attributes.position.count;
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    g.setAttribute(
      "aWear",
      new THREE.BufferAttribute(new Float32Array(n).fill(wear), 1),
    );
    return g;
  };
  // tube whose radius runs from r0 to r1 (horns, whiskers, hair, claws)
  const _v = new THREE.Vector3();
  const taper = (pts, r0, r1, seg = 6, steps = 20) => {
    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    const g = new THREE.TubeGeometry(curve, steps, 1, seg, false);
    const pos = g.attributes.position;
    for (let i = 0; i <= steps; i++) {
      const P = curve.getPointAt(i / steps);
      const r = r0 + (r1 - r0) * (i / steps);
      for (let j = 0; j <= seg; j++) {
        const k = i * (seg + 1) + j;
        _v.fromBufferAttribute(pos, k).sub(P).multiplyScalar(r).add(P);
        pos.setXYZ(k, _v.x, _v.y, _v.z);
      }
    }
    return adopt(g);
  };

  // ------------------------------------------------------------------ blade
  // Forged body: dark, with folded-steel grain running along the blade; the hardened zone towards the
  // edge is frosted pale, bounded by a wavy temper line (hamon) with a bright rim. Baked into the
  // vertex colours of the flats so it reads under any light.
  const FLAT_ROWS = [0, 0.18, 0.32, 0.42];
  for (let f = 0.465; f < 0.81; f += 0.032) FLAT_ROWS.push(+f.toFixed(3));
  FLAT_ROWS.push(0.88, 1);
  const temper = (f, c, sx) => {
    const ph = sx > 0 ? 0 : 0.4; // the two faces were not quenched identically
    const h =
      0.64 +
      0.075 * Math.sin(c * PI * 10 + 0.6 + ph) +
      0.04 * Math.sin(c * PI * 23 + 1.7) -
      (0.08 * Math.max(0, c - 0.85)) / 0.15;
    const grain =
      0.07 * Math.sin(c * 70 + Math.sin(f * 7 + c * 9) * 2.6 + f * 11) +
      0.04 * Math.sin(c * 160 + f * 23);
    const body = 0.44 + grain;
    const zone = 1.5 + 0.06 * Math.sin(c * 90 + f * 30);
    const t = Math.max(0, Math.min(1, (f - h + 0.035) / 0.07));
    const e = t * t * (3 - 2 * t);
    const rim = 0.55 * Math.exp(-(((f - h) / 0.032) ** 2));
    return body + (zone - body) * e + rim;
  };
  const bladeGeo = (tintFn) => {
    const parts = { flat: [], bevel: [], spine: [], edge: [] };
    for (const sx of [1, -1]) {
      const hint = new THREE.Vector3(sx, 0, 0);
      // rows from the spine (0) to the bevel line (1), dense where the temper line wanders
      const flatRows = FLAT_ROWS.map((f) =>
        SP.map((s, i) => {
          const p = lerp2(s, BV[i], f);
          return [sx * halfT(i / (N - 1)), p[1], p[0]];
        }),
      );
      parts.flat.push(
        grid(
          flatRows,
          hint,
          (r, c) => {
            const f = FLAT_ROWS[Math.round(r * (FLAT_ROWS.length - 1))];
            const k = temper(f, c, sx);
            const t = tintFn ? tintFn(f * 0.7) : [1, 1, 1];
            return [t[0] * k, t[1] * k, t[2] * k];
          },
          0,
        ),
      );
      const bevRows = [0, 0.5, 1].map((f) =>
        SP.map((s, i) => {
          const p = lerp2(BV[i], ED[i], f);
          const h = halfT(i / (N - 1));
          return [sx * (h + (0.00035 - h) * f), p[1], p[0]];
        }),
      );
      parts.bevel.push(
        grid(
          bevRows,
          hint,
          // the honed bevel is brighter still towards the very edge
          (r) => {
            const t = tintFn ? tintFn(0.7 + r * 0.3) : [1, 1, 1];
            const k = 1.15 + 0.25 * r;
            return [t[0] * k, t[1] * k, t[2] * k];
          },
          0.15,
        ),
      );
    }
    // rounded spine: three rows over the back of the blade
    const spRows = [1, 0, -1].map((k) =>
      SP.map((s, i) => {
        const h = halfT(i / (N - 1));
        const out = k === 0 ? Math.min(0.0016, h * 0.4) : 0;
        return [k * h, s[1] + SN[i][1] * out, s[0] + SN[i][0] * out];
      }),
    );
    parts.spine.push(
      grid(spRows, new THREE.Vector3(0, 1, 0), tintFn && (() => tintFn(0)), 1),
    );
    const edRows = [1, -1].map((k) => ED.map((e) => [k * 0.00035, e[1], e[0]]));
    parts.edge.push(
      grid(edRows, new THREE.Vector3(0, -1, 0), tintFn && (() => tintFn(1)), 1),
    );
    return parts;
  };
  const FLAT = kit.mats.variant(
    "steel_bare",
    // dark forged steel: rough enough that street neon smears instead of mirroring
    {
      color: 0x5c6068,
      rough: 0.5,
      dirt: 0.22,
      dirtColor: 0x3a3430,
      pattern: "brushed",
      pScale: 9,
      env: 0.6,
      edgeAmt: 0.3,
    },
    "guandao-flat",
  );
  const EDGEM = kit.mats.variant(
    "steel_bare",
    // the honed bevel: bright, fine, catches every light
    {
      color: 0xe6eaf0,
      rough: 0.34,
      dirt: 0.05,
      edge: 0xffffff,
      edgeAmt: 0.3,
      env: 1.25,
      pScale: 22,
    },
    "guandao-edge",
  );
  const HEAT_FLAT = kit.mats.variant(
    "steel_bare",
    {
      color: 0x6a5e5a,
      rough: 0.5,
      env: 0.6,
      dirt: 0.6,
      dirtColor: 0x2a1008,
      pattern: "brushed",
      pScale: 9,
    },
    "guandao-heat-flat",
  );
  const HEAT_EDGE = kit.mats.variant(
    "steel_bare",
    {
      color: 0xd07050,
      rough: 0.3,
      dirt: 0.3,
      dirtColor: 0x2a0804,
      edge: 0xffa080,
      // still hot from the forge: the edge zone glows a dull red under the ember line
      emissive: 0xff2a08,
      glow: 0.25,
    },
    "guandao-heat-edge",
  );
  const makeBlade = (name, flatMat, edgeMat, tintFn) => {
    const g = bladeGeo(tintFn);
    const m = M();
    for (const f of g.flat) m.add(f, flatMat);
    for (const f of g.spine) m.add(f, flatMat);
    for (const f of g.bevel) m.add(f, edgeMat);
    for (const f of g.edge) m.add(f, edgeMat);
    // spur: a hooked tooth on the spine
    const spur = [
      [1.215, 0.024],
      [1.3, 0.03],
      [1.292, 0.04, 0.004],
      [1.262, 0.05, 0.006],
      [1.236, 0.077, 0.0015],
      [1.242, 0.058, 0.01],
      [1.226, 0.04, 0.008],
    ];
    m.add(prism(spur, H * 1.7, { bevel: 0.0016, bevelSeg: 2 }), flatMat, {
      color: tintFn ? tintFn(0.1) : 0xffffff,
    });
    // a small second notch near the tip
    m.add(
      prism(
        [
          [1.5, 0.052],
          [1.545, 0.066],
          [1.538, 0.078, 0.002],
          [1.522, 0.074, 0.006],
        ],
        H * 1.4,
        { bevel: 0.0012 },
      ),
      flatMat,
      { color: tintFn ? tintFn(0.1) : 0xffffff },
    );
    return m.build(name);
  };
  const bladeStd = only(makeBlade("blade", FLAT, EDGEM), "base,b");
  const heat = (v) => {
    // dark straw -> plum -> deep red towards the edge
    const k = Math.max(0, Math.min(1, v));
    return [
      1 - 0.1 * k,
      1 - 0.55 * k - 0.2 * k * k,
      1 - 0.6 * k - 0.22 * k * k,
    ];
  };
  const bladeHeat = only(
    makeBlade("blade-heat", HEAT_FLAT, HEAT_EDGE, heat),
    "a",
  );

  // engraved green dragon on both flats (drawn in blade coordinates, metres)
  const LZ0 = 1.1,
    LZ1 = 1.62,
    LY0 = -0.12,
    LY1 = 0.105;
  const Lz = LZ1 - LZ0,
    Ly = LY1 - LY0;
  const dragonBody = catmull(
    [
      [1.128, -0.008],
      [1.165, -0.046],
      [1.215, -0.022],
      [1.265, -0.068],
      [1.325, -0.03],
      [1.385, -0.074],
      [1.435, -0.04],
      [1.47, -0.046],
      [1.495, -0.03],
    ],
    24,
  );
  const drawDragon = (sign, fullerGap) => (g, W, Hh) => {
    g.clearRect(0, 0, W, Hh);
    const s = W / Lz;
    // face "x": canvas right = -Z; face "-x": canvas right = +Z
    if (sign > 0) g.setTransform(-s, 0, 0, -s, LZ1 * s, LY1 * s);
    else g.setTransform(s, 0, 0, -s, -LZ0 * s, LY1 * s);
    // clip to the flat (not the bevel), where the label lies on the steel
    g.beginPath();
    const lim = Math.floor((N - 1) * 0.8);
    for (let i = 0; i <= lim; i++)
      g[i ? "lineTo" : "moveTo"](SP[i][0], SP[i][1] - 0.002);
    for (let i = lim; i >= 0; i--) g.lineTo(BV[i][0], BV[i][1] + 0.002);
    g.closePath();
    g.clip();
    g.lineCap = "round";
    g.lineJoin = "round";
    const path = (pts, close) => {
      g.beginPath();
      pts.forEach((p, i) => g[i ? "lineTo" : "moveTo"](p[0], p[1]));
      if (close) g.closePath();
    };
    const C = dragonBody;
    const nC = C.length;
    const tan = (i) => {
      const a = C[Math.max(0, i - 1)],
        b = C[Math.min(nC - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    };
    const wid = (t) =>
      0.0045 +
      0.0125 * Math.pow(Math.sin(Math.min(1, t * 1.25) * PI * 0.5), 0.8) -
      (t > 0.85 ? (t - 0.85) * 0.03 : 0);
    const side = (k) =>
      C.map((p, i) => {
        const [tz, ty] = tan(i);
        const w = wid(i / (nC - 1)) * 0.5 * k;
        return [p[0] - ty * w, p[1] + tz * w];
      });
    const top = side(1),
      bot = side(-1);
    const GREEN = "#7fe0a4",
      GOLD = "#e2c46a",
      SHADOW = "rgba(6,14,10,0.85)";
    const cloud = (cx, cy, r, flip) => {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * PI * 3.2;
        const rr = r * (1 - i / 52);
        pts.push([cx + Math.cos(a) * rr * flip, cy + Math.sin(a) * rr]);
      }
      return pts;
    };
    const clouds = [
      [1.19, 0.008, 0.0085, 1],
      [1.3, 0.012, 0.01, -1],
      [1.25, -0.088, 0.007, 1],
      [1.42, 0.012, 0.009, 1],
      [1.395, -0.095, 0.006, -1],
      [1.165, -0.06, 0.006, -1],
      [1.505, 0.012, 0.007, -1],
    ];
    for (const pass of [0, 1]) {
      const lw = (w) => (pass ? w * 1.35 : w * 2.4);
      const col = (c) => (pass ? c : SHADOW);
      // clouds: spiral curls with a trailing tail
      g.strokeStyle = col(GOLD);
      g.lineWidth = lw(0.0009);
      for (const [cx, cy, r, f] of clouds) {
        if (fullerGap && cy > -0.02) continue; // B: the jade fuller runs through the upper band
        path(cloud(cx, cy, r, f));
        g.stroke();
        path(cloud(cx + r * 1.4 * f, cy - r * 0.2, r * 0.6, -f));
        g.stroke();
        g.beginPath();
        g.moveTo(cx - r * f, cy - r * 0.3);
        g.quadraticCurveTo(
          cx - r * 2.4 * f,
          cy - r * 0.9,
          cx - r * 3.6 * f,
          cy - r * 0.2,
        );
        g.stroke();
      }
      // body
      if (pass) {
        g.fillStyle = "rgba(50,150,96,0.55)";
        path(top.concat(bot.slice().reverse()), true);
        g.fill();
      }
      g.strokeStyle = col(GREEN);
      g.lineWidth = lw(0.0011);
      path(top);
      g.stroke();
      path(bot);
      g.stroke();
      // belly plates on the lower side
      g.strokeStyle = col(GOLD);
      g.lineWidth = lw(0.0005);
      const belly = side(-0.45);
      path(belly);
      g.stroke();
      for (let i = 3; i < nC - 6; i += 3) {
        g.beginPath();
        g.moveTo(belly[i][0], belly[i][1]);
        g.lineTo(bot[i][0], bot[i][1]);
        g.stroke();
      }
      // scales: rows of small arcs opening towards the tail
      g.lineWidth = lw(0.00045);
      for (let i = 4; i < nC - 8; i += 3) {
        const [tz, ty] = tan(i);
        const w = wid(i / (nC - 1));
        for (const k of [-0.05, 0.25]) {
          const cz = C[i][0] - ty * w * k,
            cy = C[i][1] + tz * w * k;
          const a = Math.atan2(ty, tz);
          g.beginPath();
          g.arc(cz, cy, w * 0.2, a - PI / 2, a + PI / 2);
          g.stroke();
        }
      }
      // dorsal fins along the back
      g.strokeStyle = col(GREEN);
      g.lineWidth = lw(0.0007);
      for (let i = 6; i < nC - 10; i += 7) {
        const [tz, ty] = tan(i);
        const w = wid(i / (nC - 1));
        const p = top[i];
        g.beginPath();
        g.moveTo(p[0] + tz * 0.002, p[1] + ty * 0.002);
        g.lineTo(
          p[0] - ty * w * 0.55 - tz * 0.004,
          p[1] + tz * w * 0.55 - ty * 0.004,
        );
        g.lineTo(p[0] - tz * 0.003, p[1] - ty * 0.003);
        g.stroke();
      }
      // legs with three-clawed feet
      for (const [ti, dir, flip] of [
        [0.3, -1, 1],
        [0.36, 1, -1],
        [0.74, -1, 1],
        [0.8, 1, 1],
      ]) {
        const i = Math.floor(ti * (nC - 1));
        const [tz, ty] = tan(i);
        const p = dir < 0 ? bot[i] : top[i];
        const nz = -ty * dir,
          ny = tz * dir;
        const knee = [
          p[0] + nz * 0.016 + tz * 0.009,
          p[1] + ny * 0.016 + ty * 0.009,
        ];
        const foot = [
          knee[0] + nz * 0.006 - tz * 0.013 * flip,
          knee[1] + ny * 0.006 - ty * 0.013 * flip,
        ];
        g.strokeStyle = col(GREEN);
        g.lineWidth = lw(0.0034);
        path([p, knee, foot]);
        g.stroke();
        g.strokeStyle = col(GOLD);
        g.lineWidth = lw(0.0007);
        path([p, knee, foot]);
        g.stroke();
        // elbow tuft
        g.beginPath();
        g.moveTo(knee[0], knee[1]);
        g.lineTo(
          knee[0] + tz * 0.006 + nz * 0.002,
          knee[1] + ty * 0.006 + ny * 0.002,
        );
        g.stroke();
        g.lineWidth = lw(0.0008);
        for (let c = -1; c <= 1; c++) {
          const a0 = Math.atan2(foot[1] - knee[1], foot[0] - knee[0]) + c * 0.6;
          const q1 = [
            foot[0] + Math.cos(a0) * 0.0065,
            foot[1] + Math.sin(a0) * 0.0065,
          ];
          const q2 = [
            q1[0] + Math.cos(a0 + 1.2) * 0.0032,
            q1[1] + Math.sin(a0 + 1.2) * 0.0032,
          ];
          path([foot, q1, q2]);
          g.stroke();
        }
      }
      // head, looking towards the tip
      {
        const i = nC - 1;
        const [fz, fy] = tan(i);
        const uz = -fy,
          uy = fz;
        const HS = 1.75;
        const P = (f, u) => [
          C[i][0] + (fz * f + uz * u) * HS,
          C[i][1] + (fy * f + uy * u) * HS,
        ];
        const head = [
          P(-0.004, 0.0045),
          P(0.004, 0.0075),
          P(0.011, 0.0068),
          P(0.016, 0.0085),
          P(0.023, 0.0072),
          P(0.026, 0.0045),
          P(0.019, 0.0028),
          P(0.008, 0.0005),
          P(0.02, -0.0022),
          P(0.022, -0.0046),
          P(0.012, -0.004),
          P(0.002, -0.0055),
          P(-0.004, -0.0035),
        ];
        if (pass) {
          g.fillStyle = "rgba(40,120,80,0.55)";
          path(head, true);
          g.fill();
        }
        g.strokeStyle = col(GREEN);
        g.lineWidth = lw(0.0011);
        path(head, true);
        g.stroke();
        // eye, brow, nostril, teeth
        g.strokeStyle = col(GOLD);
        g.lineWidth = lw(0.0007);
        g.beginPath();
        g.arc(...P(0.009, 0.0045), 0.0016, 0, PI * 2);
        g.stroke();
        path([P(0.004, 0.0068), P(0.009, 0.0078), P(0.014, 0.0066)]);
        g.stroke();
        g.beginPath();
        g.arc(...P(0.022, 0.0062), 0.001, 0, PI * 2);
        g.stroke();
        for (let k = 0; k < 4; k++) {
          path([
            P(0.011 + k * 0.003, 0.0022),
            P(0.012 + k * 0.003, 0.0008),
            P(0.013 + k * 0.003, 0.002),
          ]);
          g.stroke();
        }
        // horns sweeping back
        g.strokeStyle = col(GREEN);
        g.lineWidth = lw(0.0012);
        path([
          P(0.003, 0.007),
          P(-0.006, 0.012),
          P(-0.016, 0.013),
          P(-0.022, 0.017),
        ]);
        g.stroke();
        path([P(-0.008, 0.0118), P(-0.011, 0.017)]);
        g.stroke();
        // whiskers trailing in long S-curves
        g.strokeStyle = col(GOLD);
        g.lineWidth = lw(0.0007);
        for (const [a, b] of [
          [1, 0],
          [-1, 0.4],
        ]) {
          const pts = [];
          for (let k = 0; k <= 24; k++) {
            const t = k / 24;
            pts.push(
              P(
                0.024 - t * 0.05,
                a * (0.004 + t * 0.008) + Math.sin(t * PI * 2.2 + b) * 0.004,
              ),
            );
          }
          path(pts);
          g.stroke();
        }
        // mane behind the head
        g.strokeStyle = col(GREEN);
        g.lineWidth = lw(0.0007);
        for (let k = 0; k < 5; k++) {
          path([
            P(-0.002 - k * 0.003, 0.004),
            P(-0.008 - k * 0.003, 0.009 - k * 0.0004),
            P(-0.006 - k * 0.003, 0.004),
          ]);
          g.stroke();
        }
        // the flaming pearl it chases
        const pc = P(0.038, 0.004);
        g.strokeStyle = col(GOLD);
        g.lineWidth = lw(0.0008);
        g.beginPath();
        g.arc(pc[0], pc[1], 0.0048, 0, PI * 2);
        g.stroke();
        path(cloud(pc[0], pc[1], 0.0032, 1).slice(0, 24));
        g.stroke();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * PI * 2;
          const r0 = 0.0056,
            r1 = 0.0085;
          g.beginPath();
          g.moveTo(pc[0] + Math.cos(a) * r0, pc[1] + Math.sin(a) * r0);
          g.quadraticCurveTo(
            pc[0] + Math.cos(a + 0.3) * r1,
            pc[1] + Math.sin(a + 0.3) * r1,
            pc[0] + Math.cos(a + 0.5) * r1 * 1.1,
            pc[1] + Math.sin(a + 0.5) * r1 * 1.1,
          );
          g.stroke();
        }
      }
      // tail tuft
      {
        const p = C[0];
        g.strokeStyle = col(GREEN);
        g.lineWidth = lw(0.0008);
        for (let k = -1; k <= 1; k++) {
          path([
            p,
            [p[0] - 0.006, p[1] + 0.004 + k * 0.004],
            [p[0] - 0.011, p[1] + 0.002 + k * 0.006],
          ]);
          g.stroke();
        }
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  };
  const engraving = new THREE.Group();
  engraving.name = "dragon-engraving";
  for (const [tag, gap] of [
    ["base,a", false],
    ["b", true],
  ]) {
    const set = only(new THREE.Group(), tag);
    for (const sx of [1, -1]) {
      set.add(
        label({
          key: `guandao-dragon-${sx > 0 ? "l" : "r"}${gap ? "-b" : ""}`,
          w: Lz,
          h: Ly,
          px: 2048,
          face: sx > 0 ? "x" : "-x",
          at: [sx * (H + 0.00025), (LY0 + LY1) / 2, (LZ0 + LZ1) / 2],
          metal: 1,
          rough: 0.32,
          draw: drawDragon(sx, gap),
        }),
      );
    }
    engraving.add(set);
  }

  // ------------------------------------------------------------------ dragon-head collar (吞口)
  const TEETH = kit.mats.variant(
    "enamel_white",
    { color: 0xd8ccb0, rough: 0.4 },
    "guandao-teeth",
  );
  const buildHead = (name, mat, accent) => {
    const m = M();
    // socket round the end of the shaft
    m.add(
      lathe(
        [
          [0.952, 0],
          [0.952, 0.0215, 0.001],
          [0.96, 0.0235, 0.002],
          [0.966, 0.0205, 0.001],
          [0.975, 0.0245, 0.003],
          [0.995, 0.022, 0.002],
          [1.0, 0],
        ],
        { seg: 28 },
      ),
      mat,
    );
    // skull with crown and brow
    m.add(
      prism(
        [
          [0.972, 0.0],
          [0.976, 0.042, 0.012],
          [1.008, 0.064, 0.014],
          [1.05, 0.069, 0.01],
          [1.082, 0.058, 0.006],
          [1.09, 0.032, 0.004],
          [1.045, 0.022, 0.004],
          [1.0, 0.002],
        ],
        0.05,
        { bevel: 0.021, bevelSeg: 4 },
      ),
      mat,
    );
    // snout and upper jaw
    m.add(
      prism(
        [
          [1.055, 0.028],
          [1.066, 0.058, 0.006],
          [1.108, 0.051, 0.014],
          [1.14, 0.059, 0.007],
          [1.163, 0.052, 0.004],
          [1.168, 0.04, 0.004],
          [1.124, 0.0325, 0.002],
          [1.07, 0.029, 0.002],
        ],
        0.034,
        { bevel: 0.0145, bevelSeg: 4 },
      ),
      mat,
    );
    // lower jaw under the blade
    m.add(
      prism(
        [
          [0.988, -0.002],
          [1.04, -0.022],
          [1.1, -0.031, 0.002],
          [1.13, -0.036, 0.003],
          [1.142, -0.047, 0.004],
          [1.112, -0.058, 0.008],
          [1.06, -0.057, 0.012],
          [1.012, -0.042, 0.012],
          [0.982, -0.02, 0.004],
        ],
        0.036,
        { bevel: 0.0125, bevelSeg: 4 },
      ),
      mat,
    );
    // mane: flame-like locks streaming back over the socket, beard hanging from the chin
    for (let k = 0; k < 7; k++) {
      const a = -1.1 + (k / 6) * 2.2; // spread round the back of the skull
      const x = Math.sin(a) * 0.02,
        y = 0.03 + Math.cos(a) * 0.026;
      const L = 0.05 + (k % 2) * 0.014;
      m.add(
        taper(
          [
            [x, y, 1.0],
            [x * 1.5, y + 0.008, 0.985 - L * 0.3],
            [x * 1.9, y + 0.006 + Math.cos(a) * 0.01, 0.99 - L * 0.75],
            [x * 2.1, y + 0.016 + Math.cos(a) * 0.012, 0.99 - L],
          ],
          0.0062,
          0.0012,
          6,
          12,
        ),
        mat,
        { wear: 0.4 },
      );
    }
    for (let k = 0; k < 5; k++) {
      const x = (k - 2) * 0.0075;
      const L = 0.028 + (2 - Math.abs(k - 2)) * 0.008;
      m.add(
        taper(
          [
            [x, -0.05, 1.085 - Math.abs(k - 2) * 0.008],
            [x * 1.2, -0.062, 1.06],
            [x * 1.3, -0.058 - L * 0.6, 1.035],
            [x * 1.4, -0.06 - L, 1.02],
          ],
          0.0042,
          0.0009,
          6,
          10,
        ),
        mat,
        { wear: 0.4 },
      );
    }
    // throat: dark red behind the blade root so the open mouth does not read as a hole
    m.add(
      prism(
        [
          [1.0, -0.026],
          [1.07, -0.026],
          [1.07, 0.03],
          [1.0, 0.03],
        ],
        0.026,
        { bevel: 0.011, bevelSeg: 3 },
      ),
      "lacquer_red",
      { color: 0xa04848 },
    );
    // flame brows rising over the eyes
    m.add(
      prism(
        [
          [1.04, 0.058],
          [1.082, 0.058, 0.002],
          [1.094, 0.07, 0.003],
          [1.078, 0.066],
          [1.064, 0.078, 0.002],
          [1.058, 0.066],
          [1.04, 0.072, 0.002],
        ],
        0.007,
        { bevel: 0.002, bevelSeg: 2 },
      ),
      mat,
      { at: [0.019, 0, 0], mirror: true },
    );
    // eyes in rings, nostrils
    m.add(sphere(0.0062, { seg: 16, rings: 10, squash: [0.7, 1, 1] }), accent, {
      at: [0.0225, 0.05, 1.07],
      mirror: true,
      wear: 0.2,
    });
    m.add(torus(0.0068, 0.0014, { seg: 6, around: 18 }), mat, {
      at: [0.0232, 0.05, 1.07],
      rot: [0, PI / 2, 0],
      mirror: true,
      wear: 0.3,
    });
    m.add(sphere(0.0066, { seg: 14, rings: 10 }), mat, {
      at: [0.009, 0.055, 1.152],
      mirror: true,
      wear: 0.4,
    });
    m.add(torus(0.0036, 0.0012, { seg: 6, around: 14 }), mat, {
      at: [0.011, 0.058, 1.158],
      rot: [0.5, 0.6, 0],
      mirror: true,
      wear: 0.4,
    });
    // teeth biting the blade from both jaws
    for (const [z, l, r] of [
      [1.078, 0.007, 0.0024],
      [1.093, 0.008, 0.0026],
      [1.108, 0.009, 0.0028],
      [1.124, 0.01, 0.003],
      [1.142, 0.009, 0.0028],
      [1.158, 0.017, 0.0036],
    ]) {
      m.add(cone(r, 0.0003, 0, l, { seg: 8 }), TEETH, {
        rot: [PI / 2, 0, 0],
        at: [0.0082, 0.0335, z],
        mirror: true,
        wear: 0.25,
      });
    }
    for (const [z, l, r] of [
      [1.068, 0.007, 0.0024],
      [1.086, 0.008, 0.0026],
      [1.104, 0.009, 0.0028],
      [1.13, 0.016, 0.0034],
    ]) {
      m.add(cone(r, 0.0003, 0, l, { seg: 8 }), TEETH, {
        rot: [-PI / 2, 0, 0],
        at: [0.0082, -0.029 - (z - 1.06) * 0.1, z],
        mirror: true,
        wear: 0.25,
      });
    }
    // antler horns
    m.add(
      taper(
        [
          [0.012, 0.062, 1.04],
          [0.016, 0.078, 1.012],
          [0.021, 0.09, 0.976],
          [0.03, 0.092, 0.944],
        ],
        0.0046,
        0.0012,
        7,
        16,
      ),
      mat,
      { mirror: true, wear: 0.35 },
    );
    m.add(
      taper(
        [
          [0.019, 0.085, 0.99],
          [0.022, 0.1, 0.988],
          [0.026, 0.107, 0.976],
        ],
        0.0026,
        0.0008,
        6,
        8,
      ),
      mat,
      { mirror: true, wear: 0.35 },
    );
    // whiskers flowing back from the snout
    m.add(
      taper(
        [
          [0.014, 0.045, 1.158],
          [0.028, 0.05, 1.13],
          [0.04, 0.036, 1.09],
          [0.045, 0.052, 1.045],
          [0.052, 0.032, 0.99],
        ],
        0.0019,
        0.0005,
        6,
        28,
      ),
      mat,
      { mirror: true, wear: 0.35 },
    );
    return m.build(name);
  };
  const headStd = only(
    buildHead(
      "head",
      kit.mats.variant(
        "bronze",
        { color: 0x76603a, bump: 0.0003, pScale: 70, dirt: 0.8 },
        "guandao-bronze",
      ),
      "agate_red",
    ),
    "base,a",
  );
  const headGilt = only(
    buildHead(
      "head-gilt",
      kit.mats.variant(
        "gold",
        { color: 0xc09038, rough: 0.32, dirt: 0.6, dirtColor: 0x4a3010 },
        "guandao-gilt",
      ),
      "jade",
    ),
    "b",
  );

  // ------------------------------------------------------------------ shaft, guard disc, ferrules, butt spike (fixed)
  // old vermilion lacquer: deep, satin rather than glassy, rubbed through where the front hand slides
  const LACQ = kit.mats.variant(
    "lacquer_red",
    { color: 0x6c140b, rough: 0.44, coat: 0.3, dirt: 0.8, env: 0.7 },
    "guandao-lacquer",
  );
  const LACQ_WORN = kit.mats.variant(
    "lacquer_red",
    {
      color: 0x5a130b,
      rough: 0.58,
      coat: 0.12,
      dirt: 0.9,
      edge: 0x24120a,
      edgeAmt: 1,
      edgeRough: 0.75,
      env: 0.6,
    },
    "guandao-lacquer-worn",
  );
  // bronze fittings polished by handling: brighter and smoother than the cast head
  const FERR = kit.mats.variant(
    "bronze",
    {
      color: 0x9c7840,
      rough: 0.3,
      dirt: 0.5,
      edge: 0xf0c878,
      edgeAmt: 1,
      pAlbedo: 0.35,
    },
    "guandao-ferrule",
  );
  const sh = M();
  sh.add(rod(R, Z_SHAFT0, 0.444, { seg: 28 }), LACQ);
  sh.add(rod(R, 0.444, 0.6, { seg: 28, wear: 0.9 }), LACQ_WORN);
  sh.add(rod(R, 0.6, Z_SHAFT1, { seg: 28 }), LACQ);
  // guard disc: an eight-petal plate
  const petals = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * PI * 2;
    const r = 0.041 + 0.008 * Math.abs(Math.cos(a * 4)) ** 0.6;
    petals.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  sh.add(
    prism(petals, 0.011, { plane: "front", bevel: 0.0025, bevelSeg: 2 }),
    "bronze",
    { at: [0, 0, Z_DISC] },
  );
  sh.add(
    lathe(
      [
        [Z_DISC - 0.012, 0],
        [Z_DISC - 0.012, 0.022, 0.002],
        [Z_DISC - 0.0055, 0.028, 0.002],
        [Z_DISC - 0.0055, 0],
      ],
      { seg: 28 },
    ),
    "bronze",
  );
  sh.add(torus(0.034, 0.0018, { seg: 6, around: 40 }), "brass_aged", {
    at: [0, 0, Z_DISC - 0.006],
    wear: 0.3,
  });
  sh.add(
    lathe(
      [
        [Z_DISC + 0.005, 0],
        [Z_DISC + 0.005, 0.026, 0.002],
        [Z_DISC + 0.012, 0.022, 0.002],
        [Z_DISC + 0.012, 0],
      ],
      { seg: 28 },
    ),
    "bronze",
  );
  // tassel collar and ferrules
  const ferrule = (z0, z1, r = R + 0.0028) =>
    sh.add(
      lathe(
        [
          [z0, 0],
          [z0, r - 0.0012, 0.0006],
          [z0 + 0.0025, r, 0.0008],
          [z1 - 0.0025, r, 0.0008],
          [z1, r - 0.0012, 0.0006],
          [z1, 0],
        ],
        { seg: 28 },
      ),
      FERR,
      { wear: 1 },
    );
  ferrule(Z_TASSEL - 0.012, Z_TASSEL + 0.01, R + 0.0045);
  ferrule(0.86, 0.884);
  ferrule(0.43, 0.444, R + 0.002);
  ferrule(0.2, 0.214);
  ferrule(-0.172, -0.158);
  ferrule(-0.262, -0.228, R + 0.0034);
  for (const z of [0.872, -0.245])
    sh.add(torus(R + 0.0034, 0.0011, { seg: 6, around: 32 }), "brass_aged", {
      at: [0, 0, z],
      wear: 0.3,
    });
  // wrapped grip round the rear hand
  sh.add(rod(R + 0.0012, -0.158, 0.2, { seg: 28 }), "leather");
  sh.add(
    helix(R + 0.0018, 0.0014, -0.156, 0.198, 20, { seg: 4, perTurn: 10 }),
    "cord_gold",
    { wear: 0.3 },
  );
  sh.add(
    helix(R + 0.0018, 0.0014, -0.156, 0.198, 20, {
      seg: 4,
      perTurn: 10,
      phase: PI,
    }),
    "cord_red",
    { wear: 0.3 },
  );
  // iron butt spike (鐏)
  sh.add(
    lathe(
      [
        [Z_BUTT, 0],
        [Z_BUTT + 0.03, 0.0075],
        [Z_BUTT + 0.058, 0.0125],
        [Z_BUTT + 0.064, 0.0172, 0.002],
        [Z_BUTT + 0.075, 0.0172, 0.002],
        [Z_BUTT + 0.075, 0],
      ],
      { seg: 8, flat: true },
    ),
    "iron_cast",
  );
  const shaft = sh.build("shaft");
  // gilt cloud band and the weapon's name painted on the lacquer
  shaft.add(
    wrap({
      key: "guandao-shaft-band",
      r: R + 0.0002,
      z0: 0.62,
      z1: 0.85,
      px: 512,
      opaque: false,
      metal: 1,
      rough: 0.3,
      draw(g, W, Hh) {
        g.clearRect(0, 0, W, Hh);
        g.strokeStyle = "#e4bc5c";
        g.fillStyle = "#e4bc5c";
        // double gilt rules at both ends
        for (const y of [6, 30, Hh - 30, Hh - 6])
          g.fillRect(
            0,
            y - (y === 6 || y === Hh - 6 ? 6 : 2),
            W,
            y === 6 || y === Hh - 6 ? 12 : 4,
          );
        // rows of ruyi cloud curls running round the shaft
        g.lineWidth = 7;
        g.lineCap = "round";
        for (const [y, flip] of [
          [Hh * 0.1, 1],
          [Hh * 0.9, -1],
        ]) {
          for (let k = 0; k < 4; k++) {
            const x = (k + 0.5) * (W / 4);
            for (const sgn of [-1, 1]) {
              g.beginPath();
              for (let i = 0; i <= 36; i++) {
                const a = (i / 36) * PI * 2.4;
                const r = 30 * (1 - i / 48);
                g[i ? "lineTo" : "moveTo"](
                  x + sgn * 30 + Math.cos(a) * r * -sgn,
                  y + Math.sin(a) * r * flip,
                );
              }
              g.stroke();
            }
            g.beginPath();
            g.moveTo(x - 30, y + 30 * flip);
            g.quadraticCurveTo(x, y + 60 * flip, x + 30, y + 30 * flip);
            g.stroke();
          }
        }
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `900 ${W * 0.2}px ${kit.FONT_KAI}`;
        for (const cx of [W * 0.25, W * 0.75])
          [..."青龍偃月"].forEach((c, i) =>
            g.fillText(c, cx, Hh * (0.3 + i * 0.135)),
          );
      },
    }),
  );

  // ------------------------------------------------------------------ red horse-hair tassel ring (sways)
  const buildTassel = (name, len, n, tones) => {
    const m = M();
    // bushy core drooping back from the collar
    const core = lathe(
      [
        [-len * 0.82, 0],
        [-len * 0.75, 0.014, 0.01],
        [-len * 0.4, 0.032, 0.03],
        [-len * 0.12, 0.03, 0.02],
        [0, 0.022, 0.004],
        [0.004, 0],
      ],
      { seg: 22 },
    );
    const p = core.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const k =
        1 +
        0.16 * Math.sin(Math.atan2(y, x) * 11 + z * 60) * Math.min(1, -z * 30);
      p.setXYZ(i, x * k, y * k - 1.1 * z * z, z);
    }
    m.add(core, "cord_red", { color: 0x9a6a64 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + rng() * 0.2;
      const L = len * (0.82 + rng() * 0.3);
      const spread = 0.016 + rng() * 0.02;
      const pts = [];
      for (let k = 0; k <= 4; k++) {
        const t = k / 4;
        const r =
          0.02 +
          spread * Math.sin(Math.min(1, t * 1.6) * PI * 0.5) -
          t * t * 0.01;
        const z = -L * t;
        pts.push([
          Math.cos(a) * r,
          Math.sin(a) * r * 0.9 - 1.1 * z * z + Math.sin(t * 4 + i) * 0.003,
          z,
        ]);
      }
      m.add(taper(pts, 0.0019, 0.0004, 3, 7), "cord_red", {
        color: tones[1 + (i % (tones.length - 1))],
        wear: 0.25,
      });
    }
    // binding cord over the collar
    m.add(torus(0.0215, 0.0016, { seg: 6, around: 28 }), "cord_gold", {
      at: [0, 0, -0.004],
      wear: 0.3,
    });
    const node = m.build(name);
    node.position.set(0, 0, Z_TASSEL - 0.004);
    return node;
  };
  const tasselStd = only(
    buildTassel("tassel", 0.17, 110, [0xffffff, 0xffffff, 0xd8c8c8, 0xffe0d8]),
    "base,b",
  );
  const tasselFire = only(
    buildTassel(
      "tassel-fire",
      0.27,
      130,
      [0xffd0b0, 0xffd8a0, 0xffb080, 0xffe8b0, 0xffffff],
    ),
    "a",
  );
  const tassels = [tasselStd, tasselFire];

  // ------------------------------------------------------------------ branch A: flame ornaments on the spine, ember edge
  const fa = M();
  const FLAME = kit.mats.variant(
    "brass",
    { color: 0xa87a38, rough: 0.34, dirt: 0.7, dirtColor: 0x3a2010 },
    "guandao-flame",
  );
  for (const [u, sc] of [
    [0.3, 1.0],
    [0.46, 0.9],
    [0.61, 0.78],
  ]) {
    const i = Math.round(u * (N - 1));
    const s = SP[i],
      nz = SN[i][0],
      ny = SN[i][1];
    const tz = ny,
      ty = -nz; // tangent pointing towards the tip
    const pts = [
      [0, -0.004],
      [0.05, -0.004],
      [0.056, 0.01, 0.008],
      [0.046, 0.026, 0.006],
      [0.036, 0.048, 0.001],
      [0.03, 0.02, 0.005],
      [0.016, 0.036, 0.001],
      [0.01, 0.014, 0.004],
      [-0.014, 0.026, 0.001],
      [-0.002, 0.006, 0.004],
    ].map(([t, n, r]) => [
      s[0] + (tz * (t - 0.025) + nz * n) * sc,
      s[1] + (ty * (t - 0.025) + ny * n) * sc,
      r,
    ]);
    fa.add(prism(pts, H * 2 + 0.0034, { bevel: 0.0014, bevelSeg: 2 }), FLAME, {
      wear: 0.6,
    });
    // rivets
    fa.add(sphere(0.0018, { seg: 8, rings: 6 }), "brass_aged", {
      at: [H + 0.0017, s[1] + ny * 0.002, s[0] + nz * 0.002],
      mirror: true,
      wear: 0.3,
    });
  }
  const flames = only(fa.build("flames-a"), "a");
  const ember = kit.mats.glow(0xff4a12, 3, { base: 0x2a0602 }).clone();
  ember.userData.glow = 3;
  kit.mats.glowMats.push(ember);
  const em = M();
  em.add(
    sweep(
      ED.slice(4, N - 2).map((e) => [0, e[1], e[0]]),
      0.0013,
      { seg: 6, steps: 120 },
    ),
    ember,
  );
  const emberLine = only(em.build("ember-a"), "a");

  // ------------------------------------------------------------------ branch B: jade-inlaid fuller, cyan glow line
  const fb = M();
  const fuller = (f0, f1, u0, u1) => {
    const a = [],
      b = [];
    for (let i = Math.round(u0 * (N - 1)); i <= Math.round(u1 * (N - 1)); i++) {
      const u = (i / (N - 1) - u0) / (u1 - u0);
      const k = Math.pow(Math.sin(u * PI), 0.35); // pointed ends
      const mid = (f0 + f1) / 2,
        hw = ((f1 - f0) / 2) * k;
      a.push(lerp2(SP[i], BV[i], mid - hw));
      b.push(lerp2(SP[i], BV[i], mid + hw));
    }
    return a.concat(b.reverse());
  };
  fb.add(
    prism(fuller(0.1, 0.36, 0.1, 0.74), H * 2 + 0.0006, { bevel: 0.0002 }),
    "steel_dark",
  );
  // the inlay reads as stone with depth: a deep green core that seems lit from inside, pale clouds
  // floating in it, and a clear polished skin over the top that carries the highlights
  fb.add(
    prism(fuller(0.15, 0.31, 0.12, 0.72), H * 2 + 0.0008, { bevel: 0.0003 }),
    kit.mats.variant(
      "jade",
      {
        color: 0x0a3f27,
        rough: 0.3,
        coat: 0,
        emissive: 0x16804e,
        glow: 0.4,
        dirt: 0.9,
        dirtColor: 0x2a6a40,
        edgeAmt: 0,
        wScale: 30,
      },
      "guandao-jade-core",
    ),
  );
  const cloud = kit.mats.variant(
    "jade",
    {
      color: 0x3a9a6a,
      rough: 0.4,
      coat: 0,
      emissive: 0x2a9a64,
      glow: 0.22,
      dirt: 0,
      edgeAmt: 0,
    },
    "guandao-jade-cloud",
  );
  // pale veins drifting along the stone
  for (let k = 0; k < 7; k++) {
    const u = 0.18 + (k / 6) * 0.48 + (rng() - 0.5) * 0.04;
    const i = Math.round(u * (N - 1));
    const p = lerp2(SP[i], BV[i], 0.19 + rng() * 0.1);
    const a = Math.atan2(
      SP[i + 1][1] - SP[i - 1][1],
      SP[i + 1][0] - SP[i - 1][0],
    );
    fb.add(
      sphere(0.007 + rng() * 0.005, {
        seg: 8,
        rings: 4,
        squash: [0.05, 0.22 + rng() * 0.15, 2.6],
      }),
      cloud,
      {
        at: [H + 0.0002, p[1], p[0]],
        rot: [-a + (rng() - 0.5) * 0.4, 0, 0],
        mirror: true,
      },
    );
  }
  fb.add(
    prism(fuller(0.145, 0.315, 0.115, 0.725), H * 2 + 0.0019, {
      bevel: 0.0007,
    }),
    kit.mats.glass(0x5ad8a0, { opacity: 0.16, rough: 0.05 }),
  );
  const fullerB = only(fb.build("fuller-b"), "b");
  const qing = kit.mats.glow(0x3fe0a0, 2.2).clone();
  qing.userData.glow = 2.2;
  kit.mats.glowMats.push(qing);
  const gl = M();
  for (const sx of [1, -1]) {
    gl.add(
      sweep(
        BV.slice(5, N - 6).map((b, i) => [
          sx * halfT((i + 5) / (N - 1)),
          b[1],
          b[0],
        ]),
        0.0006,
        { seg: 5, steps: 100 },
      ),
      qing,
    );
  }
  const glowB = only(gl.build("glow-b"), "b");

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "guandao";
  // Everything turns about the shaft inside the hands (the grips stay on `root`): held at the
  // ready the edge faces the enemy, forward and down; a cut rolls the shaft so the edge leads.
  const turn = new THREE.Group();
  turn.name = "turn";
  root.add(turn);
  turn.add(
    shaft,
    bladeStd,
    bladeHeat,
    engraving,
    headStd,
    headGilt,
    tasselStd,
    tasselFire,
    flames,
    emberLine,
    fullerB,
    glowB,
  );

  // both hands on the shaft like a spear: the right (rear) hand at the origin, the left a forearm's
  // length further up; thumbs towards the blade. The shaft lies across the roots of the fingers (not
  // the middle of the palm) so the fingers close round it; the rear hand rides over the top of the
  // shaft, knuckles up, fingers nearly square to it, which keeps its wrist in range through the cuts.
  const RG = R + 0.0012; // leather-wrapped grip
  // 甲's rising cut throws the rig up by ~60°: the front hand slides down the shaft towards the rear
  // hand (as the shaft runs through it) so that it stays low in the view, then slides back.
  const LEFT_AT = [-0.0072, -0.019, 0.493];
  const SLID_Z = 0.15;
  const slide = { swinging: false, rising: false, lastCharge: 0 };
  // 乙's throw takes the polearm out of the view rig at once. The hands let go where they were: while
  // it is away the grip anchors ride the camera from the place they had (the arms then drop out of
  // view from there), and they go back on the shaft when it is caught.
  const SIDES = ["right", "left"];
  const held = {
    camera: null,
    away: false,
    pos: { right: new THREE.Vector3(), left: new THREE.Vector3() },
    rot: { right: new THREE.Quaternion(), left: new THREE.Quaternion() },
    // last place relative to the camera (the throw has already moved the weapon when we hear of it)
    camPos: { right: new THREE.Vector3(), left: new THREE.Vector3() },
    camRot: { right: new THREE.Quaternion(), left: new THREE.Quaternion() },
  };
  const _hm = new THREE.Matrix4(),
    _hs = new THREE.Vector3();
  const cameraOf = () => {
    const pose = model.holder.parent;
    const kick = pose && pose.parent;
    const mount = kick && kick.parent;
    return mount && mount.parent && mount.parent.isCamera ? mount.parent : null;
  };
  const smooth = (a, b, x) => {
    const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  // Turn of the shaft in the hands, radians about +Z: held at the ready, the two heavy cuts
  // (right to left, then back), and the rising cut (edge up).
  const TURN = { rest: -0.5, cut: [0, -1.6], rise: 2.64 };
  let turnNow = 0;
  let model;
  model = kit.weapon({
    id: "guandao",
    root,
    hands: () => ({
      right: {
        at: [-0.0071, 0.021, -0.0041],
        palm: [0.8253, -0.5646, 0],
        fingers: [-0.5394, -0.7885, 0.2955],
        pose: {
          base: "wrap",
          r: RG,
          thumb: [0.55, -0.6, 0.55, 0.5, 0],
          index: [0.9, 1.05, 0.74, 0.03],
          middle: [1.3, 1, 0.7, 0],
          ring: [1.4, 0.85, 0.6, -0.02],
          pinky: [1.35, 0.6, 0.42, -0.05],
        },
      },
      left: {
        at: LEFT_AT,
        palm: [0.826, 0.563, 0],
        fingers: [-0.488, 0.716, 0.5],
        pose: {
          base: "wrap",
          r: R,
          thumb: [0.55, -0.6, 0.55, 0.8, 0.2],
          index: [0.6, 1.1, 0.77, 0.03],
          middle: [1.25, 1.05, 0.74, 0],
          ring: [1.45, 0.9, 0.63, -0.02],
          pinky: [1.55, 0.6, 0.42, -0.05],
        },
      },
    }),
    anchors: {
      base: { parent: turn, at: [0, -0.004, 1.13] },
      tip: { parent: turn, at: [0, SP[N - 1][1], SP[N - 1][0]] },
      spin: [0, -0.008, 0.98],
    },
    view: { hip: { pos: [0.26, -0.46, -0.02], rot: [0.644, 0, -0.972] } },
    show: { yaw: -0.85, pitch: 0.12, dist: 2.35 },
    // s.t: idle sway of the horse-hair tassel; s.swing (0 -> 1 during a slash) whips it;
    // A: s.heat / s.charge make the ember edge burn brighter; B: the qing glow breathes.
    update(s, dt = 1 / 60) {
      const t = s.t || 0;
      const sw =
        s.swing !== undefined && s.swing >= 0 ? Math.sin(s.swing * PI) : 0;
      // how the shaft is turned in the hands (see `turn`)
      {
        const inHand = !!cameraOf();
        const rest = inHand ? TURN.rest : 0; // on the stand the blade is shown flat-on
        let want = rest;
        if (inHand || !held.away) {
          if (s.swing !== undefined && s.swing >= 0) {
            const to =
              s.swingN === 9 ? TURN.rise : TURN.cut[(s.swingN || 0) % 2];
            want =
              rest +
              (to - rest) *
                smooth(0, 0.18, s.swing) *
                (1 - smooth(0.6, 0.95, s.swing));
          } else if (s.branch === "a" && (s.charge || 0) > 0)
            // 拖刀: the blade is turned edge-up while it drags, ready for the rising cut
            want = rest + (TURN.rise - rest) * smooth(0, 0.5, s.charge);
        } else want = 0; // thrown: it flies flat, as it left
        turnNow += (want - turnNow) * Math.min(1, dt * 16);
        turn.rotation.z = turnNow;
      }
      const boost = (s.level || 1) >= 5 ? 1.8 : 1;
      if (model) {
        const swing = s.swing !== undefined && s.swing >= 0 ? s.swing : -1;
        if (swing >= 0 && !slide.swinging)
          slide.rising = s.branch === "a" && slide.lastCharge > 0.4;
        slide.swinging = swing >= 0;
        if (!slide.swinging) slide.rising = false;
        slide.lastCharge = s.charge || 0;
        const cam = cameraOf();
        if (cam) held.camera = cam;
        if (!cam && held.camera && !held.away) {
          // thrown (the weapon has just left the rig, still where it was): let go in place
          held.away = true;
          for (let i = 0; i < 2; i++) {
            const g = model.grips[SIDES[i]];
            if (!g) continue;
            held.camera.add(g.anchor);
            g.anchor.position.copy(held.camPos[SIDES[i]]);
            g.anchor.quaternion.copy(held.camRot[SIDES[i]]);
          }
        } else if (cam && held.away) {
          // caught: back on the shaft
          held.away = false;
          for (let i = 0; i < 2; i++) {
            const g = model.grips[SIDES[i]];
            if (!g) continue;
            root.add(g.anchor);
            g.anchor.position.copy(held.pos[SIDES[i]]);
            g.anchor.quaternion.copy(held.rot[SIDES[i]]);
          }
        }
        const L = model.grips.left;
        if (L && !held.away) {
          const k = slide.rising
            ? smooth(0.08, 0.32, swing) * (1 - smooth(0.62, 0.95, swing))
            : 0;
          const sc =
            1 +
            (RG / R - 1) *
              smooth(
                SLID_Z + 0.06,
                SLID_Z,
                LEFT_AT[2] + (SLID_Z - LEFT_AT[2]) * k,
              );
          L.anchor.position.set(
            LEFT_AT[0] * sc,
            LEFT_AT[1] * sc,
            LEFT_AT[2] + (SLID_Z - LEFT_AT[2]) * k,
          );
        }
        if (cam) {
          // remember the grips: on the shaft (for the catch) and relative to the camera (for a throw)
          cam.updateWorldMatrix(true, false);
          for (let i = 0; i < 2; i++) {
            const g = model.grips[SIDES[i]];
            if (!g) continue;
            held.pos[SIDES[i]].copy(g.anchor.position);
            held.rot[SIDES[i]].copy(g.anchor.quaternion);
            g.anchor.updateWorldMatrix(true, false);
            _hm.copy(cam.matrixWorld).invert().multiply(g.anchor.matrixWorld);
            _hm.decompose(held.camPos[SIDES[i]], held.camRot[SIDES[i]], _hs);
          }
        }
      }
      for (let i = 0; i < tassels.length; i++) {
        const n = tassels[i];
        n.rotation.x = Math.sin(t * 1.4 + i) * 0.05 + sw * 0.55;
        n.rotation.y =
          Math.sin(t * 1.05 + 0.6) * 0.07 -
          sw * 0.4 * Math.cos((s.swing || 0) * PI * 2);
        n.rotation.z = Math.sin(t * 0.7) * 0.25 + sw * 0.6;
      }
      const h = Math.max(s.heat || 0, s.charge || 0);
      const flick = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3 + 1);
      ember.emissiveIntensity = (2.4 + h * 4 + sw * 1.5) * flick * boost;
      qing.emissiveIntensity =
        (1.8 + 0.5 * Math.sin(t * 1.6) + (s.charge || 0) * 1.5) * boost;
    },
  });
  return model;
}
