var tower = (seed = 1, o = {}) => proto("tower_b" + seed + JSON.stringify({ ...o, watlas: 0, atlas: 0 }), () => {
  const P3 = new Prop("towerb", seed), WA = o.watlas ? o.watlas.windows : null, A = o.atlas, w = o.w || 16, d = o.d || 14, floors = o.floors || 16, fh = 3.1, Ht = floors * fh + 4.5, R4 = P3.R;
  const kind = o.kind || ["slab", "office", "masonry"][seed % 3];
  const wc = P3.pick(kind === "masonry" ? [[0.36, 0.25, 0.2], [0.4, 0.34, 0.27], [0.3, 0.27, 0.25]] : [[0.34, 0.33, 0.32], [0.28, 0.3, 0.32], [0.4, 0.36, 0.3], [0.22, 0.24, 0.26]]), mat = o.mat || (kind === "masonry" ? "brick" : seed % 2 ? "concrete" : "stucco"), litK = o.lit ?? 0.2;
  const sh = (k) => [wc[0] * k, wc[1] * k, wc[2] * k], fy = (f3) => 4.5 + f3 * fh, accent = P3.pick([[0.5, 0.2, 0.14], [0.18, 0.3, 0.36], [0.5, 0.42, 0.2], [0.3, 0.32, 0.3]]);
  const vol = (vw, vd, f0, f1, cx, cz, detail) => {
    const y0 = f0 === 0 ? 0 : fy(f0), y1 = fy(f1);
    P3.box(mat, vw, y1 - y0, vd, cx, (y0 + y1) / 2, cz, { col: wc, b: 0.05 });
    [[vw, [cx, 0, cz + vd / 2 + 0.02], 0], [vw, [cx, 0, cz - vd / 2 - 0.02], PI5], [vd, [cx + vw / 2 + 0.02, 0, cz], H], [vd, [cx - vw / 2 - 0.02, 0, cz], -H]].forEach(([fw, fp, ry2], fi) => {
      const n = Math.floor((fw - 2.2) / 1.9), x0 = -(n - 1) * 0.95;
      P3.push({ p: fp, r: [0, ry2, 0] });
      for (let f3 = f0; f3 < f1; f3++) for (let i = 0; i < n; i++) {
        const x = x0 + i * 1.9, y = fy(f3) + 1.6, lit = WA && R4() < litK * (0.6 + 0.8 * vnoise(i * 0.4 + seed + fi * 7, f3 * 0.3, 1)), cell = lit ? 8 + Math.floor(R4() * 24) : Math.floor(R4() * 8);
        if (WA) P3.quad("winFar", 1.5, 1.7, WA.rect(cell), { p: [x, y, 0] });
        else P3.box("glass", 1.5, 1.7, 0.02, x, y, 0, { b: 0 });
      }
      if (detail) detail(fi, fw, n, x0, f0, f1);
      P3.pop();
    });
  };
  let roofW = w, roofD = d, roofX = 0, roofZ = 0;
  if (kind === "office") {
    const fs = Math.max(3, Math.round(floors * 0.62)), uw = w - 3.8, ud = d - 3, ux = (seed % 2 ? 1 : -1) * 0, piers = (fi, fw, n, x0, f0, f1) => {
      for (let i = 0; i <= n; i++) P3.box(mat, 0.34, (f1 - f0) * fh, 0.36, x0 - 0.95 + i * 1.9, (fy(f0) + fy(f1)) / 2, 0.16, { col: sh(i % 3 === 0 ? 1.18 : 1.05), b: 0 });
      for (let f3 = f0 + 1; f3 <= f1; f3++) P3.box("concrete", fw - 0.3, 0.5, 0.2, 0, fy(f3) - 0.2, 0.08, { col: sh(0.82), b: 0 });
    };
    vol(w, d, 0, fs, 0, 0, piers);
    vol(uw, ud, fs, floors, ux, 0, piers);
    P3.box("concrete", w + 0.3, 0.9, d + 0.3, 0, fy(fs) + 0.35, 0, { col: sh(0.85), b: 0.04 });
    P3.box(mat, uw + 0.5, 1.2, ud + 0.5, ux, fy(fs) + 0.6, 0, { col: sh(0.7), b: 0.04 });
    for (const sz of [-1, 1]) if (R4() < 0.7) P3.box("lampDim", uw * 0.8, 0.06, 0.12, ux, fy(fs) + 1.3, sz * (ud / 2 + 0.28), { b: 0 });
    roofW = uw;
    roofD = ud;
    roofX = ux;
  } else if (kind === "slab") {
    const long = w >= d ? [0, 1] : [2, 3];
    vol(w, d, 0, floors, 0, 0, (fi, fw, n, x0, f0, f1) => {
      if (!long.includes(fi)) return;
      for (let i = 0; i <= n; i += 2) P3.box("concrete", 0.22, (f1 - f0) * fh + 0.4, 1.3, x0 - 0.95 + Math.min(i, n) * 1.9, (fy(f0) + fy(f1)) / 2, 0.63, { col: sh(1.12), b: 0 });
      if (n % 2) P3.box("concrete", 0.22, (f1 - f0) * fh + 0.4, 1.3, x0 - 0.95 + n * 1.9, (fy(f0) + fy(f1)) / 2, 0.63, { col: sh(1.12), b: 0 });
      for (let f3 = f0; f3 < f1; f3++) for (let i = 0; i + 1 < n; i += 2) {
        const xb = x0 + i * 1.9 + 0.95, y = fy(f3), pc = R4() < 0.3 ? accent : sh(0.9 + 0.3 * R4());
        P3.box("concrete", 3.58, 0.16, 1.2, xb, y + 0.42, 0.6, { col: sh(1), b: 0 });
        P3.box("paint", 3.58, 0.95, 0.07, xb, y + 0.98, 1.17, { col: pc, b: 0 });
        if (R4() < 0.22) P3.box("paint", 0.8, 0.55, 0.32, xb + (R4() < 0.5 ? -1.2 : 1.2), y + 0.9, 0.2, { col: [0.6, 0.6, 0.58], b: 0 });
        if (R4() < 0.12) P3.box("tarp", 1.6, 1.3, 0.04, xb + P3.rr(-0.6, 0.6), y + 1.9, 1.16, { col: P3.pick([[0.5, 0.5, 0.46], [0.3, 0.36, 0.5], [0.5, 0.3, 0.26]]), b: 0 });
      }
    });
    const cs = seed % 2 ? 1 : -1, cw = 4.2, cd = Math.min(5, d * 0.4), cx = cs * (w / 2 + cw / 2 - 0.6), ch = Ht + 3.4;
    P3.box(mat, cw, ch, cd, cx, ch / 2, 0, { col: sh(0.86), b: 0.05 });
    P3.box("concrete", cw + 0.3, 0.5, cd + 0.3, cx, ch + 0.2, 0, { col: sh(0.7), b: 0.04 });
    for (let f3 = 0; f3 < floors; f3++) {
      const lit = R4() < 0.6;
      for (const sz of [-1, 1]) {
        P3.push({ p: [cx, fy(f3) + 2.4, sz * (cd / 2 + 0.02)], r: [0, sz > 0 ? 0 : PI5, 0] });
        if (WA) P3.quad("winFar", 0.9, 1.3, WA.rect(lit ? 8 + Math.floor(R4() * 24) : Math.floor(R4() * 8)));
        else P3.box("glass", 0.9, 1.3, 0.02, 0, 0, 0, { b: 0 });
        P3.pop();
      }
    }
  } else {
    vol(w, d, 0, floors, 0, 0, (fi, fw, n, x0, f0, f1) => {
      for (const x of [-fw / 2 + 0.55, fw / 2 - 0.55]) P3.box(mat, 1.1, (f1 - f0) * fh + 4.5, 0.3, x, ((f1 - f0) * fh + 4.5) / 2, 0.12, { col: sh(1.12), b: 0.03 });
      for (let f3 = f0 + 3; f3 < f1; f3 += 4) P3.box("concrete", fw + 0.1, 0.34, 0.34, 0, fy(f3) - 0.12, 0.14, { col: [0.5, 0.48, 0.44], b: 0.03 });
      for (let f3 = f0; f3 < f1; f3++) for (let i = 0; i < n; i++) if ((i + f3 + seed) % 5 === 0) P3.box("paint", 0.85, 0.5, 0.42, x0 + i * 1.9, fy(f3) + 0.95, 0.2, { col: [0.55, 0.55, 0.52], b: 0 });
    });
    for (const [k, hh, yy] of [[0.5, 0.35, 0], [1, 0.45, 0.4], [1.5, 0.3, 0.8]]) P3.box("concrete", w + k, hh, d + k, 0, Ht - 0.9 + yy, 0, { col: [0.5, 0.48, 0.44], b: 0.04 });
    for (const sz of [-1, 1]) for (let x = -w / 2 + 0.6; x < w / 2; x += 1.9) P3.box("concrete", 0.3, 0.5, 0.5, x, Ht - 1.3, sz * (d / 2 + 0.2), { col: [0.44, 0.42, 0.38], b: 0 });
  }
  P3.box("concrete", w + 0.5, 4.2, d + 0.5, 0, 2.1, 0, { col: sh(0.8), b: 0.06 });
  if (kind !== "office") for (let f3 = 1; f3 <= floors; f3 += kind === "slab" ? 1 : 2) P3.box("concrete", w + 0.16, 0.24, d + 0.16, 0, fy(f3) - 0.2, 0, { col: sh(1.2), b: 0 });
  const ry = Ht, tankStand = (x, z, r, hh) => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      P3.beam("steel", [x + sx * r * 0.75, ry + 0.5, z + sz * r * 0.75], [x + sx * r * 0.62, ry + 0.5 + hh, z + sz * r * 0.62], 0.16, 0.16, { col: C.dark });
      P3.bar("steel", [x + sx * r * 0.75, ry + 0.6, z + sz * r * 0.75], [x - sz * r * 0.62, ry + 0.4 + hh, z + sx * r * 0.62], 0.035, { col: C.dark, seg: 5 });
    }
    P3.box("steel", r * 1.7, 0.16, r * 1.7, x, ry + 0.55 + hh, z, { col: C.dark, b: 0.02 });
    P3.lathe("wood", [[0, 0], [r, 0], [r * 1.03, 0.08], [r * 1.03, r * 1.55], [r, r * 1.62], [r * 1.08, r * 1.64], [r * 1.08, r * 1.7], [0.12, r * 2.25], [0, r * 2.27]], { seg: 16, p: [x, ry + 0.65 + hh, z], col: [0.3, 0.22, 0.15] });
    for (const k of [0.25, 0.8, 1.35]) P3.lathe("steel", [[r * 1.03, 0], [r * 1.06, 0.02], [r * 1.06, 0.07], [r * 1.03, 0.09]], { seg: 16, p: [x, ry + 0.65 + hh + r * k, z], col: C.dark });
    P3.bar("steel", [x + r * 1.1, ry + 0.5, z], [x + r * 1.1, ry + 0.65 + hh + r * 1.7, z], 0.03, { col: C.dark, seg: 5 });
  };
  const chiller = (x, z) => {
    P3.add("paint", softBox(2.6, 1.7, 1.8, 0.1, 2), [0.5, 0.5, 0.5], { p: [x, ry + 1.5, z] });
    for (const dx of [-0.7, 0.7]) {
      P3.cyl("steel", 0.55, 0.22, x + dx, ry + 2.45, z, { seg: 12, col: C.dark });
      P3.cyl("paint", 0.62, 0.06, x + dx, ry + 2.58, z, { seg: 12, col: [0.42, 0.42, 0.42] });
    }
    for (let i = 0; i < 5; i++) P3.box("steel", 2.4, 0.05, 0.03, x, ry + 0.95 + i * 0.25, z + 0.92, { col: C.dark, b: 0 });
  };
  const mast = (x, z, hh, lamp2 = true) => {
    P3.bar("steel", [x, ry + 0.6, z], [x, ry + hh, z], 0.12, { r2: 0.04, col: C.dark });
    for (let i = 0; i < 4; i++) P3.bar("steel", [x - 1.2 + i * 0.2, ry + hh * 0.5 + i * 1.1, z], [x + 1.2 - i * 0.2, ry + hh * 0.5 + i * 1.1, z], 0.04, { col: C.dark });
    for (const sx of [-1, 1]) P3.bar("steel", [x, ry + hh * 0.7, z], [x + sx * hh * 0.28, ry + 0.6, z + sx * 0.4], 0.015, { col: C.dark, seg: 4 });
    if (lamp2) {
      P3.cyl("emRedB", 0.22, 0.35, x, ry + hh + 0.2, z, { seg: 8 });
      P3.glow("flare", [x, ry + hh + 0.2, z], { col: [1, 0.08, 0.05], size: 5, blink: 1 });
    }
  };
  P3.box(mat, roofW + 0.3, 1, roofD + 0.3, roofX, ry + 0.4, roofZ, { col: sh(0.85), b: 0.05 });
  if (kind === "office") {
    const sw = roofW * 0.62, sd = roofD * 0.6;
    for (const [bw, bd, bx3, bz] of [[sw, 0.2, 0, sd / 2], [sw, 0.2, 0, -sd / 2], [0.2, sd, sw / 2, 0], [0.2, sd, -sw / 2, 0]]) {
      P3.box("galv", bw, 2.6, bd, roofX + bx3, ry + 2.1, bz, { b: 0.02 });
      for (let i = 0; i < 6; i++) P3.box("steel", bw + 0.06, 0.08, bd + 0.06, roofX + bx3, ry + 1 + i * 0.4, bz, { col: C.dark, b: 0 });
    }
    chiller(roofX - sw * 0.2, 0);
    chiller(roofX + sw * 0.2, 0.3);
    mast(roofX + sw * 0.34, -sd * 0.2, 15);
    if (seed % 4 < 2) {
      for (const sz of [-1, 1]) P3.box("lampCool", roofW + 0.36, 0.1, 0.06, roofX, ry + 0.95, sz * (roofD / 2 + 0.17), { b: 0 });
      P3.glow("flare", [roofX, ry + 1, roofD / 2 + 0.4], { col: [0.7, 0.85, 1], size: 7 });
    }
  } else if (kind === "slab") {
    P3.box("concrete", w * 0.26, 3, d * 0.4, -w * 0.18, ry + 2.3, -d * 0.1, { col: wc, b: 0.05 });
    P3.box("concrete", w * 0.28, 0.25, d * 0.42, -w * 0.18, ry + 3.9, -d * 0.1, { col: sh(0.75), b: 0.03 });
    for (let i = 0; i < 3; i++) P3.add("paint", softBox(2.2, 1.4, 1.6, 0.1, 2), [0.5, 0.5, 0.5], { p: [w * 0.08 + i * 2.6, ry + 1.6, d * 0.25] });
    for (let i = 0; i < 5; i++) {
      const x = P3.rr(-w * 0.42, w * 0.42), z = P3.rr(-d * 0.4, d * 0.4), hh = P3.rr(2.5, 4.5);
      P3.bar("steel", [x, ry + 0.8, z], [x, ry + 0.8 + hh, z], 0.025, { col: C.dark, seg: 5 });
      for (let k = 0; k < 3; k++) P3.bar("steel", [x - 0.5 + k * 0.1, ry + 0.4 + hh - k * 0.3, z], [x + 0.5 - k * 0.1, ry + 0.4 + hh - k * 0.3, z], 0.012, { col: C.dark, seg: 4 });
    }
    mast(w * 0.3, -d * 0.2, 9, seed % 2 === 0);
  } else {
    tankStand(w * 0.2, -d * 0.12, 1.7, 2.6);
    if (floors > 9) tankStand(-w * 0.26, d * 0.16, 1.25, 1.8);
    P3.box("brick", w * 0.22, 2.4, d * 0.3, -w * 0.05, ry + 2, -d * 0.24, { col: wc, b: 0.04 });
    P3.ext("galv", [[-w * 0.13, 0], [w * 0.13, 0], [0, 0.7]], -d * 0.17, d * 0.17, { plane: "fwd", bevel: 0.02, p: [-w * 0.05, ry + 3.2, -d * 0.24] });
    for (let i = 0; i < 3; i++) {
      const x = -w * 0.4 + i * 1.3;
      P3.box("brick", 0.7, 2.2 + i * 0.3, 0.7, x, ry + 1.9 + i * 0.15, d * 0.3, { col: sh(0.8), b: 0.03 });
      P3.cyl("wood", 0.16, 0.5, x, ry + 3.25 + i * 0.3, d * 0.3, { seg: 8, col: [0.3, 0.16, 0.1] });
    }
    mast(-w * 0.36, -d * 0.3, 7, false);
  }
  if (o.billboard && A) {
    const bw = 11, bh = bw / A.aspect(o.billboard);
    P3.push({ p: [0, Ht + 0.9, d / 2 - 0.6], r: [0, o.bbYaw || 0, 0] });
    for (const x of [-4, 0, 4]) {
      P3.beam("steel", [x, 0, 0], [x, 1.6 + bh, -0.1], 0.2, 0.2, { col: C.dark });
      P3.beam("steel", [x, 0, -2.2], [x, 1.4 + bh * 0.7, -0.15], 0.14, 0.14, { col: C.dark });
    }
    P3.box("paint", bw + 0.5, bh + 0.5, 0.25, 0, 1.6 + bh / 2, 0.05, { col: [0.1, 0.1, 0.1], b: 0.05 });
    P3.quad("signLit", bw, bh, A.rect(o.billboard), { p: [0, 1.6 + bh / 2, 0.19] });
    for (let i = 0; i < 5; i++) {
      P3.bar("steel", [-4.4 + i * 2.2, 1.5, 0.2], [-4.4 + i * 2.2, 1.2, 1.3], 0.03, { col: C.dark });
      P3.box("lampCool", 0.5, 0.06, 0.16, -4.4 + i * 2.2, 1.22, 1.3, { b: 0 });
    }
    P3.glow("flare", [0, 1.6 + bh / 2, 1], { col: [0.9, 0.85, 0.75], size: 9 });
    P3.pop();
  }
  P3.col([-w / 2, 0, -d / 2], [w / 2, Ht, d / 2], { surface: "concrete" });
  return P3.finish({ grime: 1, ground: 3 });
});
var overpass = (seed = 1, o = {}) => proto("overpass" + seed, () => {
  const P3 = new Prop("overpass", seed), A = o.atlas, L = o.len || 90, hl = L / 2, y = o.y || 9.5;
  P3.ext("concrete", [[-6.2, 0], [6.2, 0], [6.6, 0.5], [6.6, 1.1], [6.2, 1.15], [6.2, 0.75], [-6.2, 0.75], [-6.2, 1.15], [-6.6, 1.1], [-6.6, 0.5]].map(([f3, u]) => [f3, u + y]), -hl, hl, { plane: "side", bevel: 0.03, col: [0.62, 0.62, 0.6] });
  P3.ext("concrete", [[-3.4, -1.5], [3.4, -1.5], [4.4, 0], [-4.4, 0]].map(([f3, u]) => [f3, u + y]), -hl, hl, { plane: "side", bevel: 0.03, col: [0.55, 0.55, 0.53] });
  for (let x = -hl + 9; x < hl; x += 18) {
    if (Math.abs(x) < 7) continue;
    P3.ext("concrete", roundRect(-1.1, -1.6, 1.1, 1.6, 0.5, 4), 0, y - 2.6, { plane: "up", bevel: 0.04, col: [0.6, 0.6, 0.58], p: [x, 0, 0] });
    P3.ext("concrete", [[-4.6, 0], [-1.3, -1.2], [1.3, -1.2], [4.6, 0]].map(([f3, u]) => [f3, u + y - 1.5]), x - 1.2, x + 1.2, { plane: "side", bevel: 0.04, col: [0.6, 0.6, 0.58] });
  }
  for (const s of [-1, 1]) {
    for (let x = -hl + 2; x < hl; x += 4) P3.box("galv", 0.1, 0.9, 0.1, x, y + 1.55, s * 6.35, { b: 0.01 });
    for (const yy of [1.5, 1.9]) P3.bar("galv", [-hl, y + yy, s * 6.35], [hl, y + yy, s * 6.35], 0.05);
  }
  for (let x = -hl + 6; x < hl; x += 15) {
    const on = (Math.round(x) + seed) % 3 !== 0;
    P3.lathe("paint", [[0.14, 0], [0.08, 7]], { seg: 8, p: [x, y + 1.1, -6.3], col: [0.3, 0.32, 0.32] });
    P3.bar("paint", [x, y + 8.1, -6.3], [x, y + 8.4, -4.3], 0.06, { col: [0.3, 0.32, 0.32] });
    P3.add(on ? "lampWarm" : "glass", softBox(0.3, 0.12, 0.8, 0.04, 2), null, { p: [x, y + 8.36, -4] });
    if (on) P3.glow("flare", [x, y + 8.3, -4], { col: [1, 0.6, 0.25], size: 6 });
  }
  P3.push({ p: [o.signX ?? 0, y + 1.1, 5.9] });
  for (const x of [-6.5, 6.5]) P3.beam("galv", [x, 0, 0], [x, 5.2, 0], 0.3, 0.3, {});
  P3.beam("galv", [-6.5, 5, 0], [6.5, 5, 0], 0.3, 0.3, {});
  P3.beam("galv", [-6.5, 3.9, 0], [6.5, 3.9, 0], 0.2, 0.2, {});
  for (let i = 0; i < 13; i++) P3.bar("galv", [-6.5 + i * 1, 3.9, 0], [-6 + i * 1, 5, 0], 0.04);
  if (A) {
    P3.box("paint", 9.5, 2.5, 0.3, 0, 3.2, 0.25, { col: [0.06, 0.06, 0.06], b: 0.04 });
    P3.quad("signLit", 9, 9 / A.aspect("roadclosed"), A.rect("roadclosed"), { p: [0, 3.2, 0.41] });
    P3.glow("flare", [0, 3.2, 1], { col: [1, 0.7, 0.2], size: 8 });
  }
  P3.pop();
  P3.col([-hl, y - 1.5, -6.6], [hl, y + 2, 6.6], { surface: "concrete" });
  return P3.finish({ grime: 1, ground: 2 });
});
var crane = (seed = 1, o = {}) => proto("crane" + seed, () => {
  const P3 = new Prop("crane", seed), Hh = o.h || 62, jib = 44, cj = 14, yel = [0.7, 0.55, 0.08], s = 1.1;
  const lattice = (a, b, w, n, up) => {
    const dir = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = dir.length();
    dir.normalize();
    const u = new Vector3(...up), v = new Vector3().crossVectors(dir, u).normalize();
    u.crossVectors(v, dir).normalize();
    const corner = (t, i) => {
      const cu = (i & 1 ? 1 : -1) * w, cv = (i & 2 ? 1 : -1) * w;
      return [a[0] + dir.x * len * t + u.x * cu + v.x * cv, a[1] + dir.y * len * t + u.y * cu + v.y * cv, a[2] + dir.z * len * t + u.z * cu + v.z * cv];
    };
    for (let i = 0; i < 4; i++) P3.bar("paint", corner(0, i), corner(1, i), 0.09, { col: yel, seg: 5 });
    for (let k = 0; k < n; k++) for (const [i, j] of [[0, 1], [1, 3], [3, 2], [2, 0]]) {
      P3.bar("paint", corner(k / n, i), corner((k + 1) / n, j), 0.045, { col: yel, seg: 4, caps: false });
      P3.bar("paint", corner((k + 1) / n, i), corner((k + 1) / n, j), 0.04, { col: yel, seg: 4, caps: false });
    }
  };
  lattice([0, 0, 0], [0, Hh, 0], s, 26, [1, 0, 0]);
  lattice([0, Hh + 1.2, -cj], [0, Hh + 1.2, jib], 0.8, 30, [0, 1, 0]);
  lattice([0, Hh, 0], [0, Hh + 9, 0], 0.7, 4, [1, 0, 0]);
  for (const z of [jib * 0.45, jib * 0.9, -cj * 0.9]) P3.bar("steel", [0, Hh + 9, 0], [0, Hh + 2, z], 0.04, { col: C.dark });
  P3.box("concrete", 2.2, 2.4, 3.6, 0, Hh + 0.2, -cj + 2.2, { col: [0.5, 0.5, 0.5], b: 0.06 });
  P3.add("paint", softBox(1.6, 1.9, 2, 0.12, 3), [0.75, 0.75, 0.72], { p: [1.5, Hh - 0.6, 1.4] });
  P3.box("glass", 1.4, 1, 0.06, 1.5, Hh - 0.3, 2.42, { b: 0 });
  P3.bar("steel", [0, Hh + 0.4, jib * 0.62], [0, Hh - 22, jib * 0.62], 0.03, { col: C.dark });
  P3.add("paint", softBox(0.9, 1.3, 0.5, 0.1, 2), yel, { p: [0, Hh - 22.6, jib * 0.62] });
  P3.add("steel", ring(0.35, 0.09, { seg: 12, a0: PI5, a1: PI5 * 2.5 }), C.dark, { p: [0, Hh - 23.6, jib * 0.62] });
  for (const [x, y, z] of [[0, Hh + 9.3, 0], [0, Hh + 2.2, jib], [0, Hh + 2.2, -cj]]) {
    P3.cyl("emRedB", 0.25, 0.4, x, y, z, { seg: 8 });
    P3.glow("flare", [x, y, z], { col: [1, 0.08, 0.05], size: 6, blink: 1 });
  }
  P3.col([-1.5, 0, -1.5], [1.5, Hh, 1.5], { surface: "metal" });
  return P3.finish({ grime: 0.8, ground: 2 });
});

