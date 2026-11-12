var TINT = { brick: [[1, 1, 1], [0.8, 0.62, 0.52], [1.15, 1, 0.8], [0.62, 0.6, 0.6]], stucco: [[1, 1, 1], [0.86, 0.92, 0.84], [1, 0.86, 0.66], [0.78, 0.84, 0.92], [0.92, 0.72, 0.66]], tile: [[1, 1, 1], [0.7, 0.86, 0.82]], concrete: [[1, 1, 1]] };
var profCornice = (d, h) => [[0, 0], [-d * 0.25, 0], [-d * 0.3, h * 0.18], [-d * 0.55, h * 0.3], [-d * 0.62, h * 0.55], [-d * 0.95, h * 0.68], [-d, h * 0.74], [-d, h], [0, h]];
function windowUnit(P3, WA, x, y, w, h, o = {}) {
  const fc = o.frameCol || [0.8, 0.8, 0.76], zf = -0.13;
  P3.box("concrete", w + 0.2, 0.07, 0.26, x, y - 0.035, -0.04, { b: 0.012, col: o.stone || [0.9, 0.88, 0.84] });
  if (o.lintel !== false) P3.box(o.lintelMat || "concrete", w + 0.24, 0.17, 0.03, x, y + h + 0.085, 4e-3, { b: 8e-3, col: o.lintelCol || [0.9, 0.88, 0.84] });
  frameXY(P3, "paint", x - w / 2, y, x + w / 2, y + h, zf, 0.05, 0.07, fc);
  if (o.board) {
    for (let i = 0; i < 4; i++) P3.box("wood", w + 0.1, h / 4 - 0.02, 0.022, x + P3.rr(-0.03, 0.03), y + (i + 0.5) * h / 4, -0.06, { r: [0, 0, P3.rr(-0.03, 0.03)], col: [0.8 + P3.rr(-0.1, 0.1), 0.72, 0.58], b: 4e-3 });
    P3.box("black", w - 0.1, h - 0.1, 0.01, x, y + h / 2, zf - 0.03, { b: 0 });
    return;
  }
  P3.box("paint", w - 0.08, 0.045, 0.05, x, y + h * 0.52, zf + 5e-3, { col: fc, b: 6e-3 });
  if (w > 0.9) P3.box("paint", 0.03, h * 0.5, 0.03, x, y + h * 0.77, zf, { col: fc, b: 4e-3 });
  const lit = o.lit != null && WA;
  if (lit) P3.quad("win", w - 0.09, h - 0.09, WA.rect(o.lit), { p: [x, y + h / 2, zf - 0.02] });
  else P3.box("glass", w - 0.09, h - 0.09, 8e-3, x, y + h / 2, zf - 0.02, { b: 0 });
  if (o.ac) {
    const ax = x + (w > 1 ? w * 0.18 : 0);
    P3.add("paint", softBox(0.62, 0.4, 0.5, 0.025, 3), [0.75, 0.75, 0.72], { p: [ax, y + 0.23, 0.12] });
    louvres(P3, "paint", ax - 0.27, y + 0.06, ax + 0.27, y + 0.4, 0.375, 8, [0.5, 0.5, 0.5], 0.5, 0.02);
    for (const s of [-1, 1]) P3.beam("steel", [ax + s * 0.22, y - 0.02, 0], [ax + s * 0.22, y + 0.03, 0.34], 0.03, 0.02, { col: C.dark });
    if (o.marks) P3.quad("mark", 0.42, 1.3, o.marks.rect("rustRun"), { p: [ax, y - 0.72, 6e-3] });
  } else if (o.marks && o.stain) P3.quad("mark", 0.5, 1.5, o.marks.rect(o.stain), { p: [x + P3.rr(-0.3, 0.3) * w, y - 0.82, 6e-3] });
  if (o.bars) {
    for (let i = 0; i <= 6; i++) P3.bar("steel", [x - w / 2 + i * w / 6, y, 0.03], [x - w / 2 + i * w / 6, y + h, 0.03], 8e-3, { col: C.dark });
    for (const yy of [y + 0.12, y + h - 0.12]) P3.bar("steel", [x - w / 2 - 0.04, yy, 0.03], [x + w / 2 + 0.04, yy, 0.03], 0.01, { col: C.dark });
  }
  if (o.box) {
    P3.ext("paint", [[0, 0], [-0.2, 0], [-0.22, 0.16], [0, 0.16]], x - w / 2, x + w / 2, { plane: "side", bevel: 6e-3, col: [0.25, 0.3, 0.26], p: [0, y - 0.02, 0.02] });
    for (let i = 0; i < 7; i++) P3.add("canvas", softBox(0.16, 0.14 + P3.rr(0, 0.12), 0.14, 0.05, 2), [0.2, 0.3 + P3.rr(0, 0.1), 0.14], { p: [x - w / 2 + 0.1 + i * (w - 0.2) / 6, y + 0.2, 0.13], r: [P3.rr(-0.3, 0.3), P3.rr(0, 3), 0] });
  }
}
function shutter(P3, A, x0, x1, y0, y1, z, o = {}) {
  const w = x1 - x0, h = (y1 - y0) * (o.closed ?? 1), g2 = corrugated(h, w, { pitch: 0.085, depth: 0.014, top: 0.03, slope: 0.02, col: o.col || [0.75, 0.76, 0.78] });
  g2.rotateZ(H);
  P3.add("galv", g2, null, { p: [(x0 + x1) / 2, y1 - h / 2, z] });
  for (const x of [x0, x1]) P3.box("galv", 0.07, y1 - y0, 0.07, x, (y0 + y1) / 2, z + 0.01, { b: 8e-3 });
  P3.box("galv", w - 0.06, 0.08, 0.05, (x0 + x1) / 2, y1 - h + 0.04, z + 0.02, { b: 0.01 });
  for (const s of [-0.3, 0.3]) {
    P3.box("steel", 0.14, 0.03, 0.03, (x0 + x1) / 2 + s * w, y1 - h + 0.07, z + 0.05, { col: C.dark, b: 8e-3 });
  }
  P3.add("steel", softBox(0.06, 0.07, 0.03, 0.01, 2), [0.8, 0.7, 0.3], { p: [(x0 + x1) / 2, y1 - h + 0.01, z + 0.055] });
  P3.add("paint", softBox(w + 0.16, 0.3, 0.26, 0.03, 2), o.hood || [0.3, 0.3, 0.3], { p: [(x0 + x1) / 2, y1 + 0.02, z + 0.06] });
  if (o.closed < 1) P3.box("black", w, y1 - y0 - h, 0.01, (x0 + x1) / 2, y0 + (y1 - y0 - h) / 2, z - 0.25, { b: 0 });
  if (A && o.graf) P3.quad("decal", Math.min(w * 0.8, 2.2), Math.min(w * 0.8, 2.2) / A.aspect(o.graf), A.rect(o.graf), { p: [(x0 + x1) / 2 + P3.rr(-0.2, 0.2), y0 + h * 0.5, z + 0.02], r: [0, 0, P3.rr(-0.06, 0.06)] });
}
function shopGlass(P3, A, x0, x1, y0, y1, z, o = {}) {
  const w = x1 - x0, cx = (x0 + x1) / 2, n = Math.max(1, Math.round(w / 1.5));
  P3.box("tile", w, 0.5, 0.12, cx, y0 + 0.25, z, { col: o.riser || [0.5, 0.56, 0.55], b: 6e-3 });
  frameXY(P3, "galv", x0, y0 + 0.5, x1, y1, z, 0.05, 0.06);
  for (let i = 1; i < n; i++) P3.box("galv", 0.04, y1 - y0 - 0.56, 0.05, x0 + i * w / n, (y0 + 0.5 + y1) / 2, z, {});
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w / n + 0.03, b = x0 + (i + 1) * w / n - 0.03;
    if (o.smashed === i) {
      for (let k = 0; k < 7; k++) {
        const sx = a + P3.rr(0, b - a), up = P3.R() < 0.5, hh = P3.rr(0.1, 0.4);
        P3.add("glassT", fromArrays([sx - 0.08, up ? y1 - 0.05 : y0 + 0.55, z, sx + 0.1, up ? y1 - 0.05 : y0 + 0.55, z, sx + P3.rr(-0.05, 0.05), up ? y1 - 0.05 - hh : y0 + 0.55 + hh, z], null, null, up ? [0, 2, 1] : [0, 1, 2]), null, {});
      }
      continue;
    }
    P3.box("glassT", b - a, y1 - y0 - 0.6, 8e-3, (a + b) / 2, (y0 + 0.5 + y1) / 2, z, { b: 0 });
  }
  const d = o.depth || 3.2, wc = o.wall || [0.55, 0.56, 0.52];
  P3.box("tile", w, 0.04, d, cx, y0 + 0.5, z - d / 2, { col: [0.6, 0.6, 0.58], b: 0 });
  P3.box("stucco", w, y1 - y0, 0.06, cx, (y0 + y1) / 2, z - d, { col: wc, b: 0 });
  for (const x of [x0, x1]) P3.box("stucco", 0.06, y1 - y0, d, x, (y0 + y1) / 2, z - d / 2, { col: wc, b: 0 });
  P3.box("stucco", w, 0.06, d, cx, y1 + 0.02, z - d / 2, { col: [0.5, 0.5, 0.5], b: 0 });
  if (o.lit) {
    for (let i = 0; i < 2; i++) {
      P3.box(o.lamp || "lampCool", w * 0.6, 0.02, 0.1, cx, y1 - 0.03, z - 0.8 - i * 1.3, { b: 0 });
    }
    P3.glow("fill", [cx, y1 - 0.7, z - 1], { col: o.lightCol || [0.8, 0.92, 1], power: o.power || 26, dist: 11, flicker: o.flicker || 0, dir: [0, -0.3, 1], cone: 1, beam: 0.8 });
  }
  return { cx, w, d };
}
function shelves(P3, x, y, z, w, h, seed) {
  const R4 = rng(seed);
  P3.box("paint", w, h, 0.3, x, y + h / 2, z, { col: [0.75, 0.75, 0.72], b: 0.01 });
  for (let j = 0; j < 4; j++) {
    const sy = y + 0.12 + j * (h - 0.2) / 4;
    P3.box("paint", w + 0.02, 0.02, 0.34, x, sy, z + 0.02, { col: [0.85, 0.85, 0.82], b: 0 });
    let px2 = x - w / 2 + 0.05;
    while (px2 < x + w / 2 - 0.12) {
      const bw = 0.06 + R4() * 0.12, bh = 0.1 + R4() * 0.2;
      if (R4() < 0.7) P3.box("plastic", bw, bh, 0.12, px2 + bw / 2, sy + 0.01 + bh / 2, z + 0.1, { col: [0.2 + R4() * 0.7, 0.2 + R4() * 0.6, 0.15 + R4() * 0.6], b: 8e-3, r: [0, R4() * 0.4 - 0.2, 0] });
      px2 += bw + 0.015 + R4() * 0.05;
    }
  }
}
function washer(P3, x, y, z) {
  P3.add("paint", softBox(0.66, 0.9, 0.6, 0.03, 3), [0.85, 0.85, 0.83], { p: [x, y + 0.45, z] });
  P3.add("chrome", ring(0.2, 0.03, { seg: 16 }), null, { p: [x, y + 0.42, z + 0.305] });
  P3.cyl("glass", 0.18, 0.02, x, y + 0.42, z + 0.3, { axis: "z", seg: 16 });
  P3.box("trim", 0.6, 0.1, 0.01, x, y + 0.8, z + 0.3, { b: 0 });
  P3.box("ledGreen", 0.05, 0.02, 4e-3, x + 0.2, y + 0.8, z + 0.307, { b: 0 });
  P3.cyl("trim", 0.03, 0.02, x - 0.2, y + 0.8, z + 0.31, { axis: "z", seg: 10 });
}
function awning(P3, x0, x1, y, o = {}) {
  const w = x1 - x0, out = o.out || 1.3, drop = o.drop || 0.55, c1 = o.col || [0.5, 0.1, 0.08], c2 = o.col2 || [0.85, 0.83, 0.75], nu = Math.round(w / 0.1), U = Array.from({ length: nu + 1 }, (_, i) => i / nu), V = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.12, 1.25];
  const g2 = gridSurf(U, V, (u, v, q) => {
    const x = x0 + u * w, arm = Math.abs(Math.sin(u * PI5 * Math.max(2, Math.round(w / 1.6)))), vv = Math.min(v, 1), sag = 0.05 * arm * Math.sin(vv * PI5) + 0.012 * Math.sin(u * 60 + v * 4);
    if (v <= 1) q.set(x, y - vv * drop - sag, 0.02 + vv * out);
    else q.set(x, y - drop - (v - 1) * (0.9 + 0.5 * Math.abs(Math.sin(u * nu * PI5 / 4))) - 0, 0.02 + out + 0.01 * Math.sin(u * 50));
    const st = Math.floor(u * w / 0.42) % 2, k = 0.85 + 0.15 * vnoise(x * 2, v * 3, 1);
    return st ? [c1[0] * k, c1[1] * k, c1[2] * k] : [c2[0] * k, c2[1] * k, c2[2] * k];
  }, { flipWinding: true });
  if (o.torn) {
    const idx = g2.index.array, keep = [];
    for (let i = 0; i < idx.length; i += 6) {
      const cell = i / 6, cu = cell % nu / nu, cv = Math.floor(cell / nu) / 7;
      if (fbm(cu * w * 1.3 + o.torn, cv * 3, 2) > 0.66 && cv > 0.25) continue;
      for (let k = 0; k < 6; k++) keep.push(idx[i + k]);
    }
    g2.setIndex(keep);
  }
  P3.add("canvas", g2, null, {});
  P3.bar("galv", [x0, y - drop, 0.02 + out], [x1, y - drop, 0.02 + out], 0.014);
  P3.bar("galv", [x0, y + 0.02, 0.03], [x1, y + 0.02, 0.03], 0.02);
  const na = Math.max(2, Math.round(w / 1.6));
  for (let i = 0; i <= na; i++) {
    const x = x0 + i * w / na;
    P3.bar("galv", [x, y, 0.03], [x, y - drop, 0.02 + out], 0.012);
    P3.bar("galv", [x, y - 0.75, 0.03], [x, y - drop + 0.02, out * 0.72], 0.01);
  }
}
function fireEscape(P3, x0, x1, floors, y0, fh, o = {}) {
  const d = 1.05, dk = [0.1, 0.1, 0.11], w = x1 - x0;
  for (let f3 = 0; f3 < floors; f3++) {
    const y = y0 + f3 * fh;
    P3.quad("mesh", w, d, null, { p: [(x0 + x1) / 2, y + 0.012, d / 2], r: [-H, 0, 0] });
    for (const x of [x0, x1]) {
      P3.box("steel", 0.045, 0.06, d, x, y, d / 2, { col: dk, b: 6e-3 });
      P3.bar("steel", [x, y - 0.03, d * 0.92], [x, y - 0.75, 0.02], 0.014, { col: dk });
    }
    P3.box("steel", w, 0.06, 0.045, (x0 + x1) / 2, y, d, { col: dk, b: 6e-3 });
    P3.box("steel", w, 0.06, 0.045, (x0 + x1) / 2, y, 0.03, { col: dk, b: 6e-3 });
    for (let i = 1; i < 6; i++) P3.box("steel", 0.02, 0.03, d, x0 + i * w / 6, y - 5e-3, d / 2, { col: dk, b: 0 });
    const rail = (a, b) => {
      for (const h of [1, 0.55]) P3.bar("steel", [a[0], y + h, a[1]], [b[0], y + h, b[1]], h > 0.9 ? 0.016 : 0.01, { col: dk });
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.16));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        P3.bar("steel", [lerp2(a[0], b[0], t), y + 0.03, lerp2(a[1], b[1], t)], [lerp2(a[0], b[0], t), y + 1, lerp2(a[1], b[1], t)], 6e-3, { col: dk, seg: 4, caps: false });
      }
    };
    rail([x0, 0.04], [x0, d]);
    rail([x0, d], [x1, d]);
    rail([x1, d], [x1, 0.04]);
    if (f3 < floors - 1) {
      const sx0 = x0 + 0.5, sx1 = x1 - 0.7, n = 11;
      for (const z of [0.2, 0.75]) P3.beam("steel", [sx0, y + 0.03, z], [sx1, y + fh, z], 0.03, 0.12, { col: dk });
      for (let i = 1; i < n; i++) {
        const t = i / n;
        P3.box("steel", 0.2, 0.012, 0.52, lerp2(sx0, sx1, t), y + 0.03 + fh * t + 0.02, 0.475, { col: dk, b: 0 });
      }
      P3.bar("steel", [sx0, y + 0.95, 0.76], [sx1, y + fh + 0.95, 0.76], 0.012, { col: dk });
    }
  }
  for (const s of [-1, 1]) P3.bar("steel", [x1 - 0.35 + s * 0.2, y0 - 2.1, d - 0.12], [x1 - 0.35 + s * 0.2, y0 + 1, d - 0.12], 0.014, { col: dk });
  for (let i = 0; i < 10; i++) P3.bar("steel", [x1 - 0.55, y0 - 2 + i * 0.3, d - 0.12], [x1 - 0.15, y0 - 2 + i * 0.3, d - 0.12], 9e-3, { col: dk });
}
var building = (seed = 1, o = {}) => proto("bld" + seed + JSON.stringify({ ...o, atlas: 0, watlas: 0 }), () => {
  const P3 = new Prop("bld", seed), A = o.atlas, WA = o.watlas ? o.watlas.windows : null, MK = o.watlas ? o.watlas.marks : null, R4 = P3.R;
  const w = o.w || 8, hw = w / 2, floors = o.floors || 3, gh = o.gh || 3.9, fh = o.fh || 3, style = o.style || "brick", th = 0.32, Ht = gh + floors * fh, depth = o.depth || 7;
  const tint = TINT[style][(o.tint ?? seed) % TINT[style].length], gTint = o.gtint || [0.42, 0.44, 0.44];
  const doorL = o.door === "l", dw = 1.15, pier = 0.5, dx = doorL ? -hw + pier + dw / 2 + 0.15 : hw - pier - dw / 2 - 0.15, sx0 = doorL ? dx + dw / 2 + 0.45 : -hw + pier, sx1 = doorL ? hw - pier : dx - dw / 2 - 0.45, sy0 = 0, sy1 = 2.85;
  {
    const ops = [[sx0, sx1, sy1], [dx - dw / 2, dx + dw / 2, 2.75]].sort((a, b) => a[0] - b[0]), out = [[-hw, 0]];
    for (const [a, b, h] of ops) out.push([a, 0], [a, h], [b, h], [b, 0]);
    out.push([hw, 0], [hw, gh], [-hw, gh]);
    P3.ext(o.gmat || "concrete", out, -th, 0, { bevel: 4e-3, col: gTint });
  }
  for (const x of [-hw + pier / 2, hw - pier / 2]) {
    P3.box(o.gmat || "concrete", pier + 0.04, gh - 0.3, 0.1, x, (gh - 0.3) / 2, 0.04, { col: [gTint[0] * 1.15, gTint[1] * 1.15, gTint[2] * 1.15], b: 0.012 });
    P3.box("concrete", pier + 0.1, 0.4, 0.16, x, 0.2, 0.06, { col: [0.6, 0.6, 0.6], b: 0.015 });
    P3.box("concrete", pier + 0.12, 0.12, 0.17, x, gh - 0.36, 0.06, { col: [0.7, 0.7, 0.7], b: 0.02 });
  }
  const mode = o.mode || "shutter";
  if (mode === "shutter") shutter(P3, A, sx0 + 0.02, sx1 - 0.02, 0.02, sy1 - 0.02, -0.16, { graf: o.graf, col: o.shutCol, closed: o.closed ?? 1 });
  else if (mode === "board") {
    const n = Math.ceil((sx1 - sx0) / 1.22);
    for (let i = 0; i < n; i++) {
      const a = sx0 + i * (sx1 - sx0) / n, b = sx0 + (i + 1) * (sx1 - sx0) / n;
      P3.box("wood", b - a - 0.01, sy1 - 0.04, 0.02, (a + b) / 2, sy1 / 2, -0.1 + i % 2 * 0.012, { col: [0.82 + R4() * 0.12, 0.72 + R4() * 0.08, 0.55], b: 3e-3, r: [0, 0, P3.rr(-6e-3, 6e-3)] });
    }
    for (const y of [0.5, 1.5, 2.5]) P3.box("wood", sx1 - sx0, 0.1, 0.03, (sx0 + sx1) / 2, y, -0.075, { col: [0.6, 0.5, 0.38], b: 4e-3, r: [0, 0, P3.rr(-0.01, 0.01)] });
    P3.box("black", sx1 - sx0, sy1, 0.01, (sx0 + sx1) / 2, sy1 / 2, -0.2, { b: 0 });
    if (A) {
      P3.quad("decal", 0.5, 0.5 / A.aspect("notice"), A.rect("notice"), { p: [(sx0 + sx1) / 2 - 0.8, 1.6, -0.055], r: [0, 0, 0.04] });
      if (o.graf) P3.quad("decal", 2, 2 / A.aspect(o.graf), A.rect(o.graf), { p: [(sx0 + sx1) / 2 + 0.4, 1.3, -0.068], r: [0, 0, -0.04] });
    }
  } else {
    const I = shopGlass(P3, A, sx0, sx1, 0, sy1, -0.14, { lit: o.shopLit, lightCol: o.shopCol, power: o.shopPower, smashed: o.smashed, flicker: o.flicker, lamp: o.shopLamp, wall: o.shopWall });
    if (o.inside === "laundry") {
      for (let i = 0; i < Math.floor(I.w / 0.72) - 1; i++) washer(P3, sx0 + 0.45 + i * 0.72, 0.52, -3);
      P3.box("wood", 1.6, 0.05, 0.5, I.cx, 1, -1.6, { col: [0.7, 0.66, 0.6], b: 0.01 });
      for (const s of [-0.7, 0.7]) P3.box("galv", 0.04, 0.48, 0.4, I.cx + s, 0.76, -1.6, {});
      for (let i = 0; i < 3; i++) P3.add("plastic", softBox(0.5, 0.3, 0.38, 0.06, 2), [[0.2, 0.4, 0.6], [0.7, 0.7, 0.68], [0.6, 0.2, 0.2]][i], { p: [sx0 + 0.6 + i * 0.9, 0.67 + (i === 1 ? 0.5 : 0), -1 - (i === 1 ? 0.6 : 0)], r: [0, R4(), 0] });
    } else {
      shelves(P3, I.cx - I.w * 0.22, 0.52, -3.1, I.w * 0.4, 1.9, seed);
      shelves(P3, I.cx + I.w * 0.24, 0.52, -3.1, I.w * 0.4, 1.9, seed + 3);
      P3.box("wood", 1.5, 0.95, 0.55, I.cx + (doorL ? 0.5 : -0.5), 0.99, -1.5, { col: [0.5, 0.42, 0.34], b: 0.015 });
      P3.add("trim", softBox(0.3, 0.26, 0.3, 0.03, 2), null, { p: [I.cx + (doorL ? 0.8 : -0.8), 1.6, -1.5] });
      for (let i = 0; i < 5; i++) P3.box("plastic", 0.24, 0.3, 0.2, sx0 + 0.3 + R4() * (I.w - 0.6), 0.67, -0.5 - R4() * 0.4, { col: [0.3 + R4() * 0.5, 0.3 + R4() * 0.4, 0.2 + R4() * 0.4], r: [0, R4() * 3, R4() < 0.3 ? H : 0], b: 0.01 });
    }
    if (A) P3.quad("sign", 0.42, 0.42 / A.aspect("openclosed"), A.rect("openclosed"), { p: [doorL ? sx0 + 0.5 : sx1 - 0.5, 1.75, -0.13] });
  }
  P3.push({ p: [dx, 0, -0.26] });
  frameXY(P3, "paint", -dw / 2, 0, dw / 2, 2.75, 0.02, 0.06, 0.1, o.doorCol || [0.2, 0.24, 0.22]);
  P3.box("paint", dw - 0.12, 0.06, 0.08, 0, 2.15, 0.02, { col: o.doorCol || [0.2, 0.24, 0.22] });
  P3.box(o.shopLit ? "glassT" : "glass", dw - 0.14, 0.5, 8e-3, 0, 2.44, 0.02, { b: 0 });
  P3.ext("paint", rectPts(-dw / 2 + 0.07, 0.04, dw / 2 - 0.07, 2.1), -0.02, 0.025, { holes: mode === "glass" ? [roundRect(-dw / 2 + 0.2, 0.9, dw / 2 - 0.2, 1.95, 0.03, 3)] : null, bevel: 6e-3, col: o.doorCol || [0.2, 0.24, 0.22] });
  if (mode === "glass") P3.box(o.shopLit ? "glassT" : "glass", dw - 0.4, 1.06, 8e-3, 0, 1.42, 0, { b: 0 });
  else for (const y of [0.55, 1.5]) frameXY(P3, "paint", -dw / 2 + 0.2, y - 0.3, dw / 2 - 0.2, y + 0.42, 0.028, 0.03, 0.012, o.doorCol || [0.2, 0.24, 0.22]);
  P3.box("steel", dw - 0.2, 0.22, 4e-3, 0, 0.17, 0.028, { col: [0.8, 0.78, 0.7], b: 0 });
  P3.box("chrome", 0.03, 0.34, 0.03, dw / 2 - 0.18, 1.1, 0.06, { b: 0.01 });
  P3.box("steel", 0.24, 0.05, 6e-3, 0, 0.78, 0.028, { col: [0.8, 0.7, 0.4], b: 2e-3 });
  P3.box("concrete", dw + 0.1, 0.03, 0.3, 0, 0.015, 0.14, { col: [0.75, 0.75, 0.75], b: 8e-3 });
  P3.box("black", dw, 2.7, 0.01, 0, 1.35, -0.06, { b: 0 });
  P3.pop();
  if (A && o.poster) P3.quad("decal", 0.55, 0.55 / A.aspect(o.poster), A.rect(o.poster), { p: [dx + (doorL ? -1 : 1) * 0, 3.1, 4e-3] });
  const fy = gh - 0.62, fw = w - 2 * pier - 0.1;
  P3.box("paint", fw, 0.86, 0.1, 0, fy, 0.03, { col: [0.12, 0.12, 0.13], b: 0.015 });
  frameXY(P3, "paint", -fw / 2, fy - 0.43, fw / 2, fy + 0.43, 0.085, 0.035, 0.02, o.trimCol || [0.3, 0.3, 0.3]);
  if (A && o.shop) {
    const sw = Math.min(fw - 0.2, 0.72 * A.aspect(o.shop));
    P3.quad(o.signLit ? "signLit" : "sign", sw, sw / A.aspect(o.shop), A.rect(o.shop), { p: [0, fy, 0.083] });
    if (o.signLit) P3.glow("fill", [0, fy - 0.2, 0.9], { col: o.signCol || [1, 0.9, 0.75], power: 6, dist: 6 });
  }
  if (o.lamps) for (let i = 0; i < o.lamps; i++) {
    const x = -fw / 2 + (i + 0.5) * fw / o.lamps;
    P3.tube("steel", [[x, fy + 0.5, 0.06], [x, fy + 0.75, 0.2], [x, fy + 0.7, 0.42], [x, fy + 0.56, 0.5]], 0.012, { col: C.dark, seg: 6 });
    P3.lathe("paint", [[0.02, 0.06], [0.05, 0.04], [0.11, -0.04], [0.115, -0.045], [0.1, -0.03], [0, 0.02]], { seg: 12, p: [x, fy + 0.54, 0.51], r: [0.5, 0, 0], col: [0.12, 0.2, 0.16] });
    P3.cyl("lampWarm", 0.025, 0.03, x, fy + 0.5, 0.49, { seg: 8 });
  }
  if (o.lamps) P3.glow("fill", [0, fy + 0.15, 1.25], { col: [1, 0.7, 0.4], power: o.lampPower || 5, dist: 7 });
  if (o.awning) awning(P3, sx0 - 0.1, sx1 + 0.1, sy1 + 0.22, { col: o.awning, col2: o.awning2, torn: o.torn ? seed + 0.5 : 0 });
  P3.ext("concrete", profCornice(0.22, 0.26).map(([f3, u]) => [f3, u]), -hw - 0.04, hw + 0.04, { plane: "side", bevel: 6e-3, col: [0.72, 0.7, 0.66], p: [0, gh - 0.13, 0] });
  const nw = o.nw || Math.max(2, Math.round(w / 2.6)), ww = o.ww || 1.15, wh = o.wh || 1.7, wins = [], uh = [];
  for (let f3 = 0; f3 < floors; f3++) for (let i = 0; i < nw; i++) {
    const x = -hw + (i + 0.5) * w / nw, y = gh + f3 * fh + 0.75;
    wins.push([x, y, f3, i]);
    uh.push(rectPts(x - ww / 2, y, x + ww / 2, y + wh));
  }
  P3.ext(style, rectPts(-hw, gh, hw, Ht), -th, 0, { holes: uh, bevel: 4e-3, col: tint });
  const lit = o.lit || [];
  let wi = 0;
  for (const [x, y, f3, i] of wins) {
    const id = wi++, L = lit.find((l) => l[0] === id), ro = R4();
    windowUnit(P3, WA, x, y, ww, wh, { lit: L ? L[1] : null, ac: !o.fire && ro < 0.22, board: !L && ro > 0.9, box: ro > 0.22 && ro < 0.3, stain: ro > 0.45 ? "grimeRun" : null, marks: MK, lintelMat: style === "brick" ? "brick" : "concrete", lintelCol: style === "brick" ? [tint[0] * 0.7, tint[1] * 0.66, tint[2] * 0.62] : [0.9, 0.88, 0.84], frameCol: o.frameCol });
  }
  for (let f3 = 1; f3 < floors; f3++) P3.box("concrete", w + 0.04, 0.12, 0.06, 0, gh + f3 * fh + 0.2, 0.02, { col: [0.72, 0.7, 0.66], b: 0.012 });
  if (style === "stucco") for (const s of [-1, 1]) for (let y = gh + 0.4; y < Ht - 0.6; y += 0.62) P3.box("stucco", 0.5 - Math.round(y / 0.62) % 2 * 0.14, 0.5, 0.05, s * (hw - 0.25 + Math.round(y / 0.62) % 2 * 0.07), y + 0.25, 0.02, { col: [tint[0] * 0.85, tint[1] * 0.85, tint[2] * 0.85], b: 0.012 });
  P3.ext("concrete", profCornice(0.34, 0.42), -hw - 0.06, hw + 0.06, { plane: "side", bevel: 6e-3, col: [0.7, 0.68, 0.64], p: [0, Ht - 0.5, 0] });
  for (let x = -hw + 0.3; x < hw; x += 0.6) P3.box("concrete", 0.16, 0.2, 0.2, x, Ht - 0.56, 0.1, { col: [0.68, 0.66, 0.62], b: 0.02 });
  P3.box(style, w, 0.7, th, 0, Ht + 0.35, -th / 2, { col: tint, b: 6e-3 });
  P3.box("galv", w + 0.1, 0.05, th + 0.12, 0, Ht + 0.72, -th / 2, { b: 0.012 });
  if (o.tank) {
    P3.push({ p: [o.tank, Ht + 0.7, -2.6] });
    for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) P3.beam("steel", [a, 0, b], [a * 0.9, 1.5, b * 0.9], 0.08, 0.08, { col: C.dark });
    P3.lathe("wood", [[0, 1.5], [1.15, 1.5], [1.15, 3.6], [1.2, 3.62], [1.2, 3.7], [0, 4.5]], { seg: 16, col: [0.6, 0.5, 0.42] });
    for (const y of [1.9, 2.6, 3.3]) P3.add("steel", ring(1.165, 0.02, { seg: 20 }), C.dark, { p: [0, y, 0], r: [H, 0, 0] });
    P3.pop();
  }
  if (o.aerial) {
    P3.bar("steel", [o.aerial, Ht + 0.7, -1.2], [o.aerial, Ht + 3.4, -1.2], 0.02, { col: C.dark });
    for (let i = 0; i < 5; i++) P3.bar("steel", [o.aerial - 0.5 + i * 0.05, Ht + 2.3 + i * 0.22, -1.2], [o.aerial + 0.5 - i * 0.05, Ht + 2.3 + i * 0.22, -1.2], 8e-3, { col: C.dark });
  }
  const px2 = (o.pipe ?? 1) * (hw - 0.16);
  P3.tube("paint", [[px2, Ht + 0.1, 0.12], [px2, 0.5, 0.12], [px2, 0.2, 0.14], [px2, 0.1, 0.3]], 0.05, { seg: 8, samples: 30, col: [0.14, 0.15, 0.15] });
  P3.lathe("paint", [[0.05, 0], [0.13, 0.2], [0.14, 0.3], [0.12, 0.3], [0.04, 0.05]], { seg: 8, p: [px2, Ht - 0.2, 0.12], col: [0.14, 0.15, 0.15] });
  for (let y = 1.2; y < Ht; y += 2.2) P3.box("steel", 0.16, 0.04, 0.09, px2, y, 0.08, { col: C.dark, b: 8e-3 });
  if (MK) P3.quad("mark", 0.9, 1.8, MK.rect("leakRun"), { p: [px2, 0.9, 6e-3] });
  const ux = -px2 * 0.92;
  P3.add("paint", softBox(0.3, 0.38, 0.12, 0.02, 2), [0.75, 0.2, 0.1], { p: [ux, gh + 0.9, 0.06] });
  P3.cyl("ledRed", 0.02, 0.02, ux, gh + 1.02, 0.125, { axis: "z", seg: 8 });
  P3.box("galv", 0.3, 0.42, 0.14, ux * 0.8, 1.5, 0.07, { b: 0.012 });
  P3.bar("galv", [ux * 0.8, 1.72, 0.05], [ux * 0.8, gh + 0.2, 0.05], 0.014);
  P3.tube("rubber", catenary([ux * 0.8, gh + 0.2, 0.06], [ux, gh + 0.75, 0.06], 0.2, 8), 8e-3, { col: [0.3, 0.3, 0.3] });
  P3.push({ p: [ux * 0.55, gh - 0.02, 0.2], r: [0.35, ux > 0 ? -0.5 : 0.5, 0] });
  P3.add("paint", softBox(0.1, 0.1, 0.24, 0.02, 2), [0.8, 0.8, 0.8], {});
  P3.cyl("black", 0.03, 0.02, 0, 0, 0.125, { axis: "z", seg: 10 });
  P3.pop();
  P3.bar("steel", [ux * 0.55, gh + 0.1, 0.02], [ux * 0.55, gh + 0.02, 0.16], 0.012, { col: C.dark });
  if (o.blade) {
    const bx3 = (o.bladeSide || -1) * (hw - 0.75), by = gh + 1.9, nm = o.blade, c = { neonG: [0.1, 1, 0.35], neonR: [1, 0.08, 0.1], neonP: [1, 0.15, 0.7], neonB: [0.15, 0.55, 1], neonY: [1, 0.75, 0.15] }[nm];
    P3.bar("steel", [bx3, by + 1, 0.02], [bx3, by + 1, 1], 0.02, { col: C.dark });
    P3.bar("steel", [bx3, by + 1.5, 0.02], [bx3, by + 1, 0.7], 0.01, { col: C.dark });
    P3.bar("steel", [bx3, by - 1, 0.02], [bx3, by - 1, 0.9], 0.016, { col: C.dark });
    if (o.cross) {
      for (const [a, b] of [[0.26, 0.86], [0.86, 0.26]]) {
        P3.add("paint", softBox(0.1, a, b, 0.02, 2), [0.1, 0.1, 0.1], { p: [bx3, by, 0.6] });
        for (const s of [-1, 1]) P3.box(nm, 0.012, a - 0.06, b - 0.06, bx3 + s * 0.052, by, 0.6, { b: 0 });
      }
    } else {
      P3.add("paint", softBox(0.14, 1.9, 0.62, 0.03, 3), [0.08, 0.08, 0.09], { p: [bx3, by, 0.55] });
      for (const s of [-1, 1]) {
        P3.tube(nm, [[bx3 + s * 0.08, by - 0.86, 0.3], [bx3 + s * 0.08, by + 0.86, 0.3], [bx3 + s * 0.08, by + 0.86, 0.8], [bx3 + s * 0.08, by - 0.86, 0.8]], 0.014, { closed: true, samples: 0, seg: 6 });
        for (let i = 0; i < 4; i++) P3.tube(nm, [[bx3 + s * 0.08, by + 0.62 - i * 0.42, 0.38], [bx3 + s * 0.08, by + 0.62 - i * 0.42 + (i % 2 ? 0.1 : -0.1), 0.55], [bx3 + s * 0.08, by + 0.62 - i * 0.42, 0.72]], 0.012, { samples: 8, seg: 5 });
      }
    }
    P3.glow("fill", [bx3, by, 0.9], { col: c, power: o.bladePower || 12, dist: 9, flicker: o.bladeFlicker || 0 });
    P3.glow("flare", [bx3, by, 0.6], { col: c, size: 0.8 });
  }
  if (o.fire) fireEscape(P3, o.fire[0], o.fire[1], floors, gh + fh + 0.55, fh, {});
  for (const s of [-1, 1]) P3.box(o.sideMat || "brick", 0.3, Ht + 0.7, depth, s * (hw - 0.15), (Ht + 0.7) / 2, -depth / 2 - 0.02, { col: [0.7, 0.66, 0.62], b: 4e-3 });
  P3.box("concrete", w - 0.4, 0.2, depth, 0, Ht, -depth / 2, { col: [0.3, 0.3, 0.3], b: 0 });
  P3.box("black", w - 0.5, Ht - 0.2, 0.05, 0, Ht / 2, mode === "glass" ? -3.5 : -th - 0.12, { b: 0 });
  P3.col([-hw, 0, -depth], [hw, Ht + 0.7, 0.02], { surface: style === "brick" ? "brick" : "concrete" });
  if (mode === "glass") P3.col([sx0, 0.5, -0.2], [sx1, sy1, -0.08], { surface: "glass", bulletOnly: true });
  return P3.finish({ grime: 1, ground: 0.5 });
});

