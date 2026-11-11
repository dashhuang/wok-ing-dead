// Shophouse generator. A building is a hollow shell of textured wall pieces with real window
// recesses; street faces get shopfronts, signboards, blade signs, awnings, balconies and
// fire escapes, alley faces get back doors, pipes and air conditioners.
import * as THREE from "three";
import { SHOPS, NEON_COLORS } from "./signs.js";

const WALL_T = 0.3; // wall thickness = depth of the window reveals
const UV01 = [0, 0, 1, 1];

export const SKINS = {
  brickRed: { wall: "brick_red", trim: 0xb7ad9c, frame: 0x1f2a26, shutter: 0x6f7f86 },
  brickOrange: { wall: "brick_orange", trim: 0xc9bea8, frame: 0x3b2218, shutter: 0x8a8f82 },
  brickTeal: { wall: "brick_teal", trim: 0xd8d0bd, frame: 0x6e1a12, shutter: 0x9a4a3a },
  brickWhite: { wall: "brick_white", tint: 0xe8dcc8, trim: 0x8a2a1e, frame: 0x243a34, shutter: 0x4f6a78 },
  plasterCream: { wall: "plaster_worn", tint: 0xe9d9b8, trim: 0x8f2f22, frame: 0x24403a, shutter: 0x57707a },
  plasterPink: { wall: "plaster_peel", tint: 0xf0c8bc, trim: 0xe6dccb, frame: 0x2a4a44, shutter: 0x7c8c8c },
  plasterGreen: { wall: "plaster_worn", tint: 0x9fc0a8, trim: 0xe8e0cc, frame: 0x5a1c14, shutter: 0x8a7a5a },
  plasterYellow: { wall: "plaster_yellow", trim: 0xe6dfd0, frame: 0x30241c, shutter: 0x6a7a80 },
  plasterBlue: { wall: "plaster_blue", trim: 0xe2dccf, frame: 0x1c2a3a, shutter: 0x8f8a7a },
  tileWhite: { wall: "facade_tiles", tint: 0xe6e2d6, trim: 0x9a9488, frame: 0x30383c, shutter: 0x7f8a8f },
  tileGreen: { wall: "facade_tiles", tint: 0x8fb09a, trim: 0xd8d2c2, frame: 0x2a2f2c, shutter: 0x6a7f74 },
  tileRose: { wall: "facade_tiles", tint: 0xd6a89c, trim: 0xe8e2d4, frame: 0x3a2622, shutter: 0x8a8480 },
  concrete: { wall: "concrete_dirty", trim: 0x8f8a80, frame: 0x22282c, shutter: 0x6f7880 },
};

export function createBuilder(kit, signs, ctx) {
  const { rnd, pick } = kit;
  const M = {
    trim: (c) => kit.pbr("concrete_dirty", { color: c, key: "trim", macro: [0.06, 0.05, 0.6, 0.3] }),
    frame: (c) => kit.flat(c, { rough: 0.45, wet: "metal" }),
    darkGlass: kit.flat(0x070a0e, { rough: 0.06, metal: 0, wet: "glazed", key: "glass" }),
    void: kit.flat(0x020203, { rough: 1, wet: "dry", key: "void" }),
    steel: kit.game("steel_dark"),
    rust: kit.game("steel_rust"),
    galv: kit.game("steel_galv"),
    white: kit.game("paint_white"),
    roofFlat: kit.pbr("concrete_dirty", { color: 0x5a5a58, key: "roof", macro: [0.2, 0.1, 0.25, 0.7] }),
    tileGreen: kit.pbr("roof_ceramic", { color: 0x6fae7c, key: "g" }),
    tileGold: kit.pbr("roof_clay", { color: 0xf0c060, key: "y" }),
    lacquer: kit.pbr("wood_lacquer", { color: new THREE.Color(3.3, 0.62, 0.42), key: "red", macro: [0.06, 0.05, 1, 0.2] }),
    wood: kit.pbr("wood_planks", { macro: [0.1, 0.06, 1, 0.3] }),
    woodDark: kit.pbr("wood_planks", { color: 0x5a4636, key: "dk" }),
    shutter: (c) => kit.pbr("shutter", { color: c, macro: [0.1, 0.08, 0.5, 0.5] }),
    shutterRust: kit.pbr("shutter_rust"),
    stallTile: kit.pbr("tiles_white", { color: 0xcfd6cf, key: "stall" }),
    corrugated: kit.pbr("corrugated", { side: true }),
    cloth: (c) => kit.flat(c, { rough: 0.9, wet: [0.25, 0.7, 0.4, 0.4], side: true, key: "cloth" }),
    ac: kit.flat(0xb9b6ab, { rough: 0.5, metal: 0.2, wet: "metal", key: "ac" }),
    acDark: kit.flat(0x202326, { rough: 0.6, wet: "metal", key: "acd" }),
    bulb: kit.glow(0xffd9a0, 5),
    tubeWhite: kit.glow(0xdfeaff, 4),
    glassClear: shopGlass(),
  };
  function shopGlass() {
    const m = new THREE.MeshStandardMaterial({ color: 0x1a2226, transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0, depthWrite: false });
    m.name = "ct_shopglass";
    m.envMapIntensity = 1.6;
    return kit.G.mats.adopt(m, { wet: [0, 1, 0, 0] });
  }
  const wallMat = (skin, alt) =>
    kit.pbr(alt || skin.wall, { color: skin.tint, macro: [0.14, 0.07, 0.22, 0.55] });

  // ----- face-local coordinates: s along the wall (left to right seen from outside), y up, d outward -----
  function frame(side, x0, z0, x1, z1) {
    if (side === "s") return { ox: x0, oz: z1, ax: 1, az: 0, nx: 0, nz: 1, len: x1 - x0, map: { o: "s", i: "n", l: "w", r: "e" } };
    if (side === "n") return { ox: x1, oz: z0, ax: -1, az: 0, nx: 0, nz: -1, len: x1 - x0, map: { o: "n", i: "s", l: "e", r: "w" } };
    if (side === "e") return { ox: x1, oz: z1, ax: 0, az: -1, nx: 1, nz: 0, len: z1 - z0, map: { o: "e", i: "w", l: "s", r: "n" } };
    return { ox: x0, oz: z0, ax: 0, az: 1, nx: -1, nz: 0, len: z1 - z0, map: { o: "w", i: "e", l: "n", r: "s" } };
  }
  const P = (f, s, y, d) => [f.ox + f.ax * s + f.nx * d, y, f.oz + f.az * s + f.nz * d];
  function fbox(f, mat, s0, y0, d0, s1, y1, d1, o = {}) {
    const a = P(f, s0, y0, d0), b = P(f, s1, y1, d1);
    let skip = "";
    for (const ch of o.skip ?? "b") skip += f.map[ch] || ch;
    kit.box(mat, a[0], a[1], a[2], b[0], b[1], b[2], { ...o, skip });
  }
  function fquad(f, mat, s0, y0, s1, y1, d, uv, o) {
    kit.quad(mat, P(f, s0, y0, d), P(f, s1, y0, d), P(f, s1, y1, d), P(f, s0, y1, d), uv ? [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]] : null, o);
  }
  // quad facing the other way (back of a two-sided sign), text still reads left to right
  function fquadBack(f, mat, s0, y0, s1, y1, d, uv, o) {
    kit.quad(mat, P(f, s1, y0, d), P(f, s0, y0, d), P(f, s0, y1, d), P(f, s1, y1, d), uv ? [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]] : null, o);
  }
  // quad in the plane perpendicular to the wall at position s, from d0 to d1 (blade signs).
  // dir = 1 faces +s, dir = -1 faces -s.
  function squad(f, mat, s, y0, y1, d0, d1, dir, uv, o) {
    const a = P(f, s, y0, d0), b = P(f, s, y0, d1), c = P(f, s, y1, d1), e = P(f, s, y1, d0);
    const u = uv ? [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]] : null;
    if (dir > 0) kit.quad(mat, b, a, e, c, u, o);
    else kit.quad(mat, a, b, c, e, u, o);
  }
  const emit = (f, s, y, d, color, power, range, o = {}) => ctx.emitters.push({ pos: P(f, s, y, d), color, power, range, ...o });

  // ----- windows -----
  function windowUnit(f, sc, y, ww, wh, skin, o = {}) {
    const s0 = sc - ww / 2, s1 = sc + ww / 2;
    const d = -WALL_T + 0.1;
    const lit = o.lit ?? rnd() < 0.3;
    if (lit) fquad(f, signs.mats.glass, s0, y, s1, y + wh, d, pick(signs.windows), { cast: false });
    else fquad(f, M.darkGlass, s0, y, s1, y + wh, d, null, { cast: false });
    if (o.simple) return lit;
    const fm = M.frame(skin.frame);
    const t = 0.055;
    fbox(f, fm, s0, y, d, s0 + t, y + wh, d + 0.05, { cast: false, skip: "bi" });
    fbox(f, fm, s1 - t, y, d, s1, y + wh, d + 0.05, { cast: false, skip: "bi" });
    fbox(f, fm, s0, y + wh - t, d, s1, y + wh, d + 0.05, { cast: false, skip: "i" });
    fbox(f, fm, s0, y, d, s1, y + t, d + 0.05, { cast: false, skip: "i" });
    if (ww > 1.0) fbox(f, fm, sc - t / 2, y, d, sc + t / 2, y + wh, d + 0.045, { cast: false, skip: "bi" });
    if (wh > 1.3) fbox(f, fm, s0, y + wh * 0.62, d, s1, y + wh * 0.62 + t * 0.8, d + 0.045, { cast: false, skip: "i" });
    // sill and lintel in the trim colour
    const tm = M.trim(skin.trim);
    fbox(f, tm, s0 - 0.09, y - 0.09, -0.02, s1 + 0.09, y, 0.09, { cast: false, skip: "i" });
    if (o.lintel !== false) fbox(f, tm, s0 - 0.07, y + wh, -0.02, s1 + 0.07, y + wh + 0.16, 0.045, { cast: false, skip: "i" });
    if (lit && o.spill !== false && rnd() < 0.5) emit(f, sc, y + wh * 0.5, 0.5, 0xffc27a, 0.5, 5, { soft: true });
    return lit;
  }
  function airCon(f, sc, y) {
    fbox(f, M.ac, sc - 0.37, y, 0.02, sc + 0.37, y + 0.46, 0.44, { cast: false, skip: "i" });
    fbox(f, M.acDark, sc - 0.3, y + 0.06, 0.44, sc + 0.3, y + 0.4, 0.455, { cast: false, skip: "i" });
    fbox(f, M.rust, sc - 0.4, y - 0.04, 0, sc + 0.4, y, 0.46, { cast: false });
    const g = ctx.decal("leak_stain");
    if (g) fquad(f, g.material, sc - 0.3, y - 1.5, sc + 0.3, y - 0.04, 0.012, UV01, { cast: false });
  }
  function laundry(f, sc, y, w) {
    const a = P(f, sc - w / 2, y, 0.55), b = P(f, sc + w / 2, y, 0.55);
    kit.rod(M.galv, P(f, sc - w / 2, y, 0), a, 0.012);
    kit.rod(M.galv, P(f, sc + w / 2, y, 0), b, 0.012);
    kit.rod(M.galv, a, b, 0.01);
    let s = sc - w / 2 + 0.1;
    while (s < sc + w / 2 - 0.4) {
      const cw = 0.3 + rnd() * 0.35, ch = 0.45 + rnd() * 0.5;
      const m = M.cloth(pick([0xd9d4c6, 0x8a2a2a, 0x2f4a6a, 0xb9b9b9]));
      const sway = (rnd() - 0.5) * 0.12;
      kit.quad(m, P(f, s, y - ch, 0.55 + sway), P(f, s + cw, y - ch, 0.55 + sway), P(f, s + cw, y, 0.55), P(f, s, y, 0.55), null, { cast: false });
      s += cw + 0.08 + rnd() * 0.2;
    }
  }
  function balcony(f, s0, s1, y, skin, chinese) {
    const dep = 0.95;
    fbox(f, M.trim(skin.trim), s0, y - 0.14, 0, s1, y, dep, { skip: "i" });
    if (chinese) {
      for (const s of [s0 + 0.08, s1 - 0.08]) kit.cyl(M.lacquer, ...P(f, s, y, dep - 0.1), 0.07, 2.6, { seg: 8, cast: false });
      fbox(f, M.lacquer, s0, y + 0.92, dep - 0.14, s1, y + 1.0, dep - 0.06, { cast: false });
      fquad(f, signs.mats.lattice, s0 + 0.1, y + 0.08, s1 - 0.1, y + 0.92, dep - 0.1, [signs.decals.lattice[0], signs.decals.lattice[1], signs.decals.lattice[0] + (signs.decals.lattice[2] - signs.decals.lattice[0]) * Math.min(1, (s1 - s0) / 3.4), signs.decals.lattice[3]], { cast: false });
    } else {
      const top = y + 1.0;
      kit.rod(M.steel, P(f, s0, top, dep), P(f, s1, top, dep), 0.022);
      kit.rod(M.steel, P(f, s0, top, 0), P(f, s0, top, dep), 0.022);
      kit.rod(M.steel, P(f, s1, top, 0), P(f, s1, top, dep), 0.022);
      kit.rod(M.steel, P(f, s0, y + 0.12, dep), P(f, s1, y + 0.12, dep), 0.014);
      for (let s = s0; s <= s1 + 0.01; s += 0.16) kit.rod(M.steel, P(f, s, y, dep), P(f, s, top, dep), 0.009, { seg: 4 });
    }
    if (rnd() < 0.6) ctx.dress.push({ id: pick(["potted_plant_02", "planter_box_01", "potted_plant_02"]), pos: P(f, s0 + 0.5 + rnd() * (s1 - s0 - 1), y, dep - 0.4), yaw: rnd() * 6 });
  }
  function fireEscape(f, sc, yGround, floorY, floorH, floors) {
    const w = 3.3, dep = 1.05, s0 = sc - w / 2, s1 = sc + w / 2;
    for (let k = 0; k < floors; k++) {
      const y = floorY + k * floorH + 0.25;
      fbox(f, M.rust, s0, y - 0.05, 0.02, s1, y, dep, { cast: true, skip: "" });
      for (let i = 0; i < 9; i++) kit.rod(M.steel, P(f, s0 + (w * i) / 8, y, dep), P(f, s0 + (w * i) / 8, y + 0.95, dep), 0.011, { seg: 4 });
      for (const yy of [0.95, 0.5]) {
        kit.rod(M.steel, P(f, s0, y + yy, dep), P(f, s1, y + yy, dep), 0.02);
        kit.rod(M.steel, P(f, s0, y + yy, 0), P(f, s0, y + yy, dep), 0.02);
        kit.rod(M.steel, P(f, s1, y + yy, 0), P(f, s1, y + yy, dep), 0.02);
      }
      for (const s of [s0 + 0.1, s1 - 0.1]) kit.rod(M.steel, P(f, s, y - 0.05, 0.02), P(f, s, y - 0.55, 0.02), 0.02);
      for (const s of [s0 + 0.1, s1 - 0.1]) kit.rod(M.steel, P(f, s, y - 0.05, dep - 0.05), P(f, s, y - 0.55, 0.03), 0.016);
      // stair down to the platform below, alternating direction
      if (k > 0) {
        const dir = k % 2 ? 1 : -1;
        const sa = sc - dir * 1.1, sb = sc + dir * 1.1, yb = y - floorH;
        for (const d of [0.32, 0.86]) kit.rod(M.steel, P(f, sa, y, d), P(f, sb, yb, d), 0.022);
        for (let i = 1; i < 10; i++) {
          const t = i / 10;
          fbox(f, M.rust, sa + (sb - sa) * t - 0.12, y + (yb - y) * t - 0.015, 0.32, sa + (sb - sa) * t + 0.12, y + (yb - y) * t + 0.015, 0.86, { cast: false, skip: "" });
        }
        kit.rod(M.steel, P(f, sa, y + 0.9, 0.86), P(f, sb, yb + 0.9, 0.86), 0.016);
      }
    }
    // drop ladder
    const y0 = floorY + 0.25;
    for (const s of [s1 - 0.75, s1 - 0.3]) kit.rod(M.steel, P(f, s, y0, dep - 0.05), P(f, s, yGround + 2.3, dep - 0.05), 0.018);
    for (let y = yGround + 2.45; y < y0; y += 0.3) kit.rod(M.steel, P(f, s1 - 0.75, y, dep - 0.05), P(f, s1 - 0.3, y, dep - 0.05), 0.012, { seg: 4 });
  }

  // ----- signs -----
  // Blade sign hanging off the wall over the pavement.
  function bladeSign(f, s, y0, h, o = {}) {
    const w = o.w || 0.8, gap = 0.32, th = 0.16;
    const spec = { text: o.text, sub: o.sub, w, h, vertical: true, color: o.color, trim: o.trim, style: o.style || "tube" };
    const face = signs.neon(spec);
    const faulty = spec.style !== "box" && rnd() < 0.22;
    const sm = faulty ? signs.mats.neonFaulty : signs.mats.neon;
    fbox(f, M.steel, s - th / 2, y0, gap, s + th / 2, y0 + h, gap + w, { skip: "", cast: true });
    squad(f, sm, s + th / 2 + 0.006, y0, y0 + h, gap, gap + w, 1, face.uv, { cast: false });
    squad(f, sm, s - th / 2 - 0.006, y0, y0 + h, gap, gap + w, -1, face.uv, { cast: false });
    for (const y of [y0 + h * 0.12, y0 + h * 0.88]) kit.rod(M.steel, P(f, s, y, 0), P(f, s, y, gap), 0.025);
    kit.rod(M.steel, P(f, s, y0 + h + 0.5, 0), P(f, s, y0 + h, gap + w * 0.8), 0.012);
    emit(f, s, y0 + h * 0.45, gap + w * 0.6, face.color, o.power || 1.7, o.range || 10, { flicker: faulty ? 3 : 0 });
    ctx.glints.push({ pos: P(f, s, y0 + h / 2, gap + w / 2), color: face.color, size: h });
    return face;
  }
  // Signboard over a shopfront: lacquered board, or a lightbox.
  function fascia(f, s0, s1, y0, y1, shop, kind) {
    const text = shop[0] + shop[1];
    if (kind === "box") {
      const face = signs.neon({ text, sub: shop[2], w: s1 - s0, h: y1 - y0, style: "box", color: pick(["#b3140f", "#0f3f9a", "#0a6a3a", "#111111"]), face: pick(["#fff1cf", "#ffe08a", "#f4f7ff", "#ffd9d0"]) });
      fbox(f, M.steel, s0 - 0.04, y0 - 0.04, 0, s1 + 0.04, y1 + 0.04, 0.16, { cast: false, skip: "i" });
      fquad(f, signs.mats.neon, s0, y0, s1, y1, 0.168, face.uv, { cast: false });
      emit(f, (s0 + s1) / 2, y0 - 0.3, 0.9, 0xffe2b0, 1.15, 7.5);
    } else if (kind === "neon") {
      const face = signs.neon({ text, sub: shop[2], w: s1 - s0, h: y1 - y0, style: "tube" });
      fbox(f, M.steel, s0 - 0.04, y0 - 0.04, 0, s1 + 0.04, y1 + 0.04, 0.12, { cast: false, skip: "i" });
      fquad(f, signs.mats.neon, s0, y0, s1, y1, 0.128, face.uv, { cast: false });
      emit(f, (s0 + s1) / 2, y0 - 0.2, 0.9, face.color, 1.3, 8);
    } else {
      const face = signs.board({ text, sub: shop[2], w: s1 - s0, h: y1 - y0 });
      fbox(f, M.woodDark, s0 - 0.05, y0 - 0.05, 0, s1 + 0.05, y1 + 0.05, 0.09, { cast: false, skip: "i" });
      fquad(f, signs.mats.board, s0, y0, s1, y1, 0.098, face.uv, { cast: false });
    }
  }
  function awning(f, s0, s1, y, depth, color, stripes) {
    const drop = 0.55;
    const m = M.cloth(color);
    const m2 = stripes ? M.cloth(0xe9e2d0) : m;
    const n = stripes ? Math.max(2, Math.round((s1 - s0) / 0.55)) : 1;
    for (let i = 0; i < n; i++) {
      const a = s0 + ((s1 - s0) * i) / n, b = s0 + ((s1 - s0) * (i + 1)) / n;
      const mat = i % 2 ? m2 : m;
      kit.quad(mat, P(f, a, y - drop, depth), P(f, b, y - drop, depth), P(f, b, y, 0.05), P(f, a, y, 0.05));
      kit.quad(mat, P(f, a, y - drop - 0.22, depth), P(f, b, y - drop - 0.22, depth), P(f, b, y - drop, depth), P(f, a, y - drop, depth), null, { cast: false });
    }
    for (const s of [s0 + 0.05, s1 - 0.05]) {
      kit.rod(M.galv, P(f, s, y - drop, depth), P(f, s, y - 0.75, 0.02), 0.014);
      kit.rod(M.galv, P(f, s, y - drop, depth), P(f, s, y, 0.05), 0.014);
    }
    kit.rod(M.galv, P(f, s0, y - drop, depth), P(f, s1, y - drop, depth), 0.016);
  }

  // ----- shopfronts -----
  function shopfront(f, s0, s1, gH, skin, unit) {
    const type = unit.type;
    const tm = M.trim(skin.trim);
    const top = gH - 1.15; // head of the opening; the signboard sits above
    const wm = wallMat(skin);
    const a = s0 + 0.28, b = s1 - 0.28;
    // wall around the opening
    fbox(f, wm, s0, 0, -WALL_T, a, gH, 0, { skip: "bit" });
    fbox(f, wm, b, 0, -WALL_T, s1, gH, 0, { skip: "bit" });
    fbox(f, wm, a, top, -WALL_T, b, gH, 0, { skip: "it" });
    // pilaster and plinth on the party line
    fbox(f, tm, s0 - 0.2, 0, 0, s0 + 0.2, gH, 0.1, { skip: "bi", cast: false });
    fbox(f, tm, s0 - 0.24, 0, 0, s0 + 0.24, 0.5, 0.14, { skip: "bi", cast: false });
    const mid = (a + b) / 2;
    const shop = unit.shop;
    if (type === "shutter" || type === "half") {
      const m = unit.rusty ? M.shutterRust : M.shutter(skin.shutter);
      const lift = type === "half" ? 0.75 + rnd() * 0.5 : 0;
      fquad(f, m, a, lift, b, top, -0.12, null, { cast: false });
      fbox(f, M.steel, a, lift - 0.07, -0.14, b, lift, -0.09, { cast: false, skip: "i" });
      fbox(f, M.steel, a, top - 0.3, -0.16, b, top, 0.04, { cast: false, skip: "i" });
      fbox(f, M.steel, a, 0, -0.16, a + 0.06, top, -0.08, { cast: false, skip: "bi" });
      fbox(f, M.steel, b - 0.06, 0, -0.16, b, top, -0.08, { cast: false, skip: "bi" });
      if (lift) {
        // light leaking out under the half-closed shutter
        fquad(f, signs.mats.shop, a, 0, b, lift, -1.0, cropBottom(signs.interiors[unit.interior || "grocery"], 0.3), { cast: false });
        fbox(f, M.void, a, 0, -1.0, a + 0.02, lift, -0.12, { cast: false, skip: "b" });
        fbox(f, M.void, b - 0.02, 0, -1.0, b, lift, -0.12, { cast: false, skip: "b" });
        emit(f, mid, 0.35, 0.5, 0xffd2a0, 0.9, 5, { flicker: rnd() < 0.3 ? 2 : 0 });
      } else if (rnd() < 0.55) {
        const g = ctx.decal(pick(["graffiti_tag", "grime_streak", "rust_run"]));
        if (g) {
          const w = 1.0 + rnd() * 0.8;
          const s = a + 0.2 + rnd() * Math.max(0.1, b - a - w - 0.4);
          const gy = 0.5 + rnd() * 0.6;
          fquad(f, g.material, s, gy, s + w, gy + w / (g.aspect || 1), -0.112, UV01, { cast: false });
        }
      }
      if (rnd() < 0.5) notice(f, a + 0.3 + rnd() * (b - a - 1), 1.1 + rnd() * 0.5, -0.108);
    } else if (type === "glass") {
      const doorW = 1.0, door0 = unit.doorLeft ? a : b - doorW, door1 = door0 + doorW;
      const w0 = unit.doorLeft ? door1 + 0.08 : a, w1 = unit.doorLeft ? b : door0 - 0.08;
      const fm = M.frame(skin.frame);
      const kind = unit.interior || "grocery";
      // lit room behind the glass
      fquad(f, signs.mats.shop, a, 0, b, top, -1.5, signs.interiors[kind], { cast: false });
      fbox(f, M.void, a - 0.02, 0, -1.5, a, top, -WALL_T, { cast: false, skip: "b" });
      fbox(f, M.void, b, 0, -1.5, b + 0.02, top, -WALL_T, { cast: false, skip: "b" });
      kit.quad(M.woodDark, P(f, a, 0.02, -1.5), P(f, a, 0.02, -0.1), P(f, b, 0.02, -0.1), P(f, b, 0.02, -1.5), null, { cast: false });
      kit.quad(M.void, P(f, a, top, -0.1), P(f, a, top, -1.5), P(f, b, top, -1.5), P(f, b, top, -0.1), null, { cast: false });
      fbox(f, M.tubeWhite, w0 + 0.3, top - 0.1, -0.9, w1 - 0.3, top - 0.06, -0.84, { cast: false });
      // stall riser, display glass, door
      fbox(f, M.stallTile, w0, 0, -0.2, w1, 0.55, -0.02, { cast: false, skip: "bi" });
      fquad(f, M.glassClear, w0, 0.55, w1, top, -0.1, null, { cast: false });
      fbox(f, fm, w0, 0.55, -0.14, w0 + 0.06, top, -0.06, { cast: false, skip: "i" });
      fbox(f, fm, w1 - 0.06, 0.55, -0.14, w1, top, -0.06, { cast: false, skip: "i" });
      fbox(f, fm, w0, top - 0.07, -0.14, w1, top, -0.06, { cast: false, skip: "i" });
      fbox(f, fm, w0, 0.55, -0.14, w1, 0.61, -0.06, { cast: false, skip: "i" });
      if (w1 - w0 > 2.4) fbox(f, fm, (w0 + w1) / 2 - 0.03, 0.55, -0.14, (w0 + w1) / 2 + 0.03, top, -0.06, { cast: false, skip: "i" });
      fquad(f, M.glassClear, door0, 0.1, door1, top - 0.45, -0.16, null, { cast: false });
      fbox(f, fm, door0, 0, -0.2, door0 + 0.07, top, -0.12, { cast: false, skip: "i" });
      fbox(f, fm, door1 - 0.07, 0, -0.2, door1, top, -0.12, { cast: false, skip: "i" });
      fbox(f, fm, door0, top - 0.5, -0.2, door1, top - 0.42, -0.12, { cast: false, skip: "i" });
      fbox(f, fm, door0, 0, -0.2, door1, 0.12, -0.12, { cast: false, skip: "i" });
      fbox(f, M.galv, door0 + (unit.doorLeft ? 0.78 : 0.14), 0.95, -0.12, door0 + (unit.doorLeft ? 0.84 : 0.2), 1.35, -0.07, { cast: false });
      emit(f, mid, 1.6, 0.9, kind === "diner" ? 0xff9a5a : kind === "herbs" ? 0xffc27a : 0xfff0d0, 1.5, 9);
      if (rnd() < 0.4) {
        const uv = pick(signs.decals.hand);
        const s = w0 + 0.3 + rnd() * Math.max(0.1, w1 - w0 - 1.1);
        fquad(f, signs.mats.blood, s, 0.9, s + 0.7, 1.6, -0.092, uv, { cast: false });
      }
    } else if (type === "door") {
      // stair door to the flats above
      const d0 = mid - 0.6, d1 = mid + 0.6;
      fbox(f, wm, a, 0, -WALL_T, d0, top, 0, { skip: "bit" });
      fbox(f, wm, d1, 0, -WALL_T, b, top, 0, { skip: "bit" });
      fquad(f, M.frame(skin.frame), d0, 0.16, d1, 2.25, -0.26, null, { cast: false });
      fbox(f, tm, d0, 0, -0.3, d1, 0.16, 0.12, { cast: false, skip: "bi" });
      fquad(f, signs.mats.lattice, d0 + 0.05, 0.2, d1 - 0.05, 2.2, -0.2, signs.decals.lattice, { cast: false });
      fquad(f, M.darkGlass, d0, 2.3, d1, top - 0.05, -0.24, null, { cast: false });
      fbox(f, tm, d0 - 0.1, 2.25, -0.3, d1 + 0.1, 2.32, 0.06, { cast: false, skip: "i" });
      fbox(f, M.bulb, mid - 0.05, top - 0.02, 0.1, mid + 0.05, top + 0.1, 0.2, { cast: false, skip: "" });
      emit(f, mid, top - 0.2, 0.5, 0xffc880, 0.85, 5.5, { flicker: rnd() < 0.25 ? 2 : 0 });
      // meter box and conduit beside the door
      fbox(f, M.ac, d1 + 0.22, 1.35, 0, d1 + 0.62, 1.95, 0.13, { skip: "i" });
      fbox(f, M.acDark, d1 + 0.27, 1.62, 0.13, d1 + 0.57, 1.9, 0.135, { skip: "i" });
      kit.rod(M.galv, P(f, d1 + 0.42, 1.95, 0.05), P(f, d1 + 0.42, gH - 0.2, 0.05), 0.014);
    } else {
      // black doorway: something can come out of it
      const d0 = mid - 0.75, d1 = mid + 0.75;
      fbox(f, wm, a, 0, -WALL_T, d0, top, 0, { skip: "bit" });
      fbox(f, wm, d1, 0, -WALL_T, b, top, 0, { skip: "bit" });
      fquad(f, M.void, d0, 0, d1, top, -1.2, null, { cast: false });
      fbox(f, M.void, d0 - 0.02, 0, -1.2, d0, top, -WALL_T, { cast: false, skip: "b" });
      fbox(f, M.void, d1, 0, -1.2, d1 + 0.02, top, -WALL_T, { cast: false, skip: "b" });
      // torn plastic strip curtain
      for (let s = d0 + 0.05; s < d1 - 0.1; s += 0.2)
        if (rnd() < 0.72) {
          const len = 0.6 + rnd() * 1.7;
          fquad(f, M.cloth(0x9aa39a), s, top - len, s + 0.17, top, -0.35 + rnd() * 0.06, null, { cast: false });
        }
      const p = P(f, mid, 0, 0.9);
      ctx.doors.push({ x: p[0], z: p[2] });
    }
    // signboard and extras
    const kind = unit.sign || pick(["board", "board", "box", "neon"]);
    if (shop && type !== "door" && type !== "dark") fascia(f, a - 0.1, b + 0.1, top + 0.14, gH - 0.16, shop, kind);
    else if (type === "dark") fbox(f, M.steel, a, top + 0.15, 0, b, gH - 0.2, 0.05, { cast: false, skip: "i" });
    if (unit.awning) awning(f, a - 0.15, b + 0.15, top + 0.12, 1.5 + rnd() * 0.4, unit.awning, rnd() < 0.5);
  }
  const cropBottom = (uv, k) => [uv[0], uv[1], uv[2], uv[1] + (uv[3] - uv[1]) * k];
  function notice(f, s, y, d) {
    const p = signs.poster(pick(["quarantine", "evac", "missing", "bill", "quarantine"]));
    fquad(f, signs.mats.board, s, y, s + p.w, y + p.h, d, p.uv, { cast: false });
  }

  // ----- faces -----
  function streetFace(f, spec, skin) {
    const { gH, fH, floors } = spec;
    const W = f.len;
    const wm = wallMat(skin);
    // ground floor: shop units
    const units = spec.units || defaultUnits(W);
    const total = units.reduce((n, u) => n + (u.w || 1), 0);
    let s = 0;
    for (const u of units) {
      const uw = (W * (u.w || 1)) / total;
      shopfront(f, s, s + uw, gH, skin, u);
      u._s0 = s;
      u._s1 = s + uw;
      s += uw;
    }
    fbox(f, M.trim(skin.trim), W - 0.2, 0, 0, W + 0.0, gH, 0.1, { skip: "bi", cast: false });
    // string course above the shops
    fbox(f, M.trim(skin.trim), 0, gH - 0.1, 0, W, gH + 0.12, 0.16, { skip: "i", cast: false });
    // upper floors
    const bays = Math.max(1, Math.round(W / (spec.bayW || 2.7)));
    const bw = W / bays;
    const ww = Math.min(spec.winW || 1.25, bw - 0.9);
    const wh = spec.winH || 1.55, sill = 0.95;
    const chinese = spec.style === "chinese";
    for (let k = 1; k < floors; k++) {
      const y0 = gH + (k - 1) * fH;
      fbox(f, wm, 0, y0, -WALL_T, W, y0 + sill, 0, { skip: "bi" });
      fbox(f, wm, 0, y0 + sill + wh, -WALL_T, W, y0 + fH, 0, { skip: "ti" });
      for (let i = 0; i <= bays; i++) {
        const p0 = i === 0 ? 0 : i * bw - bw / 2 + ww / 2;
        const p1 = i === bays ? W : i * bw + bw / 2 - ww / 2;
        fbox(f, wm, p0, y0 + sill, -WALL_T, p1, y0 + sill + wh, 0, { skip: "bti" });
      }
      const balc = spec.balconies && spec.balconies.includes(k);
      for (let i = 0; i < bays; i++) {
        const sc = (i + 0.5) * bw;
        const lit = windowUnit(f, sc, y0 + sill, ww, wh, skin, { lit: spec.litChance !== undefined ? rnd() < spec.litChance : undefined });
        if (!balc && !chinese) {
          const r = rnd();
          if (r < 0.26) airCon(f, sc + (rnd() < 0.5 ? -1 : 1) * (ww / 2 - 0.3), y0 + sill - 0.62);
          else if (r < 0.36) laundry(f, sc, y0 + sill - 0.12, ww + 0.5);
          else if (r < 0.44) ctx.dress.push({ id: "planter_box_01", pos: P(f, sc, y0 + sill, 0.2), yaw: Math.atan2(f.ax, f.az) + Math.PI / 2, scale: 0.9 });
        }
        void lit;
      }
      if (balc) balcony(f, 0.25, W - 0.25, y0 + 0.02, skin, chinese);
      if (k < floors - 1 || !spec.eave) fbox(f, M.trim(skin.trim), 0, y0 + fH - 0.05, 0, W, y0 + fH + 0.05, 0.06, { skip: "i", cast: false });
    }
    const H = gH + (floors - 1) * fH;
    if (spec.fireEscape && floors > 2) fireEscape(f, spec.fireEscape === true ? W * 0.5 : spec.fireEscape, 0, gH, fH, floors - 1);
    // blade signs between the upper windows
    for (const u of units) {
      if (!u.blade || !u.shop) continue;
      const sc = u.bladeAt !== undefined ? u.bladeAt : (u._s0 + u._s1) / 2;
      const snap = Math.max(0.5, Math.min(W - 0.5, Math.round(sc / bw) * bw));
      const h = u.bladeH || Math.min(H - gH - 0.6, 2.6 + rnd() * 2.2);
      const big = u.blade === "big";
      bladeSign(f, snap, gH + 0.45 + (u.bladeUp || 0), h, {
        text: u.blade === "pawn" ? "押" : (u.bladeText || u.shop[0] + u.shop[1]),
        sub: big ? null : null,
        w: big ? 1.15 : u.blade === "pawn" ? 1.2 : 0.78,
        style: u.blade === "pawn" ? "pawn" : u.blade === "box" ? "box" : "tube",
        color: u.color,
        power: big ? 2.4 : 1.7,
        range: big ? 13 : 10,
      });
    }
    roofline(f, spec, skin, H);
  }
  function defaultUnits(W) {
    const n = Math.max(1, Math.round(W / 4.6));
    const out = [];
    for (let i = 0; i < n; i++) {
      const r = rnd();
      out.push({
        type: r < 0.42 ? "shutter" : r < 0.6 ? "half" : r < 0.86 ? "glass" : "door",
        shop: pick(SHOPS),
        interior: pick(["grocery", "diner", "herbs", "bbq", "tea"]),
        blade: rnd() < 0.5,
        awning: rnd() < 0.4 ? pick([0x8a1f1a, 0x1f5a3c, 0x1f3f7a, 0xc9a13a, 0x5a2a1a]) : 0,
        doorLeft: rnd() < 0.5,
        rusty: rnd() < 0.25,
      });
    }
    return out;
  }
  function alleyFace(f, spec, skin) {
    const { gH, fH, floors } = spec;
    const W = f.len, H = gH + (floors - 1) * fH;
    const wm = wallMat(skin, spec.backWall);
    const bays = Math.max(1, Math.round(W / 3.4));
    const bw = W / bays;
    const ww = 0.8, wh = 1.1, sill = 1.25;
    // ground floor: solid wall with back doors
    const doors = [];
    if (!spec.simple) for (let i = 0; i < bays; i++) if (rnd() < 0.45) doors.push((i + 0.5) * bw + (rnd() - 0.5) * 0.6);
    let s = 0;
    for (const dc of doors) {
      fbox(f, wm, s, 0, -WALL_T, dc - 0.5, gH, 0, { skip: "bit" });
      fbox(f, wm, dc - 0.5, 2.15, -WALL_T, dc + 0.5, gH, 0, { skip: "it" });
      const dark = rnd() < 0.35 && spec.spawnDoors !== false;
      if (dark) {
        fquad(f, M.void, dc - 0.5, 0, dc + 0.5, 2.15, -1.0, null, { cast: false });
        fbox(f, M.void, dc - 0.52, 0, -1.0, dc - 0.5, 2.15, -WALL_T, { cast: false, skip: "b" });
        fbox(f, M.void, dc + 0.5, 0, -1.0, dc + 0.52, 2.15, -WALL_T, { cast: false, skip: "b" });
        const p = P(f, dc, 0, 0.8);
        ctx.doors.push({ x: p[0], z: p[2] });
      } else {
        fquad(f, M.shutterRust, dc - 0.5, 0, dc + 0.5, 2.15, -0.2, null, { cast: false });
        fbox(f, M.galv, dc + 0.3, 0.95, -0.2, dc + 0.36, 1.15, -0.14, { cast: false });
      }
      fbox(f, M.steel, dc - 0.56, 0, -0.22, dc - 0.5, 2.2, 0.02, { cast: false, skip: "bi" });
      fbox(f, M.steel, dc + 0.5, 0, -0.22, dc + 0.56, 2.2, 0.02, { cast: false, skip: "bi" });
      fbox(f, M.steel, dc - 0.56, 2.15, -0.22, dc + 0.56, 2.21, 0.02, { cast: false, skip: "i" });
      if (rnd() < 0.7) {
        fbox(f, M.bulb, dc - 0.05, 2.45, 0.06, dc + 0.05, 2.55, 0.16, { cast: false, skip: "" });
        fbox(f, M.steel, dc - 0.12, 2.55, 0, dc + 0.12, 2.6, 0.24, { cast: false, skip: "i" });
        emit(f, dc, 2.35, 0.45, 0xffb060, 0.9, 6, { flicker: rnd() < 0.35 ? 2 : 0 });
      }
      s = dc + 0.5;
    }
    fbox(f, wm, s, 0, -WALL_T, W, gH, 0, { skip: "bit" });
    for (let k = 1; k < floors; k++) {
      const y0 = gH + (k - 1) * fH;
      fbox(f, wm, 0, y0, -WALL_T, W, y0 + sill, 0, { skip: "bi" });
      fbox(f, wm, 0, y0 + sill + wh, -WALL_T, W, y0 + fH, 0, { skip: "ti" });
      for (let i = 0; i <= bays; i++) {
        const p0 = i === 0 ? 0 : i * bw - bw / 2 + ww / 2;
        const p1 = i === bays ? W : i * bw + bw / 2 - ww / 2;
        fbox(f, wm, p0, y0 + sill, -WALL_T, p1, y0 + sill + wh, 0, { skip: "bti" });
      }
      for (let i = 0; i < bays; i++) {
        const sc = (i + 0.5) * bw;
        windowUnit(f, sc, y0 + sill, ww, wh, skin, { lit: rnd() < (spec.litChance ?? 0.2), lintel: false, simple: spec.simple, spill: !spec.simple });
        if (spec.simple) continue;
        if (rnd() < 0.4) airCon(f, sc + (rnd() < 0.5 ? -0.75 : 0.75), y0 + sill - 0.1);
        // security bars
        if (k === 1) for (let b = -ww / 2 + 0.1; b < ww / 2; b += 0.13) kit.rod(M.steel, P(f, sc + b, y0 + sill, -0.04), P(f, sc + b, y0 + sill + wh, -0.04), 0.008, { seg: 4 });
      }
    }
    if (spec.simple) return roofline(f, spec, skin, H);
    // drain pipes, a cable run, stains
    const pipes = 1 + Math.floor(rnd() * Math.max(1, W / 6));
    for (let i = 0; i < pipes; i++) {
      const ps = 0.4 + rnd() * (W - 0.8);
      kit.cyl(M.rust, ...P(f, ps, 0, 0.09), 0.055, H + 0.3, { seg: 7, cast: false });
      for (let y = 1.2; y < H; y += 2.6) fbox(f, M.steel, ps - 0.09, y, 0, ps + 0.09, y + 0.05, 0.16, { cast: false, skip: "i" });
    }
    const cy = gH - 0.5 + rnd() * 0.4;
    kit.cable(M.acDark, P(f, 0.1, cy, 0.05), P(f, W - 0.1, cy - 0.1, 0.05), 0.12, 0.014, 10);
    for (let i = 0; i < Math.ceil(W / 5); i++) {
      const g = ctx.decal(pick(["grime_streak", "rust_run", "leak_stain", "grime_streak"]));
      if (!g) continue;
      const w = 0.7 + rnd() * 1.1, gs = rnd() * (W - w), gy = 0.4 + rnd() * (H - 4);
      fquad(f, g.material, gs, gy, gs + w, gy + Math.min(H - gy - 0.3, (w / (g.aspect || 0.5)) * 1.2), 0.014, UV01, { cast: false });
    }
    if (rnd() < 0.5) notice(f, 0.6 + rnd() * (W - 1.6), 1.2, 0.012);
    roofline(f, spec, skin, H);
  }
  function blankFace(f, spec, skin) {
    const H = spec.gH + (spec.floors - 1) * spec.fH + 0.9;
    fquad(f, wallMat(skin, spec.backWall), 0, 0, f.len, H, 0);
  }
  function roofline(f, spec, skin, H) {
    const W = f.len;
    const tm = M.trim(skin.trim);
    if (spec.eave) {
      eaveRoof(f, -0.5, W + 0.5, H - 0.1, spec.eave.depth || 1.3, spec.eave.tile || M.tileGreen, spec.eave.rise ?? 0.6);
      fbox(f, wallMat(skin), 0, H, -WALL_T, W, H + 0.9, 0, { skip: "bi" });
    } else {
      fbox(f, tm, -0.02, H - 0.12, 0, W + 0.02, H + 0.12, 0.26, { skip: "i", cast: false });
      fbox(f, tm, -0.02, H - 0.34, 0, W + 0.02, H - 0.12, 0.14, { skip: "i", cast: false });
      fbox(f, wallMat(skin), 0, H, -WALL_T, W, H + 0.9, 0, { skip: "bi" });
      fbox(f, tm, -0.02, H + 0.9, -WALL_T - 0.04, W + 0.02, H + 1.0, 0.06, { skip: "", cast: false });
    }
  }
  // Tiled eave with the corners swept up. Runs along the face from s0 to s1 at height y.
  function eaveRoof(f, s0, s1, y, depth, tile, rise = 0.6, o = {}) {
    const segS = Math.max(8, Math.round((s1 - s0) / 0.7)), segD = 5;
    const back = o.back ?? -0.2;
    const lift = o.lift ?? 0.75;
    const pts = [];
    for (let i = 0; i <= segS; i++) {
      const t = i / segS;
      const s = s0 + (s1 - s0) * t;
      const edge = Math.min(t, 1 - t) * (s1 - s0);
      const up = lift * Math.pow(Math.max(0, 1 - edge / Math.min(2.4, (s1 - s0) / 2)), 2.2);
      const row = [];
      for (let j = 0; j <= segD; j++) {
        const q = j / segD;
        const d = back + (depth - back) * q;
        // concave slope: steep near the wall, flattening and curling up at the lip
        const h = rise * (1 - q) * (1 - q) + up * q * q + 0.05 * q;
        row.push(P(f, s, y + h, d));
      }
      pts.push(row);
    }
    for (let i = 0; i < segS; i++)
      for (let j = 0; j < segD; j++) {
        const a = pts[i][j], b = pts[i + 1][j], c = pts[i + 1][j + 1], e = pts[i][j + 1];
        const u0 = s0 + ((s1 - s0) * i) / segS, u1 = s0 + ((s1 - s0) * (i + 1)) / segS;
        const v0 = (j / segD) * (depth - back) * 1.15, v1 = ((j + 1) / segD) * (depth - back) * 1.15;
        kit.quad(tile, e, c, b, a, [u0, v1, u1, v1, u1, v0, u0, v0]);
      }
    // underside board and lip
    const wood = o.under || M.lacquer;
    for (let i = 0; i < segS; i++) {
      const a = pts[i][segD], b = pts[i + 1][segD];
      const a0 = [a[0], a[1] - 0.14, a[2]], b0 = [b[0], b[1] - 0.14, b[2]];
      kit.quad(wood, a0, b0, b, a, null, { cast: false });
      const ia = pts[i][0], ib = pts[i + 1][0];
      kit.quad(wood, [ia[0], y - 0.05, ia[2]], [ib[0], y - 0.05, ib[2]], b0, a0, null, { cast: false });
    }
    // end caps and a round ridge along the wall
    for (const i of [0, segS]) {
      const row = pts[i];
      for (let j = 0; j < segD; j++) {
        const a = row[j], b = row[j + 1];
        const q = [[a[0], y - 0.05, a[2]], [b[0], b[1] - 0.14, b[2]], b, a];
        if (i === 0) kit.quad(wood, q[1], q[0], q[3], q[2], null, { cast: false });
        else kit.quad(wood, q[0], q[1], q[2], q[3], null, { cast: false });
      }
    }
    if (o.ridge !== false) {
      const ra = P(f, s0, y + rise + 0.06, back + 0.1), rb = P(f, s1, y + rise + 0.06, back + 0.1);
      kit.rod(o.ridgeMat || M.tileGold, ra, rb, 0.13, { seg: 8, cast: true });
    }
  }

  // ----- the building -----
  // spec: { x0, z0, x1, z1, floors, gH, fH, skin, faces: {n,s,e,w: "street"|"alley"|"blank"},
  //         units (street), fireEscape, balconies:[floor...], eave:{}, style, roof:"flat"|"tank"|"none", collide }
  function building(spec) {
    const skin = typeof spec.skin === "string" ? SKINS[spec.skin] : spec.skin;
    const s = { gH: 3.9, fH: 3.1, floors: 3, faces: {}, ...spec };
    const H = s.gH + (s.floors - 1) * s.fH;
    for (const side of ["n", "s", "e", "w"]) {
      const kind = s.faces[side] || "blank";
      const f = frame(side, s.x0, s.z0, s.x1, s.z1);
      const fs = { ...s, units: s.units && s.units[side], fireEscape: s.fireEscape && s.fireEscape[side], balconies: s.balconies && s.balconies[side], eave: s.eave && (s.eave.sides || "nsew").includes(side) ? s.eave : null };
      if (kind === "street") streetFace(f, fs, skin);
      else if (kind === "alley") alleyFace(f, fs, skin);
      else blankFace(f, fs, skin);
    }
    // roof deck and clutter
    kit.quad(M.roofFlat, [s.x0, H, s.z1], [s.x1, H, s.z1], [s.x1, H, s.z0], [s.x0, H, s.z0]);
    if (s.roof !== "none" && !s.simple) roofClutter(s, H);
    if (s.collide !== false) kit.solid(s.x0, 0, s.z0, s.x1, H + 0.9, s.z1, s.skin && String(s.skin).startsWith("brick") ? "concrete" : "concrete");
    return { H, spec: s };
  }
  function roofClutter(s, H) {
    const w = s.x1 - s.x0, d = s.z1 - s.z0;
    if (w < 4 || d < 4) return;
    const px = (t) => s.x0 + 1 + t * (w - 2), pz = (t) => s.z0 + 1 + t * (d - 2);
    if (s.roof === "tank" || rnd() < 0.45) {
      // water tank on a steel stand
      const x = px(0.2 + rnd() * 0.6), z = pz(0.3 + rnd() * 0.4), r = 0.9 + rnd() * 0.35;
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) kit.rod(M.rust, [x + dx * r * 0.7, H, z + dz * r * 0.7], [x + dx * r * 0.6, H + 1.7, z + dz * r * 0.6], 0.05, { cast: true });
      kit.cyl(M.woodDark, x, H + 1.7, z, r, 2.1, { seg: 14 });
      kit.cyl(M.rust, x, H + 3.8, z, r * 1.06, 0.5, { seg: 14, rTop: 0.1 });
      for (const y of [1.95, 2.9, 3.6]) kit.cyl(M.steel, x, H + y, z, r * 1.015, 0.05, { seg: 14, cast: false, open: true });
    }
    // stair bulkhead
    if (rnd() < 0.7) {
      const x = px(rnd() * 0.7), z = pz(rnd() * 0.6);
      kit.box(M.trim(0x8a857c), x, H, z, x + 2.2, H + 2.3, z + 2.6);
      kit.box(M.shutterRust, x + 0.5, H, z + 2.6, x + 1.5, H + 1.95, z + 2.63, { cast: false });
    }
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const x = px(rnd()), z = pz(rnd());
      kit.box(M.ac, x - 0.5, H + 0.12, z - 0.35, x + 0.5, H + 0.95, z + 0.35);
      kit.box(M.acDark, x - 0.42, H + 0.2, z + 0.35, x + 0.42, H + 0.87, z + 0.36, { cast: false });
    }
    // antenna
    if (rnd() < 0.6) {
      const x = px(rnd()), z = pz(rnd());
      kit.rod(M.galv, [x, H, z], [x, H + 3.2, z], 0.025, { cast: true });
      for (let k = 0; k < 4; k++) kit.rod(M.galv, [x - 0.5 + k * 0.08, H + 2.4 + k * 0.2, z], [x + 0.5 - k * 0.08, H + 2.4 + k * 0.2, z], 0.008, { seg: 4 });
    }
  }

  return { building, frame, P, fbox, fquad, fquadBack, squad, emit, eaveRoof, windowUnit, bladeSign, fascia, awning, notice, balcony, airCon, fireEscape, M, wallMat };
}
