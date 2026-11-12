function quadsToTris(P3, Q2) {
  const I = new Uint32Array(Q2.length / 4 * 6);
  const d2 = (a, b) => {
    const x = P3[a * 3] - P3[b * 3], y = P3[a * 3 + 1] - P3[b * 3 + 1], z = P3[a * 3 + 2] - P3[b * 3 + 2];
    return x * x + y * y + z * z;
  };
  for (let q = 0, o = 0; q < Q2.length; q += 4, o += 6) {
    const a = Q2[q], b = Q2[q + 1], c = Q2[q + 2], d = Q2[q + 3];
    if (d2(a, c) <= d2(b, d)) {
      I[o] = a;
      I[o + 1] = b;
      I[o + 2] = c;
      I[o + 3] = a;
      I[o + 4] = c;
      I[o + 5] = d;
    } else {
      I[o] = a;
      I[o + 1] = b;
      I[o + 2] = d;
      I[o + 3] = b;
      I[o + 4] = c;
      I[o + 5] = d;
    }
  }
  return I;
}
function adjacency(nv, I) {
  const cnt = new Uint32Array(nv + 1);
  for (let i = 0; i < I.length; i++) cnt[I[i] + 1] += 2;
  for (let i = 0; i < nv; i++) cnt[i + 1] += cnt[i];
  const st = cnt.slice(), nb2 = new Uint32Array(I.length * 2), fill2 = cnt.slice(0, nv);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    nb2[fill2[a]++] = b;
    nb2[fill2[a]++] = c;
    nb2[fill2[b]++] = a;
    nb2[fill2[b]++] = c;
    nb2[fill2[c]++] = a;
    nb2[fill2[c]++] = b;
  }
  return { st, nb: nb2 };
}
function taubin(m, it = 2, lam = 0.5, mu = -0.53, lock = null) {
  const P3 = m.P, nv = P3.length / 3, { st, nb: nb2 } = m.adj || (m.adj = adjacency(nv, m.I)), T3 = new Float32Array(P3.length);
  const pass = (f3) => {
    for (let i = 0; i < nv; i++) {
      const a = st[i], b = st[i + 1];
      if (b === a || lock && lock[i]) {
        T3[i * 3] = P3[i * 3];
        T3[i * 3 + 1] = P3[i * 3 + 1];
        T3[i * 3 + 2] = P3[i * 3 + 2];
        continue;
      }
      let x = 0, y = 0, z = 0;
      for (let k = a; k < b; k++) {
        const j = nb2[k] * 3;
        x += P3[j];
        y += P3[j + 1];
        z += P3[j + 2];
      }
      const n = 1 / (b - a);
      T3[i * 3] = P3[i * 3] + f3 * (x * n - P3[i * 3]);
      T3[i * 3 + 1] = P3[i * 3 + 1] + f3 * (y * n - P3[i * 3 + 1]);
      T3[i * 3 + 2] = P3[i * 3 + 2] + f3 * (z * n - P3[i * 3 + 2]);
    }
    P3.set(T3);
  };
  for (let k = 0; k < it; k++) {
    pass(lam);
    pass(mu);
  }
  return m;
}
var _g = [0, 0, 0];
function project(m, G4, iso = 0, it = 2) {
  const P3 = m.P, lim = G4.cell;
  for (let k = 0; k < it; k++) for (let i = 0; i < P3.length; i += 3) {
    G4.grad(P3[i], P3[i + 1], P3[i + 2], _g);
    const h = G4.cell * 1.5, gl = Math.hypot(_g[0], _g[1], _g[2]) / h;
    if (gl < 0.2) continue;
    let s = (G4.at(P3[i], P3[i + 1], P3[i + 2]) - iso) / gl;
    s = s > lim ? lim : s < -lim ? -lim : s;
    const q = s / (gl * h);
    P3[i] -= _g[0] * q;
    P3[i + 1] -= _g[1] * q;
    P3[i + 2] -= _g[2] * q;
  }
  return m;
}
function gradNormals(m, G4, h) {
  const P3 = m.P, N = m.N = new Float32Array(P3.length);
  for (let i = 0; i < P3.length; i += 3) {
    G4.grad(P3[i], P3[i + 1], P3[i + 2], _g, h);
    const l = Math.hypot(_g[0], _g[1], _g[2]) || 1;
    N[i] = _g[0] / l;
    N[i + 1] = _g[1] / l;
    N[i + 2] = _g[2] / l;
  }
  return m;
}
function fieldAO(m, G4, r) {
  const P3 = m.P, N = m.N, o = new Float32Array(P3.length / 3);
  for (let i = 0, v = 0; i < P3.length; i += 3, v++) {
    const a = G4.at(P3[i] + N[i] * r, P3[i + 1] + N[i + 1] * r, P3[i + 2] + N[i + 2] * r) / r;
    o[v] = a < 0 ? 0 : a > 1 ? 1 : a;
  }
  return o;
}
function clip(m, fn, refine = 3) {
  const P3 = m.P, I = m.I, nv = P3.length / 3, S4 = new Float32Array(nv);
  let any = false, all = true;
  for (let i = 0; i < nv; i++) {
    S4[i] = fn(P3[i * 3], P3[i * 3 + 1], P3[i * 3 + 2]);
    if (S4[i] > 0) any = true;
    else all = false;
  }
  if (all) return m;
  if (!any) return { P: new Float32Array(0), I: new Uint32Array(0) };
  const map = new Int32Array(nv).fill(-1), oP = [], oI = [], cut = /* @__PURE__ */ new Map();
  let n = 0;
  const keep = (i) => {
    if (map[i] < 0) {
      map[i] = n++;
      oP.push(P3[i * 3], P3[i * 3 + 1], P3[i * 3 + 2]);
    }
    return map[i];
  };
  const cross3 = (a, b) => {
    const key = a < b ? a * nv + b : b * nv + a;
    let v = cut.get(key);
    if (v !== void 0) return v;
    let t0 = 0, t1 = 1, s0 = S4[a], s1 = S4[b], t = s0 / (s0 - s1);
    const ax = P3[a * 3], ay = P3[a * 3 + 1], az = P3[a * 3 + 2], bx3 = P3[b * 3] - ax, by = P3[b * 3 + 1] - ay, bz = P3[b * 3 + 2] - az;
    for (let k = 0; k < refine; k++) {
      const s = fn(ax + bx3 * t, ay + by * t, az + bz * t);
      if (s > 0) {
        t0 = t;
        s0 = s;
      } else {
        t1 = t;
        s1 = s;
      }
      t = t0 + (t1 - t0) * (s0 / (s0 - s1 || 1e-12));
    }
    t = t < 0.02 ? 0.02 : t > 0.98 ? 0.98 : t;
    v = n++;
    oP.push(ax + bx3 * t, ay + by * t, az + bz * t);
    cut.set(key, v);
    return v;
  };
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2], ka = S4[a] > 0, kb = S4[b] > 0, kc = S4[c] > 0, cnt = ka + kb + kc;
    if (cnt === 0) continue;
    if (cnt === 3) {
      oI.push(keep(a), keep(b), keep(c));
      continue;
    }
    let p = a, q = b, r = c;
    if (cnt === 1) {
      if (kb) {
        p = b;
        q = c;
        r = a;
      } else if (kc) {
        p = c;
        q = a;
        r = b;
      }
      oI.push(keep(p), cross3(p, q), cross3(p, r));
    } else {
      if (!kb) {
        p = b;
        q = c;
        r = a;
      } else if (!kc) {
        p = c;
        q = a;
        r = b;
      }
      const u = cross3(q, p), w = cross3(r, p), kq = keep(q), kr = keep(r);
      oI.push(u, kq, kr, u, kr, w);
    }
  }
  return { P: Float32Array.from(oP), I: Uint32Array.from(oI) };
}
function filterFaces(m, fn) {
  const P3 = m.P, I = m.I, oI = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    if (fn((P3[a] + P3[b] + P3[c]) / 3, (P3[a + 1] + P3[b + 1] + P3[c + 1]) / 3, (P3[a + 2] + P3[b + 2] + P3[c + 2]) / 3)) oI.push(I[t], I[t + 1], I[t + 2]);
  }
  return compact({ ...m, I: Uint32Array.from(oI), adj: null });
}
function compact(m) {
  const P3 = m.P, I = m.I, nv = P3.length / 3, map = new Int32Array(nv).fill(-1);
  let n = 0;
  for (let i = 0; i < I.length; i++) if (map[I[i]] < 0) map[I[i]] = n++;
  const oP = new Float32Array(n * 3), oN = m.N ? new Float32Array(n * 3) : null, oF = m.flag ? new Uint8Array(n) : null;
  for (let i = 0; i < nv; i++) {
    const j = map[i];
    if (j < 0) continue;
    oP[j * 3] = P3[i * 3];
    oP[j * 3 + 1] = P3[i * 3 + 1];
    oP[j * 3 + 2] = P3[i * 3 + 2];
    if (oN) {
      oN[j * 3] = m.N[i * 3];
      oN[j * 3 + 1] = m.N[i * 3 + 1];
      oN[j * 3 + 2] = m.N[i * 3 + 2];
    }
    if (oF) oF[j] = m.flag[i];
  }
  const oI = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) oI[i] = map[I[i]];
  return { P: oP, I: oI, N: oN, flag: oF };
}
function dropIslands(m, minTris = 12) {
  const nv = m.P.length / 3, I = m.I, par = new Int32Array(nv);
  for (let i = 0; i < nv; i++) par[i] = i;
  const find = (x) => {
    while (par[x] !== x) {
      par[x] = par[par[x]];
      x = par[x];
    }
    return x;
  };
  for (let t = 0; t < I.length; t += 3) {
    const a = find(I[t]), b = find(I[t + 1]), c = find(I[t + 2]);
    par[b] = a;
    par[c] = a;
  }
  const cnt = new Uint32Array(nv);
  for (let t = 0; t < I.length; t += 3) cnt[find(I[t])]++;
  let drop = false;
  for (let i = 0; i < nv; i++) if (cnt[i] > 0 && cnt[i] < minTris) {
    drop = true;
    break;
  }
  if (!drop) return m;
  const oI = [];
  for (let t = 0; t < I.length; t += 3) if (cnt[find(I[t])] >= minTris) oI.push(I[t], I[t + 1], I[t + 2]);
  return compact({ ...m, I: Uint32Array.from(oI), adj: null });
}
function boundaryLoops(m) {
  const I = m.I, nv = m.P.length / 3, half = /* @__PURE__ */ new Map();
  const key = (a, b) => a * nv + b;
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) half.set(key(I[t + e], I[t + (e + 1) % 3]), 1);
  const next = /* @__PURE__ */ new Map();
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = I[t + e], b = I[t + (e + 1) % 3];
    if (!half.has(key(b, a))) next.set(a, b);
  }
  const loops = [], seen = /* @__PURE__ */ new Set();
  for (const s of next.keys()) {
    if (seen.has(s)) continue;
    const L = [];
    let v = s;
    while (v !== void 0 && !seen.has(v)) {
      seen.add(v);
      L.push(v);
      v = next.get(v);
    }
    if (L.length >= 3 && v === s) loops.push(L);
  }
  return loops;
}
function isClosed(m) {
  const I = m.I, nv = m.P.length / 3, half = /* @__PURE__ */ new Set();
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) half.add(I[t + e] * nv + I[t + (e + 1) % 3]);
  let open = 0;
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) if (!half.has(I[t + (e + 1) % 3] * nv + I[t + e])) open++;
  return open;
}
function rim(m, { th = 3e-3, depth = 0.03, pick = null, bead = 0 } = {}) {
  const loops = boundaryLoops(m);
  if (!loops.length) return m;
  const P3 = Array.from(m.P), N = Array.from(m.N), I = Array.from(m.I), F2 = m.flag ? Array.from(m.flag) : new Array(m.P.length / 3).fill(0);
  let nv = P3.length / 3;
  for (const L of loops) {
    let T3 = th, Dp = depth, Bd = bead;
    if (pick) {
      const r = pick(L, m);
      if (r === false) continue;
      if (r && typeof r === "object") {
        T3 = r.th ?? T3;
        Dp = r.depth ?? Dp;
        Bd = r.bead ?? Bd;
      }
    }
    const n = L.length, rows = [L, [], [], []];
    for (let i = 0; i < n; i++) {
      const v = L[i] * 3, a = L[(i + n - 1) % n] * 3, b = L[(i + 1) % n] * 3;
      let tx = P3[b] - P3[a], ty = P3[b + 1] - P3[a + 1], tz = P3[b + 2] - P3[a + 2];
      const nx = N[v], ny = N[v + 1], nz = N[v + 2];
      let ox = ty * nz - tz * ny, oy = tz * nx - tx * nz, oz = tx * ny - ty * nx;
      const ol = Math.hypot(ox, oy, oz) || 1;
      ox /= ol;
      oy /= ol;
      oz /= ol;
      if (Bd) {
        P3[v] += nx * Bd;
        P3[v + 1] += ny * Bd;
        P3[v + 2] += nz * Bd;
      }
      const px2 = P3[v], py2 = P3[v + 1], pz2 = P3[v + 2];
      P3.push(px2 + ox * T3 * 0.6 - nx * T3 * 0.5, py2 + oy * T3 * 0.6 - ny * T3 * 0.5, pz2 + oz * T3 * 0.6 - nz * T3 * 0.5);
      N.push(ox, oy, oz);
      F2.push(1);
      rows[1].push(nv++);
      P3.push(px2 - nx * T3, py2 - ny * T3, pz2 - nz * T3);
      N.push(-nx, -ny, -nz);
      F2.push(1);
      rows[2].push(nv++);
      P3.push(px2 - nx * T3 - ox * Dp, py2 - ny * T3 - oy * Dp, pz2 - nz * T3 - oz * Dp);
      N.push(-nx, -ny, -nz);
      F2.push(2);
      rows[3].push(nv++);
    }
    for (let r = 0; r < 3; r++) for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a0 = rows[r][i], b0 = rows[r][j], a1 = rows[r + 1][i], b1 = rows[r + 1][j];
      I.push(b0, a0, a1, b0, a1, b1);
    }
  }
  return { P: Float32Array.from(P3), N: Float32Array.from(N), I: Uint32Array.from(I), flag: Uint8Array.from(F2) };
}
function flange(m, pick, flagV = 3) {
  const loops = boundaryLoops(m), P3 = [], N = [], I = [], F2 = [], S4 = m.P, SN = m.N;
  let nv = 0;
  for (const L of loops) {
    const prof = pick(L, m);
    if (!prof) continue;
    const n = L.length, rows = [], on = new Uint8Array(n);
    let nr = 0;
    for (let i = 0; i < n; i++) {
      const v = L[i] * 3, a = L[(i + n - 2) % n] * 3, b = L[(i + 2) % n] * 3, tx = S4[b] - S4[a], ty = S4[b + 1] - S4[a + 1], tz = S4[b + 2] - S4[a + 2], nx = SN[v], ny = SN[v + 1], nz = SN[v + 2];
      let ox = ty * nz - tz * ny, oy = tz * nx - tx * nz, oz = tx * ny - ty * nx;
      const ol = Math.hypot(ox, oy, oz) || 1;
      ox /= ol;
      oy /= ol;
      oz /= ol;
      const pr = prof(S4[v], S4[v + 1], S4[v + 2], i, n);
      if (!pr) continue;
      on[i] = 1;
      nr = pr.length;
      for (let r = 0; r < pr.length; r++) {
        if (!rows[r]) rows[r] = new Int32Array(n).fill(-1);
        const [o, u] = pr[r];
        P3.push(S4[v] + ox * o + nx * u, S4[v + 1] + oy * o + ny * u, S4[v + 2] + oz * o + nz * u);
        N.push(nx, ny, nz);
        F2.push(flagV);
        rows[r][i] = nv++;
      }
    }
    for (let r = 0; r + 1 < nr; r++) for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (!on[i] || !on[j]) continue;
      const a0 = rows[r][i], b0 = rows[r][j], a1 = rows[r + 1][i], b1 = rows[r + 1][j];
      I.push(a0, b0, a1, b0, b1, a1);
    }
  }
  return { P: Float32Array.from(P3), N: Float32Array.from(N), I: Uint32Array.from(I), flag: Uint8Array.from(F2) };
}
function flagNormals(m, flagV = 3) {
  if (!m.flag) return m;
  const P3 = m.P, I = m.I, N = m.N, acc = new Float32Array(P3.length);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, ux = P3[b] - P3[a], uy = P3[b + 1] - P3[a + 1], uz = P3[b + 2] - P3[a + 2], vx = P3[c] - P3[a], vy = P3[c + 1] - P3[a + 1], vz = P3[c + 2] - P3[a + 2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const q of [a, b, c]) {
      acc[q] += nx;
      acc[q + 1] += ny;
      acc[q + 2] += nz;
    }
  }
  for (let i = 0; i < m.flag.length; i++) if (m.flag[i] === flagV) {
    const l = Math.hypot(acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2]) || 1;
    N[i * 3] = acc[i * 3] / l;
    N[i * 3 + 1] = acc[i * 3 + 1] / l;
    N[i * 3 + 2] = acc[i * 3 + 2] / l;
  }
  return m;
}
function windToNormals(m) {
  const P3 = m.P, N = m.N, I = m.I;
  let n = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, ux = P3[b] - P3[a], uy = P3[b + 1] - P3[a + 1], uz = P3[b + 2] - P3[a + 2], vx = P3[c] - P3[a], vy = P3[c + 1] - P3[a + 1], vz = P3[c + 2] - P3[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (fx * (N[a] + N[b] + N[c]) + fy * (N[a + 1] + N[b + 1] + N[c + 1]) + fz * (N[a + 2] + N[b + 2] + N[c + 2]) < 0) {
      const q = I[t + 1];
      I[t + 1] = I[t + 2];
      I[t + 2] = q;
      n++;
    }
  }
  return n;
}
function concat(list) {
  list = list.filter((m) => m && m.I.length);
  let nv = 0, ni = 0;
  for (const m of list) {
    nv += m.P.length / 3;
    ni += m.I.length;
  }
  const P3 = new Float32Array(nv * 3), N = new Float32Array(nv * 3), F2 = new Uint8Array(nv), I = new Uint32Array(ni);
  let v = 0, o = 0;
  for (const m of list) {
    P3.set(m.P, v * 3);
    if (m.N) N.set(m.N, v * 3);
    if (m.flag) F2.set(m.flag, v);
    for (let i = 0; i < m.I.length; i++) I[o++] = m.I[i] + v;
    v += m.P.length / 3;
  }
  return { P: P3, N, I, flag: F2 };
}
function toGeo(m, paint2, skin) {
  const nv = m.P.length / 3, g2 = new BufferGeometry(), col = new Float32Array(nv * 3).fill(1), msk = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), out = { c: [1, 1, 1], m: [0, 0] };
  for (let i = 0; i < nv; i++) {
    const x = m.P[i * 3], y = m.P[i * 3 + 1], z = m.P[i * 3 + 2];
    if (paint2) {
      out.c[0] = out.c[1] = out.c[2] = 1;
      out.m[0] = out.m[1] = 0;
      paint2(i, x, y, z, m.N[i * 3], m.N[i * 3 + 1], m.N[i * 3 + 2], out);
      col[i * 3] = out.c[0];
      col[i * 3 + 1] = out.c[1];
      col[i * 3 + 2] = out.c[2];
      msk[i * 2] = out.m[0];
      msk[i * 2 + 1] = out.m[1];
    }
    if (skin) skin(x, y, z, si, sw, i * 4, i);
    else sw[i * 4] = 1;
  }
  g2.setAttribute("position", new BufferAttribute(m.P, 3));
  g2.setAttribute("normal", new BufferAttribute(m.N, 3));
  g2.setAttribute("uv", new BufferAttribute(new Float32Array(nv * 2), 2));
  g2.setAttribute("color", new BufferAttribute(col, 3));
  g2.setAttribute("mask", new BufferAttribute(msk, 2));
  g2.setAttribute("skinIndex", new BufferAttribute(si, 4));
  g2.setAttribute("skinWeight", new BufferAttribute(sw, 4));
  g2.setIndex(new BufferAttribute(dropDegenerate(m.P, m.I), 1));
  return g2;
}
function dropDegenerate(P3, I, eps = 1e-10) {
  let n = 0;
  const O2 = new Uint32Array(I.length);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, ux = P3[b] - P3[a], uy = P3[b + 1] - P3[a + 1], uz = P3[b + 2] - P3[a + 2], vx = P3[c] - P3[a], vy = P3[c + 1] - P3[a + 1], vz = P3[c + 2] - P3[a + 2];
    if (a === b || b === c || a === c || 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < eps) continue;
    O2[n++] = I[t];
    O2[n++] = I[t + 1];
    O2[n++] = I[t + 2];
  }
  return n === I.length ? I : O2.slice(0, n);
}
function meshGrid(G4, { iso = 0, keep = null, smooth = 1, proj = 2 } = {}) {
  const s = surfaceNets(G4, iso, keep), m = { P: s.P, I: quadsToTris(s.P, s.Q) };
  if (!m.I.length) return m;
  if (smooth) {
    taubin(m, smooth);
    if (proj) project(m, G4, iso, proj);
  }
  m.adj = null;
  return gradNormals(m, G4);
}

