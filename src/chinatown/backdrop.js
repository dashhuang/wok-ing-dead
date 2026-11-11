// What lies beyond the wire: the streets carry on past each barricade, the blocks behind the
// playable area are filled in, and a ring of towers closes the horizon. Nothing here collides;
// the player and the dead never leave the district.
import * as THREE from "three";

export async function createBackdrop(G) {
  const ctx = G.level && G.level.ctx;
  if (!ctx) return { update() {} };
  const { kit, signs, B } = ctx;
  const { rnd, pick } = kit;
  const M = B.M;
  const root = new THREE.Group();
  root.name = "backdrop";
  G.scene.add(root);
  // generators register lights, doorways and props: none of that applies out here
  const keep = {
    emitters: ctx.emitters,
    doors: ctx.doors,
    dress: ctx.dress,
    glints: ctx.glints,
    spawns: ctx.spawns,
  };
  ctx.emitters = [];
  ctx.doors = [];
  ctx.dress = [];
  ctx.glints = [];
  const updaters = [];

  kit.into("backdrop", () => {
    kit.reseed(7741);
    const SK = [
      "brickRed",
      "brickOrange",
      "plasterCream",
      "tileWhite",
      "plasterYellow",
      "concrete",
      "plasterPink",
      "tileGreen",
      "brickWhite",
      "plasterBlue",
      "tileRose",
    ];
    // a block seen from the district: windows on the listed sides, nothing else
    const block = (x0, z0, x1, z1, floors, sides, o = {}) => {
      const faces = {};
      for (const s of sides)
        faces[s] = o.street && o.street.includes(s) ? "street" : "alley";
      B.building({
        x0,
        z0,
        x1,
        z1,
        floors,
        fH: 3.0,
        skin: o.skin || pick(SK),
        faces,
        simple: true,
        collide: false,
        roof: "none",
        spawnDoors: false,
        litChance: o.lit ?? 0.3,
        bayW: 3.2,
        ...(o.spec || {}),
      });
    };
    const pavers = kit.pbr("pavers");
    const walk = (x0, z0, x1, z1) =>
      kit.box(pavers, x0, 0, z0, x1, 0.15, z1, { skip: "b" });

    // ---- west: Golden Dragon Street beyond the gate plaza ----
    block(-62, -24, -40.6, -1, 6, "se", { street: "s", skin: "brickOrange" });
    block(-60, 13, -40.6, 32, 5, "ne", { street: "n", skin: "plasterCream" });
    block(-84, -20, -62.5, -1, 8, "s", { skin: "tileWhite", lit: 0.4 });
    block(-82, 13, -60.5, 30, 7, "n", { skin: "brickRed" });
    block(-110, -18, -84.5, -1, 5, "s");
    block(-108, 13, -82.5, 28, 9, "n", { lit: 0.45 });
    walk(-110, -1, -40, 2);
    walk(-110, 10, -40, 13);
    // ---- east: past the checkpoint ----
    block(40.6, -22, 58, -1, 6, "s", { street: "s", skin: "plasterYellow" });
    block(40.6, 13, 60, 32, 7, "n", { street: "n", skin: "brickTeal" });
    block(58.5, -20, 80, -1, 9, "s", { skin: "concrete", lit: 0.45 });
    block(60.5, 13, 84, 30, 5, "n");
    block(80.5, -18, 108, -1, 6, "s");
    block(84.5, 13, 110, 28, 8, "n", { lit: 0.4 });
    walk(40, -1, 110, 2);
    walk(40, 10, 110, 13);
    // ---- north: Fook Sau Lane ----
    block(-18, -52, -3, -30.6, 6, "es", { street: "e", skin: "plasterGreen" });
    block(7, -50, 24, -30.6, 7, "ws", { street: "w", skin: "brickRed" });
    block(-16, -78, -3, -52.5, 9, "e", { lit: 0.4 });
    block(7, -76, 22, -50.5, 5, "w");
    block(-14, -106, -3, -78.5, 6, "e");
    block(7, -104, 20, -76.5, 8, "w");
    walk(-3, -108, -1, -30);
    walk(5, -108, 7, -30);
    // ---- south ----
    block(-19, 30.6, -3, 52, 7, "en", { street: "e", skin: "tileRose" });
    block(7, 30.6, 23, 50, 5, "wn", { street: "w", skin: "plasterCream" });
    block(-17, 52.5, -3, 78, 5, "e");
    block(7, 50.5, 21, 76, 9, "w", { lit: 0.45 });
    block(-15, 78.5, -3, 104, 8, "e");
    block(7, 76.5, 22, 106, 6, "w");
    walk(-3, 30, -1, 108);
    walk(5, 30, 7, 108);
    // ---- the blocks behind the playable area ----
    block(-62, -52, -18.5, -30.6, 8, "s", { skin: "concrete", lit: 0.35 });
    block(24.5, -50, 62, -30.6, 9, "s", { skin: "tileGreen", lit: 0.4 });
    block(-60, 32.5, -19.5, 54, 8, "n", { skin: "brickWhite", lit: 0.35 });
    block(23.5, 30.6, 62, 52, 7, "n", { skin: "plasterBlue", lit: 0.4 });
    block(-66, -50, -62.5, -24.5, 10, "e");
    block(62.5, -46, 70, -22.5, 11, "w", { lit: 0.5 });

    // ---- the horizon: towers with lit windows ----
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 512;
    const c = cv.getContext("2d");
    c.fillStyle = "#07090d";
    c.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 12; x++) {
        const r = rnd();
        if (r > 0.3) {
          c.fillStyle = "#0c1016";
          c.fillRect(x * 21.3 + 4, y * 16 + 4, 13, 9);
          continue;
        }
        c.fillStyle = pick([
          "#ffd28a",
          "#ffe6b8",
          "#d8e8ff",
          "#ffb86a",
          "#fff0cf",
          "#9fd0ff",
        ]);
        c.globalAlpha = 0.45 + rnd() * 0.55;
        c.fillRect(x * 21.3 + 4, y * 16 + 4, 13, 9);
        c.globalAlpha = 1;
      }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    const towerMat = kit.glowMap(tex, 1.25);
    towerMat.userData.oneCell = true;
    const beacon = kit.glow(0xff2010, 9);
    const beacons = [];
    const tower = (x, z, w, d, h) => {
      const m = towerMat;
      const u = (len) => Math.max(1, Math.round(len / 26));
      const v = h / 52;
      const off = rnd();
      const face = (p0, p1, len) =>
        kit.quad(
          m,
          [p0[0], 0, p0[1]],
          [p1[0], 0, p1[1]],
          [p1[0], h, p1[1]],
          [p0[0], h, p0[1]],
          [off, 0, off + u(len), 0, off + u(len), v, off, v],
        );
      face([x - w / 2, z + d / 2], [x + w / 2, z + d / 2], w);
      face([x + w / 2, z + d / 2], [x + w / 2, z - d / 2], d);
      face([x + w / 2, z - d / 2], [x - w / 2, z - d / 2], w);
      face([x - w / 2, z - d / 2], [x - w / 2, z + d / 2], d);
      kit.quad(
        M.void,
        [x - w / 2, h, z + d / 2],
        [x + w / 2, h, z + d / 2],
        [x + w / 2, h, z - d / 2],
        [x - w / 2, h, z - d / 2],
      );
      if (h > 60 && rnd() < 0.7) {
        kit.rod(M.void, [x, h, z], [x, h + 9, z], 0.25, { seg: 5 });
        kit.add(
          beacon,
          new THREE.SphereGeometry(0.7, 6, 5),
          kit.xform(x, h + 9.4, z),
        );
      }
    };
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + rnd() * 0.1;
      const r = 125 + rnd() * 150;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r * 0.95;
      // keep the afterglow down the main street clear: lower roofs due east
      const east = Math.cos(a) > 0.86;
      const h = east ? 22 + rnd() * 26 : 38 + rnd() * rnd() * 120;
      tower(x, z, 16 + rnd() * 22, 16 + rnd() * 22, h);
    }
    // two landmark towers with roof signs
    for (const [x, z, h, text, color] of [
      [-150, -70, 150, "酒店", "#ff2a4f"],
      [70, 150, 128, "銀行", "#35f0c8"],
      [-60, 170, 110, "金行", "#ffd23a"],
    ]) {
      tower(x, z, 30, 30, h);
      const face = signs.neon({ text, w: 5, h: 2.6, color, trim: color });
      const toCentre = Math.atan2(-x, -z);
      const m = kit.xform(x, h + 7, z, 0, toCentre, 0);
      const quad = new THREE.PlaneGeometry(26, 13);
      const uv = quad.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(
          i,
          face.uv[0] + (face.uv[2] - face.uv[0]) * uv.getX(i),
          face.uv[1] + (face.uv[3] - face.uv[1]) * uv.getY(i),
        );
      kit.add(signs.mats.neon, quad, m, { cx: x, cz: z });
      for (const s of [-10, 10])
        kit.rod(
          M.void,
          [x + Math.cos(toCentre) * s, h, z - Math.sin(toCentre) * s],
          [x + Math.cos(toCentre) * s, h + 1, z - Math.sin(toCentre) * s],
          0.4,
          { seg: 4 },
        );
    }

    // ---- the convoy waiting beyond the checkpoint ----
    const olive = kit.flat(0x3f4a34, {
      rough: 0.7,
      wet: "metal",
      key: "truck",
    });
    const canvas = kit.flat(0x4c5340, {
      rough: 0.92,
      wet: [0.25, 0.7, 0.4, 0.4],
      key: "truckcloth",
    });
    const tyre = kit.game("tire");
    const truck = (x, z, dir) => {
      const L = 7.2;
      const xa = dir > 0 ? x : x - L,
        xb = xa + L;
      const cab0 = dir > 0 ? xb - 2.2 : xa,
        cab1 = cab0 + 2.2;
      const bed0 = dir > 0 ? xa : xa + 2.4,
        bed1 = bed0 + 4.8;
      kit.box(olive, xa, 0.75, z - 1.2, xb, 1.05, z + 1.2, { skip: "" });
      kit.box(olive, cab0, 1.05, z - 1.2, cab1, 2.75, z + 1.2);
      kit.box(
        M.darkGlass,
        dir > 0 ? cab1 - 0.02 : cab0 - 0.02,
        1.9,
        z - 1.0,
        dir > 0 ? cab1 + 0.02 : cab0 + 0.02,
        2.55,
        z + 1.0,
      );
      kit.box(olive, bed0, 1.05, z - 1.25, bed1, 1.75, z + 1.25);
      // canvas tilt over hoops
      const hoop = [
        [-1.25, 1.75],
        [-1.25, 2.7],
        [-0.8, 3.15],
        [0.8, 3.15],
        [1.25, 2.7],
        [1.25, 1.75],
      ];
      for (let i = 0; i < hoop.length - 1; i++)
        kit.quad(
          canvas,
          [bed0, hoop[i][1], z + hoop[i][0]],
          [bed0, hoop[i + 1][1], z + hoop[i + 1][0]],
          [bed1, hoop[i + 1][1], z + hoop[i + 1][0]],
          [bed1, hoop[i][1], z + hoop[i][0]],
        );
      for (const wx of [xa + 1.1, xa + 2.5, xb - 1.3])
        for (const wz of [-1.05, 1.05])
          kit.cyl(tyre, wx, 0.52, z + wz - 0.16, 0.52, 0.32, {
            seg: 12,
            axis: "z",
          });
      const tail = dir > 0 ? xa : xb;
      for (const wz of [-1.0, 1.0])
        kit.box(
          kit.glow(0xff1a0a, 5),
          tail - 0.03,
          1.15,
          z + wz - 0.12,
          tail + 0.03,
          1.32,
          z + wz + 0.12,
          { skip: "" },
        );
      const head = dir > 0 ? xb : xa;
      for (const wz of [-0.85, 0.85])
        kit.box(
          kit.glow(0xfff2d0, 6),
          head - 0.03,
          1.25,
          z + wz - 0.14,
          head + 0.03,
          1.5,
          z + wz + 0.14,
          { skip: "" },
        );
    };
    truck(41.6, 5.6, 1);
    truck(52, 8.2, 1);
    truck(60.5, 4.2, 1);
    // floodlight masts over the cordon
    try {
      for (const [x, z, yaw] of [
        [43, -0.3, 2.4],
        [43, 12.3, 0.8],
        [66, 12.3, 1],
      ]) {
        const mast = G.props.build("light_mast", { seed: 3 });
        mast.position.set(x, 0.15, z);
        mast.rotation.y = yaw;
        mast.updateMatrixWorld(true);
        mast.traverse((o) => {
          if (
            o.isMesh &&
            !Array.isArray(o.material) &&
            o.geometry.attributes.uv
          )
            kit.add(o.material, o.geometry, o.matrixWorld, { cx: x, cz: z });
        });
      }
    } catch {}
    // the jam on the far side of the gate plaza
    const CAR = [
      "covered_car",
      "covered_car_wheel_01",
      "covered_car_wheel_02",
      "covered_car_wheel_03",
      "covered_car_wheel_04",
    ];
    for (const [x, z, yaw] of [
      [-44, 4, 1.5],
      [-49.5, 7.9, 1.62],
      [-55, 4.3, 1.4],
      [-61, 8.1, 1.7],
      [-67.5, 4.1, 1.55],
      [-46, 8.3, 1.2],
      [2.6, -34, 0.05],
      [0.4, -41, 3.2],
      [3.4, 35, 0.1],
      [0.6, 43, 3.0],
    ])
      kit.prop("covered_car", x, 0, z, {
        parts: CAR,
        yaw,
        scale: 1.08,
        tint: pick([0xb8c0c4, 0x8a9a9a, 0xc9b8a0, 0x9aa6b0]),
        gain: 1.9,
        wet: "plaster",
      });
    // an abandoned bus slewed across the road
    const busBody = kit.flat(0xc9c2ad, {
      rough: 0.5,
      wet: "metal",
      key: "bus",
    });
    const busBand = kit.flat(0x8a1f1a, {
      rough: 0.5,
      wet: "metal",
      key: "bus",
    });
    const bx = -52,
      bz = 5.2;
    kit.box(busBody, bx - 5.5, 0.45, bz - 1.25, bx + 5.5, 3.1, bz + 1.25);
    kit.box(busBand, bx - 5.52, 0.9, bz - 1.27, bx + 5.52, 1.25, bz + 1.27);
    kit.box(M.darkGlass, bx - 5.2, 1.55, bz - 1.28, bx + 5.2, 2.6, bz + 1.28);
    for (const wx of [-3.8, 3.4])
      for (const wz of [-1.1, 1.1])
        kit.cyl(tyre, bx + wx, 0.5, bz + wz - 0.15, 0.5, 0.3, {
          seg: 12,
          axis: "z",
        });
    const hz = kit.glow(0xffa010, 5);
    for (const wz of [-1.05, 1.05])
      kit.box(
        hz,
        bx + 5.5,
        0.8,
        bz + wz - 0.1,
        bx + 5.53,
        0.98,
        bz + wz + 0.1,
        { skip: "" },
      );
    updaters.push((t) => {
      hz.color
        .setScalar(1)
        .multiply(new THREE.Color(0xffa010))
        .multiplyScalar(Math.sin(t * 5.2) > 0 ? 5 : 0.2);
    });
    // the towers' aircraft lights breathe slowly
    updaters.push((t) => {
      beacon.color
        .set(0xff2010)
        .multiplyScalar(2 + 7 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.1), 4));
    });
    void beacons;
  });
  signs.finish();
  kit.flush("backdrop", root);
  Object.assign(ctx, keep);

  // ---- a helicopter working a searchlight over the district ----
  const heli = new THREE.Group();
  const navRed = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 6, 5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.4, 0.2) }),
  );
  const navWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 6, 5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 7) }),
  );
  navWhite.position.set(0, -0.6, 0);
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(1.1, 4.5, 3, 8),
    new THREE.MeshBasicMaterial({ color: 0x05070a }),
  );
  body.rotation.z = Math.PI / 2;
  const beamGeo = new THREE.ConeGeometry(11, 95, 20, 1, true);
  beamGeo.translate(0, -47.5, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.55, 0.62, 0.8),
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  heli.add(body, navRed, navWhite, beam);
  root.add(heli);
  let t = 0;
  return {
    root,
    update(dt) {
      t += dt;
      for (const fn of updaters) fn(t);
      // wide lazy circuit north of the street, searchlight wandering
      const a = t * 0.07;
      heli.position.set(
        Math.cos(a) * 95 + 10,
        78 + Math.sin(t * 0.3) * 4,
        Math.sin(a) * 70 - 60,
      );
      heli.rotation.y = -a;
      beam.rotation.set(
        Math.sin(t * 0.23) * 0.35,
        0,
        Math.cos(t * 0.17) * 0.35 + 0.15,
      );
      navRed.visible = Math.sin(t * 6) > 0.4;
    },
  };
}
