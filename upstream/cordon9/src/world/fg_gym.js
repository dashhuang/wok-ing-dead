var G2 = SITE.gym;
var HX = (G2.x1 - G2.x0) / 2;
var HZ = (G2.z1 - G2.z0) / 2;
var T2 = G2.wall;
var FL = G2.floor;
var EV = G2.eave;
var RG = G2.ridge;
var CX = (G2.x0 + G2.x1) / 2;
var CZ = (G2.z0 + G2.z1) / 2;
var BRICK = [0.62, 0.36, 0.27];
var BRICKD = [0.4, 0.25, 0.2];
var CLAD = [0.22, 0.3, 0.36];
var CREAM2 = [0.52, 0.52, 0.47];
var DADO = [0.1, 0.22, 0.25];
var FRAME = [0.74, 0.76, 0.74];
var TRIM = [0.13, 0.17, 0.2];
var CONC = [0.78, 0.77, 0.74];
var ALU = [0.8, 0.82, 0.84];
var DOORH = 2.3;
var BRH = 2.7;
var WIN0 = 4.5;
var WIN1 = 6;
var SLOPE = (RG - EV) / (HZ + T2);
var ANG = Math.atan(SLOPE);
var HALL_DOORS = { south: SITE.gymDoors.south.map(([c, w]) => [c - CX, w]), north: SITE.gymDoors.north.map(([c, w]) => [-(c - CX), w]), east: SITE.gymDoors.east.map(([c, w]) => [-(c - CZ), w]), west: SITE.gymDoors.west.map(([c, w]) => [c - CZ, w]) };
var WALLS = { south: { p: [0, 0, HZ], r: [0, 0, 0], L: 2 * (HX + T2), gable: false }, north: { p: [0, 0, -HZ], r: [0, PI5, 0], L: 2 * (HX + T2), gable: false }, east: { p: [HX, 0, 0], r: [0, H, 0], L: 2 * HZ, gable: true }, west: { p: [-HX, 0, 0], r: [0, -H, 0], L: 2 * HZ, gable: true } };
var I_SEC = (w, d, tf = 0.014, tw = 9e-3) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, -d / 2 + tf], [tw / 2, -d / 2 + tf], [tw / 2, d / 2 - tf], [w / 2, d / 2 - tf], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, d / 2 - tf], [-tw / 2, d / 2 - tf], [-tw / 2, -d / 2 + tf], [-w / 2, -d / 2 + tf]];
function wall(P3, name, A) {
  const Wd = WALLS[name], L = Wd.L, doors = HALL_DOORS[name].slice().sort((a, b) => a[0] - b[0]), yTop = (u) => Wd.gable ? RG - Math.abs(u) * SLOPE - 0.02 : EV;
  P3.push({ p: Wd.p, r: Wd.r });
  const runs = [];
  let p0 = -L / 2;
  for (const [c, w] of doors) {
    runs.push([p0, c - w / 2]);
    p0 = c + w / 2;
  }
  runs.push([p0, L / 2]);
  for (const [a, b] of runs) {
    if (b - a < 0.02) continue;
    const w = b - a, c = (a + b) / 2;
    P3.box("brick", w, DOORH, 0.16, c, 0, T2 - 0.08, { base: true, col: BRICK, b: 4e-3 });
    P3.box("block", w, DOORH - FL, 0.14, c, FL, 0.07, { base: true, col: CREAM2, b: 3e-3 });
    P3.box("block", w, 1.25, 0.012, c, FL, -4e-3, { base: true, col: DADO, b: 2e-3 });
    P3.box("concrete", w + 0.02, 0.28, 0.03, c, 0, T2 + 0.012, { base: true, col: BRICKD, b: 8e-3 });
    P3.box("wood", w, 0.11, 0.022, c, FL, -0.016, { base: true, col: [0.5, 0.4, 0.28], b: 6e-3 });
  }
  P3.box("brick", L, BRH - DOORH, 0.16, 0, DOORH, T2 - 0.08, { base: true, col: BRICK, b: 4e-3 });
  P3.box("block", L, BRH - DOORH, 0.14, 0, DOORH, 0.07, { base: true, col: CREAM2, b: 3e-3 });
  P3.box("concrete", L + 0.04, 0.12, 0.2, 0, BRH, T2 - 0.08, { base: true, col: CONC, b: 0.012 });
  for (const [c, w] of doors) {
    P3.box("concrete", w + 0.5, 0.2, T2 + 0.03, c, DOORH - 0.02, T2 / 2, { base: true, col: CONC, b: 0.01 });
    for (const s of [-1, 1]) P3.box("paint", 0.06, DOORH - 0.02, T2 + 0.02, c + s * (w / 2 - 0.03), 0, T2 / 2, { base: true, col: TRIM, b: 6e-3 });
    P3.box("paint", w, 0.06, T2 + 0.02, c, DOORH - 0.08, T2 / 2, { base: true, col: TRIM, b: 6e-3 });
    P3.ext("concrete", [[0, 0], [T2 + 0.75, 0], [T2 + 0.05, FL], [0, FL]].map(([z, y]) => [z, y]), -(c + w / 2 + 0.1), -(c - w / 2 - 0.1), { plane: "xy", r: [0, -H, 0], bevel: 6e-3, col: CONC });
    P3.box("steel", w - 0.1, 0.012, 0.12, c, FL + 4e-3, T2 / 2, { col: ALU, b: 3e-3 });
  }
  if (!Wd.gable) {
    for (const [y0, y1] of [[BRH + 0.12, WIN0], [WIN1, EV + 0.06]]) {
      P3.add("paint", corrugated(L, y1 - y0, { pitch: 0.25, depth: 0.03 }), CLAD, { p: [0, (y0 + y1) / 2, T2 - 0.03], jit: 0.07, cell: 2 });
      P3.box("block", L - 2 * T2, y1 - y0, 0.14, 0, y0, 0.07, { base: true, col: CREAM2, b: 3e-3 });
    }
    P3.box("paint", L, 0.07, 0.12, 0, WIN0 - 0.035, T2 - 0.02, { col: TRIM, b: 8e-3 });
    P3.box("paint", L, 0.07, 0.12, 0, WIN1 + 0.035, T2 - 0.02, { col: TRIM, b: 8e-3 });
    P3.box("paint", L - 2 * T2, 0.05, 0.16, 0, WIN0 + 0.02, 0.08, { col: FRAME, b: 6e-3 });
    const nb2 = 24, bw = (L - 2 * T2) / nb2, R4 = rng(name.length * 91 + 5);
    for (let i = 0; i <= nb2; i++) P3.box("paint", 0.06, WIN1 - WIN0, 0.1, -L / 2 + T2 + i * bw, WIN0, T2 - 0.06, { base: true, col: TRIM, b: 6e-3 });
    for (let i = 0; i < nb2; i++) {
      const u = -L / 2 + T2 + (i + 0.5) * bw, v = R4();
      if (v < 0.1) {
        P3.box("wood", bw - 0.06, WIN1 - WIN0, 0.018, u, WIN0, T2 - 0.1, { base: true, col: [0.52, 0.42, 0.3], b: 3e-3 });
        continue;
      }
      P3.add("glassT", quadXY(bw - 0.06, WIN1 - WIN0 - 0.02), [0.6, 0.66, 0.66], { p: [u, (WIN0 + WIN1) / 2, T2 - 0.07] });
      P3.box("paint", bw - 0.06, 0.03, 0.05, u, WIN0 + 0.75, T2 - 0.07, { col: TRIM, b: 4e-3 });
    }
    P3.box("paint", L + 0.6, 0.24, 0.03, 0, EV - 0.02, T2 + 0.36, { col: TRIM, b: 6e-3 });
    P3.add("plastic", lathe([[0.075, -(L + 0.5) / 2], [0.075, (L + 0.5) / 2]], 10, { axis: "x", arc: PI5, start: PI5 }), [0.1, 0.1, 0.11], { p: [0, EV - 0.06, T2 + 0.46] });
    for (let i = 0; i < 4; i++) {
      const u = -L / 2 + 1.2 + i * (L - 2.4) / 3;
      P3.tube("plastic", [[u, EV - 0.13, T2 + 0.46], [u, EV - 0.4, T2 + 0.44], [u, EV - 0.7, T2 + 0.1], [u, 3, T2 + 0.07], [u, 0.2, T2 + 0.07], [u, 0.08, T2 + 0.2]], 0.038, { seg: 7, samples: 0, col: [0.1, 0.1, 0.11] });
      for (const y of [0.9, 2.4, 4.2, 5.9]) P3.box("plastic", 0.11, 0.03, 0.05, u, y, T2 + 0.05, { col: [0.1, 0.1, 0.11], b: 4e-3 });
    }
  } else {
    const n = 16, sw = L / n;
    for (let i = 0; i < n; i++) {
      const u = -L / 2 + (i + 0.5) * sw, top = Math.min(yTop(u - sw / 2), yTop(u + sw / 2)) + sw * SLOPE * 0.5;
      P3.add("paint", corrugated(sw, top - BRH - 0.12, { pitch: 0.25, depth: 0.03 }), CLAD, { p: [u, (top + BRH + 0.12) / 2, T2 - 0.03], jit: 0.07, cell: 2 });
    }
    P3.ext("block", [[-L / 2, BRH], [L / 2, BRH], [L / 2, EV - 0.1], [0, RG - 0.3], [-L / 2, EV - 0.1]], 0, 0.14, { plane: "xy", bevel: 3e-3, col: CREAM2 });
    for (const s of [-1, 1]) P3.beam("paint", [s * (L / 2 + T2 + 0.3), EV + 0.02 - 0.3 * SLOPE, T2 + 0.02], [0, RG + 0.05, T2 + 0.02], 0.22, 0.03, { col: TRIM });
    P3.box("paint", 1.5, 1, 0.06, 0, 7.6, T2, { col: TRIM, b: 0.01 });
    for (let i = 0; i < 9; i++) P3.box("paint", 1.36, 0.012, 0.09, 0, 7.2 + i * 0.1, T2 + 0.03, { col: [0.3, 0.33, 0.35], b: 3e-3, r: [0.7, 0, 0] });
  }
  P3.pop();
}
var sportsHall = (seed = 1, o = {}) => proto("hall" + seed, () => {
  const P3 = new Prop("sportsHall", seed), A = o.atlas, R4 = rng(seed * 17 + 3);
  for (const n of ["south", "north", "east", "west"]) wall(P3, n, A);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P3.box("paint", 0.1, EV - BRH, 0.1, sx * (HX + T2 - 0.03), BRH, sz * (HZ + T2 - 0.03), { base: true, col: TRIM, b: 0.01 });
  P3.box("court", 2 * HX, FL, 2 * HZ, 0, 0, 0, { base: true, b: 0 });
  const line = (x0, z0, x1, z1, col, w = 0.05, y = 15e-4) => P3.box("paint", Math.abs(x1 - x0) + w, 2e-3, Math.abs(z1 - z0) + w, (x0 + x1) / 2, FL + y, (z0 + z1) / 2, { col, b: 0 });
  const arc2 = (cx, cz, r, a0, a1, col, y = 15e-4) => {
    const n = Math.max(6, Math.round(Math.abs(a1 - a0) * r * 3)), pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = lerp2(a0, a1, i / n), c = Math.cos(a), s = Math.sin(a);
      pos.push(cx + c * (r - 0.025), FL + y + 1e-3, cz + s * (r - 0.025), cx + c * (r + 0.025), FL + y + 1e-3, cz + s * (r + 0.025));
      if (i < n) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    P3.add("paint", fromArrays(pos, null, null, idx), col);
  };
  const WHT3 = [0.86, 0.86, 0.82], YEL2 = [0.8, 0.66, 0.1], REDL = [0.62, 0.1, 0.08], BLU2 = [0.1, 0.25, 0.55];
  line(-13, -7, 13, -7, WHT3);
  line(-13, 7, 13, 7, WHT3);
  line(-13, -7, -13, 7, WHT3);
  line(13, -7, 13, 7, WHT3);
  line(0, -7, 0, 7, WHT3);
  arc2(0, 0, 1.8, 0, PI5 * 2, WHT3);
  for (const s of [-1, 1]) {
    line(s * 13, -2.45, s * 7.2, -2.45, WHT3);
    line(s * 13, 2.45, s * 7.2, 2.45, WHT3);
    line(s * 7.2, -2.45, s * 7.2, 2.45, WHT3);
    arc2(s * 7.2, 0, 1.8, s > 0 ? H : -H, s > 0 ? H + PI5 : H, WHT3);
    arc2(s * 11.4, 0, 6.2, s > 0 ? H + 0.22 : -H + 0.22, s > 0 ? H + PI5 - 0.22 : H - 0.22, WHT3);
  }
  for (let k = 0; k < 4; k++) {
    const cx = -10.5 + k * 7;
    for (const dx of [-3.05, -2.59, 0, 2.59, 3.05]) line(cx + dx, -6.7, cx + dx, 6.7, YEL2, 0.04, 3e-3);
    for (const dz of [-6.7, -5.94, -1.98, 1.98, 5.94, 6.7]) line(cx - 3.05, dz, cx + 3.05, dz, YEL2, 0.04, 3e-3);
  }
  line(-14.2, -7.5, 14.2, -7.5, BLU2, 0.07, 45e-4);
  line(-14.2, 7.5, 14.2, 7.5, BLU2, 0.07, 45e-4);
  for (const s of [-1, 1]) {
    line(s * 14.2, -7.5, s * 14.2, 7.5, BLU2, 0.07, 45e-4);
    arc2(s * 14.2, 0, 4.2, s > 0 ? H : -H, s > 0 ? H + PI5 : H, BLU2, 45e-4);
    line(s * 4.6, -7.4, s * 4.6, 7.4, REDL, 0.05, 6e-3);
  }
  const colX = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5], zc = HZ - 0.19, yA = RG - 0.42;
  for (const x of colX) for (const s of [-1, 1]) {
    P3.add("paint", extrude(I_SEC(0.2, 0.36), FL, EV - 0.25, 1e-3), FRAME, { r: [-H, 0, 0], p: [x, 0, s * zc] });
    P3.box("steel", 0.3, 0.02, 0.46, x, FL + 0.01, s * zc, { col: [0.3, 0.3, 0.3], b: 4e-3 });
    for (const dx of [-0.11, 0.11]) for (const dz of [-0.18, 0.18]) P3.cyl("galv", 0.014, 0.03, x + dx, FL + 0.03, s * zc + dz, { seg: 6 });
    P3.beam("paint", [x, EV - 0.25, s * zc], [x, yA, 0], 0.2, 0.32, { col: FRAME, b: 0.01, twist: H });
    P3.ext("paint", [[0, 0], [0, -0.75], [1.6, 0.36]].map(([z, y]) => [z, y]), -6e-3, 6e-3, { plane: "xy", bevel: 1e-3, col: FRAME, p: [x, EV - 0.42, s * (zc - 0.16)], r: [0, s > 0 ? H : -H, 0] });
    P3.box("steel", 0.24, 0.5, 0.02, x, yA - 0.04, 0, { col: [0.5, 0.52, 0.52], b: 4e-3 });
    P3.add("canvas", softBox(0.3, 1.8, 0.44, 0.05, 3), [0.1, 0.2, 0.42], { p: [x, FL + 0.92, s * (zc - 0.02)] });
    P3.col([x - 0.16, FL, s * zc - 0.22], [x + 0.16, EV, s * zc + 0.22], { surface: "metal" });
  }
  for (const s of [-1, 1]) {
    P3.beam("paint", [-HX, EV - 0.32, s * zc], [HX, EV - 0.32, s * zc], 0.14, 0.2, { col: FRAME, b: 6e-3 });
    for (let k = 1; k <= 5; k++) {
      const z = s * zc * k / 5.4, y = yA + 0.2 - Math.abs(z) * SLOPE + 0.06;
      P3.add("galv", extrude([[-0.03, -0.09], [0.03, -0.09], [0.03, -0.083], [4e-3, -0.083], [4e-3, 0.083], [0.03, 0.083], [0.03, 0.09], [-0.03, 0.09], [-0.03, 0.083], [-4e-3, 0.083], [-4e-3, -0.083], [-0.03, -0.083]], -HX, HX, 1e-3), [0.8, 0.82, 0.84], { r: [0, H, s * ANG], p: [0, y, z] });
    }
    for (const x of [-12.5, 7.5]) {
      P3.bar("galv", [x, FL + 0.3, s * (zc + 0.1)], [x + 5, EV - 0.5, s * (zc + 0.1)], 0.012);
      P3.bar("galv", [x + 5, FL + 0.3, s * (zc + 0.1)], [x, EV - 0.5, s * (zc + 0.1)], 0.012);
    }
  }
  const ext = HZ + T2 + 0.42, sl = Math.hypot(ext, ext * SLOPE), ym = RG + 0.05 - ext * SLOPE / 2;
  for (const s of [-1, 1]) {
    P3.push({ r: [0, s > 0 ? 0 : PI5, 0] });
    P3.add("galv", corrugated(2 * (HX + T2) + 0.7, sl, { pitch: 0.3, depth: 0.04, ny: 3 }), [0.5, 0.53, 0.56], { p: [0, ym, ext / 2], r: [-H + ANG, 0, 0], jit: 0.08, cell: 1.5 });
    P3.box("paint", 2 * HX, 0.03, sl - 0.7, 0, ym - 0.1, ext / 2 - 0.3, { col: [0.84, 0.85, 0.82], b: 0, r: [ANG, 0, 0] });
    for (const x of [-(HX + T2 + 0.36), HX + T2 + 0.36]) P3.beam("paint", [x, RG + 0.06, 0], [x, RG + 0.06 - ext * SLOPE, ext], 0.03, 0.2, { col: TRIM });
    P3.pop();
  }
  P3.add("galv", extrude([[-0.3, -0.08], [0, 0], [0.3, -0.08], [0.3, -0.07], [0, 0.012], [-0.3, -0.07]], -(HX + T2 + 0.35), HX + T2 + 0.35, 1e-3), [0.56, 0.58, 0.6], { r: [0, H, 0], p: [0, RG + 0.11, 0] });
  for (const x of [-10, -3.4, 3.4, 10]) {
    P3.cyl("galv", 0.2, 0.25, x, RG + 0.18, 0, { seg: 12, col: ALU });
    P3.lathe("galv", [[0.2, 0], [0.3, 0.08], [0.3, 0.3], [0.16, 0.42], [1e-3, 0.45]], { seg: 16, col: ALU, p: [x, RG + 0.3, 0] });
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * PI5 * 2;
      P3.box("galv", 6e-3, 0.24, 0.07, x + Math.cos(a) * 0.305, RG + 0.49, Math.sin(a) * 0.305, { col: [0.6, 0.62, 0.64], b: 0, r: [0, -a + 0.5, 0] });
    }
  }
  const live = { "1,0": 1, "3,1": 1, "0,1": 2, "4,0": 1, "2,1": 1 };
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
    const x = -12 + i * 6, z = j ? 3.7 : -3.7, yl = 6.35, st = live[i + "," + j] || 0, top = yA + 0.2 - 3.7 * SLOPE;
    P3.bar("galv", [x, top, z], [x, yl + 0.42, z], 8e-3);
    P3.cyl("paint", 0.07, 0.16, x, yl + 0.36, z, { seg: 10, col: [0.2, 0.2, 0.21] });
    P3.lathe("galv", [[0.07, 0.3], [0.1, 0.26], [0.24, 0.05], [0.26, 0], [0.25, 0]], { seg: 16, col: ALU, p: [x, yl, z] });
    P3.lathe("galv", [[0.25, 0], [0.23, 0.05], [0.09, 0.25]], { seg: 16, col: [0.9, 0.9, 0.9], p: [x, yl, z] });
    P3.cyl(st === 2 ? "lampTubeF" : st ? "lampHall" : "glass", 0.2, 0.012, x, yl + 0.03, z, { seg: 14 });
    P3.tube("rubber", [[x + 0.05, yl + 0.4, z], [x + 0.2, yl + 0.7, z], [x + 0.1, top - 0.05, z]], 6e-3, { seg: 4, col: [0.1, 0.1, 0.1] });
    if (st) P3.glow("fill", [x, yl - 0.9, z], { col: [0.8, 0.94, 1], power: st === 2 ? 7 : 9, dist: 13, dir: [0, -1, 0], cone: 0.85, tube: st === 2 ? 1 : 0 });
  }
  for (const s of [-1, 1]) for (let k = 0; k < 20; k++) {
    const za = k ? ext * k / 20 : -0.05, zb = ext * (k + 1) / 20;
    P3.col([-HX - T2 - 0.35, RG - zb * SLOPE - 0.02, s > 0 ? za : -zb], [HX + T2 + 0.35, RG + 0.07 - za * SLOPE, s > 0 ? zb : -za], { surface: "metal", bulletOnly: true });
  }
  P3.box("galv", 2 * HX - 1, 0.03, 0.15, 0, yA - 0.36, 0, { col: ALU, b: 4e-3 });
  for (const z of [-3.7, 3.7]) P3.bar("galv", [-12.4, yA + 0.12 - 3.7 * SLOPE, z + 0.06], [12.4, yA + 0.12 - 3.7 * SLOPE, z + 0.06], 0.012);
  for (let k = 0; k < 5; k++) {
    const x0 = -4.6 + k * 1.12, open = k === 1 ? 0.9 : k === 4 ? 0.35 : 0;
    P3.push({ p: [x0, FL, -HZ + 0.09], r: [0, -open, 0] });
    for (const x of [0, 1]) P3.box("wood", 0.045, 2.7, 0.12, x, 0, 0.06, { base: true, col: [0.62, 0.48, 0.3], b: 6e-3 });
    for (let i = 0; i < 14; i++) P3.bar("wood", [0, 0.18 + i * 0.18, 0.08], [1, 0.18 + i * 0.18, 0.08], 0.017, { col: [0.66, 0.52, 0.33], seg: 7 });
    P3.bar("wood", [0, 2.62, 0.2], [1, 2.62, 0.2], 0.017, { col: [0.66, 0.52, 0.33], seg: 7 });
    P3.pop();
  }
  P3.col([-4.7, FL, -HZ], [1.1, 2.9, -HZ + 0.22], { surface: "wood" });
  for (const s of [-1, 1]) {
    P3.push({ p: [s * HX, 0, 0], r: [0, s > 0 ? -H : H, 0] });
    for (const u of [-0.5, 0.5]) {
      P3.beam("paint", [u, 4.3, 0.1], [u * 0.8, 3.75, 1.2], 0.05, 0.05, { col: FRAME });
      P3.beam("paint", [u, 3, 0.1], [u * 0.8, 3.5, 1.2], 0.05, 0.05, { col: FRAME });
      P3.box("steel", 0.14, 0.2, 0.012, u, 4.3, 0.105, { col: FRAME });
      P3.box("steel", 0.14, 0.2, 0.012, u, 3, 0.105, { col: FRAME });
    }
    P3.box("paint", 1.84, 1.24, 0.03, 0, 3.72, 1.2, { col: [0.86, 0.86, 0.84], b: 6e-3 });
    for (const [w, h, y] of [[0.59, 0.03, 3.72], [0.59, 0.03, 3.3], [0.03, 0.45, 3.5]]) for (const dx of w > 0.1 ? [0] : [-0.28, 0.28]) P3.box("paint", w, h, 4e-3, dx, y, 1.217, { col: [0.75, 0.1, 0.08], b: 0 });
    P3.add("paint", ring(0.225, 9e-3, { seg: 20, radial: 6 }), [0.8, 0.3, 0.06], { p: [0, 3.2, 1.46], r: [H, 0, 0] });
    P3.box("paint", 0.1, 0.012, 0.1, 0, 3.2, 1.26, { col: [0.8, 0.3, 0.06] });
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * PI5 * 2;
      P3.bar("galv", [Math.cos(a) * 0.225, 3.2, 1.46 + Math.sin(a) * 0.225], [Math.cos(a + 0.3) * 0.15, 2.82, 1.46 + Math.sin(a + 0.3) * 0.15], 4e-3);
    }
    P3.pop();
  }
  P3.beam("paint", [9.5, 7, -6.6], [9.5, 7, 0.5], 0.1, 0.14, { col: FRAME });
  for (const z of [-6.4, 0.3]) P3.bar("galv", [9.5, 7.07, z], [9.5, yA + 0.1 - Math.abs(z) * SLOPE, z], 0.01);
  for (let k = 0; k < 4; k++) {
    const z = -5.6 + k * 0.5;
    P3.tube("burlap", [[9.5, 6.95, z], [9.52, 4, z + 0.02], [9.7, 2, z - 0.3 - k * 0.1], [10.6, 1.45, -7.3]], 0.018, { seg: 6, col: [0.66, 0.56, 0.4] });
    P3.cyl("steel", 0.03, 0.06, 9.5, 6.93, z, { seg: 8, col: [0.3, 0.3, 0.3] });
  }
  P3.add("steel", ring(0.05, 8e-3, { seg: 10, radial: 5 }), [0.5, 0.5, 0.5], { p: [10.62, 1.45, -7.82], r: [0, 0, 0] });
  P3.bar("galv", [4, 6.7, -HZ + 0.2], [4, 6.7, HZ - 0.2], 0.012);
  {
    const g2 = quadXY(6.2, 6.3, null, 14, 6), Pp = g2.attributes.position;
    for (let i = 0; i < Pp.count; i++) {
      const x = Pp.getX(i), t = (x + 3.1) / 6.2;
      Pp.setZ(i, 0.16 * Math.sin(t * 34) * (0.4 + 0.6 * (0.5 - Pp.getY(i) / 6.3)));
      Pp.setX(i, -3.1 + t * 2.6);
    }
    g2.computeVertexNormals();
    P3.add("meshNet", g2, null, { p: [4, 3.5, -HZ + 3.5], r: [0, H, 0] });
  }
  for (const n of ["south", "north", "east", "west"]) {
    const Wd = WALLS[n];
    P3.push({ p: Wd.p, r: Wd.r });
    for (const [c, w] of HALL_DOORS[n]) {
      P3.box("plastic", 0.5, 0.2, 0.06, c, DOORH + 0.42, -0.04, { col: [0.85, 0.85, 0.82], b: 8e-3 });
      if (A) {
        P3.quad("signF", 0.46, 0.46 / A.aspect("exit"), A.rect("exit"), { p: [c, DOORH + 0.42, -0.072], r: [0, PI5, 0] });
        P3.quad("signFLit", 0.46, 0.46 / A.aspect("exit"), A.rect("exit"), { p: [c, DOORH + 0.42, -0.074], r: [0, PI5, 0] });
      }
      P3.glow("fill", [c, DOORH + 0.3, -0.5], { col: [0.2, 1, 0.45], power: 0.7, dist: 4 });
      P3.box("plastic", 0.09, 0.09, 0.03, c + w / 2 + 0.3, FL + 1.3, -0.016, { col: [0.75, 0.08, 0.06], b: 6e-3 });
      P3.cyl("paint", 0.06, 0.42, c - w / 2 - 0.35, FL + 0.55, -0.1, { seg: 10, cham: 0.02, col: [0.7, 0.07, 0.05] });
      P3.box("steel", 0.1, 0.04, 0.05, c - w / 2 - 0.35, FL + 0.7, -0.03, { col: [0.3, 0.3, 0.3] });
      P3.add("plastic", softBox(0.34, 0.13, 0.15, 0.03, 3), [0.12, 0.12, 0.13], { p: [c, DOORH + 0.62, T2 + 0.08] });
      P3.box(n === "north" ? "lampTubeF" : "lampCyan", 0.28, 0.02, 0.1, c, DOORH + 0.55, T2 + 0.085, { b: 4e-3 });
      P3.glow("fill", [c, DOORH + 0.4, T2 + 0.5], { col: [0.62, 0.92, 1], power: 5, dist: 9, dir: [0, -0.85, 0.52], cone: 0.75, tube: n === "north" ? 1 : 0 });
    }
    P3.pop();
  }
  {
    const c = HALL_DOORS.south[0][0], z = HZ + T2;
    P3.box("paint", 4.6, 0.14, 1.9, c, 2.95, z + 0.95, { col: TRIM, b: 0.02 });
    P3.box("galv", 4.5, 0.02, 1.8, c, 3.03, z + 0.95, { col: [0.5, 0.53, 0.56], b: 3e-3 });
    for (const s of [-1, 1]) {
      P3.bar("galv", [c + s * 2.1, 3.02, z + 1.7], [c + s * 2.1, 4.3, z + 0.05], 0.014);
      P3.box("steel", 0.1, 0.1, 0.02, c + s * 2.1, 4.3, z + 0.04, { col: [0.3, 0.3, 0.3] });
    }
    P3.box("paint", 4.52, 0.1, 0.02, c, 2.9, z + 1.9, { col: [0.82, 0.6, 0.08], b: 4e-3 });
    for (const dx of [-1.2, 1.2]) {
      P3.box("plastic", 0.9, 0.05, 0.16, c + dx, 2.86, z + 1, { col: [0.85, 0.85, 0.82], b: 0.01 });
      P3.box(dx > 0 ? "lampTube" : "glass", 0.84, 0.012, 0.1, c + dx, 2.83, z + 1, { b: 2e-3 });
    }
    P3.glow("fill", [c + 1.2, 2.5, z + 1.1], { col: [0.74, 0.92, 1], power: 14, dist: 11, dir: [0, -0.9, 0.42], cone: 0.9 });
    if (A) {
      const q = (name, w, x, y, zz, mat = "signF", r = null) => P3.quad(mat, w, w / A.aspect(name), A.rect(name), { p: [x, y, zz], r });
      P3.box("paint", 5.3, 5.3 / A.aspect("school") + 0.1, 0.05, c, 3.9, z + 0, { col: TRIM, b: 8e-3 });
      q("school", 5.2, c, 3.9, z + 0.03);
      q("kestrels", 3.4, -9.5, 3.6, z + 0.035);
      q("crest", 1.3, 13.2, 3.7, z + 0.035);
      q("register", 1.3, c - 2.6, 1.7, z + 0.012);
      q("capacity", 0.6, c + 2.3, 1.75, z + 0.012);
      q("gGym", 2.6, -11.5, 1.3, z + 0.012, "decalF");
      q("gCount", 1.7, 7, 1.25, z + 0.012, "decalF");
      q("fireDoor", 0.5, 10.2, 2.6, z + 0.012);
      const bw = 6, bh = bw / A.aspect("evac"), bg = quadXY(bw, bh, A.rect("evac"), 12, 3), Pp = bg.attributes.position;
      for (let i = 0; i < Pp.count; i++) {
        const x = Pp.getX(i) / bw, y = Pp.getY(i) / bh;
        Pp.setZ(i, 0.05 * Math.sin(x * 9 + y * 2) + 0.04 * y);
        Pp.setY(i, Pp.getY(i) - 0.25 * (1 - 4 * x * x) - (x > 0.3 && y > 0 ? (x - 0.3) * 1.6 * y * bh : 0));
      }
      bg.computeVertexNormals();
      P3.add("signF", bg, null, { p: [-9.4, 5.25, z + 0.1] });
      for (const s of [-1, 1]) P3.tube("burlap", catenary([-9.4 + s * 3, 5.25 + 0.4, z + 0.1], [-9.4 + s * 3.5, 5.9, z + 0.04], 0.03, 4), 6e-3, { seg: 4, col: [0.7, 0.68, 0.6] });
      P3.box("wood", 3.2, 1.3, 0.04, c - 4.2, FL + 1.55, HZ - 0.02, { col: [0.5, 0.4, 0.28], b: 6e-3 });
      P3.box("burlap", 3.1, 1.2, 0.012, c - 4.2, FL + 1.55, HZ - 0.045, { col: [0.6, 0.48, 0.34], b: 0 });
      q("missing", 1.56, c - 4.99, FL + 1.8, HZ - 0.052, "signF", [0, PI5, 0.012]);
      q("missing2", 1.56, c - 3.41, FL + 1.81, HZ - 0.0525, "signF", [0, PI5, -0.01]);
      ["noticeA", "noticeB", "manifest", "noticeC", "noticeD"].forEach((nm, i) => q(nm, 0.3, c - 5.4 + i * 0.6, FL + 1.19 + (R4() - 0.5) * 0.06, HZ - 0.053 - i * 5e-4, "signF", [0, PI5, (R4() - 0.5) * 0.14]));
      q("cots", 1, 3.2, FL + 1.9, HZ - 0.012, "signF", [0, PI5, 0]);
      q("wayShelter", 0.9, -HX + 0.012, FL + 1.9, 3.5, "signF", [0, H, 0]);
      q("gSorry", 2.2, HX - 0.012, FL + 1.5, -3.6, "decalF", [0, -H, 0]);
      q("tally", 1.6, -9.5, FL + 1.55, -HZ + 0.012, "decalF");
      q("handprints", 0.6, 0.9, FL + 1.3, HZ - 0.012, "decalF", [0, PI5, 0]);
    }
  }
  P3.add("plastic", softBox(0.3, 0.3, 0.1, 0.03, 3), [0.82, 0.62, 0.05], { p: [12.8, 5.7 - 0.9, HZ + T2 + 0.05] });
  P3.box("emRedB", 0.06, 0.03, 0.02, 12.8, 4.68, HZ + T2 + 0.105, { b: 4e-3 });
  P3.glow("blink", [12.8, 4.7, HZ + T2 + 0.3], { col: [1, 0.06, 0.03], power: 2.4, dist: 5, mat: "emRedB" });
  P3.tube("plastic", [[12.8, 4.65, HZ + T2 + 0.02], [12.8, 2.9, HZ + T2 + 0.02], [14.9, 2.9, HZ + T2 + 0.02]], 0.014, { seg: 5, samples: 0, col: [0.1, 0.1, 0.1] });
  for (const x of [-12, 6.5]) {
    P3.box("paint", 0.9, 0.5, 0.04, x, 0.75, -(HZ + T2 + 0.01), { col: TRIM, b: 8e-3 });
    for (let i = 0; i < 6; i++) P3.box("paint", 0.8, 0.01, 0.06, x, 0.56 + i * 0.075, -(HZ + T2 + 0.035), { col: [0.3, 0.33, 0.35], b: 2e-3, r: [-0.7, 0, 0] });
  }
  P3.add("paint", softBox(0.7, 0.9, 0.3, 0.02, 3), [0.5, 0.5, 0.47], { p: [-13.5, 0.5, HZ + T2 + 0.16] });
  P3.tube("paint", [[-13.3, 0.95, HZ + T2 + 0.2], [-13.3, 2.4, HZ + T2 + 0.06], [-13.3, 2.5, HZ + T2 - 0.1]], 0.02, { seg: 6, samples: 0, col: [0.8, 0.62, 0.05] });
  P3.cyl("paint", 0.28, 0.12, HX + T2 + 0.08, 1.2, 5.6, { axis: "x", seg: 16, col: [0.7, 0.07, 0.05], cham: 0.02 });
  P3.add("rubber", ring(0.2, 0.03, { seg: 16, radial: 6 }), [0.08, 0.08, 0.08], { p: [HX + T2 + 0.16, 1.2, 5.6], r: [0, H, 0] });
  P3.col([-13.9, 0, HZ + T2], [-13.1, 1, HZ + T2 + 0.34], { surface: "metal" });
  return P3.finish({ grime: 0.85, ground: 0.5 });
});
var doorLeaf = (seed = 1, o = {}) => proto("dleaf" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("doorLeaf", seed), w = o.w || 1, h = o.h || 2.2, col = o.col || [0.14, 0.2, 0.3], a = o.open ?? 1.9, flat = !!o.flat;
  P3.push(flat ? { p: [0, 0.03, 0], r: [-H, 0, 0] } : { r: [0, -a, 0] });
  P3.box("paint", w - 0.36, h, 0.045, (w - 0.36) / 2 + 0.36, 0, 0, { base: true, col, b: 6e-3 });
  P3.box("paint", 0.36, 0.95, 0.045, 0.18, 0, 0, { base: true, col, b: 6e-3 });
  P3.box("paint", 0.36, h - 1.75, 0.045, 0.18, 1.75, 0, { base: true, col, b: 6e-3 });
  P3.box("paint", 0.1, 0.8, 0.045, 0.05, 0.95, 0, { base: true, col, b: 6e-3 });
  P3.box(o.smashed ? "black" : "glassT", 0.26, 0.8, 0.012, 0.23, 0.95, 0, { base: true, b: 0 });
  for (const y of [1.15, 1.35, 1.55]) P3.bar("galv", [0.1, y, 0], [0.36, y, 0], 2e-3);
  for (const s of [-1, 1]) P3.box("steel", w - 0.04, 0.26, 4e-3, w / 2, 0.14, s * 0.025, { col: [0.7, 0.71, 0.72], b: 1e-3 });
  P3.bar("chrome", [0.1, 1.02, -0.07], [w - 0.08, 1.02, -0.07], 0.016);
  for (const x of [0.12, w - 0.1]) P3.box("steel", 0.05, 0.1, 0.07, x, 1.02, -0.04, { col: [0.2, 0.2, 0.2], b: 8e-3 });
  P3.box("steel", 0.2, 0.05, 0.05, 0.14, h - 0.08, -0.05, { col: [0.6, 0.6, 0.6], b: 8e-3 });
  P3.bar("steel", [0.2, h - 0.08, -0.07], [0.02, h - 0.06, -0.22], 8e-3);
  for (const y of [0.25, h / 2, h - 0.25]) P3.cyl("steel", 0.012, 0.1, 0, y, 0.02, { seg: 6, col: [0.6, 0.6, 0.6] });
  P3.box("steel", 0.03, 0.12, 0.06, w - 0.05, 1, 0.03, { col: [0.6, 0.6, 0.6], b: 6e-3 });
  if (o.atlas && o.sign) P3.quad("signF", 0.3, 0.3 / o.atlas.aspect(o.sign), o.atlas.rect(o.sign), { p: [w / 2 + 0.15, 1.5, 0.024] });
  if (!flat) P3.col([0, 0, -0.03], [w, h, 0.03], { surface: "metal", noNav: true });
  else P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  P3.pop();
  return P3.finish({ grime: 0.9, ground: 0.25 });
});
var B = SITE.block;
var BW = B.x1 - B.x0;
var BD = B.z1 - B.z0;
var BH = B.h;
var changingBlock = (seed = 1, o = {}) => proto("chblock" + seed, () => {
  const P3 = new Prop("changingBlock", seed), A = o.atlas, R4 = rng(seed * 29 + 11), lob = o.lobby || [-1.5, 0.9, 2.6], x0 = -BW / 2, x1 = BW / 2, z0 = -BD / 2, z1 = BD / 2, t = 0.22;
  const wl = (xa, za, xb, zb, h0 = 0, h1 = BH - 0.3) => P3.box("brick", Math.abs(xb - xa) + (za === zb ? 0 : t), h1 - h0, Math.abs(zb - za) + (xa === xb ? 0 : t), (xa + xb) / 2, h0, (za + zb) / 2, { base: true, col: BRICK, b: 4e-3 });
  wl(x0 + t / 2, z0 + t / 2, x1 - t / 2, z0 + t / 2);
  wl(x0 + t / 2, z0, x0 + t / 2, z1);
  wl(x1 - t / 2, z0, x1 - t / 2, z1);
  wl(x0, z1 - t / 2, lob[0], z1 - t / 2);
  wl(lob[1], z1 - t / 2, x1, z1 - t / 2);
  wl(lob[0], z1 - t / 2, lob[1], z1 - t / 2, 2.25);
  wl(lob[0] - t / 2, z1 - lob[2], lob[0] - t / 2, z1);
  wl(lob[1] + t / 2, z1 - lob[2], lob[1] + t / 2, z1);
  wl(lob[0], z1 - lob[2] - t / 2, lob[1], z1 - lob[2] - t / 2);
  P3.box("tile", lob[1] - lob[0], 0.03, lob[2], (lob[0] + lob[1]) / 2, 0, z1 - lob[2] / 2, { base: true, col: [0.5, 0.2, 0.16], b: 0 });
  P3.box("block", lob[1] - lob[0], 0.04, lob[2] - 0.1, (lob[0] + lob[1]) / 2, 2.5, z1 - lob[2] / 2 - 0.05, { col: CREAM2, b: 0 });
  P3.box("concrete", BW + 0.06, 0.3, BD + 0.06, 0, BH - 0.3, 0, { base: true, col: CONC, b: 0.012 });
  P3.box("concrete", BW + 0.02, 0.26, BD + 0.02, 0, 0, 0, { base: true, col: BRICKD, b: 0.01 });
  P3.box("asphalt", BW - 0.5, 0.04, BD - 0.5, 0, BH - 0.08, 0, { base: true, b: 0 });
  for (const [w, d, x, z] of [[BW + 0.14, 0.3, 0, z0 + 0.12], [BW + 0.14, 0.3, 0, z1 - 0.12], [0.3, BD, x0 + 0.12, 0], [0.3, BD, x1 - 0.12, 0]]) {
    P3.box("brick", w, 0.34, d, x, BH, z, { base: true, col: BRICK, b: 4e-3 });
    P3.box("concrete", w + 0.06, 0.07, d + 0.06, x, BH + 0.34, z, { base: true, col: CONC, b: 0.012 });
  }
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
    const x = x0 + 1.5 + i * 2.33, z = s * (BD / 2 + 4e-3), lit = s > 0 && (i === 5 || i === 6);
    if (s > 0 && x > lob[0] - 1 && x < lob[1] + 1) continue;
    P3.box("black", 1.5, 0.5, 0.02, x, 2.55, z - s * 0.012, { b: 0 });
    P3.box(lit ? "emCab" : "glass", 1.44, 0.44, 0.012, x, 2.55, z, { b: 0 });
    P3.box("paint", 1.56, 0.05, 0.06, x, 2.28, z, { col: [0.85, 0.85, 0.82], b: 8e-3 });
    P3.box("paint", 1.56, 0.04, 0.05, x, 2.8, z, { col: [0.85, 0.85, 0.82], b: 6e-3 });
    for (const dx of [-0.76, 0, 0.76]) P3.box("paint", 0.04, 0.5, 0.05, x + dx, 2.55, z, { col: [0.85, 0.85, 0.82], b: 6e-3 });
    for (let k = 0; k < 5; k++) P3.bar("galv", [x - 0.6 + k * 0.3, 2.3, z + s * 0.035], [x - 0.6 + k * 0.3, 2.8, z + s * 0.035], 6e-3);
    if (lit && i === 5) P3.glow("fill", [x + 1.1, 2.5, z + s * 0.8], { col: [1, 0.6, 0.3], power: 5, dist: 7, dir: [0, -0.5, s * 0.86], cone: 1 });
  }
  const lz3 = z1 - lob[2], lx3 = (lob[0] + lob[1]) / 2;
  for (const s of [-1, 1]) {
    P3.box("paint", 0.86, 2.05, 0.05, lx3 + s * 0.55, 0.03, lz3 + 0.03, { base: true, col: s > 0 ? [0.5, 0.1, 0.08] : [0.1, 0.22, 0.45], b: 6e-3 });
    P3.box("steel", 0.05, 0.14, 0.05, lx3 + s * 0.25, 1.05, lz3 + 0.07, { col: [0.6, 0.6, 0.6], b: 0.01 });
    if (A) P3.quad("signF", 0.5, 0.5 / A.aspect(s > 0 ? "home" : "away"), A.rect(s > 0 ? "home" : "away"), { p: [lx3 + s * 0.55, 1.7, lz3 + 0.06] });
  }
  for (const z of [lz3 + 0.5, lz3 + 1.9]) for (const y of [0.42]) {
  }
  P3.box("wood", 0.3, 0.04, 1.7, lob[0] + 0.2, 0.45, lz3 + 1.3, { col: [0.55, 0.42, 0.28], b: 8e-3 });
  for (const z of [lz3 + 0.6, lz3 + 2]) P3.box("steel", 0.26, 0.42, 0.03, lob[0] + 0.2, 0.03, z, { base: true, col: [0.2, 0.2, 0.2] });
  for (let k = 0; k < 6; k++) P3.box("steel", 0.3, 0.02, 0.012, lob[1] - 0.25, 0.05, z1 - 0.5 + k * 0.05, { col: [0.3, 0.3, 0.3], b: 0 });
  P3.add("plastic", softBox(0.3, 0.1, 0.16, 0.03, 3), [0.85, 0.85, 0.82], { p: [lx3, 2.42, z1 - 0.9] });
  P3.box("lampTube", 0.26, 0.012, 0.12, lx3, 2.366, z1 - 0.9, { b: 2e-3 });
  P3.glow("fill", [lx3, 2.1, z1 - 0.7], { col: [0.78, 0.93, 1], power: 7, dist: 8, dir: [0, -0.8, 0.6], cone: 0.9 });
  P3.box("wood", 0.1, 0.1, 1.6, -5.4, BH, -1, { base: true, col: [0.4, 0.33, 0.25] });
  P3.box("wood", 0.1, 0.1, 1.6, -4.2, BH, -1, { base: true, col: [0.4, 0.33, 0.25] });
  P3.add("plastic", softBox(1.8, 1.1, 1.4, 0.06, 4), [0.12, 0.12, 0.13], { p: [-4.8, BH + 0.65, -1] });
  for (const y of [0.35, 0.65, 0.95]) P3.box("plastic", 1.84, 0.04, 1.44, -4.8, BH + y, -1, { col: [0.1, 0.1, 0.11], b: 0.01 });
  P3.cyl("plastic", 0.25, 0.04, -4.8, BH + 1.22, -1, { seg: 12, col: [0.1, 0.1, 0.11] });
  for (const x of [-1.5, 2.2, 5.6]) {
    P3.cyl("galv", 0.14, 0.5, x, BH + 0.2, 1.2, { seg: 10, col: ALU });
    P3.lathe("galv", [[0.14, 0], [0.24, 0.04], [0.2, 0.12], [1e-3, 0.16]], { seg: 12, col: ALU, p: [x, BH + 0.5, 1.2] });
  }
  P3.bar("plastic", [6.9, BH - 0.1, -3.2], [6.9, BH + 1, -3.2], 0.05, { col: [0.1, 0.1, 0.11] });
  P3.lathe("paint", [[1e-3, 0], [0.2, 0.03], [0.36, 0.1], [0.37, 0.11]], { seg: 16, col: [0.8, 0.8, 0.78], p: [2.5, BH + 0.2, -2.6], r: [1.9, 0.4, 0] });
  P3.bar("galv", [2.5, BH + 0.02, -2.6], [2.9, BH + 0.05, -2], 0.015);
  for (const [x, z, s] of [[x0 + 0.6, z1, 1], [x1 - 0.6, z1, 1], [x0 + 0.6, z0, -1], [x1 - 0.6, z0, -1]]) {
    P3.tube("plastic", [[x, BH - 0.1, z + s * 0.07], [x, 0.2, z + s * 0.07], [x, 0.07, z + s * 0.2]], 0.038, { seg: 7, samples: 0, col: [0.1, 0.1, 0.11] });
    P3.box("plastic", 0.3, 0.2, 0.16, x, BH - 0.12, z + s * 0.09, { col: [0.1, 0.1, 0.11], b: 0.02 });
  }
  if (A) {
    const q = (name, w, x, y, z, mat = "signF", r = null) => P3.quad(mat, w, w / A.aspect(name), A.rect(name), { p: [x, y, z], r });
    q("changing", 2.2, lx3, 2.72, z1 + 0.012);
    q("wc", 0.6, lob[1] + 1, 1.75, z1 + 0.012);
    q("gDead", 2.4, -5.2, 1.3, z1 + 0.012, "decalF");
    q("gX", 1.1, 5.6, 1.2, z1 + 0.012, "decalF");
    q("noticeA", 0.42, lob[0] - 0.7, 1.6, z1 + 0.012);
    q("water", 0.6, x0 - 0.012, 1.7, 2.6, "signF", [0, -H, 0]);
    q("gLeft", 2.2, x0 - 0.012, 1.25, -1, "decalF", [0, -H, 0]);
    q("stWaterB", 0.8, -4.8, BH + 0.66, -0.29, "decalF");
  }
  P3.add("plastic", softBox(0.3, 0.13, 0.15, 0.03, 3), [0.12, 0.12, 0.13], { p: [x0 - 0.08, 2.75, 3] });
  P3.box("lampCyan", 0.02, 0.1, 0.26, x0 - 0.16, 2.72, 3, { b: 4e-3 });
  P3.glow("fill", [x0 - 0.6, 2.5, 3], { col: [0.62, 0.92, 1], power: 5, dist: 9, dir: [-0.5, -0.86, 0], cone: 0.8 });
  P3.bar("galv", [x0 - 0.05, 0.1, 2.6], [x0 - 0.05, 0.75, 2.6], 0.012);
  P3.box("galv", 0.05, 0.05, 0.1, x0 - 0.07, 0.78, 2.6, { col: ALU });
  P3.add("galv", softBox(0.4, 0.3, 0.9, 0.03, 3), [0.6, 0.62, 0.64], { p: [x0 - 0.3, 0.3, 2.6] });
  P3.box("black", 0.3, 0.01, 0.8, x0 - 0.3, 0.452, 2.6, { b: 0 });
  P3.col([x0 - 0.52, 0, 2.1], [x0, 0.5, 3.1], { surface: "metal" });
  P3.col([lob[0], 0, lz3 + 0.4], [lob[0] + 0.4, 0.5, lz3 + 2.2], { surface: "wood" });
  return P3.finish({ grime: 0.9, ground: 0.5 });
});

