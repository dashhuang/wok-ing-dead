function propSets(A, WAT) {
  return {
    barriers: [
      () => jersey(1),
      () => jersey(2, { stripe: true, atlas: A }),
      () => waterBarrier(1, "orange"),
      () => waterBarrier(2, "white"),
      () => crowdBarrier(1),
      () => crowdBarrier(2, { sign: "tape", atlas: A }),
      () => concreteBlock(1, { stripe: true, atlas: A }),
      () => hedgehog(1),
      () => sandbags(1, { len: 2.4, rows: 4, deep: 2 })
    ],
    fence: [() => fencePanel(1), () => fencePanel(2, { tarp: "green", sign: "quarantine", atlas: A }), () => fencePanel(3, { tarp: "white" }), () => boomGate(1, { atlas: A })],
    booth: [() => guardBooth(1, { atlas: A }), () => cabinet(1, { atlas: A })],
    tower: [() => lightTower(1, { atlas: A, h: 5 })],
    tent: [() => deconTent(1, { atlas: A })],
    poles: [() => streetLamp(1, { atlas: A, h: 5, sign: "curfew" }), () => trafficLight(1, { atlas: A, arm: 3 })],
    cars: [() => sedan(1, { atlas: A, door: 1, smash: 1 }), () => sedan(2, { atlas: A, kind: "patrol" })],
    ambo: [() => ambulance(1, { atlas: A })],
    bus: [() => bus(1, { atlas: A })],
    bld: [
      () => building(1, { atlas: A, watlas: WAT, w: 8, floors: 3, style: "brick", shop: "shopNoodle", mode: "glass", shopLit: true, awning: [0.5, 0.1, 0.08], blade: "neonR", fire: [-1.6, 1.8], lit: [[1, 9], [4, 12], [7, 20]], tank: 1.5 }),
      () => building(2, { atlas: A, watlas: WAT, w: 7, floors: 2, style: "stucco", shop: "shopPharm", mode: "shutter", graf: "grafNoCure", blade: "neonG", cross: true, lamps: 3, door: "l", lit: [[0, 10]] })
    ],
    clutter: [() => bodyBag(1), () => crate(1, { atlas: A }), () => pallet(1, { stack: 3 }), () => tyres(1), () => suitcase(1), () => suitcase(2, { lay: true, open: 2.2 }), () => duffel(1), () => wheelieBin(1, { open: 1.9 }), () => trashBags(1), () => hydrant(1), () => cartons(1)],
    street: [() => dumpster(1, { atlas: A }), () => bench(1), () => gurney(1, { watlas: WAT }), () => busShelter(1, { atlas: A, smash: true }), () => postBox(1, { atlas: A }), () => burnBarrel(1), () => manhole(1), () => drain(1), () => ammoCan(1, { atlas: A }), () => medKit(1, { atlas: A })],
    traffic: [() => bollard(1), () => cone(1), () => cone(2, true), () => drum(1), () => barricade(1, { sign: "roadclosed", atlas: A }), () => signPost(1, { sign: "quarantine", atlas: A, h: 3 }), () => signPost(2, { sign: "stop", sign2: "lane1", atlas: A }), () => signStand(1, { sign: "detour", atlas: A })]
  };
}
function propMeshes(G4, prop) {
  const mats = G4.fmats || worldMaterials(G4), grp = new Group();
  for (const [k, arr] of prop.B.map) {
    const mat = mats[k] || worldMaterials(G4)[k];
    if (!mat) throw new Error('no world material "' + k + '" (prop ' + prop.name + ")");
    const g2 = merge(arr.map((x) => x.clone()));
    g2.computeBoundingSphere();
    const me = new Mesh(g2, mat);
    me.castShadow = !/^(decal|mark|em|lamp|neon|led|win|glassT)/.test(k);
    me.receiveShadow = true;
    if (mat.transparent) me.renderOrder = 3;
    grp.add(me);
  }
  return grp;
}
async function props(G4) {
  const R4 = G4.render, WAT = worldAtlases(), A = WAT.signs;
  stage(G4);
  const name = G4.params.set || "barriers", sets = Object.assign(propSets(A, WAT), fieldSets(G4, name)), list = sets[name];
  if (!list) throw new Error("unknown prop set " + name);
  let x = 0, tris = 0;
  const info = {}, centres = [];
  const built = list.map((f3) => f3());
  const total = built.reduce((s, p) => s + p.size[0] + 0.9, -0.9);
  x = -total / 2;
  for (const p of built) {
    const g2 = propMeshes(G4, p);
    const cx = x + p.size[0] / 2 - (p.min[0] + p.max[0]) / 2;
    g2.position.set(cx, 0, 0);
    g2.rotation.y = 0;
    R4.scene.add(g2);
    centres.push([x + p.size[0] / 2, p.size[1] / 2, p.size]);
    x += p.size[0] + 0.9;
    tris += p.tris;
    info[p.name + p.seed] = p.tris;
  }
  const span = Math.max(4, total), POSES = { front: [[0, 1.6, span * 0.62 + 2], [0, 0.9, 0], 50], left: [[-span * 0.45, 1.7, span * 0.42 + 1], [0, 0.8, 0], 50], right: [[span * 0.45, 1.7, span * 0.42 + 1], [0, 0.8, 0], 50], back: [[span * 0.3, 2.2, -span * 0.5 - 2], [0, 0.8, 0], 50], top: [[0, span * 0.7 + 3, 1.5], [0, 0, 0], 50] };
  centres.forEach(([cx, cy, sz], i) => {
    const d = Math.max(sz[0], sz[1], sz[2]) * 1.15 + 0.7;
    POSES["p" + i] = [[cx + d * 0.55, cy + d * 0.3 + 0.3, d * 0.85], [cx, cy, 0], 45];
    POSES["q" + i] = [[cx - d * 0.6, cy + d * 0.2 + 0.2, -d * 0.8], [cx, cy, 0], 45];
  });
  const setPose = (n) => {
    const p = POSES[n];
    return p ? { cam: p[0], target: p[1], fov: p[2] } : null;
  };
  const p0 = setPose(G4.params.pose || "front");
  return { cam: p0.cam, target: p0.target, fov: p0.fov, setPose, info: { set: name, tris, props: info, poses: Object.keys(POSES) } };
}
var VIEWPOINTS = {
  v01: [[1.2, 1.65, 16.2], [0.4, 1.4, 0]],
  v02: [[2.5, 1.65, 19.5], [-3.5, 1.2, 10]],
  v03: [[-0.6, 1.65, 4.6], [3.5, 1.3, -0.6]],
  v04: [[0, 1.65, -19], [0, 1.5, 0]],
  v05: [[-7.8, 1.8, 14.5], [-7.4, 1.5, -10]],
  v06: [[7.8, 1.8, -19], [7.3, 1.5, 10]],
  v07: [[2, 1.65, -13], [-9.6, 3, -13.4]],
  v08: [[-1.6, 1.65, 1.4], [-9.6, 1.8, 0]],
  v09: [[-0.6, 1.65, -11.5], [1.6, 3.4, -30]],
  v10: [[0.2, 1.65, 11.6], [0.6, 2, 26]],
  v11: [[-4.6, 1.65, -12.4], [-13, 1.6, -12.8]],
  v12: [[2.6, 1.65, -3.4], [-4.5, 2.6, -9.5]],
  over: [[9, 11, 24], [-2, 0, -2]],
  puddle: [[-0.4, 0.75, 4.2], [-1.4, 0, 1.2]],
  east: [[-3, 1.65, 6], [9.6, 2.5, 9]],
  tent: [[-2.2, 1.65, 15.2], [-3.4, 1.3, 9]],
  pharm: [[-3.2, 1.65, -6.2], [-9.6, 2.6, -8.4]],
  bags: [[5.3, 1.25, -5.2], [4.5, 0.4, -2.5]],
  bags2: [[0.5, 1.3, 3.9], [2.1, 0.45, 2.3]],
  bags3: [[-2.9, 1.2, -0.9], [-4.3, 0.4, -2.9]],
  door1: [[-0.2, 1.3, -14.9], [-2, 0.7, -16]],
  taxi: [[6.6, 1.4, 15.9], [5.2, 0.75, 17.1]],
  taxi2: [[1.9, 1.35, 15.2], [4, 0.8, 16.8]],
  skyN: [[0.5, 1.65, 6], [1.5, 17, -60]],
  skyS: [[-0.5, 1.65, -6], [-4, 17, 60]],
  skyE: [[-5, 1.65, 2], [40, 22, -30]]
};
MAPS.halsey.meta.viewpoints = VIEWPOINTS;
async function arena(G4) {
  const R4 = G4.render, W = pickMap(G4.params.map).build(G4), VP = W.viewpoints;
  G4.world = W;
  R4.scene.environmentIntensity = +(G4.params.env || 1);
  R4.M.vol.uniforms.uSigma.value = +(G4.params.sigma || 65e-4);
  R4.M.grade.uniforms.uKey.value = +(G4.params.key || 0.11);
  const look = createLook(G4, W);
  if (W.look && W.look.setup) W.look.setup(G4, look);
  if (G4.params.envscene !== "0") {
    W.update(0.016, 0, R4.camera.position.set(W.env.cam[0], W.env.cam[1], W.env.cam[2]));
    R4.bakeEnvFromScene(new Vector3(W.env.probe[0], W.env.probe[1], W.env.probe[2]));
  }
  const setPose = (n) => {
    const p = VP[n];
    return p ? { cam: p[0], target: p[1], fov: p[2] || 74 } : null;
  }, p0 = setPose(G4.params.pose || Object.keys(VP)[0]);
  return { cam: p0.cam, target: p0.target, fov: 74, setPose, update: (dt, t) => W.update(dt, t, R4.camera.position), info: { ...W.stats, look: look.name, cones: look.cones.length } };
}
var SHOW = { props, arena };

