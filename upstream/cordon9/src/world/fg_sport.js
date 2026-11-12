var WHT = [0.86, 0.87, 0.86];
var DK2 = [0.1, 0.1, 0.105];
var ALU4 = [0.8, 0.82, 0.84];
var NAVY2 = [0.07, 0.12, 0.26];
var GOLD2 = [0.82, 0.6, 0.08];
var STEELC = [0.3, 0.31, 0.33];
var WOODC2 = [0.42, 0.33, 0.22];
var lin2 = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
var ball = (P3, x, y, z, r = 0.11, col = WHT, mat = "plastic") => {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = -H + PI5 * i / 8;
    pts.push([Math.max(1e-3, Math.cos(a) * r), Math.sin(a) * r]);
  }
  P3.lathe(mat, pts, { seg: 12, col, p: [x, y, z], jit: 0.25, cell: 14 });
};
function netQuad(P3, a, b, c, d, { sag = 0.1, nx = 8, ny = 6, torn = null, R: R4 = null } = {}) {
  const wT = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), hL = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]), g2 = quadXY(wT, hL, null, nx, ny), Pp = g2.attributes.position;
  const n = new Vector3().crossVectors(new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])).normalize();
  for (let i = 0; i < Pp.count; i++) {
    const u = Pp.getX(i) / wT + 0.5, v = 0.5 - Pp.getY(i) / hL;
    let s = sag * Math.sin(u * PI5) * Math.sin(v * PI5), drop = 0;
    if (torn && u > torn[0] && u < torn[1] && v > torn[2]) {
      const k = (v - torn[2]) / (1 - torn[2]);
      drop = k * k * 0.5;
      s += 0.25 * k * Math.sin(u * 20);
    }
    const x0 = lerp2(a[0], b[0], u), y0 = lerp2(a[1], b[1], u), z0 = lerp2(a[2], b[2], u), x1 = lerp2(c[0], d[0], u), y1 = lerp2(c[1], d[1], u), z1 = lerp2(c[2], d[2], u);
    Pp.setXYZ(i, lerp2(x0, x1, v) + n.x * s, lerp2(y0, y1, v) + n.y * s - Math.abs(s) * 0.3 + drop * (1 - v) * 0, lerp2(z0, z1, v) + n.z * s);
  }
  g2.computeVertexNormals();
  P3.add("meshNet", g2, null);
}
var goal = (seed = 1, o = {}) => proto("fgoal" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("goal", seed), R4 = rng(seed * 17 + 3), W = 7.32, Hh = 2.44, hw = W / 2, DT = 0.9, DB = 2, net = o.net || "ok";
  P3.push({ r: [-(o.lean || 0), 0, 0] });
  const oval = circlePts(0, 0, 0.06, 12).map(([x, y]) => [x, y * 0.82]);
  P3.add("paint", sweep(oval, [[-hw, 0, 0], [-hw, Hh, 0], [hw, Hh, 0], [hw, 0, 0]], { samples: 0, crease: 50 }), WHT, { jit: 0.05 });
  for (const s of [-1, 1]) {
    P3.cyl("galv", 0.075, 0.1, s * hw, 0.05, 0, { seg: 12, col: ALU4 });
    P3.cyl("paintOld", 0.0615, 0.5, s * hw, 0.35, 0, { seg: 12, col: WHT });
    P3.tube("galv", [[s * hw, Hh - 0.02, -0.03], [s * hw, Hh + 0.02, -DT], [s * hw, 0.03, -DB]], 0.022, { seg: 8, samples: 0, col: ALU4 });
    P3.bar("galv", [s * hw, Hh * 0.5, -0.04], [s * hw, Hh * 0.72, -DT - 0.25], 0.014, { col: ALU4 });
    P3.bar("galv", [s * hw, 0.03, 0], [s * hw, 0.03, -DB], 0.02, { col: ALU4 });
    for (let k = 0; k < 9; k++) P3.add("plastic", ring(0.012, 4e-3, { seg: 6, radial: 3, a0: 0, a1: PI5 * 1.4 }), DK2, { p: [s * (hw - 0), 0.25 + k * 0.27, -0.062], r: [0, H, 0] });
  }
  P3.bar("galv", [-hw, 0.03, -DB], [hw, 0.03, -DB], 0.02, { col: ALU4 });
  P3.bar("galv", [-hw, Hh + 0.02, -DT], [hw, Hh + 0.02, -DT], 0.016, { col: ALU4 });
  for (let k = 0; k < 24; k++) P3.add("plastic", ring(0.012, 4e-3, { seg: 6, radial: 3, a0: 0, a1: PI5 * 1.4 }), DK2, { p: [-hw + 0.2 + k * 0.3, Hh - 0, -0.062], r: [0, H, H] });
  for (const x of [-2.2, 0, 2.2]) {
    P3.box("burlap", 0.5, 0.15, 0.3, x, 0.09, -DB, { col: [0.45, 0.41, 0.3], b: 0.06 });
  }
  if (o.wheels) for (const s of [-1, 1]) {
    P3.cyl("rubber", 0.12, 0.06, s * (hw + 0.07), 0.12, -DB + 0.1, { axis: "x", seg: 12, col: DK2 });
    P3.box("steel", 0.03, 0.2, 0.06, s * (hw + 0.03), 0.14, -DB + 0.1, { col: STEELC, b: 6e-3 });
  }
  if (net !== "none") {
    const torn = net === "torn";
    netQuad(P3, [-hw, Hh, 0], [hw, Hh, 0], [-hw, Hh + 0.02, -DT], [hw, Hh + 0.02, -DT], { sag: -0.08, nx: 14, ny: 3 });
    netQuad(P3, [-hw, Hh + 0.02, -DT], [hw, Hh + 0.02, -DT], [-hw, 0.03, -DB], [hw, 0.03, -DB], { sag: -0.22, nx: 16, ny: 8, torn: torn ? [0.55, 0.9, 0.3] : null });
    for (const s of [-1, 1]) {
      if (torn && s > 0) {
        netQuad(P3, [s * hw, Hh, 0], [s * hw, Hh + 0.02, -DT], [s * hw, 1.5, -0.2], [s * hw + 0.3, 1.2, -DT - 0.4], { sag: 0.2, nx: 4, ny: 4 });
        continue;
      }
      netQuad(P3, [s * hw, Hh, 0], [s * hw, Hh + 0.02, -DT], [s * hw, 0.03, 0], [s * hw, 0.03, -DB], { sag: s * 0.1, nx: 5, ny: 8 });
    }
  }
  ball(P3, -1.4 + R4() * 0.6, 0.11, -1.5);
  P3.add("rubber", softBox(0.27, 0.1, 0.1, 0.035, 3), [0.08, 0.08, 0.08], { p: [1.6, 0.05, -1.3], r: [0, 0.9, 0.2] });
  P3.pop();
  for (const s of [-1, 1]) P3.col([s * hw - 0.07, 0, -0.07], [s * hw + 0.07, Hh + 0.06, 0.07], { surface: "metal", noNav: true });
  P3.col([-hw, Hh - 0.07, -0.07], [hw, Hh + 0.07, 0.07], { surface: "metal", bulletOnly: true });
  if (net !== "none") {
    P3.col([-hw, 0, -DB - 0.05], [hw, 2, -DB * 0.55], { surface: "mesh", noBullet: true });
    for (const s of [-1, 1]) P3.col([s * hw - 0.05, 0, -DB], [s * hw + 0.05, 2, -0.1], { surface: "mesh", noBullet: true });
  }
  return P3.finish({ grime: 0.5, ground: 0.3 });
});
var scoreboard = (seed = 1, o = {}) => proto("fscore" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("scoreboard", seed), A = o.atlas, R4 = rng(seed * 41 + 9), BW3 = 5.6, BH2 = BW3 / (A ? A.aspect("scoreFace") : 2.29), Y0 = 3.6, lit = o.lit ?? 1;
  for (const s of [-1, 1]) {
    const x = s * 2.1;
    P3.box("concrete", 0.9, 0.3, 0.9, x, 0, -0.2, { base: true, col: [0.74, 0.74, 0.72], b: 0.03 });
    for (const [dx, dz] of [[-0.25, 0.05], [0.25, 0.05], [-0.25, -0.45], [0.25, -0.45]]) {
      P3.box("galv", 0.06, Y0 + BH2 - 0.2, 0.06, x + dx, 0.3, dz, { base: true, col: STEELC, b: 4e-3 });
      P3.box("galv", 0.14, 0.02, 0.14, x + dx, 0.31, dz, { col: STEELC, b: 3e-3 });
    }
    for (let k = 0; k < 6; k++) {
      const y0 = 0.4 + k * 0.95, y1 = y0 + 0.95, f3 = k % 2 ? 1 : -1;
      P3.bar("galv", [x - 0.25 * f3, y0, 0.05], [x + 0.25 * f3, y1, 0.05], 0.012, { col: STEELC });
      P3.bar("galv", [x - 0.25 * f3, y0, -0.45], [x + 0.25 * f3, y1, -0.45], 0.012, { col: STEELC });
      P3.bar("galv", [x - 0.25, y0, 0.05 * f3 - 0.2 + 0.25 * f3], [x - 0.25, y1, -0.2 - 0.25 * f3], 0.012, { col: STEELC });
      P3.bar("galv", [x + 0.25, y0, -0.2 + 0.25 * f3], [x + 0.25, y1, -0.2 - 0.25 * f3], 0.012, { col: STEELC });
      for (const [dx, dz] of [[0, 0.05], [0, -0.45]]) P3.bar("galv", [x - 0.25, y1, dz + dx], [x + 0.25, y1, dz + dx], 0.01, { col: STEELC });
    }
  }
  P3.box("paint", BW3 + 0.24, BH2 + 0.24, 0.42, 0, Y0 - 0.12, -0.12, { base: true, col: NAVY2, b: 0.02 });
  P3.box("paint", BW3 + 0.5, 0.06, 0.75, 0, Y0 + BH2 + 0.14, 0.02, { col: [0.05, 0.08, 0.16], b: 0.012, r: [0.06, 0, 0] });
  for (const s of [-1, 1]) P3.box("paint", 0.05, BH2 + 0.2, 0.3, s * (BW3 / 2 + 0.1), Y0 - 0.1, 0.2, { base: true, col: [0.05, 0.08, 0.16], b: 0.01 });
  for (let k = 0; k < 4; k++) {
    const x = -BW3 / 2 + 0.7 + k * 1.4;
    P3.box("paint", 1.3, BH2 - 0.1, 0.02, x, Y0 + 0.05, -0.34, { base: true, col: [0.06, 0.1, 0.2], b: 4e-3 });
    for (let j = 0; j < 7; j++) P3.box("black", 0.9, 0.02, 0.012, x, Y0 + 0.4 + j * 0.07, -0.352, { b: 0 });
    P3.box("chrome", 0.03, 0.12, 0.02, x + 0.55, Y0 + BH2 / 2, -0.36, { b: 4e-3 });
  }
  if (A) {
    P3.quad("signF", BW3, BH2, A.rect("scoreFace"), { p: [0, Y0 + BH2 / 2, 0.094] });
    if (lit) P3.quad("signFLit", BW3, BH2, A.rect("scoreLit"), { p: [0, Y0 + BH2 / 2, 0.1] });
  }
  if (lit) {
    P3.glow("fill", [0, Y0 + BH2 * 0.45, 1.2], { col: [1, 0.56, 0.12], power: 7, dist: 12, dir: [0, -0.35, 0.94], cone: 1 });
  }
  for (let k = 0; k < 5; k++) {
    const x = (R4() - 0.5) * (BW3 - 0.8), y = Y0 + 0.3 + R4() * (BH2 - 0.9);
    P3.box("black", 0.12 + R4() * 0.2, 0.1 + R4() * 0.14, 0.01, x, y, 0.105, { b: 0 });
    P3.tube("rubber", [[x, y, 0.1], [x + 0.05, y - 0.15, 0.16], [x + 0.02, y - 0.3 - R4() * 0.2, 0.14]], 4e-3, { seg: 4, col: DK2 });
  }
  if (A) {
    for (let k = 0; k < 2; k++) {
      const nm = "sp" + (seed + k * 3) % 6, w = 2.7, h = w / A.aspect(nm);
      P3.box("paint", w + 0.06, h + 0.06, 0.04, -1.4 + k * 2.8, Y0 - 0.2 - h / 2 - 0.05, 0.06, { col: [0.2, 0.2, 0.22], b: 6e-3 });
      P3.quad("signF", w, h, A.rect(nm), { p: [-1.4 + k * 2.8, Y0 - 0.2 - h / 2 - 0.05, 0.082] });
    }
    const kw = 2.6, kh = kw / A.aspect("kestrels");
    P3.box("paint", kw + 0.1, kh + 0.1, 0.05, 0, Y0 + BH2 + 0.3 + kh / 2, -0.1, { col: NAVY2, b: 0.01 });
    P3.quad("signF", kw, kh, A.rect("kestrels"), { p: [0, Y0 + BH2 + 0.3 + kh / 2, -0.072] });
    for (const e of [-1, 1]) P3.bar("galv", [e * 1.1, Y0 + BH2 + 0.1, -0.2], [e * 1.1, Y0 + BH2 + 0.3 + kh, -0.14], 0.015, { col: STEELC });
  }
  P3.lathe("paint", [[0.03, 0], [0.05, 0.02], [0.16, 0.3], [0.17, 0.32], [0.15, 0.32]], { seg: 12, col: [0.7, 0.7, 0.68], axis: "z", p: [BW3 / 2 - 0.5, Y0 + BH2 + 0.4, -0.1] });
  P3.bar("galv", [BW3 / 2 - 0.5, Y0 + BH2 + 0.14, -0.1], [BW3 / 2 - 0.5, Y0 + BH2 + 0.4, -0.1], 0.015, { col: STEELC });
  P3.box("galv", BW3 + 0.6, 0.03, 0.6, 0, Y0 - 0.14, -0.66, { col: STEELC, b: 4e-3 });
  for (const x of lin2(-BW3 / 2 - 0.3, BW3 / 2 + 0.3, 6)) {
    P3.bar("galv", [x, Y0 - 0.12, -0.94], [x, Y0 + 0.95, -0.94], 0.014, { col: [0.75, 0.6, 0.05] });
    P3.bar("galv", [x, Y0 - 0.14, -0.36], [x, Y0 - 0.14, -0.94], 0.02, { col: STEELC });
  }
  for (const y of [0.45, 0.95]) P3.bar("galv", [-BW3 / 2 - 0.3, Y0 + y, -0.94], [BW3 / 2 + 0.3, Y0 + y, -0.94], 0.014, { col: [0.75, 0.6, 0.05] });
  {
    const lx3 = -2.1, lz3 = -0.62;
    for (const s of [-1, 1]) P3.bar("galv", [lx3 + s * 0.2, 0.3, lz3], [lx3 + s * 0.2, Y0 + 0.9, lz3], 0.016, { col: STEELC });
    for (let k = 0; k < 14; k++) P3.bar("galv", [lx3 - 0.2, 0.55 + k * 0.28, lz3], [lx3 + 0.2, 0.55 + k * 0.28, lz3], 0.01, { col: STEELC });
    for (let k = 0; k < 4; k++) P3.add("galv", ring(0.36, 0.01, { seg: 12, radial: 4, a0: PI5, a1: PI5 * 2 }), STEELC, { p: [lx3, 2.3 + k * 0.5, lz3], r: [H, 0, 0] });
    for (const a of [-0.9, 0, 0.9]) P3.bar("galv", [lx3 + Math.sin(a) * 0.36, 2.3, lz3 - Math.cos(a) * 0.36], [lx3 + Math.sin(a) * 0.36, 3.8, lz3 - Math.cos(a) * 0.36], 6e-3, { col: STEELC });
  }
  P3.tube("rubber", [[2.3, Y0 + 0.2, -0.36], [2.38, 2, -0.5], [2.38, 0.9, -0.5]], 0.012, { seg: 5, col: DK2 });
  P3.box("plastic", 0.36, 0.9, 0.24, 2.5, 0, -0.62, { base: true, col: [0.25, 0.3, 0.26], b: 0.02 });
  if (A) P3.quad("decalF", 0.22, 0.22 / A.aspect("stDanger"), A.rect("stDanger"), { p: [2.5, 0.6, -0.496] });
  for (const s of [-1, 1]) P3.col([s * 2.1 - 0.35, 0, -0.55], [s * 2.1 + 0.35, Y0, 0.15], { surface: "metal" });
  P3.col([-BW3 / 2 - 0.12, Y0 - 0.2, -0.36], [BW3 / 2 + 0.12, Y0 + BH2 + 0.2, 0.12], { surface: "metal", bulletOnly: true });
  return P3.finish({ grime: 0.7, ground: 0.4 });
});
var dugout = (seed = 1, o = {}) => proto("fdug" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("dugout", seed), A = o.atlas, R4 = rng(seed * 67 + 5), n = o.n || 8, L = n * 0.52 + 0.3, hw = L / 2, D = 1.35, Hh = 2.05, col = o.col || NAVY2, smash = o.smash ?? 0.25;
  const prof = (t) => {
    const a = clamp2((t - 0.45) / 0.55) * H;
    return t < 0.45 ? [-D / 2, t / 0.45 * (Hh - 0.75)] : [-D / 2 + (D - 0.1) * (1 - Math.cos(a)) * 0.82, Hh - 0.75 + 0.75 * Math.sin(a)];
  };
  const ribs = Math.round(L / 1.1) + 1;
  for (let i = 0; i < ribs; i++) {
    const x = -hw + i * L / (ribs - 1), pts = lin2(0, 1, 12).map((t) => {
      const [z, y] = prof(t);
      return [x, y, z];
    });
    P3.tube("paint", pts, 0.022, { seg: 6, samples: 0, col });
    P3.box("galv", 0.14, 0.012, 0.14, x, 6e-3, -D / 2, { col: ALU4, b: 2e-3 });
    P3.bar("paint", [x, Hh, D / 2 - 0.35], [x, 0, D / 2 - 0.1], 0.016, { col });
  }
  for (const t of [0.02, 0.44, 0.72, 1]) {
    const [z, y] = prof(t);
    P3.bar("paint", [-hw, y, z], [hw, y, z], 0.016, { col });
  }
  for (let i = 0; i < ribs - 1; i++) {
    const x0 = -hw + i * L / (ribs - 1) + 0.03, x1 = -hw + (i + 1) * L / (ribs - 1) - 0.03, gone = R4() < smash;
    if (gone && i !== 0) continue;
    const g2 = gridSurf([x0, x1], lin2(0.2, 1, 10), (x, t, q) => {
      const [z, y] = prof(t);
      q.set(x, y, z - 0.012);
      return [0.6, 0.66, 0.68];
    });
    g2.computeVertexNormals();
    P3.add("glassT", g2, null);
  }
  P3.box("paint", L, 0.4, 0.03, 0, 0.02, -D / 2, { base: true, col, b: 6e-3 });
  for (const s of [-1, 1]) {
    const g2 = extrude(lin2(0, 1, 10).map((t) => {
      const [z, y] = prof(t);
      return [z, y];
    }).concat([[D / 2 - 0.35, 0.02], [-D / 2, 0.02]]), -0.01, 0.01, 2e-3);
    P3.add(s > 0 && smash > 0.3 ? "meshNet" : "glassT", g2, [0.6, 0.66, 0.68], { r: [0, -H, 0], p: [s * hw, 0, 0] });
  }
  P3.box("galv", L - 0.2, 0.06, 0.06, 0, 0.4, -0.2, { col: STEELC, b: 6e-3 });
  for (const x of lin2(-hw + 0.3, hw - 0.3, 3)) P3.bar("galv", [x, 0, -0.2], [x, 0.4, -0.2], 0.02, { col: STEELC });
  for (let i = 0; i < n; i++) {
    if (R4() < 0.18) continue;
    const x = -hw + 0.41 + i * 0.52, sc2 = i % 2 ? col : GOLD2;
    P3.add("plastic", softBox(0.44, 0.045, 0.4, 0.02, 3), sc2, { p: [x, 0.46, -0.16] });
    P3.add("plastic", softBox(0.44, 0.34, 0.04, 0.02, 3), sc2, { p: [x, 0.66, -0.38], r: [-0.18, 0, 0] });
  }
  for (let k = 0; k < 5; k++) P3.box("wood", L - 0.3, 0.03, 0.09, 0, 0.03, 0.05 + k * 0.11, { col: WOODC2, b: 4e-3, jit: 0.1 });
  for (let k = 0; k < 6; k++) P3.cyl("plastic", 0.035, 0.22, -hw + 0.5 + k % 3 * 0.09, 0.14, 0.6 + Math.floor(k / 3) * 0.09, { seg: 8, col: k % 2 ? [0.9, 0.5, 0.05] : [0.2, 0.4, 0.8] });
  P3.box("plastic", 0.32, 0.03, 0.22, -hw + 0.59, 0.04, 0.645, { col: DK2, b: 6e-3 });
  for (let k = 0; k < 3; k++) P3.add("canvas", softBox(0.34, 0.5, 0.03, 0.012, 3), [[0.9, 0.5, 0.05], [0.75, 0.85, 0.1], [0.9, 0.5, 0.05]][k], { p: [hw - 1.2 + k * 0.3, 0.55, 0.2 - k * 0.02], r: [0.25, 0.1 * k, 0.05] });
  P3.add("canvas", softBox(0.7, 0.3, 0.34, 0.1, 4), [0.08, 0.1, 0.2], { p: [0.4, 0.17, 0.5], r: [0, 0.4, 0] });
  if (A) {
    const nm = o.name || "home", w = 1.2, h = w / A.aspect(nm), [z, y] = prof(0.86);
    P3.quad("signF", w, h, A.rect(nm), { p: [0, y + 0.12, z + 0.3], r: [-0.5, 0, 0] });
  }
  if (o.lamp) {
    P3.box("plastic", 0.3, 0.07, 0.12, hw * 0.3, Hh - 0.12, 0.1, { col: [0.85, 0.7, 0.05], b: 0.015 });
    P3.box("lampCyan", 0.24, 0.012, 0.08, hw * 0.3, Hh - 0.162, 0.1, { b: 2e-3 });
    P3.glow("fill", [hw * 0.3, Hh - 0.4, 0.3], { col: [0.6, 0.92, 1], power: 7, dist: 9, dir: [0, -0.8, 0.6], cone: 0.9 });
    P3.tube("rubber", [[hw * 0.3 - 0.15, Hh - 0.1, 0.1], [0, Hh - 0.3, -0.3], [-0.3, 0.6, -0.6], [-0.6, 0.03, -0.9]], 7e-3, { seg: 4, col: [0.85, 0.45, 0.05] });
  }
  P3.col([-hw, 0, -D / 2 - 0.04], [hw, Hh - 0.7, -D / 2 + 0.06], { surface: "plastic" });
  for (const s of [-1, 1]) P3.col([s * hw - 0.04, 0, -D / 2], [s * hw + 0.04, Hh - 0.3, D / 2 - 0.4], { surface: "plastic" });
  P3.col([-hw, 0, -0.45], [hw, 0.75, 0.05], { surface: "plastic", noNav: true });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var adBoard = (seed = 1, o = {}) => proto("fad" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("adBoard", seed), A = o.atlas, R4 = rng(seed * 11 + 1), w = o.w || 3, nm = o.name || "sp" + seed % 6, h = A ? w / A.aspect(nm) : 0.75, st = o.state || "up", tilt = 0.2;
  if (st === "flat") P3.push({ p: [0, 0.03, 0.2], r: [-H + 0.04, 0, 0.03] });
  else if (st === "lean") P3.push({ r: [-0.55, 0, 0] });
  P3.push({ r: [-tilt, 0, 0] });
  P3.box("plastic", w, h + 0.06, 0.02, 0, 0.06, 0, { base: true, col: [0.86, 0.86, 0.84], b: 4e-3 });
  for (const e of [-1, 1]) P3.box("galv", 0.03, h + 0.1, 0.03, e * (w / 2 - 0.015), 0.03, -0.02, { base: true, col: ALU4, b: 4e-3 });
  P3.box("galv", w, 0.03, 0.03, 0, h + 0.13, -0.02, { col: ALU4, b: 4e-3 });
  P3.box("galv", w, 0.03, 0.03, 0, 0.045, -0.02, { col: ALU4, b: 4e-3 });
  if (A) {
    P3.quad("signF", w - 0.04, h, A.rect(nm), { p: [0, 0.09 + h / 2, 0.012] });
    if (o.graf) P3.quad("decalF", Math.min(w * 0.7, h * A.aspect(o.graf) * 1.1), Math.min(w * 0.7, h * A.aspect(o.graf) * 1.1) / A.aspect(o.graf), A.rect(o.graf), { p: [(R4() - 0.5) * 0.4, 0.09 + h / 2, 0.02] });
  }
  P3.pop();
  if (st !== "flat") for (const e of [-1, 1]) {
    const x = e * (w / 2 - 0.3);
    P3.bar("galv", [x, (h + 0.1) * Math.cos(tilt), -(h + 0.1) * Math.sin(tilt) - 0.02], [x, 0.02, -0.62], 0.013, { col: ALU4 });
    P3.bar("galv", [x, 0.03, -0.02], [x, 0.03, -0.62], 0.013, { col: ALU4 });
    const sb = softBox(0.5, 0.15, 0.28, 0.07, 4);
    P3.add("burlap", sb, [0.45, 0.41, 0.3], { p: [x, 0.1, -0.4], r: [0, 0.2 * e, 0] });
  }
  if (st !== "up") P3.pop();
  if (st === "flat") P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  else P3.col([-w / 2, 0, -0.5], [w / 2, st === "lean" ? 0.6 : h + 0.05, 0.06], { surface: "plastic", noNav: st === "lean" });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var cornerFlag = (seed = 1, o = {}) => proto("fflag" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("cornerFlag", seed), lean = o.lean ?? 0.08, c1 = o.col || GOLD2, c2 = NAVY2;
  P3.lathe("rubber", [[1e-3, 0], [0.09, 0], [0.08, 0.03], [0.03, 0.07], [0.02, 0.1]], { seg: 10, col: DK2 });
  P3.cyl("steel", 0.016, 0.07, 0, 0.12, 0, { seg: 8, col: [0.5, 0.5, 0.5] });
  const top = (len) => {
    P3.bar("plastic", [0, 0, 0], [0, len, 0], 0.013, { col: [0.9, 0.85, 0.2] });
    const g2 = gridSurf(lin2(0, 0.45, 6), lin2(0, 1, 4), (x, t, q) => {
      const y = len - 0.02 - t * 0.34 * (1 - x / 0.45 * 0.25);
      q.set(x + 0.013, y - 0.1 * (x / 0.45) * (x / 0.45), 0.05 * Math.sin(x * 14 + t * 3) * (x / 0.45));
      return x > 0.22 !== t > 0.5 ? c1 : c2;
    });
    g2.computeVertexNormals();
    P3.add("canvas", g2, null);
  };
  if (o.snap) {
    P3.bar("plastic", [0, 0.15, 0], [0.03, 0.5, 0.01], 0.013, { col: [0.9, 0.85, 0.2] });
    P3.push({ p: [0.3, 0.02, 0.2], r: [0, 0.6, -H + 0.02] });
    top(1);
    P3.pop();
  } else {
    P3.push({ p: [0, 0.14, 0], r: [lean, 0, lean * 0.6] });
    top(1.4);
    P3.pop();
  }
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.4, ground: 0.2 });
});
var lineMarker = (seed = 1, o = {}) => proto("fmark" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("lineMarker", seed), RED = [0.6, 0.1, 0.08];
  for (const [x, z, r] of [[0.3, 0.2, 0.13], [0.3, -0.2, 0.13], [-0.25, 0.16, 0.09], [-0.25, -0.16, 0.09]]) {
    P3.cyl("rubber", r, 0.05, x, r, z, { axis: "z", seg: 14, col: DK2 });
    P3.cyl("plastic", r * 0.55, 0.055, x, r, z, { axis: "z", seg: 10, col: WHT });
  }
  P3.bar("steel", [0.3, 0.13, -0.2], [0.3, 0.13, 0.2], 0.012, { col: STEELC });
  P3.bar("steel", [-0.25, 0.09, -0.16], [-0.25, 0.09, 0.16], 0.01, { col: STEELC });
  P3.add("paint", extrude([[-0.3, 0.16], [0.36, 0.16], [0.36, 0.24], [-0.3, 0.24]], -0.17, 0.17, 0.01), RED);
  P3.add("plastic", softBox(0.42, 0.34, 0.3, 0.06, 4), WHT, { p: [0.02, 0.42, 0] });
  P3.cyl("plastic", 0.06, 0.04, 0.02, 0.61, 0, { seg: 10, col: RED });
  P3.cyl("plastic", 0.035, 0.26, 0.32, 0.14, 0, { axis: "z", seg: 10, col: [0.9, 0.9, 0.9] });
  P3.box("plastic", 0.12, 0.2, 0.3, 0.3, 0.24, 0, { col: [0.2, 0.2, 0.2], b: 0.01 });
  for (const s of [-1, 1]) P3.tube("paint", [[-0.2, 0.24, s * 0.15], [-0.55, 0.75, s * 0.18], [-0.75, 0.95, s * 0.18]], 0.012, { seg: 6, samples: 0, col: RED });
  P3.bar("rubber", [-0.75, 0.95, -0.22], [-0.75, 0.95, 0.22], 0.016, { col: DK2 });
  P3.bar("steel", [-0.6, 0.82, 0.18], [-0.1, 0.3, 0.12], 4e-3, { col: [0.5, 0.5, 0.5] });
  P3.box("plastic", 0.5, 4e-3, 0.11, 0.7, 4e-3, 0, { col: [0.92, 0.92, 0.9], b: 0 });
  P3.cyl("plastic", 0.2, 4e-3, 0.42, 4e-3, 0.05, { seg: 12, col: [0.92, 0.92, 0.9] });
  P3.col([-0.4, 0, -0.25], [0.4, 0.65, 0.25], { surface: "plastic", noNav: true });
  return P3.finish({ grime: 0.6, ground: 0.3 });
});
var roller = (seed = 1, o = {}) => proto("froll" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("roller", seed), GRN = [0.1, 0.26, 0.14];
  P3.cyl("paintOld", 0.3, 0.9, 0, 0.3, 0, { axis: "z", seg: 22, col: GRN, cham: 0.02 });
  for (const s of [-1, 1]) {
    P3.cyl("steel", 0.08, 0.03, 0, 0.3, s * 0.47, { axis: "z", seg: 10, col: STEELC });
    P3.cyl("plastic", 0.035, 0.03, 0.15, 0.4, s * 0.455, { axis: "z", seg: 8, col: [0.7, 0.1, 0.08] });
    P3.bar("steel", [0, 0.3, s * 0.49], [-0.5, 0.42, s * 0.49], 0.016, { col: STEELC });
    P3.bar("steel", [-0.5, 0.42, s * 0.49], [-0.9, 0.5, s * 0.1], 0.016, { col: STEELC });
  }
  P3.bar("steel", [-0.9, 0.5, -0.1], [-0.9, 0.5, 0.1], 0.016, { col: STEELC });
  P3.bar("steel", [-0.9, 0.5, 0], [-1.7, 0.95, 0], 0.016, { col: STEELC });
  P3.bar("rubber", [-1.7, 0.95, -0.25], [-1.7, 0.95, 0.25], 0.018, { col: DK2 });
  P3.box("steel", 0.03, 0.1, 0.92, 0.32, 0.42, 0, { col: STEELC, b: 4e-3, r: [0, 0, 0.5] });
  P3.col([-0.35, 0, -0.5], [0.35, 0.6, 0.5], { surface: "metal" });
  return P3.finish({ grime: 0.8, ground: 0.4 });
});
var barrow = (seed = 1, o = {}) => proto("fbarrow" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("barrow", seed), R4 = rng(seed * 5 + 2), GRN = [0.1, 0.26, 0.14];
  if (o.tipped) P3.push({ p: [0, 0.32, 0], r: [H - 0.2, 0, 0] });
  {
    const U = lin2(0, 1, 6), V = lin2(0, 1, 16), tray = gridSurf(U, V, (t, a, q) => {
      const an = a * PI5 * 2, sq = (c) => Math.sign(c) * Math.pow(Math.abs(c), 0.5), r = 0.16 + 0.84 * Math.pow(t, 0.6), x = sq(Math.cos(an)) * 0.42 * r + 0.08 * t, z = sq(Math.sin(an)) * 0.3 * r;
      q.set(x, 0.3 + 0.3 * t + 0.08 * t * clamp2(x), z);
      return GRN;
    });
    tray.computeVertexNormals();
    P3.add("paintOld", tray, null);
    P3.add("paintOld", cyl(0.16 * 0.42 * 2.2, 0.01, 10), GRN, { p: [0, 0.3, 0] });
  }
  if (!o.tipped) {
    const sand = softBox(0.7, 0.14, 0.46, 0.07, 5);
    deform(sand, (q) => {
      q.y += 0.07 * Math.exp(-(q.x * q.x + q.z * q.z) * 6) + 0.012 * Math.sin(q.x * 30) * Math.sin(q.z * 26);
    }, true);
    P3.add("burlap", sand, [0.62, 0.56, 0.42], { p: [0.06, 0.56, 0] });
    P3.bar("wood", [0.2, 0.55, 0.05], [-0.55, 1.2, 0.3], 0.016, { col: WOODC2 });
    for (let k = 0; k < 4; k++) P3.bar("steel", [0.2 + k * 0, 0.55, 0.02 + k * 0.04], [0.42, 0.36, 0 + k * 0.045], 5e-3, { col: STEELC });
  }
  for (const s of [-1, 1]) {
    P3.tube("paint", [[0.62, 0.2, s * 0.06], [0.2, 0.3, s * 0.2], [-0.4, 0.42, s * 0.26], [-0.95, 0.56, s * 0.3]], 0.014, { seg: 6, samples: 0, col: GRN });
    P3.cyl("rubber", 0.018, 0.14, -0.9, 0.55, s * 0.3, { axis: "x", seg: 8, col: DK2, r: [0, 0, -0.25] });
    P3.tube("paint", [[-0.25, 0.38, s * 0.22], [-0.3, 0.02, s * 0.24], [-0.15, 0.02, s * 0.24]], 0.012, { seg: 6, samples: 0, col: GRN });
  }
  P3.cyl("rubber", 0.2, 0.09, 0.62, 0.2, 0, { axis: "z", seg: 16, col: DK2, cham: 0.03 });
  P3.cyl("paint", 0.1, 0.095, 0.62, 0.2, 0, { axis: "z", seg: 12, col: [0.75, 0.6, 0.05] });
  if (o.tipped) P3.pop();
  P3.col([-0.5, 0, -0.35], [0.6, 0.6, 0.35], { surface: "metal", noNav: true });
  return P3.finish({ grime: 0.8, ground: 0.4 });
});
var trainingKit = (seed = 1, o = {}) => proto("ftrain" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("trainingKit", seed), R4 = rng(seed * 83 + 4), balls = o.balls ?? 7, cones = o.cones ?? 9, poles = o.poles ?? 4, hurdles = o.hurdles ?? 2;
  const BC = [WHT, [0.9, 0.75, 0.1], [0.9, 0.4, 0.08], WHT];
  for (let k = 0; k < balls; k++) {
    const inBag = k < 4, a = R4() * 6.28, rr = inBag ? R4() * 0.16 : 0.5 + R4() * 1;
    ball(P3, -0.9 + Math.cos(a) * rr, 0.11 + (inBag ? k % 2 * 0.17 : 0), -0.3 + Math.sin(a) * rr, 0.11, BC[k % 4]);
  }
  if (balls > 3) {
    const g2 = softBox(0.6, 0.42, 0.58, 0.2, 5);
    P3.add("meshNet", g2, null, { p: [-0.9, 0.2, -0.3] });
    P3.tube("burlap", [[-0.9, 0.42, -0.3], [-0.8, 0.46, -0.1], [-0.5, 0.03, 0.2], [-0.2, 0.02, 0.3]], 8e-3, { seg: 4, col: [0.8, 0.75, 0.5] });
  }
  const CC = [[0.9, 0.4, 0.05], [0.8, 0.85, 0.1], [0.15, 0.4, 0.8], WHT];
  for (let k = 0; k < cones; k++) {
    const stack = k < 4, x = stack ? 0.5 : 0.2 + R4() * 1.2, z = stack ? 0.5 : -0.9 + R4() * 1.6, y = stack ? k * 0.022 : 0;
    P3.lathe("plastic", [[0.1, 0], [0.095, 0.012], [0.04, 0.06], [0.036, 0.06]], { seg: 12, col: CC[stack ? 0 : k % 4], p: [x, y, z], r: stack ? [0, 0, 0] : [R4() < 0.3 ? PI5 : 0, 0, 0] });
  }
  for (let k = 0; k < poles; k++) {
    const up = k < poles - 1, x = -0.4 + k * 0.5, z = 0.75;
    if (up) {
      P3.lathe("rubber", [[1e-3, 0], [0.11, 0], [0.1, 0.03], [0.03, 0.06]], { seg: 10, col: DK2, p: [x, 0, z] });
      P3.bar("plastic", [x, 0.05, z], [x + (R4() - 0.5) * 0.12, 1.6, z + (R4() - 0.5) * 0.12], 0.012, { col: k % 2 ? [0.9, 0.4, 0.05] : [0.8, 0.85, 0.1] });
    } else P3.bar("plastic", [x - 0.6, 0.015, z + 0.3], [x + 0.9, 0.015, z + 0.1], 0.012, { col: [0.9, 0.4, 0.05] });
  }
  for (let k = 0; k < hurdles; k++) {
    const x = 1.3, z = -0.6 + k * 0.7, tip = k === 1;
    P3.push({ p: [x, tip ? 0.02 : 0, z], r: [tip ? H : 0, 0.2 * k, 0] });
    P3.tube("plastic", [[-0.2, 0, -0.25], [-0.2, 0, 0], [-0.2, 0.3, 0], [0.2, 0.3, 0], [0.2, 0, 0], [0.2, 0, -0.25]], 0.012, { seg: 6, samples: 0, col: [0.8, 0.85, 0.1] });
    P3.pop();
  }
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.4, ground: 0.25 });
});
var kickWall = (seed = 1, o = {}) => proto("fkick" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("kickWall", seed), R4 = rng(seed * 97 + 2), n = o.n || 4, down = o.down || [], col = o.col || [0.82, 0.3, 0.06];
  const half = [[0, 1.8], [0.07, 1.79], [0.1, 1.72], [0.105, 1.63], [0.08, 1.54], [0.06, 1.5], [0.2, 1.45], [0.25, 1.36], [0.26, 1], [0.22, 0.86], [0.17, 0.84], [0.17, 0.5], [0.15, 0.1], [0.12, 0.05], [0, 0.05]], outline2 = half.concat(half.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
  for (let k = 0; k < n; k++) {
    const x = (k - (n - 1) / 2) * 0.62, fl = down.includes(k);
    P3.push(fl ? { p: [x + 0.2, 0.03, 0.5 + R4() * 0.4], r: [-H + 0.02, R4() * 0.8 - 0.4, 0] } : { p: [x, 0.12, 0], r: [(R4() - 0.5) * 0.16, (R4() - 0.5) * 0.2, (R4() - 0.5) * 0.1] });
    P3.add("plastic", extrude(outline2, -0.022, 0.022, 0.012, null, { smooth: 60 }), k % 2 ? col : [0.8, 0.82, 0.1], { jit: 0.08 });
    P3.cyl("steel", 0.012, 0.2, 0, -0.03, 0, { seg: 6, col: [0.5, 0.5, 0.5] });
    P3.cyl("steel", 0.03, 0.06, 0, 0.04, 0, { seg: 8, col: [0.3, 0.3, 0.3] });
    for (const y of [0.6, 1.2]) P3.box("black", 0.24, 0.012, 0.05, 0, y, 0, { b: 0 });
    P3.pop();
    if (!fl) P3.col([x - 0.24, 0, -0.05], [x + 0.24, 1.9, 0.05], { surface: "plastic", noNav: true });
  }
  if (!P3.cols.length) P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.5, ground: 0.3 });
});
var bench2 = (seed = 1, o = {}) => proto("fbench" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("bench", seed), L = o.len || 2.4, GRN = [0.08, 0.2, 0.12];
  if (o.tipped) P3.push({ p: [0, 0.3, -0.2], r: [-H + 0.1, 0, 0] });
  for (const x of [-L / 2 + 0.25, 0, L / 2 - 0.25]) {
    P3.add("paint", extrude([[-0.25, 0], [-0.2, 0], [-0.17, 0.4], [0.2, 0.42], [0.22, 0], [0.27, 0], [0.24, 0.46], [-0.16, 0.46], [-0.25, 0.86], [-0.3, 0.85], [-0.21, 0.43]], -0.025, 0.025, 6e-3), GRN, { r: [0, -H, 0], p: [x, 0, 0] });
  }
  for (let k = 0; k < 4; k++) P3.box("wood", L, 0.035, 0.085, 0, 0.48, 0.2 - k * 0.11, { col: WOODC2, b: 8e-3, jit: 0.12 });
  for (let k = 0; k < 3; k++) P3.box("wood", L, 0.085, 0.03, 0, 0.6 + k * 0.11, -0.22 - k * 0.022, { col: WOODC2, b: 8e-3, jit: 0.12, r: [-0.2, 0, 0] });
  if (o.tipped) P3.pop();
  P3.col([-L / 2, 0, -0.3], [L / 2, o.tipped ? 0.5 : 0.85, 0.3], { surface: "wood", noNav: !!o.tipped });
  return P3.finish({ grime: 0.7, ground: 0.4 });
});

