// Vehicles. A body is a side silhouette swept across the width with every edge rounded,
// a glasshouse that leans in above the belt line and wheel arches cut into the flanks; lamps,
// wheels, mirrors, plates and shut lines are added on top. Everything is baked into the
// static batches, so a street full of cars costs a handful of draw calls.
import * as THREE from "three";

const LATIN =
  '"Big Shoulders Display", "Barlow Condensed", "Arial Narrow", Impact, sans-serif';
const SERIF = '"CT Serif", "Noto Serif TC", "Songti TC", "PingFang TC", serif';

// ---------------------------------------------------------------- geometry buffer
class Buf {
  constructor() {
    this.p = [];
    this.n = [];
    this.i = [];
    this.uv = []; // only filled by textured patches
  }
  vert(p, n) {
    this.p.push(p[0], p[1], p[2]);
    this.n.push(n[0], n[1], n[2]);
    return this.p.length / 3 - 1;
  }
  tri(a, b, c) {
    this.i.push(a, b, c);
  }
  // flat quad, counter-clockwise seen from the front
  quad(a, b, c, d) {
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2];
    const vx = d[0] - a[0],
      vy = d[1] - a[1],
      vz = d[2] - a[2];
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    const n = [nx / l, ny / l, nz / l];
    const i = this.vert(a, n);
    this.vert(b, n);
    this.vert(c, n);
    this.vert(d, n);
    this.i.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  // box from two corners
  box(x0, y0, z0, x1, y1, z1) {
    const q = (a, b, c, d) => this.quad(a, b, c, d);
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
    q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
    q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  }
  get empty() {
    return this.i.length === 0;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    if (this.uv.length === (this.p.length / 3) * 2)
      g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.i);
    return g;
  }
}

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Rounds the corners of a polyline. Points are [x, y, radius?].
function fillet(points, radius) {
  const out = [[points[0][0], points[0][1]]];
  for (let i = 1; i < points.length - 1; i++) {
    const A = points[i - 1],
      B = points[i],
      C = points[i + 1];
    const r = B[2] ?? radius;
    const ux = A[0] - B[0],
      uy = A[1] - B[1],
      vx = C[0] - B[0],
      vy = C[1] - B[1];
    const lu = Math.hypot(ux, uy),
      lv = Math.hypot(vx, vy);
    const cos = (ux * vx + uy * vy) / (lu * lv);
    const turn = Math.PI - Math.acos(Math.max(-1, Math.min(1, cos)));
    if (r <= 0 || turn < 0.02) {
      out.push([B[0], B[1]]);
      continue;
    }
    const d = Math.min(r * Math.tan(turn / 2), lu * 0.46, lv * 0.46);
    const p0 = [B[0] + (ux / lu) * d, B[1] + (uy / lu) * d];
    const p2 = [B[0] + (vx / lv) * d, B[1] + (vy / lv) * d];
    const n = Math.max(2, Math.ceil(turn / 0.3));
    for (let k = 0; k <= n; k++) {
      const t = k / n,
        a = (1 - t) * (1 - t),
        b = 2 * t * (1 - t),
        c = t * t;
      out.push([
        a * p0[0] + b * B[0] + c * p2[0],
        a * p0[1] + b * B[1] + c * p2[1],
      ]);
    }
  }
  const last = points[points.length - 1];
  out.push([last[0], last[1]]);
  return out;
}

// ---------------------------------------------------------------- the body
// Row indices of one half section, from the sill up and over to the centre line.
const R_SILL = 0,
  R_BELT = 4,
  R_WINB = 5,
  R_WINT = 6, // top of the side glass = start of the roof edge
  R_EDGE = 10, // end of the roof edge = start of the top surface
  TOP = 5, // rows from the roof edge to the centre line
  H = R_EDGE + TOP + 1;
const F = 2 * H - 1;
const POW = 2.6;

// spec: outline [[x, y, r?]…] from the rear bottom over the top to the front bottom (x forward),
// width, sill, belt, tumble, shoulder, edge [low, high, ends], bow, taper, tuck, arches [{x, r}],
// wheelR, windows [[x0, x1]…], screens [{end, y0, y1}], cabin [x0, x1], roof (second colour).
// Returns geometry buffers per colour key plus helpers to hang parts on the skin.
function loft(spec) {
  const W = spec.width / 2;
  const sill = spec.sill ?? 0.24;
  const belt = spec.belt ?? 99;
  const tumble = spec.tumble ?? 0.26;
  const shoulder = spec.shoulder ?? 0.022;
  const [eLow, eHigh, eEnd] = spec.edge || [0.05, 0.1, 0.17];
  const bowMax = spec.bow ?? 0.12;
  const taper = spec.taper ?? 0.05;
  const tuck = spec.tuck ?? 0.05;
  const lean = spec.lean ?? 0.016;
  const arches = spec.arches || [];
  const wheelR = spec.wheelR ?? 0.31;

  // ---- stations along the silhouette
  let line = fillet(spec.outline, spec.corner ?? 0.09);
  const need = [];
  for (const a of arches)
    for (let k = 0; k <= 14; k++)
      need.push(a.x + a.r * Math.cos((Math.PI * k) / 14) * 0.999);
  for (const w of spec.windows || []) need.push(w[0], w[1]);
  if (spec.cabin) need.push(spec.cabin[0], spec.cabin[1]);
  const dense = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [x0, y0] = line[i],
      [x1, y1] = line[i + 1];
    const ts = [0];
    if (x1 - x0 > 0.01)
      for (const x of need)
        if (x > x0 + 0.004 && x < x1 - 0.004) ts.push((x - x0) / (x1 - x0));
    ts.sort((a, b) => a - b);
    ts.push(1);
    for (let k = 0; k < ts.length - 1; k++) {
      // split what is left so no span is longer than 16 cm
      const a = ts[k],
        b = ts[k + 1];
      const len = Math.hypot(x1 - x0, y1 - y0) * (b - a);
      const n = Math.max(1, Math.ceil(len / 0.16));
      for (let m = 0; m < n; m++) {
        const t = a + ((b - a) * m) / n;
        dense.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
    }
  }
  dense.push(line[line.length - 1]);
  line = dense;
  const S = line.length;
  const xRear = line[0][0],
    xFront = line[S - 1][0];
  const xMid = (xRear + xFront) / 2,
    halfLen = (xFront - xRear) / 2;

  const sillAt = (x) => {
    let y = sill;
    for (const a of arches) {
      const d = x - a.x;
      if (Math.abs(d) < a.r)
        y = Math.max(y, wheelR + Math.sqrt(a.r * a.r - d * d));
    }
    return y;
  };
  // the flank: widest at the waist, tucked under at the sill, leaning in toward the belt
  const waist = sill + 0.45 * (Math.min(belt, 1.4) - sill);
  const flank = (x, y) =>
    W -
    taper * Math.pow(Math.abs((x - xMid) / halfLen), 3) -
    tuck * (1 - smooth(sill - 0.02, sill + 0.34, y)) -
    lean * smooth(waist, Math.min(belt, 1.4), y);

  // ---- sections
  const st = [];
  for (let i = 0; i < S; i++) {
    const p = line[i];
    const a = line[Math.max(0, i - 1)],
      b = line[Math.min(S - 1, i + 1)];
    let tx = b[0] - a[0],
      ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty,
      ny = tx; // outward
    const bow = bowMax * Math.abs(nx);
    const g0 = smooth(belt, belt + 0.16, p[1]);
    let r = eLow + (eHigh - eLow) * g0;
    r += (eEnd - r) * nx * nx; // the corners of nose and tail are much rounder in plan
    const Cx = p[0] - nx * (r + bow),
      Cy = p[1] - ny * (r + bow);
    const g = smooth(belt + 0.02, belt + 0.14, Cy);
    const yb = Math.min(belt, Cy);
    const wB = flank(Cx, yb);
    const wT = wB - g * (shoulder + tumble * Math.max(0, Cy - belt));
    const half = (s) => {
      const rows = [];
      const push = (x, y, z, n) =>
        rows.push({ p: [x, y, s * z], n: [n[0], n[1], s * n[2]] });
      const y0 = Math.min(sillAt(Cx), yb);
      for (const f of [0, 0.2, 0.5, 0.82, 1]) {
        const y = y0 + (yb - y0) * f;
        const z = flank(Cx, y);
        const dz = (flank(Cx, y + 0.01) - flank(Cx, y - 0.01)) / 0.02;
        const l = Math.hypot(1, dz);
        push(Cx, y, z, [0, -dz / l, 1 / l]);
      }
      const y2 = Math.min(Cy, belt + 0.04 * g),
        z2 = wB - shoulder * g;
      // the pane leans in: its normal comes from the two rows that bound it
      const gy = -(wT - z2),
        gz = Cy - y2;
      const gl = Math.hypot(gy, gz);
      const gn = gl > 1e-4 ? [0, gy / gl, gz / gl] : [0, 0, 1];
      push(Cx, y2, z2, gn);
      push(Cx, Cy, wT, gn);
      for (const deg of [22.5, 45, 67.5, 90]) {
        const a2 = (deg * Math.PI) / 180,
          sn = Math.sin(a2),
          cs = Math.cos(a2);
        push(Cx + nx * r * sn, Cy + ny * r * sn, wT - r + r * cs, [
          nx * sn,
          ny * sn,
          cs,
        ]);
      }
      const span = Math.max(0.02, wT - r);
      const crown = (spec.crown ?? 0.025) * Math.max(0, ny);
      for (let k = 1; k <= TOP; k++) {
        const fz = 1 - k / TOP;
        // measured from the bowed edge, so the offset is zero where the top meets the roof edge
        const off = bow * (1 - Math.pow(fz, POW)) + crown * (1 - fz * fz);
        const slope =
          (bow * POW * Math.pow(fz, POW - 1) + crown * 2 * fz) / span;
        const nl = Math.hypot(1, slope);
        push(
          p[0] - nx * bow + nx * off,
          p[1] - ny * bow + ny * off,
          span * fz,
          [nx / nl, ny / nl, slope / nl],
        );
      }
      return rows;
    };
    const left = half(1),
      right = half(-1);
    st.push({
      x: p[0],
      y: p[1],
      nx,
      ny,
      Cx,
      Cy,
      g,
      wT,
      r,
      rows: left.concat(right.slice(0, -1).reverse()),
    });
  }

  // ---- faces
  const bufs = {
    paint: new Buf(),
    roof: new Buf(),
    glass: new Buf(),
    trim: new Buf(),
    liner: new Buf(),
  };
  const inRange = (x, list) => (list || []).some((w) => x > w[0] && x < w[1]);
  const classify = (i, h) => {
    // h: row index counted from the nearer sill (0 … H-2)
    const a = st[i],
      b = st[i + 1];
    const x = (a.Cx + b.Cx) / 2,
      y = (a.y + b.y) / 2,
      nx = (a.nx + b.nx) / 2,
      ny = (a.ny + b.ny) / 2;
    if (h === R_WINB) {
      const tall = Math.min(a.Cy, b.Cy) - belt > 0.12;
      return tall && inRange(x, spec.windows) ? "glass" : "paint";
    }
    if (h >= R_EDGE)
      for (const sc of spec.screens || [])
        if (nx * sc.end > (sc.lean ?? 0.3) && y > sc.y0 && y < sc.y1)
          return "glass";
    if (spec.roof && h >= R_WINT && ny > 0.9 && y > belt + 0.2) return "roof";
    return "paint";
  };
  const cabin = spec.cabin;
  for (let i = 0; i < S - 1; i++) {
    const inCabin =
      cabin &&
      st[i].Cx >= cabin[0] - 1e-3 &&
      st[i + 1].Cx <= cabin[1] + 1e-3 &&
      st[i].ny > 0.2 &&
      st[i + 1].ny > 0.2;
    for (let j = 0; j < F - 1; j++) {
      const h = j < H - 1 ? j : F - 2 - j;
      const A = st[i].rows[j],
        Bq = st[i + 1].rows[j],
        C = st[i + 1].rows[j + 1],
        D = st[i].rows[j + 1];
      // skip collapsed quads (bonnet and boot have no glasshouse rows)
      const d1 = Math.hypot(A.p[0] - C.p[0], A.p[1] - C.p[1], A.p[2] - C.p[2]);
      const d2 = Math.hypot(
        Bq.p[0] - D.p[0],
        Bq.p[1] - D.p[1],
        Bq.p[2] - D.p[2],
      );
      if (d1 < 1e-4 || d2 < 1e-4) continue;
      const key = classify(i, h);
      const buf = bufs[key];
      const ia = buf.vert(A.p, A.n),
        ib = buf.vert(Bq.p, Bq.n),
        ic = buf.vert(C.p, C.n),
        id = buf.vert(D.p, D.n);
      buf.tri(ia, ib, ic);
      buf.tri(ia, ic, id);
      // the inside of the shell, seen through the glass
      if (inCabin && key !== "glass" && h >= 2) {
        const L = bufs.liner;
        const neg = (n) => [-n[0], -n[1], -n[2]];
        const la = L.vert(A.p, neg(A.n)),
          lb = L.vert(Bq.p, neg(Bq.n)),
          lc = L.vert(C.p, neg(C.n)),
          ld = L.vert(D.p, neg(D.n));
        L.tri(la, lc, lb);
        L.tri(la, ld, lc);
      }
    }
  }

  // ---- wheel housings and floor
  const depth = spec.well ?? 0.28;
  for (const a of arches)
    for (const s of [1, -1]) {
      const j = s > 0 ? 0 : F - 1;
      for (let i = 0; i < S - 1; i++) {
        const p = st[i].rows[j].p,
          q = st[i + 1].rows[j].p;
        if (
          st[i].ny < 0.5 ||
          Math.min(p[0], q[0]) < a.x - a.r - 0.01 ||
          Math.max(p[0], q[0]) > a.x + a.r + 0.01
        )
          continue;
        const pi = [p[0], p[1], p[2] - s * depth],
          qi = [q[0], q[1], q[2] - s * depth];
        if (s > 0) bufs.trim.quad(q, p, pi, qi);
        else bufs.trim.quad(p, q, qi, pi);
      }
      const z = s * (W - depth);
      const x0 = a.x - a.r,
        x1 = a.x + a.r,
        y1 = wheelR + a.r;
      if (s > 0)
        bufs.trim.quad([x0, 0.12, z], [x1, 0.12, z], [x1, y1, z], [x0, y1, z]);
      else
        bufs.trim.quad([x1, 0.12, z], [x0, 0.12, z], [x0, y1, z], [x1, y1, z]);
    }
  const xr = xRear + 0.14,
    xf = xFront - 0.14,
    wf = W - tuck - 0.02;
  bufs.trim.quad(
    [xr, sill + 0.01, -wf],
    [xf, sill + 0.01, -wf],
    [xf, sill + 0.01, wf],
    [xr, sill + 0.01, wf],
  );
  if (cabin)
    bufs.liner.quad(
      [cabin[0], sill + 0.1, wf],
      [cabin[1], sill + 0.1, wf],
      [cabin[1], sill + 0.1, -wf],
      [cabin[0], sill + 0.1, -wf],
    );

  // ---- sampling the skin, for parts that have to follow it
  const mix = (ra, rb, t) => ({
    p: [0, 1, 2].map((k) => ra.p[k] + (rb.p[k] - ra.p[k]) * t),
    n: [0, 1, 2].map((k) => ra.n[k] + (rb.n[k] - ra.n[k]) * t),
  });
  // the section at x on the upper part of the body
  const sectionAtX = (x) => {
    for (let i = 0; i < S - 1; i++) {
      const a = st[i],
        b = st[i + 1];
      if (
        a.ny < 0.3 ||
        b.ny < 0.3 ||
        x < a.Cx - 1e-6 ||
        x > b.Cx + 1e-6 ||
        b.Cx - a.Cx < 1e-5
      )
        continue;
      const t = (x - a.Cx) / (b.Cx - a.Cx);
      return a.rows.map((ra, j) => mix(ra, b.rows[j], t));
    }
    return null;
  };
  // the section at height y on the nose (end = 1) or tail (end = -1)
  const sectionAtY = (end, y) => {
    let best = null,
      bx = -1e9;
    for (let i = 0; i < S - 1; i++) {
      const a = st[i],
        b = st[i + 1];
      if ((a.nx + b.nx) * end < 0.9) continue;
      const lo = Math.min(a.y, b.y),
        hi = Math.max(a.y, b.y);
      if (y < lo - 1e-5 || y > hi + 1e-5 || hi - lo < 1e-6) continue;
      const t = (y - a.y) / (b.y - a.y);
      const x = (a.x + (b.x - a.x) * t) * end;
      if (x > bx) {
        bx = x;
        best = a.rows.map((ra, j) => mix(ra, b.rows[j], t));
      }
    }
    return best;
  };
  // on a section, the point of the roof edge / top surface at lateral position z
  const acrossAt = (rows, z) => {
    for (let j = R_WINT; j < F - 1 - R_WINT; j++) {
      const a = rows[j],
        b = rows[j + 1];
      if ((a.p[2] - z) * (b.p[2] - z) <= 0 && Math.abs(a.p[2] - b.p[2]) > 1e-6)
        return mix(a, b, (z - a.p[2]) / (b.p[2] - a.p[2]));
    }
    return z > 0 ? rows[R_WINT] : rows[F - 1 - R_WINT];
  };
  // on a section, the point of the flank on side s at height y
  const flankAt = (rows, s, y) => {
    const at = (j) => rows[s > 0 ? j : F - 1 - j];
    for (let j = 0; j < R_WINT; j++) {
      const a = at(j),
        b = at(j + 1);
      if ((a.p[1] - y) * (b.p[1] - y) <= 0 && Math.abs(a.p[1] - b.p[1]) > 1e-6)
        return mix(a, b, (y - a.p[1]) / (b.p[1] - a.p[1]));
    }
    return y < at(0).p[1] ? at(0) : at(R_WINT);
  };
  // lays a grid of sampled points into a buffer, standing `lift` off the skin
  const lay = (buf, pts, lift, uv) => {
    const nu = pts.length - 1,
      nv = pts[0].length - 1;
    const idx = pts.map((row, iu) =>
      row.map((q, iv) => {
        const k = buf.vert(
          [
            q.p[0] + q.n[0] * lift,
            q.p[1] + q.n[1] * lift,
            q.p[2] + q.n[2] * lift,
          ],
          q.n,
        );
        if (uv)
          buf.uv.push(
            uv[0] + ((uv[2] - uv[0]) * iu) / nu,
            uv[1] + ((uv[3] - uv[1]) * iv) / nv,
          );
        return k;
      }),
    );
    for (let iu = 0; iu < nu; iu++)
      for (let iv = 0; iv < nv; iv++) {
        const a = pts[iu][iv],
          b = pts[iu + 1][iv],
          d = pts[iu][iv + 1];
        const ux = b.p[0] - a.p[0],
          uy = b.p[1] - a.p[1],
          uz = b.p[2] - a.p[2],
          vx = d.p[0] - a.p[0],
          vy = d.p[1] - a.p[1],
          vz = d.p[2] - a.p[2];
        const facing =
          (uy * vz - uz * vy) * a.n[0] +
          (uz * vx - ux * vz) * a.n[1] +
          (ux * vy - uy * vx) * a.n[2];
        const i0 = idx[iu][iv],
          i1 = idx[iu + 1][iv],
          i2 = idx[iu + 1][iv + 1],
          i3 = idx[iu][iv + 1];
        if (facing >= 0) buf.i.push(i0, i1, i2, i0, i2, i3);
        else buf.i.push(i0, i2, i1, i0, i3, i2);
      }
  };
  // a patch on the nose or tail between two heights and two lateral positions (wraps the corners)
  const endPatch = (buf, end, y0, y1, z0, z1, lift = 0.004, o = {}) => {
    const nz = o.nz ?? Math.max(2, Math.ceil(Math.abs(z1 - z0) / 0.07)),
      ny = o.ny ?? 2;
    const pts = [];
    for (let iu = 0; iu <= nz; iu++) {
      const z = z0 + ((z1 - z0) * iu) / nz;
      const col = [];
      for (let iv = 0; iv <= ny; iv++) {
        const sec = sectionAtY(end, y0 + ((y1 - y0) * iv) / ny);
        if (!sec) return;
        col.push(acrossAt(sec, z));
      }
      pts.push(col);
    }
    lay(buf, pts, lift, o.uv);
  };
  // a patch on a flank between two stations and two heights
  const sidePatch = (buf, s, x0, x1, y0, y1, lift = 0.004, o = {}) => {
    const nx = o.nx ?? Math.max(1, Math.ceil(Math.abs(x1 - x0) / 0.2)),
      ny = o.ny ?? 1;
    const pts = [];
    for (let iu = 0; iu <= nx; iu++) {
      const sec = sectionAtX(x0 + ((x1 - x0) * iu) / nx);
      if (!sec) return;
      const col = [];
      for (let iv = 0; iv <= ny; iv++)
        col.push(flankAt(sec, s, y0 + ((y1 - y0) * iv) / ny));
      pts.push(col);
    }
    lay(buf, pts, lift, o.uv);
  };
  // a thin line across the skin at x from the sill up to row j1: a shut line
  const seam = (buf, x, s, j1 = R_WINT, w = 0.005) => {
    const a = sectionAtX(x - w),
      b = sectionAtX(x + w);
    if (!a || !b) return;
    const at = (rows, j) => rows[s > 0 ? j : F - 1 - j];
    const pts = [[], []];
    for (let j = 0; j <= j1; j++) {
      pts[0].push(at(a, j));
      pts[1].push(at(b, j));
    }
    lay(buf, pts, 0.002);
  };
  // where the nose or tail is at height y and lateral offset z
  const faceX = (end, y, z = 0) => {
    const sec = sectionAtY(end, y);
    return sec ? acrossAt(sec, z).p[0] : end > 0 ? xFront : xRear;
  };
  const upper = st.filter((s) => s.ny > 0.5);
  // height of the top line at x (roof, bonnet, boot)
  const topY = (x) => {
    for (let i = 0; i < upper.length - 1; i++) {
      const a = upper[i],
        b = upper[i + 1];
      if (x >= a.x && x <= b.x && b.x - a.x > 1e-5)
        return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
    return upper.length ? upper[upper.length >> 1].y : 1;
  };
  return {
    bufs,
    st,
    W,
    belt,
    sill,
    flank,
    seam,
    endPatch,
    sidePatch,
    faceX,
    topY,
    sectionAtX,
    xRear,
    xFront,
  };
}

// ---------------------------------------------------------------- models
// Side silhouettes run from the rear bumper over the roof to the front bumper; x = 0 is mid-wheelbase.
const MODELS = {
  // three-box saloon, the shape of every taxi in town
  saloon: {
    width: 1.72,
    belt: 0.97,
    wheelR: 0.315,
    arches: [
      { x: -1.38, r: 0.39 },
      { x: 1.36, r: 0.39 },
    ],
    outline: [
      [-2.3, 0.25, 0],
      [-2.37, 0.31, 0.04],
      [-2.38, 0.55, 0.06],
      [-2.31, 0.61, 0.04],
      [-2.3, 0.94, 0.11],
      [-1.5, 1.0, 0.18],
      [-0.98, 1.43, 0.24],
      [0.22, 1.47, 0.32],
      [0.98, 1.0, 0.16],
      [2.2, 0.9, 0.12],
      [2.31, 0.63, 0.05],
      [2.39, 0.57, 0.05],
      [2.38, 0.31, 0.04],
      [2.31, 0.25, 0],
    ],
    windows: [
      [-0.92, -0.33],
      [-0.25, 0.84],
    ],
    screens: [
      { end: 1, y0: 1.06, y1: 1.42 },
      { end: -1, y0: 1.07, y1: 1.4 },
    ],
    cabin: [-1.44, 0.94],
    seats: { front: 0.08, rear: -0.82, half: 0.37 },
    bumperTop: 0.6,
    seams: [-0.96, -0.29, 0.88],
    handles: [-0.42, 0.74],
    mirrorX: 0.92,
    lampY: 0.75,
    tailY: 0.79,
    wheels: "steel",
  },
  // small five-door
  hatch: {
    width: 1.68,
    belt: 0.96,
    wheelR: 0.305,
    arches: [
      { x: -1.22, r: 0.38 },
      { x: 1.2, r: 0.38 },
    ],
    outline: [
      [-1.88, 0.25, 0],
      [-1.95, 0.31, 0.04],
      [-1.97, 0.57, 0.06],
      [-1.91, 0.63, 0.04],
      [-1.92, 1.02, 0.14],
      [-1.62, 1.42, 0.22],
      [0.1, 1.5, 0.34],
      [0.95, 1.0, 0.16],
      [1.86, 0.88, 0.14],
      [1.97, 0.63, 0.05],
      [2.05, 0.57, 0.05],
      [2.04, 0.31, 0.04],
      [1.97, 0.25, 0],
    ],
    windows: [
      [-1.52, -0.96],
      [-0.86, -0.22],
      [-0.14, 0.82],
    ],
    screens: [
      { end: 1, y0: 1.06, y1: 1.44 },
      { end: -1, y0: 1.08, y1: 1.38, lean: 0.5 },
    ],
    cabin: [-1.84, 0.92],
    seats: { front: 0.06, rear: -0.86, half: 0.36 },
    bumperTop: 0.61,
    seams: [-0.91, -0.18, 0.86],
    handles: [-0.32, 0.72],
    mirrorX: 0.9,
    lampY: 0.745,
    tailY: 0.9,
    wheels: "alloy",
  },
  // forward-control panel van
  van: {
    width: 1.74,
    belt: 1.08,
    wheelR: 0.325,
    tumble: 0.14,
    edge: [0.05, 0.12, 0.16],
    arches: [
      { x: -1.3, r: 0.4 },
      { x: 1.42, r: 0.4 },
    ],
    outline: [
      [-2.28, 0.3, 0],
      [-2.34, 0.36, 0.04],
      [-2.35, 0.6, 0.05],
      [-2.3, 0.65, 0.03],
      [-2.3, 1.84, 0.16],
      [-2.0, 1.94, 0.18],
      [1.1, 1.92, 0.32],
      [1.98, 1.12, 0.18],
      [2.24, 1.0, 0.14],
      [2.33, 0.63, 0.07],
      [2.38, 0.56, 0.05],
      [2.37, 0.36, 0.04],
      [2.31, 0.3, 0],
    ],
    windows: [[1.0, 1.86]],
    screens: [{ end: 1, y0: 1.18, y1: 1.86 }],
    cabin: [0.5, 1.94],
    seats: { front: 1.02, half: 0.4 },
    bumperTop: 0.63,
    seams: [0.92, -0.1, -1.72],
    handles: [0.98, -0.2],
    mirrorX: 1.86,
    lampY: 0.82,
    tailY: 1.0,
    tailTall: true,
    wheels: "steel",
  },
  // sixteen-seat public light bus
  minibus: {
    width: 2.04,
    belt: 1.22,
    wheelR: 0.36,
    tumble: 0.1,
    edge: [0.06, 0.14, 0.2],
    bow: 0.14,
    taper: 0.04,
    arches: [
      { x: -1.95, r: 0.45 },
      { x: 2.0, r: 0.45 },
    ],
    outline: [
      [-3.4, 0.36, 0],
      [-3.46, 0.42, 0.04],
      [-3.47, 0.68, 0.05],
      [-3.42, 0.73, 0.03],
      [-3.42, 2.42, 0.2],
      [-3.1, 2.56, 0.22],
      [2.5, 2.54, 0.36],
      [3.22, 1.3, 0.22],
      [3.4, 1.12, 0.14],
      [3.45, 0.71, 0.07],
      [3.5, 0.64, 0.05],
      [3.49, 0.42, 0.04],
      [3.43, 0.36, 0],
    ],
    windows: [
      [-3.1, -2.26],
      [-2.16, -1.2],
      [-1.1, -0.14],
      [-0.04, 0.92],
      [1.02, 1.6],
      [2.1, 3.0],
    ],
    screens: [
      { end: 1, y0: 1.4, y1: 2.44 },
      { end: -1, y0: 1.36, y1: 2.26, lean: 0.8 },
    ],
    cabin: [-3.3, 3.12],
    seats: { front: 2.3, half: 0.52, rows: [-2.7, -1.9, -1.1, -0.3, 0.5] },
    bumperTop: 0.71,
    seams: [1.66, 2.06],
    handles: [],
    mirrorX: 3.02,
    mirrorY: 1.75,
    lampY: 0.94,
    tailY: 1.1,
    tailTall: true,
    roof: true,
    wheels: "steel",
    hubcap: false,
  },
  // cab of a light lorry (the load bed is built separately)
  cab: {
    width: 1.8,
    belt: 1.3,
    wheelR: 0.36,
    tumble: 0.12,
    edge: [0.05, 0.12, 0.14],
    taper: 0.02,
    arches: [{ x: 0.1, r: 0.45 }],
    outline: [
      [-0.86, 0.5, 0],
      [-0.86, 2.02, 0.1],
      [-0.6, 2.1, 0.14],
      [0.4, 2.08, 0.28],
      [0.94, 1.36, 0.18],
      [1.02, 1.2, 0.12],
      [1.07, 0.73, 0.06],
      [1.12, 0.66, 0.05],
      [1.11, 0.44, 0.04],
      [1.05, 0.38, 0],
    ],
    sill: 0.42,
    windows: [[-0.4, 0.84]],
    screens: [{ end: 1, y0: 1.42, y1: 2.0 }],
    cabin: [-0.8, 0.94],
    seats: { front: 0.0, half: 0.4 },
    bumperTop: 0.73,
    seams: [-0.46, 0.88],
    handles: [-0.34],
    mirrorX: 0.9,
    mirrorY: 1.7,
    lampY: 1.0,
    wheels: "steel",
    hubcap: false,
  },
  // tilt cover over a load bed: the same sweep without glass
  tilt: {
    width: 1.96,
    edge: [0.14, 0.14, 0.14],
    bow: 0.02,
    taper: 0,
    tuck: 0,
    lean: 0,
    corner: 0.12,
    sill: 1.02,
    outline: [
      [-2.3, 1.02, 0],
      [-2.32, 2.38, 0.16],
      [2.3, 2.38, 0.16],
      [2.32, 1.02, 0],
    ],
  },
  // army lorry cab: flat panels, high off the ground
  armycab: {
    width: 2.2,
    belt: 1.76,
    wheelR: 0.52,
    tumble: 0.06,
    edge: [0.04, 0.07, 0.08],
    bow: 0.03,
    taper: 0,
    tuck: 0.02,
    corner: 0.05,
    arches: [{ x: 0.5, r: 0.66 }],
    outline: [
      [-1.0, 0.92, 0],
      [-1.0, 2.62, 0.08],
      [-0.2, 2.66, 0.1],
      [0.42, 1.86, 0.08],
      [1.42, 1.74, 0.1],
      [1.56, 1.02, 0.06],
      [1.62, 0.96, 0.03],
      [1.62, 0.72, 0.03],
      [1.56, 0.66, 0],
    ],
    sill: 0.78,
    windows: [[-0.6, 0.22]],
    screens: [{ end: 1, y0: 1.92, y1: 2.56, lean: 0.3 }],
    cabin: [-0.94, 0.4],
    seats: { front: -0.3, half: 0.5, y: 1.3 },
    bumperTop: 1.0,
    seams: [-0.66, 0.3],
    handles: [-0.56],
    mirrorX: 0.3,
    mirrorY: 2.2,
    lampY: 1.3,
    wheels: "steel",
    hubcap: false,
    plain: true,
  },
  armytilt: {
    width: 2.34,
    edge: [0.2, 0.2, 0.2],
    bow: 0.02,
    taper: 0,
    tuck: 0,
    lean: 0,
    corner: 0.14,
    sill: 1.5,
    outline: [
      [-2.6, 1.5, 0],
      [-2.62, 3.1, 0.2],
      [2.5, 3.1, 0.2],
      [2.52, 1.5, 0],
    ],
  },
  // double-deck bus
  bus: {
    width: 2.5,
    wheelR: 0.5,
    edge: [0.09, 0.09, 0.24],
    bow: 0.12,
    taper: 0.02,
    tuck: 0.03,
    lean: 0,
    corner: 0.14,
    arches: [
      { x: -3.1, r: 0.6 },
      { x: 3.3, r: 0.6 },
    ],
    sill: 0.36,
    outline: [
      [-5.28, 0.36, 0],
      [-5.36, 0.44, 0.05],
      [-5.36, 4.1, 0.28],
      [-5.0, 4.36, 0.32],
      [4.8, 4.36, 0.42],
      [5.3, 3.9, 0.32],
      [5.38, 0.44, 0.05],
      [5.3, 0.36, 0],
    ],
    wheels: "steel",
    hubcap: false,
  },
};

export function createVehicles(ctx) {
  const { kit, G } = ctx;
  const { rnd, pick } = kit;

  // ---------------- materials
  const wetPaint = [0.03, 0.5, 0.55, 0.8];
  const paint = (c) =>
    kit.flat(c, {
      rough: 0.42,
      metal: 0.3,
      coat: true,
      wet: wetPaint,
      macro: [0.02, 0.03, 2, 0.15],
      reflect: true,
      key: "carpaint",
    });
  const matt = (c) =>
    kit.flat(c, {
      rough: 0.82,
      metal: 0,
      wet: [0.2, 0.6, 0.5, 0.4],
      macro: [0.08, 0.06, 1.2, 0.3],
      reflect: true,
      key: "carmatt",
    });
  const cloth = (c) =>
    kit.flat(c, { rough: 0.9, metal: 0, wet: "dry", key: "carseat" });
  const trim = matt(0x0c0c0d);
  const liner = cloth(0x17181a);
  const chrome = kit.flat(0xc4c8cc, {
    rough: 0.2,
    metal: 0.95,
    wet: "glazed",
    reflect: true,
    key: "chrome",
  });
  const lensClear = kit.flat(0xa9b4bc, {
    rough: 0.07,
    metal: 0.75,
    wet: "glazed",
    reflect: true,
    key: "chrome",
  });
  const lensRed = kit.flat(0x5a0a07, {
    rough: 0.1,
    metal: 0.15,
    wet: "glazed",
    key: "lens",
  });
  const lensAmber = kit.flat(0x8a4a08, {
    rough: 0.1,
    metal: 0.15,
    wet: "glazed",
    key: "lens",
  });
  const glassDark = kit.flat(0x06090c, {
    rough: 0.04,
    metal: 0,
    wet: [0, 0.6, 0.6, 0.9],
    macro: [0, 0, 1, 0.1],
    reflect: true,
    key: "carglass",
  });
  // tinted glass you can see the cabin through
  const glass = new THREE.MeshStandardMaterial({
    color: 0x141c20,
    transparent: true,
    opacity: 0.5,
    roughness: 0.03,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  glass.name = "ct_carglass";
  glass.envMapIntensity = 1.8;
  G.mats.adopt(glass, { wet: [0, 1, 0, 0] });
  glass.userData.oneCell = true;
  glass.userData.noReflect = true;
  const tyre = kit.game("tire");
  const glowHead = kit.glow(0xfff0d4, 3.2);
  const glowTail = kit.glow(0xff1a0a, 3.2);
  const glowCabin = kit.glow(0xffd9a0, 1.2);
  const hazard = kit.glow(0xff8a10, 5); // every hazard lamp shares this and blinks together
  const dishDark = matt(0x18191b);
  const dishSteel = kit.flat(0x7d8185, {
    rough: 0.42,
    metal: 0.85,
    wet: "glazed",
    reflect: true,
    key: "chrome",
  });

  // ---------------- lettering: plates, roof signs, liveries
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 512;
  const c2 = cv.getContext("2d");
  c2.fillStyle = "#000";
  c2.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, kit.aniso);
  const plateMat = kit.painted(tex, { rough: 0.4, wet: "glazed" });
  plateMat.userData.oneCell = true;
  plateMat.userData.noReflect = true;
  const signMat = kit.glowMap(tex, 2.2);
  signMat.userData.oneCell = true;
  let ax = 4,
    ay = 4,
    arow = 0;
  const cell = (w, h, draw) => {
    if (ax + w + 4 > 1024) {
      ax = 4;
      ay += arow + 6;
      arow = 0;
    }
    const x = ax,
      y = ay;
    ax += w + 6;
    arow = Math.max(arow, h);
    c2.save();
    c2.beginPath();
    c2.rect(x, y, w, h);
    c2.clip();
    c2.translate(x, y);
    draw(c2, w, h);
    c2.restore();
    return [
      (x + 0.5) / 1024,
      1 - (y + h - 0.5) / 512,
      (x + w - 0.5) / 1024,
      1 - (y + 0.5) / 512,
    ];
  };
  const text = (c, t, x, y, size, font, color, weight = 900) => {
    c.font = `${weight} ${size}px ${font}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = color;
    c.fillText(t, x, y);
  };
  const LETTERS = [..."ABCDEFGHJKLMNPRSTUVWXYZ"];
  const plateUV = (rear) =>
    cell(208, 48, (c, w, h) => {
      c.fillStyle = rear ? "#d8b21c" : "#d9d9d2";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#111";
      c.lineWidth = 3;
      c.strokeRect(2, 2, w - 4, h - 4);
      const id =
        pick(LETTERS) + pick(LETTERS) + " " + Math.floor(rnd(100, 9999));
      text(c, id, w / 2, h / 2 + 2, 38, LATIN, "#101010", 700);
      c.fillStyle = "rgba(60,45,20,0.25)";
      for (let i = 0; i < 14; i++)
        c.fillRect(rnd(0, w), rnd(0, h), rnd(4, 26), 2);
    });
  const plates = {
    front: [0, 1, 2, 3, 4].map(() => plateUV(false)),
    rear: [0, 1, 2, 3, 4].map(() => plateUV(true)),
  };
  const uvTaxi = cell(200, 64, (c, w, h) => {
    c.fillStyle = "#f4ead0";
    c.fillRect(0, 0, w, h);
    text(c, "的士", w * 0.3, h / 2 + 2, 44, SERIF, "#b01212");
    text(c, "TAXI", w * 0.72, h / 2 + 3, 40, LATIN, "#b01212", 800);
  });
  const uvRoute = cell(256, 64, (c, w, h) => {
    c.fillStyle = "#101010";
    c.fillRect(0, 0, w, h);
    text(c, "金龍街", w * 0.34, h / 2 + 2, 42, SERIF, "#ffd23a");
    text(c, "GOLDEN DRAGON ST", w * 0.74, h / 2 + 2, 19, LATIN, "#ffd23a", 700);
  });
  const uvBus = cell(360, 72, (c, w, h) => {
    c.fillStyle = "#0a0a0a";
    c.fillRect(0, 0, w, h);
    text(c, "暫停服務", w * 0.3, h / 2 + 2, 46, SERIF, "#ff9a1a");
    text(c, "NOT IN SERVICE", w * 0.72, h / 2 + 3, 30, LATIN, "#ff9a1a", 700);
  });
  const uvHaul = cell(300, 96, (c, w, h) => {
    c.fillStyle = "#d9d6cc";
    c.fillRect(0, 0, w, h);
    text(c, "和興運輸", w / 2, h * 0.36, 44, SERIF, "#1c3f7a");
    text(c, "WO HING TRANSPORT", w / 2, h * 0.78, 22, LATIN, "#1c3f7a", 700);
  });
  tex.needsUpdate = true;

  // ---------------- wheels (built once per size)
  const wheelCache = new Map();
  function wheelGeo(R, tw, style, cap) {
    const key = [R, tw, style, cap].join("|");
    let w = wheelCache.get(key);
    if (w) return w;
    const V = (x, y) => new THREE.Vector2(x, y);
    const tyreG = new THREE.LatheGeometry(
      [
        V(R * 0.6, -tw / 2),
        V(R * 0.86, -tw / 2),
        V(R * 0.955, -tw / 2 + 0.012),
        V(R * 0.992, -tw / 2 + 0.045),
        V(R, -tw / 5),
        V(R, tw / 5),
        V(R * 0.992, tw / 2 - 0.045),
        V(R * 0.955, tw / 2 - 0.012),
        V(R * 0.86, tw / 2),
        V(R * 0.6, tw / 2),
      ],
      28,
    );
    tyreG.rotateX(Math.PI / 2);
    const f = tw / 2 - 0.03; // face of the wheel, set back from the tyre wall
    const rr = R * 0.63;
    const dish = new THREE.LatheGeometry(
      [
        V(0.001, f - 0.035),
        V(rr * 0.5, f - 0.05),
        V(rr * 0.88, f - 0.03),
        V(rr * 0.97, f + 0.004),
        V(rr * 1.03, f + 0.012),
        V(rr * 1.06, f + 0.004),
        V(rr * 1.06, f - 0.1),
      ],
      28,
    );
    dish.rotateX(Math.PI / 2);
    const hubR = cap === false ? rr * 0.36 : rr * 0.3;
    const hub = new THREE.LatheGeometry(
      [
        V(0.001, f + 0.012),
        V(hubR * 0.7, f + 0.008),
        V(hubR, f - 0.012),
        V(hubR * 1.1, f - 0.04),
      ],
      16,
    );
    hub.rotateX(Math.PI / 2);
    const parts = [hub];
    if (style === "alloy")
      for (let k = 0; k < 5; k++)
        for (const off of [-0.11, 0.11]) {
          const sp = new THREE.BoxGeometry(rr * 0.9, rr * 0.085, 0.02);
          sp.translate(rr * 0.5, 0, f - 0.02);
          sp.rotateZ((k * Math.PI * 2) / 5 + 0.3 + off);
          parts.push(sp);
        }
    else if (cap === false)
      for (let k = 0; k < 6; k++) {
        const nut = new THREE.CylinderGeometry(0.017, 0.017, 0.03, 6);
        nut.rotateX(Math.PI / 2);
        nut.translate(
          Math.cos(k * 1.047) * hubR * 0.72,
          Math.sin(k * 1.047) * hubR * 0.72,
          f + 0.002,
        );
        parts.push(nut);
      }
    w = { tyre: tyreG, dish, parts };
    wheelCache.set(key, w);
    return w;
  }
  function wheel(M, x, z, R, tw, side, o = {}) {
    const g = wheelGeo(R, tw, o.style || "steel", o.cap);
    const m = M.clone().multiply(
      kit.xform(
        x,
        R - (o.flat ? 0.045 : 0),
        z,
        0,
        (side > 0 ? 0 : Math.PI) + (o.steer || 0),
        0,
      ),
    );
    kit.add(tyre, g.tyre, m);
    kit.add(o.style === "alloy" ? dishDark : dishSteel, g.dish, m);
    for (const p of g.parts) kit.add(chrome, p, m);
  }

  // ---------------- bodies: each shape is swept once and re-used
  const shells = new Map();
  function shell(name) {
    let sh = shells.get(name);
    if (sh) return sh;
    const m = MODELS[name];
    const b = loft(m);
    const d = {
      trim: new Buf(),
      chrome: new Buf(),
      seat: new Buf(),
      head: new Buf(), // lamp groups switch material with the state of the vehicle
      indF: new Buf(),
      tail: new Buf(),
      indR: new Buf(),
      plateF: new Buf(),
      plateR: new Buf(),
    };
    const W = b.W;
    const edge = W - (m.taper ?? 0.05) - 0.03; // how far out a part can sit on the nose or tail
    if (m.lampY) {
      const y = m.lampY,
        lh = m.plain ? 0.1 : 0.075,
        zi = W * 0.36;
      for (const s of [1, -1]) {
        b.endPatch(
          d.trim,
          1,
          y - lh - 0.014,
          y + lh + 0.014,
          s * (zi - 0.012),
          s * edge,
          0.003,
        );
        b.endPatch(
          d.head,
          1,
          y - lh,
          y + lh,
          s * (zi + 0.01),
          s * (edge - 0.15),
          0.008,
        );
        b.endPatch(
          d.indF,
          1,
          y - lh,
          y + lh,
          s * (edge - 0.135),
          s * (edge - 0.012),
          0.008,
        );
      }
      // grille between the lamps, three bright bars across it
      b.endPatch(
        d.trim,
        1,
        y - lh - 0.014,
        y + lh - 0.006,
        -zi + 0.012,
        zi - 0.012,
        0.003,
      );
      if (!m.plain) {
        b.endPatch(
          d.chrome,
          1,
          y + lh - 0.006,
          y + lh + 0.014,
          -zi + 0.012,
          zi - 0.012,
          0.006,
        );
        for (let k = 0; k < 3; k++)
          b.endPatch(
            d.chrome,
            1,
            y - lh + 0.004 + k * 0.042,
            y - lh + 0.014 + k * 0.042,
            -zi + 0.04,
            zi - 0.04,
            0.007,
            { ny: 1 },
          );
      }
    }
    if (m.bumperTop) {
      const bt = m.bumperTop;
      for (const end of [1, -1]) {
        // rubbing strip round the bumper, dark valance under it
        b.endPatch(d.trim, end, bt - 0.16, bt - 0.105, -edge, edge, 0.005, {
          ny: 1,
        });
        b.endPatch(
          d.trim,
          end,
          b.sill + 0.02,
          b.sill + 0.1,
          -edge + 0.06,
          edge - 0.06,
          0.003,
          { ny: 1 },
        );
      }
      b.endPatch(d.trim, 1, bt - 0.29, bt - 0.2, -W * 0.5, W * 0.5, 0.004, {
        ny: 1,
      }); // air intake
      const py = bt - 0.3;
      b.endPatch(d.plateF, 1, py, py + 0.105, 0.23, -0.23, 0.014, {
        nz: 2,
        ny: 1,
        uv: [0, 0, 1, 1],
      });
      const ry = m.tailTall ? bt - 0.3 : (m.tailY || 0.7) - 0.2;
      b.endPatch(d.plateR, -1, ry, ry + 0.105, -0.23, 0.23, 0.014, {
        nz: 2,
        ny: 1,
        uv: [0, 0, 1, 1],
      });
      if (!m.tailTall)
        b.endPatch(d.chrome, -1, ry + 0.125, ry + 0.14, -0.3, 0.3, 0.008, {
          ny: 1,
        });
    }
    if (m.tailY) {
      const y = m.tailY;
      for (const s of [1, -1]) {
        if (m.tailTall) {
          b.endPatch(
            d.tail,
            -1,
            y - 0.2,
            y + 0.16,
            s * (edge - 0.13),
            s * (edge - 0.01),
            0.008,
          );
          b.endPatch(
            d.indR,
            -1,
            y + 0.17,
            y + 0.3,
            s * (edge - 0.13),
            s * (edge - 0.01),
            0.008,
            { ny: 1 },
          );
        } else {
          b.endPatch(
            d.trim,
            -1,
            y - 0.085,
            y + 0.085,
            s * (W * 0.34),
            s * edge,
            0.003,
          );
          b.endPatch(
            d.tail,
            -1,
            y - 0.07,
            y + 0.07,
            s * (W * 0.5),
            s * (edge - 0.012),
            0.008,
          );
          b.endPatch(
            d.indR,
            -1,
            y - 0.07,
            y + 0.07,
            s * (W * 0.36),
            s * (W * 0.49),
            0.008,
          );
        }
      }
    }
    for (const s of [1, -1]) {
      for (const x of m.seams || [])
        b.seam(d.trim, x, s, m.belt ? R_WINT : R_BELT);
      if (m.arches && m.arches.length === 2 && !m.plain) {
        // rubbing strip along the doors
        const x0 = m.arches[0].x + m.arches[0].r + 0.04,
          x1 = m.arches[1].x - m.arches[1].r - 0.04;
        b.sidePatch(d.trim, s, x0, x1, b.sill + 0.26, b.sill + 0.3, 0.006);
      }
      if (m.cabin && m.windows && !m.plain) {
        // bright strip under the side glass
        const w0 = Math.min(...m.windows.map((w) => w[0])),
          w1 = Math.max(...m.windows.map((w) => w[1]));
        b.sidePatch(
          d.chrome,
          s,
          w0 - 0.02,
          w1 + 0.02,
          m.belt + 0.022,
          m.belt + 0.04,
          0.005,
        );
      }
      for (const hx of m.handles || [])
        b.sidePatch(
          m.plain ? d.trim : d.chrome,
          s,
          hx - 0.075,
          hx + 0.075,
          m.belt - 0.125,
          m.belt - 0.095,
          0.016,
          { nx: 1 },
        );
      if (m.mirrorX !== undefined) {
        const y = m.mirrorY ?? m.belt + 0.11;
        const big = !!m.mirrorY;
        const z0 = s * (W - 0.03),
          zc = s * (W + (big ? 0.26 : 0.15));
        d.trim.box(
          m.mirrorX - 0.015,
          y - 0.014,
          Math.min(z0, zc),
          m.mirrorX + 0.015,
          y + 0.014,
          Math.max(z0, zc),
        );
        const mh = big ? 0.17 : 0.065,
          mw = big ? 0.07 : 0.085;
        d.trim.box(
          m.mirrorX - 0.04,
          y - mh,
          zc - mw,
          m.mirrorX + 0.04,
          y + mh,
          zc + mw,
        );
        d.chrome.box(
          m.mirrorX - 0.046,
          y - mh + 0.014,
          zc - mw + 0.012,
          m.mirrorX - 0.04,
          y + mh - 0.014,
          zc + mw - 0.012,
        );
      }
    }
    // wipers parked on the screen
    const sc = (m.screens || []).find((q) => q.end > 0);
    if (sc && !m.plain)
      for (const z0 of [W * 0.5, -W * 0.08]) {
        const pts = [[], []];
        for (let k = 0; k <= 4; k++) {
          const z = z0 - k * 0.13,
            y = sc.y0 + 0.012 + k * 0.012;
          const sec = [b.faceX(1, y, z), b.faceX(1, y + 0.02, z)];
          pts[0].push({ p: [sec[0], y, z], n: [0.6, 0.8, 0] });
          pts[1].push({ p: [sec[1], y + 0.02, z], n: [0.6, 0.8, 0] });
        }
        for (let k = 0; k < 4; k++)
          d.trim.quad(
            pts[0][k].p.map((v, q) => v + [0.012, 0.01, 0][q]),
            pts[0][k + 1].p.map((v, q) => v + [0.012, 0.01, 0][q]),
            pts[1][k + 1].p.map((v, q) => v + [0.012, 0.01, 0][q]),
            pts[1][k].p.map((v, q) => v + [0.012, 0.01, 0][q]),
          );
      }
    // the cabin: seats, dashboard, wheel
    let steering = null;
    if (m.seats && m.cabin) {
      const q = m.seats,
        fy = q.y ?? b.sill + 0.16;
      const seat = (x, z, w) => {
        d.seat.box(x - 0.24, fy, z - w, x + 0.26, fy + 0.13, z + w);
        d.seat.box(
          x - 0.34,
          fy + 0.1,
          z - w + 0.01,
          x - 0.22,
          fy + 0.66,
          z + w - 0.01,
        );
        d.seat.box(
          x - 0.335,
          fy + 0.69,
          z - 0.11,
          x - 0.25,
          fy + 0.87,
          z + 0.11,
        );
      };
      seat(q.front, q.half, 0.23);
      seat(q.front, -q.half, 0.23);
      if (q.rear !== undefined) {
        d.seat.box(
          q.rear - 0.26,
          fy,
          -q.half - 0.25,
          q.rear + 0.24,
          fy + 0.13,
          q.half + 0.25,
        );
        d.seat.box(
          q.rear - 0.38,
          fy + 0.1,
          -q.half - 0.25,
          q.rear - 0.26,
          fy + 0.62,
          q.half + 0.25,
        );
        for (const z of [q.half, -q.half])
          d.seat.box(
            q.rear - 0.375,
            fy + 0.65,
            z - 0.11,
            q.rear - 0.29,
            fy + 0.8,
            z + 0.11,
          );
      }
      for (const rx of q.rows || [])
        for (const z of [q.half + 0.16, q.half - 0.3, -q.half - 0.1])
          seat(rx, z, 0.2);
      const cowl = m.cabin[1];
      d.seat.box(
        cowl - 0.46,
        fy + 0.3,
        -W + 0.12,
        cowl - 0.04,
        fy + 0.62,
        W - 0.12,
      );
      const tg = new THREE.TorusGeometry(0.18, 0.017, 6, 18);
      steering = {
        geo: tg,
        m: new THREE.Matrix4()
          .makeTranslation(cowl - 0.56, fy + 0.58, q.half)
          .multiply(new THREE.Matrix4().makeRotationZ(-0.42))
          .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)),
      };
    }
    sh = { b, d, steering, m };
    shells.set(name, sh);
    return sh;
  }
  const geoCache = new WeakMap();
  const geo = (buf) => {
    let g = geoCache.get(buf);
    if (!g) {
      g = buf.geometry();
      geoCache.set(buf, g);
    }
    return g;
  };
  const put = (M, mat, buf) => {
    if (buf && !buf.empty) kit.add(mat, geo(buf), M);
  };
  // geometry with its texture coordinates moved onto one cell of the lettering atlas
  const onAtlas = (buf, uv) => {
    const g = buf.geometry();
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++)
      a.setXY(
        i,
        uv[0] + (uv[2] - uv[0]) * a.getX(i),
        uv[1] + (uv[3] - uv[1]) * a.getY(i),
      );
    return g;
  };

  // Adds one swept body with all its fittings. colours: { paint, roof }.
  function body(M, name, colours, o = {}) {
    const { b, d, steering, m } = shell(name);
    put(M, colours.paint, b.bufs.paint);
    put(M, colours.roof || colours.paint, b.bufs.roof);
    put(M, trim, b.bufs.trim);
    put(M, trim, d.trim);
    put(M, m.plain ? trim : chrome, d.chrome);
    if (o.far) put(M, glassDark, b.bufs.glass);
    else {
      put(M, glass, b.bufs.glass);
      put(M, liner, b.bufs.liner);
      put(M, colours.seat || cloth(0x2b2d31), d.seat);
      if (steering) kit.add(trim, steering.geo, M.clone().multiply(steering.m));
    }
    put(M, o.lights ? glowHead : lensClear, d.head);
    put(M, o.hazard ? hazard : lensAmber, d.indF);
    put(M, o.lights || o.brake ? glowTail : lensRed, d.tail);
    put(M, o.hazard ? hazard : lensAmber, d.indR);
    if (!d.plateF.empty)
      kit.add(plateMat, onAtlas(d.plateF, pick(plates.front)), M);
    if (!d.plateR.empty)
      kit.add(plateMat, onAtlas(d.plateR, pick(plates.rear)), M);
    if (o.cabin && !o.far) {
      const x = (m.cabin[0] + m.cabin[1]) / 2,
        y = b.topY(x) - 0.13;
      const lamp = new Buf();
      lamp.box(x - 0.1, y, -0.07, x + 0.1, y + 0.02, 0.07);
      kit.add(glowCabin, lamp.geometry(), M);
    }
    return b;
  }
  // a lit or painted panel with a piece of the lettering atlas, standing at (x, y, z) in body space
  const panel = (M, mat, uv, x, y, z, w, h, yaw) => {
    const g = new THREE.PlaneGeometry(w, h);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++)
      a.setXY(
        i,
        uv[0] + (uv[2] - uv[0]) * a.getX(i),
        uv[1] + (uv[3] - uv[1]) * a.getY(i),
      );
    kit.add(mat, g, M.clone().multiply(kit.xform(x, y, z, 0, yaw, 0)));
  };

  // ---------------- placement
  // squares along the length follow any heading without filling the corners
  function footprint(x, y, z, yaw, len, wid, h) {
    const n = Math.max(1, Math.round(len / wid));
    const fx = Math.sin(yaw),
      fz = Math.cos(yaw);
    const hw = wid / 2 - 0.04;
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n - 0.5) * (len - wid * 0.6);
      const cx = x + fx * t,
        cz = z + fz * t;
      kit.solid(cx - hw, y, cz - hw, cx + hw, y + h, cz + hw, "metal");
    }
  }
  const groundAt = (x, z) => {
    try {
      return Math.max(0, G.physics.groundHeight(x, z, 0.5));
    } catch {
      return 0;
    }
  };
  const CAR_COLOURS = [
    0xc9ccd0, 0x8a9096, 0x1b1d21, 0x1d2c4a, 0x5a1a16, 0xd9d4c4, 0x30463a,
    0x6f7479, 0x9a8f78,
  ];

  // Stands a vehicle at (x, z): the point is its middle, yaw as for props (0 = nose toward +z).
  // kind: taxi | saloon | hatch | van | minibus | lorry | army | bus.
  // o: color, lights, brake, hazard, cabin (dome light), steer, flat (wheel index), far (cheap
  // version for the backdrop), collide, dead (signs unlit).
  function place(kind, x, z, yaw, o = {}) {
    const y = o.y ?? groundAt(x, z);
    const M = kit.xform(x, y, z, o.pitch || 0, yaw - Math.PI / 2, o.roll || 0);
    const col = paint(o.color ?? pick(CAR_COLOURS));
    const fx = Math.sin(yaw),
      fz = Math.cos(yaw);
    const emit = (along, up, e) =>
      ctx.emitters.push({
        pos: [x + fx * along, y + up, z + fz * along],
        ...e,
      });
    const lamps = (len, lampY) => {
      if (o.far) return;
      if (o.lights)
        emit(len / 2 + 1.5, lampY - 0.15, {
          color: 0xfff0d4,
          power: 2.4,
          range: 13,
        });
      if (o.lights || o.brake)
        emit(-len / 2 - 0.7, 0.6, { color: 0xff2a10, power: 1.0, range: 6 });
      if (o.hazard)
        emit(-len / 2 - 0.6, 0.8, {
          color: 0xff8a10,
          power: 1.2,
          range: 7,
          hazard: true,
        });
      if (o.cabin) emit(0, 1.25, { color: 0xffd9a0, power: 0.6, range: 4.5 });
    };
    const wheels = (m, tw, shift = 0) => {
      const W = m.width / 2;
      m.arches.forEach((a, i) => {
        for (const s of [1, -1])
          wheel(M, a.x + shift, s * (W - tw / 2 - 0.035), m.wheelR, tw, s, {
            style: m.wheels,
            cap: m.hubcap,
            steer: a.x > 0 ? (o.steer ?? 0) : 0,
            flat: o.flat === i * 2 + (s > 0 ? 0 : 1),
          });
      });
    };
    let size;

    if (kind === "taxi" || kind === "saloon" || kind === "hatch") {
      const name = kind === "hatch" ? "hatch" : "saloon";
      const m = MODELS[name];
      const taxi = kind === "taxi";
      const b = body(
        M,
        taxi ? "taxi" : name,
        taxi
          ? { paint: paint(0xa51313), roof: paint(0xb4b8bc) }
          : { paint: col },
        o,
      );
      if (taxi) {
        const sx = 0.12,
          sy = b.topY(sx) + 0.02;
        const box = new Buf();
        box.box(sx - 0.07, sy, -0.2, sx + 0.07, sy + 0.13, 0.2);
        kit.add(paint(0xe9dfc4), box.geometry(), M);
        const lit = o.dead || o.far ? plateMat : signMat;
        panel(
          M,
          lit,
          uvTaxi,
          sx + 0.072,
          sy + 0.065,
          0,
          0.38,
          0.115,
          Math.PI / 2,
        );
        panel(
          M,
          lit,
          uvTaxi,
          sx - 0.072,
          sy + 0.065,
          0,
          0.38,
          0.115,
          -Math.PI / 2,
        );
        if (!o.dead && !o.far)
          emit(0.1, sy + 0.5, { color: 0xffe2b0, power: 0.5, range: 4 });
      }
      wheels(m, 0.2);
      size = [name === "hatch" ? 3.95 : 4.7, m.width, 1.45];
      lamps(size[0], m.lampY);
    } else if (kind === "van") {
      const m = MODELS.van;
      const { b } = shell("van");
      body(M, "van", { paint: col }, o);
      if (o.livery)
        for (const s of [1, -1]) {
          const pb = new Buf();
          b.sidePatch(
            pb,
            s,
            s > 0 ? -1.3 : 0.2,
            s > 0 ? 0.2 : -1.3,
            1.0,
            1.48,
            0.004,
            { nx: 6, ny: 2, uv: [0, 0, 1, 1] },
          );
          kit.add(plateMat, onAtlas(pb, uvHaul), M);
        }
      if (o.rack) {
        // roof rack with a ladder lashed to it
        const r = new Buf();
        const top = b.topY(0) + 0.03;
        for (const xx of [-1.6, -0.5, 0.6])
          r.box(xx - 0.02, top - 0.03, -0.72, xx + 0.02, top + 0.08, 0.72);
        for (const zz of [-0.7, 0.7])
          r.box(-1.7, top + 0.06, zz - 0.02, 0.7, top + 0.09, zz + 0.02);
        for (const zz of [-0.2, 0.12])
          r.box(-1.9, top + 0.09, zz - 0.02, 0.9, top + 0.125, zz + 0.02);
        for (let k = 0; k < 9; k++)
          r.box(
            -1.8 + k * 0.32,
            top + 0.095,
            -0.2,
            -1.77 + k * 0.32,
            top + 0.12,
            0.12,
          );
        kit.add(chrome, r.geometry(), M);
      }
      // rear doors: shut line down the middle, two small panes, a handle
      const rd = new Buf(),
        rg = new Buf(),
        rc = new Buf();
      b.endPatch(rd, -1, 0.68, 1.84, -0.006, 0.006, 0.003, { nz: 1, ny: 8 });
      for (const s of [1, -1]) {
        b.endPatch(rd, -1, 1.2, 1.72, s * 0.07, s * 0.66, 0.003, { ny: 2 });
        b.endPatch(rg, -1, 1.23, 1.69, s * 0.1, s * 0.63, 0.006, { ny: 2 });
      }
      b.endPatch(rc, -1, 1.02, 1.06, 0.03, 0.2, 0.014, { nz: 1, ny: 1 });
      kit.add(trim, rd.geometry(), M);
      kit.add(glassDark, rg.geometry(), M);
      kit.add(chrome, rc.geometry(), M);
      wheels(m, 0.2);
      size = [4.7, m.width, 1.95];
      lamps(size[0], m.lampY);
    } else if (kind === "minibus") {
      const m = MODELS.minibus;
      const livery = paint(o.color ?? 0x1c6a3c);
      const b = body(
        M,
        "minibus",
        { paint: paint(0xe6dcc0), roof: livery, seat: cloth(0x3a3026) },
        o,
      );
      // route box on the roof, lit from inside
      const sx = 2.62,
        sy = b.topY(sx) + 0.005;
      const box = new Buf();
      box.box(sx - 0.1, sy, -0.6, sx + 0.1, sy + 0.2, 0.6);
      kit.add(trim, box.geometry(), M);
      panel(
        M,
        o.dead || o.far ? plateMat : signMat,
        uvRoute,
        sx + 0.102,
        sy + 0.1,
        0,
        1.16,
        0.17,
        Math.PI / 2,
      );
      if (!o.dead && !o.far)
        emit(3.5, 2.7, { color: 0xffd23a, power: 0.6, range: 5 });
      const band = new Buf();
      const { b: sh } = shell("minibus");
      for (const s of [1, -1])
        sh.sidePatch(band, s, -3.2, 3.1, 1.0, 1.15, 0.004, { ny: 1 });
      kit.add(livery, band.geometry(), M);
      wheels(m, 0.24);
      size = [6.9, m.width, 2.6];
      lamps(size[0], m.lampY);
    } else if (kind === "lorry") {
      const m = MODELS.cab;
      const cabX = 1.9;
      body(M.clone().multiply(kit.xform(cabX, 0, 0)), "cab", { paint: col }, o);
      wheels(m, 0.24, cabX);
      // chassis, bed and rear axle with twin tyres
      const ch = new Buf();
      for (const zz of [-0.42, 0.42])
        ch.box(-2.9, 0.52, zz - 0.05, 1.2, 0.68, zz + 0.05);
      ch.box(-2.98, 0.42, -0.9, -2.9, 0.6, 0.9);
      ch.box(-0.6, 0.3, 0.5, 0.3, 0.62, 0.86); // fuel tank
      for (const s of [1, -1])
        ch.box(-2.5, 0.72, s * 0.99 - 0.04, -1.3, 0.78, s * 0.99 + 0.04); // mudguards
      kit.add(trim, ch.geometry(), M);
      const bed = new Buf();
      bed.box(-2.95, 0.68, -0.98, 0.98, 0.76, 0.98);
      for (const zz of [-0.98, 0.94])
        bed.box(-2.95, 0.76, zz, 0.98, 1.14, zz + 0.04);
      bed.box(0.94, 0.76, -0.98, 0.98, 1.5, 0.98);
      bed.box(-2.95, 0.76, -0.98, -2.91, 1.14, 0.98);
      kit.add(matt(o.bed ?? 0x3d4a5a), bed.geometry(), M);
      const tl = new Buf();
      for (const s of [1, -1])
        tl.box(-2.99, 0.62, s * 0.8 - 0.09, -2.95, 0.74, s * 0.8 + 0.09);
      kit.add(o.lights || o.brake ? glowTail : lensRed, tl.geometry(), M);
      for (const s of [1, -1])
        for (const dz of [0, 0.25])
          wheel(M, -1.9, s * (0.98 - 0.11 - dz), 0.36, 0.22, s, {
            style: "steel",
            cap: false,
          });
      if (o.load === "tilt") {
        const t = shell("tilt").b;
        const MT = M.clone().multiply(kit.xform(-0.98, 0.1, 0));
        put(MT, matt(o.tilt ?? 0x2f5a46), t.bufs.paint);
        // lashing along the bottom edge
        const rope = new Buf();
        for (const s of [1, -1])
          t.sidePatch(rope, s, -2.2, 2.2, 1.1, 1.13, 0.004, { ny: 1 });
        kit.add(trim, rope.geometry(), MT);
      } else if (o.load === "crates") {
        for (let i = 0; i < 9; i++) {
          const bx = -2.6 + (i % 5) * 0.72 + rnd(-0.05, 0.05),
            bz = (i % 2 ? 0.42 : -0.42) + rnd(-0.08, 0.08);
          const p = new THREE.Vector3(
            bx,
            0.76 + (i > 5 ? 0.3 : 0),
            bz,
          ).applyMatrix4(M);
          kit.prop(
            i % 3 ? "plastic_crate_02" : "cardboard_box_01",
            p.x,
            p.y,
            p.z,
            { yaw: yaw + rnd(-0.3, 0.3), scale: 1.25 },
          );
        }
      }
      size = [6.1, 1.96, o.load === "tilt" ? 2.45 : 2.1];
      lamps(size[0], 1.0);
    } else if (kind === "army") {
      const olive = matt(0x394230);
      body(
        M.clone().multiply(kit.xform(2.1, 0, 0)),
        "armycab",
        { paint: olive, seat: cloth(0x2a2e22) },
        o,
      );
      const ch = new Buf();
      for (const zz of [-0.5, 0.5])
        ch.box(-3.7, 0.86, zz - 0.07, 1.4, 1.08, zz + 0.07);
      ch.box(-3.7, 1.08, -1.17, 1.05, 1.2, 1.17);
      for (const zz of [-1.17, 1.12])
        ch.box(-3.7, 1.2, zz, 1.05, 1.62, zz + 0.05);
      ch.box(-3.75, 1.2, -1.17, -3.7, 1.62, 1.17);
      ch.box(3.66, 0.64, -1.15, 3.8, 0.94, 1.15); // bumper bar
      kit.add(olive, ch.geometry(), M);
      const t = shell("armytilt").b;
      put(
        M.clone().multiply(kit.xform(-1.2, 0.12, 0)),
        matt(0x454c38),
        t.bufs.paint,
      );
      const tl = new Buf();
      for (const s of [1, -1])
        tl.box(-3.79, 1.24, s * 0.95 - 0.08, -3.75, 1.36, s * 0.95 + 0.08);
      kit.add(o.lights || o.brake ? glowTail : lensRed, tl.geometry(), M);
      for (const s of [1, -1])
        for (const axle of [2.6, -1.6, -2.8])
          wheel(M, axle, s * (1.1 - 0.16), 0.52, 0.32, s, {
            style: "steel",
            cap: false,
          });
      size = [7.6, 2.3, 3.1];
      lamps(size[0], 1.3);
    } else if (kind === "bus") {
      const m = MODELS.bus;
      const b = shell("bus").b;
      const cream = paint(0xd6cdac),
        red = paint(o.color ?? 0x8f1a16);
      put(M, cream, b.bufs.paint);
      put(M, trim, b.bufs.trim);
      const g = new Buf(),
        r = new Buf(),
        k = new Buf(),
        hd = new Buf(),
        hz = new Buf();
      const W = m.width / 2;
      for (const s of [1, -1]) {
        b.sidePatch(r, s, -5.1, 5.1, 0.52, 1.2, 0.003, { ny: 2 }); // skirt
        b.sidePatch(r, s, -5.1, 5.0, 2.16, 2.62, 0.003, { ny: 1 }); // band between the decks
        for (let xx = -4.9; xx < 4.4; xx += 1.36) {
          b.sidePatch(k, s, xx - 0.03, xx + 1.33, 1.27, 2.08, 0.003, { nx: 1 });
          b.sidePatch(g, s, xx + 0.04, xx + 1.26, 1.33, 2.02, 0.006, { nx: 1 });
          b.sidePatch(k, s, xx - 0.03, xx + 1.33, 2.74, 3.62, 0.003, { nx: 1 });
          b.sidePatch(g, s, xx + 0.04, xx + 1.26, 2.8, 3.56, 0.006, { nx: 1 });
        }
        b.endPatch(hd, 1, 0.76, 0.94, s * 0.6, s * 1.0, 0.008, { ny: 1 });
        b.endPatch(hz, 1, 0.76, 0.94, s * 1.03, s * 1.13, 0.008, { ny: 1 });
        b.endPatch(hz, -1, 0.9, 1.12, s * 0.9, s * 1.1, 0.008, { ny: 1 });
      }
      // two screens, the destination blind between them, red below
      b.endPatch(k, 1, 1.24, 2.14, -W + 0.1, W - 0.1, 0.003);
      b.endPatch(g, 1, 1.3, 2.08, -W + 0.16, W - 0.16, 0.006);
      b.endPatch(k, 1, 2.72, 3.66, -W + 0.1, W - 0.1, 0.003);
      b.endPatch(g, 1, 2.78, 3.6, -W + 0.16, W - 0.16, 0.006);
      b.endPatch(r, 1, 0.5, 1.2, -W + 0.06, W - 0.06, 0.003);
      b.endPatch(r, -1, 0.5, 1.2, -W + 0.06, W - 0.06, 0.003);
      b.endPatch(k, -1, 2.74, 3.6, -W + 0.2, W - 0.2, 0.003);
      b.endPatch(g, -1, 2.8, 3.54, -W + 0.26, W - 0.26, 0.006);
      kit.add(glassDark, g.geometry(), M);
      kit.add(red, r.geometry(), M);
      kit.add(trim, k.geometry(), M);
      kit.add(o.lights ? glowHead : lensClear, hd.geometry(), M);
      kit.add(o.hazard ? hazard : lensAmber, hz.geometry(), M);
      const blind = new Buf();
      b.endPatch(blind, 1, 2.26, 2.56, 0.85, -0.85, 0.01, {
        ny: 1,
        uv: [0, 0, 1, 1],
      });
      kit.add(o.dead ? plateMat : signMat, onAtlas(blind, uvBus), M);
      for (const a of m.arches)
        for (const s of [1, -1])
          wheel(M, a.x, s * (W - 0.19), 0.5, 0.3, s, {
            style: "steel",
            cap: false,
          });
      size = [10.7, m.width, 4.4];
      if (o.hazard)
        emit(-6, 1.2, { color: 0xff8a10, power: 1.4, range: 8, hazard: true });
      if (!o.dead) emit(6, 2.4, { color: 0xff9a1a, power: 0.8, range: 6 });
    } else throw new Error(`unknown vehicle "${kind}"`);
    if (o.collide !== false) footprint(x, y, z, yaw, size[0], size[1], size[2]);
    return { size, y };
  }
  // the taxi is the saloon with its roof in a second colour
  MODELS.taxi = { ...MODELS.saloon, roof: true };

  // hazard lamps: one material, one blink
  let t = 0;
  const amber = new THREE.Color(0xff8a10);
  ctx.updaters.push((dt) => {
    t += dt;
    const on = (t * 1.35) % 1 < 0.5;
    hazard.color.copy(amber).multiplyScalar(on ? 5 : 0.25);
    for (const e of ctx.emitters) if (e.hazard) e.gain = on ? 1 : 0.05;
  });

  return { place, MODELS };
}
