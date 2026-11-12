var BUSY = [0.74, 0.5, 0.035];
var BLK2 = [0.06, 0.06, 0.065];
var CHAS = [0.1, 0.1, 0.105];
var SEAT = [0.16, 0.26, 0.2];
var LIN = [0.6, 0.63, 0.6];
var ALU2 = [0.78, 0.8, 0.82];
var side = (P3, mat, prof, z0, z1, o = {}) => P3.ext(mat, prof, z0, z1, { ...o, plane: "xy" });
var BW2 = 1.22;
var BROWS = [[0, 0.62], [0.9, 0.62], [1, 0.66], [1, 1], [1, 1.52], [0.985, 2.28], [0.95, 2.5], [0.86, 2.72], [0.66, 2.88], [0.35, 2.96], [0, 2.98]];
var BN = BROWS.length - 1;
var BX0 = -5;
var BX1 = 2.6;
var busPt = (x, h, sd, out, inset = 0) => {
  const taper = x > 2.2 ? 1 - 0.05 * ((x - 2.2) / 0.4) ** 2 : x < -4.7 ? 1 - 0.04 * ((-4.7 - x) / 0.3) ** 2 : 1;
  out.set(x, BROWS[h][1] - (h > 4 ? inset : 0) + (h < 2 ? inset : 0), sd * (BROWS[h][0] * BW2 * taper - (BROWS[h][0] > 0.5 ? inset : 0)));
  return out;
};
var schoolBus = (seed = 1, o = {}) => proto("sbus" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("schoolBus", seed), A = o.atlas, R4 = rng(seed * 53 + 9), v = new Vector3(), smash = o.smash ?? 0.2, flat = o.flat || [], doorOpen = o.door !== false, no = o.no ?? seed % 6;
  const WIN = [];
  for (let i = 0; i < 11; i++) WIN.push([-4.66 + i * 0.62 + 0.04, -4.66 + (i + 1) * 0.62 - 0.04]);
  const DR = [1.45, 2.3], ARCH = [[-2.6, 0.62]];
  const us = stations(BX0, BX1, 0.31, [...WIN.flat(), ...DR, -3.22, -1.98, 2.36, 2.2, -4.7, -4.85]);
  const gone = {};
  const cell = (i, j, u0, u1) => {
    const r = j < BN ? j : 2 * BN - 1 - j, sd = j < BN ? 1 : -1, um = (u0 + u1) / 2;
    if (sd > 0 && u0 >= DR[0] - 1e-4 && u1 <= DR[1] + 1e-4 && r >= 2 && r <= 4) return null;
    if (r === 2) {
      for (const [ax, ar] of ARCH) if (Math.abs(um - ax) < ar) return null;
    }
    if (r === 4) {
      for (let k = 0; k < WIN.length; k++) if (u0 >= WIN[k][0] - 1e-4 && u1 <= WIN[k][1] + 1e-4) {
        const key = k + "," + sd;
        if (gone[key] == null) gone[key] = R4() < smash;
        return gone[key] ? null : "glass";
      }
      if (sd < 0 && u0 >= 1.52 && u1 <= 2.36) return "glass";
    }
    return "body";
  };
  const ringFn = (x, j, out) => j <= BN ? busPt(x, j, 1, out) : busPt(x, 2 * BN - j, -1, out);
  const skin = hullSurf(us, 2 * BN, ringFn, cell);
  P3.add("carpaint", skin.body, BUSY, { jit: 0.04, cell: 3 });
  if (skin.glass) P3.add("glassT", skin.glass, [0.55, 0.6, 0.6]);
  const lin5 = hullSurf(us, 2 * BN, (x, j, out) => j <= BN ? busPt(x, j, 1, out, 0.04) : busPt(x, 2 * BN - j, -1, out, 0.04), (i, j, u0, u1) => cell(i, j, u0, u1) === "body" ? "body" : null, { inward: true });
  P3.add("paint", lin5.body, LIN, { jit: 0.04 });
  for (const sd of [-1, 1]) {
    for (let k = 0; k <= 11; k++) {
      const x = -4.66 + k * 0.62;
      if (sd > 0 && x > 1.4) continue;
      P3.box("carpaint", 0.08, 0.78, 0.035, x, 1.9, sd * (BW2 - 4e-3), { col: BUSY, b: 8e-3 });
    }
    for (const [y, hgt] of [[0.72, 0.07], [1.02, 0.09], [1.47, 0.08]]) {
      const xa = BX0 + 0.1, xb = sd > 0 ? DR[0] - 0.05 : BX1 - 0.1;
      P3.box("paint", xb - xa, hgt, 0.03, (xa + xb) / 2, y, sd * (BW2 + 0.012), { col: BLK2, b: 0.01 });
    }
    P3.box("paint", BX1 - BX0 - 0.3, 0.035, 0.05, (BX0 + BX1) / 2, 2.53, sd * (BW2 * 0.95 + 0.012), { col: BLK2, b: 0.01 });
    P3.add("rubber", ring(0.62, 0.03, { seg: 14, radial: 5, a0: 0, a1: PI5 }), BLK2, { p: [-2.6, 0.5, sd * (BW2 + 5e-3)] });
    P3.box("rubber", 0.02, 0.5, 0.6, -3.4, 0.4, sd * 0.92, { col: BLK2, b: 4e-3 });
    for (const x of [-4.6, -1, 1]) P3.box(x < -4 ? "emRed" : "emAmber", 0.09, 0.04, 0.012, x, 0.86, sd * (BW2 + 8e-3), { b: 3e-3 });
    for (const x of [-4, 0, 2.3]) P3.box("emAmber", 0.07, 0.03, 0.02, x, 2.76, sd * BW2 * 0.83, { b: 6e-3 });
  }
  {
    const x = BX1 - 0.02, taper = 0.95;
    P3.add("carpaint", extrude(BROWS.map(([w, y]) => [w * BW2 * taper, y]).concat(BROWS.slice(0, -1).reverse().map(([w, y]) => [-w * BW2 * taper, y])), 0, 0.04, 4e-3, [rectPts(-1.08, 1.56, -0.03, 2.4), rectPts(0.03, 1.56, 1.08, 2.4)]), BUSY, { r: [0, H, 0], p: [x, 0, 0] });
    for (const s of [-1, 1]) {
      P3.add("glassT", quadXY(1.05, 0.84), [0.55, 0.6, 0.6], { p: [x + 0.02, 1.98, s * 0.555], r: [0, H, 0] });
      P3.add("rubber", tube([[x + 0.045, 1.56, s * 0.03], [x + 0.045, 1.56, s * 1.08], [x + 0.045, 2.4, s * 1.08], [x + 0.045, 2.4, s * 0.03]], 0.014, 5, { samples: 0, closed: true }), BLK2);
      P3.bar("steel", [x + 0.07, 1.5, s * 0.5], [x + 0.08, 2.1, s * 0.75], 6e-3, { col: BLK2 });
      P3.box("rubber", 0.012, 0.5, 0.02, x + 0.085, 2, s * 0.72, { col: BLK2, b: 3e-3, r: [0.4 * s, 0, 0] });
      for (const [dz, m] of [[1, "emRed"], [0.76, "emAmber"]]) {
        P3.cyl("paint", 0.1, 0.05, x + 0.04, 2.72, s * dz, { axis: "x", seg: 14, col: BLK2 });
        P3.cyl(o.hazard && m === "emAmber" ? "emAmberB" : o.hazard ? m : "glass", 0.08, 0.03, x + 0.065, 2.72, s * dz, { axis: "x", seg: 14 });
      }
    }
    for (let k = -2; k <= 2; k++) P3.box("emAmber", 0.02, 0.03, 0.07, x + 0.03, 2.9, k * 0.16, { b: 6e-3 });
    if (A) {
      P3.quad("signF", 1.3, 1.3 / A.aspect("busFront"), A.rect("busFront"), { p: [x + 0.046, 2.62, 0], r: [0, H, 0] });
    }
  }
  {
    const x = BX0 + 0.02, taper = 0.96;
    P3.add("carpaint", extrude(BROWS.map(([w, y]) => [w * BW2 * taper, y]).concat(BROWS.slice(0, -1).reverse().map(([w, y]) => [-w * BW2 * taper, y])), -0.04, 0, 4e-3, [rectPts(-0.3, 1.6, 0.3, 2.3), rectPts(-1.02, 1.62, -0.48, 2.25), rectPts(0.48, 1.62, 1.02, 2.25)]), BUSY, { r: [0, H, 0], p: [x, 0, 0] });
    for (const [z, w, y0, y1] of [[0, 0.6, 1.6, 2.3], [-0.75, 0.54, 1.62, 2.25], [0.75, 0.54, 1.62, 2.25]]) P3.add(R4() < smash ? "black" : "glassT", quadXY(w, y1 - y0), [0.55, 0.6, 0.6], { p: [x - 0.02, (y0 + y1) / 2, z], r: [0, -H, 0] });
    P3.add("black", tube([[x - 0.045, 0.72, -0.4], [x - 0.045, 0.72, 0.4], [x - 0.045, 2.42, 0.4], [x - 0.045, 2.42, -0.4]], 7e-3, 4, { samples: 0, closed: true }));
    P3.bar("chrome", [x - 0.08, 1.3, -0.3], [x - 0.08, 1.3, 0.1], 0.012);
    for (const z of [0.36]) for (const y of [0.9, 1.5, 2.2]) P3.box("steel", 0.03, 0.12, 0.04, x - 0.05, y, z, { col: BLK2, b: 6e-3 });
    for (const s of [-1, 1]) {
      for (const [dz, m] of [[1, "emRed"], [0.76, "emAmber"]]) {
        P3.cyl("paint", 0.1, 0.05, x - 0.04, 2.72, s * dz, { axis: "x", seg: 14, col: BLK2 });
        P3.cyl(o.hazard && m === "emAmber" ? "emAmberB" : "glass", 0.08, 0.03, x - 0.065, 2.72, s * dz, { axis: "x", seg: 14 });
      }
      P3.cyl(o.lights ? "emRed" : "glass", 0.09, 0.03, x - 0.05, 1.22, s * 0.92, { axis: "x", seg: 14 });
      P3.cyl("glass", 0.07, 0.03, x - 0.05, 1.02, s * 0.92, { axis: "x", seg: 12 });
      P3.cyl("paint", 0.11, 0.02, x - 0.035, 1.22, s * 0.92, { axis: "x", seg: 14, col: BLK2 });
    }
    for (let k = -2; k <= 2; k++) P3.box("emRed", 0.02, 0.03, 0.07, x - 0.03, 2.9, k * 0.16, { b: 6e-3 });
    P3.add("paint", softBox(0.16, 0.24, 2.44, 0.04, 3), BLK2, { p: [x - 0.1, 0.62, 0] });
    if (A) {
      P3.quad("signF", 1.3, 1.3 / A.aspect("busFront"), A.rect("busFront"), { p: [x - 0.046, 2.62, 0], r: [0, -H, 0] });
      P3.quad("signF", 0.5, 0.5 / A.aspect("emergDoor"), A.rect("emergDoor"), { p: [x - 0.046, 1.48, 0], r: [0, -H, 0] });
      P3.quad("signF", 0.36, 0.36 / A.aspect("plate" + no), A.rect("plate" + no), { p: [x - 0.19, 0.62, -0.6], r: [0, -H, 0] });
    }
    if (o.lights) for (const s of [-1, 1]) P3.glow("fill", [x - 0.5, 1.2, s * 0.92], { col: [1, 0.08, 0.04], power: 2.2, dist: 5, dir: [-1, 0, 0], cone: 1 });
    P3.tube("steel", [[-3.2, 0.42, -0.7], [-4.4, 0.4, -0.72], [x - 0.12, 0.42, -0.9]], 0.035, { seg: 7, samples: 0, col: [0.3, 0.27, 0.25] });
  }
  const hopen = o.hood || 0;
  P3.push({ p: [2.62, 1.86, 0], r: [0, 0, hopen] });
  {
    const hus = stations(0, 2.25, 0.25, []), hw = (x) => 0.98 - 0.1 * (x / 2.25) ** 2, ht = (x) => -0.02 - 0.27 * (x / 2.25) ** 1.6;
    const hood = hullSurf(hus, 10, (x, j, out) => {
      const t = j / 9, a = t * PI5, r = 0.42;
      const w = hw(x), zz = Math.cos(a) > 0 ? w - r + r * Math.pow(Math.cos(a), 0.6) : -(w - r) - r * Math.pow(-Math.cos(a), 0.6);
      out.set(x, ht(x) - 0.5 + 0.5 * Math.pow(Math.sin(a), 0.55), zz);
      return out;
    }, null, { open: true });
    P3.add("carpaint", hood.body, BUSY, { jit: 0.04, cell: 3 });
    P3.box("chrome", 0.3, 0.02, 0.03, 2.1, ht(2.1) + 5e-3, 0, { b: 6e-3 });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) P3.box("black", 0.26, 0.012, 0.012, 0.5 + i * 0.36, -0.36, s * (hw(0.5 + i * 0.36) + 2e-3), { b: 0 });
  }
  P3.pop();
  if (hopen) {
    P3.box("steel", 0.9, 0.6, 0.7, 3.7, 1.02, 0, { base: true, col: [0.2, 0.2, 0.21], b: 0.03 });
    P3.cyl("steel", 0.2, 0.12, 3.5, 1.68, 0.1, { seg: 12, col: [0.12, 0.12, 0.12] });
    P3.bar("steel", [4.3, 1.3, 0.5], [3.3, 1.86 + Math.sin(hopen) * 1.2, 0.55], 8e-3, { col: [0.5, 0.5, 0.5] });
  } else P3.box("steel", 1.9, 0.5, 1.5, 3.7, 0.85, 0, { base: true, col: CHAS, b: 0.02 });
  P3.add("paint", softBox(0.1, 0.76, 1.66, 0.03, 3), BLK2, { p: [4.9, 1.2, 0] });
  for (let i = 0; i < 6; i++) P3.box("chrome", 0.03, 0.035, 1, 4.96, 0.95 + i * 0.1, 0, { b: 8e-3 });
  P3.box("chrome", 0.02, 0.1, 0.2, 4.975, 1.5, 0, { b: 0.01 });
  for (const s of [-1, 1]) {
    P3.cyl("chrome", 0.105, 0.04, 4.955, 1.2, s * 0.66, { axis: "x", seg: 14 });
    P3.cyl(o.lights ? "lampFlood" : "glass", 0.088, 0.02, 4.975, 1.2, s * 0.66, { axis: "x", seg: 14 });
    P3.box(o.hazard ? "emAmberB" : "emAmber", 0.02, 0.06, 0.12, 4.96, 0.96, s * 0.7, { b: 6e-3 });
    if (o.lights) {
      P3.glow("fill", [6.5, 1.1, s * 0.66], { col: [0.82, 0.93, 1], power: 10, dist: 20, dir: [0.97, -0.24, 0], cone: 0.42 });
      P3.glow("flare", [5.02, 1.2, s * 0.66], { col: [0.85, 0.94, 1], size: 1.1 });
    }
    if (o.hazard) {
      P3.glow("blink", [5.1, 1, s * 0.8], { col: [1, 0.5, 0.06], power: 3, dist: 6, mat: "emAmberB" });
      P3.glow("blink", [BX0 - 0.3, 2.7, s * 0.8], { col: [1, 0.5, 0.06], power: 3, dist: 6, mat: "emAmberB" });
    }
    side(P3, "carpaint", (() => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const a = PI5 * (i / 10);
        pts.push([3.85 + Math.cos(a) * 0.72, 0.6 + Math.sin(a) * 0.62]);
      }
      pts.push([2.62, 0.6], [2.62, 1.34], [3, 1.34]);
      for (let i = 9; i >= 1; i--) {
        const a = PI5 * (i / 10);
        pts.push([3.85 + Math.cos(a) * 0.86, 0.66 + Math.sin(a) * 0.74]);
      }
      pts.push([4.86, 0.66], [4.86, 0.6]);
      return pts.slice(0, 11).concat([[3.13, 0.6]]).length ? pts : pts;
    })(), s > 0 ? 0.88 : -1.2, s > 0 ? 1.2 : -0.88, { col: BUSY, bevel: 0.03 });
    P3.tube("steel", [[2.75, 1.5, s * 1.18], [3.05, 1.55, s * 1.52], [3.05, 2.2, s * 1.52], [2.75, 2.25, s * 1.2]], 0.012, { seg: 5, samples: 0, col: BLK2 });
    P3.box("paint", 0.03, 0.42, 0.2, 3.05, 1.9, s * 1.54, { col: BLK2, b: 0.012 });
    P3.box("chrome", 6e-3, 0.38, 0.17, 3.032, 1.9, s * 1.54, { b: 2e-3 });
    P3.tube("steel", [[4.75, 1.3, s * 0.95], [5.05, 1.75, s * 1.12]], 0.012, { seg: 5, samples: 0, col: BLK2 });
    P3.lathe("chrome", [[1e-3, -0.05], [0.09, -0.02], [0.12, 0.02]], { seg: 14, axis: "x", p: [5.05, 1.82, s * 1.14], r: [0, s * 0.5, 0] });
    P3.lathe("paint", [[0.12, 0.02], [0.1, 0.05], [1e-3, 0.06]], { seg: 14, axis: "x", col: BLK2, p: [5.05, 1.82, s * 1.14], r: [0, s * 0.5, 0] });
  }
  P3.add("paint", softBox(0.2, 0.26, 2.46, 0.05, 3), BLK2, { p: [5.08, 0.64, 0] });
  if (A) P3.quad("signF", 0.36, 0.36 / A.aspect("plate" + no), A.rect("plate" + no), { p: [5.185, 0.64, 0], r: [0, H, 0] });
  P3.beam("paint", [5.2, 0.72, 1.15], [5.24, 0.72, -1], 0.04, 0.03, { col: BUSY });
  P3.box("steel", 0.08, 0.1, 0.1, 5.2, 0.72, 1.18, { col: BLK2, b: 0.01 });
  P3.push({ p: [1.2, 1.2, -(BW2 + 0.03)], r: [0, o.arm ? 0 : H - 0.06, 0] });
  P3.box("paint", 0.1, 0.16, 0.06, 0, 0, 0, { col: BLK2, b: 0.01 });
  P3.bar("steel", [0, 0, -0.03], [0, 0, -0.3], 0.012, { col: BLK2 });
  P3.cyl("paint", 0.26, 0.012, 0, 0, -0.52, { axis: "x", seg: 8, col: [0.62, 0.06, 0.05], r: [PI5 / 8, 0, 0] });
  if (A) for (const s of [-1, 1]) P3.quad("signF", 0.5, 0.5, A.rect("stopArm"), { p: [s * 8e-3, 0, -0.52], r: [0, s * H, 0] });
  for (const y of [-0.17, 0.17]) P3.cyl(o.arm ? "emRedB" : "emRed", 0.035, 0.02, 0, y, -0.52, { axis: "x", seg: 8 });
  P3.pop();
  {
    const zc = BW2 - 0.02;
    P3.box("rubber", 0.85, 0.03, 0.6, 1.875, 0.4, zc - 0.32, { col: BLK2, b: 4e-3 });
    P3.box("rubber", 0.85, 0.03, 0.4, 1.875, 0.66, zc - 0.7, { col: BLK2, b: 4e-3 });
    P3.box("steel", 0.85, 0.26, 0.02, 1.875, 0.53, zc - 0.5, { col: [0.2, 0.2, 0.2] });
    P3.box("paint", 0.03, 0.3, 0.6, 1.45, 0.52, zc - 0.32, { col: CHAS });
    P3.box("paint", 0.03, 0.3, 0.6, 2.3, 0.52, zc - 0.32, { col: CHAS });
    for (const [hx, sg] of [[DR[0] + 0.02, 1], [DR[1] - 0.02, -1]]) {
      P3.push({ p: [hx, 0.42, zc], r: [0, doorOpen ? sg * -1.45 : 0, 0] });
      P3.box("carpaint", 0.41, 1.86, 0.03, sg * 0.205, 0, 0, { base: true, col: BUSY, b: 6e-3 });
      P3.box("glassT", 0.3, 0.62, 0.034, sg * 0.205, 1.1, 0, { base: true, b: 0 });
      P3.box("glassT", 0.3, 0.62, 0.034, sg * 0.205, 0.32, 0, { base: true, b: 0 });
      P3.box("rubber", 0.02, 1.86, 0.04, sg * 0.41, 0, 0, { base: true, col: BLK2, b: 4e-3 });
      P3.pop();
    }
    P3.tube("chrome", [[1.52, 0.7, zc - 0.62], [1.52, 1.6, zc - 0.62], [1.56, 1.9, zc - 0.3]], 0.014, { seg: 6, samples: 0 });
  }
  P3.box("rubber", BX1 - BX0 - 0.1, 0.03, 2 * BW2 - 0.12, (BX0 + BX1) / 2, 0.655, 0, { col: [0.09, 0.09, 0.09], b: 0 });
  P3.box("steel", BX1 - BX0 - 0.2, 0.012, 0.03, (BX0 + BX1) / 2, 0.675, 0.28, { col: ALU2, b: 0 });
  P3.box("steel", BX1 - BX0 - 0.2, 0.012, 0.03, (BX0 + BX1) / 2, 0.675, -0.28, { col: ALU2, b: 0 });
  for (let i = 0; i < 11; i++) for (const s of [-1, 1]) {
    if (s > 0 && i === 10) continue;
    const x = -4.5 + i * 0.62, z = s * 0.74, torn = R4() < 0.2;
    P3.add("canvas", softBox(0.4, 0.1, 0.9, 0.04, 3), SEAT, { p: [x + 0.05, 1.08, z] });
    P3.add("canvas", softBox(0.09, 0.72, 0.9, 0.04, 3), torn ? [0.2, 0.19, 0.15] : SEAT, { p: [x - 0.17, 1.42, z], r: [0, 0, 0.08] });
    P3.bar("steel", [x - 0.1, 0.67, z - s * 0.4], [x - 0.1, 1.04, z - s * 0.4], 0.014, { col: BLK2 });
    P3.bar("steel", [x + 0.2, 0.67, z - s * 0.4], [x + 0.2, 1.04, z - s * 0.4], 0.014, { col: BLK2 });
  }
  P3.add("canvas", softBox(0.46, 0.12, 0.5, 0.05, 3), [0.1, 0.1, 0.1], { p: [1.75, 1.15, -0.7] });
  P3.add("canvas", softBox(0.1, 0.8, 0.5, 0.05, 3), [0.1, 0.1, 0.1], { p: [1.5, 1.55, -0.7], r: [0, 0, 0.1] });
  P3.cyl("steel", 0.04, 0.45, 1.75, 0.9, -0.7, { seg: 8, col: BLK2 });
  P3.add("plastic", softBox(0.4, 0.5, 2, 0.08, 4), [0.1, 0.1, 0.105], { p: [2.38, 1.3, 0] });
  P3.bar("steel", [2.25, 1.35, -0.7], [2, 1.62, -0.7], 0.02, { col: BLK2 });
  P3.add("plastic", ring(0.22, 0.016, { seg: 18, radial: 6 }), BLK2, { p: [1.98, 1.64, -0.7], r: [0, H, -0.75] });
  for (let k = 0; k < 3; k++) P3.bar("plastic", [1.98, 1.64, -0.7], [1.98 + Math.cos(0.82) * 0, 1.64 + 0.2 * Math.cos(k * 2.1), -0.7 + 0.2 * Math.sin(k * 2.1)], 0.01, { col: BLK2 });
  P3.box("steel", 0.03, 0.9, 0.9, 1.3, 0.68, 0.72, { base: true, col: LIN, b: 6e-3 });
  P3.bar("chrome", [1.3, 1.58, 0.28], [1.3, 2.9, 0.28], 0.014);
  for (let i = 0; i < 4; i++) {
    P3.box("plastic", 0.3, 0.03, 0.18, -3.8 + i * 1.7, 2.92, 0, { col: [0.8, 0.8, 0.76], b: 8e-3 });
    P3.box(o.dome && i !== 2 ? "emCab" : "glass", 0.24, 0.012, 0.13, -3.8 + i * 1.7, 2.9, 0, { b: 2e-3 });
  }
  if (o.dome) {
    P3.glow("fill", [-2, 2.4, 0], { col: [1, 0.66, 0.36], power: 4.5, dist: 7 });
    P3.glow("fill", [1.2, 2.4, 0], { col: [1, 0.66, 0.36], power: 3.5, dist: 6 });
  }
  P3.add("canvas", softBox(0.3, 0.38, 0.16, 0.05, 3), [0.5, 0.1, 0.12], { p: [-1.33, 1.3, 0.8], r: [0.2, 0.5, 0] });
  P3.add("rubber", softBox(0.24, 0.08, 0.09, 0.03, 3), [0.8, 0.8, 0.8], { p: [-0.4, 0.71, 0.1], r: [0, 0.8, 0] });
  P3.add("canvas", softBox(0.12, 0.6, 0.7, 0.05, 4), [0.12, 0.22, 0.4], { p: [0.48, 1.52, -0.74], r: [0, 0, 0.1] });
  for (let i = 0; i < 6; i++) P3.box("plastic", 0.21, 3e-3, 0.3, -4 + R4() * 5.5, 0.674, (R4() - 0.5) * 0.4, { col: [0.86, 0.86, 0.82], b: 0, r: [0, R4() * 3, 0] });
  for (const x of [-3, 0.4]) {
    P3.add("paint", softBox(0.7, 0.07, 0.7, 0.03, 3), [0.85, 0.85, 0.82], { p: [x, 2.99, 0] });
    P3.box("steel", 0.1, 0.03, 0.05, x + 0.3, 3.03, 0, { col: BLK2, b: 6e-3 });
  }
  P3.cyl("paint", 0.05, 0.05, -4.3, 3, 0, { seg: 10, col: BLK2 });
  P3.lathe(o.hazard ? "emWhiteB" : "glass", [[0.045, 0], [0.045, 0.07], [1e-3, 0.1]], { seg: 10, p: [-4.3, 3.02, 0] });
  if (o.hazard) {
    P3.glow("blink", [-4.3, 3.3, 0], { col: [0.9, 0.95, 1], power: 6, dist: 10, mat: "emWhiteB" });
    P3.glow("flare", [-4.3, 3.1, 0], { col: [0.9, 0.95, 1], size: 1.2, blink: 1 });
  }
  for (const s of [-1, 1]) {
    P3.beam("steel", [BX0 + 0.2, 0.52, s * 0.45], [4.9, 0.52, s * 0.45], 0.2, 0.07, { col: CHAS });
    for (const ax of [-2.6, 3.85]) {
      for (let k = 0; k < 4; k++) P3.beam("steel", [ax - 0.6 + k * 0.03, 0.4 - k * 0.016, s * 0.62], [ax + 0.6 - k * 0.03, 0.4 - k * 0.016, s * 0.62], 0.014, 0.07, { col: CHAS, b: 2e-3 });
    }
  }
  for (const x of [-4.4, -3.4, -1.6, 0, 1.6, 3]) P3.box("steel", 0.08, 0.14, 0.9, x, 0.52, 0, { col: CHAS, b: 0.01 });
  P3.add("steel", softBox(1.3, 0.36, 0.5, 0.06, 3), [0.12, 0.12, 0.13], { p: [0.2, 0.42, -0.85] });
  P3.box("steel", 0.5, 0.34, 0.4, -0.9, 0.44, 0.9, { col: CHAS, b: 0.02 });
  P3.bar("steel", [-2.6, 0.48, 0], [2.4, 0.56, 0], 0.045, { col: [0.2, 0.2, 0.2] });
  P3.bar("steel", [-2.6, 0.5, -1], [-2.6, 0.5, 1], 0.06, { col: CHAS });
  P3.lathe("steel", [[0.08, -0.28], [0.2, -0.16], [0.23, 0], [0.2, 0.16], [0.08, 0.28]], { seg: 12, axis: "z", col: CHAS, p: [-2.6, 0.5, 0] });
  P3.beam("steel", [3.85, 0.48, -0.95], [3.85, 0.48, 0.95], 0.08, 0.1, { col: CHAS });
  [[3.85, 1.04, 1, 0], [3.85, -1.04, -1, 1], [-2.6, 1.07, 1, 2], [-2.6, -1.07, -1, 3]].forEach(([x, z, s, i]) => {
    const f3 = flat.includes(i) ? 0.75 : 0;
    addWheel(P3, 0.5, 0.27, x, 0.5, z, { axis: "z", out: s, rimCol: BUSY, rimMat: "carpaint", flat: f3, seg: 28 });
    if (i >= 2) addWheel(P3, 0.5, 0.27, x, 0.5, z - s * 0.32, { axis: "z", out: -s, rimCol: BLK2, flat: f3, seg: 20, nuts: 0 });
  });
  if (A) for (const s of [-1, 1]) {
    const ry = s > 0 ? 0 : PI5, z = s * (BW2 + 4e-3);
    P3.quad("decalF", 4.2, 4.2 / A.aspect("busName"), A.rect("busName"), { p: [-1.6, 2.4, s * (BW2 * 0.975 + 4e-3)], r: [0, ry, 0] });
    P3.quad("decalF", 0.5, 0.5 / A.aspect("busNo" + no), A.rect("busNo" + no), { p: [s > 0 ? 0.9 : 2.1, 1.26, z], r: [0, ry, 0] });
    P3.quad("decalF", 0.5, 0.5 / A.aspect("busNo" + no), A.rect("busNo" + no), { p: [-4.3, 1.26, z], r: [0, ry, 0] });
  }
  if (A && o.graf) P3.quad("decalF", 3, 3 / A.aspect(o.graf), A.rect(o.graf), { p: [-1.2, 1.25, BW2 + 0.02] });
  P3.col([BX0 - 0.15, 0, -BW2 - 0.03], [BX1, 3, BW2 + 0.03], { surface: "metal", noBullet: true });
  P3.col([BX1, 0, -1.2], [5.2, 1.9, 1.2], { surface: "metal" });
  const bc = (a, b) => P3.col(a, b, { surface: "metal", bulletOnly: true });
  bc([BX0 - 0.1, 0.3, -BW2], [BX1, 1.52, BW2]);
  bc([BX0, 2.3, -BW2], [BX1, 3, BW2]);
  bc([BX0 - 0.05, 1.5, -BW2], [BX0 + 0.05, 2.3, BW2]);
  bc([BX1 - 0.05, 1.5, -BW2], [BX1 + 0.05, 2.3, BW2]);
  return P3.finish({ grime: 0.9, ground: 0.6 });
});
var OD2 = [0.2, 0.22, 0.15];
var ODK2 = [0.14, 0.155, 0.11];
var TARP = [0.23, 0.25, 0.18];
var WOODC = [0.33, 0.3, 0.2];
var armyTruck = (seed = 1, o = {}) => proto("atruck" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("armyTruck", seed), A = o.atlas, R4 = rng(seed * 61 + 3), canvas = o.canvas || "full", cargo = o.cargo || "crates", FLR = 1.3, BX = [-3.5, 0.75], BWd = 1.18;
  for (const s of [-1, 1]) {
    P3.beam("steel", [-3.4, 0.98, s * 0.42], [3.3, 0.98, s * 0.42], 0.24, 0.08, { col: CHAS });
  }
  for (const x of [-3.2, -2.1, -1, 0.3, 1.6, 3]) P3.box("steel", 0.1, 0.16, 0.76, x, 0.98, 0, { col: CHAS, b: 0.01 });
  P3.cyl("milpaint", 0.3, 1.1, 0.35, 0.82, 0.9, { axis: "x", seg: 16, col: OD2, cham: 0.03 });
  for (const x of [0, 0.7]) P3.add("steel", ring(0.305, 0.012, { seg: 16, radial: 4 }), CHAS, { p: [x, 0.82, 0.9], r: [0, H, 0] });
  P3.cyl("steel", 0.05, 0.06, 0.6, 1.13, 0.9, { seg: 8, col: [0.5, 0.5, 0.5] });
  P3.box("milpaint", 0.7, 0.42, 0.44, 0.4, 0.82, -0.92, { col: OD2, b: 0.02 });
  for (const y of [0.5, 0.78]) P3.box("steel", 0.5, 0.03, 0.3, 1.35, y, -1, { col: CHAS, b: 4e-3 });
  for (const y of [0.5, 0.78]) P3.box("steel", 0.5, 0.03, 0.3, 1.35, y, 1, { col: CHAS, b: 4e-3 });
  for (const z of [-0.2, 0.2]) P3.cyl("milpaint", 0.13, 0.7, -0.9, 0.86, z, { axis: "x", seg: 12, col: ODK2, cham: 0.03 });
  P3.tube("steel", [[1.6, 0.8, 0.5], [1, 0.8, 0.9], [0.86, 1.2, 1.12], [0.86, 3.05, 1.12]], 0.05, { seg: 8, samples: 0, col: [0.26, 0.2, 0.17] });
  P3.lathe("steel", [[0.075, 0], [0.085, 0.02], [0.085, 0.75], [0.075, 0.77]], { seg: 12, col: [0.3, 0.3, 0.3], p: [0.86, 1.9, 1.12] });
  P3.box("steel", 0.1, 0.012, 0.12, 0.9, 3.07, 1.12, { col: [0.2, 0.17, 0.15], r: [0, 0, 0.5] });
  const AX = [2.55, -1.55, -2.85], WR = 0.54;
  for (const x of AX) {
    P3.bar("steel", [x, WR, -0.95], [x, WR, 0.95], 0.07, { col: CHAS });
    P3.lathe("steel", [[0.09, -0.3], [0.24, -0.17], [0.27, 0], [0.24, 0.17], [0.09, 0.3]], { seg: 12, axis: "z", col: CHAS, p: [x, WR, 0.1] });
    for (const s of [-1, 1]) addWheel(P3, WR, 0.36, x, WR, s * 1.02, { axis: "z", out: s, rimCol: OD2, rimMat: "milpaint", ribs: 6, seg: 30, nuts: 8, flat: o.flat && x === AX[0] && s > 0 ? 0.7 : 0 });
  }
  for (const s of [-1, 1]) {
    P3.beam("steel", [AX[1] + 0.1, 0.62, s * 0.56], [AX[2] - 0.1, 0.62, s * 0.56], 0.12, 0.08, { col: CHAS });
    P3.box("steel", 0.2, 0.36, 0.1, (AX[1] + AX[2]) / 2, 0.8, s * 0.5, { col: CHAS, b: 0.01 });
    for (let k = 0; k < 5; k++) P3.beam("steel", [AX[0] - 0.65 + k * 0.04, 0.78 - k * 0.018, s * 0.5], [AX[0] + 0.65 - k * 0.04, 0.78 - k * 0.018, s * 0.5], 0.016, 0.08, { col: CHAS, b: 2e-3 });
  }
  P3.bar("steel", [AX[0], WR, 0.1], [0.4, 0.8, 0.05], 0.04, { col: [0.2, 0.2, 0.2] });
  P3.bar("steel", [0.4, 0.8, 0.05], [AX[1], WR, 0.1], 0.04, { col: [0.2, 0.2, 0.2] });
  P3.bar("steel", [AX[1], WR, 0.1], [AX[2], WR, 0.1], 0.04, { col: [0.2, 0.2, 0.2] });
  P3.add("milpaint", softBox(1.5, 0.66, 1.16, 0.06, 4), OD2, { p: [2.55, 1.72, 0], jit: 0.06 });
  P3.box("black", 1.4, 8e-3, 8e-3, 2.55, 2.05, 0, { b: 0 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++) P3.box("black", 0.03, 0.26, 0.01, 2.1 + i * 0.13, 1.72, s * 0.582, { b: 0 });
    P3.box("steel", 0.06, 0.03, 0.04, 2.6, 1.42, s * 0.59, { col: CHAS, b: 6e-3 });
  }
  for (const s of [-1, 1]) {
    side(P3, "milpaint", [[1.75, 1.2], [1.95, 1.42], [3.2, 1.42], [3.42, 1.2], [3.42, 1.05], [3.3, 1.05], [3.3, 1.14], [3.15, 1.36], [1.98, 1.36], [1.87, 1.2], [1.87, 1.05], [1.75, 1.05]], s > 0 ? 0.56 : -1.22, s > 0 ? 1.22 : -0.56, { col: OD2, bevel: 0.012 });
    P3.add("milpaint", softBox(0.26, 0.26, 0.26, 0.05, 3), OD2, { p: [3.28, 1.56, s * 0.88] });
    P3.cyl("chrome", 0.1, 0.03, 3.41, 1.56, s * 0.88, { axis: "x", seg: 14 });
    P3.cyl(o.lights ? "lampFlood" : "glass", 0.085, 0.02, 3.425, 1.56, s * 0.88, { axis: "x", seg: 14 });
    for (const dz of [-0.07, 0, 0.07]) P3.bar("steel", [3.46, 1.44, s * 0.88 + dz], [3.46, 1.68, s * 0.88 + dz], 6e-3, { col: ODK2 });
    P3.add("steel", ring(0.125, 7e-3, { seg: 14, radial: 4 }), ODK2, { p: [3.46, 1.56, s * 0.88], r: [0, H, 0] });
    P3.box("emAmber", 0.03, 0.05, 0.08, 3.43, 1.36, s * 1.1, { b: 8e-3 });
    P3.cyl("glass", 0.035, 0.03, 3.42, 1.76, s * 0.62, { axis: "x", seg: 8 });
    if (o.lights) {
      P3.glow("fill", [5, 1.45, s * 0.88], { col: [0.82, 0.93, 1], power: 10, dist: 19, dir: [0.97, -0.25, 0], cone: 0.42 });
      P3.glow("flare", [3.47, 1.56, s * 0.88], { col: [0.85, 0.94, 1], size: 1 });
    }
    P3.tube("steel", [[1.7, 1.75, s * 1.14], [1.95, 2.3, s * 1.42], [1.72, 2.5, s * 1.16]], 0.01, { seg: 5, samples: 0, col: ODK2 });
    P3.box("milpaint", 0.03, 0.3, 0.18, 1.96, 2.3, s * 1.44, { col: ODK2, b: 0.012 });
    P3.box("chrome", 6e-3, 0.26, 0.15, 1.942, 2.3, s * 1.44, { b: 2e-3 });
  }
  P3.box("milpaint", 0.08, 0.8, 1.12, 3.32, 1.62, 0, { col: ODK2, b: 0.012 });
  for (let i = 0; i < 11; i++) P3.box("steel", 0.02, 0.66, 0.02, 3.37, 1.62, -0.45 + i * 0.09, { col: BLK2, b: 4e-3 });
  P3.cyl("steel", 0.04, 0.04, 3.2, 2.07, 0, { seg: 8, col: CHAS });
  P3.box("milpaint", 0.14, 0.26, 2.36, 3.62, 0.98, 0, { col: OD2, b: 0.02 });
  for (const s of [-1, 1]) {
    P3.beam("steel", [3.2, 0.98, s * 0.42], [3.6, 0.98, s * 0.42], 0.2, 0.08, { col: CHAS });
    P3.add("steel", ring(0.06, 0.016, { seg: 10, radial: 5 }), [0.3, 0.3, 0.3], { p: [3.72, 0.98, s * 0.72], r: [H, 0, 0] });
  }
  P3.cyl("steel", 0.11, 0.5, 3.45, 1, 0, { axis: "z", seg: 14, col: [0.25, 0.25, 0.26] });
  for (const z of [-0.26, 0.26]) P3.cyl("steel", 0.15, 0.02, 3.45, 1, z, { axis: "z", seg: 14, col: CHAS });
  P3.tube("steel", [[3.56, 1, 0], [3.72, 0.9, 0.05], [3.76, 0.72, 0.1]], 8e-3, { seg: 5, col: [0.5, 0.5, 0.5] });
  P3.add("steel", ring(0.04, 0.012, { seg: 10, radial: 5, a0: 0, a1: PI5 * 1.5 }), [0.55, 0.1, 0.08], { p: [3.76, 0.66, 0.1] });
  if (A) {
    const c = o.code || "stTruckA";
    P3.quad("decalF", 0.7, 0.7 / A.aspect(c), A.rect(c), { p: [3.692, 0.98, 0.72], r: [0, H, 0] });
    P3.quad("decalF", 0.7, 0.7 / A.aspect("stTruckB"), A.rect("stTruckB"), { p: [3.692, 0.98, -0.72], r: [0, H, 0] });
  }
  const cabSide = (s, open) => {
    P3.push({ p: [1.72, 0, s * 1.14], r: [0, s * -open, 0] });
    P3.add("milpaint", extrude([[-0.78, 1.2], [0, 1.2], [0, 1.9], [-0.06, 2.62], [-0.78, 2.62]], -0.02, 0.02, 6e-3, [[[-0.7, 1.98], [-0.12, 1.98], [-0.16, 2.52], [-0.7, 2.52]]]), OD2, { jit: 0.06 });
    P3.add("glassT", quadXY(0.56, 0.52), [0.5, 0.56, 0.52], { p: [-0.42, 2.25, 0] });
    P3.box("steel", 0.12, 0.03, 0.04, -0.62, 1.82, s * 0.03, { col: CHAS, b: 8e-3 });
    for (const y of [1.35, 2.4]) P3.box("steel", 0.04, 0.1, 0.03, -0.01, y, s * 0.02, { col: ODK2, b: 6e-3 });
    if (A) P3.quad("decalF", 0.34, 0.34, A.rect("roundel"), { p: [-0.4, 1.55, s * 0.022], r: [0, s > 0 ? 0 : PI5, 0] });
    P3.pop();
  };
  cabSide(1, 0);
  cabSide(-1, o.door ?? 1.1);
  P3.box("milpaint", 0.04, 1.42, 2.28, 0.92, 1.2, 0, { base: true, col: OD2, b: 8e-3 });
  P3.box("glass", 0.012, 0.3, 0.7, 0.9, 2.2, 0, { b: 0 });
  P3.box("steel", 1.1, 0.04, 2.24, 1.42, 1.2, 0, { col: CHAS, b: 6e-3 });
  P3.box("milpaint", 0.06, 0.72, 2.28, 1.75, 1.2, 0, { base: true, col: OD2, b: 0.01 });
  P3.box("milpaint", 0.3, 0.05, 2.2, 1.6, 1.9, 0, { col: ODK2, b: 0.012 });
  P3.push({ p: [1.74, 1.92, 0], r: [0, 0, 0.09] });
  for (const s of [-1, 1]) {
    P3.add("glassT", quadXY(1.04, 0.66), [0.5, 0.56, 0.52], { p: [0, 0.36, s * 0.55], r: [0, H, 0] });
    for (const [y, h] of [[0.02, 0.04], [0.7, 0.04]]) P3.box("milpaint", 0.035, h, 1.1, 0, y, s * 0.55, { col: OD2, b: 8e-3 });
    P3.box("milpaint", 0.035, 0.72, 0.04, 0, 0.36, s * 1.1, { col: OD2, b: 8e-3 });
    P3.bar("steel", [0.03, 0.7, s * 0.5], [0.035, 0.2, s * 0.3], 5e-3, { col: BLK2 });
  }
  P3.box("milpaint", 0.035, 0.72, 0.05, 0, 0.36, 0, { col: OD2, b: 8e-3 });
  P3.pop();
  {
    const g2 = softBox(0.9, 0.08, 2.3, 0.035, 5);
    deform(g2, (q) => {
      q.y += 0.035 * Math.cos(q.z / 1.15 * H) - 0.012 * Math.abs(Math.sin(q.z * 9));
    }, true);
    P3.add("canvas", g2, TARP, { p: [1.3, 2.66, 0] });
  }
  P3.add("canvas", softBox(0.5, 0.12, 1.9, 0.05, 4), [0.17, 0.18, 0.14], { p: [1.25, 1.66, 0] });
  P3.add("canvas", softBox(0.12, 0.6, 1.9, 0.05, 4), [0.17, 0.18, 0.14], { p: [1, 1.98, 0] });
  P3.box("steel", 0.4, 0.42, 1.9, 1.25, 1.4, 0, { col: CHAS, b: 0.01 });
  P3.bar("steel", [1.7, 1.5, -0.6], [1.45, 2, -0.6], 0.02, { col: BLK2 });
  P3.add("plastic", ring(0.23, 0.016, { seg: 18, radial: 6 }), BLK2, { p: [1.44, 2.02, -0.6], r: [0, H, -0.45] });
  P3.box("milpaint", 0.12, 0.3, 2.1, 1.68, 1.76, 0, { col: ODK2, b: 0.02 });
  if (A) P3.quad("signF", 0.5, 0.5 / A.aspect("gauges"), A.rect("gauges"), { p: [1.618, 1.78, -0.6], r: [0, -H, 0] });
  for (const dz of [-0.1, 0.12]) P3.bar("steel", [1.55, 1.24, dz], [1.4, 1.75, dz * 1.5], 0.012, { col: BLK2 });
  P3.cyl("plastic", 0.03, 0.05, 1.4, 1.77, -0.15, { seg: 8, col: BLK2 });
  P3.cyl("plastic", 0.03, 0.05, 1.4, 1.77, 0.18, { seg: 8, col: [0.55, 0.1, 0.08] });
  addWheel(P3, WR, 0.36, 0.88, 1.95, -0.55, { axis: "x", out: -1, rimCol: OD2, rimMat: "milpaint", ribs: 6, seg: 24, nuts: 8 });
  P3.bar("steel", [0.9, 1.3, -0.55], [0.9, 2, -0.55], 0.03, { col: CHAS });
  for (let k = 0; k < 3; k++) {
    P3.add("milpaint", softBox(0.34, 0.46, 0.16, 0.035, 3), k === 1 ? [0.5, 0.1, 0.08] : OD2, { p: [-0.4 + k * 0.36, 1.05, -1.06] });
    P3.cyl("steel", 0.022, 0.04, -0.3 + k * 0.36, 1.3, -1.06, { seg: 6, col: CHAS });
  }
  P3.box("steel", 1.14, 0.04, 0.22, -0.04, 0.8, -1.06, { col: CHAS });
  P3.box("steel", 1.14, 0.04, 0.012, -0.04, 1.1, -1.16, { col: CHAS });
  const bx3 = (BX[0] + BX[1]) / 2, bl = BX[1] - BX[0];
  P3.box("wood", bl, 0.06, 2 * BWd, bx3, FLR, 0, { col: WOODC, b: 6e-3 });
  for (let i = 0; i < 7; i++) P3.box("steel", 0.08, 0.1, 2 * BWd - 0.1, BX[0] + 0.3 + i * 0.62, FLR - 0.09, 0, { col: CHAS, b: 8e-3 });
  for (let k = 1; k < 8; k++) P3.box("black", bl, 4e-3, 8e-3, bx3, FLR + 0.032, -BWd + k * 0.295, { b: 0 });
  for (const s of [-1, 1]) {
    P3.box("milpaint", bl, 0.44, 0.04, bx3, FLR + 0.25, s * BWd, { col: OD2, b: 8e-3 });
    for (let i = 0; i < 6; i++) P3.box("milpaint", 0.06, 0.44, 0.03, BX[0] + 0.2 + i * 0.77, FLR + 0.25, s * (BWd + 0.03), { col: OD2, b: 8e-3 });
    P3.box("milpaint", bl, 0.04, 0.07, bx3, FLR + 0.485, s * (BWd + 0.01), { col: ODK2, b: 0.01 });
    for (let i = 0; i < 4; i++) P3.box("wood", 0.07, 0.75, 0.035, BX[0] + 0.3 + i * 1.2, FLR + 0.84, s * (BWd - 0.01), { col: WOODC, b: 6e-3 });
    for (const y of [0.62, 0.84, 1.08]) P3.box("wood", bl - 0.1, 0.13, 0.025, bx3, FLR + y, s * (BWd - 0.04), { col: WOODC, b: 6e-3 });
    if (cargo === "seats") {
      P3.box("wood", bl - 0.3, 0.035, 0.36, bx3, FLR + 0.45, s * (BWd - 0.24), { col: WOODC, b: 6e-3 });
      for (let i = 0; i < 4; i++) P3.bar("steel", [BX[0] + 0.4 + i * 1.15, FLR + 0.03, s * (BWd - 0.38)], [BX[0] + 0.4 + i * 1.15, FLR + 0.44, s * (BWd - 0.38)], 0.012, { col: CHAS });
    }
    P3.box("rubber", 0.02, 0.6, 0.5, -3.52, 0.82, s * 0.98, { col: BLK2, b: 4e-3 });
    P3.box("emRed", 0.02, 0.07, 0.12, -3.52, 1.08, s * 0.98, { b: 6e-3 });
  }
  P3.box("milpaint", 0.04, 0.9, 2 * BWd, BX[1], FLR + 0.03, 0, { base: true, col: OD2, b: 8e-3 });
  P3.push({ p: [BX[0], FLR + 0.03, 0], r: [0, 0, o.gate ? 2.9 : 0] });
  P3.box("milpaint", 0.045, 0.5, 2 * BWd, 0, 0, 0, { base: true, col: OD2, b: 8e-3 });
  for (const z of [-0.7, 0, 0.7]) P3.box("milpaint", 0.03, 0.46, 0.06, -0.035, 0.02, z, { base: true, col: OD2, b: 8e-3 });
  if (A) P3.quad("decalF", 0.7, 0.7 / A.aspect("stMax"), A.rect("stMax"), { p: [-0.026, 0.25, 0.35], r: [0, -H, 0] });
  P3.pop();
  if (o.gate) {
    for (const s of [-1, 1]) P3.tube("steel", catenary([BX[0], FLR + 0.5, s * (BWd - 0.03)], [BX[0] - 0.12, FLR - 0.4, s * (BWd - 0.03)], 0.05, 6), 7e-3, { seg: 4, col: [0.4, 0.4, 0.4] });
  }
  P3.box("steel", 0.14, 0.14, 0.2, -3.5, 0.95, 0, { col: CHAS, b: 0.02 });
  P3.add("steel", ring(0.05, 0.018, { seg: 10, radial: 5 }), [0.3, 0.3, 0.3], { p: [-3.6, 0.95, 0], r: [H, 0, 0] });
  for (const s of [-1, 1]) P3.box("milpaint", 0.12, 0.2, 0.3, -3.5, 0.98, s * 0.6, { col: OD2, b: 0.02 });
  const TOP = FLR + 1.95, bowsX = [0, 1, 2, 3, 4].map((i) => BX[0] + 0.08 + i * (bl - 0.16) / 4), bowPt = (t, out) => {
    const a = t * PI5, w = BWd - 0.02, r = 0.5, c = Math.cos(a), s = Math.sin(a);
    out[0] = c > 0 ? w - r + r * Math.pow(c, 0.5) : -(w - r) - r * Math.pow(-c, 0.5);
    out[1] = FLR + 0.5 + (TOP - FLR - 0.5) * Math.pow(s, 0.42);
    return out;
  }, tmp2 = [0, 0];
  for (const x of bowsX) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      bowPt(i / 14, tmp2);
      pts.push([x, tmp2[1], tmp2[0]]);
    }
    if (canvas !== "full" || x === bowsX[0]) P3.tube("steel", pts, 0.018, { seg: 6, samples: 0, col: ODK2 });
  }
  if (canvas !== "bows") {
    const xa = canvas === "half" ? BX[0] + bl * 0.45 : BX[0] - 0.04, xb = BX[1] + 0.04, nu = 25, U = Array.from({ length: nu }, (_, i) => lerp2(xa, xb, i / (nu - 1))), V = Array.from({ length: 23 }, (_, i) => i / 22);
    const g2 = gridSurf(U, V, (x, t, q) => {
      bowPt(t, tmp2);
      let nearest = 9;
      for (const b of bowsX) nearest = Math.min(nearest, Math.abs(x - b));
      const sag = 0.035 * sstep(0, 0.45, nearest) * Math.sin(t * PI5), wr = 0.012 * Math.sin(x * 23 + t * 9);
      q.set(x, tmp2[1] + 0.03 - sag + wr, tmp2[0] * (1 + 0.012) - Math.sign(tmp2[0]) * sag * 0.4);
      return TARP;
    });
    g2.computeVertexNormals();
    P3.add("canvas", g2, null, { jit: 0.06 });
    for (const s of [-1, 1]) {
      const sk = gridSurf(U, [0, 0.5, 1], (x, t, q) => {
        q.set(x, FLR + 0.53 - t * 0.34, s * (BWd + 0.045 + 0.02 * Math.sin(x * 11 + t * 3)));
        return TARP;
      });
      sk.computeVertexNormals();
      P3.add("canvas", sk, null);
      for (let i = 0; i < 6; i++) {
        const x = lerp2(xa + 0.2, xb - 0.2, i / 5);
        P3.bar("burlap", [x, FLR + 0.22, s * (BWd + 0.07)], [x + 0.06, FLR + 0.02, s * (BWd + 0.05)], 5e-3, { col: [0.6, 0.56, 0.45] });
      }
    }
    if (canvas === "half") {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        bowPt(i / 14, tmp2);
        pts.push([xa - 0.05, tmp2[1] + 0.06, tmp2[0] * 1.02]);
      }
      P3.add("canvas", tube(pts, 0.09, 8, { samples: 0 }), TARP);
    }
    const end = (x, y0) => {
      const pts = [[0, y0]];
      for (let i = 0; i <= 12; i++) {
        bowPt(i / 12, tmp2);
        pts.push([tmp2[0], Math.max(y0, tmp2[1])]);
      }
      return extrude(pts.map(([z, y]) => [-z, y]), -6e-3, 6e-3, 1e-3);
    };
    P3.add("canvas", end(xb, FLR + 0.5), TARP, { r: [0, H, 0], p: [xb, 0, 0] });
    if (canvas === "full") {
      P3.cyl("canvas", 0.1, 1.9, xa - 0.04, TOP - 0.16, 0, { axis: "z", seg: 10, col: TARP, cham: 0.03 });
      for (const z of [-0.6, 0, 0.6]) P3.add("burlap", ring(0.105, 8e-3, { seg: 10, radial: 4 }), [0.6, 0.56, 0.45], { p: [xa - 0.04, TOP - 0.16, z] });
    }
  }
  if (cargo === "crates") {
    const crate2 = (x, y, z, w, h, d, ry, st) => {
      P3.push({ p: [x, y, z], r: [0, ry, 0] });
      P3.box("wood", w, h, d, 0, 0, 0, { base: true, col: [0.36, 0.34, 0.22], b: 6e-3 });
      for (const s of [-1, 1]) {
        P3.box("wood", 0.07, h + 0.01, d + 0.02, s * (w / 2 - 0.08), 0, 0, { base: true, col: [0.3, 0.28, 0.18], b: 4e-3 });
      }
      P3.box("steel", w + 0.01, 0.03, 0.012, 0, h * 0.5, d / 2 + 4e-3, { col: CHAS, b: 0 });
      if (A && st) P3.quad("decalF", Math.min(w * 0.8, 0.6), Math.min(w * 0.8, 0.6) / A.aspect(st), A.rect(st), { p: [0, h * 0.5, d / 2 + 0.012] });
      P3.pop();
    };
    crate2(-2.9, FLR + 0.03, -0.55, 0.9, 0.5, 0.6, H, "stRations");
    crate2(-2.9, FLR + 0.03, 0.4, 0.9, 0.5, 0.6, H + 0.1, "stMed");
    crate2(-2.86, FLR + 0.53, -0.1, 0.8, 0.42, 0.55, H - 0.2, "stRations");
    crate2(-1.6, FLR + 0.03, -0.6, 1.1, 0.6, 0.7, 0.1, "stBlank");
    crate2(-0.4, FLR + 0.03, 0.5, 1, 0.7, 0.8, -0.1, "stMed");
    crate2(-0.5, FLR + 0.03, -0.55, 0.8, 0.45, 0.6, 0.3, "stRations");
    for (let k = 0; k < 4; k++) P3.add("burlap", softBox(0.7, 0.2, 0.42, 0.09, 4), [0.5, 0.45, 0.33], { p: [-1.75 + k % 2 * 0.1, FLR + 0.13 + k * 0.17, 0.5], r: [0, k * 0.2, 0] });
  }
  P3.col([0.86, 0, -1.2], [3.72, 2.7, 1.2], { surface: "metal" });
  P3.col([BX[0] - 0.06, 0, -1.22], [0.86, canvas === "bows" ? FLR + 1.2 : TOP, 1.22], { surface: "metal", noBullet: true });
  const bc = (a, b, sf = "metal") => P3.col(a, b, { surface: sf, bulletOnly: true });
  bc([BX[0], 0.4, -1.22], [0.86, FLR + 0.5, 1.22]);
  if (canvas === "full") {
    bc([BX[0] - 0.05, FLR + 0.5, -1.22], [0.86, TOP + 0.05, -1.12], "cloth");
    bc([BX[0] - 0.05, FLR + 0.5, 1.12], [0.86, TOP + 0.05, 1.22], "cloth");
    bc([BX[0] - 0.05, TOP - 0.2, -1.2], [0.86, TOP + 0.08, 1.2], "cloth");
  }
  return P3.finish({ grime: 0.95, ground: 0.6 });
});

