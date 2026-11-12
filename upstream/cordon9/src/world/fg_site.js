var SITE = {
  fence: { x0: -37, x1: 37, z0: -48.5, z1: 46 },
  bounds: { x0: -36.4, x1: 36.4, z0: -47.2, z1: 45.4 },
  nav: { x0: -44, x1: 44, z0: -54, z1: 52 },
  pitch: { x0: -21, x1: 15, z0: -27, z1: 27 },
  park: { x0: 19, x1: 46, z0: -34, z1: 34 },
  // asphalt car park and the access road out through the east gate
  apron: { x0: -24, x1: 13, z0: -31.4, z1: -29.6 },
  // concrete strip along the gymnasium front
  gym: { x0: -21, x1: 9, z0: -47.5, z1: -31.5, floor: 0.15, wall: 0.3, eave: 7.2, ridge: 9.4 },
  gymDoors: { south: [[-6, 2.8], [4.2, 2]], east: [[-39.5, 2]], north: [[-14, 2]], west: [[-40, 2]] },
  // [centre along wall, width]
  block: { x0: 13, x1: 30, z0: -46.5, z1: -37.5, h: 3.4 },
  // changing block (solid, one open door)
  stand: { xf: -24.6, tread: 0.8, rise: 0.4, tiers: 10, deck: -35.6, z0: -17, z1: 17, aisles: [-11.4, 0, 11.4], aisleW: 1.7, ramp0: -24 },
  press: { x0: -35.6, x1: -33.3, z0: -5, z1: 5, h: 2.5 },
  tents: [{ x: -11, z: 9.5, w: 10, d: 6, h: 3.1, name: "triage" }, { x: 4, z: 13.5, w: 6, d: 10, h: 3.1, name: "ward" }, { x: -9.5, z: 20.5, w: 8, d: 5, h: 2.8, name: "supply" }],
  heli: { x: -3.5, z: -12.5, yaw: 0.42 },
  masts: [{ x: 17.8, z: -21, on: 1 }, { x: -26.4, z: 21, on: 2 }, { x: 17.8, z: 1.5, on: 3 }, { x: -26.4, z: -21, on: 0 }, { x: 17.8, z: 21, on: 0 }, { x: -36.3, z: 8.5, on: 0 }],
  start: { p: [3.5, 3], yaw: 2.6 }
};
var S = SITE;
var ST = S.stand;
var G = S.gym;
var deckY = ST.rise * ST.tiers;
var SILL = 0.45;
var DECK_Y = deckY;
var inR2 = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
function groundY(x, z) {
  if (x < ST.xf && x > ST.deck && z > ST.z0 && z < ST.z1) {
    const u = ST.xf - x, k = Math.floor(u / ST.tread), f3 = Math.min(1, (u - k * ST.tread) / 0.3);
    for (const a of ST.aisles) if (Math.abs(z - a) < ST.aisleW / 2) return Math.min(deckY, (u + 0.15) * (ST.rise / ST.tread));
    return Math.min(deckY, (k + f3 * f3 * (3 - 2 * f3)) * ST.rise);
  }
  if (inR2(G, x, z)) return G.floor;
  if (inR2(G, x, z, G.wall + SILL)) {
    const D = S.gymDoors, d = Math.max(G.x0 - x, x - G.x1, G.z0 - z, z - G.z1), k = G.floor * (1 - d / (G.wall + SILL));
    for (const [c, w] of D.south) if (z > G.z1 && Math.abs(x - c) < w / 2) return k;
    for (const [c, w] of D.north) if (z < G.z0 && Math.abs(x - c) < w / 2) return k;
    for (const [c, w] of D.east) if (x > G.x1 && Math.abs(z - c) < w / 2) return k;
    for (const [c, w] of D.west) if (x < G.x0 && Math.abs(z - c) < w / 2) return k;
  }
  return 0;
}
function surfaceAt(x, z) {
  if (x < ST.xf && x > ST.deck && z > ST.z0 && z < ST.z1) return "metal";
  if (inR2(G, x, z)) return "wood";
  if (inR2(S.park, x, z)) return "asphalt";
  if (inR2(S.apron, x, z) || inR2(S.block, x, z, 2.5)) return "concrete";
  return "dirt";
}
function rayGround(ox, oy, oz, dx, dy, dz) {
  let t = -oy / dy;
  if (inR2(G, ox + dx * t, oz + dz * t)) t = (G.floor - oy) / dy;
  return t;
}
var f = (v) => v.toFixed(3);
var rect = (r, m = 0) => `(p.x > ${f(r.x0 - m)} && p.x < ${f(r.x1 + m)} && p.z > ${f(r.z0 - m)} && p.z < ${f(r.z1 + m)})`;
var roofGLSL = `float cxRoof(vec3 p){ if (${rect(G, G.wall)} && p.y < ${f(G.ridge)}) return 1.0; if (${rect(S.block)} && p.y < ${f(S.block.h)}) return 1.0; if (${rect(S.press)} && p.y < ${f(deckY + S.press.h)}) return 1.0;
${S.tents.map((t) => `  if (abs(p.x - ${f(t.x)}) < ${f(t.w / 2)} && abs(p.z - ${f(t.z)}) < ${f(t.d / 2)} && p.y < ${f(t.h)} - ${f((t.h - 2) / (Math.min(t.w, t.d) / 2))} * ${t.w < t.d ? `abs(p.x - ${f(t.x)})` : `abs(p.z - ${f(t.z)})`}) return 1.0;`).join("\n")}
  return 0.0; }`;
var splashGLSL = `float cxSplashY(vec2 q){ vec3 p = vec3(q.x, 0.0, q.y);
  if (${rect(G, G.wall + 0.5)} || ${rect(S.block, 0.4)} || ${rect(S.press)}) return -50.0;
${S.tents.map((t) => `  if (abs(p.x - ${f(t.x)}) < ${f(t.w / 2)} && abs(p.z - ${f(t.z)}) < ${f(t.d / 2)}) return -50.0;`).join("\n")}
  if (p.x < ${f(ST.xf)} && p.x > ${f(ST.deck)} && p.z > ${f(ST.z0)} && p.z < ${f(ST.z1)}) return min(${f(deckY)}, (floor((${f(ST.xf)} - p.x) / ${f(ST.tread)}) + 1.0) * ${f(ST.rise)});
  return 0.0; }`;

