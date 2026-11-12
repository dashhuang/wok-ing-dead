var ss5 = sstep;
var bell3 = (x) => Math.exp(-x * x);
var SOLE_FRONT = 0.196;
var SOLE_BACK = 0.088;
var CELLS = [6e-3, 8e-3, 0.011, 0.02];
var LAST = {
  commuter: { toeR: 0.04, ballR: 0.047, heelR: 0.037, toeH: 0.026, sole: 0.011, heel: 0.024, collar: 0.104, laces: 5, cap: 1, shaft: 0, bucket: "leather", welt: 4e-3 },
  patient: { toeR: 0.043, ballR: 0.049, heelR: 0.039, toeH: 0.031, sole: 0.016, heel: 0.019, collar: 0.088, laces: 0, cap: 0, shaft: 0, bucket: "rubber", welt: 2e-3, holes: 1 },
  guard: { toeR: 0.043, ballR: 0.05, heelR: 0.04, toeH: 0.032, sole: 0.018, heel: 0.03, collar: 0.2, laces: 7, cap: 1, shaft: 1, bucket: "leather", welt: 6e-3 }
};
var cone2 = (x, z, ax, az, bx3, bz, ra, rb) => {
  const ex = bx3 - ax, ez = bz - az;
  let t = ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(x - ax - ex * t, z - az - ez * t) - (ra + (rb - ra) * t);
};
function shoePrims(B2, O2, s) {
  const L = LAST[O2.kind], An = B2.J[s > 0 ? "footL" : "footR"], Kn = B2.J[s > 0 ? "shinL" : "shinR"], q = (lx3, y, lz3) => [An[0] + s * lx3, y, An[2] + lz3], sc2 = 0.96 + 0.06 * B2.bk;
  const zb = -SOLE_BACK + L.heelR, zt = SOLE_FRONT - L.toeR, zm = 0.1, off = 5e-3;
  const out2 = (lx3, lz3) => smin(cone2(lx3, lz3, 0, zb, off, zm, L.heelR, L.ballR), cone2(lx3, lz3, off, zm, -3e-3, zt, L.ballR, L.toeR), 0.02);
  const topY = (lz3) => L.sole + (L.heel - L.sole) * ss5(0.012, -4e-3, lz3), botY = (lz3) => L.heel > L.sole + 4e-3 ? 7e-3 * bell3((lz3 - 0.036) / 0.022) : 0;
  const soleFn = (x, y, z) => {
    const lx3 = (x - An[0]) * s, lz3 = z - An[2], d2 = out2(lx3, lz3) - L.welt, t = topY(lz3), b = botY(lz3), dy = Math.max(y - t, b - y);
    return smax(d2, dy, 3e-3);
  };
  const sole = new Fn([An[0] - 0.07, -0.01, An[2] - SOLE_BACK - 0.01, An[0] + 0.07, L.heel + 6e-3, An[2] + SOLE_FRONT + 0.01], soleFn);
  const sy = L.sole, ax = [Kn[0] - An[0], Kn[1] - An[1], Kn[2] - An[2]], al = Math.hypot(ax[0], ax[1], ax[2]), leg = (t) => [An[0] + ax[0] / al * t, An[1] + ax[1] / al * t, An[2] + ax[2] / al * t - 4e-3];
  const U = [];
  U.push(ell(q(-2e-3, sy + 2e-3, zt - 0.012), [L.toeR * 1.06, L.toeH * 1.55, L.toeR * 1.3]).blend(0.012));
  U.push(cap(q(3e-3, sy + 4e-3, zm + 0.012), q(1e-3, sy + 0.036, 0.03), L.ballR * 1.02, 0.043 * sc2).blend(0.02));
  U.push(cap(q(1e-3, sy + 0.022, 0.03), q(0, sy + 0.012, zb + 4e-3), 0.046 * sc2, L.heelR * 1.04).blend(0.016));
  U.push(ell(q(0, sy + 0.022, zb + 4e-3), [L.heelR * 1.04, 0.066, L.heelR * 1.04]).blend(0.012));
  U.push(cap(leg(-0.02), leg(L.collar - An[1] + 0.01), 0.043 * sc2, (L.shaft ? 0.05 : 0.041) * sc2).blend(0.014));
  if (L.shaft) U.push(cap(leg(0.03), leg(L.collar - An[1]), 0.049 * sc2, 0.053 * sc2).blend(0.02));
  const ins = (t) => {
    const a = q(0, sy + L.toeH * 0.7 + 0.03, zm - 0.012), b = L.shaft ? [leg(L.collar - An[1] - 0.012)[0], L.collar - 0.012, leg(0)[2] + 0.05 * sc2] : q(0, sy + 0.083, 0.03);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  if (L.laces) {
    U.push(cap(ins(-0.05), ins(1), 0.02, 0.024).blend(8e-3));
    for (let i = 0; i < L.laces; i++) {
      const p = ins((i + 0.6) / (L.laces + 0.3)), w = 0.017 + 4e-3 * (i / L.laces), up = 0.0215 + 3e-3 * (i / L.laces);
      U.push(cap([p[0] - w, p[1] + up * 0.8, p[2] + up * 0.6 - 4e-3], [p[0] + w, p[1] + up * 0.8, p[2] + up * 0.6 + (i % 2 ? 6e-3 : -2e-3)], 28e-4).blend(2e-3));
    }
  }
  if (L.cap) U.push(new Fn([An[0] - 0.06, 0, An[2] + zt - 0.035, An[0] + 0.06, 0.08, An[2] + zt - 0.015], (x, y, z) => Math.abs(z - An[2] - (zt - 0.026) + 0.012 * ((x - An[0]) * s / 0.045) ** 2) - 12e-4).sub(35e-4));
  if (L.holes) for (let i = 0; i < 6; i++) {
    const a = i % 3 - 1, r = i < 3 ? 0 : 1;
    U.push(cap(q(a * 0.017, sy + 0.02, zm + 0.02 - r * 0.026), q(a * 0.017, sy + 0.09, zm + 0.01 - r * 0.026), 45e-4).sub(2e-3));
  }
  const hole = cap(leg(L.collar - An[1] - 0.045), leg(L.collar - An[1] + 0.06), 0.034 * sc2, (L.shaft ? 0.043 : 0.036) * sc2).sub(4e-3);
  const upFn = (x, y, z) => {
    let m = BIG;
    for (const p of U) {
      const v = p.d(x, y, z);
      m = p.op === 1 ? smax(m, -v, p.k) : smin(m, v, p.k);
    }
    const lx3 = (x - An[0]) * s, lz3 = z - An[2];
    m = smax(m, out2(lx3, lz3) + 15e-4 * ss5(sy, sy + 0.05, y), 5e-3);
    return smax(m, topY(lz3) - 4e-3 - y, 2e-3);
  };
  const box2 = [An[0] - 0.07, -0.012, An[2] - SOLE_BACK - 0.012, An[0] + 0.07, L.collar + 0.02, An[2] + SOLE_FRONT + 0.012];
  const upper = new Fn(box2.slice(), upFn);
  return { upper, sole, hole, box: box2, L, An, leg, topY, s };
}
function buildShoe(B2, O2, s, lod) {
  const sp2 = shoePrims(B2, O2, s), c = CELLS[lod], b = sp2.box, G4 = Grid.box([b[0], b[1], b[2]], [b[3], b[4], b[5]], c), GS = new Grid(G4.xs, G4.ys, G4.zs), L = sp2.L;
  G4.add([sp2.upper], 0.012);
  const solid = new Grid(G4.xs, G4.ys, G4.zs, 0);
  solid.d.set(G4.d);
  G4.add([sp2.hole], 0.012);
  GS.add([sp2.sole], 0.012);
  let up = meshGrid(G4, { smooth: 1 });
  const top = L.collar, wob = (x, z) => 4e-3 * Math.sin(Math.atan2(z - sp2.An[2] + 0.01, x - sp2.An[0]) * 2 + 1.2);
  up = clip(up, (x, y, z) => top - y + wob(x, z) - (L.shaft ? 0 : 0.016 * ss5(0, 0.05, z - sp2.An[2])));
  up = dropIslands(up, 30);
  gradNormals(up, G4);
  const ao = fieldAO(up, G4, 8e-3), nv0 = up.P.length / 3;
  up.ao = new Float32Array(nv0);
  up.ao.set(ao);
  let so = meshGrid(GS, { smooth: 1 });
  const SP = so.P;
  for (let i = 1; i < SP.length; i += 3) if (SP[i] < 45e-4) SP[i] = 0;
  gradNormals(so, GS);
  so.ao = fieldAO(so, GS, 6e-3);
  const inside = (x, y, z) => x > b[0] && x < b[3] && y < top - 0.012 && z > b[2] && z < b[5] && solid.at(x, y, z) < -1e-3;
  return { upper: up, sole: so, G: G4, inside, sp: sp2 };
}

