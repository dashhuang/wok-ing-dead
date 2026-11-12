function frameXY(P3, mat, x0, y0, x1, y1, z, t = 0.04, d = 0.05, col = null, b = 6e-3) {
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  P3.box(mat, w, t, d, cx, y0 + t / 2, z, { col, b });
  P3.box(mat, w, t, d, cx, y1 - t / 2, z, { col, b });
  P3.box(mat, t, h - 2 * t, d, x0 + t / 2, cy, z, { col, b });
  P3.box(mat, t, h - 2 * t, d, x1 - t / 2, cy, z, { col, b });
}
function louvres(P3, mat, x0, y0, x1, y1, z, n = 6, col = null, tilt = 0.6, d = 0.03) {
  const h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) P3.box(mat, x1 - x0, 5e-3, d, (x0 + x1) / 2, y0 + (i + 0.5) * h, z, { col, b: 2e-3, r: [tilt, 0, 0] });
}
function hex(P3, x, y, z, axis = "y", r = 0.012, h = 0.01, mat = "galv", col = null) {
  P3.cyl(mat, r, h, x, y, z, { seg: 6, axis, cham: 2e-3, col });
}
function wheel(P3, r, w, x, y, z, o = {}) {
  const s = r * (o.rim ?? 0.62), hw = w / 2, g2 = 9e-3;
  P3.push({ p: [x, y, z], r: [0, (o.side ?? 1) > 0 ? 0 : PI5, o.spin ?? 0] });
  const tread = [[r, -hw + 0.06]];
  const nb2 = o.grooves ?? 3;
  for (let i = 1; i <= nb2; i++) {
    const t = -hw + 0.06 + (w - 0.12) * i / (nb2 + 1);
    tread.push([r, t - 0.012], [r - g2, t - 7e-3], [r - g2, t + 7e-3], [r, t + 0.012]);
  }
  tread.push([r, hw - 0.06]);
  P3.lathe("rubber", [[s, -hw + 0.012], [s + 0.03, -hw], [r - 0.035, -hw], [r - 6e-3, -hw + 0.028], ...tread, [r - 6e-3, hw - 0.028], [r - 0.035, hw], [s + 0.03, hw], [s, hw - 0.012]], { axis: "z", seg: o.seg || 18, col: [0.95, 0.95, 0.95], crease: 50 });
  const nBlk = o.blocks ?? 26;
  for (let i = 0; i < nBlk; i++) {
    const a = i / nBlk * PI5 * 2;
    for (const sd of [-1, 1]) P3.box("rubber", 0.045, 0.014, 0.03, Math.cos(a) * (r - 0.012), Math.sin(a) * (r - 0.012), sd * (hw - 0.022), { r: [0, 0, a + H + 0.3 * sd], b: 0, col: [0.9, 0.9, 0.9] });
  }
  if (!o.flat) {
    const rm = o.rimMat || "steel", rc = o.rimCol || [0.75, 0.76, 0.78], f3 = hw - (o.dish ?? 0.03);
    P3.lathe(rm, [[s + 4e-3, hw - 0.02], [s, hw - 8e-3], [s * 0.94, hw - 0.012], [s * 0.9, f3 - 0.012], [s * 0.6, f3 - 0.03], [s * 0.42, f3 - 0.022], [s * 0.3, f3 - 6e-3], [s * 0.2, f3 - 6e-3], [s * 0.17, f3 + 0.014], [0, f3 + 0.016]], { axis: "z", seg: o.seg || 22, col: rc, crease: 30 });
    const nh = o.holes ?? 5;
    for (let i = 0; i < nh; i++) {
      const a = i / nh * PI5 * 2 + 0.3;
      P3.cyl("black", s * 0.11, 4e-3, Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.7, f3 - 0.024, { axis: "z", seg: 10, cham: 0 });
      hex(P3, Math.cos(a + 0.6) * s * 0.3, Math.sin(a + 0.6) * s * 0.3, f3 - 2e-3, "z", 0.011, 0.014, "galv");
    }
    P3.cyl("black", s * 0.985, 0.03, 0, 0, -hw + 0.03, { axis: "z", seg: 16, cham: 0 });
  }
  P3.pop();
}
var boltRing = (P3, n, R4, x, y, z, axis = "y", r = 0.012, h = 0.012) => {
  for (let i = 0; i < n; i++) {
    const a = i / n * PI5 * 2 + 0.4;
    if (axis === "y") hex(P3, x + Math.cos(a) * R4, y, z + Math.sin(a) * R4, "y", r, h);
    else hex(P3, x + Math.cos(a) * R4, y + Math.sin(a) * R4, z, "z", r, h);
  }
};
var guardBooth = (seed = 1, o = {}) => proto("booth" + seed, () => {
  const P3 = new Prop("booth", seed), A = o.atlas, W = 2.6, D = 1.9, hw = W / 2, hd = D / 2, y0 = 0.16, y1 = 2.56, t = 0.05, wc = [0.78, 0.79, 0.76], band = [0.1, 0.19, 0.36], dk = [0.16, 0.17, 0.18];
  for (const z of [-hd + 0.14, hd - 0.14]) {
    const cuts = [-hw, -0.72, -0.5, 0.5, 0.72, hw];
    for (let i = 0; i < 5; i++) if (i % 2 === 0) P3.box("steel", cuts[i + 1] - cuts[i], 0.12, 0.12, (cuts[i] + cuts[i + 1]) / 2, 0.06, z, { col: dk, b: 8e-3 });
    else P3.box("steel", 0.22, 0.03, 0.12, (cuts[i] + cuts[i + 1]) / 2, 0.105, z, { col: dk, b: 4e-3 });
  }
  P3.box("steel", W + 0.02, 0.05, D + 0.02, 0, 0.135, 0, { col: dk, b: 0.01 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P3.box("paint", 0.09, y1 - y0, 0.09, sx * (hw - 0.045), (y0 + y1) / 2, sz * (hd - 0.045), { col: band, b: 0.012 });
  for (const sz of [-1, 1]) P3.box("paint", W - 0.16, 0.1, 0.07, 0, y1 - 0.05, sz * (hd - 0.04), { col: band, b: 0.01 });
  for (const sx of [-1, 1]) P3.box("paint", 0.07, 0.1, D - 0.16, sx * (hw - 0.04), y1 - 0.05, 0, { col: band, b: 0.01 });
  const wall2 = (len, holes, ribs0, ribs1) => {
    P3.ext("paint", rectPts(-len / 2, y0, len / 2, y1 - 0.1), -t, 0, { holes, bevel: 3e-3, col: wc });
    P3.ext("paint", rectPts(-len / 2, y0, len / 2, y0 + 0.5), 0, 6e-3, { bevel: 3e-3, col: band, holes: holes.filter((h) => h[0][1] < y0 + 0.5) });
    for (let x = -len / 2 + 0.12; x < len / 2 - 0.08; x += 0.19) {
      if (holes.some((h) => x > h[0][0] - 0.05 && x < h[2][0] + 0.05 && h[0][1] < 1)) continue;
      P3.ext("paint", [[x - 0.035, 0], [x + 0.035, 0], [x + 0.02, -0.014], [x - 0.02, -0.014]], ribs0, ribs1, { plane: "up", bevel: 3e-3, col: wc, r: [0, 0, 0] });
    }
  };
  P3.push({ p: [0, 0, hd] });
  const sw = [[-0.82, 1.02], [0.82, 1.02], [0.82, 2.02], [-0.82, 2.02]];
  wall2(W - 0.18, [sw], y0 + 0.52, 0.98);
  frameXY(P3, "galv", -0.84, 1, 0.84, 2.04, -0.02, 0.045, 0.08);
  P3.box("galv", 0.035, 0.96, 0.04, 0.02, 1.52, -0.03, {});
  frameXY(P3, "galv", -0.8, 1.04, 0.05, 2, -8e-3, 0.03, 0.02);
  P3.box("glassT", 0.8, 0.94, 6e-3, -0.4, 1.52, -8e-3, { b: 0 });
  P3.box("glassT", 0.78, 0.94, 6e-3, 0.42, 1.52, -0.03, { b: 0 });
  P3.box("steel", 0.7, 0.02, 0.24, 0.3, 1, 0.07, { col: [0.8, 0.8, 0.82], b: 6e-3 });
  for (const x of [0.02, 0.58]) P3.beam("steel", [x, 1, 0.16], [x, 0.84, 0], 0.02, 6e-3, { col: dk });
  P3.box("paint", 1.9, 0.03, 0.34, 0, 2.2, 0.15, { col: band, b: 8e-3, r: [0.14, 0, 0] });
  for (const x of [-0.85, 0.85]) P3.bar("steel", [x, 2.17, 0.3], [x, 2.02, 0.01], 8e-3, { col: dk });
  if (A) {
    P3.quad("sign", 0.9, 0.9 / A.aspect("boothId"), A.rect("boothId"), { p: [0, 2.3, 0.012] });
    P3.quad("decal", 0.5, 0.5 / A.aspect("stop"), A.rect("stop"), { p: [-0.95, 0.72, 0.012] });
    P3.quad("sign", 0.34, 0.34 / A.aspect("openclosed"), A.rect("openclosed"), { p: [0.42, 1.86, -0.036] });
  }
  P3.pop();
  P3.push({ p: [0, 0, -hd], r: [0, PI5, 0] });
  const hwn = [[-0.3, 1.7], [0.75, 1.7], [0.75, 2.05], [-0.3, 2.05]];
  wall2(W - 0.18, [hwn], y0 + 0.52, 1.6);
  frameXY(P3, "galv", -0.32, 1.68, 0.77, 2.07, -0.02, 0.04, 0.07);
  P3.box("glassT", 1, 0.32, 6e-3, 0.225, 1.875, -0.02, { b: 0 });
  P3.add("paint", softBox(0.78, 0.5, 0.28, 0.025, 3), [0.82, 0.82, 0.8], { p: [-0.78, 1.72, 0.15] });
  louvres(P3, "paint", -1.13, 1.52, -0.43, 1.9, 0.295, 8, [0.6, 0.6, 0.6], 0.5, 0.025);
  P3.cyl("black", 0.16, 0.01, -0.78, 1.71, 0.288, { axis: "z", seg: 16 });
  for (const s of [-1, 1]) P3.beam("steel", [-0.78 + s * 0.3, 1.47, 0.02], [-0.78 + s * 0.3, 1.47, 0.3], 0.03, 0.03, { col: dk });
  P3.tube("rubber", [[-0.5, 1.5, 0.1], [-0.5, 1.2, 0.06], [-0.46, 0.5, 0.04], [-0.46, 0.2, 0.05]], 0.012, { col: [0.5, 0.5, 0.5] });
  P3.box("galv", 0.34, 0.46, 0.12, 0.85, 1.25, 0.06, { b: 0.01 });
  P3.box("galv", 0.3, 0.42, 0.01, 0.85, 1.25, 0.124, { b: 4e-3 });
  hex(P3, 0.96, 1.25, 0.134, "z", 0.012, 0.012);
  P3.bar("galv", [0.85, 1.48, 0.05], [0.85, 2.5, 0.05], 0.014);
  P3.bar("galv", [0.85, 1.02, 0.05], [0.85, 0.16, 0.05], 0.014);
  for (const y of [0.5, 1.9, 2.3]) P3.box("galv", 0.05, 0.012, 0.03, 0.85, y, 0.035, { b: 3e-3 });
  if (A) P3.quad("decal", 0.6, 0.6 / A.aspect("posterEvac"), A.rect("posterEvac"), { p: [0.1, 1.05, 4e-3], r: [0, 0, 0.05] });
  P3.pop();
  P3.push({ p: [hw, 0, 0], r: [0, H, 0] });
  const dh = [[-0.42, y0 + 0.02], [0.42, y0 + 0.02], [0.42, 2.18], [-0.42, 2.18]];
  P3.ext("paint", rectPts(-(D - 0.18) / 2, y0, (D - 0.18) / 2, y1 - 0.1), -t, 0, { holes: [dh], bevel: 3e-3, col: wc });
  frameXY(P3, "paint", -0.46, y0, 0.46, 2.22, -0.02, 0.04, 0.08, band);
  P3.ext("paint", rectPts(-0.415, y0 + 0.03, 0.415, 2.175), -0.045, -5e-3, { holes: [roundRect(-0.2, 1.3, 0.2, 1.95, 0.03, 3)], bevel: 4e-3, col: [0.72, 0.73, 0.7] });
  P3.box("glassT", 0.42, 0.67, 6e-3, 0, 1.625, -0.025, { b: 0 });
  frameXY(P3, "rubber", -0.21, 1.29, 0.21, 1.96, -3e-3, 0.018, 0.012, [0.4, 0.4, 0.4]);
  P3.box("steel", 0.78, 0.26, 4e-3, 0, y0 + 0.19, -2e-3, { col: [0.85, 0.85, 0.87], b: 1e-3 });
  P3.box("steel", 0.05, 0.16, 0.012, 0.33, 1.08, 4e-3, { col: [0.85, 0.85, 0.87], b: 4e-3 });
  P3.bar("steel", [0.33, 1.1, 0.01], [0.33, 1.1, 0.05], 9e-3, { col: C.steel });
  P3.bar("steel", [0.33, 1.1, 0.05], [0.21, 1.1, 0.05], 9e-3, { col: C.steel });
  for (const y of [0.45, 1.2, 1.95]) P3.cyl("steel", 0.012, 0.1, -0.425, y, 8e-3, { seg: 8, col: C.steel });
  P3.box("steel", 0.24, 0.05, 0.05, -0.2, 2.13, 0.02, { col: dk });
  P3.beam("steel", [-0.1, 2.12, 0.04], [0.12, 2.2, 0.03], 0.016, 8e-3, { col: dk });
  P3.box("steel", 0.9, 0.03, 0.32, 0, y0 - 0.03, 0.17, { col: dk, b: 6e-3 });
  for (const x of [-0.4, 0.4]) P3.box("steel", 0.03, 0.13, 0.3, x, 0.065, 0.17, { col: dk, b: 5e-3 });
  if (A) P3.quad("decal", 0.3, 0.3 / A.aspect("notice"), A.rect("notice"), { p: [0, 1.05, 2e-3] });
  P3.pop();
  P3.push({ p: [-hw, 0, 0], r: [0, -H, 0] });
  const ew = [[-0.45, 1.05], [0.45, 1.05], [0.45, 1.95], [-0.45, 1.95]];
  wall2(D - 0.18, [ew], y0 + 0.52, 1);
  frameXY(P3, "galv", -0.47, 1.03, 0.47, 1.97, -0.02, 0.045, 0.08);
  P3.box("glassT", 0.84, 0.84, 6e-3, 0, 1.5, -0.02, { b: 0 });
  for (let i = 0; i < 6; i++) P3.bar("steel", [-0.42 + i * 0.168, 1.03, 0.03], [-0.42 + i * 0.168, 1.97, 0.03], 6e-3, { col: dk });
  for (const y of [1.03, 1.5, 1.97]) P3.bar("steel", [-0.47, y, 0.03], [0.47, y, 0.03], 7e-3, { col: dk });
  if (A) P3.quad("decal", 0.52, 0.52 / A.aspect("grafTag"), A.rect("grafTag"), { p: [0, 0.75, 8e-3], r: [0, 0, -0.08] });
  P3.pop();
  P3.push({ p: [0, y1, 0], r: [-0.035, 0, 0] });
  P3.box("paint", W + 0.36, 0.07, D + 0.44, 0, 0.05, 0.02, { col: band, b: 0.012 });
  P3.box("galv", W + 0.3, 0.012, D + 0.38, 0, 0.09, 0.02, { b: 4e-3 });
  for (let x = -hw - 0.05; x <= hw + 0.06; x += 0.45) P3.box("galv", 0.03, 0.03, D + 0.36, x, 0.105, 0.02, { b: 6e-3 });
  P3.ext("galv", [[-0.05, 0], [0.05, 0], [0.05, 0.07], [0.04, 0.07], [0.04, 0.01], [-0.04, 0.01], [-0.04, 0.07], [-0.05, 0.07]], -hw - 0.17, hw + 0.17, { plane: "side", bevel: 2e-3, p: [0, -0.03, -hd - 0.26] });
  P3.cyl("steel", 0.07, 0.03, -0.9, 0.12, 0.5, { seg: 14, col: dk });
  P3.lathe("emAmberB", [[0.055, 0], [0.058, 0.07], [0.045, 0.1], [0, 0.105]], { seg: 14, p: [-0.9, 0.135, 0.5] });
  P3.bar("steel", [0.95, 0.1, -0.6], [0.95, 2, -0.62], 6e-3, { r2: 2e-3, col: dk });
  P3.cyl("steel", 0.03, 0.08, 0.95, 0.14, -0.6, { seg: 10, col: dk });
  P3.lathe("paint", [[0.03, 0], [0.04, 0.05], [0.11, 0.2], [0.115, 0.215], [0.1, 0.215], [0.035, 0.07], [0, 0.06]], { axis: "z", seg: 14, p: [0.3, 0.2, 0.75], col: [0.7, 0.7, 0.68] });
  P3.box("steel", 0.03, 0.12, 0.03, 0.3, 0.14, 0.78, { col: dk });
  P3.pop();
  P3.push({ p: [-0.55, y1 + 0.06, hd + 0.2], r: [0.9, 0, 0] });
  P3.add("paint", softBox(0.3, 0.2, 0.1, 0.015, 2), dk, {});
  for (let i = 0; i < 7; i++) P3.box("paint", 6e-3, 0.18, 0.03, -0.12 + i * 0.04, 0, -0.06, { col: dk, b: 1e-3 });
  P3.box("lampCool", 0.26, 0.16, 4e-3, 0, 0, 0.052, { b: 0 });
  P3.glow("fill", [0, 0, 0.3], { col: [0.8, 0.9, 1], power: 9, dist: 9, dir: [0, 0, 1], cone: 0.7, back: 0.25 });
  P3.glow("flare", [0, 0, 0.06], { col: [0.8, 0.9, 1], size: 0.5 });
  P3.pop();
  P3.beam("steel", [-0.55, y1 + 0.02, hd + 0.02], [-0.55, y1 + 0.05, hd + 0.17], 0.03, 0.012, { col: dk });
  P3.box("rubber", W - 0.12, 0.02, D - 0.12, 0, y0 + 5e-3, 0, { col: [0.5, 0.5, 0.5], b: 2e-3 });
  P3.box("wood", W - 0.3, 0.035, 0.5, 0, 0.98, hd - 0.33, { col: [0.75, 0.7, 0.6], b: 8e-3 });
  for (const x of [-1, 1]) P3.box("paint", 0.03, 0.8, 0.44, x, 0.57, hd - 0.33, { col: dk, b: 4e-3 });
  P3.push({ p: [-0.55, 1, hd - 0.42], r: [0, 2.7, 0] });
  P3.add("trim", softBox(0.46, 0.3, 0.035, 0.012, 2), null, { p: [0, 0.27, 0] });
  P3.box("emWhite", 0.41, 0.25, 2e-3, 0, 0.275, 0.019, { b: 0 });
  P3.box("trim", 0.05, 0.12, 0.03, 0, 0.07, -0.02, {});
  P3.box("trim", 0.2, 0.012, 0.14, 0, 6e-3, 0, {});
  P3.pop();
  P3.box("trim", 0.4, 0.016, 0.13, -0.5, 1.006, hd - 0.2, { r: [0, 0.1, 0] });
  P3.cyl("paint", 0.038, 0.09, 0.2, 1.045, hd - 0.3, { seg: 12, col: [0.7, 0.1, 0.08], capTop: false });
  P3.box("paint", 0.23, 0.012, 0.32, 0.62, 1.004, hd - 0.33, { col: [0.5, 0.36, 0.2], r: [0, 0.3, 0] });
  P3.box("plastic", 0.2, 2e-3, 0.28, 0.62, 1.012, hd - 0.33, { col: [0.9, 0.9, 0.86], r: [0, 0.34, 0], b: 0 });
  P3.box("trim", 0.18, 0.06, 0.2, 0.95, 1.03, hd - 0.36, {});
  P3.tube("rubber", [[0.95, 1.04, hd - 0.44], [0.9, 1, hd - 0.52], [0.8, 0.7, hd - 0.56], [0.7, 0.3, hd - 0.5]], 5e-3, { col: [0.3, 0.3, 0.3] });
  P3.push({ p: [0.1, y0, -0.15], r: [0, 0.5, 0] });
  for (let i = 0; i < 5; i++) {
    const a = i * PI5 * 0.4;
    P3.beam("steel", [0, 0.06, 0], [Math.cos(a) * 0.28, 0.035, Math.sin(a) * 0.28], 0.03, 0.02, { col: dk });
    P3.cyl("trim", 0.025, 0.02, Math.cos(a) * 0.28, 0.025, Math.sin(a) * 0.28, { axis: "x", seg: 8 });
  }
  P3.cyl("steel", 0.022, 0.36, 0, 0.26, 0, { seg: 8, col: C.steel });
  P3.add("canvas", softBox(0.46, 0.07, 0.44, 0.03, 3), [0.2, 0.2, 0.22], { p: [0, 0.47, 0] });
  P3.add("canvas", softBox(0.42, 0.5, 0.06, 0.03, 3), [0.2, 0.2, 0.22], { p: [0, 0.8, -0.22], r: [-0.12, 0, 0] });
  P3.beam("steel", [0, 0.45, -0.18], [0, 0.6, -0.24], 0.05, 0.012, { col: dk });
  P3.pop();
  P3.box("lampDim", 0.9, 0.012, 0.22, 0.1, y1 - 0.115, 0, { b: 0 });
  P3.box("paint", 0.96, 0.03, 0.28, 0.1, y1 - 0.1, 0, { col: [0.8, 0.8, 0.8], b: 4e-3 });
  P3.glow("fill", [0.1, y1 - 0.5, 0], { col: [1, 0.86, 0.66], power: 5, dist: 6 });
  P3.box("paint", 0.5, 0.36, 0.08, -0.6, 0.55, -hd + 0.1, { col: [0.8, 0.8, 0.78], b: 0.01 });
  louvres(P3, "paint", -0.83, 0.4, -0.37, 0.7, -hd + 0.145, 6, [0.5, 0.5, 0.5], 0.4, 0.02);
  P3.col([-hw, 0, -hd], [hw, y1 + 0.1, hd], { surface: "metal" });
  P3.socket("lamp", [-0.55, y1 + 0.1, hd + 0.3]);
  return P3.finish({ grime: 1.1 });
});
function floodHead(P3, on = true, w = 0.46, h = 0.32) {
  const dk = [0.13, 0.13, 0.14];
  P3.add("paint", softBox(w, h, 0.07, 0.014, 2), dk, { p: [0, 0, -0.01] });
  frameXY(P3, "paint", -w / 2 - 6e-3, -h / 2 - 6e-3, w / 2 + 6e-3, h / 2 + 6e-3, 0.03, 0.03, 0.024, dk);
  for (let i = 0; i < 13; i++) P3.box("paint", 6e-3, h - 0.05, 0.05, -w / 2 + 0.035 + i * (w - 0.07) / 12, 0, -0.068, { col: dk, b: 1e-3 });
  P3.box(on ? "lampCool" : "glass", w - 0.05, h - 0.05, 4e-3, 0, 0, 0.03, { b: 0 });
  if (on) {
    for (let i = 1; i < 4; i++) P3.box("paint", w - 0.05, 4e-3, 6e-3, 0, -h / 2 + 0.025 + i * (h - 0.05) / 4, 0.034, { col: dk, b: 0 });
  }
  for (const s of [-1, 1]) {
    P3.beam("steel", [s * (w / 2 + 0.03), 0, 0], [s * (w / 2 + 0.03), -h / 2 - 0.07, -0.02], 0.012, 0.04, { col: C.steel });
    P3.cyl("trim", 0.022, 0.02, s * (w / 2 + 0.045), 0, 0, { axis: "x", seg: 8 });
    hex(P3, s * (w / 2 + 0.018), 0, 0, "x", 0.012, 0.03);
  }
  P3.box("steel", w + 0.085, 0.012, 0.04, 0, -h / 2 - 0.07, -0.02, { col: C.steel, b: 3e-3 });
  P3.box("trim", 0.07, 0.05, 0.05, 0, 0, -0.1, {});
  P3.tube("rubber", [[0, -0.02, -0.12], [0, -0.1, -0.16], [0, -h / 2 - 0.1, -0.06]], 8e-3, { col: [0.3, 0.3, 0.3] });
}
var lightTower = (seed = 1, o = {}) => proto("tower" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("tower", seed), A = o.atlas, yel = o.col || [0.82, 0.6, 0.05], dk = [0.12, 0.12, 0.13], mastH = o.h || 7.2, aimYaw = o.yaw ?? 0, tilt = o.tilt ?? 0.62, on = o.on !== false;
  for (const z of [-0.42, 0.42]) P3.box("steel", 2.3, 0.08, 0.06, 0, 0.42, z, { col: dk, b: 8e-3 });
  for (const x of [-1.1, -0.4, 0.4, 1.1]) P3.box("steel", 0.06, 0.07, 0.86, x, 0.42, 0, { col: dk, b: 8e-3 });
  P3.bar("steel", [-0.15, 0.33, -0.66], [-0.15, 0.33, 0.66], 0.03, { col: dk });
  for (const s of [-1, 1]) {
    wheel(P3, 0.33, 0.2, -0.15, 0.33, s * 0.63, { side: s, rimCol: [0.8, 0.8, 0.8] });
    P3.add("paint", sweep(rectPts(-0.12, -6e-3, 0.12, 6e-3), Array.from({ length: 9 }, (_, i) => {
      const a = PI5 * (0.08 + 0.84 * i / 8);
      return [-0.15 - Math.cos(a) * 0.4, 0.33 + Math.sin(a) * 0.4, s * 0.63];
    }), { up: [0, 0, 1], crease: 60 }), dk, {});
    for (const x of [-0.42, 0.12]) P3.beam("steel", [x, 0.4, s * 0.45], [x, 0.4, s * 0.55], 0.03, 0.05, { col: dk });
    P3.box("emRed", 0.012, 0.08, 0.1, -1.16, 0.5, s * 0.36, { b: 2e-3 });
  }
  for (const s of [-1, 1]) P3.beam("steel", [1.1, 0.42, s * 0.4], [2.05, 0.42, s * 0.04], 0.06, 0.06, { col: dk });
  P3.box("steel", 0.3, 0.07, 0.1, 2.15, 0.44, 0, { col: dk });
  P3.lathe("steel", [[0, 0], [0.05, 0], [0.062, 0.03], [0.062, 0.06], [0.04, 0.085], [0, 0.09]], { seg: 12, p: [2.3, 0.41, 0], col: dk });
  P3.bar("steel", [2.2, 0.5, 0], [2.08, 0.56, 0.05], 8e-3, { col: C.steel });
  P3.cyl("steel", 0.026, 0.62, 1.75, 0.45, 0.2, { seg: 10, col: C.steel });
  P3.box("steel", 0.08, 0.06, 0.1, 1.75, 0.45, 0.14, { col: dk });
  P3.bar("steel", [1.75, 0.76, 0.2], [1.83, 0.8, 0.2], 7e-3, { col: dk });
  P3.push({ p: [1.75, 0.1, 0.2], r: [H, 0, 0] });
  P3.lathe("rubber", [[0.03, -0.03], [0.08, -0.035], [0.1, -0.02], [0.1, 0.02], [0.08, 0.035], [0.03, 0.03]], { seg: 14, col: [0.8, 0.8, 0.8] });
  P3.pop();
  for (const s of [-1, 1]) P3.box("steel", 0.03, 0.14, 6e-3, 1.75, 0.16, 0.2 + s * 0.045, { col: dk });
  P3.tube("steel", catenary([2.05, 0.4, 0.06], [2.3, 0.34, 0.1], 0.12, 8), 5e-3, { col: C.steel });
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const bx3 = sx * 1.05, ex = sx * 1.45, ez = sz * 1.2;
    P3.beam("steel", [bx3, 0.42, sz * 0.44], [ex, 0.42, ez], 0.06, 0.06, { col: yel });
    P3.cyl("steel", 0.03, 0.5, ex, 0.3, ez, { seg: 10, col: dk });
    P3.cyl("steel", 0.016, 0.3, ex, 0.14, ez, { seg: 8, col: C.steel });
    P3.cyl("steel", 0.085, 0.016, ex, 8e-3, ez, { seg: 12, col: dk, cham: 4e-3 });
    P3.bar("steel", [ex, 0.56, ez], [ex + 0.09, 0.58, ez], 7e-3, { col: dk });
    hex(P3, bx3, 0.47, sz * 0.44, "y", 0.018, 0.02);
  }
  const cw = 1.55, ch = 0.92, cd = 0.88, cy = 0.47 + ch / 2;
  P3.add("paint", softBox(cw, ch, cd, 0.05, 5), yel, { p: [0.15, cy, 0] });
  P3.box("steel", cw + 0.03, 0.05, cd + 0.03, 0.15, 0.475, 0, { col: dk, b: 0.01 });
  for (const s of [-1, 1]) {
    P3.push({ p: [0.15, cy, s * (cd / 2)], r: [0, s > 0 ? 0 : PI5, 0] });
    frameXY(P3, "paint", -0.7, -0.38, -0.05, 0.36, 4e-3, 0.03, 0.012, yel);
    P3.box("black", 0.58, 0.68, 4e-3, -0.375, -0.01, 0, { b: 0 });
    louvres(P3, "paint", -0.665, -0.35, -0.085, 0.33, 6e-3, 13, yel, 0.7, 0.03);
    frameXY(P3, "paint", 0, -0.38, 0.7, 0.36, 6e-3, 0.02, 8e-3, [yel[0] * 0.8, yel[1] * 0.8, yel[2] * 0.8]);
    for (const y of [-0.2, 0.2]) {
      P3.box("steel", 0.035, 0.07, 0.014, 0.66, y, 0.012, { col: dk, b: 4e-3 });
    }
    for (const y of [-0.26, 0.26]) P3.cyl("steel", 0.01, 0.08, 0.015, y, 0.01, { seg: 6, col: dk });
    if (A && s > 0) {
      P3.quad("decal", 0.42, 0.42 / A.aspect("genLabel"), A.rect("genLabel"), { p: [0.35, 0.05, 0.012] });
    }
    P3.pop();
  }
  P3.push({ p: [0.15 + cw / 2, cy, 0], r: [0, H, 0] });
  P3.box("black", 0.5, 0.34, 6e-3, 0, 0.12, -3e-3, { b: 0 });
  frameXY(P3, "paint", -0.27, -0.07, 0.27, 0.31, 4e-3, 0.025, 0.02, dk);
  for (let i = 0; i < 3; i++) {
    P3.cyl("trim", 0.04, 0.012, -0.16 + i * 0.1, 0.2, 4e-3, { axis: "z", seg: 12 });
    P3.cyl("emWhite", 0.03, 4e-3, -0.16 + i * 0.1, 0.2, 0.011, { axis: "z", seg: 12, cham: 0 });
  }
  for (let i = 0; i < 5; i++) P3.cyl(i === 1 ? "ledGreen" : i === 4 ? "ledRed" : "trim", 0.012, 0.014, -0.18 + i * 0.07, 0.04, 6e-3, { axis: "z", seg: 8 });
  P3.cyl("paint", 0.03, 0.03, 0.16, 0.2, 0.012, { axis: "z", seg: 12, col: C.red });
  P3.box("trim", 0.1, 0.07, 0.03, 0.14, 0.06, 0.012, {});
  P3.pop();
  P3.cyl("steel", 0.035, 0.34, 0.75, cy + ch / 2 + 0.15, -0.25, { seg: 10, col: [0.5, 0.4, 0.35] });
  P3.box("steel", 0.1, 4e-3, 0.1, 0.75, cy + ch / 2 + 0.34, -0.25, { col: [0.5, 0.4, 0.35], r: [0, 0, 0.5], b: 0 });
  P3.add("steel", ring(0.05, 0.012, { seg: 12, a0: 0, a1: PI5 }), dk, { p: [0.15, cy + ch / 2 - 4e-3, 0], r: [0, H, 0] });
  P3.cyl("trim", 0.04, 0.03, 0.55, cy + ch / 2 + 0.01, 0.25, { seg: 12 });
  const mx = -0.92, sec = [[0.075, 0.5, mastH * 0.42], [0.06, mastH * 0.36, mastH * 0.72], [0.046, mastH * 0.66, mastH]];
  P3.box("steel", 0.24, 0.5, 0.24, mx, 0.72, 0, { col: dk, b: 0.012 });
  for (const s of [-1, 1]) P3.beam("steel", [mx + 0.1, 0.95, s * 0.1], [mx + 0.5, 0.5, s * 0.3], 0.04, 0.04, { col: dk });
  for (const [r, a, b] of sec) {
    P3.ext("galv", chamRect(-r, -r, r, r, r * 0.3), a, b, { plane: "up", bevel: 4e-3, p: [mx, 0, 0] });
    P3.box("steel", r * 2 + 0.04, 0.07, r * 2 + 0.04, mx, b - 0.035, 0, { col: dk, b: 8e-3 });
    P3.bar("steel", [mx - r - 0.05, b - 0.035, 0], [mx + r + 0.05, b - 0.035, 0], 8e-3, { col: C.steel });
  }
  P3.push({ p: [mx + 0.14, 1.15, 0] });
  P3.cyl("steel", 0.06, 0.12, 0, 0, 0, { axis: "z", seg: 12, col: dk });
  for (const s of [-1, 1]) P3.cyl("steel", 0.085, 8e-3, 0, 0, s * 0.064, { axis: "z", seg: 14, col: dk });
  P3.bar("steel", [0, 0, 0.07], [0, 0, 0.16], 0.01, { col: C.steel });
  P3.bar("steel", [0, 0, 0.16], [0.02, -0.14, 0.16], 0.01, { col: C.steel });
  P3.cyl("trim", 0.018, 0.08, 0.02, -0.14, 0.2, { axis: "z", seg: 8 });
  P3.pop();
  P3.bar("steel", [mx + 0.11, 1.2, 0], [mx + 0.085, mastH * 0.42, 0], 4e-3, { col: C.steel });
  {
    const pts = [];
    for (let i = 0; i <= 150; i++) {
      const t = i / 150, a = t * PI5 * 2 * 15;
      pts.push([mx + Math.cos(a) * 0.11, 1.7 + t * (mastH - 2.3), Math.sin(a) * 0.11]);
    }
    P3.tube("rubber", pts, 8e-3, { seg: 5, samples: 0, col: [0.9, 0.5, 0.1] });
  }
  P3.push({ p: [mx, mastH, 0], r: [0, aimYaw, 0] });
  P3.box("steel", 0.1, 0.16, 0.1, 0, 0.06, 0, { col: dk });
  P3.box("galv", 1.9, 0.06, 0.06, 0, 0.14, 0, { b: 8e-3 });
  for (let i = 0; i < 4; i++) {
    const x = -0.72 + i * 0.48, up = i % 2 ? 0.46 : 0.06;
    P3.bar("galv", [x, 0.14, 0], [x, 0.14 + up + 0.2, 0], 0.018);
    P3.push({ p: [x, 0.14 + up + 0.42, 0.04], r: [tilt, (i - 1.5) * 0.09, 0] });
    floodHead(P3, on);
    P3.pop();
  }
  if (on) {
    const ty = Math.sin(tilt), tz = Math.cos(tilt);
    P3.glow("key", [0, 0.6, 0.2], { dir: [0, -ty, tz], col: o.lightCol || [0.82, 0.9, 1] });
    for (let i = 0; i < 4; i++) P3.glow("flare", [-0.72 + i * 0.48, 0.56 + (i % 2 ? 0.46 : 0.06), 0.1], { col: o.lightCol || [0.82, 0.9, 1], size: 1.5 });
  }
  P3.pop();
  if (A) P3.quad("decal", 0.3, 0.3 / A.aspect("reflector"), A.rect("reflector"), { p: [-1.165, 0.44, 0], r: [0, -H, 0] });
  P3.col([-0.62, 0, -0.46], [0.94, 1.42, 0.46], { surface: "metal" });
  P3.col([mx - 0.14, 0, -0.14], [mx + 0.14, 3.2, 0.14], { surface: "metal" });
  P3.col([-0.4, 0, -0.76], [0.1, 0.7, 0.76], { surface: "rubber", noNav: true });
  P3.col([0.94, 0.3, -0.25], [2.3, 0.55, 0.25], { surface: "metal" });
  return P3.finish({ grime: 1 });
});
var deconTent = (seed = 1, o = {}) => proto("tent" + seed, () => {
  const P3 = new Prop("tent", seed), A = o.atlas, W = 4.2, L = 6, hw = W / 2, hl = L / 2, eave = 2.15, ridge = 2.95, tc = o.col || [0.74, 0.72, 0.62], tc2 = [0.25, 0.36, 0.3], al = [0.92, 0.92, 0.95];
  const zs = [-hl, 0, hl];
  for (const z of zs) {
    for (const s of [-1, 1]) {
      P3.bar("galv", [s * hw, 0.02, z], [s * hw, eave, z], 0.026, { col: al });
      P3.box("galv", 0.2, 0.012, 0.2, s * hw, 6e-3, z, { b: 3e-3 });
      hex(P3, s * hw + 0.06, 0.016, z + 0.06, "y", 0.012, 0.014);
      hex(P3, s * hw - 0.06, 0.016, z - 0.06, "y", 0.012, 0.014);
      P3.bar("galv", [s * hw, eave, z], [0, ridge, z], 0.026, { col: al });
      P3.add("plastic", softBox(0.11, 0.11, 0.09, 0.02, 2), dkc, { p: [s * hw, eave, z] });
      P3.bar("galv", [s * hw, eave - 0.5, z], [s * (hw - 0.55), eave + 0.19, z], 0.016, { col: al });
    }
    P3.add("plastic", softBox(0.13, 0.1, 0.09, 0.02, 2), dkc, { p: [0, ridge, z] });
  }
  for (const [x, y] of [[0, ridge], [-hw, eave], [hw, eave], [-hw / 2, (eave + ridge) / 2], [hw / 2, (eave + ridge) / 2]]) P3.bar("galv", [x, y, -hl], [x, y, hl], 0.02, { col: al });
  P3.bar("galv", [hw, 0.3, -hl], [hw, eave - 0.2, 0], 0.012, { col: al });
  P3.bar("galv", [-hw, 0.3, 0], [-hw, eave - 0.2, -hl], 0.012, { col: al });
  const NU = 22, NV = 30, U = Array.from({ length: NU + 1 }, (_, i) => i / NU), V = Array.from({ length: NV + 1 }, (_, i) => i / NV);
  for (const s of [-1, 1]) {
    const g2 = gridSurf(U, V, (u, v, q) => {
      const x = s * hw * (1 - u) * 1.035, z = (v - 0.5) * (L + 0.16), fz = Math.abs(Math.sin(v * PI5 * 2)), fu = Math.abs(Math.sin(u * PI5 * 2));
      let y = eave + (ridge - eave) * u - 0.045 * fz * fu - 0.012 * Math.sin(v * 37 + u * 9 + s) * fz - 0.02 * (1 - u) * (0.5 + 0.5 * Math.sin(v * 23 + s * 2));
      if (u < 1e-3) y -= 0.02;
      q.set(x, y + 0.03, z);
      const k = 0.9 + 0.1 * vnoise(x * 2, y * 2, z * 2);
      return [tc[0] * k, tc[1] * k, tc[2] * k];
    }, { flipWinding: s < 0 });
    P3.add("tarp", g2, null, {});
    const gv = gridSurf(V, [0, 0.33, 0.66, 1], (v, t, q) => {
      const z = (v - 0.5) * (L + 0.16), sc2 = 0.26 + 0.05 * Math.abs(Math.sin(v * PI5 * 12));
      q.set(s * (hw * 1.035 + 0.012 + 0.02 * t * Math.sin(v * 40)), eave + 0.01 - t * sc2, z);
      return tc2;
    }, { flipWinding: s > 0 });
    P3.add("tarp", gv, null, {});
  }
  const gable = (z, sgn2, open) => {
    const g2 = gridSurf(Array.from({ length: 25 }, (_, i) => i / 24), Array.from({ length: 13 }, (_, i) => i / 12), (u, v, q) => {
      const x0 = (u - 0.5) * W, top = ridge - (ridge - eave) * Math.abs(u - 0.5) * 2, bot = open ? eave - 0.12 : 0.03;
      let x = x0, zz = z + sgn2 * (0.02 + 0.03 * Math.sin(u * 30) * (1 - v) * (open ? 0.4 : 1));
      if (!open && u > 0.42 && u < 0.62) {
        const k2 = 1 - v;
        x += 0.38 * k2 * sstep(0.42, 0.62, u) * (u < 0.62 ? 1 : 0);
        zz += sgn2 * 0.1 * k2;
      }
      q.set(x, lerp2(bot, top + 0.02, v), zz);
      const k = 0.86 + 0.14 * vnoise(x * 1.5, v * 3, z);
      return [tc[0] * k, tc[1] * k, tc[2] * k];
    }, { flipWinding: sgn2 < 0 });
    P3.add("tarp", g2, null, {});
  };
  gable(hl, 1, true);
  gable(-hl, -1, false);
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([s * (hw - 0.07 - 0.05 * Math.sin(t * 9)), eave - 0.1 - t * (eave - 0.2), hl + 0.03 + 0.02 * Math.sin(t * 14)]);
    }
    P3.add("tarp", sweep(circlePts(0, 0, 0.085, 9), pts, { crease: 80, scaleFn: (t) => 0.75 + 0.5 * Math.abs(Math.sin(t * 7)) }), tc, {});
    for (const y of [0.7, 1.5]) P3.add("canvas", ring(0.1, 0.012, { seg: 10 }), [0.8, 0.5, 0.1], { p: [s * (hw - 0.07), y, hl + 0.03], r: [H, 0, 0] });
  }
  {
    const g2 = gridSurf(Array.from({ length: 41 }, (_, i) => i / 40), Array.from({ length: 9 }, (_, i) => i / 8), (u, v, q) => {
      const z = (u - 0.5) * L, k = 1 - v;
      q.set(hw + 0.02 + 0.035 * Math.sin(u * 52) * k * k + 0.02 * Math.sin(u * 17 + 1) * k, 0.04 + v * (eave - 0.06), z);
      const c = 0.86 + 0.14 * vnoise(z * 1.5, v * 3, 2);
      return v > 0.42 && v < 0.78 && (u > 0.14 && u < 0.36 || u > 0.64 && u < 0.86) ? [-1, 0, 0] : [tc[0] * c, tc[1] * c, tc[2] * c];
    });
    const idx = g2.index.array, Cc = g2.attributes.color, a = [], b = [];
    for (let i = 0; i < idx.length; i += 3) {
      const w = Cc.getX(idx[i]) < 0 && Cc.getX(idx[i + 1]) < 0 && Cc.getX(idx[i + 2]) < 0;
      (w ? b : a).push(idx[i], idx[i + 1], idx[i + 2]);
    }
    for (let i = 0; i < Cc.count; i++) if (Cc.getX(i) < 0) Cc.setXYZ(i, tc[0] * 0.8, tc[1] * 0.8, tc[2] * 0.8);
    const ga = g2.clone();
    ga.setIndex(a);
    const gb = g2.clone();
    gb.setIndex(b);
    P3.add("tarp", ga, null, {});
    P3.add("glassT", gb, null, {});
  }
  {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push([-hw - 0.02, eave - 0.2 - 0.03 * Math.sin(t * PI5 * 2) ** 2, (t - 0.5) * (L - 0.1)]);
    }
    P3.add("tarp", sweep(circlePts(0, 0, 0.1, 10), pts, { crease: 80, scaleFn: (t) => 0.85 + 0.2 * Math.sin(t * 31) }), tc, {});
    for (const z of [-2.2, -0.8, 0.8, 2.2]) P3.add("canvas", ring(0.115, 0.012, { seg: 10 }), [0.8, 0.5, 0.1], { p: [-hw - 0.02, eave - 0.2, z] });
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const bx3 = sx * (hw + 0.55), bz = sz * (hl + 0.25);
    P3.bar("canvas", [sx * hw, eave, sz * hl], [bx3, 0.26, bz], 6e-3, { col: [0.9, 0.75, 0.1] });
    P3.add("concrete", softBox(0.32, 0.26, 0.32, 0.03, 2), null, { p: [bx3, 0.13, bz], r: [0, 0.3 * sx, 0] });
    P3.add("steel", ring(0.035, 8e-3, { seg: 8, a0: 0, a1: PI5 }), C.steel, { p: [bx3, 0.255, bz] });
  }
  P3.push({ p: [0, 0, -0.8] });
  const arch = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, a = PI5 * t;
    arch.push([-Math.cos(a) * 1, t < 0.2 ? t / 0.2 * 1.55 : t > 0.8 ? (1 - t) / 0.2 * 1.55 : 1.55 + Math.sin((t - 0.2) / 0.6 * PI5) * 0.45, 0]);
  }
  P3.tube("galv", [[-1, 0.02, 0], [-1, 1.5, 0], [-0.8, 1.95, 0], [0, 2.1, 0], [0.8, 1.95, 0], [1, 1.5, 0], [1, 0.02, 0]], 0.02, { seg: 8, samples: 36 });
  for (const [x, y, rz] of [[-0.98, 0.6, -H], [-0.98, 1.2, -H], [-0.6, 2.02, -2.6], [0, 2.08, PI5], [0.6, 2.02, 2.6], [0.98, 1.2, H], [0.98, 0.6, H]]) {
    P3.push({ p: [x, y, 0], r: [0, 0, rz] });
    P3.cyl("galv", 0.012, 0.05, 0, 0.03, 0, { seg: 8 });
    P3.lathe("plastic", [[0.012, 0], [0.03, 0.02], [0.032, 0.035], [0, 0.036]], { seg: 10, p: [0, 0.05, 0], col: C.blue });
    P3.pop();
  }
  P3.ext("plastic", roundRect(-1.25, -0.8, 1.25, 0.8, 0.1, 4), 0, 0.14, { plane: "up", bevel: 0.02, col: C.blue, holes: [roundRect(-1.17, -0.72, 1.17, 0.72, 0.07, 4)] });
  P3.box("plastic", 2.36, 0.012, 1.46, 0, 0.012, 0, { col: [C.blue[0] * 0.7, C.blue[1] * 0.7, C.blue[2] * 0.7], b: 2e-3 });
  for (let i = 0; i < 9; i++) P3.box("plastic", 2.2, 0.03, 0.09, 0, 0.06, -0.6 + i * 0.15, { col: [0.2, 0.2, 0.21], b: 6e-3 });
  for (const x of [-0.8, 0, 0.8]) P3.box("plastic", 0.06, 0.03, 1.3, x, 0.035, 0, { col: [0.2, 0.2, 0.21], b: 6e-3 });
  P3.tube("rubber", [[1, 0.3, 0], [1.2, 0.08, 0.2], [1.5, 0.03, 0.9], [1.3, 0.03, 1.8], [1.7, 0.03, 2.4]], 0.018, { col: [0.2, 0.5, 0.25], samples: 30 });
  P3.pop();
  for (let i = 0; i < 3; i++) {
    P3.box("paint", 0.06, 0.05, 1.2, 0, ridge - 0.1, -1.8 + i * 1.8, { col: [0.2, 0.2, 0.2], b: 0.01 });
    P3.box(i === 1 ? "lampDim" : "lampCool", 0.045, 0.01, 1.1, 0, ridge - 0.13, -1.8 + i * 1.8, { b: 0 });
  }
  P3.glow("fill", [0, ridge - 0.5, 0], { col: [0.85, 0.95, 1], power: 14, dist: 9, dir: [0, -1, 0], cone: 1.15, back: 0.4 });
  P3.push({ p: [-hw - 0.9, 0, -1.9], r: [0, 0.3, 0] });
  P3.add("paint", softBox(0.6, 0.55, 0.5, 0.04, 3), [0.7, 0.3, 0.05], { p: [0, 0.34, 0] });
  for (const x of [-0.24, 0.24]) P3.box("steel", 0.04, 0.07, 0.56, x, 0.035, 0, { col: [0.15, 0.15, 0.15] });
  P3.lathe("paint", [[0.17, 0], [0.17, 0.08], [0.15, 0.1]], { axis: "x", seg: 16, p: [0.3, 0.36, 0], col: [0.15, 0.15, 0.15] });
  louvres(P3, "paint", -0.22, 0.16, 0.22, 0.52, 0.255, 7, [0.15, 0.15, 0.15], 0.6, 0.03);
  P3.add("steel", ring(0.2, 0.012, { seg: 12, a0: 0, a1: PI5 }), [0.15, 0.15, 0.15], { p: [0, 0.6, 0] });
  P3.pop();
  {
    const pts = [[-hw - 0.6, 0.36, -1.8], [-hw - 0.3, 0.4, -1.65], [-hw + 0.1, 0.3, -1.5], [-hw + 0.5, 0.22, -1.2]];
    P3.add("tarp", sweep(circlePts(0, 0, 0.16, 12), pts, { crease: 80, samples: 44, scaleFn: (t) => 1 + 0.07 * Math.sin(t * 44 * PI5) }), [0.85, 0.7, 0.1], {});
  }
  for (let i = 0; i < 2; i++) {
    P3.lathe("plastic", [[0, 0], [0.27, 0], [0.285, 0.02], [0.285, 0.3], [0.292, 0.31], [0.292, 0.33], [0.285, 0.34], [0.285, 0.6], [0.292, 0.61], [0.292, 0.63], [0.285, 0.64], [0.285, 0.86], [0.27, 0.88], [0.24, 0.885], [0.24, 0.86], [0, 0.86]], { seg: 20, p: [1.55 - i * 0.62, 0, -2.4 + i * 0.1], col: C.blue });
    P3.cyl("plastic", 0.04, 0.03, 1.55 - i * 0.62 + 0.12, 0.89, -2.4 + i * 0.1, { seg: 8, col: C.white });
  }
  if (A) {
    P3.quad("signFlat", 1.7, 1.7 / A.aspect("decon"), A.rect("decon"), { p: [0, eave + 0.22, hl + 0.06] });
    P3.quad("signFlat", 0.7, 0.7 / A.aspect("triage"), A.rect("triage"), { p: [hw + 0.06, 1.35, 0], r: [0, H, 0] });
  }
  for (const z of zs) for (const s of [-1, 1]) P3.col([s * hw - 0.06, 0, z - 0.06], [s * hw + 0.06, eave, z + 0.06], { surface: "metal" });
  P3.col([hw - 0.03, 0, -hl], [hw + 0.06, eave, hl], { surface: "cloth", soft: true });
  P3.col([-hw, 0, -hl - 0.06], [hw, eave, -hl + 0.03], { surface: "cloth", soft: true });
  P3.col([-1.25, 0, -1.6], [1.25, 0.14, 0], { surface: "plastic", bulletOnly: true });
  P3.col([-hw - 1.25, 0, -2.2], [-hw - 0.55, 0.62, -1.6], { surface: "metal" });
  P3.col([0.6, 0, -2.75], [1.9, 0.88, -2.05], { surface: "plastic" });
  return P3.finish({ grime: 1, ground: 0.3 });
});
var dkc = [0.14, 0.14, 0.15];
var streetLamp = (seed = 1, o = {}) => proto("slamp" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("slamp", seed), A = o.atlas, Hh = o.h || 8.2, reach = o.reach || 2.3, on = o.on !== false, pc = [0.3, 0.34, 0.33];
  P3.cyl("concrete", 0.3, 0.1, 0, 0.05, 0, { seg: 12, cham: 0.02 });
  P3.cyl("galv", 0.22, 0.025, 0, 0.11, 0, { seg: 8, cham: 6e-3 });
  for (let i = 0; i < 4; i++) {
    const a = i * H + PI5 / 4;
    hex(P3, Math.cos(a) * 0.17, 0.135, Math.sin(a) * 0.17, "y", 0.02, 0.03);
    P3.cyl("galv", 0.01, 0.07, Math.cos(a) * 0.17, 0.15, Math.sin(a) * 0.17, { seg: 6 });
  }
  P3.lathe("paint", [[0.14, 0.12], [0.14, 1.3], [0.125, 1.36], [0.115, 1.36], [0.065, Hh - 0.1], [0.07, Hh - 0.08], [0.07, Hh], [0, Hh + 0.03]], { seg: 8, col: pc, crease: 20 });
  P3.box("paint", 0.012, 0.42, 0.13, 0.136, 0.75, 0, { col: [pc[0] * 0.85, pc[1] * 0.85, pc[2] * 0.85], b: 4e-3 });
  hex(P3, 0.143, 0.92, 0, "x", 0.01, 8e-3);
  hex(P3, 0.143, 0.58, 0, "x", 0.01, 8e-3);
  for (const y of [2.4, 2.75]) P3.cyl("steel", 0.118 - (y - 1.36) * 75e-4, 0.03, 0, y, 0, { seg: 12, col: C.steel });
  if (A && o.sign) P3.quad("sign", 0.55, 0.55 / A.aspect(o.sign), A.rect(o.sign), { p: [0, 2.58, 0.125] });
  const arm = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    arm.push([t * reach, Hh - 0.25 + Math.sin(t * H) * 0.55, 0]);
  }
  P3.tube("paint", arm, 0.036, { seg: 8, samples: 20, col: pc });
  P3.bar("paint", [0, Hh - 0.9, 0], [reach * 0.45, Hh + 0.12, 0], 0.014, { col: pc });
  P3.cyl("paint", 0.085, 0.14, 0, Hh - 0.25, 0, { seg: 10, col: pc });
  P3.push({ p: [reach + 0.3, Hh + 0.3, 0], r: [0, 0, 0.06] });
  const hd = softBox(0.82, 0.15, 0.3, 0.05, 5);
  deform(hd, (v) => {
    const k = (v.x + 0.41) / 0.82;
    v.z *= 0.55 + 0.45 * Math.sin(k * PI5 * 0.85 + 0.2);
    v.y *= 0.6 + 0.4 * Math.sin(k * PI5 * 0.8 + 0.3);
    if (v.y > 0) v.y *= 1.2;
  }, true);
  P3.add("paint", hd, [0.55, 0.56, 0.57], {});
  P3.add(on ? o.sodium ? "lampWarm" : "lampCool" : "glass", softBox(0.44, 0.04, 0.2, 0.018, 3), null, { p: [0.08, -0.07, 0] });
  P3.cyl("paint", 0.045, 0.14, -0.42, 0, 0, { axis: "x", seg: 10, col: [0.55, 0.56, 0.57] });
  P3.cyl("trim", 0.03, 0.035, -0.1, 0.105, 0, { seg: 8 });
  if (on) {
    const lc = o.sodium ? [1, 0.62, 0.28] : [0.7, 0.86, 1];
    P3.glow("fill", [0.08, -0.5, 0], { col: lc, power: o.power || 40, dist: 16, dir: [0, -1, 0], cone: 0.92, back: 0.4 });
    P3.glow("flare", [0.08, -0.1, 0], { col: lc, size: 1.6 });
  }
  P3.pop();
  P3.col([-0.16, 0, -0.16], [0.16, 3.2, 0.16], { surface: "metal" });
  return P3.finish({ grime: 0.9 });
});
function signalHead(P3, lit) {
  const bk = [0.07, 0.09, 0.08];
  P3.add("paint", softBox(0.36, 1.08, 0.2, 0.03, 3), bk, { p: [0, 0, -0.05] });
  P3.ext("paint", roundRect(-0.36, -0.72, 0.36, 0.72, 0.06, 3), -0.012, 0, { bevel: 3e-3, col: bk, p: [0, 0, -0.07] });
  P3.ext("plastic", roundRect(-0.36, -0.72, 0.36, 0.72, 0.06, 3), 0, 2e-3, { bevel: 0, col: C.yellow, holes: [roundRect(-0.31, -0.67, 0.31, 0.67, 0.04, 3)], p: [0, 0, -0.07] });
  for (let i = 0; i < 3; i++) {
    const y = 0.34 - i * 0.34, m = i === lit ? ["emRedB", "emAmberB", "ledGreen"][i] : "glass";
    P3.lathe(m, [[0.105, 0], [0.09, 0.022], [0.05, 0.036], [0, 0.04]], { axis: "z", seg: 16, p: [0, y, 0.05], col: i === lit ? null : [[0.5, 0.1, 0.1], [0.5, 0.35, 0.05], [0.1, 0.4, 0.2]][i] });
    P3.add("paint", ring(0.112, 0.012, { seg: 16 }), bk, { p: [0, y, 0.052] });
    P3.lathe("paint", [[0.118, 0], [0.124, 0.19], [0.12, 0.19], [0.114, 0]], { axis: "z", seg: 14, arc: PI5 * 1.3, start: -PI5 * 0.15, p: [0, y, 0.05], col: bk });
  }
  for (const y of [-0.5, 0.5]) P3.box("steel", 0.08, 0.05, 0.1, 0, y, -0.18, { col: C.steel });
}
var trafficLight = (seed = 1, o = {}) => proto("tlight" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("tlight", seed), A = o.atlas, Hh = 5.6, arm = o.arm ?? 5.2, pc = [0.2, 0.22, 0.21];
  P3.cyl("concrete", 0.32, 0.08, 0, 0.04, 0, { seg: 12, cham: 0.02 });
  P3.cyl("galv", 0.2, 0.03, 0, 0.095, 0, { seg: 10, cham: 6e-3 });
  boltRing(P3, 6, 0.16, 0, 0.12, 0, "y", 0.018, 0.03);
  P3.lathe("paint", [[0.13, 0.1], [0.13, 0.9], [0.11, 0.96], [0.1, 0.96], [0.085, Hh], [0.1, Hh + 0.02], [0.1, Hh + 0.08], [0.02, Hh + 0.16], [0, Hh + 0.16]], { seg: 12, col: pc, crease: 30 });
  P3.box("paint", 0.012, 0.36, 0.12, -0.125, 0.5, 0, { col: pc, b: 4e-3 });
  if (arm > 0) {
    P3.lathe("paint", [[0.075, 0], [0.045, arm]], { axis: "x", seg: 10, p: [0.08, Hh - 0.35, 0], col: pc });
    P3.bar("paint", [0, Hh + 0.05, 0], [arm * 0.7, Hh - 0.33, 0], 0.012, { col: pc });
    P3.cyl("paint", 0.11, 0.22, 0, Hh - 0.35, 0, { seg: 12, col: pc });
    P3.push({ p: [arm - 0.5, Hh - 1.05, 0.02], r: [0, 0, 0] });
    signalHead(P3, 1);
    P3.pop();
    P3.box("steel", 0.06, 0.2, 0.06, arm - 0.5, Hh - 0.45, -0.14, { col: C.steel });
    if (A) {
      P3.quad("sign", 1.3, 1.3 / A.aspect("keepright"), A.rect("keepright"), { p: [arm * 0.45, Hh - 0.72, 0.03] });
      for (const x of [arm * 0.45 - 0.4, arm * 0.45 + 0.4]) P3.box("steel", 0.03, 0.2, 0.02, x, Hh - 0.47, 0.02, { col: C.steel });
    }
  }
  P3.push({ p: [0, 3.2, 0.26], r: [0, 0, 0] });
  signalHead(P3, 1);
  P3.pop();
  for (const y of [2.7, 3.7]) P3.beam("steel", [0, y, 0.05], [0, y, 0.2], 0.05, 0.03, { col: C.steel });
  P3.push({ p: [-0.3, 2.45, 0], r: [0, -H, 0] });
  P3.add("paint", softBox(0.3, 0.32, 0.16, 0.02, 2), [0.07, 0.09, 0.08], {});
  P3.box("glass", 0.24, 0.26, 4e-3, 0, 0, 0.082, { col: [0.6, 0.2, 0.1], b: 0 });
  P3.box("paint", 0.3, 0.012, 0.12, 0, 0.165, 0.11, { col: [0.07, 0.09, 0.08], b: 3e-3 });
  P3.pop();
  P3.beam("steel", [-0.1, 2.45, 0], [-0.22, 2.45, 0], 0.05, 0.03, { col: C.steel });
  P3.push({ p: [0, 1.15, 0.125] });
  P3.add("paint", softBox(0.12, 0.2, 0.07, 0.015, 2), C.yellow, {});
  P3.cyl("steel", 0.026, 0.02, 0, -0.03, 0.04, { axis: "z", seg: 10, col: C.steel });
  P3.box("ledRed", 0.03, 0.012, 4e-3, 0, 0.05, 0.037, { b: 0 });
  P3.pop();
  if (A) P3.quad("decal", 0.3, 0.3 / A.aspect("notice"), A.rect("notice"), { p: [0, 1.6, 0.118], r: [0, 0, 0.06] });
  P3.glow("blink", [arm - 0.5, Hh - 1.05, 0.2], { col: [1, 0.5, 0.05], power: 5, dist: 7, rate: 1.1, mat: "emAmberB" });
  P3.col([-0.15, 0, -0.15], [0.15, 3.4, 0.15], { surface: "metal" });
  return P3.finish({ grime: 0.9 });
});
var cabinet = (seed = 1, o = {}) => proto("cabinet" + seed, () => {
  const P3 = new Prop("cabinet", seed), A = o.atlas, w = 0.78, h = 1.32, d = 0.46, gc = [0.5, 0.53, 0.5];
  P3.box("concrete", w + 0.14, 0.14, d + 0.14, 0, 0.07, 0, { b: 0.02 });
  P3.add("paint", softBox(w, h, d, 0.02, 3), gc, { p: [0, 0.14 + h / 2, 0] });
  P3.box("paint", w + 0.08, 0.035, d + 0.1, 0, 0.14 + h + 0.012, 0.01, { col: gc, b: 0.01, r: [0.06, 0, 0] });
  P3.push({ p: [0, 0.14 + h / 2, d / 2] });
  P3.box("paint", w - 0.06, h - 0.08, 0.016, 0, 0, 4e-3, { col: [gc[0] * 0.92, gc[1] * 0.92, gc[2] * 0.92], b: 5e-3 });
  louvres(P3, "paint", -0.28, 0.34, 0.28, 0.54, 0.014, 6, gc, 0.6, 0.02);
  louvres(P3, "paint", -0.28, -0.56, 0.28, -0.4, 0.014, 5, gc, 0.6, 0.02);
  P3.cyl("steel", 0.022, 0.02, 0.29, 0, 0.02, { axis: "z", seg: 10, col: C.steel });
  P3.box("steel", 0.016, 0.1, 0.014, 0.29, -0.03, 0.034, { col: C.steel, b: 4e-3 });
  for (const y of [-0.45, 0.45]) P3.cyl("steel", 0.011, 0.09, -0.365, y, 0.012, { seg: 8, col: C.steel });
  if (A) {
    P3.quad("decal", 0.26, 0.26 / A.aspect("notice"), A.rect("notice"), { p: [-0.12, 0.1, 0.014], r: [0, 0, -0.04] });
    P3.quad("decal", 0.5, 0.5 / A.aspect("grafArrow"), A.rect("grafArrow"), { p: [0.02, -0.2, 0.0135], r: [0, 0, 0.1] });
  }
  P3.pop();
  P3.tube("galv", [[-0.2, 0.2, -d / 2 - 0.03], [-0.2, 0.6, -d / 2 - 0.03], [-0.2, 0.75, -d / 2 + 0.02]], 0.02, { seg: 8 });
  P3.col([-w / 2, 0, -d / 2], [w / 2, 0.14 + h, d / 2], { surface: "metal" });
  return P3.finish({ grime: 1.2 });
});

