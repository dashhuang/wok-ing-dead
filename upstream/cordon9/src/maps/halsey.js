// NOTE: esbuild emitted this module in 2 separate parts; they are joined here in bundle order.
var halsey_exports = {};
__export(halsey_exports, {
  build: () => build,
  meta: () => meta
});


var meta = { id: "halsey", title: "Halsey Street", sub: "Checkpoint \xB7 street canyon", viewpoints: null };
function build(G4) {
  const W = buildArena(G4);
  const drops = W.ground && W.ground.drops || [], xw = ROAD.hw + ROAD.kerb, ss11 = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const groundY2 = (x, z) => {
    const ax = Math.abs(x);
    if (ax <= ROAD.hw) return 0;
    let top = ROAD.walkY;
    const sd = x > 0 ? 1 : -1;
    for (const d of drops) if (d[2] === sd && z > d[0] - 0.6 && z < d[1] + 0.6) {
      const k = Math.max(0, Math.min(1, 1 - (ax - xw) / 1.2)) * ss11(d[0] - 0.6, d[0], z) * (1 - ss11(d[1], d[1] + 0.6, z));
      top = ROAD.walkY - k * (ROAD.walkY - 0.05);
      break;
    }
    return ax >= ROAD.hw + 0.25 ? top : top * ((ax - ROAD.hw) / 0.25);
  };
  W.id = meta.id;
  W.bounds = BOUNDS;
  W.groundY = groundY2;
  W.surfaceAt = (x) => Math.abs(x) > ROAD.hw + 0.3 ? "concrete" : "asphalt";
  W.rayGround = (ox, oy, oz, dx, dy) => {
    let tg = -oy / dy;
    const gx = ox + dx * tg;
    if (Math.abs(gx) > ROAD.hw + 0.25) tg = (ROAD.walkY - oy) / dy;
    return tg;
  };
  W.nav = { cell: 0.5, x0: -16, x1: 16, z0: -34, z1: 34, rel: false, lo: 0.5, hi: 1.6, ray: 80 };
  W.fx = { splashGLSL: `float cxSplashY(vec2 xz){ return abs(xz.x) > ${(ROAD.hw + 0.25).toFixed(2)} ? ${ROAD.walkY.toFixed(2)} : 0.0; }`, roofGLSL: "float cxRoof(vec3 p){ return 0.0; }", floor: (x) => Math.abs(x) > ROAD.hw + 0.25 ? ROAD.walkY + 0.01 : 0.01 };
  W.env = { cam: [0, 2, 4], probe: [0, 2.4, 3] };
  W.look = {};
  W.rules = null;
  W.botHome = [1.2, 10];
  W.viewpoints = meta.viewpoints;
  W.points = { generator: [-4.9, -8.9], drops: [[0.2, -17.6], [0.2, 1.6], [0.9, 18.6]], caches: [[-4.6, -1.9], [4.7, 9], [5.2, -12.2], [-7.9, 3.6]] };
  return W;
}

