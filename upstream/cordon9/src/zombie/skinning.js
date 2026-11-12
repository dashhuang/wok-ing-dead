var NB = BONES.length;
var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var ss3 = (a, b, x) => {
  let t = (x - a) / (b - a);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
};
function boneSegments(B2) {
  const J = B2.J, S4 = new Array(NBASE).fill(null), seg = (a, b) => ({ a, e: sub(b, a) }), up = (p, d) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
  S4[BI.hips] = [seg(J.hips, J.spine), seg(J.thighL, J.thighR)];
  S4[BI.spine] = [seg(J.spine, J.chest)];
  S4[BI.chest] = [seg(J.chest, J.neck), seg(up(J.neck, [0, -0.045, 0]), up(J.armL, [-0.035, 0.01, 0])), seg(up(J.neck, [0, -0.045, 0]), up(J.armR, [0.035, 0.01, 0]))];
  S4[BI.neck] = [seg(J.neck, J.head)];
  S4[BI.head] = [seg(J.head, up(B2.hc, [0, 0.07 * B2.HK, 0])), seg(up(B2.hc, [0, -0.03 * B2.HK, 0]), up(B2.hc, [0, -0.05 * B2.HK, 0.07 * B2.HK]))];
  for (const s of ["L", "R"]) {
    const k = s === "L" ? 1 : -1, ad = sub(J["hand" + s], J["fore" + s]), al = Math.hypot(ad[0], ad[1], ad[2]);
    S4[BI["arm" + s]] = [seg(J["arm" + s], J["fore" + s])];
    S4[BI["fore" + s]] = [seg(J["fore" + s], J["hand" + s])];
    S4[BI["hand" + s]] = [seg(J["hand" + s], up(J["hand" + s], [ad[0] / al * 0.1, ad[1] / al * 0.1, ad[2] / al * 0.1]))];
    S4[BI["thigh" + s]] = [seg(J["thigh" + s], J["shin" + s])];
    S4[BI["shin" + s]] = [seg(J["shin" + s], J["foot" + s])];
    S4[BI["foot" + s]] = [seg(J["foot" + s], up(J["foot" + s], [k * 4e-3, -0.05, 0.13]))];
  }
  return S4;
}
function segDist(s, x, y, z, out) {
  const a = s.a, e = s.e, px2 = x - a[0], py2 = y - a[1], pz2 = z - a[2], ee = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
  let t = ee > 0 ? (px2 * e[0] + py2 * e[1] + pz2 * e[2]) / ee : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  out[0] = a[0] + e[0] * t;
  out[1] = a[1] + e[1] * t;
  out[2] = a[2] + e[2] * t;
  return Math.hypot(x - out[0], y - out[1], z - out[2]);
}
function heatWeights(B2, G4, m, { strength = 1 } = {}) {
  const P3 = m.P, nv = P3.length / 3, { st, nb: nb2 } = adjacency(nv, m.I), S4 = boneSegments(B2), cell = G4.cell, near = new Int16Array(nv).fill(-1), Hd = new Float32Array(nv), c = [0, 0, 0], c2 = [0, 0, 0], dist = new Float32Array(NBASE);
  let e2 = 0, ne = 0;
  for (let i = 0; i < nv; i += 7) for (let k = st[i]; k < st[i + 1]; k++) {
    const j = nb2[k];
    e2 += (P3[i * 3] - P3[j * 3]) ** 2 + (P3[i * 3 + 1] - P3[j * 3 + 1]) ** 2 + (P3[i * 3 + 2] - P3[j * 3 + 2]) ** 2;
    ne++;
  }
  e2 /= ne || 1;
  const visible = (x2, y, z, d) => {
    const n = Math.max(3, Math.ceil(d / (cell * 0.8)));
    for (let k = 1; k < n; k++) {
      const t = (k + 0.6) / (n + 0.6);
      if (t * d < cell * 1.3) continue;
      if (G4.at(x2 + (c[0] - x2) * t, y + (c[1] - y) * t, z + (c[2] - z) * t) > cell * 0.3) return false;
    }
    return true;
  };
  for (let i = 0; i < nv; i++) {
    const x2 = P3[i * 3], y = P3[i * 3 + 1], z = P3[i * 3 + 2];
    let b0 = -1, d0 = 1e9, b1 = -1, d1 = 1e9;
    for (let j = 0; j < NBASE; j++) {
      const sg = S4[j];
      if (!sg) {
        dist[j] = 1e9;
        continue;
      }
      let d = 1e9;
      for (const s of sg) {
        const v = segDist(s, x2, y, z, c2);
        if (v < d) d = v;
      }
      dist[j] = d;
      if (d < d0) {
        b1 = b0;
        d1 = d0;
        b0 = j;
        d0 = d;
      } else if (d < d1) {
        b1 = j;
        d1 = d;
      }
    }
    const tryBone = (j, d) => {
      let best = 1e9;
      for (const s of S4[j]) {
        const v = segDist(s, x2, y, z, c2);
        if (v < best) {
          best = v;
          c[0] = c2[0];
          c[1] = c2[1];
          c[2] = c2[2];
        }
      }
      return visible(x2, y, z, d);
    };
    let pick = -1, pd = 0;
    if (tryBone(b0, d0)) {
      pick = b0;
      pd = d0;
    } else if (b1 >= 0 && d1 < d0 * 1.35 && tryBone(b1, d1)) {
      pick = b1;
      pd = d1;
    }
    if (pick >= 0) {
      near[i] = pick;
      const deg2 = st[i + 1] - st[i];
      Hd[i] = strength * deg2 * e2 / (4 * Math.max(pd * pd, cell * cell * 0.25));
    }
  }
  const W = new Float32Array(nv * NBASE), x = new Float64Array(nv), r = new Float64Array(nv), zv = new Float64Array(nv), p = new Float64Array(nv), Ap = new Float64Array(nv), dg = new Float64Array(nv);
  for (let i = 0; i < nv; i++) dg[i] = 1 / (st[i + 1] - st[i] + Hd[i] || 1);
  const mul = (v, o) => {
    for (let i = 0; i < nv; i++) {
      let s = (st[i + 1] - st[i] + Hd[i]) * v[i];
      for (let k = st[i]; k < st[i + 1]; k++) s -= v[nb2[k]];
      o[i] = s;
    }
  };
  let iters = 0;
  for (let j = 0; j < NBASE; j++) {
    let bn = 0;
    for (let i = 0; i < nv; i++) {
      const b = near[i] === j ? Hd[i] : 0;
      r[i] = b;
      x[i] = near[i] === j ? 1 : 0;
      bn += b * b;
    }
    if (bn === 0) continue;
    mul(x, Ap);
    let rz = 0;
    for (let i = 0; i < nv; i++) {
      r[i] -= Ap[i];
      zv[i] = r[i] * dg[i];
      p[i] = zv[i];
      rz += r[i] * zv[i];
    }
    const tol = bn * 1e-7;
    for (let it = 0; it < 260; it++) {
      mul(p, Ap);
      let pAp = 0;
      for (let i = 0; i < nv; i++) pAp += p[i] * Ap[i];
      if (pAp <= 0) break;
      const al = rz / pAp;
      let rr = 0, rz2 = 0;
      for (let i = 0; i < nv; i++) {
        x[i] += al * p[i];
        r[i] -= al * Ap[i];
        rr += r[i] * r[i];
        zv[i] = r[i] * dg[i];
        rz2 += r[i] * zv[i];
      }
      iters++;
      if (rr < tol) break;
      const be = rz2 / rz;
      rz = rz2;
      for (let i = 0; i < nv; i++) p[i] = zv[i] + be * p[i];
    }
    for (let i = 0; i < nv; i++) W[i * NBASE + j] = x[i] < 0 ? 0 : x[i];
  }
  for (let i = 0; i < nv; i++) {
    let s = 0;
    for (let j = 0; j < NBASE; j++) {
      const o = i * NBASE + j;
      if (W[o] < 0.015) W[o] = 0;
      s += W[o];
    }
    if (s > 0) for (let j = 0; j < NBASE; j++) W[i * NBASE + j] /= s;
    else W[i * NBASE + BI.hips] = 1;
  }
  let tied = 0;
  for (let i = 0; i < nv; i++) if (near[i] >= 0) tied++;
  return new WeightField(m, W, cell * 2.6, { iters, tied, nv });
}
var WeightField = class {
  constructor(m, W, r, info) {
    this.P = m.P;
    this.N = m.N;
    this.W = W;
    this.r = r;
    this.info = info;
    const P3 = m.P, nv = P3.length / 3, bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (let i = 0; i < nv; i++) for (let a = 0; a < 3; a++) {
      const v = P3[i * 3 + a];
      if (v < bb[a]) bb[a] = v;
      if (v > bb[a + 3]) bb[a + 3] = v;
    }
    this.o = [bb[0] - r, bb[1] - r, bb[2] - r];
    this.n = [0, 1, 2].map((a) => Math.ceil((bb[a + 3] - bb[a]) / r) + 3);
    const nc = this.n[0] * this.n[1] * this.n[2], cnt = new Uint32Array(nc + 1), ci = new Uint32Array(nv);
    for (let i = 0; i < nv; i++) {
      const q = this.cellOf(P3[i * 3], P3[i * 3 + 1], P3[i * 3 + 2]);
      ci[i] = q;
      cnt[q + 1]++;
    }
    for (let q = 0; q < nc; q++) cnt[q + 1] += cnt[q];
    this.st = cnt.slice();
    const fill2 = cnt.slice(0, nc), it = this.it = new Uint32Array(nv);
    for (let i = 0; i < nv; i++) it[fill2[ci[i]]++] = i;
  }
  cellOf(x, y, z) {
    const n = this.n, r = this.r, i = Math.min(n[0] - 1, Math.max(0, (x - this.o[0]) / r | 0)), j = Math.min(n[1] - 1, Math.max(0, (y - this.o[1]) / r | 0)), k = Math.min(n[2] - 1, Math.max(0, (z - this.o[2]) / r | 0));
    return i + n[0] * (j + n[1] * k);
  }
  // fills out[0..NBASE) (the rest of out is zeroed); returns the kernel sum (0 = nothing near)
  sample(x, y, z, nx, ny, nz, out, reach = 1) {
    out.fill(0);
    const n = this.n, r = this.r * reach, r2 = r * r, P3 = this.P, N = this.N, W = this.W, st = this.st, it = this.it, span = Math.ceil(reach);
    const ci = Math.min(n[0] - 1, Math.max(0, (x - this.o[0]) / this.r | 0)), cj = Math.min(n[1] - 1, Math.max(0, (y - this.o[1]) / this.r | 0)), ck = Math.min(n[2] - 1, Math.max(0, (z - this.o[2]) / this.r | 0));
    let sum = 0;
    for (let k = Math.max(0, ck - span); k <= Math.min(n[2] - 1, ck + span); k++) for (let j = Math.max(0, cj - span); j <= Math.min(n[1] - 1, cj + span); j++) for (let i = Math.max(0, ci - span); i <= Math.min(n[0] - 1, ci + span); i++) {
      const q = i + n[0] * (j + n[1] * k);
      for (let a = st[q]; a < st[q + 1]; a++) {
        const v = it[a], dx = P3[v * 3] - x, dy = P3[v * 3 + 1] - y, dz = P3[v * 3 + 2] - z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= r2) continue;
        const f3 = 1 - d2 / r2, dn = N[v * 3] * nx + N[v * 3 + 1] * ny + N[v * 3 + 2] * nz, g2 = dn > 0 ? 0.04 + dn : 0.04, w = f3 * f3 * g2 * g2;
        sum += w;
        const o = v * NBASE;
        for (let b = 0; b < NBASE; b++) out[b] += w * W[o + b];
      }
    }
    if (sum < 1e-9) {
      if (reach < 4) return this.sample(x, y, z, nx, ny, nz, out, reach * 2);
      out[BI.hips] = 1;
      return 0;
    }
    const inv = 1 / sum;
    for (let b = 0; b < NBASE; b++) out[b] *= inv;
    return sum;
  }
};
function finish(B2, d, x, y, z, si, sw, o, jawK = 0) {
  const J = B2.J;
  if (jawK > 0) {
    const j = d[BI.head] * jawK;
    d[BI.jaw] += j;
    d[BI.head] -= j;
  }
  for (let s2 = 0; s2 < 2; s2++) {
    const sf = s2 ? "R" : "L", a = BI["arm" + sf], f3 = BI["fore" + sf], th = BI["thigh" + sf], sh = BI["shin" + sf];
    if (d[a] > 0 || d[f3] > 0) {
      const A = J["arm" + sf], E = J["fore" + sf], Wr = J["hand" + sf];
      if (d[a] > 0) {
        const ex = E[0] - A[0], ey = E[1] - A[1], ez = E[2] - A[2], t = ((x - A[0]) * ex + (y - A[1]) * ey + (z - A[2]) * ez) / (ex * ex + ey * ey + ez * ez), tw = d[a] * 0.85 * ss3(0.55, 0.05, t);
        d[BI["armTw" + sf]] = tw;
        d[a] -= tw;
      }
      if (d[f3] > 0) {
        const ex = Wr[0] - E[0], ey = Wr[1] - E[1], ez = Wr[2] - E[2], t = ((x - E[0]) * ex + (y - E[1]) * ey + (z - E[2]) * ez) / (ex * ex + ey * ey + ez * ez), tw = d[f3] * 0.8 * ss3(0.25, 0.95, t);
        d[BI["foreTw" + sf]] = tw;
        d[f3] -= tw;
      }
      const m = Math.min(d[a], d[f3]);
      if (m > 0) {
        d[BI["elbow" + sf]] = 1.6 * m;
        d[a] -= 0.8 * m;
        d[f3] -= 0.8 * m;
      }
    }
    if (d[th] > 0 || d[sh] > 0) {
      const H2 = J["thigh" + sf], Kn = J["shin" + sf];
      if (d[th] > 0) {
        const ex = Kn[0] - H2[0], ey = Kn[1] - H2[1], ez = Kn[2] - H2[2], t = ((x - H2[0]) * ex + (y - H2[1]) * ey + (z - H2[2]) * ez) / (ex * ex + ey * ey + ez * ez), tw = d[th] * 0.8 * ss3(0.5, 0.05, t);
        d[BI["thighTw" + sf]] = tw;
        d[th] -= tw;
      }
      const m = Math.min(d[th], d[sh]);
      if (m > 0) {
        d[BI["knee" + sf]] = 1.6 * m;
        d[th] -= 0.8 * m;
        d[sh] -= 0.8 * m;
      }
    }
  }
  let i0 = 0, i1 = 0, i2 = 0, i3 = 0, w0 = 0, w1 = 0, w2 = 0, w3 = 0;
  for (let b = 0; b < NB; b++) {
    const w = d[b];
    if (w <= w3) continue;
    if (w > w0) {
      i3 = i2;
      w3 = w2;
      i2 = i1;
      w2 = w1;
      i1 = i0;
      w1 = w0;
      i0 = b;
      w0 = w;
    } else if (w > w1) {
      i3 = i2;
      w3 = w2;
      i2 = i1;
      w2 = w1;
      i1 = b;
      w1 = w;
    } else if (w > w2) {
      i3 = i2;
      w3 = w2;
      i2 = b;
      w2 = w;
    } else {
      i3 = b;
      w3 = w;
    }
  }
  const s = w0 + w1 + w2 + w3 || 1;
  si[o] = i0;
  si[o + 1] = i1;
  si[o + 2] = i2;
  si[o + 3] = i3;
  sw[o] = w0 / s;
  sw[o + 1] = w1 / s;
  sw[o + 2] = w2 / s;
  sw[o + 3] = w3 / s;
}
var DENSE = () => new Float32Array(NB);

