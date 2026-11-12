var cl2 = clamp2;
var ss2 = sstep;
var PI2 = Math.PI;
var EYE = [0.032, 0.012, 0.0705];
var EYE_R = 0.0122;
var MOUTH_Y = -0.06;
function facePlan(B2) {
  const R4 = rng(B2.seed * 3571 + 101 + (B2.type === "brute" ? 7 : B2.type === "runner" ? 3 : 0)), rr = (a, b) => a + (b - a) * R4(), t = B2.type, f3 = B2.sex;
  const F2 = {
    jaw: rr(0.92, 1.08) * (t === "brute" ? 1.14 : t === "runner" ? 0.94 : 1) * (f3 ? 0.92 : 1),
    jawLen: rr(0.94, 1.08) * (t === "runner" ? 1.05 : 1),
    chin: rr(0.85, 1.2) * (f3 ? 0.85 : 1),
    brow: rr(0.8, 1.2) * (t === "brute" ? 1.3 : 1) * (f3 ? 0.6 : 1),
    cheek: rr(0.85, 1.25),
    sunk: rr(0.7, 1.2) * (t === "runner" ? 1.35 : t === "brute" ? 0.5 : 1) * (0.7 + 0.5 * B2.lean),
    noseL: rr(0.88, 1.14),
    noseW: rr(0.88, 1.2) * (t === "brute" ? 1.15 : 1),
    bridge: rr(0.7, 1.3),
    hook: rr(-0.4, 1),
    lip: rr(0.7, 1.2) * (f3 ? 1.2 : 1),
    mouthW: rr(0.92, 1.1),
    gap: rr(26e-4, 48e-4),
    eyeX: rr(0.96, 1.05),
    eyeS: rr(0.92, 1.08) * (t === "brute" ? 0.9 : 1),
    tilt: rr(-0.06, 0.12),
    lid: [rr(0.68, 1), rr(0.68, 1)],
    earS: rr(0.9, 1.15),
    earOut: rr(0.25, 0.6),
    skullW: rr(0.97, 1.04) * (t === "brute" ? 1.05 : 1),
    skullH: rr(0.97, 1.05),
    fat: cl2(B2.fat - 0.8, 0, 0.8),
    asym: [rr(-1, 1), rr(-1, 1), rr(-1, 1)],
    torn: -B2.side,
    tornCheek: R4() < (t === "brute" ? 0.35 : 0.7),
    tornLip: R4() < 0.5,
    noEar: R4() < 0.3 ? R4() < 0.5 ? 1 : -1 : 0,
    brokenNose: R4() < 0.3,
    teeth: Array.from({ length: 28 }, () => R4()),
    eyeDead: [R4(), R4()]
  };
  F2.lid[F2.torn > 0 ? 1 : 0] *= 0.6;
  return F2;
}
function headPrims(B2, F2) {
  const hc = B2.hc, HK = B2.HK, out = [], P3 = (p) => {
    out.push(p);
    return p;
  }, hp = (x, y, z) => [hc[0] + x * HK, hc[1] + y * HK, hc[2] + z * HK], S4 = (r) => typeof r === "number" ? r * HK : [r[0] * HK, r[1] * HK, r[2] * HK];
  const E = (c, r, fr) => ell(hp(c[0], c[1], c[2]), S4(r), fr), C2 = (a, b, ra, rb = ra) => cap(hp(a[0], a[1], a[2]), hp(b[0], b[1], b[2]), ra * HK, rb * HK), Sp = (c, r) => sph(hp(c[0], c[1], c[2]), r * HK), k = (v) => v * HK;
  const jw = F2.jaw, jl = F2.jawLen, sw = F2.skullW, sh = F2.skullH, as = F2.asym, cy = -0.096 * jl;
  P3(E([0, 0.03, -0.012], [0.076 * sw, 0.085 * sh, 0.094])).blend(k(0.02));
  P3(E([0, 0.05, 0.034], [0.062 * sw, 0.046 * sh, 0.055])).blend(k(0.026));
  P3(E([0, -0.022, 0.04], [0.052, 0.056, 0.05])).blend(k(0.026));
  P3(E([0, -0.056, 0.058], [0.04 * F2.mouthW, 0.031, 0.032])).blend(k(0.022));
  P3(E([0, cy, 0.062], [0.027 * F2.chin, 0.019, 0.022])).blend(k(0.022));
  P3(E([0, -0.09 * jl, 0.022], [0.034 * jw, 0.018 + 0.012 * F2.fat, 0.042])).blend(k(0.02));
  for (const s of [-1, 1]) {
    const a = 1 + 0.05 * as[0] * s;
    P3(C2([s * 0.02, cy - 4e-3, 0.06], [s * 0.043 * jw, -0.08 * jl, 4e-3], 0.0145, 0.012)).blend(k(0.016));
    P3(C2([s * 0.043 * jw, -0.08 * jl, 4e-3], [s * 0.058 * sw, -0.016, -4e-3], 0.0115, 0.0105)).blend(k(0.016));
    P3(E([s * 0.047 * jw, -0.046, 0.014], [9e-3 + 0.01 * F2.fat, 0.03, 0.02])).blend(k(0.014));
    P3(E([s * 0.05, -8e-3, 0.05], [0.02, 0.014, 0.026 * a])).blend(k(0.021 + 6e-3 / F2.cheek));
    P3(C2([s * 0.055, -6e-3, 0.046], [s * 0.064 * sw, -3e-3, 4e-3], 65e-4, 55e-4)).blend(k(0.022));
    P3(C2([s * 0.011, 0.034, 0.0845], [s * 0.054, 0.0375 + 2e-3 * as[1] * s, 0.064], 98e-4 * F2.brow, 75e-4 * F2.brow)).blend(k(0.019));
    P3(E([s * 0.031, -0.03, 0.056], [0.024, 0.03, 0.026])).blend(k(0.022));
    if (F2.fat > 0.2) P3(E([s * 0.04, -0.04, 0.05], [0.022, 0.026, 0.022 * F2.fat])).blend(k(0.02));
  }
  P3(Sp([0, 0.031, 0.087], 0.0105 * F2.brow)).blend(k(0.012));
  for (const s of [-1, 1]) {
    const ex = s * EYE[0] * F2.eyeX, ey = EYE[1] + 15e-4 * as[2] * s;
    P3(new Dent(hp(s * 0.073 * sw, 0.03, 0.036), S4([0.026, 0.036, 0.038]), 65e-4 * HK * (0.8 + 0.4 * F2.sunk)));
    if (F2.sunk > 0.3) P3(new Dent(hp(s * 0.05, -0.046, 0.05), S4([0.024, 0.03, 0.03]), 65e-4 * HK * F2.sunk));
    P3(E([ex, ey + 1e-3, 0.0845], [0.019, 0.0135, 0.0135 + 4e-3 * F2.sunk])).sub(k(0.022));
  }
  for (const s of [-1, 1]) {
    const i = s > 0 ? 1 : 0, ex = s * EYE[0] * F2.eyeX, ey = EYE[1] + 15e-4 * as[2] * s, er = EYE_R * F2.eyeS, open = 57e-4 * F2.lid[i] * F2.eyeS, fr = euler(0, s * 0.3, s * F2.tilt);
    P3(Sp([ex, ey, EYE[2]], er + 27e-4)).blend(k(0.0125));
    P3(E([ex, ey - 0.0105, EYE[2] + 5e-3], [0.012, 4e-3, 7e-3])).blend(k(8e-3));
    P3(E([ex + s * 1e-3, ey - 12e-4 + (1 - F2.lid[i]) * -12e-4, EYE[2] + er * 0.86], [0.0142 * F2.eyeS, open, 75e-4], fr)).sub(k(12e-4));
    P3(C2([ex - s * 0.013, ey + 85e-4, EYE[2] + 95e-4], [ex + s * 0.012, ey + 92e-4, EYE[2] + 7e-3], 14e-4, 14e-4)).sub(k(4e-3));
    P3(C2([ex - s * 0.012, ey - 0.011, EYE[2] + 0.0105], [ex + s * 6e-3, ey - 0.0155, EYE[2] + 9e-3], 2e-3, 2e-3)).sub(k(6e-3));
  }
  {
    const nl = F2.noseL, nw = F2.noseW, ty = -0.027 * nl, bz = 4e-3 * F2.bridge;
    P3(C2([0, 0.022, 0.082 + bz], [0, -8e-3 * nl, 0.099 + bz + 3e-3 * F2.hook], 68e-4, 82e-4)).blend(k(0.017));
    P3(C2([F2.brokenNose ? 4e-3 : 0, -8e-3 * nl, 0.099 + bz + 3e-3 * F2.hook], [0, ty + 3e-3, 0.108], 74e-4, 84e-4)).blend(k(8e-3));
    P3(Sp([0, ty, 0.1095], 82e-4)).blend(k(9e-3));
    for (const s of [-1, 1]) {
      P3(E([s * 0.0115 * nw, ty - 4e-3, 0.097], [66e-4 * nw, 66e-4, 88e-4])).blend(k(85e-4));
      P3(E([s * 0.012, -0.012, 0.086], [0.011, 0.02, 0.011])).blend(k(0.014));
      P3(C2([s * 65e-4 * nw, ty - 0.0115, 0.1005], [s * 5e-3 * nw, ty - 1e-3, 0.097], 37e-4 * nw, 3e-3)).sub(k(18e-4));
      P3(C2([s * 0.0165 * nw, ty - 1e-3, 0.091], [s * 0.026, -0.052, 0.082], 12e-4, 2e-3)).sub(k(9e-3));
    }
    P3(C2([0, ty - 8e-3, 0.103], [0, -0.0375 * nl, 0.096], 35e-4, 4e-3)).blend(k(4e-3));
  }
  {
    const mw = F2.mouthW, lf = F2.lip, my = MOUTH_Y;
    const arch = (x) => 0.0915 - x * x / 0.062, lipRow = (dy, dz, r0, r1, w) => {
      for (let i = 0; i < 6; i++) {
        const xa = (-1 + i / 3) * w, xb = (-1 + (i + 1) / 3) * w, ra = r0 + (r1 - r0) * (1 - (xa / w) ** 2), rb2 = r0 + (r1 - r0) * (1 - (xb / w) ** 2);
        P3(C2([xa, my + dy - 12e-4 * (xa / w) ** 2 * Math.sign(dy), arch(xa) + dz], [xb, my + dy - 12e-4 * (xb / w) ** 2 * Math.sign(dy), arch(xb) + dz], ra, rb2)).blend(k(75e-4));
      }
    };
    lipRow(52e-4, 0, 22e-4, 46e-4 * lf, 0.0245 * mw);
    P3(Sp([0, my + 44e-4, 0.0945], 32e-4 * lf)).blend(k(5e-3));
    lipRow(-58e-4, -22e-4, 24e-4, 54e-4 * lf, 0.0225 * mw);
    P3(C2([0, my + 0.02, 0.0995], [0, my + 0.0115, 0.0985], 28e-4, 3e-3)).sub(k(4e-3));
    P3(C2([-0.011, my - 0.0185, 0.0885], [0.011, my - 0.0185, 0.0885], 45e-4, 45e-4)).sub(k(0.012));
    P3(E([0, my, 0.084], [0.0238 * mw, F2.gap, 0.019])).sub(k(16e-4));
    for (const s of [-1, 1]) P3(Sp([s * 0.0255 * mw, my - 12e-4, 0.0795], 3e-3)).sub(k(5e-3));
    P3(E([0, my - 3e-3, 0.05], [0.0245, 0.0135, 0.03])).sub(k(3e-3));
    if (F2.tornLip) P3(new Rough(E([F2.torn * 0.011, my + 6e-3, 0.092], [85e-4, 85e-4, 0.013]), 18e-4 * HK, 300, B2.seed)).sub(k(15e-4));
  }
  const ears = [];
  for (const s of [-1, 1]) {
    if (F2.noEar === s) {
      P3(new Rough(E([s * 0.076 * sw, -4e-3, -0.01], [0.01, 0.02, 0.014]), 3e-3 * HK, 160, B2.seed + 3)).sub(k(4e-3)).as("wound");
      continue;
    }
    const th = F2.earOut, es3 = F2.earS, eb = [s * 0.0735 * sw, -5e-3, -9e-3], vb = [s * Math.sin(th), 0.12, -Math.cos(th)], vu = [0, 0.985, 0.17], vn = [s * Math.cos(th), 0, Math.sin(th)];
    const ep = (u, v, w = 0) => [eb[0] + (vu[0] * u + vb[0] * v + vn[0] * w) * es3, eb[1] + (vu[1] * u + vb[1] * v + vn[1] * w) * es3, eb[2] + (vu[2] * u + vb[2] * v + vn[2] * w) * es3];
    const fr = [vn, vu, vb].map((a) => {
      const l = Math.hypot(a[0], a[1], a[2]);
      return [a[0] / l, a[1] / l, a[2] / l];
    }), arc2 = (r0, r1, a0, a1, n, w) => {
      const o = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n);
        o.push(hp(...ep(3e-3 + r0 * Math.sin(a), 75e-4 + r1 * Math.cos(a), w)));
      }
      return o;
    };
    const parts = [
      ell(hp(...ep(2e-3, 75e-4, 5e-4)), S4([26e-4 * es3, 0.0275 * es3, 0.0135 * es3]), fr),
      // the plate of the ear
      chain2(arc2(0.0285, 0.0142, -0.95, 3.6, 12, 22e-4), (t) => k(34e-4 - 8e-4 * t) * es3),
      // helix
      chain2(arc2(0.0165, 75e-4, 0.1, 2.9, 7, 26e-4), k(28e-4) * es3),
      // antihelix
      ell(hp(...ep(-0.0265, 4e-3, 1e-3)), S4([34e-4 * es3, 82e-4 * es3, 68e-4 * es3]), fr),
      // lobe
      sph(hp(...ep(-4e-3, -35e-4, 4e-3)), k(38e-4) * es3)
    ];
    const g2 = new Group2(parts, k(28e-4));
    g2.k = k(35e-4);
    P3(g2);
    P3(ell(hp(...ep(-2e-3, 55e-4, 45e-4)), S4([4e-3 * es3, 95e-4 * es3, 58e-4 * es3]), fr)).sub(k(3e-3));
    P3(ell(hp(...ep(0.016, 9e-3, 48e-4)), S4([3e-3 * es3, 75e-4 * es3, 35e-4 * es3]), fr)).sub(k(3e-3));
    ears.push({ s, c: hp(...ep(0, 6e-3, 0)) });
  }
  if (F2.tornCheek) P3(new Rough(E([F2.torn * 0.04, MOUTH_Y + 2e-3, 0.058], [0.02, 0.0135, 0.022], euler(0, 0, F2.torn * 0.25)), 28e-4 * HK, 210, B2.seed + 5)).sub(k(2e-3)).as("wound");
  const eyes = [-1, 1].map((s) => ({ s, c: hp(s * EYE[0] * F2.eyeX, EYE[1] + 15e-4 * as[2] * s, EYE[2]), r: EYE_R * F2.eyeS * HK }));
  return { prims: out, eyes, ears, hp, box: [hc[0] - 0.105 * HK, hc[1] - 0.2 * HK, hc[2] - 0.115 * HK, hc[0] + 0.105 * HK, hc[1] + 0.125 * HK * F2.skullH, hc[2] + 0.13 * HK] };
}
function eyeSlit(F2, s) {
  const i = s > 0 ? 1 : 0, ex = s * EYE[0] * F2.eyeX, ey = EYE[1] + 15e-4 * F2.asym[2] * s;
  return { c: [ex + s * 1e-3, ey - 12e-4 + (1 - F2.lid[i]) * -12e-4, EYE[2] + EYE_R * F2.eyeS * 0.86], a: 0.0142 * F2.eyeS, b: 57e-4 * F2.lid[i] * F2.eyeS, tilt: F2.tilt };
}
function headLocal(B2, x, y, z, o) {
  o[0] = (x - B2.hc[0]) / B2.HK;
  o[1] = (y - B2.hc[1]) / B2.HK;
  o[2] = (z - B2.hc[2]) / B2.HK;
  return o;
}
function jawWeight(F2, lx3, ly2, lz3) {
  const ax = Math.abs(lx3), mw = F2.mouthW, lipBand = ss2(0.0236 * mw, 85e-4 * mw, ax), under = lipBand > 0 ? ss2(MOUTH_Y + 15e-4, MOUTH_Y - 15e-4, ly2) * lipBand + ss2(MOUTH_Y + 0.016, MOUTH_Y - 0.02, ly2) * (1 - lipBand) : ss2(MOUTH_Y + 0.016, MOUTH_Y - 0.02, ly2);
  return under * ss2(-0.03, 0, lz3) * ss2(-0.135, -0.11, ly2 - lz3 * 0.3);
}
function eyeGeo(B2, F2, e, lod) {
  const er = e.r - [0, 5e-4, 8e-4, 1e-3][lod] * B2.HK, s = e.s, seed = B2.seed, n = [20, 14, 10, 8][lod], mixc4 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const prof = [];
  for (let i = 0; i <= n; i++) {
    const a = -PI2 / 2 + PI2 * i / n;
    let r = Math.cos(a) * er, z = Math.sin(a) * er;
    if (a > 1.05) z += 0.045 * er * ss2(1.05, 1.4, a);
    prof.push([Math.max(0, r), z]);
  }
  const g2 = lathe(prof, n + 4, { axis: "z", crease: 80 }), dead = F2.eyeDead[s > 0 ? 1 : 0], bled = s === F2.torn;
  paint(g2, [1, 1, 1], { jit: 0, fn: (x, y, z) => {
    const rd = Math.hypot(x, y) / er, vn = fbm(Math.atan2(y, x) * 5 + seed, rd * 3, s * 7, 2), ve = fbm(Math.atan2(y, x) * 9 + seed * 2, rd * 6, 3, 2);
    if (z < 0) return [0.3, 0.2, 0.18];
    if (rd < 0.15) return mixc4([0.02, 0.02, 0.022], [0.3, 0.33, 0.33], dead * 0.6);
    if (rd < 0.44) return bled ? mixc4([0.2, 0.035, 0.025], [0.1, 0.012, 0.01], vn) : mixc4(mixc4([0.3, 0.34, 0.32], [0.16, 0.2, 0.23], ss2(0.2, 0.44, rd) * (0.5 + vn)), [0.5, 0.54, 0.53], dead * 0.7);
    if (rd < 0.5) return [0.04, 0.045, 0.05];
    return mixc4(mixc4([0.62, 0.58, 0.5], [0.5, 0.36, 0.28], ss2(0.5, 1, rd)), [0.34, 0.04, 0.03], cl2(ss2(0.62, 1, rd) * 0.45 + ss2(0.52, 0.72, ve) * 0.7));
  } });
  g2.rotateY(s * (0.1 + 0.08 * dead));
  g2.rotateX(0.05 - 0.1 * F2.eyeDead[1]);
  g2.translate(e.c[0], e.c[1], e.c[2]);
  const nv = g2.attributes.position.count, si = new Uint16Array(nv * 4), swt = new Float32Array(nv * 4);
  for (let i = 0; i < nv; i++) {
    si[i * 4] = BI.head;
    swt[i * 4] = 1;
  }
  g2.setAttribute("skinIndex", new BufferAttribute(si, 4));
  g2.setAttribute("skinWeight", new BufferAttribute(swt, 4));
  return g2;
}
function lidLines(B2, F2, e, lod, GH) {
  if (lod > 1) return null;
  const HK = B2.HK, s = e.s, E = eyeSlit(F2, s), n = lod ? 12 : 18, P3 = [], I = [], N = [], C2 = [], ct = Math.cos(s * F2.tilt), st = Math.sin(s * F2.tilt), ex = s * EYE[0] * F2.eyeX, ey = EYE[1] + 15e-4 * F2.asym[2] * s, R4 = e.r + 6e-4 * HK;
  const onGlobe = (u, w, o) => {
    let dx = (E.c[0] + u * ct - w * st - ex) * HK, dy = (E.c[1] + u * st + w * ct - ey) * HK;
    const rr = Math.hypot(dx, dy);
    if (rr > R4 * 0.985) {
      dx *= R4 * 0.985 / rr;
      dy *= R4 * 0.985 / rr;
    }
    o[0] = dx;
    o[1] = dy;
    o[2] = Math.sqrt(R4 * R4 - dx * dx - dy * dy);
    return o;
  }, q = [0, 0, 0];
  const covered = (u, w) => {
    onGlobe(u, w, q);
    const k = 1 + 7e-4 * HK / R4;
    return GH ? GH.at(e.c[0] + q[0] * k, e.c[1] + q[1] * k, e.c[2] + q[2] * k) : E.b * Math.sqrt(Math.max(0, 1 - (u / E.a) ** 2)) - Math.abs(w);
  };
  const margin = (u, up) => {
    const st2 = 3e-4;
    let f0 = covered(u, 0);
    if (!(f0 > 0)) return -1;
    for (let w = st2; w < 0.014; w += st2) {
      const f1 = covered(u, up * w);
      if (!(f1 > 0)) return w - st2 + st2 * f0 / (f0 - f1 || 1);
      f0 = f1;
    }
    return -1;
  };
  const row = (up, in0, out1, c0, c1) => {
    const base = P3.length / 3;
    let prev = 0;
    for (let i = 0; i <= n; i++) {
      const t = i / n * 2.1 - 1.05, u = E.a * t;
      let wm = margin(u, up);
      const open = wm >= 0;
      if (open) prev = wm;
      else wm = prev;
      for (const [v, c] of [[wm - in0, c0], [wm + out1, c1]]) {
        onGlobe(u, up * (open ? Math.max(v, wm * 0.3) : v + in0), q);
        P3.push(e.c[0] + q[0], e.c[1] + q[1], e.c[2] + q[2]);
        N.push(q[0] / R4, q[1] / R4, q[2] / R4);
        const k = open ? 1 : 0;
        C2.push(c[0] * k, c[1] * k, c[2] * k);
      }
      if (i < n) {
        const a = base + i * 2;
        I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  };
  row(1, 11e-4, 7e-4, [0.06, 0.035, 0.035], [0.015, 0.01, 0.01]);
  row(-1, 8e-4, 6e-4, [0.82, 0.68, 0.64], [0.55, 0.24, 0.22]);
  const m = { P: new Float32Array(P3), I: new Uint32Array(I), N: new Float32Array(N) };
  windToNormals(m);
  return toGeo(m, (i, x, y, z, nx, ny, nz, o) => {
    o.c[0] = C2[i * 3];
    o.c[1] = C2[i * 3 + 1];
    o.c[2] = C2[i * 3 + 2];
  }, (x, y, z, si, sw, o) => {
    si[o] = BI.head;
    sw[o] = 1;
  });
}
function mouthParts(B2, F2, hp, lod) {
  const HK = B2.HK, cell = [12e-4, 16e-4, 28e-4, 0][lod] * HK;
  if (!cell) return null;
  const res = { teeth: [], gums: [] };
  for (const up of [1, -1]) {
    const prims = [], gum = [], y0 = MOUTH_Y + up * (up > 0 ? 12e-4 : -6e-4), zf = up > 0 ? 0.0822 : 0.0802, hw = up > 0 ? 0.0235 : 0.0218, pts = [];
    for (let i = 0; i < 14; i++) {
      const u = (i - 6.5) / 6.5, a = u * 1.32, x = Math.sin(a) * hw * (1 + 0.12 * u * u), z = zf - (1 - Math.cos(a)) * 0.034, cls = Math.abs(i - 6.5) < 2 ? 0 : Math.abs(i - 6.5) < 3 ? 1 : Math.abs(i - 6.5) < 5 ? 2 : 3, rnd = F2.teeth[i + (up > 0 ? 0 : 14)];
      pts.push(hp(x, y0 + up * 85e-4, z - 2e-3));
      if (rnd < 0.14) continue;
      const broken = rnd < 0.26, uneven = 0.84 + 0.3 * (rnd * 7.31 % 1), hgt = [98e-4, 0.0112, 82e-4, 7e-3][cls] * (broken ? 0.5 : uneven) * (up > 0 ? 1 : 0.88), w = [205e-5, 2e-3, 23e-4, 3e-3][cls] * (up > 0 || cls > 1 ? 1 : 0.9) * (0.92 + 0.16 * (rnd * 3.17 % 1)), dp = [26e-4, 34e-4, 4e-3, 48e-4][cls], fr = euler(up * 0.12 * (cls < 2 ? 1 : 0.2) + (rnd - 0.5) * 0.2, a, (rnd - 0.6) * 0.3);
      const c = hp(x, y0 - up * (hgt * 0.5 - 35e-4) + up * 35e-4, z);
      if (cls === 1) prims.push(new Group2([rbox(c, [w * HK, hgt * 0.5 * HK, dp * HK], 12e-4 * HK, fr), sph(hp(x, y0 - up * (hgt - 35e-4) + up * 35e-4, z), 18e-4 * HK)], 16e-4 * HK).blend(2e-4));
      else prims.push(rbox(c, [w * HK, hgt * 0.5 * HK, dp * HK * (cls === 0 ? 1 - 0 : 1)], (cls === 0 ? 9e-4 : 13e-4) * HK, fr).blend(2e-4));
    }
    const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of pts) for (let a = 0; a < 3; a++) {
      bb[a] = Math.min(bb[a], p[a]);
      bb[a + 3] = Math.max(bb[a + 3], p[a]);
    }
    const pad = 0.012 * HK, G4 = Grid.box([bb[0] - pad, bb[1] - pad * 1.3, bb[2] - pad], [bb[3] + pad, bb[4] + pad * 1.3, bb[5] + pad], cell).add(prims, cell * 2), m = meshGrid(G4, { smooth: 0 });
    m.G = G4;
    res.teeth.push({ m, bone: up > 0 ? BI.head : BI.jaw });
    const G22 = Grid.box([bb[0] - pad, bb[1] - pad, bb[2] - pad], [bb[3] + pad, bb[4] + pad, bb[5] + pad], cell * 1.5).add([chain2(pts, 58e-4 * HK)], cell * 2), m2 = meshGrid(G22);
    m2.G = G22;
    res.gums.push({ m: m2, bone: up > 0 ? BI.head : BI.jaw });
  }
  {
    const c = hp(0, MOUTH_Y - 75e-4, 0.052), G4 = Grid.box([c[0] - 0.024 * HK, c[1] - 0.012 * HK, c[2] - 0.034 * HK], [c[0] + 0.024 * HK, c[1] + 0.012 * HK, c[2] + 0.034 * HK], cell * 1.6).add([ell(c, [0.0165 * HK, 62e-4 * HK, 0.026 * HK]).blend(3e-3), cap(hp(0, MOUTH_Y - 1e-3, 0.036), hp(0, MOUTH_Y - 1e-3, 0.08), 16e-4 * HK, 16e-4 * HK).sub(4e-3)], cell * 2);
    const m = meshGrid(G4);
    m.G = G4;
    res.tongue = { m, bone: BI.jaw };
  }
  return res;
}

