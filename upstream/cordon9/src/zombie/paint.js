var ss8 = sstep;
var cl6 = clamp2;
var bell5 = (x) => Math.exp(-x * x);
var mixc2 = (a, b, t) => {
  a[0] += (b[0] - a[0]) * t;
  a[1] += (b[1] - a[1]) * t;
  a[2] += (b[2] - a[2]) * t;
  return a;
};
var ORBIT = [0.66, 0.42, 0.47];
var LID = [0.62, 0.26, 0.25];
var LIP = [0.66, 0.38, 0.4];
var NECRO = [0.8, 0.86, 0.7];
var LIVOR = [0.78, 0.56, 0.7];
var BRUISE = [0.52, 0.34, 0.5];
var DARK = [0.06, 0.012, 0.012];
var NAIL = [0.5, 0.46, 0.36];
var RAW = [0.42, 0.07, 0.06];
var FAT = [1, 0.84, 0.5];
var WARM = [1, 0.66, 0.6];
function feedField(B2) {
  const s3 = B2.seed * 2.9, hl = [0, 0, 0], amt = cl6(0.6 + 0.6 * hash3(B2.seed * 3.3, 1.7, 9.1)), lean = (hash3(B2.seed * 1.3, 4.1, 2.2) - 0.5) * 0.03 + B2.side * 6e-3, RV = [];
  for (let i = 0; i < 9; i++) {
    const h = (a) => hash3(B2.seed * 1.9 + i * 3.7, a, 5.3);
    RV.push({ x: (h(1) - 0.5) * 0.046, w: 5e-3 + 5e-3 * h(2), len: 0.06 + 0.32 * h(3) ** 1.6, ph: h(4) * 30, to: (h(5) - 0.5) * 0.05 + lean, k: 0.75 + 0.35 * h(6) });
  }
  return (x, y, z) => {
    headLocal(B2, x, y, z, hl);
    const lx3 = hl[0], dy = hl[1] - MOUTH_Y, lz3 = hl[2];
    if (dy > 4e-3 || dy < -0.4 || lz3 < -0.02) return 0;
    const d = -dy, t = cl6(d / 0.36), front = ss8(-0.02, 0.035, lz3), mid = lx3 - lean * t, sheet2 = bell5(mid / (0.016 + 0.03 * t)) * ss8(0, 0.022, d) * ss8(0.2, 0.05, d) * 1.1;
    let run = 0;
    for (const r of RV) {
      if (d > r.len) continue;
      const u = d / r.len, cx = r.x + (r.to - r.x) * u + 4e-3 * Math.sin(r.ph + d * 55) * u, w = r.w * (1 + 4 * ss8(0.12, 0.36, d)), v = bell5((lx3 - cx) / w) * r.k * ss8(1, 0.75, u) * ss8(0, 0.012, d);
      if (v > run) run = v;
    }
    return amt * front * Math.max(sheet2, run);
  };
}
function skinPaint(ctx, m, G4, part, hand2 = null) {
  const { B: B2, F: F2, O: O2, wounds, bloodAt, grime } = ctx;
  ctx.noseSide = hash3(B2.seed * 7.1, 3.3, 1.1) < 0.5 ? -1 : 1;
  ctx.noseBoth = hash3(B2.seed * 5.7, 8.3, 2.1) < 0.4 ? 0.9 : 0;
  const seed = B2.seed, s3 = seed * 1.9, ao = fieldAO(m, G4, part === "head" ? 7e-3 : part === "hand" ? 6e-3 : 0.014), ao2 = part === "head" ? fieldAO(m, G4, 0.02) : ao, hl = [0, 0, 0], T3 = O2.skinT, c = [1, 1, 1], age = B2.age;
  const J = B2.J, yKnee = J.shinL[1], wr = ctx.hands.map((h) => h.wrist), o = { i: -1 };
  return (i, x, y, z, nx, ny, nz, out) => {
    const n1 = fbm(x * 26 + seed, y * 26, z * 26, 3), n2 = fbm(x * 7 + s3, y * 7, z * 7, 3), a = ao[i], a2 = ao2[i];
    c[0] = T3[0];
    c[1] = T3[1];
    c[2] = T3[2];
    let blood = bloodAt(x, y, z), dirt2 = grime(x, y, z) * 0.5, k = 0.98 + 0.08 * n1;
    const n3 = fbm(x * 4.1 + s3, y * 4.1 + 7.7, z * 4.1, 3);
    mixc2(c, NECRO, ss8(0.63, 0.8, n2) * (0.14 + 0.3 * age));
    mixc2(c, BRUISE, ss8(0.64, 0.78, n3) * (0.3 + 0.25 * n1));
    const dw = Math.min(Math.hypot(x - wr[0][0], y - wr[0][1], z - wr[0][2]), Math.hypot(x - wr[1][0], y - wr[1][1], z - wr[1][2]));
    mixc2(c, LIVOR, cl6(ss8(0.22, 0.02, dw) * 0.4 + ss8(yKnee, yKnee * 0.4, y) * 0.4) * (0.4 + 0.6 * n2));
    if (part === "head") {
      headLocal(B2, x, y, z, hl);
      const lx3 = hl[0], ly2 = hl[1], lz3 = hl[2], ax = Math.abs(lx3), de = Math.hypot(ax - EYE[0], (ly2 - EYE[1]) * 1.25, (lz3 - EYE[2]) * 0.6), dm = Math.hypot(lx3 * 0.75, ly2 - MOUTH_Y, (lz3 - 0.092) * 0.7);
      mixc2(c, ORBIT, 0.7 * bell5(de / 0.021));
      mixc2(c, LID, 0.8 * bell5(de / 95e-4));
      mixc2(c, LIP, 0.75 * bell5(dm / 0.013) * ss8(0.07, 0.085, lz3));
      mixc2(c, WARM, 0.5 * bell5(Math.hypot(lx3 * 0.8, ly2 + 0.03, (lz3 - 0.104) * 0.9) / 0.013) + 0.6 * ss8(0.066, 0.076, ax) * bell5(Math.hypot(ly2 + 4e-3, lz3 + 0.012) / 0.034) + 0.16 * bell5(Math.hypot(ax - 0.04, ly2 + 0.03, lz3 - 0.075) / 0.02));
      if (ctx.hair) mixc2(c, [0.4, 0.34, 0.32], 0.6 * ss8(0.05, 0.6, browAt(ctx.hair, lx3, ly2, lz3)) * (0.6 + 0.6 * n1));
      mixc2(c, [0.62, 0.5, 0.47], 0.25 * bell5(Math.hypot(ax - 0.05, ly2 + 0.012, lz3 - 0.06) / 0.022));
      const inMouth = ss8(0.088, 0.078, lz3) * ss8(0.034, 0.028, ax) * ss8(0.02, 0.012, Math.abs(ly2 - MOUTH_Y + 4e-3));
      mixc2(c, DARK, inMouth * 0.92);
      const nost = bell5(Math.hypot(ax - 85e-4, ly2 + 0.036, lz3 - 0.097) / 52e-4);
      mixc2(c, DARK, nost * 0.85);
      const drip = fbm(lx3 * 210 + seed, ly2 * 14, lz3 * 60, 2), fed = Math.max(bell5(dm / 0.021) * (0.55 + 0.6 * n2) * ss8(MOUTH_Y + 0.016, MOUTH_Y - 6e-3, ly2), ss8(MOUTH_Y + 4e-3, MOUTH_Y - 0.02, ly2) * bell5(lx3 / (0.022 + 0.014 * n2)) * ss8(0.02, 0.06, lz3) * ss8(0.42, 0.6, drip) * (0.5 + 0.7 * n2));
      if (fed > blood) blood = fed;
      const ns = ctx.noseSide, nb2 = (lx3 * ns > 0 ? 1 : ctx.noseBoth) * bell5((ax - 8e-3 - 4e-3 * (drip - 0.5)) / 42e-4) * ss8(-0.033, -0.039, ly2) * ss8(MOUTH_Y - 4e-3, MOUTH_Y + 4e-3, ly2) * ss8(0.08, 0.09, lz3) * (0.8 + 0.5 * drip);
      if (nb2 > blood) blood = nb2;
      if (ctx.hair) {
        mixc2(c, [0.5, 0.47, 0.46], 0.55 * scalpAt(ctx.hair, lx3, ly2, lz3) * (0.6 + 0.5 * n1));
        mixc2(c, [0.42, 0.4, 0.42], 0.5 * stubbleAt(ctx.hair, lx3, ly2, lz3) * (0.5 + 0.9 * n1));
      }
      k *= 0.72 + 0.28 * a2;
    } else if (part === "hand") {
      const hd = hand2, dx = x - hd.wrist[0], dy = y - hd.wrist[1], dz = z - hd.wrist[2], along = dx * hd.axis[0] + dy * hd.axis[1] + dz * hd.axis[2];
      let kw = 0;
      for (const q of hd.knuckles) {
        const d2 = (x - q[0]) ** 2 + (y - q[1]) ** 2 + (z - q[2]) ** 2;
        if (d2 < 4e-4) kw = Math.max(kw, Math.exp(-d2 / 6e-5));
      }
      mixc2(c, WARM, 0.42 * kw);
      for (const nl of hd.nails) {
        const ex = x - nl.p[0], ey = y - nl.p[1], ez = z - nl.p[2], d2 = ex * ex + ey * ey + ez * ez;
        if (d2 > nl.l * nl.l * 1.2) continue;
        const al = (ex * nl.dir[0] + ey * nl.dir[1] + ez * nl.dir[2]) / (nl.l * 0.62), up = ex * nl.up[0] + ey * nl.up[1] + ez * nl.up[2], sd = Math.sqrt(Math.max(0, d2 - (al * nl.l * 0.62) ** 2 - up * up)) / (nl.w * 0.5);
        if (up > -35e-4 && al * al + sd * sd < 1) {
          mixc2(c, NAIL, 0.85);
          mixc2(c, DARK, 0.5 * ss8(0.3, 0.9, al));
          k *= 1.1;
        }
      }
      const grab = ss8(0.07, 0.15, along) * (0.45 + 0.7 * n2) * (hd.side === B2.side ? 1 : 0.6);
      if (grab > blood) blood = grab;
      mixc2(c, BRUISE, 0.35 * ss8(0.1, 0.17, along));
    }
    const cr = craterAt(wounds, x, y, z, o);
    if (cr > 0) {
      const fat = ss8(0.06, 0.13, cr) * (0.55 + 0.45 * ss8(0.25, 0.6, n1));
      mixc2(c, RAW, cl6(cr * 12) * (1 - fat));
      mixc2(c, FAT, fat);
      k *= 1 + 0.25 * fat;
      blood = 1 - fat * (0.56 - 0.5 * n2) - 0.3 * fat * ss8(0.5, 0.7, n1);
    } else for (const w of wounds) {
      const d = Math.hypot(x - w.p[0], y - w.p[1], z - w.p[2]) / (w.r * w.el);
      if (d < 2.2) mixc2(c, BRUISE, 0.75 * ss8(2.2, 1, d));
    }
    k *= 0.66 + 0.4 * a;
    out.c[0] = c[0] * k;
    out.c[1] = c[1] * k;
    out.c[2] = c[2] * k;
    out.m[0] = cl6(blood);
    out.m[1] = cl6((1 - a) * 0.35 + dirt2);
  };
}
function gorePaint(ctx, m, kind = "wall") {
  const { B: B2, wounds } = ctx, s3 = B2.seed * 3.1, o = { i: -1 }, ao = m.ao;
  return (i, x, y, z, nx, ny, nz, out) => {
    const n = fbm(x * 70 + s3, y * 70, z * 70, 3), n2 = fbm(x * 19, y * 19 + s3, z * 19, 2), d = kind === "wall" ? craterAt(wounds, x, y, z, o) : 0.4, a = ao ? ao[i] : 1;
    let r = 1.55, g2 = 0.2, b = 0.15;
    if (kind === "gut") {
      const ves = ss8(0.6, 0.72, fbm(x * 45 + s3, y * 130, z * 45, 2));
      r = 0.78 - 0.3 * ves;
      g2 = 0.5 - 0.36 * ves;
      b = 0.47 - 0.35 * ves;
    }
    const fat = kind === "wall" ? ss8(0.36, 0.14, d) * (0.5 + 0.5 * ss8(0.3, 0.6, n)) : 0, k = (0.55 + 0.45 * a) * (0.72 + 0.5 * n) * (1 - 0.45 * ss8(0.5, 1, d));
    r = (r + (0.8 - r) * fat) * k;
    g2 = (g2 + (0.62 - g2) * fat) * k;
    b = (b + (0.34 - b) * fat) * k;
    out.c[0] = r;
    out.c[1] = g2;
    out.c[2] = b;
    out.m[0] = kind === "gut" ? cl6(0.35 + 0.6 * n2) : cl6(0.75 + 0.5 * n2 - fat);
    out.m[1] = cl6((1 - a) * 0.8);
  };
}
function gutPaint(ctx, m) {
  const s3 = ctx.B.seed * 3.7, ao = m.ao;
  return (i, x, y, z, nx, ny, nz, out) => {
    const n = fbm(x * 60 + s3, y * 60, z * 60, 2), n2 = fbm(x * 24, y * 24 + s3, z * 24, 2), ves = ss8(0.58, 0.7, fbm(x * 45 + s3, y * 150, z * 45, 2)), a = ao ? ao[i] : 1, k = (0.7 + 0.3 * a) * (0.9 + 0.2 * n);
    out.c[0] = (1 - 0.3 * ves) * k;
    out.c[1] = (0.74 - 0.4 * ves) * k;
    out.c[2] = (0.74 - 0.36 * ves) * k;
    out.m[0] = cl6(0.3 + 0.75 * n2 + 0.3 * (1 - a));
    out.m[1] = 0;
  };
}
function toothPaint(ctx) {
  const B2 = ctx.B, hl = [0, 0, 0], s3 = B2.seed * 5.3;
  return (i, x, y, z, nx, ny, nz, out) => {
    headLocal(B2, x, y, z, hl);
    const ax = Math.abs(hl[0]), up = hl[1] > MOUTH_Y ? 1 : 0, n = fbm(x * 300 + s3, y * 300, z * 300, 2), n2 = fbm(x * 90, y * 90 + s3, z * 90, 2), back = ss8(0.01, 0.028, ax), gum = ss8(3e-3, 78e-4, Math.abs(hl[1] - MOUTH_Y));
    const ti = Math.round(Math.asin(cl6(hl[0] / (up ? 0.0255 : 0.0238), -1, 1)) / 1.32 * 6.5 + 6.5), h1 = hash3(ti * 1.7 + s3, up * 3.1, 0.7), h2 = hash3(ti * 2.3, up * 5.9 + s3, 1.9), dead = h2 < 0.16 ? 0.55 : 0;
    const k = (0.74 - 0.3 * back) * (0.72 + 0.4 * h1) * (1 - dead) * (0.85 + 0.3 * n), old = cl6(gum * (0.75 + 0.5 * n2) + 0.35 * ss8(0.55, 0.75, n2));
    let r = k, g2 = k * (1 - 0.1 * h2 - 0.05 * n2), b = k * (1.08 - 0.22 * h2 - 0.1 * n2);
    r += (0.2 - r) * old;
    g2 += (0.045 - g2) * old;
    b += (0.035 - b) * old;
    out.c[0] = r;
    out.c[1] = g2;
    out.c[2] = b;
    out.m[0] = 0;
    out.m[1] = cl6(0.2 + 0.5 * gum);
  };
}
function bonePaint(ctx, m) {
  const s3 = ctx.B.seed * 2.7, ao = m.ao;
  return (i, x, y, z, nx, ny, nz, out) => {
    const n = fbm(x * 60 + s3, y * 60, z * 60, 2), n2 = fbm(x * 21, y * 21 + s3, z * 21, 2), a = ao ? ao[i] : 1, k = (0.5 + 0.5 * a) * (0.8 + 0.3 * n);
    out.c[0] = 0.92 * k;
    out.c[1] = 0.84 * k;
    out.c[2] = 0.7 * k;
    out.m[0] = cl6(ss8(0.42, 0.62, n2) + (1 - a) * 0.8);
    out.m[1] = cl6(1 - a);
  };
}

