var V34 = Vector3;
var _m = new Matrix4();
var _q3 = new Quaternion();
var _e3 = new Euler();
var _p2 = new V34();
var _s2 = new V34();
var _a2 = new V34();
var _b2 = new V34();
var UP = new V34(0, 1, 0);
var PI5 = Math.PI;
var H = Math.PI / 2;
function mat4({ p = null, r = null, s = null } = {}) {
  _p2.set(0, 0, 0);
  if (p) _p2.set(p[0], p[1], p[2]);
  _q3.identity();
  if (r) _q3.setFromEuler(_e3.set(r[0], r[1], r[2], r[3] || "XYZ"));
  if (s == null) _s2.set(1, 1, 1);
  else if (typeof s === "number") _s2.set(s, s, s);
  else _s2.set(s[0], s[1], s[2]);
  return new Matrix4().compose(_p2, _q3, _s2);
}
var hashStr = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1e5;
};
var RAW2 = /^(lamp|neon|em|decal|sign|glass|win|mesh|led|flare|black)/;
function corrProfile(w, pitch, depth, top = pitch * 0.3, slope = pitch * 0.15) {
  const pts = [[0, 0]], bot = pitch - top - 2 * slope;
  let u = bot / 2;
  while (u < w - 1e-6) {
    for (const [du, d] of [[0, 0], [slope, depth], [slope + top, depth], [2 * slope + top, 0]]) {
      const x = u + du;
      if (x < w - 1e-6) pts.push([x, d]);
    }
    u += pitch;
  }
  pts.push([w, 0]);
  return pts;
}
function corrugated(w, h, { pitch = 0.2, depth = 0.03, top, slope, ny = 2, col = null } = {}) {
  const pr = corrProfile(w, pitch, depth, top, slope), V = Array.from({ length: ny + 1 }, (_, i) => i / ny);
  const g2 = gridSurf(pr.map((_, i) => i), V, (ui, v, o) => {
    const [u, d] = pr[ui];
    o.set(u - w / 2, (v - 0.5) * h, d);
    return col || [1, 1, 1];
  });
  const ng = g2.toNonIndexed();
  ng.computeVertexNormals();
  const P3 = ng.attributes.position, U = new Float32Array(P3.count * 2);
  for (let i = 0; i < P3.count; i++) {
    U[i * 2] = P3.getX(i);
    U[i * 2 + 1] = P3.getY(i);
  }
  ng.setAttribute("uv", new Float32BufferAttribute(U, 2));
  return ng;
}
function catenary(a, b, sag = 0.3, n = 10) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    o.push([lerp2(a[0], b[0], t), lerp2(a[1], b[1], t) - sag * 4 * t * (1 - t), lerp2(a[2], b[2], t)]);
  }
  return o;
}
function quadXY(w, h, rect2 = null, nx = 1, ny = 1) {
  const g2 = new PlaneGeometry(w, h, nx, ny), P3 = g2.attributes.position, U = g2.attributes.uv;
  for (let i = 0; i < P3.count; i++) {
    const u = P3.getX(i) / w + 0.5, v = P3.getY(i) / h + 0.5;
    if (rect2) U.setXY(i, lerp2(rect2[0], rect2[2], u), lerp2(rect2[1], rect2[3], v));
    else U.setXY(i, P3.getX(i), P3.getY(i));
  }
  return g2;
}
function ring(R4, r, { seg = 24, radial = 6, a0 = 0, a1 = PI5 * 2 } = {}) {
  const full = Math.abs(a1 - a0 - PI5 * 2) < 1e-6, n = full ? seg : seg + 1, pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * i / seg;
    pts.push([Math.cos(a) * R4, Math.sin(a) * R4, 0]);
  }
  return sweep(circlePts(0, 0, r, radial), pts, { closed: full, up: [0, 0, 1], crease: 80, caps: !full });
}
function softBox(w, h, d, r = 0.03, n = 4) {
  const g2 = new BoxGeometry(w, h, d, Math.max(2, Math.round(w / Math.max(w, h, d) * n * 2)), Math.max(2, Math.round(h / Math.max(w, h, d) * n * 2)), Math.max(2, Math.round(d / Math.max(w, h, d) * n * 2)));
  const P3 = g2.attributes.position, Hx = w / 2, Hy = h / 2, Hz = d / 2;
  r = Math.min(r, Hx * 0.95, Hy * 0.95, Hz * 0.95);
  for (let i = 0; i < P3.count; i++) {
    _a2.fromBufferAttribute(P3, i);
    _b2.set(clamp2(_a2.x, -Hx + r, Hx - r), clamp2(_a2.y, -Hy + r, Hy - r), clamp2(_a2.z, -Hz + r, Hz - r));
    _a2.sub(_b2);
    const l = _a2.length();
    if (l > 1e-6) _a2.multiplyScalar(r / l);
    _a2.add(_b2);
    P3.setXYZ(i, _a2.x, _a2.y, _a2.z);
  }
  const ng = mergeVerts(g2);
  ng.computeVertexNormals();
  const P22 = ng.attributes.position, U = ng.attributes.uv;
  for (let i = 0; i < P22.count; i++) U.setXY(i, P22.getX(i) + P22.getZ(i), P22.getY(i));
  return ng;
}
function mergeVerts(g2, tol = 1e-4) {
  const P3 = g2.attributes.position, map = /* @__PURE__ */ new Map(), remap = new Uint32Array(P3.count), pos = [], uv = [];
  let n = 0;
  const U = g2.attributes.uv;
  for (let i = 0; i < P3.count; i++) {
    const k = Math.round(P3.getX(i) / tol) + "," + Math.round(P3.getY(i) / tol) + "," + Math.round(P3.getZ(i) / tol);
    let j = map.get(k);
    if (j === void 0) {
      j = n++;
      map.set(k, j);
      pos.push(P3.getX(i), P3.getY(i), P3.getZ(i));
      uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
    }
    remap[i] = j;
  }
  const idx = [];
  const I = g2.index;
  const cnt = I ? I.count : P3.count;
  for (let i = 0; i < cnt; i += 3) {
    const a = remap[I ? I.getX(i) : i], b = remap[I ? I.getX(i + 1) : i + 1], c = remap[I ? I.getX(i + 2) : i + 2];
    if (a !== b && b !== c && a !== c) idx.push(a, b, c);
  }
  return fromArrays(pos, null, uv, idx);
}
var Prop = class {
  constructor(name, seed = 1) {
    this.name = name;
    this.seed = seed;
    this.R = rng(seed * 7919 + hashStr(name));
    this.B = new Bucket();
    this.stack = [new Matrix4()];
    this.cols = [];
    this.glows = [];
    this.sockets = {};
    this.size = [1, 1, 1];
  }
  get M() {
    return this.stack[this.stack.length - 1];
  }
  push(tr) {
    this.stack.push(this.M.clone().multiply(mat4(tr)));
    return this;
  }
  pop() {
    this.stack.pop();
    return this;
  }
  rr(a = 0, b = 1) {
    return a + (b - a) * this.R();
  }
  pick(arr) {
    return arr[Math.floor(this.R() * arr.length) % arr.length];
  }
  // add geometry (local transform o.p/o.r/o.s first, then the current stack matrix)
  add(mat, g2, col = null, o = {}) {
    if (col) paint(g2, col, { jit: o.jit ?? 0.05, cell: o.cell ?? 40 });
    if (o.p || o.r || o.s) xf(g2, o);
    const M = this.M;
    g2.applyMatrix4(M);
    if (M.determinant() < 0) flip(g2);
    if (o.cav != null || o.edge != null) setMask(g2, o.edge ?? null, o.cav ?? null);
    this.B.add(mat, g2);
    return g2;
  }
  // beveled box. (x, y, z) is the centre; o.base = true puts the bottom face at y
  box(mat, w, h, d, x = 0, y = 0, z = 0, o = {}) {
    const b = o.b != null ? o.b : Math.min(0.012, Math.min(w, h, d) * 0.22), g2 = bevelBox(w, h, d, b, o.seg || 1);
    return this.add(mat, g2, o.col || null, { ...o, p: [x, y + (o.base ? h / 2 : 0), z], r: o.r || null });
  }
  // cylinder / cone. axis 'y' (default), 'x' or 'z'. (x, y, z) is the centre; o.base puts the bottom at y (y axis only)
  cyl(mat, r, h, x = 0, y = 0, z = 0, o = {}) {
    const g2 = cyl(r, h, o.seg || 14, { cham: o.cham ?? Math.min(6e-3, r * 0.2), r2: o.r2 ?? null, capTop: o.capTop !== false, capBot: o.capBot !== false });
    if (o.axis === "x") g2.rotateZ(-H);
    else if (o.axis === "z") g2.rotateX(H);
    return this.add(mat, g2, o.col || null, { ...o, p: [x, y + (o.base ? h / 2 : 0), z], r: o.r || null });
  }
  // round bar between two points
  bar(mat, a, b, r = 0.02, o = {}) {
    _a2.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = _a2.length();
    if (len < 1e-6) return null;
    _a2.multiplyScalar(1 / len);
    const g2 = cyl(r, len, o.seg || 8, { cham: o.cham ?? 0, r2: o.r2 ?? null, capTop: o.caps !== false, capBot: o.caps !== false });
    _q3.setFromUnitVectors(UP, _a2);
    g2.applyMatrix4(_m.compose(_p2.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q3, _s2.set(1, 1, 1)));
    return this.add(mat, g2, o.col || null, { jit: o.jit });
  }
  // rectangular bar between two points (w across, d deep), optional twist about its own axis
  beam(mat, a, b, w = 0.05, d = 0.05, o = {}) {
    _a2.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = _a2.length();
    if (len < 1e-6) return null;
    _a2.multiplyScalar(1 / len);
    const g2 = bevelBox(w, len, d, o.b != null ? o.b : Math.min(w, d) * 0.15, 1);
    if (o.twist) g2.rotateY(o.twist);
    _q3.setFromUnitVectors(UP, _a2);
    g2.applyMatrix4(_m.compose(_p2.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q3, _s2.set(1, 1, 1)));
    return this.add(mat, g2, o.col || null, { jit: o.jit });
  }
  tube(mat, pts, r = 0.01, o = {}) {
    return this.add(mat, tube(pts, r, o.seg || 6, { samples: o.samples ?? Math.max(8, pts.length * 5), closed: !!o.closed }), o.col || null, o);
  }
  // profile extrusion. plane: 'xy' (extrude along z), 'side' (profile = [forward, up], across x), 'up' (profile = [x, forward], extruded up), 'fwd' ([x, up] along forward)
  ext(mat, outline2, a, b, o = {}) {
    const bv = o.bevel ?? 4e-3, f3 = o.plane === "side" ? extrudeSide : o.plane === "up" ? extrudeUp : o.plane === "fwd" ? extrudeFwd : extrude;
    return this.add(mat, f3(outline2, a, b, bv, o.holes || null, { smooth: o.smooth ?? 32 }), o.col || null, o);
  }
  lathe(mat, profile, o = {}) {
    return this.add(mat, lathe(profile, o.seg || 16, { axis: o.axis || "y", crease: o.crease ?? 38, arc: o.arc ?? PI5 * 2, start: o.start ?? 0 }), o.col || null, o);
  }
  // textured quad from an atlas. Normal = +Z in local space before o.r
  quad(mat, w, h, rect2, o = {}) {
    const g2 = quadXY(w, h, rect2, o.nx || 1, o.ny || 1);
    return this.add(mat, g2, o.col || null, o);
  }
  // collider: local-space box given by min/max corners. flags: bulletOnly, playerOnly, noNav, low (can be vaulted by bullets? no: just metadata)
  col(min, max, o = {}) {
    const M = this.M, e = M.elements, c = _a2.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2).applyMatrix4(M);
    const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
    this.cols.push({ c: [c.x, c.y, c.z], h: [(max[0] - min[0]) / 2 * sx, (max[1] - min[1]) / 2 * sy, (max[2] - min[2]) / 2 * sz], yaw: Math.atan2(e[8], e[10]), surface: o.surface || "metal", bulletOnly: !!o.bulletOnly, playerOnly: !!o.playerOnly, noBullet: !!o.noBullet, noNav: !!o.noNav, soft: !!o.soft });
    return this;
  }
  // light / emissive socket: kind 'key' | 'fill' | 'flare' | 'blink'. Position in local space.
  glow(kind, p, o = {}) {
    const w = _a2.set(p[0], p[1], p[2]).applyMatrix4(this.M);
    const dir = o.dir ? _b2.set(o.dir[0], o.dir[1], o.dir[2]).transformDirection(this.M) : null;
    this.glows.push({ kind, p: [w.x, w.y, w.z], ...o, dir: dir ? [dir.x, dir.y, dir.z] : null });
    return this;
  }
  socket(name, p) {
    const w = _a2.set(p[0], p[1], p[2]).applyMatrix4(this.M);
    this.sockets[name] = [w.x, w.y, w.z];
    return this;
  }
  // bake grime: broad and fine variation, darker undersides, a dirt gradient where the prop meets the ground
  finish({ grime = 1, ground = 0.22, size = null } = {}) {
    const sd = this.seed * 3.71;
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const [name, arr] of this.B.map) {
      const raw = RAW2.test(name);
      for (const g2 of arr) {
        const P3 = g2.attributes.position, N = g2.attributes.normal, C2 = g2.attributes.color, Mk = g2.attributes.mask;
        for (let i = 0; i < P3.count; i++) {
          const x = P3.getX(i), y = P3.getY(i), z = P3.getZ(i);
          if (x < lo[0]) lo[0] = x;
          if (y < lo[1]) lo[1] = y;
          if (z < lo[2]) lo[2] = z;
          if (x > hi[0]) hi[0] = x;
          if (y > hi[1]) hi[1] = y;
          if (z > hi[2]) hi[2] = z;
          if (raw || grime <= 0 || !C2 || !N) continue;
          const ny = N.getY(i), m = vnoise(x * 1.9 + sd, y * 1.9, z * 1.9 + 5.3), a = vnoise(x * 9 + 2.1, y * 9 + sd, z * 9);
          let k = (0.84 + 0.16 * m) * (0.93 + 0.07 * a) * (0.8 + 0.2 * clamp2(ny * 0.6 + 0.62));
          const gk = clamp2(1 - y / ground);
          k *= 1 - 0.4 * gk * gk * (0.55 + 0.45 * a);
          k = 1 + (k - 1) * grime;
          C2.setXYZ(i, C2.getX(i) * k, C2.getY(i) * k * (1 - 0.04 * gk * grime), C2.getZ(i) * k * (1 - 0.1 * gk * grime));
          if (Mk) Mk.setY(i, Math.max(Mk.getY(i), clamp2(gk * gk * 0.9 * grime + (ny < -0.4 ? 0.25 : 0))));
        }
      }
    }
    this.size = size || [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    this.min = lo;
    this.max = hi;
    if (!this.cols.length) this.col([lo[0], Math.max(0, lo[1]), lo[2]], [hi[0], hi[1], hi[2]]);
    this.tris = this.B.stats().total;
    return this;
  }
};
var CACHE2 = /* @__PURE__ */ new Map();
function proto(key, fn) {
  let p = CACHE2.get(key);
  if (!p) {
    p = fn();
    CACHE2.set(key, p);
  }
  return p;
}

