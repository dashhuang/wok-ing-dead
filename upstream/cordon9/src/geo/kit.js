var V3 = Vector3;
var _v = new V3();
var _n = new V3();
var _m4 = new Matrix4();
var _q = new Quaternion();
var _e = new Euler();
var _s = new V3();
var _p = new V3();
var clamp2 = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
var lerp2 = (a, b, t) => a + (b - a) * t;
var sstep = (a, b, x) => {
  const t = clamp2((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
var hash3 = (x, y, z) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
function rng(seed) {
  let s = seed >>> 0 || 1;
  const f3 = () => {
    s = s + 1831565813 >>> 0;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  f3.range = (a, b) => a + (b - a) * f3();
  f3.int = (a, b) => Math.floor(a + (b - a + 1) * f3());
  f3.pick = (arr) => arr[Math.floor(f3() * arr.length)];
  f3.sign = () => f3() < 0.5 ? -1 : 1;
  return f3;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf2 = x - xi, yf = y - yi, zf = z - zi;
  xf2 = xf2 * xf2 * (3 - 2 * xf2);
  yf = yf * yf * (3 - 2 * yf);
  zf = zf * zf * (3 - 2 * zf);
  const h = (a, b, c) => hash3(xi + a, yi + b, zi + c);
  return lerp2(lerp2(lerp2(h(0, 0, 0), h(1, 0, 0), xf2), lerp2(h(0, 1, 0), h(1, 1, 0), xf2), yf), lerp2(lerp2(h(0, 0, 1), h(1, 0, 1), xf2), lerp2(h(0, 1, 1), h(1, 1, 1), xf2), yf), zf);
}
function fbm(x, y, z, oct = 4) {
  let a = 0.5, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x, y, z);
    n += a;
    x = x * 2.03 + 11.3;
    y = y * 2.03 + 5.7;
    z = z * 2.03 + 3.1;
    a *= 0.5;
  }
  return s / n;
}
function fromArrays(pos, nor, uv, idx, col, msk) {
  const g2 = new BufferGeometry();
  const n = pos.length / 3;
  g2.setAttribute("position", new Float32BufferAttribute(pos, 3));
  if (nor) g2.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g2.setAttribute("uv", new Float32BufferAttribute(uv || new Float32Array(n * 2), 2));
  g2.setAttribute("color", new Float32BufferAttribute(col || new Float32Array(n * 3).fill(1), 3));
  g2.setAttribute("mask", new Float32BufferAttribute(msk || new Float32Array(n * 2), 2));
  if (idx) g2.setIndex(idx);
  if (!nor) g2.computeVertexNormals();
  return g2;
}
function ensure(g2) {
  const n = g2.attributes.position.count;
  if (!g2.attributes.normal) g2.computeVertexNormals();
  if (!g2.attributes.uv) g2.setAttribute("uv", new Float32BufferAttribute(new Float32Array(n * 2), 2));
  if (!g2.attributes.color) g2.setAttribute("color", new Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  if (!g2.attributes.mask) g2.setAttribute("mask", new Float32BufferAttribute(new Float32Array(n * 2), 2));
  return g2;
}
function xf(g2, { p = null, r = null, s = null } = {}) {
  _p.set(0, 0, 0);
  if (p) _p.set(p[0], p[1], p[2]);
  _q.identity();
  if (r) _q.setFromEuler(_e.set(r[0], r[1], r[2], r[3] || "XYZ"));
  if (s == null) _s.set(1, 1, 1);
  else if (typeof s === "number") _s.set(s, s, s);
  else _s.set(s[0], s[1], s[2]);
  g2.applyMatrix4(_m4.compose(_p, _q, _s));
  if (s != null && typeof s !== "number" && s[0] * s[1] * s[2] < 0) flip(g2);
  return g2;
}
var T = (g2, x, y, z) => g2.translate(x, y, z);
function flip(g2) {
  const i = g2.index;
  if (i) {
    const a = i.array;
    for (let k = 0; k < a.length; k += 3) {
      const t = a[k + 1];
      a[k + 1] = a[k + 2];
      a[k + 2] = t;
    }
    i.needsUpdate = true;
  } else for (const name in g2.attributes) {
    const at = g2.attributes[name], s = at.itemSize, a = at.array;
    for (let k = 0; k < at.count; k += 3) for (let c = 0; c < s; c++) {
      const t = a[(k + 1) * s + c];
      a[(k + 1) * s + c] = a[(k + 2) * s + c];
      a[(k + 2) * s + c] = t;
    }
  }
  return g2;
}
function mirrorX(g2) {
  const c = g2.clone();
  c.scale(-1, 1, 1);
  flip(c);
  return c;
}
function deform(g2, fn, recompute = false) {
  const P3 = g2.attributes.position, N = g2.attributes.normal;
  for (let i = 0; i < P3.count; i++) {
    _v.fromBufferAttribute(P3, i);
    if (N) _n.fromBufferAttribute(N, i);
    fn(_v, _n, i);
    P3.setXYZ(i, _v.x, _v.y, _v.z);
  }
  P3.needsUpdate = true;
  if (recompute) g2.computeVertexNormals();
  return g2;
}
function paint(g2, rgb = [1, 1, 1], { jit = 0.07, cell = 60, fn = null, cav = 0 } = {}) {
  ensure(g2);
  const P3 = g2.attributes.position, N = g2.attributes.normal, C2 = g2.attributes.color, M = g2.attributes.mask;
  for (let i = 0; i < P3.count; i++) {
    const x = P3.getX(i), y = P3.getY(i), z = P3.getZ(i);
    let k = 1 - jit + 2 * jit * hash3(Math.round(x * cell), Math.round(y * cell), Math.round(z * cell));
    let r = rgb[0], gg = rgb[1], b = rgb[2];
    if (fn) {
      const o = fn(x, y, z, N.getX(i), N.getY(i), N.getZ(i));
      if (typeof o === "number") k *= o;
      else if (o) {
        r = o[0];
        gg = o[1];
        b = o[2];
      }
    }
    C2.setXYZ(i, r * k, gg * k, b * k);
    if (cav) M.setY(i, cav);
  }
  return g2;
}
function setMask(g2, edge = null, cav = null) {
  ensure(g2);
  const M = g2.attributes.mask;
  for (let i = 0; i < M.count; i++) {
    if (edge != null) M.setX(i, edge);
    if (cav != null) M.setY(i, cav);
  }
  return g2;
}
function dirt(g2, fn) {
  ensure(g2);
  const P3 = g2.attributes.position, N = g2.attributes.normal, M = g2.attributes.mask;
  for (let i = 0; i < P3.count; i++) M.setY(i, clamp2(fn(P3.getX(i), P3.getY(i), P3.getZ(i), N.getX(i), N.getY(i), N.getZ(i))));
  return g2;
}
function box(w, h, d, col) {
  return bevelBox(w, h, d, 0, 1, col);
}
function bevelBox(w, h, d, b = 4e-3, seg = 1, col = null) {
  const H2 = [w / 2, h / 2, d / 2];
  b = Math.max(0, Math.min(b, H2[0] - 1e-5, H2[1] - 1e-5, H2[2] - 1e-5));
  const pos = [], nor = [], uv = [], msk = [], idx = [];
  const lines = (hh) => {
    if (b <= 0) return [-hh, hh];
    const a = [];
    for (let k = seg; k >= 1; k--) a.push(-(hh - b) - b * Math.tan(k / seg * Math.PI / 4));
    a.push(-(hh - b), hh - b);
    for (let k = 1; k <= seg; k++) a.push(hh - b + b * Math.tan(k / seg * Math.PI / 4));
    return a;
  };
  const p = [0, 0, 0], inn = [0, 0, 0];
  for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {
    const u = (a + 1) % 3, v = (a + 2) % 3, U = lines(H2[u]), Vv = lines(H2[v]);
    const base = pos.length / 3;
    for (let j = 0; j < Vv.length; j++) for (let i = 0; i < U.length; i++) {
      p[a] = s * H2[a];
      p[u] = U[i];
      p[v] = Vv[j];
      let dx = 0, dy = 0, dz = 0;
      if (b > 0) {
        for (let c = 0; c < 3; c++) inn[c] = clamp2(p[c], -(H2[c] - b), H2[c] - b);
        dx = p[0] - inn[0];
        dy = p[1] - inn[1];
        dz = p[2] - inn[2];
        const l = Math.hypot(dx, dy, dz) || 1;
        dx /= l;
        dy /= l;
        dz /= l;
        pos.push(inn[0] + dx * b, inn[1] + dy * b, inn[2] + dz * b);
      } else {
        dx = a === 0 ? s : 0;
        dy = a === 1 ? s : 0;
        dz = a === 2 ? s : 0;
        pos.push(p[0], p[1], p[2]);
      }
      nor.push(dx, dy, dz);
      const k = pos.length - 3, X = pos[k], Y = pos[k + 1], Z = pos[k + 2];
      if (a === 0) uv.push(Z, Y);
      else if (a === 1) uv.push(X, Z);
      else uv.push(X, Y);
      const ax = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
      msk.push(ax > 0.999 ? 0 : 1, 0);
    }
    const nu = U.length;
    for (let j = 0; j < Vv.length - 1; j++) for (let i = 0; i < nu - 1; i++) {
      const A = base + j * nu + i, B2 = A + 1, C2 = A + nu, D = C2 + 1;
      if (s > 0) idx.push(A, B2, C2, B2, D, C2);
      else idx.push(A, C2, B2, B2, C2, D);
    }
  }
  const g2 = fromArrays(pos, nor, uv, idx, null, msk);
  if (col) paint(g2, col);
  return g2;
}
function cyl(r, h, seg = 16, { cham = 0, r2 = null, capTop = true, capBot = true, col = null } = {}) {
  const rt = r2 == null ? r : r2, c = Math.min(cham, r * 0.45, rt * 0.45, h * 0.45);
  const prof = [];
  if (capBot) prof.push([0, -h / 2]);
  if (c > 0) prof.push([r - c, -h / 2], [r, -h / 2 + c], [rt, h / 2 - c], [rt - c, h / 2]);
  else prof.push([r, -h / 2], [rt, h / 2]);
  if (capTop) prof.push([0, h / 2]);
  return lathe(prof, seg, { col });
}
function lathe(profile, seg = 16, { axis = "y", crease = 38, col = null, arc: arc2 = Math.PI * 2, start = 0, colFn = null } = {}) {
  const P3 = profile, nP = P3.length, cr = Math.cos(crease * Math.PI / 180);
  const sn = [];
  for (let k = 0; k < nP - 1; k++) {
    const dr = P3[k + 1][0] - P3[k][0], dt = P3[k + 1][1] - P3[k][1], l = Math.hypot(dr, dt) || 1;
    sn.push([dt / l, -dr / l, l]);
  }
  const pos = [], nor = [], uv = [], msk = [], idx = [], colr = [];
  const full = Math.abs(arc2 - Math.PI * 2) < 1e-6;
  let vlen = 0;
  for (let k = 0; k < nP - 1; k++) {
    const [nr, nt, len] = sn[k];
    if (len < 1e-9) continue;
    const ends = [[nr, nt, 0], [nr, nt, 0]];
    if (k > 0 && sn[k - 1][2] > 1e-9) {
      const a = sn[k - 1], dot = a[0] * nr + a[1] * nt;
      if (dot > cr) {
        const x = a[0] + nr, y = a[1] + nt, l = Math.hypot(x, y) || 1;
        ends[0] = [x / l, y / l, 0];
      } else {
        const dr = P3[k + 1][0] - P3[k][0], dt = P3[k + 1][1] - P3[k][1];
        ends[0][2] = dr * a[0] + dt * a[1] < 0 ? 1 : 0;
      }
    }
    if (k < nP - 2 && sn[k + 1][2] > 1e-9) {
      const a = sn[k + 1], dot = a[0] * nr + a[1] * nt;
      if (dot > cr) {
        const x = a[0] + nr, y = a[1] + nt, l = Math.hypot(x, y) || 1;
        ends[1] = [x / l, y / l, 0];
      } else {
        const dr = P3[k + 2][0] - P3[k + 1][0], dt = P3[k + 2][1] - P3[k + 1][1];
        ends[1][2] = dr * nr + dt * nt < 0 ? 1 : 0;
      }
    }
    const base = pos.length / 3;
    for (let e = 0; e < 2; e++) {
      const r = P3[k + e][0], t = P3[k + e][1], en = ends[e];
      for (let i = 0; i <= seg; i++) {
        const th = start + i / seg * arc2, c = Math.cos(th), s = Math.sin(th);
        pos.push(r * c, t, r * s);
        nor.push(en[0] * c, en[1], en[0] * s);
        uv.push(i / seg * arc2 * Math.max(r, 2e-3), vlen + e * len);
        msk.push(en[2], 0);
        if (colFn) {
          const cc = colFn(r, t, th);
          colr.push(cc[0], cc[1], cc[2]);
        }
      }
    }
    for (let i = 0; i < seg; i++) {
      const A = base + i, C2 = A + 1, B2 = base + seg + 1 + i, D = B2 + 1;
      if (P3[k][0] > 1e-7) idx.push(A, B2, C2);
      if (P3[k + 1][0] > 1e-7) idx.push(C2, B2, D);
    }
    vlen += len;
  }
  const g2 = fromArrays(pos, nor, uv, idx, colFn ? colr : null, msk);
  if (col && !colFn) paint(g2, col);
  if (axis === "z") g2.rotateX(Math.PI / 2);
  else if (axis === "-z") g2.rotateX(-Math.PI / 2);
  else if (axis === "x") g2.rotateZ(-Math.PI / 2);
  return g2;
}
var rectPts = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function chamRect(x0, y0, x1, y1, c) {
  return [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
}
function roundRect(x0, y0, x1, y1, r, n = 4) {
  const o = [], cs = [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) {
    const a = a0 + i / n * Math.PI / 2;
    o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return o;
}
function slot(cx, cy, L, W, n = 5, ang = 0) {
  const r = W / 2, a = L / 2 - r, o = [];
  for (let i = 0; i <= n; i++) {
    const t = -Math.PI / 2 + i / n * Math.PI;
    o.push([a + Math.cos(t) * r, Math.sin(t) * r]);
  }
  for (let i = 0; i <= n; i++) {
    const t = Math.PI / 2 + i / n * Math.PI;
    o.push([-a + Math.cos(t) * r, Math.sin(t) * r]);
  }
  const c = Math.cos(ang), s = Math.sin(ang);
  return o.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}
function circlePts(cx, cy, r, n = 12, a0 = 0) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + i / n * Math.PI * 2;
    o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return o;
}
function area2(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return a;
}
function triangulate(contour, holes) {
  const fl = (arr) => arr.map((q) => new Vector2(q[0], q[1]));
  const tris = ShapeUtils.triangulateShape(fl(contour), holes.map(fl));
  const all = [].concat(contour, ...holes);
  let acc = 0;
  for (const t of tris) {
    const a = all[t[0]], b = all[t[1]], c = all[t[2]];
    acc += (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  }
  if (acc < 0) for (const t of tris) {
    const k = t[1];
    t[1] = t[2];
    t[2] = k;
  }
  return tris;
}
function insetLoop(p, b) {
  const n = p.length, o = [];
  for (let i = 0; i < n; i++) {
    const a = p[(i + n - 1) % n], c = p[i], d = p[(i + 1) % n];
    let e0x = c[0] - a[0], e0y = c[1] - a[1], e1x = d[0] - c[0], e1y = d[1] - c[1];
    const l0 = Math.hypot(e0x, e0y) || 1, l1 = Math.hypot(e1x, e1y) || 1;
    e0x /= l0;
    e0y /= l0;
    e1x /= l1;
    e1y /= l1;
    const n0x = -e0y, n0y = e0x, n1x = -e1y, n1y = e1x;
    let k = 1 + n0x * n1x + n0y * n1y;
    if (k < 0.35) k = 0.35;
    o.push([c[0] + (n0x + n1x) / k * b, c[1] + (n0y + n1y) / k * b]);
  }
  return o;
}
function extrude(outline2, z0, z1, bevel = 1e-3, holes = null, { smooth = 32, col = null, capFront = true, capBack = true } = {}) {
  let out = outline2.slice();
  if (area2(out) < 0) out.reverse();
  const hs = (holes || []).map((h) => {
    const c = h.slice();
    if (area2(c) > 0) c.reverse();
    return c;
  });
  const depth = z1 - z0, b = Math.max(0, Math.min(bevel, depth * 0.49));
  const loops = [out, ...hs], cs = Math.cos(smooth * Math.PI / 180);
  const pos = [], nor = [], uv = [], msk = [], idx = [];
  const push = (x, y, z, nx, ny, nz, u, v, m) => {
    pos.push(x, y, z);
    nor.push(nx, ny, nz);
    uv.push(u, v);
    msk.push(m, 0);
    return pos.length / 3 - 1;
  };
  const insets = loops.map((l) => b > 0 ? insetLoop(l, b) : l);
  const tris = triangulate(insets[0], insets.slice(1));
  const all = [].concat(...insets);
  for (const [zz, nz, on] of [[z1, 1, capFront], [z0, -1, capBack]]) {
    if (!on) continue;
    const base = pos.length / 3;
    for (const q of all) push(q[0], q[1], zz, 0, 0, nz, q[0], q[1], 0);
    for (const t of tris) nz > 0 ? idx.push(base + t[0], base + t[1], base + t[2]) : idx.push(base + t[0], base + t[2], base + t[1]);
  }
  loops.forEach((L, li) => {
    const n = L.length, I = insets[li];
    const en = [];
    for (let i = 0; i < n; i++) {
      const a = L[i], c = L[(i + 1) % n];
      const ex = c[0] - a[0], ey = c[1] - a[1], l = Math.hypot(ex, ey) || 1;
      en.push([ey / l, -ex / l, l]);
    }
    let per = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = L[i], c = L[j], N = en[i], Np = en[(i + n - 1) % n], Nn = en[j];
      let n0 = N, n1 = N;
      if (Np[0] * N[0] + Np[1] * N[1] > cs) {
        const x = Np[0] + N[0], y = Np[1] + N[1], l = Math.hypot(x, y) || 1;
        n0 = [x / l, y / l];
      }
      if (Nn[0] * N[0] + Nn[1] * N[1] > cs) {
        const x = Nn[0] + N[0], y = Nn[1] + N[1], l = Math.hypot(x, y) || 1;
        n1 = [x / l, y / l];
      }
      const u0 = per, u1 = per + N[2];
      per = u1;
      const za = z0 + b, zb = z1 - b;
      const a0 = push(a[0], a[1], za, n0[0], n0[1], 0, u0, za, 0), a1 = push(c[0], c[1], za, n1[0], n1[1], 0, u1, za, 0);
      const b0 = push(a[0], a[1], zb, n0[0], n0[1], 0, u0, zb, 0), b1 = push(c[0], c[1], zb, n1[0], n1[1], 0, u1, zb, 0);
      idx.push(a0, a1, b0, a1, b1, b0);
      if (b > 0) {
        const ia = I[i], ic = I[j];
        const f0 = push(a[0], a[1], zb, n0[0], n0[1], 0, u0, zb, 1), f1 = push(c[0], c[1], zb, n1[0], n1[1], 0, u1, zb, 1);
        const c0 = push(ia[0], ia[1], z1, 0, 0, 1, u0, z1, 1), c1 = push(ic[0], ic[1], z1, 0, 0, 1, u1, z1, 1);
        idx.push(f0, f1, c0, f1, c1, c0);
        const g0 = push(a[0], a[1], za, n0[0], n0[1], 0, u0, za, 1), g1 = push(c[0], c[1], za, n1[0], n1[1], 0, u1, za, 1);
        const d0 = push(ia[0], ia[1], z0, 0, 0, -1, u0, z0, 1), d1 = push(ic[0], ic[1], z0, 0, 0, -1, u1, z0, 1);
        idx.push(g0, d0, g1, g1, d0, d1);
      }
    }
  });
  const g2 = fromArrays(pos, nor, uv, idx, null, msk);
  if (col) paint(g2, col);
  return g2;
}
function extrudeSide(profile, x0, x1, bevel, holes, opts) {
  const g2 = extrude(profile, x0, x1, bevel, holes, opts);
  g2.rotateY(Math.PI / 2);
  return g2;
}
function extrudeFwd(profile, f0, f1, bevel, holes, opts) {
  const g2 = extrude(profile, -f1, -f0, bevel, holes, opts);
  return g2;
}
function extrudeUp(profile, y0, y1, bevel, holes, opts) {
  const g2 = extrude(profile.map(([x, f3]) => [x, f3]), y0, y1, bevel, holes ? holes.map((h) => h.map(([x, f3]) => [x, f3])) : null, opts);
  g2.rotateX(-Math.PI / 2);
  return g2;
}
function sweep(section, path, { closed = false, up = [0, 1, 0], crease = 40, caps = true, col = null, samples = 0, tension = 0.5, scaleFn = null, twistFn = null } = {}) {
  let pts = path.map((p) => p.isVector3 ? p : new V3(p[0], p[1], p[2]));
  if (samples > 0) {
    const cv = new CatmullRomCurve3(pts, closed, "catmullrom", tension);
    pts = cv.getSpacedPoints(samples);
    if (closed) pts.pop();
  }
  const n = pts.length, m = section.length, cr = Math.cos(crease * Math.PI / 180);
  const en = [];
  for (let i = 0; i < m; i++) {
    const a = section[i], c = section[(i + 1) % m];
    const ex = c[0] - a[0], ey = c[1] - a[1], l = Math.hypot(ex, ey) || 1;
    en.push([ey / l, -ex / l, l]);
  }
  const vn = [];
  let per = [0];
  for (let i = 0; i < m; i++) {
    const a = en[(i + m - 1) % m], c = en[i];
    if (a[0] * c[0] + a[1] * c[1] > cr) {
      const x = a[0] + c[0], y = a[1] + c[1], l = Math.hypot(x, y) || 1;
      vn.push([[x / l, y / l], [x / l, y / l], 0]);
    } else vn.push([[a[0], a[1]], [c[0], c[1]], 1]);
    per.push(per[i] + c[2]);
  }
  const tang = [], nrm4 = [], bin = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)], c = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    tang.push(new V3().subVectors(c, a).normalize());
  }
  let N0 = new V3(up[0], up[1], up[2]);
  N0.addScaledVector(tang[0], -N0.dot(tang[0]));
  if (N0.lengthSq() < 1e-6) {
    N0.set(1, 0, 0).addScaledVector(tang[0], -tang[0].x);
  }
  N0.normalize();
  nrm4.push(N0);
  bin.push(new V3().crossVectors(tang[0], N0).normalize());
  for (let i = 1; i < n; i++) {
    const pn = nrm4[i - 1].clone();
    pn.addScaledVector(tang[i], -pn.dot(tang[i])).normalize();
    nrm4.push(pn);
    bin.push(new V3().crossVectors(tang[i], pn).normalize());
  }
  const pos = [], nor = [], uv = [], msk = [], idx = [];
  let dist = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) dist += pts[i].distanceTo(pts[i - 1]);
    const sc2 = scaleFn ? scaleFn(i / (n - 1)) : 1, tw = twistFn ? twistFn(i / (n - 1)) : 0, ct = Math.cos(tw), st = Math.sin(tw);
    const B2 = bin[i], N = nrm4[i], O2 = pts[i];
    for (let j = 0; j < m; j++) for (let e = 0; e < 2; e++) {
      let sx = section[j][0] * sc2, sy = section[j][1] * sc2;
      let nx = vn[j][e][0], ny = vn[j][e][1];
      if (tw) {
        const x = sx * ct - sy * st, y = sx * st + sy * ct;
        sx = x;
        sy = y;
        const a = nx * ct - ny * st, b2 = nx * st + ny * ct;
        nx = a;
        ny = b2;
      }
      pos.push(O2.x - B2.x * sx + N.x * sy, O2.y - B2.y * sx + N.y * sy, O2.z - B2.z * sx + N.z * sy);
      nor.push(-B2.x * nx + N.x * ny, -B2.y * nx + N.y * ny, -B2.z * nx + N.z * ny);
      uv.push(per[j], dist);
      msk.push(vn[j][2], 0);
    }
  }
  const ring2 = m * 2, segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const i1 = (i + 1) % n;
    for (let j = 0; j < m; j++) {
      const j1 = (j + 1) % m;
      const A = i * ring2 + j * 2 + 1, Bq = i * ring2 + j1 * 2, C2 = i1 * ring2 + j * 2 + 1, D = i1 * ring2 + j1 * 2;
      idx.push(A, Bq, C2, Bq, D, C2);
    }
  }
  if (caps && !closed) {
    const tris = triangulate(section, []);
    for (const end of [0, n - 1]) {
      const base = pos.length / 3, B2 = bin[end], N = nrm4[end], O2 = pts[end], Tn = tang[end], sgn2 = end === 0 ? -1 : 1;
      const sc2 = scaleFn ? scaleFn(end === 0 ? 0 : 1) : 1;
      for (let j = 0; j < m; j++) {
        const sx = section[j][0] * sc2, sy = section[j][1] * sc2;
        pos.push(O2.x - B2.x * sx + N.x * sy, O2.y - B2.y * sx + N.y * sy, O2.z - B2.z * sx + N.z * sy);
        nor.push(Tn.x * sgn2, Tn.y * sgn2, Tn.z * sgn2);
        uv.push(sx, sy);
        msk.push(0, 0);
      }
      for (const t of tris) end === 0 ? idx.push(base + t[0], base + t[2], base + t[1]) : idx.push(base + t[0], base + t[1], base + t[2]);
    }
  }
  const g2 = fromArrays(pos, nor, uv, idx, null, msk);
  if (col) paint(g2, col);
  return g2;
}
function tube(path, r = 0.01, radial = 8, opts = {}) {
  return sweep(circlePts(0, 0, r, radial), path, { crease: 80, samples: opts.samples ?? Math.max(8, path.length * 6), ...opts });
}
function strap(path, w, th, opts = {}) {
  const r = Math.min(th * 0.45, w * 0.2);
  return sweep(roundRect(-w / 2, -th / 2, w / 2, th / 2, r, 2), path, { samples: opts.samples ?? Math.max(8, path.length * 6), ...opts });
}
function merge(list) {
  const gs = list.filter(Boolean).map(ensure);
  if (!gs.length) return fromArrays([], [], [], []);
  const skinned = gs.every((g2) => g2.attributes.skinIndex);
  const keep = ["position", "normal", "uv", "color", "mask"].concat(skinned ? ["skinIndex", "skinWeight"] : []);
  const anyNon = gs.some((g2) => !g2.index);
  const norm2 = gs.map((g2) => {
    for (const k of Object.keys(g2.attributes)) if (!keep.includes(k)) g2.deleteAttribute(k);
    g2.morphAttributes = {};
    return anyNon && g2.index ? g2.toNonIndexed() : g2;
  });
  const out = mergeGeometries(norm2, false);
  if (!out) throw new Error("kit.merge failed");
  return out;
}
function triCount(g2) {
  return (g2.index ? g2.index.count : g2.attributes.position.count) / 3;
}
var Bucket = class {
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  add(name, ...geos) {
    if (!this.map.has(name)) this.map.set(name, []);
    const a = this.map.get(name);
    for (const g2 of geos.flat(3)) if (g2) a.push(g2);
    return this;
  }
  // apply a transform to everything collected so far (or to named buckets)
  xf(tr, names = null) {
    for (const [k, a] of this.map) if (!names || names.includes(k)) for (const g2 of a) xf(g2, tr);
    return this;
  }
  absorb(other, tr = null) {
    for (const [k, a] of other.map) for (const g2 of a) {
      const c = g2.clone();
      if (tr) xf(c, tr);
      this.add(k, c);
    }
    return this;
  }
  geos() {
    const o = {};
    for (const [k, a] of this.map) o[k] = merge(a);
    return o;
  }
  stats() {
    const o = {};
    let t = 0;
    for (const [k, a] of this.map) {
      let n = 0;
      for (const g2 of a) n += triCount(g2);
      o[k] = n;
      t += n;
    }
    o.total = t;
    return o;
  }
  build(mats, { cast = true, recv = true, layer = 0 } = {}) {
    const grp = new Group();
    for (const [k, a] of this.map) {
      const g2 = merge(a);
      g2.computeBoundingSphere();
      g2.computeBoundingBox();
      const mat = typeof mats === "function" ? mats(k) : mats[k];
      if (!mat) throw new Error("no material for bucket " + k);
      const me = new Mesh(g2, mat);
      me.name = k;
      me.castShadow = cast;
      me.receiveShadow = recv;
      me.layers.set(layer);
      grp.add(me);
    }
    return grp;
  }
};
var Loft = class {
  constructor(n) {
    this.n = n;
    this.P = [];
    this.C = [];
    this.M = [];
    this.SI = [];
    this.SW = [];
    this.weld = [];
    this.U = [];
  }
  get rings() {
    return this.P.length / 3 / this.n;
  }
  // push one vertex. skin = [boneA, weightA, boneB, weightB] (optional)
  v(x, y, z, c, m = null, skin = null, u = 0, vv = 0) {
    this.P.push(x, y, z);
    this.C.push(c[0], c[1], c[2]);
    this.M.push(m ? m[0] : 0, m ? m[1] : 0);
    this.U.push(u, vv);
    if (skin) {
      this.SI.push(skin[0], skin[2] || 0, 0, 0);
      this.SW.push(skin[1], skin[3] || 0, 0, 0);
    }
  }
  // the ring just pushed is a collapsed cap: average its normals later
  collapse() {
    this.weld.push(this.rings - 1);
  }
  geo({ flipWinding = false, closedLoop = true, auto = true } = {}) {
    const n = this.n, R4 = this.rings, idx = [];
    for (let a = 0; a < R4 - 1; a++) for (let j = 0; j < (closedLoop ? n : n - 1); j++) {
      const A = a * n + j, B2 = a * n + (j + 1) % n, C2 = A + n, D = B2 + n;
      flipWinding ? idx.push(A, B2, C2, B2, D, C2) : idx.push(A, C2, B2, B2, C2, D);
    }
    const g2 = new BufferGeometry();
    g2.setAttribute("position", new Float32BufferAttribute(this.P, 3));
    g2.setAttribute("color", new Float32BufferAttribute(this.C, 3));
    g2.setAttribute("mask", new Float32BufferAttribute(this.M, 2));
    g2.setAttribute("uv", new Float32BufferAttribute(this.U, 2));
    if (this.SI.length) {
      g2.setAttribute("skinIndex", new Uint16BufferAttribute(this.SI, 4));
      g2.setAttribute("skinWeight", new Float32BufferAttribute(this.SW, 4));
    }
    g2.setIndex(idx);
    g2.computeVertexNormals();
    let N = g2.attributes.normal;
    if (auto && R4 > 2) {
      let acc = 0;
      const P3 = this.P;
      for (let a = 1; a < R4 - 1; a++) {
        let cx = 0, cy = 0, cz = 0;
        for (let j = 0; j < n; j++) {
          const k = (a * n + j) * 3;
          cx += P3[k];
          cy += P3[k + 1];
          cz += P3[k + 2];
        }
        cx /= n;
        cy /= n;
        cz /= n;
        for (let j = 0; j < n; j++) {
          const q = a * n + j, k = q * 3;
          acc += N.getX(q) * (P3[k] - cx) + N.getY(q) * (P3[k + 1] - cy) + N.getZ(q) * (P3[k + 2] - cz);
        }
      }
      if (acc < 0) {
        flip(g2);
        g2.computeVertexNormals();
        N = g2.attributes.normal;
      }
    }
    for (const r of this.weld) {
      let x = 0, y = 0, z = 0;
      for (let j = 0; j < n; j++) {
        x += N.getX(r * n + j);
        y += N.getY(r * n + j);
        z += N.getZ(r * n + j);
      }
      const l = Math.hypot(x, y, z) || 1;
      for (let j = 0; j < n; j++) N.setXYZ(r * n + j, x / l, y / l, z / l);
    }
    return g2;
  }
};
function gridSurf(U, Vv, fn, { flipWinding = false, skinFn = null } = {}) {
  const pos = [], col = [], msk = [], idx = [], si = [], sw = [], o = new V3(), mm = [0, 0];
  for (let j = 0; j < Vv.length; j++) for (let i = 0; i < U.length; i++) {
    mm[0] = 0;
    mm[1] = 0;
    const c = fn(U[i], Vv[j], o, mm, i, j);
    pos.push(o.x, o.y, o.z);
    col.push(c[0], c[1], c[2]);
    msk.push(mm[0], mm[1]);
    if (skinFn) {
      const s = skinFn(U[i], Vv[j], o);
      si.push(s[0], s[2] || 0, 0, 0);
      sw.push(s[1], s[3] || 0, 0, 0);
    }
  }
  const nu = U.length;
  for (let j = 0; j < Vv.length - 1; j++) for (let i = 0; i < nu - 1; i++) {
    const A = j * nu + i, B2 = A + 1, C2 = A + nu, D = C2 + 1;
    flipWinding ? idx.push(A, C2, B2, B2, C2, D) : idx.push(A, B2, C2, B2, D, C2);
  }
  const g2 = fromArrays(pos, null, null, idx, col, msk);
  if (skinFn) {
    g2.setAttribute("skinIndex", new Uint16BufferAttribute(si, 4));
    g2.setAttribute("skinWeight", new Float32BufferAttribute(sw, 4));
  }
  return g2;
}
function panel(w, h, nx = 8, ny = 8, col = null) {
  const g2 = new PlaneGeometry(w, h, nx, ny);
  const P3 = g2.attributes.position, U = g2.attributes.uv;
  for (let i = 0; i < P3.count; i++) U.setXY(i, P3.getX(i), P3.getY(i));
  ensure(g2);
  if (col) paint(g2, col);
  return g2;
}

