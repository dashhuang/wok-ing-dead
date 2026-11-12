var DK5 = [0.1, 0.1, 0.105];
var FR = [0.8, 0.8, 0.76];
var CONC2 = [0.62, 0.61, 0.58];
var SLATE = [0.24, 0.25, 0.28];
var TERRA = [0.42, 0.2, 0.13];
var WOODC5 = [0.34, 0.26, 0.17];
var GALV = [0.8, 0.82, 0.84];
var BRICKS = [[0.82, 0.5, 0.4], [0.9, 0.78, 0.58], [0.6, 0.36, 0.3], [0.95, 0.9, 0.84], [0.72, 0.6, 0.5]];
var RENDERS = [[0.86, 0.84, 0.76], [0.8, 0.72, 0.6], [0.7, 0.76, 0.78], [0.9, 0.9, 0.88]];
var DOORS = [[0.5, 0.08, 0.06], [0.06, 0.16, 0.34], [0.06, 0.24, 0.12], [0.1, 0.1, 0.11], [0.75, 0.74, 0.7]];
function sash(P3, x, y, w, h, zf, st, o = {}) {
  const fc = o.frame || FR, rec = 0.1, R4 = P3.R;
  P3.box("black", w, h, 0.02, x, y, zf - rec, { b: 0 });
  if (st === 1) {
    P3.box(o.lit || "emCab", w - 0.06, h - 0.06, 0.01, x, y, zf - rec + 0.02, { b: 0 });
    const cc = o.curt || [0.4, 0.16, 0.13], k = 0.22 + R4() * 0.14;
    for (const s of [-1, 1]) P3.box("canvas", w * k, h - 0.06, 0.02, x + s * (w / 2 - w * k / 2 - 0.03), y, zf - rec + 0.045, { col: cc, b: 4e-3 });
  } else if (st === 5) {
    P3.box("lampCyan", w * 0.34, h * 0.24, 0.01, x - w * 0.12, y - h * 0.2, zf - rec + 0.02, { b: 0 });
  } else if (st === 4) {
    P3.box("canvas", w - 0.08, h * 0.86, 0.012, x, y + h * 0.07, zf - rec + 0.03, { col: [0.56, 0.55, 0.48], b: 0 });
    P3.box("plastic", w - 0.06, 0.03, 0.03, x, y - h * 0.36, zf - rec + 0.035, { col: FR, b: 4e-3 });
  }
  if (st === 2) {
    const n = h > 1.5 ? 5 : 3;
    for (let k = 0; k < n; k++) P3.box("wood", w + 0.14, h / n - 0.015, 0.022, x + (R4() - 0.5) * 0.06, y - h / 2 + (k + 0.5) * (h / n), zf + 0.014, { col: [0.36 + R4() * 0.12, 0.3 + R4() * 0.08, 0.2 + R4() * 0.05], b: 3e-3, r: [0, 0, (R4() - 0.5) * 0.05] });
  } else {
    if (st === 0) P3.box("glass", w - 0.08, h - 0.08, 8e-3, x, y, zf - 0.055, { b: 0 });
    if (st === 3) for (let k = 0; k < 4; k++) {
      const a = R4() * 0.5 + 0.2, sx = k % 2 ? 1 : -1;
      P3.ext("glass", [[0, 0], [a, 0], [0, a * (0.7 + R4())]], zf - 0.058, zf - 0.052, { plane: "xy", bevel: 0, p: [x + sx * (w / 2 - 0.04) - (sx > 0 ? a : 0), y + (k < 2 ? -h / 2 + 0.04 : h / 2 - 0.04), 0], r: k < 2 ? null : [0, 0, 0] });
    }
    for (const s of [-1, 1]) {
      P3.box("plastic", 0.055, h, 0.07, x + s * (w / 2 - 0.027), y, zf - 0.035, { col: fc, b: 6e-3 });
      P3.box("plastic", w, 0.055, 0.07, x, y + s * (h / 2 - 0.027), zf - 0.035, { col: fc, b: 6e-3 });
    }
    if (w > 0.95) for (const u of w > 1.7 ? [-w / 6, w / 6] : [0]) P3.box("plastic", 0.045, h - 0.1, 0.06, x + u, y, zf - 0.04, { col: fc, b: 5e-3 });
    if (o.bars !== false && h > 1) P3.box("plastic", w - 0.1, 0.04, 0.055, x, y + h * 0.22, zf - 0.042, { col: fc, b: 5e-3 });
  }
  P3.box("concrete", w + 0.18, 0.06, 0.17, x, y - h / 2 - 0.03, zf + 0.03, { col: CONC2, b: 8e-3 });
  P3.box("concrete", w + 0.26, 0.15, 0.03, x, y + h / 2 + 0.075, zf + 4e-3, { col: [0.56, 0.54, 0.5], b: 4e-3 });
}
function gableRoof(P3, W, D, He, Hr, col, o = {}) {
  const ov = o.ov ?? 0.32, run = D / 2 + ov, rise = Hr - He, a = Math.atan2(rise, D / 2), L = Math.hypot(run, run * Math.tan(a)), z0 = o.z || 0, x0 = o.x || 0;
  for (const s of [-1, 1]) {
    P3.box("tile", W + 0.5, 0.09, L, x0, Hr - run / 2 * Math.tan(a) + 0.05, z0 + s * run / 2, { col, b: 0.01, r: [s * a, 0, 0] });
    P3.box("wood", W + 0.5, 0.2, 0.03, x0, He - ov * Math.tan(a) + 0.02, z0 + s * (run + 0.01), { col: FR, b: 4e-3 });
    P3.cyl("pvc", 0.06, W + 0.56, x0, He - ov * Math.tan(a) + 0.03, z0 + s * (run + 0.07), { axis: "x", seg: 8, col: DK5 });
    for (const e of [-1, 1]) P3.beam("wood", [x0 + e * (W / 2 + 0.24), He - ov * Math.tan(a) + 0.02, z0 + s * run], [x0 + e * (W / 2 + 0.24), Hr + 0.02, z0], 0.03, 0.2, { col: FR });
  }
  const n = Math.round((W + 0.5) / 0.45);
  for (let i = 0; i < n; i++) P3.cyl("tile", 0.1, 0.44, x0 - (W + 0.5) / 2 + (i + 0.5) * ((W + 0.5) / n), Hr + 0.07, z0, { axis: "x", seg: 8, col: [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], cham: 0.01 });
}
var downpipe = (P3, x, z, y1, out = 1) => {
  P3.tube("pvc", [[x, y1, z + out * 0.3], [x, y1 - 0.25, z + out * 0.1], [x, y1 - 0.5, z + out * 0.06], [x, 0.05, z + out * 0.06]], 0.034, { seg: 6, samples: 0, col: DK5 });
  for (const y of [0.6, y1 * 0.5, y1 - 0.8]) P3.box("pvc", 0.1, 0.03, 0.04, x, y, z + out * 0.03, { col: DK5, b: 4e-3 });
};
var wheelie = (P3, x, z, col, ry = 0, tip = 0) => {
  P3.push({ p: [x, 0, z], r: [tip ? -H : 0, ry, 0] });
  P3.add("plastic", softBox(0.5, 0.9, 0.6, 0.05, 3), col, { p: [0, 0.52, 0] });
  P3.add("plastic", softBox(0.56, 0.06, 0.66, 0.025, 2), [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], { p: [0, 1, 0], r: [tip ? 0.5 : 0.04, 0, 0] });
  for (const s of [-1, 1]) P3.cyl("rubber", 0.09, 0.05, s * 0.22, 0.09, -0.27, { axis: "x", seg: 10, col: DK5 });
  P3.bar("plastic", [-0.24, 0.98, -0.33], [0.24, 0.98, -0.33], 0.015, { col });
  P3.pop();
};
var house = (seed = 1, o = {}) => proto("fhouse" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("house", seed), R4 = rng(seed * 131 + 7), A = o.atlas, W = o.w ?? 7.4, D = o.d ?? 7.8, F1 = 2.7, He = 5.3, Hr = He + D * 0.36;
  const bc = BRICKS[(o.brick ?? seed) % BRICKS.length], rc = o.render === -1 ? null : RENDERS[(o.render ?? seed * 3) % RENDERS.length], roofC = o.roof || (seed % 3 === 0 ? TERRA : SLATE), dc = DOORS[(o.door ?? seed * 7) % DOORS.length];
  const fs = o.front || [0, 0, 0, 0], bs = o.back || [0, 0, 0, 0];
  P3.box("brick", W + 0.06, 0.3, D + 0.06, 0, 0, 0, { base: true, col: [bc[0] * 0.6, bc[1] * 0.6, bc[2] * 0.6], b: 0.01 });
  P3.box("brick", W, F1 - 0.3, D, 0, 0.3, 0, { base: true, col: bc, b: 6e-3 });
  P3.box(rc ? "stucco" : "brick", W, He - F1, D, 0, F1, 0, { base: true, col: rc || bc, b: 6e-3 });
  P3.box("concrete", W + 0.05, 0.1, D + 0.05, 0, F1, 0, { col: rc ? [0.5, 0.48, 0.45] : [bc[0] * 0.75, bc[1] * 0.75, bc[2] * 0.75], b: 0.01 });
  for (const s of [-1, 1]) P3.ext(rc ? "stucco" : "brick", [[-D / 2, He], [D / 2, He], [0, Hr - 0.04]], s * (W / 2) - (s > 0 ? 0.24 : 0), s * (W / 2) + (s > 0 ? 0 : 0.24), { plane: "side", col: rc || bc, bevel: 4e-3 });
  gableRoof(P3, W, D, He, Hr, roofC);
  const cx = (seed % 2 ? 1 : -1) * (W / 2 - 1.1);
  P3.box("brick", 0.9, 1.7, 0.6, cx, Hr - 0.5, 0, { base: true, col: bc, b: 0.01 });
  P3.box("concrete", 1, 0.1, 0.7, cx, Hr + 1.25, 0, { col: CONC2, b: 0.015 });
  for (const s of [-1, 1]) P3.lathe("tile", [[0.1, 0], [0.12, 0.05], [0.09, 0.3], [0.11, 0.34], [0.08, 0.35]], { seg: 10, col: TERRA, p: [cx + s * 0.22, Hr + 1.3, 0] });
  P3.box("galv", 1, 0.25, 0.7, cx, Hr - 0.38, 0, { col: [0.35, 0.36, 0.38], b: 4e-3 });
  if (seed % 3) {
    P3.bar("galv", [cx, Hr + 0.6, 0.32], [cx, Hr + 3, 0.32], 0.018, { col: GALV });
    P3.bar("galv", [cx - 0.6, Hr + 2.8, 0.32], [cx + 0.6, Hr + 2.8, 0.32], 0.012, { col: GALV });
    for (let k = 0; k < 7; k++) P3.bar("galv", [cx - 0.55 + k * 0.18, Hr + 2.8, 0.1], [cx - 0.55 + k * 0.18, Hr + 2.8, 0.54], 6e-3, { col: GALV });
  } else {
    P3.push({ p: [-cx * 0.9, He - 0.5, D / 2 + 0.3], r: [-0.5, 0.4, 0] });
    P3.lathe("paint", [[1e-3, 0], [0.16, 0.02], [0.28, 0.07], [0.33, 0.13]], { seg: 14, col: [0.3, 0.3, 0.32], axis: "z" });
    P3.bar("galv", [0, -0.2, 0.13], [0, 0, 0.3], 0.01, { col: DK5 });
    P3.cyl("plastic", 0.03, 0.08, 0, 0, 0.32, { axis: "z", seg: 8, col: DK5 });
    P3.pop();
    P3.bar("galv", [-cx * 0.9, He - 0.6, D / 2], [-cx * 0.9, He - 0.55, D / 2 + 0.28], 0.015, { col: DK5 });
  }
  const dx = (seed % 2 ? -1 : 1) * (W / 2 - 1.25), wx = -dx * 0.55, zf = D / 2;
  P3.box("black", 0.98, 2.12, 0.02, dx, 0.3 + 1.06, zf - 0.12, { b: 0 });
  P3.box("paint", 0.9, 2.02, 0.05, dx, 0.3 + 1.03, zf - 0.08, { col: o.dead ? [0.3, 0.26, 0.2] : dc, b: 8e-3 });
  if (!o.dead) {
    for (const [u, v] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.3], [0.2, -0.3]]) P3.box("paint", 0.3, v > 0 ? 0.6 : 0.8, 0.02, dx + u, 1.33 + v, zf - 0.05, { col: [dc[0] * 0.8, dc[1] * 0.8, dc[2] * 0.8], b: 0.01 });
    P3.cyl("chrome", 0.03, 0.05, dx + 0.36, 1.3, zf - 0.03, { axis: "z", seg: 8, col: [0.8, 0.7, 0.4] });
    P3.box("chrome", 0.24, 0.04, 0.012, dx, 1.2, zf - 0.045, { col: [0.8, 0.7, 0.4], b: 3e-3 });
  } else {
    for (let k = 0; k < 3; k++) P3.box("wood", 1.2, 0.2, 0.025, dx, 0.8 + k * 0.6, zf - 0.03, { col: [0.4, 0.33, 0.22], b: 3e-3, r: [0, 0, (k - 1) * 0.07] });
    if (A) P3.quad("decalF", 1.3, 1.3 / A.aspect("gX"), A.rect("gX"), { p: [dx - 1.3, 1.5, zf + 0.012] });
  }
  for (const s of [-1, 1]) P3.box("plastic", 0.07, 2.16, 0.1, dx + s * 0.5, 0.3 + 1.08, zf - 0.04, { col: FR, b: 6e-3 });
  P3.box("plastic", 1.08, 0.07, 0.1, dx, 2.45, zf - 0.04, { col: FR, b: 6e-3 });
  P3.box("tile", 1.9, 0.07, 1, dx, 2.72, zf + 0.42, { col: roofC, b: 8e-3, r: [0.34, 0, 0] });
  for (const s of [-1, 1]) {
    P3.beam("wood", [dx + s * 0.85, 2.05, zf + 0.02], [dx + s * 0.85, 2.52, zf + 0.82], 0.07, 0.07, { col: FR });
    P3.box("wood", 0.07, 0.07, 0.86, dx + s * 0.85, 2.56, zf + 0.42, { col: FR, b: 6e-3 });
  }
  P3.box("concrete", 1.5, 0.15, 0.8, dx, 0.075, zf + 0.4, { col: CONC2, b: 0.012 });
  P3.box("concrete", 1.2, 0.15, 0.4, dx, 0.225, zf + 0.2, { col: CONC2, b: 0.012 });
  if (o.porchLamp) {
    P3.add("plastic", softBox(0.12, 0.2, 0.1, 0.03, 3), DK5, { p: [dx - 0.72, 2, zf + 0.05] });
    P3.box("lampWarm", 0.07, 0.12, 0.05, dx - 0.72, 1.98, zf + 0.09, { b: 0.01 });
    P3.glow("flare", [dx - 0.72, 1.98, zf + 0.16], { col: [1, 0.62, 0.3], size: 0.7 });
    P3.glow("fill", [dx - 0.5, 1.9, zf + 0.6], { col: [1, 0.62, 0.3], power: 3, dist: 6 });
  }
  if (o.bay) {
    const bw = 2.5, bd = 0.7;
    P3.ext("brick", [[-bw / 2, 0], [-bw / 2 + 0.5, bd], [bw / 2 - 0.5, bd], [bw / 2, 0]], 0.3, 1, { plane: "up", col: bc, bevel: 6e-3, p: [wx, 0, zf] });
    P3.ext("tile", [[-bw / 2 - 0.08, 0], [-bw / 2 + 0.46, bd + 0.1], [bw / 2 - 0.46, bd + 0.1], [bw / 2 + 0.08, 0]], 2.42, 2.52, { plane: "up", col: roofC, bevel: 0.02, p: [wx, 0, zf] });
    P3.box("black", bw - 1, 1.4, 0.02, wx, 1.7, zf + bd - 0.12, { b: 0 });
    if (fs[0] === 1) P3.box("emCab", bw - 1.1, 1.3, 0.01, wx, 1.7, zf + bd - 0.1, { b: 0 });
    else P3.box("glass", bw - 1.1, 1.34, 8e-3, wx, 1.7, zf + bd - 0.05, { b: 0 });
    for (const s of [-1, 1]) {
      P3.push({ p: [wx + s * (bw / 2 - 0.25), 1.7, zf + bd / 2], r: [0, s * 0.95, 0] });
      P3.box(fs[0] === 1 ? "emCab" : "glass", 0.72, 1.34, 8e-3, 0, 0, -0.02, { b: 0 });
      for (const e of [-1, 1]) P3.box("plastic", 0.05, 1.42, 0.06, e * 0.4, 0, 0, { col: FR, b: 5e-3 });
      P3.pop();
      P3.box("plastic", 0.06, 1.42, 0.07, wx + s * (bw / 2 - 0.5), 1.7, zf + bd - 0.02, { col: FR, b: 5e-3 });
    }
    P3.box("plastic", bw - 0.9, 0.06, 0.07, wx, 2.39, zf + bd - 0.02, { col: FR, b: 5e-3 });
    P3.box("plastic", bw - 0.9, 0.05, 0.06, wx, 2, zf + bd - 0.02, { col: FR, b: 5e-3 });
    P3.box("concrete", bw - 0.8, 0.06, 0.12, wx, 1, zf + bd + 0.02, { col: CONC2, b: 6e-3 });
  } else sash(P3, wx, 1.72, 1.9, 1.35, zf, fs[0]);
  sash(P3, wx, F1 + 1.45, 1.7, 1.25, zf, fs[1]);
  sash(P3, dx, F1 + 1.45, 1.15, 1.25, zf, fs[2], { curt: [0.14, 0.2, 0.34] });
  if (W > 7.8) sash(P3, (wx + dx) / 2, F1 + 1.6, 0.55, 0.8, zf, fs[3], { bars: false });
  P3.push({ r: [0, PI5, 0] });
  const px2 = (seed % 2 ? 1 : -1) * (W / 2 - 1.7), kx = -px2 * 0.8;
  if (o.ext) {
    const ew = 3.4, ed = 2.6;
    P3.box("brick", ew, 2.3, ed, px2, 0, zf + ed / 2, { base: true, col: bc, b: 6e-3 });
    P3.box("rubber", ew + 0.3, 0.08, ed + 0.25, px2, 2.52, zf + ed / 2 + 0.05, { col: [0.17, 0.17, 0.18], b: 0.01, r: [0.1, 0, 0] });
    P3.box("wood", ew + 0.3, 0.16, 0.03, px2, 2.36, zf + ed + 0.17, { col: FR, b: 4e-3 });
    sash(P3, px2, 1.35, 2.2, 1.7, zf + ed, bs[0], { bars: false });
    P3.cyl("pvc", 0.05, ew + 0.3, px2, 2.3, zf + ed + 0.22, { axis: "x", seg: 8, col: DK5 });
  } else {
    sash(P3, px2, 1.37, 2.3, 2.05, zf, bs[0], { bars: false });
    P3.box("concrete", 3.2, 0.1, 1.6, px2, 0.05, zf + 0.8, { col: [0.5, 0.49, 0.46], b: 0.01 });
  }
  sash(P3, kx, 1.75, 1.3, 1.05, zf, bs[1]);
  sash(P3, px2 * 0.9, F1 + 1.45, 1.5, 1.2, zf, bs[2], { curt: [0.3, 0.3, 0.14] });
  sash(P3, kx, F1 + 1.45, 1.3, 1.2, zf, bs[3]);
  sash(P3, 0, F1 + 1.75, 0.5, 0.6, zf, 0, { bars: false });
  P3.bar("pvc", [0.45, 0.1, zf + 0.07], [0.45, He + 0.3, zf + 0.07], 0.055, { col: DK5 });
  P3.tube("pvc", [[0.45, F1 + 1.2, zf + 0.07], [0.3, F1 + 1.3, zf + 0.07], [0.1, F1 + 1.38, zf - 0.02]], 0.05, { seg: 6, samples: 0, col: DK5 });
  P3.pop();
  downpipe(P3, -W / 2 + 0.25, zf, He - 0.1, 1);
  downpipe(P3, W / 2 - 0.25, -zf, He - 0.1, -1);
  if (o.garage) {
    const s = o.garage, gw = 2.9, gd = 5.4, gh = 2.45, gx = s * (W / 2 + gw / 2), gz = zf - gd / 2 - 0.8, open = seed % 4 === 1;
    P3.box("brick", gw, gh, gd, gx, 0, gz, { base: true, col: bc, b: 6e-3 });
    P3.box("rubber", gw + 0.2, 0.1, gd + 0.25, gx, gh + 0.05, gz, { col: [0.16, 0.16, 0.17], b: 0.012 });
    P3.box("wood", gw + 0.22, 0.2, 0.03, gx, gh - 0.04, gz + gd / 2 + 0.13, { col: FR, b: 4e-3 });
    P3.box("black", gw - 0.5, 2.05, 0.03, gx, 1.03, gz + gd / 2 - 0.1, { b: 0 });
    P3.push({ p: [gx, 2.05, gz + gd / 2 - 0.02], r: [open ? -1.1 : 0, 0, 0] });
    P3.box("paint", gw - 0.56, 2, 0.035, 0, -1, 0, { col: dc, b: 6e-3 });
    for (let k = 0; k < 9; k++) P3.box("paint", 0.03, 1.9, 0.02, -(gw - 0.8) / 2 + k * ((gw - 0.8) / 8), -1, 0.025, { col: [dc[0] * 0.85, dc[1] * 0.85, dc[2] * 0.85], b: 4e-3 });
    P3.cyl("chrome", 0.03, 0.03, 0, -1.25, 0.04, { axis: "z", seg: 8, col: [0.7, 0.7, 0.7] });
    P3.pop();
    P3.box("concrete", gw + 0.4, 0.04, 4.8, gx, 0.02, gz + gd / 2 + 2.4, { col: [0.36, 0.36, 0.36], b: 4e-3 });
    P3.col([gx - gw / 2, 0, gz - gd / 2], [gx + gw / 2, gh, gz + gd / 2], { surface: "brick" });
  }
  wheelie(P3, -W / 2 - 0.45, zf - 1, [0.1, 0.12, 0.13], H);
  wheelie(P3, -W / 2 - 0.45, zf - 1.75, [0.08, 0.26, 0.12], H, seed % 3 === 1 ? 1 : 0);
  if (seed % 2) wheelie(P3, -W / 2 - 0.45, zf - 2.5, [0.1, 0.2, 0.4], H);
  P3.col([-W / 2, 0, -D / 2], [W / 2, He, D / 2], { surface: "brick" });
  P3.col([-W / 2 - 0.3, He, -D / 2 - 0.3], [W / 2 + 0.3, Hr, D / 2 + 0.3], { surface: "concrete", bulletOnly: true });
  return P3.finish({ grime: 0.9, ground: 0.8 });
});
var gardenFence = (seed = 1, o = {}) => proto("fgfence" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("gardenFence", seed), R4 = rng(seed * 43 + 3), n = o.n ?? 4, pw = 1.83, hh = o.h ?? 1.8, down = o.down || [], gone = o.gone || [], L = n * pw, x0 = -L / 2;
  for (let i = 0; i <= n; i++) {
    P3.box("concrete", 0.1, hh + 0.25, 0.1, x0 + i * pw, 0, 0, { base: true, col: CONC2, b: 0.012 });
    P3.box("concrete", 0.12, 0.04, 0.12, x0 + i * pw, hh + 0.27, 0, { col: CONC2, b: 0.01 });
  }
  for (let i = 0; i < n; i++) {
    const cx = x0 + (i + 0.5) * pw;
    P3.box("concrete", pw - 0.1, 0.15, 0.05, cx, 0.075, 0, { col: [0.5, 0.5, 0.48], b: 6e-3 });
    if (gone.includes(i)) continue;
    const wc = [WOODC5[0] * (0.7 + R4() * 0.5), WOODC5[1] * (0.7 + R4() * 0.5), WOODC5[2] * (0.7 + R4() * 0.5)], flat = down.includes(i);
    P3.push(flat ? { p: [cx, 0.06, (seed % 2 ? 1 : -1) * (hh / 2 + 0.1)], r: [(seed % 2 ? 1 : -1) * (H - 0.06), 0, (R4() - 0.5) * 0.2] } : { p: [cx, 0.15 + hh / 2, 0], r: [(o.lean || 0) + (R4() - 0.5) * 0.04, 0, 0] });
    const nb2 = 11, bh = (hh - 0.1) / nb2;
    for (let k = 0; k < nb2; k++) P3.box("wood", pw - 0.14, bh + 0.03, 0.012, 0, -hh / 2 + 0.05 + (k + 0.5) * bh, k % 2 * 8e-3, { col: [wc[0] * (0.9 + R4() * 0.2), wc[1] * (0.9 + R4() * 0.2), wc[2] * (0.9 + R4() * 0.2)], r: [0.1, 0, 0] });
    for (const s of [-1, 1]) {
      P3.box("wood", 0.04, hh, 0.035, s * (pw / 2 - 0.07), 0, 0, { col: wc, b: 4e-3 });
      P3.box("wood", pw - 0.1, 0.04, 0.035, 0, s * (hh / 2 - 0.02), 0, { col: wc, b: 4e-3 });
    }
    for (const u of [-0.3, 0.3]) P3.box("wood", 0.035, hh - 0.06, 0.02, u, 0, -0.016, { col: wc, b: 3e-3 });
    if (o.trellis && !flat) {
      for (let k = 0; k < 9; k++) {
        P3.beam("wood", [-pw / 2 + 0.08 + k * 0.2, hh / 2, 0], [-pw / 2 + 0.08 + k * 0.2 + 0.3, hh / 2 + 0.3, 0], 0.02, 8e-3, { col: wc });
        P3.beam("wood", [-pw / 2 + 0.08 + k * 0.2 + 0.3, hh / 2, 8e-3], [-pw / 2 + 0.08 + k * 0.2, hh / 2 + 0.3, 8e-3], 0.02, 8e-3, { col: wc });
      }
      P3.box("wood", pw - 0.1, 0.03, 0.03, 0, hh / 2 + 0.31, 0, { col: wc, b: 3e-3 });
    }
    P3.pop();
  }
  P3.col([x0, 0, -0.06], [x0 + L, hh + 0.2, 0.06], { surface: "wood" });
  return P3.finish({ grime: 0.9, ground: 0.5 });
});
var lockups = (seed = 1, o = {}) => proto("flockup" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("lockups", seed), R4 = rng(seed * 61 + 9), A = o.atlas, n = o.n ?? 6, bw = 2.75, D = 5.2, hf = 2.35, hb = 2.1, L = n * bw, x0 = -L / 2, open = o.open || [];
  P3.box("block", L, hb, 0.2, 0, 0, -D / 2 + 0.1, { base: true, col: [0.7, 0.69, 0.66], b: 6e-3 });
  for (let i = 0; i <= n; i++) P3.ext("block", [[-D / 2, 0], [D / 2, 0], [D / 2, hf], [-D / 2, hb]], x0 + i * bw - 0.1, x0 + i * bw + 0.1, { plane: "side", col: [0.7, 0.69, 0.66], bevel: 6e-3 });
  {
    const g2 = quadXY(L + 0.4, D + 0.5, [0, 0, 8, 3], Math.round(L / 0.15), 2);
    deform(g2, (q) => {
      const t = q.y / (D + 0.5) + 0.5, x = q.x;
      q.z = (t - 0.5) * (D + 0.5);
      q.y = hb + (hf - hb) * t + 0.06 + 0.03 * Math.cos(x * (PI5 * 2 / 0.15));
      q.x = x;
    });
    flip(g2);
    g2.computeVertexNormals();
    P3.add("concrete", g2, [0.5, 0.52, 0.5], { jit: 0.12 });
  }
  P3.box("concrete", L + 0.3, 0.22, 0.12, 0, hf - 0.02, D / 2 - 0.02, { col: CONC2, b: 0.01 });
  P3.box("concrete", L + 0.6, 0.05, 3.5, 0, 0.025, D / 2 + 1.75, { col: [0.38, 0.38, 0.38], b: 4e-3 });
  for (let i = 0; i < n; i++) {
    const cx = x0 + (i + 0.5) * bw, dc = DOORS[Math.floor(R4() * 5)], isOpen = open.includes(i), ang = isOpen ? -1.25 : R4() < 0.15 ? -0.25 : 0;
    P3.box("black", bw - 0.3, 2, D - 0.4, cx, 0.02, 0, { base: true, b: 0 });
    P3.push({ p: [cx, 2, D / 2 - 0.04], r: [ang, 0, 0] });
    P3.box("paint", bw - 0.34, 1.96, 0.03, 0, -0.98, 0, { col: dc, b: 6e-3 });
    for (let k = 0; k < 8; k++) P3.box("paint", 0.03, 1.86, 0.02, -(bw - 0.6) / 2 + k * ((bw - 0.6) / 7), -0.98, 0.022, { col: [dc[0] * 0.8, dc[1] * 0.8, dc[2] * 0.8], b: 4e-3 });
    P3.cyl("chrome", 0.03, 0.03, 0, -1.2, 0.035, { axis: "z", seg: 8, col: [0.7, 0.7, 0.7] });
    P3.pop();
    if (A && (o.tags || []).includes(i)) {
      const nm = ["gDead", "gSorry", "gX", "gCount"][i % 4];
      P3.quad("decalF", 1.6, 1.6 / A.aspect(nm), A.rect(nm), { p: [cx, 1.1, D / 2 + 0.012] });
    }
    if (o.lit === i) {
      P3.bar("rubber", [cx, hb + 0.1, 0.6], [cx, 1.85, 0.6], 6e-3, { col: DK5 });
      P3.lathe("lampWarm", [[0, 0], [0.035, 0.03], [0.045, 0.07], [0.02, 0.11], [0, 0.12]], { seg: 8, p: [cx, 1.73, 0.6] });
      P3.glow("flare", [cx, 1.78, 0.6], { col: [1, 0.62, 0.3], size: 0.8 });
      P3.glow("fill", [cx, 1.6, 1.4], { col: [1, 0.62, 0.3], power: 5, dist: 7, flicker: 1 });
      P3.box("wood", 1.2, 0.04, 0.5, cx - 0.5, 0.8, -1.2, { col: WOODC5, b: 4e-3 });
      for (const s of [-1, 1]) P3.box("wood", 0.05, 0.8, 0.45, cx - 0.5 + s * 0.55, 0, -1.2, { base: true, col: WOODC5, b: 4e-3 });
      P3.add("plastic", softBox(0.4, 0.3, 0.3, 0.03, 2), [0.5, 0.1, 0.08], { p: [cx - 0.6, 0.97, -1.2] });
    }
  }
  P3.col([x0, 0, -D / 2], [x0 + L, hb, D / 2 - 0.1], { surface: "concrete" });
  return P3.finish({ grime: 1, ground: 0.6 });
});
var teachingWing = (seed = 1, o = {}) => proto("fwing" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("teachingWing", seed), R4 = rng(seed * 97 + 5), A = o.atlas, L = o.len ?? 42, D = 11, ST4 = o.storeys ?? 3, sh = 3.5, Ht = ST4 * sh + 0.3, nb2 = Math.round(L / 3.5), bw = L / nb2, zf = D / 2, bc = BRICKS[(o.brick ?? 4) % BRICKS.length], pc = o.panel || [0.1, 0.3, 0.36];
  const lit = new Map((o.lit || []).map(([b, s, k]) => [b + "|" + s, k]));
  P3.box("brick", L, Ht, D - 0.5, 0, 0, -0.1, { base: true, col: bc, b: 6e-3 });
  for (let s = 0; s <= ST4; s++) P3.box("concrete", L + 0.1, 0.3, 0.4, 0, s * sh + 0.15, zf - 0.2, { col: CONC2, b: 0.012 });
  for (let i = 0; i <= nb2; i++) P3.box("brick", i === 0 || i === nb2 ? 0.7 : 0.34, Ht, 0.5, -L / 2 + i * bw + (i === 0 ? 0.35 : i === nb2 ? -0.35 : 0), 0, zf - 0.2, { base: true, col: bc, b: 8e-3 });
  P3.box("brick", L + 0.1, 0.7, D + 0.1, 0, Ht, 0, { base: true, col: bc, b: 6e-3 });
  P3.box("concrete", L + 0.3, 0.1, D + 0.3, 0, Ht + 0.75, 0, { col: CONC2, b: 0.015 });
  P3.box("black", L - 0.5, 0.04, D - 0.5, 0, Ht + 0.72, 0, { b: 0 });
  for (let i = 0; i < nb2; i++) for (let s = 0; s < ST4; s++) {
    const cx = -L / 2 + (i + 0.5) * bw, y0 = s * sh + 0.3, ww = bw - 0.36, k = lit.get(i + "|" + s) || 0, ent = o.entrance === i && s === 0;
    if (ent) continue;
    P3.box("paint", ww, 0.95, 0.05, cx, y0 + 0.475, zf - 0.26, { col: [pc[0] * (0.85 + R4() * 0.3), pc[1] * (0.85 + R4() * 0.3), pc[2] * (0.85 + R4() * 0.3)], b: 4e-3 });
    P3.box("black", ww, 2.1, 0.02, cx, y0 + 2, zf - 0.42, { b: 0 });
    const board3 = !k && R4() < 0.06, blind = !k && !board3 && R4() < 0.25;
    if (k) {
      P3.box("court", ww, 0.02, 0.5, cx, y0 + 3.02, zf - 0.7, { col: [0.5, 0.5, 0.48], b: 0 });
      for (const u of [-ww / 4, ww / 4]) P3.box(k === 2 ? "lampTubeF" : "lampTube", 1.2, 0.04, 0.1, cx + u, y0 + 2.96, zf - 0.75, { b: 4e-3 });
      P3.box("paint", ww, 2, 0.02, cx, y0 + 2, zf - 1.4, { col: [0.5, 0.52, 0.46], b: 0 });
      P3.box("wood", ww * 0.6, 0.05, 0.5, cx - ww * 0.1, y0 + 1.25, zf - 0.9, { col: [0.5, 0.42, 0.3], b: 4e-3 });
    }
    if (board3) P3.box("wood", ww - 0.02, 2.08, 0.02, cx, y0 + 2, zf - 0.27, { col: [0.42, 0.36, 0.25], b: 3e-3 });
    else {
      if (!k) P3.box("glass", ww - 0.04, 2.06, 8e-3, cx, y0 + 2, zf - 0.3, { b: 0 });
      if (blind) P3.box("canvas", ww - 0.1, 0.5 + R4() * 1.3, 0.01, cx, y0 + 2.75, zf - 0.285, { col: [0.6, 0.6, 0.55], b: 0 });
      for (const u of [-ww / 2 + 0.03, -ww / 6, ww / 6, ww / 2 - 0.03]) P3.box("paint", 0.05, 2.1, 0.06, cx + u, y0 + 2, zf - 0.27, { col: FR, b: 5e-3 });
      for (const v of [0.975, 2.45, 3.03]) P3.box("paint", ww, 0.05, 0.06, cx, y0 + v, zf - 0.27, { col: FR, b: 5e-3 });
    }
  }
  if (o.tower !== 0) {
    const s = o.tower ?? 1, tw = 4.4, tx = s * (L / 2 + tw / 2 - 0.05), th = Ht + 2.4;
    P3.box("brick", tw, th, D - 1.2, tx, 0, -0.3, { base: true, col: [bc[0] * 0.9, bc[1] * 0.9, bc[2] * 0.9], b: 8e-3 });
    P3.box("concrete", tw + 0.2, 0.12, D - 1, tx, th + 0.06, -0.3, { col: CONC2, b: 0.015 });
    P3.box("black", 1.6, th - 3.6, 0.03, tx, 2.9 + (th - 3.6) / 2, zf - 0.86, { b: 0 });
    P3.box("glass", 1.5, th - 3.7, 0.01, tx, 2.9 + (th - 3.6) / 2, zf - 0.84, { b: 0 });
    for (let k = 0; k * 0.9 < th - 3.6; k++) P3.box("paint", 1.6, 0.05, 0.06, tx, 2.9 + k * 0.9, zf - 0.82, { col: FR, b: 4e-3 });
    for (const u of [-0.8, 0, 0.8]) P3.box("paint", 0.05, th - 3.6, 0.06, tx + u, 2.9 + (th - 3.6) / 2, zf - 0.82, { col: FR, b: 4e-3 });
    P3.box("black", 1.9, 2.3, 0.03, tx, 1.15, zf - 0.86, { b: 0 });
    for (const u of [-0.47, 0.47]) P3.box("paint", 0.9, 2.15, 0.05, tx + u, 1.1, zf - 0.83, { col: [0.1, 0.2, 0.34], b: 6e-3 });
    P3.box("emGreen", 0.5, 0.18, 0.03, tx, 2.5, zf - 0.82, { b: 4e-3 });
    P3.glow("flare", [tx, 2.5, zf - 0.7], { col: [0.2, 1, 0.45], size: 0.5 });
    P3.box("concrete", 2.6, 0.12, 1.5, tx, 2.75, zf - 0.1, { col: CONC2, b: 0.012 });
    P3.col([tx - tw / 2, 0, -D / 2], [tx + tw / 2, th, D / 2 - 0.9], { surface: "brick" });
    P3.cyl("emRedB", 0.08, 0.14, tx, th + 0.3, -0.3, { seg: 8 });
    P3.glow("flare", [tx, th + 0.32, -0.3], { col: [1, 0.08, 0.04], size: 1, blink: 1 });
  }
  if (o.entrance != null && o.entrance >= 0) {
    const cx = -L / 2 + (o.entrance + 0.5) * bw, ww = bw - 0.36;
    P3.box("black", ww, 2.9, 0.03, cx, 0.3 + 1.45, zf - 0.42, { b: 0 });
    for (const u of [-0.5, 0.5]) {
      P3.box("paint", 0.94, 2.2, 0.05, cx + u, 0.3 + 1.1, zf - 0.36, { col: [0.1, 0.2, 0.34], b: 6e-3 });
      P3.box("glass", 0.6, 1.2, 0.01, cx + u, 0.3 + 1.4, zf - 0.33, { b: 0 });
      P3.box("chrome", 0.03, 0.5, 0.03, cx + u * 0.16, 1.4, zf - 0.31, { col: [0.7, 0.7, 0.7], b: 6e-3 });
    }
    P3.box("glass", ww - 0.1, 0.6, 0.01, cx, 3, zf - 0.36, { b: 0 });
    P3.box("concrete", bw * 1.6, 0.22, 3.2, cx, 3.5, zf + 1.3, { col: CONC2, b: 0.02 });
    for (const u of [-1, 1]) P3.cyl("concrete", 0.14, 3.4, cx + u * (bw * 0.7), 1.7, zf + 2.5, { seg: 14, col: [0.5, 0.5, 0.48] });
    P3.box("concrete", bw * 1.6, 0.16, 3.4, cx, 0.08, zf + 1.4, { col: CONC2, b: 0.012 });
    if (A) {
      const nm = o.sign || "school", w = Math.min(bw * 2.4, 7.5);
      P3.quad("signF", w, w / A.aspect(nm), A.rect(nm), { p: [cx, 3.75 + w / A.aspect(nm) / 2, zf + 2.86] });
      P3.box("paint", w + 0.1, w / A.aspect(nm) + 0.1, 0.05, cx, 3.75 + w / A.aspect(nm) / 2, zf + 2.82, { col: [0.08, 0.14, 0.24], b: 6e-3 });
    }
    P3.box("lampTube", 1.2, 0.05, 0.12, cx, 3.37, zf + 1, { b: 4e-3 });
    P3.glow("fill", [cx, 3.2, zf + 1.2], { col: [0.8, 0.92, 1], power: 9, dist: 9, dir: [0, -1, 0.15], cone: 1 });
    P3.glow("flare", [cx, 3.33, zf + 1], { col: [0.8, 0.92, 1], size: 0.8 });
  }
  P3.box("brick", 4.5, 2.2, 3.6, L * 0.18, Ht + 0.7, -1, { base: true, col: bc, b: 8e-3 });
  P3.box("concrete", 4.8, 0.1, 3.9, L * 0.18, Ht + 2.95, -1, { col: CONC2, b: 0.012 });
  for (const u of [-L * 0.25, -L * 0.05]) {
    P3.cyl("galv", 0.3, 0.9, u, Ht + 1.2, 0.5, { seg: 14, col: GALV });
    P3.lathe("galv", [[1e-3, 0.3], [0.5, 0], [0.52, -0.05], [0.3, -0.05]], { seg: 14, col: GALV, p: [u, Ht + 1.8, 0.5] });
  }
  P3.box("galv", 2.2, 1.3, 1.6, -L * 0.36, Ht + 0.9, -1.5, { base: true, col: [0.4, 0.42, 0.44], b: 0.02 });
  P3.bar("paint", [L * 0.4, Ht + 0.7, zf - 0.6], [L * 0.4, Ht + 6.5, zf - 0.6], 0.05, { col: FR, r2: 0.03 });
  P3.box("canvas", 0.16, 1.3, 0.2, L * 0.4 + 0.06, Ht + 5.4, zf - 0.55, { col: [0.1, 0.16, 0.3], b: 0.05 });
  P3.col([-L / 2, 0, -D / 2], [L / 2, Ht + 0.8, D / 2], { surface: "brick" });
  return P3.finish({ grime: 1, ground: 1.2 });
});
var slabBlock = (seed = 1, o = {}) => proto("fslab" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("slabBlock", seed), R4 = rng(seed * 71 + 13), NF = o.floors ?? 10, NB2 = o.bays ?? 9, bw = 3.6, fh = 2.8, L = NB2 * bw, D = 10, Ht = NF * fh + 0.4, zf = D / 2, lit = new Set((o.lit || []).map(([b, f3]) => b + "|" + f3)), bc = [0.56, 0.5, 0.44];
  P3.box("brick", L, Ht, D - 1.4, 0, 0, -0.3, { base: true, col: bc, b: 0.01 });
  P3.box("concrete", L + 0.4, 0.5, D + 0.2, 0, Ht + 0.25, 0, { col: CONC2, b: 0.02 });
  for (let f3 = 1; f3 <= NF; f3++) {
    P3.box("concrete", L + 0.2, 0.22, 1.5, 0, f3 * fh - 0.1, zf - 0.55, { col: CONC2, b: 0.012 });
    if (f3 < NF + 1 && f3 > 0) {
      P3.box("paint", L + 0.2, 0.9, 0.05, 0, f3 * fh - 0.1 + 0.56 - fh, zf + 0.17, { col: [0.36, 0.4, 0.42], b: 4e-3 });
      P3.box("galv", L + 0.2, 0.05, 0.06, 0, f3 * fh - fh + 1.02, zf + 0.17, { col: GALV, b: 4e-3 });
    }
  }
  for (let i = 0; i <= NB2; i++) P3.box("concrete", 0.3, Ht, D - 0.1, -L / 2 + i * bw, 0, 0, { base: true, col: [0.55, 0.55, 0.53], b: 0.012 });
  for (let f3 = 0; f3 < NF; f3++) for (let i = 0; i < NB2; i++) {
    const cx = -L / 2 + (i + 0.5) * bw, y0 = f3 * fh + 0.2, on = lit.has(i + "|" + f3), gut = o.fire && o.fire[0] === i && o.fire[1] === f3;
    P3.box("paint", 0.85, 2, 0.04, cx - 0.9, y0 + 1, zf - 0.98, { col: DOORS[Math.floor(R4() * 5)], b: 4e-3 });
    P3.box(gut ? "black" : on ? "emCab" : "glass", 1.2, 1, 0.02, cx + 0.7, y0 + 1.5, zf - 0.98, { b: 0 });
    P3.box("paint", 1.3, 0.05, 0.04, cx + 0.7, y0 + 2.02, zf - 0.97, { col: FR, b: 4e-3 });
    const bon = lit.has(i + "|" + f3 + "b") || on && R4() < 0.5;
    P3.box("black", 2.4, 1.5, 0.02, cx, y0 + 1.45, -zf + 0.4 - 0.02, { b: 0 });
    P3.box(gut ? "black" : bon ? "emCab" : "glass", 2.3, 1.4, 0.02, cx, y0 + 1.45, -zf + 0.38, { b: 0 });
    P3.box("concrete", 2.6, 0.08, 0.2, cx, y0 + 0.68, -zf + 0.34, { col: CONC2, b: 6e-3 });
    P3.box("paint", 0.05, 1.4, 0.04, cx - 0.4, y0 + 1.45, -zf + 0.36, { col: FR, b: 4e-3 });
    if (gut) {
      P3.box("black", 2.2, 2.6, 0.02, cx + 0.2, y0 + 2.4, zf - 0.96, { b: 0 });
      P3.box("black", 2.6, 2.4, 0.02, cx, y0 + 2.6, -zf + 0.36, { b: 0 });
    }
  }
  P3.box("concrete", 4.2, Ht + 3.2, 2.6, bw * 0.5, 0, zf + 0.6, { base: true, col: [0.52, 0.52, 0.5], b: 0.02 });
  for (let f3 = 0; f3 < NF; f3++) P3.box(R4() < 0.25 ? "lampTube" : "glass", 0.5, 1.6, 0.02, bw * 0.5 + 1.2, f3 * fh + 1.5, zf + 1.91, { b: 0 });
  P3.box("brick", 7, 2.4, 4, -L * 0.2, Ht + 0.5, 0, { base: true, col: bc, b: 0.01 });
  for (const u of [-L / 2 + 1, L / 2 - 1]) {
    P3.bar("galv", [u, Ht + 0.5, 0], [u, Ht + 2, 0], 0.03, { col: GALV });
    P3.cyl("emRedB", 0.1, 0.16, u, Ht + 2.08, 0, { seg: 8 });
    P3.glow("flare", [u, Ht + 2.1, 0], { col: [1, 0.08, 0.04], size: 1.4, blink: 1 });
  }
  P3.col([-L / 2, 0, -D / 2], [L / 2, Ht, D / 2], { surface: "concrete" });
  return P3.finish({ grime: 1, ground: 2 });
});
var telegraphPole = (seed = 1, o = {}) => proto("ftpole" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("telegraphPole", seed), hh = o.h ?? 8.5, lean = (seed % 5 - 2) * 0.012;
  P3.push({ r: [lean, 0, lean * 0.7] });
  P3.bar("wood", [0, 0, 0], [0, hh, 0], 0.13, { col: [0.2, 0.15, 0.11], r2: 0.09, seg: 10 });
  P3.cyl("galv", 0.1, 0.03, 0, hh + 0.015, 0, { seg: 10, col: GALV });
  for (let k = 0; k < 8; k++) {
    const y = 3.2 + k * 0.6, s = k % 2 ? 1 : -1;
    P3.bar("galv", [s * 0.1, y, 0], [s * 0.3, y, 0], 0.011, { col: DK5 });
    P3.bar("galv", [s * 0.3, y, 0], [s * 0.3, y + 0.04, 0], 0.011, { col: DK5 });
  }
  P3.add("galv", ring(0.14, 0.012, { seg: 12, radial: 5 }), GALV, { p: [0, hh - 0.35, 0], r: [H, 0, 0] });
  for (let k = 0; k < 8; k++) {
    const a = k * PI5 / 4;
    P3.bar("galv", [Math.cos(a) * 0.13, hh - 0.35, Math.sin(a) * 0.13], [Math.cos(a) * 0.24, hh - 0.3, Math.sin(a) * 0.24], 8e-3, { col: GALV });
  }
  P3.add("plastic", softBox(0.22, 0.4, 0.16, 0.03, 2), DK5, { p: [0, hh - 1.3, 0.16] });
  P3.box("paint", 0.12, 0.16, 0.01, 0, 2.2, 0.125, { col: [0.85, 0.75, 0.1], b: 2e-3 });
  P3.tube("rubber", [[0, hh - 1.5, 0.14], [0.03, hh - 3.5, 0.13], [0, 0.3, 0.14]], 0.012, { seg: 5, samples: 0, col: DK5 });
  for (const w of o.wires || []) P3.tube("rubber", catenary([0, hh - 0.32, 0], w, Math.hypot(w[0], w[2]) * 0.035, 10), 0.012, { seg: 4, samples: 0, col: DK5 });
  if (o.lamp) {
    P3.tube("galv", [[0, hh - 1.9, 0.1], [0, hh - 1.2, 0.5], [0, hh - 1, 1.5]], 0.03, { seg: 7, samples: 10, col: GALV });
    P3.add("paint", softBox(0.26, 0.11, 0.62, 0.04, 3), [0.3, 0.31, 0.33], { p: [0, hh - 0.98, 1.75] });
    P3.box(o.lamp === 2 ? "lampFloodF" : "lampFlood", 0.2, 0.02, 0.44, 0, hh - 1.045, 1.78, { b: 4e-3 });
    P3.glow("fill", [0, hh - 1.3, 1.8], { col: [0.78, 0.92, 1], power: o.power || 30, dist: o.dist || 15, dir: [0, -1, 0.12], cone: 0.95, back: 0.3, flicker: o.lamp === 2 ? 1 : 0, mat: o.lamp === 2 ? "lampFloodF" : void 0 });
    P3.glow("flare", [0, hh - 1.06, 1.78], { col: [0.78, 0.92, 1], size: 1.3, flicker: o.lamp === 2 ? 1 : 0 });
  }
  P3.pop();
  P3.col([-0.14, 0, -0.14], [0.14, hh, 0.14], { surface: "wood" });
  return P3.finish({ grime: 0.8, ground: 0.6 });
});
var pylon = (seed = 1, o = {}) => proto("fpylon" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("pylon", seed), hh = o.h ?? 36, yb = hh * 0.6, C2 = [0.5, 0.52, 0.54], hw = (y) => y < yb ? lerp2(3.4, 1, y / yb) : lerp2(1, 0.35, (y - yb) / (hh - yb));
  const lv = [0, 4.5, 8.6, 12.3, 15.6, 18.6, yb, yb + 3.4, yb + 6.8, yb + 10.2, hh];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let i = 0; i < lv.length - 1; i++) P3.beam("galv", [sx * hw(lv[i]), lv[i], sz * hw(lv[i])], [sx * hw(lv[i + 1]), lv[i + 1], sz * hw(lv[i + 1])], 0.12, 0.12, { col: C2 });
  for (let i = 0; i < lv.length - 1; i++) {
    const a = hw(lv[i]), b = hw(lv[i + 1]), ya = lv[i], y2 = lv[i + 1];
    for (const [ux, uz] of [[1, 0], [0, 1]]) for (const s of [-1, 1]) {
      const pt = (t, w, y) => ux ? [s * w, y, t * w] : [t * w, y, s * w];
      P3.bar("galv", pt(-1, a, ya), pt(1, b, y2), 0.035, { col: C2, seg: 5 });
      P3.bar("galv", pt(1, a, ya), pt(-1, b, y2), 0.035, { col: C2, seg: 5 });
      P3.bar("galv", pt(-1, b, y2), pt(1, b, y2), 0.04, { col: C2, seg: 5 });
    }
  }
  const arms = [[yb + 0.2, 7.2], [yb + 3.6, 8.4], [yb + 7, 6.6]], tips = [];
  for (const [y, len] of arms) for (const s of [-1, 1]) {
    const w = hw(y);
    for (const sz of [-1, 1]) {
      P3.bar("galv", [s * w, y, sz * w], [s * len, y + 0.5, 0], 0.05, { col: C2, seg: 5 });
      P3.bar("galv", [s * w, y + 1.6, sz * w], [s * len, y + 0.5, 0], 0.045, { col: C2, seg: 5 });
    }
    for (let k = 1; k < 4; k++) {
      const t = k / 4, x = lerp2(s * w, s * len, t);
      P3.bar("galv", [x, y + 0.5 * t, -w * (1 - t)], [x, y + 0.5 * t, w * (1 - t)], 0.03, { col: C2, seg: 4 });
      P3.bar("galv", [x, y + 0.5 * t, w * (1 - t)], [x, y + 1.6 - 1.1 * t, w * (1 - t)], 0.03, { col: C2, seg: 4 });
    }
    for (let k = 0; k < 9; k++) P3.cyl("glass", 0.11, 0.07, s * len, y + 0.35 - k * 0.2, 0, { seg: 8, col: [0.3, 0.4, 0.4] });
    tips.push([s * len, y - 1.5, 0]);
  }
  tips.push([0, hh, 0]);
  if (o.span) for (const t of tips) P3.tube("galv", catenary(t, [t[0], t[1], o.span], o.sag ?? o.span * 0.035, 14), t[0] === 0 ? 0.03 : 0.045, { seg: 4, samples: 0, col: [0.3, 0.31, 0.33] });
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    P3.box("concrete", 0.9, 0.5, 0.9, sx * 3.4, 0, sz * 3.4, { base: true, col: CONC2, b: 0.03 });
    for (let k = 0; k < 6; k++) P3.bar("galv", [sx * hw(3.2), 3.2, sz * hw(3.2)], [sx * (hw(3.2) + 0.5 * Math.cos(k)), 3, sz * (hw(3.2) + 0.5 * Math.sin(k))], 0.012, { col: C2, seg: 4 });
  }
  P3.box("paint", 0.5, 0.36, 0.02, 0, 2.4, hw(2.4) + 0.05, { col: [0.85, 0.75, 0.1], b: 3e-3 });
  P3.cyl("emRedB", 0.12, 0.2, 0, hh + 0.15, 0, { seg: 8 });
  P3.glow("flare", [0, hh + 0.2, 0], { col: [1, 0.08, 0.04], size: 1.5, blink: 1 });
  P3.col([-3.5, 0, -3.5], [3.5, 3, 3.5], { surface: "metal" });
  return P3.finish({ grime: 0.5, ground: 1 });
});
var waterTower = (seed = 1, o = {}) => proto("fwtower" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("waterTower", seed), hh = o.h ?? 30, C2 = [0.56, 0.56, 0.54];
  P3.lathe("concrete", [[1e-3, 0], [3.4, 0], [3.2, 0.6], [2.6, 1.6], [2.3, hh * 0.3], [2.2, hh * 0.72], [2.6, hh * 0.76], [7.6, hh * 0.86], [8, hh * 0.88], [8, hh * 0.985], [7.8, hh], [1e-3, hh + 0.3]], { seg: 28, col: C2 });
  for (let k = 0; k < 10; k++) {
    const a = k * PI5 / 5;
    P3.push({ r: [0, a, 0] });
    P3.ext("concrete", [[2.2, hh * 0.5], [2.5, hh * 0.5], [7.4, hh * 0.86], [7.4, hh * 0.875], [2.2, hh * 0.76]], -0.14, 0.14, { plane: "xy", col: C2, bevel: 0.01 });
    P3.pop();
  }
  for (let k = 0; k < 28; k++) {
    const a = k * PI5 / 14;
    P3.bar("galv", [Math.cos(a) * 7.7, hh, Math.sin(a) * 7.7], [Math.cos(a) * 7.7, hh + 1.1, Math.sin(a) * 7.7], 0.025, { col: GALV, seg: 5 });
  }
  for (const y of [0.55, 1.1]) P3.add("galv", ring(7.7, 0.025, { seg: 40, radial: 5 }), GALV, { p: [0, hh + y, 0], r: [H, 0, 0] });
  for (const s of [-1, 1]) P3.bar("galv", [s * 0.25, 0.3, 2.45], [s * 0.25, hh * 0.74, 2.33], 0.025, { col: GALV, seg: 5 });
  for (let y = 0.6; y < hh * 0.74; y += 0.32) P3.bar("galv", [-0.25, y, 2.42], [0.25, y, 2.42], 0.012, { col: GALV, seg: 4 });
  for (let y = 3; y < hh * 0.74; y += 1.4) P3.add("galv", ring(0.4, 0.014, { seg: 12, radial: 4, a0: 0, a1: PI5 }), GALV, { p: [0, y, 2.5], r: [H, 0, 0] });
  P3.box("paint", 0.95, 2.05, 0.06, 0, 1.6, 2.62, { col: [0.2, 0.26, 0.24], b: 8e-3 });
  P3.bar("galv", [3, hh + 0.2, 2], [3, hh + 5.5, 2], 0.05, { col: GALV });
  for (let k = 0; k < 3; k++) P3.box("plastic", 0.16, 1.5, 0.1, 3 + Math.cos(k * 2.1) * 0.25, hh + 4.2, 2 + Math.sin(k * 2.1) * 0.25, { col: [0.82, 0.82, 0.8], b: 0.02 });
  P3.lathe("plastic", [[1e-3, 0], [0.4, 0.05], [0.42, 0.14], [1e-3, 0.2]], { seg: 12, axis: "z", col: [0.82, 0.82, 0.8], p: [3.1, hh + 2.6, 2.1] });
  P3.cyl("emRedB", 0.14, 0.22, 0, hh + 0.45, 0, { seg: 8 });
  P3.glow("flare", [0, hh + 0.5, 0], { col: [1, 0.08, 0.04], size: 1.8, blink: 1 });
  P3.col([-3.4, 0, -3.4], [3.4, hh * 0.75, 3.4], { surface: "concrete" });
  return P3.finish({ grime: 1, ground: 3 });
});
var streetBit = (seed = 1, o = {}) => proto("fstbit" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("streetBit", seed), k = o.kind || "cabinet", A = o.atlas;
  if (k === "cabinet") {
    P3.box("concrete", 1.3, 0.12, 0.5, 0, 0, 0, { base: true, col: CONC2, b: 0.01 });
    P3.add("paint", softBox(1.2, 1.15, 0.4, 0.03, 3), [0.12, 0.26, 0.16], { p: [0, 0.7, 0] });
    for (const s of [-1, 1]) {
      P3.box("paint", 0.56, 1.02, 0.02, s * 0.29, 0.7, 0.2, { col: [0.1, 0.22, 0.14], b: 0.01 });
      P3.cyl("steel", 0.02, 0.03, s * 0.08, 0.75, 0.215, { axis: "z", seg: 8, col: DK5 });
      for (let j = 0; j < 5; j++) P3.box("black", 0.3, 0.012, 0.01, s * 0.29, 1.05 + j * 0.03, 0.212, { b: 0 });
    }
    P3.box("paint", 1.26, 0.04, 0.46, 0, 1.3, 0, { col: [0.1, 0.22, 0.14], b: 0.012 });
    P3.col([-0.6, 0, -0.2], [0.6, 1.3, 0.2], { surface: "metal" });
  } else if (k === "pillar") {
    P3.lathe("paint", [[1e-3, 0], [0.27, 0], [0.27, 0.25], [0.23, 0.28], [0.23, 1.25], [0.26, 1.28], [0.27, 1.4], [0.22, 1.5], [0.08, 1.57], [1e-3, 1.58]], { seg: 18, col: [0.5, 0.05, 0.04] });
    P3.lathe("paint", [[1e-3, 0], [0.275, 0], [0.275, 0.24], [1e-3, 0.24]], { seg: 18, col: DK5 });
    P3.box("black", 0.24, 0.035, 0.02, 0, 1.12, 0.228, { b: 0 });
    P3.box("paint", 0.2, 0.26, 0.012, 0, 0.82, 0.232, { col: [0.86, 0.84, 0.78], b: 3e-3 });
    P3.col([-0.27, 0, -0.27], [0.27, 1.55, 0.27], { surface: "metal" });
  } else if (k === "grit") {
    P3.add("plastic", softBox(1.1, 0.6, 0.7, 0.06, 3), [0.75, 0.6, 0.08], { p: [0, 0.32, 0] });
    P3.add("plastic", softBox(1.16, 0.12, 0.76, 0.05, 3), [0.7, 0.55, 0.06], { p: [0, 0.68, -0.02], r: [-0.12, 0, 0] });
    P3.box("black", 0.5, 0.1, 0.01, 0, 0.36, 0.352, { b: 0 });
    P3.col([-0.55, 0, -0.35], [0.55, 0.7, 0.35], { surface: "plastic" });
  } else {
    for (const s of [-1, 1]) {
      P3.bar("paint", [s * 0.9, 0, -0.35], [s * 0.9, 1.05, 0], 0.02, { col: [0.6, 0.08, 0.06] });
      P3.bar("paint", [s * 0.9, 0, 0.35], [s * 0.9, 1.05, 0], 0.02, { col: [0.6, 0.08, 0.06] });
      P3.bar("paint", [s * 0.9, 0.3, -0.25], [s * 0.9, 0.3, 0.25], 0.012, { col: [0.6, 0.08, 0.06] });
    }
    for (const y of [0.55, 0.95]) P3.box("paint", 2, 0.2, 0.025, 0, y, 0, { col: y > 0.7 ? [0.6, 0.08, 0.06] : [0.86, 0.86, 0.82], b: 4e-3 });
    if (A) P3.quad("signF", 1.9, 0.19, A.rect("tapeRW"), { p: [0, 0.95, 0.016] });
    P3.add("plastic", softBox(0.18, 0.24, 0.1, 0.03, 2), [0.8, 0.65, 0.05], { p: [0.75, 1.18, 0] });
    P3.cyl("emAmberB", 0.07, 0.04, 0.75, 1.2, 0.05, { axis: "z", seg: 12 });
    P3.glow("flare", [0.75, 1.2, 0.09], { col: [1, 0.5, 0.05], size: 0.9, blink: 1 });
    for (const s of [-1, 1]) P3.add("burlap", softBox(0.5, 0.14, 0.3, 0.06, 2), [0.5, 0.45, 0.33], { p: [s * 0.9, 0.07, 0] });
    P3.col([-1, 0, -0.3], [1, 1.1, 0.3], { surface: "metal" });
  }
  return P3.finish({ grime: 0.8, ground: 0.4 });
});

