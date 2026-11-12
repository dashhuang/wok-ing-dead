var S2 = SITE;
var FACE = { S: 0, N: PI5, E: H, W: -H };
var aim = (dx, dz) => Math.atan2(dx, dz);
var POCKETS = [[41, 8], [-6, 49], [30, 49], [-41, -37], [-14, -50.2], [11.1, -51], [-41, 36], [41, -30], [41, 30]];
var clearOf = (x, z, r = 3.6) => POCKETS.every(([px2, pz2]) => Math.hypot(x - px2, z - pz2) > r);
function dressField(G4, stage2, runs) {
  const { put } = stage2, AT = G4.fatlas.signs, FOL = G4.fatlas.foliage, a = { atlas: AT }, f3 = { sheet: FOL }, r = rng(4471);
  put(goal(1, { net: "torn" }), -3, -27, FACE.S);
  put(goal(2, { net: "ok", lean: 0.1 }), -3, 27, FACE.N);
  put(cornerFlag(1), -21, -27);
  put(cornerFlag(2, { lean: 0.3 }), 15, -27);
  put(cornerFlag(3, { snap: 1 }), -21, 27);
  put(cornerFlag(4, { lean: 0.14 }), 15, 27);
  [[-21, "up"], [-17.6, "up"], [-7.4, "lean"], [-4, "up"], [4, "up"], [7.4, "flat"], [17.6, "up"], [21, "lean"]].forEach(([z, state], i) => put(adBoard(1 + i, { ...a, name: "sp" + i % 6, state }), -21.7, z, FACE.E));
  [[-17, "up"], [-13.6, "lean"], [7.6, "up"], [11, "up"]].forEach(([x, state], i) => put(adBoard(11 + i, { ...a, name: "sp" + (i + 2) % 6, state, graf: i === 2 ? "gNoBuses" : null }), x, -28.4, FACE.S));
  [[-25, "up"], [21.6, "flat"], [25, "up"]].forEach(([z, state], i) => put(adBoard(21 + i, { ...a, name: "sp" + (i + 4) % 6, state }), 15.9, z, FACE.W));
  put(adBoard(31, { ...a, name: "sp1", state: "lean" }), -19.2, 28.3, FACE.N);
  put(dugout(1, { ...a, name: "home", lamp: 1 }), 17.1, -14.5, FACE.W);
  put(dugout(2, { ...a, name: "away", smash: 0.7 }), 17.1, 15.5, FACE.W);
  put(scoreboard(1, { ...a, lit: 1 }), -15, 31.6, FACE.N);
  put(trainingKit(1), -16.5, -23.5, 0.4);
  put(trainingKit(2, { balls: 3, cones: 14, poles: 6, hurdles: 0 }), 11.5, 23.2, 2.1);
  put(kickWall(1, { n: 4, down: [2] }), 4.6, -23.6, 0.22);
  put(bench2(1), -15.5, -30.3, FACE.S);
  put(bench2(2, { tipped: 1 }), 0.2, -30.2, 0.2);
  put(bench2(3), -22.9, 14.4, FACE.E);
  put(bench2(4), -22.9, -14.4, FACE.E);
  put(crowdBarrier2(1, { ...a, n: 3, down: [2], tape: 1 }), 13.9, -6.6, H);
  put(crowdBarrier2(2, { ...a, n: 3, gap: [2], sign: "register" }), 11.1, -6.6, H);
  put(crowdBarrier2(3, { ...a, n: 2, tape: 1 }), 15.2, -12.2, 0.12);
  put(triageDesk(5, { ...a, lamp: 1 }), 12.4, -12.9, FACE.S);
  put(triageDesk(6, { ...a, kind: "meds", chair: "tipped" }), 9.9, -13, 0.1);
  put(waySign(1, { ...a, name: "register", name2: "wristband" }), 14.9, -13.6, FACE.S);
  put(fieldKitchen(1, { ...a, lamp: 2, spill: 1 }), 9.2, 32.7, FACE.N);
  put(waterBowser(1, { ...a }), 0.4, 30.4, 0.15);
  put(euroBin(1, { ...a, lid: 0.9, bags: 6 }), 13.4, 35.2, FACE.N);
  put(euroBin(2, { ...a, tip: 1, bags: 3, col: [0.1, 0.22, 0.4] }), 13.2, 30, 1.2);
  put(portaLoo(1, { ...a, n: 4, open: [1], down: 3, tags: "gSorry", lamp: 0 }), -17, 42.3, FACE.N);
  put(portaLoo(2, { ...a, n: 2, open: [0], col: [0.1, 0.3, 0.5], lamp: 1 }), -32, -46.4, FACE.S);
  put(noticeBoard(1, { ...a, candles: 7, sheet2: "missing2" }), 20.5, -1.4, FACE.E);
  put(waySign(2, { ...a, name: "wayReg", name2: "wayTriage" }), 32.6, 12.9, FACE.E);
  put(waySign(3, { ...a, name: "wayShelter", graf: "gGym", lean: 0.06 }), 7, -29, FACE.S);
  put(waySign(4, { ...a, name: "wayWater", name2: "wayExit" }), -11.4, 28.2, FACE.N);
  put(waySign(5, { ...a, name: "wayBuses", lean: -0.08 }), 16.5, -27.6, FACE.W);
  put(heightBar(1, { ...a, w: 6.6, hit: 1 }), 34.4, 8, H);
  put(boomGate2(1, { ...a, len: 6.5, up: 1.25, lamp: 1 }), 37.9, 4.75, -H);
  put(bagWall(1, { len: 2.6, rows: 5 }), 35.6, 13.4, H);
  put(bagWall(2, { len: 3, rows: 4 }), 32.9, 3.3, 0.1);
  put(busShelter2(1, { ...a, lit: 2, smash: [0, 2], name: "parkBus" }), 35.7, -4.2, FACE.W);
  put(bikeRack(1, { n: 6, roof: 1, bikes: [[0, 1, 0], [1, -1, 1], [3, 1, 3], [4, -1, 2], [5, 1, 0]] }), 26.5, -35.7, 0);
  put(euroBin(3, { ...a, lid: 0.3, bags: 4 }), 14.6, -36.6, FACE.S);
  put(euroBin(4, { ...a, lid: 1, bags: 7, col: [0.1, 0.22, 0.4] }), 16.3, -36.5, 0.1);
  put(euroBin(5, { ...a, lid: 0.1, bags: 2 }), 12.25, -40.2, FACE.W);
  put(euroBin(6, { ...a, tip: 1, bags: 5 }), -22.6, -45.4, 0.5);
  put(wasteBins(3, { ...a, n: 2, bags: 5 }), 10.1, -44.2, FACE.E);
  put(supplyStack(5, { ...a, kind: "water", h: 2 }), -27.2, -33.2, 0.1);
  put(supplyStack(6, { ...a, kind: "mixed", h: 3, sheet: false }), -29.6, -33.4, -0.08);
  put(crowdBarrier2(4, { ...a, n: 2, down: [1] }), -30.2, -42.2, 0.3);
  put(shed(1, { ...a, lamp: 1 }), -32.9, 42.6, FACE.E);
  put(lineMarker(1), -30.2, 41.4, 0.7);
  put(roller(1), -30.4, 44.3, 0.2);
  put(barrow(1), -29.3, 39.6, 2.4);
  const GP = [-31, 25.5];
  put(generator(1, { ...a, on: 1 }), GP[0], GP[1], 0);
  put(distBoard(1, { ...a, on: 1 }), -28.6, 27.6, 0.3);
  put(bagWall(3, { len: 3.4, rows: 4 }), -31, 23.6, 0);
  put(bagWall(4, { len: 2.2, rows: 3 }), -33.4, 25, H);
  for (const [i, o] of [{ pts: [[-29.95, 26.25], [-29.2, 27], [-28.75, 27.5]], n: 3 }, { pts: [[-28.4, 27.45], [-25.2, 25.6], [-22.6, 20.2], [-20, 14.2], [-17.6, 11.2], [-16.2, 10.3]], ramps: [2], n: 3 }, { pts: [[-28.35, 27.75], [-24, 28.6], [-18, 26.2], [-14.3, 23.2], [-13.7, 22.2]], n: 2 }, { pts: [[-28.7, 27.9], [-29.6, 31], [-28.9, 34.4]], n: 2 }, { pts: [[-30.1, 25], [-28.2, 23.2], [-26.9, 21.6]], n: 2 }, { pts: [[-16.2, 10.3], [-12, 12.9], [-7, 12.6], [-2.2, 12], [0.9, 13.2]], ramps: [2], n: 2 }].entries()) put(cableRun(1 + i, o), 0, 0, 0, { y: 4e-3 });
  put(lightTower2(1, { ...a, on: 1, h: 7.4, tilt: 0.7 }), -28.6, 35.8, aim(1, -0.22));
  put(lightTower2(2, { ...a, on: 1, h: 6.8, tilt: 0.66 }), -25.6, -27.6, aim(0.85, 0.3));
  put(lightTower2(3, { ...a, on: 2, h: 7.2, tilt: 0.7 }), 17.4, 39.2, aim(-1, -0.12));
  put(lightTower2(4, { ...a, on: 1, h: 7, tilt: 0.72, power: 17 }), 21.4, -31.4, aim(0.9, 0.55));
  put(lightTower2(5, { ...a, on: 0, stowed: 1 }), 33.4, 36.6, 2.2);
  put(tripodLamp(2, { on: 2 }), -23.3, -36.4, aim(-1, -0.5));
  put(tripodLamp(3, { on: 1, tilt: 0.2 }), -5.4, 25.3, FACE.W);
  put(tripodLamp(4, { on: 1 }), 9.8, -14.4, aim(0.5, 1));
  put(tripodLamp(5, { down: 1 }), 10.6, -36.4, 0.8);
  put(tripodLamp(6, { on: 1 }), -34.6, -9.6, FACE.E, { y: DECK_Y });
  put(tripodLamp(7, { on: 1, tilt: 0.36 }), 6.8, 21.6, aim(0.3, 1));
  put(tripodLamp(8, { on: 1 }), -34.6, 12.4, aim(1, 0.3), { y: DECK_Y });
  put(tripodLamp(9, { on: 1, tilt: 0.34 }), -3.4, 39.6, aim(1, -0.25));
  put(tripodLamp(12, { on: 1, tilt: 0.3 }), -22.3, -5.2, aim(-0.55, 1));
  put(tripodLamp(13, { on: 2, tilt: 0.28 }), -23.6, 27.2, aim(-0.5, -1));
  [[-30.5, 1], [-10.5, 1], [12.2, 2], [30.5, 1]].forEach(([z, on], i) => put(parkLamp(1 + i, { ...a, on, twin: 1, sign: i === 1 ? "speed5" : i === 3 ? "visitors" : null }), 19.5, z, H));
  [[-8.6, 2, 0], [17, 1, 0], [25.2, 0, 0.07]].forEach(([z, on, lean], i) => put(parkLamp(6 + i, { ...a, on, lean, cam: i === 1 }), 36.3, z, -H));
  put(parkLamp(9, { ...a, on: 1, sign: "parkBus" }), 25.2, -34.5, FACE.S);
  put(duckboard(1, { n: 4, sunk: [1] }), -2.6, 11.6, -0.52);
  put(duckboard(2, { n: 5, sunk: [3], gone: [1] }), -11, 5.3, 0);
  put(duckboard(3, { n: 4, sunk: [0, 2] }), -2.3, 19.2, 0.43);
  put(duckboard(4, { n: 3 }), 4.2, 5.4, H);
  put(duckboard(5, { n: 6, sunk: [2, 5] }), -7.2, 33.4, 1.45);
  put(duckboard(6, { n: 3, gone: [1] }), -14.5, 36.6, 0.2);
  put(tapeLine(1, { ...a, len: 11, snap: 0.7 }), -6.5, -4.2, 0);
  put(tapeLine(2, { ...a, len: 14 }), -13.2, -13, H);
  put(tapeLine(3, { ...a, len: 14, snap: 0.3, rw: 1 }), 6.4, -14, H);
  put(tapeLine(4, { ...a, len: 8, rw: 1 }), -9.5, 26.9, 0);
  for (const [xa, za, xb, zb] of runs) {
    const len = Math.hypot(xb - xa, zb - za), n = Math.floor(len / 2.7), ux = (xb - xa) / len, uz = (zb - za) / len, inx = ux === 0 ? -Math.sign(xa) * 0.32 : 0, inz = uz === 0 ? -Math.sign(za) * 0.32 : 0;
    for (let i = 0; i < n; i++) {
      const v = r(), t = (i + 0.5) * (len / n);
      if (v < 0.36) continue;
      put(weeds(1 + i % 5, { ...f3, strip: 2.3, n: 10, h: 0.5 + i % 3 * 0.2 }), xa + ux * t + inx, za + uz * t + inz, Math.atan2(-uz, ux), { noCol: true });
    }
  }
  for (const [x, z, rad] of [[17.8, 21, 0.9], [-26.4, -21, 0.9], [-36, 8.5, 0.7], [-33.6, 44.6, 1], [-31.4, 40.2, 0.7], [33.4, 37.4, 1.1], [-35.4, -20, 1], [-35.6, 19.4, 1], [14.2, -34.6, 0.7], [35.5, 44, 1.2], [20.4, 44.6, 1.2], [-20, 44.8, 1.1], [3, 44.9, 1], [-35.4, 31, 1], [35.6, -40, 1.1], [31.4, -47.2, 1], [-35.6, -30.6, 0.9]]) put(weeds(7 + Math.floor(r() * 4), { ...f3, r: rad, n: 12, h: 0.8 }), x, z, r() * 6, { noCol: true });
  put(ivy(1, { ...f3, w: 4.2, h: 3.3, drape: 1 }), 27.6, -37.47, FACE.S);
  put(ivy(2, { ...f3, w: 5, h: 6.2, fill: 0.8 }), 9.63, -42, FACE.E);
  put(ivy(3, { ...f3, w: 4, h: 5, fill: 0.6 }), -21.33, -34.6, FACE.W);
  put(ivy(4, { ...f3, w: 3, h: 3.3, drape: 1 }), 12.97, -44.6, FACE.W);
  put(ivy(5, { ...f3, w: 3.4, h: 3.2, fill: 0.5 }), 15.4, -37.47, FACE.S);
  put(tree(1, { ...f3, h: 11, kind: "leaf" }), -24, 43.2, 0.4);
  put(tree(2, { ...f3, h: 9, kind: "bare", lean: [0.06, -0.04] }), 22.6, 41.6, 1.3);
  put(tree(3, { ...f3, h: 9.5, kind: "thin" }), 34.6, 40.2, 2.2);
  put(tree(4, { ...f3, h: 10, kind: "thin" }), 33.7, -42.8, 0.9);
  put(deadFall(1, { ...f3, len: 5, leaves: 1 }), 9.8, 25.2, 0.5);
  put(deadFall(2, { ...f3, len: 4 }), -31.2, 32.8, 2);
  put(deadFall(3, { ...f3, len: 3.6, leaves: 1 }), 33.2, -37.2, 1.1);
}
function shelterHall(G4, stage2) {
  const { put } = stage2, AT = G4.fatlas.signs, a = { atlas: AT }, r = rng(9917), Gy = S2.gym;
  const STATES = ["used", "made", "used", "body", "used", "bare", "blood", "used", "made", "tipped", "used", "bare"];
  const rows = [[-46.4, (x) => Math.abs(x + 14) < 1.9 || x > -11.2 && x < -4.4], [-42.6, (x) => Math.abs(x + 14) < 1.9], [-36.4, (x) => Math.abs(x + 14) < 1.9 || Math.abs(x + 6) < 2.6 || Math.abs(x - 4.2) < 2.1], [-32.6, (x) => Math.abs(x + 14) < 1.9 || Math.abs(x + 6) < 2.6 || Math.abs(x - 4.2) < 2.1]];
  let k = 0;
  rows.forEach(([z, skip], ri) => {
    for (let x = Gy.x0 + 1.5; x < Gy.x1 - 1.2; x += 1.27) {
      k++;
      const v = r(), wreck = x > 0.5 && v < 0.45;
      if (skip(x) || v > 0.9) continue;
      const st = wreck ? v < 0.2 ? "tipped" : "blood" : STATES[(k * 5 + ri * 3) % STATES.length];
      put(cot(1 + k % 9, { state: st, atlas: AT }), x + (r() - 0.5) * 0.12, z + (wreck ? (r() - 0.5) * 0.5 : (r() - 0.5) * 0.08), H + (ri % 2 ? PI5 : 0) + (r() - 0.5) * (wreck ? 0.7 : 0.1));
      const v2 = r(), foot = z + (ri % 2 ? -1 : 1) * (ri === 0 || ri === 2 ? 1.22 : -1.22);
      if (v2 < 0.2) put(suitcase(1 + k % 5, { lay: v2 < 0.08 }), x + 0.42, foot, r() * 6, { noCol: true });
      else if (v2 < 0.34) put(duffel(1 + k % 4), x - 0.4, foot, r() * 6, { noCol: true });
    }
  });
  put(triageDesk(7, { ...a, lamp: 0 }), -9.6, -33.3, H);
  put(triageDesk(8, { ...a, kind: "meds", chair: "tipped" }), -2.6, -33.6, 0.1);
  put(waySign(6, { ...a, name: "register", name2: "cots" }), -8.6, -34.9, H + 0.2);
  put(supplyStack(7, { ...a, kind: "aid", h: 3 }), 7.9, -44.2, H);
  put(supplyStack(8, { ...a, kind: "water", h: 2 }), 7.9, -42.3, H);
  put(supplyStack(9, { ...a, kind: "mixed", h: 2, sheet: false }), 7.8, -35.6, H + 0.1);
  put(wardScreen(4, { blood: 1 }), 2.2, -44.6, 0.1);
  put(wardScreen(5, { down: 1 }), 5.4, -41.2, 0.6);
  put(wardScreen(6, {}), -17.4, -44.7, 0.05);
  put(dripStand(3, { ...a }), 3.4, -45.5);
  put(dripStand(4, { ...a, fallen: 1 }), 6.4, -37.9, 1.2);
  put(wheelchair(4, { tipped: 1 }), 1.2, -39, 0.7);
  put(stretcher(9, { load: "bag", atlas: AT }), -19.2, -38.2, H);
  put(wasteBins(4, { ...a, n: 2, bags: 4 }), -20.2, -33.2, H);
  put(trashBags(2, { n: 6 }), 8.1, -33, 0.4);
  put(tripodLamp(10, { on: 1, tilt: 0.3 }), -19.6, -42.4, aim(1, 0.25));
  put(tripodLamp(11, { down: 1 }), 3, -36.2, 2.2);
}
function carParkField(G4, stage2) {
  const { put } = stage2, AT = G4.fatlas.signs, WA = G4.watlas && G4.watlas.signs, a = { atlas: AT }, r = rng(5521);
  for (let i = 0; i < 46; i++) {
    const lane = Math.floor(r() * 4), z = -28.05 + lane * 5.2 + 2.6 + (r() - 0.5) * 1.3, x = 21.5 + r() * 6.8 + (r() < 0.3 ? 2.2 : 0), v = r();
    put(v < 0.5 ? suitcase(1 + i % 5, { lay: v < 0.28 }) : v < 0.82 ? duffel(1 + i % 4) : trashBags(1 + i % 3, { n: 3 }), x, z, r() * 6, { noCol: v < 0.82 });
  }
  for (const [x, z, n] of [[20.6, -3.2, 5], [33.6, 11.6, 6], [24.2, 26.8, 5], [34.8, -33.6, 4]]) for (let i = 0; i < n; i++) {
    const v = r();
    put(v < 0.6 ? suitcase(1 + i % 5, { lay: v < 0.3 }) : duffel(1 + i % 4), x + (r() - 0.5) * 2.2, z + (r() - 0.5) * 1.8, r() * 6, { noCol: true });
  }
  put(crowdBarrier2(5, { ...a, n: 4, down: [1], tape: 1, sign: "parkBus" }), 24.6, -22.9, 0.04);
  put(crowdBarrier2(6, { ...a, n: 4, down: [0, 3] }), 24.4, -17.6, -0.05);
  put(crowdBarrier2(7, { ...a, n: 3, gap: [1] }), 25.2, -12.4, 0.03);
  put(crowdBarrier2(8, { ...a, n: 3, down: [2], tape: 1 }), 22.8, 9.6, H + 0.1);
  put(jersey(1, { stripe: 1 }), 34.9, 3.6, 0.06);
  put(jersey(2), 32, 3.9, -0.1);
  put(jersey(3, { stripe: 1 }), 34.6, 12.6, 0.3);
  put(jersey(4), 30.9, 13.4, 1.1);
  for (const [x, z, fall] of [[35.6, 5.6, 0], [34.2, 6, 0], [32.8, 6.3, 1], [31.2, 6.1, 0], [35.4, 10.6, 0], [33.6, 10.2, 1], [31.8, 10.4, 0], [28.6, 8.4, 1], [22.4, -8.2, 0], [22.6, -6.6, 1], [26.9, 12.2, 0]]) put(cone(1 + (x * 7 | 0) % 3, !!fall), x, z, r() * 6, { noCol: true });
  if (WA) {
    put(sedan(41, { atlas: WA, smash: 1, door: 0.9 }), 34, 16.9, 0.05);
    put(sedan(42, { atlas: WA, smash: 2, flat: 1 }), 33.8, 22.2, PI5 - 0.08);
    put(sedan(43, { atlas: WA, smash: 1 }), 22.6, 30.6, -0.5);
    put(sedan(44, { atlas: WA, hazard: 1, lights: 1 }), 33.2, -36.6, PI5 + 0.2);
  }
  put(burnBarrel(1), 31.4, 15.2, 0);
  put(burnBarrel(2), -0.8, 37.6, 1);
  put(trashBags(1, { n: 6 }), 20.4, 16.4, 0.3);
  put(trashBags(3, { n: 5 }), 35.6, -24.6, 1.2);
  put(euroBin(7, { ...a, lid: 0.6, bags: 4 }), 35.4, 31.6, FACE.W);
  put(waySign(7, { ...a, name: "parkBus", name2: "wayBuses" }), 22.2, -25.6, FACE.W);
  put(supplyStack(10, { ...a, kind: "water", h: 2 }), 26.2, 9.4, 0.2);
  put(wheelchair(5), 26.4, -5.6, 1.4);
  put(stretcher(10, { trolley: 1 }), 29, 12.9, 0.4);
}
function backdropField(G4, stage2) {
  const { put } = stage2, AT = G4.fatlas.signs, FOL = G4.fatlas.foliage, WA = G4.watlas && G4.watlas.signs, a = { atlas: AT }, f3 = { sheet: FOL }, r = rng(8123), nc = { noCol: true };
  const states = (lit) => Array.from({ length: 4 }, () => {
    const v = r();
    return v < lit ? 1 : v < lit + 0.1 ? 2 : v < lit + 0.2 ? 3 : v < lit + 0.42 ? 4 : v < lit + 0.45 ? 5 : 0;
  });
  const home = (i, x, z, yaw, o = {}) => put(house(1 + i % 9, { ...a, garage: i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0, ext: i % 2, bay: i % 4 === 1, w: i % 5 === 2 ? 8.2 : 7.4, front: states(o.lit ?? 0.1), back: states(o.lit ?? 0.1), dead: i % 6 === 4, porchLamp: i % 5 === 3, ...o }), x, z, yaw, nc);
  for (let i = 0; i < 9; i++) {
    const x = -50 + i * 11.6;
    home(i, x, 62.5, FACE.S, { lit: 0.14 });
    put(gardenFence(1 + i % 4, { n: 6, down: i === 2 ? [3] : i === 6 ? [1, 2] : [], gone: i === 4 ? [4] : [], trellis: i % 3 === 0 }), -55 + (i + 0.5) * 11.05, 53.8, 0, nc);
    put(gardenFence(5 + i % 3, { n: 2, h: 1.5 }), x - 5.6, 56.2, H, nc);
  }
  for (let i = 0; i < 11; i++) {
    const z = -58 + i * 11.6;
    home(i + 3, 57.6, z, FACE.W, { lit: 0.12 });
    put(hedge(1 + i % 4, { ...f3, len: 7.2, h: 1.15 + i % 3 * 0.2, d: 0.8, gaps: i % 4 === 2 ? [[2.5, 3.6]] : [], dead: i % 5 === 3 ? 0.6 : 0.1 }), 50.5, z - 1.4, H, nc);
  }
  for (let i = 0; i < 7; i++) {
    const z = -46 + i * 11.6;
    home(i + 5, -60.5, z, FACE.W, { lit: 0.1 });
    put(gardenFence(2 + i % 4, { n: 6, down: i === 3 ? [2] : [], gone: i === 5 ? [0, 1] : [] }), -47, -50 + (i + 0.5) * 11.05, H, nc);
  }
  put(lockups(1, { ...a, n: 5, open: [1, 4], lit: 1, tags: [0, 2, 3] }), -47.6, 50.2, FACE.E, nc);
  put(teachingWing(1, { ...a, len: 42, tower: 1, entrance: 4, lit: [[2, 1, 1], [7, 2, 2], [9, 0, 1], [10, 2, 1], [0, 2, 1]] }), 21, -68, FACE.S, nc);
  put(teachingWing(2, { ...a, len: 35, tower: -1, entrance: -1, panel: [0.34, 0.2, 0.08], lit: [[3, 1, 1], [6, 2, 1], [1, 0, 2], [8, 1, 1]] }), -52.5, -66, FACE.E, nc);
  put(slabBlock(1, { lit: [[1, 7], [4, 3], [6, 8], [2, 2], [7, 5], [0, 9], [5, 1]], fire: [5, 6] }), 98, -32, FACE.W - 0.25, nc);
  put(slabBlock(2, { floors: 8, bays: 7, lit: [[2, 5], [5, 2], [3, 6], [0, 1]] }), -18, 122, FACE.N + 0.2, nc);
  put(pylon(1, { span: 112 }), -104, -62, 0.04, nc);
  put(pylon(2, { span: 112 }), -104, 50, 0.04, nc);
  put(waterTower(1), 80, 104, 0.3, nc);
  for (let z = -46; z <= 45; z += 2.6) {
    const x = -39.9 + (r() - 0.5) * 0.7, v = r();
    if (!clearOf(x, z) || v < 0.08) continue;
    put(conifer(1 + Math.floor(v * 5), { ...f3, h: 8.5 + v * 4.2, r: 1.25 + r() * 0.4, brown: v > 0.8 ? 0.5 : 0.1, top: v < 0.3 ? 1 : 0 }), x, z, r() * 6, nc);
  }
  for (const [x, z, h, kind] of [[-34, 50.2, 10, "leaf"], [-27, 51, 12, "thin"], [-19.5, 50, 9, "leaf"], [-13, 50.8, 11, "bare"], [3.5, 50.4, 12.5, "leaf"], [10.5, 51.2, 9.5, "thin"], [17.5, 50.2, 11, "leaf"], [23.5, 51, 10, "bare"], [36.5, 50.6, 12, "leaf"], [16.5, -52.2, 11, "thin"], [24, -51.6, 12.5, "leaf"], [31, -52.6, 10, "leaf"], [37.5, -51.8, 9, "bare"], [-29.5, -52, 12, "leaf"], [-36.5, -52.6, 10, "thin"], [52.6, -40, 8, "leaf"], [53, -6, 9, "thin"], [52.4, 28, 8.5, "leaf"], [52.8, 50, 9.5, "bare"], [-52, -18, 10, "leaf"], [-51.5, 16, 11, "thin"], [-20, 57.4, 8, "leaf"], [14, 57.8, 9, "thin"], [38, 57.2, 8.5, "leaf"]])
    if (clearOf(x, z)) put(tree(11 + Math.floor(r() * 6), { ...f3, h, kind }), x, z, r() * 6, nc);
  for (const [x, z, len] of [[33.5, -49.6, 6.5], [-30, -49.7, 12], [16, 47.3, 10], [-22, 47.4, 12]]) put(hedge(6 + Math.floor(r() * 3), { ...f3, len, h: 1.7, d: 1, dead: 0.2, stems: 1 }), x, z, 0, nc);
  [[-50, 1], [-27, 1], [-8, 0], [10, 1], [33, 2], [56, 1]].forEach(([z, on], i) => put(parkLamp(21 + i, { ...a, h: 8, on, power: 30, dist: 18, lean: on ? 0 : 0.05 }), 49.7, z, FACE.W, nc));
  put(telegraphPole(1, { lamp: 1, wires: [[-11, 8, 0.4], [9, 5.4, -5.2], [-7, 5.4, -5.4]] }), -9.6, 52.7, FACE.N, nc);
  put(telegraphPole(2, { lamp: 2, wires: [[-11.5, 8, 0.2], [6, 5.4, -5.4]] }), 33.7, 52.7, FACE.N, nc);
  put(telegraphPole(3, { wires: [[-21.5, 8.1, 0], [21.6, 8.1, 0], [3, 5.4, -5.5]] }), 12, 52.9, FACE.N, nc);
  put(telegraphPole(4, { wires: [[-18.4, 8.1, 0.2], [-5, 5.4, -5.3]] }), -28, 52.9, FACE.N, nc);
  put(telegraphPole(5, { lamp: 1, wires: [[0.2, 7.9, -36]] }), -43.7, -33.4, FACE.E, nc);
  put(telegraphPole(6, { lamp: 2 }), -43.7, 39.6, FACE.E, nc);
  put(telegraphPole(7, { lamp: 1, wires: [[25.5, 8, -0.3]] }), -10.2, -53.3, FACE.S, nc);
  put(telegraphPole(8, { lamp: 1 }), 15.4, -53.6, FACE.S, nc);
  if (WA) {
    put(sedan(31, { atlas: WA, smash: 1, flat: 1 }), 46.4, -14, H + 0.06, nc);
    put(sedan(32, { atlas: WA, door: 1, doorSide: 1, lights: 1, hazard: 1 }), 46.2, 22.5, -H + 0.3, nc);
    put(sedan(33, { atlas: WA, smash: 2 }), 46.6, -44, H, nc);
    put(sedan(34, { atlas: WA, smash: 1, door: 1 }), 53.4, 3.2, 0.1, nc);
    put(sedan(35, { atlas: WA }), 53.2, -31.6, PI5, nc);
  }
  put(streetBit(1, { ...a, kind: "closed" }), 41.6, 58, 0.1, nc);
  put(streetBit(2, { ...a, kind: "closed" }), 46.4, 58.3, -0.15, nc);
  put(streetBit(3, { ...a, kind: "closed" }), 44, -58, 3.2, nc);
  put(streetBit(4, { kind: "pillar" }), 50.3, 14.6, FACE.W, nc);
  put(streetBit(5, { kind: "cabinet" }), 50.4, -20.5, FACE.W, nc);
  put(streetBit(6, { kind: "grit" }), 50.2, 39, FACE.W, nc);
}

