var C = {
  orange: [0.86, 0.3, 0.05],
  white: [0.84, 0.84, 0.81],
  yellow: [0.86, 0.66, 0.06],
  red: [0.6, 0.07, 0.05],
  grey: [0.42, 0.43, 0.44],
  dark: [0.12, 0.12, 0.13],
  olive: [0.3, 0.33, 0.2],
  blue: [0.1, 0.2, 0.42],
  green: [0.12, 0.36, 0.2],
  sand: [0.62, 0.52, 0.36],
  black: [0.05, 0.05, 0.055],
  steel: [0.9, 0.9, 0.92],
  conc: [1, 1, 1],
  tan: [0.55, 0.46, 0.33]
};
var mir = (pts) => pts.concat(pts.slice().reverse().map(([z, y]) => [-z, y]));
var jersey = (seed = 1, o = {}) => proto("jersey" + seed + (o.stripe ? "s" : ""), () => {
  const P3 = new Prop("jersey", seed), L = 3, hw = 0.305, top = 0.81;
  const full = mir([[hw - 0.012, 0], [hw, 0.012], [hw, 0.075], [0.18, 0.255], [0.088, 0.775], [0.07, top]]);
  const slot2 = mir([[0.293, 0.092], [0.18, 0.255], [0.088, 0.775], [0.07, top]]);
  const cuts = [-L / 2, -0.98, -0.6, 0.6, 0.98, L / 2];
  for (let i = 0; i < cuts.length - 1; i++) P3.ext("concrete", i % 2 ? slot2 : full, cuts[i], cuts[i + 1], { plane: "side", bevel: i % 2 ? 4e-3 : 0.012 });
  for (const x of [-0.75, 0.75]) {
    P3.add("steel", ring(0.045, 8e-3, { seg: 10, a0: 0, a1: PI5 }), C.steel, { p: [x, top - 6e-3, 0], r: [0, H, 0] });
    P3.cyl("concrete", 0.06, 0.012, x, top - 4e-3, 0, { seg: 12, cham: 4e-3 });
  }
  for (const [x, ys] of [[-L / 2, [0.24, 0.6]], [L / 2, [0.42]]]) for (const y of ys) {
    const s = Math.sign(x);
    P3.add("steel", ring(0.05, 0.011, { seg: 10, a0: -H, a1: H }), C.steel, { p: [x - s * 0.01, y, 0], r: [H, 0, s > 0 ? 0 : PI5] });
    P3.box("steel", 0.02, 0.05, 0.14, x - s * 6e-3, y, 0, { col: C.steel });
  }
  if (seed % 3 === 0) P3.bar("steel", [L / 2 + 0.03, 0.2, 0], [L / 2 + 0.03, 0.66, 0], 0.012, { col: C.steel });
  for (const x of [-1.1, 0, 1.1]) {
    P3.box("plastic", 0.1, 0.06, 0.012, x, 0.6, 0.118, { col: seed % 2 ? C.yellow : C.white, r: [-0.176, 0, 0], b: 3e-3 });
  }
  if (o.stripe) {
    const A = o.atlas;
    if (A) for (const s of [-1, 1]) P3.quad("decal", 2.6, 0.2, A.rect("hazstripe"), { p: [0, 0.5, s * 0.142], r: [-s * 0.176, s > 0 ? 0 : PI5, 0] });
  }
  if (seed % 2 === 0) {
    for (let i = 0; i < 3; i++) P3.bar("rust", [L / 2 - 0.02, 0.7 - i * 0.02, -0.05 + i * 0.05], [L / 2 + 0.05 + P3.rr(0, 0.06), 0.76 + P3.rr(-0.04, 0.04), -0.07 + i * 0.07], 6e-3, { col: [0.7, 0.5, 0.4] });
  }
  P3.col([-L / 2, 0, -hw], [L / 2, top, hw], { surface: "concrete" });
  return P3.finish({ grime: 1.2 });
});
var waterBarrier = (seed = 1, col = "orange") => proto("waterb" + seed + col, () => {
  const P3 = new Prop("waterb", seed), L = 2, hw = 0.24, top = 1, cc = C[col];
  const sec = (ins, y0 = 0) => mir([[hw - 0.03, y0], [hw, y0 + 0.03], [hw, 0.2], [hw - 0.05 - ins, 0.34], [0.115 - ins * 0.6, 0.86], [0.1, 0.955], [0.07, top]].filter((p) => p[1] >= y0));
  const cuts = [[-1, 0], [-0.9, 0], [-0.74, 2], [-0.58, 0], [-0.52, 1], [-0.1, 0], [0.1, 1], [0.52, 0], [0.58, 2], [0.74, 0], [0.9, 0]];
  for (let i = 0; i < cuts.length; i++) {
    const x0 = cuts[i][0], x1 = i + 1 < cuts.length ? cuts[i + 1][0] : L / 2, k = cuts[i][1];
    P3.ext("plastic", k === 2 ? sec(0, 0.11) : sec(k ? 0.028 : 0), x0, x1, { plane: "side", bevel: 0.01, col: cc });
  }
  P3.lathe("plastic", [[0, 0], [0.06, 0], [0.066, 6e-3], [0.066, 0.03], [0.058, 0.036], [0.03, 0.036], [0.03, 0.05], [0, 0.05]], { seg: 18, col: C.dark, p: [0.3, top - 4e-3, 0] });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * PI5 * 2;
    P3.box("plastic", 0.012, 0.03, 8e-3, 0.3 + Math.cos(a) * 0.066, top + 0.014, Math.sin(a) * 0.066, { col: C.dark, r: [0, -a, 0], b: 2e-3 });
  }
  P3.cyl("plastic", 0.022, 0.02, -0.35, top + 6e-3, 0, { col: C.dark, seg: 10 });
  P3.cyl("plastic", 0.03, 0.03, L / 2 - 0.08, 0.09, hw + 4e-3, { axis: "z", col: C.dark, seg: 10 });
  P3.box("plastic", 0.09, 0.5, 0.1, L / 2 + 0.035, 0.42, 0, { col: cc, b: 0.02 });
  for (const s of [-1, 1]) P3.box("plastic", 0.09, 0.5, 0.08, -L / 2 - 0.035, 0.42, s * 0.11, { col: cc, b: 0.02 });
  for (const x of [-0.31, 0.31]) for (const s of [-1, 1]) P3.box("plastic", 0.34, 0.11, 6e-3, x, 0.62, s * 0.117, { col: C.white, r: [-s * 0.19, 0, 0], b: 2e-3 });
  P3.col([-L / 2, 0, -hw], [L / 2, top, hw], { surface: "plastic" });
  return P3.finish({ grime: 1.3 });
});
var crowdBarrier = (seed = 1, o = {}) => proto("crowd" + seed + (o.sign || ""), () => {
  const P3 = new Prop("crowd", seed), w = 2.3, h = 1.1, y0 = 0.1, r = 0.019, rc = 0.11;
  const frame2 = [];
  for (const [cx, cy, a0] of [[w / 2 - rc, h - rc, 0], [-w / 2 + rc, h - rc, H], [-w / 2 + rc, y0 + rc, PI5], [w / 2 - rc, y0 + rc, -H]]) for (let i = 0; i <= 5; i++) {
    const a = a0 + i / 5 * H;
    frame2.push([cx + Math.cos(a) * rc, cy + Math.sin(a) * rc, 0]);
  }
  P3.add("galv", sweep(circlePts(0, 0, r, 10), frame2, { closed: true, up: [0, 0, 1], crease: 80 }), C.steel);
  const n = 17;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.16 + i / (n - 1) * (w - 0.32);
    P3.bar("galv", [x, y0 + 0.02, 0], [x, h - 0.02, 0], 8e-3, { col: C.steel, seg: 6 });
  }
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.2);
    P3.ext("galv", [[-0.3, 0], [-0.3, 8e-3], [-0.1, 8e-3], [-0.04, 0.085], [0.04, 0.085], [0.1, 8e-3], [0.3, 8e-3], [0.3, 0], [0.09, 0], [0.035, 0.074], [-0.035, 0.074], [-0.09, 0]], x - 0.025, x + 0.025, { plane: "side", bevel: 2e-3, col: C.steel });
    P3.cyl("steel", 0.011, 0.07, x, y0 + 0.02, 0, { axis: "z", seg: 6, col: C.steel });
  }
  for (const y of [0.42, 0.86]) {
    P3.add("galv", ring(0.03, 7e-3, { seg: 8, a0: -H, a1: PI5 }), C.steel, { p: [w / 2 + 0.026, y, 0], r: [H, 0, 0] });
    P3.bar("galv", [-w / 2, y, 0], [-w / 2 - 0.05, y, 0], 7e-3, { col: C.steel });
    P3.bar("galv", [-w / 2 - 0.05, y, 0], [-w / 2 - 0.05, y - 0.06, 0], 7e-3, { col: C.steel });
  }
  if (o.sign && o.atlas) {
    const A = o.atlas, a = A.aspect(o.sign), sw = Math.min(1.5, 0.62 * a);
    P3.box("galv", sw + 0.03, sw / a + 0.03, 4e-3, 0, 0.66, 0.024, { col: C.steel, b: 1e-3 });
    P3.quad("sign", sw, sw / a, A.rect(o.sign), { p: [0, 0.66, 0.0275] });
  }
  P3.col([-w / 2, 0, -0.05], [w / 2, h, 0.05], { surface: "metal", noBullet: true });
  return P3.finish({ grime: 0.9 });
});
var fencePanel = (seed = 1, o = {}) => proto("fence" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("fence", seed), w = o.w || 3, h = o.h || 2.5, y0 = 0.14, r = 0.021, hw = w / 2 - 0.03;
  const frame2 = [[-hw, y0, 0], [hw, y0, 0], [hw, h, 0], [-hw, h, 0]];
  for (let i = 0; i < 4; i++) P3.bar("galv", frame2[i], frame2[(i + 1) % 4], r, { col: C.steel, seg: 8 });
  for (const p of frame2) P3.cyl("galv", r * 1.02, r * 2, p[0], p[1], 0, { axis: "z", seg: 8, col: C.steel, cham: 4e-3 });
  P3.bar("galv", [-hw, (y0 + h) / 2, 0], [hw, (y0 + h) / 2, 0], 0.014, { col: C.steel, seg: 6 });
  P3.bar("galv", [0, y0, 0], [0, h, 0], 0.014, { col: C.steel, seg: 6 });
  if (!o.noMesh) {
    const g2 = quadXY(w - 0.1, h - y0 - 0.04, null);
    P3.add("mesh", g2, null, { p: [0, (y0 + h) / 2, 4e-3] });
  }
  for (let i = 0; i < 9; i++) {
    const x = -hw + 0.15 + i * (w - 0.36) / 8;
    for (const y of [y0, h]) P3.add("galv", ring(r + 4e-3, 25e-4, { seg: 8, radial: 4 }), C.steel, { p: [x, y, 0], r: [0, H, 0] });
  }
  for (const s of [-1, 1]) {
    const x = s * hw;
    P3.ext("concrete", mir([[0.11, 0], [0.11, 0.09], [0.085, 0.14]]), x - 0.33, x + 0.33, { plane: "side", bevel: 0.012 });
    P3.bar("galv", [x, 0.02, 0], [x, y0 + 0.02, 0], r, { col: C.steel });
    P3.cyl("black", 0.03, 0.01, x + s * 0.2, 0.141, 0, { seg: 10, cham: 0 });
  }
  for (const y of [0.6, 1.9]) {
    P3.box("galv", 0.1, 0.05, 0.07, hw + 0.03, y, 0, { col: C.steel, b: 8e-3 });
    P3.cyl("steel", 8e-3, 0.09, hw + 0.03, y, 0, { axis: "z", seg: 6, col: C.steel });
  }
  if (o.razor !== false) {
    const R0 = 0.2, turns = Math.round(w / 0.3), pts = [], N = turns * 14;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = t * turns * PI5 * 2 + seed;
      pts.push([-w / 2 + t * w, h + R0 * 0.9 + Math.sin(a) * R0, Math.cos(a) * R0 * (0.8 + 0.2 * Math.sin(t * 9 + seed))]);
    }
    P3.add("razor", sweep(rectPts(-7e-3, -12e-4, 7e-3, 12e-4), pts, { crease: 80, caps: false }), C.steel);
    for (let i = 2; i < N; i += 2) {
      const p = pts[i], q = pts[i + 1] || p, dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], l = Math.hypot(dx, dy, dz) || 1;
      for (const s of [-1, 1]) for (const t of [-1, 1]) P3.bar("razor", [p[0], p[1], p[2]], [p[0] + dx / l * 0.016 * t + dy / l * 0.012 * s, p[1] + dy / l * 0.016 * t - dx / l * 0.012 * s, p[2] + dz / l * 0.016 * t + 8e-3 * s], 28e-4, { r2: 3e-4, seg: 3, caps: false, col: C.steel });
    }
    for (let i = 0; i < 4; i++) {
      const x = -hw + 0.3 + i * (w - 0.66) / 3;
      P3.bar("galv", [x, h, 0], [x + 0.03, h + 0.1, 0.05], 2e-3, { col: C.steel, seg: 4 });
    }
  }
  if (o.tarp) {
    const tc = o.tarp === "white" ? [0.72, 0.73, 0.7] : o.tarp === "blue" ? [0.12, 0.22, 0.4] : [0.1, 0.24, 0.14], tw = w - 0.14, th = h - y0 - 0.3, nx = 26, ny = 16, tear = P3.rr(0.25, 0.5);
    const g2 = gridSurf(Array.from({ length: nx + 1 }, (_, i) => i / nx), Array.from({ length: ny + 1 }, (_, i) => i / ny), (u, v, q, mm) => {
      const x = (u - 0.5) * tw, y = y0 + 0.1 + v * th, eye = Math.abs(Math.sin(u * PI5 * 7)), sag = 0.03 * (1 - eye) * (v > 0.9 ? (v - 0.9) * 10 : 0) + 0.02 * (1 - eye) * (v < 0.1 ? (0.1 - v) * 10 : 0);
      const bil = 0.035 * Math.sin(u * PI5) * Math.sin(v * PI5) * (0.6 + fbm(u * 3 + seed, v * 3, 1, 2)) + 0.012 * Math.sin(u * 23 + v * 5 + seed) * Math.sin(v * PI5);
      let z = 0.03 + bil, yy = y - sag * (v > 0.5 ? 1 : -1), xx = x;
      const tk = sstep(tear, 0, u + v * 1.2 - 0.02);
      if (tk > 0) {
        z += tk * 0.28;
        yy += tk * 0.34 * (1 - v);
        xx += tk * 0.1;
      }
      q.set(xx, yy, z);
      mm[1] = clamp2(0.6 - v) * 0.8;
      const f3 = 0.82 + 0.3 * fbm(u * 8 + seed, v * 8, 3, 2);
      return [tc[0] * f3, tc[1] * f3, tc[2] * f3];
    });
    g2.computeVertexNormals();
    P3.add("tarp", g2);
    for (let i = 0; i <= 7; i++) for (const y of [y0 + 0.13, y0 + 0.07 + th]) {
      const x = -tw / 2 + 0.04 + i * (tw - 0.08) / 7;
      if (y < 1 && i / 7 < tear) continue;
      P3.add("galv", ring(0.014, 4e-3, { seg: 8, radial: 4 }), C.steel, { p: [x, y, 0.034] });
      P3.bar("galv", [x, y, 0.03], [x, y < 1 ? y0 : h, 0], 2e-3, { col: C.steel, seg: 4 });
    }
    if (o.sign && o.atlas) {
      const a = o.atlas.aspect(o.sign), sw = Math.min(tw * 0.6, 1 * a);
      P3.quad("sign", sw, sw / a, o.atlas.rect(o.sign), { p: [0.2, y0 + 0.1 + th * 0.62, 0.075], nx: 4 });
    }
  }
  P3.col([-w / 2, 0, -0.06], [w / 2, h + (o.razor !== false ? 0.4 : 0), 0.06], { surface: "mesh", noBullet: !o.tarp });
  return P3.finish({ grime: 0.9 });
});
var boomGate = (seed = 1, o = {}) => proto("boom" + seed + (o.angle || 0), () => {
  const P3 = new Prop("boom", seed), ang = o.angle || 0, armL = o.len || 5, A = o.atlas;
  P3.box("concrete", 0.62, 0.1, 0.62, 0, 0, 0, { base: true, b: 0.02 });
  P3.box("paint", 0.42, 1.02, 0.4, 0, 0.1, 0, { base: true, col: C.yellow, b: 0.014 });
  P3.box("paint", 0.46, 0.035, 0.44, 0, 1.12, 0, { base: true, col: C.dark, b: 8e-3 });
  const slots = [];
  for (let i = 0; i < 6; i++) slots.push(slot(0, 0.16 + i * 0.03, 0.2, 0.012, 4));
  P3.ext("paint", roundRect(-0.16, 0.02, 0.16, 0.86, 0.012, 3), 0.2, 0.208, { bevel: 2e-3, holes: slots, col: C.yellow, p: [0, 0.14, 0] });
  P3.box("black", 0.24, 0.2, 4e-3, 0, 0.375, 0.202);
  for (const y of [0.3, 0.86]) P3.cyl("steel", 8e-3, 0.07, -0.168, y, 0.207, { col: C.steel, seg: 8 });
  P3.cyl("steel", 0.014, 0.012, 0.12, 0.62, 0.211, { axis: "z", seg: 10, col: C.steel });
  P3.box("steel", 4e-3, 0.012, 4e-3, 0.12, 0.62, 0.218, { col: C.dark });
  if (A) {
    P3.quad("decal", 0.3, 0.3 / 8, A.rect("hazstripe"), { p: [0, 0.18, 0.2085] });
    P3.quad("decal", 0.26, 0.26 / 2, A.rect("genLabel"), { p: [0, 0.94, 0.2015] });
  }
  P3.tube("galv", [[0.1, 0.1, -0.21], [0.1, 0.5, -0.215], [0.1, 0.8, -0.215], [0.06, 0.9, -0.215]], 0.012, { col: C.steel, seg: 8 });
  P3.box("galv", 0.12, 0.14, 0.06, 0.04, 0.96, -0.225, { col: C.steel, b: 6e-3 });
  P3.cyl("paint", 0.045, 0.03, 0, 1.17, 0, { col: C.dark, seg: 14 });
  P3.lathe("emAmberB", [[0, 0], [0.04, 0], [0.042, 0.04], [0.034, 0.07], [0.018, 0.084], [0, 0.088]], { seg: 14, p: [0, 1.185, 0] });
  P3.glow("blink", [0, 1.23, 0], { col: [1, 0.45, 0.05], power: 1.2 });
  const py2 = 0.92;
  P3.cyl("steel", 0.07, 0.1, 0, py2, 0.25, { axis: "z", seg: 16, col: C.dark });
  P3.cyl("steel", 0.03, 0.14, 0, py2, 0.25, { axis: "z", seg: 10, col: C.steel });
  P3.push({ p: [0, py2, 0.3], r: [0, 0, ang] });
  const oct = (w, hh, c) => [[-w / 2 + c, -hh / 2], [w / 2 - c, -hh / 2], [w / 2, -hh / 2 + c], [w / 2, hh / 2 - c], [w / 2 - c, hh / 2], [-w / 2 + c, hh / 2], [-w / 2, hh / 2 - c], [-w / 2, -hh / 2 + c]];
  const nb2 = 10;
  for (let i = 0; i < nb2; i++) {
    const x0 = -0.5 + i / nb2 * (armL + 0.5), x1 = -0.5 + (i + 1) / nb2 * (armL + 0.5);
    P3.ext("paint", oct(0.05, 0.1, 0.012).map(([z, y]) => [z, y]), x0, x1, { plane: "side", bevel: 15e-4, col: i % 2 ? C.white : C.red });
  }
  P3.box("rubber", 0.03, 0.1, 0.05, armL + 0.012, 0, 0, { col: C.dark, b: 0.01 });
  P3.box("steel", 0.34, 0.2, 0.09, -0.62, -0.02, 0, { col: C.dark, b: 0.012 });
  for (const x of [-0.72, -0.52]) P3.cyl("steel", 0.012, 0.11, x, -0.02, 0, { axis: "z", seg: 6, col: C.steel });
  P3.box("steel", 0.2, 0.16, 0.012, 0.02, 0, -0.032, { col: C.dark, b: 4e-3 });
  for (const [x, y] of [[-0.05, 0.05], [0.09, 0.05], [-0.05, -0.05], [0.09, -0.05]]) P3.cyl("steel", 9e-3, 0.012, x, y, 0.03, { axis: "z", seg: 6, col: C.steel });
  for (let i = 0; i < 9; i++) {
    const x = 0.7 + i * 0.45;
    P3.bar("galv", [x, -0.05, 0], [x, -0.5, 0], 6e-3, { col: C.steel, seg: 5 });
  }
  P3.bar("galv", [0.7, -0.5, 0], [4.3, -0.5, 0], 7e-3, { col: C.steel, seg: 5 });
  if (A) {
    P3.box("galv", 0.5, 0.5, 4e-3, 2.5, -0.26, 0.028, { col: C.steel, b: 1e-3 });
    P3.quad("sign", 0.48, 0.48, A.rect("stop"), { p: [2.5, -0.26, 0.031] });
  }
  P3.add("emRed", cyl(0.02, 0.012, 10), null, { p: [armL - 0.3, 0, 0.03], r: [H, 0, 0] });
  P3.pop();
  const tx = Math.cos(ang) * armL, ty = py2 + Math.sin(ang) * armL;
  P3.box("concrete", 0.3, 0.06, 0.3, armL - 0.1, 0, 0.3, { base: true, b: 0.015 });
  P3.box("paint", 0.07, py2 - 0.14, 0.07, armL - 0.1, 0.06, 0.3, { base: true, col: C.yellow, b: 6e-3 });
  for (const s of [-1, 1]) P3.box("paint", 0.012, 0.14, 0.08, armL - 0.1, py2 - 0.02, 0.3 + s * 0.04, { col: C.yellow, b: 3e-3 });
  P3.col([-0.23, 0, -0.22], [0.23, 1.2, 0.22], { surface: "metal" });
  if (ang < 0.3) P3.col([0.23, py2 - 0.55, 0.26], [armL, py2 + 0.08, 0.34], { surface: "metal" });
  return P3.finish({ grime: 1 });
});
var bollard = (seed = 1) => proto("bollard" + seed, () => {
  const P3 = new Prop("bollard", seed);
  P3.lathe("paint", [[0, 0], [0.11, 0], [0.11, 0.012], [0.075, 0.02], [0.057, 0.03], [0.057, 0.5]], { seg: 18, col: C.dark });
  P3.lathe("paint", [[0.057, 0.5], [0.0585, 0.5], [0.0585, 0.62], [0.057, 0.62]], { seg: 18, col: C.yellow });
  P3.lathe("paint", [[0.057, 0.62], [0.057, 0.9], [0.063, 0.905], [0.063, 0.93], [0.05, 0.955], [0.02, 0.972], [0, 0.975]], { seg: 18, col: C.dark });
  for (let i = 0; i < 4; i++) {
    const a = i * H + 0.78;
    P3.cyl("steel", 0.011, 0.012, Math.cos(a) * 0.09, 0.018, Math.sin(a) * 0.09, { seg: 6, col: C.steel });
  }
  P3.col([-0.07, 0, -0.07], [0.07, 0.97, 0.07], { surface: "metal" });
  return P3.finish({ grime: 1.1 });
});
var cone = (seed = 1, fallen = false) => proto("cone" + seed + fallen, () => {
  const P3 = new Prop("cone", seed);
  if (fallen) P3.push({ p: [0, 0.135, 0], r: [0, P3.rr(0, 6), H + 0.33] });
  P3.ext("rubber", roundRect(-0.19, -0.19, 0.19, 0.19, 0.05, 4), 0, 0.03, { plane: "up", bevel: 6e-3, col: C.dark });
  P3.lathe("plastic", [[0.135, 0.03], [0.128, 0.05], [0.094, 0.3]], { seg: 20, col: C.orange });
  P3.lathe("plastic", [[0.094, 0.3], [0.0955, 0.3], [0.076, 0.45], [0.074, 0.45]], { seg: 20, col: C.white });
  P3.lathe("plastic", [[0.074, 0.45], [0.062, 0.53]], { seg: 20, col: C.orange });
  P3.lathe("plastic", [[0.062, 0.53], [0.0635, 0.53], [0.05, 0.63], [0.0485, 0.63]], { seg: 20, col: C.white });
  P3.lathe("plastic", [[0.0485, 0.63], [0.036, 0.71], [0.03, 0.72], [0.02, 0.72], [0.02, 0.7], [0, 0.7]], { seg: 20, col: C.orange });
  if (fallen) P3.pop();
  P3.col(fallen ? [-0.4, 0, -0.2] : [-0.16, 0, -0.16], fallen ? [0.3, 0.3, 0.2] : [0.16, 0.7, 0.16], { surface: "plastic", noNav: true, soft: true });
  return P3.finish({ grime: 1.3 });
});
var drum = (seed = 1) => proto("drum" + seed, () => {
  const P3 = new Prop("drum", seed), bands = [[0.1, 0.3, C.orange], [0.3, 0.46, C.white], [0.46, 0.62, C.orange], [0.62, 0.78, C.white], [0.78, 0.94, C.orange]];
  P3.lathe("rubber", [[0.2, 0], [0.33, 0], [0.34, 0.02], [0.34, 0.07], [0.31, 0.1], [0.27, 0.1]], { seg: 24, col: C.dark });
  for (const [a, b, c] of bands) {
    const r0 = 0.27 - (a - 0.1) * 0.05, r1 = 0.27 - (b - 0.1) * 0.05, wh = c === C.white ? 2e-3 : 0;
    P3.lathe("plastic", [[r0 + wh, a], [r1 + wh, b - 6e-3], [r1 - 6e-3, b]], { seg: 24, col: c });
  }
  P3.lathe("plastic", [[0.222, 0.94], [0.21, 0.97], [0.1, 0.98], [0.06, 0.975], [0, 0.975]], { seg: 24, col: C.orange });
  P3.add("plastic", ring(0.07, 0.012, { seg: 10, a0: 0, a1: PI5 }), C.orange, { p: [0, 0.975, 0], r: [0, P3.rr(0, 3), 0] });
  P3.cyl("emAmberB", 0.05, 0.03, 0.1, 1, 0.06, { seg: 12 });
  P3.cyl("plastic", 0.055, 0.03, 0.1, 0.985, 0.06, { seg: 12, col: C.dark });
  P3.glow("blink", [0.1, 1.02, 0.06], { col: [1, 0.45, 0.05], power: 0.6 });
  P3.col([-0.3, 0, -0.3], [0.3, 0.98, 0.3], { surface: "plastic" });
  return P3.finish({ grime: 1.3 });
});
var barricade = (seed = 1, o = {}) => proto("barricade" + seed + (o.sign || ""), () => {
  const P3 = new Prop("barricade", seed), w = 2.4, A = o.atlas;
  for (const s of [-1, 1]) {
    const x = s * 0.95;
    for (const t of [-1, 1]) {
      P3.beam("galv", [x, 0.02, t * 0.4], [x, 1.5, t * 0.03], 0.045, 6e-3, { col: C.steel });
      P3.beam("galv", [x + 0.02, 0.02, t * 0.4], [x + 0.02, 1.5, t * 0.03], 6e-3, 0.045, { col: C.steel });
    }
    P3.beam("galv", [x, 0.02, -0.42], [x, 0.02, 0.42], 0.05, 6e-3, { col: C.steel });
    P3.beam("galv", [x + 0.01, 0.55, -0.26], [x + 0.01, 0.55, 0.26], 0.03, 5e-3, { col: C.steel });
    P3.cyl("steel", 0.01, 0.07, x, 1.47, 0, { axis: "z", seg: 6, col: C.steel });
  }
  for (const [y, kind] of [[1.36, "top"], [1, "mid"], [0.64, "low"]]) {
    const sag = kind === "low" && seed % 2 ? 0.1 : 0;
    P3.push({ p: [0, y, 0.062], r: [0, 0, sag] });
    P3.box("wood", w, 0.2, 0.025, 0, 0, 0, { col: C.white, b: 4e-3 });
    if (A) P3.quad("decal", w - 0.04, 0.19, kind === "mid" && o.sign ? A.rect(o.sign) : A.rect("chevron"), { p: [0, 0, 0.0135] });
    for (const x of [-0.95, 0.95]) for (const dy of [-0.05, 0.05]) P3.cyl("steel", 8e-3, 0.012, x, dy, 0.016, { axis: "z", seg: 6, col: C.steel });
    P3.pop();
  }
  for (const s of [-1, 1]) {
    P3.box("plastic", 0.09, 0.07, 0.09, s * 0.95, 1.55, 0, { col: C.dark, b: 0.01 });
    P3.lathe("emAmberB", [[0, 0], [0.06, 0], [0.07, 0.02], [0.07, 0.03], [0.06, 0.05], [0, 0.05]], { seg: 14, axis: "z", p: [s * 0.95, 1.66, -0.025] });
    P3.add("plastic", ring(0.073, 8e-3, { seg: 14 }), C.yellow, { p: [s * 0.95, 1.66, 0] });
    P3.glow("blink", [s * 0.95, 1.66, 0.05], { col: [1, 0.45, 0.05], power: 0.8 });
  }
  P3.col([-w / 2, 0, -0.1], [w / 2, 1.5, 0.1], { surface: "wood" });
  return P3.finish({ grime: 1.1 });
});
var signPost = (seed = 1, o = {}) => proto("signpost" + seed + o.sign + (o.h || ""), () => {
  const P3 = new Prop("signpost", seed), A = o.atlas, h = o.h || 2.6, a = A ? A.aspect(o.sign) : 1, sw = o.w || Math.min(1.1, 0.7 * Math.max(1, a)), sh = sw / a, lean = (seed % 3 - 1) * 0.04;
  P3.push({ r: [lean, 0, lean * 0.6] });
  P3.cyl("concrete", 0.14, 0.05, 0, 0, 0, { base: true, seg: 14, cham: 0.012 });
  P3.bar("galv", [0, 0.03, 0], [0, h, 0], 0.03, { col: C.steel, seg: 10 });
  P3.cyl("plastic", 0.033, 0.02, 0, h, 0, { col: C.dark, seg: 10 });
  const cy = h - sh / 2 - 0.06;
  P3.box("galv", sw + 0.02, sh + 0.02, 4e-3, 0, cy, 0.04, { col: C.steel, b: 1e-3 });
  for (const y of [cy - sh * 0.3, cy + sh * 0.3]) {
    P3.box("galv", Math.min(sw * 0.8, 0.5), 0.03, 0.012, 0, y, 0.033, { col: C.steel, b: 3e-3 });
    P3.add("galv", ring(0.033, 5e-3, { seg: 8, a0: PI5 * 0.1, a1: PI5 * 0.9 }), C.steel, { p: [0, y, 0.01], r: [-H, 0, 0] });
  }
  if (A) P3.quad("sign", sw, sh, A.rect(o.sign), { p: [0, cy, 0.0425] });
  if (o.sign2 && A) {
    const a2 = A.aspect(o.sign2), w2 = Math.min(0.8, 0.5 * a2), cy2 = cy - sh / 2 - w2 / a2 / 2 - 0.06;
    P3.box("galv", w2 + 0.02, w2 / a2 + 0.02, 4e-3, 0, cy2, 0.04, { col: C.steel, b: 1e-3 });
    P3.quad("sign", w2, w2 / a2, A.rect(o.sign2), { p: [0, cy2, 0.0425] });
  }
  P3.pop();
  P3.col([-0.06, 0, -0.06], [0.06, h, 0.06], { surface: "metal" });
  return P3.finish({ grime: 1 });
});
var signStand = (seed = 1, o = {}) => proto("signstand" + seed + o.sign, () => {
  const P3 = new Prop("signstand", seed), A = o.atlas, a = A ? A.aspect(o.sign) : 1, sw = Math.min(1.2, 0.75 * Math.max(1, a)), sh = sw / a;
  for (let i = 0; i < 4; i++) {
    const an = i * H + 0.78;
    P3.beam("galv", [0, 0.26, 0], [Math.cos(an) * 0.52, 0.015, Math.sin(an) * 0.52], 0.03, 0.03, { col: C.steel });
    P3.box("rubber", 0.06, 0.02, 0.06, Math.cos(an) * 0.53, 0.01, Math.sin(an) * 0.53, { col: C.dark, b: 6e-3 });
  }
  P3.box("galv", 0.08, 0.1, 0.08, 0, 0.26, 0, { col: C.steel, b: 8e-3 });
  for (let i = 0; i < 2; i++) P3.add("steel", tube(Array.from({ length: 25 }, (_, k) => [Math.cos(k * 0.9) * 0.025 + (i ? 0.03 : -0.03), 0.31 + k * 6e-3, Math.sin(k * 0.9) * 0.025]), 4e-3, 5), C.steel);
  P3.beam("galv", [0, 0.45, 0], [0, 1 + sh, 0], 0.03, 0.03, { col: C.steel });
  P3.box("plastic", sw + 0.02, sh + 0.02, 6e-3, 0, 1 + sh / 2, 0.02, { col: C.orange, b: 2e-3 });
  if (A) P3.quad("sign", sw, sh, A.rect(o.sign), { p: [0, 1 + sh / 2, 0.0235] });
  P3.box("galv", sw, sh, 3e-3, 0, 1 + sh / 2, 0.0155, { b: 0 });
  for (const yy of [0.28, 0.72]) {
    P3.box("galv", sw - 0.06, 0.035, 0.018, 0, 1 + sh * yy, 6e-3, { b: 4e-3 });
    P3.add("steel", ring(0.026, 5e-3, { seg: 8, a0: 0, a1: PI5 }), C.steel, { p: [0, 1 + sh * yy, -0.016], r: [H, 0, 0] });
    for (const sx of [-1, 1]) P3.cyl("steel", 6e-3, 0.01, sx * 0.026, 1 + sh * yy, -6e-3, { r: [H, 0, 0], col: C.steel, seg: 6 });
  }
  P3.box("plastic", 0.09, 0.05, 2e-3, sw * 0.3, 1 + sh * 0.5, 0.013, { col: [0.85, 0.85, 0.8], b: 0 });
  P3.add("burlap", sandbagGeo(P3, 0.5, 0.13, 0.28), C.sand, { p: [0.2, 0.09, 0.22], r: [0.1, 0.9, 0.2] });
  P3.col([-0.35, 0, -0.35], [0.35, 1 + sh, 0.35], { surface: "metal", noNav: true });
  return P3.finish({ grime: 1 });
});
function sandbagGeo(P3, w = 0.62, h = 0.17, d = 0.33) {
  const g2 = softBox(w, h, d, h * 0.4, 5), s1 = P3.rr(0, 20), fill2 = P3.rr(0.82, 1.05);
  deform(g2, (v) => {
    const u = v.x / (w / 2), t = v.z / (d / 2);
    const plump = 1 + 0.18 * (1 - u * u) * (1 - t * t) * fill2;
    v.y *= plump;
    v.z *= 1 + 0.06 * (1 - u * u);
    if (u > 0.72) {
      const k = (u - 0.72) / 0.28;
      v.z *= 1 - 0.55 * k;
      v.y *= 1 - 0.5 * k;
      v.y += 0.012 * k;
    }
    v.y += 0.012 * Math.sin(v.x * 21 + s1) * (v.y > 0 ? 1 : 0.3) + 8e-3 * Math.sin(v.z * 34 + s1 * 2);
    v.y -= 0.03 * u * u * (v.y < 0 ? 0.2 : 1);
    if (v.y < 0) v.y *= 0.82;
  }, true);
  const neck = tube([[w * 0.44, 4e-3, -0.03], [w * 0.455, 0.022, 0], [w * 0.44, 4e-3, 0.03]], 4e-3, 5);
  return g2;
}
var sandbags = (seed = 1, o = {}) => proto("sandbags" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("sandbags", seed), len = o.len || 3, rows = o.rows || 4, deep = o.deep || 1, bw = 0.6, bh = 0.145;
  for (let j = 0; j < rows; j++) {
    const n = Math.max(1, Math.round((len - j % 2 * bw * 0.5 - j * 0.06) / bw));
    for (let k = 0; k < (j < rows - 1 ? deep : Math.max(1, deep - 1)); k++) for (let i = 0; i < n; i++) {
      if (j === rows - 1 && P3.R() < 0.2) continue;
      const x = -len / 2 + bw / 2 + j % 2 * bw * 0.5 + i * bw + j * 0.03 + P3.rr(-0.02, 0.02), z = (k - (deep - 1) / 2) * 0.31 + P3.rr(-0.02, 0.02), f3 = P3.rr(0.75, 1.1), cc = P3.R() < 0.25 ? [0.42 * f3, 0.44 * f3, 0.3 * f3] : [C.sand[0] * f3, C.sand[1] * f3, C.sand[2] * f3];
      const g2 = sandbagGeo(P3, bw * P3.rr(1.07, 1.13), bh * 1.24, 0.37);
      P3.add("burlap", g2, cc, { p: [x, bh * (j + 0.5) - j * 6e-3, z], r: [P3.rr(-0.05, 0.05), P3.rr(-0.08, 0.08) + (P3.R() < 0.5 ? PI5 : 0), P3.rr(-0.04, 0.04)], jit: 0.1 });
      P3.add("canvas", tube([[0.27, 0.01, -0.03], [0.285, 0.03, 0], [0.27, 0.01, 0.03]], 4e-3, 5), [0.75, 0.72, 0.62], { p: [x, bh * (j + 0.5), z] });
    }
  }
  for (let i = 0; i < 2; i++) P3.add("burlap", sandbagGeo(P3, bw, bh * 1.1, 0.33), C.sand, { p: [P3.rr(-len / 2, len / 2), bh * 0.5, 0.16 * deep + 0.26 + P3.rr(0, 0.1)], r: [0, P3.rr(0, 3), P3.rr(-0.1, 0.1)], jit: 0.1 });
  P3.col([-len / 2, 0, -0.17 * deep - 0.02], [len / 2, rows * bh, 0.17 * deep + 0.02], { surface: "sand" });
  return P3.finish({ grime: 1.2 });
});
var concreteBlock = (seed = 1, o = {}) => proto("cblock" + seed + (o.stripe ? "s" : ""), () => {
  const P3 = new Prop("cblock", seed), w = 1.6, h = 0.8, d = 0.8;
  const side2 = [[-w / 2, 0.02], [-w / 2 + 0.02, 0], [-0.52, 0], [-0.5, 0.09], [-0.2, 0.09], [-0.18, 0], [0.18, 0], [0.2, 0.09], [0.5, 0.09], [0.52, 0], [w / 2 - 0.02, 0], [w / 2, 0.02], [w / 2, h - 0.03], [w / 2 - 0.03, h], [-w / 2 + 0.03, h], [-w / 2, h - 0.03]];
  P3.ext("concrete", side2, -d / 2, d / 2, { bevel: 0.02 });
  for (const x of [-0.4, 0.4]) P3.lathe("concrete", [[0, 0], [0.17, 0], [0.15, 0.1], [0.14, 0.11], [0, 0.11]], { seg: 4, start: PI5 / 4, p: [x, h, 0] });
  P3.add("steel", ring(0.06, 0.014, { seg: 10, a0: 0, a1: PI5 }), C.steel, { p: [0, h - 0.01, 0], r: [0, H, 0] });
  if (o.stripe && o.atlas) for (const s of [-1, 1]) P3.quad("decal", 1.5, 0.19, o.atlas.rect("hazstripe"), { p: [0, 0.5, s * (d / 2 + 5e-4)], r: [0, s > 0 ? 0 : PI5, 0] });
  P3.col([-w / 2, 0, -d / 2], [w / 2, h + 0.1, d / 2], { surface: "concrete" });
  return P3.finish({ grime: 1.2 });
});
var hedgehog = (seed = 1) => proto("hedgehog" + seed, () => {
  const P3 = new Prop("hedgehog", seed), L = 1.5, t = 0.012, f3 = 0.11;
  const leg = (rot2) => {
    P3.push({ p: [0, 0.6, 0], r: rot2 });
    P3.box("rust", f3, L, t, 0, 0, f3 / 2, { col: [0.7, 0.62, 0.58], b: 2e-3 });
    P3.box("rust", t, L, f3, f3 / 2, 0, 0, { col: [0.7, 0.62, 0.58], b: 2e-3 });
    for (const y of [-L / 2 + 0.02, L / 2 - 0.02]) P3.box("rust", f3 + 0.03, 0.014, f3 + 0.03, 0.02, y, 0.02, { col: [0.6, 0.5, 0.45], b: 3e-3 });
    P3.pop();
  };
  leg([0.62, 0, 0.62]);
  leg([-0.62, 0.3, 0.62]);
  leg([0.1, 0, -0.95]);
  P3.box("rust", 0.26, 0.26, 0.014, 0.03, 0.6, 0.05, { r: [0.3, 0.5, 0.2], col: [0.6, 0.5, 0.45], b: 3e-3 });
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    P3.cyl("steel", 0.014, 0.03, 0.03 + Math.cos(a) * 0.09, 0.6 + Math.sin(a) * 0.09, 0.07, { axis: "z", seg: 6, col: [0.5, 0.4, 0.35] });
  }
  P3.col([-0.45, 0, -0.45], [0.45, 1.1, 0.45], { surface: "metal" });
  return P3.finish({ grime: 1.2 });
});

