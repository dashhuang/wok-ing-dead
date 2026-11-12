function stage(G4, { light = G4.params.light || "studio", ground = true } = {}) {
  const R4 = G4.render, M = G4.mats;
  R4.setSky(light === "night" ? "night" : "studio");
  R4.bakeEnvFromSky();
  if (ground) {
    const g2 = panel(80, 80, 1, 1);
    g2.rotateX(-Math.PI / 2);
    const me = new Mesh(g2, M.surface("concrete", "concrete", { wet: 0.75, wetRough: 0.3, macro: 0.2, macroScale: 0.35, streaks: 0 }));
    me.receiveShadow = true;
    me.castShadow = false;
    R4.scene.add(me);
  }
  if (light === "night") {
    R4.setKey(0, { pos: [4.5, 7.5, 5.5], target: [0, 1.1, 0], color: 14674431, intensity: 5200, angle: 0.42, penumbra: 0.55, size: 0.7 });
    R4.setKey(1, { pos: [-6, 5.5, -5], target: [0, 1, 0], color: 16757866, intensity: 2600, angle: 0.5, penumbra: 0.7, size: 0.5 });
    R4.scene.environmentIntensity = 1;
    R4.M.vol.uniforms.uSigma.value = 0.035;
    R4.M.grade.uniforms.uKey.value = 0.1;
    G4.mats.setWet(1);
  } else {
    R4.setKey(0, { pos: [9.5, 8, 5], target: [0, 1.2, 0], color: 16773340, intensity: 1700, angle: 0.5, penumbra: 0.8, size: 1.4 });
    R4.setKey(1, { pos: [-7, 4.5, -6], target: [0, 1.2, 0], color: 12375295, intensity: 420, angle: 0.4, penumbra: 0.7, size: 1 });
    R4.scene.environmentIntensity = 1;
    R4.M.vol.uniforms.uSigma.value = 4e-3;
    R4.M.grade.uniforms.uKey.value = 0.16;
    G4.mats.setWet(G4.params.wet != null ? +G4.params.wet : 0.4);
  }
  return { light };
}
async function kit(G4) {
  const R4 = G4.render, M = G4.mats;
  stage(G4);
  const names = [
    ["gunmetal", { wear: 0.8, beads: 1, wet: 0.1 }],
    ["anodized", { wear: 0.9, wearCol: [0.75, 0.75, 0.78], beads: 1, wet: 0.1 }],
    ["polymer", { beads: 0.8, wet: 0.15 }],
    ["rubber", {}],
    ["steel", { beads: 1, wet: 0.1 }],
    ["brass", {}],
    ["paint", { wear: 0.5, wearCol: [0.3, 0.3, 0.31], wearMetal: 1, wearRough: 0.45 }],
    ["cloth", { wet: 0.9, wetRough: 0.8 }],
    ["leather", { wet: 0.6 }],
    ["skin", { wet: 0.4, wetRough: 0.6 }],
    ["gore", {}],
    ["bone", {}],
    ["hair", {}],
    ["concrete", { wet: 0.8, wetRough: 0.35 }]
  ];
  const tints = { paint: [0.75, 0.16, 0.1], cloth: [0.3, 0.36, 0.3], leather: [0.2, 0.13, 0.08], hair: [0.25, 0.18, 0.1] };
  const root = new Group();
  names.forEach(([n, o], i) => {
    const mat = M.surface("kit-" + n, n, o), col = tints[n] || [1, 1, 1];
    const parts = [];
    parts.push(lathe([[0, 0], [0.085, 0], [0.09, 5e-3], [0.09, 0.03], [0.07, 0.045], [0.07, 0.06], [0.078, 0.064], [0.078, 0.072], [0.07, 0.076], [0.07, 0.1], [0.055, 0.15], [0.04, 0.17], [0.04, 0.2], [0.05, 0.205], [0.05, 0.22], [0.045, 0.225], [0, 0.225]], 40, { col }));
    parts.push(T(bevelBox(0.26, 0.04, 0.26, 6e-3, 2, col), 0, -0.02, 0));
    const tag = extrude(chamRect(-0.06, 0, 0.06, 0.1, 0.012), 0, 8e-3, 15e-4, [slot(0, 0.07, 0.06, 0.012, 5), circlePts(-0.03, 0.03, 0.01, 14), circlePts(0.03, 0.03, 0.01, 14)], { col });
    parts.push(xf(tag, { p: [0, 0, 0.105], r: [-0.25, 0, 0] }));
    parts.push(tube([[-0.1, 0.01, -0.1], [-0.11, 0.06, -0.05], [-0.1, 0.1, 0.02], [-0.07, 0.06, 0.08], [-0.1, 0.012, 0.11]], 6e-3, 10, { col }));
    const g2 = merge(parts);
    const me = new Mesh(g2, mat);
    me.castShadow = me.receiveShadow = true;
    me.position.set((i % 7 - 3) * 0.34, 0.04, Math.floor(i / 7) * -0.42 + 0.2);
    me.rotation.y = 0.5;
    root.add(me);
  });
  R4.scene.add(root);
  return { cam: [0.2, 0.75, 1.35], target: [0, 0.12, -0.05], fov: 50, info: { log: M.log } };
}
var WPOSE = {
  side: [Math.PI, [1.12, 1.3, 0.11], [0, 1.235, 0.11], 30],
  right: [0, [1.12, 1.3, -0.11], [0, 1.235, -0.11], 30],
  top: [Math.PI * 0.86, [0.62, 1.8, -0.42], [0, 1.24, 0.12], 32],
  hands: [Math.PI, [0.4, 1.4, 0.02], [0.02, 1.215, 0.25], 30],
  rhand: [0, [0.36, 1.22, 0.27], [0.03, 1.16, 0.09], 30],
  muzzle: [Math.PI, [0.26, 1.37, 0.98], [0, 1.262, 0.44], 30],
  optic: [Math.PI, [0.2, 1.4, -0.26], [0, 1.31, 0.02], 30],
  lower: [Math.PI, [0.34, 1.26, 0.04], [0, 1.2, 0.03], 30],
  fp: [Math.PI * 0, [0, 1.25, 0], [0, 1.25, -1], 54],
  lhand: [Math.PI, [0.3, 1.2, 0.5], [0, 1.17, 0.2], 30],
  under: [0, [0.25, 0.95, 0.1], [0, 1.2, -0.05], 34],
  // extra close-ups of this rifle's own features
  port: [0, [0.3, 1.36, -0.02], [0, 1.27, -0.04], 26],
  front: [0, [0.34, 1.34, -0.52], [0, 1.26, -0.33], 28],
  stock: [0, [0.42, 1.3, 0.36], [0, 1.22, 0.22], 30]
};
async function weapon(G4) {
  const R4 = G4.render;
  stage(G4);
  const pose = WPOSE[G4.params.wpose] ? G4.params.wpose : "side", f3 = WPOSE[pose];
  const isP = G4.params.gun === "pistol", rifle = isP ? createPistol(G4, { layer: 0 }) : createRifle(G4, { layer: 0 });
  rifle.root.position.set(0, 1.25, 0);
  rifle.root.rotation.set(0, f3[0], 0);
  if (isP) {
    R4.scene.add(rifle.root);
    G4.rifle = rifle;
    let hs = null;
    if (G4.params.hands !== "0") {
      const h = createHands(G4, { layer: 0, sides: ["right"] });
      rifle.root.add(h.right);
      hs = h.stats;
    }
    if (G4.params.slide) rifle.slide.position.z = rifle.PISTOL.slideTravel * +G4.params.slide;
    const PP = { side: [Math.PI, [0.5, 1.25, 0], [0, 1.205, 0], 30], right: [0, [0.5, 1.25, 0], [0, 1.205, 0], 30], top: [Math.PI * 0.86, [0.28, 1.52, -0.2], [0, 1.24, 0.02], 32], q: [Math.PI * 0.75, [0.36, 1.36, 0], [0, 1.215, 0], 30], rear: [0, [0.12, 1.33, 0.36], [0, 1.24, -0.02], 30], muzzle: [Math.PI, [0.16, 1.3, 0.34], [0, 1.25, 0.08], 30] };
    const sp2 = (n) => {
      const q = PP[n];
      if (!q) return null;
      rifle.root.rotation.set(0, q[0], 0);
      return { cam: q[1], target: q[2], fov: q[3] };
    }, p0 = sp2(PP[G4.params.wpose] ? G4.params.wpose : "side");
    return { cam: p0.cam, target: p0.target, fov: p0.fov, setPose: sp2, info: { pistol: { total: rifle.stats.total, body: rifle.stats.body.total, slide: rifle.stats.slide.total, mag: rifle.stats.mag.total, trig: rifle.stats.trig.total }, hands: hs && { right: hs.right.total } } };
  }
  R4.scene.add(rifle.root);
  G4.rifle = rifle;
  let hstats = null;
  if (G4.params.hands !== "0") {
    const h = createHands(G4, { layer: 0 });
    rifle.root.add(h.right, h.left);
    G4.hands = h;
    hstats = h.stats;
  }
  const setPose = (n) => {
    const q = WPOSE[n];
    if (!q) return null;
    rifle.root.rotation.set(0, q[0], 0);
    return { cam: q[1], target: q[2], fov: q[3] };
  };
  return { cam: f3[1], target: f3[2], fov: f3[3], info: { rifle: { total: rifle.stats.total, body: rifle.stats.body.total }, hands: hstats && { right: hstats.right.total, left: hstats.left.total } }, setPose };
}
var HPOSE = { back: [[0, 1.62, 0.02], [0, 1.2, 0], 30], palm: [[0, 0.78, 0.02], [0, 1.2, 0], 30], thumb: [[0.42, 1.3, 0], [0, 1.2, 0], 30], tips: [[0.1, 1.36, -0.4], [0, 1.2, 0.02], 30], q: [[0.3, 1.45, -0.22], [0, 1.2, 0.02], 30] };
async function hand(G4) {
  stage(G4);
  const h = createHands(G4, { layer: 0, sides: ["flat"] });
  h.flat.position.set(0, 1.2, 0);
  G4.render.scene.add(h.flat);
  if (G4.params.hpose === "palm") G4.render.scene.children.forEach((c) => {
    if (c.isMesh && c.geometry.type !== "BufferGeometry") c.visible = false;
  });
  const f3 = HPOSE[G4.params.hpose] || HPOSE.q;
  const setPose = (n) => {
    const q = HPOSE[n];
    return q ? { cam: q[0], target: q[1], fov: q[2] } : null;
  };
  return { cam: f3[0], target: f3[1], fov: f3[2], info: { hand: h.stats.flat }, setPose };
}
async function view(G4) {
  stage(G4);
  const vm = createViewmodel(G4);
  G4.vm = vm;
  const setPose = (n) => {
    const m = /^(p?)r([ln])([0-9.]+)$/.exec(n), cam = { cam: [0, 1.62, 0], target: [0, 1.58, -3], fov: 74 };
    if (m) {
      vm.reset(m[1] ? "pistol" : "rifle");
      Object.assign(vm.state, { low: 0, reloadT: +m[3], rack: m[2] === "l", lock: !!m[1] && m[2] === "l" });
      vm.apply();
      return cam;
    }
    const pw = n.startsWith("p_"), base = pw ? n.slice(2) : n;
    vm.state.reloadT = -1;
    vm.state.low = 0;
    vm.state.lock = false;
    if (base === "ads") vm.set({ weapon: pw ? "pistol" : "rifle", pose: "hip", ads: 1 });
    else vm.set({ weapon: pw ? "pistol" : "rifle", pose: base, ads: 0 });
    return cam;
  };
  setPose(G4.params.vpose || "hip");
  return { cam: [0, 1.62, 0], target: [0, 1.58, -3], fov: 74, info: { vm: vm.stats }, setPose };
}
var ZPOSE = {
  z2m: [[0.3, 1.62, 2], [0, 1.22, 0], 74],
  front: [[0, 1.25, 3], [0, 0.93, 0], 36],
  q34: [[1.5, 1.45, 2.3], [0, 0.95, 0], 36],
  side: [[3, 1.1, 0.2], [0, 0.93, 0.1], 36],
  back: [[-1, 1.45, -2.6], [0, 0.95, 0], 36],
  face: [[0.1, 0.05, 0.5], [0, 0.07, 0.03], 30, "head"],
  faceL: [[0.42, 0.06, 0.34], [0, 0.07, 0.03], 30, "head"],
  faceR: [[-0.42, 0.06, 0.34], [0, 0.07, 0.03], 30, "head"],
  bust: [[0.3, 0.1, 1], [0, -0.08, 0], 36, "head"],
  hands: [[0.4, 0.12, 0.5], [0, -0.06, 0], 30, "handL"],
  feet: [[0.7, 0.4, 1], [0, 0.16, 0.05], 32],
  torso: [[-0.45, 0.1, 0.95], [0, 0, 0], 36, "chest"],
  down: [[1.2, 1.7, 1.6], [0, 0.2, 0.9], 50],
  lod: [[0, 1.3, 4.6], [0, 0.95, 0], 40]
};
async function zombie(G4) {
  stage(G4);
  const type = G4.params.ztype || "walker", seed = +(G4.params.zseed || 1), lods = G4.params.lods ? G4.params.lods.split(",").map(Number) : [0];
  const Z = createZombie(G4, { type, seed, lods });
  Z.place(0, 0, 0);
  G4.render.scene.add(Z.root);
  G4.zombie = Z;
  const tgt = new Vector3(0, 0, 40);
  let poseName = G4.params.zpose || "z2m";
  const extra = [];
  if (G4.params.lodrow) {
    [1, 2].forEach((l, i) => {
      const z2 = createZombie(G4, { type, seed, lods: [l] });
      z2.place((i + 1) * 0.95, 0, 0);
      G4.render.scene.add(z2.root);
      extra.push(z2);
    });
    Z.place(-0.95, 0, 0);
  }
  const sim = (sec, dt = 1 / 60) => {
    const n = Math.round(sec / dt);
    for (let i = 0; i < n; i++) {
      Z.update(dt, G4.zNoTarget ? null : tgt);
      for (const e of extra) e.update(dt, tgt);
    }
    return { state: Z.state, pos: Z.pos.toArray().map((v) => +v.toFixed(3)), hipY: +Z.hipY.toFixed(3) };
  };
  window.__zsim = sim;
  window.__zhit = (x, y, z, zone, f4) => Z.hit(new Vector3(x, y, z).normalize(), zone, f4);
  window.__zkill = (x, y, z, zone) => Z.kill(new Vector3(x, y, z).normalize(), zone);
  window.__ztarget = (x, z) => tgt.set(x, 0, z);
  window.__zlod = (i) => Z.setLod(i);
  if (G4.params.clay || G4.params.wire) {
    const cm = new MeshStandardMaterial({ color: 10263708, roughness: 0.78, metalness: 0, side: DoubleSide, wireframe: !!G4.params.wire });
    Z.root.traverse((o) => {
      if (o.isSkinnedMesh) o.material = cm;
    });
  }
  const hipRest = Z.bn.hips.position.y;
  const zdef = (name) => {
    const bn = Z.bn, D = Math.PI / 180, q = (b, x, y, z) => b.quaternion.multiply(new Quaternion().setFromEuler(new Euler(x, y, z)));
    for (const b of Z.bones) b.quaternion.identity();
    bn.hips.position.set(0, hipRest, 0);
    if (name === "elbow") {
      q(bn.foreL, -120 * D, 0, 0);
      q(bn.foreR, -90 * D, 0, 0);
    }
    if (name === "knee") {
      q(bn.thighL, -70 * D, 0, 0);
      q(bn.shinL, 120 * D, 0, 0);
      q(bn.thighR, -30 * D, 0, 0);
      q(bn.shinR, 60 * D, 0, 0);
    }
    if (name === "raise") {
      q(bn.armL, 0, 0, 70 * D);
      q(bn.armR, -100 * D, 0, 0.5);
    }
    if (name === "down") {
      q(bn.armL, 0, 0, -36 * D);
      q(bn.armR, 0, 0, 36 * D);
    }
    if (name === "neck") {
      q(bn.neck, 0, 35 * D, 0);
      q(bn.head, 0.15, 35 * D, 0);
    }
    if (name === "jaw") q(bn.jaw, 0.5, 0, 0);
    if (name === "twist") {
      q(bn.handL, 0, 80 * D, 0);
      q(bn.armR, 0, 60 * D, 0);
      q(bn.thighL, 0, 40 * D, 0);
    }
    if (Z.helpers) Z.helpers();
    Z.root.updateMatrixWorld(true);
    return name;
  };
  window.__zdef = zdef;
  if (G4.params.zdef) zdef(G4.params.zdef);
  else sim(+(G4.params.zt || 1.6));
  const frame2 = (n) => {
    const q = ZPOSE[n];
    if (!q) return null;
    const o = q[3] ? Z.bonePos(q[3], new Vector3()) : G4.params.lodrow ? new Vector3(0, 0, Z.pos.z) : new Vector3(Z.pos.x, 0, Z.pos.z);
    return { cam: [q[0][0] + o.x, q[0][1] + o.y, q[0][2] + o.z], target: [q[1][0] + o.x, q[1][1] + o.y, q[1][2] + o.z], fov: q[2] };
  };
  const f3 = frame2(poseName) || frame2("z2m");
  return { ...f3, info: { zombie: Z.stats, lods: Z.lods.map((l) => l.stats.total) }, setPose: (n) => {
    poseName = n;
    return frame2(n);
  } };
}
var SHOWCASES = { kit, weapon, hand, view, zombie };

