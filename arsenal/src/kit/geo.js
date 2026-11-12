// Modelling primitives for weapon view models.
//
// Gun space: +Z points out of the muzzle, +Y is up, +X is the shooter's LEFT. Units are metres.
// (The lab mounts the finished root rotated half a turn about Y, so it looks down the camera's -Z.)
//
// Every primitive returns a non-indexed BufferGeometry with position / normal / uv / color / aWear.
//   aWear  1 = rounded outer edge (paint rubs off, metal shines through), 0 = flat face, <0 = cavity.
// Flat faces keep exact face normals and only the thin edge strips blend between them, which is
// what gives the hard-surface "bevel + weighted normals" highlight on every edge.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;
export const MM = 0.001;
const EDGE = 0.0006; // default edge rounding

// ---------------------------------------------------------------- raw triangle soup builder
class Soup {
  constructor() {
    this.p = [];
    this.n = [];
    this.uv = [];
    this.w = [];
  }
  vert(p, n, w = 0, u = 0, v = 0) {
    this.p.push(p[0], p[1], p[2]);
    this.n.push(n[0], n[1], n[2]);
    this.uv.push(u, v);
    this.w.push(w);
  }
  tri(a, b, c) {
    this.vert(...a);
    this.vert(...b);
    this.vert(...c);
  }
  // a,b,c,d counter-clockwise seen from outside; each is [pos, normal, wear, u, v]
  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("aWear", new THREE.Float32BufferAttribute(this.w, 1));
    const col = new Float32Array((this.p.length / 3) * 3).fill(1);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }
}

/** Bring any THREE geometry into the kit's attribute layout. */
export function adopt(geo, wear = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv)
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  for (const k of Object.keys(g.attributes)) {
    if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
  }
  g.setAttribute(
    "aWear",
    new THREE.BufferAttribute(new Float32Array(n).fill(wear), 1),
  );
  g.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3),
  );
  g.morphAttributes = {};
  return g;
}

// ---------------------------------------------------------------- 2D outline with rounded corners
// pts: [[u, v, r?], ...] counter-clockwise or clockwise (normalised to CCW). r = corner radius;
// omitted -> default edge rounding. Returns vertices {x, y, nx, ny, wear} around the loop where
// consecutive vertices form the wall segments; `wear` describes the segment starting at that vertex.
function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function outline(pts, { edge = EDGE, hole = false, arcSeg = 0 } = {}) {
  let P = pts.map((p) => [p[0], p[1], p[2]]);
  // drop duplicate neighbours
  P = P.filter((p, i) => {
    const q = P[(i + P.length - 1) % P.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-7;
  });
  if (signedArea(P) < 0) P.reverse();
  const n = P.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i + n - 1) % n];
    const b = P[i];
    const c = P[(i + 1) % n];
    let d1x = b[0] - a[0],
      d1y = b[1] - a[1];
    let d2x = c[0] - b[0],
      d2y = c[1] - b[1];
    const l1 = Math.hypot(d1x, d1y),
      l2 = Math.hypot(d2x, d2y);
    d1x /= l1;
    d1y /= l1;
    d2x /= l2;
    d2y /= l2;
    // outward normals of the two edges (CCW polygon -> outward is to the right of travel)
    const n1x = d1y,
      n1y = -d1x,
      n2x = d2y,
      n2y = -d2x;
    const cross = d1x * d2y - d1y * d2x; // >0 convex (left turn)
    const dot = Math.max(-1, Math.min(1, d1x * d2x + d1y * d2y));
    const turn = Math.acos(dot); // exterior angle
    let r = b[2] === undefined ? edge : b[2];
    if (turn < 0.02 || r <= 0) {
      // straight through or explicitly sharp: single vertex per side
      if (turn < 0.02) {
        out.push({ x: b[0], y: b[1], nx: n2x, ny: n2y, wear: 0 });
      } else {
        out.push({ x: b[0], y: b[1], nx: n1x, ny: n1y, wear: 0, zero: true });
        out.push({ x: b[0], y: b[1], nx: n2x, ny: n2y, wear: 0 });
      }
      continue;
    }
    // tangent length for the fillet, limited by the neighbouring edges
    let t = r * Math.tan(turn / 2);
    const lim = Math.min(l1, l2) * 0.49;
    if (t > lim) {
      t = lim;
      r = t / Math.tan(turn / 2);
    }
    const sx = b[0] - d1x * t,
      sy = b[1] - d1y * t;
    const convex = cross > 0;
    // centre of the fillet: from the start point, go inward (convex) or outward (concave) by r
    const cx = sx - (convex ? n1x : -n1x) * r,
      cy = sy - (convex ? n1y : -n1y) * r;
    const segs =
      arcSeg ||
      Math.max(2, Math.min(10, Math.ceil(turn / 0.4) + (r > 0.004 ? 2 : 0)));
    const a0 = Math.atan2(sy - cy, sx - cx);
    const sweep = convex ? turn : -turn;
    const wear = convex !== hole ? (r <= 0.0025 ? 1 : 0.35) : -0.6;
    for (let k = 0; k <= segs; k++) {
      const ang = a0 + (sweep * k) / segs;
      const ca = Math.cos(ang),
        sa = Math.sin(ang);
      const sgn = convex ? 1 : -1;
      out.push({
        x: cx + ca * r,
        y: cy + sa * r,
        nx: ca * sgn,
        ny: sa * sgn,
        wear: k < segs ? wear : 0,
      });
    }
  }
  if (hole) {
    // a hole's material is outside the loop: flip normals and traversal
    out.reverse();
    for (let i = 0; i < out.length; i++) {
      out[i].nx = -out[i].nx;
      out[i].ny = -out[i].ny;
    }
    // wear belongs to the segment that starts at a vertex; after reversing shift it by one
    const w = out.map((o) => o.wear);
    const z = out.map((o) => o.zero);
    for (let i = 0; i < out.length; i++) {
      out[i].wear = w[(i + 1) % out.length];
      out[i].zero = z[(i + 1) % out.length];
    }
  }
  return out;
}

function circlePts(c, r, seg = 20) {
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * TAU;
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 0]);
  }
  return pts;
}

/**
 * Extrude a 2D outline with rounded edges everywhere.
 *   pts    [[u, v, r?], ...]   outline; r rounds that corner (default: hairline edge)
 *   depth  thickness along the extrusion axis, centred on 0
 *   opts.plane  "side" (default): u = Z forward, v = Y up, extruded along X  (the gun's side profile)
 *               "top":            u = X left,    v = Z forward, extruded along Y
 *               "front":          u = X left,    v = Y up, extruded along Z
 *   opts.bevel  edge rounding where the walls meet the two faces (default 0.6 mm)
 *   opts.bevelSeg  segments of that rounding: 1 = chamfer with blended normals, 3-4 = true round-over
 *               (use a large bevel with bevelSeg 4 for stocks, grips and other oval sections)
 *   opts.holes  [[[u,v,r?],...] | {c:[u,v], r, seg}]  cut-outs through the part
 *   opts.taper  scale of the outline on the +axis face relative to the -axis face (default 1)
 */
export function prism(pts, depth, opts = {}) {
  const {
    plane = "side",
    holes = [],
    edge = EDGE,
    taper = 1,
    arcSeg = 0,
    bevelSeg = 1,
  } = opts;
  let bevel = opts.bevel === undefined ? EDGE : opts.bevel;
  bevel = Math.min(bevel, depth * 0.45);
  const loops = [outline(pts, { edge: Math.max(edge, 0), arcSeg })];
  for (const h of holes) {
    const hp = Array.isArray(h) ? h : circlePts(h.c, h.r, h.seg || 20);
    loops.push(outline(hp, { edge: Math.max(edge, 0), hole: true, arcSeg }));
  }
  const S = new Soup();
  const h = depth / 2;
  // map (u, v, w) -> xyz and the matching normal transform
  const map =
    plane === "side"
      ? (u, v, w) => [w, v, u]
      : plane === "top"
        ? (u, v, w) => [u, w, v]
        : (u, v, w) => [u, v, w];
  // handedness: side (x=w,y=v,z=u) and top are odd permutations -> flip winding
  const flip = plane !== "front";
  const tri = (a, b, c) => (flip ? S.tri(a, c, b) : S.tri(a, b, c));
  const V = (u, v, w, nu, nv, nw, wear) => [
    map(u, v, w),
    map(nu, nv, nw),
    wear,
    0,
    0,
  ];
  const sc = (side) => (side > 0 ? taper : 1); // outline scale on each face
  for (const L of loops) {
    const m = L.length;
    for (let i = 0; i < m; i++) {
      const a = L[i],
        b = L[(i + 1) % m];
      if (a.zero) continue; // coincident pair at a sharp corner
      const w = a.wear;
      const s0 = sc(-1),
        s1 = sc(1);
      // wall (viewed from outside, CCW): a(-h) , b(-h), b(+h), a(+h)   [in (u,v,w) right-handed]
      const A0 = V(a.x * s0, a.y * s0, -h + bevel, a.nx, a.ny, 0, w);
      const B0 = V(b.x * s0, b.y * s0, -h + bevel, b.nx, b.ny, 0, w);
      const B1 = V(b.x * s1, b.y * s1, h - bevel, b.nx, b.ny, 0, w);
      const A1 = V(a.x * s1, a.y * s1, h - bevel, a.nx, a.ny, 0, w);
      tri(A0, B0, B1);
      tri(A0, B1, A1);
      if (bevel > 0) {
        // quarter-round strip between the wall and each face; 1 segment = chamfer with blended normals
        const ew = Math.max(w, bevel <= 0.0025 ? 1 : 0.35);
        for (let k = 0; k < bevelSeg; k++) {
          const t0 = (k / bevelSeg) * (Math.PI / 2),
            t1 = ((k + 1) / bevelSeg) * (Math.PI / 2);
          const i0 = bevel * (1 - Math.cos(t0)),
            i1 = bevel * (1 - Math.cos(t1)); // inset
          const w0 = h - bevel + bevel * Math.sin(t0),
            w1 = h - bevel + bevel * Math.sin(t1); // height
          const c0 = Math.cos(t0),
            n0 = Math.sin(t0),
            c1 = Math.cos(t1),
            n1 = Math.sin(t1);
          for (const side of [1, -1]) {
            const s = side > 0 ? s1 : s0;
            const Pa0 = V(
              (a.x - a.nx * i0) * s,
              (a.y - a.ny * i0) * s,
              side * w0,
              a.nx * c0,
              a.ny * c0,
              side * n0,
              ew,
            );
            const Pb0 = V(
              (b.x - b.nx * i0) * s,
              (b.y - b.ny * i0) * s,
              side * w0,
              b.nx * c0,
              b.ny * c0,
              side * n0,
              ew,
            );
            const Pa1 = V(
              (a.x - a.nx * i1) * s,
              (a.y - a.ny * i1) * s,
              side * w1,
              a.nx * c1,
              a.ny * c1,
              side * n1,
              ew,
            );
            const Pb1 = V(
              (b.x - b.nx * i1) * s,
              (b.y - b.ny * i1) * s,
              side * w1,
              b.nx * c1,
              b.ny * c1,
              side * n1,
              ew,
            );
            if (side > 0) {
              tri(Pa0, Pb0, Pb1);
              tri(Pa0, Pb1, Pa1);
            } else {
              tri(Pa1, Pb1, Pb0);
              tri(Pa1, Pb0, Pa0);
            }
          }
        }
      }
    }
  }
  // caps
  const inset = (L) =>
    L.filter((p) => !p.zero).map(
      (p) => new THREE.Vector2(p.x - p.nx * bevel, p.y - p.ny * bevel),
    );
  const contour = inset(loops[0]);
  const holeC = loops.slice(1).map((L) => inset(L));
  const faces = THREE.ShapeUtils.triangulateShape(contour, holeC);
  const all = contour.concat(...holeC);
  for (const f of faces) {
    const [a, b, c] = f.map((i) => all[i]);
    // orientation of the triangle in (u, v)
    const ar = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    const ccw = ar > 0 ? [a, b, c] : [a, c, b];
    const s1 = sc(1),
      s0 = sc(-1);
    tri(
      V(ccw[0].x * s1, ccw[0].y * s1, h, 0, 0, 1, 0),
      V(ccw[1].x * s1, ccw[1].y * s1, h, 0, 0, 1, 0),
      V(ccw[2].x * s1, ccw[2].y * s1, h, 0, 0, 1, 0),
    );
    tri(
      V(ccw[0].x * s0, ccw[0].y * s0, -h, 0, 0, -1, 0),
      V(ccw[2].x * s0, ccw[2].y * s0, -h, 0, 0, -1, 0),
      V(ccw[1].x * s0, ccw[1].y * s0, -h, 0, 0, -1, 0),
    );
  }
  return S.geometry();
}

/** Box with every edge rounded. Centred on the origin; w = X, h = Y, d = Z. opts.r rounds the X-facing silhouette. */
export function box(w, h, d, opts = {}) {
  const r = opts.r;
  const pts = [
    [-d / 2, -h / 2, r],
    [d / 2, -h / 2, r],
    [d / 2, h / 2, r],
    [-d / 2, h / 2, r],
  ];
  return prism(pts, w, opts);
}

/**
 * Solid of revolution about the Z axis.
 *   prof  [[z, radius, r?], ...]  open polyline from back to front (radius 0 closes an end).
 *         r rounds that corner; default hairline.
 *   opts.seg     segments around (default 28)
 *   opts.flat    facet the circumference (hex / octagonal barrels, nuts)
 *   opts.arc     [start, length] in radians for a partial revolve (0 = +X, turning towards +Y)
 *   opts.squash  [sx, sy] scale the cross-section into an ellipse
 */
export function lathe(prof, opts = {}) {
  const {
    seg = 28,
    flat = false,
    arc = null,
    edge = EDGE,
    squash = null,
  } = opts;
  // build the profile with rounded corners (open polyline)
  const P = [];
  const n = prof.length;
  for (let i = 0; i < n; i++) {
    const b = prof[i];
    if (i === 0 || i === n - 1) {
      P.push({ z: b[0], r: b[1], wear: 0, corner: true });
      continue;
    }
    const a = prof[i - 1],
      c = prof[i + 1];
    let d1z = b[0] - a[0],
      d1r = b[1] - a[1],
      d2z = c[0] - b[0],
      d2r = c[1] - b[1];
    const l1 = Math.hypot(d1z, d1r),
      l2 = Math.hypot(d2z, d2r);
    if (l1 < 1e-7 || l2 < 1e-7) {
      P.push({ z: b[0], r: b[1], wear: 0, corner: true });
      continue;
    }
    d1z /= l1;
    d1r /= l1;
    d2z /= l2;
    d2r /= l2;
    const dot = Math.max(-1, Math.min(1, d1z * d2z + d1r * d2r));
    const turn = Math.acos(dot);
    let rad = b[2] === undefined ? edge : b[2];
    if (turn < 0.02 || rad <= 0) {
      P.push({ z: b[0], r: b[1], wear: 0, corner: turn >= 0.02 });
      continue;
    }
    let t = rad * Math.tan(turn / 2);
    const lim = Math.min(l1, l2) * 0.49;
    if (t > lim) {
      t = lim;
      rad = t / Math.tan(turn / 2);
    }
    // cross > 0: turning towards +r while travelling +z ... convexity relative to the solid:
    // the solid lies on the -r side (towards the axis) of the polyline, so a turn towards -r is convex.
    const cross = d1z * d2r - d1r * d2z;
    const convex = cross < 0;
    const segs = Math.max(
      2,
      Math.min(8, Math.ceil(turn / 0.4) + (rad > 0.004 ? 2 : 0)),
    );
    const sz = b[0] - d1z * t,
      sr = b[1] - d1r * t;
    // normal of first edge pointing away from the axis side: (-d1r, d1z)
    const n1z = -d1r,
      n1r = d1z;
    const cz = sz - (convex ? n1z : -n1z) * rad,
      cr = sr - (convex ? n1r : -n1r) * rad;
    const a0 = Math.atan2(sr - cr, sz - cz);
    const sweep = convex ? -turn : turn;
    const wear = convex ? (rad <= 0.0025 ? 1 : 0.35) : -0.6;
    for (let k = 0; k <= segs; k++) {
      const ang = a0 + (sweep * k) / segs;
      const sgn = convex ? 1 : -1;
      P.push({
        z: cz + Math.cos(ang) * rad,
        r: Math.max(0, cr + Math.sin(ang) * rad),
        nz: Math.cos(ang) * sgn,
        nr: Math.sin(ang) * sgn,
        wear: k < segs ? wear : 0,
      });
    }
  }
  const S = new Soup();
  const a0 = arc ? arc[0] : 0;
  const aLen = arc ? arc[1] : TAU;
  const sx = squash ? squash[0] : 1,
    sy = squash ? squash[1] : 1;
  for (let i = 0; i < P.length - 1; i++) {
    const p = P[i],
      q = P[i + 1];
    const dz = q.z - p.z,
      dr = q.r - p.r;
    const l = Math.hypot(dz, dr);
    if (l < 1e-8) continue;
    // segment normal (pointing away from the axis side)
    const snz = -dr / l,
      snr = dz / l;
    const pn = p.nz !== undefined && p.wear !== 0 ? [p.nz, p.nr] : [snz, snr];
    const qn = q.nz !== undefined && p.wear !== 0 ? [q.nz, q.nr] : [snz, snr];
    for (let j = 0; j < seg; j++) {
      const t0 = a0 + (j / seg) * aLen,
        t1 = a0 + ((j + 1) / seg) * aLen;
      const tm = (t0 + t1) / 2;
      const c0 = Math.cos(t0),
        s0 = Math.sin(t0),
        c1 = Math.cos(t1),
        s1 = Math.sin(t1);
      const f0c = flat ? Math.cos(tm) : c0,
        f0s = flat ? Math.sin(tm) : s0,
        f1c = flat ? Math.cos(tm) : c1,
        f1s = flat ? Math.sin(tm) : s1;
      const mk = (pt, nn, c, s, fc, fs, u) => [
        [pt.r * c * sx, pt.r * s * sy, pt.z],
        normSq(nn[1] * fc * sy, nn[1] * fs * sx, nn[0] * sx * sy),
        p.wear,
        u,
        pt.z,
      ];
      const A = mk(p, pn, c0, s0, f0c, f0s, j / seg);
      const B = mk(p, pn, c1, s1, f1c, f1s, (j + 1) / seg);
      const C = mk(q, qn, c1, s1, f1c, f1s, (j + 1) / seg);
      const D = mk(q, qn, c0, s0, f0c, f0s, j / seg);
      // outside view: going +theta is CCW about +Z; with the normal pointing out, order A,B,C,D
      if (p.r > 1e-7) S.tri(A, B, C);
      if (q.r > 1e-7) S.tri(A, C, D);
    }
  }
  return S.geometry();
}
function normSq(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** Solid round bar along Z from z0 to z1. opts: seg, flat, r (end rounding), squash. */
export function rod(radius, z0, z1, opts = {}) {
  return lathe(
    [
      [z0, 0],
      [z0, radius, opts.r],
      [z1, radius, opts.r],
      [z1, 0],
    ],
    opts,
  );
}

/** Hollow tube along Z (a barrel with a visible bore). */
export function tube(rOut, rIn, z0, z1, opts = {}) {
  return lathe(
    [
      [z0, rIn, 0],
      [z0, rOut, opts.r],
      [z1, rOut, opts.r],
      [z1, rIn, opts.rIn === undefined ? 0.0003 : opts.rIn],
      [z0, rIn, 0],
    ],
    opts,
  );
}

/** Tapered bar: radius r0 at z0 to r1 at z1. */
export function cone(r0, r1, z0, z1, opts = {}) {
  return lathe(
    [
      [z0, 0],
      [z0, r0, opts.r],
      [z1, r1, opts.r],
      [z1, 0],
    ],
    opts,
  );
}

/** Round section swept along a path of [x,y,z] points (cables, hoses, cords, slings). */
export function sweep(points, radius, opts = {}) {
  const { seg = 8, closed = false, tension = 0.5, steps } = opts;
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    closed,
    "catmullrom",
    tension,
  );
  const len = curve.getLength();
  const n =
    steps ||
    Math.max(points.length * 4, Math.min(160, Math.ceil(len / (radius * 2.2))));
  const g = new THREE.TubeGeometry(curve, n, radius, seg, closed);
  const out = adopt(g, opts.wear ?? 0);
  if (!closed && opts.caps !== false) {
    const a = curve.getPoint(0),
      b = curve.getPoint(1);
    const s = adopt(
      new THREE.SphereGeometry(radius, seg, Math.max(4, seg / 2)),
    );
    const s2 = s.clone();
    s.translate(a.x, a.y, a.z);
    s2.translate(b.x, b.y, b.z);
    return mergeGeometries([out, s, s2]);
  }
  return out;
}

/** Wire wound around the Z axis (springs, coils, cord wraps). r can be a function of t in 0..1. */
export function helix(R, wire, z0, z1, turns, opts = {}) {
  const pts = [];
  const n = Math.ceil(turns * (opts.perTurn || 14));
  const sx = opts.squash ? opts.squash[0] : 1,
    sy = opts.squash ? opts.squash[1] : 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * TAU + (opts.phase || 0);
    const rr = typeof R === "function" ? R(t) : R;
    pts.push([
      Math.cos(a) * rr * sx,
      Math.sin(a) * rr * sy,
      z0 + (z1 - z0) * t,
    ]);
  }
  return sweep(pts, wire, { seg: opts.seg || 6, steps: n * 2, ...opts });
}

export function sphere(r, opts = {}) {
  const g = adopt(
    new THREE.SphereGeometry(r, opts.seg || 20, opts.rings || 14),
    opts.wear ?? 0,
  );
  if (opts.squash) g.scale(opts.squash[0], opts.squash[1], opts.squash[2]);
  return g;
}

/** Ring lying in the XY plane (axis along Z). opts.arc limits the sweep. */
export function torus(R, r, opts = {}) {
  return adopt(
    new THREE.TorusGeometry(
      R,
      r,
      opts.seg || 10,
      opts.around || 32,
      opts.arc || TAU,
    ),
    opts.wear ?? 0,
  );
}

/** Flat rectangle facing +Y by default (for canvas labels). Has real UVs. */
export function plane(w, d) {
  const g = adopt(new THREE.PlaneGeometry(w, d));
  g.rotateX(-Math.PI / 2);
  return g;
}

// ---------------------------------------------------------------- transforms and assembly
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Move / rotate / scale a geometry in place. rot is XYZ Euler in radians (applied before `at`). */
export function place(
  geo,
  { at = [0, 0, 0], rot = [0, 0, 0], scale = 1 } = {},
) {
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  _m.compose(
    _p.set(at[0], at[1], at[2]),
    _q.setFromEuler(_e.set(rot[0], rot[1], rot[2], "XYZ")),
    _s.set(s[0], s[1], s[2]),
  );
  geo.applyMatrix4(_m);
  if (s[0] * s[1] * s[2] < 0) flipWinding(geo);
  return geo;
}

function flipWinding(geo) {
  for (const name of Object.keys(geo.attributes)) {
    const at = geo.attributes[name];
    const sz = at.itemSize;
    const arr = at.array;
    for (let i = 0; i < at.count; i += 3) {
      for (let k = 0; k < sz; k++) {
        const a = (i + 1) * sz + k,
          b = (i + 2) * sz + k;
        const t = arr[a];
        arr[a] = arr[b];
        arr[b] = t;
      }
    }
    at.needsUpdate = true;
  }
  return geo;
}

/** Copy mirrored across the YZ plane (left <-> right). */
export function mirrorX(geo) {
  const g = geo.clone();
  g.scale(-1, 1, 1);
  const nrm = g.attributes.normal;
  // BufferGeometry.scale already transforms normals with the normal matrix; just fix the winding
  flipWinding(g);
  nrm.needsUpdate = true;
  return g;
}

export function tint(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const a = geo.attributes.color;
  for (let i = 0; i < a.count; i++)
    a.setXYZ(i, a.getX(i) * c.r, a.getY(i) * c.g, a.getZ(i) * c.b);
  return geo;
}

export function setWear(geo, k) {
  const a = geo.attributes.aWear;
  for (let i = 0; i < a.count; i++) a.setX(i, a.getX(i) * k);
  return geo;
}

/**
 * Collects geometry per material and bakes it into one mesh per material.
 *   const m = mesher(mats);
 *   m.add(geo, "steel_blued", { at, rot, scale, color, wear, mirror });
 *   const node = m.build("receiver");
 */
export function mesher(mats) {
  const buckets = new Map();
  const extra = [];
  const api = {
    add(geo, mat, o = {}) {
      if (!geo) return api;
      const g = geo;
      if (o.at || o.rot || o.scale) place(g, o);
      if (o.color !== undefined) tint(g, o.color);
      if (o.wear !== undefined) setWear(g, o.wear);
      const key = typeof mat === "string" ? mat : mat.uuid;
      if (!buckets.has(key)) buckets.set(key, { mat, list: [] });
      buckets.get(key).list.push(g);
      if (o.mirror) buckets.get(key).list.push(mirrorX(g));
      return api;
    },
    /** Attach a ready-made Object3D (labels, glow meshes, sub-assemblies). */
    attach(obj) {
      extra.push(obj);
      return api;
    },
    build(name = "part") {
      const group = new THREE.Group();
      group.name = name;
      let tris = 0;
      for (const { mat, list } of buckets.values()) {
        const geo = list.length === 1 ? list[0] : mergeGeometries(list, false);
        const material = typeof mat === "string" ? mats.get(mat) : mat;
        const mesh = new THREE.Mesh(geo, material);
        mesh.name = `${name}:${typeof mat === "string" ? mat : mat.name || "mat"}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        tris += geo.attributes.position.count / 3;
      }
      for (const e of extra) group.add(e);
      group.userData.tris = tris;
      return group;
    },
  };
  return api;
}

// ---------------------------------------------------------------- gun furniture shared by several weapons
/** Picatinny rail along Z, top surface at y = 0, from z0 to z1. */
export function rail(z0, z1, opts = {}) {
  const w = opts.w || 0.0212;
  const parts = [];
  const base = prism(
    [
      [-w / 2 + 0.003, -0.0094],
      [w / 2 - 0.003, -0.0094],
      [w / 2 - 0.003, -0.0052],
      [w / 2, -0.0026],
      [w / 2 - 0.0026, 0],
      [-w / 2 + 0.0026, 0],
      [-w / 2, -0.0026],
      [-w / 2 + 0.003, -0.0052],
    ].map((p) => [p[0], p[1], 0.0003]),
    z1 - z0,
    { plane: "front", bevel: 0.0003 },
  );
  place(base, { at: [0, -0.003, (z0 + z1) / 2] });
  parts.push(base);
  const pitch = 0.01;
  const n = Math.floor((z1 - z0 - 0.004) / pitch);
  const start = (z0 + z1) / 2 - ((n - 1) * pitch) / 2;
  for (let i = 0; i < n; i++) {
    const t = box(w - 0.0052, 0.003, 0.0048, { bevel: 0.0004, edge: 0.0004 });
    place(t, { at: [0, -0.0015, start + i * pitch] });
    parts.push(t);
  }
  return mergeGeometries(parts);
}

/** Screw / rivet head: axis = direction the head faces ("x" | "-x" | "y" | "z" ...). */
export function screw(r = 0.0022, opts = {}) {
  const h = opts.h || r * 0.5;
  const head = lathe(
    [
      [0, 0],
      [0, r],
      [h, r * 0.92, r * 0.25],
      [h, 0],
    ],
    { seg: opts.hex ? 6 : 12, flat: !!opts.hex },
  );
  const parts = [head];
  if (!opts.hex && opts.slot !== false) {
    const slot = box(r * 0.28, r * 1.7, h * 0.5, { bevel: 0, edge: 0 });
    place(slot, { at: [0, 0, h + 0.00001] });
    setWear(slot, 0);
    tint(slot, 0x050505);
    parts.push(slot);
  }
  const g = mergeGeometries(parts);
  const ax = opts.axis || "x";
  if (ax === "x") g.rotateY(Math.PI / 2);
  else if (ax === "-x") g.rotateY(-Math.PI / 2);
  else if (ax === "y") g.rotateX(-Math.PI / 2);
  else if (ax === "-y") g.rotateX(Math.PI / 2);
  else if (ax === "-z") g.rotateY(Math.PI);
  return g;
}

export { mergeGeometries, TAU };
