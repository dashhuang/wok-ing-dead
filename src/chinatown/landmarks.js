// The set pieces: paifang gate, wet market hall, temple compound, quarantine checkpoint,
// the three evac sirens, plus the shared helpers for lanterns and the game's own props.
import * as THREE from "three";

const UV01 = [0, 0, 1, 1];

export function buildLandmarks(ctx, PLAN) {
  const { kit, signs, B, G } = ctx;
  const { rnd, pick } = kit;
  const K = PLAN.kerb;
  const M = B.M;
  const live = new THREE.Group(); // things that are not merged: animated or state-driven
  live.name = "ct-live";
  ctx.root.add(live);
  ctx.live = live;
  const gameStatic = new THREE.Group(); // the game's own props: merged by its mesh merger at the end

  const stone = kit.pbr("marble", {
    color: 0xb9b2a4,
    key: "stone",
    macro: [0.12, 0.08, 0.6, 0.6],
  });
  const granite = kit.pbr("granite", { macro: [0.12, 0.08, 0.4, 0.5] });
  const gold = kit.flat(0xd9a93a, {
    rough: 0.32,
    metal: 0.9,
    wet: "glazed",
    key: "gold",
  });
  const bronze = kit.flat(0x5a4a34, {
    rough: 0.45,
    metal: 0.85,
    wet: "glazed",
    key: "bronze",
  });
  const redWall = kit.pbr("plaster_worn", {
    color: 0xb5382a,
    key: "redwall",
    macro: [0.14, 0.08, 0.3, 0.6],
  });
  const olive = kit.flat(0x4a5238, {
    rough: 0.85,
    wet: [0.25, 0.7, 0.4, 0.4],
    side: true,
    key: "olive",
  });
  const hazard = kit.game("hazard_stripes");
  G.camera.layers.enable(2); // layer 2: drawn in the main view, skipped by the reflection pass

  // ---------------- the game's own props, merged into the static batch ----------------
  const _box = new THREE.Box3();
  ctx.gameProp = function gameProp(name, x, y, z, yaw = 0, opts = {}, o = {}) {
    let obj;
    try {
      obj = G.props.build(name, opts);
    } catch (err) {
      console.warn("[chinatown] prop failed", name, err);
      return null;
    }
    obj.position.set(x, y, z);
    obj.rotation.y = yaw;
    obj.updateMatrixWorld(true);
    const liveOnly = typeof obj.userData.update === "function" || o.live;
    obj.traverse((c) => {
      if (c.isMesh) {
        c.castShadow =
          !Array.isArray(c.material) &&
          !c.material.transparent &&
          !c.material.isMeshBasicMaterial;
        c.receiveShadow =
          !Array.isArray(c.material) && !c.material.isMeshBasicMaterial;
      }
    });
    if (!liveOnly) gameStatic.add(obj);
    else {
      obj.traverse((c) => {
        if (c.isMesh) {
          c.castShadow =
            !c.material.transparent && !c.material.isMeshBasicMaterial;
          c.receiveShadow = !c.material.isMeshBasicMaterial;
        }
      });
      live.add(obj);
      if (typeof obj.userData.update === "function")
        ctx.updaters.push((dt) => obj.userData.update(dt));
    }
    if (o.collide !== false)
      for (const col of obj.userData.colliders || []) {
        _box.min.set(col.min[0], col.min[1], col.min[2]);
        _box.max.set(col.max[0], col.max[1], col.max[2]);
        _box.applyMatrix4(obj.matrixWorld);
        if (_box.max.y - _box.min.y < 0.2 && _box.max.y < 0.3) continue;
        const shrink = Math.abs(Math.sin(2 * yaw)) > 0.2 ? 0.08 : 0;
        const sx = (_box.max.x - _box.min.x) * shrink,
          sz = (_box.max.z - _box.min.z) * shrink;
        G.physics.addBox(
          [_box.min.x + sx, _box.min.y, _box.min.z + sz],
          [_box.max.x - sx, _box.max.y, _box.max.z - sz],
          { surface: col.surface || "metal" },
        );
      }
    return obj;
  };

  // ---------------- lanterns ----------------
  const lanterns = [];
  // A lantern hangs from (x, y, z) on a short cord; r is its radius.
  ctx.lantern = (x, y, z, r = 0.3, cord = 0.25) =>
    lanterns.push({ x, y, z, r, cord, phase: rnd() * 40 });
  // A string of lanterns between two points, with its cable and one light for the lot.
  ctx.lanternString = (a, b, n, sag = 0.9, r = 0.3, light = true) => {
    kit.cable(M.acDark, a, b, sag, 0.012, 14);
    for (let i = 0; i < n; i++) {
      const t = 0.1 + (0.8 * (i + 0.5)) / n;
      const p = kit.cablePoint(a, b, sag, t);
      ctx.lantern(p[0], p[1], p[2], r, 0.18);
    }
    if (light) {
      const c = kit.cablePoint(a, b, sag, 0.5);
      ctx.emitters.push({
        pos: [c[0], c[1] - 0.7, c[2]],
        color: 0xff5a2a,
        power: 1.5,
        range: 10,
      });
    }
  };
  function finalizeLanterns() {
    if (!lanterns.length) return;
    // glowing paper: hot band round the middle, deep red toward the caps, ribs
    const cv = document.createElement("canvas");
    cv.width = 128;
    cv.height = 128;
    const c = cv.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#5a0603");
    g.addColorStop(0.3, "#e5260c");
    g.addColorStop(0.5, "#ff7a2a");
    g.addColorStop(0.7, "#e5260c");
    g.addColorStop(1, "#5a0603");
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 16; i++) {
      c.fillStyle = "rgba(60,0,0,0.38)";
      c.fillRect(i * 8, 0, 1.5, 128);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    const bodyMat = kit.glowMap(tex, 2.4);
    const body = new THREE.SphereGeometry(1, 14, 9);
    body.scale(1, 0.8, 1);
    // caps, hanging loop and tassel in one piece
    const parts = [];
    const cap = (y, r, h) => {
      const geo = new THREE.CylinderGeometry(r, r, h, 10);
      geo.translate(0, y, 0);
      parts.push(geo);
    };
    cap(0.8, 0.42, 0.14);
    cap(-0.8, 0.42, 0.14);
    cap(-1.25, 0.06, 0.8);
    cap(-1.7, 0.1, 0.26);
    const trimGeo = mergeSimple(parts);
    const trimMat = kit.flat(0xd9a93a, {
      rough: 0.4,
      metal: 0.8,
      wet: "glazed",
      key: "gold",
    });
    const n = lanterns.length;
    const bodies = new THREE.InstancedMesh(body, bodyMat, n);
    const trims = new THREE.InstancedMesh(trimGeo, trimMat, n);
    bodies.frustumCulled = trims.frustumCulled = false;
    trims.castShadow = true;
    live.add(bodies, trims);
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler(),
      s = new THREE.Vector3(),
      p = new THREE.Vector3(),
      off = new THREE.Vector3();
    let t = 0;
    const place = () => {
      for (let i = 0; i < n; i++) {
        const l = lanterns[i];
        const ax =
          Math.sin(t * 1.25 + l.phase) * 0.09 +
          Math.sin(t * 2.9 + l.phase * 1.7) * 0.03;
        const az = Math.sin(t * 0.95 + l.phase * 2.3) * 0.07;
        q.setFromEuler(e.set(ax, 0, az));
        off.set(0, -(l.cord + l.r * 0.8), 0).applyQuaternion(q);
        m.compose(
          p.set(l.x + off.x, l.y + off.y, l.z + off.z),
          q,
          s.set(l.r, l.r, l.r),
        );
        bodies.setMatrixAt(i, m);
        trims.setMatrixAt(i, m);
      }
      bodies.instanceMatrix.needsUpdate =
        trims.instanceMatrix.needsUpdate = true;
    };
    place();
    ctx.updaters.push((dt) => {
      t += dt;
      place();
    });
  }
  function mergeSimple(geos) {
    const pos = [],
      nrm = [],
      uv = [],
      idx = [];
    for (const g of geos) {
      const o = pos.length / 3;
      pos.push(...g.attributes.position.array);
      nrm.push(...g.attributes.normal.array);
      uv.push(...g.attributes.uv.array);
      for (let i = 0; i < g.index.count; i++) idx.push(o + g.index.getX(i));
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    out.setIndex(idx);
    return out;
  }

  // ---------------- shared bits ----------------
  // two-sided plaque standing in a wall plane of constant x
  function plaqueX(x, z0, z1, y0, y1, spec, th = 0.12) {
    const b = signs.board({ w: z1 - z0, h: y1 - y0, ...spec });
    kit.box(
      M.woodDark,
      x - th / 2,
      y0 - 0.06,
      z0 - 0.06,
      x + th / 2,
      y1 + 0.06,
      z1 + 0.06,
      { skip: "" },
    );
    const fw = B.frame("w", x - th / 2 - 0.006, z0, x + th / 2 + 0.006, z1);
    const fe = B.frame("e", x - th / 2 - 0.006, z0, x + th / 2 + 0.006, z1);
    B.fquad(fw, signs.mats.board, 0, y0, z1 - z0, y1, 0, b.uv);
    B.fquad(fe, signs.mats.board, 0, y0, z1 - z0, y1, 0, b.uv);
  }
  // bracket course under a Chinese roof: stepped blocks in alternating colours
  const dou = [
    kit.flat(0x1c6a8a, { rough: 0.6, key: "dou" }),
    kit.flat(0x1f7a4a, { rough: 0.6, key: "dou" }),
    kit.flat(0xb8322a, { rough: 0.6, key: "dou" }),
  ];
  function brackets(f, s0, s1, y, depth = 0.5) {
    const n = Math.max(2, Math.round((s1 - s0) / 0.55));
    for (let i = 0; i < n; i++) {
      const s = s0 + ((s1 - s0) * (i + 0.5)) / n;
      B.fbox(f, dou[i % 3], s - 0.13, y, 0, s + 0.13, y + 0.16, depth * 0.45, {
        skip: "i",
      });
      B.fbox(
        f,
        dou[(i + 1) % 3],
        s - 0.19,
        y + 0.16,
        0,
        s + 0.19,
        y + 0.32,
        depth * 0.75,
        { skip: "i" },
      );
      B.fbox(f, gold, s - 0.07, y + 0.32, 0, s + 0.07, y + 0.4, depth, {
        skip: "i",
      });
    }
  }
  function column(x, z, r, h, base = 0) {
    kit.box(
      stone,
      x - r - 0.22,
      base,
      z - r - 0.22,
      x + r + 0.22,
      base + 0.34,
      z + r + 0.22,
    );
    kit.cyl(stone, x, base + 0.34, z, r + 0.14, 0.42, {
      seg: 14,
      rTop: r + 0.04,
    });
    kit.cyl(M.lacquer, x, base + 0.76, z, r, h - 0.76, { seg: 16 });
    kit.cyl(gold, x, base + h - 0.5, z, r + 0.02, 0.12, {
      seg: 16,
      open: true,
    });
    kit.cyl(gold, x, base + 1.0, z, r + 0.02, 0.08, { seg: 16, open: true });
  }

  // ================= PAIFANG =================
  function paifang() {
    const x = PLAN.gateX;
    const zs = [-0.35, 2.25, 9.75, 12.35];
    const tall = 8.9,
      low = 6.6,
      r = 0.4;
    [low, tall, tall, low].forEach((h, i) => {
      column(x, zs[i], r, h);
      kit.solid(
        x - 0.62,
        0,
        zs[i] - 0.62,
        x + 0.62,
        h,
        zs[i] + 0.62,
        "concrete",
      );
    });
    const th = 0.5;
    const fw = (z0, z1) => B.frame("w", x - th / 2, z0, x + th / 2, z1);
    const fe = (z0, z1) => B.frame("e", x - th / 2, z0, x + th / 2, z1);
    const beam = (z0, z1, y0, y1, pattern) => {
      kit.box(M.lacquer, x - th / 2, y0, z0, x + th / 2, y1, z1, { skip: "" });
      if (!pattern) return;
      const p = signs.beamPattern(z1 - z0, y1 - y0);
      B.fquad(
        fw(z0, z1),
        signs.mats.board,
        0,
        y0 + 0.03,
        z1 - z0,
        y1 - 0.03,
        0.006,
        p.uv,
      );
      B.fquad(
        fe(z0, z1),
        signs.mats.board,
        0,
        y0 + 0.03,
        z1 - z0,
        y1 - 0.03,
        0.006,
        p.uv,
      );
    };
    const roof = (z0, z1, y, depth, rise, lift) => {
      for (const f of [fw(z0, z1), fe(z0, z1)]) {
        brackets(f, 0.1, z1 - z0 - 0.1, y - 0.42, 0.55);
        B.eaveRoof(f, -0.9, z1 - z0 + 0.9, y, depth, M.tileGreen, rise, {
          back: -th / 2,
          lift,
          ridge: false,
        });
      }
      // ridge with turned-up ends and a pearl
      kit.rod(
        M.tileGold,
        [x, y + rise + 0.08, z0 - 0.7],
        [x, y + rise + 0.08, z1 + 0.7],
        0.15,
        { seg: 8, cast: true },
      );
      for (const [z, s] of [
        [z0 - 0.7, -1],
        [z1 + 0.7, 1],
      ]) {
        kit.rod(
          gold,
          [x, y + rise + 0.08, z],
          [x, y + rise + 0.6, z + s * 0.45],
          0.11,
          { seg: 7, cast: true },
        );
        kit.rod(
          gold,
          [x, y + rise + 0.6, z + s * 0.45],
          [x, y + rise + 0.95, z + s * 0.3],
          0.07,
          { seg: 6 },
        );
      }
    };
    // centre bay
    beam(zs[1], zs[2], 6.0, 6.55, true);
    beam(zs[1], zs[2], 7.75, 8.3, true);
    kit.box(M.lacquer, x - 0.12, 6.55, zs[1], x + 0.12, 7.75, zs[2], {
      skip: "",
    });
    plaqueX(
      x,
      4.2,
      7.8,
      6.68,
      7.62,
      { text: "唐人街", bg: "#12325a", fg: "#f0cf6a" },
      0.34,
    );
    for (const z of [zs[1] + 0.9, zs[2] - 0.9])
      plaqueX(
        x,
        z - 0.42,
        z + 0.42,
        6.72,
        7.58,
        { text: z < 6 ? "忠孝" : "仁愛", vertical: true, bg: "#5c1410" },
        0.3,
      );
    roof(zs[1], zs[2], 8.75, 1.75, 1.0, 1.0);
    const pearl = new THREE.SphereGeometry(0.24, 12, 8);
    kit.add(gold, pearl, kit.xform(x, 10.1, 6));
    // side bays
    for (const [a, b] of [
      [zs[0], zs[1]],
      [zs[2], zs[3]],
    ]) {
      beam(a, b, 4.5, 5.0, true);
      beam(a, b, 5.8, 6.2, false);
      kit.box(M.lacquer, x - 0.1, 5.0, a, x + 0.1, 5.8, b, { skip: "" });
      plaqueX(
        x,
        (a + b) / 2 - 0.85,
        (a + b) / 2 + 0.85,
        5.08,
        5.72,
        { text: a < 6 ? "國泰民安" : "風調雨順", bg: "#143326" },
        0.26,
      );
      roof(a - 0.2, b + 0.2, 6.55, 1.35, 0.8, 0.8);
    }
    // couplets on the inner columns, facing both ways
    for (const z of [zs[1], zs[2]])
      for (const side of [-1, 1]) {
        const b = signs.board({
          text: z < 6 ? "四海昇平" : "萬福金安",
          w: 0.46,
          h: 2.6,
          vertical: true,
          bg: "#101010",
          fg: "#e9c46a",
        });
        const xx = x + side * (r + 0.03);
        const f = B.frame(
          side < 0 ? "w" : "e",
          xx - 0.01,
          z - 0.23,
          xx + 0.01,
          z + 0.23,
        );
        B.fquad(f, signs.mats.board, 0, 2.4, 0.46, 5.0, 0.012, b.uv);
      }
    // big lanterns under the main beam and the quarantine banner strung across
    for (const z of [3.9, 8.1]) ctx.lantern(x, 6.0, z, 0.55, 0.35);
    ctx.emitters.push({
      pos: [x - 1.2, 4.6, 6],
      color: 0xff5a2a,
      power: 2.2,
      range: 12,
    });
    ctx.emitters.push({
      pos: [x + 1.2, 4.6, 6],
      color: 0xff5a2a,
      power: 2.2,
      range: 12,
    });
    const ban = signs.board({
      text: "隔離區",
      sub: "QUARANTINE ZONE · NO ENTRY",
      w: 5.2,
      h: 1.0,
      bg: "#d9c21f",
      fg: "#141414",
      kai: false,
    });
    const fb = B.frame("w", x - 0.5, 3.4, x - 0.48, 8.6);
    B.fquad(fb, signs.mats.board, 0, 4.4, 5.2, 5.4, 0.02, ban.uv);
    B.fquadBack(fb, M.cloth(0xb9a51a), 0, 4.4, 5.2, 5.4, 0.012);
    for (const z of [3.4, 8.6])
      kit.rod(
        M.acDark,
        [x - 0.5, 5.4, z],
        [x, 6.0, z < 6 ? zs[1] : zs[2]],
        0.012,
      );
    // guardian lions
    for (const z of [0.9, 11.1]) {
      kit.box(stone, x - 2.3, K, z - 0.5, x - 1.3, K + 1.05, z + 0.5);
      kit.box(stone, x - 2.4, K, z - 0.6, x - 1.2, K + 0.22, z + 0.6);
      kit.prop("lion_head", x - 1.8, K + 1.05, z, {
        scale: 2.5,
        yaw: -Math.PI / 2,
      });
      kit.solid(x - 2.4, 0, z - 0.6, x - 1.2, 2.2, z + 0.6, "concrete");
    }
  }

  // ================= SIRENS =================
  function siren(x, y, z, o = {}) {
    const h = o.h || 5.6;
    const g = new THREE.Group();
    const mesh = (geo, mat, px, py, pz) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      m.castShadow = !mat.isMeshBasicMaterial;
      m.receiveShadow = !mat.isMeshBasicMaterial;
      g.add(m);
      return m;
    };
    const steel = kit.game("steel_galv"),
      dark = kit.game("steel_dark"),
      yellow = kit.game("paint_yellow");
    mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 10), steel, 0, h / 2, 0);
    mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.22, 10), dark, 0, 0.11, 0);
    // twin horns
    for (const s of [-1, 1]) {
      const horn = mesh(
        new THREE.CylinderGeometry(0.36, 0.09, 0.62, 14, 1, true),
        yellow,
        s * 0.42,
        h - 0.25,
        0,
      );
      horn.rotation.z = (s * Math.PI) / 2;
      horn.material.side = THREE.DoubleSide;
    }
    mesh(new THREE.BoxGeometry(0.34, 0.3, 0.3), dark, 0, h - 0.25, 0);
    // beacon
    const lampOn = kit.glow(0xff2a10, 7),
      lampOff = kit.flat(0x3a0a06, { rough: 0.3, key: "lampoff" });
    const beacon = mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.2, 10),
      lampOn,
      0,
      h + 0.18,
      0,
    );
    // control box with a status lamp
    mesh(new THREE.BoxGeometry(0.46, 0.62, 0.24), yellow, 0, 1.25, 0.16);
    mesh(new THREE.BoxGeometry(0.5, 0.06, 0.28), dark, 0, 1.58, 0.16);
    const lever = mesh(
      new THREE.BoxGeometry(0.05, 0.26, 0.05),
      dark,
      0.12,
      1.3,
      0.3,
    );
    const ledOn = kit.glow(0x4dff6a, 5),
      ledWarn = kit.glow(0xffb020, 6),
      ledOff = kit.flat(0x101010, { rough: 0.5, key: "ledoff" });
    const led = mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      ledOn,
      -0.12,
      1.42,
      0.29,
    );
    g.position.set(x, y, z);
    g.rotation.y = o.yaw || 0;
    live.add(g);
    kit.solid(x - 0.28, y, z - 0.28, x + 0.28, y + 2.2, z + 0.28, "metal");
    const light = {
      pos: [x, y + h + 0.4, z],
      color: 0xff2a10,
      power: 2.6,
      range: 14,
      dynamic: true,
    };
    ctx.emitters.push(light);
    let state = "live",
      t = rnd() * 6;
    g.userData.setState = (s) => {
      state = s;
      beacon.material = s === "cut" ? lampOff : lampOn;
      led.material = s === "cut" ? ledOff : s === "cutting" ? ledWarn : ledOn;
      lever.rotation.x = s === "cut" ? 1.1 : s === "cutting" ? 0.5 : 0;
      light.off = s === "cut";
    };
    ctx.updaters.push((dt) => {
      t += dt;
      if (state === "cut") return;
      // rotating beacon: the light sweeps, quicker and unsteady while the box is being cut
      const w = state === "cutting" ? 11 : 4.2;
      light.gain = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * w), 3);
      beacon.rotation.y = t * w;
      if (state === "cutting") led.visible = Math.sin(t * 30) > 0;
      else led.visible = true;
    });
    return { x, y, z, object: g };
  }

  // ================= WET MARKET =================
  function market() {
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
        if (!o.noOuter)
          B.fbox(f, brick, a, y0, -T / 2, b, y1, 0, { skip: "bi" });
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
  // blood on the ground
  function blood(x, y, z, size, kind = "pool") {
    const uv = pick(signs.decals[kind]);
    const h = size / 2,
      a = rnd() * 6.28,
      c = Math.cos(a) * h,
      s = Math.sin(a) * h;
    kit.quad(
      signs.mats.blood,
      [x - c + s, y, z - s - c],
      [x - c - s, y, z - s + c],
      [x + c - s, y, z + s + c],
      [x + c + s, y, z + s - c],
      [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]],
    );
  }
  ctx.blood = blood;

  // ================= TEMPLE =================
  function temple() {
    const t = PLAN.temple;
    const { x0, z0, x1, z1 } = t;
    const wallH = 3.1,
      T = 0.45;
    const gx0 = 18.2,
      gx1 = 25.8; // gatehouse
    // courtyard paving
    kit.box(granite, x0 + T, 0, z0 + T, x1, K, 23.4, { skip: "b" });
    kit.solid(x0 + T, -0.2, z0 + T, x1, K, 23.4, "concrete");
    // compound wall with a tiled coping
    function compoundWall(ax, az, bx, bz) {
      const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
      const wx0 = Math.min(ax, bx) - (alongX ? 0 : T / 2),
        wx1 = Math.max(ax, bx) + (alongX ? 0 : T / 2);
      const wz0 = Math.min(az, bz) - (alongX ? T / 2 : 0),
        wz1 = Math.max(az, bz) + (alongX ? T / 2 : 0);
      kit.box(stone, wx0 - 0.04, 0, wz0 - 0.04, wx1 + 0.04, 0.55, wz1 + 0.04, {
        skip: "b",
      });
      kit.box(redWall, wx0, 0.55, wz0, wx1, wallH, wz1, { skip: "b" });
      kit.solid(wx0, 0, wz0, wx1, wallH + 0.5, wz1, "concrete");
      const sides = alongX ? ["n", "s"] : ["w", "e"];
      for (const sd of sides) {
        const f = B.frame(sd, wx0, wz0, wx1, wz1);
        B.eaveRoof(f, -0.05, f.len + 0.05, wallH, 0.34, M.tileGreen, 0.36, {
          back: -T / 2,
          lift: 0.12,
          ridge: false,
        });
      }
      const len = alongX ? wx1 - wx0 : wz1 - wz0;
      kit.rod(
        M.tileGold,
        alongX
          ? [wx0, wallH + 0.42, (wz0 + wz1) / 2]
          : [(wx0 + wx1) / 2, wallH + 0.42, wz0],
        alongX
          ? [wx1, wallH + 0.42, (wz0 + wz1) / 2]
          : [(wx0 + wx1) / 2, wallH + 0.42, wz1],
        0.09,
        { seg: 7, cast: true },
      );
      // ornamental lattice openings
      for (const sd of sides) {
        const f = B.frame(sd, wx0, wz0, wx1, wz1);
        for (let s = 2.2; s < len - 2.2; s += 3.8) {
          B.fbox(f, M.tileGreen, s - 0.62, 1.38, 0, s + 0.62, 2.42, 0.05, {
            skip: "i",
          });
          B.fquad(f, M.void, s - 0.5, 1.5, s + 0.5, 2.3, 0.055);
          B.fquad(
            f,
            signs.mats.lattice,
            s - 0.5,
            1.5,
            s + 0.5,
            2.3,
            0.07,
            signs.decals.lattice,
          );
        }
      }
    }
    compoundWall(x0, z0 + T / 2, gx0, z0 + T / 2);
    compoundWall(gx1, z0 + T / 2, x1, z0 + T / 2);
    compoundWall(x0 + T / 2, z0 + T, x0 + T / 2, 19.4);
    compoundWall(x0 + T / 2, 22, x0 + T / 2, z1);
    // side doorway on the lane: plain red posts and a lintel
    for (const z of [19.4, 22])
      kit.box(M.lacquer, x0, 0, z - 0.14, x0 + T, wallH + 0.3, z + 0.14, {
        skip: "b",
      });
    kit.box(M.lacquer, x0, 2.6, 19.4, x0 + T, wallH + 0.3, 22, { skip: "" });
    kit.solid(x0, 2.6, 19.4, x0 + T, wallH + 0.5, 22, "concrete");
    for (const sd of ["w", "e"]) {
      const f = B.frame(sd, x0, 19.2, x0 + T, 22.2);
      B.eaveRoof(f, -0.3, f.len + 0.3, wallH + 0.3, 0.6, M.tileGreen, 0.5, {
        back: -T / 2,
        lift: 0.3,
        ridge: false,
      });
    }
    ctx.lantern(x0 - 0.35, 2.9, 19.9, 0.24, 0.12);
    ctx.lantern(x0 - 0.35, 2.9, 21.5, 0.24, 0.12);
    ctx.emitters.push({
      pos: [x0 - 0.8, 2.3, 20.7],
      color: 0xff5a2a,
      power: 1.2,
      range: 7,
    });

    // gatehouse on the street
    const gz = z0 + T / 2;
    for (const gx of [gx0, gx1]) {
      column(gx, gz, 0.32, 5.4);
      kit.solid(gx - 0.5, 0, gz - 0.5, gx + 0.5, 5.4, gz + 0.5, "concrete");
    }
    for (const gx of [gx0 + 1.9, gx1 - 1.9]) {
      column(gx, gz, 0.26, 5.4);
      kit.solid(gx - 0.4, 0, gz - 0.4, gx + 0.4, 5.4, gz + 0.4, "concrete");
      // open door leaves, swung into the courtyard
      const s = gx < 22 ? 1 : -1;
      kit.box(
        M.lacquer,
        gx + s * 0.3,
        K,
        gz + 0.2,
        gx + s * 0.42,
        3.5,
        gz + 1.9,
        { skip: "b" },
      );
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 3; j++)
          kit.add(
            gold,
            new THREE.SphereGeometry(0.045, 6, 5),
            kit.xform(gx + s * 0.44, 0.8 + i * 0.6, gz + 0.5 + j * 0.55),
          );
      kit.solid(
        gx + s * 0.28,
        0,
        gz + 0.2,
        gx + s * 0.44,
        3.5,
        gz + 1.9,
        "wood",
      );
    }
    for (const [a, b] of [
      [gx0, gx0 + 1.9],
      [gx1 - 1.9, gx1],
    ]) {
      kit.box(redWall, a + 0.25, 0, gz - 0.2, b - 0.25, 3.6, gz + 0.2, {
        skip: "b",
      });
      kit.solid(a, 0, gz - 0.2, b, 4, gz + 0.2, "concrete");
    }
    const gf = {
      n: B.frame("n", gx0, gz - 0.25, gx1, gz + 0.25),
      s: B.frame("s", gx0, gz - 0.25, gx1, gz + 0.25),
    };
    kit.box(M.lacquer, gx0, 3.6, gz - 0.25, gx1, 4.1, gz + 0.25, { skip: "" });
    kit.box(M.lacquer, gx0, 4.85, gz - 0.25, gx1, 5.3, gz + 0.25, { skip: "" });
    kit.box(M.lacquer, gx0, 4.1, gz - 0.1, gx1, 4.85, gz + 0.1, { skip: "" });
    for (const sd of ["n", "s"]) {
      const p = signs.beamPattern(gx1 - gx0, 0.5);
      B.fquad(gf[sd], signs.mats.board, 0, 3.62, gx1 - gx0, 4.08, 0.006, p.uv);
      brackets(gf[sd], 0.1, gx1 - gx0 - 0.1, 5.3, 0.5);
      B.eaveRoof(gf[sd], -1.0, gx1 - gx0 + 1.0, 5.72, 1.6, M.tileGold, 1.0, {
        back: -0.25,
        lift: 0.9,
        ridge: false,
      });
      const pl = signs.board({
        text: "關帝廟",
        w: 2.6,
        h: 0.72,
        bg: "#12325a",
        fg: "#f0cf6a",
      });
      B.fbox(
        gf[sd],
        M.woodDark,
        (gx1 - gx0) / 2 - 1.36,
        4.1,
        0,
        (gx1 - gx0) / 2 + 1.36,
        4.86,
        0.07,
        { skip: "i" },
      );
      B.fquad(
        gf[sd],
        signs.mats.board,
        (gx1 - gx0) / 2 - 1.3,
        4.12,
        (gx1 - gx0) / 2 + 1.3,
        4.84,
        0.078,
        pl.uv,
      );
    }
    kit.rod(M.tileGreen, [gx0 - 0.9, 6.82, gz], [gx1 + 0.9, 6.82, gz], 0.15, {
      seg: 8,
      cast: true,
    });
    for (const [gx, s] of [
      [gx0 - 0.9, -1],
      [gx1 + 0.9, 1],
    ])
      kit.rod(gold, [gx, 6.82, gz], [gx + s * 0.4, 7.4, gz], 0.1, {
        seg: 7,
        cast: true,
      });
    for (const gx of [gx0 + 1.0, gx1 - 1.0])
      ctx.lantern(gx, 3.55, gz - 0.45, 0.42, 0.2);
    ctx.emitters.push({
      pos: [22, 3.0, gz - 1.4],
      color: 0xff5a2a,
      power: 2.0,
      range: 11,
    });
    for (const gx of [gx0 - 1.3, gx1 + 1.3]) {
      kit.box(stone, gx - 0.5, K, gz - 1.9, gx + 0.5, K + 1.0, gz - 0.9);
      kit.prop("lion_head", gx, K + 1.0, gz - 1.4, {
        scale: 2.3,
        yaw: Math.PI,
      });
      kit.solid(gx - 0.5, 0, gz - 1.9, gx + 0.5, 2.1, gz - 0.9, "concrete");
    }

    // main hall on a low platform at the south end
    const hx0 = 10.5,
      hx1 = 31.5,
      pz = 22.2,
      wz = 25.4,
      py = 0.45;
    kit.box(stone, hx0, 0, pz + 0.6, hx1, py, z1, { skip: "b" });
    kit.box(stone, hx0 + 0.3, 0, pz + 0.3, hx1 - 0.3, 0.3, pz + 0.6, {
      skip: "b",
    });
    kit.solid(hx0, -0.2, pz + 0.6, hx1, py, z1, "concrete");
    kit.solid(hx0 + 0.3, -0.2, pz + 0.3, hx1 - 0.3, 0.3, pz + 0.6, "concrete");
    const hf = B.frame("n", hx0, wz, hx1, z1);
    const HW = hx1 - hx0;
    // front wall: red, three door bays; the middle one stands open on the altar
    const bays = [
      [3.2, 6.4],
      [8.9, 12.1],
      [14.6, 17.8],
    ];
    let s = 0;
    for (const [a, b] of bays) {
      B.fbox(hf, redWall, s, py, -0.4, a, 5.0, 0, { skip: "bi" });
      B.fbox(hf, redWall, a, 3.5, -0.4, b, 5.0, 0, { skip: "i" });
      s = b;
    }
    B.fbox(hf, redWall, s, py, -0.4, HW, 5.0, 0, { skip: "bi" });
    kit.solid(hx0, 0, wz, hx1, 9, z1, "concrete");
    for (const [a, b] of [bays[0], bays[2]]) {
      B.fquad(hf, M.lacquer, a, py, b, 3.5, -0.1);
      B.fquad(
        hf,
        signs.mats.lattice,
        a + 0.08,
        py + 1.2,
        b - 0.08,
        3.4,
        -0.06,
        signs.decals.lattice,
      );
      B.fquad(
        hf,
        signs.mats.glass,
        a + 0.08,
        py + 1.2,
        b - 0.08,
        3.4,
        -0.085,
        signs.windows[6],
      );
    }
    // the altar seen through the open door
    const [da, db] = bays[1];
    altar(hf, da, db, py);
    // porch
    const colX = [0.6, 4.8, 7.6, 13.4, 16.2, HW - 0.6];
    for (const cs of colX) {
      const p = B.P(hf, cs, 0, wz - pz - 0.95);
      column(p[0], p[2], 0.26, 4.75, py);
      kit.solid(
        p[0] - 0.36,
        0,
        p[2] - 0.36,
        p[0] + 0.36,
        5.2,
        p[2] + 0.36,
        "concrete",
      );
    }
    const pd = wz - pz - 0.95;
    B.fbox(hf, M.lacquer, 0.3, 4.55, pd - 0.16, HW - 0.3, 5.0, pd + 0.16, {
      skip: "",
    });
    const bp = signs.beamPattern(HW - 0.6, 0.45);
    B.fquad(hf, signs.mats.board, 0.3, 4.56, HW - 0.3, 4.99, pd + 0.166, bp.uv);
    brackets(hf, 0.4, HW - 0.4, 5.0, 0.6);
    for (let i = 0; i < colX.length - 1; i++) {
      const a = colX[i],
        b = colX[i + 1];
      B.fbox(hf, M.lacquer, a, 4.6, 0, a + 0.16, 4.95, pd, { skip: "" });
      void b;
    }
    // roof: long concave front slope over the porch, short back slope, gold ridge
    B.eaveRoof(hf, -1.6, HW + 1.6, 5.4, pd + 1.5, M.tileGold, 3.3, {
      back: -2.6,
      lift: 1.3,
      ridge: false,
    });
    const hb = B.frame("s", hx0, wz, hx1, z1);
    B.eaveRoof(hb, -1.6, HW + 1.6, 5.4, 0.3, M.tileGold, 3.3, {
      back: -(z1 - wz) + 2.6,
      lift: 0.4,
      ridge: false,
    });
    const ry = 8.78,
      rz = wz + 2.6;
    kit.rod(M.tileGreen, [hx0 - 1.6, ry, rz], [hx1 + 1.6, ry, rz], 0.22, {
      seg: 8,
      cast: true,
    });
    for (const [gx, sgn] of [
      [hx0 - 1.6, -1],
      [hx1 + 1.6, 1],
    ]) {
      kit.rod(gold, [gx, ry, rz], [gx + sgn * 0.7, ry + 0.9, rz], 0.16, {
        seg: 8,
        cast: true,
      });
      kit.rod(
        gold,
        [gx + sgn * 0.7, ry + 0.9, rz],
        [gx + sgn * 0.5, ry + 1.4, rz],
        0.09,
        { seg: 6 },
      );
    }
    kit.add(
      gold,
      new THREE.SphereGeometry(0.3, 12, 8),
      kit.xform((hx0 + hx1) / 2, ry + 0.45, rz),
    );
    // gable walls
    for (const gx of [hx0, hx1])
      kit.box(redWall, gx - 0.2, py, wz, gx + 0.2, 5.4, z1, { skip: "b" });
    // plaque, couplets, lanterns
    const pq = signs.board({
      text: "忠義千秋",
      w: 3.4,
      h: 0.9,
      bg: "#101010",
      fg: "#f0cf6a",
    });
    B.fbox(
      hf,
      M.woodDark,
      (da + db) / 2 - 1.78,
      3.62,
      0,
      (da + db) / 2 + 1.78,
      4.62,
      0.09,
      { skip: "i" },
    );
    B.fquad(
      hf,
      signs.mats.board,
      (da + db) / 2 - 1.7,
      3.67,
      (da + db) / 2 + 1.7,
      4.57,
      0.098,
      pq.uv,
    );
    for (const [cs, txt] of [
      [7.6, "國泰民安"],
      [13.4, "風調雨順"],
    ]) {
      const cb = signs.board({
        text: txt,
        w: 0.44,
        h: 2.5,
        vertical: true,
        bg: "#5c1410",
      });
      const p = B.P(hf, cs, 0, pd + 0.28);
      const f = B.frame(
        "n",
        p[0] - 0.22,
        p[2] - 0.01,
        p[0] + 0.22,
        p[2] + 0.01,
      );
      B.fquad(f, signs.mats.board, 0, py + 1.4, 0.44, py + 3.9, 0.012, cb.uv);
    }
    for (const cs of [2.7, 6.2, 10.5, 14.8, 18.3]) {
      const p = B.P(hf, cs, 4.5, pd - 0.9);
      ctx.lantern(p[0], p[1], p[2], 0.4, 0.22);
    }
    for (const cs of [6.2, 14.8]) {
      const p = B.P(hf, cs, 3.2, pd - 0.9);
      ctx.emitters.push({ pos: p, color: 0xff5a2a, power: 2.0, range: 11 });
    }

    // incense burner in the middle of the court
    const bx = 22,
      bz = 18.2;
    kit.box(stone, bx - 1.1, K, bz - 1.1, bx + 1.1, K + 0.25, bz + 1.1, {
      skip: "b",
    });
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + 0.5;
      kit.cyl(
        bronze,
        bx + Math.cos(a) * 0.5,
        K + 0.25,
        bz + Math.sin(a) * 0.5,
        0.1,
        0.55,
        { seg: 8, rTop: 0.14 },
      );
    }
    kit.cyl(bronze, bx, K + 0.75, bz, 0.62, 0.62, { seg: 18, rTop: 0.82 });
    kit.cyl(bronze, bx, K + 1.37, bz, 0.86, 0.08, { seg: 18 });
    kit.cyl(
      kit.flat(0x8a8478, { rough: 1, wet: "plaster", key: "ash" }),
      bx,
      K + 1.4,
      bz,
      0.78,
      0.04,
      { seg: 18 },
    );
    for (const s2 of [-1, 1])
      kit.rod(
        bronze,
        [bx + s2 * 0.82, K + 1.1, bz],
        [bx + s2 * 1.02, K + 1.75, bz],
        0.045,
        { seg: 6 },
      );
    const ember = kit.glow(0xff5a1a, 6);
    for (let i = 0; i < 16; i++) {
      const a = rnd() * 6.28,
        rr = rnd() * 0.6;
      const ix = bx + Math.cos(a) * rr,
        iz = bz + Math.sin(a) * rr,
        h = 0.3 + rnd() * 0.35;
      kit.rod(
        M.lacquer,
        [ix, K + 1.44, iz],
        [ix + (rnd() - 0.5) * 0.08, K + 1.44 + h, iz + (rnd() - 0.5) * 0.08],
        0.008,
        { seg: 4 },
      );
      kit.add(
        ember,
        new THREE.SphereGeometry(0.014, 5, 4),
        kit.xform(ix, K + 1.45 + h, iz),
      );
    }
    kit.solid(bx - 0.9, 0, bz - 0.9, bx + 0.9, K + 1.5, bz + 0.9, "metal");
    ctx.emitters.push({
      pos: [bx, K + 1.9, bz],
      color: 0xff7a30,
      power: 0.8,
      range: 6,
      flicker: 2,
    });
    ctx.smoke = ctx.smoke || [];
    ctx.smoke.push([bx, K + 1.6, bz]);
    // candle racks
    const flame = kit.glow(0xffb040, 6);
    const wax = kit.flat(0xb01a14, { rough: 0.5, key: "wax" });
    for (const rx of [15.6, 28.4]) {
      kit.box(M.steel, rx - 1.0, K, 20.3, rx + 1.0, K + 0.06, 20.9, {
        skip: "b",
      });
      for (const lx of [-0.95, 0.95])
        kit.rod(M.steel, [rx + lx, K, 20.6], [rx + lx, K + 1.0, 20.6], 0.03);
      for (let tier = 0; tier < 3; tier++) {
        const ty = K + 0.5 + tier * 0.22,
          tz = 20.75 - tier * 0.14;
        kit.box(
          M.steel,
          rx - 1.0,
          ty,
          tz - 0.07,
          rx + 1.0,
          ty + 0.03,
          tz + 0.07,
          { skip: "" },
        );
        for (let i = 0; i < 12; i++) {
          if (rnd() < 0.25) continue;
          const cx = rx - 0.9 + i * 0.164,
            ch = 0.06 + rnd() * 0.12;
          kit.cyl(wax, cx, ty + 0.03, tz, 0.018, ch, { seg: 6 });
          kit.add(
            flame,
            new THREE.SphereGeometry(0.016, 5, 4),
            kit.xform(cx, ty + 0.05 + ch, tz, 0, 0, 0, 1, 1.9, 1),
          );
        }
      }
      kit.solid(rx - 1.0, 0, 20.3, rx + 1.0, K + 1.0, 20.9, "metal");
      ctx.emitters.push({
        pos: [rx, K + 1.2, 20.1],
        color: 0xffa040,
        power: 1.2,
        range: 7,
        flicker: 2,
      });
    }
    // paper furnace in the corner, steles, benches
    const fx = 31.6,
      fz = 15.6;
    kit.box(
      kit.pbr("brick_red"),
      fx - 0.7,
      K,
      fz - 0.7,
      fx + 0.7,
      K + 1.7,
      fz + 0.7,
      { skip: "b" },
    );
    B.eaveRoof(
      B.frame("w", fx - 0.7, fz - 0.7, fx + 0.7, fz + 0.7),
      -0.2,
      1.6,
      K + 1.7,
      0.3,
      M.tileGreen,
      0.5,
      { back: -0.7, lift: 0.2, ridge: false },
    );
    B.eaveRoof(
      B.frame("e", fx - 0.7, fz - 0.7, fx + 0.7, fz + 0.7),
      -0.2,
      1.6,
      K + 1.7,
      0.3,
      M.tileGreen,
      0.5,
      { back: -0.7, lift: 0.2, ridge: false },
    );
    kit.box(
      kit.glow(0xff4a10, 3.5),
      fx - 0.72,
      K + 0.55,
      fz - 0.28,
      fx - 0.7,
      K + 1.05,
      fz + 0.28,
      { skip: "" },
    );
    kit.solid(fx - 0.7, 0, fz - 0.7, fx + 0.7, 2.6, fz + 0.7, "concrete");
    ctx.emitters.push({
      pos: [fx - 1.3, K + 0.9, fz],
      color: 0xff5a18,
      power: 1.6,
      range: 8,
      flicker: 2,
    });
    for (const sx of [12.2, 31.2]) {
      kit.box(stone, sx - 0.5, K, 21.2, sx + 0.5, K + 0.3, 21.8, { skip: "b" });
      kit.box(
        kit.pbr("granite", { color: 0x6a6a68, key: "stele" }),
        sx - 0.38,
        K + 0.3,
        21.38,
        sx + 0.38,
        K + 2.2,
        21.62,
        { skip: "b" },
      );
      kit.solid(sx - 0.5, 0, 21.2, sx + 0.5, 2.3, 21.8, "concrete");
    }
    for (const [px, pz2, yaw] of [
      [8.05, 16.2, Math.PI / 2],
      [8.05, 26.4, Math.PI / 2],
      [33.5, 19.2, -Math.PI / 2],
    ])
      kit.prop("painted_wooden_bench", px, K, pz2, { yaw, collide: 0.5 });
    for (const [px, pz2] of [
      [17, 14.3],
      [27, 14.3],
      [8.6, 14.4],
      [33.2, 22.6],
      [8.7, 23],
    ])
      kit.prop("potted_plant_02", px, K, pz2, { yaw: rnd() * 6, scale: 1.9 });
    for (const [px, pz2] of [
      [19.6, 15.2],
      [24.6, 16.4],
      [21, 20.6],
    ])
      blood(px, K + 0.004, pz2, 1.5 + rnd(), pick(["pool", "smear"]));
    // strings of lanterns from the gate to the hall
    for (const gx of [14, 22, 30])
      ctx.lanternString(
        [gx, 4.3, z0 + 0.8],
        [gx, 4.7, pz + 0.2],
        5,
        0.7,
        0.24,
        gx !== 22,
      );
  }
  function altar(hf, da, db, py) {
    const mid = (da + db) / 2;
    // deep red room: back wall with a gold figure, candles and an offering table
    const cv = document.createElement("canvas");
    cv.width = 384;
    cv.height = 384;
    const c = cv.getContext("2d");
    const g = c.createRadialGradient(192, 190, 20, 192, 200, 260);
    g.addColorStop(0, "#ffb347");
    g.addColorStop(0.35, "#c8401a");
    g.addColorStop(1, "#2a0603");
    c.fillStyle = g;
    c.fillRect(0, 0, 384, 384);
    // seated figure silhouette with a halo
    c.fillStyle = "#ffd98a";
    c.beginPath();
    c.arc(192, 120, 62, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#7a3a0c";
    c.beginPath();
    c.arc(192, 128, 34, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(118, 300);
    c.quadraticCurveTo(120, 170, 192, 158);
    c.quadraticCurveTo(264, 170, 266, 300);
    c.closePath();
    c.fill();
    c.fillStyle = "#3a1206";
    c.fillRect(60, 296, 264, 88);
    for (let i = 0; i < 9; i++) {
      c.fillStyle = "#ffe9a8";
      c.fillRect(74 + i * 29, 268 + (i % 2) * 8, 5, 26);
      c.fillStyle = "#fff6d0";
      c.beginPath();
      c.ellipse(76.5 + i * 29, 262 + (i % 2) * 8, 4, 8, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "rgba(180,30,10,0.9)";
    c.fillRect(0, 0, 34, 384);
    c.fillRect(350, 0, 34, 384);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = kit.glowMap(tex, 1.5);
    B.fquad(hf, mat, da, py, db, 3.5, -2.6, UV01);
    B.fbox(hf, M.void, da - 0.02, py, -2.6, da, 3.5, -0.4, { skip: "b" });
    B.fbox(hf, M.void, db, py, -2.6, db + 0.02, 3.5, -0.4, { skip: "b" });
    kit.quad(
      M.woodDark,
      B.P(hf, da, py + 0.01, -2.6),
      B.P(hf, da, py + 0.01, 0),
      B.P(hf, db, py + 0.01, 0),
      B.P(hf, db, py + 0.01, -2.6),
    );
    // offering table across the doorway
    B.fbox(hf, M.lacquer, mid - 1.1, py, -0.9, mid + 1.1, py + 0.85, -0.25, {
      skip: "b",
    });
    const tp = B.P(hf, mid, py + 0.85, -0.55);
    kit.prop("brass_pot_01", tp[0], tp[1], tp[2], { scale: 1.2 });
    kit.prop("antique_ceramic_vase_01", tp[0] - 0.7, tp[1], tp[2], {});
    kit.prop("antique_ceramic_vase_01", tp[0] + 0.7, tp[1], tp[2], {});
    B.emit(hf, mid, 2.2, 0.8, 0xffa040, 2.2, 10, { flicker: 2 });
  }

  // ================= CHECKPOINT & BARRICADES =================
  function checkpoint() {
    const gp = ctx.gameProp;
    // chicane of barriers, then the final wire at the district edge
    // (west pair leaves a gap on the south side, east pair on the north side)
    for (const [x, z, yaw] of [
      [31.2, 3.5, Math.PI / 2],
      [31.2, 6.1, Math.PI / 2],
      [34.4, 8.5, Math.PI / 2],
      [34.4, 5.9, Math.PI / 2],
    ])
      gp("jersey_barrier", x, 0, z, yaw, { seed: Math.floor(rnd() * 99) });
    for (let z = 0.2; z < 12.5; z += 3.32) {
      if (Math.abs(z + 1.66 - 6) < 2.6) continue;
      gp("fence_panel", 39.1, 0, z + 1.66, Math.PI / 2, { seed: 4 });
      gp("jersey_barrier", 38.5, 0, z + 1.5, Math.PI / 2, { seed: 7 });
    }
    // the gate itself: steel frame, sliding mesh leaf standing ajar, warning lights
    const post = kit.game("steel_dark");
    for (const z of [3.3, 8.7]) {
      kit.box(post, 38.9, 0, z - 0.14, 39.3, 4.2, z + 0.14, { skip: "b" });
      kit.solid(38.9, 0, z - 0.14, 39.3, 4.2, z + 0.14, "metal");
      kit.box(kit.glow(0xffb020, 5), 38.82, 3.6, z - 0.1, 38.9, 3.8, z + 0.1, {
        skip: "",
      });
    }
    kit.box(post, 38.9, 4.0, 3.3, 39.3, 4.3, 8.7, { skip: "" });
    kit.box(hazard, 38.86, 3.3, 3.44, 38.9, 3.95, 8.56, { skip: "" });
    const sg = signs.board({
      text: "檢疫站",
      sub: "CHECKPOINT · EVACUEES ONLY",
      w: 4.6,
      h: 0.62,
      bg: "#e8e2d2",
      fg: "#a01414",
      kai: false,
    });
    const cf = B.frame("w", 38.84, 3.7, 38.86, 8.3);
    B.fquad(cf, signs.mats.board, 0, 3.32, 4.6, 3.94, 0.006, sg.uv);
    gp("fence_panel", 39.1, 0, 7.0, Math.PI / 2, { seed: 9 });
    kit.solid(39, 0, 3.3, 39.4, 4, 8.7, "metal", { playerOnly: true });
    ctx.emitters.push({
      pos: [38.4, 3.4, 6],
      color: 0xffb020,
      power: 1.6,
      range: 9,
      flicker: 1,
    });
    // floodlights, sandbags, supplies
    const fl = [
      [34.4, 0.7, -2.2],
      [38.3, 9.9, -0.95],
      [32.4, 11.9, -1.9],
    ];
    for (const [x, z, yaw] of fl) {
      gp("floodlight_stand", x, z > 10 || z < 2 ? K : 0, z, yaw, { seed: 2 });
      ctx.emitters.push({
        pos: [x + (x > 36 ? -1.6 : 1.2), 2.4, z + (z < 6 ? 1.6 : -1.6)],
        color: 0xcfe2ff,
        power: 3.0,
        range: 14,
      });
    }
    for (const [x, z, yaw] of [
      [32.4, 0.2, 0],
      [36.9, 11.2, 0],
      [32.0, 4.8, 1.5708],
      [35.2, 7.2, 1.5708],
    ])
      gp("sandbags", x, z > 10 || z < 2 ? K : 0, z, yaw, {
        seed: Math.floor(rnd() * 99),
      });
    kit.prop("old_military_crate", 38.1, 0, 2.9, {
      parts: [
        "old_military_crate_a",
        "old_military_crate_lid_a",
        "old_military_crate_latch_a",
        "old_military_crate_loop_a",
      ],
      yaw: 1.4,
      scale: 1.4,
      collide: true,
    });
    kit.prop("old_military_crate", 38.1, 0.36, 2.9, {
      parts: [
        "old_military_crate_b",
        "old_military_crate_lid_b",
        "old_military_crate_latch_b",
        "old_military_crate_loop_b",
      ],
      yaw: 1.7,
      scale: 1.4,
    });
    kit.prop("portable_generator", 38.4, K, 11.6, {
      yaw: 1.2,
      scale: 1.2,
      collide: true,
    });
    kit.prop("medical_box", 36.2, K, 12.2, { yaw: 0.6, scale: 1.3 });
    kit.prop("ammo_box", 37.6, 0, 3.7, { yaw: 0.2, scale: 1.4 });
    kit.prop("wheelchair_01", 30.4, K, 11.9, { yaw: 2.2, collide: true });
    // triage tent on the north pavement
    const tx0 = 35.6,
      tx1 = 39.4,
      tz0 = -0.8,
      tz1 = 1.9,
      th = 2.5;
    for (const [x, z] of [
      [tx0, tz0],
      [tx1, tz0],
      [tx0, tz1],
      [tx1, tz1],
    ])
      kit.rod(M.galv, [x, K, z], [x, K + 1.9, z], 0.025, { cast: true });
    const tzm = (tz0 + tz1) / 2;
    kit.quad(
      olive,
      [tx0 - 0.1, K + 1.9, tz1 + 0.15],
      [tx1 + 0.1, K + 1.9, tz1 + 0.15],
      [tx1 + 0.1, K + th, tzm],
      [tx0 - 0.1, K + th, tzm],
    );
    kit.quad(
      olive,
      [tx1 + 0.1, K + 1.9, tz0 - 0.15],
      [tx0 - 0.1, K + 1.9, tz0 - 0.15],
      [tx0 - 0.1, K + th, tzm],
      [tx1 + 0.1, K + th, tzm],
    );
    kit.quad(
      olive,
      [tx1, K, tz0],
      [tx0, K, tz0],
      [tx0, K + 1.9, tz0],
      [tx1, K + 1.9, tz0],
    );
    kit.box(
      kit.glow(0xe8f0ff, 2.5),
      tx0 + 0.8,
      K + 2.2,
      tzm - 0.03,
      tx1 - 0.8,
      K + 2.24,
      tzm + 0.03,
      { skip: "" },
    );
    ctx.emitters.push({
      pos: [(tx0 + tx1) / 2, K + 1.8, tzm],
      color: 0xe0ecff,
      power: 1.6,
      range: 8,
    });
    kit.prop("chinese_tea_table", tx0 + 1.0, K, tzm, {
      yaw: 0,
      scale: 1.3,
      collide: true,
    });
    kit.prop("medical_box", tx0 + 1.0, K + 0.66, tzm, { yaw: 0.4, scale: 1.2 });
    blood(34.6, 0.004, 6.4, 2.2, "smear");
    blood(36.8, 0.004, 7.6, 1.6, "pool");
    return { x: 37, z: 6 };
  }
  // a row across a street end: barriers, wire and whatever was left behind
  function barricade(ax, az, bx, bz, o = {}) {
    const gp = ctx.gameProp;
    const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
    const len = alongX ? Math.abs(bx - ax) : Math.abs(bz - az);
    const n = Math.max(1, Math.round(len / 3.32));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = ax + (bx - ax) * t,
        z = az + (bz - az) * t;
      const yaw = alongX ? 0 : Math.PI / 2;
      gp("fence_panel", x, o.y || 0, z, yaw + (o.flip ? Math.PI : 0), {
        seed: i + 3,
      });
      const inx = alongX ? 0 : o.inward * 0.75,
        inz = alongX ? o.inward * 0.75 : 0;
      if (i % 2 === 0 || len < 8)
        gp("jersey_barrier", x + inx, o.y || 0, z + inz, yaw, { seed: i });
      else if (rnd() < 0.6)
        gp("sandbags", x + inx, o.y || 0, z + inz, yaw, { seed: i });
    }
    // razor wire coil along the top
    const coil = kit.game("steel_galv");
    const steps = Math.round(len * 5);
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        a = t * len * 5.2;
      const x = ax + (bx - ax) * t + (alongX ? 0 : Math.cos(a) * 0.16),
        z = az + (bz - az) * t + (alongX ? Math.cos(a) * 0.16 : 0);
      const p = [x, (o.y || 0) + 2.52 + Math.sin(a) * 0.16, z];
      if (prev) kit.rod(coil, prev, p, 0.006, { seg: 3 });
      prev = p;
    }
    kit.solid(
      Math.min(ax, bx) - (alongX ? 0 : 0.25),
      0,
      Math.min(az, bz) - (alongX ? 0.25 : 0),
      Math.max(ax, bx) + (alongX ? 0 : 0.25),
      5,
      Math.max(az, bz) + (alongX ? 0.25 : 0),
      "metal",
      { playerOnly: true },
    );
  }

  // ---------------- build ----------------
  paifang();
  const mk = market();
  temple();
  const extraction = checkpoint();
  barricade(-39.2, -5.9, -39.2, 17.9, { inward: 1 });
  barricade(-2.9, -29.1, 6.9, -29.1, { inward: 1 });
  barricade(-2.9, 29.1, 6.9, 29.1, { inward: -1, flip: true });
  // nothing walks round the back of the buildings
  kit.solid(-42, 0, -33, 42, 4, -30.02, "concrete", { playerOnly: true });
  const sirens = [
    siren(-4.7, K, 0.35, { yaw: Math.PI / 4 }),
    siren(PLAN.market.x0 + 13.2, K, PLAN.market.z0 + 9.4, { h: 4.3 }),
    siren(29.6, K, 17.2, { yaw: -Math.PI / 2 }),
  ];

  ctx.finalizeLanterns = finalizeLanterns;
  ctx.finalizeGameProps = () => {
    const merged = G.util.mergeStatic(gameStatic);
    merged.name = "ct-gameprops";
    merged.traverse((o) => o.isMesh && o.layers.set(2));
    ctx.root.add(merged);
  };
  const explosives = [
    { name: "barrel", x: 22.6, y: 0, z: 2.75, yaw: 0, opts: { color: "red" } },
    {
      name: "barrel",
      x: -21.6,
      y: 0,
      z: -14.35,
      yaw: 0,
      opts: { color: "red" },
    },
    {
      name: "barrel",
      x: -20.9,
      y: 0,
      z: -14.5,
      yaw: 0,
      opts: { color: "red" },
    },
    { name: "barrel", x: -20.4, y: 0, z: 26.2, yaw: 0, opts: { color: "red" } },
    { name: "gas_cylinders", x: 3.9, y: 0, z: -24.4, yaw: 0, opts: {} },
    { name: "barrel", x: 32.2, y: 0, z: -16.5, yaw: 0, opts: { color: "red" } },
    { name: "barrel", x: -36.6, y: 0, z: 13.6, yaw: 0, opts: { color: "red" } },
    { name: "gas_cylinders", x: 4.2, y: 0, z: 20.5, yaw: 1.57, opts: {} },
    { name: "barrel", x: -10.1, y: 0, z: 9.35, yaw: 0, opts: { color: "red" } },
    { name: "barrel", x: 29.4, y: K, z: -23.6, yaw: 0, opts: { color: "red" } },
    { name: "barrel", x: 33.1, y: K, z: 23.4, yaw: 0, opts: { color: "red" } },
  ];
  return {
    sirens,
    extraction,
    explosives,
    market: mk,
    blood,
    barricade,
    skylights: [],
  };
}
