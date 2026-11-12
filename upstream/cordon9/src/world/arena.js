var LIGHT_K = 13;
var POOL = 8;
var EMIT = /^(lamp|neon|led|em)(?!.*B$)/;
var NOCAST = /^(decal|mark|emit|em|glassT|win|signLit|black)/;
var BOUNDS = { x0: -9.5, x1: 9.5, z0: -22, z1: 21 };
function buildArena(G4, opts = {}) {
  const R4 = G4.render, mats = worldMaterials(G4), AT = worldAtlases(), A = AT.signs, MK = AT.marks, a = { atlas: A }, aw = { atlas: A, watlas: AT };
  const W = { colliders: [], insts: [], lights: [], flares: [], keys: [], spawns: [], pickups: [], fires: [], meshes: [], blink: {}, name: "Halsey Street checkpoint" };
  const chunks = /* @__PURE__ */ new Map(), regionOf = (z) => z < -24 ? 0 : z < 0 ? 1 : z <= 24 ? 2 : 3, v = new Vector3(), d = new Vector3();
  const emitCol = (name) => {
    const c = mats[name].color;
    return [c.r, c.g, c.b];
  };
  const addGeo = (name, g2, region) => {
    let k = name;
    if (EMIT.test(name)) {
      const c = emitCol(name), n = g2.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = c[0];
        arr[i * 3 + 1] = c[1];
        arr[i * 3 + 2] = c[2];
      }
      g2.setAttribute("color", new BufferAttribute(arr, 3));
      k = "emit";
    }
    const key = k + "|" + region;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(g2);
  };
  let tris = 0, count = 0;
  const byProp = {};
  function put(prop, x, z, yaw = 0, o = {}) {
    const y = o.y ?? (Math.abs(x) > ROAD.hw + 0.2 && !o.road ? ROAD.walkY : 0), M = mat4({ p: [x, y, z], r: o.rot || [0, yaw, 0] }), reg = o.region ?? regionOf(z);
    for (const [k, arr] of prop.B.map) for (const g2 of arr) {
      const c = g2.clone();
      c.applyMatrix4(M);
      addGeo(k, c, reg);
    }
    tris += prop.tris;
    count++;
    byProp[prop.name] = (byProp[prop.name] || 0) + prop.tris;
    const ii = W.insts.push({ prop, M, inv: M.clone().invert() }) - 1;
    if (!o.noCol) for (const c of prop.cols) {
      if (c.c[1] < -0.5) continue;
      v.set(c.c[0], c.c[1], c.c[2]).applyMatrix4(M);
      W.colliders.push({ ...c, c: [v.x, v.y, v.z], yaw: c.yaw + yaw, prop: prop.name, inst: ii });
    }
    for (const g2 of prop.glows) {
      v.set(g2.p[0], g2.p[1], g2.p[2]).applyMatrix4(M);
      const e = { ...g2, p: [v.x, v.y, v.z] };
      if (g2.dir) {
        d.set(g2.dir[0], g2.dir[1], g2.dir[2]).transformDirection(M);
        e.dir = [d.x, d.y, d.z];
      }
      if (g2.kind === "key") W.keys.push(e);
      else if (g2.kind === "flare") W.flares.push(e);
      else W.lights.push(e);
    }
    if (prop.sockets.fire) {
      v.set(...prop.sockets.fire).applyMatrix4(M);
      W.fires.push([v.x, v.y, v.z]);
    }
    return prop;
  }
  const markProp = (name, w, h, rot2 = 0, tint = null) => proto("gm" + name + w + h + rot2, () => {
    const P3 = new Prop("gmark", 1);
    P3.quad("mark", w, h, MK.rect(name), { r: [-H, 0, rot2] });
    P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
    return P3.finish({ grime: 0 });
  });
  const mark = (name, x, z, w, h = w, rot2 = 0) => put(markProp(name, w, h, Math.round(rot2 * 10) / 10), x, z, 0, { y: (Math.abs(x) > ROAD.hw + 0.3 ? ROAD.walkY : 0) + 6e-3 + count % 7 * 4e-4, noCol: true });
  const ground = buildGround(G4, mats, {
    puddles: [[-3.2, -17.5, 1.5, 0.3], [2.4, -5.4, 1.2, 0.3], [-1, 2.2, 1.6, 0.34], [4.4, 10.8, 1.3, 0.3], [-4.9, 3.2, 0.9, 0.3], [0.8, 15.4, 1.9, 0.32], [-2.2, -9.3, 1, 0.28], [3.6, -15.2, 1.4, 0.3], [-0.6, 19.2, 1.2, 0.3], [5.3, 0.5, 0.7, 0.3], [-5.3, -12, 0.8, 0.3], [0.6, -21, 1.3, 0.3]],
    oil: [[-2.3, -14.4, 1, 0.9], [2.6, -9.2, 1, 0.8], [-3.4, 17, 1.2, 0.9], [4.2, 15.6, 1, 0.8], [-4.9, -8.4, 0.7, 1], [4.9, 13.3, 0.7, 1], [0.4, -1.5, 0.5, 0.5]],
    patches: [[-3.1, -18.6, 1.3, 0.9, 0.04], [2.2, 6.2, 0.8, 2.6, -0.02], [0, -11.9, 6, 0.35, 0.01], [-4.2, 12.6, 1.1, 0.7, 0.2], [3.4, -2.2, 0.9, 0.9, 0.5], [1.6, -12.6, 0.75, 0.75, 0], [2.1, 17.8, 0.75, 0.75, 0], [0, 19.6, 6, 0.3, -0.015]],
    xmarks: [[-4.4, -15.6], [4.6, 5.2]],
    skids: [[3.2, -19, 2.9, -11.2], [3, 20, 4.3, 16.6]],
    drops: [[-14.2, -11.3, -1], [11.3, 14.2, -1], [-6.2, -3.3, 1], [-21, -17.4, -1], [-21, -17.4, 1]]
  });
  for (const [k, arr] of ground.bucket.map) for (const g2 of arr) addGeo(k, g2, 1);
  const wx = -(ROAD.hw + ROAD.kerb + ROAD.walk), ex = -wx, bw = (seed, o, z) => put(building(seed, { ...aw, ...o }), wx, z, H), be = (seed, o, z) => put(building(seed, { ...aw, ...o }), ex, z, -H);
  bw(11, { w: 8, floors: 4, style: "brick", tint: 0, shop: "shopNoodle", mode: "glass", shopLit: true, shopCol: [1, 0.8, 0.55], shopLamp: "lampWarm", shopPower: 22, awning: [0.5, 0.1, 0.08], blade: "neonR", bladeSide: 1, fire: [-2.2, 1.4], lit: [[1, 9], [5, 13], [8, 21], [10, 17]], tank: 1.4, pipe: -1 }, -18);
  bw(12, { w: 7, floors: 3, style: "stucco", tint: 1, shop: "shopPharm", mode: "shutter", graf: "grafNoCure", blade: "neonG", cross: true, bladePower: 9, lamps: 3, lampPower: 3.5, door: "l", lit: [[0, 10], [4, 19]], frameCol: [0.2, 0.3, 0.26] }, -8);
  bw(13, { w: 9, floors: 2, style: "stucco", tint: 3, gmat: "tile", gtint: [0.75, 0.8, 0.8], shop: "shopLaundry", signLit: true, signCol: [0.6, 0.85, 1], mode: "glass", inside: "laundry", shopLit: true, shopPower: 34, flicker: 0.6, lit: [[2, 14]], aerial: -2 }, 0);
  bw(14, { w: 7, floors: 3, style: "brick", tint: 1, shop: "shopPawn", mode: "shutter", closed: 0.72, shutCol: [0.5, 0.5, 0.42], blade: "neonY", bladeFlicker: 1.5, door: "l", lit: [[3, 11], [7, 22]], poster: "posterMissing" }, 8);
  bw(15, { w: 8, floors: 4, style: "stucco", tint: 2, shop: "shopHardware", mode: "board", graf: "grafSearch", fire: [-1, 2.6], lit: [[6, 15], [9, 9], [2, 20]], tank: -1.6, pipe: -1 }, 18);
  be(21, { w: 9, floors: 3, style: "brick", tint: 2, shop: "shopDeli", mode: "glass", smashed: 1, awning: [0.14, 0.34, 0.2], awning2: [0.8, 0.78, 0.7], torn: true, lamps: 4, lit: [[1, 12], [6, 18]], door: "l" }, -17.5);
  be(22, { w: 7, floors: 2, style: "stucco", tint: 4, shop: "shopBarber", mode: "glass", smashed: 0, blade: "neonB", bladeSide: 1, bladePower: 12, lit: [[1, 16]], aerial: 1.5 }, -9.5);
  be(23, { w: 9, floors: 5, style: "brick", tint: 3, shop: "shopVacant", mode: "board", graf: "grafArrow", fire: [-3.4, 0.2], lit: [[2, 10], [9, 23], [12, 13], [5, 26]], tank: 2.2, poster: "posterEvac" }, 1);
  be(24, { w: 7, floors: 3, style: "stucco", tint: 0, shop: null, mode: "shutter", graf: "grafSearch", shutCol: [0.42, 0.5, 0.55], lit: [[4, 20]], door: "l", frameCol: [0.3, 0.2, 0.18] }, 9);
  be(25, { w: 9.5, floors: 4, style: "brick", tint: 0, shop: "shopNoodle", mode: "glass", shopLit: true, shopCol: [1, 0.72, 0.5], shopLamp: "lampWarm", shopPower: 16, flicker: 1.2, blade: "neonP", lit: [[0, 9], [7, 14], [10, 19]], fire: [0.6, 3.8], pipe: -1 }, 17.25);
  bw(31, { w: 9, floors: 3, style: "stucco", tint: 0, shop: "shopVacant", mode: "shutter", lit: [[1, 11]], depth: 6 }, -26.5);
  be(33, { w: 9, floors: 4, style: "brick", tint: 1, shop: "shopPawn", mode: "shutter", lit: [[2, 17], [9, 9]], depth: 6 }, -26.5);
  bw(35, { w: 9, floors: 4, style: "brick", tint: 2, shop: "shopDeli", mode: "shutter", lit: [[5, 13]], depth: 6 }, 26.5);
  be(36, { w: 9, floors: 3, style: "stucco", tint: 1, shop: "shopBarber", mode: "shutter", lit: [[0, 22]], depth: 6 }, 26.5);
  const alley = (side2, z, seed) => put(proto("alley" + seed, () => {
    const P3 = new Prop("alley", seed), L = 7.6, dk = [0.12, 0.13, 0.13];
    P3.box("concrete", L, 0.2, 3.3, L / 2, -0.1, 0, { col: [0.62, 0.62, 0.6], b: 0 });
    P3.ext("brick", rectPts(-1.65, 0, 1.65, 10), 0, 0.3, { holes: [rectPts(-0.5, 0.02, 0.5, 2.1)], bevel: 4e-3, col: [0.62, 0.56, 0.52], p: [L, 0, 0], r: [0, -H, 0] });
    P3.push({ p: [L - 0.04, 0, 0], r: [0, -H, 0] });
    frameXY(P3, "paint", -0.56, 0, 0.56, 2.16, 0.02, 0.07, 0.1, dk);
    P3.box("paintOld", 1, 2.08, 0.05, 0, 1.06, -0.03, { col: [0.3, 0.2, 0.16], b: 6e-3 });
    P3.box("steel", 0.03, 0.2, 0.05, 0.38, 1.05, 0.02, { col: C.steel });
    for (const y of [0.3, 1.8]) P3.box("steel", 0.1, 0.14, 0.02, -0.46, y, 5e-3, { col: dk });
    P3.add("paint", softBox(0.22, 0.14, 0.12, 0.03, 2), dk, { p: [0, 2.5, 0.07] });
    P3.add("lampWarm", softBox(0.16, 0.09, 0.06, 0.03, 2), null, { p: [0, 2.48, 0.13] });
    for (let i = 0; i < 4; i++) P3.bar("steel", [-0.09 + i * 0.06, 2.42, 0.17], [-0.09 + i * 0.06, 2.55, 0.17], 4e-3, { col: dk });
    P3.glow("fill", [0, 2.3, 0.7], { col: [1, 0.62, 0.3], power: 9, dist: 8, flicker: seed % 2 ? 0.8 : 0 });
    P3.glow("flare", [0, 2.48, 0.2], { col: [1, 0.62, 0.3], size: 0.8 });
    if (A) P3.quad("decal", 1.3, 1.3 / A.aspect("grafNoCure"), A.rect(seed % 2 ? "grafNoCure" : "grafTag"), { p: [seed % 2 ? -1.05 : 1.05, 1.5, 4e-3], r: [0, 0, 0.05] });
    P3.pop();
    for (const s of [-1, 1]) {
      const wz = s * 1.25;
      P3.tube("paint", [[1.9 + s, 9, wz - s * 0.07], [1.9 + s, 0.4, wz - s * 0.07], [1.9 + s, 0.12, wz - s * 0.2]], 0.05, { seg: 8, col: dk });
      for (const y of [1.2, 3.6, 6.2]) P3.box("steel", 0.14, 0.03, 0.05, 1.9 + s, y, wz - s * 0.03, { col: dk, b: 4e-3 });
      P3.box("galv", 0.5, 0.6, 0.16, 3.6 + s * 1.2, 1.5, wz - s * 0.08, { b: 0.012 });
      P3.box("galv", 0.18, 0.26, 0.1, 3.6 + s * 1.2 + 0.42, 1.34, wz - s * 0.05, { b: 0.01 });
      P3.bar("galv", [3.6 + s * 1.2, 1.8, wz - s * 0.03], [3.6 + s * 1.2, 5, wz - s * 0.03], 0.016);
      P3.bar("galv", [3.6 + s * 1.2 + 0.42, 1.47, wz - s * 0.03], [3.6 + s * 1.2 + 0.42, 5, wz - s * 0.03], 0.012);
      if (A) {
        const ry = s > 0 ? PI5 : 0, zf = wz - s * 6e-3;
        const names = s > 0 ? ["posterMissing", "notice", "posterEvac"] : ["posterEvac", "posterMissing", "notice"];
        names.forEach((nm, i) => {
          let a2 = 1;
          try {
            a2 = A.aspect(nm);
          } catch (e) {
            return;
          }
          const hh = 0.62 + 0.1 * P3.rr(0, 1);
          P3.quad("decal", hh * a2, hh, A.rect(nm), { p: [0.75 + i * 0.72 + P3.rr(-0.05, 0.05), 1.5 + P3.rr(-0.12, 0.12), zf], r: [0, ry, P3.rr(-0.06, 0.06)] });
        });
        P3.quad("decal", 1.5, 1.5 / A.aspect("grafTag"), A.rect(s > 0 ? "grafTag" : "grafSearch"), { p: [4.9, 1.35, zf], r: [0, ry, -0.04] });
      }
    }
    {
      const s = seed % 2 ? 1 : -1, wz = s * 1.25, lx3 = 1.1;
      P3.add("paint", softBox(0.14, 0.24, 0.1, 0.03, 2), dk, { p: [lx3, 2.75, wz - s * 0.05] });
      P3.add("lampCool", softBox(0.09, 0.17, 0.07, 0.03, 2), null, { p: [lx3, 2.74, wz - s * 0.1] });
      for (let i = 0; i < 4; i++) P3.bar("steel", [lx3 - 0.06, 2.67 + i * 0.05, wz - s * 0.15], [lx3 + 0.06, 2.67 + i * 0.05, wz - s * 0.15], 4e-3, { col: dk });
      P3.tube("galv", [[lx3, 2.88, wz - s * 0.03], [lx3, 4.2, wz - s * 0.03], [lx3 + 0.5, 4.5, wz - s * 0.03]], 0.012, { seg: 5 });
      P3.glow("fill", [lx3, 2.5, wz - s * 0.7], { col: [0.8, 0.9, 1], power: 7, dist: 7 });
      P3.glow("flare", [lx3, 2.74, wz - s * 0.16], { col: [0.8, 0.9, 1], size: 0.6 });
    }
    P3.col([L, 0, -1.7], [L + 0.4, 10, 1.7], { surface: "brick" });
    return P3.finish({ grime: 1.2, ground: 0.4 });
  }), side2 * 9.55, z, side2 > 0 ? 0 : PI5, { y: ROAD.walkY });
  alley(-1, -12.75, 1);
  alley(-1, 12.75, 2);
  alley(1, -4.75, 3);
  const fz = BOUNDS.z0;
  put(fencePanel(1, { ...a, w: 3.2, tarp: "green" }), -7.95, fz, 0);
  put(fencePanel(2, { ...a, tarp: "green", sign: "quarantine" }), -4.85, fz, 0);
  put(fencePanel(3, { ...a }), -1.85, fz, 0);
  put(fencePanel(4, { ...a, w: 2, tarp: "white", sign: "noentry" }), 0.65, fz, 0);
  put(fencePanel(5, { ...a, sign: "checkpoint" }), 5.9, fz, 0);
  put(fencePanel(6, { ...a, w: 2.2, tarp: "green" }), 8.5, fz, 0);
  put(fencePanel(7, { ...a, razor: false }), 3.1, fz - 1.3, 0.25, { rot: [1.42, 0.25, 0.05], noCol: true, y: 0.12 });
  for (const x of [-4.4, -1.4]) put(jersey(x < -2 ? 2 : 3, {}), x, fz + 0.75, 0.02);
  put(jersey(4, { stripe: true, ...a }), 6, fz + 0.75, -0.03);
  put(waterBarrier(1, "orange"), 1.2, fz + 0.9, 0.5);
  const sz = BOUNDS.z1;
  for (const [x, sd] of [[-1.75, 2], [1.3, 5], [4.35, 6]]) put(jersey(sd, { stripe: sd === 5, ...a }), x, sz, 0);
  for (const [x, wd, o] of [[-1.75, 3, { tarp: "white" }], [1.3, 3, { sign: "roadclosed" }], [4.35, 3, { tarp: "green" }], [7.9, 3.2, { tarp: "green", sign: "curfew" }], [-7.9, 3.2, {}]]) put(fencePanel(Math.round(x * 3 + 20), { ...a, w: wd, ...o }), x, sz + 0.55, 0);
  put(waterBarrier(2, "white"), -7, sz + 2.3, 1.2);
  put(fencePanel(9, { ...a, razor: false, tarp: "white" }), -4.3, sz + 1.6, 0.4, { rot: [-1.4, 0.4, 0.1], noCol: true, y: 0.1 });
  const wall2 = (x0, z0, x1, z1) => W.colliders.push({ c: [(x0 + x1) / 2, 1.5, (z0 + z1) / 2], h: [Math.abs(x1 - x0) / 2 + 0.05, 1.5, Math.abs(z1 - z0) / 2 + 0.05], yaw: 0, playerOnly: true, noNav: true, surface: "none" });
  wall2(1.6, fz, 4.5, fz);
  wall2(-6.3, sz, -3.3, sz);
  wall2(wx, -14.2, wx, -11.3);
  wall2(wx, 11.3, wx, 14.2);
  wall2(ex, -6.2, ex, -3.3);
  wall2(-9.6, fz, 9.6, fz - 0.4);
  wall2(-9.6, sz + 0.4, 9.6, sz + 0.8);
  put(jersey(1, { stripe: true, ...a }), -4.4, -4.3, 0.05);
  put(jersey(2, {}), 4.45, -4.6, -0.06);
  put(jersey(3, {}), -4.45, 4.5, -0.04);
  put(jersey(6, { stripe: true, ...a }), 4.4, 4.3, 0.05);
  put(waterBarrier(1, "orange"), -2, -7.3, 0.55);
  put(waterBarrier(3, "white"), -0.6, -8.6, 0.6);
  put(waterBarrier(2, "orange"), 1.9, 7.2, 0.5);
  put(waterBarrier(4, "white"), 0.4, 6.3, 0.62);
  put(guardBooth(1, a), 3.9, 0.2, -H);
  put(boomGate(1, { ...a, angle: 1.15 }), 2.35, -1.55, PI5);
  put(sandbags(1, { len: 2.4, rows: 5, deep: 2 }), 4.5, -2.5, 0.03);
  put(sandbags(2, { len: 1.8, rows: 4, deep: 2 }), 2.1, 2.3, H + 0.1);
  put(sandbags(3, { len: 2.4, rows: 3, deep: 1 }), -4.3, -2.9, 0.1);
  put(concreteBlock(1, { stripe: true, ...a }), -1.6, 4.9, 0.1);
  put(concreteBlock(2, {}), 1.3, -5.6, -0.12);
  for (const [x, z, r] of [[-4.3, -11.2, 0.3], [-1, -11.8, 1.1], [2.7, -11, 2]]) put(hedgehog(Math.round(r * 3) + 1), x, z, r);
  for (let i = 0; i < 6; i++) put(cone(i + 1, i === 3), -3 + i * 0.52, -5.6 - i * 0.62, i * 1.3);
  for (const [x, z] of [[1, -2.6], [-2.9, -1.6], [-2.8, 1.4], [0.9, 3.1]]) put(drum(Math.round(x * 2 + 5)), x, z, x);
  put(barricade(1, { sign: "roadclosed", ...a }), 3.4, -16.9, 0.12);
  put(barricade(2, { sign: "checkpoint", ...a }), -3.3, 18.6, -0.1);
  put(signStand(1, { sign: "detour", ...a }), -1.3, 12.9, 0.3);
  put(signStand(2, { sign: "stop", ...a }), -0.9, -5.2, PI5);
  put(signPost(1, { sign: "quarantine", ...a, h: 3 }), 6.75, -6.6, -H);
  put(signPost(2, { sign: "stop", sign2: "lane1", ...a }), -2.9, -6.6, PI5);
  put(signPost(3, { sign: "curfew", ...a, h: 2.8 }), 6.75, 6.3, -H);
  put(signPost(4, { sign: "noentry", ...a }), -6.75, 15.2, H);
  for (const [x, z] of [[0.45, 8.9], [0.45, 11.3], [3, 8.9], [3, 11.3]]) put(crowdBarrier(Math.round(z), z > 10 ? { sign: "tape", ...a } : {}), x, z, H + (x > 1 ? 0.03 : -0.02));
  put(crowdBarrier(7, {}), 1.9, 13.2, 0.5, { rot: [H - 0.08, 0.5, 0], noCol: true, y: 0.06 });
  for (const [x, z] of [[-6.6, -19.5], [6.6, -19.5], [-6.6, 20], [6.6, 20], [6.6, -2.6], [6.6, -0.2]]) put(bollard(Math.round(z) + 30), x, z, 0);
  put(deconTent(1, a), -3.3, 9.6, 0);
  put(lightTower(1, { ...a, h: 7.4, lightCol: [0.8, 0.9, 1] }), -4.9, -8.9, 0.56);
  put(lightTower(2, { ...a, h: 7, lightCol: [1, 0.86, 0.66], col: [0.8, 0.8, 0.78] }), 4.95, 13.6, -2.58);
  put(fencePanel(11, { ...a, w: 2.4, razor: false, tarp: "white", sign: "triage" }), -0.95, 9.4, H);
  put(fencePanel(12, { ...a, w: 2.4, razor: false }), -0.95, 6.9, H);
  for (const [x, z, on, sg] of [[-6.75, -17, true, "curfew"], [-6.75, 2.6, false, null], [-6.75, 19, true, null], [6.75, -9.2, true, null], [6.75, 10.6, false, "quarantine"]]) put(streetLamp(Math.round(z) + 40, { ...a, on, sign: sg, power: 46 }), x, z, x < 0 ? 0 : PI5);
  for (const [x, z] of [[6.75, -31], [-6.75, -42], [-6.75, 31], [6.75, 42], [-6.75, 54]]) put(streetLamp(Math.round(z) + 40, { ...a, power: 46 }), x, z, x < 0 ? 0 : PI5, { noCol: true });
  put(trafficLight(1, { ...a, arm: 5.2 }), -6.8, -21, 0);
  put(cabinet(1, a), -8.1, -20.6, H);
  put(cabinet(2, a), 8.3, 21.6, -H);
  put(busShelter(1, { ...a, smash: true }), 7.75, 15.4, -H);
  put(hydrant(1), 6.75, -1.4, 0.4);
  put(hydrant(2), -6.8, 9.2, 2);
  put(bench(1), -8.2, -1.6, H);
  put(bench(2), 8.2, -14.6, -H);
  put(postBox(1, a), 6.95, 3.6, -H);
  put(dumpster(1, { ...a, col: [0.1, 0.24, 0.18] }), -15.4, -12.75, H);
  put(dumpster(2, { ...a, col: [0.12, 0.16, 0.3], graf: "grafSearch", open: 0.2 }), -15.4, 12.75, H);
  put(dumpster(3, { ...a, col: [0.3, 0.12, 0.1] }), 15.4, -4.75, -H);
  put(dumpster(4, { ...a, col: [0.1, 0.24, 0.18], graf: "grafTag" }), 8.35, 19.8, -H);
  put(wheelieBin(1, {}), -9, -4.8, H);
  put(wheelieBin(2, { open: 1.9 }), 9, 5.9, -H);
  put(wheelieBin(3, { fallen: true, open: 1.2 }), 5, -18.4, 0.8);
  put(wheelieBin(4, {}), -9, 13.9, H + 0.2);
  for (const [x, z, n] of [[-7, -10.7, 5], [7, -12.4, 4], [7.3, 0.9, 3], [-7, 14.9, 5], [-10.6, -12.2, 4], [10.7, -5.2, 5], [8.6, -21.2, 4]]) put(trashBags(Math.round(x + z) + 60, { n }), x, z, x * z);
  put(cartons(1, { n: 3 }), -8.7, 2.3, 0.3);
  put(cartons(2, { n: 3 }), 8.8, -17.2, 1.2);
  put(cartons(3, { n: 3 }), -8.6, 20.3, 2.2);
  put(manhole(1), 1.6, -12.6, 0.3);
  put(manhole(2), 2.1, 17.8, 1.1);
  for (const [x, z] of [[-5.72, -15.2], [5.72, -15.2], [-5.72, 7.8], [5.72, 7.8], [5.72, 18.6], [-5.72, -2.2]]) put(drain(1), x, z, H, { y: 4e-3 });
  put(crate(1, { ...a, w: 1, h: 0.7, d: 0.7 }), 5.15, 2.3, 0.1);
  put(crate(2, { ...a, w: 0.8, h: 0.5, d: 0.6 }), 5.1, 3.25, -0.2);
  put(crate(3, { ...a }), 5.1, 2.4, 0.5, { y: 0.74 });
  put(crate(4, { ...a, w: 1.1, h: 0.8, d: 0.8 }), -0.4, 5.4, 0.3);
  put(crate(5, a), -5.3, 13.6, 1.4);
  put(pallet(1, { stack: 4 }), 5, -6.2, 0.1);
  put(pallet(2, { stack: 1 }), 5.2, 5.6, 0.4);
  put(pallet(3, { stack: 2 }), -5.2, 0.6, 1.7);
  put(tyres(1, { n: 4 }), -5.25, -1.2, 0);
  put(tyres(2, { n: 3 }), 3.3, 19.2, 1);
  put(suitcase(1, {}), 1.55, 8.2, 0.4);
  put(suitcase(2, { lay: true, open: 2.2 }), 1.9, 10.8, 0);
  put(suitcase(3, { lay: true }), -0.2, 14.9, 0);
  put(suitcase(4, {}), 2.2, 12.3, 2.1);
  put(suitcase(5, { lay: true }), -3.4, -19.6, 0);
  put(duffel(1), 2.25, 6.6, 0.7);
  put(duffel(2), -1.9, -16.4, 2.2);
  put(duffel(3), 7.6, 13.6, 0.3);
  for (let i = 0; i < 6; i++) put(bodyBag(i + 1, { col: ["white", "white", "black", "yellow", "white", "black"][i] }), -7.75 + i % 2 * 0.12, 5.4 + i * 0.86, (i % 3 - 1) * 0.07 + (i === 4 ? 0.3 : 0));
  put(bodyBag(8, { col: "black" }), -1.55, 14.2, 1.3);
  put(bodyBag(9, { col: "white" }), -0.75, 15, 1.45);
  put(bodyBag(10, { col: "yellow" }), 7.6, -3.6, H);
  put(gurney(1, aw), -0.7, 13.2, 0.5);
  put(gurney(2, { ...aw, tipped: true }), 2.4, -13.3, 1.9);
  put(burnBarrel(1), 4.9, -14.6, 0);
  put(burnBarrel(2, { power: 12 }), -0.55, 19.7, 1);
  put(sedan(1, { ...a, col: [0.34, 0.05, 0.05], door: 1.05, smash: 1, graf: "grafSearch" }), -2.4, -15.4, 1.72);
  put(sedan(2, { ...a, kind: "patrol", smash: 2 }), 2.75, -8.9, -0.55);
  put(sedan(3, { ...a, kind: "taxi", hazard: true, door: 0.8, doorSide: -1 }), 4.25, 16.6, -H + 0.1);
  put(ambulance(1, a), -3.45, 17.2, -H + 0.04);
  put(bus(1, { ...a }), 1, 25.6, 0.12);
  put(sedan(4, { ...a, col: [0.12, 0.2, 0.34] }), -4.4, 29.5, H - 0.3);
  put(sedan(5, { ...a, col: [0.5, 0.5, 0.52], smash: 1 }), -3, -27.6, H + 0.15);
  put(sedan(6, { ...a, col: [0.1, 0.1, 0.11], lights: true }), 2.7, -31.5, H - 0.1);
  put(sedan(7, { ...a, col: [0.55, 0.5, 0.4], door: 0.9 }), -2.6, -36.5, H);
  put(sedan(8, { ...a, kind: "taxi" }), 3, -39, H + 0.2);
  put(proto("banner", () => {
    const P3 = new Prop("banner", 1), y = 6.6, bw2 = 7.4, bh = bw2 / A.aspect("checkpoint");
    for (const yy of [y + bh / 2 + 0.25, y - bh / 2 - 0.25]) P3.tube("rubber", catenary([wx + 0.1, yy + 0.5, 0], [ex - 0.1, yy + 0.5, 0], 0.5, 14), 0.012, { col: [0.2, 0.2, 0.2], seg: 5 });
    const g2 = gridSurf(Array.from({ length: 25 }, (_, i) => i / 24), [0, 0.25, 0.5, 0.75, 1], (u, vv, q) => {
      q.set((u - 0.5) * (bw2 + 0.3), y - 0.12 + (vv - 0.5) * (bh + 0.3) - 0.16 * Math.sin(u * PI5), 0.07 * Math.sin(u * 7 + vv * 2) * vv);
      return [0.8, 0.78, 0.7];
    });
    P3.add("canvas", g2, null, {});
    const sg = gridSurf(Array.from({ length: 25 }, (_, i) => i / 24), [0, 0.5, 1], (u, vv, q) => {
      q.set((u - 0.5) * bw2, y - 0.12 + (vv - 0.5) * bh - 0.16 * Math.sin(u * PI5), 0.07 * Math.sin(u * 7 + vv * 2) * vv + 0.012);
      return [1, 1, 1];
    });
    const r = A.rect("checkpoint"), uv = new Float32Array(sg.attributes.position.count * 2);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 25; i++) {
      uv[(j * 25 + i) * 2] = lerp2(r[0], r[2], i / 24);
      uv[(j * 25 + i) * 2 + 1] = lerp2(r[1], r[3], j / 2);
    }
    sg.setAttribute("uv", new BufferAttribute(uv, 2));
    P3.add("signFlat", sg, null, {});
    {
      const sb = gridSurf(Array.from({ length: 25 }, (_, i) => i / 24), [0, 0.5, 1], (u, vv, q) => {
        q.set(-(u - 0.5) * bw2, y - 0.12 + (vv - 0.5) * bh - 0.16 * Math.sin((1 - u) * PI5), 0.07 * Math.sin((1 - u) * 7 + vv * 2) * vv - 0.012);
        return [1, 1, 1];
      });
      const rb = A.rect("checkback"), ub = new Float32Array(sb.attributes.position.count * 2);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 25; i++) {
        ub[(j * 25 + i) * 2] = lerp2(rb[0], rb[2], i / 24);
        ub[(j * 25 + i) * 2 + 1] = lerp2(rb[1], rb[3], j / 2);
      }
      sb.setAttribute("uv", new BufferAttribute(ub, 2));
      P3.add("signFlat", sb, null, {});
    }
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) P3.add("galv", ring(0.022, 6e-3, { seg: 8 }), null, { p: [(i / 6 - 0.5) * (bw2 + 0.1), y - 0.12 + s * (bh / 2 + 0.08) - 0.16 * Math.sin(i / 6 * PI5), 0.02], r: [H, 0, 0] });
    for (const s of [-1, 1]) for (const t of [-1, 1]) P3.bar("rubber", [s * bw2 / 2, y - 0.12 + t * bh / 2, 0], [s * (bw2 / 2 + 0.5), y + t * (bh / 2 + 0.28) + 0.25, 0], 6e-3, { col: [0.8, 0.8, 0.7] });
    P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
    return P3.finish({ grime: 0.8, ground: 0 });
  }), 0, -6.4, 0, { y: 0, noCol: true });
  for (const [z, y, sag, bulbs] of [[-15.2, 7.6, 0.9, 5], [12.2, 6.9, 0.8, 0], [3.4, 8.8, 0.6, 0], [-20.6, 6.4, 0.5, 0]]) put(proto("cable" + z, () => {
    const P3 = new Prop("cable", 1), pts = catenary([wx + 0.05, y, 0], [ex - 0.05, y + 0.6, 0.8], sag, 16);
    P3.tube("rubber", pts, 0.011, { col: [0.15, 0.15, 0.15], seg: 5, samples: 0 });
    for (let i = 1; i <= bulbs; i++) {
      const p = pts[Math.round(i * 16 / (bulbs + 1))], lit = i % 3 !== 0;
      P3.bar("rubber", p, [p[0], p[1] - 0.22, p[2]], 5e-3, { col: [0.15, 0.15, 0.15] });
      P3.lathe(lit ? "lampWarm" : "glass", [[0, 0], [0.035, 0.03], [0.045, 0.07], [0.02, 0.11], [0, 0.12]], { seg: 8, p: [p[0], p[1] - 0.34, p[2]] });
      if (lit) P3.glow("flare", [p[0], p[1] - 0.28, p[2]], { col: [1, 0.6, 0.25], size: 0.7 });
    }
    if (bulbs) P3.glow("fill", [0, y - 1.3, 0.4], { col: [1, 0.6, 0.28], power: 12, dist: 10 });
    P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
    return P3.finish({ grime: 0, ground: 0 });
  }), 0, z, 0, { y: 0, noCol: true });
  for (const [n, x, z, w, r] of [["pool0", -7.6, 6.6, 1.3, 0.3], ["pool1", -1.2, 14.6, 1.5, 1.2], ["splat0", 2.2, -13, 1.2, 2], ["smear", 3.4, -12.2, 2.2, 0.6], ["splat2", -2.9, -14.2, 1, 1], ["boot", -2.4, -13, 0.3, 0.2], ["boot", -2.1, -12.5, 0.3, 0.5], ["boot", -1.9, -11.8, 0.3, 0.35], ["splat3", 0.6, 9.9, 1.1, 3], ["pool0", 7.6, -3.4, 1.2, 2], ["splat1", 5.4, 17.2, 1, 1], ["scorch", 4.9, -14.6, 2, 0], ["scorch", -1.4, 19.3, 1.9, 1], ["oil", 0.2, -18.2, 1.5, 0], ["oil", 4.5, 8.2, 1.3, 2], ["crack", -4.6, 6.2, 1.6, 0.4], ["crack", 3.1, -3.4, 1.8, 2.2], ["crack", -7.9, -6.2, 1.3, 1], ["crack", 8, 12.2, 1.4, 3], ["dust", 7.9, 5.2, 2, 0], ["tyre", -2.6, -19.2, 3.4, 1.5], ["splat0", -4.6, 20.2, 1.3, 0.5], ["smear", -4.9, 21.4, 2.4, 1.5], ["pool1", 3.2, -22.6, 1.4, 0]]) mark(n, x, z, w, n === "smear" ? w * 0.33 : n === "tyre" ? w * 0.19 : n === "boot" ? w * 2 : w, r);
  const bd = (p, x, z, yaw) => put(p, x, z, yaw, { y: 0, noCol: true, region: z < 0 ? 0 : 3 });
  bd(overpass(1, { ...a, len: 96, y: 10 }), 0, -52, 0);
  bd(tower(1, { ...aw, w: 18, d: 14, floors: 17, lit: 0.22, billboard: "posterShelter" }), -24, -72, 0.1);
  bd(tower(2, { ...aw, w: 15, d: 15, floors: 24, lit: 0.16 }), 4, -84, -0.05);
  bd(tower(3, { ...aw, w: 20, d: 13, floors: 13, lit: 0.26, billboard: "posterSymptoms", bbYaw: -0.2 }), 27, -68, -0.15);
  bd(tower(4, { ...aw, w: 14, d: 14, floors: 20, lit: 0.12 }), -42, -50, 0.4);
  bd(tower(5, { ...aw, w: 16, d: 14, floors: 15, lit: 0.2 }), 44, -44, -0.5);
  bd(tower(6, { ...aw, w: 16, d: 12, floors: 11, lit: 0.25 }), -30, -30, H);
  bd(tower(7, { ...aw, w: 14, d: 12, floors: 14, lit: 0.2 }), 31, -22, -H);
  bd(tower(8, { ...aw, w: 18, d: 14, floors: 18, lit: 0.18, billboard: "posterEvac", bbYaw: PI5 }), -8, 62, 0.1);
  bd(tower(9, { ...aw, w: 16, d: 14, floors: 12, lit: 0.24 }), 22, 54, -0.3);
  bd(tower(10, { ...aw, w: 15, d: 13, floors: 22, lit: 0.14 }), -34, 44, 0.5);
  bd(tower(11, { ...aw, w: 14, d: 12, floors: 10, lit: 0.22 }), 30, 12, -H);
  bd(tower(12, { ...aw, w: 16, d: 12, floors: 13, lit: 0.2 }), -30, 8, H);
  bd(tower(13, { ...aw, w: 15, d: 12, floors: 9, lit: 0.2 }), 31, 34, -H);
  bd(crane(1, { h: 64 }), 38, -78, 0.7);
  for (const [i, x, z, f3] of [[21, -16.2, -37, 5], [22, 16.2, -37, 4], [23, -16.2, 37, 4], [24, 16.2, 37, 6], [25, -16.6, -47.5, 7], [26, 16.6, -47.5, 5], [27, -16.4, 48, 6], [28, 16.4, 48, 5]]) bd(tower(i, { ...aw, w: 11, d: 12, floors: f3, lit: 0.25 }), x, z, x < 0 ? H : -H);
  const root = new Group();
  root.name = "arena";
  let meshes = 0, mtris = 0;
  mats.emit = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  for (const [key, arr] of chunks) {
    const [name, reg] = key.split("|"), mat = mats[name];
    if (!mat) throw new Error('arena: no material "' + name + '"');
    const g2 = merge(arr);
    g2.computeBoundingSphere();
    g2.computeBoundingBox();
    const me = new Mesh(g2, mat);
    me.name = key;
    me.castShadow = !NOCAST.test(name);
    me.receiveShadow = !EMIT.test(name) && name !== "emit";
    if (mat.transparent) me.renderOrder = name === "glassT" ? 4 : 2;
    me.matrixAutoUpdate = false;
    root.add(me);
    meshes++;
    mtris += triCount(g2);
    W.meshes.push(me);
  }
  R4.scene.add(root);
  chunks.clear();
  W.keys.slice(0, 2).forEach((k, i) => {
    const t = [k.p[0] + k.dir[0] * 14, k.p[1] + k.dir[1] * 14, k.p[2] + k.dir[2] * 14];
    R4.setKey(i, { pos: k.p, target: t, color: new Color(k.col[0], k.col[1], k.col[2]), intensity: i === 0 ? 3500 : 2700, angle: 0.74, penumbra: 0.6, size: 0.6 });
  });
  const pool = [];
  for (let i = 0; i < POOL; i++) {
    const L = new PointLight(16777215, 0, 10, 2);
    L.layers.enableAll();
    R4.scene.add(L);
    pool.push(L);
  }
  for (const L of W.lights) {
    L.pos = new Vector3(...L.p);
    L.color = new Color(L.col[0], L.col[1], L.col[2]);
    L.seed = Math.abs(Math.sin(L.p[0] * 12.9 + L.p[2] * 78.2)) * 43758 % 1;
  }
  const fl = W.flares, fg = new BufferGeometry(), fp = new Float32Array(fl.length * 3), fc = new Float32Array(fl.length * 3), fs = new Float32Array(fl.length * 2);
  fl.forEach((f3, i) => {
    fp.set(f3.p, i * 3);
    fc.set(f3.col, i * 3);
    fs[i * 2] = f3.size || 1;
    fs[i * 2 + 1] = f3.blink ? 1 : 0;
  });
  fg.setAttribute("position", new BufferAttribute(fp, 3));
  fg.setAttribute("color", new BufferAttribute(fc, 3));
  fg.setAttribute("fs", new BufferAttribute(fs, 2));
  fg.boundingSphere = new Sphere(new Vector3(), 400);
  const flareMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uScale: { value: 600 }, uTime: { value: 0 } },
    vertexShader: "attribute vec2 fs; varying vec3 vC; uniform float uScale, uTime; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = -mv.z; gl_PointSize = clamp(fs.x * uScale / d, 2.0, 220.0); float bl = mix(1.0, step(0.5, fract(uTime * 0.8 + position.x * 0.13)), fs.y); vC = color * bl * clamp(d / 3.0, 0.0, 1.0); }",
    fragmentShader: "varying vec3 vC; void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p); float a = exp(-r * r * 7.0) * 0.9 + exp(-r * 2.6) * 0.16 + exp(-abs(p.y) * 22.0) * exp(-abs(p.x) * 2.2) * 0.35; a *= smoothstep(1.0, 0.7, r); gl_FragColor = vec4(vC * a * 0.12, 1.0); }",
    vertexColors: true
  });
  const flares = new Points(fg, flareMat);
  flares.frustumCulled = false;
  flares.renderOrder = 6;
  R4.scene.add(flares);
  for (const n of ["emAmberB", "emRedB", "emBlueB", "emWhiteB"]) W.blink[n] = { mat: mats[n], base: mats[n].color.clone(), k: 1 };
  const order = W.lights.map((_, i) => i), size = new Vector2(), glowV = [];
  for (let i = 0; i < 4; i++) glowV.push({ pos: new Vector3(), col: new Vector3() });
  W.update = (dt, t, cam) => {
    const ph = t * 1.7 % 1;
    W.blink.emRedB.k = ph < 0.5 ? Math.floor(ph * 12) % 2 ? 1 : 0.25 : 0.02;
    W.blink.emBlueB.k = ph >= 0.5 ? Math.floor(ph * 12) % 2 ? 1 : 0.25 : 0.02;
    W.blink.emAmberB.k = t * 1.1 % 1 < 0.5 ? 1 : 0.03;
    W.blink.emWhiteB.k = t * 2.3 % 1 < 0.08 ? 1 : 0.02;
    for (const n in W.blink) {
      const b = W.blink[n];
      b.mat.color.copy(b.base).multiplyScalar(b.k);
    }
    for (const L of W.lights) {
      let k = 1;
      if (L.kind === "blink") k = W.blink[L.mat] ? W.blink[L.mat].k : 1;
      if (L.flicker) {
        const n = vnoise(t * (5 + L.flicker * 4) + L.seed * 50, L.seed * 9, 0.5);
        k *= L.flicker >= 2 ? 0.55 + 0.6 * n : n > 0.34 / Math.max(0.5, L.flicker) ? 1 : 0.12;
      }
      L.k = k;
      L.d2 = L.pos.distanceToSquared(cam);
    }
    order.sort((i, j) => W.lights[i].d2 - W.lights[j].d2);
    const lim = order.length > POOL ? Math.sqrt(W.lights[order[POOL]].d2) : 1e9;
    for (let i = 0; i < POOL; i++) {
      const P3 = pool[i], L = W.lights[order[i]];
      if (!L) {
        P3.intensity = 0;
        continue;
      }
      const dd = Math.sqrt(L.d2), fade = clamp2((lim - dd) / (lim * 0.2 + 0.01));
      P3.position.copy(L.pos);
      P3.color.copy(L.color);
      P3.distance = L.dist || 9;
      P3.intensity = (L.power || 6) * LIGHT_K * L.k * fade;
      if (i < 4) {
        glowV[i].pos.copy(L.pos);
        glowV[i].col.set(L.color.r, L.color.g, L.color.b).multiplyScalar(P3.intensity * 0.35);
      }
    }
    R4.glows.length = 0;
    for (let i = 0; i < Math.min(4, order.length); i++) R4.glows.push(glowV[i]);
    R4.renderer.getDrawingBufferSize(size);
    flareMat.uniforms.uScale.value = size.y * 0.5;
    flareMat.uniforms.uTime.value = t;
    ground.mat.userData.road.uGRain.value.y = t;
  };
  W.spawns = [{ p: [3, -26.5], w: 3 }, { p: [-0.5, -29.5], w: 2 }, { p: [4.6, -31], w: 2 }, { p: [-13.6, -12.75], w: 2 }, { p: [-13.6, 12.75], w: 2 }, { p: [13.6, -4.75], w: 2 }, { p: [-4.8, 23.4], w: 3 }, { p: [-6.4, 26], w: 2 }];
  W.pickups = [[0.2, -17.6], [-4.6, -1.9], [0.2, 1.6], [4.7, 9], [0.9, 18.6], [5.2, -12.2], [-7.9, -8.2], [7.9, 8.4], [-7.9, 3.6], [-2.4, -5.2], [2, 14.4], [7.9, -19.2], [-7.9, 17.4], [0, -8.8]];
  W.start = { p: [1.2, 16.2], yaw: 0 };
  W.ground = ground;
  W.root = root;
  W.pool = pool;
  W.flareMesh = flares;
  W.stats = { props: count, propTris: tris, meshes, tris: mtris + 2, lights: W.lights.length, flares: fl.length, colliders: W.colliders.length, top: Object.entries(byProp).sort((x, y) => y[1] - x[1]).slice(0, 14).map(([n, t]) => n + ":" + Math.round(t / 1e3) + "k").join(" ") };
  R4.setSky("night");
  R4.bakeEnvFromSky();
  G4.mats.setWet(1);
  return W;
}

