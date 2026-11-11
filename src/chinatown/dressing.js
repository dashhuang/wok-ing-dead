// Street dressing: lamp posts, lantern strings, power lines, abandoned cars, market spill-over,
// rubbish, the tenement courtyard and the alleys. Everything here is set dressing on top of
// the buildings and landmarks; collision is added for anything a body cannot pass through.
import * as THREE from "three";

export function dressStreets(ctx, PLAN, marks) {
  const { kit, signs, B, G } = ctx;
  const { rnd, pick } = kit;
  const K = PLAN.kerb;
  const M = B.M;
  const gp = ctx.gameProp;
  const green = kit.flat(0x1c3a2a, { rough: 0.5, metal: 0.35, wet: "metal", key: "lampgreen" });
  const gold = kit.flat(0xd9a93a, { rough: 0.32, metal: 0.9, wet: "glazed", key: "gold" });
  const lampGlass = kit.glow(0xffd29a, 2.6);
  const paper = kit.flat(0x8f897a, { rough: 0.95, wet: [0.35, 0.8, 0, 0], key: "paper" });

  // ---------- props requested by the building generator (balcony plants, meter boxes) ----------
  for (const d of ctx.dress) {
    if (d.wall) continue;
    kit.prop(d.id, d.pos[0], d.pos[1], d.pos[2], { yaw: d.yaw || 0, scale: d.scale || 1 });
  }

  // ---------- pagoda street lamps ----------
  const hex = new THREE.CylinderGeometry(0.25, 0.2, 0.5, 6);
  const cap = new THREE.CylinderGeometry(0.05, 0.46, 0.3, 6);
  function lamp(x, z, y = K) {
    kit.cyl(green, x, y, z, 0.2, 0.55, { seg: 8, rTop: 0.13 });
    kit.cyl(green, x, y + 0.55, z, 0.075, 3.25, { seg: 8 });
    for (const yy of [0.62, 1.5, 3.5]) kit.cyl(gold, x, y + yy, z, 0.09, 0.06, { seg: 8, open: true });
    kit.cyl(gold, x, y + 3.8, z, 0.3, 0.06, { seg: 6 });
    kit.add(lampGlass, hex, kit.xform(x, y + 4.11, z));
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 6;
      kit.rod(green, [x + Math.cos(a) * 0.2, y + 3.86, z + Math.sin(a) * 0.2], [x + Math.cos(a) * 0.25, y + 4.36, z + Math.sin(a) * 0.25], 0.014, { seg: 4 });
    }
    kit.add(green, cap, kit.xform(x, y + 4.5, z));
    kit.cyl(gold, x, y + 4.65, z, 0.03, 0.26, { seg: 6 });
    // upturned corner hooks, each with a tassel
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const px = x + Math.cos(a) * 0.46, pz = z + Math.sin(a) * 0.46;
      kit.rod(gold, [px, y + 4.36, pz], [x + Math.cos(a) * 0.56, y + 4.5, z + Math.sin(a) * 0.56], 0.012, { seg: 4 });
    }
    kit.solid(x - 0.16, y, z - 0.16, x + 0.16, y + 4.4, z + 0.16, "metal");
    ctx.emitters.push({ pos: [x, y + 3.75, z], color: 0xffc98a, power: 2.0, range: 12, flicker: rnd() < 0.12 ? 2 : 0 });
  }
  for (const x of [-22.5, -11.5, 12.5, 24, 34.5]) lamp(x, 1.55);
  for (const x of [-17, -6.5, 9.5, 18.5, 28.5]) lamp(x, 10.45);
  for (const z of [-24, -15.5, -7]) lamp(-1.45, z);
  for (const z of [-20, -4.2]) lamp(5.45, z);
  for (const z of [17.5, 26]) lamp(-1.45, z);
  for (const z of [15.6, 23.5]) lamp(5.45, z);
  lamp(-37.5, 16.3);
  lamp(-34, -4.2);

  // ---------- lanterns over the streets ----------
  // posts where there is no tall wall to tie a string to (temple side)
  function post(x, z, h) {
    kit.cyl(M.lacquer, x, K, z, 0.07, h, { seg: 8 });
    kit.cyl(gold, x, K + h, z, 0.11, 0.14, { seg: 8, rTop: 0.02 });
    kit.solid(x - 0.12, K, z - 0.12, x + 0.12, K + h, z + 0.12, "wood");
  }
  for (let x = -23.4; x < -3.5; x += 4.9) ctx.lanternString([x, 7.3, -0.95], [x + 0.6, 7.3, 12.95], 7, 1.0, 0.3, true);
  for (let x = 9.5; x < 31; x += 5.2) {
    post(x + 0.5, 12.6, 6.4);
    ctx.lanternString([x, 6.8, -0.9], [x + 0.5, 6.5 + K, 12.6], 7, 0.9, 0.3, true);
  }
  for (let z = -26; z < -3; z += 5.6) ctx.lanternString([-2.95, 6.4, z], [6.95, 5.0, z + 0.5], 5, 0.7, 0.26, z > -12);
  for (let z = 15.5; z < 29; z += 5.4) {
    post(6.55, z + 0.4, 5.2);
    ctx.lanternString([-2.95, 6.4, z], [6.55, 5.2 + K, z + 0.4], 5, 0.7, 0.26, false);
  }
  // pairs of small lanterns by the restaurant doors
  for (const [x, z] of [[-19.2, -1.25], [-15.3, -1.25], [-6.9, 13.25], [-3.6, 13.25]]) ctx.lantern(x, 3.5, z + (z < 6 ? 0.55 : -0.55), 0.24, 0.1);

  // ---------- power lines ----------
  const insul = kit.flat(0xd8d4c8, { rough: 0.3, wet: "glazed", key: "insul" });
  const drum = kit.flat(0x6a6f6c, { rough: 0.55, metal: 0.4, wet: "metal", key: "drum" });
  function pole(x, z, alongX = true, transformer = false) {
    const y = z > PLAN.road.z0 && z < PLAN.road.z1 ? 0 : K;
    kit.cyl(M.woodDark, x, y, z, 0.14, 9.6, { seg: 9, rTop: 0.1 });
    for (const yy of [8.9, 8.2]) {
      const a = alongX ? [x, y + yy, z - 0.95] : [x - 0.95, y + yy, z], b = alongX ? [x, y + yy, z + 0.95] : [x + 0.95, y + yy, z];
      kit.rod(M.woodDark, a, b, 0.055, { seg: 4, cast: true });
      for (const t of [0.08, 0.36, 0.64, 0.92]) kit.cyl(insul, a[0] + (b[0] - a[0]) * t, y + yy + 0.05, a[2] + (b[2] - a[2]) * t, 0.035, 0.12, { seg: 6 });
    }
    if (transformer) {
      kit.cyl(drum, x + (alongX ? 0 : 0.34), y + 6.6, z + (alongX ? 0.34 : 0), 0.26, 0.85, { seg: 12 });
      kit.rod(M.steel, [x, y + 7.1, z], [x + (alongX ? 0 : 0.34), y + 7.1, z + (alongX ? 0.34 : 0)], 0.03);
    }
    kit.solid(x - 0.15, y, z - 0.15, x + 0.15, y + 9.6, z + 0.15, "wood");
    return { x, y, z, alongX };
  }
  function span(a, b) {
    for (const yy of [8.95, 8.25])
      for (const t of [0.08, 0.64, 0.92]) {
        const off = (t - 0.5) * 1.9;
        const pa = a.alongX ? [a.x, a.y + yy, a.z + off] : [a.x + off, a.y + yy, a.z];
        const pb = b.alongX ? [b.x, b.y + yy, b.z + off] : [b.x + off, b.y + yy, b.z];
        kit.cable(M.acDark, pa, pb, 0.35 + rnd() * 0.35, 0.011, 10);
      }
    kit.cable(M.acDark, [a.x, a.y + 6.9, a.z], [b.x, b.y + 6.9, b.z], 0.7 + rnd() * 0.3, 0.02, 10);
  }
  const drop = (p, to) => kit.cable(M.acDark, [p.x, p.y + 7.6, p.z], to, 0.5 + rnd() * 0.4, 0.012, 8);
  const pm = [pole(-24.2, 1.2), pole(-10.4, 1.2, true, true), pole(8.2, 1.2), pole(21.6, 1.2, true, true), pole(33.4, 1.2)];
  for (let i = 0; i < pm.length - 1; i++) span(pm[i], pm[i + 1]);
  const pl = [pole(5.6, -26, false), pole(5.6, -11.5, false, true), pm[2], pole(-1.6, 14.2, false), pole(-1.6, 27.5, false, true)];
  for (let i = 0; i < pl.length - 1; i++) span(pl[i], pl[i + 1]);
  drop(pm[0], [-21, 6.6, -1]);
  drop(pm[0], [-22.5, 5.8, 13]);
  drop(pm[1], [-12, 7.2, -1]);
  drop(pm[1], [-9.5, 6.8, 13]);
  drop(pm[1], [-6, 6.2, -1]);
  drop(pm[3], [19, 5.4, -1]);
  drop(pm[4], [37, 7.5, -1]);
  drop(pm[4], [36, 7.2, 13]);
  drop(pl[1], [-3, 7.4, -9]);
  drop(pl[1], [-3, 6.6, -18]);
  drop(pl[3], [-3, 6.4, 17]);
  drop(pl[4], [-3, 6.2, 26]);

  // ---------- vehicles ----------
  const CAR = ["covered_car", "covered_car_wheel_01", "covered_car_wheel_02", "covered_car_wheel_03", "covered_car_wheel_04"];
  function car(x, z, yaw, tint) {
    const y = z > PLAN.road.z0 && z < PLAN.road.z1 || (x > PLAN.lane.x0 && x < PLAN.lane.x1) || x < PLAN.gateX ? 0 : K;
    kit.prop("covered_car", x, y, z, { parts: CAR, yaw, scale: 1.08, tint, gain: 1.9, wet: "plaster" });
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    // the model's long axis is z: two boxes approximate any heading without swallowing the corners
    const hx = (0.95 * c + 2.3 * s), hz = (0.95 * s + 2.3 * c);
    const k = Math.abs(Math.sin(2 * yaw)) > 0.3 ? 0.78 : 1;
    kit.solid(x - hx * k, y, z - hz * k, x + hx * k, y + 1.35, z + hz * k, "metal");
  }
  car(-18.5, 3.0, Math.PI / 2 + 0.03, 0xb8c0c4);
  car(-13.2, 9.05, -Math.PI / 2 - 0.05, 0x8a9a9a);
  car(-5.8, 6.9, 0.62, 0xc9b8a0); // slewed across the crossroads
  car(14.4, 9.0, Math.PI / 2, 0x9aa6b0);
  car(25.2, 3.05, Math.PI / 2 - 0.04, 0xb0a898);
  car(3.9, -12.5, 0.04, 0xa8b0b4);
  car(0.2, -21.5, Math.PI + 0.05, 0xc0c4c0);
  car(3.85, 22.6, -0.05, 0x98a0a8);
  car(-36.8, 1.4, 0.4, 0xb4b8b0);

  // ---------- street furniture ----------
  const HYD = ["fire_hydrant", "fire_hydrant_cap_01", "fire_hydrant_cap_02", "fire_hydrant_cap_03", "fire_hydrant_chain"];
  const CAN = ["metal_trash_can_rust", "metal_trash_can_rust_handle_left", "metal_trash_can_rust_handle_right"];
  const hydrant = (x, z) => {
    kit.prop("fire_hydrant", x, K, z, { parts: HYD, yaw: rnd() * 6, scale: 1.1 });
    kit.solid(x - 0.17, K, z - 0.17, x + 0.17, K + 0.85, z + 0.17, "metal");
  };
  const bin = (x, z, y = K) => {
    kit.prop("metal_trash_can", x, y, z, { parts: CAN, yaw: rnd() * 6 });
    kit.solid(x - 0.27, y, z - 0.27, x + 0.27, y + 0.9, z + 0.27, "metal");
  };
  const bags = (x, z, n = 3, y = K) => {
    for (let i = 0; i < n; i++) kit.prop("trashbag", x + (rnd() - 0.5) * 0.9, y, z + (rnd() - 0.5) * 0.7, { yaw: rnd() * 6, scale: 0.9 + rnd() * 0.5, wet: "glazed" });
  };
  const crates = (x, z, n = 3, y = K) => {
    let h = y;
    for (let i = 0; i < n; i++) {
      const id = "plastic_crate_02";
      kit.prop(id, x + (rnd() - 0.5) * 0.08, h, z + (rnd() - 0.5) * 0.08, { yaw: (rnd() - 0.5) * 0.4, scale: 1.2 });
      h += 0.3;
    }
    kit.solid(x - 0.3, y, z - 0.26, x + 0.3, h, z + 0.26, "wood");
  };
  const boxes = (x, z, n = 2, y = K) => {
    for (let i = 0; i < n; i++) kit.prop("cardboard_box_01", x + (rnd() - 0.5) * 0.7, y, z + (rnd() - 0.5) * 0.6, { yaw: rnd() * 6, scale: 1 + rnd() * 0.4, wet: "plaster" });
  };
  // loose paper blown along the gutters
  const litter = (x, z, n = 5, spread = 1.6, y = 0.006) => {
    for (let i = 0; i < n; i++) {
      const px = x + (rnd() - 0.5) * spread, pz = z + (rnd() - 0.5) * spread, a = rnd() * 6.28, w = 0.07 + rnd() * 0.05, h = 0.1 + rnd() * 0.06;
      const c = Math.cos(a), s = Math.sin(a);
      kit.quad(paper, [px - c * w + s * h, y, pz - s * w - c * h], [px - c * w - s * h, y, pz - s * w + c * h], [px + c * w - s * h, y, pz + s * w + c * h], [px + c * w + s * h, y, pz + s * w - c * h]);
    }
  };
  hydrant(-16.2, 1.5);
  hydrant(16, 10.5);
  hydrant(-1.5, -10.5);
  bin(-20.6, 1.55);
  bin(-3.6, 10.6);
  bin(10.6, 1.5);
  bin(26.5, 10.5);
  bin(5.5, 19.2);
  bags(-9.4, 1.4, 4);
  bags(-24.6, 10.6, 3);
  bags(13.6, 10.6, 3);
  bags(30, 1.2, 4);
  bags(-1.6, -18.5, 3);
  bags(5.6, 25, 4);
  for (const [x, z, n] of [[-24, 5, 7], [-14, 2.3, 8], [-8, 9.7, 8], [3, 6, 9], [12, 2.3, 7], [20, 9.7, 8], [28, 5.5, 7], [1.5, -14, 7], [3, 21, 7], [-33, 9, 9]]) litter(x, z, n, 3.2);
  kit.prop("utility_box_02", -13.2, K, -0.72, { yaw: 0, collide: true });
  kit.prop("utility_box_01", 8.0, K, 12.72, { yaw: Math.PI, collide: true });
  kit.prop("utility_box_01", -2.72, K, -22, { yaw: Math.PI / 2, collide: true });
  kit.prop("standing_chalkboard_01", -17.6, K, 0.5, { yaw: 0.25, collide: 1.0 });
  kit.prop("standing_chalkboard_01", -5.4, K, 11.3, { yaw: Math.PI - 0.3, collide: 1.0 });
  kit.prop("painted_wooden_bench", -11.6, K, 12.5, { yaw: Math.PI, collide: 0.5 });
  kit.prop("painted_wooden_bench", 27.2, K, -0.5, { yaw: 0, collide: 0.5 });
  // produce and crates spilling out of the shops
  crates(-24.6, -0.3, 3);
  crates(-23.9, -0.35, 2);
  crates(-21.4, 12.4, 3);
  crates(-13.4, -0.4, 2);
  boxes(-7.6, -0.3, 3);
  boxes(-19.6, 12.3, 2);
  kit.prop("wicker_basket_01", -24.3, K + 0.9, -0.3, { scale: 1.3 });
  kit.prop("bananas", -24.3, K + 0.94, -0.3, { scale: 1.6, yaw: 1 });
  // a noodle cart and street seating outside the restaurants
  kit.prop("CoffeeCart_01", -8.6, K, 11.2, { parts: ["CoffeeCart_01_cart", "CoffeeCart_01_mugs"], yaw: Math.PI, collide: 1.0 });
  kit.prop("propane_tank", -9.7, K, 11.5, { yaw: 1 });
  kit.prop("pot_enamel_01", -8.6, K + 1.06, 11.15, { scale: 1.6 });
  ctx.emitters.push({ pos: [-8.6, K + 1.9, 10.6], color: 0xffc27a, power: 0.9, range: 5 });
  for (const [tx, tz] of [[-17.2, 1.1], [-5.2, 0.9]]) {
    kit.prop("round_wooden_table_01", tx, K, tz, { scale: 0.72, collide: 0.72 });
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + rnd();
      kit.prop(i === 1 ? "plastic_monobloc_chair_01" : "metal_stool_02", tx + Math.cos(a) * 0.85, K, tz + Math.sin(a) * 0.62, { yaw: -a + Math.PI / 2, roll: i === 2 ? 1.45 : 0 });
    }
    kit.prop("tea_set_01", tx, K + 0.72, tz, { scale: 1.1, parts: ["tea_set_01_teapot_01", "tea_set_01_teapot_01_lid", "tea_set_01_cup_small_01", "tea_set_01_cup_small_02", "tea_set_01_plate_large_circular_03"] });
  }
  for (const [x, z] of [[-19.9, -0.6], [-14.9, -0.6], [-7.1, 12.6], [-3.4, 12.6]]) kit.prop("potted_plant_02", x, K, z, { yaw: rnd() * 6, scale: 1.4 });
  kit.prop("hand_truck", 9.4, K, 0.2, { yaw: 2.4, collide: 1.2 });
  kit.prop("wheelchair_01", -2.2, K, 11.8, { yaw: 1.1, roll: 0, collide: true });
  kit.prop("boombox", -11.6, K + 0.47, 12.5, { yaw: Math.PI });
  for (const [x, z, s, k] of [[-21, 6.2, 2.4, "smear"], [-9.8, 4.4, 1.8, "pool"], [-2.4, 8.2, 2.2, "smear"], [9.2, 5.2, 2.0, "pool"], [17.5, 7.4, 2.6, "smear"], [2.4, -9.5, 1.8, "pool"], [1.6, 17.8, 2.2, "smear"], [-31.5, 4.5, 2.0, "pool"]]) ctx.blood(x, 0.004, z, s, k);
  for (const [x, z, s, k] of [[-12, 0.6, 1.4, "pool"], [-6.2, 11.6, 1.5, "smear"], [22.5, 0.8, 1.6, "pool"]]) ctx.blood(x, K + 0.004, z, s, k);

  // ---------- gate plaza ----------
  gp("guard_booth", -37.2, 0, 12.6, Math.PI / 2, { seed: 5 });
  ctx.emitters.push({ pos: [-36.2, 2.2, 12.6], color: 0xdfeaff, power: 1.2, range: 7 });
  for (const [x, z] of [[-30.6, 2.9], [-30.6, 9.1], [-28.4, 2.6], [-28.4, 9.4]]) gp("traffic_cone", x, 0, z, rnd() * 6, {}, { collide: false });
  gp("sandbags", -31.4, 0, 12.2, 0.2, { seed: 4 });
  gp("sandbags", -31.2, 0, -0.4, -0.15, { seed: 8 });
  gp("jersey_barrier", -34.6, 0, 13.4, 0.05, { seed: 2 });
  gp("tarp_cargo", -37.4, 0, 7.6, 1.5, { seed: 3 });
  kit.prop("old_military_crate", -35.6, 0, 8.9, { parts: ["old_military_crate_a", "old_military_crate_lid_a", "old_military_crate_latch_a", "old_military_crate_loop_a"], yaw: 0.5, scale: 1.4, collide: true });
  kit.prop("ammo_box", -35.2, 0.38, 8.8, { yaw: 1.1, scale: 1.3 });
  kit.prop("portable_searchlight", -35.9, 0.38, 9.1, { yaw: -0.6, scale: 1.4 });
  boxes(-33, 14.4, 3, 0);
  bags(-38.6, -2.6, 4, 0);
  // bus shelter with a lit notice
  const sx0 = -38.2, sx1 = -34.2, sz = -5.6;
  for (const x of [sx0, sx1]) kit.box(M.steel, x - 0.05, K, sz - 0.05, x + 0.05, K + 2.5, sz + 0.05, { skip: "b" });
  kit.box(M.steel, sx0 - 0.2, K + 2.5, sz - 0.2, sx1 + 0.2, K + 2.58, sz + 1.3, { skip: "" });
  kit.box(M.glassClear, sx0, K + 0.5, sz - 0.02, sx1 - 1.5, K + 2.4, sz + 0.02, { skip: "" });
  const ad = signs.neon({ text: "緊急疏散", sub: "EVACUATE · FOLLOW THE SIRENS", w: 1.3, h: 1.8, style: "box", vertical: false, color: "#a01414", face: "#f4f7ff" });
  kit.box(M.steel, sx1 - 1.45, K + 0.45, sz - 0.07, sx1 - 0.05, K + 2.4, sz + 0.07, { skip: "" });
  kit.quad(signs.mats.neon, [sx1 - 1.4, K + 0.55, sz + 0.075], [sx1 - 0.1, K + 0.55, sz + 0.075], [sx1 - 0.1, K + 2.35, sz + 0.075], [sx1 - 1.4, K + 2.35, sz + 0.075], [ad.uv[0], ad.uv[1], ad.uv[2], ad.uv[1], ad.uv[2], ad.uv[3], ad.uv[0], ad.uv[3]]);
  kit.prop("painted_wooden_bench", -36.8, K, sz + 0.45, { yaw: 0, collide: 0.5, scale: 1.3 });
  kit.solid(sx0 - 0.1, K, sz - 0.1, sx1 + 0.1, K + 2.6, sz + 0.1, "metal");
  ctx.emitters.push({ pos: [sx1 - 0.75, K + 1.5, sz + 0.9], color: 0xe8f0ff, power: 1.5, range: 8, flicker: 1 });

  // ---------- back alleys ----------
  const dumpster = (x, z, yaw) => gp("dumpster", x, 0, z, yaw, { seed: Math.floor(rnd() * 99) });
  dumpster(-23.5, -14.3, 0);
  dumpster(-11.2, -11.75, Math.PI);
  dumpster(-16.5, -20.2, 0);
  dumpster(33.9, -6.5, Math.PI / 2);
  dumpster(34.3, -22.6, -Math.PI / 2);
  dumpster(-24.8, 26.6, 0);
  gp("pallet_stack", -27.4, 0, -9.4, 0.2, { seed: 3 });
  gp("pallet_stack", 34, 0, -13.5, 1.5, { seed: 5 });
  gp("crate_wood", -14.6, 0, -16.2, 0.3, { seed: 2 });
  gp("crate_wood", -19, 0, -19.6, 1.2, { seed: 6 });
  gp("cardboard_boxes", -6.4, 0, -14.2, 0.4, { seed: 2 });
  gp("cardboard_boxes", 32, 0, -3.2, 2, { seed: 9 });
  gp("tire_stack", -29.2, 0, -14.2, 0, { seed: 1 });
  gp("barrel", -8.4, 0, -11.6, 0, { color: "blue", seed: 3 });
  gp("barrel", 34.5, 0, -20.6, 0, { color: "blue", seed: 5 });
  bags(-20.5, -11.6, 4, 0);
  bags(-4.6, -14.4, 3, 0);
  bags(-29.4, -7.6, 3, 0);
  bags(31.8, -10.4, 4, 0);
  bags(34.3, -24.3, 4, 0);
  bags(-13.9, 18.4, 3, 0);
  litter(-16, -13, 12, 9);
  litter(33, -12, 12, 9);
  kit.prop("wooden_ladder", -25.4, 0, -12.4, { yaw: 0.2, pitch: 0, collide: false });
  // bare bulbs strung down the alleys
  const bulbString = (a, b, n) => {
    kit.cable(M.acDark, a, b, 0.35, 0.008, 12);
    for (let i = 0; i < n; i++) {
      const p = kit.cablePoint(a, b, 0.35, (i + 0.5) / n);
      const dead = rnd() < 0.3;
      kit.add(dead ? M.acDark : M.bulb, new THREE.SphereGeometry(0.045, 7, 5), kit.xform(p[0], p[1] - 0.07, p[2]));
      if (!dead && i % 2 === 0) ctx.emitters.push({ pos: [p[0], p[1] - 0.3, p[2]], color: 0xffb060, power: 0.9, range: 6.5, flicker: rnd() < 0.4 ? 2 : 0 });
    }
  };
  bulbString([-27, 3.6, -13], [-5, 3.4, -13.2], 9);
  bulbString([-28, 3.4, -14.5], [-28, 3.4, -6.5], 4);
  bulbString([33, 3.6, -24], [33, 3.4, -2], 8);
  bulbString([-14, 3.3, 13.5], [-14, 3.3, 21], 4);

  // ---------- tenement courtyard ----------
  const cy0 = 21, cy1 = 27.5;
  for (const x of [-23.5, -17.5, -11, -8]) {
    const a = [x, 4.6 + rnd() * 2, cy0 + 0.02], b = [x + (rnd() - 0.5), 4.4 + rnd() * 2, cy1 - 0.02];
    kit.cable(M.galv, a, b, 0.3, 0.007, 8);
    for (let i = 0; i < 6; i++) {
      if (rnd() < 0.3) continue;
      const p = kit.cablePoint(a, b, 0.3, 0.12 + i * 0.14);
      const w = 0.3 + rnd() * 0.3, h = 0.5 + rnd() * 0.5;
      kit.quad(M.cloth(pick([0xd9d4c6, 0x8a2a2a, 0x2f4a6a, 0xb9b9b9])), [p[0], p[1] - h, p[2] - w / 2], [p[0], p[1] - h, p[2] + w / 2], [p[0] + (rnd() - 0.5) * 0.1, p[1], p[2] + w / 2], [p[0], p[1], p[2] - w / 2]);
    }
  }
  kit.prop("round_wooden_table_01", -18.6, 0, 24.2, { scale: 0.75, collide: 0.74 });
  for (let i = 0; i < 4; i++) kit.prop("folding_wooden_stool", -18.6 + Math.cos(i * 1.57 + 0.4) * 0.95, 0, 24.2 + Math.sin(i * 1.57 + 0.4) * 0.95, { yaw: rnd() * 6, roll: i === 3 ? 1.5 : 0 });
  kit.prop("chinese_tea_table", -9.6, 0, 25.6, { yaw: 0.3, collide: true });
  kit.prop("chinese_stool", -10.6, 0, 25.2, { yaw: 1 });
  kit.prop("tea_set_01", -9.6, 0.5, 25.6, { scale: 1.1 });
  kit.prop("chinese_armchair", -8.2, 0, 26.4, { yaw: -2.4, collide: 0.8 });
  for (const [x, z] of [[-25.2, 22], [-21.6, 26.8], [-12.4, 21.6], [-7, 22.2], [-15.2, 26.9]]) kit.prop(rnd() < 0.25 ? "potted_plant_01" : "potted_plant_02", x, 0, z, { yaw: rnd() * 6, scale: 1.3 + rnd() * 0.5 });
  kit.prop("television_02", -22.6, 0, 22, { yaw: 0.6, roll: 0.3 });
  kit.prop("plastic_container", -13.5, 0, 26.6, { yaw: 0.2, collide: true });
  bulbString([-25, 3.4, 24], [-7, 3.5, 24.6], 8);
  ctx.blood(-16, 0.004, 23, 2.2, "smear");
  // small shrine in the yard wall: red box, two candles, a glow
  kit.box(M.lacquer, -20.6, 0.9, 27.3, -19.6, 1.9, 27.5, { skip: "" });
  kit.box(kit.glow(0xff7a30, 2.2), -20.45, 1.05, 27.28, -19.75, 1.7, 27.3, { skip: "" });
  ctx.emitters.push({ pos: [-20.1, 1.4, 26.6], color: 0xff7030, power: 0.9, range: 5.5, flicker: 2 });

  ctx.finalizeLanterns();
  ctx.finalizeGameProps();
}
