var sc = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
var bodyBag = (seed = 1, o = {}) => proto("bodybag" + seed + (o.col || ""), () => {
  const P3 = new Prop("bodybag", seed), col = { white: [0.82, 0.82, 0.8], black: [0.06, 0.06, 0.07], yellow: [0.8, 0.66, 0.08] }[o.col || "white"], s1 = seed * 1.7;
  const g2 = softBox(1.95, 0.34, 0.62, 0.14, 9);
  deform(g2, (v) => {
    const u = v.x / 1.95 + 0.5;
    const wz = 0.42 + 0.5 * Math.sin(clamp2(u * 1.15) * PI5) ** 0.7 + 0.16 * Math.exp(-(((u - 0.74) / 0.09) ** 2)), hy = 0.55 + 0.45 * Math.sin(clamp2(u * 1.05 + 0.05) * PI5) ** 0.6 + 0.35 * Math.exp(-(((u - 0.06) / 0.05) ** 2)) + 0.3 * Math.exp(-(((u - 0.92) / 0.06) ** 2));
    v.z *= wz;
    if (v.y > -0.1) v.y = -0.1 + (v.y + 0.1) * hy;
    v.y += 0.012 * Math.sin(v.x * 23 + s1) * Math.sin(v.z * 17 + s1) + 0.01 * Math.sin(v.x * 51 + v.z * 9);
    v.z += 0.012 * Math.sin(v.x * 31 + s1 * 2);
  }, true);
  P3.add("tarp", g2, col, { p: [0, 0.17, 0], jit: 0.04 });
  const zp = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, x = (u - 0.5) * 1.8, hy = 0.55 + 0.45 * Math.sin(clamp2(u * 1.05 + 0.05) * PI5) ** 0.6 + 0.3 * Math.exp(-(((u - 0.92) / 0.06) ** 2));
    zp.push([x, 0.07 + 0.27 * hy + 4e-3, 0.02 * Math.sin(u * 9)]);
  }
  P3.add("trim", strap(zp, 0.03, 6e-3, { samples: 0 }), [1.4, 1.4, 1.4], {});
  P3.box("steel", 0.03, 0.01, 0.014, zp[11][0], zp[11][1] + 6e-3, zp[11][2], { col: C.steel, b: 3e-3 });
  for (const s of [-1, 1]) for (const x of [-0.55, 0.5]) P3.add("canvas", strap([[x - 0.12, 0.1, s * 0.3], [x - 0.06, 0.05, s * 0.4], [x + 0.06, 0.05, s * 0.4], [x + 0.12, 0.1, s * 0.3]], 0.035, 5e-3, { samples: 10 }), [0.15, 0.15, 0.15], {});
  P3.box("plastic", 0.09, 2e-3, 0.05, -0.92, 0.04, 0.16, { col: [0.85, 0.8, 0.6], r: [0, 0.5, 0], b: 0 });
  P3.col([-0.95, 0, -0.3], [0.95, 0.3, 0.3], { surface: "cloth", noNav: true, bulletOnly: true });
  return P3.finish({ grime: 0.9, ground: 0.12 });
});
var crate = (seed = 1, o = {}) => proto("crate" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("crate", seed), A = o.atlas, w = o.w || 0.9, h = o.h || 0.6, d = o.d || 0.6, wc = () => [0.78 + P3.rr(-0.12, 0.1), 0.66 + P3.rr(-0.08, 0.06), 0.48];
  const n = Math.round(h / 0.105);
  for (let i = 0; i < n; i++) {
    const y = (i + 0.5) * h / n;
    for (const s of [-1, 1]) {
      P3.box("wood", w - 0.01, h / n - 8e-3, 0.018, 0, y, s * (d / 2 - 9e-3), { col: wc(), b: 3e-3, r: [0, 0, P3.rr(-4e-3, 4e-3)] });
      P3.box("wood", 0.018, h / n - 8e-3, d - 0.04, s * (w / 2 - 9e-3), y, 0, { col: wc(), b: 3e-3 });
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    P3.box("wood", 0.07, h + 0.01, 0.02, sx * (w / 2 - 0.045), h / 2, sz * (d / 2 + 8e-3), { col: wc(), b: 4e-3 });
    P3.box("wood", 0.02, h + 0.01, 0.07, sx * (w / 2 + 8e-3), h / 2, sz * (d / 2 - 0.045), { col: wc(), b: 4e-3 });
    for (const y of [0.06, h - 0.06]) hex(P3, sx * (w / 2 - 0.045), y, sz * (d / 2 + 0.02), "z", 7e-3, 6e-3, "steel", C.dark);
  }
  const nl = Math.round(w / 0.13);
  for (let i = 0; i < nl; i++) P3.box("wood", w / nl - 8e-3, 0.018, d, -w / 2 + (i + 0.5) * w / nl, h + 9e-3, 0, { col: wc(), b: 3e-3, r: [0, P3.rr(-6e-3, 6e-3), 0] });
  P3.box("wood", w - 0.02, 0.016, d - 0.02, 0, 0.012, 0, { col: wc(), b: 0 });
  for (const s of [-1, 1]) {
    P3.box("wood", 0.06, 0.022, d + 0.01, s * w * 0.3, h + 0.028, 0, { col: wc(), b: 4e-3 });
    P3.tube("burlap", [[s * (w / 2 + 0.012), h * 0.62, -0.1], [s * (w / 2 + 0.05), h * 0.5, -0.05], [s * (w / 2 + 0.05), h * 0.5, 0.05], [s * (w / 2 + 0.012), h * 0.62, 0.1]], 9e-3, { col: C.tan, seg: 6 });
  }
  if (A) P3.quad("decal", Math.min(w * 0.7, 0.6), Math.min(w * 0.7, 0.6) / A.aspect("crate"), A.rect("crate"), { p: [0, h / 2, d / 2 + 0.02] });
  P3.col([-w / 2, 0, -d / 2], [w / 2, h + 0.04, d / 2], { surface: "wood" });
  return P3.finish({ grime: 1.1 });
});
var pallet = (seed = 1, o = {}) => proto("pallet" + seed + (o.stack || 1), () => {
  const P3 = new Prop("pallet", seed), wc = () => [0.8 + P3.rr(-0.14, 0.1), 0.7 + P3.rr(-0.1, 0.06), 0.52], n = o.stack || 1;
  for (let k = 0; k < n; k++) {
    P3.push({ p: [P3.rr(-0.03, 0.03) * k, k * 0.145, P3.rr(-0.03, 0.03) * k], r: [0, P3.rr(-0.06, 0.06) * k, 0] });
    for (const z of [-0.46, 0, 0.46]) P3.ext("wood", [[-0.6, 0.02], [-0.36, 0.02], [-0.34, 0.045], [-0.1, 0.045], [-0.08, 0.02], [0.08, 0.02], [0.1, 0.045], [0.34, 0.045], [0.36, 0.02], [0.6, 0.02], [0.6, 0.12], [-0.6, 0.12]], z - 0.022, z + 0.022, { bevel: 3e-3, col: wc() });
    for (let i = 0; i < 7; i++) {
      if (k === n - 1 && i === 2 && seed % 2) continue;
      P3.box("wood", 0.095, 0.02, 1, -0.55 + i * 0.183, 0.13, 0, { col: wc(), b: 3e-3, r: [0, P3.rr(-0.012, 0.012), 0] });
    }
    for (const x of [-0.55, 0, 0.55]) P3.box("wood", 0.095, 0.02, 1, x, 0.01, 0, { col: wc(), b: 3e-3 });
    P3.pop();
  }
  P3.col([-0.6, 0, -0.5], [0.6, 0.145 * n, 0.5], { surface: "wood", noNav: n < 3 });
  return P3.finish({ grime: 1.2, ground: 0.1 });
});
var tyreGeo = (r = 0.33, w = 0.21) => {
  const s = r * 0.6, hw = w / 2;
  return lathe([[s, -hw + 0.02], [s + 0.03, -hw], [r - 0.04, -hw], [r - 8e-3, -hw + 0.03], [r, -hw + 0.06], [r, -0.03], [r - 0.01, -0.022], [r - 0.01, 0.022], [r, 0.03], [r, hw - 0.06], [r - 8e-3, hw - 0.03], [r - 0.04, hw], [s + 0.03, hw], [s, hw - 0.02], [s, -hw + 0.02]], 18, { crease: 50 });
};
var tyres = (seed = 1, o = {}) => proto("tyres" + seed + (o.n || 3), () => {
  const P3 = new Prop("tyres", seed), n = o.n || 3;
  for (let i = 0; i < n; i++) {
    P3.add("rubber", tyreGeo(), [0.9, 0.9, 0.9], { p: [P3.rr(-0.04, 0.04), 0.105 + i * 0.208, P3.rr(-0.04, 0.04)], r: [P3.rr(-0.02, 0.02), P3.rr(0, 6), 0] });
  }
  P3.add("rubber", tyreGeo(), [0.9, 0.9, 0.9], { p: [0.5, 0.31, 0.12], r: [H - 0.28, 0.4, 0] });
  P3.col([-0.36, 0, -0.36], [0.36, n * 0.21, 0.36], { surface: "rubber" });
  return P3.finish({ grime: 1.2 });
});
var suitcase = (seed = 1, o = {}) => proto("suitcase" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("suitcase", seed), col = P3.pick([[0.5, 0.08, 0.08], [0.1, 0.2, 0.4], [0.12, 0.12, 0.13], [0.3, 0.45, 0.3], [0.6, 0.5, 0.12]]), w = 0.46, h = 0.68, d = 0.26, lay = o.lay;
  P3.push(lay ? { p: [0, d / 2, 0], r: [-H, P3.rr(0, 6), 0] } : { p: [0, 0.03, 0] });
  for (const sg of [-1, 1]) {
    const open = sg > 0 ? o.open || 0 : 0;
    if (open) {
      P3.push({ p: [-w / 2, 0, 0], r: [0, -open, 0] });
      P3.push({ p: [w / 2, 0, 0] });
    }
    P3.add("plastic", softBox(w, h, d / 2 - 4e-3, 0.035, 3), col, { p: [0, h / 2, sg * d / 4] });
    for (let i = 0; i < 5; i++) P3.box("plastic", 0.03, h - 0.14, 0.012, -w / 2 + 0.07 + i * (w - 0.14) / 4, h / 2, sg * (d / 2 - 2e-3), { col: sc(col, 0.85), b: 5e-3 });
    if (open) {
      P3.pop();
      P3.pop();
    }
  }
  P3.box("rubber", w + 4e-3, h + 4e-3, 0.012, 0, h / 2, 0, { col: [0.3, 0.3, 0.3], b: 4e-3 });
  P3.tube("trim", [[-0.08, h, 0], [-0.08, h + 0.05, 0], [0.08, h + 0.05, 0], [0.08, h, 0]], 0.012, { seg: 6 });
  for (const s of [-1, 1]) {
    P3.cyl("rubber", 0.028, 0.03, s * (w / 2 - 0.05), -4e-3, -d / 4, { axis: "x", seg: 10, col: [0.5, 0.5, 0.5] });
    P3.bar("galv", [s * 0.07, h, -d / 2 + 0.02], [s * 0.07, h + (lay ? 0.02 : 0.3), -d / 2 + 0.02], 8e-3);
  }
  if (!lay) P3.box("trim", 0.2, 0.03, 0.03, 0, h + 0.3, -d / 2 + 0.02, { b: 0.01 });
  if (o.open) for (let i = 0; i < 5; i++) P3.add("canvas", softBox(0.26, 0.04, 0.2, 0.02, 3), [0.3 + P3.R() * 0.5, 0.3 + P3.R() * 0.4, 0.3 + P3.R() * 0.4], { p: [P3.rr(-0.1, 0.1), 0.3 + P3.rr(-0.2, 0.3), 0.14 + i * 0.07], r: [H + P3.rr(-0.3, 0.3), P3.rr(-0.5, 0.5), P3.rr(0, 3)] });
  P3.pop();
  P3.col(lay ? [-0.36, 0, -0.36] : [-w / 2, 0, -d / 2], lay ? [0.36, d, 0.36] : [w / 2, h, d / 2], { surface: "plastic", noNav: true });
  return P3.finish({ grime: 1, ground: 0.1 });
});
var duffel = (seed = 1) => proto("duffel" + seed, () => {
  const P3 = new Prop("duffel", seed), col = P3.pick([[0.16, 0.2, 0.14], [0.1, 0.1, 0.12], [0.3, 0.12, 0.1]]);
  const g2 = softBox(0.78, 0.3, 0.34, 0.12, 6);
  deform(g2, (v) => {
    v.y -= 0.05 * (v.y > 0 ? 1 : 0) * Math.sin((v.x / 0.78 + 0.5) * PI5) * 0.6;
    v.y += 0.012 * Math.sin(v.x * 30 + seed) + 0.01 * Math.sin(v.z * 44);
    if (v.y < -0.12) v.z *= 1.08;
  }, true);
  P3.add("canvas", g2, col, { p: [0, 0.15, 0], r: [0, 0, 0] });
  for (const x of [-0.2, 0.2]) P3.add("canvas", strap([[x, 0.02, -0.18], [x, 0.2, -0.17], [x, 0.31, -0.06], [x, 0.36 + (x > 0 ? 0.03 : 0), 0.02 * (x > 0 ? 1 : -3)], [x, 0.3, 0.07], [x, 0.2, 0.17], [x, 0.02, 0.18]], 0.04, 5e-3, { samples: 22 }), [0.05, 0.05, 0.05], {});
  P3.add("trim", strap([[-0.33, 0.295, 0], [0, 0.275, 6e-3], [0.33, 0.295, 0]], 0.02, 5e-3, { samples: 8 }), [1.2, 1.2, 1.2], {});
  P3.col([-0.4, 0, -0.18], [0.4, 0.3, 0.18], { surface: "cloth", noNav: true, bulletOnly: true });
  return P3.finish({ grime: 1, ground: 0.1 });
});
var wheelieBin = (seed = 1, o = {}) => proto("wbin" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("wbin", seed), col = P3.pick([[0.1, 0.3, 0.16], [0.1, 0.18, 0.4], [0.2, 0.2, 0.21]]), w = 0.58, h = 0.95, d = 0.72;
  if (o.fallen) P3.push({ p: [0, w / 2, 0], r: [0, 0, H] });
  const g2 = softBox(w, h, d, 0.05, 5);
  deform(g2, (v) => {
    const k = 0.8 + 0.2 * (v.y / h + 0.5);
    v.x *= k;
    v.z *= k;
  }, true);
  P3.add("plastic", g2, col, { p: [0, 0.09 + h / 2, 0] });
  for (const s of [-1, 1]) {
    for (const y of [0.4, 0.7]) P3.box("plastic", 0.016, 0.03, d * 0.8, s * (w / 2 - 0.016 - (1.04 - y) * 0.058), y, 0, { col: sc(col, 0.85), b: 6e-3 });
    wheel(P3, 0.1, 0.045, s * (w / 2 - 0.05), 0.1, -d / 2 + 0.04, { side: 1, blocks: 0, grooves: 0, seg: 12, flat: true });
  }
  P3.bar("steel", [-w / 2 + 0.02, 0.1, -d / 2 + 0.04], [w / 2 - 0.02, 0.1, -d / 2 + 0.04], 0.012, { col: C.dark });
  P3.bar("plastic", [-w / 2 + 0.06, h + 0.02, -d / 2 - 0.05], [w / 2 - 0.06, h + 0.02, -d / 2 - 0.05], 0.016, { col });
  for (const s of [-1, 1]) P3.beam("plastic", [s * (w / 2 - 0.08), h + 0.02, -d / 2 - 0.05], [s * (w / 2 - 0.08), h + 0.04, -d / 2 + 0.03], 0.03, 0.03, { col });
  P3.push({ p: [0, 0.09 + h + 0.01, -d / 2 + 0.02], r: [-(o.open || 0.05), 0, 0] });
  P3.add("plastic", softBox(w + 0.03, 0.045, d + 0.02, 0.02, 3), sc(col, 0.9), { p: [0, 0.02, d / 2] });
  for (let i = 0; i < 3; i++) P3.box("plastic", w * 0.7, 0.012, 0.04, 0, 0.046, 0.2 + i * 0.16, { col: sc(col, 0.8), b: 4e-3 });
  P3.pop();
  if (o.open > 0.5) for (let i = 0; i < 3; i++) P3.add("plastic", bagGeo(P3, 0.22), [0.05, 0.05, 0.055], { p: [P3.rr(-0.1, 0.1), h + 0.05 + i * 0.05, P3.rr(-0.12, 0.12)] });
  if (o.fallen) P3.pop();
  P3.col(o.fallen ? [-0.1, 0, -d / 2] : [-w / 2, 0, -d / 2], o.fallen ? [h + 0.1, w, d / 2] : [w / 2, h + 0.1, d / 2], { surface: "plastic" });
  return P3.finish({ grime: 1.2 });
});
function bagGeo(P3, r = 0.26) {
  const g2 = softBox(r * 2, r * 1.5, r * 1.9, r * 0.7, 5), s = P3.rr(0, 9);
  deform(g2, (v) => {
    const k = v.y > 0 ? 1 - 0.5 * (v.y / (r * 0.75)) ** 2 : 1.06;
    v.x *= k;
    v.z *= k;
    v.x += r * 0.12 * Math.sin(v.y * 19 + s) * Math.sin(v.z * 13 + s);
    v.z += r * 0.1 * Math.sin(v.x * 17 + s * 2);
    v.y += r * 0.07 * Math.sin(v.x * 23 + v.z * 19 + s);
  }, true);
  return g2;
}
var trashBags = (seed = 1, o = {}) => proto("bags" + seed + (o.n || 4), () => {
  const P3 = new Prop("bags", seed), n = o.n || 4;
  for (let i = 0; i < n; i++) {
    const r = P3.rr(0.2, 0.3), a = i / n * PI5 * 2 + P3.rr(0, 1), dd = i === 0 ? 0 : P3.rr(0.25, 0.42);
    P3.push({ p: [Math.cos(a) * dd, r * 0.72 + (i === n - 1 && n > 3 ? 0.28 : 0), Math.sin(a) * dd * 0.7], r: [P3.rr(-0.25, 0.25), P3.rr(0, 6), P3.rr(-0.25, 0.25)] });
    P3.add("plastic", bagGeo(P3, r), i % 3 === 2 ? [0.5, 0.5, 0.48] : [0.045, 0.045, 0.05], {});
    P3.lathe("plastic", [[0.012, 0], [0.03, 0.03], [0.06, 0.07], [0.02, 0.05], [0, 0.02]], { seg: 7, p: [0, r * 0.72, 0], col: [0.045, 0.045, 0.05] });
    P3.pop();
  }
  P3.col([-0.5, 0, -0.4], [0.5, 0.45, 0.4], { surface: "plastic", noNav: true, bulletOnly: true });
  return P3.finish({ grime: 0.8, ground: 0.12 });
});
var dumpster = (seed = 1, o = {}) => proto("dumpster" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("dumpster", seed), A = o.atlas, col = o.col || [0.1, 0.24, 0.18], L = 1.9, hw = L / 2;
  P3.ext("paintOld", [[-0.5, 0.16], [0.42, 0.16], [0.56, 1.02], [0.56, 1.12], [-0.5, 1.3]].map(([f3, u]) => [-f3, u]), -hw, hw, { plane: "side", bevel: 0.012, col });
  for (const s of [-1, 1]) {
    for (const z of [-0.25, 0.2]) P3.box("paintOld", 0.03, 0.8, 0.08, s * (hw + 0.012), 0.66, z, { col, b: 0.01 });
    P3.ext("paintOld", rectPts(-0.12, -0.05, 0.12, 0.05), -0.3, 0.3, { holes: [rectPts(-0.1, -0.035, 0.1, 0.035)], bevel: 4e-3, col, p: [s * (hw + 0.13), 0.8, 0] });
    for (const z of [-0.36, 0.3]) wheel(P3, 0.08, 0.05, s * (hw - 0.18), 0.08, z, { blocks: 0, grooves: 0, seg: 10, flat: true });
  }
  for (let i = 0; i < 4; i++) P3.box("paintOld", 0.07, 0.86, 0.025, -hw + 0.3 + i * (L - 0.6) / 3, 0.62, 0.5, { col, b: 8e-3, r: [-0.16, 0, 0] });
  P3.box("paintOld", L + 0.03, 0.06, 0.06, 0, 1.12, 0.57, { col, b: 0.012 });
  P3.bar("steel", [-hw, 1.31, -0.5], [hw, 1.31, -0.5], 0.016, { col: C.dark });
  for (const s of [-1, 1]) {
    const open = s > 0 ? o.open ?? 1.9 : 0;
    P3.push({ p: [s * (hw / 2), 1.31, -0.5], r: [0.165 - open, 0, 0] });
    const lid = softBox(hw - 0.03, 0.03, 1.1, 0.012, 4);
    deform(lid, (v) => {
      v.y += 0.02 * Math.sin((v.z / 1.1 + 0.5) * PI5) + 8e-3 * Math.sin(v.x * 9 + s);
    }, true);
    P3.add("plastic", lid, [0.08, 0.08, 0.085], { p: [0, 0, 0.55] });
    for (let i = 0; i < 3; i++) P3.box("plastic", hw - 0.2, 0.014, 0.04, 0, 0.022, 0.25 + i * 0.3, { col: [0.07, 0.07, 0.07], b: 4e-3 });
    P3.pop();
  }
  P3.box("black", L - 0.1, 0.02, 0.9, 0, 0.95, 0.02, { b: 0 });
  for (let i = 0; i < 3; i++) P3.add("plastic", bagGeo(P3, 0.26), [0.045, 0.045, 0.05], { p: [0.2 + i * 0.3, 1 + i % 2 * 0.08, P3.rr(-0.2, 0.2)] });
  if (A) P3.quad("decal", 0.9, 0.9 / A.aspect(o.graf || "grafTag"), A.rect(o.graf || "grafTag"), { p: [-0.2, 0.62, 0.522], r: [-0.16, 0, 0.05] });
  P3.col([-hw, 0, -0.5], [hw, 1.3, 0.58], { surface: "metal" });
  return P3.finish({ grime: 1.3 });
});
var hydrant = (seed = 1) => proto("hydrant" + seed, () => {
  const P3 = new Prop("hydrant", seed), col = seed % 2 ? [0.62, 0.08, 0.05] : [0.75, 0.6, 0.08];
  P3.lathe("paintOld", [[0, 0], [0.17, 0], [0.17, 0.035], [0.12, 0.045], [0.105, 0.09], [0.1, 0.42], [0.125, 0.45], [0.125, 0.475], [0.105, 0.49], [0.105, 0.56], [0.13, 0.575], [0.13, 0.6], [0.11, 0.62], [0.085, 0.7], [0.04, 0.74], [0.035, 0.76], [0, 0.76]], { seg: 16, col });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * PI5 * 2;
    hex(P3, Math.cos(a) * 0.145, 0.04, Math.sin(a) * 0.145, "y", 0.012, 0.016, "steel", C.steel);
    hex(P3, Math.cos(a) * 0.117, 0.6, Math.sin(a) * 0.117, "y", 0.01, 0.014, "steel", C.steel);
  }
  P3.cyl("steel", 0.022, 0.05, 0, 0.78, 0, { seg: 5, col: C.steel });
  for (const [ax, r, len, sgn2] of [["z", 0.075, 0.1, 1], ["x", 0.055, 0.09, 1], ["x", 0.055, 0.09, -1]]) {
    const p = ax === "z" ? [0, 0.4, sgn2 * 0.1] : [sgn2 * 0.1, 0.44, 0];
    P3.push({ p, r: ax === "z" ? [0, 0, 0] : [0, sgn2 * H, 0] });
    P3.lathe("paintOld", [[r * 0.8, 0], [r * 0.8, len * 0.5], [r, len * 0.5], [r, len * 0.9], [r * 0.9, len], [r * 0.35, len], [r * 0.35, len + 0.03], [0, len + 0.03]], { axis: "z", seg: 5 + 7, col: sc(col, 0.9) });
    P3.tube("steel", catenary([0, r * 0.4, len], [0, 0.1, -0.02], 0.04, 6), 4e-3, { col: C.steel, seg: 4 });
    P3.pop();
  }
  P3.col([-0.14, 0, -0.14], [0.14, 0.78, 0.14], { surface: "metal" });
  return P3.finish({ grime: 1.2 });
});
var bench = (seed = 1) => proto("bench" + seed, () => {
  const P3 = new Prop("bench", seed), L = 1.8, wc = () => [0.6 + P3.rr(-0.1, 0.1), 0.42 + P3.rr(-0.06, 0.06), 0.28];
  const side2 = [[-0.3, 0], [-0.24, 0], [-0.2, 0.36], [0.2, 0.36], [0.26, 0], [0.32, 0], [0.26, 0.42], [0.3, 0.46], [0.18, 0.47], [-0.16, 0.44], [-0.26, 0.86], [-0.33, 0.85], [-0.24, 0.4]];
  for (const x of [-L / 2 + 0.12, L / 2 - 0.12]) {
    P3.ext("paintOld", side2.map(([f3, u]) => [-f3, u]), x - 0.02, x + 0.02, { plane: "side", bevel: 6e-3, col: [0.1, 0.12, 0.11] });
    P3.tube("paintOld", [[x, 0.46, 0.28], [x, 0.62, 0.3], [x, 0.66, 0.12], [x, 0.62, -0.18]], 0.016, { col: [0.1, 0.12, 0.11], seg: 6 });
  }
  for (let i = 0; i < 5; i++) P3.box("wood", L, 0.028, 0.075, 0, 0.475 - i * 4e-3, 0.2 - i * 0.092, { col: wc(), b: 8e-3, r: [0.02 * i, 0, 0] });
  for (let i = 0; i < 4; i++) P3.box("wood", L, 0.075, 0.026, 0, 0.56 + i * 0.092, -0.225 - i * 0.023, { col: wc(), b: 8e-3, r: [-0.25, 0, 0] });
  P3.col([-L / 2, 0, -0.33], [L / 2, 0.5, 0.32], { surface: "wood" });
  P3.col([-L / 2, 0.5, -0.36], [L / 2, 0.88, -0.2], { surface: "wood", bulletOnly: true });
  return P3.finish({ grime: 1.1 });
});
var manhole = (seed = 1) => proto("manhole" + seed, () => {
  const P3 = new Prop("manhole", seed);
  P3.lathe("steel", [[0.41, 0], [0.41, 0.012], [0.345, 0.012], [0.345, 4e-3], [0.335, 4e-3], [0.335, 0.012], [0.3, 0.014], [0.25, 0.012], [0.25, 8e-3], [0.1, 8e-3], [0.1, 0.014], [0, 0.014]], { seg: 28, col: [0.5, 0.48, 0.46], crease: 30 });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * PI5 * 2;
    P3.box("steel", 0.13, 8e-3, 0.022, Math.cos(a) * 0.175, 0.012, Math.sin(a) * 0.175, { r: [0, -a, 0], b: 3e-3, col: [0.5, 0.48, 0.46] });
  }
  for (const s of [-1, 1]) P3.box("black", 0.05, 4e-3, 0.018, s * 0.29, 0.0135, 0, { b: 0 });
  P3.cols.push({ c: [0, -1, 0], h: [0.01, 0.01, 0.01], yaw: 0, surface: "metal", noNav: true, bulletOnly: true });
  return P3.finish({ grime: 1.4, ground: 0.02 });
});
var drain = (seed = 1) => proto("drain" + seed, () => {
  const P3 = new Prop("drain", seed);
  frameXY(P3, "steel", -0.36, -0.2, 0.36, 0.2, 0, 0.035, 0.03, [0.45, 0.44, 0.42]);
  for (let i = 0; i < 9; i++) P3.box("steel", 0.022, 0.34, 0.024, -0.28 + i * 0.07, 0, 0, { col: [0.45, 0.44, 0.42], b: 5e-3 });
  P3.box("black", 0.66, 0.36, 4e-3, 0, 0, -0.012, { b: 0 });
  for (const [, arr] of P3.B.map) for (const g2 of arr) g2.rotateX(-H);
  P3.cols.push({ c: [0, -1, 0], h: [0.01, 0.01, 0.01], yaw: 0, surface: "metal", noNav: true, bulletOnly: true });
  return P3.finish({ grime: 1.4, ground: 0.02 });
});
var cartons = (seed = 1, o = {}) => proto("cartons" + seed + (o.n || 3), () => {
  const P3 = new Prop("cartons", seed), n = o.n || 3, cc = () => [0.62 + P3.rr(-0.08, 0.06), 0.5 + P3.rr(-0.06, 0.04), 0.34];
  for (let i = 0; i < n; i++) {
    const w = P3.rr(0.35, 0.6), h = P3.rr(0.25, 0.42), d = P3.rr(0.3, 0.45), col = cc();
    P3.push({ p: [i === 2 ? 0.1 : (i - 0.5) * 0.55, i === 2 ? 0.34 : 0, P3.rr(-0.1, 0.1)], r: [0, P3.rr(-0.5, 0.5), 0] });
    const g2 = softBox(w, h, d, 0.012, 4);
    deform(g2, (v) => {
      v.x *= 1 + 0.05 * (0.5 - v.y / h);
      v.y -= (v.y > 0 ? 0.02 : 0) * Math.sin(v.x * 9 + i);
    }, true);
    P3.add("canvas", g2, col, { p: [0, h / 2, 0] });
    P3.box("plastic", w + 4e-3, 3e-3, 0.05, 0, h + 2e-3, 0, { col: [0.7, 0.6, 0.4], b: 0 });
    if (i % 2 === 0) for (const s of [-1, 1]) P3.box("canvas", w - 0.01, 6e-3, d / 2, 0, h + 0.06, s * (d / 2 + 0.08), { col: sc(col, 0.9), r: [s * 0.9, 0, 0], b: 0 });
    P3.pop();
  }
  P3.col([-0.6, 0, -0.3], [0.6, 0.4, 0.3], { surface: "cloth", noNav: true, bulletOnly: true });
  return P3.finish({ grime: 1.3, ground: 0.2 });
});
var gurney = (seed = 1, o = {}) => proto("gurney" + seed + JSON.stringify({ ...o, watlas: 0 }), () => {
  const P3 = new Prop("gurney", seed), MK = o.watlas ? o.watlas.marks : null, al = [0.95, 0.95, 0.97];
  if (o.tipped) P3.push({ p: [0, 0.3, 0], r: [1.25, 0, 0] });
  for (const s of [-1, 1]) {
    P3.bar("galv", [-0.95, 0.82, s * 0.27], [0.95, 0.82, s * 0.27], 0.016, { col: al });
    P3.bar("galv", [-0.7, 0.14, s * 0.24], [0.6, 0.8, s * 0.24], 0.014, { col: al });
    P3.bar("galv", [0.7, 0.14, s * 0.24], [-0.6, 0.8, s * 0.24], 0.014, { col: al });
    P3.bar("galv", [-0.8, 0.14, s * 0.24], [0.8, 0.14, s * 0.24], 0.014, { col: al });
    for (const x of [-0.8, 0.8]) {
      wheel(P3, 0.065, 0.03, x, 0.065, s * 0.24, { blocks: 0, grooves: 0, seg: 10, flat: true });
      P3.box("galv", 0.03, 0.09, 0.05, x, 0.11, s * 0.24, { b: 6e-3 });
    }
    P3.tube("galv", [[0.95, 0.82, s * 0.27], [1.02, 0.86, s * 0.2], [1.02, 0.86, 0]], 0.014, { seg: 6 });
    P3.tube("galv", [[-0.5, 0.82, s * 0.29], [-0.45, 1.05, s * 0.3], [0.2, 1.05, s * 0.3], [0.25, 0.82, s * 0.29]], 0.012, { seg: 6, col: al });
  }
  for (const x of [-0.8, 0, 0.8]) P3.bar("galv", [x, 0.82, -0.27], [x, 0.82, 0.27], 0.012, { col: al });
  P3.bar("galv", [0, 0.47, -0.24], [0, 0.47, 0.24], 0.012, { col: al });
  const mt = softBox(1.86, 0.09, 0.52, 0.035, 6);
  deform(mt, (v) => {
    if (v.x > 0.3) v.y += (v.x - 0.3) * 0.42;
  }, true);
  P3.add("rubber", mt, [0.35, 0.4, 0.5], { p: [0, 0.885, 0] });
  const sh = gridSurf(Array.from({ length: 23 }, (_, i) => i / 22), Array.from({ length: 13 }, (_, i) => i / 12), (u, v, q) => {
    const x = -0.9 + u * 1.25, z = (v - 0.5) * 0.74, ov = Math.max(0, Math.abs(z) - 0.26);
    q.set(x, 0.94 - ov * 2.2 - (ov > 0 ? 0.03 * Math.sin(u * 30) : 0) + 0.012 * Math.sin(u * 19 + v * 7) + 0.04 * Math.exp(-(((u - 0.55) / 0.2) ** 2)) * Math.cos(z * 5), z * (1 - ov * 0.5));
    return [0.8, 0.8, 0.78];
  });
  P3.add("canvas", sh, null, {});
  if (MK) {
    P3.quad("mark", 0.55, 0.55, MK.rect("splat1"), { p: [-0.25, 0.975, 0.02], r: [-H, 0, 0.6] });
    P3.quad("mark", 0.4, 0.14, MK.rect("smear"), { p: [0.1, 0.96, 0.2], r: [-H, 0, 0.2] });
  }
  for (const x of [-0.5, 0.15]) P3.add("canvas", strap([[x, 0.84, -0.3], [x, 0.97, -0.2], [x, 0.99, 0], [x, 0.97, 0.2], [x, 0.84, 0.3]], 0.045, 4e-3, { samples: 12 }), [0.6, 0.45, 0.05], {});
  P3.bar("galv", [0.9, 0.82, -0.27], [0.9, 1.9, -0.27], 0.01, { col: al });
  P3.bar("galv", [0.82, 1.9, -0.27], [0.98, 1.9, -0.27], 7e-3, { col: al });
  P3.add("glassT", softBox(0.1, 0.2, 0.035, 0.015, 2), null, { p: [0.84, 1.76, -0.27] });
  P3.tube("glassT", catenary([0.84, 1.66, -0.27], [0.3, 0.98, -0.1], 0.3, 10), 3e-3, { seg: 4 });
  if (o.tipped) P3.pop();
  P3.col(o.tipped ? [-1, 0, -0.9] : [-1, 0, -0.3], o.tipped ? [1, 0.6, 0.3] : [1, 0.98, 0.3], { surface: "metal" });
  return P3.finish({ grime: 0.9 });
});
var busShelter = (seed = 1, o = {}) => proto("shelter" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("shelter", seed), A = o.atlas, L = 3.8, hl = L / 2, d = 1.35, dk = [0.12, 0.14, 0.15];
  for (const x of [-hl, 0, hl]) {
    P3.box("paint", 0.09, 2.45, 0.09, x, 1.225, -d / 2, { col: dk, b: 0.014 });
    P3.box("paint", 0.2, 0.02, 0.2, x, 0.01, -d / 2, { col: dk, b: 4e-3 });
    const arm = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      arm.push([x, 2.42 + 0.2 * Math.sin(t * PI5 * 0.55), -d / 2 - 0.15 + t * (d + 0.4)]);
    }
    P3.add("paint", sweep(rectPts(-0.03, -0.035, 0.03, 0.035), arm, { crease: 60, up: [1, 0, 0] }), dk, {});
  }
  const roof = gridSurf(Array.from({ length: 13 }, (_, i) => i / 12), Array.from({ length: 9 }, (_, i) => i / 8), (u, v, q) => {
    q.set(-hl - 0.12 + u * (L + 0.24), 2.47 + 0.2 * Math.sin(v * PI5 * 0.55), -d / 2 - 0.15 + v * (d + 0.4));
    return [0.5, 0.6, 0.6];
  }, { flipWinding: true });
  P3.add("glassT", roof, null, {});
  P3.box("paint", L + 0.3, 0.07, 0.05, 0, 2.6, d / 2 + 0.25, { col: dk, b: 0.012 });
  P3.box("paint", L + 0.3, 0.07, 0.05, 0, 2.42, -d / 2 - 0.15, { col: dk, b: 0.012 });
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -hl + 0.06 : 0.06, x1 = s < 0 ? -0.06 : hl - 0.06;
    frameXY(P3, "galv", x0, 0.25, x1, 2.25, -d / 2, 0.035, 0.03);
    if (s < 0 || !o.smash) P3.box("glassT", x1 - x0 - 0.06, 1.94, 8e-3, (x0 + x1) / 2, 1.25, -d / 2, { b: 0 });
    else for (let i = 0; i < 9; i++) {
      const sx = x0 + 0.1 + P3.R() * (x1 - x0 - 0.2), top = P3.R() < 0.5;
      P3.add("glassT", fromArrays([sx - 0.12, top ? 2.2 : 0.3, -d / 2, sx + 0.12, top ? 2.2 : 0.3, -d / 2, sx + P3.rr(-0.1, 0.1), top ? 2.2 - P3.rr(0.15, 0.5) : 0.3 + P3.rr(0.15, 0.5), -d / 2], null, null, [0, 1, 2]), null, {});
    }
  }
  P3.push({ p: [hl, 0, 0.05], r: [0, H, 0] });
  P3.box("paint", 1.15, 1.85, 0.14, 0, 1.3, 0, { col: dk, b: 0.02 });
  if (A) for (const s of [-1, 1]) P3.quad(o.lit === false ? "sign" : "signLit", 1, 1 / A.aspect(s > 0 ? "posterShelter" : "posterSymptoms") * 1, A.rect(s > 0 ? "posterShelter" : "posterSymptoms"), { p: [0, 1.3, s * 0.072], r: [0, s > 0 ? 0 : PI5, 0] });
  P3.pop();
  if (o.lit !== false) {
    P3.glow("fill", [hl - 0.7, 1.4, 0.1], { col: [0.9, 0.95, 1], power: 8, dist: 7 });
    P3.glow("fill", [hl + 0.8, 1.4, 0.1], { col: [0.9, 0.95, 1], power: 6, dist: 6 });
  }
  P3.box("paint", L - 0.5, 0.05, 0.26, -0.15, 0.62, -d / 2 + 0.2, { col: [0.5, 0.1, 0.08], b: 0.02, r: [0.12, 0, 0] });
  for (const x of [-1.6, -0.15, 1.3]) P3.beam("paint", [x, 0.6, -d / 2 + 0.2], [x, 0.5, -d / 2 + 0.04], 0.04, 0.03, { col: dk });
  P3.bar("galv", [-hl - 0.5, 0, d / 2], [-hl - 0.5, 2.9, d / 2], 0.03);
  if (A) for (const s of [-1, 1]) P3.quad("sign", 0.5, 0.5 / A.aspect("transit"), A.rect("transit"), { p: [-hl - 0.5 + 0.28, 2.65, d / 2 + s * 0.012], r: [0, s > 0 ? 0 : PI5, 0] });
  P3.box("paint", 0.52, 0.22, 0.016, -hl - 0.22, 2.65, d / 2, { col: [0.1, 0.3, 0.36], b: 4e-3 });
  for (const x of [-hl, 0, hl]) P3.col([x - 0.06, 0, -d / 2 - 0.06], [x + 0.06, 2.5, -d / 2 + 0.06], { surface: "metal" });
  P3.col([-hl, 0.25, -d / 2 - 0.03], [hl, 2.25, -d / 2 + 0.03], { surface: "glass" });
  P3.col([hl - 0.08, 0.3, -0.55], [hl + 0.08, 2.25, 0.65], { surface: "metal" });
  P3.col([-1.9, 0.4, -d / 2 + 0.05], [1.6, 0.66, -d / 2 + 0.34], { surface: "metal", noNav: true });
  return P3.finish({ grime: 1 });
});
var postBox = (seed = 1, o = {}) => proto("postbox" + seed, () => {
  const P3 = new Prop("postbox", seed), A = o.atlas, col = [0.08, 0.16, 0.36];
  const pr = [[-0.28, 0.3], [0.28, 0.3], [0.28, 1.05]];
  for (let i = 0; i <= 10; i++) {
    const a = i / 10 * PI5;
    pr.push([Math.cos(a) * 0.28, 1.05 + Math.sin(a) * 0.2]);
  }
  pr.push([-0.28, 1.05]);
  P3.ext("paintOld", pr, -0.26, 0.26, { bevel: 0.015, col, smooth: 40 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P3.box("paintOld", 0.05, 0.3, 0.05, sx * 0.23, 0.15, sz * 0.2, { col, b: 8e-3 });
  P3.box("paintOld", 0.46, 0.2, 0.02, 0, 1, 0.262, { col: sc(col, 0.85), b: 6e-3, r: [-0.2, 0, 0] });
  P3.box("chrome", 0.2, 0.025, 0.03, 0, 1.08, 0.3, { b: 8e-3 });
  P3.box("paintOld", 0.4, 0.42, 0.012, 0, 0.6, 0.262, { col: sc(col, 0.9), b: 4e-3 });
  P3.cyl("steel", 0.018, 0.012, 0.14, 0.6, 0.27, { axis: "z", seg: 8, col: C.steel });
  if (A) P3.quad("decal", 0.3, 0.3 / A.aspect("notice"), A.rect("notice"), { p: [0, 0.66, 0.2695], r: [0, 0, -0.05] });
  P3.col([-0.28, 0, -0.26], [0.28, 1.25, 0.26], { surface: "metal" });
  return P3.finish({ grime: 1.2 });
});
var burnBarrel = (seed = 1, o = {}) => proto("burnbarrel" + seed + (o.power || ""), () => {
  const P3 = new Prop("burnbarrel", seed);
  P3.lathe("rust", [[0, 0], [0.28, 0], [0.29, 0.012], [0.29, 0.28], [0.3, 0.29], [0.3, 0.31], [0.29, 0.32], [0.29, 0.58], [0.3, 0.59], [0.3, 0.61], [0.29, 0.62], [0.29, 0.86], [0.295, 0.875], [0.28, 0.88], [0.27, 0.86], [0.27, 0.05], [0, 0.05]], { seg: 20, col: [0.5, 0.42, 0.38] });
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * PI5 * 2 + 0.3, y = 0.2 + i % 3 * 0.14;
    P3.cyl("emAmber", 0.022, 6e-3, Math.cos(a) * 0.288, y, Math.sin(a) * 0.288, { axis: "x", seg: 8, r: [0, -a, 0], cham: 0 });
  }
  P3.cyl("emAmber", 0.26, 0.01, 0, 0.6, 0, { seg: 14, cham: 0 });
  for (let i = 0; i < 5; i++) P3.box("wood", 0.07, 0.6, 0.04, P3.rr(-0.12, 0.12), 0.72, P3.rr(-0.12, 0.12), { col: [0.2, 0.15, 0.12], r: [P3.rr(-0.4, 0.4), P3.rr(0, 3), P3.rr(-0.4, 0.4)], b: 6e-3 });
  P3.glow("fill", [0, 1.25, 0], { col: [1, 0.45, 0.12], power: o.power || 22, dist: 9, flicker: 2 });
  P3.socket("fire", [0, 0.9, 0]);
  P3.col([-0.3, 0, -0.3], [0.3, 0.9, 0.3], { surface: "metal" });
  return P3.finish({ grime: 1.2 });
});
var ammoCan = (seed = 1, o = {}) => proto("ammocan" + seed, () => {
  const P3 = new Prop("ammocan", seed), A = o.atlas, col = [0.2, 0.25, 0.14];
  P3.add("paint", softBox(0.3, 0.19, 0.16, 0.012, 3), col, { p: [0, 0.095, 0] });
  P3.add("paint", softBox(0.31, 0.03, 0.17, 0.01, 2), sc(col, 0.9), { p: [0, 0.2, 0] });
  for (const x of [-0.08, 0.08]) P3.box("paint", 0.012, 0.16, 0.166, x, 0.095, 0, { col: sc(col, 0.85), b: 4e-3 });
  P3.tube("steel", [[-0.07, 0.215, 0], [-0.07, 0.25, 0], [0.07, 0.25, 0], [0.07, 0.215, 0]], 6e-3, { col: C.dark, seg: 5 });
  P3.box("steel", 0.03, 0.1, 0.012, 0.158, 0.14, 0, { col: C.dark, b: 3e-3 });
  P3.bar("steel", [0.164, 0.09, -0.03], [0.164, 0.09, 0.03], 5e-3, { col: C.steel });
  if (A) for (const s of [-1, 1]) P3.quad("decal", 0.24, 0.24 / A.aspect("ammo"), A.rect("ammo"), { p: [0, 0.1, s * 0.0815], r: [0, s > 0 ? 0 : PI5, 0] });
  return P3.finish({ grime: 0.6, ground: 0.05 });
});
var medKit = (seed = 1, o = {}) => proto("medkit" + seed, () => {
  const P3 = new Prop("medkit", seed), A = o.atlas, col = [0.62, 0.08, 0.06];
  P3.add("plastic", softBox(0.34, 0.2, 0.13, 0.025, 3), col, { p: [0, 0.1, 0] });
  P3.box("plastic", 0.345, 0.012, 0.135, 0, 0.13, 0, { col: [0.1, 0.1, 0.1], b: 4e-3 });
  for (const x of [-0.1, 0.1]) P3.box("steel", 0.04, 0.05, 0.012, x, 0.135, 0.066, { col: C.steel, b: 4e-3 });
  P3.tube("trim", [[-0.07, 0.2, 0], [-0.06, 0.235, 0], [0.06, 0.235, 0], [0.07, 0.2, 0]], 9e-3, { seg: 6 });
  if (A) for (const s of [-1, 1]) P3.quad("decal", 0.15, 0.15 / A.aspect("medkit"), A.rect("medkit"), { p: [0, 0.075, s * 0.0665], r: [0, s > 0 ? 0 : PI5, 0] });
  return P3.finish({ grime: 0.5, ground: 0.05 });
});

