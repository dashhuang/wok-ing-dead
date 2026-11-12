var OD = [0.2, 0.22, 0.15];
var ODK = [0.14, 0.155, 0.11];
var GRY = [0.3, 0.31, 0.32];
var SEAL = [0.05, 0.05, 0.055];
var CAN = [0.26, 0.27, 0.2];
var REDF = [0.75, 0.06, 0.04];
var KEYS = [[-9.5, 0.15, 1.88, 2.3, 0], [-8.6, 0.23, 1.78, 2.3, 0], [-5, 0.4, 1.44, 2.3, 0.1], [-3.6, 0.64, 1.1, 2.32, 0.45], [-2.6, 1, 0.7, 2.36, 0.85], [-1.9, 1.18, 0.55, 2.38, 1], [2.9, 1.18, 0.55, 2.38, 1], [3.7, 1.13, 0.55, 2.31, 0.85], [4.4, 1, 0.58, 2.08, 0.6], [5, 0.78, 0.7, 1.72, 0.35], [5.4, 0.46, 0.88, 1.42, 0.15], [5.62, 0.03, 1.12, 1.18, 0]];
var ROWS = [[0, 0], [0.45, 0], [0.8, 0.02], [0.95, 0.1], [1, 0.26], [1, 0.45], [0.99, 0.62], [0.96, 0.78], [0.88, 0.89], [0.7, 0.96], [0.4, 0.992], [0, 1]];
var NR = ROWS.length - 1;
var NRING = NR * 2;
var hullAt = keyCurve(KEYS);
function rowPt(z, h, sd, out) {
  const [, a, yb, yt, sq] = hullAt(z), th = -H + PI5 * h / NR, ex = Math.cos(th) * a, ey = (yb + yt) / 2 + Math.sin(th) * (yt - yb) / 2, bx3 = ROWS[h][0] * a, by = yb + ROWS[h][1] * (yt - yb);
  out.set(sd * lerp2(ex, bx3, sq), lerp2(ey, by, sq), z);
  return out;
}
var ringPt = (z, j, out) => j <= NR ? rowPt(z, j, 1, out) : rowPt(z, NRING - j, -1, out);
var DOOR = [-1, 1.6, 2, 7];
var CUTS = [
  [4.05, 5.05, 5, 10, 0, "glass"],
  [4.75, 5.35, 1, 3, 0, "glass"],
  [3, 3.95, 5, 7, 0, "glass"],
  [0.4, 1.3, 5, 6, -1, "glass"],
  [-0.7, 0.2, 5, 6, -1, "glass"],
  [-1.75, -1.2, 5, 6, 0, "glass"],
  [DOOR[0], DOOR[1], DOOR[2], DOOR[3], 1, null]
];
var cellKey = (j, u0, u1) => {
  const r = j < NR ? j : NRING - 1 - j, sd = j < NR ? 1 : -1;
  for (const [z0, z1, r0, r1, s, key] of CUTS) if (u0 >= z0 - 1e-4 && u1 <= z1 + 1e-4 && r >= r0 && r <= r1 && (!s || s === sd)) return key;
  return "body";
};
function outline(z0, z1, r0, r1, sd, off = 6e-3, dz = 0) {
  const o = new Vector3(), pts = [], add = (z, h) => {
    rowPt(z, h, sd, o);
    pts.push([o.x + sd * off, o.y, o.z + dz]);
  }, nz = Math.max(2, Math.round((z1 - z0) / 0.2));
  for (let h = r0; h <= r1 + 1; h++) add(z0, h);
  for (let i = 1; i <= nz; i++) add(lerp2(z0, z1, i / nz), r1 + 1);
  for (let h = r1; h >= r0; h--) add(z1, h);
  for (let i = 1; i < nz; i++) add(lerp2(z1, z0, i / nz), r0);
  return pts;
}
var zy = (P3, mat, prof, x0, x1, o = {}) => P3.ext(mat, prof, -x1, -x0, { ...o, plane: "xy", r: [0, -H, 0] });
var foil = (c, t, n = 5) => {
  const up = [], dn = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, y = t * 2.6 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u * u * u - 0.1036 * u * u * u * u);
    up.push([(u - 0.28) * c, y]);
    if (i > 0 && i < n) dn.unshift([(u - 0.28) * c, -y]);
  }
  return up.concat(dn);
};
function mainBlade(P3, R0, R1, droop, seed) {
  const sec = foil(0.53, 0.052), path = [], n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n, r = lerp2(R0, R1, t), sweepT = clamp2((t - 0.93) / 0.07);
    path.push([r, -droop * Math.pow(t, 2.1), 0.2 * sweepT * sweepT]);
  }
  const tipAt = Math.round(n * 0.9), main = sweep(sec, path.slice(0, tipAt + 1), { up: [0, 1, 0], crease: 50, caps: false }), tip = sweep(sec, path.slice(tipAt), { up: [0, 1, 0], crease: 50, scaleFn: (t) => 1 - 0.45 * t * t });
  P3.add("paint", main, [0.085, 0.088, 0.09], { jit: 0.03 });
  P3.add("paint", tip, [0.78, 0.6, 0.06], { jit: 0.03 });
  P3.add("steel", sweep([[-0.155, 4e-3], [-0.15, 0.014], [-0.1, 0.03], [-0.1, -0.03], [-0.15, -0.014]], path.slice(2, tipAt + 1), { up: [0, 1, 0], crease: 60, caps: false }), [0.5, 0.5, 0.5]);
  P3.box("paint", 0.5, 8e-3, 0.07, lerp2(R0, R1, 0.72), -droop * Math.pow(0.72, 2.1) - 4e-3, 0.4, { col: [0.1, 0.1, 0.1], b: 2e-3 });
  P3.add("steel", softBox(0.5, 0.11, 0.4, 0.035, 3), [0.23, 0.24, 0.25], { p: [R0 - 0.1, 0, 0.02] });
  for (const z of [-0.1, 0.02, 0.14]) for (const x of [R0 - 0.24, R0 + 0.04]) P3.cyl("steel", 0.022, 0.13, x, 0, z, { seg: 6, col: [0.5, 0.5, 0.52] });
}
var helicopter = (seed = 1, o = {}) => proto("heli" + seed + (o.dark ? "d" : ""), () => {
  const P3 = new Prop("helicopter", seed), A = o.atlas, v = new Vector3(), R4 = rng(seed * 31 + 7);
  const cutZ = CUTS.flatMap((c) => [c[0], c[1]]), us = stations(-9.5, 5.62, 0.22, [...cutZ, ...KEYS.map((k) => k[0]), 5.5, 5.58]);
  const skin = hullSurf(us, NRING, ringPt, (i, j, u0, u1) => cellKey(j, u0, u1));
  P3.add("milpaint", skin.body, OD, { jit: 0.06, cell: 3 });
  P3.add("glassT", skin.glass, [0.5, 0.56, 0.52]);
  const lus = us.filter((u) => u >= -2.3 && u <= 4.6), liner = hullSurf(lus, NRING, (z, j, out) => {
    ringPt(z, j, out);
    const [, , yb, yt] = hullAt(z);
    out.x *= 0.955;
    out.y = (yb + yt) / 2 + (out.y - (yb + yt) / 2) * 0.95;
    return out;
  }, (i, j, u0, u1) => cellKey(j, u0, u1) === "body" ? "body" : null, { inward: true });
  P3.add("canvas", liner.body, [0.2, 0.21, 0.19], { jit: 0.05, cell: 5 });
  for (const [z0, z1, r0, r1, s, key] of CUTS) for (const sd of s ? [s] : [1, -1]) {
    const pts = outline(z0, z1, r0, r1, sd, key ? 4e-3 : -0.016);
    P3.add(key ? "rubber" : "steel", tube(pts, key ? 0.013 : 0.03, 5, { samples: 0, closed: true }), key ? SEAL : [0.3, 0.31, 0.3]);
  }
  P3.add("milpaint", hullTrim((t, out) => rowPt(lerp2(4.05, 5.05, t), NR, 1, out).setY(out.y + 6e-3), [0, 0.25, 0.5, 0.75, 1], 0.03, 6), ODK);
  for (const sd of [-1, 1]) P3.add("milpaint", hullTrim((t, out) => rowPt(lerp2(4.05, 5.05, t), 8, sd, out), [0, 0.25, 0.5, 0.75, 1], 0.02, 5), ODK);
  for (const sd of [-1, 1]) {
    const x = sd * 1.183, line = (za, ya, zb, yb) => P3.beam("black", [x, ya, za], [x, yb, zb], 6e-3, 0.01, { b: 0 });
    for (const z of [2.95, 2, -1.95]) line(z, 0.66, z, 1.36);
    line(-1.95, 0.7, 2.95, 0.7);
    line(2.98, 0.72, 2.98, 2.1);
    line(3.98, 0.8, 3.98, 2.05);
    for (const y of [0.95, 1.9]) P3.box("steel", 0.03, 0.09, 0.05, sd * 1.165, y, 3.98, { col: GRY, b: 6e-3 });
    P3.box("steel", 0.03, 0.035, 0.13, sd * 1.19, 1.28, 3.14, { col: [0.1, 0.1, 0.1], b: 8e-3 });
    P3.box("steel", 0.2, 0.025, 0.32, sd * 1.22, 0.6, 3.45, { col: GRY, b: 6e-3 });
    P3.bar("steel", [sd * 1.12, 0.6, 3.33], [sd * 1.3, 0.6, 3.33], 0.012);
    P3.bar("steel", [sd * 1.12, 0.6, 3.57], [sd * 1.3, 0.6, 3.57], 0.012);
    P3.cyl("steel", 0.07, 0.014, sd * 1.165, 1.22, -2.28, { axis: "x", seg: 12, col: [0.55, 0.1, 0.08] });
    P3.cyl("steel", 0.022, 0.03, sd * 1.172, 1.22, -2.28, { axis: "x", seg: 6, col: GRY });
    P3.cyl("steel", 0.03, 0.01, sd * 1.186, 1.6, 2.5, { axis: "x", seg: 10, col: [0.5, 0.5, 0.5] });
    P3.add("steel", ring(0.035, 8e-3, { seg: 10, radial: 5 }), GRY, { p: [sd * 1.1, 0.58, -1.6] });
    for (const [y, x0] of [[2.2, 1.13], [0.63, 1]]) {
      P3.beam("steel", [sd * (x0 + 0.03), y, 1.7], [sd * (x0 + 0.03), y, -1.9], 0.03, 0.05, { col: GRY });
      P3.beam("steel", [sd * (x0 + 0.03), y, -1.9], [sd * (x0 + 0.03), y, -3.55], 0.03, 0.05, { col: GRY });
      for (const z of [-2.5, -3.2, -3.5]) {
        rowPt(z, y > 1 ? 8 : 2, sd, v);
        P3.bar("steel", [v.x, v.y, z], [sd * (x0 + 0.03), y, z], 0.012, { col: GRY });
      }
    }
    for (const z of [2.3, -1.5]) {
      P3.tube("steel", [[sd * 1.08, 2.26, z - 0.12], [sd * 1.13, 2.3, z - 0.1], [sd * 1.13, 2.3, z + 0.1], [sd * 1.08, 2.26, z + 0.12]], 9e-3, { seg: 5, samples: 0, col: [0.8, 0.62, 0.06] });
    }
    for (const y of [1, 1.5, 2]) P3.box("black", 0.012, 0.09, 0.16, sd * 1.181, y, 2.5, { b: 0 });
    P3.lathe(sd > 0 ? "ledGreen" : "emRed", [[0, -0.05], [0.028, -0.03], [0.032, 0.02], [0, 0.05]], { seg: 8, axis: "z", p: [sd * 1.29, 1.62, 2.05] });
    for (const z of [2.45, 1.75, -1.5, -2.1]) for (let y = 0.82; y < 1.32; y += 0.085) P3.cyl("milpaint", 7e-3, 4e-3, sd * 1.181, y, z, { axis: "x", seg: 5, col: OD, cham: 0 });
  }
  {
    const pts = outline(DOOR[0], DOOR[1], DOOR[2], DOOR[3], -1, 2e-3);
    P3.add("black", tube(pts, 6e-3, 4, { samples: 0, closed: true }));
    P3.box("steel", 0.03, 0.05, 0.16, -1.19, 1.22, 1.38, { col: [0.1, 0.1, 0.1], b: 0.01 });
    P3.box("paint", 0.012, 0.05, 0.12, -1.186, 1.12, 0.84, { col: [0.82, 0.62, 0.05], b: 4e-3 });
  }
  {
    const dz = -2.45, dx = 0.075, dus = stations(DOOR[0], DOOR[1], 0.26, [-0.35, 0.95]);
    const leaf = hullSurf(dus, 7, (z, j, out) => {
      rowPt(z, DOOR[2] + j, 1, out);
      out.x += dx;
      out.z += dz;
      return out;
    }, (i, j, u0, u1) => u0 >= -0.36 && u1 <= 0.96 && j >= 3 && j <= 4 ? "glass" : "body", { open: true });
    P3.add("milpaint", leaf.body, OD, { jit: 0.06, cell: 3 });
    P3.add("glassT", leaf.glass, [0.5, 0.56, 0.52]);
    const inner = hullSurf(dus, 7, (z, j, out) => {
      rowPt(z, DOOR[2] + j, 1, out);
      out.x += dx - 0.035;
      out.z += dz;
      return out;
    }, (i, j, u0, u1) => u0 >= -0.36 && u1 <= 0.96 && j >= 3 && j <= 4 ? null : "body", { open: true, inward: true });
    P3.add("canvas", inner.body, [0.22, 0.23, 0.2]);
    P3.add("rubber", tube(outline(-0.35, 0.95, 5, 6, 1, dx + 4e-3, dz), 0.013, 5, { samples: 0, closed: true }), SEAL);
    P3.add("steel", tube(outline(DOOR[0], DOOR[1], DOOR[2], DOOR[3] - 1, 1, dx - 0.017, dz), 0.02, 5, { samples: 0, closed: true }), [0.26, 0.27, 0.24]);
    P3.box("steel", 0.03, 0.05, 0.16, 1.19 + dx, 1.2, DOOR[1] + dz - 0.2, { col: [0.1, 0.1, 0.1], b: 0.01 });
    for (const z of [DOOR[0] + 0.2, DOOR[1] - 0.2]) for (const y of [2.2, 0.63]) P3.cyl("steel", 0.03, 0.03, y > 1 ? 1.16 : 1.03, y, z + dz, { axis: "x", seg: 8, col: GRY });
    if (A) {
      P3.quad("decalF", 1.5, 1.5 / A.aspect("stRescue"), A.rect("stRescue"), { p: [1.19 + dx, 1.02, 0.3 + dz], r: [0, H, 0] });
      P3.quad("decalF", 0.5, 0.5 * 0.67, A.rect("handprints"), { p: [1.192 + dx, 1.5, 1.2 + dz], r: [0, H, 0] });
    }
  }
  P3.box("steel", 2.24, 0.04, 5.2, 0, 0.68, 0.4, { col: [0.2, 0.21, 0.21], b: 4e-3 });
  P3.box("steel", 1.7, 0.04, 1.5, 0, 0.68, 3.75, { col: [0.2, 0.21, 0.21], b: 4e-3 });
  for (let z = -1.9; z < 2.9; z += 0.6) for (const x of [-0.75, -0.25, 0.25, 0.75]) P3.add("steel", ring(0.03, 6e-3, { seg: 8, radial: 4 }), GRY, { p: [x, 0.71, z], r: [H, 0, 0] });
  P3.box("rubber", 1.5, 6e-3, 2.2, -0.2, 0.704, 0.3, { col: [0.1, 0.1, 0.1], b: 0 });
  P3.box("canvas", 2.2, 1.5, 0.05, 0, 1.47, -2.26, { col: [0.19, 0.2, 0.18], b: 0.01 });
  for (let i = 0; i < 4; i++) {
    const x = -0.84 + i * 0.56, z = -1.95;
    P3.tube("steel", [[x - 0.23, 0.7, z + 0.42], [x - 0.23, 1.12, z + 0.42], [x - 0.23, 1.12, z - 0.12], [x - 0.23, 2.02, z - 0.2]], 0.012, { seg: 5, samples: 0, col: GRY });
    P3.tube("steel", [[x + 0.23, 0.7, z + 0.42], [x + 0.23, 1.12, z + 0.42], [x + 0.23, 1.12, z - 0.12], [x + 0.23, 2.02, z - 0.2]], 0.012, { seg: 5, samples: 0, col: GRY });
    const pan = panel(0.44, 0.52, 4, 4);
    deform(pan, (q) => {
      q.z -= 0.05 * (1 - (q.x / 0.22) ** 2) * (1 - (q.y / 0.26) ** 2);
    }, true);
    P3.add("canvas", pan, i === 1 ? [0.3, 0.07, 0.05] : CAN, { p: [x, 1.12, z + 0.15], r: [-H, 0, 0] });
    const bk = panel(0.44, 0.86, 4, 5);
    deform(bk, (q) => {
      q.z -= 0.04 * (1 - (q.x / 0.22) ** 2);
    }, true);
    P3.add("canvas", bk, CAN, { p: [x, 1.57, z - 0.15], r: [-0.09, 0, 0] });
    P3.tube("canvas", catenary([x - 0.2, 1.13, z + 0.1], [x - 0.02 + R4() * 0.1, 0.74, z + 0.5 + R4() * 0.2], 0.1, 6), 0.012, { seg: 4, col: [0.12, 0.12, 0.11] });
    P3.box("steel", 0.05, 0.012, 0.06, x - 0.02, 0.715, z + 0.6, { col: [0.6, 0.6, 0.6], b: 3e-3 });
  }
  P3.push({ p: [-0.25, 0.71, 0.4], r: [0, 0.22, 0] });
  for (const s of [-1, 1]) {
    P3.bar("galv", [s * 0.27, 0.13, -1.1], [s * 0.27, 0.13, 1.1], 0.019, { col: [0.75, 0.76, 0.78] });
    for (const z of [-0.75, 0.75]) P3.tube("galv", [[s * 0.27, 0.13, z - 0.07], [s * 0.27, 0.012, z - 0.05], [s * 0.27, 0.012, z + 0.05], [s * 0.27, 0.13, z + 0.07]], 8e-3, { seg: 4, samples: 0 });
  }
  {
    const bed = panel(0.52, 1.84, 4, 8);
    deform(bed, (q) => {
      q.z -= 0.035 * (1 - (q.x / 0.26) ** 2);
    }, true);
    paint(bed, CAN, { fn: (x, y) => {
      const d = Math.hypot(x * 1.6, y - 0.25);
      return d < 0.3 ? [0.16, 0.04, 0.03] : null;
    } });
    P3.add("canvas", bed, null, { p: [0, 0.13, 0], r: [-H, 0, 0] });
  }
  {
    const bl = panel(0.9, 1.1, 8, 8);
    deform(bl, (q) => {
      const t = clamp2((q.x + 0.1) / 0.55);
      q.z = 0.03 + 0.05 * fbm(q.x * 5 + 3, q.y * 5, 1.2, 3) - t * t * 0.17;
    }, true);
    P3.add("burlap", bl, [0.3, 0.32, 0.36], { p: [0.2, 0.15, -0.3], r: [-H, 0, 0.2] });
  }
  P3.pop();
  P3.add("canvas", softBox(0.46, 0.26, 0.28, 0.06, 4), [0.42, 0.08, 0.06], { p: [0.55, 0.84, -1.2], r: [0, 0.5, 0] });
  P3.box("canvas", 0.2, 0.012, 0.05, 0.55, 0.975, -1.2, { col: [0.85, 0.85, 0.8], b: 3e-3, r: [0, 0.5, 0] });
  P3.cyl("paint", 0.065, 0.62, -1.02, 1.05, -1.3, { seg: 12, cham: 0.03, col: [0.16, 0.36, 0.2] });
  P3.cyl("chrome", 0.022, 0.07, -1.02, 1.39, -1.3, { seg: 8 });
  for (const y of [0.85, 1.25]) P3.box("steel", 0.03, 0.03, 0.18, -1.08, y, -1.3, { col: GRY, b: 5e-3 });
  P3.cyl("paint", 0.055, 0.34, 1, 0.9, -2.1, { seg: 10, cham: 0.02, col: [0.7, 0.07, 0.05] });
  P3.cyl("steel", 0.02, 0.06, 1, 1.1, -2.1, { seg: 6, col: [0.1, 0.1, 0.1] });
  P3.bar("steel", [-0.9, 2.24, -1.6], [-0.9, 2.24, 2.4], 0.01, { col: GRY });
  P3.add("plastic", softBox(0.12, 0.2, 0.03, 0.012, 3), [0.75, 0.8, 0.82], { p: [-0.9, 2.08, 0.9] });
  P3.bar("steel", [-0.9, 2.24, 0.9], [-0.9, 2.18, 0.9], 4e-3);
  P3.tube("plastic", [[-0.9, 1.98, 0.9], [-0.86, 1.5, 0.86], [-0.6, 1, 0.7], [-0.4, 0.87, 0.55]], 4e-3, { seg: 4, col: [0.8, 0.82, 0.8] });
  P3.add("meshNet", quadXY(1.6, 0.9), null, { p: [-1.1, 1.3, -0.5], r: [0, H, 0] });
  for (let i = 0; i < 7; i++) P3.box("plastic", 0.07 + R4() * 0.06, 4e-3, 0.05 + R4() * 0.04, -0.7 + R4() * 1.6, 0.706, -1.2 + R4() * 3.2, { col: i % 3 ? [0.85, 0.85, 0.82] : [0.3, 0.5, 0.7], b: 0, r: [0, R4() * 3, 0] });
  P3.box("plastic", 0.09, 0.03, 0.2, 0, 2.27, 0.3, { col: [0.1, 0.1, 0.1], b: 6e-3 });
  P3.box("emCab", 0.07, 0.012, 0.17, 0, 2.252, 0.3, { b: 3e-3 });
  if (!o.dark) P3.glow("fill", [0.2, 1.9, 0.3], { col: [1, 0.42, 0.2], power: 3.2, dist: 6.5, dir: [0.9, -0.42, 0], cone: 1 });
  for (const s of [-1, 1]) {
    const x = s * 0.55, z = 3.3;
    P3.add("steel", softBox(0.5, 0.1, 0.5, 0.03, 3), [0.16, 0.17, 0.16], { p: [x, 1, z] });
    P3.add("canvas", softBox(0.44, 0.07, 0.44, 0.03, 3), [0.22, 0.24, 0.18], { p: [x, 1.08, z] });
    P3.add("steel", softBox(0.5, 0.86, 0.07, 0.03, 3), [0.16, 0.17, 0.16], { p: [x, 1.42, z - 0.27], r: [-0.12, 0, 0] });
    P3.add("canvas", softBox(0.4, 0.6, 0.06, 0.03, 3), [0.22, 0.24, 0.18], { p: [x, 1.4, z - 0.22], r: [-0.12, 0, 0] });
    P3.add("canvas", softBox(0.24, 0.18, 0.08, 0.03, 3), [0.18, 0.19, 0.16], { p: [x, 1.93, z - 0.3] });
    for (const w of [-1, 1]) P3.box("steel", 0.025, 0.5, 0.42, x + w * 0.27, 1.25, z - 0.05, { col: [0.15, 0.16, 0.15], b: 8e-3 });
    for (const w of [-1, 1]) P3.bar("steel", [x + w * 0.2, 0.7, z - 0.2], [x + w * 0.2, 0.96, z - 0.2], 0.02, { col: GRY });
    for (const w of [-1, 1]) P3.tube("canvas", [[x + w * 0.12, 1.86, z - 0.26], [x + w * 0.1, 1.5, z - 0.17], [x + w * 0.06, 1.14, z - 0.02]], 0.012, { seg: 4, col: [0.1, 0.1, 0.1] });
    P3.bar("steel", [x, 0.7, z + 0.42], [x, 1.22, z + 0.36], 0.012, { col: [0.1, 0.1, 0.1] });
    P3.add("plastic", softBox(0.05, 0.13, 0.05, 0.02, 2), [0.08, 0.08, 0.08], { p: [x, 1.28, z + 0.355] });
    P3.bar("steel", [x - s * 0.3, 0.74, z - 0.2], [x - s * 0.3, 0.98, z + 0.22], 0.014, { col: [0.1, 0.1, 0.1] });
    P3.cyl("plastic", 0.022, 0.12, x - s * 0.3, 1, z + 0.24, { seg: 8, col: [0.08, 0.08, 0.08], r: [1, 0, 0] });
    for (const w of [-1, 1]) {
      P3.box("steel", 0.09, 0.012, 0.13, x + w * 0.12, 0.86, z + 0.82, { col: GRY, b: 3e-3, r: [-0.7, 0, 0] });
      P3.bar("steel", [x + w * 0.12, 0.7, z + 0.9], [x + w * 0.12, 0.86, z + 0.82], 9e-3);
    }
  }
  P3.box("steel", 0.3, 0.42, 1.1, 0, 0.9, 3.55, { col: [0.13, 0.14, 0.14], b: 0.02 });
  if (A) P3.quad("signF", 0.26, 0.26 / A.aspect("panelSw") * 2.4, A.rect("panelSw"), { p: [0, 1.113, 3.55], r: [-H, 0, 0] });
  zy(P3, "steel", [[4.12, 0.72], [4.4, 0.72], [4.5, 1.2], [4.46, 1.58], [4.1, 1.6], [4.16, 1.2]], -0.82, 0.82, { col: [0.1, 0.105, 0.11], bevel: 0.02 });
  P3.box("plastic", 1.72, 0.03, 0.34, 0, 1.62, 4.24, { col: [0.06, 0.06, 0.06], b: 0.012 });
  if (A) for (const s of [-1, 1]) {
    P3.quad("signF", 0.62, 0.62 / A.aspect("gauges"), A.rect("gauges"), { p: [s * 0.45, 1.38, 4.085], r: [0.1, PI5, 0] });
    P3.quad("signFLit", 0.62, 0.62 / A.aspect("gauges"), A.rect("gauges"), { p: [s * 0.45, 1.38, 4.08], r: [0.1, PI5, 0] });
  }
  P3.box("ledGreen", 0.1, 0.07, 6e-3, 0, 1.4, 4.1, { b: 0 });
  P3.box("emAmber", 0.03, 0.012, 6e-3, 0.1, 1.52, 4.09, { b: 0 });
  P3.box("emRed", 0.03, 0.012, 6e-3, -0.1, 1.52, 4.09, { b: 0 });
  P3.box("steel", 0.5, 0.07, 0.6, 0, 2.2, 3.6, { col: [0.12, 0.125, 0.13], b: 0.015 });
  if (A) P3.quad("signF", 0.46, 0.46 / A.aspect("panelSw"), A.rect("panelSw"), { p: [0, 2.162, 3.6], r: [H, 0, 0] });
  for (const s of [-1, 1]) P3.cyl("plastic", 0.018, 0.14, s * 0.1, 2.12, 3.86, { seg: 6, col: s > 0 ? [0.6, 0.08, 0.06] : [0.08, 0.08, 0.08], r: [0.5, 0, 0] });
  P3.lathe("plastic", [[1e-3, -0.1], [0.09, -0.085], [0.125, -0.02], [0.12, 0.06], [0.07, 0.115], [1e-3, 0.128]], { seg: 12, col: [0.3, 0.33, 0.24], p: [-0.55, 1.22, 3.3], r: [0.2, 0.7, 0.1] });
  P3.tube("rubber", [[-0.5, 1.14, 3.2], [-0.4, 1.12, 3], [-0.34, 0.74, 3.05]], 6e-3, { seg: 4, col: [0.08, 0.08, 0.08] });
  P3.box("plastic", 0.16, 0.012, 0.22, 0.5, 1.642, 4.22, { col: [0.8, 0.8, 0.76], b: 3e-3, r: [0, 0.3, 0] });
  for (const s of [-1, 1]) {
    rowPt(4.2, 9, s, v);
    const a = [v.x * 0.5, v.y + 0.07, 4.12];
    rowPt(4.95, 6, s, v);
    P3.bar("steel", a, [v.x * 0.72, v.y + 0.06, 4.98], 6e-3, { col: [0.06, 0.06, 0.06] });
    P3.box("steel", 0.04, 0.03, 0.05, a[0], a[1] - 0.02, a[2], { col: [0.06, 0.06, 0.06], b: 6e-3 });
    P3.bar("steel", [s * 0.3, 1.5, 5.34], [s * 0.3, 1.5, 5.78], 0.012, { col: [0.5, 0.5, 0.5], r2: 7e-3 });
    P3.box("milpaint", 0.03, 0.12, 0.1, s * 0.3, 1.46, 5.36, { col: ODK, b: 8e-3 });
    P3.cyl("canvas", 0.02, 0.12, s * 0.3, 1.5, 5.74, { axis: "z", seg: 6, col: REDF });
    P3.box("canvas", 0.028, 0.3, 3e-3, s * 0.31, 1.33, 5.72, { col: REDF, b: 0, r: [0.05, s * 0.4, 0.06] });
    P3.cyl("steel", 0.035, 0.012, s * 0.52, 1.28, 5.27, { axis: "z", seg: 10, col: GRY, r: [0, s * 0.6, 0] });
  }
  zy(P3, "steel", [[4.05, 2.26], [4.5, 2.5], [4.1, 2.34], [3.95, 2.3]], -0.012, 0.012, { col: [0.5, 0.5, 0.52], bevel: 2e-3 });
  zy(P3, "steel", [[4.6, 0.6], [5, 0.34], [4.66, 0.5], [4.45, 0.56]], -0.012, 0.012, { col: [0.5, 0.5, 0.52], bevel: 2e-3 });
  P3.add("black", tube([[-0.3, 1.02, 5.56], [0.3, 1.02, 5.56], [0.34, 1.36, 5.42], [-0.34, 1.36, 5.42]], 5e-3, 4, { samples: 0, closed: true }));
  P3.push({ p: [0.42, 0.56, 4.35] });
  P3.cyl("steel", 0.05, 0.1, 0, 0.02, 0, { seg: 10, col: GRY });
  P3.tube("steel", [[-0.14, -0.2, 0], [-0.14, -0.06, 0], [0.14, -0.06, 0], [0.14, -0.2, 0]], 0.012, { seg: 5, samples: 0, col: GRY });
  P3.push({ p: [0, -0.2, 0], r: [0.5, 0.3, 0] });
  P3.lathe("milpaint", [[0.06, -0.14], [0.1, -0.1], [0.115, 0.1], [0.125, 0.12], [0.125, 0.15]], { seg: 14, axis: "z", col: ODK });
  for (let i = 0; i < 5; i++) P3.cyl("steel", 0.118, 8e-3, 0, 0, -0.08 + i * 0.035, { axis: "z", seg: 14, col: [0.12, 0.12, 0.12] });
  P3.cyl(o.dark ? "glass" : "lampFlood", 0.112, 0.01, 0, 0, 0.14, { axis: "z", seg: 14 });
  if (!o.dark) {
    P3.glow("fill", [0, 0, 0.3], { col: [0.78, 0.92, 1], power: 26, dist: 24, dir: [0, 0, 1], cone: 0.36, pri: 2 });
    P3.glow("flare", [0, 0, 0.2], { col: [0.8, 0.93, 1], size: 1.5 });
  }
  P3.pop();
  P3.pop();
  zy(P3, "milpaint", [[-3.4, 2.3], [-2.5, 2.74], [-1.5, 2.96], [1.3, 2.96], [2.3, 2.78], [3.2, 2.34], [3.2, 2.2], [-3.4, 2.2]], -0.5, 0.5, { col: OD, bevel: 0.07, jit: 0.06 });
  for (const z of [-1.5, -0.4, 1.3, 2.3]) P3.box("black", 1.01, 0.5, 8e-3, 0, 2.62, z, { b: 0 });
  for (let i = 0; i < 6; i++) P3.box("steel", 0.7, 0.012, 0.05, 0, 2.972, -1.25 + i * 0.1, { col: [0.1, 0.1, 0.1], b: 3e-3, r: [0.5, 0, 0] });
  for (const s of [-1, 1]) {
    P3.lathe("milpaint", [[0.15, -2.05], [0.2, -1.95], [0.27, -1.5], [0.33, -0.7], [0.34, 0.8], [0.31, 1.3], [0.25, 1.48], [0.2, 1.5]], { seg: 18, axis: "z", col: OD, p: [s * 0.74, 2.56, 0], jit: 0.06 });
    P3.lathe("steel", [[0.2, 1.5], [0.17, 1.42], [0.12, 1.2]], { seg: 18, axis: "z", col: [0.4, 0.4, 0.42], p: [s * 0.74, 2.56, 0] });
    P3.cyl("black", 0.125, 0.01, s * 0.74, 2.56, 1.2, { axis: "z", seg: 14 });
    P3.push({ p: [s * 0.74, 2.56, -2], r: [0, s * -0.5, 0] });
    P3.lathe("rust", [[0.15, -0.36], [0.17, -0.34], [0.16, 0.06]], { seg: 14, axis: "z", col: [0.3, 0.24, 0.2] });
    P3.cyl("black", 0.148, 0.01, 0, 0, -0.3, { axis: "z", seg: 12 });
    P3.pop();
    for (const z of [-1.2, -0.3, 0.6]) P3.box("steel", 0.012, 0.035, 0.07, s * 1.075, 2.5, z, { col: [0.5, 0.5, 0.5], b: 4e-3 });
    for (const z of [-1.6, 1]) P3.cyl("black", 0.342, 8e-3, s * 0.74, 2.56, z, { axis: "z", seg: 18 });
  }
  P3.cyl("canvas", 0.215, 0.05, -0.74, 2.56, 1.5, { axis: "z", seg: 16, col: REDF, cham: 0.02 });
  P3.tube("canvas", catenary([-0.74, 2.38, 1.53], [-0.98, 1.84, 1.6], 0.04, 6), 0.012, { seg: 4, col: REDF });
  P3.box("canvas", 0.05, 0.4, 4e-3, -0.99, 1.64, 1.6, { col: REDF, b: 0, r: [0.1, 0.5, 0.08] });
  P3.cyl("canvas", 0.215, 0.05, 1.75, 0.03, 2.9, { seg: 16, col: REDF, cham: 0.02, r: [0.06, 0, 0.03] });
  zy(P3, "milpaint", [[2.95, 2.36], [3.25, 2.36], [3, 2.7], [2.9, 2.7]], -0.012, 0.012, { col: ODK, bevel: 4e-3 });
  P3.cyl("plastic", 0.07, 0.03, 0.3, 2.4, 2.6, { seg: 12, col: [0.8, 0.8, 0.78], cham: 0.012 });
  for (const z of [1, -1.4]) zy(P3, "milpaint", [[z, 0.56], [z + 0.3, 0.56], [z + 0.12, 0.3], [z + 0.02, 0.3]], -0.012, 0.012, { col: ODK, bevel: 4e-3 });
  P3.box("steel", 0.12, 0.1, 0.2, 0, 0.5, 0.3, { col: GRY, b: 0.02 });
  P3.add("steel", ring(0.05, 0.012, { seg: 10, radial: 5, a0: PI5 * 0.1, a1: PI5 * 1.7 }), [0.5, 0.5, 0.5], { p: [0, 0.4, 0.3], r: [0, H, 0] });
  for (const s of [-1, 1]) {
    rowPt(-4.6, 5, s, v);
    const a = [v.x + s * 0.07, v.y, -4.6];
    rowPt(-7.6, 5, s, v);
    const b = [v.x + s * 0.07, v.y, -7.6];
    P3.bar("steel", a, b, 7e-3, { col: [0.8, 0.8, 0.78] });
    for (const t of [0, 0.5, 1]) {
      const z = lerp2(-4.6, -7.6, t);
      rowPt(z, 5, s, v);
      P3.bar("plastic", [v.x, v.y, z], [v.x + s * 0.07, v.y, z], 8e-3, { col: [0.1, 0.1, 0.1] });
    }
  }
  P3.push({ p: [0, 2.94, 0.45], r: [0.05, 0, 0] });
  P3.lathe("steel", [[0.2, 0], [0.19, 0.1], [0.12, 0.16], [0.1, 0.7], [0.14, 0.72]], { seg: 14, col: [0.24, 0.25, 0.26] });
  P3.lathe("steel", [[0.12, 0.2], [0.31, 0.21], [0.31, 0.25], [0.12, 0.27]], { seg: 16, col: [0.3, 0.31, 0.32] });
  P3.lathe("steel", [[0.12, 0.29], [0.29, 0.3], [0.29, 0.34], [0.12, 0.35]], { seg: 16, col: [0.18, 0.18, 0.19] });
  P3.bar("steel", [0.2, 0.08, -0.16], [0.24, 0.22, -0.16], 0.02, { col: GRY });
  P3.bar("steel", [-0.2, 0.08, 0.16], [-0.24, 0.22, 0.16], 0.02, { col: GRY });
  P3.lathe("steel", [[0.1, 0.56], [0.36, 0.58], [0.4, 0.64], [0.4, 0.72], [0.34, 0.78], [0.1, 0.8]], { seg: 16, col: [0.2, 0.21, 0.22] });
  for (let k = 0; k < 4; k++) {
    P3.push({ r: [0, k * H + PI5 / 4, 0] });
    P3.box("steel", 0.62, 0.035, 0.16, 0.36, 0.86, 0, { col: [0.16, 0.16, 0.17], b: 0.012 });
    P3.cyl("steel", 0.085, 0.07, 0.64, 0.86, 0, { seg: 10, col: [0.3, 0.31, 0.32], cham: 0.012 });
    P3.pop();
  }
  P3.lathe("milpaint", [[0.14, 0.86], [0.12, 0.93], [1e-3, 0.96]], { seg: 12, col: ODK });
  for (let k = 0; k < 4; k++) {
    P3.push({ r: [0, 0.35 + k * H, 0] });
    P3.cyl("steel", 0.085, 0.62, 0.66, 0.68, 0, { axis: "x", seg: 12, col: [0.26, 0.27, 0.28], cham: 0.015 });
    P3.cyl("steel", 0.12, 0.07, 0.44, 0.68, 0, { axis: "x", seg: 12, col: [0.16, 0.16, 0.17] });
    P3.cyl("steel", 0.105, 0.05, 0.9, 0.68, 0, { axis: "x", seg: 12, col: [0.16, 0.16, 0.17] });
    P3.bar("steel", [0.5, 0.66, 0.16], [0.98, 0.68, 0.2], 0.028, { col: [0.5, 0.5, 0.52] });
    P3.bar("steel", [0.72, 0.66, 0.18], [0.98, 0.68, 0.2], 0.036, { col: [0.2, 0.2, 0.2] });
    P3.beam("steel", [0.72, 0.68, 0], [0.76, 0.62, -0.24], 0.05, 0.03, { col: GRY });
    P3.bar("steel", [0.76, 0.62, -0.24], [0.3 * Math.cos(-0.7), 0.33, 0.3 * Math.sin(-0.7)], 0.012, { col: [0.6, 0.6, 0.62] });
    const dr = 0.72 + 0.1 * R4();
    P3.push({ p: [0, 0.68, 0], r: [0, 0, -0.012] });
    mainBlade(P3, 1.2, 7.8, dr, k);
    P3.pop();
    for (const [t0, t1] of [[0, 0.4], [0.4, 0.72], [0.72, 1]]) P3.col([lerp2(1.2, 7.8, t0), 0.64 - dr * Math.pow(t1, 2.1), -0.28], [lerp2(1.2, 7.8, t1), 0.72 - dr * Math.pow(t0, 2.1), 0.28], { surface: "metal", bulletOnly: true });
    P3.pop();
  }
  P3.pop();
  {
    const pts = [];
    for (let z = -3.4; z >= -8.7; z -= 0.4) pts.push([0, hullAt(z)[3] + 5e-3, z]);
    P3.add("milpaint", sweep([[-0.13, 0], [-0.11, 0.07], [-0.05, 0.11], [0.05, 0.11], [0.11, 0.07], [0.13, 0]], pts, { up: [0, 1, 0], crease: 50 }), OD, { jit: 0.06 });
    for (let z = -3.9; z > -8.6; z -= 1.17) P3.box("black", 0.27, 0.115, 8e-3, 0, hullAt(z)[3] + 0.06, z, { b: 0 });
  }
  zy(P3, "milpaint", [[-8.3, 2.38], [-9.55, 4.82], [-10.3, 4.82], [-10.42, 4.5], [-9.95, 2.2], [-9.55, 1.82], [-8.5, 1.84]], -0.1, 0.1, { col: OD, bevel: 0.06, jit: 0.06 });
  P3.add("milpaint", softBox(0.34, 0.5, 0.6, 0.12, 4), OD, { p: [0.04, 4.36, -9.92] });
  P3.add("milpaint", softBox(0.3, 0.3, 0.7, 0.1, 4), OD, { p: [0, 2.3, -8.75] });
  for (const y of [2.9, 3.6]) P3.box("black", 0.204, 8e-3, 0.9, 0, y, -9.45 - (y - 2.9) * 0.4, { b: 0 });
  P3.push({ p: [0.24, 4.36, -9.92], r: [0, 0, -0.3] });
  P3.cyl("steel", 0.07, 0.3, 0.1, 0, 0, { axis: "x", seg: 10, col: [0.25, 0.26, 0.27] });
  P3.cyl("steel", 0.13, 0.08, 0.24, 0, 0, { axis: "x", seg: 12, col: [0.18, 0.18, 0.19] });
  for (let k = 0; k < 4; k++) {
    P3.push({ p: [0.24, 0, 0], r: [0.5 + k * H, 0, 0] });
    const sec = foil(0.25, 0.03, 4), path = [[0, 0.16, 0], [0, 0.6, 0], [0, 1.1, 0], [0, 1.58, 0]];
    P3.add("paint", sweep(sec, path, { up: [1, 0, 0], crease: 50 }), [0.085, 0.088, 0.09]);
    P3.add("paint", sweep(sec, [[0, 1.4, 0], [0, 1.585, 0]], { up: [1, 0, 0], crease: 50, scaleFn: () => 1.02 }), REDF);
    P3.box("steel", 0.05, 0.16, 0.12, 0, 0.14, 0, { col: GRY, b: 0.01 });
    P3.pop();
  }
  P3.pop();
  P3.push({ p: [0, 2.02, -9.2], r: [-0.4, 0, 0] });
  {
    const sec = foil(1.05, 0.085, 6).map(([c, t]) => [c, t]);
    for (const s of [-1, 1]) {
      const g2 = sweep(sec, [[s * 0.1, 0, 0], [s * 1.3, 0, 0], [s * 2.1, 0, 0]], { up: [0, 1, 0], crease: 50, scaleFn: (t) => 1 - 0.22 * t });
      P3.add("milpaint", g2, OD, { jit: 0.06 });
      for (const x of [0.6, 1.1, 1.6, 2]) P3.bar("steel", [s * x, 0, s * (0.74 - 0.08 * x)], [s * x, -0.01, s * (0.9 - 0.08 * x)], 3e-3, { col: [0.1, 0.1, 0.1] });
    }
    if (A) P3.quad("decalF", 0.4, 0.4 / A.aspect("stNoStep"), A.rect("stNoStep"), { p: [1.1, 0.05, 0.1], r: [-H, 0, 0] });
  }
  P3.pop();
  P3.cyl("steel", 0.05, 0.03, 0, 4.84, -9.9, { seg: 10, col: GRY });
  P3.lathe("emRedB", [[0.045, 0], [0.045, 0.05], [0.03, 0.085], [1e-3, 0.095]], { seg: 10, p: [0, 4.855, -9.9] });
  P3.lathe("emRedB", [[1e-3, -0.07], [0.04, -0.05], [0.045, 0]], { seg: 10, p: [0, 0.55, -1] });
  if (!o.dark) {
    P3.glow("blink", [0, 5, -9.9], { col: [1, 0.06, 0.03], power: 5, dist: 9, mat: "emRedB" });
    P3.glow("flare", [0, 4.95, -9.9], { col: [1, 0.07, 0.03], size: 1, blink: 1 });
    P3.glow("blink", [0, 0.4, -1], { col: [1, 0.06, 0.03], power: 3, dist: 5, mat: "emRedB" });
  }
  P3.box("emWhite", 0.03, 0.03, 0.02, 0, 3.2, -10.2, { b: 6e-3 });
  for (const s of [-1, 1]) P3.box("ledGreen", 6e-3, 0.03, 0.4, s * 0.37, 2, -5.4, { b: 0 });
  for (const s of [-1, 1]) {
    const ax = [s * 1.34, 0.345, 1.95];
    addWheel(P3, 0.345, 0.24, s * 1.47, 0.345, 1.95, { axis: "x", out: s, rimCol: [0.2, 0.22, 0.16], rimMat: "milpaint", ribs: 4 });
    P3.bar("steel", [s * 1, 0.345, 1.95], [s * 1.58, 0.345, 1.95], 0.04, { col: [0.3, 0.3, 0.3] });
    P3.beam("milpaint", [s * 1.05, 0.62, 3], ax, 0.11, 0.07, { col: OD });
    P3.beam("milpaint", [s * 0.98, 0.6, 1.3], ax, 0.07, 0.05, { col: OD });
    P3.bar("milpaint", [s * 1.3, 0.4, 1.95], [s * 1.25, 1.02, 1.95], 0.052, { col: OD });
    P3.bar("chrome", [s * 1.25, 1.02, 1.95], [s * 1.22, 1.45, 1.95], 0.032);
    P3.add("milpaint", softBox(0.22, 0.5, 0.5, 0.08, 4), OD, { p: [s * 1.2, 1.62, 1.95] });
    P3.tube("rubber", [[s * 1.2, 1.4, 2.02], [s * 1.3, 1, 2.06], [s * 1.36, 0.5, 2.03]], 7e-3, { seg: 4, col: [0.08, 0.08, 0.08] });
    for (const d of [-1, 1]) zy(P3, "plastic", [[1.95 + d * 0.33, 0], [1.95 + d * 0.33 + d * 0.2, 0], [1.95 + d * 0.33 + d * 0.2, 0.05], [1.95 + d * 0.33 + d * 0.03, 0.17]].sort(() => 0).slice(), s * 1.47 - 0.12, s * 1.47 + 0.12, { col: [0.8, 0.6, 0.05], bevel: 0.01 });
    P3.tube("canvas", [[s * 1.61, 0.06, 1.5], [s * 1.68, 0.015, 1.95], [s * 1.61, 0.06, 2.4]], 6e-3, { seg: 4, col: [0.75, 0.75, 0.7] });
  }
  addWheel(P3, 0.2, 0.14, 0, 0.2, -4.05, { axis: "x", rimCol: [0.2, 0.22, 0.16], rimMat: "milpaint", ribs: 3, seg: 20 });
  for (const s of [-1, 1]) {
    P3.beam("milpaint", [s * 0.1, 1.2, -3.45], [s * 0.1, 0.2, -4.05], 0.04, 0.07, { col: OD });
  }
  P3.bar("steel", [-0.13, 0.2, -4.05], [0.13, 0.2, -4.05], 0.02);
  P3.bar("milpaint", [0, 0.62, -3.8], [0, 1.22, -4.25], 0.035, { col: OD });
  P3.bar("chrome", [0, 0.5, -3.72], [0, 0.66, -3.83], 0.022);
  P3.tube("milpaint", [[1, 2.4, 1.3], [1.3, 2.5, 1.3], [1.72, 2.46, 1.3]], 0.035, { seg: 6, col: ODK });
  P3.cyl("milpaint", 0.11, 0.36, 1.42, 2.6, 1.3, { axis: "z", seg: 14, col: ODK, cham: 0.02 });
  P3.cyl("steel", 0.06, 0.05, 1.72, 2.46, 1.3, { axis: "z", seg: 10, col: GRY });
  P3.bar("steel", [1.72, 2.42, 1.3], [1.75, 1.34, 1.27], 4e-3, { col: [0.6, 0.6, 0.62] });
  P3.lathe("paint", [[1e-3, -0.08], [0.035, -0.06], [0.04, 0.03], [0.012, 0.07]], { seg: 8, col: [0.8, 0.6, 0.05], p: [1.75, 1.28, 1.27] });
  P3.add("steel", ring(0.035, 9e-3, { seg: 10, radial: 5, a0: -PI5 * 0.6, a1: PI5 * 0.9 }), [0.5, 0.5, 0.5], { p: [1.75, 1.17, 1.27] });
  if (A) {
    const q = (name, w, x, y, z, r, mat = "decalF") => P3.quad(mat, w, w / A.aspect(name), A.rect(name), { p: [x, y, z], r });
    q("stRescue", 1.5, -1.19, 1.02, 0.3, [0, -H, 0]);
    q("medRound", 0.5, -1.19, 1, -1.5, [0, -H, 0]);
    q("medRound", 0.5, 1.19, 1, 2.45, [0, H, 0]);
    q("stUnit", 0.8, -1.172, 1, 3.45, [0, -H, 0]);
    q("stUnit", 0.8, 1.172, 1, 3.45, [0, H, 0]);
    for (const s of [-1, 1]) {
      rowPt(-6.3, 5, s, v);
      q("stTail", 0.95, v.x + s * 0.012, 2.02, -6.3, [0, s * H, 0]);
      rowPt(-4.4, 5, s, v);
      q("roundel", 0.4, v.x + s * 0.02, 1.95, -4.4, [0, s * H, 0]);
      q("stDanger", 0.8, s * 0.104, 3, -9.25, [0, s * H, -s * 0.4]);
      q("stFuel", 0.3, s * 1.172, 1.42, -2.28, [0, s * H, 0]);
    }
    q("stNoStep", 0.36, 0.3, 2.964, 0.9, [-H, 0, 0]);
    q("stNoStep", 0.36, -0.3, 2.964, -0.6, [-H, 0, H]);
    q("handprints", 0.44, 1.186, 1.5, 1.82, [0, H, 0]);
    q("stLift", 0.3, 1.186, 0.86, 2.3, [0, H, 0]);
    q("medRound", 0.6, 0, 0.553, -0.2, [H, 0, 0]);
  }
  P3.col([-1.22, 0, -2.6], [1.22, 2.4, 5.5], { surface: "metal", noBullet: true });
  const bc = (a, b) => P3.col(a, b, { surface: "metal", bulletOnly: true });
  bc([-1.2, 0.4, -2.6], [1.2, 0.72, 4.6]);
  bc([-1.2, 2.2, -3.4], [1.2, 3, 3.2]);
  bc([-1.2, 0.72, -2.6], [-1.1, 2.2, 3]);
  bc([1.1, 0.72, 1.6], [1.2, 2.2, 3]);
  bc([1.1, 0.72, -2.6], [1.2, 2.2, -1]);
  bc([-1.2, 0.72, -2.6], [1.2, 2.2, -2.2]);
  bc([-1.05, 0.6, 3], [1.05, 2.3, 4.6]);
  bc([-0.7, 0.7, 4.6], [0.7, 1.9, 5.5]);
  bc([-0.4, 2.9, 0], [0.4, 3.95, 0.9]);
  bc([1.15, 0.6, -3.5], [1.32, 2.25, -0.85]);
  P3.col([-0.5, 1.1, -9.4], [0.5, 2.45, -2.6], { surface: "metal" });
  P3.col([-0.2, 1.8, -10.4], [0.5, 4.9, -8.4], { surface: "metal" });
  P3.col([-2.1, 1.5, -9.9], [2.1, 2.5, -8.7], { surface: "metal" });
  P3.col([-0.2, 0, -4.3], [0.2, 1.2, -3.4], { surface: "metal" });
  for (const s of [-1, 1]) P3.col([s * 1.47 - 0.2, 0, 1.55], [s * 1.47 + 0.2, 1.9, 2.35], { surface: "rubber" });
  return P3.finish({ grime: 0.9, ground: 0.5 });
});

