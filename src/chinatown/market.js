// The wet market hall: brick shed with a corrugated roof, tiled stalls and strip lights.
// It is the level's one interior (see interiorBoxes in level.js).
import * as THREE from "three";

export function buildMarket(ctx, PLAN) {
  const { kit, signs, B } = ctx;
  const { rnd, pick } = kit;
  const K = PLAN.kerb;
  const M = B.M;
  const blood = ctx.blood;
  const m = PLAN.market;
  const { x0, z0, x1, z1, eave, ridge } = m;
  const I = { interior: true };
  const floor = kit.pbr("tiles_floor", {
    ...I,
    macro: [0.14, 0.1, 0.5, 0.6],
  });
  const tile = kit.pbr("tiles_white", { ...I, color: 0xd6ddd4 });
  const wallIn = kit.pbr("plaster_worn", {
    ...I,
    color: 0xb9c2a8,
    key: "mkt",
  });
  const brick = kit.pbr("brick_orange", { macro: [0.14, 0.07, 0.22, 0.55] });
  const steelI = kit.game("steel_dark", I),
    galvI = kit.game("steel_galv", I);
  const sheet = kit.pbr("corrugated", { ...I, side: true });
  const conc = kit.pbr("concrete_dirty", { ...I, key: "mkt" });
  const skyPanel = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x6f8fb0).multiplyScalar(0.5),
    side: THREE.DoubleSide,
  });
  skyPanel.name = "ct_skylight";
  const zr = (z0 + z1) / 2;
  kit.box(floor, x0, 0, z0, x1, K, z1, { skip: "b" });
  kit.solid(x0, -0.2, z0, x1, K, z1, "concrete");

  // walls: brick outside, tiled dado and plaster inside; openings are [from, to, head height]
  const T = 0.4;
  function wall(side, openings, o = {}) {
    const f = B.frame(side, x0, z0, x1, z1);
    const W = f.len;
    let s = 0;
    const seg = (a, b, y0, y1) => {
      if (b - a < 0.02) return;
      if (!o.noOuter) B.fbox(f, brick, a, y0, -T / 2, b, y1, 0, { skip: "bi" });
      B.fbox(
        f,
        y0 < 2.2 ? tile : wallIn,
        a,
        y0,
        -T,
        b,
        Math.min(y1, 2.2 + K),
        -T / 2,
        { skip: "bo" },
      );
      if (y1 > 2.2 + K)
        B.fbox(f, wallIn, a, Math.max(y0, 2.2 + K), -T, b, y1, -T / 2, {
          skip: "bo",
        });
      const pa = B.P(f, a, y0, -T),
        pb = B.P(f, b, y1, 0);
      kit.solid(
        Math.min(pa[0], pb[0]),
        y0,
        Math.min(pa[2], pb[2]),
        Math.max(pa[0], pb[0]),
        y1,
        Math.max(pa[2], pb[2]),
        "concrete",
      );
    };
    for (const [a, b, head] of openings) {
      seg(s, a, 0, eave);
      seg(a, b, head, eave);
      // steel frame round the opening
      B.fbox(f, M.steel, a - 0.08, 0, -T - 0.02, a, head, 0.03, {
        skip: "b",
      });
      B.fbox(f, M.steel, b, 0, -T - 0.02, b + 0.08, head, 0.03, {
        skip: "b",
      });
      B.fbox(
        f,
        M.steel,
        a - 0.08,
        head,
        -T - 0.02,
        b + 0.08,
        head + 0.34,
        0.06,
        { skip: "" },
      );
      s = b;
    }
    seg(s, W, 0, eave);
    return f;
  }
  // south front on the street: wide middle entrance
  const fs = wall("s", [[9, 15, 3.7]]);
  const fw = wall("w", [[8, 12, 3.3]]); // lane side
  const fe = wall("e", [[5, 9, 3.3]]); // east alley side
  wall("n", [], { noOuter: true });
  // stepped front gable with the market sign
  const W = x1 - x0;
  B.fbox(fs, brick, 0, eave, -T / 2, W, eave + 1.5, 0, { skip: "bi" });
  B.fbox(fs, wallIn, 0, eave, -T, W, eave + 1.5, -T / 2, { skip: "bo" });
  B.fbox(fs, brick, 4, eave + 1.5, -T / 2, W - 4, eave + 2.7, 0, {
    skip: "b",
  });
  B.fbox(fs, brick, 8, eave + 2.7, -T / 2, W - 8, eave + 3.8, 0, {
    skip: "b",
  });
  for (const [a, b, y] of [
    [0, W, eave + 1.5],
    [4, W - 4, eave + 2.7],
    [8, W - 8, eave + 3.8],
  ])
    B.fbox(
      fs,
      M.trim(0xc9bea8),
      a - 0.1,
      y,
      -T / 2 - 0.06,
      b + 0.1,
      y + 0.16,
      0.12,
      { skip: "" },
    );
  for (const s of [0.2, 4, 8.6, 15.4, 20, W - 0.2])
    B.fbox(fs, M.trim(0xc9bea8), s - 0.28, 0, 0, s + 0.28, eave + 1.5, 0.14, {
      skip: "bi",
    });
  const face = signs.neon({
    text: "金龍街市",
    sub: "GOLDEN DRAGON MARKET",
    w: 7.6,
    h: 1.9,
    color: "#ff2a4f",
    trim: "#35f0c8",
  });
  B.fbox(fs, M.steel, 8.1, eave + 0.55, 0, 15.9, eave + 2.6, 0.2, {
    skip: "i",
  });
  B.fquad(
    fs,
    signs.mats.neon,
    8.2,
    eave + 0.62,
    15.8,
    eave + 2.52,
    0.208,
    face.uv,
  );
  B.emit(fs, 12, eave - 0.6, 1.6, 0xff2a4f, 2.6, 14);
  ctx.glints.push({
    pos: B.P(fs, 12, eave + 1.5, 0.3),
    color: "#ff2a4f",
    size: 5,
  });
  // shuttered lock-ups either side of the entrance
  for (const [a, b] of [
    [0.7, 3.6],
    [4.5, 8.2],
    [15.8, 19.5],
    [20.4, 23.3],
  ]) {
    B.fquad(
      fs,
      rnd() < 0.5 ? M.shutterRust : M.shutter(0x6a7a70),
      a,
      K,
      b,
      3.0,
      0.02,
    );
    B.fbox(fs, M.steel, a - 0.05, 3.0, 0, b + 0.05, 3.3, 0.1, { skip: "i" });
    if (rnd() < 0.7) B.notice(fs, a + 0.3 + rnd() * (b - a - 1), 1.3, 0.03);
    const bd = signs.board({
      text: pick(["鮮魚", "蔬菜", "生果", "鮮肉", "豆腐", "雜貨"]),
      w: b - a,
      h: 0.7,
    });
    B.fquad(fs, signs.mats.board, a, 3.4, b, 4.1, 0.03, bd.uv);
  }
  // high windows on the long sides
  for (const [f, len] of [
    [fw, z1 - z0],
    [fe, z1 - z0],
  ])
    for (let s = 2.2; s < len - 2; s += 3.6) {
      B.fquad(
        f,
        signs.mats.glass,
        s,
        3.9,
        s + 2.2,
        4.8,
        0.012,
        signs.windows[7],
      );
      B.fbox(f, M.steel, s - 0.05, 3.85, 0, s + 2.25, 3.9, 0.06, {
        skip: "i",
      });
      B.fbox(f, M.steel, s - 0.05, 4.8, 0, s + 2.25, 4.85, 0.06, {
        skip: "i",
      });
      for (let k = 0; k < 4; k++)
        B.fbox(
          f,
          M.steel,
          s + k * 0.733 - 0.02,
          3.9,
          0,
          s + k * 0.733 + 0.02,
          4.8,
          0.04,
          { skip: "i" },
        );
    }
  // signs over the side entrances
  for (const [f, a, b] of [
    [fw, 8, 12],
    [fe, 5, 9],
  ]) {
    const bx = signs.neon({
      text: "街市",
      sub: "MARKET",
      w: 2.6,
      h: 0.8,
      style: "box",
      color: "#0a6a3a",
      face: "#f4f7ff",
    });
    B.fbox(
      f,
      M.steel,
      (a + b) / 2 - 1.35,
      3.7,
      0,
      (a + b) / 2 + 1.35,
      4.6,
      0.16,
      { skip: "i" },
    );
    B.fquad(
      f,
      signs.mats.neon,
      (a + b) / 2 - 1.3,
      3.75,
      (a + b) / 2 + 1.3,
      4.55,
      0.168,
      bx.uv,
    );
    B.emit(f, (a + b) / 2, 3.2, 1.0, 0xd8ffe8, 1.4, 8);
  }

  // roof: two corrugated slopes, skylight strips, steel trusses
  const slope = (za, zb) => {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = x0 + ((x1 - x0) * i) / n,
        b = x0 + ((x1 - x0) * (i + 1)) / n;
      const sky = i === 1 || i === 4;
      const q0 = [a, eave, za],
        q1 = [b, eave, za],
        q2 = [b, ridge, zb],
        q3 = [a, ridge, zb];
      if (!sky) {
        if (za > zb) kit.quad(sheet, q0, q1, q2, q3);
        else kit.quad(sheet, q1, q0, q3, q2);
        continue;
      }
      // skylight in the middle third of this panel
      const mix = (p, q, t) => [
        p[0] + (q[0] - p[0]) * t,
        p[1] + (q[1] - p[1]) * t,
        p[2] + (q[2] - p[2]) * t,
      ];
      const band = (t0, t1, mat) => {
        const c0 = mix(q0, q3, t0),
          c1 = mix(q1, q2, t0),
          c2 = mix(q1, q2, t1),
          c3 = mix(q0, q3, t1);
        if (za > zb) kit.quad(mat, c0, c1, c2, c3);
        else kit.quad(mat, c1, c0, c3, c2);
      };
      band(0, 0.25, sheet);
      band(0.25, 0.75, skyPanel);
      band(0.75, 1, sheet);
    }
  };
  slope(z1, zr);
  slope(z0, zr);
  for (let x = x0 + 4; x < x1 - 1; x += 4) {
    kit.rod(steelI, [x, eave, z0 + 0.2], [x, eave, z1 - 0.2], 0.06, {
      seg: 6,
      cast: true,
    });
    kit.rod(steelI, [x, eave, z0 + 0.2], [x, ridge - 0.1, zr], 0.05, {
      seg: 6,
    });
    kit.rod(steelI, [x, eave, z1 - 0.2], [x, ridge - 0.1, zr], 0.05, {
      seg: 6,
    });
    kit.rod(steelI, [x, eave, zr], [x, ridge - 0.1, zr], 0.04, { seg: 6 });
    for (const s of [-1, 1])
      kit.rod(
        steelI,
        [x, eave, zr],
        [x, (eave + ridge) / 2, zr + s * (z1 - z0) * 0.25],
        0.035,
        { seg: 5 },
      );
  }
  kit.rod(steelI, [x0, ridge - 0.1, zr], [x1, ridge - 0.1, zr], 0.06, {
    seg: 6,
  });
  // gable ends
  for (const [x, flip] of [
    [x0, 1],
    [x1, -1],
  ]) {
    const a = [x, eave, z0],
      b = [x, eave, z1],
      c = [x, ridge, zr];
    const tri = new THREE.BufferGeometry();
    tri.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...a, ...b, ...c], 3),
    );
    tri.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(
        [-flip, 0, 0, -flip, 0, 0, -flip, 0, 0],
        3,
      ),
    );
    tri.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([z0, eave, z1, eave, zr, ridge], 2),
    );
    tri.setIndex(flip > 0 ? [0, 1, 2] : [0, 2, 1]);
    kit.add(sheet, tri, null, { cx: x, cz: zr });
  }
  kit.solid(x0, ridge - 0.4, z0, x1, ridge + 0.2, z1, "metal", {
    bulletOnly: true,
  });

  // columns
  const cols = [];
  for (const cx of [x0 + 6, x0 + 12, x0 + 18])
    for (const cz of [z0 + 6.5, z1 - 6.5]) {
      kit.box(conc, cx - 0.2, K, cz - 0.2, cx + 0.2, eave, cz + 0.2, {
        skip: "b",
      });
      kit.box(tile, cx - 0.22, K, cz - 0.22, cx + 0.22, K + 1.6, cz + 0.22, {
        skip: "b",
      });
      kit.solid(
        cx - 0.22,
        0,
        cz - 0.22,
        cx + 0.22,
        eave,
        cz + 0.22,
        "concrete",
      );
      cols.push([cx, cz]);
    }
  // strip lights along the aisles
  const tubeMat = kit.glow(0xd6ffe6, 3.2);
  const tubeRow = (xa, za, xb, zb, n) => {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = xa + (xb - xa) * t,
        z = za + (zb - za) * t;
      const alongX = Math.abs(xb - xa) > Math.abs(zb - za);
      const dead = rnd() < 0.16;
      kit.box(
        galvI,
        x - (alongX ? 0.62 : 0.07),
        4.05,
        z - (alongX ? 0.07 : 0.62),
        x + (alongX ? 0.62 : 0.07),
        4.12,
        z + (alongX ? 0.07 : 0.62),
        { skip: "" },
      );
      if (!dead)
        kit.box(
          tubeMat,
          x - (alongX ? 0.58 : 0.025),
          4.0,
          z - (alongX ? 0.025 : 0.58),
          x + (alongX ? 0.58 : 0.025),
          4.05,
          z + (alongX ? 0.025 : 0.58),
          { skip: "" },
        );
      for (const d of [-0.5, 0.5])
        kit.rod(
          galvI,
          [x + (alongX ? d : 0), 4.12, z + (alongX ? 0 : d)],
          [x + (alongX ? d : 0), eave + 0.6, z + (alongX ? 0 : d)],
          0.006,
          { seg: 4 },
        );
      if (!dead && i % 2 === 0)
        ctx.emitters.push({
          pos: [x, 3.7, z],
          color: 0xd0ffe4,
          power: 1.5,
          range: 10,
          flicker: rnd() < 0.25 ? 2 : 0,
        });
    }
  };
  tubeRow(x0 + 12, z1 - 1, x0 + 12, z0 + 2, 6);
  tubeRow(x0 + 2, zr + 2, x1 - 2, zr + 2, 6);

  // stalls
  const counterMat = kit.pbr("tiles_white", {
    ...I,
    color: 0xcfd6cf,
    key: "ctr",
  });
  const steelTop = kit.game("steel_galv", I);
  const foam = kit.flat(0xe8ece8, {
    rough: 0.9,
    wet: "plaster",
    interior: true,
    key: "foam",
  });
  const ice = kit.flat(0xcfe6f2, {
    rough: 0.15,
    wet: "glazed",
    interior: true,
    key: "ice",
  });
  const meat = kit.flat(0x8a2a22, {
    rough: 0.45,
    wet: "glazed",
    interior: true,
    key: "meat",
  });
  const shade = kit.flat(0xc0241a, {
    rough: 0.5,
    side: true,
    interior: true,
    key: "shade",
  });
  const bulb = kit.glow(0xffb070, 5);
  const P = { interior: true, cast: false };
  function stall(cx, cz, len, alongX, kind) {
    const hx = alongX ? len / 2 : 0.45,
      hz = alongX ? 0.45 : len / 2;
    kit.box(counterMat, cx - hx, K, cz - hz, cx + hx, K + 0.86, cz + hz, {
      skip: "b",
    });
    kit.box(
      steelTop,
      cx - hx - 0.03,
      K + 0.86,
      cz - hz - 0.03,
      cx + hx + 0.03,
      K + 0.9,
      cz + hz + 0.03,
      { skip: "b" },
    );
    kit.solid(cx - hx, 0, cz - hz, cx + hx, K + 0.9, cz + hz, "concrete");
    const top = K + 0.9;
    const n = Math.max(2, Math.floor(len / 0.62));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      const px = cx + (alongX ? t * len * 0.9 : (rnd() - 0.5) * 0.25),
        pz = cz + (alongX ? (rnd() - 0.5) * 0.25 : t * len * 0.9);
      const yaw = (alongX ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.3;
      if (kind === "fish") {
        kit.box(
          foam,
          px - 0.26,
          top,
          pz - 0.2,
          px + 0.26,
          top + 0.2,
          pz + 0.2,
          { skip: "b" },
        );
        kit.box(
          ice,
          px - 0.23,
          top + 0.2,
          pz - 0.17,
          px + 0.23,
          top + 0.215,
          pz + 0.17,
          { skip: "b" },
        );
      } else if (kind === "meat") {
        if (i % 2)
          kit.box(
            kit.pbr("wood_planks", { ...I }),
            px - 0.24,
            top,
            pz - 0.2,
            px + 0.24,
            top + 0.09,
            pz + 0.2,
            { skip: "b" },
          );
        else
          kit.box(
            meat,
            px - 0.2,
            top,
            pz - 0.14,
            px + 0.2,
            top + 0.07,
            pz + 0.14,
            { skip: "b" },
          );
      } else {
        const r = rnd();
        if (r < 0.34) {
          kit.prop("plastic_crate_02", px, top, pz, { yaw, ...P });
          kit.prop(
            rnd() < 0.5 ? "food_pears_asian_01" : "bananas",
            px,
            top + 0.1,
            pz,
            { yaw: rnd() * 6, scale: 2.4, ...P },
          );
        } else if (r < 0.62) {
          kit.prop("wicker_basket_01", px, top, pz, {
            yaw,
            scale: 1.25,
            ...P,
          });
          kit.prop("bananas", px, top + 0.05, pz, {
            yaw: rnd() * 6,
            scale: 1.5,
            ...P,
          });
        } else if (r < 0.82)
          kit.prop("plastic_crate_02", px, top, pz, {
            yaw,
            scale: 0.8,
            ...P,
          });
        else kit.prop("cardboard_box_01", px, top, pz, { yaw, ...P });
      }
    }
    // red-shaded lamps over the counter
    const lamps = Math.max(1, Math.round(len / 1.9));
    for (let i = 0; i < lamps; i++) {
      const t = (i + 0.5) / lamps - 0.5;
      const lx = cx + (alongX ? t * len : 0),
        lz = cz + (alongX ? 0 : t * len);
      kit.rod(galvI, [lx, eave + 0.4, lz], [lx, 2.75, lz], 0.006, { seg: 4 });
      kit.cyl(shade, lx, 2.45, lz, 0.26, 0.3, {
        seg: 10,
        rTop: 0.06,
        open: true,
      });
      if (rnd() < 0.82) {
        kit.add(
          bulb,
          new THREE.SphereGeometry(0.06, 8, 6),
          kit.xform(lx, 2.47, lz),
        );
        if (i % 2 === 0)
          ctx.emitters.push({
            pos: [lx, 2.2, lz],
            color: kind === "meat" ? 0xff6a50 : 0xffb070,
            power: 1.0,
            range: 6,
          });
      }
    }
    if (kind === "meat") {
      // rail of hooks
      const ra = [
          cx - (alongX ? len / 2 : 0),
          2.15,
          cz - (alongX ? 0 : len / 2),
        ],
        rb = [cx + (alongX ? len / 2 : 0), 2.15, cz + (alongX ? 0 : len / 2)];
      kit.rod(galvI, ra, rb, 0.02, { seg: 6 });
      for (let i = 0; i < len / 0.55; i++) {
        const t = (i + 0.5) / (len / 0.55);
        const hx2 = ra[0] + (rb[0] - ra[0]) * t,
          hz2 = ra[2] + (rb[2] - ra[2]) * t;
        kit.rod(galvI, [hx2, 2.15, hz2], [hx2, 1.95, hz2], 0.006, { seg: 4 });
        if (rnd() < 0.65)
          kit.box(
            meat,
            hx2 - 0.09,
            1.35 + rnd() * 0.2,
            hz2 - 0.06,
            hx2 + 0.09,
            1.95,
            hz2 + 0.06,
            { skip: "" },
          );
      }
    }
  }
  // four quarters around the cross of aisles
  stall(x0 + 3.2, z1 - 5, 5, false, "veg");
  stall(x0 + 7.4, z1 - 5.2, 4.6, false, "fruit");
  stall(x0 + 16.6, z1 - 5.2, 4.6, false, "veg");
  stall(x0 + 20.8, z1 - 5, 5, false, "fish");
  stall(x0 + 4.6, z0 + 3.2, 6.4, true, "meat");
  stall(x0 + 5.2, z0 + 7.2, 5.2, true, "fish");
  stall(x0 + 19, z0 + 3.2, 6.4, true, "veg");
  stall(x0 + 18.6, z0 + 7.2, 5.2, true, "fruit");
  stall(x0 + 2.2, z0 + 11, 2.6, false, "veg");
  stall(x1 - 2.2, z1 - 11.5, 2.6, false, "meat");
  // clutter on the floor
  const scatter = [
    ["plastic_crate_02", x0 + 9.6, z1 - 3.2],
    ["plastic_crate_02", x0 + 10.1, z1 - 2.6],
    ["cardboard_box_01", x0 + 14.4, z1 - 3.4],
    ["hand_truck", x0 + 15, z1 - 7.5],
    ["plastic_container", x0 + 9.5, z0 + 9.6],
    ["metal_stool_02", x0 + 5.2, z0 + 5.2],
    ["plastic_monobloc_chair_01", x0 + 21.6, z0 + 5.2],
    ["WetFloorSign_01", x0 + 12.6, zr + 0.6],
    ["plastic_crate_02", x1 - 3.4, z0 + 12],
    ["cardboard_box_01", x1 - 4.2, z0 + 12.6],
    ["trashbag", x0 + 1.2, z0 + 1.2],
    ["trashbag", x0 + 1.9, z0 + 1.5],
    ["wicker_basket_01", x0 + 16.2, z0 + 9.6],
  ];
  for (const [id, px, pz] of scatter)
    kit.prop(id, px, K, pz, {
      yaw: rnd() * 6,
      interior: true,
      collide: id === "hand_truck",
    });
  for (const [px, pz, k] of [
    [x0 + 12.5, z1 - 3, "pool"],
    [x0 + 12.2, zr + 3, "smear"],
    [x0 + 6.5, z0 + 5, "pool"],
    [x1 - 6, zr - 1, "smear"],
  ])
    blood(px, K + 0.004, pz, 1.6 + rnd(), k);
  return { box: { min: [x0, 0, z0], max: [x1, ridge, z1] } };
}
