var BONES = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "jaw",
  "armL",
  "foreL",
  "handL",
  "armR",
  "foreR",
  "handR",
  "thighL",
  "shinL",
  "footL",
  "thighR",
  "shinR",
  "footR",
  // appended helper bones: twist (upper arm, forearm, thigh) and half-angle correctives (elbow, knee). rig.js drives them from the bones above.
  "armTwL",
  "armTwR",
  "foreTwL",
  "foreTwR",
  "thighTwL",
  "thighTwR",
  "elbowL",
  "elbowR",
  "kneeL",
  "kneeR"
];
var BI = Object.fromEntries(BONES.map((n, i) => [n, i]));
var PARENT = {
  spine: "hips",
  chest: "spine",
  neck: "chest",
  head: "neck",
  jaw: "head",
  armL: "chest",
  foreL: "armL",
  handL: "foreL",
  armR: "chest",
  foreR: "armR",
  handR: "foreR",
  thighL: "hips",
  shinL: "thighL",
  footL: "shinL",
  thighR: "hips",
  shinR: "thighR",
  footR: "shinR",
  armTwL: "chest",
  armTwR: "chest",
  foreTwL: "foreL",
  foreTwR: "foreR",
  thighTwL: "hips",
  thighTwR: "hips",
  elbowL: "armL",
  elbowR: "armR",
  kneeL: "thighL",
  kneeR: "thighR"
};
var NBASE = 18;
var ARM_A = 0.66;
var TYPES = {
  walker: { h: 1, bulk: 1, sh: 0.97, belly: 1, hunch: 0.2, headK: 1.06, outfit: "commuter", speed: 0.85, hp: 100, fat: 0.8, muscle: 0.85, age: 0.5 },
  runner: { h: 0.97, bulk: 0.86, sh: 0.93, belly: 0.75, hunch: 0.25, headK: 1.04, outfit: "patient", speed: 2.6, hp: 60, fat: 0.25, muscle: 0.7, age: 0.35 },
  brute: { h: 1.07, bulk: 1.27, sh: 1, belly: 1.55, hunch: 0.16, headK: 1.17, trap: 1, outfit: "guard", speed: 0.65, hp: 320, fat: 1.35, muscle: 1.25, age: 0.55 }
};
var cl = clamp2;
var ss = sstep;
var mix = lerp2;
var add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
var len3 = (a) => Math.hypot(a[0], a[1], a[2]);
function bodyPlan(type, seed) {
  const T3 = TYPES[type], R4 = rng(seed * 7919 + 13), rr = (a, b) => a + (b - a) * R4(), h = T3.h, bk = T3.bulk, aK = T3.sh * (0.4 + 0.6 * T3.bulk);
  const side2 = R4() < 0.5 ? 1 : -1;
  const sex = type === "brute" ? 0 : (seed * 7 + (type === "runner" ? 1 : 0)) % 3 === 2 ? 1 : 0;
  const B2 = {
    type,
    seed,
    T: T3,
    h,
    bk,
    aK,
    side: side2,
    sex,
    fat: cl(T3.fat * rr(0.8, 1.25), 0.1, 1.7),
    muscle: cl(T3.muscle * rr(0.85, 1.15), 0.4, 1.5),
    age: cl(T3.age + rr(-0.2, 0.3)),
    belly: T3.belly * rr(0.9, 1.15),
    hunch: T3.hunch,
    trap: T3.trap || 0,
    asym: [rr(-1, 1), rr(-1, 1), rr(-1, 1), rr(-1, 1)],
    lean: 0
  };
  if (sex) {
    B2.muscle *= 0.8;
    B2.belly *= 0.9;
  }
  B2.lean = cl(1.1 - B2.fat * 1.1);
  const hw = sex ? 1.06 : 1, sw = sex ? 0.9 : 1, sA = Math.sin(ARM_A), cA = Math.cos(ARM_A), LU = 0.272 * h, LF = 0.268 * h;
  const J = {
    hips: [0, 0.98 * h, 0],
    spine: [0, 1.1 * h, 0],
    chest: [0, 1.27 * h, 5e-3],
    neck: [0, 1.47 * h, 0],
    head: [0, 1.555 * h, 0.012],
    jaw: [0, 1.605 * h, 0.02],
    armL: [0.185 * aK * sw, 1.42 * h, -0.01],
    thighL: [0.092 * bk, 0.93 * h, 0],
    shinL: [0.1 * bk, 0.5 * h, 0.012],
    footL: [0.1 * bk, 0.085, -5e-3]
  };
  J.foreL = [J.armL[0] + sA * LU, J.armL[1] - cA * LU, -0.012];
  J.handL = [J.foreL[0] + sA * LF, J.foreL[1] - cA * LF, 0.018];
  for (const n of ["arm", "fore", "hand", "thigh", "shin", "foot"]) {
    const l = J[n + "L"];
    J[n + "R"] = [-l[0], l[1], l[2]];
  }
  for (const s of ["L", "R"]) {
    J["armTw" + s] = J["arm" + s];
    J["foreTw" + s] = J["fore" + s];
    J["thighTw" + s] = J["thigh" + s];
    J["elbow" + s] = J["fore" + s];
    J["knee" + s] = J["shin" + s];
  }
  B2.J = J;
  B2.hw = hw;
  B2.sw = sw;
  B2.hu = T3.hunch * 0.12;
  B2.zo = (y) => B2.hu * 1.4 * ss(1.12 * h, 1.52 * h, y);
  B2.hc = [0, 1.64 * h, 0.012 + B2.hu * 1.4];
  B2.HK = T3.headK;
  B2.curl = [-1, 1].map(() => [0, 1, 2, 3].map((f3) => [rr(0.15, 0.5), rr(0.35, 0.9), rr(0.2, 0.6)]));
  return B2;
}
function limb(a, b, s) {
  const F2 = frame(sub3(b, a), [0, 0, 1]), lat = mul3(F2[0], -s), L = len3(sub3(b, a));
  const FF = [lat, F2[1], F2[2]];
  return { a, b, L, F: FF, at: (t, l = 0, f3 = 0, o = 0) => [a[0] + (b[0] - a[0]) * t + lat[0] * l + F2[2][0] * f3 + F2[1][0] * o, a[1] + (b[1] - a[1]) * t + lat[1] * l + F2[2][1] * f3 + F2[1][1] * o, a[2] + (b[2] - a[2]) * t + lat[2] * l + F2[2][2] * f3 + F2[1][2] * o] };
}
function bodyPrims(B2) {
  const { h, bk, aK, J, zo, sex, lean } = B2, mu = 0.8 + 0.22 * B2.muscle, fa = B2.fat, by = B2.belly, w = bk * B2.hw, sw = B2.sw, out = [], P3 = (p) => {
    out.push(p);
    return p;
  };
  const tp = (x, y, z) => [x, y * h, z + zo(y * h)];
  P3(ell(tp(0, 0.955, -8e-3), [0.15 * w, 0.1, 0.098 * bk])).blend(0.03);
  P3(ell(tp(0, 1.075, 6e-3), [0.127 * bk, 0.14, 0.08 * bk * (0.92 + 0.08 * by)])).blend(0.035);
  P3(ell(tp(0, 1.045 - 0.02 * (by - 1), 0.03 + 0.045 * (by - 1)), [0.1 * bk * (0.8 + 0.2 * by), 0.1 + 0.03 * (by - 1), 0.05 * bk * by])).blend(0.04);
  if (fa > 1) P3(ell(tp(0, 0.985, 0.06 * by), [0.12 * bk, 0.045, 0.045 * by])).blend(0.03);
  for (const s of [-1, 1]) {
    const a = 1 + 0.03 * B2.asym[0] * s;
    P3(ell(tp(s * 0.076 * w, 0.91, -0.05 * bk), [0.08 * w * a, 0.088, 0.068 * bk * (sex ? 1.08 : 1)])).blend(0.035);
    P3(ell(tp(s * 0.128 * w, 0.925, -4e-3), [0.04 * w, 0.1, 0.066 * bk])).blend(0.04);
    P3(ell(tp(s * 0.108 * bk, 1.06, 0), [0.04 * bk * (0.85 + 0.25 * fa), 0.09, 0.064 * bk])).blend(0.045);
    P3(cap(tp(s * 0.128 * w, 1.025, -0.02), tp(s * 0.092 * w, 0.985, 0.078 * bk), 0.014, 0.012)).blend(0.014 + 0.03 * (1 - lean));
    P3(ell(tp(s * 0.045 * bk, 1.1, 0.07 * bk), [0.034 * bk * mu, 0.1, 0.02], euler(0.05, 0, 0))).blend(0.018);
  }
  P3(sph(tp(0, 1.045, 0.083 * bk * (0.9 + 0.1 * by) + 0.05 * (by - 1)), 65e-4)).sub(8e-3);
  P3(ell(tp(0, 1.26, -4e-3), [0.146 * bk * mix(1, sw, 0.5), 0.165, 0.1 * bk])).blend(0.03);
  P3(ell(tp(0, 1.4, -0.052), [0.125 * bk * sw, 0.085, 0.056 * bk])).blend(0.03);
  P3(ell(tp(0, 1.385, 0.014), [0.152 * bk * mix(1, sw, 0.5), 0.085, 0.08 * bk])).blend(0.035);
  for (const s of [-1, 1]) {
    const a = 1 + 0.03 * B2.asym[1] * s, sx = J.armL[0] * s;
    if (sex) P3(ell(tp(s * 0.07 * bk, 1.3, 0.082 * bk), [0.052 * bk, 0.054, 0.044 * bk * (0.8 + 0.3 * fa)])).blend(0.02);
    else P3(ell(tp(s * 0.075 * bk, 1.352, 0.06 * bk), [0.09 * bk * a, 0.076, 0.037 * bk * mu * (0.9 + 0.2 * fa)], euler(0, 0, s * 0.18))).blend(0.03);
    P3(ell(tp(s * 0.124 * bk, 1.25, -0.04 * bk), [0.044 * bk * mu, 0.13, 0.058 * bk])).blend(0.025);
    P3(cap(tp(s * 0.05, 1.452, -0.012), [sx * 0.9, J.armL[1] + 0.012, J.armL[2] + zo(1.42 * h)], 0.046 * bk, 0.043 * bk)).blend(0.025);
    P3(cap(tp(s * 0.03, 1.535, -0.026), [sx * 0.86, J.armL[1] + 0.04, -0.02 + zo(1.45 * h)], 0.024 + 0.014 * B2.trap, 0.028 * bk)).blend(0.03);
    P3(cap(tp(s * 0.018, 1.452, 0.058), [sx * 0.9, J.armL[1] + 0.042, 0.01 + zo(1.46 * h)], 95e-4, 85e-4)).blend(6e-3 + 0.014 * (1 - lean));
    P3(ell(tp(s * 0.086 * bk, 1.36, -0.092 * bk), [0.05 * bk, 0.066, 0.018], euler(0, s * 0.35, s * 0.2))).blend(0.012 + 0.01 * fa);
    if (lean > 0.25) for (let i = 0; i < 7; i++) {
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const a2 = 0.28 + k / 6 * 1.5, y = 1.345 - i * 0.031 - 0.022 * Math.cos(a2) * (1 + i * 0.2), ry = cl(1 - Math.pow((y - 1.26) / 0.165, 2), 0.05, 1), rr2 = Math.sqrt(ry);
        pts.push(tp(s * Math.sin(a2) * 0.146 * bk * sw * rr2 * 0.99, y, Math.cos(a2) * 0.1 * bk * rr2 * 0.99 - 4e-3));
      }
      P3(chain2(pts, 62e-4)).blend(4e-3 + 0.012 * (1 - lean));
    }
  }
  P3(sph(tp(0, 1.458, 0.064), 0.013)).sub(0.012);
  P3(cap(tp(0, 1.08, -0.1 * bk - 4e-3), tp(0, 1.41, -0.112 * bk), 9e-3, 0.011)).sub(0.016);
  if (!sex) P3(cap(tp(0, 1.29, 0.105 * bk), tp(0, 1.4, 0.092 * bk), 6e-3, 6e-3)).sub(0.014);
  const nk = 0.92 + 0.1 * bk + 0.1 * B2.trap;
  P3(cap(tp(0, 1.455, -0.01), [0, 1.605 * h, 2e-3 + B2.hu * 1.4], 0.054 * nk, 0.049 * nk)).blend(0.02).as("neck");
  for (const s of [-1, 1]) P3(cap(tp(s * 0.016, 1.458, 0.046), [s * 0.06 * nk, 1.615 * h, -0.02 + B2.hu * 1.4], 0.0125, 0.011)).blend(8e-3 + 0.01 * fa).as("neck");
  P3(ell(tp(0, 1.535, 0.045 * nk), [0.0125, 0.02, 0.012])).blend(0.01).as("neck");
  P3(sph(tp(0, 1.478, -0.058), 0.016)).blend(0.014);
  const nT = out.length;
  for (const s of [-1, 1]) {
    const S4 = J[s > 0 ? "armL" : "armR"], E = J[s > 0 ? "foreL" : "foreR"], W = J[s > 0 ? "handL" : "handR"], U = limb(S4, E, s), F2 = limb(E, W, s), a = (1 + 0.04 * B2.asym[2] * s) * bk, m = mu * a;
    P3(ell(U.at(0.1, 0.01, 0), [0.054 * m, 0.086, 0.057 * m], U.F)).blend(0.022);
    P3(cap(U.at(0.06), U.at(1), 0.042 * a, 0.035 * a)).blend(0.02);
    P3(ell(U.at(0.52, -2e-3, 0.016), [0.032 * m, 0.105, 0.033 * m], U.F)).blend(0.012);
    P3(ell(U.at(0.47, 4e-3, -0.021), [0.035 * m, 0.12, 0.033 * m], U.F)).blend(0.012);
    P3(sph(E, 0.031 * a)).blend(0.02);
    P3(sph(U.at(1, 0, -0.027 * a), 0.0165)).blend(8e-3);
    for (const e of [-1, 1]) P3(sph(U.at(0.99, e * 0.028 * a, 2e-3), 0.011)).blend(0.012);
    P3(cap(E, F2.at(0.97), 0.037 * a, 0.0245)).blend(0.016);
    P3(ell(F2.at(0.22, 0.013, 0.012), [0.033 * m, 0.095, 0.031 * m], F2.F)).blend(0.014);
    P3(ell(F2.at(0.27, -0.012, 3e-3), [0.033 * m, 0.11, 0.032 * m], F2.F)).blend(0.014);
    P3(ell(F2.at(0.98), [0.0195, 0.03, 0.0285], F2.F)).blend(0.012);
    P3(sph(F2.at(0.955, 0.013, -0.02), 85e-4)).blend(6e-3);
  }
  const nA = out.length;
  for (const s of [-1, 1]) {
    const H2 = J[s > 0 ? "thighL" : "thighR"], Kn = J[s > 0 ? "shinL" : "shinR"], An = J[s > 0 ? "footL" : "footR"], Th = limb(H2, Kn, s), Sh = limb(Kn, An, s), a = (1 + 0.03 * B2.asym[3] * s) * bk, m = mu * a, f3 = 0.9 + 0.12 * fa;
    P3(cap(Th.at(0.03), Th.at(1), 0.08 * a * f3, 0.052 * a)).blend(0.028);
    P3(ell(Th.at(0.42, 4e-3, 0.024), [0.06 * m, 0.2, 0.056 * m], Th.F)).blend(0.016);
    P3(ell(Th.at(0.5, 0.028, 6e-3), [0.04 * m, 0.17, 0.045 * m], Th.F)).blend(0.016);
    P3(ell(Th.at(0.22, -0.028, -6e-3), [0.044 * a * f3, 0.135, 0.054 * a], Th.F)).blend(0.02);
    P3(ell(Th.at(0.46, 0, -0.03), [0.054 * m, 0.19, 0.044 * m], Th.F)).blend(0.016);
    P3(ell(Th.at(0.86, -0.018, 0.026), [0.024 * m, 0.05, 0.022], Th.F)).blend(0.012);
    P3(sph(Kn, 0.046 * a)).blend(0.03);
    P3(ell(Th.at(1, 0, 0.04 * a), [0.026, 0.03, 0.015], Th.F)).blend(0.01);
    P3(cap(Kn, Sh.at(0.97), 0.047 * a, 0.03)).blend(0.016);
    P3(ell(Sh.at(0.25, -0.016, -0.028), [0.035 * m, 0.105, 0.037 * m], Sh.F)).blend(0.014);
    P3(ell(Sh.at(0.23, 0.016, -0.028), [0.033 * m, 0.095, 0.035 * m], Sh.F)).blend(0.014);
    P3(ell(Sh.at(0.3, 0.016, 0.012), [0.025 * m, 0.12, 0.026 * m], Sh.F)).blend(0.012);
    P3(cap(Sh.at(0.12, -6e-3, 0.036 * a), Sh.at(0.9, -4e-3, 0.024), 0.011, 0.01)).blend(0.01);
    for (const e of [-1, 1]) P3(sph(Sh.at(0.975, e * 0.029, e > 0 ? -6e-3 : 2e-3), 0.0135)).blend(7e-3);
    P3(cap(Sh.at(0.62, 0, -0.03), Sh.at(1.02, 0, -0.034), 0.014, 0.0115)).blend(0.012);
    P3(ell([An[0], An[1] - 0.035, An[2] + 0.03], [0.038, 0.04, 0.075])).blend(0.014).as("foot");
  }
  return { torso: out.slice(0, nT), arms: out.slice(nT, nA), legs: out.slice(nA) };
}
function handPrims(B2, s) {
  const J = B2.J, E = J[s > 0 ? "foreL" : "foreR"], W = J[s > 0 ? "handL" : "handR"], F2 = limb(E, W, s), U0 = F2.F[1], T3 = F2.F[2], Np0 = mul3(F2.F[0], -1), sc2 = (0.9 + 0.1 * B2.bk) * (B2.sex ? 0.92 : 1), out = [], nails = [], knuckles = [];
  const wb = 0.22, U = add3(mul3(U0, Math.cos(wb)), mul3(Np0, Math.sin(wb))), Np = add3(mul3(Np0, Math.cos(wb)), mul3(U0, -Math.sin(wb))), HF = [Np, U, T3];
  const hp = (u, t, n) => [W[0] + (U[0] * u + T3[0] * t + Np[0] * n) * sc2, W[1] + (U[1] * u + T3[1] * t + Np[1] * n) * sc2, W[2] + (U[2] * u + T3[2] * t + Np[2] * n) * sc2];
  out.push(rbox(hp(0.05, 0, 1e-3), [0.0115 * sc2, 0.046 * sc2, 0.039 * sc2], 0.011 * sc2, HF).blend(0.01));
  out.push(ell(hp(0.035, 0.026, 0.01), [0.012 * sc2, 0.03 * sc2, 0.017 * sc2], HF).blend(8e-3));
  out.push(ell(hp(0.045, -0.03, 8e-3), [0.011 * sc2, 0.034 * sc2, 0.012 * sc2], HF).blend(8e-3));
  const curl = B2.curl[s > 0 ? 1 : 0], open = s === (B2.side > 0 ? 1 : -1) ? 0.7 : 1;
  const finger = (base, dir, segs, r0, cu, sink) => {
    const list = [];
    let p = base, d = dir;
    for (let i = 0; i < segs.length; i++) {
      const a = cu[i] * open, c = Math.cos(a), sn = Math.sin(a), nd = add3(mul3(d, c), mul3(Np, sn)), l = len3(nd);
      d = mul3(nd, 1 / l);
      const q = add3(p, mul3(d, segs[i] * sc2)), ra = r0 * (1 - 0.09 * i) * sc2, rb = r0 * (1 - 0.09 * (i + 1)) * sc2;
      list.push(cap(p, q, ra, rb));
      list.push(sph(add3(p, mul3(Np, -12e-4 * sc2)), ra * 1.1));
      knuckles.push(add3(p, mul3(Np, -ra)));
      if (i === segs.length - 1) {
        const nd2 = d[0] * Np[0] + d[1] * Np[1] + d[2] * Np[2], u0 = sub3(mul3(d, nd2), Np), up2 = mul3(u0, 1 / len3(u0));
        nails.push({ p: add3(add3(p, mul3(d, segs[i] * sc2 * 0.62)), mul3(up2, rb * 0.82)), dir: d, up: up2, w: rb * 1.5, l: segs[i] * sc2 * 0.6 });
      }
      p = q;
    }
    const g2 = new Group2(list, 3e-3 * sc2);
    g2.k = sink;
    return g2;
  };
  const FL2 = [[0.043, 0.026, 0.023], [0.047, 0.03, 0.024], [0.043, 0.028, 0.023], [0.034, 0.021, 0.021]], FT = [0.031, 0.0105, -98e-4, -0.0295], FU = [0.094, 0.098, 0.094, 0.086], FR2 = [88e-4, 9e-3, 86e-4, 78e-4];
  for (let f3 = 0; f3 < 4; f3++) {
    const fan = (1.5 - f3) * 0.085, d = add3(mul3(U, Math.cos(fan)), mul3(T3, Math.sin(fan)));
    out.push(finger(hp(FU[f3], FT[f3], 0), d, FL2[f3], FR2[f3], curl[f3], 45e-4 * sc2));
    out.push(cap(hp(0.02, FT[f3] * 0.5, -0.0105), hp(FU[f3], FT[f3], -85e-4), 28e-4 * sc2, 34e-4 * sc2).blend(4e-3));
  }
  {
    const d0 = add3(add3(mul3(U, 0.62), mul3(T3, 0.7)), mul3(Np, 0.35)), l = len3(d0);
    out.push(finger(hp(0.022, 0.03, 6e-3), mul3(d0, 1 / l), [0.04, 0.032, 0.027], 0.0108, [0.05, 0.25, 0.3], 6e-3 * sc2));
  }
  const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const p of out) for (let a = 0; a < 3; a++) {
    bb[a] = Math.min(bb[a], p.bb[a]);
    bb[a + 3] = Math.max(bb[a + 3], p.bb[a + 3]);
  }
  const up = F2.at(0.82);
  for (let a = 0; a < 3; a++) {
    bb[a] = Math.min(bb[a], up[a] - 0.04);
    bb[a + 3] = Math.max(bb[a + 3], up[a] + 0.04);
  }
  return { prims: out, nails, knuckles, box: bb, wrist: W, axis: U0, cut: F2.at(0.86), F: F2 };
}

