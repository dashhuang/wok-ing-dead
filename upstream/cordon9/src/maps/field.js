// NOTE: esbuild emitted this module in 2 separate parts; they are joined here in bundle order.
var field_exports = {};
__export(field_exports, {
  build: () => build2,
  meta: () => meta2
});


var VIEWS = {
  f01: [[3.5, 1.7, 3], [-3.5, 1.6, -12.5], 74],
  f02: [[-3, 1.7, 25], [-3, 2.2, 0], 74],
  f03: [[-33, 5.7, 4], [0, 0.5, -2], 74],
  f04: [[-20, 1.75, -40.4], [0, 1.5, -38.6], 74],
  f05: [[26.6, 1.7, 0.5], [31, 2.2, -20], 74],
  f06: [[33.5, 1.7, 8], [-10, 2.5, 4], 74],
  f07: [[5, 1.7, -19.5], [-4, 1.7, -12], 74],
  f08: [[-15, 1.6, 9.5], [-6, 1.4, 9.8], 74],
  f09: [[-22.5, 1.7, 30], [-27, 5, 20], 74],
  f10: [[-5, 1.7, -22], [-6, 3.2, -32], 74],
  f11: [[-23, 1.7, -33], [-34, 1.6, -42], 74],
  f12: [[-6, 1.7, 36], [9, 1.8, 32], 74],
  f13: [[11.2, 1.7, -33], [11.2, 2, -48], 74],
  f14: [[-34.6, 5.7, -3.5], [-10, 1, 6], 74],
  f15: [[22.4, 1.7, -20.3], [34, 1.9, -19.7], 74],
  f16: [[-23, 1.7, -14], [-30, 3.2, 2], 74],
  top: [[34, 58, 62], [-2, 0, -4], 50]
};
var meta2 = { id: "field", title: "Thornwake Athletic Ground", sub: "Evacuation Point 4 \xB7 open ground", viewpoints: VIEWS };
function lookSetup(G4, look) {
  const R4 = G4.render, m = G4.fmats || {}, cold = look.name === "cold";
  if (!G4.params.sigma) R4.M.vol.uniforms.uSigma.value = cold ? 0.017 : 85e-4;
  if (cold) {
    R4.M.vol.uniforms.uMaxDist.value = 90;
    const wr = { turf: 0.36, mud: 0.16, gravel: 0.34, block: 0.42, court: 0.3, pvc: 0.3, milpaint: 0.4 };
    for (const n in wr) {
      const u = m[n] && m[n].userData.u;
      if (u) u.uWetP.value.y = wr[n];
    }
    if (m.milpaint) m.milpaint.roughness *= 0.9;
  }
}
function build2(G4) {
  const W = buildField(G4), B2 = SITE.bounds;
  W.id = meta2.id;
  W.bounds = { x0: B2.x0, x1: B2.x1, z0: B2.z0, z1: B2.z1 };
  W.groundY = groundY;
  W.surfaceAt = surfaceAt;
  W.rayGround = rayGround;
  W.nav = { cell: 0.5, x0: SITE.nav.x0, x1: SITE.nav.x1, z0: SITE.nav.z0, z1: SITE.nav.z1, rel: true, lo: 0.34, hi: 1.6, ray: 130 };
  W.fx = { splashGLSL, roofGLSL, floor: (x, z) => groundY(x, z) + 0.01 };
  W.env = { cam: [2, 2, 2], probe: [2, 2.4, 2] };
  W.look = { setup: lookSetup };
  W.botHome = [3.5, 3];
  W.rules = { pool: (q) => q === "low" ? 16 : 22, alive: (n) => Math.min(22, 7 + n * 2) };
  W.pickSpawn = (pos, rnd) => {
    let tot = 0;
    const c = [];
    for (const s of W.spawns) {
      const d = Math.hypot(s.p[0] - pos.x, s.p[1] - pos.z);
      if (d < 12) continue;
      const w = s.w * (d < 16 ? 0.4 : d > 48 ? 0.35 : 1);
      c.push([s, w]);
      tot += w;
    }
    if (!c.length) return W.spawns[0];
    let q = rnd() * tot;
    for (const [s, w] of c) {
      q -= w;
      if (q <= 0) return s;
    }
    return c[0][0];
  };
  W.routeProbes = [["hall centre", -6, -39.5], ["hall north-west", -19, -44.5], ["stand deck", -34.4, 10], ["stand tier 5", -28.4, -8], ["press box", -34.5, 0], ["triage tent", -11, 9.5], ["ward tent", 4, 13.5], ["stores tent", -9.5, 20.5], ["car park north", 24, -30], ["car park south", 26.5, 27.5], ["south-west corner", -27.5, 41.5], ["north-west yard", -30, -40], ["south strip", 6, 40], ["alley", 11.1, -40], ["helicopter side", -7, -12]];
  W.viewpoints = VIEWS;
  W.droneBounds = { x0: -24, x1: 18, z0: -30, z1: 30 };
  W.tallest = W.insts.reduce((t, it) => {
    const e = it.M.elements;
    return Math.abs(e[12]) > 38 || e[14] < -49 || e[14] > 47 ? t : Math.max(t, (it.prop.max ? it.prop.max[1] : 0) + e[13]);
  }, 0);
  W.points = { generator: [-31, 25.5], drops: [[2, -3], [-3, 24], [8, -22], [24, -8]], caches: [[-12, 2], [14, 20], [-22.8, 8], [-10, -40], [27, 14]] };
  return W;
}

