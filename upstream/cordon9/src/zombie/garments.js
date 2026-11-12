var cl3 = clamp2;
var ss4 = sstep;
var bell2 = (x) => Math.exp(-x * x);
var mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
var mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
var ridged = (x, y, z) => {
  const r = 1 - Math.abs(2 * fbm(x, y, z, 2) - 1);
  return r * r;
};
var roll = (x, y, z) => fbm(x, y, z, 2) * 2 - 1;
function outfitPlan(B2) {
  const R4 = rng(B2.seed * 977 + 31), pick = (a) => a[Math.floor(R4() * a.length) % a.length], rr = (a, b) => a + (b - a) * R4(), kind = B2.T.outfit;
  const O2 = {
    kind,
    R: R4,
    tornArm: B2.side,
    tornLeg: -B2.side,
    skinT: pick([[1, 0.99, 0.98], [0.95, 1, 0.98], [0.93, 0.84, 0.76], [0.74, 0.62, 0.54]]),
    shirtC: pick([[0.72, 0.76, 0.82], [0.8, 0.78, 0.72], [0.7, 0.62, 0.64], [0.6, 0.72, 0.68]]),
    jackC: pick([[0.2, 0.185, 0.15], [0.085, 0.095, 0.13], [0.12, 0.125, 0.13], [0.16, 0.115, 0.075]]),
    pantC: pick([[0.09, 0.11, 0.19], [0.1, 0.1, 0.11], [0.15, 0.12, 0.09]]),
    tieC: pick([[0.3, 0.03, 0.035], [0.05, 0.1, 0.2], [0.18, 0.14, 0.04]]),
    shoeC: pick([[0.16, 0.1, 0.06], [0.07, 0.07, 0.075]]),
    sleeveTear: rr(0.42, 0.52),
    legTear: rr(0.3, 0.44),
    hemTear: rr(0, 1),
    tuck: R4() < 0.5 ? 1 : -1,
    tieX: rr(-0.03, 0.03),
    tie: R4() < 0.7,
    buttons: [0, 1, 2, 3, 4, 5].map(() => R4() > 0.22)
  };
  if (kind === "patient") {
    O2.shirtC = pick([[0.46, 0.66, 0.62], [0.52, 0.63, 0.78], [0.7, 0.73, 0.68]]);
    O2.pantC = [O2.shirtC[0] * 0.8, O2.shirtC[1] * 0.8, O2.shirtC[2] * 0.82];
    O2.shoeC = [0.46, 0.46, 0.44];
    O2.sleeveTear = rr(0.16, 0.22);
  }
  if (kind === "guard") {
    O2.shirtC = pick([[0.09, 0.11, 0.16], [0.12, 0.12, 0.13]]);
    O2.jackC = pick([[0.74, 0.78, 0.08], [0.86, 0.4, 0.05]]);
    O2.pantC = [0.05, 0.055, 0.06];
    O2.shoeC = [0.05, 0.05, 0.055];
  }
  return O2;
}
function limbCoords(B2) {
  const J = B2.J, seg = (a, b) => ({ a, e: [b[0] - a[0], b[1] - a[1], b[2] - a[2]] }), S4 = { armL: [seg(J.armL, J.foreL), seg(J.foreL, J.handL)], armR: [seg(J.armR, J.foreR), seg(J.foreR, J.handR)], legL: [seg(J.thighL, J.shinL), seg(J.shinL, J.footL)], legR: [seg(J.thighR, J.shinR), seg(J.shinR, J.footR)] };
  const chain3 = (C2, x, y, z, o) => {
    let bd = 1e9, bt = 0;
    for (let i = 0; i < 2; i++) {
      const { a, e } = C2[i], px2 = x - a[0], py2 = y - a[1], pz2 = z - a[2], ee = e[0] * e[0] + e[1] * e[1] + e[2] * e[2], tr = (px2 * e[0] + py2 * e[1] + pz2 * e[2]) / ee, t = tr < 0 ? 0 : tr > 1 ? 1 : tr, d = Math.hypot(px2 - e[0] * t, py2 - e[1] * t, pz2 - e[2] * t);
      if (d < bd) {
        bd = d;
        bt = (i + (i === 0 ? Math.min(tr, 1) : Math.max(tr, 0))) * 0.5;
      }
    }
    o.t = bt;
    o.d = bd;
    return o;
  };
  return {
    arm: (x, y, z, o) => {
      o.s = x > 0 ? 1 : -1;
      return chain3(x > 0 ? S4.armL : S4.armR, x, y, z, o);
    },
    leg: (x, y, z, o) => {
      o.s = x > 0 ? 1 : -1;
      return chain3(x > 0 ? S4.legL : S4.legR, x, y, z, o);
    },
    armLen: Math.hypot(...S4.armL[0].e) + Math.hypot(...S4.armL[1].e),
    legLen: Math.hypot(...S4.legL[0].e) + Math.hypot(...S4.legL[1].e)
  };
}
function drape(g2, { y0, y1, slope }) {
  const D = g2.d, ys = g2.ys, sy = g2.sy;
  let j1 = ys.length - 1;
  while (j1 > 0 && ys[j1] > y1) j1--;
  let j0 = 0;
  while (j0 < j1 && ys[j0] < y0) j0++;
  for (let k = 0; k < g2.nz; k++) for (let i = 0; i < g2.nx; i++) {
    let q = i + sy * j1 + g2.sz * k, v = D[q];
    for (let j = j1 - 1; j >= j0; j--) {
      q -= sy;
      v += slope * (ys[j + 1] - ys[j]);
      if (D[q] < v) v = D[q];
      else D[q] = v;
    }
  }
}
function soften(g2, passes) {
  const D = g2.d, n = D.length, T3 = new Float32Array(n), st = [1, g2.sy, g2.sz], dims = [g2.nx, g2.ny, g2.nz];
  for (let i = 0; i < n; i++) D[i] = D[i] > 0.12 ? 0.12 : D[i] < -0.12 ? -0.12 : D[i];
  for (let p = 0; p < passes; p++) for (let a = 0; a < 3; a++) {
    const s = st[a];
    T3.set(D);
    for (let k = 0; k < g2.nz; k++) for (let j = 0; j < g2.ny; j++) for (let i = 0; i < g2.nx; i++) {
      const c = [i, j, k][a];
      if (c === 0 || c === dims[a] - 1) continue;
      const q = i + g2.sy * j + g2.sz * k;
      D[q] = 0.25 * T3[q - s] + 0.5 * T3[q] + 0.25 * T3[q + s];
    }
  }
}
function shell(ctx, S4) {
  const { rg, lod } = ctx;
  let G4 = null;
  for (const part of S4.parts) {
    const R4 = rg[part.region];
    if (!R4) continue;
    const g2 = R4.sub(S4.box[0], S4.box[1], 1), off = part.off, keep = part.keep, near = part.near || 0.07;
    if (part.soften) soften(g2, part.soften);
    g2.map((v, x, y, z) => v > near || v < -near * 1.5 ? v : keep && !keep(x, y, z) ? BIG : v - off(x, y, z));
    if (part.drape) drape(g2, part.drape);
    if (!G4) G4 = g2;
    else {
      const A = G4.d, Bd = g2.d, k = S4.k ?? 0.012;
      for (let i = 0; i < A.length; i++) {
        const a = A[i], b = Bd[i];
        A[i] = a - b > k ? b : b - a > k ? a : smin(a, b, k);
      }
    }
  }
  if (!G4) return null;
  let m = meshGrid(G4, { smooth: 2 });
  for (const fn of S4.clips.concat(ctx.tearAt && !S4.noTear ? [ctx.tearAt] : [])) {
    m = clip(m, fn);
    if (!m.I.length) return null;
  }
  m = dropIslands(m, 40);
  gradNormals(m, G4);
  const ao = fieldAO(m, G4, 0.014), nv0 = m.P.length / 3;
  const strips = lod < 2 && S4.flanges ? S4.flanges.map((f3) => flange(m, f3)) : [];
  if (lod < 3 && S4.rim) m = rim(m, S4.rim);
  if (strips.length) m = concat([m].concat(strips));
  flagNormals(m, 3);
  m.ao = new Float32Array(m.P.length / 3).fill(0.8);
  m.ao.set(ao.subarray(0, nv0));
  const clips = S4.clips.concat(ctx.tearAt && !S4.noTear ? [ctx.tearAt] : []), b0 = S4.box[0], b1 = S4.box[1];
  const covers = (x, y, z, margin) => {
    if (x < b0[0] || x > b1[0] || y < b0[1] || y > b1[1] || z < b0[2] || z > b1[2]) return false;
    if (G4.at(x, y, z) > -15e-4) return false;
    for (const fn of clips) if (fn(x, y, z) < margin) return false;
    return true;
  };
  return { m, G: G4, covers };
}
function overlay(ctx, sh, lift, clips, rim2) {
  const G4 = new Grid(sh.G.xs, sh.G.ys, sh.G.zs, 0), A = sh.G.d, D = G4.d;
  for (let i = 0; i < D.length; i++) D[i] = A[i] - lift;
  let m = meshGrid(G4, { smooth: 2, keep: (x, y, z) => {
    for (const fn of clips) if (fn(x, y, z) < -0.03) return false;
    return true;
  } });
  for (const fn of clips) {
    if (!m.I.length) return null;
    m = clip(m, fn, 5);
  }
  if (!m.I.length) return null;
  m = dropIslands(m, 12);
  gradNormals(m, G4);
  const ao = fieldAO(m, G4, 0.014), nv0 = m.P.length / 3;
  if (ctx.lod < 3 && rim2) m = rim(m, rim2);
  m.ao = new Float32Array(m.P.length / 3).fill(0.75);
  m.ao.set(ao.subarray(0, nv0));
  return { m, G: G4, covers: () => false };
}
function buildOutfit(ctx) {
  const { B: B2, O: O2, lod, lc } = ctx, { h, bk, J, zo } = B2, seed = B2.seed, kind = O2.kind, isC = kind === "commuter", isP = kind === "patient", isG = kind === "guard", o1 = { t: 0, d: 0, s: 1 }, layers = [], extra = [];
  const xm = J.handL[0] + 0.06, box2 = (y0, y1, x = xm, z = 0.26 * bk) => [[-x, y0, -z + 0.02], [x, y1, z + 0.03]];
  const armZone = (x, y, z) => Math.abs(x) > J.armL[0] * 0.86 && lc.arm(x, y, z, o1).d < 0.11, legS = (x) => x > 0 ? 1 : -1;
  const paintCloth = (L, base, o = {}) => (i, x, y, z, nx, ny, nz, out) => {
    const ao = L.m.ao[i], fl = L.m.flag ? L.m.flag[i] : 0, n1 = fbm(x * 13 + seed * 2.3, y * 13, z * 13, 2), gr = ctx.grime(x, y, z), bl = ctx.bloodAt(x, y, z) * (o.blood ?? 0.9);
    let c = o.col ? o.col(x, y, z, base) : base;
    c = mulc(c, (0.55 + 0.55 * ao) * (0.86 + 0.28 * n1) * (fl === 1 ? 1.12 : fl === 2 ? 0.7 : 1));
    c = mixc(c, mulc(base, 0.45), gr * 0.7);
    out.c[0] = c[0];
    out.c[1] = c[1];
    out.c[2] = c[2];
    out.m[0] = cl3(bl + (o.soak ? o.soak(x, y, z) : 0));
    out.m[1] = cl3(1 - ao + gr * 0.3);
  };
  const push = (bucket, sh, base, o) => {
    if (!sh) return null;
    const L = { bucket, m: sh.m, sh };
    L.paint = paintCloth(L, base, o);
    layers.push(L);
    return sh;
  };
  const cz = (y) => zo(y) - 8e-3, tA = O2.tornArm, tL = O2.tornLeg;
  const waistY = 1.012 * h, hemY = 0.066, tearY = O2.legTear * h;
  const trousers = shell(ctx, {
    box: box2(0.03, waistY + 0.03, 0.27 * bk),
    k: 0.02,
    rim: { th: 35e-4, depth: 0.03 },
    parts: [
      { region: "torso", off: (x, y, z) => 9e-3 + (isP ? 6e-3 : 0), keep: (x, y, z) => y < waistY + 0.03 },
      { region: "legsShod", drape: { y0: 0.03, y1: 0.9 * h, slope: isP ? 0.03 : 0.045 }, off: (x, y, z) => {
        const yn = y / h, knee = bell2((yn - 0.5) / 0.06), stack = ss4(0.2, 0.07, yn), s = legS(x);
        return 0.011 + (isP ? 8e-3 : 0) + 45e-4 * knee * ridged(x * 7 + s, y * 55 + seed, z * 7) + 7e-3 * stack * ridged(x * 9, y * 75 + seed * 3, z * 9 + s) + 35e-4 * roll(x * 34 + seed, y * 5, z * 34) * ss4(0.9, 0.6, yn);
      } }
    ],
    clips: [(x, y, z) => waistY - y, (x, y, z) => legS(x) === tL ? y - tearY - 0.07 * (fbm(Math.atan2(z, x - tL * J.shinL[0]) * 1.3 + seed, y * 9, 3, 2) - 0.5) : y - hemY]
  });
  push("pants", trousers, O2.pantC, { soak: (x, y, z) => legS(x) === tL ? 0.6 * ss4(tearY + 0.08, tearY, y) : 0 });
  const collarY = (z, y0) => y0 * h - 0.36 * (z - cz(1.48 * h)), nR = (x, y, z) => Math.hypot(x, (z - cz(y) - 4e-3) * 0.92), neckCut = (y0, r) => (x, y, z) => Math.max(collarY(z, y0) - y, nR(x, y, z) - r);
  const tuckY = (x) => lerp2(1 * h, 0.905 * h, ss4(-0.25, 0.35, O2.tuck * x / (0.15 * bk))), slvEnd = isP ? 0.21 : 0.487, slvTear = O2.sleeveTear, front = (y, z) => z > cz(y) + 0.01;
  const shirtHem = (x, y, z) => y - tuckY(x) - 0.035 * (fbm(Math.atan2(x, z) * 2.2 + seed * 2, 1.7, seed, 2) - 0.5) * ss4(1 * h, 0.93 * h, tuckY(x));
  const sleeveClip = (end, tear, amp) => (x, y, z) => {
    if (!armZone(x, y, z)) return 1;
    const s = o1.s, t = o1.t;
    return ((s === tA ? tear + amp * (fbm(Math.atan2(z, y) * 2 + seed * 5, t * 8, s, 2) - 0.5) : end) - t) * lc.armLen;
  };
  const sNeckY = isP ? 1.452 : 1.474, sNeckR = (isP ? 0.074 : 0.068) * (0.55 + 0.45 * bk), vneck = (x, y, z) => isP && front(y, z) ? Math.max(0, 0.085 - Math.abs(x) * 1.25) : 0;
  const placket = (x, y, z) => !isP && front(y, z) ? ss4(0.014, 0.011, Math.abs(x)) : 0;
  const shirtOff = (x, y, z) => {
    const yn = y / h, low = ss4(1.12, 0.92, yn);
    return 55e-4 + (isP ? 7e-3 : 0) + 0.011 * low + (3e-3 + 5e-3 * low) * ridged(x * 26 + seed, y * 6, z * 26) + 3e-3 * roll(x * 9, y * 19 + seed, z * 9) + 18e-4 * placket(x, y, z);
  };
  const sleeveOff = (base) => (x, y, z) => {
    lc.arm(x, y, z, o1);
    const el2 = bell2((o1.t - 0.5) / 0.07), cuff = isP ? 0 : ss4(0.93, 0.94, o1.t) * 3e-3;
    return base + cuff + 5e-3 * el2 * ridged(x * 30, y * 30 + seed, z * 12 + o1.s) + 3e-3 * roll(x * 22 + seed, y * 22, z * 22);
  };
  const shirt = shell(ctx, {
    box: box2(0.86 * h, 1.56 * h),
    k: 0.012,
    rim: { th: 3e-3, depth: 0.03 },
    parts: [{ region: "torso", off: shirtOff, drape: { y0: 0.86 * h, y1: 1.2 * h, slope: 0.16 } }, { region: "arms", off: sleeveOff(7e-3 + (isP ? 0.012 : 0)) }],
    clips: [(x, y, z) => neckCut(sNeckY, sNeckR)(x, y, z) - vneck(x, y, z) - (isP || !front(y, z) ? 0 : Math.max(0, 0.022 - Math.abs(x) * 1.5)), shirtHem, sleeveClip(isP ? slvEnd : 0.985, isP ? slvTear : slvTear + 0.06, 0.08)]
  });
  let jacket = null, tie = null;
  if (!isP) {
    const g2 = (y) => {
      const yn = y / h;
      return isG ? 0.012 + 0.03 * ss4(1.36, 1.47, yn) : 0.014 + 0.066 * ss4(1.14, 1.44, yn) + 0.05 * ss4(1.1, 0.88, yn);
    }, hem0 = (isG ? 0.985 : 0.868) * h, jNeckY = isG ? 1.455 : 1.462, jNeckR = (isG ? 0.086 : 0.092) * (0.55 + 0.45 * bk);
    const yN = 1.392 * h, lw = (y) => 0.012 + 0.052 * ss4(1.14 * h, 1.37 * h, y) * ss4(1.115 * h, 1.19 * h, y);
    const lapelFn = (x, y, z) => {
      const ax = Math.abs(x), e = ax - g2(y);
      if (!front(y, z)) return Math.min(jNeckR + 0.046 - nR(x, y, z), 0.052 - (collarY(z, jNeckY) - y));
      const lap = Math.min(e + 3e-3, lw(y) - e, y - 1.115 * h, yN - y + 4e-3), col = Math.min(e + 3e-3, 0.04 - e * 0.9 - (y - yN) * 0.18, y - yN - 4e-3), notch = (e - lw(y) * 0.5) * 0.6 - Math.abs(y - yN) * 1.5;
      return Math.min(Math.max(lap, col), -notch);
    };
    const pocketFn = (x, y, z) => front(y, z) ? Math.min(0.05 - Math.abs(Math.abs(x) - 0.108 * bk), 0.016 - Math.abs(y - 1 * h - 0.2 * (Math.abs(x) - 0.108 * bk))) : -1;
    const jOff = (x, y, z) => {
      const yn = y / h, low = ss4(1.2, 0.88, yn), pad = isG ? 0 : 0.012 * ss4(1.36, 1.44, yn) * ss4(0.09 * bk, 0.16 * bk, Math.abs(x));
      return (isG ? 0.026 : 0.024) + pad + 0.012 * low + (3e-3 + 6e-3 * low) * ridged(x * 15 + seed * 3, y * 4.5, z * 15) * (isG ? 0.5 : 1) + 4e-3 * roll(x * 6 + seed, y * 9, z * 6);
    };
    jacket = shell(ctx, {
      box: box2(0.82 * h, 1.56 * h),
      k: 0.014,
      rim: { th: isG ? 3e-3 : 45e-4, depth: 0.04 },
      parts: [{ region: "torso", off: jOff, soften: isG ? 4 : 3, drape: { y0: 0.82 * h, y1: 1.3 * h, slope: isG ? 0.22 : 0.12 } }].concat(isC ? [{ region: "arms", off: sleeveOff(0.017), soften: 1 }] : []),
      clips: [neckCut(jNeckY, jNeckR), (x, y, z) => z > cz(y) - 0.01 ? Math.abs(x) - g2(y) : 1, (x, y, z) => y - hem0 - 0.05 * (fbm(Math.atan2(x, z) * 1.8 + seed * 4, 2.2, seed, 2) - 0.5) * (isG ? 0.3 : 1) - (isG ? 0 : 0.1 * O2.hemTear * bell2((Math.atan2(x, z) - tL * 2.2) / 0.5))].concat(isC ? [sleeveClip(0.93, O2.sleeveTear, 0.1)] : [(x, y, z) => Math.abs(x) > J.armL[0] * 0.8 ? J.armL[0] * 0.8 + (J.armL[1] + 0.035 - y) * 0.5 - Math.abs(x) + 0.035 : 1])
    });
    push("jacket", jacket, O2.jackC, isG ? { col: (x, y, z, b) => {
      const yn = y / h, band = Math.abs(yn - 1.1) < 0.019 || Math.abs(yn - 1.2) < 0.019 || yn > 1.2 && Math.abs(Math.abs(x) - 0.1 * bk) < 0.019;
      return band ? [0.86, 0.87, 0.9] : b;
    }, blood: 0.8 } : {});
    if (isC && jacket && lod < 3) {
      push("jacket", overlay(ctx, jacket, 55e-4, [lapelFn], { th: 4e-3, depth: 0.012 }), mulc(O2.jackC, 0.94));
      if (lod < 2) push("jacket", overlay(ctx, jacket, 4e-3, [pocketFn], { th: 3e-3, depth: 8e-3 }), mulc(O2.jackC, 0.94));
    }
    if (isC && O2.tie) {
      const yk = 1.452 * h, yt = 1.04 * h, xc = (y) => O2.tieX * ss4(yk, yt, y) + 0.01 * Math.sin(y * 9 + seed), hw = (y) => 0.015 + 0.02 * ss4(yk - 0.03, yt + 0.06, y) + 0.01 * bell2((y - yk) / 0.016);
      tie = shell(ctx, {
        box: [[-0.09, yt - 0.03, cz(1.2 * h) - 0.02], [0.09, yk + 0.05, 0.3 * bk]],
        k: 0.01,
        rim: { th: 3e-3, depth: 0.012 },
        parts: [{ region: "torso", off: (x, y, z) => shirtOff(x, y, z) + 45e-4 + 4e-3 * bell2((y - yk) / 0.016), drape: { y0: yt - 0.03, y1: 1.3 * h, slope: 0.1 } }],
        clips: [(x, y, z) => Math.min(hw(y) - Math.abs(x - xc(y)), y - yt - Math.abs(x - xc(y)) * 0.9, yk + 0.022 - y, z - cz(y) - 0.02)]
      });
      if (tie) {
        if (jacket) tie.m = cullKeep(tie.m, [jacket], 0.012);
        push("shirt", tie, O2.tieC, { blood: 1 });
      }
    }
  }
  if (shirt && !isP && lod < 3) {
    const colFn = (x, y, z) => {
      const dy = collarY(z, sNeckY) - y, ax = Math.abs(x), r = nR(x, y, z);
      if (r > sNeckR + 0.06 && !front(y, z)) return -1;
      return Math.min(Math.max(0.03 - dy, front(y, z) ? 0.064 - dy - Math.abs(ax - 0.034) * 1.25 : -1), front(y, z) ? ax - 6e-3 - Math.max(0, 0.02 - dy) * 0.5 : 1, dy + 0.012);
    };
    const col = overlay(ctx, shirt, 4e-3, [colFn], { th: 3e-3, depth: 0.01 });
    if (col) {
      if (jacket) col.m = cullKeep(col.m, [jacket], 4e-3);
      push("shirt", col, mulc(O2.shirtC, 1.04));
    }
  }
  if (shirt) {
    if (jacket) shirt.m = cullKeep(shirt.m, [jacket], 0.02);
    push("shirt", shirt, O2.shirtC, {
      soak: (x, y, z) => 0.5 * bell2((x - B2.side * 0.03) / 0.07) * bell2((y - 1.3 * h) / 0.12) * (z > cz(y) ? 1 : 0),
      col: (x, y, z, b) => mulc(b, 1 - 0.3 * placket(x * 0.8, y, z) * (1 - placket(x * 1.25, y, z)))
    });
  }
  if (trousers) {
    const cov = [shirt, jacket].filter(Boolean);
    if (cov.length) {
      const L = layers.find((l) => l.sh === trousers);
      L.m = cullKeep(L.m, cov, 0.02);
    }
  }
  return { layers, shells: [trousers, shirt, jacket].filter(Boolean), extra };
}
function cullKeep(m, shells, margin) {
  const P3 = m.P, I = m.I, nv = P3.length / 3, keepV = new Int32Array(nv).fill(-1), oI = [];
  let n = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, x = (P3[a] + P3[b] + P3[c]) / 3, y = (P3[a + 1] + P3[b + 1] + P3[c + 1]) / 3, z = (P3[a + 2] + P3[b + 2] + P3[c + 2]) / 3;
    let hid = false;
    for (const s of shells) if (s.covers(x, y, z, margin)) {
      hid = true;
      break;
    }
    if (hid) continue;
    for (let e = 0; e < 3; e++) {
      const v = I[t + e];
      if (keepV[v] < 0) keepV[v] = n++;
      oI.push(keepV[v]);
    }
  }
  const o = { P: new Float32Array(n * 3), N: new Float32Array(n * 3), I: Uint32Array.from(oI), flag: new Uint8Array(n), ao: new Float32Array(n) };
  for (let i = 0; i < nv; i++) {
    const j = keepV[i];
    if (j < 0) continue;
    for (let a = 0; a < 3; a++) {
      o.P[j * 3 + a] = P3[i * 3 + a];
      o.N[j * 3 + a] = m.N[i * 3 + a];
    }
    o.flag[j] = m.flag ? m.flag[i] : 0;
    o.ao[j] = m.ao ? m.ao[i] : 0.8;
  }
  return o;
}

