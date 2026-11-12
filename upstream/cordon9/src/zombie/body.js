var cl7 = clamp2;
var ss9 = sstep;
var now = () => typeof performance !== "undefined" ? performance.now() : Date.now();
var mixc3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
var CELL = { body: [0.0105, 0.0135, 0.018, 0.031], headF: [3e-3, 45e-4, 7e-3, 0.011], headC: [6e-3, 8e-3, 0.011, 0.014], hand: [44e-4, 6e-3, 9e-3, 0.012] };
var RK = { legs: 0.03, arms: 0.022, head: 0.014, hands: 8e-3 };
function regionGrids(xs, ys, zs, R4, pad, main = null) {
  const x0 = xs[0], x1 = xs[xs.length - 1], y0 = ys[0], y1 = ys[ys.length - 1], z0 = zs[0], z1 = zs[zs.length - 1], o = {};
  for (const name of ["torso", "legs", "arms", "head", "hands"]) {
    const list = R4[name];
    let hit = false;
    for (const p of list) {
      const m = p.k + pad, b = p.bb;
      if (b[0] - m < x1 && b[3] + m > x0 && b[1] - m < y1 && b[4] + m > y0 && b[2] - m < z1 && b[5] + m > z0) {
        hit = true;
        break;
      }
    }
    o[name] = hit ? new Grid(xs, ys, zs).add(list, main && name !== main ? Math.max(pad, 0.05) : pad) : null;
  }
  return o;
}
function blendRegions(rg, xs, ys, zs, carve = null, pad = 4e-3) {
  const g2 = new Grid(xs, ys, zs), D = g2.d;
  if (rg.torso) D.set(rg.torso.d);
  for (const name of ["legs", "arms", "head", "hands"]) {
    const r = rg[name];
    if (!r) continue;
    const S4 = r.d, k = RK[name];
    for (let i = 0; i < D.length; i++) {
      const a = D[i], b = S4[i];
      D[i] = a - b > k ? b : b - a > k ? a : smin(a, b, k);
    }
  }
  if (carve && carve.length) g2.add(carve, pad);
  return g2;
}
var PREP = /* @__PURE__ */ new Map();
function prep(type, seed) {
  const key = type + ":" + seed;
  if (PREP.has(key)) return PREP.get(key);
  const t0 = now(), B2 = bodyPlan(type, seed), F2 = facePlan(B2), bp = bodyPrims(B2), H2 = headPrims(B2, F2), hands = [handPrims(B2, -1), handPrims(B2, 1)];
  hands[0].bone = BI.handR;
  hands[1].bone = BI.handL;
  const R4 = { torso: bp.torso, legs: bp.legs, arms: bp.arms, head: H2.prims, hands: hands[0].prims.concat(hands[1].prims) };
  const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const n in R4) for (const p of R4[n]) for (let a = 0; a < 3; a++) {
    bb[a] = Math.min(bb[a], p.bb[a]);
    bb[a + 3] = Math.max(bb[a + 3], p.bb[a + 3]);
  }
  const ny = 1 / Math.hypot(1, 0.5), neck = { p: [0, 1.53 * B2.h, B2.zo(1.53 * B2.h)], n: [0, ny, 0.5 * ny] };
  const P3 = { B: B2, F: F2, R: R4, H: H2, hands, bb, neck, carve: [], wounds: [], ms: { plan: now() - t0 } };
  P3.O = outfitPlan(B2);
  P3.hair = hairPlan(B2, F2);
  P3.lc = limbCoords(B2);
  P3.shoes = [shoePrims(B2, P3.O, -1), shoePrims(B2, P3.O, 1)];
  hands[0].side = -1;
  hands[1].side = 1;
  P3.W = woundPlan(B2, R4);
  P3.carve = carvePrims(B2, P3.W);
  P3.wounds = P3.W.map((w) => ({ p: w.p, r: w.r, d: w.d, name: w.name }));
  {
    const wb = bloodField(B2, P3.W), fb = feedField(B2);
    P3.bloodAt = (x, y, z) => Math.max(wb(x, y, z), fb(x, y, z));
  }
  P3.tearAt = tearField(B2, P3.W);
  {
    const t1 = now(), cw = 0.016, g2 = Grid.box([bb[0] - 0.04, bb[1] - 0.04, bb[2] - 0.04], [bb[3] + 0.04, bb[4] + 0.04, bb[5] + 0.04], cw), G4 = blendRegions(regionGrids(g2.xs, g2.ys, g2.zs, R4, 4e-3), g2.xs, g2.ys, g2.zs), m = dropIslands(meshGrid(G4), 200);
    gradNormals(m, G4);
    P3.WF = heatWeights(B2, G4, m);
    P3.ms.weights = now() - t1;
    P3.coarse = { tris: m.I.length / 3, open: isClosed(m) };
  }
  PREP.set(key, P3);
  return P3;
}
var neckD = (P3, x, y, z) => (x - P3.neck.p[0]) * P3.neck.n[0] + (y - P3.neck.p[1]) * P3.neck.n[1] + (z - P3.neck.p[2]) * P3.neck.n[2];
var wristD = (hd, x, y, z) => (x - hd.cut[0]) * hd.axis[0] + (y - hd.cut[1]) * hd.axis[1] + (z - hd.cut[2]) * hd.axis[2];
var nearHand = (hd, x, y, z) => {
  const dx = x - hd.wrist[0], dy = y - hd.wrist[1], dz = z - hd.wrist[2];
  return dx * dx + dy * dy + dz * dz < 0.3 * 0.3;
};
function buildZombie({ type = "walker", seed = 1, lod = 0 } = {}) {
  const t0 = now(), P3 = prep(type, seed), { B: B2, F: F2, R: R4, H: H2 } = P3, bucket = new Bucket(), ms = {}, J = B2.J;
  let tm = now();
  const lap = (n) => {
    const t = now();
    ms[n] = (ms[n] || 0) + t - tm;
    tm = t;
  };
  const dense = DENSE(), hl = [0, 0, 0];
  const skinOf = (m, headG = null, rigid = -1) => (x, y, z, si, sw, o, i) => {
    const N = m.N, fl = m.flag ? m.flag[i] : 0, sg = fl === 2 ? -1 : 1;
    P3.WF.sample(x, y, z, N[i * 3] * sg, N[i * 3 + 1] * sg, N[i * 3 + 2] * sg, dense);
    let jk = 0;
    if (rigid >= 0) {
      dense.fill(0);
      dense[rigid] = 1;
    }
    if (headG && neckD(P3, x, y, z) > -0.07) {
      const k = ss9(0.03, 4e-3, headG.at(x, y, z));
      if (k > 0) {
        for (let b = 0; b < NBASE; b++) dense[b] *= 1 - k;
        dense[BI.head] += k;
        headLocal(B2, x, y, z, hl);
        jk = jawWeight(F2, hl[0], hl[1], hl[2]);
      }
    }
    for (const hd of P3.hands) if (nearHand(hd, x, y, z)) {
      const k = ss9(0.055, 0.075, wristD(hd, x, y, z));
      if (k > 0) {
        for (let b = 0; b < NBASE; b++) dense[b] *= 1 - k;
        dense[hd.bone] += k;
      }
    }
    finish(B2, dense, x, y, z, si, sw, o, jk);
  };
  const pc = { B: B2, F: F2, O: P3.O, hands: P3.hands, wounds: P3.W, bloodAt: P3.bloodAt, grime: null, hair: P3.hair }, co = { i: -1 };
  const addSkin = (m, G4, part, skin, hand2) => {
    const wall2 = (x, y, z) => craterAt(P3.W, x, y, z, co) > 0.3, a = filterFaces(m, (x, y, z) => !wall2(x, y, z)), b = filterFaces(m, wall2);
    if (a.I.length) bucket.add("skin", toGeo(a, skinPaint(pc, a, G4, part, hand2), skin(a)));
    if (b.I.length) {
      b.ao = fieldAO(b, G4, 8e-3);
      bucket.add("gore", toGeo(b, gorePaint(pc, b), skin(b)));
    }
  };
  const cb = CELL.body[lod] * (lod === 3 ? Math.max(1, B2.T.bulk) ** 0.6 : 1), pad = 0.05, bb = P3.bb, g0 = Grid.box([bb[0] - 0.05, bb[1] - 0.03, bb[2] - 0.06], [bb[3] + 0.05, bb[4] + 0.05, bb[5] + 0.06], cb);
  const rg = regionGrids(g0.xs, g0.ys, g0.zs, R4, pad), GB = blendRegions(rg, g0.xs, g0.ys, g0.zs), GS = P3.carve.length ? blendRegions(rg, g0.xs, g0.ys, g0.zs, P3.carve) : GB;
  lap("bodyField");
  const seed3 = seed * 1.7, bloodAt = P3.bloodAt;
  const grime = (x, y, z) => cl7(ss9(0.55, 0, y) * 0.75 + 0.5 * ss9(0.5, 0.75, fbm(x * 4.3 + seed3, y * 4.3, z * 4.3, 3)));
  pc.grime = grime;
  rg.legsShod = new Grid(g0.xs, g0.ys, g0.zs, 0);
  rg.legsShod.d.set(rg.legs.d);
  rg.legsShod.add(P3.shoes.map((sp2) => sp2.upper), pad);
  const fit = buildOutfit({ B: B2, O: P3.O, rg, GB, lod, lc: P3.lc, bloodAt, grime, seed, tearAt: P3.tearAt }), shoes = [buildShoe(B2, P3.O, -1, lod), buildShoe(B2, P3.O, 1, lod)];
  lap("garments");
  const hidden = (x, y, z) => {
    for (const s of fit.shells) if (s.covers(x, y, z, 0.014)) return true;
    for (const sh of shoes) if (sh.inside(x, y, z)) return true;
    return false;
  };
  const hk = lod < 3, mg = cb * 2;
  let body = meshGrid(GS, { keep: hk ? (x, y, z) => neckD(P3, x, y, z) < mg && !(nearHand(P3.hands[0], x, y, z) && wristD(P3.hands[0], x, y, z) > mg) && !(nearHand(P3.hands[1], x, y, z) && wristD(P3.hands[1], x, y, z) > mg) : null });
  if (hk) {
    body = clip(body, (x, y, z) => 6e-4 - neckD(P3, x, y, z));
    for (const hd of P3.hands) body = clip(body, (x, y, z) => nearHand(hd, x, y, z) ? 6e-4 - wristD(hd, x, y, z) : 1);
    gradNormals(body, GS);
  }
  body = filterFaces(body, (x, y, z) => !hidden(x, y, z));
  if (!hk) for (const L of buildHair({ B: B2, F: F2, H: P3.hair, GH: GS, GB, head: body, lod, bloodAt })) {
    windToNormals(L.m);
    bucket.add("hair", toGeo(L.m, L.paint, (x, y, z, si, sw, o) => {
      si[o] = BI.head;
      sw[o] = 1;
    }));
  }
  addSkin(body, GS, "body", (m) => skinOf(m, rg.head));
  lap("bodyMesh");
  for (const w of P3.W) for (const L of innerLayer(B2, w, GB, lod)) bucket.add(L.bucket === "gut" ? "skinD" : L.bucket, toGeo(L.m, L.bucket === "bone" ? bonePaint(pc, L.m) : L.bucket === "gut" ? gutPaint(pc, L.m) : gorePaint(pc, L.m, "strand"), (x, y, z, si, sw, o) => {
    si[o] = L.bone;
    sw[o] = 1;
  }));
  for (const L of fit.layers) bucket.add(L.bucket, toGeo(L.m, L.paint, skinOf(L.m)));
  for (const sh of shoes) {
    const sp2 = sh.sp, fb = sp2.s > 0 ? BI.footL : BI.footR, sb = sp2.s > 0 ? BI.shinL : BI.shinR, oc = P3.O.shoeC, lt = sp2.L.bucket === "rubber";
    const paintShoe = (m, k) => (i, x, y, z, nx, ny, nz, out) => {
      const ao = m.ao[i], n1 = fbm(x * 40 + seed3, y * 40, z * 40, 2), g2 = grime(x, y, z), sc2 = 0.25 * ss9(0.35, 0.75, fbm(x * 90, y * 90 + seed3, z * 90, 2)) * ss9(0.02, 0.09, z - sp2.An[2]);
      let c = [oc[0] * k, oc[1] * k, oc[2] * k];
      c = mixc3(c, [0.2, 0.17, 0.14], g2 * 0.55 + sc2);
      const f3 = (0.5 + 0.6 * ao) * (0.85 + 0.3 * n1);
      out.c[0] = c[0] * f3;
      out.c[1] = c[1] * f3;
      out.c[2] = c[2] * f3;
      out.m[0] = cl7(bloodAt(x, y, z) + 0.5 * ss9(0.62, 0.8, fbm(x * 23 + seed3, y * 23, z * 23, 2)) * (sp2.s === B2.side ? 1 : 0.3));
      out.m[1] = cl7(1 - ao + g2 * 0.5);
    };
    bucket.add("rubber", toGeo(sh.sole, paintShoe(sh.sole, lt ? 0.7 : 0.35), (x, y, z, si, sw, o) => {
      si[o] = fb;
      sw[o] = 1;
    }));
    bucket.add(sp2.L.bucket, toGeo(sh.upper, paintShoe(sh.upper, 1), (x, y, z, si, sw, o) => {
      const k = sp2.L.shaft ? ss9(0.1, 0.17, y) : 0;
      si[o] = fb;
      sw[o] = 1 - k;
      si[o + 1] = sb;
      sw[o + 1] = k;
    }));
  }
  lap("layers");
  if (hk) {
    const b = H2.box, HK = B2.HK, hc = B2.hc, cf = CELL.headF[lod], cc = CELL.headC[lod];
    const GH0 = Grid.bands([b[0] - 0.03 * HK, b[3] + 0.03 * HK, cf], [[b[1], hc[1] - 0.135 * HK, cc], [hc[1] - 0.135 * HK, hc[1] + 0.062 * HK, cf], [hc[1] + 0.062 * HK, b[4], cc]], [[b[2], hc[2] - 0.045 * HK, cc], [hc[2] - 0.045 * HK, b[5], cf]]);
    const rgH = regionGrids(GH0.xs, GH0.ys, GH0.zs, R4, 6e-3, "head"), GH = blendRegions(rgH, GH0.xs, GH0.ys, GH0.zs, P3.carve, 6e-3);
    let head = meshGrid(GH, { keep: (x, y, z) => neckD(P3, x, y, z) > -cc * 2 });
    head = clip(head, (x, y, z) => neckD(P3, x, y, z) + 6e-4);
    gradNormals(head, GH);
    addSkin(head, GH, "head", (m) => skinOf(m, rgH.head));
    lap("head");
    for (const L of buildHair({ B: B2, F: F2, H: P3.hair, GH, GB, head, lod, bloodAt })) {
      windToNormals(L.m);
      bucket.add("hair", toGeo(L.m, L.paint, (x, y, z, si, sw, o) => {
        si[o] = BI.head;
        sw[o] = 1;
      }));
    }
    lap("hair");
    for (const e of H2.eyes) bucket.add("eye", eyeGeo(B2, F2, e, lod), lidLines(B2, F2, e, lod, GH));
    const mp = mouthParts(B2, F2, H2.hp, lod);
    if (mp) {
      for (const t of mp.teeth) bucket.add("bone", toGeo(t.m, toothPaint(pc), (x, y, z, si, sw, o) => {
        si[o] = t.bone;
        sw[o] = 1;
      }));
      for (const t of mp.gums.concat([mp.tongue])) bucket.add("gore", toGeo(t.m, null, (x, y, z, si, sw, o) => {
        si[o] = t.bone;
        sw[o] = 1;
      }));
    }
    lap("mouth");
  }
  if (hk) for (const hd of P3.hands) {
    const b = hd.box, ch = CELL.hand[lod], G0 = Grid.box([b[0] - 8e-3, b[1] - 8e-3, b[2] - 8e-3], [b[3] + 8e-3, b[4] + 8e-3, b[5] + 8e-3], ch), GHd = blendRegions(regionGrids(G0.xs, G0.ys, G0.zs, R4, 4e-3, "hands"), G0.xs, G0.ys, G0.zs, P3.carve);
    let hm = meshGrid(GHd, { keep: (x, y, z) => wristD(hd, x, y, z) > -ch * 2 });
    hm = clip(hm, (x, y, z) => wristD(hd, x, y, z) + 6e-4);
    gradNormals(hm, GHd);
    addSkin(hm, GHd, "hand", (m) => skinOf(m), hd);
    lap("hands");
  }
  ms.total = now() - t0;
  const audit = { hidden, seam: (x, y, z) => hk ? Math.min(Math.abs(neckD(P3, x, y, z)), Math.abs(wristD(P3.hands[0], x, y, z)), Math.abs(wristD(P3.hands[1], x, y, z))) : 1, crater: (x, y, z) => craterAt(P3.W, x, y, z, co) };
  return { bucket, joints: J, type, T: B2.T, seed, lod, wounds: P3.wounds, side: B2.side, ms, prep: P3, audit };
}

