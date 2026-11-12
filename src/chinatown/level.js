// Chinatown: a rain-soaked crossroads district. Golden Dragon Street runs west-east from the
// paifang gate to the quarantine checkpoint; Fook Sau Lane crosses it. North-east is the wet
// market hall, south-east the temple compound, with alleys and a tenement courtyard behind.
// Returns the same interface the game expects from its level module.
import * as THREE from "three";
import { createKit, SURFACES } from "./kit.js";
import { createSigns, SHOPS } from "./signs.js";
import { EGG_SHOPS, TAPTAP_BLADE, MENUS, POSTERS } from "./eggs.js";
import { createBuilder } from "./buildings.js";
import { buildLandmarks } from "./landmarks.js";
import { dressStreets } from "./dressing.js";
import { createLights } from "./lights.js";
import { placeSupplies } from "./supplies.js";

const PROP_IDS = [
  "CoffeeCart_01",
  "WetFloorSign_01",
  "ammo_box",
  "antique_ceramic_vase_01",
  "bananas",
  "boombox",
  "brass_pot_01",
  "cardboard_box_01",
  "chinese_armchair",
  "chinese_chandelier",
  "chinese_stool",
  "chinese_tea_table",
  "covered_car",
  "fire_hydrant",
  "folding_wooden_stool",
  "food_pears_asian_01",
  "hand_truck",
  "medical_box",
  "metal_stool_02",
  "metal_trash_can",
  "old_military_crate",
  "painted_wooden_bench",
  "planter_box_01",
  "plastic_container",
  "plastic_crate_02",
  "plastic_monobloc_chair_01",
  "portable_generator",
  "portable_searchlight",
  "pot_enamel_01",
  "potted_plant_01",
  "potted_plant_02",
  "propane_tank",
  "round_wooden_table_01",
  "standing_chalkboard_01",
  "tea_set_01",
  "television_02",
  "trashbag",
  "utility_box_01",
  "utility_box_02",
  "wheelchair_01",
  "wicker_basket_01",
  "wooden_ladder",
];

// Street geometry shared with the other modules.
export const PLAN = {
  road: { z0: 2, z1: 10 }, // Golden Dragon Street carriageway
  walkN: -1, // building line, north side
  walkS: 13, // building line, south side
  lane: { x0: -1, x1: 5 }, // Fook Sau Lane carriageway
  laneW: -3,
  laneE: 7,
  gateX: -26,
  kerb: 0.15,
  market: { x0: 7, z0: -25, x1: 31, z1: -1, eave: 5.2, ridge: 7.8 },
  temple: { x0: 7, z0: 13, x1: 34, z1: 30 },
};

export async function createLevel(G) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const root = new THREE.Group();
  root.name = "level";
  G.scene.add(root);

  const kit = await createKit(G);
  const [signs] = await Promise.all([
    createSigns(kit),
    kit.loadSurfaces(Object.keys(SURFACES)),
    kit.loadProps(PROP_IDS),
  ]);
  const ctx = {
    G,
    kit,
    signs,
    root,
    emitters: [], // local light sources: { pos, color, power, range, flicker }
    glints: [],
    doors: [], // dark doorways the dead can walk out of
    dress: [], // props requested by generators, placed once everything else stands
    updaters: [],
    spawns: [],
    decal(name) {
      try {
        const d = G.mats.decal(name);
        return d && d.material ? d : null;
      } catch {
        return null;
      }
    },
  };
  const B = createBuilder(kit, signs, ctx);
  ctx.B = B;
  const { rnd, pick } = kit;
  const K = PLAN.kerb;

  // ---------------- pavements ----------------
  const pavers = kit.pbr("pavers", { macro: [0.16, 0.1, 0.35, 0.6] });
  const kerbMat = kit.pbr("granite", {
    color: 0x9a968c,
    key: "kerb",
    macro: [0.1, 0.08, 0.8, 0.4],
  });
  function pavement(x0, z0, x1, z1, edges = "") {
    kit.box(pavers, x0, 0, z0, x1, K, z1, { skip: "b" });
    kit.solid(x0, -0.2, z0, x1, K, z1, "concrete");
    const t = 0.16;
    // granite kerb stones on the sides that meet a carriageway
    if (edges.includes("n"))
      kit.box(kerbMat, x0, 0, z0 - t, x1, K + 0.012, z0 + 0.02, {
        skip: "b",
        cast: false,
      });
    if (edges.includes("s"))
      kit.box(kerbMat, x0, 0, z1 - 0.02, x1, K + 0.012, z1 + t, {
        skip: "b",
        cast: false,
      });
    if (edges.includes("w"))
      kit.box(kerbMat, x0 - t, 0, z0, x0 + 0.02, K + 0.012, z1, {
        skip: "b",
        cast: false,
      });
    if (edges.includes("e"))
      kit.box(kerbMat, x1 - 0.02, 0, z0, x1 + t, K + 0.012, z1, {
        skip: "b",
        cast: false,
      });
  }
  const R = PLAN.road,
    L = PLAN.lane;
  pavement(PLAN.gateX, PLAN.walkN, L.x0, R.z0, "se"); // north-west
  pavement(PLAN.laneW, -30, L.x0, PLAN.walkN, "e");
  pavement(L.x1, PLAN.walkN, 40, R.z0, "sw"); // north-east
  pavement(L.x1, -30, PLAN.laneE, PLAN.walkN, "w");
  pavement(PLAN.gateX, R.z1, L.x0, PLAN.walkS, "ne"); // south-west
  pavement(PLAN.laneW, PLAN.walkS, L.x0, 30, "e");
  pavement(L.x1, R.z1, 40, PLAN.walkS, "nw"); // south-east
  pavement(L.x1, PLAN.walkS, PLAN.laneE, 30, "w");
  // gate plaza edges
  pavement(-40, -6, -30, -3.5, "s");
  pavement(-40, 15.5, -26, 18, "n");

  // ---------------- blocks ----------------
  const shop = (i) => SHOPS[i % SHOPS.length];
  const U = (type, i, o = {}) => ({ type, shop: shop(i), ...o });
  const RED = 0x8a1f1a,
    GRN = 0x1f5a3c,
    BLU = 0x1f3f7a,
    GLD = 0xc9a13a;

  // Row A — north side of the street, gate to crossroads
  B.building({
    x0: -26,
    z0: -11,
    x1: -20,
    z1: -1,
    floors: 4,
    skin: "brickRed",
    faces: { s: "street", w: "street", n: "alley" },
    units: {
      s: [
        U("glass", 4, {
          interior: "herbs",
          sign: "box",
          blade: "box",
          doorLeft: true,
        }),
        U("door", 0, { w: 0.45 }),
      ],
      w: [
        U("shutter", 15, { sign: "board", blade: true, color: "#35f0c8" }),
        U("half", 9, {
          interior: "grocery",
          sign: "board",
          awning: GRN,
          shop: EGG_SHOPS.cindy, // easter egg
          posters: POSTERS.cindy,
        }),
        U("dark", 0, { w: 0.6 }),
      ],
    },
    fireEscape: { s: 3.6 },
  });
  B.building({
    x0: -20,
    z0: -11,
    x1: -14.5,
    z1: -1,
    floors: 3,
    gH: 4.2,
    fH: 3.3,
    skin: "plasterCream",
    style: "chinese",
    faces: { s: "street", n: "alley" },
    units: {
      s: [
        U("glass", 1, {
          interior: "diner",
          sign: "neon",
          blade: "big",
          color: "#ff2a4f",
          bladeH: 5.2,
          w: 1,
          shop: EGG_SHOPS.xd, // easter egg
          menu: MENUS.xdWindow,
        }),
      ],
    },
    balconies: { s: [1, 2] },
    eave: { sides: "s", depth: 1.5, rise: 0.7 },
    bayW: 2.75,
    winW: 1.5,
    winH: 2.0,
    litChance: 0.8,
  });
  B.building({
    x0: -14.5,
    z0: -11,
    x1: -9,
    z1: -1,
    floors: 5,
    fH: 2.95,
    skin: "tileWhite",
    faces: { s: "street", n: "alley" },
    units: {
      s: [
        U("half", 3, {
          interior: "bbq",
          sign: "box",
          awning: RED,
          blade: true,
          color: "#ff7a1a",
        }),
        U("door", 0, { w: 0.5 }),
      ],
    },
    bayW: 1.85,
    winW: 1.05,
    winH: 1.35,
  });
  B.building({
    x0: -9,
    z0: -11,
    x1: -3,
    z1: -1,
    floors: 4,
    skin: "brickOrange",
    faces: { s: "street", e: "street", n: "alley" },
    units: {
      s: [
        U("glass", 5, {
          interior: "tea",
          sign: "neon",
          blade: "pawn",
          color: "#ff2a4f",
          bladeUp: 0.6,
          bladeH: 3.0,
          bladeAt: 5.5,
        }),
        U("shutter", 14, { sign: "board", w: 0.7 }),
      ],
      e: [
        U("shutter", 7, { sign: "box", blade: true, color: "#3aa8ff" }),
        U("glass", 16, { interior: "herbs", sign: "board", awning: GLD }),
        U("dark", 0, { w: 0.55 }),
      ],
    },
    fireEscape: { e: 6.8 },
  });
  // north of the back alley
  B.building({
    x0: -40,
    z0: -30,
    x1: -30,
    z1: -6,
    floors: 6,
    fH: 3.0,
    skin: "plasterYellow",
    faces: { s: "street", e: "alley" },
    units: {
      s: [
        U("glass", 10, {
          interior: "tea",
          sign: "neon",
          blade: "big",
          color: "#ffd23a",
          bladeH: 6,
          w: 1.2,
        }),
        U("shutter", 13, { sign: "board" }),
      ],
    },
    roof: "tank",
  });
  B.building({
    x0: -30,
    z0: -30,
    x1: -20,
    z1: -15,
    floors: 4,
    skin: "brickWhite",
    faces: { s: "alley", e: "alley" },
  });
  B.building({
    x0: -20,
    z0: -30,
    x1: -13,
    z1: -21,
    floors: 5,
    skin: "concrete",
    faces: { s: "alley" },
  });
  B.building({
    x0: -13,
    z0: -30,
    x1: -3,
    z1: -15,
    floors: 5,
    skin: "plasterBlue",
    faces: { s: "alley", e: "street", w: "alley" },
    units: {
      e: [
        U("shutter", 12, { sign: "board", blade: true, color: "#35f0c8" }),
        U("half", 17, { interior: "diner", sign: "box", awning: BLU }),
        U("glass", 18, { interior: "diner", sign: "neon", blade: "box" }),
        U("door", 0, { w: 0.4 }),
      ],
    },
    fireEscape: { e: 11.5 },
  });

  // Row B — south side of the street
  B.building({
    x0: -26,
    z0: 13,
    x1: -21,
    z1: 21,
    floors: 3,
    skin: "plasterGreen",
    faces: { n: "street", w: "street", s: "alley" },
    units: {
      n: [
        U("glass", 6, {
          interior: "grocery",
          sign: "board",
          awning: GLD,
          blade: true,
          color: "#ffd23a",
        }),
      ],
      w: [U("shutter", 8, { sign: "box" }), U("door", 0, { w: 0.5 })],
    },
    balconies: { n: [1] },
  });
  B.building({
    x0: -21,
    z0: 13,
    x1: -15.5,
    z1: 21,
    floors: 4,
    skin: "brickTeal",
    faces: { n: "street", e: "alley", s: "alley" },
    units: {
      n: [
        U("half", 2, {
          interior: "diner",
          sign: "neon",
          blade: true,
          color: "#ff4fd8",
          awning: RED,
        }),
        U("door", 0, { w: 0.45 }),
      ],
    },
    fireEscape: { n: 2.4 },
  });
  B.building({
    x0: -12.5,
    z0: 13,
    x1: -7.5,
    z1: 21,
    floors: 5,
    fH: 2.95,
    skin: "tileRose",
    faces: { n: "street", w: "alley", s: "alley" },
    units: {
      n: [
        U("shutter", 11, {
          sign: "neon",
          blade: "box",
          shop: EGG_SHOPS.taptap, // easter egg
          bladeText: "遊戲機",
          bladeLook: TAPTAP_BLADE,
          posters: POSTERS.taptap,
        }),
        U("dark", 0, { w: 0.6 }),
      ],
    },
    bayW: 1.7,
    winW: 1.0,
    winH: 1.35,
  });
  B.building({
    x0: -7.5,
    z0: 13,
    x1: -3,
    z1: 21,
    floors: 3,
    gH: 4.2,
    fH: 3.3,
    skin: "brickRed",
    style: "chinese",
    faces: { n: "street", e: "street", s: "alley" },
    units: {
      n: [
        U("glass", 0, {
          interior: "diner",
          sign: "neon",
          blade: "big",
          color: "#ffd23a",
          bladeH: 5.0,
        }),
      ],
      e: [
        U("glass", 0, { interior: "diner", sign: "board", doorLeft: true }),
        U("half", 19, { interior: "tea", sign: "box", awning: GRN }),
      ],
    },
    balconies: { n: [1, 2], e: [1] },
    eave: { sides: "ne", depth: 1.4, rise: 0.7, tile: B.M.tileGold },
    winW: 1.5,
    winH: 2.0,
    litChance: 0.85,
  });
  B.building({
    x0: -6,
    z0: 24,
    x1: -3,
    z1: 30,
    floors: 3,
    skin: "plasterCream",
    faces: { e: "street", n: "alley", w: "alley" },
    units: {
      e: [U("shutter", 15, { sign: "board", blade: true, color: "#7dff5a" })],
    },
  });
  B.building({
    x0: -26,
    z0: 27.5,
    x1: -6,
    z1: 30,
    floors: 4,
    skin: "concrete",
    faces: { n: "alley" },
  });
  B.building({
    x0: -40,
    z0: 18,
    x1: -26,
    z1: 30,
    floors: 5,
    skin: "brickOrange",
    faces: { n: "street", e: "alley" },
    units: {
      n: [
        U("shutter", 9, { sign: "box", blade: true, color: "#ff7a1a" }),
        U("glass", 18, { interior: "bbq", sign: "neon" }),
        U("half", 10, { interior: "grocery", sign: "board", awning: BLU }),
      ],
    },
    fireEscape: { n: 9.5 },
    roof: "tank",
  });

  // east side
  B.building({
    x0: 7,
    z0: -30,
    x1: 35,
    z1: -25,
    floors: 5,
    skin: "concrete",
    faces: { s: "alley", w: "street" },
    spawnDoors: false,
    units: { w: [U("shutter", 13, { sign: "board" })] },
  });
  B.building({
    x0: 35,
    z0: -30,
    x1: 40,
    z1: -1,
    floors: 5,
    skin: "plasterPink",
    faces: { w: "alley", s: "street" },
    units: {
      s: [U("shutter", 6, { sign: "box", blade: true, color: "#ff4fd8" })],
    },
    roof: "tank",
  });
  B.building({
    x0: 34,
    z0: 13,
    x1: 40,
    z1: 30,
    floors: 4,
    skin: "brickWhite",
    faces: { n: "street", w: "alley" },
    spawnDoors: false,
    units: {
      n: [
        U("half", 16, {
          interior: "herbs",
          sign: "neon",
          blade: true,
          color: "#35f0c8",
        }),
      ],
    },
  });

  // ---------------- landmarks, dressing, lights ----------------
  const marks = buildLandmarks(ctx, PLAN);
  dressStreets(ctx, PLAN, marks);
  const supplySites = placeSupplies(ctx);

  signs.finish();
  const staticRoot = kit.flush("static", root);
  const shopRoot = B.fit.finish(root);
  const lights = createLights(ctx);

  // ---------------- gameplay data ----------------
  const playerStart = { pos: V(-33.5, 0, 6), yaw: -Math.PI / 2 };
  const objectives = marks.sirens.map((s, i) => ({
    id: "relay_" + "abc"[i],
    label: ["Siren A — Crossroads", "Siren B — Market", "Siren C — Temple"][i],
    zone: ["street", "market", "temple"][i],
    pos: V(s.x, s.y, s.z),
    object: s.object,
  }));
  const ground = (x, z, zone) => ({ pos: V(x, 0, z), zone, type: "ground" });
  const enemySpawns = [
    // street: gate plaza, alley mouths, both ends of the lane
    ground(-38, -4.2, "street"),
    ground(-38, 16.6, "street"),
    ground(-28, -13, "street"),
    ground(-16.5, -18, "street"),
    ground(-22, -13, "street"),
    ground(-9, -13, "street"),
    ground(2, -27, "street"),
    ground(3.5, -21, "street"),
    ground(2, 27.5, "street"),
    ground(0.5, 22, "street"),
    ground(-14, 19, "street"),
    ground(-22, 24.5, "street"),
    ground(-9, 25, "street"),
    ground(-4.5, 22.5, "street"),
    ground(-24, 7, "street"),
    ground(13, 6, "street"),
    ground(26, 4, "street"),
    ground(33, -8, "street"),
    ground(32.6, -20, "street"),
    ground(29.5, 11.6, "street"),
    ground(29, 0.5, "street"),
    // market hall
    ground(12, -22, "market"),
    ground(28, -22, "market"),
    ground(20, -23, "market"),
    ground(11.5, -8, "market"),
    ground(28.5, -7, "market"),
    ground(20, -12, "market"),
    // temple compound
    ground(9.2, 28.6, "temple"),
    ground(32.8, 28.4, "temple"),
    ground(9.5, 15.6, "temple"),
    ground(32.4, 14.6, "temple"),
    ground(9, 21, "temple"),
    ground(15, 21.5, "temple"),
    ground(28, 21.5, "temple"),
    ...ctx.doors.map((d) =>
      ground(d.x, d.z, d.x > 7 ? (d.z < 0 ? "market" : "temple") : "street"),
    ),
    ...ctx.spawns.map((s) => ground(s.x, s.z, s.zone || "street")),
  ];
  const zones = [
    { name: "gate", min: [-40, -30], max: [-26, 30] },
    { name: "street", min: [-26, -30], max: [7, 30] },
    { name: "market", min: [7, -30], max: [40, 2] },
    { name: "temple", min: [7, 2], max: [40, 30] },
  ];
  const M = PLAN.market;
  const interiorBoxes = [
    { min: V(M.x0, 0, M.z0), max: V(M.x1, M.ridge, M.z1) },
  ];
  const cinematicPath = [
    { pos: [-38, 2.2, 7.5], look: [-26, 4.2, 6] },
    { pos: [-30, 1.8, 6.4], look: [-18, 4.6, 5.4] },
    { pos: [-21, 2.4, 5.2], look: [-9, 4.4, 2.5] },
    { pos: [-11, 3.0, 6.8], look: [0, 3.4, 9.5] },
    { pos: [-2, 2.2, 6.4], look: [8, 3.6, 1] },
    { pos: [5, 1.9, 2.5], look: [16, 2.6, -8] },
    { pos: [15, 2.2, -4.5], look: [20, 2.6, -15] },
    { pos: [20.5, 2.6, -10.5], look: [26, 2.2, -4] },
    { pos: [22, 2.2, 2], look: [22, 3.2, 14] },
    { pos: [21.8, 1.9, 11.5], look: [21.5, 3.4, 24] },
    { pos: [24, 2.4, 17.5], look: [33, 2.6, 8] },
    { pos: [30, 2.0, 7], look: [39, 2.2, 6] },
  ];
  // nudge any spawn that landed inside a collider onto walkable ground
  const nav = G.physics.nav;
  const settle = (p) => {
    if (!nav || !nav.isWalkable || nav.isWalkable(p.x, p.z)) return;
    for (const r of [0.5, 1, 1.5, 2, 2.5])
      for (let i = 0; i < 8; i++) {
        const x = p.x + Math.cos(i * 0.7854) * r,
          z = p.z + Math.sin(i * 0.7854) * r;
        if (nav.isWalkable(x, z)) {
          p.x = x;
          p.z = z;
          return;
        }
      }
  };
  enemySpawns.forEach((s) => settle(s.pos));
  // a spawn the dead cannot walk out of is no use: keep only those connected to the gate
  try {
    const g = nav._grid();
    const cell = (x, z) => {
      const cx = Math.floor((x - g.minX) / g.cell),
        cz = Math.floor((z - g.minZ) / g.cell);
      return cx < 0 || cz < 0 || cx >= g.w || cz >= g.h ? -1 : cz * g.w + cx;
    };
    const seen = new Uint8Array(g.w * g.h);
    const queue = [cell(playerStart.pos.x, playerStart.pos.z)];
    seen[queue[0]] = 1;
    while (queue.length) {
      const c = queue.pop();
      const cx = c % g.w,
        cz = (c - cx) / g.w;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = cx + dx,
          nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= g.w || nz >= g.h) continue;
        const n = nz * g.w + nx;
        if (seen[n] || g.blocked[n]) continue;
        seen[n] = 1;
        queue.push(n);
      }
    }
    for (let i = enemySpawns.length - 1; i >= 0; i--) {
      const c = cell(enemySpawns[i].pos.x, enemySpawns[i].pos.z);
      if (c < 0 || !seen[c]) enemySpawns.splice(i, 1);
    }
  } catch (err) {
    console.warn("[chinatown] spawn reachability check skipped", err);
  }

  // faulty neon: steady for a while, then a buzzing stutter, shared by signs and their light
  let clock = 0;
  const faulty = signs.mats.neonFaulty;
  ctx.neonFlicker = 1;
  ctx.updaters.push((dt) => {
    clock += dt;
    const gate =
      Math.sin(clock * 0.9) +
      Math.sin(clock * 2.3 + 1.3) +
      Math.sin(clock * 0.31);
    const v =
      gate > 1.5
        ? Math.sin(clock * 67) > -0.2
          ? 1
          : 0.12
        : gate < -2.2
          ? 0.35
          : 1;
    ctx.neonFlicker = v;
    faulty.color.setScalar(2.6 * v);
  });

  // blood pools spreading under whatever was put down
  const POOLS = 28;
  const poolGeo = new THREE.BufferGeometry();
  const poolPos = new Float32Array(POOLS * 12),
    poolUv = new Float32Array(POOLS * 8),
    poolIdx = [];
  for (let i = 0; i < POOLS; i++)
    poolIdx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  poolGeo.setAttribute("position", new THREE.BufferAttribute(poolPos, 3));
  poolGeo.setAttribute("uv", new THREE.BufferAttribute(poolUv, 2));
  poolGeo.setAttribute(
    "normal",
    new THREE.BufferAttribute(
      new Float32Array(POOLS * 12).map((_, i) => (i % 3 === 1 ? 1 : 0)),
      3,
    ),
  );
  poolGeo.setIndex(poolIdx);
  const poolMesh = new THREE.Mesh(poolGeo, signs.mats.blood);
  poolMesh.frustumCulled = false;
  poolMesh.receiveShadow = true;
  poolMesh.renderOrder = 2;
  root.add(poolMesh);
  const pools = [];
  let poolNext = 0;
  const setPool = (p) => {
    const h = p.size * (0.25 + 0.75 * Math.min(1, p.age / 2.6)) * 0.5,
      c = Math.cos(p.a) * h,
      s = Math.sin(p.a) * h,
      o = p.i * 12;
    // written in place: this runs every frame for each growing pool
    poolPos[o] = p.x - c + s;
    poolPos[o + 1] = p.y;
    poolPos[o + 2] = p.z - s - c;
    poolPos[o + 3] = p.x - c - s;
    poolPos[o + 4] = p.y;
    poolPos[o + 5] = p.z - s + c;
    poolPos[o + 6] = p.x + c - s;
    poolPos[o + 7] = p.y;
    poolPos[o + 8] = p.z + s + c;
    poolPos[o + 9] = p.x + c + s;
    poolPos[o + 10] = p.y;
    poolPos[o + 11] = p.z + s - c;
    poolGeo.attributes.position.needsUpdate = true;
  };
  G.events.on("enemy:killed", (e) => {
    if (!e || !e.pos) return;
    const i = poolNext++ % POOLS;
    const uv = pick(signs.decals.pool);
    poolUv.set([uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]], i * 8);
    poolGeo.attributes.uv.needsUpdate = true;
    const p = {
      i,
      x: e.pos.x + (rnd() - 0.5) * 0.4,
      y: G.physics.groundHeight(e.pos.x, e.pos.z, e.pos.y + 0.5) + 0.008,
      z: e.pos.z + (rnd() - 0.5) * 0.4,
      a: rnd() * 6.28,
      size: 1.3 + rnd() * 0.9,
      age: 0,
    };
    const old = pools.findIndex((q) => q.i === i);
    if (old >= 0) pools.splice(old, 1);
    pools.push(p);
    setPool(p);
  });
  G.events.on("game:state", (e) => {
    if (e && (e.state === "title" || e.state === "intro")) {
      pools.length = 0;
      poolPos.fill(0);
      poolGeo.attributes.position.needsUpdate = true;
    }
  });
  ctx.updaters.push((dt) => {
    for (const p of pools) {
      if (p.age > 2.7) continue;
      p.age += dt;
      setPool(p);
    }
  });
  // incense and furnace smoke once the effects system exists
  let smokeDone = false;
  ctx.updaters.push(() => {
    if (smokeDone || !G.fx || !G.fx.addEmitter) return;
    smokeDone = true;
    for (const p of ctx.smoke || [])
      try {
        G.fx.addEmitter(V(p[0], p[1], p[2]), "steam");
      } catch {}
  });

  let warned = false;
  return {
    root,
    playerStart,
    objectives,
    extraction: {
      pos: V(marks.extraction.x, 0, marks.extraction.z),
      radius: 2.6,
    },
    enemySpawns,
    zones,
    interiorBoxes,
    cinematicPath,
    coverPoints: [],
    skylights: marks.skylights || [],
    shedLights: [],
    vantage: {},
    stats: {
      tris: staticRoot.userData.tris + shopRoot.userData.tris,
      meshes: staticRoot.children.length + shopRoot.children.length,
      shops: shopRoot.userData,
      lights: ctx.emitters.length,
      spawns: enemySpawns.length,
    },
    placed: [],
    explosives: marks.explosives || [],
    supplySites,
    lights,
    ctx,
    groundSurfaceAt(x, z) {
      return marks.metalAt && marks.metalAt(x, z) ? "metal" : "concrete";
    },
    update(dt) {
      lights.update(dt);
      for (const fn of ctx.updaters)
        try {
          fn(dt);
        } catch (err) {
          if (!warned) {
            warned = true;
            console.error("[chinatown] updater threw", err);
          }
        }
    },
  };
}
