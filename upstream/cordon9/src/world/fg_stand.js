var ST2 = SITE.stand;
var AL = [0.93, 0.94, 0.96];
var ALD = [0.66, 0.68, 0.72];
var PLATE = [0.5, 0.52, 0.56];
var BLK = [0.06, 0.06, 0.065];
var noCol = (P3) => P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
var standSpans = () => {
  const o = [];
  let p = ST2.z0;
  for (const a of ST2.aisles) {
    o.push([p, a - ST2.aisleW / 2]);
    p = a + ST2.aisleW / 2;
  }
  o.push([p, ST2.z1]);
  return o;
};
var sheetZ = (P3, mat, pts, z) => {
  const pos = [], uv = [];
  for (const [x, y] of pts) {
    pos.push(x, y, z);
    uv.push(x, y);
  }
  return P3.add(mat, fromArrays(pos, null, uv, [0, 1, 2, 0, 2, 3]), null, {});
};
var boardX = (P3, A, name, x, y, z, h, mat = "signF") => {
  if (!A) return 0;
  const w = h * A.aspect(name);
  P3.quad(mat, w, h, A.rect(name), { p: [x, y, z], r: [0, H, 0] });
  return w;
};
var bleacher = (seed = 1, o = {}) => proto("bleacher" + seed, () => {
  const P3 = new Prop("bleacher", seed), A = o.atlas, T3 = ST2.tread, Rz = ST2.rise, N = ST2.tiers, z0 = ST2.z0, z1 = ST2.z1, L = z1 - z0, zc0 = (z0 + z1) / 2, back = ST2.xf - ST2.deck, top = N * T3, dy = DECK_Y;
  const navy = FC.navy, gold = FC.gold, R4 = rng(seed * 31 + 5), sp2 = standSpans(), us = [1.6, 3.2, 4.8, 6.4, 8, 9.5, 10.9];
  const nf = 14, fz = (i) => z0 + 0.12 + (L - 0.24) * i / nf;
  for (let i = 0; i <= nf; i++) {
    const z = fz(i);
    P3.beam("galv", [-0.5, 0.06, z], [-top, dy - 0.2, z], 0.18, 0.07, { col: ALD });
    for (const u of us) {
      const h = Math.min(u * 0.5, dy) - 0.3;
      P3.box("galv", 0.07, h, 0.07, -u, 0.02, z, { base: true, col: ALD, b: 8e-3 });
      P3.box("galv", 0.2, 0.014, 0.2, -u, 7e-3, z, { b: 3e-3, col: ALD });
      hex(P3, -u + 0.07, 0.018, z + 0.07, "y", 0.012, 0.012);
      hex(P3, -u - 0.07, 0.018, z - 0.07, "y", 0.012, 0.012);
    }
    for (let j = 0; j < us.length - 1; j++) {
      const a = us[j], b = us[j + 1], ha = Math.min(a * 0.5, dy) - 0.42, hb = Math.min(b * 0.5, dy) - 0.42;
      if (j % 2) P3.bar("galv", [-a, 0.15, z + 0.045], [-b, hb, z + 0.045], 0.016, { col: ALD });
      else P3.bar("galv", [-a, ha, z - 0.045], [-b, 0.15, z - 0.045], 0.016, { col: ALD });
    }
    P3.box("galv", back - top + 0.1, 0.16, 0.07, -(top + back) / 2, dy - 0.14, z, { col: ALD, b: 8e-3 });
    for (let k = 0; k < N; k++) {
      P3.box("galv", T3, 0.05, 0.05, -(k + 0.5) * T3, (k + 1) * Rz - 0.07, z, { col: ALD, b: 6e-3 });
      P3.box("galv", 0.05, Rz - 0.04, 0.05, -k * T3 - 0.045, Math.max(0, k * Rz - 0.05), z, { base: true, col: ALD, b: 6e-3 });
    }
  }
  for (const [u, y] of [[10.9, 1.2], [10.9, 2.6], [8, 1.9], [4.8, 1], [1.6, 0.3]]) P3.box("galv", 0.05, 0.05, L - 0.2, -u - 0.06, y, zc0, { col: ALD, b: 6e-3 });
  for (const i of [1, 5, 8, 12]) {
    const a = fz(i), b = fz(i + 1);
    for (const [u, hh] of [[10.84, 3.6], [7.94, 3.4], [4.74, 1.9]]) {
      P3.bar("galv", [-u, 0.2, a], [-u, hh, b], 0.012, { col: ALD });
      P3.bar("galv", [-u, hh, a], [-u, 0.2, b], 0.012, { col: ALD });
    }
  }
  for (let k = 0; k < N; k++) {
    const y = (k + 1) * Rz, u0 = k * T3;
    for (const [a, b] of sp2) {
      const n = Math.max(1, Math.round((b - a) / 2.4)), l = (b - a) / n;
      for (let i = 0; i < n; i++) {
        const zc = a + (i + 0.5) * l, ln = l - 0.012, v = R4();
        P3.box("paint", 0.27, 0.05, ln, -u0 - 0.115, y - 0.013, zc, { col: v > 0.94 ? ALD : navy, b: 0.012 });
        for (const uc of [0.385, 0.645]) {
          P3.box("galv", 0.245, 0.04, ln, -u0 - uc, y - 0.02, zc, { col: AL, b: 8e-3 });
          for (const dx of [-0.07, 0, 0.07]) P3.box("galv", 0.012, 4e-3, ln - 0.02, -u0 - uc + dx, y + 1e-3, zc, { col: ALD, b: 0 });
        }
        P3.box("galv", 0.016, Rz - 0.06, ln, -u0 + 4e-3, y - Rz / 2 - 0.035, zc, { col: ALD, b: 4e-3 });
        for (let q = 0; q < Math.floor(ln / 0.52); q++) P3.box("plastic", 3e-3, 0.022, 0.05, -u0 + 0.021, y - 0.012, zc - ln / 2 + 0.3 + q * 0.52, { col: [0.85, 0.85, 0.8], b: 0 });
      }
      for (const ze of [a, b]) for (const [uc, w] of [[0.115, 0.27], [0.385, 0.245], [0.645, 0.245]]) P3.box("plastic", w + 4e-3, 0.052, 0.012, -u0 - uc, y - 0.02 + (uc < 0.2 ? 7e-3 : 0), ze + (ze === a ? 4e-3 : -4e-3), { col: BLK, b: 4e-3 });
    }
    for (const a of ST2.aisles) {
      const w = ST2.aisleW - 0.02;
      P3.box("steel", 0.4, 0.03, w, -u0 - 0.2, y - Rz / 2 - 0.015, a, { col: PLATE, b: 6e-3 });
      P3.box("steel", 0.4, 0.03, w, -u0 - 0.6, y - 0.015, a, { col: PLATE, b: 6e-3 });
      for (const [du, yy] of [[0, y - Rz / 2], [0.4, y]]) {
        P3.box("paint", 0.06, 0.036, w + 4e-3, -u0 - du - 0.028, yy - 0.014, a, { col: FC.yellow, b: 6e-3 });
        P3.box("galv", 0.014, Rz / 2 - 0.03, w, -u0 - du + 3e-3, yy - Rz / 4 - 0.02, a, { col: ALD, b: 3e-3 });
      }
    }
  }
  for (let i = 0; i < nf; i++) {
    const a = fz(i), b = fz(i + 1), w = (back - top) / 3;
    for (let j = 0; j < 3; j++) P3.box("steel", w - 0.012, 0.05, b - a - 0.012, -top - (j + 0.5) * w, dy - 0.025, (a + b) / 2, { col: PLATE, b: 6e-3 });
  }
  for (const [a, b] of sp2) {
    const n = Math.round((b - a) / 2.4), l = (b - a) / n;
    for (let i = 0; i <= n; i++) {
      const z = a + i * l;
      P3.box("galv", 0.05, 1.12, 0.05, 0.045, 0, z, { base: true, col: ALD, b: 6e-3 });
      P3.box("plastic", 0.054, 0.012, 0.054, 0.045, 1.126, z, { col: BLK, b: 4e-3 });
      P3.box("galv", 0.14, 0.012, 0.14, 0.045, 6e-3, z, { col: ALD, b: 3e-3 });
    }
    P3.bar("galv", [0.045, 1.08, a], [0.045, 1.08, b], 0.024, { col: AL });
    P3.bar("galv", [0.045, 0.5, a], [0.045, 0.5, b], 0.014, { col: AL });
    for (let i = 0; i < n; i++) {
      const zc = a + (i + 0.5) * l;
      P3.quad("meshWeld", l - 0.06, 0.56, null, { p: [0.05, 0.79, zc], r: [0, H, 0] });
      P3.box("paint", 0.02, 0.42, l - 0.07, 0.062, 0.05, zc, { base: true, col: i % 2 ? navy : gold, b: 4e-3 });
    }
  }
  if (A) {
    boardX(P3, A, "kestrels", 0.076, 0.27, -14.6, 0.34);
    boardX(P3, A, "school", 0.076, 0.27, -5.6, 0.3);
    boardX(P3, A, "evac", 0.08, 0.8, 5.7, 0.62);
    boardX(P3, A, "kestrels", 0.076, 0.27, 14.6, 0.34);
    for (const [z, n] of [[-12.5, "home"], [-10.3, "section"], [1.1, "section"], [12.5, "away"]]) boardX(P3, A, n, 0.076, 0.9, z + (n === "section" ? 0.75 : 0), 0.16);
  }
  for (const s of [-1, 1]) {
    const z = s > 0 ? z1 - 0.035 : z0 + 0.035, tp = [[0.02, 1.1, z]], mp = [[0.02, 0.6, z]];
    for (let k = 0; k <= N; k++) {
      const u = k * T3, y = k * Rz;
      P3.box("galv", 0.05, 1.12, 0.05, -u - 0.03, y, z, { base: true, col: ALD, b: 6e-3 });
      P3.box("plastic", 0.054, 0.012, 0.054, -u - 0.03, y + 1.126, z, { col: BLK, b: 4e-3 });
      tp.push([-u - 0.03, y + 1.1, z]);
      mp.push([-u - 0.03, y + 0.6, z]);
    }
    for (const u of [8.75, 9.5, 10.25, back - 0.05]) {
      P3.box("galv", 0.05, 1.12, 0.05, -u, dy, z, { base: true, col: ALD, b: 6e-3 });
      tp.push([-u, dy + 1.1, z]);
      mp.push([-u, dy + 0.6, z]);
    }
    P3.tube("galv", tp.slice(1), 0.024, { seg: 8, samples: 0, col: AL });
    P3.tube("galv", mp.slice(1), 0.014, { seg: 6, samples: 0, col: AL });
    for (let k = 0; k < N; k++) {
      const ua = k * T3 + 0.06, ub = (k + 1) * T3, ya = k * Rz, yb = (k + 1) * Rz;
      sheetZ(P3, "meshWeld", [[-ua, ya + 0.46], [-ub, yb + 0.06], [-ub, yb + 1.06], [-ua, ya + 1.06]], z);
      sheetZ(P3, "meshWeld", [[-ua + 0.06, 0.06], [-ub, 0.06], [-ub, yb - 0.1], [-ua + 0.06, yb - 0.1]], z);
    }
    sheetZ(P3, "meshWeld", [[-top, dy + 0.08], [-back, dy + 0.08], [-back, dy + 1.06], [-top, dy + 1.06]], z);
    sheetZ(P3, "meshWeld", [[-top, 0.06], [-back, 0.06], [-back, dy - 0.2], [-top, dy - 0.2]], z);
    P3.box("galv", back, 0.05, 0.05, -back / 2, 0.035, z, { col: ALD, b: 6e-3 });
  }
  {
    const bh = dy + 1.15 - 0.2;
    for (const s of [-1, 1]) P3.add("paint", corrugated(L, bh, { pitch: 0.25, depth: 0.035, ny: 3 }), navy, { p: [-back + 0.045 * s, 0.2 + bh / 2, zc0], r: [0, s * H, 0] });
    P3.box("galv", 0.1, 0.05, L, -back, dy + 1.17, zc0, { col: ALD, b: 8e-3 });
    for (let i = 0; i <= nf; i += 2) P3.box("galv", 0.07, 1.2, 0.07, -back + 0.09, dy, fz(i), { base: true, col: ALD, b: 8e-3 });
    if (A) {
      let i = 0;
      for (const z of [-14.6, -11.6, -8.6, 8.6, 11.6, 14.6]) {
        const n = "sp" + i++ % 6;
        P3.box("galv", 0.03, 0.74, 2.5, -back + 0.1, dy + 0.26, z, { base: true, col: ALD, b: 4e-3 });
        P3.quad("signF", 2.4, 0.66, A.rect(n), { p: [-back + 0.118, dy + 0.63, z], r: [0, H, 0] });
      }
    }
  }
  noCol(P3);
  return P3.finish({ grime: 0.9, ground: 0.3 });
});
var pressBox = (seed = 1, o = {}) => proto("pressbox" + seed, () => {
  const P3 = new Prop("pressBox", seed), A = o.atlas, D = SITE.press.x1 - SITE.press.x0, L = SITE.press.z1 - SITE.press.z0, Hh = SITE.press.h, hd = D / 2, hl = L / 2, wh = [0.82, 0.83, 0.8], dk = FC.dk, navy = FC.navy, R4 = rng(seed * 17 + 3);
  P3.box("plastic", D - 0.1, 0.012, L - 0.1, 0, 0, 0, { base: true, col: [0.22, 0.24, 0.27], b: 2e-3 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P3.box("paint", 0.09, Hh, 0.09, sx * (hd - 0.045), 0, sz * (hl - 0.045), { base: true, col: dk, b: 8e-3 });
  for (let i = 0; i < 10; i++) P3.box("paint", 0.05, Hh - 0.12, L / 10 - 0.014, -hd + 0.03, 0.06, -hl + (i + 0.5) * L / 10, { base: true, col: wh, b: 6e-3 });
  P3.box("black", 0.03, Hh - 0.1, L - 0.1, -hd + 0.012, 0.05, 0, { base: true, b: 0 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) P3.box("paint", D / 2 - 0.06, Hh - 0.12, 0.05, -hd / 2 + 0.03 + i * (D / 2 - 0.03), 0.06, s * (hl - 0.03), { base: true, col: wh, b: 6e-3 });
    P3.box("black", D - 0.1, Hh - 0.1, 0.03, 0, 0.05, s * (hl - 0.012), { base: true, b: 0 });
  }
  const dz = 1, sill = 0.9, head = 2.1;
  for (const s of [-1, 1]) {
    const a = dz, b = hl - 0.09, n = 4, l = (b - a) / n;
    for (let i = 0; i < n; i++) {
      const zc = s * (a + (i + 0.5) * l);
      P3.box("paint", 0.05, sill - 0.04, l - 0.014, hd - 0.03, 0.02, zc, { base: true, col: navy, b: 6e-3 });
      if (R4() > 0.34) P3.box("glassT", 8e-3, head - sill - 0.06, l - 0.06, hd - 0.03, (sill + head) / 2, zc, { b: 0 });
      else {
        P3.ext("glassT", [[0, 0], [0.2 + R4() * 0.2, 0], [0.05, 0.16 + R4() * 0.2]], -4e-3, 4e-3, { plane: "side", bevel: 0, p: [hd - 0.03, sill + 0.02, zc - l / 2 + 0.05] });
      }
    }
    for (let i = 0; i <= n; i++) P3.box("paint", 0.06, head - sill, 0.05, hd - 0.03, sill, s * (a + i * l), { base: true, col: dk, b: 6e-3 });
    P3.box("paint", 0.09, 0.04, b - a + 0.05, hd - 0.02, sill, s * (a + b) / 2, { col: dk, b: 8e-3 });
    P3.box("paint", 0.12, 0.03, b - a + 0.05, hd + 0.03, sill - 0.02, s * (a + b) / 2, { col: dk, b: 8e-3, r: [0, 0, -0.2] });
  }
  P3.box("paint", 0.06, Hh - head, L - 0.1, hd - 0.03, head, 0, { base: true, col: wh, b: 6e-3 });
  for (const s of [-1, 1]) P3.box("paint", 0.07, head, 0.07, hd - 0.035, 0, s * (dz + 0), { base: true, col: dk, b: 6e-3 });
  P3.box("paint", 0.04, 1.98, 0.92, hd + 0.05, 0.03, -dz - 0.5, { base: true, col: navy, b: 6e-3 });
  P3.box("glassT", 8e-3, 0.6, 0.5, hd + 0.074, 1.45, -dz - 0.5, { b: 0 });
  P3.box("chrome", 0.05, 0.03, 0.13, hd + 0.085, 1, -dz - 0.82, { b: 8e-3 });
  for (const y of [0.3, 1, 1.75]) P3.cyl("steel", 0.012, 0.09, hd + 0.03, y, -dz - 0.035, { seg: 8, col: ALD });
  P3.bar("steel", [hd + 0.03, 2, -dz - 0.1], [hd + 0.22, 1.86, -dz + 0.12], 8e-3, { col: ALD });
  if (A) {
    boardX(P3, A, "press", hd + 4e-3, head + 0.2, 0, 0.2);
    boardX(P3, A, "noticeA", -hd + 0.058, 1.5, -3.2, 0.5);
    boardX(P3, A, "noticeC", -hd + 0.058, 1.45, 2.4, 0.46);
    boardX(P3, A, "rules", -hd + 0.058, 1.4, 4.1, 0.7);
    boardX(P3, A, "gCount", -hd + 0.06, 1.35, -0.6, 0.6, "decalF");
  }
  P3.box("paint", D + 0.5, 0.1, L + 0.4, 0.1, Hh, 0, { base: true, col: dk, b: 0.012 });
  P3.box("galv", D + 0.3, 0.012, L + 0.2, 0.1, Hh + 0.106, 0, { col: ALD, b: 2e-3 });
  P3.ext("galv", [[0, 0], [0.09, 0], [0.09, 0.07], [0.08, 0.07], [0.08, 0.01], [0.01, 0.01], [0.01, 0.07], [0, 0.07]], -hl - 0.2, hl + 0.2, { plane: "xy", bevel: 1e-3, col: ALD, p: [hd + 0.35, Hh - 0.02, 0] });
  P3.bar("galv", [hd + 0.39, Hh - 0.02, hl + 0.1], [hd + 0.08, Hh - 0.3, hl + 0.06], 0.03, { col: ALD });
  P3.bar("galv", [hd + 0.08, Hh - 0.3, hl + 0.06], [hd + 0.08, 0.05, hl + 0.06], 0.03, { col: ALD });
  for (const s of [-1, 1]) {
    P3.push({ p: [hd + 0.2, Hh + 0.32, s * (hl - 0.5)], r: [0, 0, -0.18] });
    P3.lathe("paint", [[0.02, -0.26], [0.045, -0.2], [0.05, -0.02], [0.2, 0.2], [0.21, 0.2], [0.21, 0.215], [0.19, 0.215], [0.04, 0], [0, 0]], { axis: "x", seg: 14, col: [0.75, 0.75, 0.72] });
    P3.pop();
    P3.bar("galv", [hd + 0.15, Hh + 0.1, s * (hl - 0.5)], [hd + 0.15, Hh + 0.3, s * (hl - 0.5)], 0.014);
    P3.box("galv", 0.1, 0.012, 0.1, hd + 0.15, Hh + 0.112, s * (hl - 0.5), { b: 2e-3 });
  }
  P3.bar("galv", [-hd + 0.3, Hh + 0.1, -hl + 0.6], [-hd + 0.3, Hh + 2.6, -hl + 0.6], 0.016);
  for (let i = 0; i < 4; i++) P3.bar("galv", [-hd + 0.3, Hh + 1.5 + i * 0.3, -hl + 0.6 - 0.3 + i * 0.04], [-hd + 0.3, Hh + 1.5 + i * 0.3, -hl + 0.6 + 0.3 - i * 0.04], 5e-3);
  for (const z of [-2.2, -1.1, 0, 1.1, 2.2]) P3.bar("galv", [hd + 0.1, Hh + 0.1, z], [hd + 0.1, Hh + 1.05, z], 0.018, { col: AL });
  for (const y of [0.55, 1.05]) P3.bar("galv", [hd + 0.1, Hh + y, -2.2], [hd + 0.1, Hh + y, 2.2], 0.018, { col: AL });
  for (const z of [-2.2, 2.2]) {
    P3.bar("galv", [hd + 0.1, Hh + 1.05, z], [-hd + 0.4, Hh + 1.05, z], 0.018, { col: AL });
    P3.bar("galv", [-hd + 0.4, Hh + 1.05, z], [-hd + 0.4, Hh + 0.1, z], 0.018, { col: AL });
  }
  for (const s of [-1, 1]) {
    const zc = s * (dz + 0.25 + (hl - dz - 0.4) / 2), dl = hl - dz - 0.4;
    P3.box("wood", 0.56, 0.036, dl, hd - 0.36, 0.76, zc, { col: [0.62, 0.52, 0.4], b: 6e-3 });
    for (const e of [-1, 1]) {
      P3.box("paint", 0.5, 0.74, 0.03, hd - 0.36, 0, zc + e * (dl / 2 - 0.03), { base: true, col: dk, b: 4e-3 });
    }
    P3.box("paint", 0.02, 0.3, dl - 0.06, hd - 0.62, 0.42, zc, { base: true, col: dk, b: 4e-3 });
    for (let i = 0; i < 2; i++) {
      const cz = zc + (i - 0.5) * 1.5, tip = s > 0 && i === 1;
      P3.push({ p: [hd - 0.95 - (tip ? 0.3 : 0), tip ? 0.24 : 0, cz], r: tip ? [H * 0.96, 0.5, 0] : [0, (R4() - 0.5) * 0.9, 0] });
      P3.add("canvas", softBox(0.44, 0.07, 0.44, 0.025, 3), [0.1, 0.16, 0.34], { p: [0, 0.46, 0] });
      P3.add("canvas", softBox(0.06, 0.42, 0.4, 0.025, 3), [0.1, 0.16, 0.34], { p: [-0.21, 0.78, 0], r: [0, 0, -0.12] });
      for (const [lx3, lz3] of [[-0.18, -0.18], [-0.18, 0.18], [0.18, -0.18], [0.18, 0.18]]) P3.bar("chrome", [lx3, 0.43, lz3], [lx3 * 1.15, 0, lz3 * 1.15], 0.011);
      P3.bar("chrome", [-0.2, 0.46, -0.18], [-0.24, 0.62, -0.18], 0.011);
      P3.bar("chrome", [-0.2, 0.46, 0.18], [-0.24, 0.62, 0.18], 0.011);
      P3.pop();
    }
  }
  {
    const z = -2.6, x = hd - 0.38, y = 0.778;
    P3.push({ p: [x, y, z] });
    P3.add("plastic", softBox(0.4, 0.07, 0.62, 0.012, 2), [0.1, 0.1, 0.11], { p: [0, 0.04, 0], r: [0, 0, 0.12] });
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) P3.cyl(j === 0 ? "ledGreen" : "plastic", 8e-3, 0.016, 0.14 - j * 0.085, 0.085 - j * 0.01, -0.26 + i * 0.075, { seg: 6, col: j ? [0.5 + 0.4 * ((i + j) % 2), 0.2, 0.1] : null });
    for (let i = 0; i < 8; i++) P3.box("plastic", 0.03, 0.012, 0.012, -0.12 + i * 37 % 9 * 6e-3, 0.058, -0.26 + i * 0.075, { col: [0.8, 0.8, 0.78], b: 2e-3 });
    P3.tube("steel", [[0.1, 0.02, 0.5], [0.1, 0.16, 0.5], [0.06, 0.3, 0.48], [-0.04, 0.36, 0.44]], 6e-3, { seg: 5, col: dk });
    P3.add("plastic", softBox(0.05, 0.05, 0.08, 0.02, 2), [0.08, 0.08, 0.08], { p: [-0.07, 0.37, 0.43], r: [0, 0.4, -0.3] });
    P3.cyl("plastic", 0.06, 0.016, 0.1, 8e-3, 0.5, { seg: 12, col: [0.08, 0.08, 0.08] });
    P3.box("plastic", 0.05, 0.36, 0.52, 0.16, 0.25, 1.1, { col: [0.1, 0.1, 0.11], b: 8e-3 });
    P3.box("black", 4e-3, 0.31, 0.47, 0.132, 0.25, 1.1, { b: 0 });
    P3.box("plastic", 0.16, 0.014, 0.24, 0.16, 7e-3, 1.1, { col: [0.1, 0.1, 0.11], b: 4e-3 });
    P3.box("plastic", 0.03, 0.08, 0.05, 0.17, 0.05, 1.1, { col: [0.1, 0.1, 0.11] });
    for (let i = 0; i < 5; i++) P3.box("plastic", 0.21, 4e-3, 0.297, -0.02 - i * 0.012, 4e-3 + i * 4e-3, 1.9 + i * 0.03, { col: [0.86, 0.85, 0.8], b: 0, r: [0, i * 0.37 % 0.6 - 0.3, 0] });
    P3.cyl("plastic", 0.04, 0.09, -0.08, 0.045, -0.55, { seg: 10, r2: 0.03, col: [0.85, 0.85, 0.82] });
    P3.cyl("plastic", 0.04, 0.09, 0.02, 0.04, 1.6, { seg: 10, r2: 0.03, col: [0.7, 0.2, 0.15], r: [H, 0.6, 0] });
    P3.tube("rubber", [[0.18, 0.01, -0.3], [0.2, 0.01, -0.5], [0.24, -0.3, -0.56], [0.2, -0.76, -0.5], [0, -0.77, -0.2], [-0.4, -0.77, 0.3]], 6e-3, { seg: 5, col: [0.1, 0.1, 0.1] });
    P3.pop();
  }
  P3.box("paint", D - 0.12, 0.02, L - 0.12, 0, Hh - 0.03, 0, { col: wh, b: 2e-3 });
  P3.push({ p: [-0.1, Hh - 0.1, 2.6], r: [0.1, 0, 0] });
  P3.box("paint", 0.2, 0.05, 1.3, 0, 0, 0, { col: wh, b: 8e-3 });
  for (const s of [-1, 1]) {
    P3.cyl("lampTubeF", 0.014, 1.2, s * 0.05, -0.04, 0, { axis: "z", seg: 8, cham: 0 });
  }
  P3.pop();
  P3.glow("fill", [-0.1, Hh - 0.3, 2.6], { col: [0.72, 0.9, 1], power: 7, dist: 9, tube: 1 });
  P3.box("paint", 0.2, 0.05, 1.3, -0.1, Hh - 0.07, -2.6, { col: wh, b: 8e-3 });
  for (const s of [-1, 1]) P3.cyl("glass", 0.014, 1.2, -0.1 + s * 0.05, Hh - 0.11, -2.6, { axis: "z", seg: 8, cham: 0 });
  P3.col([-hd, 0, -hl], [-hd + 0.08, Hh, hl], { surface: "metal" });
  for (const s of [-1, 1]) {
    const a = s > 0 ? hl - 0.08 : -hl, b = s > 0 ? hl : -hl + 0.08;
    P3.col([-hd, 0, a], [hd, Hh, b], { surface: "metal" });
    const za = s > 0 ? dz : -hl, zb = s > 0 ? hl : -dz;
    P3.col([hd - 0.08, 0, za], [hd, sill, zb], { surface: "metal" });
    P3.col([hd - 0.08, sill, za], [hd, head, zb], { surface: "glass", noBullet: true });
    P3.col([hd - 0.66, 0, s > 0 ? dz + 0.25 : -hl + 0.15], [hd - 0.08, 0.78, s > 0 ? hl - 0.15 : -dz - 0.25], { surface: "wood", noNav: true });
  }
  P3.col([hd - 0.08, head, -hl], [hd, Hh, hl], { surface: "metal", noNav: true });
  P3.col([-hd - 0.1, Hh, -hl - 0.2], [hd + 0.4, Hh + 0.12, hl + 0.2], { surface: "metal", noNav: true });
  return P3.finish({ grime: 0.8, ground: 0.1 });
});
function flood(P3, lens, o = {}) {
  const body = [0.2, 0.21, 0.23];
  P3.add("paint", softBox(0.58, 0.46, 0.17, 0.035, 3), body, { p: [0, 0, -0.03] });
  for (let i = 0; i < 9; i++) P3.box("paint", 0.012, 0.4, 0.06, -0.24 + i * 0.06, 0, -0.14, { col: body, b: 2e-3 });
  frameXY(P3, "galv", -0.29, -0.23, 0.29, 0.23, 0.06, 0.03, 0.02, null, 4e-3);
  if (!o.gone) P3.box(lens, 0.52, 0.4, 0.012, 0, 0, 0.058, { b: 0 });
  else {
    P3.box("black", 0.52, 0.4, 4e-3, 0, 0, 0.03, { b: 0 });
    P3.cyl("glass", 0.05, 0.16, 0, 0, 0.03, { axis: "x", seg: 8 });
  }
  P3.box("paint", 0.6, 0.012, 0.2, 0, 0.245, 0.13, { col: body, b: 2e-3, r: [0.14, 0, 0] });
  for (const s of [-1, 1]) {
    P3.box("galv", 0.014, 0.1, 0.3, s * 0.305, 0, -0.14, { b: 3e-3 });
    hex(P3, s * 0.316, 0, -0.03, "x", 0.018, 0.012);
  }
  P3.box("galv", 0.624, 0.06, 0.014, 0, 0, -0.29, { b: 3e-3 });
  P3.cyl("galv", 0.022, 0.12, 0, 0, -0.35, { axis: "z", seg: 8 });
  P3.box("plastic", 0.09, 0.07, 0.05, 0.16, -0.14, -0.13, { col: [0.08, 0.08, 0.08], b: 8e-3 });
  P3.tube("rubber", [[0.16, -0.17, -0.13], [0.16, -0.3, -0.2], [0.08, -0.34, -0.36]], 9e-3, { seg: 5, col: [0.1, 0.1, 0.1] });
}
var floodMast = (seed = 1, o = {}) => proto("fmast" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("floodMast", seed), A = o.atlas, Hm = o.h || 18, on = o.on || 0, tilt = o.tilt ?? 0.55, lens = on === 2 ? "lampFloodF" : on ? "lampFlood" : "glass", gv = [0.86, 0.88, 0.91], R4 = rng(seed * 13 + 1);
  P3.ext("concrete", chamRect(-0.75, -0.75, 0.75, 0.75, 0.14), 0, 0.42, { plane: "up", bevel: 0.03, col: [0.8, 0.8, 0.78] });
  P3.cyl("galv", 0.5, 0.04, 0, 0.47, 0, { seg: 16, col: gv, cham: 6e-3 });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * PI5 * 2 + 0.26, x = Math.cos(a) * 0.43, z = Math.sin(a) * 0.43;
    P3.cyl("galv", 0.015, 0.2, x, 0.5, z, { seg: 6 });
    hex(P3, x, 0.505, z, "y", 0.032, 0.026);
    hex(P3, x, 0.435, z, "y", 0.032, 0.02);
  }
  for (let i = 0; i < 8; i++) {
    P3.push({ p: [0, 0.49, 0], r: [0, -i / 8 * PI5 * 2, 0] });
    P3.ext("galv", [[0.29, 0], [0.47, 0], [0.47, 0.03], [0.31, 0.3], [0.29, 0.3]], -6e-3, 6e-3, { plane: "xy", bevel: 1e-3, col: gv });
    P3.pop();
  }
  const rAt = (y) => lerp2(0.3, 0.13, (y - 0.48) / (Hm - 0.48)), flat = 0.966;
  [[0.48, 6.4], [6.25, 12.3], [12.15, Hm - 0.02]].forEach(([a, b], i) => {
    const ra = rAt(a) + (i ? 0.01 : 0), rb = rAt(b);
    P3.lathe("galv", [[ra, a], [rb, b]], { seg: 12, crease: 20, start: PI5 / 12, col: gv });
    if (i) P3.lathe("galv", [[ra, a], [ra + 5e-3, a], [ra + 5e-3, a + 0.012], [ra, a + 0.03]], { seg: 12, crease: 20, start: PI5 / 12, col: [0.7, 0.72, 0.75] });
  });
  P3.cyl("galv", rAt(Hm) + 0.015, 0.03, 0, Hm - 0.01, 0, { seg: 12, col: gv });
  {
    const r = rAt(1.3) * flat;
    P3.box("galv", 0.14, 0.5, 0.01, 0, 1.3, -r - 3e-3, { col: [0.75, 0.77, 0.8], b: 3e-3 });
    for (const y of [1.12, 1.48]) hex(P3, 0.045, y, -r - 0.012, "z", 0.011, 0.01);
    P3.box("galv", 0.03, 0.05, 0.012, -0.05, 0.62, -rAt(0.62) * flat - 6e-3, { b: 3e-3 });
    P3.tube("rubber", [[-0.05, 0.62, -rAt(0.62) * flat - 0.012], [-0.08, 0.5, -0.42], [-0.1, 0.44, -0.6]], 8e-3, { seg: 5, col: [0.5, 0.6, 0.1] });
    if (A) P3.quad("decalF", 0.3, 0.3 / A.aspect("stDanger"), A.rect("stDanger"), { p: [0, 1.75, -rAt(1.75) * flat - 4e-3], r: [0, PI5, 0] });
  }
  for (let y = 3.3; y < Hm - 2.4; y += 0.42) {
    const s = Math.round(y / 0.42) % 2 ? 1 : -1, r = rAt(y) * flat;
    P3.bar("galv", [s * r, y, 0], [s * (r + 0.17), y, 0], 9e-3);
    P3.bar("galv", [s * (r + 0.17), y, 0], [s * (r + 0.17), y + 0.035, 0], 9e-3);
  }
  {
    const pts = [];
    for (let y = 0.5; y <= Hm - 1.6; y += 1.1) pts.push([0.09, y, -rAt(y) * flat - 0.026]);
    P3.tube("plastic", pts, 0.02, { seg: 6, samples: 0, col: [0.12, 0.12, 0.13] });
    for (let y = 1.2; y < Hm - 1.8; y += 1.65) P3.box("galv", 0.07, 0.02, 0.012, 0.09, y, -rAt(y) * flat - 0.045, { b: 3e-3 });
  }
  P3.push({ p: [0, Hm - 2, 0] });
  frameXY(P3, "galv", -1.55, 0, 1.55, 2.1, 0.32, 0.07, 0.07, gv);
  for (const y of [0.72, 1.4]) P3.box("galv", 3, 0.06, 0.06, 0, y, 0.32, { col: gv, b: 6e-3 });
  for (const x of [-0.52, 0.52]) P3.box("galv", 0.05, 2, 0.05, x, 1.05, 0.3, { col: gv, b: 6e-3 });
  for (const y of [0.3, 1.75]) {
    P3.box("galv", 0.12, 0.1, 0.5, 0, y, 0.12, { col: gv, b: 8e-3 });
    P3.box("galv", 0.3, 0.14, 0.012, 0, y, -rAt(Hm - 2 + y) * flat - 0.01, { b: 3e-3 });
    for (const s of [-1, 1]) P3.bar("galv", [s * 0.13, y, -0.14], [s * 0.13, y, 0.14], 0.01);
  }
  P3.bar("galv", [-1.5, 0.05, 0.3], [-0.1, 1, 0.02], 0.014);
  P3.bar("galv", [1.5, 0.05, 0.3], [0.1, 1, 0.02], 0.014);
  P3.bar("galv", [-1.5, 2.05, 0.3], [-0.1, 1.2, 0.02], 0.014);
  P3.bar("galv", [1.5, 2.05, 0.3], [0.1, 1.2, 0.02], 0.014);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
    const x = -1.14 + i * 0.76, y = 0.34 + row * 0.69, v = R4(), gone = !on && v > 0.7, hang = !on && v < 0.14;
    P3.push({ p: [x, y + (hang ? -0.2 : 0), 0.72], r: [tilt + (hang ? 0.7 : 0) + (row - 1) * -0.06, (i - 1.5) * 0.12, hang ? 0.3 : 0] });
    flood(P3, lens, { gone });
    P3.pop();
  }
  if (on) for (let row = 0; row < 3; row++) P3.glow("flare", [0, 0.34 + row * 0.69, 0.82], { col: [0.8, 0.93, 1], size: row === 1 ? 2.6 : 1.5, flick: on === 2 ? 1 : 0 });
  P3.box("plastic", 0.3, 0.4, 0.14, 0, 1.05, 0.2, { col: [0.5, 0.52, 0.54], b: 0.01 });
  for (let row = 0; row < 3; row++) P3.tube("rubber", catenary([0, 0.9, 0.24], [(row - 1) * 0.9, 0.3 + row * 0.69, 0.38], 0.12, 6), 0.01, { seg: 5, col: [0.1, 0.1, 0.1] });
  P3.box("steel", 1.3, 0.03, 0.6, 0, -0.3, -0.52, { col: PLATE, b: 4e-3 });
  for (const s of [-1, 1]) {
    P3.bar("galv", [s * 0.62, -0.3, -0.8], [s * 0.62, 0.8, -0.8], 0.016);
    P3.bar("galv", [s * 0.62, -0.3, -0.24], [s * 0.62, 0.8, -0.24], 0.016);
    P3.bar("galv", [s * 0.62, 0.8, -0.8], [s * 0.62, 0.8, -0.24], 0.016);
    P3.bar("galv", [s * 0.62, 0.25, -0.8], [s * 0.62, 0.25, -0.24], 0.012);
    P3.bar("galv", [s * 0.2, -0.32, -0.3], [s * 0.1, -0.7, -rAt(Hm - 2.7) * flat], 0.014);
  }
  P3.bar("galv", [-0.62, 0.8, -0.8], [0.62, 0.8, -0.8], 0.016);
  P3.bar("galv", [-0.62, 0.25, -0.8], [0.62, 0.25, -0.8], 0.012);
  P3.box("galv", 1.3, 0.1, 6e-3, 0, -0.24, -0.82, { b: 2e-3 });
  P3.pop();
  P3.bar("galv", [0, Hm, 0], [0, Hm + 1.3, 0], 0.012, { r2: 4e-3 });
  P3.cyl("galv", 0.05, 0.06, 0.1, Hm + 0.04, 0, { seg: 10 });
  P3.lathe(on ? "emRed" : "glass", [[0.04, 0], [0.045, 0.05], [0.03, 0.1], [0, 0.115]], { seg: 10, p: [0.1, Hm + 0.07, 0] });
  if (on) P3.glow("flare", [0.1, Hm + 0.14, 0], { col: [1, 0.06, 0.03], size: 0.7 });
  P3.push({ p: [0, 0, -1.35] });
  P3.box("concrete", 1.1, 0.1, 0.6, 0, 0, 0, { base: true, col: [0.8, 0.8, 0.78], b: 0.02 });
  P3.add("paint", softBox(0.9, 1.2, 0.4, 0.02, 3), [0.3, 0.36, 0.33], { p: [0, 0.7, 0] });
  P3.box("paint", 0.96, 0.04, 0.46, 0, 1.31, 0, { col: [0.25, 0.3, 0.28], b: 0.012 });
  P3.push({ p: [0.44, 0.7, -0.2], r: [0, on ? 0 : 1.9, 0] });
  P3.box("paint", 0.86, 1.12, 0.02, -0.43, 0, -0.012, { col: [0.32, 0.38, 0.35], b: 6e-3 });
  louvres(P3, "paint", -0.75, 0.2, -0.11, 0.48, -0.026, 7, [0.3, 0.36, 0.33], 0.6, 0.02);
  P3.box("steel", 0.03, 0.09, 0.02, -0.8, 0, -0.03, { col: ALD });
  if (A) P3.quad("decalF", 0.42, 0.42 / A.aspect("stDanger"), A.rect("stDanger"), { p: [-0.43, -0.1, -0.024], r: [0, PI5, 0] });
  P3.pop();
  if (!on) {
    P3.box("black", 0.84, 1.1, 0.01, 0, 0.7, -0.17, { b: 0 });
    for (let i = 0; i < 5; i++) P3.box("plastic", 0.09, 0.12, 0.08, -0.3 + i * 0.15, 0.95, -0.12, { col: [0.75, 0.75, 0.72], b: 8e-3 });
    P3.tube("rubber", [[-0.2, 0.86, -0.14], [-0.22, 0.5, -0.3], [-0.1, 0.06, -0.55], [0.3, 0.02, -0.7]], 0.012, { seg: 5, col: [0.1, 0.1, 0.1] });
  }
  P3.tube("plastic", [[0.3, 0.12, 0.2], [0.3, 0.12, 0.45], [0.2, 0.3, 0.62]], 0.03, { seg: 6, col: [0.12, 0.12, 0.13] });
  P3.pop();
  P3.col([-0.75, 0, -0.75], [0.75, 0.45, 0.75], { surface: "concrete" });
  P3.col([-0.3, 0.45, -0.3], [0.3, Hm, 0.3], { surface: "metal" });
  P3.col([-0.47, 0, -1.56], [0.47, 1.33, -1.14], { surface: "metal" });
  P3.col([-1.6, Hm - 2.1, -0.9], [1.6, Hm + 0.2, 1], { surface: "metal", noNav: true });
  return P3.finish({ grime: 0.9 });
});

