var PVC = [0.56, 0.58, 0.57];
var PVCD = [0.36, 0.37, 0.35];
var MUDC = [0.2, 0.17, 0.12];
var ALU3 = [0.8, 0.82, 0.84];
var DK = [0.1, 0.1, 0.105];
var OLV = [0.25, 0.28, 0.18];
var BLANK2 = [0.36, 0.38, 0.4];
var SHEET = [0.74, 0.75, 0.72];
var BLOOD = [0.2, 0.02, 0.02];
var ROPE = [0.8, 0.75, 0.5];
var mix2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
var lin = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
var fieldTent = (seed = 1, o = {}) => proto("ftent" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("fieldTent", seed), A = o.atlas, R4 = rng(seed * 71 + 5), w = o.w || 10, d = o.d || 6, hR = o.h || 3.1, hE = o.eave || 2.15, hw = w / 2, hd = d / 2, skin = o.col || PVC, nb2 = Math.max(2, Math.round(w / 2.5)), bay = w / nb2;
  const roofY = (z) => hE + (hR - hE) * (1 - Math.abs(z) / hd), slope = Math.atan2(hR - hE, hd);
  for (let i = 0; i <= nb2; i++) {
    const x = -hw + i * bay;
    for (const s of [-1, 1]) {
      P3.bar("galv", [x, 0, s * hd], [x, hE, s * hd], 0.03, { col: ALU3 });
      P3.box("galv", 0.22, 0.012, 0.22, x, 6e-3, s * hd, { col: ALU3, b: 2e-3 });
      P3.bar("steel", [x + 0.07, 0.1, s * (hd + 0.05)], [x + 0.07, -0.02, s * (hd + 0.07)], 8e-3, { col: DK });
      P3.bar("galv", [x, hE, s * hd], [x, hR, 0], 0.028, { col: ALU3 });
      P3.box("galv", 0.09, 0.14, 0.09, x, hE, s * hd, { col: [0.3, 0.3, 0.32], b: 0.01 });
    }
    P3.box("galv", 0.1, 0.1, 0.14, x, hR, 0, { col: [0.3, 0.3, 0.32], b: 0.01 });
    if (i === 0 || i === nb2) P3.bar("galv", [x, hE + 0.02, -hd], [x, hE + 0.02, hd], 0.022, { col: ALU3 });
    else P3.bar("galv", [x, hE + (hR - hE) * 0.55, -hd * 0.45], [x, hE + (hR - hE) * 0.55, hd * 0.45], 0.016, { col: ALU3 });
  }
  P3.bar("galv", [-hw, hR, 0], [hw, hR, 0], 0.03, { col: ALU3 });
  for (const s of [-1, 1]) {
    P3.bar("galv", [-hw, hE, s * hd], [hw, hE, s * hd], 0.026, { col: ALU3 });
    P3.bar("galv", [-hw, hE + (hR - hE) * 0.5, s * hd * 0.5], [hw, hE + (hR - hE) * 0.5, s * hd * 0.5], 0.018, { col: ALU3 });
    for (const e of [-1, 1]) {
      P3.bar("steel", [e * hw, hE - 0.05, s * hd], [e * (hw - bay), 0.5, s * hd], 6e-3, { col: [0.5, 0.5, 0.5] });
    }
  }
  {
    const U = lin(-hw - 0.06, hw + 0.06, nb2 * 8), V = lin(-1, 1, 20);
    const g2 = gridSurf(U, V, (x, t, q) => {
      const z = t * (hd + 0.02), k = Math.abs((x + hw) / bay % 1 - 0.5) * 2, sag = 0.05 * (1 - k * k) * Math.sin(Math.min(1, 1 - Math.abs(t)) * PI5) + 0.012 * Math.sin(x * 7.1 + t * 5);
      q.set(x, roofY(z) + 0.035 - sag, z);
      const n = fbm(x * 0.8, z * 0.8 + seed, 3);
      return mix2(skin, PVCD, clamp2(0.25 * n + 0.5 * Math.pow(Math.abs(t), 6), 0, 1));
    });
    g2.computeVertexNormals();
    P3.add("pvc", g2, null);
    for (const s of [-1, 1]) {
      const vg = gridSurf(U, [0, 0.5, 1], (x, t, q) => {
        const sc2 = 0.03 * Math.abs(Math.sin((x + hw) / bay * PI5 * 4));
        q.set(x, hE + 0.035 - t * (0.24 - sc2), s * (hd + 0.025 + 0.012 * t + 8e-3 * Math.sin(x * 9)));
        return mix2(skin, PVCD, 0.3 + 0.3 * t);
      }, { flipWinding: s < 0 });
      vg.computeVertexNormals();
      P3.add("pvc", vg, null);
    }
    const bx3 = -hw + bay * (0.5 + Math.floor(R4() * nb2)), bg = softBox(bay * 0.7, 0.1, hd * 0.5, 0.05, 5);
    deform(bg, (q) => {
      q.y -= 0.06 * Math.cos(q.x / (bay * 0.35) * H) * Math.cos(q.z / (hd * 0.25) * H);
    }, true);
    P3.add("pvc", bg, mix2(skin, PVCD, 0.5), { p: [bx3, roofY(hd * 0.55) - 0.06, hd * 0.55], r: [slope, 0, 0] });
  }
  if (A && o.cross !== false) {
    P3.quad("signF", 1.6, 1.6, A.rect("greenCross"), { p: [bay * 0.5 - hw + bay * 0.5, roofY(hd * 0.5) + 0.05, hd * 0.5], r: [-H + slope, 0, 0] });
    P3.quad("signF", 1.6, 1.6, A.rect("greenCross"), { p: [hw - bay, roofY(hd * 0.5) + 0.05, -hd * 0.5], r: [-H - slope, 0, PI5] });
  }
  const WALL = { s: { o: [-hw, 0, hd], ux: [1, 0, 0], nz: [0, 0, 1], len: w }, n: { o: [hw, 0, -hd], ux: [-1, 0, 0], nz: [0, 0, -1], len: w }, e: { o: [hw, 0, hd], ux: [0, 0, -1], nz: [1, 0, 0], len: d }, w: { o: [-hw, 0, -hd], ux: [0, 0, 1], nz: [-1, 0, 0], len: d } };
  const at = (W, u, y, off) => [W.o[0] + W.ux[0] * u + W.nz[0] * off, y, W.o[2] + W.ux[2] * u + W.nz[2] * off];
  const gable = (W) => W.len === d && (W === WALL.e || W === WALL.w), topAt = (W, u) => gable(W) ? hE + (hR - hE) * (1 - Math.abs(u - d / 2) / hd) : hE;
  const sheet2 = (W, u0, u1, y0f, y1f, fn, nu = 12, nv = 8, flip2 = false) => {
    const g2 = gridSurf(lin(u0, u1, nu), lin(0, 1, nv), (u, t, q) => {
      const y0 = y0f(u), y1 = y1f(u), y = y0 + (y1 - y0) * t, r = fn(u, t, y);
      const p = at(W, u + (r.du || 0), y + (r.dy || 0), r.off);
      q.set(p[0], p[1], p[2]);
      return r.c;
    }, { flipWinding: flip2 });
    g2.computeVertexNormals();
    P3.add("pvc", g2, null);
  };
  const wallCol = (y, n) => mix2(mix2(skin, PVCD, 0.2 + 0.3 * n), MUDC, clamp2(1 - y / 0.55, 0, 1) * 0.75);
  for (const [nm, W] of Object.entries(WALL)) {
    const segs = o.sides && o.sides[nm] || [[0, W.len, "c"]], g2 = gable(W);
    if (g2) {
      sheet2(W, 0, W.len, () => hE - 0.02, (u) => topAt(W, u) + 0.03, (u, t, y) => ({ off: 0.03 + 0.012 * Math.sin(u * 6 + t * 4), c: mix2(skin, PVCD, 0.25 + 0.2 * fbm(u, y + seed, 2)) }), 12, 3);
      const p = at(W, W.len / 2, hE + (hR - hE) * 0.55, 0.05);
      P3.quad("meshNet", 0.5, 0.24, null, { p, r: [0, Math.atan2(W.nz[0], W.nz[2]), 0] });
    }
    for (const [u0, u1, st] of segs) {
      const um = (u0 + u1) / 2, ry = Math.atan2(W.nz[0], W.nz[2]), top = () => hE - 0.01;
      if (st === "c" || st === "w") {
        sheet2(W, u0, u1, () => 0.02, top, (u, t, y) => ({ off: 0.02 + 0.03 * Math.sin(u * 5.2 + seed) * Math.sin(t * PI5) + 0.012 * Math.sin(u * 17 + t * 6) + 0.05 * Math.pow(1 - t, 4), c: wallCol(y, fbm(u * 0.9, y * 0.9 + seed * 3, 3)) }), Math.max(6, Math.round((u1 - u0) * 5)), 8);
        if (st === "w") {
          const p = at(W, um, 1.35, 0.06);
          P3.quad("glassT", Math.min(1.1, u1 - u0 - 0.5), 0.6, null, { p, r: [0, ry, 0] });
          const fw = Math.min(1.1, u1 - u0 - 0.5) / 2;
          P3.tube("pvc", [at(W, um - fw, 1.05, 0.065), at(W, um + fw, 1.05, 0.065), at(W, um + fw, 1.65, 0.065), at(W, um - fw, 1.65, 0.065)], 0.012, { seg: 4, samples: 0, closed: true, col: PVCD });
          P3.bar("pvc", at(W, um, 1.05, 0.065), at(W, um, 1.65, 0.065), 8e-3, { col: PVCD });
        }
        const a = at(W, u0, 0, -0.04), b = at(W, u1, 1.9, 0.08);
        P3.col([Math.min(a[0], b[0]), 0, Math.min(a[2], b[2])], [Math.max(a[0], b[0]), hE, Math.max(a[2], b[2])], { surface: "cloth" });
      } else if (st === "o") {
        const pts = lin(u0 + 0.05, u1 - 0.05, 8).map((u, i) => at(W, u, hE - 0.14 - 0.02 * Math.sin(i * 1.9 + seed), 0.05));
        P3.add("pvc", tube(pts, 0.1, 9, { samples: 0 }), mix2(skin, PVCD, 0.3));
        for (const k of [0.2, 0.5, 0.8]) {
          const u = lerp2(u0, u1, k), c = at(W, u, hE - 0.14, 0.05);
          P3.add("burlap", ring(0.108, 8e-3, { seg: 10, radial: 4 }), ROPE, { p: c, r: [0, ry + H, 0] });
          P3.bar("burlap", at(W, u, hE - 0.24, 0.07), at(W, u + 0.03, hE - 0.5, 0.08), 5e-3, { col: ROPE });
        }
      } else if (st === "d") {
        for (const sd of [-1, 1]) {
          const ue = sd < 0 ? u0 : u1, half = (u1 - u0) / 2;
          sheet2(W, 0, 1, () => 0, () => 1, (a, t) => {
            const y = 0.04 + (topAt(W, um) - 0.05) * t, gather = 1 - 0.82 * Math.sin(Math.min(1, t * 1.25) * PI5) ** 0.7 * (t < 0.8 ? 1 : (1 - t) / 0.2), u = ue - sd * a * half * clamp2(gather + 0.18 * (1 - t), 0.14, 1);
            return { du: u - a, dy: y - t, off: 0.03 + 0.05 * Math.sin(a * 11) * (1 - gather + 0.2), c: wallCol(y, 0.5) };
          }, 7, 8, sd > 0);
          P3.add("burlap", ring(0.07, 0.01, { seg: 8, radial: 4 }), ROPE, { p: at(W, ue - sd * 0.16, 1.02, 0.04), r: [H, 0, 0] });
        }
      }
      if (st === "d" || st === "o") P3.bar("galv", at(W, u0, hE - 0.3, 0), at(W, u1, hE - 0.3, 0), 0.012, { col: ALU3 });
    }
    if (g2) {
      for (const [u0, u1, st] of segs) if (st === "d" || st === "o") {
        for (const u of [u0, u1]) if (u > 0.1 && u < W.len - 0.1) {
          P3.bar("galv", at(W, u, 0, 0), at(W, u, topAt(W, u), 0), 0.026, { col: ALU3 });
          const b = at(W, u, 6e-3, 0);
          P3.box("galv", 0.2, 0.012, 0.2, b[0], b[1], b[2], { col: ALU3, b: 2e-3 });
        }
      }
    }
  }
  for (let i = 0; i <= nb2; i++) {
    const x = -hw + i * bay;
    for (const s of [-1, 1]) {
      if (o.noGuy && o.noGuy.includes(s > 0 ? "s" : "n")) continue;
      const a = [x, hE, s * hd], b = [x + (i === 0 ? -0.5 : i === nb2 ? 0.5 : 0), 0.05, s * (hd + 1.15)];
      P3.tube("burlap", catenary(a, b, 0.05, 5), 6e-3, { seg: 4, col: ROPE });
      P3.bar("steel", [b[0], 0.2, b[2] + s * 0.07], [b[0], -0.05, b[2] - s * 0.03], 9e-3, { col: DK });
      P3.box("plastic", 0.012, 0.16, 0.04, lerp2(a[0], b[0], 0.45), lerp2(a[1], b[1], 0.45), lerp2(a[2], b[2], 0.45), { col: i % 2 ? [0.9, 0.45, 0.05] : [0.9, 0.9, 0.9], b: 2e-3, r: [s * 0.9, 0, 0] });
      if ((i + (s > 0 ? 1 : 0)) % 2 === 0) {
        const sb = softBox(0.5, 0.16, 0.28, 0.07, 4);
        deform(sb, (q) => {
          q.y -= 0.03 * Math.abs(q.x) * Math.abs(q.x) * 4;
        }, true);
        P3.add("burlap", sb, [0.45, 0.41, 0.3], { p: [x + 0.1, 0.09, s * (hd + 0.02)], r: [0, 0.3 * s, 0] });
      }
    }
  }
  {
    const tx = Math.floor((w - 0.4) / 0.6), tz = Math.floor((d - 0.4) / 0.6), ox = -(tx * 0.6) / 2, oz = -(tz * 0.6) / 2;
    P3.box("plastic", tx * 0.6, 0.03, tz * 0.6, 0, 0.018, 0, { col: [0.3, 0.31, 0.32], b: 4e-3, jit: 0.1, cell: 2 });
    for (let i = 1; i < tx; i++) P3.box("black", 0.012, 4e-3, tz * 0.6, ox + i * 0.6, 0.034, 0, { b: 0 });
    for (let j = 1; j < tz; j++) P3.box("black", tx * 0.6, 4e-3, 0.012, 0, 0.034, oz + j * 0.6, { b: 0 });
    for (let k = 0; k < 4; k++) {
      const ex = R4() < 0.5, sx = R4() < 0.5 ? -1 : 1;
      P3.box("plastic", 0.6, 0.03, 0.6, ex ? sx * (tx * 0.3 + 0.32) : ox + 0.3 + Math.floor(R4() * tx) * 0.6, 0.03, ex ? oz + 0.3 + Math.floor(R4() * tz) * 0.6 : sx * (tz * 0.3 + 0.32), { col: [0.3, 0.31, 0.32], b: 4e-3, r: [R4() * 0.1, R4() * 0.4, R4() * 0.08] });
    }
  }
  const lamps = o.lamps || [];
  let px2 = -hw;
  for (const [x, z, st] of lamps) {
    const y = roofY(z) - 0.5;
    P3.tube("rubber", catenary([px2, roofY(z) - 0.06, z], [x, roofY(z) - 0.06, z], 0.07, 6), 7e-3, { seg: 4, col: DK });
    px2 = x;
    for (const e of [-0.45, 0.45]) P3.bar("steel", [x + e, y + 0.05, z], [x + e * 0.6, roofY(z) - 0.05, z], 3e-3, { col: [0.5, 0.5, 0.5] });
    P3.box("plastic", 1.2, 0.05, 0.1, x, y + 0.03, z, { col: [0.85, 0.85, 0.82], b: 0.012 });
    P3.cyl(st === 2 ? "lampTubeF" : st ? "lampTube" : "glass", 0.018, 1.1, x, y - 0.01, z, { axis: "x", seg: 8 });
    for (const e of [-0.57, 0.57]) P3.box("plastic", 0.04, 0.05, 0.05, x + e, y - 5e-3, z, { col: DK, b: 6e-3 });
    if (st) {
      P3.glow("fill", [x, y - 0.7, z], { col: [0.8, 0.93, 1], power: st === 2 ? 2 : 2.4, dist: 10, dir: [0, -1, 0], cone: 1.05, tube: st === 2 ? 1 : 0 });
      P3.glow("flare", [x, y - 0.03, z], { col: [0.82, 0.93, 1], size: 0.9, flick: st === 2 });
    }
  }
  P3.box("plastic", 0.2, 0.26, 0.1, -hw + 0.08, 1.4, -hd + 0.1, { col: [0.5, 0.5, 0.5], b: 0.012 });
  P3.tube("rubber", [[-hw + 0.08, 1.27, -hd + 0.1], [-hw + 0.1, 0.3, -hd + 0.1], [-hw - 0.3, 0.02, -hd - 0.2], [-hw - 1.2, 0.02, -hd - 0.5]], 0.012, { seg: 5, col: [0.8, 0.45, 0.05] });
  P3.tube("rubber", [[-hw + 0.08, 1.53, -hd + 0.1], [-hw + 0.06, hR - 0.2, -hd * 0.3], [-hw, hR - 0.07, 0]], 7e-3, { seg: 4, col: DK });
  if (A && o.sign) {
    const W = WALL[o.sign.side], u = o.sign.u ?? W.len / 2, sw = o.sign.w || 1.6, sh = sw / A.aspect(o.sign.name), y = hE - 0.3 - sh / 2 - 0.06, ry = Math.atan2(W.nz[0], W.nz[2]);
    P3.quad("signF", sw, sh, A.rect(o.sign.name), { p: at(W, u, y, 0.03), r: [0, ry, 0] });
    P3.quad("signF", sw, sh, A.rect(o.sign.name), { p: at(W, u, y, 0.01), r: [0, ry + PI5, 0] });
    for (const e of [-0.4, 0.4]) P3.bar("steel", at(W, u + e * sw, y + sh / 2, 0.02), at(W, u + e * sw, hE - 0.3, 0.02), 4e-3, { col: [0.5, 0.5, 0.5] });
  }
  for (let i = 0; i <= nb2; i++) for (const s of [-1, 1]) P3.col([-hw + i * bay - 0.05, 0, s * hd - 0.05], [-hw + i * bay + 0.05, hE, s * hd + 0.05], { surface: "metal", noNav: true });
  for (const s of [-1, 1]) {
    P3.push({ p: [0, (hE + hR) / 2, s * hd * 0.5], r: [s * slope, 0, 0] });
    P3.col([-hw, -0.04, -hd * 0.56], [hw, 0.04, hd * 0.56], { surface: "cloth", bulletOnly: true });
    P3.pop();
  }
  return P3.finish({ grime: 0.7, ground: 0.5 });
});
var cot = (seed = 1, o = {}) => proto("fcot" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("cot", seed), R4 = rng(seed * 37 + 11), st = o.state || "used", L = 1.92, Wd = 0.68, Hh = 0.42, tip = st === "tipped";
  if (tip) P3.push({ p: [0, 0.34, 0.1], r: [1.35, 0, 0.05] });
  for (const s of [-1, 1]) {
    P3.bar("galv", [-L / 2, Hh, s * Wd / 2], [L / 2, Hh, s * Wd / 2], 0.014, { col: ALU3 });
    for (const e of [-1, 1]) P3.cyl("plastic", 0.018, 0.03, e * L / 2, Hh, s * Wd / 2, { axis: "x", seg: 6, col: DK });
  }
  for (const x of [-0.72, 0, 0.72]) {
    P3.bar("galv", [x, Hh, -Wd / 2], [x, 0.012, Wd / 2 - 0.06], 0.011, { col: ALU3 });
    P3.bar("galv", [x, Hh, Wd / 2], [x, 0.012, -Wd / 2 + 0.06], 0.011, { col: ALU3 });
    P3.cyl("steel", 0.014, 0.03, x, Hh / 2, 0, { axis: "x", seg: 6, col: DK });
    for (const s of [-1, 1]) P3.bar("galv", [x - 0.06, 0.012, s * (Wd / 2 - 0.06)], [x + 0.06, 0.012, s * (Wd / 2 - 0.06)], 0.011, { col: ALU3 });
  }
  for (const e of [-1, 1]) P3.bar("galv", [e * L / 2 * 0.98, Hh, -Wd / 2], [e * L / 2 * 0.98, Hh, Wd / 2], 0.012, { col: ALU3 });
  {
    const g2 = gridSurf(lin(-L / 2 + 0.03, L / 2 - 0.03, 12), lin(-1, 1, 6), (x, t, q) => {
      q.set(x, Hh + 0.012 - 0.045 * (1 - t * t) * (1 - Math.pow(Math.abs(x) / (L / 2), 4)), t * (Wd / 2 - 5e-3));
      return st === "blood" && Math.hypot(x - 0.2, t * 0.3) < 0.36 ? mix2(OLV, BLOOD, 0.85) : OLV;
    });
    g2.computeVertexNormals();
    P3.add("canvas", g2, null);
  }
  if (st !== "bare" && !tip) {
    const body = st === "body", cov = st === "made" ? [-0.52, L / 2 - 0.06] : [-0.3 - R4() * 0.3, L / 2 - 0.1 - R4() * 0.3], colB = body ? SHEET : st === "blood" ? mix2(BLANK2, BLOOD, 0.3) : R4() < 0.5 ? BLANK2 : [0.45, 0.2, 0.16];
    const g2 = gridSurf(lin(cov[0], cov[1], 18), lin(-1, 1, 12), (x, t, q) => {
      const u = (x - cov[0]) / (cov[1] - cov[0]);
      let y = Hh + 0.03 + 0.012 * Math.sin(x * 14 + t * 5 + seed) + 0.02 * fbm(x * 3 + seed, t * 2, 2), z = t * (Wd / 2 + 0.03);
      if (body) {
        const xb = x + 0.75, hump = (c, r, h) => h * Math.exp(-((xb - c) * (xb - c)) / (r * r)) * Math.exp(-(t * t) / 0.45);
        y += hump(0, 0.12, 0.2) + hump(0.45, 0.3, 0.22) + hump(0.95, 0.3, 0.14) + hump(1.5, 0.12, 0.2);
      } else if (st === "used") {
        y += 0.06 * Math.exp(-((u - 0.3) * (u - 0.3)) / 0.02) * (0.5 + 0.5 * Math.sin(t * 4 + seed));
        z += 0.06 * Math.sin(u * 5 + seed);
      }
      if (Math.abs(t) > 0.82) {
        const k = (Math.abs(t) - 0.82) / 0.18, drop = (body && t > 0 ? 0.36 : 0.1 + 0.08 * Math.sin(x * 3 + seed)) * k;
        y -= drop + 0.03 * k;
        z += Math.sign(t) * 0.02 * k;
      }
      q.set(x, Math.max(0.01, y), z);
      return body && Math.hypot(x - 0.1, t * 0.34 + 0.05) < 0.2 ? mix2(colB, BLOOD, 0.8) : mix2(colB, [0.1, 0.1, 0.1], 0.2 * fbm(x * 2, t * 2 + seed, 2));
    });
    g2.computeVertexNormals();
    P3.add("canvas", g2, null);
    if (!body) {
      const pl = softBox(0.42, 0.11, 0.3, 0.05, 4);
      deform(pl, (q) => {
        q.y -= 0.03 * Math.exp(-(q.x * q.x + q.z * q.z) * 30);
      }, true);
      P3.add("canvas", pl, [0.75, 0.76, 0.72], { p: [-L / 2 + 0.3, Hh + 0.07, (R4() - 0.5) * 0.1], r: [0, (R4() - 0.5) * 0.5, 0] });
    } else if (o.atlas) P3.quad("signF", 0.12, 0.06, o.atlas.rect("tagToe"), { p: [0.82, Hh + 0.1, 0.36], r: [0, 0.4, 0.3] });
  }
  if (tip) P3.pop();
  if (!tip && st !== "bare") {
    if (R4() < 0.7) P3.add("canvas", softBox(0.5, 0.24, 0.28, 0.08, 4), [[0.12, 0.2, 0.36], [0.4, 0.1, 0.1], [0.14, 0.14, 0.15]][Math.floor(R4() * 3)], { p: [-0.35 + R4() * 0.5, 0.13, (R4() - 0.5) * 0.2], r: [0, R4(), 0] });
    if (R4() < 0.6) for (const k of [0, 1]) P3.add("rubber", softBox(0.26, 0.09, 0.1, 0.035, 3), [0.5, 0.48, 0.44], { p: [0.55 + k * 0.05, 0.05, 0.15 - k * 0.14], r: [0, 0.3 + k * 0.5, 0] });
    if (R4() < 0.6) P3.cyl("glassT", 0.035, 0.22, 0.3, 0.11, -0.2, { seg: 8 });
  }
  if (tip) P3.col([-L / 2, 0, -0.1], [L / 2, 0.7, 0.3], { surface: "cloth", noNav: true });
  else P3.col([-L / 2, 0, -Wd / 2], [L / 2, st === "body" ? 0.75 : 0.5, Wd / 2], { surface: "cloth" });
  return P3.finish({ grime: 0.5, ground: 0.3 });
});
var dripStand = (seed = 1, o = {}) => proto("fdrip" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("dripStand", seed), R4 = rng(seed * 13 + 1), A = o.atlas, bags = o.bags ?? 1 + seed % 2;
  if (o.fallen) P3.push({ p: [0, 0.3, 0], r: [0, 0, H - 0.02] });
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * PI5 * 2 + seed;
    P3.beam("plastic", [0, 0.1, 0], [Math.cos(a) * 0.28, 0.07, Math.sin(a) * 0.28], 0.035, 0.03, { col: [0.75, 0.76, 0.76] });
    P3.cyl("rubber", 0.03, 0.025, Math.cos(a) * 0.28, 0.03, Math.sin(a) * 0.28, { axis: "z", seg: 8, col: DK, r: [0, -a, 0] });
  }
  P3.cyl("plastic", 0.045, 0.08, 0, 0.12, 0, { seg: 10, col: [0.75, 0.76, 0.76] });
  P3.bar("chrome", [0, 0.14, 0], [0, 1.15, 0], 0.014);
  P3.bar("chrome", [0, 1.1, 0], [0, 1.95, 0], 9e-3);
  P3.cyl("plastic", 0.022, 0.06, 0, 1.14, 0, { seg: 8, col: DK });
  P3.cyl("plastic", 0.012, 0.03, 0.03, 1.14, 0, { axis: "x", seg: 6, col: DK });
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * PI5 * 2 + 0.4;
    P3.tube("chrome", [[0, 1.94, 0], [Math.cos(a) * 0.09, 1.97, Math.sin(a) * 0.09], [Math.cos(a) * 0.12, 1.93, Math.sin(a) * 0.12]], 4e-3, { seg: 4, samples: 6 });
  }
  for (let k = 0; k < bags; k++) {
    const a = k / 4 * PI5 * 2 + 0.4, x = Math.cos(a) * 0.12, z = Math.sin(a) * 0.12, full = 0.3 + R4() * 0.6, bag = softBox(0.11, 0.2, 0.035, 0.016, 4);
    deform(bag, (q) => {
      q.z *= 0.4 + 0.9 * clamp2(0.5 - q.y / 0.2, 0, 1) * full;
    }, true);
    P3.add("glassT", bag, [0.85, 0.9, 0.9], { p: [x, 1.8, z], r: [0, -a + H, 0] });
    if (A) P3.quad("signF", 0.08, 0.04, A.rect("drugLabel"), { p: [x + Math.cos(a) * 0.022, 1.82, z + Math.sin(a) * 0.022], r: [0, -a + H, 0] });
    P3.cyl("glassT", 9e-3, 0.05, x, 1.66, z, { seg: 6 });
    P3.tube("glassT", [[x, 1.63, z], [x + 0.02, 1.2, z + 0.03], [x + 0.14, 0.75, z + 0.1], [x + 0.3 + R4() * 0.2, o.fallen ? 1.4 : 0.5 + R4() * 0.2, z + 0.25]], 3e-3, { seg: 4, samples: 12 });
    P3.box("plastic", 0.012, 0.03, 0.02, x + 0.02, 1.25, z + 0.03, { col: [0.2, 0.4, 0.8], b: 3e-3 });
  }
  if (o.fallen) P3.pop();
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.4, ground: 0.2 });
});
function bagGeo2(P3, R4, x0, y0, col, open) {
  const U = lin(0, 1.95, 22), V = lin(0, 1, 12), prof = (u) => 0.1 + 0.16 * Math.exp(-((u - 0.55) ** 2) / 0.12) + 0.11 * Math.exp(-((u - 1.6) ** 2) / 0.02) + 0.05 * Math.exp(-((u - 0.06) ** 2) / 6e-3) + 0.04 * Math.exp(-((u - 1.1) ** 2) / 0.1), wid = (u) => 0.2 + 0.14 * Math.exp(-((u - 0.75) ** 2) / 0.25) - 0.06 * Math.exp(-((u - 1.9) ** 2) / 0.02);
  const g2 = gridSurf(U, V, (u, t, q) => {
    const a = t * PI5, end = Math.min(1, Math.min(u, 1.95 - u) / 0.1), hh = prof(u) * Math.sqrt(end), ww = wid(u) * (0.4 + 0.6 * Math.sqrt(end)), wr = 0.012 * Math.sin(u * 23 + t * 7) + 0.01 * Math.sin(u * 9 - t * 13);
    q.set(x0 + u - 0.975, y0 + 0.01 + (hh + wr) * Math.pow(Math.sin(a), 0.75), -Math.cos(a) * ww);
    return mix2(col, [0.02, 0.02, 0.02], 0.25 * fbm(u * 3, t * 3, 2));
  });
  g2.computeVertexNormals();
  P3.add("pvc", g2, null);
  const zip = U.filter((u) => u > 0.12 && u < (open ? 1.2 : 1.85)).map((u) => [x0 + u - 0.975, y0 + 0.016 + prof(u) + 0.012 * Math.sin(u * 23 + 3.5), 0]);
  P3.add("steel", tube(zip, 6e-3, 4, { samples: 0 }), [0.5, 0.5, 0.5]);
  for (const u of [0.3, 0.95, 1.6]) for (const s of [-1, 1]) P3.add("burlap", ring(0.05, 8e-3, { seg: 8, radial: 4, a0: 0, a1: PI5 }), [0.1, 0.1, 0.1], { p: [x0 + u - 0.975, y0 + 0.06, s * (wid(u) - 0.02)], r: [s * 0.9, 0, 0] });
}
var stretcher = (seed = 1, o = {}) => proto("fstr" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("stretcher", seed), R4 = rng(seed * 19 + 7), A = o.atlas, y = o.trolley ? 0.82 : 0.16, L = 2.2;
  for (const s of [-1, 1]) {
    P3.bar("galv", [-L / 2, y, s * 0.28], [L / 2, y, s * 0.28], 0.018, { col: ALU3 });
    for (const e of [-1, 1]) {
      P3.cyl("rubber", 0.024, 0.14, e * (L / 2 - 0.07), y, s * 0.28, { axis: "x", seg: 8, col: DK });
      if (!o.trolley) P3.tube("galv", [[e * 0.8, y, s * 0.28], [e * 0.82, 0.02, s * 0.28], [e * 0.72, 0.02, s * 0.28]], 0.01, { seg: 5, samples: 0, col: ALU3 });
    }
  }
  for (const e of [-0.8, 0.8]) P3.bar("galv", [e, y - 0.02, -0.28], [e, y - 0.02, 0.28], 0.012, { col: ALU3 });
  {
    const g2 = gridSurf(lin(-0.95, 0.95, 10), lin(-1, 1, 5), (x, t, q) => {
      q.set(x, y - 0.045 * (1 - t * t), t * 0.275);
      return o.load === "blood" ? mix2([0.75, 0.38, 0.06], BLOOD, clamp2(1.2 - Math.hypot(x, t * 0.3) * 2.2, 0, 0.9)) : [0.75, 0.38, 0.06];
    });
    g2.computeVertexNormals();
    P3.add("canvas", g2, null);
  }
  if (o.trolley) {
    for (const e of [-0.7, 0.7]) {
      P3.bar("galv", [e, y - 0.04, -0.26], [e * 0.2, 0.2, 0.26], 0.016, { col: ALU3 });
      P3.bar("galv", [e, y - 0.04, 0.26], [e * 0.2, 0.2, -0.26], 0.016, { col: ALU3 });
    }
    for (const s of [-1, 1]) {
      P3.bar("galv", [-0.75, 0.2, s * 0.26], [0.75, 0.2, s * 0.26], 0.016, { col: ALU3 });
      for (const e of [-0.75, 0.75]) {
        P3.cyl("rubber", 0.07, 0.035, e, 0.07, s * 0.26, { axis: "z", seg: 12, col: DK });
        P3.box("steel", 0.03, 0.12, 0.05, e, 0.14, s * 0.26, { col: [0.5, 0.5, 0.5], b: 6e-3 });
      }
    }
    P3.box("plastic", 1.2, 0.02, 0.44, 0, 0.21, 0, { col: [0.3, 0.3, 0.3], b: 4e-3 });
  }
  if (o.load === "bag") bagGeo2(P3, R4, 0, y - 0.03, o.col || [0.07, 0.07, 0.08], false);
  if (o.load === "bag" && A) P3.quad("signF", 0.12, 0.06, A.rect("tagToe"), { p: [-0.9, y + 0.1, 0.2], r: [-0.6, 0.3, 0] });
  for (const k of [-0.45, 0.4]) {
    P3.box("burlap", 0.05, 6e-3, 0.6, k, y + (o.load === "bag" ? 0.2 : 0), 0, { col: [0.1, 0.1, 0.1], b: 1e-3 });
    P3.box("steel", 0.06, 0.02, 0.04, k, y + (o.load === "bag" ? 0.2 : 0.01), 0.2, { col: [0.5, 0.5, 0.5], b: 4e-3 });
  }
  P3.col([-L / 2 + 0.1, 0, -0.3], [L / 2 - 0.1, o.trolley ? 1.05 : 0.4, 0.3], { surface: o.trolley ? "metal" : "cloth", noNav: !o.trolley });
  return P3.finish({ grime: 0.5, ground: 0.3 });
});
var bodyBag2 = (seed = 1, o = {}) => proto("fbag" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("bodyBag", seed), R4 = rng(seed * 23 + 3), col = o.col || (seed % 3 === 0 ? [0.75, 0.75, 0.72] : [0.06, 0.06, 0.07]);
  bagGeo2(P3, R4, 0, 0, col, !!o.open);
  if (o.atlas) P3.quad("signF", 0.12, 0.06, o.atlas.rect("tagToe"), { p: [-0.92, 0.14, 0.12], r: [-0.8, 0.5, 0] });
  if (o.open) {
    const fl = gridSurf(lin(0.25, 0.85, 6), lin(0, 1, 4), (u, t, q) => {
      q.set(u, 0.16 - 0.14 * t * t, 0.05 + t * 0.42 + 0.03 * Math.sin(u * 14));
      return col;
    });
    fl.computeVertexNormals();
    P3.add("pvc", fl, null);
  }
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.6, ground: 0.5 });
});
var supplyStack = (seed = 1, o = {}) => proto("fsup" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("supplyStack", seed), R4 = rng(seed * 43 + 2), A = o.atlas, kind = o.kind || "mixed", layers = o.h || 3;
  for (const z of [-0.36, 0, 0.36]) P3.box("wood", 1.2, 0.09, 0.09, 0, 0.065, z, { col: [0.5, 0.42, 0.28], b: 6e-3 });
  for (let i = 0; i < 7; i++) P3.box("wood", 0.14, 0.02, 0.8, -0.53 + i * 0.176, 0.12, 0, { col: [0.55, 0.46, 0.3], b: 4e-3, jit: 0.1 });
  for (const x of [-0.5, 0, 0.5]) P3.box("wood", 0.14, 0.02, 0.8, x, 0.01, 0, { col: [0.5, 0.42, 0.28], b: 4e-3 });
  let top = 0.13;
  for (let l = 0; l < layers; l++) {
    const water = kind === "water" || kind === "mixed" && l === 0, bh = water ? 0.26 : 0.3, nx = water ? 3 : 2 + l % 2, nz = 2, miss = l === layers - 1 ? 0.45 : 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (R4() < miss) continue;
      const bw = 1.16 / nx, bd = 0.78 / nz, x = -0.58 + (i + 0.5) * bw + (R4() - 0.5) * 0.02, z = -0.39 + (j + 0.5) * bd + (R4() - 0.5) * 0.02, ry = (R4() - 0.5) * 0.08;
      if (water) {
        P3.push({ p: [x, top, z], r: [0, ry, 0] });
        for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) {
          const cx = (a - 1) * (bw / 3.2), cz = (b - 0.5) * (bd / 2.2);
          P3.cyl("glassT", 0.04, 0.2, cx, 0.1, cz, { seg: 8 });
          P3.cyl("plastic", 0.016, 0.03, cx, 0.215, cz, { seg: 6, col: [0.15, 0.4, 0.8] });
        }
        P3.add("glassT", softBox(bw - 0.03, bh - 0.02, bd - 0.03, 0.03, 3), [0.8, 0.86, 0.9], { p: [0, bh / 2, 0] });
        P3.pop();
      } else {
        P3.push({ p: [x, top, z], r: [0, ry, 0] });
        P3.box("wood", bw - 0.02, bh - 0.01, bd - 0.02, 0, 0, 0, { base: true, col: l % 2 ? [0.62, 0.5, 0.34] : [0.66, 0.55, 0.38], b: 6e-3, jit: 0.08 });
        P3.box("plastic", bw - 0.016, 4e-3, 0.05, 0, bh - 8e-3, 0, { col: [0.7, 0.62, 0.4], b: 0 });
        if (A) P3.quad("decalF", Math.min(0.3, bw * 0.6), Math.min(0.3, bw * 0.6) / A.aspect(l % 2 ? "stRations" : "stMed"), A.rect(l % 2 ? "stRations" : "stMed"), { p: [0, bh * 0.5, bd / 2 - 8e-3] });
        if (A && j === 0) P3.quad("decalF", Math.min(0.3, bw * 0.6), Math.min(0.3, bw * 0.6) / A.aspect("stMed"), A.rect("stMed"), { p: [0, bh * 0.5, -bd / 2 + 8e-3], r: [0, PI5, 0] });
        P3.pop();
      }
    }
    top += bh;
  }
  if (o.sheet !== false) {
    const g2 = gridSurf(lin(-0.7, 0.2, 9), lin(-1, 1, 9), (x, t, q) => {
      const z = t * 0.52, over = Math.max(0, Math.abs(z) - 0.4), ox = Math.max(0, -0.6 - x);
      q.set(x, top + 0.02 - over * 3.2 - ox * 3 + 0.015 * Math.sin(x * 12 + t * 6), z);
      return [0.16, 0.24, 0.42];
    });
    g2.computeVertexNormals();
    P3.add("pvc", g2, null);
  }
  for (const z of [-0.2, 0.22]) {
    P3.box("plastic", 1.19, 4e-3, 0.035, 0, top - 0.3, z + 0.2, { col: DK, b: 0 });
  }
  if (o.spill !== false) {
    P3.push({ p: [0.95, 0, 0.3], r: [0, 0.5, 0] });
    P3.box("wood", 0.5, 0.28, 0.36, 0, 0, 0, { base: true, col: [0.62, 0.5, 0.34], b: 6e-3, r: [0, 0, 0.12] });
    for (let k = 0; k < 7; k++) {
      const a = R4() * 6.28, rr = 0.3 + R4() * 0.4;
      if (k % 2) P3.cyl("chrome", 0.035, 0.1, Math.cos(a) * rr, 0.035, Math.sin(a) * rr, { axis: "x", seg: 8, r: [0, a, 0] });
      else P3.add("plastic", softBox(0.16, 0.035, 0.11, 0.012, 2), [0.75, 0.75, 0.7], { p: [Math.cos(a) * rr, 0.02, Math.sin(a) * rr], r: [0, a, 0] });
    }
    P3.pop();
  }
  P3.col([-0.62, 0, -0.42], [0.62, top, 0.42], { surface: "wood" });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});
var oxygenCart = (seed = 1, o = {}) => proto("foxy" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("oxygenCart", seed), R4 = rng(seed * 29 + 4);
  const bottle = (x, y, z, r) => {
    P3.push({ p: [x, y, z], r });
    P3.lathe("paint", [[1e-3, 0], [0.09, 5e-3], [0.1, 0.03], [0.1, 1.1], [0.085, 1.2], [0.04, 1.27], [0.03, 1.3]], { seg: 14, col: [0.82, 0.84, 0.84] });
    P3.lathe("paint", [[0.1005, 1.02], [0.1005, 1.1], [0.086, 1.2], [0.041, 1.27]], { seg: 14, col: [0.1, 0.4, 0.22] });
    P3.cyl("chrome", 0.03, 0.08, 0, 1.33, 0, { seg: 8 });
    P3.cyl("chrome", 0.014, 0.1, 0.05, 1.34, 0, { axis: "x", seg: 6 });
    P3.cyl("plastic", 0.035, 0.02, 0, 1.39, 0, { seg: 8, col: DK });
    P3.cyl("glass", 0.03, 0.02, 0.1, 1.34, 0, { axis: "x", seg: 10 });
    P3.pop();
  };
  P3.push({ r: [0, 0, -0.12] });
  for (const s of [-1, 1]) {
    P3.tube("steel", [[-0.12, 0.08, s * 0.2], [-0.12, 1.25, s * 0.2], [-0.2, 1.42, s * 0.14]], 0.014, { seg: 6, samples: 0, col: [0.1, 0.25, 0.5] });
    P3.cyl("rubber", 0.1, 0.04, -0.14, 0.1, s * 0.25, { axis: "z", seg: 14, col: DK });
  }
  P3.bar("steel", [-0.2, 1.42, -0.14], [-0.2, 1.42, 0.14], 0.014, { col: [0.1, 0.25, 0.5] });
  P3.box("steel", 0.3, 0.012, 0.44, 0.03, 0.03, 0, { col: [0.1, 0.25, 0.5], b: 3e-3 });
  for (const y of [0.45, 0.95]) P3.bar("steel", [-0.12, y, -0.2], [-0.12, y, 0.2], 0.01, { col: [0.1, 0.25, 0.5] });
  bottle(0.02, 0.04, -0.105, [0, 0.4, 0]);
  bottle(0.02, 0.04, 0.105, [0, 2.1, 0]);
  P3.tube("steel", catenary([-0.12, 0.98, -0.2], [0.12, 0.95, -0.2], 0.03, 5).concat(catenary([0.12, 0.95, 0.2], [-0.12, 0.98, 0.2], 0.03, 5)), 6e-3, { seg: 4, col: [0.5, 0.5, 0.5] });
  P3.tube("glassT", [[0.1, 1.38, -0.1], [0.3, 1.2, -0.05], [0.4, 0.5, 0.1], [0.7, 0.03, 0.2], [1, 0.02, 0.05]], 5e-3, { seg: 4, samples: 14 });
  P3.pop();
  if (o.loose) for (let k = 0; k < o.loose; k++) bottle(0.6 + k * 0.1, 0.1, -0.4 - k * 0.24, [H, 0, 0.3 + R4() * 0.6]);
  P3.col([-0.3, 0, -0.3], [0.25, 1.4, 0.3], { surface: "metal", noNav: true });
  return P3.finish({ grime: 0.4, ground: 0.3 });
});
var wardScreen = (seed = 1, o = {}) => proto("fscr" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("wardScreen", seed), R4 = rng(seed * 31 + 8), pw = 0.82, ph = 1.72, ang = o.angle ?? 0.5, cc = o.col || [0.42, 0.62, 0.6];
  if (o.down) P3.push({ p: [0, 0.05, 0], r: [-H + 0.03, 0, 0] });
  let M = { p: [-pw * 1.2, 0, 0], r: [0, ang, 0] };
  for (let k = 0; k < 3; k++) {
    P3.push(M);
    for (const x of [0, pw]) {
      P3.bar("chrome", [x, 0.07, 0], [x, ph, 0], 0.011);
      P3.cyl("rubber", 0.03, 0.022, x, 0.03, 0, { axis: "x", seg: 8, col: DK });
    }
    for (const y of [0.16, ph]) P3.bar("chrome", [0, y, 0], [pw, y, 0], 0.011);
    const torn = k === 1 && R4() < 0.5, g2 = gridSurf(lin(0.02, pw - 0.02, 10), lin(0, 1, 8), (x, t, q) => {
      const y = 0.24 + (ph - 0.28) * t;
      q.set(x, torn && t < 0.4 ? y + 0.3 * (0.4 - t) : y, 0.022 * Math.sin(x * 34) * (0.3 + 0.7 * (1 - t)));
      const b = o.blood && k === 1 ? clamp2(1.3 - Math.hypot(x - 0.4, (y - 1) * 0.8) * 3, 0, 1) : 0;
      return mix2(cc, BLOOD, b * 0.9);
    });
    g2.computeVertexNormals();
    P3.add("canvas", g2, null);
    for (let r = 0; r < 6; r++) P3.add("chrome", ring(0.014, 2e-3, { seg: 6, radial: 3 }), null, { p: [0.08 + r * 0.132, ph - 0.012, 0], r: [0, H, 0] });
    P3.pop();
    const c = Math.cos(M.r[1]), s = Math.sin(M.r[1]);
    M = { p: [M.p[0] + c * pw, 0, M.p[2] - s * pw], r: [0, k === 0 ? -ang : ang, 0] };
  }
  if (o.down) {
    P3.pop();
    P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  } else P3.col([-pw * 1.25, 0, -0.3], [pw * 1.25, ph, 0.3], { surface: "cloth", noNav: true });
  return P3.finish({ grime: 0.4, ground: 0.2 });
});
var triageDesk = (seed = 1, o = {}) => proto("fdesk" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("triageDesk", seed), R4 = rng(seed * 47 + 6), A = o.atlas, L = 1.83, D = 0.76, T3 = 0.74, meds = o.kind === "meds";
  P3.add("plastic", softBox(L, 0.045, D, 0.015, 3), [0.78, 0.78, 0.74], { p: [0, T3 - 0.022, 0] });
  P3.box("steel", L - 0.2, 0.03, D - 0.2, 0, T3 - 0.06, 0, { col: [0.3, 0.3, 0.32], b: 4e-3 });
  for (const e of [-1, 1]) {
    P3.tube("steel", [[e * 0.72, T3 - 0.06, -0.3], [e * 0.78, 0.02, -0.32], [e * 0.78, 0.02, 0.32], [e * 0.72, T3 - 0.06, 0.3]], 0.013, { seg: 6, samples: 0, col: [0.3, 0.3, 0.32] });
    P3.bar("steel", [e * 0.74, 0.4, 0], [e * 0.35, T3 - 0.07, 0], 8e-3, { col: [0.3, 0.3, 0.32] });
  }
  if (meds) {
    for (let k = 0; k < 3; k++) {
      P3.box("chrome", 0.34, 0.012, 0.24, -0.6 + k * 0.42, T3 + 8e-3, -0.1 + k % 2 * 0.12, { b: 4e-3, r: [0, (R4() - 0.5) * 0.3, 0] });
      for (let j = 0; j < 4; j++) P3.bar("chrome", [-0.7 + k * 0.42 + j * 0.06, T3 + 0.02, -0.16 + k % 2 * 0.12], [-0.68 + k * 0.42 + j * 0.06, T3 + 0.02, -0.02 + k % 2 * 0.12], 4e-3);
    }
    P3.lathe("plastic", [[1e-3, 0], [0.1, 0], [0.11, 0.2], [0.1, 0.21]], { seg: 4, col: [0.85, 0.7, 0.05], p: [0.7, T3, 0.2], r: [0, PI5 / 4, 0] });
    P3.box("plastic", 0.15, 0.03, 0.15, 0.7, T3 + 0.22, 0.2, { col: [0.7, 0.1, 0.08], b: 0.01 });
    for (let k = 0; k < 5; k++) P3.cyl("glassT", 0.02, 0.07, -0.2 + R4() * 0.8, T3 + 0.035, 0.2 + R4() * 0.1, { seg: 6, col: [0.5, 0.3, 0.1] });
    P3.add("plastic", softBox(0.3, 0.1, 0.2, 0.02, 3), [0.3, 0.5, 0.8], { p: [0.2, T3 + 0.05, -0.2], r: [0, 0.2, 0] });
    P3.box("canvas", 0.5, 0.01, 0.3, -0.3, T3 + 6e-3, 0.18, { col: mix2(SHEET, BLOOD, 0.6), b: 2e-3, r: [0, 0.2, 0] });
  } else {
    for (let k = 0; k < 3; k++) {
      const x = -0.65 + k * 0.4 + R4() * 0.1, z = (R4() - 0.5) * 0.3, ry = R4() - 0.5;
      P3.box("wood", 0.23, 6e-3, 0.32, x, T3 + 4e-3, z, { col: [0.4, 0.28, 0.16], b: 2e-3, r: [0, ry, 0] });
      P3.box("plastic", 0.21, 3e-3, 0.29, x, T3 + 9e-3, z, { col: [0.88, 0.88, 0.84], b: 0, r: [0, ry + 0.03, 0] });
      P3.box("chrome", 0.1, 0.012, 0.03, x - Math.sin(ry) * 0.14, T3 + 0.014, z - Math.cos(ry) * 0.14, { b: 3e-3, r: [0, ry, 0] });
    }
    for (let k = 0; k < 4; k++) {
      P3.box("plastic", 0.22, 0.05, 0.14, 0.52, T3 + 0.025, -0.27 + k * 0.17, { col: [[0.12, 0.5, 0.25], [0.85, 0.55, 0.08], [0.7, 0.14, 0.1], [0.08, 0.08, 0.08]][k], b: 8e-3 });
    }
    P3.cyl("plastic", 0.035, 0.1, 0.25, T3 + 0.05, 0.25, { seg: 10, col: DK });
    for (let k = 0; k < 4; k++) P3.bar("plastic", [0.25 + (R4() - 0.5) * 0.03, T3 + 0.08, 0.25 + (R4() - 0.5) * 0.03], [0.25 + (R4() - 0.5) * 0.08, T3 + 0.2, 0.25 + (R4() - 0.5) * 0.08], 4e-3, { col: [[0.1, 0.2, 0.7], [0.7, 0.1, 0.1], DK, DK][k] });
    P3.cyl("plastic", 0.05, 0.12, -0.75, T3 + 0.06, 0.24, { seg: 10, col: [0.9, 0.9, 0.86] });
    P3.box("plastic", 0.4, 0.18, 0.12, 0.1, T3 + 0.09, -0.26, { col: [0.5, 0.5, 0.52], b: 0.02 });
    P3.cyl("plastic", 0.012, 0.3, 0.26, T3 + 0.3, -0.26, { seg: 6, col: DK });
  }
  P3.cyl("plastic", 0.06, 0.04, -0.2, T3 + 0.02, -0.2, { seg: 12, col: [0.6, 0.1, 0.08] });
  P3.cyl(o.lamp ? "lampWarm" : "glass", 0.045, 0.12, -0.2, T3 + 0.1, -0.2, { seg: 12 });
  P3.cyl("plastic", 0.062, 0.03, -0.2, T3 + 0.175, -0.2, { seg: 12, col: [0.6, 0.1, 0.08] });
  P3.add("steel", ring(0.06, 4e-3, { seg: 10, radial: 4, a0: 0, a1: PI5 }), [0.5, 0.5, 0.5], { p: [-0.2, T3 + 0.19, -0.2] });
  if (o.lamp) {
    P3.glow("fill", [-0.2, T3 + 0.35, -0.2], { col: [1, 0.62, 0.3], power: 3.2, dist: 5.5 });
    P3.glow("flare", [-0.2, T3 + 0.1, -0.2], { col: [1, 0.7, 0.4], size: 0.5 });
  }
  if (A) {
    const nm = meds ? "wristband" : "register", bw = meds ? 0.9 : 0.8, bh = bw / A.aspect(nm);
    P3.quad("signF", bw, bh, A.rect(nm), { p: [-0.5, 0.75 + bh / 2, -0.75], r: [-0.14, 0.2, 0] });
    for (const e of [-0.3, 0.3]) P3.bar("wood", [-0.5 + e, 0, -0.68 - e * 0.2], [-0.5 + e * 0.3, 0.8 + bh, -0.82], 0.014, { col: [0.5, 0.42, 0.28] });
    P3.bar("wood", [-0.5, 0, -1.25], [-0.5, 0.8 + bh, -0.84], 0.014, { col: [0.5, 0.42, 0.28] });
    const sn = meds ? "wristband" : "triage", sw = 1.3, sh = Math.min(0.5, sw / A.aspect(sn));
    P3.quad("signF", sh * A.aspect(sn), sh, A.rect(sn), { p: [0.1, T3 - 0.07 - sh / 2, D / 2 + 6e-3] });
  }
  {
    P3.push(o.chair === "tipped" ? { p: [0.5, 0.22, -0.95], r: [H, 0.4, 0] } : { p: [0.35, 0, -0.62], r: [0, 0.3, 0] });
    for (const s of [-1, 1]) {
      P3.bar("steel", [s * 0.2, 0, 0.2], [s * 0.2, 0.86, -0.2], 0.011, { col: [0.3, 0.3, 0.32] });
      P3.bar("steel", [s * 0.2, 0, -0.2], [s * 0.2, 0.46, 0.2], 0.011, { col: [0.3, 0.3, 0.32] });
    }
    P3.add("plastic", softBox(0.42, 0.025, 0.4, 0.012, 3), [0.3, 0.32, 0.36], { p: [0, 0.46, 0.02] });
    P3.add("plastic", softBox(0.42, 0.2, 0.02, 0.01, 3), [0.3, 0.32, 0.36], { p: [0, 0.76, -0.16], r: [-0.4, 0, 0] });
    P3.pop();
  }
  P3.col([-L / 2, 0, -D / 2], [L / 2, T3 + 0.05, D / 2], { surface: "plastic" });
  return P3.finish({ grime: 0.5, ground: 0.3 });
});
var monitorCart = (seed = 1, o = {}) => proto("fmon" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("monitorCart", seed), on = o.on ?? 1;
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * PI5 * 2;
    P3.beam("plastic", [0, 0.1, 0], [Math.cos(a) * 0.26, 0.07, Math.sin(a) * 0.26], 0.04, 0.03, { col: [0.8, 0.8, 0.78] });
    P3.cyl("rubber", 0.03, 0.025, Math.cos(a) * 0.26, 0.03, Math.sin(a) * 0.26, { axis: "z", seg: 8, col: DK, r: [0, -a, 0] });
  }
  P3.bar("galv", [0, 0.1, 0], [0, 1.15, 0], 0.018, { col: ALU3 });
  P3.box("plastic", 0.3, 0.02, 0.24, 0, 0.7, 0.03, { col: [0.8, 0.8, 0.78], b: 6e-3 });
  P3.add("plastic", softBox(0.2, 0.08, 0.14, 0.02, 3), [0.3, 0.5, 0.8], { p: [0, 0.75, 0.03] });
  P3.push({ p: [0, 1.28, 0.02], r: [-0.14, 0, 0] });
  P3.add("plastic", softBox(0.38, 0.3, 0.1, 0.025, 3), [0.82, 0.82, 0.78]);
  P3.box("black", 0.3, 0.2, 4e-3, -0.02, 0.02, 0.051, { b: 0 });
  P3.box("plastic", 0.03, 0.2, 0.01, 0.16, 0.02, 0.052, { col: [0.3, 0.3, 0.32], b: 2e-3 });
  if (on) {
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30, sp2 = Math.exp(-((u * 3 % 1 - 0.5) ** 2) / 3e-3);
      pts.push([-0.16 + u * 0.28, 0.05 + 0.05 * sp2 - 0.02 * Math.exp(-((u * 3 % 1 - 0.58) ** 2) / 2e-3), 0.054]);
    }
    P3.add("emGreen", tube(pts, 25e-4, 3, { samples: 0 }));
    P3.box("ledRed", 0.012, 0.012, 4e-3, 0.16, -0.1, 0.053, { b: 0 });
    P3.box("emGreen", 0.05, 0.03, 2e-3, 0.08, -0.05, 0.054, { b: 0 });
    P3.glow("fill", [0, 0.02, 0.4], { col: [0.2, 1, 0.45], power: 1.6, dist: 3.5, dir: [0, 0, 1], cone: 1.1 });
  }
  P3.pop();
  P3.tube("rubber", [[0.1, 1.2, 0], [0.2, 0.9, 0.05], [0.25, 0.3, 0.1], [0.5, 0.02, 0.2], [0.9, 0.02, 0.1]], 5e-3, { seg: 4, samples: 12, col: DK });
  P3.tube("rubber", [[-0.1, 1.2, 0.02], [-0.25, 0.95, 0.15], [-0.3, 0.7, 0.3]], 4e-3, { seg: 4, samples: 8, col: [0.8, 0.8, 0.8] });
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0.4, ground: 0.2 });
});
var wheelchair = (seed = 1, o = {}) => proto("fwch" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("wheelchair", seed), FR2 = [0.12, 0.12, 0.13];
  if (o.tipped) P3.push({ p: [0, 0.3, 0], r: [H - 0.05, 0.3, 0] });
  for (const s of [-1, 1]) {
    const z = s * 0.24;
    P3.add("rubber", ring(0.29, 0.016, { seg: 22, radial: 6 }), DK, { p: [-0.1, 0.3, s * 0.3] });
    P3.add("chrome", ring(0.25, 6e-3, { seg: 20, radial: 4 }), null, { p: [-0.1, 0.3, s * 0.33] });
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * PI5 * 2;
      P3.bar("chrome", [-0.1, 0.3, s * 0.3], [-0.1 + Math.cos(a) * 0.28, 0.3 + Math.sin(a) * 0.28, s * 0.3], 3e-3);
    }
    P3.cyl("steel", 0.025, 0.05, -0.1, 0.3, s * 0.29, { axis: "z", seg: 8, col: FR2 });
    P3.cyl("rubber", 0.07, 0.03, 0.36, 0.07, z, { axis: "z", seg: 12, col: DK });
    P3.bar("steel", [0.36, 0.07, z], [0.32, 0.22, z], 0.01, { col: FR2 });
    P3.tube("steel", [[-0.3, 0.98, z], [-0.2, 0.92, z], [-0.18, 0.5, z], [-0.14, 0.3, z]], 0.012, { seg: 6, samples: 0, col: FR2 });
    P3.tube("steel", [[-0.18, 0.5, z], [0.3, 0.5, z], [0.34, 0.2, z], [0.44, 0.1, z]], 0.012, { seg: 6, samples: 0, col: FR2 });
    P3.tube("steel", [[-0.18, 0.7, z], [0.16, 0.7, z], [0.2, 0.5, z]], 0.011, { seg: 6, samples: 0, col: FR2 });
    P3.box("plastic", 0.26, 0.03, 0.05, 0, 0.715, z, { col: DK, b: 0.01 });
    P3.cyl("rubber", 0.017, 0.11, -0.33, 0.98, z, { axis: "x", seg: 8, col: DK });
    P3.box("plastic", 0.16, 0.012, 0.1, 0.46, 0.09, s * 0.14, { col: DK, b: 4e-3 });
  }
  P3.bar("steel", [0, 0.48, -0.24], [0, 0.2, 0.24], 9e-3, { col: FR2 });
  P3.bar("steel", [0, 0.48, 0.24], [0, 0.2, -0.24], 9e-3, { col: FR2 });
  {
    const g2 = gridSurf(lin(-0.17, 0.3, 5), lin(-1, 1, 5), (x, t, q) => {
      q.set(x, 0.5 - 0.04 * (1 - t * t), t * 0.235);
      return [0.08, 0.1, 0.2];
    });
    g2.computeVertexNormals();
    P3.add("canvas", g2, null);
    const b = gridSurf(lin(0.52, 0.93, 4), lin(-1, 1, 5), (y, t, q) => {
      q.set(-0.19 - 0.03 * (1 - t * t), y, t * 0.235);
      return [0.08, 0.1, 0.2];
    });
    b.computeVertexNormals();
    P3.add("canvas", b, null);
  }
  if (o.tipped) {
    P3.pop();
    P3.col([-0.5, 0, -0.5], [0.5, 0.5, 0.5], { surface: "metal", noNav: true });
  } else P3.col([-0.4, 0, -0.33], [0.5, 0.95, 0.33], { surface: "metal", noNav: true });
  return P3.finish({ grime: 0.4, ground: 0.25 });
});
var wasteBins = (seed = 1, o = {}) => proto("fbin" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("wasteBins", seed), R4 = rng(seed * 59 + 1), A = o.atlas, n = o.n ?? 2, YEL2 = [0.86, 0.68, 0.05];
  for (let k = 0; k < n; k++) {
    const x = (k - (n - 1) / 2) * 0.62, open = R4() < 0.4;
    P3.push({ p: [x, 0, 0], r: [0, (R4() - 0.5) * 0.3, 0] });
    P3.add("plastic", extrude([[-0.24, 0.08], [0.24, 0.08], [0.28, 0.98], [-0.28, 0.98]], -0.26, 0.26, 0.02), YEL2);
    P3.box("plastic", 0.6, 0.04, 0.6, 0, open ? 1.3 : 1, open ? -0.38 : 0, { col: [0.75, 0.58, 0.04], b: 0.012, r: [open ? -1.4 : 0, 0, 0] });
    for (const s of [-1, 1]) P3.cyl("rubber", 0.08, 0.04, s * 0.22, 0.08, -0.27, { axis: "x", seg: 10, col: DK });
    P3.bar("plastic", [-0.26, 0.95, -0.3], [0.26, 0.95, -0.3], 0.014, { col: [0.75, 0.58, 0.04] });
    if (A) P3.quad("decalF", 0.3, 0.3 / A.aspect("hazard"), A.rect("hazard"), { p: [0, 0.6, 0.262] });
    if (open) P3.add("pvc", softBox(0.4, 0.3, 0.4, 0.14, 4), [0.8, 0.6, 0.05], { p: [0, 0.98, 0] });
    P3.pop();
  }
  for (let k = 0; k < (o.bags ?? 4); k++) {
    const a = R4() * 6.28, rr = 0.6 + R4() * 0.6, sz = 0.3 + R4() * 0.16, g2 = softBox(sz, sz * 0.8, sz, sz * 0.38, 5);
    deform(g2, (q) => {
      q.y -= 0.05 * Math.max(0, -q.y) * 4;
      q.x += 0.03 * Math.sin(q.y * 20 + k);
    }, true);
    P3.add("pvc", g2, k % 3 ? [0.82, 0.62, 0.05] : [0.6, 0.08, 0.06], { p: [Math.cos(a) * rr * 0.9, sz * 0.36, 0.55 + Math.abs(Math.sin(a)) * rr * 0.6], r: [0, a, 0] });
    P3.cyl("pvc", 0.03, 0.08, Math.cos(a) * rr * 0.9, sz * 0.78, 0.55 + Math.abs(Math.sin(a)) * rr * 0.6, { seg: 6, col: [0.8, 0.6, 0.05] });
  }
  P3.col([-(n * 0.62) / 2, 0, -0.3], [n * 0.62 / 2, 1, 0.3], { surface: "plastic" });
  return P3.finish({ grime: 0.6, ground: 0.4 });
});

