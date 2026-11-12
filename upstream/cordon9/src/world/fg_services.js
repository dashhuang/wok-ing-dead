var DK4 = [0.1, 0.1, 0.105];
var ALU6 = [0.8, 0.82, 0.84];
var STEELC3 = [0.3, 0.31, 0.33];
var OLV3 = [0.2, 0.22, 0.15];
var WOODC4 = [0.42, 0.33, 0.22];
var WHT2 = [0.86, 0.86, 0.83];
var COOL2 = [0.8, 0.93, 1];
var WARM2 = [1, 0.62, 0.3];
var TEAL = [0.08, 0.3, 0.34];
var BLU = [0.1, 0.22, 0.45];
var lin4 = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
var trestle = (P3, x, z, w = 1.8, d = 0.75, ry = 0) => {
  P3.push({ p: [x, 0, z], r: [0, ry, 0] });
  P3.box("plastic", w, 0.035, d, 0, 0.722, 0, { col: [0.78, 0.77, 0.72], b: 8e-3 });
  P3.box("steel", w - 0.1, 0.03, d - 0.1, 0, 0.69, 0, { col: STEELC3, b: 4e-3 });
  for (const s of [-1, 1]) P3.tube("steel", [[s * (w / 2 - 0.2), 0.69, -d / 2 + 0.1], [s * (w / 2 - 0.16), 0.02, -d / 2 + 0.06], [s * (w / 2 - 0.16), 0.02, d / 2 - 0.06], [s * (w / 2 - 0.2), 0.69, d / 2 - 0.1]], 0.012, { seg: 5, samples: 0, col: STEELC3 });
  P3.pop();
};
var gasBottle = (P3, x, z, col = [0.6, 0.12, 0.08], h = 0.6) => {
  P3.lathe("paint", [[1e-3, 0], [0.14, 0], [0.15, 0.02], [0.15, h * 0.78], [0.12, h * 0.92], [0.05, h], [0.05, h + 0.03]], { seg: 14, col, p: [x, 0, z] });
  P3.add("paint", ring(0.1, 0.012, { seg: 12, radial: 5 }), col, { p: [x, h + 0.06, z], r: [H, 0, 0] });
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1;
    P3.bar("paint", [x + Math.cos(a) * 0.09, h * 0.95, z + Math.sin(a) * 0.09], [x + Math.cos(a) * 0.1, h + 0.06, z + Math.sin(a) * 0.1], 8e-3, { col });
  }
  P3.cyl("chrome", 0.022, 0.05, x, h + 0.03, z, { seg: 8 });
};
var fieldKitchen = (seed = 1, o = {}) => proto("fkitchen" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("fieldKitchen", seed), A = o.atlas, R4 = rng(seed * 43 + 11), W = 6, D = 3, He = 2.15, Hr = 2.95, lamp2 = o.lamp ?? 1;
  for (const x of [-W / 2, 0, W / 2]) {
    for (const s of [-1, 1]) {
      P3.box("galv", 0.045, He, 0.045, x, 0, s * D / 2, { base: true, col: ALU6, b: 4e-3 });
      P3.box("galv", 0.14, 8e-3, 0.14, x, 4e-3, s * D / 2, { col: ALU6, b: 0 });
      P3.bar("galv", [x, He, s * D / 2], [x, Hr, 0], 0.016, { col: ALU6 });
    }
    P3.bar("galv", [x, He, -D / 2], [x, He, D / 2], 0.014, { col: ALU6 });
    P3.bar("galv", [x, He + 0.02, 0], [x, Hr, 0], 0.01, { col: ALU6 });
  }
  for (const s of [-1, 1]) P3.bar("galv", [-W / 2, He, s * D / 2], [W / 2, He, s * D / 2], 0.016, { col: ALU6 });
  P3.bar("galv", [-W / 2, Hr, 0], [W / 2, Hr, 0], 0.016, { col: ALU6 });
  for (const s of [-1, 1]) {
    const g2 = quadXY(W + 0.3, 1, [0, 0, 6, 1.6], 18, 5);
    deform(g2, (q) => {
      const t = q.y + 0.5, x = q.x;
      q.z = s * (D / 2 + 0.12) * (1 - t);
      q.y = He + (Hr - He) * t + 0.02 - 0.07 * Math.sin(t * PI5) * (0.5 + 0.5 * Math.cos(x / (W / 2) * PI5 * 2)) - (t < 0.04 ? 0.02 : 0);
      q.x = x;
    });
    if (s > 0) flip(g2);
    g2.computeVertexNormals();
    P3.add("pvc", g2, [0.82, 0.83, 0.8], { jit: 0.04 });
    const v = quadXY(W + 0.3, 0.24, [0, 0, 6, 0.3], 24, 1);
    deform(v, (q) => {
      q.z = s * (D / 2 + 0.12) + 0.015 * Math.sin(q.x * 9);
      if (q.y < 0) q.y -= 0.04 * Math.abs(Math.sin(q.x * 5.2));
      q.y += He - 0.1;
    });
    v.computeVertexNormals();
    P3.add("pvc", v, [0.82, 0.83, 0.8], { jit: 0.04 });
  }
  {
    const g2 = quadXY(W, He - 0.1, [0, 0, 6, 2], 14, 4);
    deform(g2, (q) => {
      q.z = -D / 2 - 0.02 - 0.05 * Math.sin((q.x / W + 0.5) * PI5 * 2) * (0.5 - q.y / He);
      q.y += He / 2 + 0.03;
    });
    g2.computeVertexNormals();
    P3.add("pvc", g2, [0.8, 0.81, 0.78], { jit: 0.04 });
    const e = quadXY(D, He - 0.1, [0, 0, 3, 2], 8, 4);
    deform(e, (q) => {
      const z = q.x;
      q.x = -W / 2 - 0.02 - 0.04 * Math.sin((z / D + 0.5) * PI5);
      q.z = z;
      q.y += He / 2 + 0.03;
    });
    e.computeVertexNormals();
    P3.add("pvc", e, [0.8, 0.81, 0.78], { jit: 0.04 });
  }
  if (A) P3.quad("signF", 1.8, 1.8 / A.aspect("food"), A.rect("food"), { p: [0.6, He - 0.02, D / 2 + 0.16] });
  trestle(P3, -1.9, 0.95);
  trestle(P3, 0, 0.95);
  trestle(P3, 1.9, 0.95, 1.8, 0.75, 0.05);
  trestle(P3, 1.5, -1, 1.8, 0.75);
  for (const [x, lid] of [[-2.1, 1], [-1.1, 0]]) {
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + 0.3;
      P3.bar("steel", [x + Math.cos(a) * 0.24, 0, -0.9 + Math.sin(a) * 0.24], [x + Math.cos(a) * 0.2, 0.42, -0.9 + Math.sin(a) * 0.2], 0.014, { col: DK4 });
    }
    P3.add("steel", ring(0.21, 0.014, { seg: 16, radial: 5 }), DK4, { p: [x, 0.42, -0.9], r: [H, 0, 0] });
    P3.add("steel", ring(0.12, 0.012, { seg: 12, radial: 5 }), [0.35, 0.25, 0.2], { p: [x, 0.36, -0.9], r: [H, 0, 0] });
    P3.lathe("galv", [[1e-3, 0.44], [0.24, 0.44], [0.25, 0.46], [0.25, 0.9], [0.262, 0.91], [0.25, 0.92], [0.235, 0.92], [0.235, 0.47], [1e-3, 0.47]], { seg: 20, col: [0.75, 0.76, 0.77], p: [x, 0, -0.9] });
    for (const s of [-1, 1]) P3.tube("galv", [[x + s * 0.25, 0.86, -0.96], [x + s * 0.31, 0.86, -0.96], [x + s * 0.31, 0.86, -0.84], [x + s * 0.25, 0.86, -0.84]], 8e-3, { seg: 4, samples: 0, col: ALU6 });
    if (lid) {
      P3.lathe("galv", [[1e-3, 0.95], [0.1, 0.945], [0.255, 0.925], [0.255, 0.915]], { seg: 20, col: [0.75, 0.76, 0.77], p: [x, 0, -0.9] });
      P3.cyl("plastic", 0.025, 0.03, x, 0.965, -0.9, { seg: 8, col: DK4 });
    } else {
      P3.cyl("black", 0.232, 0.01, x, 0.8, -0.9, { seg: 20, col: [0.2, 0.15, 0.1] });
      P3.bar("galv", [x + 0.05, 0.8, -0.9], [x + 0.26, 1.12, -0.82], 8e-3, { col: ALU6 });
      P3.lathe("galv", [[0.25, 0], [0.26, 0.012], [1e-3, 0.03]], { seg: 16, col: [0.75, 0.76, 0.77], p: [x + 0.5, 0, -0.5], r: [0.06, 0, 0] });
    }
    P3.tube("rubber", [[x, 0.36, -0.78], [x + 0.1, 0.1, -0.6], [x + 0.5, 0.03, -0.9 - 0.4], [-2.9 + (x + 2.1) * 0.3, 0.3, -1.25]], 0.01, { seg: 5, samples: 10, col: [0.85, 0.42, 0.05] });
  }
  gasBottle(P3, -2.9, -1.25, [0.6, 0.12, 0.08], 0.62);
  gasBottle(P3, -2.55, -1.3, [0.6, 0.12, 0.08], 0.62);
  gasBottle(P3, -2.75, -0.92, [0.12, 0.22, 0.42], 0.5);
  P3.lathe("chrome", [[1e-3, 0.74], [0.16, 0.74], [0.16, 1.2], [0.14, 1.24], [1e-3, 1.25]], { seg: 16, p: [1.5, 0, 0.95] });
  P3.cyl("plastic", 0.03, 0.03, 1.5, 1.265, 0.95, { seg: 8, col: DK4 });
  P3.cyl("plastic", 0.015, 0.06, 1.5, 0.82, 1.13, { axis: "z", seg: 6, col: DK4 });
  P3.box("ledRed", 0.02, 0.012, 6e-3, 1.56, 0.8, 1.108, { b: 0 });
  for (let k = 0; k < 9; k++) P3.box("plastic", 0.44, 0.022, 0.34, -2.3, 0.75 + k * 0.024, 0.95, { col: k % 3 ? [0.55, 0.3, 0.14] : [0.3, 0.3, 0.32], b: 6e-3, r: [0, (R4() - 0.5) * 0.15, 0] });
  for (let k = 0; k < 7; k++) P3.lathe("plastic", [[0.05, 0], [0.09, 0.05], [0.085, 0.05], [0.045, 6e-3]], { seg: 10, col: WHT2, p: [-1.6, 0.74 + k * 0.016, 0.85] });
  for (let j = 0; j < 2; j++) {
    const y = 0.74 + j * 0.2;
    P3.box("plastic", 0.6, 0.02, 0.4, 0.1, y + 0.01, 0.95, { col: [0.5, 0.1, 0.08], b: 4e-3 });
    for (const [w2, d2, x2, z2] of [[0.6, 0.02, 0, 0.19], [0.6, 0.02, 0, -0.19], [0.02, 0.4, 0.29, 0], [0.02, 0.4, -0.29, 0]]) P3.box("plastic", w2, 0.18, d2, 0.1 + x2, y + 0.1, 0.95 + z2, { col: [0.5, 0.1, 0.08], b: 4e-3 });
    if (j === 1) for (let k = 0; k < 5; k++) P3.add("burlap", softBox(0.26, 0.1, 0.12, 0.045, 3), [0.6, 0.45, 0.25], { p: [-0.08 + k % 3 * 0.16, y + 0.1 + Math.floor(k / 3) * 0.07, 0.86 + k % 2 * 0.16], r: [0, R4(), 0] });
  }
  for (let k = 0; k < 12; k++) {
    const x = -0.9 + R4() * 3.6, z = 1.5 + R4() * 1.6, tip = R4() < 0.7;
    P3.lathe("plastic", [[0.028, 0], [0.036, 0.09], [0.034, 0.09], [0.026, 4e-3]], { seg: 8, col: WHT2, p: [x, tip ? 0.035 : 0, z], r: tip ? [H, R4() * 6, 0] : null });
  }
  P3.box("wood", 0.23, 0.012, 0.32, 0.9, 0.75, 1.05, { col: [0.3, 0.22, 0.14], b: 3e-3, r: [0, 0.3, 0] });
  if (A) P3.quad("signF", 0.2, 0.2 / A.aspect("tally"), A.rect("tally"), { p: [0.9, 0.758, 1.05], r: [-H, 0, 0.3] });
  for (let k = 0; k < 6; k++) P3.cyl("galv", 0.05, 0.12, 1 + k % 3 * 0.12, 0.8 + Math.floor(k / 3) * 0.12, -1.05, { seg: 10, col: k % 2 ? [0.6, 0.15, 0.1] : [0.75, 0.75, 0.72] });
  for (let k = 0; k < 3; k++) P3.add("burlap", softBox(0.6, 0.2, 0.38, 0.09, 4), [0.5, 0.45, 0.33], { p: [1.2 + k * 0.25, 0.1 + k * 0.17, -1], r: [0, (R4() - 0.5) * 0.4, 0], jit: 0.1 });
  if (o.spill !== false) {
    P3.lathe("galv", [[1e-3, 0], [0.24, 0], [0.25, 0.02], [0.25, 0.46], [0.262, 0.47], [0.235, 0.47], [0.235, 0.03], [1e-3, 0.03]], { seg: 18, col: [0.75, 0.76, 0.77], p: [2.4, 0.25, 2.1], r: [H + 0.05, 0.6, 0] });
    P3.cyl("black", 0.55, 4e-3, 2.75, 4e-3, 2.5, { seg: 14, col: [0.2, 0.15, 0.1] });
  }
  if (lamp2) {
    P3.tube("rubber", [[0.4, Hr - 0.02, 0], [0.4, Hr - 0.45, 0.06]], 6e-3, { seg: 4, samples: 0, col: [0.85, 0.42, 0.05] });
    P3.add("plastic", softBox(0.16, 0.1, 0.16, 0.03, 3), [0.85, 0.6, 0.05], { p: [0.4, Hr - 0.5, 0.06] });
    P3.box(lamp2 === 2 ? "lampTubeF" : "lampFlood", 0.12, 0.012, 0.12, 0.4, Hr - 0.556, 0.06, { b: 2e-3 });
    P3.glow("fill", [0.4, Hr - 0.7, 0.2], { col: COOL2, power: 10, dist: 11, dir: [0, -0.92, 0.38], cone: 1, tube: lamp2 === 2 ? 1 : 0 });
    P3.glow("flare", [0.4, Hr - 0.58, 0.08], { col: COOL2, size: 0.9, flick: lamp2 === 2 });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    P3.bar("burlap", [sx * W / 2, He, sz * D / 2], [sx * (W / 2 + 0.9), 0.02, sz * (D / 2 + 0.7)], 5e-3, { col: [0.75, 0.7, 0.3] });
    P3.bar("steel", [sx * (W / 2 + 0.9), -0.05, sz * (D / 2 + 0.7)], [sx * (W / 2 + 0.95), 0.14, sz * (D / 2 + 0.74)], 8e-3, { col: STEELC3 });
    P3.add("burlap", softBox(0.5, 0.15, 0.28, 0.07, 4), [0.45, 0.41, 0.3], { p: [sx * (W / 2 - 0.1), 0.08, sz * (D / 2 - 0.05)], r: [0, R4(), 0] });
  }
  for (const x of [-1.9, 0, 1.9]) P3.col([x - 0.9, 0, 0.58], [x + 0.9, 0.76, 1.32], { surface: "plastic" });
  P3.col([0.6, 0, -1.38], [2.4, 0.76, -0.62], { surface: "plastic" });
  P3.col([-2.5, 0, -1.2], [-0.8, 0.95, -0.6], { surface: "metal" });
  P3.col([-W / 2 - 0.05, 0, -D / 2 - 0.06], [W / 2, He, -D / 2 + 0.02], { surface: "cloth" });
  P3.col([-W / 2 - 0.06, 0, -D / 2], [-W / 2 + 0.02, He, D / 2], { surface: "cloth" });
  for (const x of [0, W / 2]) for (const s of [-1, 1]) if (!(x === 0 && s < 0)) P3.col([x - 0.04, 0, s * D / 2 - 0.04], [x + 0.04, He, s * D / 2 + 0.04], { surface: "metal", noNav: true });
  P3.col([-W / 2 - 0.2, He, -D / 2 - 0.2], [W / 2 + 0.2, Hr, D / 2 + 0.2], { surface: "cloth", bulletOnly: true });
  return P3.finish({ grime: 0.7, ground: 0.4 });
});
var waterBowser = (seed = 1, o = {}) => proto("fbowser" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("waterBowser", seed), A = o.atlas, R4 = rng(seed * 47 + 9), col = o.col || OLV3, L = 2.5, Rt = 0.66, cy = 1.32;
  for (const s of [-1, 1]) {
    P3.beam("steel", [-L / 2 - 0.1, 0.56, s * 0.52], [L / 2 + 0.1, 0.56, s * 0.52], 0.12, 0.06, { col: STEELC3 });
    P3.beam("steel", [L / 2 + 0.1, 0.56, s * 0.52], [L / 2 + 1.25, 0.56, 0], 0.1, 0.06, { col: STEELC3 });
    addWheel(P3, 0.38, 0.24, 0, 0.38, s * 0.86, { axis: "z", out: s, rimCol: OLV3, seg: 22, nuts: 6 });
    P3.ext("milpaint", lin4(0, 1, 8).map((t) => [Math.cos(PI5 * t) * 0.47, 0.38 + Math.sin(PI5 * t) * 0.47]).concat(lin4(1, 0, 8).map((t) => [Math.cos(PI5 * t) * 0.45, 0.38 + Math.sin(PI5 * t) * 0.45])), s * 0.86 - 0.14, s * 0.86 + 0.14, { plane: "xy", col, bevel: 2e-3 });
  }
  P3.bar("steel", [0, 0.38, -0.75], [0, 0.38, 0.75], 0.045, { col: STEELC3 });
  for (const x of [-0.8, 0.8]) P3.beam("steel", [x, 0.56, -0.56], [x, 0.56, 0.56], 0.08, 0.06, { col: STEELC3 });
  P3.box("steel", 0.16, 0.1, 0.12, L / 2 + 1.33, 0.57, 0, { col: STEELC3, b: 0.02 });
  P3.add("steel", ring(0.05, 0.016, { seg: 10, radial: 5 }), STEELC3, { p: [L / 2 + 1.45, 0.57, 0], r: [H, 0, 0] });
  P3.bar("steel", [L / 2 + 0.9, 0.56, 0.12], [L / 2 + 0.9, 0.12, 0.12], 0.024, { col: STEELC3 });
  P3.cyl("rubber", 0.11, 0.06, L / 2 + 0.9, 0.11, 0.12, { axis: "z", seg: 12, col: DK4 });
  P3.bar("steel", [L / 2 + 0.9, 0.86, 0.12], [L / 2 + 0.9, 0.56, 0.12], 0.03, { col: STEELC3 });
  P3.bar("steel", [L / 2 + 0.9, 0.88, 0.12], [L / 2 + 1.04, 0.88, 0.12], 8e-3, { col: STEELC3 });
  {
    const pr = [[1e-3, -L / 2 - 0.16], [Rt * 0.5, -L / 2 - 0.13], [Rt * 0.86, -L / 2 - 0.06], [Rt, -L / 2 + 0.04], [Rt, L / 2 - 0.04], [Rt * 0.86, L / 2 + 0.06], [Rt * 0.5, L / 2 + 0.13], [1e-3, L / 2 + 0.16]];
    P3.lathe("milpaint", pr, { axis: "x", seg: 28, col, p: [0, cy, 0], jit: 0.07 });
  }
  for (const x of [-0.8, 0.8]) {
    P3.ext("steel", lin4(0, 1, 10).map((t) => [Math.cos(PI5 + PI5 * t) * (Rt + 0.02), cy + Math.sin(PI5 + PI5 * t) * (Rt + 0.02)]).concat([[Rt + 0.02, 0.6], [-Rt - 0.02, 0.6]]), x - 0.05, x + 0.05, { plane: "xy", col: STEELC3, bevel: 4e-3, r: [0, H, 0], p: [0, 0, 0] });
    P3.add("steel", ring(Rt + 8e-3, 0.012, { seg: 28, radial: 4 }), STEELC3, { p: [x + 0.12, cy, 0], r: [0, H, 0] });
  }
  for (const x of [-0.42, 0.42]) P3.add("milpaint", ring(Rt + 2e-3, 6e-3, { seg: 28, radial: 4 }), col, { p: [x, cy, 0], r: [0, H, 0] });
  P3.cyl("milpaint", 0.26, 0.1, -0.2, cy + Rt + 0.02, 0, { seg: 18, col });
  P3.cyl("milpaint", 0.28, 0.03, -0.2, cy + Rt + 0.085, 0, { seg: 18, col });
  for (let k = 0; k < 4; k++) {
    const a = k * H + 0.4;
    P3.box("steel", 0.03, 0.04, 0.06, -0.2 + Math.cos(a) * 0.28, cy + Rt + 0.08, Math.sin(a) * 0.28, { col: STEELC3, b: 4e-3, r: [0, -a + H, 0] });
  }
  P3.bar("steel", [-0.34, cy + Rt + 0.12, 0], [-0.06, cy + Rt + 0.12, 0], 0.01, { col: STEELC3 });
  P3.tube("galv", [[0.7, cy + Rt - 0.03, 0], [0.7, cy + Rt + 0.14, 0], [0.78, cy + Rt + 0.14, 0], [0.78, cy + Rt + 0.08, 0]], 0.02, { seg: 6, samples: 0, col: ALU6 });
  P3.box("rubber", 1.5, 8e-3, 0.3, 0.05, cy + Rt - 0.014, 0, { col: DK4, b: 0 });
  for (const x of [-0.72, -0.4]) P3.bar("galv", [x, 0.62, Rt + 0.1], [x, cy + Rt * 0.75, Rt * 0.66 + 0.06], 0.012, { col: ALU6 });
  for (let k = 0; k < 5; k++) {
    const t = k / 4.6, y = lerp2(0.72, cy + Rt * 0.7, t), z = lerp2(Rt + 0.1, Rt * 0.66 + 0.06, t);
    P3.bar("galv", [-0.72, y, z], [-0.4, y, z], 9e-3, { col: ALU6 });
  }
  if (A) {
    P3.quad("decalF", 1.5, 1.5 / A.aspect("stWaterB"), A.rect("stWaterB"), { p: [0.45, cy + 0.08, Rt * 0.99 + 0.012], r: [-0.12, 0, 0] });
    P3.quad("decalF", 1.5, 1.5 / A.aspect("stWaterB"), A.rect("stWaterB"), { p: [0, cy + 0.08, -Rt * 0.99 - 0.012], r: [0.12, PI5, 0] });
    P3.quad("signF", 0.5, 0.5, A.rect("water"), { p: [-L / 2 - 0.2, cy + 0.42, 0], r: [0, -H, 0] });
  }
  P3.tube("galv", [[-L / 2 - 0.1, cy - Rt + 0.12, 0], [-L / 2 - 0.3, cy - Rt + 0.12, 0], [-L / 2 - 0.3, 0.98, 0]], 0.03, { seg: 8, samples: 0, col: ALU6 });
  P3.box("paint", 0.1, 0.03, 0.2, -L / 2 - 0.3, 1.06, 0.06, { col: [0.6, 0.1, 0.08], b: 6e-3, r: [0, 0.5, 0] });
  P3.bar("galv", [-L / 2 - 0.3, 0.95, -0.8], [-L / 2 - 0.3, 0.95, 0.8], 0.026, { col: ALU6 });
  for (let k = 0; k < 6; k++) {
    const z = -0.66 + k * 0.265;
    P3.tube("chrome", [[-L / 2 - 0.3, 0.95, z], [-L / 2 - 0.42, 0.95, z], [-L / 2 - 0.45, 0.88, z]], 0.012, { seg: 5, samples: 0, col: [0.85, 0.7, 0.3] });
    P3.box("paint", 0.012, 0.03, 0.07, -L / 2 - 0.4, 0.985, z, { col: [0.1, 0.25, 0.6], b: 4e-3, r: [0, k === 2 ? 1.2 : 0.1 * k, 0] });
  }
  for (const s of [-1, 1]) P3.bar("steel", [-L / 2 - 0.1, 0.56, s * 0.5], [-L / 2 - 0.3, 0.95, s * 0.78], 0.014, { col: STEELC3 });
  P3.box("galv", 0.34, 0.05, 1.7, -L / 2 - 0.46, 0.3, 0, { col: [0.7, 0.72, 0.73], b: 6e-3 });
  for (const s of [-1, 1]) P3.bar("galv", [-L / 2 - 0.46, 0.3, s * 0.8], [-L / 2 - 0.46, 0, s * 0.8], 0.012, { col: ALU6 });
  const jerry = (x, y, z, ry, c, tip) => {
    P3.push({ p: [x, y, z], r: tip ? [H, ry, 0] : [0, ry, 0] });
    P3.add("plastic", softBox(0.34, 0.44, 0.17, 0.035, 3), c, { p: [0, 0.22, 0] });
    P3.tube("plastic", [[-0.1, 0.44, 0], [-0.1, 0.49, 0], [0.04, 0.49, 0], [0.04, 0.44, 0]], 0.012, { seg: 5, samples: 0, col: c });
    P3.cyl("plastic", 0.025, 0.04, 0.12, 0.46, 0, { seg: 8, col: DK4 });
    P3.pop();
  };
  jerry(-L / 2 - 0.5, 0.33, -0.5, 0.2, BLU);
  jerry(-L / 2 - 0.9, 0, 0.3, 1, BLU);
  jerry(-L / 2 - 1.2, 0.09, -0.3, 2.2, [0.8, 0.8, 0.75], true);
  jerry(-L / 2 - 0.95, 0, -0.75, 0.4, [0.8, 0.8, 0.75]);
  for (const [x, z, c] of [[-L / 2 - 0.5, 0.2, [0.6, 0.1, 0.08]], [-L / 2 - 1.3, 0.7, BLU]]) {
    P3.lathe("plastic", [[0.11, 0], [0.15, 0.27], [0.158, 0.275], [0.14, 0.27], [0.105, 0.01], [1e-3, 0.01]], { seg: 14, col: c, p: [x, x > -L / 2 - 0.6 ? 0.33 : 0, z] });
    P3.add("galv", ring(0.15, 4e-3, { seg: 12, radial: 3, a0: 0, a1: PI5 }), ALU6, { p: [x, (x > -L / 2 - 0.6 ? 0.33 : 0) + 0.27, z], r: [0.5 + R4(), 0, 0] });
  }
  P3.cyl("black", 0.7, 4e-3, -L / 2 - 0.7, 3e-3, 0.1, { seg: 16, col: [0.05, 0.06, 0.07] });
  P3.col([-L / 2 - 0.5, 0, -0.95], [L / 2 + 0.2, cy + Rt + 0.1, 0.95], { surface: "metal" });
  P3.col([L / 2 + 0.2, 0, -0.3], [L / 2 + 1.5, 0.7, 0.3], { surface: "metal", noNav: true });
  return P3.finish({ grime: 0.8, ground: 0.5 });
});
var portaLoo = (seed = 1, o = {}) => proto("floo" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("portaLoo", seed), A = o.atlas, R4 = rng(seed * 53 + 31), n = o.n || 4, col = o.col || TEAL, CW = 1.12, CD = 1.2, CH = 2.2, open = o.open || [], lid = [0.82, 0.83, 0.8];
  for (let k = 0; k < n; k++) {
    const x = (k - (n - 1) / 2) * (CW + 0.06), dn = o.down === k, op = open.includes(k);
    P3.push(dn ? { p: [x + 0.2, 0.6, -1.5], r: [-H + 0.04, 0.25, 0] } : { p: [x, 0, 0], r: [0, (R4() - 0.5) * 0.05, (R4() - 0.5) * 0.015] });
    P3.box("plastic", CW, 0.12, CD, 0, 0, 0, { base: true, col: [0.2, 0.2, 0.21], b: 0.02 });
    for (const s of [-1, 1]) {
      P3.box("plastic", 0.035, CH - 0.2, CD - 0.04, s * (CW / 2 - 0.02), 0.12, 0, { base: true, col, b: 0.01 });
      for (let j = 0; j < 4; j++) P3.box("plastic", 0.02, CH - 0.5, 0.1, s * (CW / 2 + 2e-3), 0.27, -CD / 2 + 0.2 + j * 0.27, { base: true, col, b: 8e-3 });
    }
    P3.box("plastic", CW - 0.04, CH - 0.2, 0.035, 0, 0.12, -CD / 2 + 0.02, { base: true, col, b: 0.01 });
    for (let j = 0; j < 3; j++) P3.box("plastic", 0.12, CH - 0.5, 0.02, -0.3 + j * 0.3, 0.27, -CD / 2 - 2e-3, { base: true, col, b: 8e-3 });
    for (const s of [-1, 1]) P3.box("plastic", 0.1, CH - 0.2, 0.05, s * (CW / 2 - 0.05), 0.12, CD / 2 - 0.025, { base: true, col, b: 0.01 });
    P3.box("plastic", CW, 0.14, 0.05, 0, CH - 0.15, CD / 2 - 0.025, { col, b: 0.01 });
    {
      const g2 = softBox(CW + 0.06, 0.3, CD + 0.06, 0.1, 5);
      deform(g2, (q) => {
        if (q.y > 0) q.y += 0.1 * (1 - (q.x / (CW / 2)) ** 2) * (1 - (q.z / (CD / 2)) ** 2);
      }, true);
      P3.add("plastic", g2, lid, { p: [0, CH + 0.02, 0] });
    }
    P3.cyl("plastic", 0.05, 0.5, CW / 2 - 0.16, CH + 0.3, -CD / 2 + 0.16, { seg: 10, col: [0.2, 0.2, 0.21] });
    for (const s of [-1, 1]) for (let j = 0; j < 5; j++) P3.box("black", 8e-3, 0.02, 0.3, s * (CW / 2 + 1e-3), CH - 0.32 - j * 0.045, 0.1, { b: 0 });
    if (op || dn) {
      P3.box("plastic", CW - 0.1, 0.48, 0.5, 0, 0.12, -CD / 2 + 0.3, { base: true, col: [0.3, 0.3, 0.32], b: 0.02 });
      P3.add("plastic", ring(0.17, 0.035, { seg: 14, radial: 5 }), lid, { p: [0, 0.61, -CD / 2 + 0.32], r: [H, 0, 0] });
      P3.cyl("black", 0.15, 0.01, 0, 0.6, -CD / 2 + 0.32, { seg: 12 });
      P3.cyl("plastic", 0.06, 0.12, CW / 2 - 0.1, 1, -0.1, { axis: "x", seg: 10, col: WHT2 });
    }
    const dw = CW - 0.2, ang = op ? -1.2 - R4() * 0.7 : dn ? -0.5 : 0;
    P3.push({ p: [-dw / 2, 0.14, CD / 2 - 0.02], r: [0, ang, 0] });
    P3.box("plastic", dw, CH - 0.34, 0.03, dw / 2, 0, 0, { base: true, col: lid, b: 8e-3 });
    P3.box("plastic", dw - 0.2, 0.5, 0.012, dw / 2, 1.3, 0.016, { base: true, col: [0.74, 0.75, 0.72], b: 4e-3 });
    P3.box("plastic", 0.1, 0.16, 0.03, dw - 0.09, 1.02, 0.02, { col: [0.2, 0.2, 0.21], b: 8e-3 });
    P3.box(k % 3 === 1 ? "ledRed" : "ledGreen", 0.04, 0.02, 8e-3, dw - 0.09, 1.07, 0.037, { b: 0 });
    P3.box("chrome", 0.02, 0.1, 0.03, dw - 0.09, 0.98, 0.04, { b: 4e-3 });
    if (A) P3.quad("signF", 0.34, 0.34 / A.aspect("wc"), A.rect("wc"), { p: [dw / 2, 1.62, 0.024] });
    for (const y of [0.3, 1, 1.7]) P3.box("steel", 0.03, 0.1, 0.02, 0, y, 0.016, { col: STEELC3, b: 3e-3 });
    P3.pop();
    P3.pop();
    if (!dn) P3.col([x - CW / 2, 0, -CD / 2], [x + CW / 2, CH + 0.2, CD / 2], { surface: "plastic" });
    else P3.col([x - CW / 2 + 0.2, 0, -CD / 2 - 2.3], [x + CW / 2 + 0.2, 1.2, -CD / 2 - 0.1], { surface: "plastic" });
  }
  if (A && o.tags) P3.quad("decalF", 1, 1 / A.aspect(o.tags), A.rect(o.tags), { p: [n / 2 * (CW + 0.06) - 0.02, 1.2, 0], r: [0, H, 0] });
  if (o.lamp != null) {
    const x = (o.lamp - (n - 1) / 2) * (CW + 0.06);
    P3.cyl("plastic", 0.07, 0.03, x, CH - 0.04, CD / 2 + 0.03, { axis: "z", seg: 12, col: DK4 });
    P3.cyl("lampCyan", 0.055, 0.012, x, CH - 0.04, CD / 2 + 0.05, { axis: "z", seg: 12 });
    P3.glow("fill", [x, CH - 0.2, CD / 2 + 0.5], { col: [0.5, 0.9, 1], power: 5, dist: 7, dir: [0, -0.8, 0.6], cone: 1 });
    P3.glow("flare", [x, CH - 0.04, CD / 2 + 0.08], { col: [0.5, 0.9, 1], size: 0.6 });
  }
  {
    const x = n / 2 * (CW + 0.06) + 0.45;
    P3.add("plastic", softBox(0.5, 0.9, 0.5, 0.05, 3), [0.2, 0.2, 0.21], { p: [x, 0.45, 0.2] });
    P3.lathe("plastic", [[0.2, 0.9], [0.22, 0.98], [0.21, 0.98], [0.16, 0.92], [1e-3, 0.92]], { seg: 14, col: lid, p: [x, 0, 0.2] });
    P3.tube("chrome", [[x, 0.95, 0.02], [x, 1.14, 0.02], [x, 1.14, 0.14], [x, 1.08, 0.14]], 0.012, { seg: 5, samples: 0 });
    P3.box("plastic", 0.12, 0.05, 0.05, x - 0.1, 0.05, 0.47, { col: [0.6, 0.1, 0.08], b: 0.01 });
    P3.col([x - 0.25, 0, -0.05], [x + 0.25, 1, 0.45], { surface: "plastic" });
  }
  P3.tube("rubber", [[-(n / 2) * (CW + 0.06), 0.03, -CD / 2 - 0.3], [-(n / 2) * (CW + 0.06) + 1.2, 0.03, -CD / 2 - 0.7], [0, 0.03, -CD / 2 - 0.4], [1, 0.03, -CD / 2 - 0.9]], 0.03, { seg: 6, samples: 18, col: [0.2, 0.3, 0.2] });
  return P3.finish({ grime: 0.8, ground: 0.5 });
});
var shed = (seed = 1, o = {}) => proto("fshed" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("shed", seed), A = o.atlas, R4 = rng(seed * 59 + 21), W = 3.6, D = 2.6, He = 2, Hr = 2.65, open = o.open ?? 1.9, CRE = [0.24, 0.2, 0.15], dw = 0.82, dx = -0.5;
  for (const z of [-D / 2 + 0.2, 0, D / 2 - 0.2]) P3.box("wood", W + 0.1, 0.1, 0.1, 0, 0.05, z, { col: [0.2, 0.17, 0.13], b: 0.01 });
  P3.box("wood", W, 0.03, D, 0, 0.115, 0, { col: [0.3, 0.25, 0.18], b: 4e-3 });
  const boards = (len, y0, y1, place) => {
    const nb2 = Math.round((y1 - y0) / 0.125);
    for (let j = 0; j < nb2; j++) {
      const y = y0 + (j + 0.5) * ((y1 - y0) / nb2);
      place(len, y, (y1 - y0) / nb2, j);
    }
  };
  const fr = [[-W / 2, dx - dw], [dx + dw, 0.55], [1.45, W / 2]];
  for (const [a, b] of fr) boards(b - a, 0.13, He, (len, y, h) => P3.box("wood", len, h + 0.012, 0.02, (a + b) / 2, y, D / 2 - 0.01 + 6e-3, { col: [CRE[0] + R4() * 0.04, CRE[1] + R4() * 0.03, CRE[2] + R4() * 0.02], b: 3e-3, r: [0.08, 0, 0] }));
  boards(0.9, 0.13, 1, (len, y, h) => P3.box("wood", len, h + 0.012, 0.02, 1, y, D / 2 - 4e-3, { col: CRE, b: 3e-3, r: [0.08, 0, 0] }));
  boards(0.9, 1.75, He, (len, y, h) => P3.box("wood", len, h + 0.012, 0.02, 1, y, D / 2 - 4e-3, { col: CRE, b: 3e-3, r: [0.08, 0, 0] }));
  boards(dw * 2, 1.9, He, (len, y, h) => P3.box("wood", len, h + 0.012, 0.02, dx, y, D / 2 - 4e-3, { col: CRE, b: 3e-3, r: [0.08, 0, 0] }));
  boards(W, 0.13, He, (len, y, h) => P3.box("wood", len, h + 0.012, 0.02, 0, y, -D / 2 + 4e-3, { col: [CRE[0] + R4() * 0.04, CRE[1] + R4() * 0.03, CRE[2] + R4() * 0.02], b: 3e-3, r: [-0.08, 0, 0] }));
  for (const s of [-1, 1]) {
    boards(D, 0.13, He, (len, y, h) => P3.box("wood", 0.02, h + 0.012, len, s * (W / 2 - 4e-3), y, 0, { col: [CRE[0] + R4() * 0.04, CRE[1] + R4() * 0.03, CRE[2] + R4() * 0.02], b: 3e-3, r: [0, 0, s * 0.08] }));
    P3.ext("wood", [[-D / 2, He], [D / 2, He], [0, Hr]], s * (W / 2) - 0.012, s * (W / 2) + 0.012, { plane: "side", col: CRE, bevel: 2e-3 });
    for (const z of [-D / 2, D / 2]) P3.box("wood", 0.06, He, 0.06, s * (W / 2 - 5e-3), 0.13, z * 0.995, { base: true, col: [0.2, 0.17, 0.13], b: 6e-3 });
  }
  P3.box("black", W - 0.08, He - 0.1, D - 0.08, 0, 0.14, -0.02, { base: true, b: 0 });
  P3.box("black", dw * 2, 1.76, 0.04, dx, 0.14, D / 2 - 0.05, { base: true, b: 0 });
  P3.add("paint", softBox(0.8, 0.5, 0.5, 0.08, 4), [0.1, 0.32, 0.12], { p: [dx - 0.25, 0.62, D / 2 - 0.42] });
  P3.box("black", 0.5, 0.2, 0.02, dx - 0.25, 0.6, D / 2 - 0.16, { b: 0 });
  for (const s of [-1, 1]) {
    P3.cyl("rubber", 0.16, 0.14, dx - 0.25 + s * 0.42, 0.3, D / 2 - 0.3, { axis: "x", seg: 12, col: DK4 });
    P3.cyl("lampDim", 0.04, 0.02, dx - 0.25 + s * 0.26, 0.72, D / 2 - 0.165, { axis: "z", seg: 8 });
  }
  const leaf = (hx, ang, s) => {
    P3.push({ p: [hx, 0.14, D / 2 + 0.012], r: [0, ang, 0] });
    for (let j = 0; j < 6; j++) P3.box("wood", dw / 6 - 4e-3, 1.74, 0.02, s * (j + 0.5) * (dw / 6), 0, 0, { base: true, col: [CRE[0] + R4() * 0.05, CRE[1] + R4() * 0.04, CRE[2] + R4() * 0.02], b: 3e-3 });
    for (const y of [0.25, 0.87, 1.5]) P3.box("wood", dw - 0.04, 0.1, 0.022, s * dw / 2, y, 0.02, { col: [0.2, 0.17, 0.13], b: 4e-3 });
    for (const [y0, y1] of [[0.3, 0.82], [0.92, 1.45]]) P3.beam("wood", [s * 0.04, y0, 0.02], [s * (dw - 0.04), y1, 0.02], 0.09, 0.022, { col: [0.2, 0.17, 0.13] });
    for (const y of [0.25, 1.5]) P3.box("steel", 0.3, 0.04, 8e-3, s * 0.15, y, 0.034, { col: DK4, b: 2e-3 });
    P3.pop();
  };
  leaf(dx - dw, 0, 1);
  leaf(dx + dw, open, -1);
  P3.box("steel", 0.14, 0.04, 0.012, dx - 0.07, 1, D / 2 + 0.05, { col: DK4, b: 3e-3 });
  P3.add("steel", ring(0.025, 7e-3, { seg: 8, radial: 4, a0: 0, a1: PI5 * 1.3 }), [0.6, 0.6, 0.6], { p: [dx + 0.3, 0.02, D / 2 + 0.7], r: [H, 0, 0] });
  P3.box("steel", 0.05, 0.04, 0.02, dx + 0.3, 0.012, D / 2 + 0.73, { col: [0.7, 0.55, 0.2], b: 4e-3 });
  P3.box("black", 0.9, 0.75, 0.01, 1, 1.375, D / 2 - 0.03, { b: 0 });
  P3.box("glass", 0.86, 0.71, 6e-3, 1, 1.375, D / 2 - 0.012, { b: 0 });
  for (const [w2, h2, x2, y2] of [[0.94, 0.05, 0, 0.375], [0.94, 0.05, 0, -0.375], [0.05, 0.8, 0.445, 0], [0.05, 0.8, -0.445, 0], [0.03, 0.75, 0, 0], [0.9, 0.03, 0, 0]]) P3.box("wood", w2, h2, 0.04, 1 + x2, 1.375 + y2, D / 2 + 2e-3, { col: [0.5, 0.5, 0.46], b: 4e-3 });
  P3.box("wood", 1, 0.03, 0.09, 1, 0.985, D / 2 + 0.03, { col: [0.5, 0.5, 0.46], b: 4e-3 });
  for (const s of [-1, 1]) {
    const g2 = quadXY(W + 0.3, 1, [0, 0, 4, 2], 12, 4);
    deform(g2, (q) => {
      const t = q.y + 0.5, x = q.x;
      q.z = s * (D / 2 + 0.16) * (1 - t);
      q.y = He - 0.07 + (Hr - He + 0.09) * t + 0.012 * Math.sin(x * 7 + t * 3) - (s > 0 && x > W / 2 - 0.5 && t < 0.4 ? -0.16 * (1 - t / 0.4) * ((x - W / 2 + 0.5) / 0.65) : 0);
      q.x = x;
    });
    if (s > 0) flip(g2);
    g2.computeVertexNormals();
    P3.add("rubber", g2, [0.16, 0.17, 0.16], { jit: 0.1 });
    P3.box("wood", W + 0.3, 0.07, 0.02, 0, He - 0.09, s * (D / 2 + 0.165), { col: [0.2, 0.17, 0.13], b: 3e-3 });
  }
  P3.box("rubber", W + 0.32, 0.03, 0.2, 0, Hr + 0.02, 0, { col: [0.14, 0.15, 0.14], b: 0.01 });
  P3.ext("pvc", lin4(0, 1, 6).map((t) => [Math.cos(PI5 + PI5 * t) * 0.06, Math.sin(PI5 + PI5 * t) * 0.06]).concat(lin4(1, 0, 6).map((t) => [Math.cos(PI5 + PI5 * t) * 0.052, Math.sin(PI5 + PI5 * t) * 0.052])), -W / 2 - 0.1, W / 2 + 0.1, { plane: "side", col: DK4, bevel: 1e-3, p: [0, He - 0.12, -D / 2 - 0.2] });
  P3.tube("pvc", [[W / 2 + 0.05, He - 0.17, -D / 2 - 0.2], [W / 2 + 0.05, He - 0.4, -D / 2 - 0.08], [W / 2 + 0.05, 1, -D / 2 - 0.08]], 0.03, { seg: 7, samples: 0, col: DK4 });
  P3.lathe("plastic", [[1e-3, 0], [0.26, 0], [0.3, 0.1], [0.31, 0.8], [0.29, 0.92], [0.3, 0.94], [0.3, 0.96], [1e-3, 0.97]], { seg: 16, col: [0.08, 0.2, 0.12], p: [W / 2 + 0.1, 0, -D / 2 - 0.2] });
  P3.cyl("chrome", 0.012, 0.06, W / 2 + 0.1, 0.2, -D / 2 + 0.12, { axis: "z", seg: 6, col: [0.85, 0.7, 0.3] });
  const tool = (x, kind) => {
    P3.push({ p: [x, 0, D / 2 + 0.22], r: [-0.13, 0, (R4() - 0.5) * 0.1] });
    P3.bar("wood", [0, 0.05, 0], [0, 1.5, 0], 0.016, { col: [0.6, 0.48, 0.3] });
    if (kind === 0) {
      P3.box("steel", 0.4, 0.02, 0.03, 0, 0.05, 0, { col: STEELC3, b: 4e-3 });
      for (let k = 0; k < 11; k++) P3.bar("steel", [-0.19 + k * 0.038, 0.05, 0], [-0.19 + k * 0.038, 0, 0.03], 4e-3, { col: STEELC3 });
    } else if (kind === 1) {
      P3.ext("steel", [[-0.09, 0.3], [0.09, 0.3], [0.09, 0.05], [0, 0], [-0.09, 0.05]], -4e-3, 4e-3, { plane: "xy", col: STEELC3, bevel: 1e-3 });
      P3.tube("wood", [[-0.06, 1.5, 0], [-0.06, 1.58, 0], [0.06, 1.58, 0], [0.06, 1.5, 0]], 0.014, { seg: 5, samples: 0, col: [0.6, 0.48, 0.3] });
    } else {
      P3.box("steel", 0.03, 0.02, 0.03, 0, 0.3, 0, { col: STEELC3, b: 4e-3 });
      for (let k = 0; k < 4; k++) P3.bar("steel", [-0.075 + k * 0.05, 0.3, 0], [-0.075 + k * 0.05, 0, 0.01], 6e-3, { col: STEELC3 });
      P3.bar("steel", [-0.075, 0.3, 0], [0.075, 0.3, 0], 8e-3, { col: STEELC3 });
    }
    P3.pop();
  };
  tool(1.62, 0);
  tool(1.35, 1);
  tool(-1.55, 2);
  P3.push({ p: [-W / 2 - 0.1, 0.9, 0.5], r: [0, -H, 0] });
  P3.add("plastic", ring(0.2, 0.05, { seg: 16, radial: 6 }), [0.1, 0.35, 0.12], {});
  for (let k = 0; k < 3; k++) P3.add("rubber", ring(0.2 + k * 0.012, 0.014, { seg: 16, radial: 5 }), [0.5, 0.55, 0.1], { p: [0, 0, -0.03 + k * 0.03] });
  P3.cyl("plastic", 0.05, 0.14, 0, 0, 0, { axis: "z", seg: 10, col: DK4 });
  P3.pop();
  P3.tube("rubber", [[-W / 2 - 0.12, 0.7, 0.5], [-W / 2 - 0.2, 0.05, 0.7], [-W / 2 - 0.6, 0.02, 1.5], [-W / 2 + 0.2, 0.02, 2.2], [-W / 2 + 1.4, 0.02, 2]], 0.012, { seg: 5, samples: 20, col: [0.5, 0.55, 0.1] });
  if (A) P3.quad("signF", 0.5, 0.5 / A.aspect("noticeB"), A.rect("noticeB"), { p: [-1.5, 1.4, D / 2 + 0.03] });
  if (o.lamp) {
    P3.add("plastic", softBox(0.2, 0.1, 0.08, 0.03, 3), DK4, { p: [dx, He + 0.08, D / 2 + 0.06] });
    P3.box("lampWarm", 0.15, 0.06, 0.02, dx, He + 0.07, D / 2 + 0.1, { b: 4e-3 });
    P3.glow("fill", [dx, He - 0.1, D / 2 + 0.5], { col: WARM2, power: 4, dist: 6, dir: [0, -0.8, 0.6], cone: 1 });
    P3.glow("flare", [dx, He + 0.07, D / 2 + 0.14], { col: WARM2, size: 0.6 });
  }
  P3.col([-W / 2, 0, -D / 2], [W / 2, He, D / 2], { surface: "wood" });
  P3.col([-W / 2 - 0.2, He, -D / 2 - 0.2], [W / 2 + 0.2, Hr, D / 2 + 0.2], { surface: "wood", bulletOnly: true });
  P3.col([W / 2 - 0.2, 0, -D / 2 - 0.5], [W / 2 + 0.4, 0.97, -D / 2 + 0.1], { surface: "plastic" });
  return P3.finish({ grime: 0.9, ground: 0.6 });
});
var euroBin = (seed = 1, o = {}) => proto("feuro" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("euroBin", seed), A = o.atlas, R4 = rng(seed * 61 + 3), col = o.col || [0.12, 0.25, 0.16], W = 1.26, D = 0.98, Hb = 1.12, lid = o.lid ?? 0.2;
  if (o.tip) P3.push({ p: [0, D / 2, 0], r: [H - 0.04, 0, 0] });
  {
    const g2 = softBox(W, Hb - 0.2, D, 0.06, 4);
    deform(g2, (q) => {
      const t = (q.y + (Hb - 0.2) / 2) / (Hb - 0.2), k = 0.84 + 0.16 * t;
      q.x *= k;
      q.z *= k;
    }, true);
    P3.add("hdpe", g2, col, { p: [0, 0.2 + (Hb - 0.2) / 2, 0] });
  }
  P3.box("hdpe", W + 0.06, 0.05, D + 0.06, 0, Hb - 0.01, 0, { col, b: 0.016 });
  P3.box("black", W - 0.1, 0.01, D - 0.1, 0, Hb + 0.012, 0, { b: 0 });
  for (const y of [0.55, 0.8]) P3.box("hdpe", W * 0.94, 0.03, 0.02, 0, y, D / 2 * (0.9 + y * 0.07), { col, b: 8e-3 });
  for (const sx of [-1, 1]) {
    P3.cyl("steel", 0.035, 0.1, sx * (W / 2 + 0.03), 0.86, 0, { axis: "x", seg: 10, col: STEELC3 });
    for (const sz of [-1, 1]) {
      P3.box("steel", 0.08, 0.05, 0.08, sx * 0.45, 0.19, sz * 0.33, { col: STEELC3, b: 6e-3 });
      P3.cyl("rubber", 0.08, 0.04, sx * 0.45, 0.08, sz * 0.33 + 0.02, { axis: "x", seg: 12, col: DK4 });
      P3.box("steel", 0.06, 0.1, 0.012, sx * 0.45, 0.12, sz * 0.33 - 0.03, { col: STEELC3, b: 2e-3 });
    }
  }
  P3.push({ p: [0, Hb + 0.02, -D / 2 - 0.02], r: [-lid * 2.2, 0, 0] });
  {
    const g2 = softBox(W + 0.08, 0.2, D + 0.06, 0.07, 5);
    deform(g2, (q) => {
      if (q.y > 0) q.y += 0.12 * (1 - (q.z / (D / 2)) ** 2);
    }, true);
    P3.add("hdpe", g2, col, { p: [0, 0.07, D / 2 + 0.02] });
  }
  P3.bar("hdpe", [-0.3, 0.1, D + 0.06], [0.3, 0.1, D + 0.06], 0.016, { col });
  P3.pop();
  if (A) P3.quad("decalF", 0.4, 0.4 / A.aspect("stBlank"), A.rect("stBlank"), { p: [0, 0.72, D / 2 * 0.97 + 0.02], r: [-0.07, 0, 0] });
  const bag = (x, y, z, s, c) => {
    const g2 = softBox(0.5 * s, 0.38 * s, 0.42 * s, 0.16 * s, 5);
    deform(g2, (q) => {
      const k = 1 + 0.25 * vnoise(q.x * 7 + x, q.y * 7, q.z * 7 + z);
      q.x *= k;
      q.z *= k;
      if (q.y > 0.1 * s) {
        q.x *= 0.6;
        q.z *= 0.6;
      }
    }, true);
    P3.add("hdpe", g2, c, { p: [x, y + 0.17 * s, z], r: [0, R4() * 3, 0], jit: 0.08 });
    P3.cyl("hdpe", 0.03 * s, 0.07 * s, x, y + 0.38 * s, z, { seg: 6, col: c });
  };
  const nb2 = o.bags ?? 4;
  for (let k = 0; k < nb2; k++) {
    const inb = k < 2 && lid > 0.5 && !o.tip;
    bag(inb ? (k - 0.5) * 0.5 : (R4() - 0.5) * 1.6, inb ? Hb - 0.08 : 0, inb ? (R4() - 0.5) * 0.3 : D / 2 + 0.35 + R4() * 0.7, 0.9 + R4() * 0.3, k % 3 === 0 ? [0.75, 0.6, 0.1] : [0.06, 0.06, 0.065]);
  }
  if (o.tip) P3.pop();
  if (o.tip) P3.col([-W / 2, 0, -Hb + D / 2], [W / 2, D, D / 2], { surface: "plastic" });
  else P3.col([-W / 2, 0, -D / 2], [W / 2, Hb + 0.1, D / 2], { surface: "plastic" });
  return P3.finish({ grime: 0.9, ground: 0.5 });
});
function bicycle(P3, R4, col, s = 1, o = {}) {
  const wr = 0.34 * s, wb = 1.05 * s, bb = [0.42 * s, 0.28 * s], seat2 = [0.3 * s, 0.86 * s], head = [0.84 * s, 0.84 * s], rear = [0, wr], front = [wb, wr], tube2 = (a, b, r, c = col) => P3.bar("paint", [a[0], a[1], 0], [b[0], b[1], 0], r * s, { col: c, seg: 6 });
  for (const [c, bent] of [[rear, 0], [front, o.buckled]]) {
    P3.push({ p: [c[0], c[1], 0], r: [0, front === c ? o.steer || 0 : 0, 0] });
    const tg = ring(wr - 0.02 * s, 0.022 * s, { seg: 22, radial: 6 });
    if (bent) deform(tg, (q) => {
      q.z += 0.06 * Math.sin(Math.atan2(q.y, q.x) * 2);
    }, true);
    P3.add("rubber", tg, [0.07, 0.07, 0.075]);
    P3.add("galv", ring(wr - 0.045 * s, 8e-3 * s, { seg: 22, radial: 4 }), ALU6);
    for (let k = 0; k < 14; k++) {
      const a = k / 14 * PI5 * 2;
      P3.bar("galv", [0, 0, (k % 2 ? 1 : -1) * 0.025 * s], [Math.cos(a) * (wr - 0.05 * s), Math.sin(a) * (wr - 0.05 * s), 0], 16e-4, { col: ALU6, seg: 3, caps: false });
    }
    P3.cyl("galv", 0.02 * s, 0.09 * s, 0, 0, 0, { axis: "z", seg: 8, col: ALU6 });
    P3.pop();
  }
  tube2(bb, seat2, 0.016);
  tube2(seat2, head, 0.015);
  tube2(bb, [head[0] - 0.02 * s, head[1] - 0.12 * s], 0.018);
  tube2([head[0] - 0.03 * s, head[1] - 0.14 * s], [head[0] + 0.01 * s, head[1] + 0.06 * s], 0.019);
  for (const z of [-0.05, 0.05]) {
    P3.bar("paint", [bb[0], bb[1], z * s * 0.6], [rear[0], rear[1], z * s], 9e-3 * s, { col, seg: 5 });
    P3.bar("paint", [seat2[0], seat2[1] - 0.04 * s, z * s * 0.4], [rear[0], rear[1], z * s], 8e-3 * s, { col, seg: 5 });
    P3.bar("paint", [head[0] - 0.02 * s, head[1] - 0.13 * s, z * s * 0.7], [front[0], front[1], z * s], 0.01 * s, { col: DK4, seg: 5 });
  }
  tube2(seat2, [seat2[0] - 0.035 * s, seat2[1] + 0.16 * s], 0.012, ALU6);
  P3.add("rubber", softBox(0.26 * s, 0.05 * s, 0.14 * s, 0.022 * s, 3), DK4, { p: [seat2[0] - 0.05 * s, seat2[1] + 0.18 * s, 0] });
  tube2([head[0] + 0.01 * s, head[1] + 0.06 * s], [head[0] + 0.07 * s, head[1] + 0.12 * s], 0.012, ALU6);
  P3.tube("galv", [[head[0] + 0.02 * s, head[1] + 0.14 * s, -0.27 * s], [head[0] + 0.08 * s, head[1] + 0.12 * s, -0.12 * s], [head[0] + 0.07 * s, head[1] + 0.12 * s, 0], [head[0] + 0.08 * s, head[1] + 0.12 * s, 0.12 * s], [head[0] + 0.02 * s, head[1] + 0.14 * s, 0.27 * s]], 0.011 * s, { seg: 5, samples: 10, col: ALU6 });
  for (const z of [-1, 1]) P3.cyl("rubber", 0.016 * s, 0.1 * s, head[0] + 0.02 * s, head[1] + 0.14 * s, z * 0.23 * s, { axis: "z", seg: 6, col: DK4 });
  P3.cyl("galv", 0.09 * s, 6e-3, bb[0], bb[1], 0.045 * s, { axis: "z", seg: 14, col: ALU6 });
  for (const [z, a] of [[0.06, 0.9], [-0.06, 0.9 + PI5]]) {
    P3.bar("galv", [bb[0], bb[1], z * s], [bb[0] + Math.cos(a) * 0.17 * s, bb[1] + Math.sin(a) * 0.17 * s, z * s], 8e-3 * s, { col: ALU6, seg: 4 });
    P3.box("rubber", 0.09 * s, 0.02 * s, 0.07 * s, bb[0] + Math.cos(a) * 0.17 * s, bb[1] + Math.sin(a) * 0.17 * s, z * s * 1.8, { col: DK4, b: 4e-3 });
  }
  if (o.guards) for (const c of [rear, front]) P3.add("paint", ring(wr + 0.02 * s, 0.012 * s, { seg: 12, radial: 4, a0: 0.2, a1: PI5 * 0.95 }), col, { p: [c[0], c[1], 0] });
}
var bikeRack = (seed = 1, o = {}) => proto("fbike" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("bikeRack", seed), R4 = rng(seed * 67 + 1), n = o.n || 6, sp2 = 0.85, L = n * sp2, bikes = o.bikes || [[0, 1, 0], [1, -1, 2], [2, 1, 3], [4, 1, 1], [5, -1, 0]], BC = [[0.5, 0.08, 0.06], [0.08, 0.2, 0.45], [0.75, 0.6, 0.08], [0.1, 0.35, 0.3], [0.7, 0.7, 0.68]];
  P3.box("concrete", L + 0.4, 0.06, 2.2, 0, 0, 0, { base: true, col: [0.7, 0.7, 0.68], b: 0.01 });
  for (let k = 0; k < n; k++) {
    const x = (k - (n - 1) / 2) * sp2;
    P3.tube("galv", [[x, 0.05, -0.35], [x, 0.72, -0.35], [x, 0.8, -0.27], [x, 0.8, 0.27], [x, 0.72, 0.35], [x, 0.05, 0.35]], 0.024, { seg: 7, samples: 0, col: ALU6 });
    for (const z of [-0.35, 0.35]) P3.cyl("galv", 0.05, 0.012, x, 0.066, z, { seg: 10, col: ALU6 });
  }
  for (const [hk, side2, st] of bikes) {
    const x = (hk - (n - 1) / 2) * sp2 + side2 * 0.09, c = BC[(hk + seed) % BC.length], sc2 = st === 2 ? 0.68 : 1;
    if (st === 1) P3.push({ p: [x + 0.25, 0.1, 0.55], r: [H - 0.12, 0.5, 0] });
    else P3.push({ p: [x, 0.06, -0.5 * sc2], r: [0, -H, side2 * 0.09] });
    bicycle(P3, R4, c, sc2, { steer: st === 1 ? 0.7 : (R4() - 0.5) * 0.8, buckled: st === 1, guards: hk % 2 === 0 });
    P3.pop();
    if (st !== 1) P3.add("rubber", ring(0.09, 8e-3, { seg: 12, radial: 4 }), [0.08, 0.08, 0.3], { p: [x - side2 * 0.05, 0.62, -0.1], r: [0.3, H, 0.4] });
  }
  if (o.roof) {
    for (const s of [-1, 1]) {
      P3.tube("galv", [[s * (L / 2 + 0.1), 0.05, -1], [s * (L / 2 + 0.1), 2.1, -1], [s * (L / 2 + 0.1), 2.35, -0.7], [s * (L / 2 + 0.1), 2.25, 1]], 0.03, { seg: 7, samples: 0, col: [0.1, 0.26, 0.14] });
    }
    const g2 = quadXY(L + 0.5, 2, null, 6, 6);
    deform(g2, (q) => {
      const t = q.y / 2 + 0.5;
      q.z = -1 + t * 2;
      q.y = 2.36 - 0.1 * t - 0.25 * (1 - t) ** 3;
    });
    g2.computeVertexNormals();
    P3.add("glassT", g2, null);
    for (const z of [-0.9, 0, 0.95]) P3.bar("galv", [-L / 2 - 0.1, 2.3 - (z + 1) * 0.04, z], [L / 2 + 0.1, 2.3 - (z + 1) * 0.04, z], 0.016, { col: [0.1, 0.26, 0.14] });
  }
  for (let k = 0; k < n; k++) P3.col([(k - (n - 1) / 2) * sp2 - 0.04, 0, -0.38], [(k - (n - 1) / 2) * sp2 + 0.04, 0.82, 0.38], { surface: "metal", noNav: true });
  P3.col([-L / 2, 0, -0.3], [L / 2, 0.8, 0.3], { surface: "metal", noBullet: true });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var noticeBoard = (seed = 1, o = {}) => proto("fnotice" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("noticeBoard", seed), A = o.atlas, R4 = rng(seed * 71 + 13), W = o.w || 3.6, Hb = 2.5, lit = o.candles ?? 5;
  for (const s of [-1, 1]) {
    P3.bar("galv", [s * W / 2, 0, 0], [s * W / 2, Hb + 0.25, 0], 0.024, { col: ALU6 });
    P3.bar("galv", [s * W / 2, 1.9, 0], [s * W / 2, 0.02, -1.1], 0.024, { col: ALU6 });
    P3.cyl("galv", 0.05, 0.05, s * W / 2, 1.9, 0, { axis: "x", seg: 8, col: STEELC3 });
    P3.box("steel", 0.15, 0.01, 0.15, s * W / 2, 5e-3, 0, { col: STEELC3, b: 0 });
    P3.add("burlap", softBox(0.5, 0.15, 0.28, 0.07, 4), [0.45, 0.41, 0.3], { p: [s * W / 2, 0.08, -1], r: [0, R4(), 0] });
  }
  for (const y of [0.55, Hb]) P3.bar("galv", [-W / 2 - 0.15, y, -0.03], [W / 2 + 0.15, y, -0.03], 0.024, { col: ALU6 });
  P3.box("wood", W - 0.1, Hb - 0.6, 0.018, 0, 0.58, 0.03, { base: true, col: [0.5, 0.42, 0.3], b: 3e-3 });
  {
    const g2 = corrugated(W + 0.5, 0.75, { pitch: 0.076, depth: 0.018 });
    P3.add("galv", g2, [0.7, 0.72, 0.74], { p: [0, Hb + 0.2, 0.2], r: [-H + 0.22, 0, 0] });
    for (const s of [-1, 1]) P3.bar("galv", [s * W / 2, Hb + 0.25, 0], [s * W / 2, Hb + 0.12, 0.55], 0.016, { col: ALU6 });
  }
  if (A) {
    const put = (nm, w, x, y, rz) => P3.quad("signF", w, w / A.aspect(nm), A.rect(nm), { p: [x, y, 0.042 + R4() * 4e-3], r: [0, 0, rz] });
    put("missing", W * 0.56, -W * 0.18, 1.72, 0.01);
    put(o.sheet2 || "manifest", W * 0.3, W * 0.3, 1.9, -0.03);
    put("noticeA", 0.5, W * 0.22, 1.1, 0.05);
    put("noticeC", 0.46, W * 0.38, 1.16, -0.08);
    put("noticeD", 0.42, -W * 0.36, 0.95, 0.06);
    put("wristband", 0.5, -W * 0.08, 0.92, -0.04);
    put("handprints", 0.7, W * 0.05, 1.25, 0.2);
  }
  for (let k = 0; k < 9; k++) {
    const g2 = quadXY(0.21, 0.297, null, 1, 4), cu = 0.03 + R4() * 0.07;
    deform(g2, (q) => {
      const t = 0.5 - q.y / 0.297;
      q.z += cu * t * t;
    });
    g2.computeVertexNormals();
    P3.add("plastic", g2, [0.8 + R4() * 0.1, 0.8 + R4() * 0.08, 0.72 + R4() * 0.1], { p: [(R4() - 0.5) * (W - 0.5), 0.85 + R4() * 1.4, 0.046], r: [0, 0, (R4() - 0.5) * 0.4], jit: 0.02 });
  }
  P3.box("wood", W - 0.3, 0.03, 0.22, 0, 0.56, 0.15, { col: WOODC4, b: 5e-3 });
  for (const x of [-W / 3, 0, W / 3]) P3.beam("wood", [x, 0.55, 0.22], [x, 0.3, 0.04], 0.03, 0.03, { col: WOODC4 });
  const NC = 11;
  for (let k = 0; k < NC; k++) {
    const sh = k < 7, x = sh ? -W / 2 + 0.4 + k / 6 * (W - 0.8) + (R4() - 0.5) * 0.1 : (R4() - 0.5) * (W - 0.8), y = sh ? 0.575 : 0, z = sh ? 0.15 + (R4() - 0.5) * 0.08 : 0.35 + R4() * 0.5, on = k % Math.max(1, Math.floor(NC / Math.max(1, lit))) === 0 && lit > 0;
    P3.lathe("glassT", [[0.03, 0], [0.034, 0.08], [0.03, 0.09]], { seg: 8, p: [x, y, z] });
    P3.cyl("plastic", 0.022, 0.045, x, y + 0.025, z, { seg: 8, col: [0.85, 0.82, 0.7] });
    if (on) {
      P3.cyl("emAmber", 7e-3, 0.022, x, y + 0.06, z, { seg: 5 });
      P3.glow("flare", [x, y + 0.07, z], { col: [1, 0.6, 0.22], size: 0.28, flick: 1 });
    }
  }
  if (lit > 0) P3.glow("fill", [0, 0.75, 0.45], { col: [1, 0.55, 0.2], power: 2.2, dist: 4.5, flicker: 2 });
  for (let k = 0; k < 5; k++) {
    const x = (R4() - 0.5) * (W - 0.6), z = 0.3 + R4() * 0.5, ry = R4() * 3;
    P3.push({ p: [x, 0.05, z], r: [0, ry, 0.15] });
    P3.lathe("plastic", [[0.02, 0], [0.09, 0.4], [0.085, 0.4], [0.015, 5e-3]], { seg: 8, col: [0.75, 0.78, 0.8], axis: "x" });
    for (let f3 = 0; f3 < 5; f3++) P3.add("plastic", softBox(0.07, 0.05, 0.07, 0.025, 3), [[0.75, 0.15, 0.2], [0.85, 0.75, 0.2], [0.8, 0.8, 0.8]][(k + f3) % 3], { p: [0.4 + R4() * 0.06, (R4() - 0.5) * 0.1, (R4() - 0.5) * 0.12] });
    P3.pop();
  }
  P3.add("burlap", softBox(0.2, 0.26, 0.16, 0.08, 4), [0.5, 0.36, 0.22], { p: [W * 0.3, 0.13, 0.42] });
  P3.add("burlap", softBox(0.15, 0.14, 0.14, 0.065, 4), [0.5, 0.36, 0.22], { p: [W * 0.3, 0.32, 0.43] });
  P3.col([-W / 2, 0.5, -0.04], [W / 2, Hb + 0.2, 0.06], { surface: "wood" });
  for (const s of [-1, 1]) P3.col([s * W / 2 - 0.05, 0, -0.05], [s * W / 2 + 0.05, 0.5, 0.05], { surface: "metal", noNav: true });
  P3.col([-W / 2, 0, -0.04], [W / 2, 0.6, 0.3], { surface: "wood", noBullet: true });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var busShelter2 = (seed = 1, o = {}) => proto("fshelter" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("busShelter", seed), A = o.atlas, R4 = rng(seed * 73 + 19), W = 4.2, D = 1.5, Hh = 2.35, lit = o.lit ?? 1, smash = o.smash ?? [1], GRN = [0.08, 0.22, 0.14];
  for (let k = 0; k < 4; k++) {
    const x = -W / 2 + k * W / 3;
    P3.box("paint", 0.07, Hh, 0.07, x, 0, -D / 2, { base: true, col: GRN, b: 8e-3 });
    P3.box("paint", 0.16, 0.012, 0.16, x, 6e-3, -D / 2, { col: GRN, b: 0 });
    P3.tube("paint", [[x, Hh - 0.05, -D / 2], [x, Hh + 0.06, -D / 2 + 0.3], [x, Hh - 0.02, D / 2 + 0.25]], 0.028, { seg: 6, samples: 8, col: GRN });
  }
  {
    const g2 = quadXY(W + 0.3, D + 0.5, null, 6, 8);
    deform(g2, (q) => {
      const t = q.y / (D + 0.5) + 0.5;
      q.z = -D / 2 - 0.12 + t * (D + 0.5);
      q.y = Hh + 0.02 + 0.14 * Math.sin(t * PI5 * 0.8) - 0.06 * t;
    });
    g2.computeVertexNormals();
    P3.add("glassT", g2, null);
    P3.box("paint", W + 0.3, 0.05, 0.07, 0, Hh - 0.03, D / 2 + 0.36, { col: GRN, b: 0.01 });
    P3.box("paint", W + 0.3, 0.05, 0.05, 0, Hh + 0, -D / 2 - 0.12, { col: GRN, b: 0.01 });
  }
  for (const y of [0.25, Hh - 0.2]) P3.box("paint", W, 0.04, 0.04, 0, y, -D / 2, { col: GRN, b: 6e-3 });
  for (let k = 0; k < 3; k++) {
    const x = -W / 2 + (k + 0.5) * W / 3;
    if (smash.includes(k)) {
      for (let j = 0; j < 7; j++) P3.ext("glass", [[0, 0], [0.12 + R4() * 0.1, 0], [0.05 + R4() * 0.05, 0.1 + R4() * 0.22]], -3e-3, 3e-3, { plane: "xy", bevel: 0, p: [x - W / 6 + 0.05 + j * 0.18, 0.27, -D / 2] });
      for (let j = 0; j < 16; j++) P3.box("glass", 0.03 + R4() * 0.04, 8e-3, 0.03 + R4() * 0.04, x + (R4() - 0.5) * 1.3, 6e-3, -D / 2 + (R4() - 0.3) * 0.9, { b: 0, r: [0, R4() * 3, 0] });
    } else P3.box("glass", W / 3 - 0.09, Hh - 0.5, 8e-3, x, 0.27 + (Hh - 0.5) / 2, -D / 2, { b: 0 });
  }
  P3.box("paint", 0.04, 0.04, D, W / 2, 0.25, 0, { col: GRN, b: 6e-3 });
  P3.box("paint", 0.04, 0.04, D, W / 2, Hh - 0.2, 0, { col: GRN, b: 6e-3 });
  P3.box("paint", 0.06, Hh - 0.1, 0.06, W / 2, 0, D / 2, { base: true, col: GRN, b: 8e-3 });
  P3.box("glass", 8e-3, Hh - 0.5, D - 0.1, W / 2, 0.27 + (Hh - 0.5) / 2, 0, { b: 0 });
  P3.tube("galv", [[-W / 2 + 0.3, 0.02, -D / 2 + 0.28], [-W / 2 + 0.3, 0.62, -D / 2 + 0.34], [W / 2 - 0.5, 0.62, -D / 2 + 0.34], [W / 2 - 0.5, 0.02, -D / 2 + 0.28]], 0.03, { seg: 7, samples: 0, col: ALU6 });
  P3.box("plastic", W - 1, 0.04, 0.16, -0.1, 0.66, -D / 2 + 0.36, { col: [0.5, 0.1, 0.08], b: 0.012 });
  P3.box("paint", 0.1, 1.9, 1.2, -W / 2, 0.3, 0.05, { base: true, col: [0.14, 0.14, 0.15], b: 0.012 });
  for (const s of [-1, 1]) {
    P3.box(lit === 2 ? "lampTubeF" : lit ? "lampCyan" : "glass", 0.01, 1.7, 1.04, -W / 2 + s * 0.052, 1.25, 0.05, { b: 0 });
    if (A) P3.quad(lit ? "decalF" : "signF", 0.9, 0.9 / A.aspect(s > 0 ? "rules" : "capacity"), A.rect(s > 0 ? "rules" : "capacity"), { p: [-W / 2 + s * 0.06, 1.3, 0.05], r: [0, s * H, 0] });
  }
  if (lit) {
    P3.glow("fill", [-W / 2 + 0.6, 1.3, 0.1], { col: [0.5, 0.9, 1], power: 6, dist: 8, dir: [1, 0, 0], cone: 1.2, tube: lit === 2 ? 1 : 0 });
    P3.glow("flare", [-W / 2 + 0.07, 1.4, 0.05], { col: [0.5, 0.9, 1], size: 0.9, flick: lit === 2 });
  }
  P3.bar("galv", [W / 2 + 0.9, 0, D / 2 - 0.1], [W / 2 + 0.9, 2.9, D / 2 - 0.1], 0.03, { col: ALU6 });
  if (A) {
    const nm = o.name || "parkBus", s2 = 0.5;
    P3.box("paint", s2 + 0.04, s2 + 0.04, 0.012, W / 2 + 0.9 + s2 / 2 + 0.04, 2.6, D / 2 - 0.1, { col: [0.14, 0.14, 0.15], b: 3e-3 });
    for (const s of [-1, 1]) P3.quad("signF", s2, s2, A.rect(nm), { p: [W / 2 + 0.9 + s2 / 2 + 0.04, 2.6, D / 2 - 0.1 + s * 8e-3], r: [0, s > 0 ? 0 : PI5, 0] });
  }
  P3.col([-W / 2, 0, -D / 2 - 0.05], [W / 2, Hh, -D / 2 + 0.05], { surface: "glass" });
  P3.col([-W / 2 - 0.06, 0, -D / 2], [-W / 2 + 0.06, 2.2, 0.65], { surface: "metal" });
  P3.col([W / 2 - 0.04, 0, -D / 2], [W / 2 + 0.04, Hh, D / 2], { surface: "glass" });
  P3.col([-W / 2 + 0.3, 0, -D / 2 + 0.2], [W / 2 - 0.5, 0.7, -D / 2 + 0.45], { surface: "metal", noNav: true });
  P3.col([W / 2 + 0.85, 0, D / 2 - 0.15], [W / 2 + 0.95, 2.9, D / 2 - 0.05], { surface: "metal", noNav: true });
  P3.col([-W / 2 - 0.2, Hh, -D / 2 - 0.2], [W / 2 + 0.2, Hh + 0.2, D / 2 + 0.4], { surface: "glass", bulletOnly: true });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var parkLamp = (seed = 1, o = {}) => proto("fplamp" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("parkLamp", seed), A = o.atlas, Hh = o.h || 6.5, on = o.on ?? 1, arms = o.twin ? [1, -1] : [1];
  P3.push({ r: [o.lean || 0, 0, (o.lean || 0) * 0.4] });
  P3.box("concrete", 0.5, 0.12, 0.5, 0, 0, 0, { base: true, col: [0.7, 0.7, 0.68], b: 0.02 });
  P3.cyl("galv", 0.17, 0.02, 0, 0.13, 0, { seg: 8, col: [0.6, 0.62, 0.64] });
  for (let k = 0; k < 4; k++) P3.cyl("steel", 0.016, 0.04, Math.cos(k * H + 0.78) * 0.13, 0.15, Math.sin(k * H + 0.78) * 0.13, { seg: 6, col: STEELC3 });
  P3.lathe("galv", [[0.085, 0.14], [0.085, 1.2], [0.07, 1.26], [0.045, Hh - 0.05], [0.04, Hh]], { seg: 8, col: [0.6, 0.62, 0.64], crease: 20 });
  P3.box("galv", 0.09, 0.4, 0.01, 0, 0.75, 0.082, { col: [0.55, 0.57, 0.59], b: 3e-3 });
  P3.cyl("steel", 8e-3, 0.012, 0, 0.9, 0.09, { axis: "z", seg: 6, col: STEELC3 });
  for (const s of arms) {
    P3.tube("galv", [[0, Hh - 0.3, 0], [0, Hh + 0.05, s * 0.15], [0, Hh + 0.12, s * 0.9]], 0.028, { seg: 7, samples: 8, col: [0.6, 0.62, 0.64] });
    P3.push({ p: [0, Hh + 0.1, s * 1.05], r: [s * 0.09, 0, 0] });
    P3.add("paint", softBox(0.3, 0.085, 0.62, 0.03, 4), [0.3, 0.31, 0.33], { p: [0, 0, 0] });
    for (let f3 = 0; f3 < 6; f3++) P3.box("paint", 0.26, 0.02, 8e-3, 0, 0.05, -0.22 + f3 * 0.085, { col: [0.3, 0.31, 0.33], b: 0 });
    P3.box(on === 2 ? "lampFloodF" : on ? "lampFlood" : "glass", 0.24, 6e-3, 0.44, 0, -0.045, 0.04, { b: 0 });
    P3.pop();
    if (on) {
      P3.glow("fill", [0, Hh - 0.5, s * 1.3], { col: COOL2, power: o.power || 15, dist: o.dist || 15, dir: [0, -0.98, s * 0.2], cone: 0.95, flicker: on === 2 ? 1 : 0, pri: 1.5 });
      P3.glow("flare", [0, Hh + 0.04, s * 1.1], { col: COOL2, size: 1.5, flick: on === 2 });
    }
  }
  if (o.cam) {
    P3.bar("galv", [0, Hh - 1, 0], [0, Hh - 1, 0.35], 0.016, { col: [0.6, 0.62, 0.64] });
    P3.lathe("plastic", [[1e-3, -0.09], [0.06, -0.07], [0.085, 0], [0.09, 0.02], [0.09, 0.07], [1e-3, 0.08]], { seg: 12, col: [0.85, 0.85, 0.83], p: [0, Hh - 1.05, 0.35] });
    P3.lathe("glass", [[1e-3, -0.13], [0.05, -0.11], [0.075, -0.06], [0.08, -0.02]], { seg: 12, p: [0, Hh - 1.03, 0.35] });
    P3.box("ledRed", 8e-3, 8e-3, 4e-3, 0.03, Hh - 1, 0.44, { b: 0 });
  }
  if (A && o.sign) {
    const w = 0.45, h = w / A.aspect(o.sign);
    P3.box("galv", w + 0.03, h + 0.03, 6e-3, 0, 2.3, 0.09, { col: ALU6, b: 2e-3 });
    P3.quad("signF", w, h, A.rect(o.sign), { p: [0, 2.3, 0.096] });
    for (const y of [-1, 1]) P3.add("galv", ring(0.075, 6e-3, { seg: 10, radial: 3 }), ALU6, { p: [0, 2.3 + y * h * 0.35, 0], r: [H, 0, 0] });
  }
  P3.pop();
  P3.col([-0.12, 0, -0.12], [0.12, Hh, 0.12], { surface: "metal" });
  return P3.finish({ grime: 0.5, ground: 0.4 });
});
var heightBar = (seed = 1, o = {}) => proto("fhbar" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("heightBar", seed), A = o.atlas, W = o.w || 6.5, Hh = o.h || 3, YEL2 = [0.82, 0.62, 0.05];
  for (const s of [-1, 1]) {
    P3.box("concrete", 0.6, 0.2, 0.6, s * W / 2, 0, 0, { base: true, col: [0.7, 0.7, 0.68], b: 0.03 });
    P3.box("paint", 0.16, Hh + 0.35, 0.16, s * W / 2, 0.2, 0, { base: true, col: YEL2, b: 0.012 });
    for (let j = 0; j < 4; j++) P3.box("paint", 0.164, 0.2, 0.164, s * W / 2, 0.5 + j * 0.4, 0, { col: DK4, b: 0.012 });
    P3.box("paint", 0.2, 0.03, 0.2, s * W / 2, Hh + 0.56, 0, { col: DK4, b: 8e-3 });
  }
  P3.box("paint", W, 0.14, 0.12, 0, Hh + 0.42, 0, { col: YEL2, b: 0.012 });
  P3.push({ p: [0, Hh, 0], r: o.hit ? [0, 0.25, -0.2] : [0, 0, 0] });
  const n = Math.round((W - 0.5) / 0.4);
  for (let k = 0; k < n; k++) P3.box("paint", (W - 0.5) / n, 0.16, 0.05, -W / 2 + 0.25 + (k + 0.5) * ((W - 0.5) / n), 0, 0, { col: k % 2 ? DK4 : YEL2, b: 6e-3 });
  if (A) {
    P3.quad("signF", 0.9, 0.9 / A.aspect("stMax"), A.rect("stMax"), { p: [0, 0, 0.03] });
    P3.quad("signF", 0.9, 0.9 / A.aspect("stMax"), A.rect("stMax"), { p: [0, 0, -0.03], r: [0, PI5, 0] });
  }
  P3.pop();
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.6);
    if (o.hit && s > 0) {
      P3.tube("steel", catenary([x, Hh + 0.35, 0], [x + 0.1, Hh - 0.3, 0.05], 0.02, 5), 8e-3, { seg: 4, col: [0.4, 0.4, 0.4] });
      continue;
    }
    P3.bar("steel", [x, Hh + 0.35, 0], [x + (o.hit ? 0.3 : 0), Hh + 0.08 + (o.hit ? 0.5 : 0), o.hit ? -0.6 : 0], 8e-3, { col: [0.4, 0.4, 0.4] });
  }
  for (const s of [-1, 1]) P3.col([s * W / 2 - 0.12, 0, -0.12], [s * W / 2 + 0.12, Hh + 0.5, 0.12], { surface: "metal" });
  P3.col([-W / 2, Hh - 0.1, -0.08], [W / 2, Hh + 0.5, 0.08], { surface: "metal", bulletOnly: true });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});

