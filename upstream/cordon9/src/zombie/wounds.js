var ss6 = sstep;
var cl4 = clamp2;
var bell4 = (x) => Math.exp(-x * x);
var add32 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var mul32 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
var sub32 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var nrm2 = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
function meet(lists, from, to) {
  const d = nrm2(sub32(to, from)), f3 = (p2) => {
    let m = BIG;
    for (const L of lists) {
      const v = evalPrims(L, p2[0], p2[1], p2[2]);
      if (v < m) m = v;
    }
    return m;
  };
  let p = from.slice(), t = 0;
  for (let i = 0; i < 60; i++) {
    const v = f3(p);
    if (v < 4e-4) break;
    t += Math.max(v * 0.8, 6e-4);
    p = add32(from, mul32(d, t));
    if (t > 0.6) break;
  }
  const e = 4e-3, n = nrm2([f3([p[0] + e, p[1], p[2]]) - f3([p[0] - e, p[1], p[2]]), f3([p[0], p[1] + e, p[2]]) - f3([p[0], p[1] - e, p[2]]), f3([p[0], p[1], p[2] + e]) - f3([p[0], p[1], p[2] - e])]);
  return { p, n };
}
function woundPlan(B2, R4) {
  const { h, bk, side: side2, J, zo } = B2, rnd = rng(B2.seed * 631 + 7), rr = (a, b) => a + (b - a) * rnd(), W = [], lists = [R4.torso, R4.legs, R4.arms];
  const put = (name, from, to, r, d, long, el2, bone, o = {}) => {
    const s = meet(lists, from, to);
    W.push({ name, p: s.p, n: s.n, r, d, long, el: el2, bone, tear: 1, ...o });
  };
  const sA = side2 > 0 ? "L" : "R", sL = side2 > 0 ? "R" : "L";
  put("neck", [side2 * 0.11, 1.6 * h, 0.12 + zo(1.5 * h)], [side2 * 0.03, 1.44 * h, zo(1.44 * h)], rr(0.036, 0.046), 0.017, nrm2([side2 * 0.6, 0.6, -0.3]), 1.25, BI.chest, { tear: 0.8 });
  put("belly", [-side2 * 0.04 * bk, 1.1 * h, 0.4], [-side2 * 0.02 * bk, 1.1 * h, 0], rr(0.05, 0.064) * (0.7 + 0.3 * bk), 0.034, [0.25 * side2, 1, 0], 1.2, BI.spine);
  {
    const E = J["fore" + sA], Wr = J["hand" + sA], t = rr(0.36, 0.5), c = [E[0] + (Wr[0] - E[0]) * t, E[1] + (Wr[1] - E[1]) * t, E[2] + (Wr[2] - E[2]) * t], ax = nrm2(sub32(Wr, E));
    put("forearm", [c[0] + side2 * 0.05, c[1] + 0.06, c[2] + 0.12], c, 0.03, 0.021, ax, 1.9, BI["fore" + sA], { axisT: t });
  }
  {
    const Kn = J["shin" + sL], An = J["foot" + sL], t = rr(0.34, 0.5), c = [Kn[0] + (An[0] - Kn[0]) * t, Kn[1] + (An[1] - Kn[1]) * t, Kn[2] + (An[2] - Kn[2]) * t];
    put("shin", [c[0] - side2 * 0.03, c[1], c[2] + 0.2], c, 0.031, 0.017, nrm2(sub32(An, Kn)), 2.1, BI["shin" + sL], { axisT: t });
  }
  return W;
}
function carvePrims(B2, W) {
  return W.map((w, i) => {
    const F2 = frame(w.long, w.n), c = add32(w.p, mul32(w.n, -w.d * 0.12));
    return new Rough(ell(c, [w.r, w.r * w.el, w.d], F2), 55e-4, 62, B2.seed + i * 3, 3).sub(5e-3);
  });
}
function craterAt(W, x, y, z, o) {
  let best = 0, bi = -1;
  for (let i = 0; i < W.length; i++) {
    const w = W[i], dx = x - w.p[0], dy = y - w.p[1], dz = z - w.p[2], dn = dx * w.n[0] + dy * w.n[1] + dz * w.n[2], dl = dx * w.long[0] + dy * w.long[1] + dz * w.long[2];
    const pr = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - dn * dn - dl * dl)), q = Math.hypot(pr / w.r, dl / (w.r * w.el));
    if (q > 1.15) continue;
    const k = cl4(-dn / w.d + 0.12) * ss6(1.15, 0.85, q);
    if (k > best) {
      best = k;
      bi = i;
    }
  }
  if (o) o.i = bi;
  return best;
}
function bloodField(B2, W) {
  const s3 = B2.seed * 1.7;
  return (x, y, z) => {
    let b = 0;
    for (const w of W) {
      const dx = x - w.p[0], dy = y - w.p[1], dz = z - w.p[2], dh = Math.hypot(dx, dz) / w.r, far = Math.hypot(dh, dy / w.r);
      if (far > 5 && dy > 0) continue;
      const n = fbm(x * 31 + s3, y * 9, z * 31, 2), run = dy < 0 ? bell4(dh / (0.75 + 0.5 * n)) * ss6(-0.34 - 0.2 * n, 0, dy) * 0.85 : 0;
      b = Math.max(b, bell4(far / 1.2) * 1.1, 0.55 * bell4(far / 2.4) * (0.6 + 0.8 * n), run);
    }
    return b > 1 ? 1 : b;
  };
}
function tearField(B2, W) {
  const s3 = B2.seed * 2.3;
  return (x, y, z) => {
    let m = 1;
    for (const w of W) {
      if (!w.tear) continue;
      const dx = x - w.p[0], dy = y - w.p[1], dz = z - w.p[2], d = Math.hypot(dx, dy, dz);
      if (d > w.r * 3) continue;
      const dl = dx * w.long[0] + dy * w.long[1] + dz * w.long[2], pr = Math.sqrt(Math.max(0, d * d - dl * dl)), q = Math.hypot(pr / w.r, dl / (w.r * w.el)), v = (q - w.tear * (1 + 0.7 * (fbm(x * 38 + s3, y * 38, z * 38, 2) - 0.45))) * w.r;
      if (v < m) m = v;
    }
    return m;
  };
}
function innerLayer(B2, w, body, lod) {
  if (lod > 1) return [];
  const cell = lod ? 6e-3 : 4e-3, out = [], s = B2.seed, rnd = rng(s * 53 + w.name.length * 7), rr = (a, b) => a + (b - a) * rnd(), F2 = frame(w.long, w.n), X = F2[0], Y = F2[1], Z = F2[2];
  const at = (u, v, dpt) => [w.p[0] + X[0] * u + Y[0] * v - w.n[0] * dpt, w.p[1] + X[1] * u + Y[1] * v - w.n[1] * dpt, w.p[2] + X[2] * u + Y[2] * v - w.n[2] * dpt], ext = w.r * w.el + 0.02;
  const mesh = (prims, bucket, sink = 25e-4, c = cell) => {
    let bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of prims) for (let a = 0; a < 3; a++) {
      bb[a] = Math.min(bb[a], p.bb[a]);
      bb[a + 3] = Math.max(bb[a + 3], p.bb[a + 3]);
    }
    for (let a = 0; a < 3; a++) {
      bb[a] = Math.max(bb[a], w.p[a] - ext - 0.02) - c * 2;
      bb[a + 3] = Math.min(bb[a + 3], w.p[a] + ext + 0.02) + c * 2;
    }
    if (bb[0] >= bb[3] || bb[1] >= bb[4] || bb[2] >= bb[5]) return;
    const G4 = Grid.box([bb[0], bb[1], bb[2]], [bb[3], bb[4], bb[5]], c).add(prims, c * 2);
    G4.map((v, x, y, z) => smax(v, body.at(x, y, z) + sink, 2e-3));
    const m = meshGrid(G4, { smooth: 1 });
    if (!m.I.length) return;
    m.ao = fieldAO(m, G4, 5e-3);
    out.push({ bucket, m, bone: w.bone });
  };
  if (w.name === "forearm" || w.name === "shin") {
    const arm = w.name === "forearm", sfx = arm ? B2.side > 0 ? "L" : "R" : B2.side > 0 ? "R" : "L", a = B2.J[(arm ? "fore" : "shin") + sfx], b = B2.J[(arm ? "hand" : "foot") + sfx], Lb = limb(a, b, sfx === "L" ? 1 : -1), t0 = w.axisT - (ext + 0.01) / Lb.L, t1 = w.axisT + (ext + 0.01) / Lb.L;
    if (arm) mesh([cap(Lb.at(t0, 0.0105, 4e-3), Lb.at(t1, 85e-4, 6e-3), 82e-4, 74e-4).blend(0), cap(Lb.at(t0, -0.011, -2e-3), Lb.at(t1, -95e-4, 2e-3), 68e-4, 62e-4).blend(1e-3)], "bone");
    else mesh([cap(Lb.at(t0, -6e-3, 0.013), Lb.at(t1, -4e-3, 0.011), 0.0135, 0.0115).blend(0), cap(Lb.at(t0, 0.022, -0.012), Lb.at(t1, 0.02, -0.01), 62e-4, 56e-4).blend(1e-3)], "bone");
    const st = [];
    for (let i = 0; i < 5; i++) {
      const u = rr(-0.6, 0.6) * w.r, v0 = -ext * rr(0.7, 1), v1 = ext * rr(0.7, 1), dp = w.d * rr(0.35, 0.8), sag = rr(2e-3, 6e-3), pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        pts.push(at(u + 4e-3 * Math.sin(t * 5 + i), v0 + (v1 - v0) * t, dp - sag * Math.sin(t * Math.PI)));
      }
      st.push(chain2(pts, (t) => 22e-4 + 22e-4 * Math.sin(t * Math.PI)).blend(3e-3));
    }
    mesh(st, "gore", 15e-4);
  }
  if (w.name === "belly") {
    const pts = [], n = 26, ph = rr(0, 6);
    for (let k = 0; k <= n; k++) {
      const t = k / n, a = t * 15 + ph, u = w.r * 0.62 * Math.sin(a) * (0.6 + 0.4 * Math.sin(t * 7)), v = w.r * w.el * (0.75 - 1.5 * t) + 0.012 * Math.cos(a * 1.7), dp = w.d * (0.5 + 0.28 * Math.cos(a * 0.9 + 1));
      pts.push(at(u, v, dp));
    }
    mesh([chain2(pts, 0.0125).blend(25e-4)], "gut", -4e-3, cell * 1.4);
    const rib = [];
    for (let i = 0; i < 2; i++) {
      const v = w.r * w.el * (0.95 - i * 0.42), pts2 = [];
      for (let k = 0; k <= 5; k++) {
        const t = k / 5 - 0.5;
        pts2.push(at(t * w.r * 2.4, v + 0.012 * t * t * 4, w.d * 0.3 + 0.01 * (1 - 4 * t * t) * -1 + 0.012));
      }
      rib.push(chain2(pts2, 52e-4).blend(1e-3));
    }
    mesh(rib, "bone", 3e-3);
  }
  if (w.name === "neck") {
    const st = [];
    for (let i = 0; i < 6; i++) {
      const u = (i / 5 - 0.5) * w.r * 1.5 + rr(-4e-3, 4e-3), pts = [];
      for (let k = 0; k <= 5; k++) {
        const t = k / 5;
        pts.push(at(u + 4e-3 * Math.sin(t * 4 + i * 2), (t - 0.5) * 2 * ext * 0.9, w.d * (0.45 + 0.4 * Math.sin(t * Math.PI)) - 2e-3));
      }
      st.push(chain2(pts, (t) => 3e-3 + 3e-3 * Math.sin(t * Math.PI + i)).blend(4e-3));
    }
    mesh(st, "gore", 15e-4);
  }
  return out;
}

