var BIG = 1e3;
var smin = (a, b, k) => {
  const m = a < b ? a : b;
  if (k <= 0) return m;
  const h = k - Math.abs(a - b);
  return h <= 0 ? m : m - h * h / (4 * k);
};
var smax = (a, b, k) => {
  const m = a > b ? a : b;
  if (k <= 0) return m;
  const h = k - Math.abs(a - b);
  return h <= 0 ? m : m + h * h / (4 * k);
};
var nrm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
var crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function frame(u, front = [0, 0, 1]) {
  const y = nrm(u), d = y[0] * front[0] + y[1] * front[1] + y[2] * front[2];
  let z = [front[0] - y[0] * d, front[1] - y[1] * d, front[2] - y[2] * d];
  if (Math.hypot(z[0], z[1], z[2]) < 1e-5) z = Math.abs(y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  z = nrm(z);
  return [crs(y, z), y, z];
}
function euler(rx = 0, ry = 0, rz = 0) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [[cy * cz, cy * sz, -sy], [sx * sy * cz - cx * sz, sx * sy * sz + cx * cz, sx * cy], [cx * sy * cz + sx * sz, cx * sy * sz - sx * cz, cx * cy]];
}
var Prim = class {
  constructor() {
    this.k = 0.01;
    this.op = 0;
    this.tag = "";
  }
  blend(k) {
    this.k = k;
    return this;
  }
  sub(k = this.k) {
    this.op = 1;
    this.k = k;
    return this;
  }
  as(tag) {
    this.tag = tag;
    return this;
  }
};
var Ell = class extends Prim {
  constructor(c, r, F2 = IDENT) {
    super();
    this.c = c;
    this.r = r;
    this.F = F2;
    const [X, Y, Z] = F2, e = [0, 1, 2].map((i) => Math.hypot(X[i] * r[0], Y[i] * r[1], Z[i] * r[2]));
    this.bb = [c[0] - e[0], c[1] - e[1], c[2] - e[2], c[0] + e[0], c[1] + e[1], c[2] + e[2]];
    this.rm = Math.min(r[0], r[1], r[2]);
  }
  d(x, y, z) {
    const c = this.c, F2 = this.F, r = this.r;
    x -= c[0];
    y -= c[1];
    z -= c[2];
    const lx3 = (x * F2[0][0] + y * F2[0][1] + z * F2[0][2]) / r[0], ly2 = (x * F2[1][0] + y * F2[1][1] + z * F2[1][2]) / r[1], lz3 = (x * F2[2][0] + y * F2[2][1] + z * F2[2][2]) / r[2];
    const k0 = Math.sqrt(lx3 * lx3 + ly2 * ly2 + lz3 * lz3);
    if (k0 < 1e-6) return -this.rm;
    const gx = lx3 / r[0], gy = ly2 / r[1], gz = lz3 / r[2];
    return k0 * (k0 - 1) / Math.sqrt(gx * gx + gy * gy + gz * gz);
  }
};
var Cap = class extends Prim {
  constructor(a, b, ra, rb = ra) {
    super();
    this.a = a;
    this.ra = ra;
    this.rb = rb;
    this.e = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    this.ee = this.e[0] * this.e[0] + this.e[1] * this.e[1] + this.e[2] * this.e[2] || 1e-12;
    const m = Math.max(ra, rb);
    this.bb = [Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.min(a[2], b[2]) - m, Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m, Math.max(a[2], b[2]) + m];
  }
  d(x, y, z) {
    const a = this.a, e = this.e;
    x -= a[0];
    y -= a[1];
    z -= a[2];
    let t = (x * e[0] + y * e[1] + z * e[2]) / this.ee;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    x -= e[0] * t;
    y -= e[1] * t;
    z -= e[2] * t;
    return Math.sqrt(x * x + y * y + z * z) - (this.ra + (this.rb - this.ra) * t);
  }
};
var RBox = class extends Prim {
  constructor(c, h, rd = 2e-3, F2 = IDENT) {
    super();
    this.c = c;
    this.h = h;
    this.rd = rd;
    this.F = F2;
    const [X, Y, Z] = F2, e = [0, 1, 2].map((i) => Math.abs(X[i]) * h[0] + Math.abs(Y[i]) * h[1] + Math.abs(Z[i]) * h[2]);
    this.bb = [c[0] - e[0], c[1] - e[1], c[2] - e[2], c[0] + e[0], c[1] + e[1], c[2] + e[2]];
  }
  d(x, y, z) {
    const c = this.c, F2 = this.F, h = this.h, rd = this.rd;
    x -= c[0];
    y -= c[1];
    z -= c[2];
    const qx = Math.abs(x * F2[0][0] + y * F2[0][1] + z * F2[0][2]) - h[0] + rd, qy = Math.abs(x * F2[1][0] + y * F2[1][1] + z * F2[1][2]) - h[1] + rd, qz = Math.abs(x * F2[2][0] + y * F2[2][1] + z * F2[2][2]) - h[2] + rd;
    const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0, m = Math.max(qx, qy, qz);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + (m < 0 ? m : 0) - rd;
  }
};
var Chain = class extends Prim {
  constructor(pts, rf) {
    super();
    this.n = pts.length - 1;
    this.caps = [];
    let m = 0;
    const R4 = typeof rf === "function" ? rf : () => rf;
    for (let i = 0; i < this.n; i++) {
      const c = new Cap(pts[i], pts[i + 1], R4(i / this.n), R4((i + 1) / this.n));
      this.caps.push(c);
      m = Math.max(m, c.ra, c.rb);
    }
    const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of pts) for (let a = 0; a < 3; a++) {
      bb[a] = Math.min(bb[a], p[a] - m);
      bb[a + 3] = Math.max(bb[a + 3], p[a] + m);
    }
    this.bb = bb;
  }
  d(x, y, z) {
    let m = 1e9;
    const cs = this.caps;
    for (let i = 0; i < cs.length; i++) {
      const v = cs[i].d(x, y, z);
      if (v < m) m = v;
    }
    return m;
  }
};
var Rough = class extends Prim {
  constructor(p, amp, freq, seed = 0, oct = 2) {
    super();
    this.p = p;
    this.amp = amp;
    this.f = freq;
    this.s = seed * 17.3;
    this.oct = oct;
    this.k = p.k;
    this.op = p.op;
    const b = p.bb;
    this.bb = [b[0] - amp, b[1] - amp, b[2] - amp, b[3] + amp, b[4] + amp, b[5] + amp];
  }
  d(x, y, z) {
    return this.p.d(x, y, z) + this.amp * (fbm(x * this.f + this.s, y * this.f + 3.1, z * this.f + 7.7, this.oct) - 0.5) * 2;
  }
};
var Group2 = class extends Prim {
  constructor(list, k = 6e-3) {
    super();
    this.list = list;
    this.kk = k;
    const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of list) for (let a = 0; a < 3; a++) {
      bb[a] = Math.min(bb[a], p.bb[a] - k);
      bb[a + 3] = Math.max(bb[a + 3], p.bb[a + 3] + k);
    }
    this.bb = bb;
  }
  d(x, y, z) {
    const L = this.list;
    let m = L[0].d(x, y, z);
    for (let i = 1; i < L.length; i++) {
      const p = L[i], v = p.d(x, y, z);
      m = p.op === 1 ? smax(m, -v, p.k) : smin(m, v, this.kk);
    }
    return m;
  }
};
var Fn = class extends Prim {
  constructor(bb, fn) {
    super();
    this.bb = bb;
    this.d = fn;
  }
};
var Dent = class extends Prim {
  constructor(c, r, amp, F2 = IDENT) {
    super();
    this.c = c;
    this.r = r;
    this.amp = amp;
    this.F = F2;
    this.k = 0;
    this.op = 3;
    const [X, Y, Z] = F2, e = [0, 1, 2].map((i) => Math.hypot(X[i] * r[0], Y[i] * r[1], Z[i] * r[2]));
    this.bb = [c[0] - e[0], c[1] - e[1], c[2] - e[2], c[0] + e[0], c[1] + e[1], c[2] + e[2]];
  }
  d(x, y, z) {
    const c = this.c, F2 = this.F, r = this.r;
    x -= c[0];
    y -= c[1];
    z -= c[2];
    const lx3 = (x * F2[0][0] + y * F2[0][1] + z * F2[0][2]) / r[0], ly2 = (x * F2[1][0] + y * F2[1][1] + z * F2[1][2]) / r[1], lz3 = (x * F2[2][0] + y * F2[2][1] + z * F2[2][2]) / r[2], q = 1 - (lx3 * lx3 + ly2 * ly2 + lz3 * lz3);
    return q <= 0 ? 0 : this.amp * q * q;
  }
};
var ell = (c, r, F2) => new Ell(c, r, F2);
var cap = (a, b, ra, rb) => new Cap(a, b, ra, rb);
var sph = (c, r) => new Ell(c, [r, r, r]);
var rbox = (c, h, rd, F2) => new RBox(c, h, rd, F2);
var chain2 = (pts, rf) => new Chain(pts, rf);
function evalPrims(list, x, y, z) {
  let m = BIG;
  for (const p of list) {
    const v = p.d(x, y, z);
    m = p.op === 1 ? smax(m, -v, p.k) : p.op === 2 ? smax(m, v, p.k) : p.op === 3 ? m + v : smin(m, v, p.k);
  }
  return m;
}
function axisCoords(spec) {
  const bands = typeof spec[0] === "number" ? [spec] : spec, o = [];
  let x = bands[0][0];
  for (const [a, b, c] of bands) {
    const n = Math.max(1, Math.round((b - x) / c)), st = (b - x) / n;
    for (let i = 0; i < n; i++) o.push(x + i * st);
    x = b;
  }
  o.push(x);
  return Float32Array.from(o);
}
function lowerIdx(a, v) {
  let lo = 0, hi = a.length - 1;
  while (lo < hi) {
    const m = lo + hi >> 1;
    if (a[m] < v) lo = m + 1;
    else hi = m;
  }
  return lo;
}
function _fade(a, i0, i1, lo, hi, pad) {
  const o = new Float32Array(Math.max(0, i1 - i0 + 1));
  for (let i = i0; i <= i1; i++) {
    const t = Math.min(a[i] - lo, hi - a[i]) / pad;
    o[i - i0] = t < 0 ? 0 : t > 1 ? 1 : t;
  }
  return o;
}
var Grid = class _Grid {
  constructor(xs, ys, zs, fill2 = BIG) {
    this.xs = xs;
    this.ys = ys;
    this.zs = zs;
    this.nx = xs.length;
    this.ny = ys.length;
    this.nz = zs.length;
    this.sy = this.nx;
    this.sz = this.nx * this.ny;
    this.d = new Float32Array(this.nx * this.ny * this.nz);
    if (fill2) this.d.fill(fill2);
    this.lut = [xs, ys, zs].map((a) => {
      let st = 1e9;
      for (let i = 1; i < a.length; i++) st = Math.min(st, a[i] - a[i - 1]);
      const n = Math.ceil((a[a.length - 1] - a[0]) / st) + 1, L = new Uint16Array(n);
      let j = 0;
      for (let i = 0; i < n; i++) {
        const v = a[0] + i * st;
        while (j < a.length - 2 && a[j + 1] <= v) j++;
        L[i] = j;
      }
      return { st, L, a };
    });
    this.cell = Math.min(this.lut[0].st, this.lut[1].st, this.lut[2].st);
  }
  static box(min, max, cell) {
    return new _Grid(axisCoords([min[0], max[0], cell]), axisCoords([min[1], max[1], cell]), axisCoords([min[2], max[2], cell]));
  }
  static bands(sx, sy, sz) {
    return new _Grid(axisCoords(sx), axisCoords(sy), axisCoords(sz));
  }
  // same sample points, optionally a sub-box: garments are built on the body's own samples so no resampling blurs them
  sub(min, max, pad = 2) {
    const r = (a, lo, hi) => {
      const i0 = Math.max(0, lowerIdx(a, lo) - pad), i1 = Math.min(a.length - 1, lowerIdx(a, hi) + pad);
      return [i0, i1];
    };
    const X = r(this.xs, min[0], max[0]), Y = r(this.ys, min[1], max[1]), Z = r(this.zs, min[2], max[2]);
    const g2 = new _Grid(this.xs.slice(X[0], X[1] + 1), this.ys.slice(Y[0], Y[1] + 1), this.zs.slice(Z[0], Z[1] + 1), 0);
    for (let k = 0; k < g2.nz; k++) for (let j = 0; j < g2.ny; j++) {
      const s = X[0] + this.sy * (j + Y[0]) + this.sz * (k + Z[0]);
      g2.d.set(this.d.subarray(s, s + g2.nx), g2.sy * j + g2.sz * k);
    }
    return g2;
  }
  // rasterise primitives in list order. pad = how far outside a primitive its value still matters (offset shells read the field out there)
  add(list, pad = 4e-3) {
    const xs = this.xs, ys = this.ys, zs = this.zs, D = this.d, sy = this.sy, sz = this.sz;
    for (const p of list) {
      const b = p.bb, m = p.k * 1.7 + pad, i0 = Math.max(0, lowerIdx(xs, b[0] - m)), i1 = Math.min(this.nx - 1, lowerIdx(xs, b[3] + m)), j0 = Math.max(0, lowerIdx(ys, b[1] - m)), j1 = Math.min(this.ny - 1, lowerIdx(ys, b[4] + m)), k0 = Math.max(0, lowerIdx(zs, b[2] - m)), k1 = Math.min(this.nz - 1, lowerIdx(zs, b[5] + m)), kk = p.k, op = p.op;
      const fw = pad + p.k * 0.5, fx = _fade(xs, i0, i1, b[0] - m, b[3] + m, fw), fy = _fade(ys, j0, j1, b[1] - m, b[4] + m, fw), fz = _fade(zs, k0, k1, b[2] - m, b[5] + m, fw);
      for (let k = k0; k <= k1; k++) {
        const z = zs[k], wz = fz[k - k0];
        for (let j = j0; j <= j1; j++) {
          const y = ys[j], wyz = Math.min(wz, fy[j - j0]);
          let q = i0 + sy * j + sz * k;
          for (let i = i0; i <= i1; i++, q++) {
            const v = p.d(xs[i], y, z), c = D[q], r = op === 0 ? smin(c, v, kk) : op === 1 ? smax(c, -v, kk) : op === 2 ? smax(c, v, kk) : c + v, w = Math.min(wyz, fx[i - i0]);
            D[q] = w >= 1 || c > BIG * 0.5 ? r : c + (r - c) * w * w * (3 - 2 * w);
          }
        }
      }
    }
    return this;
  }
  // apply fn(value, x, y, z) -> value to every sample (offsets, drapes, folds)
  map(fn) {
    const D = this.d;
    let q = 0;
    for (let k = 0; k < this.nz; k++) {
      const z = this.zs[k];
      for (let j = 0; j < this.ny; j++) {
        const y = this.ys[j];
        for (let i = 0; i < this.nx; i++, q++) D[q] = fn(D[q], this.xs[i], y, z);
      }
    }
    return this;
  }
  _i(a, v) {
    const l = this.lut[a], A = l.a, n = A.length - 2;
    let i = (v - A[0]) / l.st;
    i = l.L[i < 0 ? 0 : i >= l.L.length ? l.L.length - 1 : i | 0];
    while (i < n && A[i + 1] <= v) i++;
    while (i > 0 && A[i] > v) i--;
    return i;
  }
  // trilinear sample (clamped at the box)
  at(x, y, z) {
    const xs = this.xs, ys = this.ys, zs = this.zs, i = this._i(0, x), j = this._i(1, y), k = this._i(2, z), D = this.d;
    let fx = (x - xs[i]) / (xs[i + 1] - xs[i]), fy = (y - ys[j]) / (ys[j + 1] - ys[j]), fz = (z - zs[k]) / (zs[k + 1] - zs[k]);
    fx = fx < 0 ? 0 : fx > 1 ? 1 : fx;
    fy = fy < 0 ? 0 : fy > 1 ? 1 : fy;
    fz = fz < 0 ? 0 : fz > 1 ? 1 : fz;
    const q = i + this.sy * j + this.sz * k, q2 = q + this.sz, sy = this.sy;
    const a = D[q] + (D[q + 1] - D[q]) * fx, b = D[q + sy] + (D[q + sy + 1] - D[q + sy]) * fx, c = D[q2] + (D[q2 + 1] - D[q2]) * fx, e = D[q2 + sy] + (D[q2 + sy + 1] - D[q2 + sy]) * fx;
    const ab = a + (b - a) * fy, ce = c + (e - c) * fy;
    return ab + (ce - ab) * fz;
  }
  // gradient by central differences, written to out[0..2] (not normalised)
  grad(x, y, z, out, h = this.cell * 0.75) {
    out[0] = this.at(x + h, y, z) - this.at(x - h, y, z);
    out[1] = this.at(x, y + h, z) - this.at(x, y - h, z);
    out[2] = this.at(x, y, z + h) - this.at(x, y, z - h);
    return out;
  }
  inside(x, y, z) {
    return x >= this.xs[0] && x <= this.xs[this.nx - 1] && y >= this.ys[0] && y <= this.ys[this.ny - 1] && z >= this.zs[0] && z <= this.zs[this.nz - 1];
  }
};
var EDGE = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
function surfaceNets(G4, iso = 0, keep = null) {
  const { nx, ny, nz, xs, ys, zs, d: D, sy, sz } = G4, P3 = [], Q2 = [], v = new Float64Array(8), cx = new Float64Array(8), cy = new Float64Array(8), cz = new Float64Array(8);
  let prev = new Int32Array(nx * ny).fill(-1), cur = new Int32Array(nx * ny).fill(-1), nv = 0;
  for (let k = 0; k < nz - 1; k++) {
    cur.fill(-1);
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const q = i + sy * j + sz * k;
      let mask = 0;
      v[0] = D[q] - iso;
      v[1] = D[q + 1] - iso;
      v[2] = D[q + sy] - iso;
      v[3] = D[q + sy + 1] - iso;
      v[4] = D[q + sz] - iso;
      v[5] = D[q + sz + 1] - iso;
      v[6] = D[q + sz + sy] - iso;
      v[7] = D[q + sz + sy + 1] - iso;
      for (let c = 0; c < 8; c++) if (v[c] < 0) mask |= 1 << c;
      if (mask === 0 || mask === 255) continue;
      const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1], z0 = zs[k], z1 = zs[k + 1];
      if (keep && !keep((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5)) continue;
      for (let c = 0; c < 8; c++) {
        cx[c] = c & 1 ? x1 : x0;
        cy[c] = c & 2 ? y1 : y0;
        cz[c] = c & 4 ? z1 : z0;
      }
      let px2 = 0, py2 = 0, pz2 = 0, n = 0;
      for (let e = 0; e < 12; e++) {
        const a = EDGE[e][0], b = EDGE[e][1];
        if (v[a] < 0 === v[b] < 0) continue;
        const t2 = v[a] / (v[a] - v[b]);
        px2 += cx[a] + (cx[b] - cx[a]) * t2;
        py2 += cy[a] + (cy[b] - cy[a]) * t2;
        pz2 += cz[a] + (cz[b] - cz[a]) * t2;
        n++;
      }
      P3.push(px2 / n, py2 / n, pz2 / n);
      cur[i + nx * j] = nv++;
      const s0 = v[0] < 0, me = nv - 1;
      if (j > 0 && k > 0 && s0 !== v[1] < 0) {
        const a = cur[i + nx * (j - 1)], b = prev[i + nx * (j - 1)], c = prev[i + nx * j];
        if (a >= 0 && b >= 0 && c >= 0) {
          if (!s0) Q2.push(me, c, b, a);
          else Q2.push(me, a, b, c);
        }
      }
      if (i > 0 && k > 0 && s0 !== v[2] < 0) {
        const a = cur[i - 1 + nx * j], b = prev[i - 1 + nx * j], c = prev[i + nx * j];
        if (a >= 0 && b >= 0 && c >= 0) {
          if (!s0) Q2.push(me, a, b, c);
          else Q2.push(me, c, b, a);
        }
      }
      if (i > 0 && j > 0 && s0 !== v[4] < 0) {
        const a = cur[i - 1 + nx * j], b = cur[i - 1 + nx * (j - 1)], c = cur[i + nx * (j - 1)];
        if (a >= 0 && b >= 0 && c >= 0) {
          if (!s0) Q2.push(me, c, b, a);
          else Q2.push(me, a, b, c);
        }
      }
    }
    const t = prev;
    prev = cur;
    cur = t;
  }
  return { P: Float32Array.from(P3), Q: Uint32Array.from(Q2) };
}

