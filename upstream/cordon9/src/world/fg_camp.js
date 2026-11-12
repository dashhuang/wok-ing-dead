var YEL = [0.82, 0.62, 0.05];
var DK3 = [0.1, 0.1, 0.105];
var ALU5 = [0.8, 0.82, 0.84];
var STEELC2 = [0.3, 0.31, 0.33];
var OLV2 = [0.2, 0.22, 0.15];
var WOODC3 = [0.42, 0.33, 0.22];
var ORG = [0.85, 0.42, 0.05];
var COOL = [0.8, 0.93, 1];
var lin3 = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
var sandbag = (P3, x, y, z, ry = 0, s = 1) => {
  const g2 = softBox(0.5 * s, 0.15 * s, 0.28 * s, 0.07 * s, 4);
  deform(g2, (q) => {
    q.y -= 0.12 * q.x * q.x;
  }, true);
  P3.add("burlap", g2, [0.45, 0.41, 0.3], { p: [x, y + 0.08 * s, z], r: [0, ry, 0], jit: 0.12 });
};
var lightTower2 = (seed = 1, o = {}) => proto("ftower" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("lightTower", seed), A = o.atlas, R4 = rng(seed * 73 + 1), Hm = o.h || 7.2, on = o.on ?? 1, tilt = o.tilt ?? 0.62, spin = o.spin || 0, col = o.col || YEL;
  for (const s of [-1, 1]) {
    P3.beam("steel", [-1, 0.42, s * 0.5], [1, 0.42, s * 0.5], 0.1, 0.05, { col: STEELC2 });
    P3.beam("steel", [1, 0.42, s * 0.5], [2.1, 0.42, 0], 0.08, 0.05, { col: STEELC2 });
    addWheel(P3, 0.3, 0.19, -0.1, 0.3, s * 0.78, { axis: "z", out: s, rimCol: [0.8, 0.8, 0.8], seg: 20, nuts: 5 });
    P3.add("paint", ring(0.37, 0.012, { seg: 10, radial: 4, a0: 0, a1: PI5 }), DK3, { p: [-0.1, 0.3, s * 0.78] });
    P3.ext("paint", lin3(0, 1, 8).map((t) => [-0.1 + Math.cos(PI5 * t) * 0.38, 0.3 + Math.sin(PI5 * t) * 0.38]).concat(lin3(1, 0, 8).map((t) => [-0.1 + Math.cos(PI5 * t) * 0.36, 0.3 + Math.sin(PI5 * t) * 0.36])), s * 0.78 - 0.11, s * 0.78 + 0.11, { plane: "xy", col: DK3, bevel: 2e-3 });
  }
  P3.bar("steel", [-0.1, 0.3, -0.7], [-0.1, 0.3, 0.7], 0.035, { col: STEELC2 });
  P3.box("steel", 0.14, 0.1, 0.12, 2.2, 0.44, 0, { col: STEELC2, b: 0.02 });
  P3.cyl("steel", 0.035, 0.08, 2.24, 0.36, 0, { seg: 8, col: [0.5, 0.5, 0.5] });
  P3.bar("steel", [2.15, 0.5, 0], [2.3, 0.62, 0], 0.012, { col: [0.6, 0.1, 0.08] });
  P3.bar("steel", [1.75, 0.42, 0.12], [1.75, 0.1, 0.12], 0.022, { col: STEELC2 });
  P3.cyl("rubber", 0.09, 0.05, 1.75, 0.09, 0.12, { axis: "z", seg: 12, col: DK3 });
  P3.bar("steel", [1.75, 0.7, 0.12], [1.75, 0.42, 0.12], 0.028, { col: STEELC2 });
  P3.bar("steel", [1.75, 0.72, 0.12], [1.87, 0.72, 0.12], 8e-3, { col: STEELC2 });
  P3.box("steel", 0.04, 0.1, 1.5, -1.02, 0.42, 0, { col: STEELC2, b: 6e-3 });
  for (const s of [-1, 1]) {
    P3.box("emRed", 0.02, 0.07, 0.14, -1.045, 0.42, s * 0.6, { b: 6e-3 });
    P3.box("emAmber", 0.02, 0.07, 0.07, -1.045, 0.42, s * 0.44, { b: 6e-3 });
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const a = [sx * 0.85, 0.44, sz * 0.5], b = [sx * 1.45, 0.44, sz * 1.25];
    P3.beam("steel", a, b, 0.06, 0.06, { col: STEELC2 });
    P3.bar("galv", [b[0], 0.6, b[2]], [b[0], 0.05, b[2]], 0.02, { col: ALU5 });
    P3.cyl("steel", 0.1, 0.02, b[0], 0.03, b[2], { seg: 10, col: STEELC2 });
    P3.bar("steel", [b[0] - 0.08, 0.62, b[2]], [b[0] + 0.08, 0.62, b[2]], 8e-3, { col: STEELC2 });
    if (sx > 0 && sz > 0) P3.box("wood", 0.3, 0.04, 0.3, b[0], 0, b[2], { base: true, col: WOODC3, b: 6e-3 });
  }
  P3.add("paint", softBox(1.55, 0.78, 0.92, 0.07, 5), col, { p: [-0.1, 0.9, 0], jit: 0.05 });
  P3.box("steel", 1.6, 0.06, 0.96, -0.1, 0.5, 0, { col: STEELC2, b: 0.01 });
  for (const s of [-1, 1]) {
    for (let j = 0; j < 7; j++) P3.box("black", 0.5, 0.022, 0.01, -0.48, 0.72 + j * 0.055, s * 0.462, { b: 0 });
    P3.box("black", 8e-3, 0.6, 8e-3, 0.05, 0.9, s * 0.463, { b: 0 });
    P3.box("chrome", 0.03, 0.1, 0.02, 0.14, 0.9, s * 0.47, { b: 4e-3 });
    for (const y of [0.68, 1.12]) P3.box("steel", 0.03, 0.07, 0.015, 0.62, y, s * 0.468, { col: DK3, b: 3e-3 });
  }
  P3.cyl("plastic", 0.045, 0.03, 0.5, 1.3, 0.25, { seg: 10, col: DK3 });
  P3.tube("steel", [[-0.6, 1.25, -0.2], [-0.6, 1.5, -0.2], [-0.75, 1.6, -0.2]], 0.03, { seg: 8, samples: 0, col: [0.25, 0.2, 0.17] });
  P3.add("steel", ring(0.06, 0.014, { seg: 10, radial: 5 }), STEELC2, { p: [0, 1.34, 0], r: [0, H, 0] });
  P3.box("plastic", 0.02, 0.34, 0.5, 0.685, 0.95, 0, { col: [0.16, 0.16, 0.17], b: 4e-3 });
  if (A) P3.quad("signF", 0.44, 0.44 / A.aspect("panelSw"), A.rect("panelSw"), { p: [0.697, 0.97, 0], r: [0, H, 0] });
  P3.box(on ? "ledGreen" : "ledRed", 6e-3, 0.02, 0.02, 0.7, 1.08, 0.2, { b: 0 });
  P3.box("glassT", 0.01, 0.38, 0.54, 0.71, 0.95, 0, { b: 2e-3 });
  if (A) for (const s of [-1, 1]) {
    P3.quad("decalF", 0.5, 0.5 / A.aspect("stGen"), A.rect("stGen"), { p: [0.34, 1.08, s * 0.464], r: [0, s > 0 ? 0 : PI5, 0] });
    P3.quad("decalF", 0.3, 0.3 / A.aspect("stDanger"), A.rect("stDanger"), { p: [0.36, 0.72, s * 0.464], r: [0, s > 0 ? 0 : PI5, 0] });
  }
  const mx = -0.75, base = 0.56;
  if (o.stowed) {
    P3.push({ p: [mx, 1.38, 0], r: [0, 0, -H + 0.03] });
  } else P3.push({ p: [mx, base, 0] });
  const Lm = o.stowed ? 3 : Hm - base, secs = [[0, 0.42, 0.07], [0.36, 0.72, 0.055], [0.66, 1, 0.04]];
  for (const [a, b, r] of secs) {
    P3.box("galv", r * 2, (b - a) * Lm, r * 2, 0, a * Lm, 0, { base: true, col: ALU5, b: 6e-3 });
    P3.box("steel", r * 2 + 0.03, 0.06, r * 2 + 0.03, 0, b * Lm - 0.03, 0, { col: STEELC2, b: 6e-3 });
  }
  P3.box("steel", 0.24, 0.3, 0.2, 0.06, 0.5, 0, { col: STEELC2, b: 0.02 });
  P3.cyl("steel", 0.05, 0.14, 0.14, 0.5, 0.14, { axis: "z", seg: 10, col: [0.5, 0.5, 0.5] });
  P3.bar("steel", [0.14, 0.5, 0.22], [0.26, 0.42, 0.22], 0.01, { col: DK3 });
  P3.bar("steel", [0.1, 0.55, 0.1], [0.045, Lm * 0.7, 0.045], 3e-3, { col: [0.6, 0.6, 0.6] });
  {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, a = t * PI5 * 2 * 9;
      pts.push([-0.09 - 0.035 * (1 + Math.cos(a)), 0.3 + t * (Lm - 0.5), 0.045 * Math.sin(a)]);
    }
    P3.add("rubber", tube(pts, 7e-3, 4, { samples: 0 }), DK3);
  }
  P3.push({ p: [0, Lm, 0], r: [0, spin, 0] });
  P3.box("steel", 0.1, 0.14, 0.1, 0, 0.02, 0, { col: STEELC2, b: 0.01 });
  P3.box("galv", 1.9, 0.06, 0.06, 0, 0.12, 0, { col: ALU5, b: 8e-3 });
  for (let k = 0; k < 4; k++) {
    const x = (k - 1.5) * 0.48, dead = on === 0 || (seed + k) % 5 === 0, st = dead ? 0 : on;
    P3.push({ p: [x, 0.12, 0.02], r: [tilt + (k % 2 ? 0.05 : -0.04), (k - 1.5) * 0.09, 0] });
    P3.box("steel", 0.06, 0.1, 0.05, 0, 0, 0.02, { col: STEELC2, b: 8e-3 });
    P3.add("paint", softBox(0.42, 0.3, 0.07, 0.02, 3), [0.14, 0.14, 0.15], { p: [0, 0, 0.09] });
    for (let f3 = 0; f3 < 9; f3++) P3.box("paint", 8e-3, 0.26, 0.03, -0.18 + f3 * 0.045, 0, 0.045, { col: [0.14, 0.14, 0.15], b: 0 });
    P3.box(st === 2 ? "lampFloodF" : st ? "lampFlood" : "glass", 0.37, 0.25, 8e-3, 0, 0, 0.128, { b: 2e-3 });
    P3.box("paint", 0.42, 0.012, 0.05, 0, 0.156, 0.14, { col: [0.14, 0.14, 0.15], b: 2e-3 });
    P3.pop();
  }
  if (on) {
    const d = [0, -Math.sin(tilt), Math.cos(tilt)];
    P3.glow("fill", [0, 0.05, 0.3], { col: COOL, power: o.power || 26, dist: o.dist || 24, dir: d, cone: o.cone || 0.62, flicker: on === 2 ? 1 : 0, pri: 2 });
    P3.glow("flare", [0, 0.1, 0.16], { col: COOL, size: 2, flick: on === 2 });
  }
  P3.pop();
  P3.pop();
  P3.tube("steel", catenary([2.2, 0.42, 0.05], [1.6, 0.4, 0.3], 0.14, 6), 8e-3, { seg: 4, col: [0.4, 0.4, 0.4] });
  for (const s of [-1, 1]) P3.ext("rubber", [[-0.52, 0], [-0.4, 0], [-0.4, 0.14]], s * 0.78 - 0.08, s * 0.78 + 0.08, { plane: "xy", col: YEL, bevel: 4e-3 });
  P3.add("milpaint", softBox(0.34, 0.46, 0.16, 0.035, 3), OLV2, { p: [1.3, 0.72, 0] });
  P3.box("burlap", 0.36, 0.03, 0.17, 1.3, 0.75, 0, { col: DK3, b: 4e-3 });
  P3.col([-1, 0, -0.85], [0.75, 1.35, 0.85], { surface: "metal" });
  P3.col([0.75, 0, -0.3], [2.3, 0.6, 0.3], { surface: "metal", noNav: true });
  if (!o.stowed) P3.col([mx - 0.08, 1.3, -0.08], [mx + 0.08, Hm, 0.08], { surface: "metal", bulletOnly: true });
  return P3.finish({ grime: 0.7, ground: 0.4 });
});
var tripodLamp = (seed = 1, o = {}) => proto("ftripod" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("tripodLamp", seed), on = o.down ? 0 : o.on ?? 1, tilt = o.tilt ?? 0.3, Hh = o.h || 2.1;
  if (o.down) P3.push({ p: [0, 0.14, 0], r: [H - 0.08, 0.4, 0] });
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * PI5 * 2 + 0.5;
    P3.bar("paint", [0, 0.75, 0], [Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55], 0.012, { col: YEL });
    P3.bar("steel", [0, 0.35, 0], [Math.cos(a) * 0.3, 0.36, Math.sin(a) * 0.3], 6e-3, { col: STEELC2 });
    P3.cyl("rubber", 0.02, 0.03, Math.cos(a) * 0.55, 0.015, Math.sin(a) * 0.55, { seg: 6, col: DK3 });
  }
  P3.bar("paint", [0, 0.3, 0], [0, 1.25, 0], 0.016, { col: YEL });
  P3.bar("galv", [0, 1.2, 0], [0, Hh, 0], 0.011, { col: ALU5 });
  P3.cyl("plastic", 0.024, 0.06, 0, 1.24, 0, { seg: 8, col: DK3 });
  P3.cyl("plastic", 0.026, 0.05, 0, 0.75, 0, { seg: 8, col: DK3 });
  P3.box("galv", 0.7, 0.03, 0.03, 0, Hh, 0, { col: ALU5, b: 6e-3 });
  for (const s of [-1, 1]) {
    P3.push({ p: [s * 0.3, Hh + 0.02, 0.02], r: [tilt, s * -0.25, 0] });
    P3.add("paint", softBox(0.3, 0.24, 0.07, 0.02, 3), YEL, { p: [0, 0.1, 0.03] });
    P3.box(on === 2 ? "lampFloodF" : on ? "lampFlood" : "glass", 0.25, 0.19, 8e-3, 0, 0.1, 0.068, { b: 2e-3 });
    for (let f3 = 0; f3 < 6; f3++) P3.box("black", 0.26, 6e-3, 0.02, 0, 0.02 + f3 * 0.032, -0.012, { b: 0 });
    P3.tube("steel", [[-0.16, 0.1, 0.03], [-0.19, 0.1, 0.03], [-0.19, -0.02, 0], [0.19, -0.02, 0], [0.19, 0.1, 0.03], [0.16, 0.1, 0.03]], 6e-3, { seg: 4, samples: 0, col: DK3 });
    P3.pop();
  }
  if (on) {
    P3.glow("fill", [0, Hh + 0.1, 0.3], { col: COOL, power: o.power || 13, dist: o.dist || 14, dir: [0, -Math.sin(tilt), Math.cos(tilt)], cone: o.cone || 0.72, flicker: on === 2 ? 1 : 0 });
    P3.glow("flare", [0, Hh + 0.12, 0.1], { col: COOL, size: 1.2, flick: on === 2 });
  }
  P3.tube("rubber", [[0, Hh - 0.05, -0.02], [0.03, 1.4, -0.03], [0.02, 0.5, -0.05], [0.2, 0.02, -0.3], [0.5, 0.015, -0.8], [0.3, 0.015, -1.4]], 7e-3, { seg: 4, samples: 16, col: ORG });
  if (o.down) P3.pop();
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.4, ground: 0.2 });
});
var generator = (seed = 1, o = {}) => proto("fgen" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("generator", seed), A = o.atlas, R4 = rng(seed * 89 + 6), col = o.col || OLV2, L = 2.6, W = 1.1, Hh = 1.45, on = o.on ?? 1;
  for (const s of [-1, 1]) {
    P3.beam("steel", [-L / 2, 0.1, s * 0.45], [L / 2, 0.1, s * 0.45], 0.2, 0.08, { col: STEELC2 });
    for (const x of [-0.6, 0.6]) P3.box("black", 0.3, 0.1, 0.09, x, 0.1, s * 0.455, { b: 0 });
    for (const x of [-L / 2 + 0.12, L / 2 - 0.12]) P3.add("steel", ring(0.05, 0.014, { seg: 8, radial: 4 }), STEELC2, { p: [x, 0.26, s * 0.5] });
  }
  P3.box("steel", L, 0.16, W, 0, 0.28, 0, { col: STEELC2, b: 0.012 });
  P3.add("milpaint", softBox(L - 0.06, Hh - 0.36, W - 0.04, 0.05, 5), col, { p: [0, 0.36 + (Hh - 0.36) / 2, 0], jit: 0.06 });
  for (const s of [-1, 1]) {
    for (const x of [-0.62, 0.62]) {
      if (s > 0 && x > 0) continue;
      P3.box("milpaint", 1.1, Hh - 0.6, 0.016, x, 0.48, s * (W / 2 - 0.016), { base: true, col, b: 6e-3 });
      P3.box("chrome", 0.04, 0.12, 0.02, x + 0.45, 0.95, s * (W / 2 - 4e-3), { b: 4e-3 });
      for (const y of [0.6, 1.2]) P3.box("steel", 0.03, 0.08, 0.016, x - 0.52, y, s * (W / 2 - 6e-3), { col: DK3, b: 3e-3 });
    }
  }
  for (let j = 0; j < 11; j++) P3.box("black", 0.012, 0.03, W - 0.3, -L / 2 + 0.022, 0.55 + j * 0.07, 0, { b: 0 });
  for (let j = 0; j < 9; j++) for (let i = 0; i < 2; i++) P3.box("black", 0.012, 0.045, 0.36, L / 2 - 0.022, 0.56 + j * 0.085, -0.2 + i * 0.4, { b: 0 });
  P3.box("black", 1.06, Hh - 0.64, 0.01, 0.62, 0.5, W / 2 - 0.03, { base: true, b: 0 });
  P3.box("plastic", 0.9, 0.6, 0.06, 0.62, 0.62, W / 2 - 0.07, { base: true, col: [0.2, 0.2, 0.21], b: 8e-3 });
  if (A) P3.quad("signF", 0.8, 0.8 / A.aspect("gauges"), A.rect("gauges"), { p: [0.62, 0.95, W / 2 - 0.038] });
  P3.box(on ? "ledGreen" : "ledRed", 0.03, 0.03, 6e-3, 0.32, 1.16, W / 2 - 0.036, { b: 0 });
  P3.box("ledRed", 0.03, 0.03, 6e-3, 0.4, 1.16, W / 2 - 0.036, { b: 0 });
  P3.cyl("plastic", 0.035, 0.03, 0.92, 1.14, W / 2 - 0.03, { axis: "z", seg: 10, col: [0.7, 0.1, 0.08] });
  P3.push({ p: [1.17, 0.48, W / 2 - 0.01], r: [0, 1.9, 0] });
  P3.box("milpaint", 1.1, Hh - 0.6, 0.016, -0.55, 0, 0, { base: true, col, b: 6e-3 });
  if (A) P3.quad("decalF", 0.6, 0.6 / A.aspect("stGen"), A.rect("stGen"), { p: [-0.55, 0.55, -0.01], r: [0, PI5, 0] });
  P3.pop();
  if (on) P3.glow("fill", [0.62, 1, W / 2 + 0.5], { col: [0.25, 1, 0.45], power: 0.5, dist: 2.6, dir: [0, 0, 1], cone: 1.1 });
  P3.box("plastic", 0.6, 0.2, 0.05, -0.6, 0.5, W / 2 + 0.01, { col: [0.16, 0.16, 0.17], b: 6e-3 });
  for (let k = 0; k < 3; k++) {
    P3.cyl("plastic", 0.045, 0.06, -0.8 + k * 0.2, 0.5, W / 2 + 0.05, { axis: "z", seg: 10, col: k === 1 ? [0.7, 0.1, 0.08] : [0.1, 0.25, 0.6] });
    P3.tube("rubber", [[-0.8 + k * 0.2, 0.5, W / 2 + 0.08], [-0.8 + k * 0.2, 0.3, W / 2 + 0.22], [-0.7 + k * 0.3, 0.02, W / 2 + 0.4], [-0.4 + k * 0.6, 0.02, W / 2 + 0.9]], 0.012, { seg: 5, samples: 10, col: k === 1 ? ORG : DK3 });
  }
  P3.cyl("steel", 0.05, 0.5, -0.8, Hh + 0.22, -0.2, { seg: 10, col: [0.25, 0.2, 0.17] });
  P3.box("steel", 0.13, 8e-3, 0.11, -0.8, Hh + 0.5, -0.2, { col: [0.25, 0.2, 0.17], b: 2e-3, r: [0, 0, 0.5] });
  P3.add("steel", ring(0.07, 0.016, { seg: 10, radial: 5 }), STEELC2, { p: [0, Hh + 0.05, 0], r: [0, H, 0] });
  P3.cyl("plastic", 0.05, 0.04, 0.9, Hh + 0.01, 0.2, { seg: 10, col: [0.7, 0.1, 0.08] });
  if (A) P3.quad("decalF", 0.5, 0.5 / A.aspect("stFuel"), A.rect("stFuel"), { p: [0.9, Hh - 0.3, -W / 2 + 0.014], r: [0, PI5, 0] });
  P3.bar("steel", [L / 2 + 0.3, 0.5, -0.4], [L / 2 + 0.3, -0.05, -0.4], 0.01, { col: [0.6, 0.35, 0.15] });
  P3.tube("steel", [[L / 2, 0.3, -0.4], [L / 2 + 0.15, 0.2, -0.4], [L / 2 + 0.3, 0.42, -0.4]], 5e-3, { seg: 4, col: [0.3, 0.6, 0.2] });
  const drum2 = (x, y, z, r, c) => {
    P3.push({ p: [x, y, z], r });
    P3.lathe("paint", [[1e-3, 0], [0.285, 0], [0.29, 0.02], [0.285, 0.04], [0.285, 0.29], [0.295, 0.3], [0.285, 0.31], [0.285, 0.58], [0.295, 0.59], [0.285, 0.6], [0.285, 0.85], [0.29, 0.87], [0.285, 0.88], [0.27, 0.88], [0.27, 0.86], [1e-3, 0.86]], { seg: 18, col: c });
    P3.cyl("steel", 0.03, 0.02, 0.18, 0.875, 0, { seg: 8, col: [0.5, 0.5, 0.5] });
    P3.pop();
  };
  drum2(-L / 2 - 0.6, 0, 0.2, [0, R4() * 3, 0], [0.5, 0.1, 0.08]);
  drum2(-L / 2 - 0.55, 0.42, -0.75, [H, 0, 0.3], [0.12, 0.2, 0.4]);
  for (const s of [-1, 1]) P3.box("wood", 0.1, 0.12, 0.7, -L / 2 - 0.55 + s * 0.2 - 0.12, 0.06, -0.33, { col: WOODC3, b: 0.01, r: [0, 0.3, 0] });
  P3.bar("steel", [-L / 2 - 0.42, 0.88, 0.2], [-L / 2 - 0.42, 1.25, 0.2], 0.018, { col: [0.6, 0.1, 0.08] });
  P3.tube("steel", [[-L / 2 - 0.42, 1.2, 0.2], [-L / 2 - 0.2, 1.25, 0.2], [-L / 2 - 0.1, 1.1, 0.2]], 0.012, { seg: 5, col: [0.6, 0.1, 0.08] });
  P3.tube("rubber", [[-L / 2 - 0.1, 1.1, 0.2], [-L / 2, 0.6, 0.3], [-L / 2 + 0.2, 0.05, 0.75]], 0.012, { seg: 5, col: DK3 });
  P3.col([-L / 2, 0, -W / 2], [L / 2, Hh, W / 2], { surface: "metal" });
  P3.col([-L / 2 - 0.95, 0, -0.95], [-L / 2 - 0.2, 0.88, 0.5], { surface: "metal" });
  return P3.finish({ grime: 0.9, ground: 0.5 });
});
var distBoard = (seed = 1, o = {}) => proto("fdist" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("distBoard", seed), A = o.atlas, on = o.on ?? 1;
  for (const s of [-1, 1]) {
    P3.tube("galv", [[s * 0.3, 0.02, -0.3], [s * 0.3, 0.02, 0.3]], 0.016, { seg: 6, samples: 0, col: ALU5 });
    P3.tube("galv", [[s * 0.3, 0.02, 0], [s * 0.26, 1.3, 0]], 0.016, { seg: 6, samples: 0, col: ALU5 });
    sandbag(P3, s * 0.3, 0.02, 0.18, 0.2 * s, 0.8);
  }
  P3.add("plastic", softBox(0.62, 0.7, 0.2, 0.03, 3), YEL, { p: [0, 0.98, 0] });
  P3.box("glassT", 0.5, 0.26, 0.01, 0, 1.14, 0.104, { b: 2e-3 });
  for (let k = 0; k < 8; k++) P3.box("plastic", 0.035, 0.09, 0.03, -0.2 + k * 0.057, 1.14, 0.09, { col: k === 2 ? [0.7, 0.1, 0.08] : [0.85, 0.85, 0.82], b: 4e-3 });
  for (let k = 0; k < 4; k++) {
    const x = -0.21 + k * 0.14, c = k % 2 ? [0.1, 0.25, 0.6] : [0.7, 0.1, 0.08];
    P3.cyl("plastic", 0.04, 0.05, x, 0.82, 0.11, { axis: "z", seg: 10, col: c });
    if (k !== 1) P3.tube("rubber", [[x, 0.82, 0.14], [x, 0.6, 0.25], [x * 2, 0.03, 0.4 + k * 0.1], [x * 5, 0.02, 0.9 + k * 0.2]], 0.01, { seg: 5, samples: 10, col: k === 2 ? ORG : DK3 });
  }
  P3.box(on ? "ledGreen" : "ledRed", 0.03, 0.03, 0.01, 0.24, 1.26, 0.102, { b: 0 });
  if (A) P3.quad("decalF", 0.4, 0.4 / A.aspect("stDanger"), A.rect("stDanger"), { p: [0, 0.69, 0.102] });
  P3.col([-0.32, 0, -0.12], [0.32, 1.35, 0.12], { surface: "plastic", noNav: true });
  return P3.finish({ grime: 0.5, ground: 0.3 });
});
var cableRun = (seed = 1, o = {}) => proto("fcable" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("cableRun", seed), R4 = rng(seed * 7 + 5), pts = o.pts || [[0, 0], [4, 0]], n = o.n || 2, ramps = o.ramps || [], COLS2 = [DK3, ORG, [0.12, 0.12, 0.3]];
  for (let c = 0; c < n; c++) {
    const path = [], off = (c - (n - 1) / 2) * 0.05;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len, st = Math.max(2, Math.round(len / 0.7));
      for (let k = 0; k < st; k++) {
        const t = k / st, w = ramps.includes(i) ? 0 : 0.06 * Math.sin(t * len * 2.1 + c * 2 + i) + (R4() - 0.5) * 0.03;
        path.push([lerp2(a[0], b[0], t) + nx * (off + w), 0.014 + c * 4e-3, lerp2(a[1], b[1], t) + nz * (off + w)]);
      }
    }
    const e = pts[pts.length - 1];
    path.push([e[0], 0.014, e[1] + off]);
    P3.add("rubber", tube(path, 0.011 + (c === 0 ? 4e-3 : 0), 5, { samples: 0 }), COLS2[c % 3]);
  }
  for (const i of ramps) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), m = Math.max(1, Math.round(len / 0.9));
    for (let k = 0; k < m; k++) {
      const t = (k + 0.5) / m;
      P3.push({ p: [lerp2(a[0], b[0], t), 0, lerp2(a[1], b[1], t)], r: [0, ry, 0] });
      P3.ext("rubber", [[-0.3, 0], [0.3, 0], [0.14, 0.06], [-0.14, 0.06]], -len / m / 2 + 6e-3, len / m / 2 - 6e-3, { plane: "side", col: DK3, bevel: 4e-3, r: [0, H, 0] });
      P3.box("plastic", len / m - 0.02, 0.012, 0.26, 0, 0.062, 0, { col: YEL, b: 3e-3 });
      P3.pop();
    }
  }
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var duckboard = (seed = 1, o = {}) => proto("fduck" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("duckboard", seed), R4 = rng(seed * 3 + 9), n = o.n || 4, w = o.w || 1, PL = 1.8, sunk = o.sunk || [], gone = o.gone || [];
  for (let k = 0; k < n; k++) {
    if (gone.includes(k)) continue;
    const x = (k - (n - 1) / 2) * (PL + 0.03), sk = sunk.includes(k);
    P3.push({ p: [x + (R4() - 0.5) * 0.04, sk ? -0.01 : 0.012, (R4() - 0.5) * 0.06], r: [sk ? (R4() - 0.5) * 0.14 : (R4() - 0.5) * 0.02, (R4() - 0.5) * 0.05, sk ? (R4() - 0.5) * 0.1 : 0] });
    for (const z of [-w / 2 + 0.08, 0, w / 2 - 0.08]) P3.box("wood", PL, 0.045, 0.07, 0, 0.022, z, { col: [0.36, 0.3, 0.2], b: 6e-3 });
    const sl = Math.floor(PL / 0.13);
    for (let i = 0; i < sl; i++) {
      if (R4() < 0.05) continue;
      P3.box("wood", 0.1, 0.028, w, -PL / 2 + 0.065 + i * 0.13, 0.059, 0, { col: [0.45 + R4() * 0.1, 0.37 + R4() * 0.08, 0.25 + R4() * 0.05], b: 5e-3, r: [0, (R4() - 0.5) * 0.03, 0] });
    }
    P3.pop();
  }
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.9, ground: 0.6 });
});
var crowdBarrier2 = (seed = 1, o = {}) => proto("fcrowd" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("crowdBarrier", seed), A = o.atlas, R4 = rng(seed * 19 + 4), n = o.n || 3, PL = 2.3, down = o.down || [], gap = o.gap || [];
  for (let k = 0; k < n; k++) {
    if (gap.includes(k)) continue;
    const x = (k - (n - 1) / 2) * (PL + 0.06), dn = down.includes(k);
    P3.push(dn ? { p: [x, 0.03, 0.5], r: [H - 0.03, (R4() - 0.5) * 0.5, 0] } : { p: [x, 0, 0], r: [(R4() - 0.5) * 0.05, (R4() - 0.5) * 0.08, 0] });
    P3.tube("galv", [[-PL / 2, 0.12, 0], [-PL / 2, 1.08, 0], [PL / 2, 1.08, 0], [PL / 2, 0.12, 0]], 0.019, { seg: 6, samples: 0, col: ALU5 });
    P3.bar("galv", [-PL / 2, 0.2, 0], [PL / 2, 0.2, 0], 0.016, { col: ALU5 });
    for (let i = 1; i < 17; i++) P3.bar("galv", [-PL / 2 + i * PL / 17, 0.2, 0], [-PL / 2 + i * PL / 17, 1.08, 0], 7e-3, { col: ALU5 });
    for (const s of [-1, 1]) {
      P3.tube("galv", [[s * (PL / 2 - 0.02), 0.12, 0], [s * (PL / 2 - 0.02), 0.03, 0.3], [s * (PL / 2 - 0.02), 0.03, -0.3], [s * (PL / 2 - 0.02), 0.12, 0]], 0.014, { seg: 5, samples: 0, col: ALU5 });
    }
    P3.add("galv", ring(0.03, 7e-3, { seg: 8, radial: 4, a0: 0, a1: PI5 * 1.5 }), ALU5, { p: [PL / 2 + 0.03, 0.9, 0] });
    P3.add("galv", ring(0.03, 7e-3, { seg: 8, radial: 4, a0: 0, a1: PI5 * 1.5 }), ALU5, { p: [PL / 2 + 0.03, 0.4, 0] });
    if (A && o.sign && k === Math.floor(n / 2) && !dn) {
      const sw = 1, sh = sw / A.aspect(o.sign);
      P3.quad("signF", sw, sh, A.rect(o.sign), { p: [0, 0.64, 0.024] });
    }
    if (A && o.tape && !dn) {
      const tw = PL * 0.96, g2 = quadXY(tw, 0.07, [...A.rect("tape")], 6, 1);
      deform(g2, (q) => {
        q.y += 0.02 * Math.sin(q.x * 5 + k);
        q.z += 0.012 * Math.sin(q.x * 11);
      });
      P3.add("signF", g2, null, { p: [0, 1, 0.03] });
    }
    P3.pop();
    if (!dn) P3.col([x - PL / 2, 0, -0.06], [x + PL / 2, 1.1, 0.06], { surface: "metal" });
  }
  if (!P3.cols.length) P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.5, ground: 0.3 });
});
var tapeLine = (seed = 1, o = {}) => proto("ftape" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("tapeLine", seed), A = o.atlas, R4 = rng(seed * 29 + 8), len = o.len || 8, n = Math.max(2, Math.round(len / 2.6) + 1), nm = o.rw ? "tapeRW" : "tape";
  for (let k = 0; k < n; k++) {
    const x = -len / 2 + k * len / (n - 1), lz3 = (R4() - 0.5) * 0.14, lx3 = (R4() - 0.5) * 0.14;
    P3.bar("steel", [x, -0.02, 0], [x + lx3, 1.12, lz3], 7e-3, { col: [0.25, 0.2, 0.17] });
    P3.add("steel", ring(0.02, 5e-3, { seg: 8, radial: 3, a0: 0, a1: PI5 * 1.6 }), [0.25, 0.2, 0.17], { p: [x + lx3, 1.14, lz3] });
    P3.lathe("plastic", [[0.02, 0], [0.03, 0.03], [1e-3, 0.06]], { seg: 8, col: ORG, p: [x + lx3, 1.16, lz3] });
    if (k < n - 1 && A) {
      const x1 = -len / 2 + (k + 1) * len / (n - 1), span = x1 - x, snapped = o.snap != null && o.snap > k / (n - 1) && o.snap <= (k + 1) / (n - 1), g2 = quadXY(span, 0.075, [...A.rect(nm)], 10, 1);
      deform(g2, (q) => {
        const t = q.x / span + 0.5;
        if (snapped) {
          q.y += 1 - 1 * Math.pow(t, 0.6) + (t > 0.7 ? 0.02 : 0);
          q.z += 0.3 * t * Math.sin(t * 7);
          q.x -= span * 0.25 * t * t;
        } else {
          q.y += 1.02 - 0.12 * Math.sin(t * PI5);
          q.z += 0.02 * Math.sin(t * 9 + k);
        }
      });
      g2.computeVertexNormals();
      P3.add("signF", g2, null, { p: [x + span / 2, 0, 0] });
    }
  }
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.3, ground: 0.2 });
});
var waySign = (seed = 1, o = {}) => proto("fway" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("waySign", seed), A = o.atlas, w = o.w || 1.8, nm = o.name || "wayTriage", h1 = A ? w / A.aspect(nm) : 0.45, yc = o.h || 1.9, h2 = o.name2 && A ? w / A.aspect(o.name2) : 0, top = yc + h1 / 2 + 0.1;
  P3.push({ r: [o.lean || 0, 0, (o.lean || 0) * 0.5] });
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.12);
    P3.box("wood", 0.07, top, 0.07, x, 0, -0.045, { base: true, col: WOODC3, b: 6e-3 });
    P3.beam("wood", [x, 0.9, -0.08], [x, 0.03, -0.7], 0.045, 0.045, { col: WOODC3 });
    sandbag(P3, x, 0, -0.5, 0.3 * s);
    sandbag(P3, x + 0.05 * s, 0, 0.12, -0.2 * s);
  }
  if (A) {
    P3.box("wood", w, h1 + 0.04, 0.02, 0, yc, -5e-3, { col: [0.3, 0.3, 0.3], b: 4e-3 });
    P3.quad("signF", w, h1, A.rect(nm), { p: [0, yc, 8e-3] });
    if (o.name2) {
      P3.box("wood", w, h2 + 0.04, 0.02, 0, yc - h1 / 2 - h2 / 2 - 0.08, -5e-3, { col: [0.3, 0.3, 0.3], b: 4e-3 });
      P3.quad("signF", w, h2, A.rect(o.name2), { p: [0, yc - h1 / 2 - h2 / 2 - 0.08, 8e-3] });
    }
    if (o.graf) {
      const gw = w * 0.9, gh = gw / A.aspect(o.graf);
      P3.quad("decalF", gw, gh, A.rect(o.graf), { p: [0.05, yc - 0.1, 0.014], r: [0, 0, -0.06] });
    }
  }
  P3.pop();
  for (const s of [-1, 1]) P3.col([s * (w / 2 - 0.12) - 0.06, 0, -0.1], [s * (w / 2 - 0.12) + 0.06, top, 0.02], { surface: "wood", noNav: true });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var boomGate2 = (seed = 1, o = {}) => proto("fboom" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("boomGate", seed), A = o.atlas, len = o.len || 5.5, up = o.up ?? 0, RED = [0.62, 0.08, 0.06], WHT3 = [0.86, 0.86, 0.84];
  P3.box("concrete", 0.7, 0.14, 0.7, 0, 0, 0, { base: true, col: [0.72, 0.72, 0.7], b: 0.02 });
  P3.add("paint", softBox(0.36, 1, 0.36, 0.03, 3), [0.9, 0.55, 0.05], { p: [0, 0.64, 0] });
  P3.box("paint", 0.4, 0.05, 0.4, 0, 1.16, 0, { col: DK3, b: 0.012 });
  P3.box("black", 0.26, 0.4, 8e-3, 0, 0.6, 0.182, { b: 0 });
  P3.box("chrome", 0.03, 0.06, 0.02, 0.1, 0.6, 0.19, { b: 4e-3 });
  P3.cyl("steel", 0.035, 0.5, 0, 1, 0, { axis: "z", seg: 10, col: STEELC2 });
  P3.push({ p: [0, 1, 0.23], r: [0, 0, up] });
  const L1 = o.snapped ? len * 0.45 : len;
  for (let k = 0; k < Math.ceil(L1 / 0.5); k++) {
    const x0 = k * 0.5, x1 = Math.min(L1, x0 + 0.5);
    P3.cyl("paint", 0.045, x1 - x0, (x0 + x1) / 2, 0, 0, { axis: "x", seg: 10, col: k % 2 ? WHT3 : RED });
  }
  P3.box("steel", 0.9, 0.12, 0.08, -0.45, 0, 0, { col: STEELC2, b: 0.01 });
  P3.box("steel", 0.3, 0.34, 0.2, -0.85, -0.06, 0, { col: [0.2, 0.2, 0.21], b: 0.02 });
  if (A && !o.snapped) {
    P3.quad("signF", 0.6, 0.6, A.rect("stopArm"), { p: [len * 0.5, -0.38, 0.01] });
    P3.quad("signF", 0.6, 0.6, A.rect("stopArm"), { p: [len * 0.5, -0.38, -0.01], r: [0, PI5, 0] });
    for (const e of [-0.2, 0.2]) P3.bar("steel", [len * 0.5 + e, 0, 0], [len * 0.5 + e, -0.12, 0], 4e-3, { col: [0.5, 0.5, 0.5] });
  }
  if (!o.snapped) for (let k = 0; k < 6; k++) P3.bar("steel", [1.2 + k * 0.7, -0.04, 0], [1.2 + k * 0.7, -0.5 - k % 2 * 0.1, 0.02 * k], 3e-3, { col: [0.5, 0.5, 0.5] });
  P3.cyl(o.lamp ? "emRedB" : "emRed", 0.04, 0.05, L1 - 0.3, 0.07, 0, { seg: 8 });
  if (o.lamp) {
    const a = [(L1 - 0.3) * Math.cos(up), 1.07 + (L1 - 0.3) * Math.sin(up), 0.23];
    P3.glow("blink", [L1 - 0.3, 0.2, 0], { col: [1, 0.1, 0.05], power: 4, dist: 7, mat: "emRedB" });
  }
  P3.pop();
  if (o.snapped) {
    P3.push({ p: [len * 0.7, 0.05, 1.1], r: [0, 0.5, 0] });
    for (let k = 0; k < 5; k++) P3.cyl("paint", 0.045, 0.5, k * 0.5, 0, 0, { axis: "x", seg: 10, col: k % 2 ? WHT3 : RED });
    P3.pop();
  }
  P3.box("paint", 0.1, 1.05, 0.1, len - 0.1, 0, 0.23, { base: true, col: [0.9, 0.55, 0.05], b: 0.01 });
  P3.tube("steel", [[len - 0.1, 1.05, 0.15], [len - 0.1, 0.95, 0.15], [len - 0.1, 0.95, 0.31], [len - 0.1, 1.05, 0.31]], 0.012, { seg: 5, samples: 0, col: STEELC2 });
  P3.col([-0.25, 0, -0.25], [0.25, 1.2, 0.25], { surface: "metal" });
  P3.col([len - 0.18, 0, 0.15], [len - 0.02, 1.05, 0.31], { surface: "metal", noNav: true });
  if (!o.snapped && up < 0.3) P3.col([0, 0.9, 0.18], [len, 1.1, 0.28], { surface: "metal" });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var bagWall = (seed = 1, o = {}) => proto("fbagw" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("bagWall", seed), R4 = rng(seed * 31 + 2), len = o.len || 3, rows = o.rows || 4, nb2 = Math.round(len / 0.48);
  for (let j = 0; j < rows; j++) {
    const cnt = j === rows - 1 ? Math.ceil(nb2 * 0.6) : nb2;
    for (let i = 0; i < cnt; i++) {
      if (j === rows - 1 && R4() < 0.2) continue;
      sandbag(P3, -len / 2 + 0.24 + i * 0.48 + j % 2 * 0.24 + (R4() - 0.5) * 0.03, j * 0.135, (R4() - 0.5) * 0.04, (R4() - 0.5) * 0.15, 1);
    }
  }
  for (let k = 0; k < 2; k++) sandbag(P3, (R4() - 0.5) * len, 0, 0.4 + R4() * 0.2, R4() * 3, 1);
  P3.col([-len / 2, 0, -0.16], [len / 2 + 0.2, rows * 0.135, 0.16], { surface: "sand" });
  return P3.finish({ grime: 0.7, ground: 0.5 });
});

