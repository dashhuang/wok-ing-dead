var S3 = SITE;
var F = S3.fence;
var OPEN = { eastGate: [4.5, 11.5], ne: [-32, -28], se: [28.5, 31.5], sGate: [28.8, 31.2], sBreach: [-7.5, -4.5], sw: [34.5, 37.5], wGate: [-38.5, -35.5], alley: [9.3, 13] };
var RUNS = [
  [F.x0, F.z0, S3.gym.x0 - 0.3, F.z0],
  [S3.block.x0, F.z0, F.x1, F.z0],
  [F.x1, F.z0, F.x1, OPEN.ne[0]],
  [F.x1, OPEN.ne[1], F.x1, OPEN.eastGate[0]],
  [F.x1, OPEN.eastGate[1], F.x1, OPEN.se[0]],
  [F.x1, OPEN.se[1], F.x1, F.z1],
  [F.x1, F.z1, OPEN.sGate[1], F.z1],
  [OPEN.sGate[0], F.z1, OPEN.sBreach[1], F.z1],
  [OPEN.sBreach[0], F.z1, F.x0, F.z1],
  [F.x0, F.z1, F.x0, OPEN.sw[1]],
  [F.x0, OPEN.sw[0], F.x0, OPEN.wGate[1]],
  [F.x0, OPEN.wGate[0], F.x0, F.z0]
];
var SPEC = {
  tracks: [
    { pts: [[37, 8], [27, 6.5], [19, 3], [12, -0.5], [7, 2.2]], w: 1.9, a: 0.9, wheels: true },
    { pts: [[19, 11], [9, 8.2], [-3.5, 6.6]], w: 1.7, a: 0.8, wheels: true },
    { pts: [[19, -6], [13, -9], [8, -20], [4, -27]], w: 1.9, a: 0.7, wheels: true },
    { pts: [[30, 46], [22, 38], [10, 31]], w: 1.8, a: 0.8, wheels: true },
    { pts: [[19, -3.5], [12.5, -4], [12.5, -12]], w: 1.6, a: 0.75 },
    { pts: [[-12, 5.5], [-15.5, -8], [-9, -25], [-6, -30]], w: 1.5, a: 0.7 },
    { pts: [[4, 19.5], [5.5, 26], [6, 30]], w: 1.4, a: 0.7 },
    { pts: [[-22.5, -18], [-22.8, 18]], w: 1.6, a: 0.6 },
    { pts: [[-6, 46], [-7, 38], [-9, 24]], w: 1.4, a: 0.7 },
    { pts: [[-16.5, 9.5], [-22.5, 6], [-24, 0]], w: 1.2, a: 0.6 }
  ],
  mud: [[-11, 5.6, 2.6, 0.7], [0.4, 13.5, 2.2, 0.7], [-9.5, 17.4, 2, 0.6], [-6, -29, 2.6, 0.6], [16.6, -8, 2.4, 0.5], [16.6, 9, 2.4, 0.5], [9, 1.5, 3, 0.6], [-30, 24, 3, 0.6], [6, 32, 3.4, 0.6], [-3.5, -12.5, 5, 0.35], [-28, -24, 3, 0.5], [24, 40, 3, 0.5]],
  puddles: [[2, 4.5, 1.7, 0.5], [-6.5, 2.2, 2, 0.5], [9.5, -7, 1.6, 0.5], [-14, -4.5, 1.5, 0.45], [-1, 25, 2.2, 0.5], [11, 10, 1.8, 0.5], [-17, 15, 1.6, 0.45], [5, -24, 2, 0.5], [-10, -20, 1.5, 0.4], [-27, 22, 1.8, 0.5], [-3, 34, 2, 0.5], [15, 30, 1.6, 0.45], [-22.6, -6, 1.2, 0.5], [-22.6, 9, 1.3, 0.5], [-12, 30, 1.8, 0.45], [20, 41, 1.8, 0.5]],
  dry: S3.tents.map((t) => [t.x, t.z, Math.min(t.w, t.d) * 0.48]).concat(S3.tents.map((t) => [t.x + (t.w > t.d ? t.w * 0.25 : 0), t.z + (t.w > t.d ? 0 : t.d * 0.25), Math.min(t.w, t.d) * 0.48]), S3.tents.map((t) => [t.x - (t.w > t.d ? t.w * 0.25 : 0), t.z - (t.w > t.d ? 0 : t.d * 0.25), Math.min(t.w, t.d) * 0.48])),
  ppuddles: [[23, -2, 2.2, 0.45], [29, 9, 2, 0.4], [33, -22, 1.8, 0.45], [22, 24, 2.4, 0.45], [34, 20, 1.6, 0.4], [26, -27, 2, 0.45], [44, -12, 2.6, 0.4], [43, 24, 2.2, 0.4], [30, 0, 1.6, 0.4], [21.5, -16, 1.6, 0.4]],
  oil: [[30.5, -26, 1.1, 0.8], [30.5, -18.2, 1, 0.7], [30.5, -14.3, 1.2, 0.9], [33.5, 16, 0.8, 0.7], [22, 5, 0.9, 0.6], [26, -5, 1, 0.6]],
  patches: [[24, -12, 1.8, 1.1, 0.1], [33, 2, 1.2, 2.2, 0], [22, 28, 2.2, 0.9, -0.2], [44, 6, 1.4, 3, 0], [28, 18, 0.8, 0.8, 0.5]],
  edges: [[[19, -34], [19, 34], {}], [[19, 34], [37, 34], {}], [[19, -34], [37, -34], {}], [[-24, -29.5], [13, -29.5], { len: 0.6, w: 0.08, h: 0.02 }], [[-22.2, -19], [-22.2, 19], { len: 1.2, w: 0.06, h: 0.035, mat: "wood" }]],
  slabs: [
    ["concrete", -24, -31.25, 13, -29.55, 0.02, {}],
    ["concrete", 12.4, -37.4, 37, -34.05, 0.02, {}],
    ["concrete", -36.9, -48.4, -21.4, -31, 0.02, { dirt: 0.1 }],
    ["concrete", 9.3, -48.5, 13, -31.25, 0.02, { dirt: 0.15 }],
    ["gravel", -24.6, -19, -22.25, 19, 0.016, {}],
    ["gravel", -0.5, 28.6, 14.5, 36.5, 0.016, {}],
    ["gravel", -35.5, 20.5, -26.5, 30, 0.016, {}],
    ["concrete", 37, -48.5, 39, 46, 0.03, { dirt: 0.1 }]
  ]
};
function buildField(G4) {
  const R4 = G4.render, mats = fieldMaterials(G4), A = G4.fatlas;
  const stage2 = createStage(G4, mats, { pool: 16, groundY, marks: A.marks, name: "Thornwake Athletic Ground" }), { put, wall: wall2, W } = stage2;
  const ground = buildFieldGround(G4, mats, SPEC);
  for (const [k, arr] of ground.bucket.map) for (const g2 of arr) {
    g2.computeBoundingBox();
    const c = g2.boundingBox;
    stage2.addGeo(k, g2, stage2.regionOf((c.min.x + c.max.x) / 2, (c.min.z + c.max.z) / 2));
  }
  const r = rng(9917);
  for (const [xa, za, xb, zb] of RUNS) {
    const len = Math.hypot(xb - xa, zb - za), n = Math.max(1, Math.round(len / 2.5)), L = len / n, ux = (xb - xa) / len, uz = (zb - za) / len, yaw = Math.atan2(-uz, ux);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) * L, v = r();
      put(weldPanel(1 + i % 3, { len: Math.round(L * 1e3) / 1e3, end: i === n - 1, lean: v > 0.9 ? 0.06 : v < 0.08 ? -0.05 : 0 }), xa + ux * t, za + uz * t, yaw, { noCol: true });
    }
    wall2([Math.min(xa, xb) - 0.05, 0, Math.min(za, zb) - 0.05], [Math.max(xa, xb) + 0.05, 2.4, Math.max(za, zb) + 0.05], { surface: "mesh", tag: "fence" });
  }
  wall2([F.x0 - 0.1, 0, -17.2], [S3.stand.deck, 2.4, -17], { tag: "fence" });
  wall2([F.x0 - 0.1, 0, 17], [S3.stand.deck, 2.4, 17.2], { tag: "fence" });
  const Gy = S3.gym, T3 = Gy.wall, D = S3.gymDoors;
  const side2 = (fixed, a, b, doors, alongX, out) => {
    let p = a;
    const seg = (u0, u1) => {
      if (u1 - u0 < 0.05) return;
      const lo = Math.min(fixed, fixed + out * T3), hi = Math.max(fixed, fixed + out * T3);
      if (alongX) wall2([u0, 0, lo], [u1, Gy.eave, hi], { surface: "brick", tag: "hall" });
      else wall2([lo, 0, u0], [hi, Gy.eave, u1], { surface: "brick", tag: "hall" });
    };
    for (const [c, w] of [...doors].sort((p1, p2) => p1[0] - p2[0])) {
      seg(p, c - w / 2);
      if (alongX) wall2([c - w / 2, 2.3, Math.min(fixed, fixed + out * T3)], [c + w / 2, Gy.eave, Math.max(fixed, fixed + out * T3)], { surface: "brick", tag: "hall", noNav: true });
      else wall2([Math.min(fixed, fixed + out * T3), 2.3, c - w / 2], [Math.max(fixed, fixed + out * T3), Gy.eave, c + w / 2], { surface: "brick", tag: "hall", noNav: true });
      p = c + w / 2;
    }
    seg(p, b);
  };
  side2(Gy.z1, Gy.x0 - T3, Gy.x1 + T3, D.south, true, 1);
  side2(Gy.z0, Gy.x0 - T3, Gy.x1 + T3, D.north, true, -1);
  side2(Gy.x1, Gy.z0, Gy.z1, D.east, false, 1);
  side2(Gy.x0, Gy.z0, Gy.z1, D.west, false, -1);
  const Bk = S3.block, bd = [20, 22.4];
  wall2([Bk.x0, 0, Bk.z0], [bd[0], Bk.h, Bk.z1], { surface: "brick", tag: "block" });
  wall2([bd[1], 0, Bk.z0], [Bk.x1, Bk.h, Bk.z1], { surface: "brick", tag: "block" });
  wall2([bd[0], 0, Bk.z0], [bd[1], Bk.h, Bk.z1 - 2.6], { surface: "brick", tag: "block" });
  wall2([bd[0], 2.2, Bk.z1 - 2.6], [bd[1], Bk.h, Bk.z1], { surface: "brick", tag: "block", noNav: true });
  const St = S3.stand;
  for (let k = 0; k < St.tiers; k++) wall2([St.deck, k * St.rise, St.z0], [St.xf - k * St.tread, (k + 1) * St.rise, St.z1], { surface: "metal", bulletOnly: true, tag: "stand" });
  for (const z of [St.z0, St.z1]) wall2([St.deck, 0, z - 0.06], [St.xf, DECK_Y + 1.15, z + 0.06], { surface: "metal", noBullet: true, tag: "stand" });
  wall2([St.deck - 0.1, 0, St.z0], [St.deck, DECK_Y + 1.15, St.z1], { surface: "metal", noBullet: true, tag: "stand" });
  {
    let p = St.z0;
    for (const a of [...St.aisles, 99]) {
      const e = a === 99 ? St.z1 : a - St.aisleW / 2;
      if (e - p > 0.1) wall2([St.xf - 0.05, 0, p], [St.xf + 0.05, 1.5, e], { surface: "metal", noBullet: true, tag: "stand" });
      p = a + St.aisleW / 2;
    }
  }
  const AT = A.signs;
  put(helicopter(1, { atlas: AT }), S3.heli.x, S3.heli.z, S3.heli.yaw);
  put(bleacher(1, { atlas: AT }), S3.stand.xf, 0, 0, { y: 0, noCol: true });
  put(pressBox(1, { atlas: AT }), -34.45, 0, 0, { y: DECK_Y });
  const MAST_T = { 1: [-4, 0, -11], 2: [-5, 0, 12], 3: [2, 0, 2] }, mastYaw = (m) => {
    const t = MAST_T[m.on] || [-3, 0, 0];
    return Math.atan2(t[0] - m.x, t[2] - m.z);
  };
  S3.masts.forEach((m, i) => put(floodMast(1 + i, { atlas: AT, on: m.on }), m.x, m.z, mastYaw(m)));
  const Gc = [(Gy.x0 + Gy.x1) / 2, (Gy.z0 + Gy.z1) / 2], HXh = (Gy.x1 - Gy.x0) / 2, HZh = (Gy.z1 - Gy.z0) / 2;
  put(sportsHall(1, { atlas: AT }), Gc[0], Gc[1], 0, { y: 0 });
  put(changingBlock(1, { atlas: AT, lobby: [bd[0] - (Bk.x0 + Bk.x1) / 2, bd[1] - (Bk.x0 + Bk.x1) / 2, 2.6] }), (Bk.x0 + Bk.x1) / 2, (Bk.z0 + Bk.z1) / 2, 0, { y: 0 });
  {
    const WY = { south: 0, north: PI5, east: H, west: -H }, half = { south: HZh, north: HZh, east: HXh, west: HXh };
    const leaf = (wn, di, side3, state) => {
      const [c, w] = HALL_DOORS[wn][di], lw = w / 2 - 0.07, u = c + side3 * (w / 2 - 0.06), yw = WY[wn], cs = Math.cos(yw), sn = Math.sin(yw), flat = typeof state === "string";
      const zz = half[wn] + (flat ? state === "out" ? 1.5 : -1.4 : state < 0 ? 0.04 : Gy.wall - 0.04), uu = flat ? c + side3 * 0.5 : u, x = Gc[0] + uu * cs + zz * sn, z = Gc[1] - uu * sn + zz * cs, yv = flat ? state === "out" ? 0 : Gy.floor : groundY(x, z) > 0.1 ? Gy.floor : 0.02;
      put(doorLeaf(1 + di, flat ? { w: lw, flat: true, smashed: true } : { w: lw, open: side3 < 0 ? state : -state }), x, z, flat ? yw + 0.4 * side3 : yw + (side3 < 0 ? 0 : PI5), { y: yv });
    };
    for (const [wn, di, l, r2] of [["south", 0, 1.75, 2], ["south", 1, 1.9, "out"], ["east", 0, 2, 1.8], ["north", 0, 1.7, 2.1], ["west", 0, -1.9, "in"]]) {
      leaf(wn, di, -1, l);
      leaf(wn, di, 1, r2);
    }
  }
  const tentAt = (t, yaw) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return (prop, lx3, lz3, ry = 0, o2 = {}) => put(prop, t.x + lx3 * c + lz3 * s, t.z - lx3 * s + lz3 * c, yaw + ry, o2);
  };
  const [TR, WD, SU] = S3.tents;
  put(fieldTent(1, { atlas: AT, w: TR.w, d: TR.d, h: TR.h, sides: { e: [[0, 1.6, "c"], [1.6, 4.4, "d"], [4.4, 6, "c"]], w: [[0, 1.6, "c"], [1.6, 4.4, "d"], [4.4, 6, "c"]], n: [[0, 2.5, "c"], [2.5, 5, "w"], [5, 7.5, "o"], [7.5, 10, "c"]], s: [[0, 2.5, "w"], [2.5, 5, "o"], [5, 7.5, "c"], [7.5, 10, "w"]] }, sign: { side: "e", name: "triage", w: 2 }, lamps: [[-2.6, 0, 1], [2.4, 0, 2]] }), TR.x, TR.z, 0);
  {
    const q = tentAt(TR, 0);
    q(triageDesk(1, { atlas: AT, lamp: 1 }), 3.3, -1.6, H);
    q(triageDesk(2, { atlas: AT, kind: "meds", chair: "tipped" }), -0.6, -2.3, 0);
    q(cot(1, { state: "blood" }), -3.4, -2.1, 0);
    q(cot(2, { state: "tipped" }), -3, 1.9, 0.2);
    q(cot(3, { state: "body", atlas: AT }), 3.4, 2.15, 0);
    q(dripStand(1, { atlas: AT }), -4.3, -1.5);
    q(dripStand(2, { atlas: AT, fallen: 1 }), -1.6, 1.4, 0.7);
    q(wardScreen(1, { blood: 1 }), -2, -1, H + 0.2);
    q(monitorCart(1), -4.4, -2.5, 0.6);
    q(wheelchair(1), 1.9, 2, 2.2);
    q(wasteBins(1, { atlas: AT, n: 2, bags: 3 }), -4.3, 2.4, PI5);
    q(stretcher(1, { load: "blood" }), 0.6, 0.6, 0.35);
  }
  put(fieldTent(2, { atlas: AT, w: WD.d, d: WD.w, h: WD.h, sides: { e: [[0, 1.4, "c"], [1.4, 4.6, "o"], [4.6, 6, "c"]], w: [[0, 1.6, "c"], [1.6, 4.4, "d"], [4.4, 6, "c"]], n: [[0, 2.5, "c"], [2.5, 5, "w"], [5, 7.5, "c"], [7.5, 10, "o"]], s: [[0, 2.5, "o"], [2.5, 5, "c"], [5, 7.5, "w"], [7.5, 10, "c"]] }, sign: { side: "e", name: "ward", w: 1.5 }, lamps: [[-3.2, 0, 1], [0, 0, 0], [3.2, 0, 1]] }), WD.x, WD.z, H);
  {
    const q = tentAt(WD, H), ST8 = ["used", "made", "body", "used", "blood", "bare", "used", "body", "tipped", "made", "used", "blood"];
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      const k = i * 2 + (s > 0 ? 1 : 0), st = ST8[k];
      if (i === 5 && s < 0 || i === 0 && s > 0) continue;
      q(cot(4 + k, { state: st, atlas: AT }), -4.1 + i * 1.62, s * (st === "tipped" ? 1.7 : 2.02), H + (s > 0 ? PI5 : 0) + (k % 3 - 1) * 0.05);
      if (k % 3 === 0) q(dripStand(3 + k, { atlas: AT, fallen: k === 6 ? 1 : 0 }), -4.1 + i * 1.62 + 0.75, s * 2.55);
    }
    q(monitorCart(2), -1.7, -2.6, 0.2);
    q(wardScreen(2, {}), 2, -1.9, 0.1);
    q(wardScreen(3, { down: 1 }), 0.5, 0.3, 0.8);
    q(oxygenCart(1, { loose: 1 }), 4.2, 2.3, 2.5);
    q(wheelchair(2, { tipped: 1 }), -3.2, 0.3, 1);
    q(bodyBag2(1, { atlas: AT }), 3.6, -0.5, 0.3);
  }
  put(fieldTent(3, { atlas: AT, w: SU.w, d: SU.d, h: SU.h, eave: 1.95, col: [0.36, 0.39, 0.28], cross: false, sides: { e: [[0, 1.1, "c"], [1.1, 3.9, "o"], [3.9, 5, "c"]], w: [[0, 5, "c"]], n: [[0, 2.67, "c"], [2.67, 5.33, "o"], [5.33, 8, "c"]], s: [[0, 8, "c"]] }, sign: { side: "e", name: "stores", w: 1.4 }, lamps: [[-0.5, 0, 1]] }), SU.x, SU.z, 0);
  {
    const q = tentAt(SU, 0);
    q(supplyStack(1, { atlas: AT, kind: "aid", h: 4 }), -3.1, 1.5, H);
    q(supplyStack(2, { atlas: AT, kind: "water", h: 3, spill: false }), -3.1, -0.2, H);
    q(supplyStack(3, { atlas: AT, kind: "mixed", h: 3 }), -1, 1.75, 0);
    q(supplyStack(4, { atlas: AT, kind: "aid", h: 2, sheet: false }), 1.2, 1.75, 0.06);
    q(oxygenCart(2, { loose: 2 }), -3.3, -1.7, 0.4);
    q(triageDesk(3, { atlas: AT, kind: "meds" }), 2.6, -1.75, 0);
  }
  for (let k = 0; k < 6; k++) {
    const x = SU.x - 3.2 + k * 1.25, z = SU.z + SU.d / 2 + 2.3 + k % 2 * 0.15;
    if (k < 3) put(stretcher(2 + k, { load: "bag", atlas: AT }), x, z, H + (k - 1) * 0.06);
    else put(bodyBag2(2 + k, { atlas: AT, open: k === 4 }), x, z, H + (k - 4) * 0.1);
  }
  put(stretcher(7, { trolley: 1, load: "bag", atlas: AT }), -4.6, 16.2, 0.5);
  put(stretcher(8, { trolley: 1 }), 0.2, 8.6, 1.9);
  put(wasteBins(2, { atlas: AT, n: 3, bags: 6 }), -16.9, 13.2, H);
  put(wheelchair(3), -3.5, 5, 0.9);
  const BUS = [{ no: 0, smash: 0.15, door: true, graf: "gNoBuses" }, { no: 1, smash: 0.4, flat: [0, 2], hood: 0.95 }, { no: 2, smash: 0.1, lights: 1, hazard: 1, dome: 1, arm: 1 }, { no: 3, smash: 0.6, flat: [1] }, { no: 4, smash: 0.25, dome: 1 }];
  BUS.forEach((b, k) => k < 4 ? put(schoolBus(1 + k, { atlas: AT, ...b }), 30.8, -28.05 + k * 5.2, PI5 + (k === 3 ? 0.07 : 0)) : put(schoolBus(1 + k, { atlas: AT, ...b }), 27.5, 19.5, PI5 - 0.55));
  put(armyTruck(1, { atlas: AT, canvas: "full", gate: 1, lights: 1, cargo: "crates", code: "stTruckA" }), 8.5, 0.5, 1.9 - H);
  put(armyTruck(2, { atlas: AT, canvas: "half", cargo: "seats", door: 0.2, flat: 1, code: "stTruckB" }), 23.5, 4.5, 1.3 - H);
  dressField(G4, stage2, RUNS);
  shelterHall(G4, stage2);
  carParkField(G4, stage2);
  backdropField(G4, stage2);
  const headAt = (m) => {
    const y = mastYaw(m);
    return [m.x + Math.sin(y) * 0.8, 17.1, m.z + Math.cos(y) * 0.8];
  };
  const keys = S3.masts.filter((m) => m.on === 1 || m.on === 2).sort((a, b) => a.on - b.on).map((m, i) => ({ p: headAt(m), target: MAST_T[m.on], col: [0.78, 0.9, 1], intensity: i === 0 ? 2600 : 2200, angle: 0.72, penumbra: 0.5, size: 0.7, flicker: i === 1 ? 1 : 0 }));
  for (const m of S3.masts) if (m.on) {
    const hp = headAt(m), tgt = MAST_T[m.on], d = [tgt[0] - hp[0], -hp[1], tgt[2] - hp[2]], l = Math.hypot(...d);
    stage2.lamp(hp, [0.78, 0.9, 1], m.on === 3 ? 60 : 8, m.on === 3 ? 46 : 20, { dir: [d[0] / l, d[1] / l, d[2] / l], cone: 0.6, key: m.on === 2 ? 1 : m.on === 1 ? 0 : void 0, pri: 3 });
  }
  stage2.finalize(ground, keys);
  W.keySpec = keys;
  W.hallRect = [S3.gym.x0, S3.gym.z0, S3.gym.x1, S3.gym.z1];
  W.spawns = [{ p: [41, 8], w: 3 }, { p: [-6, 49], w: 3 }, { p: [30, 49], w: 2 }, { p: [-41, -37], w: 2 }, { p: [-14, -50.2], w: 2 }, { p: [11.1, -51], w: 2 }, { p: [21.2, -38.9], w: 1 }, { p: [-41, 36], w: 2 }, { p: [41, -30], w: 2 }, { p: [41, 30], w: 1 }];
  W.pickups = [[2, -3], [-12, 2], [10, 6], [-17, -18], [8, -22], [-3, 24], [14, 20], [-22.8, 8], [-30, 2], [24, -8], [27, 14], [-10, -40], [3, -36], [-28, -26], [-28, 30], [5, 33], [22, 40], [-4, -24]];
  W.start = { p: S3.start.p, yaw: S3.start.yaw };
  R4.setSky("night");
  {
    const U = R4.sky.material.uniforms;
    U.uGlow.value.setRGB(0.02, 0.03, 0.05);
    U.uGlowDir.value.set(1, 0.1, -0.2).normalize();
    U.uHor.value.setRGB(8e-3, 0.011, 0.018);
    U.uCloudHi.value.setRGB(0.016, 0.02, 0.028);
    U.uShow.value = 3.2;
  }
  R4.bakeEnvFromSky();
  G4.mats.setWet(1);
  return W;
}

