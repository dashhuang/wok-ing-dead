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
    // One facade sheet shared by every tower: 16 bays by 40 floors, concrete spandrels between
    // window bands. Lit rooms come in runs, most of a floor is dark, a few floors are empty.
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 1024;
    const c = cv.getContext("2d");
    c.fillStyle = "#06080b";
    c.fillRect(0, 0, 512, 1024);
    const BAYS = 16,
      FLOORS = 40,
      bw = 512 / BAYS,
      fh = 1024 / FLOORS;
    for (let y = 0; y < FLOORS; y++) {
      c.fillStyle = "#0b0e12";
      c.fillRect(0, y * fh, 512, fh * 0.38); // spandrel
      const empty = rnd() < 0.18;
      let run = 0,
        tone = "#000";
      for (let x = 0; x < BAYS; x++) {
        const wx = x * bw + 3,
          wy = y * fh + fh * 0.42,
          ww = bw - 6,
          wh = fh * 0.5;
        if (run <= 0 && !empty && rnd() < 0.16) {
          run = 1 + Math.floor(rnd() * 3);
          tone = pick([
            "#ffcf8a",
            "#ffe2b0",
            "#cfe0f5",
            "#ffb866",
            "#fff0d0",
            "#9cc4ee",
            "#ffd9a0",
          ]);
        }
        if (run > 0) {
          run--;
          c.globalAlpha = 0.35 + rnd() * 0.5;
          c.fillStyle = tone;
          c.fillRect(wx, wy, ww, wh);
          // a blind half down, or furniture against the glass
          c.globalAlpha = 0.5;
          c.fillStyle = "#06080b";
          if (rnd() < 0.5) c.fillRect(wx, wy, ww, wh * rnd(0.2, 0.6));
          else
            c.fillRect(
              wx + ww * rnd(0, 0.5),
              wy + wh * 0.55,
              ww * 0.4,
              wh * 0.45,
            );
          c.globalAlpha = 1;
        } else {
          c.fillStyle = "#0d1218";
          c.fillRect(wx, wy, ww, wh);
        }
      }
    }
    // a stair core with its lights left on
    c.globalAlpha = 0.28;
    c.fillStyle = "#cfe6d8";
    for (let y = 0; y < FLOORS; y++)
      c.fillRect(bw * 11 + 9, y * fh + fh * 0.45, bw - 18, fh * 0.4);
    c.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    const towerMat = kit.glowMap(tex, 1.1);
    towerMat.userData.oneCell = true;
    const beacon = kit.glow(0xff2010, 9);
    const beacons = [];
    const tower = (x, z, w, d, h) => {
      const m = towerMat;
      // whole bays (3.2 m) and whole floors (3 m), starting at a random bay and floor of the sheet
      const u = (len) => Math.max(2, Math.round(len / 3.2)) / 16;
      const v0 = Math.floor(rnd(0, 40)) / 40;
      const off = Math.floor(rnd(0, 16)) / 16;
      const face = (p0, p1, len) =>
        kit.quad(
          m,
          [p0[0], 0, p0[1]],
          [p1[0], 0, p1[1]],
          [p1[0], h, p1[1]],
          [p0[0], h, p0[1]],
          [
            off,
            v0,
            off + u(len),
            v0,
            off + u(len),
            v0 + h / 120,
            off,
            v0 + h / 120,
          ],
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
    const cars = ctx.vehicles;
    const HALF = Math.PI / 2;
    cars.place("army", 44.2, 5.7, HALF, {
      brake: true,
      far: true,
      collide: false,
    });
    cars.place("army", 54.5, 8.1, HALF + 0.03, { far: true, collide: false });
    cars.place("army", 64, 4.3, HALF - 0.02, { far: true, collide: false });
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
    // the jam on the far side of the gate plaza, and what was left in the side streets
    const far = { far: true, collide: false };
    cars.place("saloon", -44, 4.1, HALF - 0.06, { ...far, color: 0x8a9096 });
    cars.place("van", -46.2, 8.2, HALF - 0.35, { ...far, color: 0xd9d6cc });
    cars.place("bus", -53.5, 5.4, HALF + 0.22, { ...far, hazard: true });
    cars.place("taxi", -61.5, 8.3, HALF + 0.12, { ...far, dead: true });
    cars.place("hatch", -66, 4.2, HALF - 0.05, { ...far, color: 0x1d2c4a });
    cars.place("lorry", -72, 7.6, HALF, {
      ...far,
      color: 0xc9ccd0,
      load: "tilt",
    });
    cars.place("saloon", 2.6, -34.5, 0.05, { ...far, color: 0x1b1d21 });
    cars.place("minibus", 0.4, -42.5, Math.PI + 0.1, {
      ...far,
      color: 0x8f1a16,
      dead: true,
    });
    cars.place("hatch", 3.4, 35, 0.1, { ...far, color: 0x9a8f78 });
    cars.place("van", 0.6, 43, Math.PI - 0.1, { ...far, color: 0x30463a });
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
  B.fit.finish(root);
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
