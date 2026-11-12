var BARKC = [0.3, 0.27, 0.23];
var TAU3 = PI5 * 2;
var add33 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
var len32 = (a) => Math.hypot(a[0], a[1], a[2]);
var nrm3 = (a) => {
  const l = len32(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
var cross2 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var rot = (v, k, a) => {
  const c = Math.cos(a), s = Math.sin(a), d = v[0] * k[0] + v[1] * k[1] + v[2] * k[2], x = cross2(k, v);
  return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)];
};
var perp = (d) => nrm3(Math.abs(d[1]) < 0.9 ? cross2(d, [0, 1, 0]) : cross2(d, [1, 0, 0]));
function cardGeo(cards) {
  const pos = [], nor = [], uv = [], idx = [], col = [];
  for (const [o, u, v, rc, n, t] of cards) {
    const b = pos.length / 3, t0 = [t[0] * 0.55, t[1] * 0.55, t[2] * 0.55];
    pos.push(o[0] - u[0], o[1] - u[1], o[2] - u[2], o[0] + u[0], o[1] + u[1], o[2] + u[2], o[0] + u[0] + v[0], o[1] + u[1] + v[1], o[2] + u[2] + v[2], o[0] - u[0] + v[0], o[1] - u[1] + v[1], o[2] - u[2] + v[2]);
    for (let k = 0; k < 4; k++) nor.push(n[0], n[1], n[2]);
    uv.push(rc[0], rc[1], rc[2], rc[1], rc[2], rc[3], rc[0], rc[3]);
    col.push(...t0, ...t0, ...t, ...t);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return fromArrays(pos, nor, uv, idx, col);
}
var subRect = (rc, u0, v0, u1, v1) => [lerp2(rc[0], rc[2], u0), lerp2(rc[1], rc[3], v0), lerp2(rc[0], rc[2], u1), lerp2(rc[1], rc[3], v1)];
function limb2(P3, R4, a, dir, len, r0, depth, o, tips) {
  const n = depth === 0 ? 3 : 2, seg = depth === 0 ? 12 : depth === 1 ? 8 : depth === 2 ? 6 : 4;
  let p = a, d = dir, r = r0;
  const mids = [];
  for (let i = 0; i < n; i++) {
    const ax2 = perp(d), ax22 = cross2(d, ax2);
    d = nrm3(add33(add33(add33(d, ax2, (R4() - 0.5) * o.wander), ax22, (R4() - 0.5) * o.wander), [0, 1, 0], o.lift * (depth > 0 ? 1 : 0.2)));
    const q = add33(p, d, len / n), r1 = r * (i === n - 1 ? 0.62 : 0.84);
    P3.bar("bark", p, add33(q, d, r1 * 0.5), r, { r2: r1, seg, caps: depth === 0 && i === 0, col: BARKC, jit: 0.1 });
    mids.push([q, d, r1]);
    p = q;
    r = r1;
  }
  if (depth >= o.depth || r < 0.018) {
    tips.push([p, d, 1]);
    return;
  }
  const forks = depth === 0 ? o.forks : R4() < 0.35 ? 3 : 2, ax = perp(d), spin = R4() * TAU3;
  for (let k = 0; k < forks; k++) {
    const az = rot(ax, d, spin + k / forks * TAU3 + (R4() - 0.5) * 0.7), nd = rot(d, az, o.spread * (0.7 + R4() * 0.6));
    limb2(P3, R4, p, nd, len * (0.62 + R4() * 0.2), r * 0.95, depth + 1, o, tips);
  }
  if (depth > 0 && depth < o.depth - 1 && R4() < 0.6) {
    const [q, qd, qr] = mids[0], az = rot(perp(qd), qd, R4() * TAU3);
    limb2(P3, R4, q, rot(qd, az, o.spread * 1.3), len * 0.5, qr * 0.6, depth + 1, o, tips);
  }
  if (depth >= o.depth - 1) tips.push([mids[0][0], d, 0.7]);
}
var tree = (seed = 1, o = {}) => proto("ftree" + seed + JSON.stringify({ ...o, sheet: 0 }), () => {
  const P3 = new Prop("tree", seed), R4 = rng(seed * 131 + 7), F2 = o.sheet, Ht = o.h || 9, kind = o.kind || "leaf", bare = kind === "bare", r0 = Ht * 0.023 + 0.06, tips = [], lean = o.lean || [0, 0];
  const opt = { depth: bare ? 5 : 4, wander: 0.22, lift: 0.1, spread: o.spread || 0.52, forks: o.forks || 3 };
  {
    const g2 = lathe([[r0 * 2.1, -0.05], [r0 * 1.7, 0.06], [r0 * 1.25, 0.25], [r0 * 1.05, 0.6], [r0, 0.9]], 14);
    deform(g2, (q) => {
      const a = Math.atan2(q.z, q.x), k = 1 + 0.22 * Math.sin(a * 5 + seed) * clamp2(1 - q.y / 0.5);
      q.x *= k;
      q.z *= k;
    }, true);
    P3.add("bark", g2, BARKC, { jit: 0.12 });
  }
  limb2(P3, R4, [0, 0.85, 0], nrm3([lean[0], 1, lean[1]]), Ht * 0.36, r0, 0, opt, tips);
  if (bare) {
    for (const [p, d] of tips) for (let k = 0; k < 3; k++) {
      const az = rot(perp(d), d, R4() * TAU3), nd = rot(d, az, 0.3 + R4() * 0.6);
      P3.bar("bark", p, add33(p, nd, 0.5 + R4() * 0.7), 0.012, { r2: 4e-3, seg: 3, caps: false, col: [0.2, 0.18, 0.16] });
    }
  } else if (F2) {
    const cards = [], rc = F2.rect(0), c0 = [0, Ht * 0.68, 0], keep = kind === "thin" ? 0.45 : 1, tint = o.tint || [1, 1, 1];
    for (const [p, d, sz] of tips) {
      const m = Math.round((3 + R4() * 2) * sz);
      for (let k = 0; k < m; k++) {
        if (R4() > keep) continue;
        const s = (1.5 + R4() * 1.3) * (0.7 + 0.3 * sz) * (Ht / 10 + 0.25), up = nrm3(add33(add33(d, [R4() - 0.5, R4() * 0.5, R4() - 0.5], 1.1), [0, 1, 0], 0.25)), side2 = rot(perp(up), up, R4() * TAU3), out = nrm3(add33(add33(p, c0, -1), [0, 1, 0], 1.2)), n = nrm3(add33(out, cross2(side2, up), 0.35 * (R4() < 0.5 ? 1 : -1))), g2 = 0.7 + R4() * 0.5, sh = 0.62 + 0.38 * clamp2((p[1] - Ht * 0.35) / (Ht * 0.5));
        cards.push([add33(p, up, -s * 0.18), [side2[0] * s * 0.5, side2[1] * s * 0.5, side2[2] * s * 0.5], [up[0] * s, up[1] * s, up[2] * s], rc, n, [tint[0] * g2 * sh * (0.9 + R4() * 0.25), tint[1] * g2 * sh, tint[2] * g2 * sh * 0.9]]);
      }
    }
    P3.add("foliage", cardGeo(cards), null);
  }
  P3.col([-r0 * 1.2, 0, -r0 * 1.2], [r0 * 1.2, 3.2, r0 * 1.2], { surface: "wood" });
  return P3.finish({ grime: 0.5, ground: 0.5 });
});
var conifer = (seed = 1, o = {}) => proto("fconif" + seed + JSON.stringify({ ...o, sheet: 0 }), () => {
  const P3 = new Prop("conifer", seed), R4 = rng(seed * 57 + 3), F2 = o.sheet, Ht = o.h || 8, Rb = o.r || 1.5, brown2 = o.brown || 0, flat = o.top || 0;
  P3.bar("bark", [0, 0, 0], [(R4() - 0.5) * 0.2, Ht * 0.96, (R4() - 0.5) * 0.2], 0.14, { r2: 0.02, seg: 7, col: BARKC });
  const prof = (t) => Rb * (0.35 + 0.65 * Math.pow(Math.sin(clamp2(t * 1.15 + 0.12) * PI5 * 0.92), 0.7)) * (1 - clamp2((t - 0.72 + flat * 0.3) / 0.3) * (1 - flat * 0.6)) * (0.9 + 0.2 * vnoise(t * 5, seed, 0));
  {
    const pr = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pr.push([Math.max(0.01, prof(t) * 0.62), 0.35 + t * (Ht - 0.6)]);
    }
    P3.add("black", lathe(pr, 9), null);
  }
  if (F2) {
    const cards = [], rc = F2.rect(1), tiers = Math.round(Ht / 0.55);
    for (let j = 0; j < tiers; j++) {
      const t = (j + 0.5) / tiers, y = 0.3 + t * (Ht - 0.4), r = prof(t), m = Math.max(5, Math.round(r * 7));
      for (let k = 0; k < m; k++) {
        const a = k / m * TAU3 + j * 1.3 + (R4() - 0.5) * 0.4, out = [Math.cos(a), 0, Math.sin(a)], tan = [-out[2], 0, out[0]], s = 0.9 + R4() * 0.7, droop = 0.5 + R4() * 0.5, dead = R4() < brown2 * (0.4 + 0.6 * vnoise(a * 1.3, t * 4, seed)), g2 = 0.55 + R4() * 0.4;
        const top = [out[0] * r * 0.35, y + s * 0.5, out[2] * r * 0.35], v = nrm3([-out[0] * (1 - droop * 0.5), droop, -out[2] * (1 - droop * 0.5)]), bot = add33(top, v, -s * 1.15), n = nrm3(add33(out, [0, 1, 0], 0.45));
        cards.push([bot, [tan[0] * s * 0.5, 0, tan[2] * s * 0.5], [v[0] * s * 1.15, v[1] * s * 1.15, v[2] * s * 1.15], rc, n, dead ? [g2 * 1.5, g2 * 0.8, g2 * 0.45] : [g2, g2, g2]]);
      }
    }
    P3.add("foliage", cardGeo(cards), null);
  }
  P3.col([-0.5, 0, -0.5], [0.5, 3, 0.5], { surface: "wood" });
  return P3.finish({ grime: 0.3, ground: 0.5 });
});
var hedge = (seed = 1, o = {}) => proto("fhedge" + seed + JSON.stringify({ ...o, sheet: 0 }), () => {
  const P3 = new Prop("hedge", seed), R4 = rng(seed * 41 + 13), F2 = o.sheet, L = o.len || 8, Ht = o.h || 1.9, D = o.d || 1, gaps = o.gaps || [], dead = o.dead || 0, n = Math.max(1, Math.round(L / 1.25)), sl = L / n;
  const inGap = (u) => gaps.some(([a, b]) => u > a && u < b), top = (u) => Ht * (0.86 + 0.28 * vnoise(u * 0.7, seed, 1.5)) + 0.25 * vnoise(u * 2.3, 4, seed);
  const cards = [], rc = F2 ? F2.rect(2) : null;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) * sl, x = -L / 2 + u;
    if (inGap(u)) {
      for (let k = 0; k < 3; k++) P3.bar("bark", [x + (R4() - 0.5) * sl, 0, (R4() - 0.5) * 0.4], [x + (R4() - 0.5) * sl, 0.3 + R4() * 0.5, (R4() - 0.5) * 0.5], 0.015, { r2: 6e-3, seg: 4, col: [0.2, 0.18, 0.16] });
      continue;
    }
    const h = top(u);
    P3.box("black", sl + 0.02, h * 0.82, D * 0.6, x, 0.12, 0, { base: true, b: 0 });
    for (let k = 0; k < 4; k++) P3.bar("bark", [x + (R4() - 0.5) * sl, 0, (R4() - 0.5) * 0.3], [x + (R4() - 0.5) * sl, 0.5, (R4() - 0.5) * D * 0.6], 0.02, { r2: 0.012, seg: 4, caps: false, col: [0.22, 0.2, 0.17] });
    if (!F2) continue;
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
      const g2 = 0.6 + R4() * 0.45, dd = R4() < dead, w = sl * (0.75 + R4() * 0.2), hh = h * (0.95 + R4() * 0.2) + k * 0.12, zz = s * (D / 2 - k * D * 0.2) + (R4() - 0.5) * 0.08, xo = x + (k ? (R4() - 0.5) * sl * 0.6 : 0), tl = (R4() - 0.5) * 0.24, u0 = R4() * 0.3;
      cards.push([[xo, o.stems ? 0.28 : 0.02, zz - s * 0.1], [w, 0, tl * s], [tl, hh, s * (0.1 + R4() * 0.1)], subRect(rc, u0, 0, u0 + 0.7, 1), nrm3([tl, 0.5, s]), dd ? [g2 * 1.4, g2 * 0.85, g2 * 0.5] : [g2, g2, g2]]);
    }
    {
      const g2 = 0.75 + R4() * 0.35;
      cards.push([[x, h * 0.93, D * 0.5], [sl * 0.6, 0, 0], [0, (R4() - 0.5) * 0.1, -D], subRect(rc, R4() * 0.4, 0.02, 0.6 + R4() * 0.4, 0.5), [0, 1, 0], [g2, g2, g2]]);
    }
    for (let k = 0; k < 2; k++) {
      const a = R4() * PI5, g2 = 0.7 + R4() * 0.4, w = 0.5 + R4() * 0.3;
      cards.push([[x + (R4() - 0.5) * sl, h * 0.8, (R4() - 0.5) * D * 0.5], [Math.cos(a) * w, 0, Math.sin(a) * w], [(R4() - 0.5) * 0.3, 0.6 + R4() * 0.5, (R4() - 0.5) * 0.3], subRect(rc, R4() * 0.4, 0.25, 0.6 + R4() * 0.4, 1), [0, 1, 0], [g2, g2, g2]]);
    }
  }
  if (cards.length) P3.add("foliage", cardGeo(cards), null);
  let p = 0;
  for (const [a, b] of [...gaps].sort((x, y) => x[0] - y[0]).concat([[L, L]])) {
    if (a - p > 0.3) P3.col([-L / 2 + p, 0, -D * 0.4], [-L / 2 + a, Ht, D * 0.4], { surface: "wood" });
    p = b;
  }
  return P3.finish({ grime: 0.3, ground: 0.4 });
});
var weeds = (seed = 1, o = {}) => proto("fweeds" + seed + JSON.stringify({ ...o, sheet: 0 }), () => {
  const P3 = new Prop("weeds", seed), R4 = rng(seed * 23 + 17), F2 = o.sheet, n = o.n || 9, r = o.r || 0.8, Ht = o.h || 0.75, cards = [], rc = F2 ? F2.rect(3) : null;
  if (F2) for (let k = 0; k < n; k++) {
    const a = R4() * PI5, w = 0.45 + R4() * 0.5, h = Ht * (0.6 + R4() * 0.8), x = o.strip ? (R4() - 0.5) * o.strip : (R4() - 0.5) * 2 * r * Math.sqrt(R4()), z = (R4() - 0.5) * 2 * r * (o.strip ? 0.4 : Math.sqrt(R4())), g2 = 0.75 + R4() * 0.5, u0 = R4() * 0.45;
    cards.push([[x, -0.02, z], [Math.cos(a) * w, 0, Math.sin(a) * w], [(R4() - 0.5) * 0.25, h, (R4() - 0.5) * 0.25], subRect(rc, u0, 0, u0 + 0.55, 0.5 + 0.5 * clamp2(h / Ht)), nrm3([(R4() - 0.5) * 0.6, 1, (R4() - 0.5) * 0.6]), [g2, g2 * (0.9 + R4() * 0.2), g2 * 0.8]]);
  }
  if (cards.length) P3.add("foliage", cardGeo(cards), null);
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0, ground: 0.2 });
});
var ivy = (seed = 1, o = {}) => proto("fivy" + seed + JSON.stringify({ ...o, sheet: 0 }), () => {
  const P3 = new Prop("ivy", seed), R4 = rng(seed * 61 + 29), F2 = o.sheet, W = o.w || 3, Ht = o.h || 3, fill2 = o.fill ?? 0.7, cards = [], rc = F2 ? F2.rect(4) : null, rs = F2 ? F2.rect(5) : null;
  const dens = (x, y) => clamp2(1.25 * fbm(x * 0.9 + seed, y * 0.7, 2.2, 3) + 0.5 * (1 - Math.abs(x) / (W / 2)) * (0.4 + 0.6 * (o.drape ? y / Ht : 1 - 0.5 * y / Ht)) - (1 - fill2));
  for (let s = 0; s < Math.max(2, Math.round(W / 0.9)); s++) {
    let x = (R4() - 0.5) * W * 0.7, y = 0;
    const pts = [[x, 0, 0.02]];
    while (y < Ht * (0.5 + R4() * 0.5)) {
      y += 0.3 + R4() * 0.2;
      x += (R4() - 0.5) * 0.4;
      pts.push([clamp2(x, -W / 2, W / 2), y, 0.015 + R4() * 0.02]);
    }
    if (pts.length > 2) P3.tube("bark", pts, 0.012 + R4() * 0.012, { seg: 4, samples: pts.length * 2, col: [0.24, 0.2, 0.16] });
  }
  if (F2) for (let j = 0; j < Ht / 0.34; j++) for (let i = 0; i < W / 0.34; i++) {
    const x = -W / 2 + (i + R4()) * 0.34, y = (j + R4()) * 0.34, d = dens(x, y);
    if (R4() > d * 1.3) continue;
    const thin = d < 0.32, s = thin ? 0.7 + R4() * 0.4 : 0.62 + R4() * 0.4, a = thin ? (R4() - 0.5) * 0.5 : R4() * TAU3, g2 = 0.6 + R4() * 0.45, fl = R4() < 0.5 ? 1 : -1, yc = Math.min(y, Ht + (o.drape ? 0.3 : -0.1));
    cards.push([[x + (thin ? 0 : Math.sin(a) * s * 0.5), thin ? yc - s : yc - Math.cos(a) * s * 0.5, 0.04 + R4() * 0.07], [Math.cos(a) * s * 0.5 * fl, Math.sin(a) * s * 0.5 * fl, 0], [-Math.sin(a) * s, Math.cos(a) * s, (R4() - 0.3) * 0.1], thin ? rs : rc, nrm3([(R4() - 0.5) * 0.5, 0.35, 1]), [g2 * 0.85, g2 * 0.95, g2 * 0.8]]);
  }
  if (cards.length) P3.add("foliage", cardGeo(cards), null);
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 0, ground: 0.2 });
});
var deadFall = (seed = 1, o = {}) => proto("ffall" + seed + JSON.stringify({ ...o, sheet: 0 }), () => {
  const P3 = new Prop("deadFall", seed), R4 = rng(seed * 97 + 5), F2 = o.sheet, L = o.len || 4, tips = [];
  P3.push({ p: [-L / 2, 0.16, 0], r: [0, 0, -H + 0.06] });
  limb2(P3, R4, [0, 0, 0], [0, 1, 0], L * 0.55, 0.13, 1, { depth: 3, wander: 0.3, lift: 0, spread: 0.5, forks: 2 }, tips);
  P3.pop();
  P3.cyl("wood", 0.125, 0.03, -L / 2 - 5e-3, 0.16, 0, { axis: "x", seg: 9, col: [0.72, 0.6, 0.4] });
  for (let k = 0; k < 4; k++) P3.box("wood", 0.18 + R4() * 0.2, 0.02, 0.03, -L / 2 - 0.1, 0.1 + k * 0.04, (R4() - 0.5) * 0.14, { col: [0.7, 0.58, 0.38], b: 4e-3, r: [0, (R4() - 0.5) * 0.4, (R4() - 0.5) * 0.3] });
  if (F2 && o.leaves !== false) {
    const cards = [], rc = F2.rect(0);
    for (let k = 0; k < 9; k++) {
      const x = L * (0.05 + R4() * 0.45), z = (R4() - 0.5) * 1.6, s = 0.9 + R4() * 0.7, a = R4() * TAU3, g2 = 0.45 + R4() * 0.3;
      cards.push([[x, 0.03 + R4() * 0.25, z], [Math.cos(a) * s * 0.5, 0, Math.sin(a) * s * 0.5], [-Math.sin(a) * s, 0.15 + R4() * 0.3, Math.cos(a) * s], rc, [0, 1, 0], [g2 * 1.2, g2, g2 * 0.7]]);
    }
    P3.add("foliage", cardGeo(cards), null);
  }
  P3.col([-L / 2, 0, -0.18], [L * 0.1, 0.32, 0.18], { surface: "wood", noNav: true });
  return P3.finish({ grime: 0.5, ground: 0.3 });
});

