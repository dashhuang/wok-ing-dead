// Reference snapshot only; not a standalone module or a game entry point.
// See README.md for the source and required runtime context.
// === Backdrop: cranes, ships and skyline ===
var zv = {};
ar(zv, { create: () => Iv, showcase: () => _P });
var Ft = (n, e, t) => new K(n, e, t),
  lu = (n) => (n.isVector3 ? n : new K(n[0], n[1], n[2])),
  xw = new K(0, 1, 0),
  gP = new K(1, 1, 1),
  gw = new St(),
  zg = new Je();
function Wl(n, e, t) {
  let i =
    Math.imul(n, 374761393) ^
    Math.imul(e, 668265263) ^
    Math.imul(t, 1274126177);
  return (
    (i = Math.imul(i ^ (i >>> 13), 1274126177)),
    ((i ^ (i >>> 16)) >>> 0) / 4294967295
  );
}
function au(n, e, t) {
  let i = Math.floor(n),
    s = Math.floor(e),
    o = Math.floor(t),
    r = n - i,
    a = e - s,
    l = t - o;
  ((r = r * r * (3 - 2 * r)),
    (a = a * a * (3 - 2 * a)),
    (l = l * l * (3 - 2 * l)));
  let c = (u, f, h) => u + (f - u) * h;
  return c(
    c(
      c(Wl(i, s, o), Wl(i + 1, s, o), r),
      c(Wl(i, s + 1, o), Wl(i + 1, s + 1, o), r),
      a,
    ),
    c(
      c(Wl(i, s, o + 1), Wl(i + 1, s, o + 1), r),
      c(Wl(i, s + 1, o + 1), Wl(i + 1, s + 1, o + 1), r),
      a,
    ),
    l,
  );
}
function Rv(n) {
  let e = n >>> 0;
  return () => (
    (e = (Math.imul(e, 1664525) + 1013904223) >>> 0),
    e / 4294967296
  );
}
var Ig = [1, 1, 1],
  vw = [1, 1, 1];
function Cv(n, e, t, i = vw, s = 1) {
  let o = au(n * 0.31 + 11.3, e * 0.23 + 5.1, t * 0.31 + 3.7),
    r = au(n * 1.7 + 40.2, 9.5, t * 1.7 + 17.9),
    a = 1 - s * (0.3 - 0.36 * o),
    l = i[0] * a,
    c = i[1] * a,
    u = i[2] * a;
  if (r > 0.68) {
    let f =
      Math.min(1, (r - 0.68) / 0.3) *
      0.6 *
      s *
      (0.35 + 0.65 * au(n * 0.9, e * 0.45, t * 0.9));
    ((l *= 1 + 0.45 * f), (c *= 1 - 0.3 * f), (u *= 1 - 0.6 * f));
  }
  return ((Ig[0] = l), (Ig[1] = c), (Ig[2] = u), Ig);
}
var yw = new WeakSet();
function po(n, e, t = {}) {
  let i = n.mats.get(e, { vertexColors: !0, ...t });
  return (yw.add(i), i);
}
var ho = class {
  constructor() {
    ((this.b = new Map()),
      (this.tris = 0),
      (this.remap = null),
      (this.dz = 0),
      (this.minSize = 0));
  }
  add(e, t, i) {
    if (!t) return;
    if (Array.isArray(t)) {
      for (let o of t) this.add(e, o, i);
      return;
    }
    if (this.remap) {
      let o = this.remap(e, i);
      if (!o) return;
      if (this.minSize) {
        t.computeBoundingBox();
        let r = t.boundingBox;
        if (
          Math.max(r.max.x - r.min.x, r.max.y - r.min.y, r.max.z - r.min.z) <
          this.minSize
        )
          return;
      }
      ((e = o[0]), (i = o[1]), this.dz && t.translate(0, 0, this.dz));
    }
    yw.has(e) &&
      !t.attributes.color &&
      Kr(t, (o, r, a) => Cv(o, r, a, i || vw));
    let s = this.b.get(e.uuid);
    (s || ((s = { mat: e, geos: [] }), this.b.set(e.uuid, s)),
      s.geos.push(t),
      (this.tris +=
        (t.index ? t.index.count : t.attributes.position.count) / 3));
  }
  build({ cast: e = !0, recv: t = !0 } = {}) {
    let i = new At();
    for (let s of this.b.values()) {
      let o = Jr(s.geos),
        r = new ht(o, s.mat),
        a = s.mat.isMeshBasicMaterial || s.mat.transparent;
      ((r.castShadow = e && !a), (r.receiveShadow = t && !a), i.add(r));
    }
    return (this.b.clear(), i);
  }
};
function Pe(n, e, t, i, s, o, r = 0) {
  let a = Math.abs(i - n),
    l = Math.abs(s - e),
    c = Math.abs(o - t),
    u = r > 0 ? Ei(a, l, c, r) : ot(a, l, c);
  return (u.translate((n + i) / 2, (e + s) / 2, (t + o) / 2), u);
}
function Pt(n, e, t, i, s, o, r, a = 12, l = !1) {
  let c = vt(n, e, t, a, l);
  return (
    i === "x" ? c.rotateZ(Math.PI / 2) : i === "z" && c.rotateX(Math.PI / 2),
    c.translate(s, o, r),
    c
  );
}
function dt(n, e, t = 0.03, i = 5, s = !1) {
  ((n = lu(n)), (e = lu(e)));
  let o = new K().subVectors(e, n),
    r = o.length();
  if (r < 1e-5) return null;
  let a = vt(t, t, r, i, !s);
  return (
    gw.setFromUnitVectors(xw, o.multiplyScalar(1 / r)),
    zg.compose(new K().addVectors(n, e).multiplyScalar(0.5), gw, gP),
    a.applyMatrix4(zg),
    a
  );
}
function v0(n, e, t = 0.3, i = 0.3, s = 0) {
  ((n = lu(n)), (e = lu(e)));
  let o = new K().subVectors(e, n),
    r = o.length();
  o.multiplyScalar(1 / r);
  let a = new K().crossVectors(o, xw);
  a.lengthSq() < 1e-6 ? a.set(1, 0, 0) : a.normalize();
  let l = new K().crossVectors(a, o),
    c = s > 0 ? Ei(t, r, i, s) : ot(t, r, i);
  return (
    zg
      .makeBasis(a, o, l)
      .setPosition((n.x + e.x) / 2, (n.y + e.y) / 2, (n.z + e.z) / 2),
    c.applyMatrix4(zg),
    c
  );
}
function ia(n, e = 0.03, t = 5) {
  let i = [];
  for (let s = 0; s < n.length - 1; s++) {
    let o = dt(n[s], n[s + 1], e, t);
    o && i.push(o);
  }
  return i;
}
function Ua(n, e, t = 1, i = 10) {
  ((n = lu(n)), (e = lu(e)));
  let s = [];
  for (let o = 0; o <= i; o++) {
    let r = o / i,
      a = new K().lerpVectors(n, e, r);
    ((a.y -= t * 4 * r * (1 - r)), s.push(a));
  }
  return s;
}
function cu(n, e, t, i, s, o = 0, r = 0) {
  let a = new w0(n, e);
  return (r && a.rotateX(r), o && a.rotateY(o), a.translate(t, i, s), a);
}
function os(
  n,
  e,
  t,
  { h: i = 1.1, post: s = 2.2, r: o = 0.022, tint: r, mid: a = !0 } = {},
) {
  t = t.map(lu);
  for (let l = 0; l < t.length - 1; l++) {
    let c = t[l],
      u = t[l + 1],
      f = c.distanceTo(u),
      h = Math.max(1, Math.round(f / s));
    for (let p = l === 0 ? 0 : 1; p <= h; p++) {
      let d = new K().lerpVectors(c, u, p / h);
      n.add(e, dt(d, Ft(d.x, d.y + i, d.z), o, 4), r);
    }
    (n.add(e, dt(Ft(c.x, c.y + i, c.z), Ft(u.x, u.y + i, u.z), o * 1.15, 5), r),
      a &&
        n.add(
          e,
          dt(
            Ft(c.x, c.y + i * 0.5, c.z),
            Ft(u.x, u.y + i * 0.5, u.z),
            o * 0.9,
            4,
          ),
          r,
        ));
  }
}
function bw() {
  let n = { value: 0 },
    e = new An({ vertexColors: !0, fog: !1 });
  ((e.onBeforeCompile = (i) => {
    ((i.uniforms.uTime = n),
      (i.vertexShader =
        `attribute vec3 blink;
uniform float uTime;
varying float vBlink;
` +
        i.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
 float bph = fract(uTime / max(blink.x, 0.001) + blink.y);
 vBlink = blink.x <= 0.0 ? 1.0 : mix(0.02, 1.0, smoothstep(0.0, 0.06, bph) * (1.0 - smoothstep(blink.z, blink.z + 0.12, bph)));`,
        )),
      (i.fragmentShader =
        `varying float vBlink;
` +
        i.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
 diffuseColor.rgb *= vBlink;`,
        )));
  }),
    (e.customProgramCacheKey = () => "saltline-blink"));
  let t = [];
  return {
    uTime: n,
    mat: e,
    add(i, s, o = 0, r = 0, a = 0.5) {
      if (!i) return;
      let l = i.index ? i.toNonIndexed() : i,
        c = l.attributes.position.count,
        u = new Float32Array(c * 3),
        f = new Float32Array(c * 3);
      for (let p = 0; p < c; p++)
        ((u[p * 3] = s[0]),
          (u[p * 3 + 1] = s[1]),
          (u[p * 3 + 2] = s[2]),
          (f[p * 3] = o),
          (f[p * 3 + 1] = r),
          (f[p * 3 + 2] = a));
      let h = new pt();
      (h.setAttribute("position", l.attributes.position),
        h.setAttribute("color", new nt(u, 3)),
        h.setAttribute("blink", new nt(f, 3)),
        t.push(h));
    },
    build() {
      if (!t.length) return null;
      let i = new ht(Tr(t.splice(0), !1), e);
      return ((i.castShadow = !1), (i.receiveShadow = !1), i);
    },
  };
}
var Rn = (n, e, t, i = 0.12) => {
  let s = new Sl(i, 0);
  return (s.translate(n, e, t), s);
};
var r0 = 18.5,
  rs = 28.5,
  Li = 5.4,
  kv = 21.2,
  Qn = 22.8,
  Cn = 1.8,
  Po = 12,
  Zi = 62,
  js = 41,
  K0 = [0.82, 0.95, 1.12],
  zs = [0.6, 0.72, 0.86],
  J0 = [1, 0.95, 0.85],
  uu = [0.95, 0.96, 0.97];
function Dg(n, e, t = {}) {
  let i = !!t.into,
    s = t.dz || 0,
    o = t.into || new ho(),
    r = i
      ? {
          add(P, D, B, X, re) {
            (P.translate(0, 0, s), e.add(P, D, B, X, re));
          },
        }
      : e,
    a = po(n, "paint_grey"),
    l = po(n, "paint_yellow"),
    c = po(n, "paint_white"),
    u = po(n, "paint_red"),
    f = n.mats.get("steel_galv"),
    h = n.mats.get("steel_dark"),
    p = n.mats.get("hazard_stripes"),
    d = n.mats.get("glass"),
    m = n.mats.emissive(16769716, 6),
    x = (P, D, B) => o.add(P, D, B),
    v = [];
  if (i) {
    let P = new Map([
        [a.uuid, [0.2, 0.25, 0.31]],
        [l.uuid, [0.72, 0.52, 0.12]],
        [c.uuid, [0.78, 0.78, 0.76]],
        [u.uuid, [0.5, 0.14, 0.1]],
        [f.uuid, [0.5, 0.52, 0.54]],
        [h.uuid, [0.1, 0.1, 0.11]],
        [p.uuid, [0.7, 0.5, 0.1]],
      ]),
      D = t.mat;
    ((o.remap = (B, X) => {
      let re = P.get(B.uuid);
      return re
        ? [D, X ? [re[0] * X[0], re[1] * X[1], re[2] * X[2]] : re]
        : null;
    }),
      (o.dz = s),
      (o.minSize = 2.6));
  }
  function y(P, D) {
    let B = P < 23.5 ? 1 : -1;
    for (let X of [-1.12, 1.12]) {
      let re = D + X;
      x(l, Pe(P - 0.3, 0.36, re - 0.98, P + 0.3, 0.84, re + 0.98, 0.04), J0);
      for (let Y of [-0.56, 0.56])
        (x(h, Pt(0.33, 0.33, 0.14, "x", P, 0.33, re + Y, 16)),
          x(h, Pt(0.37, 0.37, 0.025, "x", P - 0.085, 0.33, re + Y, 16)),
          x(h, Pt(0.37, 0.37, 0.025, "x", P + 0.085, 0.33, re + Y, 16)),
          x(f, Pt(0.11, 0.11, 0.7, "x", P, 0.33, re + Y, 8)));
      (x(h, Pt(0.16, 0.16, 0.5, "z", P + B * 0.5, 0.6, re, 10)),
        x(
          l,
          Pe(
            P + B * 0.3,
            0.42,
            re - 0.56 - 0.16,
            P + B * 0.62,
            0.8,
            re - 0.3,
            0.03,
          ),
          J0,
        ));
    }
    (x(h, Pe(P - 0.2, 0.1, D - 0.22, P + 0.2, 0.9, D + 0.22, 0.03)),
      x(a, Pe(P - 0.34, 0.9, D - 1.8, P + 0.34, 1.42, D + 1.8, 0.05), K0));
    for (let X of [-1.12, 0, 1.12])
      x(f, Pt(0.14, 0.14, 0.8, "x", P, X ? 1.08 : 1.22, D + X, 10));
    x(a, Pe(P - 0.54, 1.42, D - 0.54, P + 0.54, 1.6, D + 0.54, 0.03), zs);
    for (let X of [-1, 1]) {
      let re = D + X * 2.1;
      (x(l, Pe(P - 0.16, 0.44, re - 0.12, P + 0.16, 0.8, re + 0.12, 0.02), J0),
        x(f, Pt(0.08, 0.08, 0.34, "z", P, 0.62, re + X * 0.28, 8)),
        x(h, Pt(0.17, 0.15, 0.12, "z", P, 0.62, re + X * 0.5, 12)),
        x(p, Pe(P - 0.28, 0.04, re + X * 0.13, P + 0.28, 0.4, re + X * 0.16)));
    }
    (v.push({ min: [P - 0.5, 0, D - 2.7], max: [P + 0.5, 1.5, D + 2.7] }),
      v.push({
        min: [P - 0.62, 0, D - 0.62],
        max: [P + 0.62, 24, D + 0.62],
      }));
  }
  let b = [3.6, 7.6, 11.2, 12.5, 13.5, 17.2, 20.6, 23.8];
  for (let P of [r0, rs])
    for (let D of [-Li, Li]) {
      (y(P, D), x(p, Pe(P - 0.6, 1.6, D - 0.6, P + 0.6, 3.6, D + 0.6, 0.04)));
      for (let B = 0; B < b.length - 1; B++)
        (x(a, Pe(P - 0.6, b[B], D - 0.6, P + 0.6, b[B + 1], D + 0.6, 0.05), K0),
          (B === 0 || B === 1 || B === 5) &&
            x(
              a,
              Pe(
                P - 0.64,
                b[B] - 0.05,
                D - 0.64,
                P + 0.64,
                b[B] + 0.05,
                D + 0.64,
              ),
              zs,
            ));
    }
  let g = n.mats.decal("hazard_voltage");
  for (let P of [-Li, Li]) {
    let D = r0 - 0.6;
    (x(
      c,
      Pe(D - 0.035, 1.72, P - 0.36, D, 3.48, P + 0.36, 0.012),
      [0.62, 0.66, 0.7],
    ),
      x(h, Pe(D - 0.05, 1.66, P - 0.42, D - 0.005, 1.72, P + 0.42)),
      x(h, Pe(D - 0.05, 3.48, P - 0.42, D - 0.005, 3.54, P + 0.42)),
      x(h, Pe(D - 0.05, 1.66, P - 0.42, D - 0.005, 3.54, P - 0.36)),
      x(h, Pe(D - 0.05, 1.66, P + 0.36, D - 0.005, 3.54, P + 0.42)),
      x(
        f,
        dt([D - 0.08, 2.45, P + 0.26], [D - 0.08, 2.75, P + 0.26], 0.014, 5),
      ));
    for (let B of [2, 3.2])
      x(h, Pe(D - 0.06, B - 0.07, P - 0.37, D - 0.03, B + 0.07, P - 0.33));
    (x(f, Pe(D - 0.3, 1.5, P - 0.4, D, 1.56, P + 0.4)),
      x(f, Pe(D - 0.3, 1, P - 0.4, D - 0.02, 1.05, P + 0.4)),
      x(g.material, cu(0.3, 0.3, D - 0.04, 3.1, P, -Math.PI / 2)));
  }
  for (let P of [r0, rs]) {
    x(a, Pe(P - 0.45, 3.6, -Li + 0.6, P + 0.45, 4.6, Li - 0.6, 0.05), K0);
    for (let D of [-2.4, 0, 2.4])
      x(a, Pe(P - 0.48, 3.58, D - 0.03, P + 0.48, 4.62, D + 0.03), zs);
  }
  (x(l, Pt(1.15, 1.15, 0.06, "x", r0 - 0.62, 5.85, -2.2, 24), J0),
    x(l, Pt(1.15, 1.15, 0.06, "x", r0 - 1.02, 5.85, -2.2, 24), J0),
    x(h, Pt(0.7, 0.7, 0.36, "x", r0 - 0.82, 5.85, -2.2, 20)),
    x(f, Pt(0.12, 0.12, 0.9, "x", r0 - 0.6, 5.85, -2.2, 8)),
    x(a, Pe(r0 - 0.5, 4.6, -2.5, r0 + 0.3, 5.9, -1.9, 0.03), zs),
    x(
      h,
      dt([r0 - 0.82, 4.75, -2.2 + 1], [r0 - 0.82, 0.02, -1.2 + 0.3], 0.035, 6),
    ),
    x(f, Pe(r0 - 1, 0, -1.15, r0 - 0.64, 0.5, -0.65, 0.02)),
    v.push({ min: [r0 - 1, 0, -1.15], max: [r0 - 0.64, 0.5, -0.65] }),
    x(c, Pe(r0 - 0.42, 4.6, 1, r0 + 0.42, 6.3, 3.6, 0.03), uu));
  for (let P of [1.65, 2.3, 2.95])
    x(h, Pe(r0 - 0.44, 4.7, P - 0.01, r0 - 0.42, 6.2, P + 0.01));
  x(f, Pe(r0 - 0.47, 5.6, 1.2, r0 - 0.42, 6.1, 1.55));
  for (let P of [-Li, Li]) {
    x(a, Pe(r0 + 0.6, 12.5, P - 0.45, rs - 0.6, 13.5, P + 0.45, 0.05), K0);
    for (let B of [21, 23.5, 26])
      x(a, Pe(B - 0.03, 12.48, P - 0.48, B + 0.03, 13.52, P + 0.48), zs);
    let D = Math.sign(P);
    (x(a, v0([r0 + 0.5, 9.6, P], [r0 + 3.4, 12.6, P], 0.4, 0.4, 0.03), K0),
      x(a, v0([rs - 0.5, 9.6, P], [rs - 3.4, 12.6, P], 0.4, 0.4, 0.03), K0));
    for (let B of [r0, rs])
      x(
        a,
        v0([B, 9.6, P - D * 0.5], [B, 12.6, P - D * 3.4], 0.4, 0.4, 0.03),
        K0,
      );
    (x(a, dt([rs - 0.4, 13.7, P], [r0 + 0.4, 22.7, P], 0.2, 10), K0),
      x(a, dt([r0 + 0.4, 13.7, P], [rs - 0.4, 22.7, P], 0.2, 10), K0),
      x(
        a,
        Pe(23.5 - 0.5, 17.7, P - 0.24, 23.5 + 0.5, 18.7, P + 0.24, 0.03),
        zs,
      ),
      x(a, Pe(r0 + 0.6, 22.95, P - 0.35, rs - 0.6, 23.7, P + 0.35, 0.04), K0));
  }
  for (let P of [r0, rs]) {
    (x(a, Pe(P - 0.45, 12.5, -Li + 0.6, P + 0.45, 13.5, Li - 0.6, 0.05), K0),
      x(a, Pe(P - 0.45, 22.8, -Li + 0.6, P + 0.45, 23.8, Li - 0.6, 0.05), K0));
    for (let D of [-1, 1])
      x(
        a,
        v0(
          [P, 20.2, D * (Li - 0.5)],
          [P, 22.8, D * (Cn + 1.2)],
          0.36,
          0.36,
          0.03,
        ),
        K0,
      );
  }
  (x(f, Pe(r0 + 0.9, 13.5, 4.05, rs - 0.9, 13.55, 4.95)),
    os(
      o,
      l,
      [
        [r0 + 0.9, 13.55, 4.08],
        [rs - 0.9, 13.55, 4.08],
      ],
      { tint: J0 },
    ),
    x(f, Pe(r0 + 0.45, 13.45, -4.6, r0 + 1.25, 13.5, 4.05)),
    os(
      o,
      l,
      [
        [r0 + 1.22, 13.5, -4.6],
        [r0 + 1.22, 13.5, 4.05],
      ],
      { tint: J0 },
    ));
  let E = rs + 1.3;
  for (let P of [-1, 1]) {
    let D = P * Cn,
      B = [
        Po,
        15.4,
        r0,
        22,
        25.2,
        rs,
        E - 0.15,
        E + 0.15,
        34.6,
        39.2,
        43.8,
        48.4,
        53,
        57.6,
        Zi,
      ];
    for (let Y = 0; Y < B.length - 1; Y++)
      Y !== 6 &&
        (x(a, Pe(B[Y], kv, D - 0.45, B[Y + 1], Qn, D + 0.45, 0.05), K0),
        Y > 0 &&
          Y !== 7 &&
          x(
            a,
            Pe(
              B[Y] - 0.035,
              kv - 0.05,
              D - 0.5,
              B[Y] + 0.035,
              Qn + 0.05,
              D + 0.5,
            ),
            zs,
          ));
    (x(
      a,
      Pe(E - 0.7, Qn - 0.1, D - 0.52, E + 0.7, Qn + 0.55, D - 0.4, 0.03),
      zs,
    ),
      x(
        a,
        Pe(E - 0.7, Qn - 0.1, D + 0.4, E + 0.7, Qn + 0.55, D + 0.52, 0.03),
        zs,
      ),
      x(f, Pt(0.16, 0.16, 1.2, "z", E, Qn + 0.22, D, 12)),
      x(
        h,
        Pe(
          Po + 0.3,
          Qn,
          D - P * 0.32 - 0.05,
          Zi - 0.3,
          Qn + 0.09,
          D - P * 0.32 + 0.05,
        ),
      ));
    let X = D + P * 0.45,
      re = D + P * 1.35;
    x(f, Pe(Po + 0.2, 21.86, Math.min(X, re), Zi - 0.2, 21.9, Math.max(X, re)));
    for (let Y = Po + 0.6; Y < Zi; Y += 2.45)
      (x(a, v0([Y, 21.84, X], [Y, 21.3, X], 0.07, 0.07), zs),
        x(a, v0([Y, 21.82, re], [Y, 21.36, X], 0.06, 0.08), zs));
    (os(
      o,
      l,
      [
        [Po + 0.2, 21.9, re - P * 0.03],
        [Zi - 0.2, 21.9, re - P * 0.03],
      ],
      { post: 2.45, tint: J0 },
    ),
      x(
        l,
        Pe(
          Po + 0.2,
          21.9,
          re - P * 0.03 - 0.008,
          Zi - 0.2,
          22.02,
          re - P * 0.03 + 0.008,
        ),
        J0,
      ));
    for (let Y of [44, 58])
      x(a, Pe(Y - 0.18, Qn, D - 0.2, Y + 0.18, Qn + 1.5, D + 0.2, 0.03), K0);
  }
  for (let P of [44, 58])
    x(
      a,
      Pe(P - 0.2, Qn + 1.2, -Cn - 0.3, P + 0.2, Qn + 1.6, Cn + 0.3, 0.04),
      K0,
    );
  for (let P of [Po + 0.25, Zi - 0.25]) {
    x(
      a,
      Pe(P - 0.25, kv + 0.1, -Cn + 0.45, P + 0.25, Qn - 0.1, Cn - 0.45, 0.05),
      K0,
    );
    let D = P < 30 ? 1 : -1;
    for (let B of [-0.8, 0.8])
      x(h, Pt(0.14, 0.14, 0.4, "x", P + D * 0.45, 22, B, 10));
  }
  (x(f, Pe(Zi - 0.1, 21.86, -Cn - 1.35, Zi + 0.9, 21.9, Cn + 1.35)),
    os(
      o,
      l,
      [
        [Zi - 0.1, 21.9, -Cn - 1.32],
        [Zi + 0.87, 21.9, -Cn - 1.32],
        [Zi + 0.87, 21.9, Cn + 1.32],
        [Zi - 0.1, 21.9, Cn + 1.32],
      ],
      { post: 1.4, tint: J0 },
    ),
    x(f, dt([Zi + 0.6, 21.9, 0], [Zi + 0.6, 25.2, 0], 0.035, 6)),
    x(f, dt([Zi + 0.6, 24.8, -0.45], [Zi + 0.6, 24.8, 0.45], 0.015, 4)),
    r.add(Rn(Zi + 0.6, 25.32, 0, 0.13), [9, 0.5, 0.25], 2.6, 0.5, 0.45),
    x(h, Pt(0.1, 0.12, 0.1, "y", Zi + 0.6, 25.2, 0, 8)));
  let M = 27.6,
    _ = 30,
    T = 1.5;
  for (let P of [-1, 1]) {
    (x(a, v0([rs, 23.8, P * Li], [M, _, P * T], 0.55, 0.55, 0.04), K0),
      x(a, v0([r0, 23.8, P * Li], [M, _, P * T], 0.5, 0.5, 0.04), K0));
    for (let [D, B] of [
      [44, 0.1],
      [58, 0.1],
    ]) {
      let X = Ft(M + 0.3, _, P * T),
        re = Ft(D, Qn + 1.45, P * Cn);
      x(a, dt(X, re, B, 8), K0);
      let Y = X.clone().lerp(re, 0.5);
      x(
        a,
        Pe(
          Y.x - 0.3,
          Y.y - 0.16,
          Y.z - 0.14,
          Y.x + 0.3,
          Y.y + 0.16,
          Y.z + 0.14,
          0.03,
        ),
        zs,
      );
    }
    (x(h, dt([M + 0.2, _ + 0.35, P * 0.9], [50, Qn + 0.2, P * 1], 0.022, 5)),
      x(h, Pt(0.5, 0.5, 0.18, "z", M, _ + 0.25, P * 0.9, 16)));
  }
  x(a, Pe(M - 0.45, _ - 0.35, -T - 0.5, M + 0.45, _ + 0.3, T + 0.5, 0.05), K0);
  {
    let P = (re, Y) =>
        Ft(
          rs + (M - rs) * re,
          23.8 + (_ - 23.8) * re,
          Y * (Li + (T - Li) * re),
        ),
      D = (re, Y) =>
        Ft(
          r0 + (M - r0) * re,
          23.8 + (_ - 23.8) * re,
          Y * (Li + (T - Li) * re),
        );
    (x(a, v0(P(0.5, -1), P(0.5, 1), 0.3, 0.3, 0.02), K0),
      x(a, v0(D(0.55, -1), D(0.55, 1), 0.3, 0.3, 0.02), K0),
      x(a, dt(D(0.55, -1), P(0.5, -1), 0.09, 6), K0),
      x(a, dt(D(0.55, 1), P(0.5, 1), 0.09, 6), K0));
    let B = P(0.02, 1),
      X = P(0.97, 1);
    for (let re of [-0.22, 0.22])
      x(
        f,
        dt([B.x - 0.42, B.y, B.z + re], [X.x - 0.42, X.y, X.z + re], 0.02, 4),
      );
    for (let re = 0.03; re < 1; re += 0.045) {
      let Y = B.clone().lerp(X, re);
      x(
        f,
        dt(
          [Y.x - 0.42, Y.y, Y.z - 0.22],
          [Y.x - 0.42, Y.y, Y.z + 0.22],
          0.012,
          4,
        ),
      );
    }
  }
  x(a, Pe(Po + 0.05, Qn, -3.6, Po + 0.55, Qn + 0.4, 3.6, 0.04), K0);
  for (let P of [-1, 1])
    (x(
      a,
      Pe(
        Po + 0.08,
        Qn + 0.4,
        P * 3.3 - 0.2,
        Po + 0.52,
        Qn + 1,
        P * 3.3 + 0.2,
        0.03,
      ),
      zs,
    ),
      x(a, dt([M - 0.3, _, P * T], [Po + 0.3, Qn + 0.8, P * 3.3], 0.1, 8), K0),
      x(f, Pt(0.12, 0.12, 0.6, "z", Po + 0.3, Qn + 0.8, P * 3.3, 10)));
  (x(f, Pe(M - 1, _ + 0.3, -T - 0.6, M + 1, _ + 0.34, T + 0.6)),
    os(
      o,
      l,
      [
        [M - 0.98, _ + 0.34, -T - 0.58],
        [M + 0.98, _ + 0.34, -T - 0.58],
        [M + 0.98, _ + 0.34, T + 0.58],
        [M - 0.98, _ + 0.34, T + 0.58],
        [M - 0.98, _ + 0.34, -T - 0.58],
      ],
      { post: 1.2, tint: J0 },
    ),
    x(f, dt([M, _ + 0.34, 0], [M, _ + 2, 0], 0.045, 6)),
    x(f, dt([M, _ + 2, 0], [M, _ + 3.6, 0], 0.016, 4)),
    x(f, dt([M - 0.5, _ + 1.5, 0], [M + 0.5, _ + 1.5, 0], 0.018, 4)));
  for (let P of [-0.5, 0.5])
    (x(h, Pt(0.1, 0.12, 0.1, "y", M + P, _ + 1.56, 0, 8)),
      r.add(Rn(M + P, _ + 1.72, 0, 0.15), [10, 0.5, 0.25], 2.6, 0, 0.45));
  let w = 20.4,
    S = 27.9,
    R = Qn,
    z = 26,
    I = 2.9;
  (x(c, Pe(w, R, -I, S, z, I, 0.06), uu),
    x(
      a,
      Pe(w - 0.15, R - 0.12, -I - 0.15, S + 0.15, R + 0.1, I + 0.15, 0.03),
      zs,
    ),
    x(f, Pe(w - 0.2, z, -I - 0.2, S + 0.2, z + 0.12, I + 0.2, 0.03)));
  for (let P = w + 1.3; P < S; P += 1.3)
    for (let D of [-1, 1])
      x(
        c,
        Pe(P - 0.02, R + 0.1, D * I - 0.015, P + 0.02, z, D * I + 0.015),
        [0.7, 0.72, 0.74],
      );
  function L(P, D, B, X, re, Y) {
    let he = [Pe(-X / 2, -re / 2, 0, X / 2, re / 2, 0.02)],
      V = Math.round(re / 0.12);
    for (let ne = 0; ne < V; ne++) {
      let ye = Pe(-X / 2 + 0.03, -0.012, 0, X / 2 - 0.03, 0.012, 0.11);
      (ye.rotateX(0.7),
        ye.translate(0, -re / 2 + (ne + 0.5) * (re / V), 0.03),
        he.push(ye));
    }
    for (let ne of he) (ne.rotateY(Y), ne.translate(P, D, B));
    (x(h, he.shift()), x(f, he));
  }
  for (let P of [-1, 1])
    for (let D of [w + 1.4, w + 3.9, w + 6.1])
      L(D, 24.5, P * (I + 0.005), 1.5, 1.3, P > 0 ? 0 : Math.PI);
  (L(w - 0.005, 23.75, -1.9, 1.4, 1.1, -Math.PI / 2),
    x(
      c,
      Pe(w - 0.03, R + 0.15, 0.8, w, R + 2.15, 1.7, 0.01),
      [0.6, 0.64, 0.68],
    ),
    x(f, dt([w - 0.06, R + 1, 1.55], [w - 0.06, R + 1.3, 1.55], 0.014, 5)),
    x(f, Pe(w - 0.9, R + 0.05, 0.3, w, R + 0.1, 2.2)),
    os(
      o,
      l,
      [
        [w, R + 0.1, 0.32],
        [w - 0.88, R + 0.1, 0.32],
        [w - 0.88, R + 0.1, 2.18],
        [w, R + 0.1, 2.18],
      ],
      { post: 1, tint: J0 },
    ));
  let U = n.mats.decal("logo_a");
  (x(
    U.material,
    cu(1.1 * Math.min(3, U.aspect || 1), 1.1, w - 0.012, 25.2, 0, -Math.PI / 2),
  ),
    os(
      o,
      l,
      [
        [w, z + 0.12, -I],
        [S, z + 0.12, -I],
        [S, z + 0.12, I],
        [w, z + 0.12, I],
        [w, z + 0.12, -I],
      ],
      { post: 1.95, tint: J0 },
    ));
  for (let P of [w + 1.9, w + 5.6])
    (x(f, Pt(0.28, 0.28, 0.5, "y", P, z + 0.37, -1.2, 10)),
      x(f, Pt(0.1, 0.5, 0.22, "y", P, z + 0.72, -1.2, 10)));
  (x(h, Pt(0.13, 0.13, 1.6, "y", w + 3.7, z + 0.9, 1.9, 8)),
    x(h, Pt(0.2, 0.14, 0.2, "y", w + 3.7, z + 1.75, 1.9, 8)),
    x(
      c,
      Pe(w + 5.4, z + 0.12, 0.4, w + 6.7, z + 0.85, 1.8, 0.03),
      [0.7, 0.72, 0.75],
    ),
    x(f, dt([w + 0.3, z + 0.12, 2.5], [w + 0.3, z + 1.9, 2.5], 0.03, 5)),
    r.add(Rn(w + 0.3, z + 2.02, 2.5, 0.13), [9, 0.5, 0.25], 2.6, 0.25, 0.45));
  let k = 6.15,
    C = 6.97,
    A = 7.8,
    F = [19.4, 20.6],
    H = [26.4, 27.6];
  function N(P, D, B, X, re, Y) {
    let he = X - D,
      V = Math.max(2, Math.round(he / 0.21));
    for (let ne of [re + 0.03, Y - 0.03]) {
      (x(f, v0([P, D - 0.12, ne], [B, X - 0.12, ne], 0.05, 0.24)),
        x(l, dt([P, D + 1, ne], [B, X + 1, ne], 0.024, 5), J0),
        x(l, dt([P, D + 0.5, ne], [B, X + 0.5, ne], 0.018, 4), J0));
      for (let ye = 0; ye <= 4; ye++) {
        let Te = ye / 4,
          Re = P + (B - P) * Te,
          Ue = D + he * Te;
        x(l, dt([Re, Ue - 0.05, ne], [Re, Ue + 1, ne], 0.02, 4), J0);
      }
    }
    for (let ne = 1; ne <= V; ne++) {
      let ye = (ne - 0.5) / V,
        Te = P + (B - P) * ye,
        Re = D + he * (ne / V);
      x(f, Pe(Te - 0.13, Re - 0.03, re + 0.06, Te + 0.13, Re, Y - 0.06));
    }
  }
  function Z(P, D, B, X) {
    (x(f, Pe(P, B - 0.05, k, D, B, A)),
      x(f, Pe(P, B - 0.2, k, D, B - 0.05, k + 0.06)),
      x(f, Pe(P, B - 0.2, A - 0.06, D, B - 0.05, A)));
    let re = X > 0 ? D - 0.03 : P + 0.03,
      Y = X > 0 ? P : D;
    os(
      o,
      l,
      [
        [Y, B, A - 0.03],
        [re, B, A - 0.03],
        [re, B, k + 0.03],
      ],
      { post: 0.9, tint: J0 },
    );
  }
  let Q = [3.6, 6.9, 10.2, 13.5, 16.8, 20.1];
  for (let P = 0; P < 5; P++)
    P % 2 === 0
      ? (Z(F[0], F[1], Q[P], -1), N(F[1], Q[P], H[0], Q[P + 1], k, C))
      : (Z(H[0], H[1], Q[P], 1), N(H[0], Q[P], F[1], Q[P + 1], C, A));
  (Z(H[0], H[1], Q[5], 1),
    N(H[0], Q[5], 23.4, 21.9, C, A),
    x(f, Pe(22.5, 21.85, Cn + 1.35, 23.4, 21.9, A)),
    os(
      o,
      l,
      [
        [22.53, 21.9, Cn + 1.4],
        [22.53, 21.9, A - 0.03],
        [23.37, 21.9, A - 0.03],
      ],
      { post: 1.3, tint: J0 },
    ),
    os(
      o,
      l,
      [
        [23.37, 21.9, Cn + 1.4],
        [23.37, 21.9, C],
      ],
      { post: 1.3, tint: J0 },
    ),
    x(f, Pe(H[0], 13.45, 4.95, H[1], 13.5, k)));
  for (let P of [F[0], H[1]])
    for (let D of [k - 0.05, A + 0.05])
      x(a, Pe(P - 0.07, 3.3, D - 0.07, P + 0.07, 21.4, D + 0.07), K0);
  for (let P = 0; P < Q.length; P++) {
    let D = Q[P] - 0.25;
    x(a, Pe(F[0], D - 0.06, A + 0, H[1], D + 0.06, A + 0.1), zs);
    for (let B of [F[0], H[1]])
      x(a, Pe(B - 0.05, D - 0.06, 5.9, B + 0.05, D + 0.06, A + 0.1), zs);
    if (P < Q.length - 1) {
      let B = Q[P + 1] - 0.25;
      (x(a, dt([F[0], D, A + 0.05], [H[1], B, A + 0.05], 0.03, 5), K0),
        x(a, dt([H[1], D, A + 0.05], [F[0], B, A + 0.05], 0.03, 5), K0));
    }
  }
  {
    let P = F[0] - 0.05,
      D = 7.35;
    for (let X of [-0.22, 0.22])
      x(f, dt([P, 0.05, D + X], [P, 4.75, D + X], 0.022, 5));
    for (let X = 0.3; X < 4.7; X += 0.3)
      x(f, dt([P, X, D - 0.22], [P, X, D + 0.22], 0.012, 4));
    let B = (X) => {
      let re = [];
      for (let Y = 0; Y <= 8; Y++) {
        let he = (Math.PI * Y) / 8;
        re.push(Ft(P - Math.sin(he) * 0.7, X, D - Math.cos(he) * 0.36));
      }
      return re;
    };
    for (let X = 2.3; X <= 4.75; X += 0.6) x(f, ia(B(X), 0.012, 4));
    for (let X = 1; X < 8; X += 1.5) {
      let re = (Math.PI * X) / 8;
      x(
        f,
        dt(
          [P - Math.sin(re) * 0.7, 2.3, D - Math.cos(re) * 0.36],
          [P - Math.sin(re) * 0.7, 4.75, D - Math.cos(re) * 0.36],
          0.01,
          4,
        ),
      );
    }
    v.push({
      min: [P - 0.72, 0, D - 0.4],
      max: [P + 0.05, 4.7, D + 0.4],
      bulletOnly: !1,
    });
  }
  x(h, Pe(13, 21.02, -Cn - 0.95, js - 1.2, 21.12, -Cn - 0.85));
  for (let P = 13.5; P < js - 1.2; P += 3.3)
    x(h, Pe(P - 0.03, 21.1, -Cn - 0.93, P + 0.03, 21.86, -Cn - 0.87));
  {
    let B = (js - 1.6 - 13.6) / 15;
    for (let X = 0; X < 15; X++) {
      let re = 13.6 + X * B,
        Y = 1.1 + 0.25 * Math.sin(X * 2.1);
      x(h, Pe(re - 0.1, 20.9, -Cn - 0.98, re + 0.1, 21.02, -Cn - 0.82));
      for (let he of [-0.05, 0.05]) {
        let V = [];
        for (let ne = 0; ne <= 7; ne++) {
          let ye = ne / 7;
          V.push(
            Ft(
              re + B * ye,
              20.92 - Y * (1 - (2 * ye - 1) ** 2),
              -Cn - 0.9 + he,
            ),
          );
        }
        x(h, ia(V, 0.03, 4));
      }
    }
  }
  function W(P, D, B, X, re = "z") {
    let Y = X * 0.46;
    re === "z"
      ? x(h, Pe(P - 0.03, D, B - Y / 2, P + 0.03, D + 0.06, B + Y / 2))
      : x(h, Pe(P - Y / 2, D, B - 0.03, P + Y / 2, D + 0.06, B + 0.03));
    for (let he = 0; he < X; he++) {
      let V = (he - (X - 1) / 2) * 0.46,
        ne = re === "z" ? P : P + V,
        ye = re === "z" ? B + V : B;
      (x(h, Pe(ne - 0.17, D - 0.2, ye - 0.17, ne + 0.17, D, ye + 0.17, 0.02)),
        x(
          m,
          Pe(ne - 0.14, D - 0.215, ye - 0.14, ne + 0.14, D - 0.2, ye + 0.14),
        ));
    }
  }
  for (let P of [33, 47.5, 59.5])
    for (let D of [-1, 1]) W(P, 21.3, D * (Cn + 1.3), 3, "x");
  for (let P of [-1, 1])
    (W(23.5, 12.28, P * (Li - 0.2), 4, "x"),
      W(15, 21.3, P * (Cn + 1.3), 2, "x"));
  (W(rs + 0.1, 12.28, 0, 3, "z"),
    W(r0 - 0.1, 12.28, 0, 3, "z"),
    W(M + 0.6, _ - 0.55, 0, 3, "z"),
    x(l, Pe(js - 2.3, 21.35, -1.25, js + 2.3, 22.2, 1.25, 0.06), J0),
    x(l, Pe(js - 1.6, 20.7, -1.1, js + 1.6, 21.35, 1.1, 0.05), J0));
  for (let P of [-1.8, 1.8])
    for (let D of [-1, 1])
      (x(h, Pt(0.24, 0.24, 0.16, "z", js + P, 22.42, D * 1.3, 12)),
        x(
          l,
          Pe(
            js + P - 0.35,
            22.1,
            D * 1.3 - 0.14,
            js + P + 0.35,
            22.5,
            D * 1.3 + 0.14,
            0.03,
          ),
          J0,
        ));
  (x(h, Pt(0.42, 0.42, 1.5, "z", js - 0.9, 22.35, 0, 14)),
    x(h, Pt(0.42, 0.42, 1.5, "z", js + 0.9, 22.35, 0, 14)));
  let J = js + 0.25,
    G = js + 2.65,
    te = 2.35,
    oe = 4.4,
    ee = 18.3,
    le = 20.7;
  for (let P of [J + 0.12, G - 0.3]) {
    x(l, Pe(P - 0.12, 20.88, -1, P + 0.12, 21.16, oe, 0.03), J0);
    for (let D of [te + 0.1, oe - 0.1])
      x(l, Pe(P - 0.06, le, D - 0.06, P + 0.06, 20.9, D + 0.06), J0);
  }
  (x(c, Pe(J, ee, te, G, ee + 0.14, oe, 0.03), uu),
    x(
      c,
      Pe(J - 0.08, le - 0.02, te - 0.08, G + 0.12, le + 0.12, oe + 0.08, 0.03),
      uu,
    ),
    x(c, Pe(J, ee + 0.14, te, J + 0.08, le, oe), uu));
  for (let P of [te, oe - 0.06])
    (x(c, Pe(J, ee + 0.14, P, G - 0.5, ee + 0.95, P + 0.06), uu),
      x(d, Pe(J + 0.08, ee + 0.95, P + 0.02, G - 0.06, le, P + 0.04)),
      x(d, Pe(G - 0.5, ee + 0.14, P + 0.02, G - 0.06, ee + 0.95, P + 0.04)));
  for (let P of [G - 0.06])
    for (let D of [te, oe - 0.06, (te + oe) / 2 - 0.03])
      x(c, Pe(P, ee + 0.14, D, P + 0.06, le, D + 0.06), uu);
  (x(d, Pe(G - 0.04, ee + 0.14, te + 0.06, G - 0.02, le, oe - 0.06)),
    x(d, Pe(G - 0.9, ee + 0.02, te + 0.3, G - 0.1, ee + 0.04, oe - 0.3)),
    x(h, Pe(J + 0.9, ee + 0.14, 3.1, J + 1.45, ee + 0.6, 3.65, 0.04)),
    x(h, Pe(J + 0.82, ee + 0.6, 3.1, J + 0.96, ee + 1.35, 3.65, 0.04)));
  for (let P of [2.75, 4])
    (x(
      h,
      Pe(J + 1.2, ee + 0.14, P - 0.16, J + 1.75, ee + 0.85, P + 0.16, 0.03),
    ),
      r.add(
        Pe(J + 1.3, ee + 0.855, P - 0.1, J + 1.6, ee + 0.865, P + 0.1),
        [0.75, 0.5, 0.26],
        0,
      ));
  (r.add(
    Pe(J + 0.5, le - 0.045, 3, J + 1.5, le - 0.03, 3.2),
    [0.75, 0.5, 0.26],
    0,
  ),
    W(G + 0.15, ee + 0.1, 3.37, 2, "z"),
    x(f, Pe(J - 0.9, ee + 0.1, te, J, ee + 0.14, oe)),
    os(
      o,
      l,
      [
        [J, ee + 0.14, te + 0.03],
        [J - 0.87, ee + 0.14, te + 0.03],
        [J - 0.87, ee + 0.14, oe - 0.03],
        [J, ee + 0.14, oe - 0.03],
      ],
      { post: 1, tint: J0 },
    ));
  let xe = n.mats.label("SALTLINE 04", {
      color: "white",
      font: "stencil",
      distress: 0.35,
    }),
    j = Math.max(1, xe.aspect || 6);
  {
    let P = Math.min(1.15, 8.6 / j);
    for (let D of [-1, 1])
      x(
        xe.material,
        cu(P * j, P, 36.9, 22, D * (Cn + 0.453), D > 0 ? 0 : Math.PI),
      );
  }
  {
    let P = Math.min(0.86, 9.4 / j);
    x(xe.material, cu(P * j, P, r0 - 0.453, 13, 0, -Math.PI / 2));
  }
  if (i) return ((o.remap = null), (o.dz = 0), (o.minSize = 0), null);
  let O = o.build({ cast: !0, recv: !0 });
  O.name = "crane";
  let q = new ho(),
    ue = (P, D, B) => q.add(P, D, B),
    de = 8.3;
  for (let P of [-0.9, 0.9])
    for (let D of [-0.8, 0.8])
      ue(h, dt([P, 0, D], [P * 0.8, -de, D * 0.7], 0.022, 5));
  ue(l, Pe(-0.95, -de - 0.55, -0.75, 0.95, -de, 0.75, 0.05), J0);
  for (let P of [-0.45, 0.45])
    ue(h, Pt(0.3, 0.3, 0.12, "z", 0, -de + 0.12, P, 12));
  let $ = -de - 0.55,
    se = $ - 0.34;
  for (let P of [-0.6, 0.6])
    ue(l, Pe(P - 0.16, se, -6.02, P + 0.16, $, 6.02, 0.03), J0);
  for (let P of [-5.92, 5.92])
    ue(l, Pe(-1.22, se, P - 0.14, 1.22, $, P + 0.14, 0.03), J0);
  ue(l, Pe(-0.9, se - 0.02, -1.3, 0.9, $ + 0.1, 1.3, 0.04), J0);
  for (let P of [-1.2, 1.2])
    for (let D of [-6, 6])
      (ue(h, Pe(P - 0.1, se - 0.1, D - 0.1, P + 0.1, se + 0.05, D + 0.1)),
        ue(
          l,
          v0(
            [P * 1.02, se, D * 1.01],
            [P * 1.22, se - 0.55, D * 1.04],
            0.28,
            0.03,
          ),
          J0,
        ));
  let fe = se - 0.08,
    me = fe - 2.59,
    ge = [0.9, 0.82, 0.8];
  ue(u, Pe(-1.2, me, -6.08, 1.2, fe, 6.08, 0.03), ge);
  for (let P of [-1.22, 1.22])
    for (let D = -5.7; D <= 5.71; D += 0.57)
      ue(u, Pe(P - 0.02, me + 0.16, D - 0.1, P + 0.02, fe - 0.12, D + 0.1), ge);
  for (let P of [-6.095, 6.095])
    for (let D of [-1.22, 1.22])
      ue(
        u,
        Pe(D - 0.08, me, P - 0.08, D + 0.08, fe, P + 0.08),
        [0.7, 0.62, 0.6],
      );
  for (let P of [-0.8, -0.3, 0.3, 0.8])
    ue(h, dt([P, me + 0.08, 6.1], [P, fe - 0.08, 6.1], 0.02, 5));
  let ce = q.build({ cast: !0, recv: !0 });
  return (
    ce.position.set(js, 20.7, 0),
    (ce.userData.noMerge = !0),
    (ce.name = "crane-spreader"),
    O.add(ce),
    { root: O, spreader: ce, colliders: v, tris: o.tris + q.tris }
  );
}
function Mw(
  n,
  e,
  t,
  i,
  { s = 1, up: o = !1, tint: r = [0.3, 0.36, 0.44] } = {},
) {
  let a = [],
    l = (c, u, f, h, p, d) => a.push(Pe(c, u, f, h, p, d));
  for (let c of [-5, 5])
    for (let u of [-5.4, 5.4]) l(c - 0.6, 0, u - 0.6, c + 0.6, 24, u + 0.6);
  for (let c of [-5.4, 5.4])
    (l(-5, 12.5, c - 0.45, 5, 13.5, c + 0.45),
      l(-5, 23, c - 0.4, 5, 23.8, c + 0.4),
      a.push(v0([-5, 13.5, c], [5, 23, c], 0.4, 0.4)));
  for (let c of [-5, 5])
    (l(c - 0.45, 12.5, -5.4, c + 0.45, 13.5, 5.4),
      l(c - 0.45, 22.8, -5.4, c + 0.45, 23.8, 5.4),
      l(c - 0.45, 3.6, -5.4, c + 0.45, 4.6, 5.4));
  (l(-11.5, 21.2, -2.3, 6.3, 22.8, 2.3), l(-10.9, 22.8, -2.9, -3.1, 26, 2.9));
  for (let c of [-1, 1])
    (a.push(v0([5, 23.8, c * 5.4], [4.1, 30, c * 1.5], 0.6, 0.6)),
      a.push(v0([-5, 23.8, c * 5.4], [4.1, 30, c * 1.5], 0.5, 0.5)));
  (l(3.6, 29.6, -2, 4.6, 30.4, 2),
    o
      ? (a.push(v0([6.6, 22, 0], [10.5, 52, 0], 4.6, 1.6)),
        a.push(v0([4.1, 30, 0], [9.4, 44, 0], 0.3, 0.3)))
      : (l(6.6, 21.2, -2.3, 38.5, 22.8, 2.3),
        a.push(v0([4.1, 30, 0], [20.5, 24.3, 0], 0.3, 0.3)),
        a.push(v0([4.1, 30, 0], [34.5, 24.3, 0], 0.3, 0.3)),
        l(15, 18.3, 2.4, 19.5, 22.2, 4.4)));
  for (let c of a) (c.scale(s, s, s), c.translate(t, 0, i), n.add(e, c, r));
  return o ? [t + 10.5 * s, 52.6 * s, i] : [t + 4.1 * s, 31 * s, i];
}
var bt = 41,
  xP = 8,
  Io = -9,
  Ln = 63,
  vP = -4.4,
  Ks = 13,
  ch = -1.6,
  _w = (n, e, t) => {
    let i = Math.min(1, Math.max(0, (t - n) / (e - n)));
    return i * i * (3 - 2 * i);
  },
  yP = (n) =>
    1.7 * Math.pow(Math.max(0, 1 - n / 20), 2) +
    0.5 * Math.pow(Math.max(0, (n - (Ln - 12)) / 12), 2),
  ds = (n) => Ks + yP(n),
  l1 = (n) => 1.15 * (1 - _w(14.5, 18, n) + _w(Ln - 10.5, Ln - 8, n)),
  $o = (n) => ds(n) + l1(n),
  bP = $o(0);
function N0(n, e, t) {
  let i = (bP - e) * 0.22,
    s = Math.max(0, 1 - n / 22),
    o = Io - n - i * s,
    r = Math.min(1, Math.max(0, (e - ch) / (Ks - ch))),
    a = 17 - 8.5 * Math.pow(r, 1.3),
    l = n / a,
    c = l >= 1 ? 1 : Math.pow(Math.sin((l * Math.PI) / 2), 0.72),
    u = 0.2 + (xP - 0.2) * c,
    f = (n - (Ln - 10)) / 10;
  return (
    f > 0 && (u *= 1 - 0.24 * f * f * (1 - 0.6 * r)),
    new K(bt + t * u, e, o)
  );
}
function Ba(n, e, t) {
  let s = N0(n + 0.05, e, t).sub(N0(Math.max(0, n - 0.05), e, t)),
    o = N0(n, e + 0.05, t).sub(N0(n, e - 0.05, t)),
    r = s.cross(o).normalize();
  return (r.x * t + r.z * 0.25 < 0 && r.negate(), r);
}
function fu(n, e, t, i, s, o = 0.012, r = 6, a = 1) {
  let l = [],
    c = [],
    u = [],
    f = [];
  for (let d = 0; d <= a; d++)
    for (let m = 0; m <= r; m++) {
      let x = n + ((e - n) * m) / r,
        v = t + ((i - t) * d) / a,
        y = Ba(x, v, s),
        b = N0(x, v, s).addScaledVector(y, o);
      (l.push(b.x, b.y, b.z),
        u.push(y.x, y.y, y.z),
        c.push(s < 0 ? 1 - m / r : m / r, d / a));
    }
  let h = r + 1;
  for (let d = 0; d < a; d++)
    for (let m = 0; m < r; m++) {
      let x = d * h + m,
        v = x + 1,
        y = x + h + 1,
        b = x + h;
      s > 0 ? f.push(x, v, y, x, y, b) : f.push(x, y, v, x, b, y);
    }
  let p = new pt();
  return (
    p.setAttribute("position", new et(l, 3)),
    p.setAttribute("normal", new et(u, 3)),
    p.setAttribute("uv", new et(c, 2)),
    p.setIndex(f),
    p
  );
}
var Lg = class {
    constructor() {
      ((this.p = []), (this.n = []), (this.u = []), (this.c = []));
    }
    v(e, t, i, s, o) {
      (this.p.push(e.x, e.y, e.z),
        this.n.push(t.x, t.y, t.z),
        this.u.push(i, s),
        this.c.push(o[0], o[1], o[2]));
    }
    quad(e, t, i, s) {
      let o = e[1].clone().sub(e[0]),
        r = e[3].clone().sub(e[0]),
        a = o.cross(r).dot(t[0]) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      for (let l of a) this.v(e[l], t[l], i[l][0], i[l][1], s[l]);
    }
    geo() {
      let e = new pt();
      return (
        e.setAttribute("position", new et(this.p, 3)),
        e.setAttribute("normal", new et(this.n, 3)),
        e.setAttribute("uv", new et(this.u, 2)),
        e.setAttribute("color", new et(this.c, 3)),
        e
      );
    }
  },
  hu = (n, e) => {
    let t = Math.imul(n + 31, 374761393) ^ Math.imul(e + 17, 668265263);
    return (
      (t = Math.imul(t ^ (t >>> 13), 1274126177)),
      ((t ^ (t >>> 16)) >>> 0) / 4294967295
    );
  };
function ww(n, e) {
  let t = new ho(),
    i = po(n, "hull_paint"),
    s = po(n, "hull_red"),
    o = po(n, "paint_white"),
    r = n.mats.get("steel_dark"),
    a = n.mats.get("steel_galv"),
    l = n.mats.get("rope"),
    c = n.mats.get("rubber"),
    u = [2.6, 1.75, 0.95],
    f = (ee) => e.add(ee, u, 0),
    h = (ee, le, xe) => t.add(ee, le, xe),
    p = [0, 0.35, 0.9, 1.8, 3, 4.5, 6, 8, 10, 12, 14.5, 17, 20];
  for (let ee = 23; ee < Ln - 0.5; ee += 3) p.push(ee);
  p.push(Ln);
  let d = [0, 0.17, 0.34, 0.5, 0.66, 0.83, 1],
    m = (ee) => {
      let le = ds(ee),
        xe = [vP, -2.3, -0.4, 1];
      for (let j = 1; j < d.length; j++) xe.push(1 + (le - 1) * d[j]);
      return (xe.push($o(ee)), xe);
    },
    x = 10,
    v = 3,
    y = new Lg(),
    b = new Lg(),
    g = (ee, le, xe, j) => {
      let O = Cv(ee.x * 0.6, ee.y, ee.z * 0.6, void 0, 0.8),
        q = [O[0] * j, O[1] * j, O[2] * j];
      return (
        le < v
          ? ee.y < -0.2
            ? ((q[0] *= 0.55), (q[1] *= 0.72), (q[2] *= 0.55))
            : xe && ((q[0] *= 1.12), (q[1] *= 1), (q[2] *= 0.92))
          : ee.y < 1.1 && ((q[0] *= 1.7), (q[1] *= 1.62), (q[2] *= 1.45)),
        q
      );
    };
  for (let ee of [-1, 1])
    for (let le = 0; le < p.length - 1; le++) {
      let xe = p[le],
        j = p[le + 1],
        O = m(xe),
        q = m(j);
      for (let ue = 0; ue < x; ue++) {
        if (ue === x - 1 && l1(xe) < 0.02 && l1(j) < 0.02) continue;
        let de =
            (ue < v ? 0.8 : 0.58) + 0.36 * hu(le * 7 + (ee > 0 ? 100 : 0), ue),
          $ = [
            N0(xe, O[ue], ee),
            N0(j, q[ue], ee),
            N0(j, q[ue + 1], ee),
            N0(xe, O[ue + 1], ee),
          ],
          se = [
            Ba(xe, O[ue], ee),
            Ba(j, q[ue], ee),
            Ba(j, q[ue + 1], ee),
            Ba(xe, O[ue + 1], ee),
          ],
          fe = [
            [xe, O[ue]],
            [j, q[ue]],
            [j, q[ue + 1]],
            [xe, O[ue + 1]],
          ],
          me = [
            g($[0], ue, !1, de),
            g($[1], ue, !1, de),
            g($[2], ue, !0, de),
            g($[3], ue, !0, de),
          ];
        if (xe > 1.5 && ue >= 2 && ue < x - 1) {
          let ge = $[0]
            .clone()
            .add($[1])
            .add($[2])
            .add($[3])
            .multiplyScalar(0.25);
          for (let ce = 0; ce < 4; ce++)
            se[ce]
              .addScaledVector(ge.clone().sub($[ce]).normalize(), 0.075)
              .normalize();
        }
        (ue < v ? y : b).quad($, se, fe, me);
      }
    }
  {
    let ee = m(0),
      le = m(Ln),
      xe = Ft(0, 0.2, 1).normalize(),
      j = Ft(0, 0, -1),
      O = Ft(0, 1, 0);
    for (let q = 0; q < x; q++) {
      let ue = q < v ? [0.8, 0.8, 0.8] : [0.9, 0.9, 0.9];
      ((q < v ? y : b).quad(
        [
          N0(0, ee[q], -1),
          N0(0, ee[q], 1),
          N0(0, ee[q + 1], 1),
          N0(0, ee[q + 1], -1),
        ],
        [xe, xe, xe, xe],
        [
          [0, ee[q]],
          [0.4, ee[q]],
          [0.4, ee[q + 1]],
          [0, ee[q + 1]],
        ],
        [ue, ue, ue, ue],
      ),
        (q < v ? y : b).quad(
          [
            N0(Ln, le[q], -1),
            N0(Ln, le[q], 1),
            N0(Ln, le[q + 1], 1),
            N0(Ln, le[q + 1], -1),
          ],
          [j, j, j, j],
          [
            [0, le[q]],
            [14, le[q]],
            [14, le[q + 1]],
            [0, le[q + 1]],
          ],
          [ue, ue, ue, ue],
        ));
    }
    for (let q = 0; q < p.length - 1; q++) {
      let ue = N0(p[q], ds(p[q]), -1),
        de = N0(p[q], ds(p[q]), 1),
        $ = N0(p[q + 1], ds(p[q + 1]), 1),
        se = N0(p[q + 1], ds(p[q + 1]), -1),
        fe = [0.75, 0.72, 0.7];
      y.quad(
        [ue, de, $, se],
        [O, O, O, O],
        [
          [ue.x, ue.z],
          [de.x, de.z],
          [$.x, $.z],
          [se.x, se.z],
        ],
        [fe, fe, fe, fe],
      );
    }
  }
  (h(s, y.geo()), h(i, b.geo()));
  {
    let ee = (xe, j) => N0(xe, j, -1).addScaledVector(Ba(xe, j, -1), 0.012),
      le = [1.05, 0.92, 0.8];
    for (let xe = 2; xe < p.length - 1; xe++) {
      let j = m(p[xe]),
        O = m(p[xe + 1]);
      for (let q = 4; q <= 9; q++)
        h(i, v0(ee(p[xe], j[q]), ee(p[xe + 1], O[q]), 0.03, 0.045), le);
      for (let q = 3; q < 9; q++)
        (xe + q) % 2 === 0 &&
          h(i, v0(ee(p[xe], j[q]), ee(p[xe], j[q + 1]), 0.035, 0.03), le);
    }
  }
  for (let ee of [-1, 1]) {
    for (let de = 3; de < p.length - 1; de++) {
      let $ = (se, fe) => N0(se, fe, ee).addScaledVector(Ba(se, fe, ee), 0.07);
      (h(
        i,
        v0($(p[de], 9.6), $(p[de + 1], 9.6), 0.16, 0.3),
        [0.55, 0.55, 0.55],
      ),
        l1(p[de]) > 0.6 &&
          l1(p[de + 1]) > 0.6 &&
          h(
            r,
            dt(
              N0(p[de], $o(p[de]), ee),
              N0(p[de + 1], $o(p[de + 1]), ee),
              0.07,
              6,
            ),
          ));
    }
    for (let de = 0; de < 3; de++)
      h(
        r,
        dt(N0(p[de], $o(p[de]), ee), N0(p[de + 1], $o(p[de + 1]), ee), 0.07, 6),
      );
    let le = [];
    for (let de = 18; de <= Ln - 10.4; de += 3)
      le.push(N0(de, ds(de), ee).add(Ft(-ee * 0.12, 0, 0)));
    os(t, r, le, { h: 1.05, post: 1.5, r: 0.028 });
    let xe = 4.6,
      j = ds(xe) - 2.3,
      O = N0(xe, j, ee),
      q = Ba(xe, j, ee);
    h(
      r,
      dt(
        O.clone().addScaledVector(q, -0.3),
        O.clone().addScaledVector(q, 0.22),
        0.5,
        12,
        !0,
      ),
    );
    let ue = (de, $, se) => N0(de, $, ee).addScaledVector(Ba(de, $, ee), se);
    (h(r, v0(ue(xe, j - 0.1, 0.34), ue(xe, j - 2.3, 0.3), 0.22, 0.22, 0.03)),
      h(
        r,
        v0(
          ue(xe - 0.95, j - 2.45, 0.34),
          ue(xe + 0.95, j - 2.45, 0.34),
          0.42,
          0.42,
          0.05,
        ),
      ));
    for (let de of [-0.8, 0.8])
      h(
        r,
        v0(
          ue(xe + de, j - 2.4, 0.3),
          ue(xe + de * 1.1, j - 1.1, 0.34),
          0.5,
          0.12,
          0.02,
        ),
      );
  }
  let E = n.mats.label("KITTIWAKE", {
    color: "white",
    font: "sans",
    distress: 0.3,
  });
  {
    let le = Math.min(12, 1.7 * Math.max(2, E.aspect || 6));
    (h(E.material, fu(7.6, 7.6 + le, 10.25, 10.25 + 1.7, -1, 0.014, 10, 1)),
      h(E.material, fu(7.6, 7.6 + le, 10.25, 10.25 + 1.7, 1, 0.014, 10, 1)));
  }
  let M = n.mats.decal("rust_run");
  h(
    M.material,
    fu(4.6 - 0.8, 4.6 + 0.8, ds(4.6) - 9.5, ds(4.6) - 2.6, -1, 0.012, 2, 3),
  );
  for (let ee = 21.5; ee < Ln - 11; ee += 5.5) {
    let le = N0(ee, Ks - 0.45, -1);
    h(
      r,
      Pe(
        le.x - 0.04,
        le.y - 0.09,
        le.z - 0.3,
        le.x + 0.01,
        le.y + 0.09,
        le.z + 0.3,
      ),
    );
    let xe = 2.6 + 3.2 * hu(Math.round(ee * 10), 5);
    h(
      M.material,
      fu(ee - 0.45, ee + 0.45, Ks - 0.5 - xe, Ks - 0.5, -1, 0.012, 1, 1),
    );
  }
  for (let ee of [6.4, Ln - 7])
    for (let le = 0; le < 9; le++) {
      let xe = 1.6 + le * 0.62;
      h(
        o,
        fu(ee, ee + (le % 2 ? 0.28 : 0.5), xe, xe + 0.13, -1, 0.01, 1, 1),
        [1.1, 1.1, 1.05],
      );
    }
  (h(o, fu(33, 33.9, 3.2, 3.3, -1, 0.01, 1, 1), [1.1, 1.1, 1.05]),
    h(o, fu(33.4, 33.5, 2.4, 4.1, -1, 0.01, 1, 1), [1.1, 1.1, 1.05]));
  let _ = ds(7);
  for (let ee of [-1, 1]) {
    (h(r, Pt(0.55, 0.55, 0.9, "x", bt + ee * 1.5, _ + 0.75, Io - 6.2, 12)),
      h(
        r,
        Pe(bt + ee * 0.5, _, Io - 6.9, bt + ee * 2.6, _ + 0.5, Io - 5.5, 0.04),
      ));
    for (let le of [0, 0.7])
      h(r, Pt(0.16, 0.16, 0.7, "y", bt + ee * 4.2, _ + 0.35, Io - 8.5 - le, 8));
  }
  let T = Io - 10.5,
    w = _ + 15;
  (h(o, Pt(0.26, 0.42, 15, "y", bt, _ + 7.5, T, 10), [0.85, 0.8, 0.7]),
    h(
      o,
      Pe(bt - 2.6, _ + 10, T - 0.12, bt + 2.6, _ + 10.24, T + 0.12),
      [0.85, 0.8, 0.7],
    ),
    h(r, dt([bt, w, T], [bt, w + 2.4, T], 0.03, 5)));
  for (let ee of [-1, 1])
    (h(
      r,
      dt(
        [bt + ee * 2.5, _ + 10.2, T],
        [bt + ee * 5.6, _ + 0.6, T - 1.2],
        0.022,
        4,
      ),
    ),
      h(r, dt([bt + ee * 2.5, _ + 10.2, T], [bt, w, T], 0.02, 4)));
  (h(r, dt([bt, w, T], [bt, $o(0) + 0.3, Io - 0.4], 0.022, 4)),
    h(r, dt([bt, $o(0), Io - 0.3], [bt, $o(0) + 2.6, Io - 0.15], 0.03, 5)));
  let S = Ft(bt, _ + 2.2, T - 0.5),
    R = Ft(bt + 1.2, _ + 9.5, T - 11.5);
  (h(o, dt(S, R, 0.2, 8, !0), [0.85, 0.8, 0.7]),
    h(r, dt(R, [bt, w - 0.4, T], 0.022, 4)),
    h(r, dt(R, [R.x, Ks + 4, R.z], 0.018, 4)),
    h(
      r,
      Pe(
        R.x - 0.18,
        Ks + 3.4,
        R.z - 0.18,
        R.x + 0.18,
        Ks + 4,
        R.z + 0.18,
        0.04,
      ),
    ),
    e.add(Rn(bt, w - 0.6, T + 0.5, 0.14), [5, 4.6, 3.8], 0));
  let z = [
    [0.62, 0.17, 0.13],
    [0.17, 0.29, 0.5],
    [0.2, 0.42, 0.3],
    [0.78, 0.36, 0.12],
    [0.8, 0.62, 0.16],
    [0.82, 0.83, 0.8],
    [0.4, 0.43, 0.47],
    [0.16, 0.42, 0.45],
  ];
  [
    [-45.6, 12.19],
    [-32.7, 12.19],
    [-22.8, 6.06],
  ].forEach(([ee, le], xe) => {
    h(
      s,
      Pe(
        bt - 7.7,
        Ks,
        ee - le / 2 - 0.2,
        bt + 7.7,
        Ks + 0.42,
        ee + le / 2 + 0.2,
        0.04,
      ),
      [0.6, 0.6, 0.62],
    );
    for (let j = 0; j < 6; j++) {
      let O = bt + (j - 2.5) * 2.52,
        q = xe === 2 ? 2 : 2 + (hu(j * 3 + xe, 9) > 0.4 ? 1 : 0);
      for (let ue = 0; ue < q; ue++) {
        let de = Ks + 0.44 + ue * 2.61,
          $ = z[Math.floor(hu(j * 5 + ue * 13 + xe * 29, 2) * z.length)];
        if (
          (h(
            o,
            Pe(
              O - 1.22,
              de,
              ee - le / 2,
              O + 1.22,
              de + 2.59,
              ee + le / 2,
              0.035,
            ),
            $,
          ),
          j === 0)
        )
          for (let se = ee - le / 2 + 0.5; se < ee + le / 2 - 0.3; se += 0.58)
            h(
              o,
              Pe(O - 1.24, de + 0.15, se - 0.1, O - 1.21, de + 2.45, se + 0.1),
              $,
            );
      }
    }
    for (let j of [ee - le / 2 - 0.45, ee + le / 2 + 0.45]) {
      for (let O = 0; O <= 6; O++)
        h(
          r,
          Pe(
            bt + (O - 3) * 2.52 - 0.05,
            Ks,
            j - 0.05,
            bt + (O - 3) * 2.52 + 0.05,
            Ks + 5.6,
            j + 0.05,
          ),
        );
      for (let O of [Ks + 2.9, Ks + 5.6])
        h(r, Pe(bt - 7.6, O - 0.05, j - 0.12, bt + 7.6, O + 0.05, j + 0.12));
    }
  });
  let L = [0.92, 0.93, 0.92],
    U = -53,
    k = -66.5;
  [
    [7.2, 13, 15.9, 0],
    [6.7, 15.9, 18.7, 0.5],
    [6.3, 18.7, 21.5, 1],
    [6.5, 21.5, 24.4, 1.5],
  ].forEach(([ee, le, xe, j], O) => {
    (h(o, Pe(bt - ee, le, k + j * 0.4, bt + ee, xe, U - j, 0.08), L),
      h(
        o,
        Pe(
          bt - ee - 0.7,
          xe - 0.06,
          k + j * 0.4 - 0.3,
          bt + ee + 0.7,
          xe + 0.06,
          U - j + 1,
        ),
        [0.7, 0.72, 0.72],
      ));
    let q = xe + 0.06,
      ue = bt - ee - 0.67,
      de = bt + ee + 0.67,
      $ = U - j + 0.97,
      se = k + j * 0.4 - 0.27;
    if (
      (os(
        t,
        a,
        [
          [ue, q, se],
          [ue, q, $],
          [de, q, $],
          [de, q, se],
        ],
        { h: 1.05, post: 1.6, r: 0.026 },
      ),
      O < 3)
    )
      for (let fe = U - j - 1.2, me = 0; fe > k + 1.5; fe -= 1.45, me++) {
        let ge = hu(me * 3 + O * 11, 4) > 0.8;
        for (let ce of [-1, 1]) {
          let P = Pe(
            bt + ce * (ee + 0.012) - 0.012,
            le + 1.25,
            fe - 0.33,
            bt + ce * (ee + 0.012) + 0.012,
            le + 1.85,
            fe + 0.33,
          );
          ge && ce < 0 ? f(P) : h(r, P);
        }
      }
    if (O < 3)
      for (let fe = bt - ee + 1, me = 0; fe < bt + ee - 0.6; fe += 1.5, me++) {
        let ge = Pe(
          fe - 0.33,
          le + 1.25,
          U - j - 0.01,
          fe + 0.33,
          le + 1.85,
          U - j + 0.014,
        );
        hu(me + O * 7, 8) > 0.84 ? f(ge) : h(r, ge);
      }
  });
  let A = 21.5,
    F = U - 1.5,
    H = 6.5;
  h(r, Pe(bt - H + 0.2, A + 1.3, F - 0.01, bt + H - 0.2, A + 2.25, F + 0.02));
  for (let ee = bt - H + 0.75, le = 0; ee < bt + H - 0.4; ee += 1.05, le++)
    (hu(le, 21) > 0.62 &&
      f(Pe(ee - 0.44, A + 1.36, F + 0.02, ee + 0.44, A + 2.19, F + 0.03)),
      h(o, Pe(ee + 0.48, A + 1.3, F, ee + 0.57, A + 2.25, F + 0.04), L));
  for (let ee of [-1, 1])
    (h(
      r,
      Pe(
        bt + ee * H - 0.02,
        A + 1.3,
        F - 5,
        bt + ee * H + 0.02,
        A + 2.25,
        F - 0.2,
      ),
    ),
      h(
        o,
        Pe(
          bt + ee * 6.4,
          A - 0.12,
          F - 3.4,
          bt + ee * 8.3,
          A + 0.02,
          F + 0.9,
          0.03,
        ),
        L,
      ),
      h(o, Pe(bt + ee * 8.22, A, F - 3.4, bt + ee * 8.3, A + 1.1, F + 0.9), L),
      h(o, Pe(bt + ee * 6.5, A, F + 0.82, bt + ee * 8.3, A + 1.1, F + 0.9), L),
      h(
        r,
        v0(
          [bt + ee * 6.6, A - 2.6, F - 1.2],
          [bt + ee * 8.1, A - 0.1, F - 1.2],
          0.12,
          0.12,
        ),
      ),
      e.add(
        Rn(bt + ee * 8.25, A + 1.35, F - 0.4, 0.13),
        ee < 0 ? [0.3, 5, 1.6] : [6, 0.4, 0.3],
        0,
      ));
  (f(Pe(bt - 2.2, 24.42, F + 0.6, bt - 1.6, 24.52, F + 0.9)),
    f(Pe(bt + 1.6, 24.42, F + 0.6, bt + 2.2, 24.52, F + 0.9)));
  let N = Ft(bt, 24.46, -57.5);
  (h(o, Pt(0.16, 0.28, 8.5, "y", N.x, N.y + 4.25, N.z, 8), L),
    h(
      o,
      Pe(N.x - 2.4, N.y + 5.2, N.z - 0.08, N.x + 2.4, N.y + 5.36, N.z + 0.08),
      L,
    ),
    h(
      o,
      Pe(N.x - 1.3, N.y + 7.3, N.z - 0.06, N.x + 1.3, N.y + 7.42, N.z + 0.06),
      L,
    ),
    h(o, Pe(N.x - 0.5, N.y + 3.2, N.z, N.x + 0.5, N.y + 3.3, N.z + 1.2), L));
  for (let ee of [-2.3, -1.2, 1.2, 2.3])
    h(
      r,
      dt(
        [N.x + ee, N.y + 5.36, N.z],
        [N.x + ee, N.y + 5.36 + (Math.abs(ee) > 2 ? 3.2 : 1.2), N.z],
        0.012,
        4,
      ),
    );
  h(r, dt([N.x, N.y + 8.5, N.z], [N.x, N.y + 10.8, N.z], 0.015, 4));
  for (let ee of [-1, 1])
    h(
      r,
      dt(
        [N.x + ee * 2.3, N.y + 5.3, N.z],
        [bt + ee * 6, 24.5, k + 2],
        0.014,
        4,
      ),
    );
  (e.add(Rn(N.x, N.y + 8.7, N.z + 0.3, 0.14), [5, 4.6, 3.8], 0),
    e.add(Rn(N.x, N.y + 7.6, N.z, 0.12), [8, 0.4, 0.25], 3.4, 0.6, 0.4));
  let Z = -62.6;
  (h(
    o,
    Pe(bt - 1.7, 24.4, Z - 2.3, bt + 1.7, 29.3, Z + 2.1, 0.25),
    [0.2, 0.34, 0.5],
  ),
    h(
      o,
      Pe(bt - 1.72, 27.2, Z - 2.32, bt + 1.72, 28.1, Z + 2.12, 0.1),
      [0.9, 0.88, 0.8],
    ),
    h(
      o,
      Pe(bt - 1.75, 29.3, Z - 2.35, bt + 1.75, 30.3, Z + 2.15, 0.2),
      [0.07, 0.07, 0.08],
    ));
  for (let ee of [-0.9, 0.5])
    h(r, Pt(0.28, 0.28, 1.1, "y", bt, 30.7, Z + ee, 10));
  let Q = n.mats.decal("logo_b");
  h(
    Q.material,
    cu(
      2.6,
      2.6 / Math.max(1, Q.aspect || 1),
      bt - 1.705,
      26.1,
      Z - 0.1,
      -Math.PI / 2,
    ),
  );
  {
    let ee = bt - 7.9,
      le = 17.5,
      xe = -61,
      j = [1.25, 0.42, 0.1],
      O = new Uc(1.15, 3.6, 4, 12);
    (O.rotateX(Math.PI / 2),
      O.scale(0.95, 0.82, 1),
      O.translate(ee, le, xe),
      h(o, O, j),
      h(
        o,
        Pe(ee - 0.6, le + 0.7, xe - 1.2, ee + 0.6, le + 1.25, xe + 0.9, 0.12),
        j,
      ));
    for (let q of [-2.1, 2.1])
      (h(
        r,
        v0([bt - 6.9, 15.9, xe + q], [ee - 0.2, le + 2.3, xe + q], 0.16, 0.22),
      ),
        h(
          r,
          dt(
            [ee - 0.2, le + 2.2, xe + q],
            [ee, le + 0.9, xe + q * 0.8],
            0.02,
            4,
          ),
        ));
  }
  (h(
    r,
    dt([bt, $o(Ln), Io - Ln + 0.4], [bt, $o(Ln) + 3.4, Io - Ln - 0.3], 0.03, 5),
  ),
    e.add(Rn(bt, $o(Ln) + 0.6, Io - Ln - 0.1, 0.1), [4, 3.7, 3], 0));
  {
    let ee = Ft(32.55, 13, -51.5),
      le = Ft(31.4, 1.25, -38.5);
    for (let xe of [-0.4, 0.4])
      (h(
        a,
        v0(
          [ee.x + xe, ee.y - 0.1, ee.z],
          [le.x + xe, le.y - 0.1, le.z],
          0.05,
          0.3,
        ),
      ),
        h(
          a,
          dt(
            [ee.x + xe, ee.y + 1, ee.z],
            [le.x + xe, le.y + 1, le.z],
            0.025,
            5,
          ),
        ),
        h(
          a,
          dt(
            [ee.x + xe, ee.y + 0.5, ee.z],
            [le.x + xe, le.y + 0.5, le.z],
            0.02,
            4,
          ),
        ));
    for (let xe = 0; xe <= 8; xe++) {
      let j = ee.clone().lerp(le, xe / 8);
      for (let O of [-0.4, 0.4])
        h(a, dt([j.x + O, j.y - 0.1, j.z], [j.x + O, j.y + 1, j.z], 0.02, 4));
    }
    for (let xe = 1; xe < 44; xe++) {
      let j = ee.clone().lerp(le, xe / 44);
      h(a, Pe(j.x - 0.38, j.y - 0.02, j.z - 0.12, j.x + 0.38, j.y, j.z + 0.12));
    }
    (h(a, Pe(31, 1.15, -38.5, 32, 1.2, -37.3)),
      h(a, v0([31.2, 1.2, -37.9], [29.2, 0.12, -37.9], 0.8, 0.06)),
      os(
        t,
        a,
        [
          [31, 1.2, -37.32],
          [32, 1.2, -37.32],
          [32, 1.2, -38.5],
        ],
        { post: 1.1 },
      ),
      h(
        r,
        dt(
          [ee.x, ee.y + 3.2, ee.z + 4],
          [le.x, le.y + 1.2, le.z + 0.3],
          0.014,
          4,
        ),
      ),
      h(r, v0([33.2, 13.2, ee.z + 4], [32.2, 16.4, ee.z + 4], 0.14, 0.14)));
  }
  let W = (ee, le, xe, j) => {
    let O = N0(ee, le, -1);
    ((O.x -= 0.1), h(l, ia(Ua(O, xe, j, 12), 0.042, 5)));
    let q = Ua(O, xe, j, 12)[3],
      ue = Ua(O, xe, j, 12)[4].clone().sub(q).normalize(),
      de = Pt(0.42, 0.42, 0.012, "y", 0, 0, 0, 12);
    (de.applyQuaternion(new St().setFromUnitVectors(Ft(0, 1, 0), ue)),
      de.translate(q.x, q.y, q.z),
      h(a, de),
      h(
        r,
        Pe(
          O.x - 0.12,
          O.y - 0.28,
          O.z - 0.35,
          O.x + 0.12,
          O.y + 0.28,
          O.z + 0.35,
          0.05,
        ),
      ));
  };
  (W(4.4, ds(4.4) + 0.55, Ft(29.2, 0.5, -12), 1.3),
    W(4.9, ds(4.9) + 0.55, Ft(29.2, 0.36, -12.1), 1.7),
    W(1.6, ds(1.6) + 0.6, Ft(29.2, 0.5, -2), 1.6),
    W(2.2, ds(2.2) + 0.6, Ft(29.2, 0.36, -2.1), 2.2),
    W(Ln - 5, ds(Ln - 5) + 0.6, Ft(29.2, 0.5, -82), 1.6),
    W(Ln - 9, ds(Ln - 9) + 0.6, Ft(29.2, 0.45, -58), 1.2));
  for (let ee of [-82, -58])
    (h(r, Pt(0.2, 0.26, 0.55, "y", 29.2, 0.27, ee, 10)),
      h(r, Pt(0.34, 0.3, 0.14, "y", 29.2, 0.6, ee, 10)));
  for (let ee of [-17.6, -37, -54])
    (h(c, Pt(1.25, 1.25, 2.2, "z", 31.55, ch + 0.35, ee, 14)),
      h(c, Pt(0.45, 1.25, 0.5, "z", 31.55, ch + 0.35, ee + 1.35, 14)),
      h(c, Pt(1.25, 0.45, 0.5, "z", 31.55, ch + 0.35, ee - 1.35, 14)),
      h(l, dt([31.55, ch + 1.6, ee], [29.9, 0.1, ee + 0.6], 0.03, 4)));
  let J = t.build({ cast: !0, recv: !0 });
  J.name = "ship";
  let G = new ho();
  (G.add(o, Pe(-1.25, -0.07, -0.1, 1.25, 0.07, 0.1, 0.02), L),
    G.add(o, Pt(0.1, 0.12, 0.25, "y", 0, -0.18, 0, 8), L));
  let te = G.build({ cast: !1 });
  (te.position.set(N.x, N.y + 3.62, N.z + 0.8),
    (te.userData.noMerge = !0),
    J.add(te));
  let oe = [
    { min: [33, -5, Io - Ln], max: [49, 15, -17.5] },
    { min: [34.9, -5, -17.5], max: [47.1, 15.5, -13] },
    { min: [37.7, -5, -13], max: [44.3, 16, -9.3] },
    { min: [bt - 7.2, 13, k], max: [bt + 7.2, 24.4, U] },
  ];
  return {
    root: J,
    radar: te,
    colliders: oe,
    tris: t.tris,
    name: "KITTIWAKE",
  };
}
function Ew(n, e) {
  let t = new ho(),
    i = po(n, "plastic_grey"),
    s = po(n, "paint_orange"),
    o = n.mats.get("polymer_black"),
    r = n.mats.get("steel_galv"),
    a = n.mats.get("glass"),
    l = (U, k, C) => t.add(U, k, C),
    c = [2, 2.02, 2.08],
    u = [0.5, 0.5, 0.52],
    f = [1.9, 1.7, 1.2],
    h = [
      [-3.35, 0.5, 1.03],
      [-1.6, 0.5, 1.06],
      [0.5, 0.52, 1.05],
      [1.8, 0.58, 0.93],
      [2.75, 0.68, 0.6],
      [3.3, 0.78, 0.22],
    ],
    p = [
      ...h.map((U) => Ft(U[0], U[1], U[2])),
      Ft(3.43, 0.8, 0),
      ...h
        .slice()
        .reverse()
        .map((U) => Ft(U[0], U[1], -U[2])),
    ],
    d = new Sa(p, !1, "centripetal"),
    m = new Ta(d, 60, 0.27, 12, !1);
  {
    let U = m.attributes.uv,
      k = d.getLength();
    for (let C = 0; C < U.count; C++)
      U.setXY(C, U.getX(C) * k, U.getY(C) * 1.7);
  }
  l(i, m, c);
  for (let U of [-1, 1])
    l(i, Pt(0.07, 0.27, 0.42, "x", -3.56, 0.5, U * 1.03, 12), c);
  let x = 11,
    v = [];
  for (let U = 0; U < x; U++) {
    let k = 0.04 + (0.92 * U) / (x - 1),
      C = d.getPointAt(k),
      A = d.getTangentAt(k),
      F = new jn(0.276, 0.016, 5, 14);
    (F.applyQuaternion(new St().setFromUnitVectors(Ft(0, 0, 1), A)),
      F.translate(C.x, C.y, C.z),
      l(i, F, u));
    let H = Ft(C.x, 0, C.z)
      .sub(Ft(Math.min(C.x, 2.2), 0, 0))
      .normalize();
    v.push(
      C.clone()
        .addScaledVector(H, 0.2)
        .add(Ft(0, 0.2, 0)),
    );
  }
  for (let U = 0; U < x - 1; U++)
    l(i, ia(Ua(v[U], v[U + 1], 0.1, 4), 0.012, 4), f);
  let y = [-3.4, -2, -0.5, 1, 2, 2.8, 3.3],
    b = [0.9, 0.93, 0.93, 0.85, 0.62, 0.34, 0.08],
    g = [0.22, 0.22, 0.24, 0.3, 0.42, 0.56, 0.7],
    E = [-0.3, -0.32, -0.33, -0.3, -0.15, 0.15, 0.62],
    M = [],
    _ = (U, k, C) => {
      let A = k.clone().sub(U).cross(C.clone().sub(U)),
        F = U.clone()
          .add(k)
          .add(C)
          .multiplyScalar(1 / 3),
        H = Ft(0, F.y - 0.45, F.z);
      (Math.abs(F.x) > 3.39 && H.set(F.x, 0, 0),
        A.dot(H) < 0
          ? M.push(U.x, U.y, U.z, C.x, C.y, C.z, k.x, k.y, k.z)
          : M.push(U.x, U.y, U.z, k.x, k.y, k.z, C.x, C.y, C.z));
    };
  for (let U of [-1, 1]) {
    for (let k = 0; k < y.length - 1; k++) {
      let C = Ft(y[k], E[k], 0),
        A = Ft(y[k + 1], E[k + 1], 0),
        F = Ft(y[k], g[k], U * b[k]),
        H = Ft(y[k + 1], g[k + 1], U * b[k + 1]),
        N = Ft(y[k], 0.5 + Math.max(0, g[k] - 0.22) * 0.6, U * (b[k] + 0.1)),
        Z = Ft(
          y[k + 1],
          0.5 + Math.max(0, g[k + 1] - 0.22) * 0.6,
          U * (b[k + 1] + 0.1),
        );
      (_(C, A, H), _(C, H, F), _(F, H, Z), _(F, Z, N));
    }
    (_(
      Ft(-3.4, E[0], 0),
      Ft(-3.4, g[0], U * b[0]),
      Ft(-3.4, 0.78, U * (b[0] + 0.1)),
    ),
      _(
        Ft(-3.4, E[0], 0),
        Ft(-3.4, 0.78, U * (b[0] + 0.1)),
        Ft(-3.4, 0.78, 0),
      ));
  }
  let T = new pt();
  (T.setAttribute("position", new et(M, 3)),
    T.computeVertexNormals(),
    l(o, T),
    l(i, Pe(-3.38, 0.2, -0.86, 2.1, 0.26, 0.86), u),
    l(i, Pe(2, 0.26, -0.62, 2.85, 0.56, 0.62, 0.05), u),
    l(o, Pe(-3.46, 0.1, -0.92, -3.34, 0.8, 0.92, 0.02)),
    l(r, dt([3.2, 0.95, -0.12], [3.2, 0.95, 0.12], 0.02, 5)),
    l(r, dt([3.2, 0.8, 0], [3.2, 0.95, 0], 0.018, 5)),
    l(s, Pe(0.3, 0.26, -0.4, 1, 1.12, 0.4, 0.05), [1, 0.9, 0.85]),
    l(o, v0([0.28, 1.14, 0], [0.86, 1.3, 0], 0.76, 0.05)));
  let w = Pe(-0.012, 0, -0.42, 0.012, 0.5, 0.42);
  (w.rotateZ(0.42), w.translate(0.95, 1.2, 0), l(a, w));
  for (let U of [-0.43, 0.43])
    l(
      r,
      dt(
        [0.95, 1.2, U],
        [0.95 - Math.sin(0.42) * 0.52, 1.2 + Math.cos(0.42) * 0.52, U],
        0.016,
        5,
      ),
    );
  l(
    r,
    dt(
      [0.95 - Math.sin(0.42) * 0.52, 1.2 + Math.cos(0.42) * 0.52, -0.43],
      [0.95 - Math.sin(0.42) * 0.52, 1.2 + Math.cos(0.42) * 0.52, 0.43],
      0.016,
      5,
    ),
  );
  let S = new jn(0.18, 0.017, 6, 18);
  (S.rotateY(Math.PI / 2),
    S.rotateZ(-0.5),
    S.translate(0.2, 1.12, -0.12),
    l(o, S),
    l(r, dt([0.2, 1.12, -0.12], [0.36, 1.03, -0.12], 0.02, 5)));
  for (let U of [0, 2.1, 4.2])
    l(
      r,
      dt(
        [0.2, 1.12, -0.12],
        [
          0.2 + Math.sin(-0.5) * Math.cos(U) * -0.17,
          1.12 + Math.cos(-0.5) * Math.cos(U) * 0.17,
          -0.12 + Math.sin(U) * 0.17,
        ],
        0.01,
        4,
      ),
    );
  (l(o, Pe(0.34, 1.16, 0.16, 0.5, 1.34, 0.3, 0.02)),
    l(r, dt([0.42, 1.34, 0.23], [0.36, 1.48, 0.23], 0.012, 4)),
    l(r, dt([0.35, 0.3, -0.46], [0.35, 1, -0.46], 0.02, 5)),
    l(r, dt([0.35, 1, -0.46], [0.95, 1, -0.46], 0.02, 5)),
    l(r, dt([0.35, 0.3, 0.46], [0.35, 1, 0.46], 0.02, 5)),
    l(r, dt([0.35, 1, 0.46], [0.95, 1, 0.46], 0.02, 5)));
  for (let U of [-0.75, -1.75])
    (l(s, Pe(U - 0.28, 0.26, -0.2, U + 0.28, 0.82, 0.2, 0.05), [1, 0.9, 0.85]),
      l(o, Pe(U - 0.3, 0.82, -0.22, U + 0.3, 0.93, 0.22, 0.04)),
      l(o, Pe(U - 0.34, 0.93, -0.2, U - 0.26, 1.2, 0.2, 0.03)),
      l(r, dt([U + 0.3, 0.6, -0.22], [U + 0.3, 1.02, 0], 0.014, 4)),
      l(r, dt([U + 0.3, 0.6, 0.22], [U + 0.3, 1.02, 0], 0.014, 4)));
  l(s, Pe(-2.9, 0.26, -0.3, -2.45, 0.58, 0.3, 0.04), [1.1, 0.5, 0.4]);
  for (let U of [-1, 1])
    (l(r, dt([-2.95, 0.55, U * 0.9], [-2.75, 2, U * 0.55], 0.03, 6)),
      l(r, dt([-2.3, 0.55, U * 0.9], [-2.75, 1.3, U * 0.7], 0.022, 5)));
  (l(r, dt([-2.75, 2, -0.55], [-2.75, 2, 0.55], 0.03, 6)),
    l(r, Pe(-2.88, 2, -0.2, -2.62, 2.04, 0.2)),
    l(o, Pt(0.05, 0.06, 0.1, "y", -2.75, 2.09, 0, 8)),
    l(o, dt([-2.75, 2, 0.42], [-2.9, 3.7, 0.46], 0.011, 5)),
    l(o, Pt(0.16, 0.16, 0.07, "y", -2.75, 2.1, -0.36, 10)));
  for (let U of [-0.36, 0.36])
    (l(r, Pe(-3.6, 0.42, U - 0.16, -3.44, 0.78, U + 0.16, 0.02)),
      l(o, Pe(-4.1, 0.78, U - 0.23, -3.48, 1.4, U + 0.23, 0.09)),
      l(i, Pe(-4.11, 1, U - 0.235, -3.47, 1.05, U + 0.235), [1.4, 1.4, 1.4]),
      l(o, Pe(-3.92, -0.05, U - 0.085, -3.62, 0.8, U + 0.085, 0.03)),
      l(o, Pe(-4.02, -0.52, U - 0.04, -3.6, -0.05, U + 0.04, 0.015)),
      l(o, Pt(0.07, 0.03, 0.42, "x", -3.9, -0.3, U, 8)));
  for (let U of [-1.8, 0.4, 1.7])
    (l(s, Pt(0.11, 0.11, 0.42, "y", U, 0.42, 1.36, 10), [1.2, 0.8, 0.7]),
      l(i, dt([U, 0.63, 1.36], [U, 0.78, 1.12], 0.01, 4), f));
  let R = new jn(0.26, 0.07, 6, 16);
  (R.rotateY(Math.PI / 2),
    R.translate(1.02, 0.72, 0),
    l(s, R, [1.3, 0.6, 0.45]));
  let z = t.build({ cast: !0, recv: !0 });
  (e.add(Rn(-2.75, 2.2, 0, 0.075), [1.2, 11, 3.2], 1.5, 0, 0.1),
    e.add(Rn(-2.75, 2.2, 0, 0.074), [1.2, 11, 3.2], 1.5, 0.2, 0.08));
  let I = e.build();
  I && ((I.frustumCulled = !1), z.add(I));
  let L = new At();
  return (
    (L.name = "boat"),
    L.add(z),
    (L.userData.noMerge = !0),
    { root: L, hullGrp: z, tris: t.tris }
  );
}
var Pv = new Qe(12172214),
  Ng = (n, e = 1) => {
    let t = new Qe(n);
    return [(e * t.r) / Pv.r, (e * t.g) / Pv.g, (e * t.b) / Pv.b];
  },
  Sw = [
    8200729, 8200729, 6957596, 2047846, 2047846, 2307146, 2906692, 2906692,
    11751962, 9062946, 5922920, 5922920, 4146764, 2055523, 10121752, 8093308,
    6962468, 6962468,
  ].map((n) => Ng(n)),
  Fg = [
    [0.6, 0.17, 0.13],
    [0.17, 0.29, 0.5],
    [0.2, 0.42, 0.3],
    [0.76, 0.35, 0.12],
    [0.78, 0.6, 0.16],
    [0.8, 0.81, 0.78],
    [0.4, 0.43, 0.47],
    [0.16, 0.42, 0.45],
    [0.55, 0.2, 0.15],
    [0.2, 0.3, 0.45],
  ],
  Aw = (n, e, t) => {
    let i = Math.min(1, Math.max(0, (t - n) / (e - n)));
    return i * i * (3 - 2 * i);
  },
  Tw = (n, e) => 1 - 0.6 * Aw(38, 160, Math.hypot(n + 5, e));
function Rw(n, e) {
  let t = new ho(),
    i = po(n, "paint_white"),
    s = Rv(90417),
    o = [5.5, 4.3, 2.9],
    r = [8, 0.45, 0.25],
    a = [0, 0, 0];
  function l(C, A, F, H, N = 1) {
    let Z = au(A * 0.23 + 1.3, F * 0.31, H * 0.23 + 7.7),
      Q = au(A * 1.9 + 4.1, 2.2, H * 1.9 + 9.3),
      W = N * (0.56 + 0.52 * Z) * (0.62 + 0.38 * Aw(0, 5, F)),
      J = C[0] * W,
      G = C[1] * W,
      te = C[2] * W;
    if (Q > 0.62) {
      let oe = Math.min(1, (Q - 0.62) / 0.3) * 0.55;
      ((J = J * (1 - oe) + 0.3 * oe * W),
        (G = G * (1 - oe) + 0.15 * oe * W),
        (te = te * (1 - oe) + 0.08 * oe * W));
    }
    return ((a[0] = J), (a[1] = G), (a[2] = te), a);
  }
  let c = (C, A) => {
      if (!C) return;
      if (Array.isArray(C)) {
        for (let Z of C) c(Z, A);
        return;
      }
      C.computeBoundingBox();
      let F = C.boundingBox,
        H = (F.min.x + F.max.x) / 2,
        N = (F.min.z + F.max.z) / 2;
      if (H < 31) {
        let Z = Tw(H, N);
        (Kr(C, (Q, W, J) => l(A, Q, W, J, Z)), t.add(i, C));
      } else t.add(i, C, A);
    },
    u = [],
    f = [],
    h = [],
    p = [];
  function d(C, A, F) {
    let H = C[1][0] - C[0][0],
      N = C[1][1] - C[0][1],
      Z = C[1][2] - C[0][2],
      Q = C[3][0] - C[0][0],
      W = C[3][1] - C[0][1],
      J = C[3][2] - C[0][2],
      G =
        (N * J - Z * W) * A[0] +
          (Z * Q - H * J) * A[1] +
          (H * W - N * Q) * A[2] <
        0;
    for (let te of G ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]) {
      let oe = C[te];
      (u.push(oe[0], oe[1], oe[2]),
        f.push(A[0], A[1], A[2]),
        p.push(F[te][0], F[te][1], F[te][2]),
        Math.abs(A[0]) > 0.5
          ? h.push(oe[2], oe[1])
          : Math.abs(A[1]) > 0.5
            ? h.push(oe[0], oe[2])
            : h.push(oe[0], oe[1]));
    }
  }
  let m = [0.866, -0.5, 0],
    x = (C, A, F) => A.map((H) => l(C, H[0], H[1], H[2], F).slice());
  function v(C, A, F, H, N, Z, Q, W, J) {
    for (let G of W) {
      let te, oe;
      G === "E"
        ? ((te = [
            [H, A, Z],
            [H, A, F],
            [H, N, F],
            [H, N, Z],
          ]),
          (oe = m))
        : G === "W"
          ? ((te = [
              [C, A, F],
              [C, A, Z],
              [C, N, Z],
              [C, N, F],
            ]),
            (oe = [-1, 0, 0]))
          : G === "S"
            ? ((te = [
                [C, A, Z],
                [H, A, Z],
                [H, N, Z],
                [C, N, Z],
              ]),
              (oe = [0, 0, 1]))
            : G === "N"
              ? ((te = [
                  [H, A, F],
                  [C, A, F],
                  [C, N, F],
                  [H, N, F],
                ]),
                (oe = [0, 0, -1]))
              : ((te = [
                  [C, N, Z],
                  [H, N, Z],
                  [H, N, F],
                  [C, N, F],
                ]),
                (oe = [0, 1, 0]));
      let ee = x(Q, te, G === "T" ? J * 0.8 : G === "E" ? J * 0.92 : J);
      if (A < 0.1 && G !== "T")
        for (let le of [0, 1])
          ((ee[le][0] *= 0.62), (ee[le][1] *= 0.62), (ee[le][2] *= 0.62));
      d(te, oe, ee);
    }
  }
  function y(
    C,
    A,
    F,
    { faceZ: H = 0, ribs: N = !1, doorRows: Z = 0, west: Q = !1 } = {},
  ) {
    let W = Math.sign(F - A),
      J = [];
    for (let oe = A, ee = 1; W > 0 ? oe < F : oe > F; oe += W * 2.62, ee++)
      ee % 8 >= 1 &&
        ee % 8 <= 5 &&
        J.push({ z: oe, blk: Math.floor(ee / 8), first: ee === 1 });
    let G = J.map((oe, ee) =>
        C.map((le, xe) => {
          let j = au(le * 0.04 + 3, 0.5, oe.z * 0.05 + 7),
            O = Math.round(0.2 + j * 5.4 + (s() - 0.5) * 2.4);
          return (
            !oe.first && s() < 0.07 && (O = 0),
            Math.max(oe.first ? 2 : 0, Math.min(5, O))
          );
        }),
      ),
      te = (oe, ee) =>
        oe >= 0 && oe < J.length && ee >= 0 && ee < C.length ? G[oe][ee] : 0;
    J.forEach((oe, ee) =>
      C.forEach((le, xe) => {
        let j = G[ee][xe],
          O = oe.z,
          q = Tw(le, O),
          ue = Math.max(Math.abs(le + 5) - 40, Math.abs(O) - 30) < 55,
          de = ($, se) =>
            $ >= 0 &&
            se >= 0 &&
            $ < C.length &&
            se < C.length &&
            Math.abs(C[$] - C[se]) < 12.8;
        for (let $ = 0; $ < j; $++) {
          let se = Sw[Math.floor(s() * Sw.length)],
            fe = 0.6 + s() * 0.4,
            me = [se[0] * fe, se[1] * fe, se[2] * fe],
            ge = (s() - 0.5) * 0.22,
            ce = $ * 2.6,
            P = le - 6.095 + ge,
            D = le + 6.095 + ge,
            B = O - 1.22,
            X = O + 1.22,
            re = $ === j - 1 ? "T" : "";
          for (let ye of H ? [H] : [-1, 1]) {
            let Te = ee + ye * W;
            (!(
              Te >= 0 &&
              Te < J.length &&
              J[Te].blk === oe.blk &&
              Math.abs(J[Te].z - O) < 2.7
            ) ||
              te(Te, xe) <= $) &&
              (re += ye > 0 ? "S" : "N");
          }
          let Y = !(de(xe - 1, xe) && te(ee, xe - 1) > $),
            he = !Q && !(de(xe + 1, xe) && te(ee, xe + 1) > $);
          (Y && (re += "E"),
            he && (re += "W"),
            v(P, ce, B, D, ce + 2.59, X, me, re, q));
          let V = [me[0] * 0.45, me[1] * 0.45, me[2] * 0.45],
            ne = oe.first
              ? H
                ? [H]
                : [-W]
              : xe === 0 && Q && Math.abs(O) < 42
                ? [-1, 1].filter((ye) => re.includes(ye > 0 ? "S" : "N"))
                : [];
          if (N && ue && ne.length) {
            let ye = ne;
            for (let Te of ye) {
              let Re = Te > 0 ? X : B,
                Ue = Re + Te * 0.04,
                Ve = ce + 0.15,
                ze = ce + 2.45,
                Ge = [me[0] * 0.7, me[1] * 0.7, me[2] * 0.7];
              for (let _e = P + 0.24; _e < D - 0.3; _e += 0.575) {
                let Ne = [
                  [_e, Ve, Re],
                  [_e + 0.07, Ve, Ue],
                  [_e + 0.07, ze, Ue],
                  [_e, ze, Re],
                ];
                (d(Ne, [-0.5, 0, Te * 0.87], x(Ge, Ne, q)),
                  (Ne = [
                    [_e + 0.07, Ve, Ue],
                    [_e + 0.2, Ve, Ue],
                    [_e + 0.2, ze, Ue],
                    [_e + 0.07, ze, Ue],
                  ]),
                  d(Ne, [0, 0, Te], x(me, Ne, q)),
                  (Ne = [
                    [_e + 0.2, Ve, Ue],
                    [_e + 0.27, Ve, Re],
                    [_e + 0.27, ze, Re],
                    [_e + 0.2, ze, Ue],
                  ]),
                  d(Ne, [0.42, -0.52, Te * 0.74], x(Ge, Ne, q)));
              }
              for (let [_e, Ne] of [
                [ce, Ve],
                [ze, ce + 2.59],
              ]) {
                let ke = Re + Te * 0.05,
                  je = [
                    [P, _e, ke],
                    [D, _e, ke],
                    [D, Ne, ke],
                    [P, Ne, ke],
                  ];
                (d(je, [0, 0, Te], x(V, je, q)),
                  (je = [
                    [P, Ne, Re],
                    [D, Ne, Re],
                    [D, Ne, ke],
                    [P, Ne, ke],
                  ]),
                  d(je, [0, _e === ce ? 1 : -1, 0], x(V, je, q)));
              }
            }
          }
          if (Y && xe === 0 && ee < Z) {
            let ye = D + 0.03,
              Te = D + 0.055,
              Re = ce + 0.02,
              Ue = ce + 2.57,
              Ve = [me[0] * 0.55, me[1] * 0.55, me[2] * 0.55],
              ze = [0.34, 0.35, 0.36],
              Ge = [0.05, 0.05, 0.055],
              _e = (Ne, ke, je, Ze, qe, Oe) => {
                let mt = [
                    [Ne, Ze, je],
                    [Ne, Ze, ke],
                    [Ne, qe, ke],
                    [Ne, qe, je],
                  ],
                  $e = x(Oe, mt, q);
                if (ce < 0.1 && Ze < 0.3)
                  for (let Ke of [0, 1])
                    (($e[Ke][0] *= 0.62),
                      ($e[Ke][1] *= 0.62),
                      ($e[Ke][2] *= 0.62));
                d(mt, m, $e);
              };
            (_e(ye, B, B + 0.13, Re, Ue, Ve),
              _e(ye, X - 0.13, X, Re, Ue, Ve),
              _e(ye, B + 0.13, X - 0.13, ce, ce + 0.15, Ve),
              _e(ye, B + 0.13, X - 0.13, ce + 2.44, ce + 2.59, Ve),
              _e(ye, O - 0.018, O + 0.018, ce + 0.15, ce + 2.44, Ge));
            for (let Ne of [-0.8, -0.32, 0.32, 0.8])
              if (
                (_e(Te, O + Ne - 0.024, O + Ne + 0.024, ce + 0.1, ce + 2.5, ze),
                ee < 8)
              )
                for (let ke of [0.32, 2.2])
                  _e(
                    Te + 0.01,
                    O + Ne - 0.07,
                    O + Ne + 0.07,
                    ce + ke,
                    ce + ke + 0.09,
                    ze,
                  );
            if (ee < 8)
              for (let Ne of [-0.56, 0.56])
                _e(
                  Te + 0.01,
                  O + Ne - 0.1,
                  O + Ne + 0.1,
                  ce + 1.02,
                  ce + 1.1,
                  ze,
                );
          }
        }
      }),
    );
  }
  let b = [-48.6, -61.2, -73.8, -90.5, -103.1, -115.7, -132, -144.6],
    g = [6.3, -6.3, -18.9, -31.5];
  (y(b, -4.9, -112, { ribs: !0, doorRows: 15, west: !0 }),
    y(b, 14.9, 112, { ribs: !0, doorRows: 15, west: !0 }),
    y(g, -36.4, -110, { faceZ: 1, ribs: !0, doorRows: 12 }),
    y(g, 33.9, 110, { faceZ: -1, ribs: !0, doorRows: 12 }));
  {
    let C = new pt();
    (C.setAttribute("position", new et(u, 3)),
      C.setAttribute("normal", new et(f, 3)),
      C.setAttribute("uv", new et(h, 2)),
      C.setAttribute("color", new et(p, 3)),
      t.add(i, C));
  }
  let E = Ng(5922920, 0.85),
    M = [0.1, 0.1, 0.11],
    _ = [0.36, 0.38, 0.4],
    T = Ng(12159516, 0.5),
    w = [0.5, 0.5, 0.48];
  function S(C, A, F, H, N) {
    let Q = F,
      W = [Q[0] * 0.7, Q[1] * 0.7, Q[2] * 0.7];
    for (let te of [-1, 1]) {
      let oe = A + te * 9.5;
      for (let ee of [-1, 1]) {
        let le = C + ee * 7.5;
        (c(Pe(le - 1.5, 0.05, oe - 0.28, le + 1.5, 0.8, oe + 0.28), M),
          c(Pe(le - 0.36, 0.8, oe - 0.36, le + 0.36, 19.1, oe + 0.36), Q),
          c(Pe(le - 0.4, 6.9, oe - 0.4, le + 0.4, 7, oe + 0.4), W),
          c(Pe(le - 0.4, 13, oe - 0.4, le + 0.4, 13.1, oe + 0.4), W),
          c(v0([le, 14.6, oe], [le - ee * 3.2, 19.1, oe], 0.3, 0.3), Q));
      }
      (c(Pe(C - 9.3, 0.8, oe - 0.4, C + 9.3, 1.7, oe + 0.4), Q),
        c(Pe(C - 8, 19.1, oe - 0.45, C + 8, 20.2, oe + 0.45), Q),
        c(Pe(C - 2.4, 1.7, oe - 0.5, C + 0.8, 3.9, oe + 0.5), w));
    }
    for (let te of [-1, 1]) {
      let oe = C + te * 3.3,
        ee = A - 9.5 - 5.6,
        le = A + 9.5 + 5.6;
      c(Pe(oe - 0.45, 20.2, ee, oe + 0.45, 21.9, le), Q);
      for (let xe = ee + 4.4; xe < le; xe += 4.4)
        c(Pe(oe - 0.48, 20.15, xe - 0.03, oe + 0.48, 21.95, xe + 0.03), W);
      (c(Pe(oe + te * 0.45, 21, ee, oe + te * 1.3, 21.05, le), _),
        os(
          R,
          null,
          [
            [oe + te * 1.27, 21.05, ee],
            [oe + te * 1.27, 21.05, le],
          ],
          { post: 3.3, r: 0.035, mid: !1, tint: T },
        ),
        c(
          dt([oe, 20.2, A - 9.5 + 0.5], [oe, 20.2, A + 9.5 - 0.5], 0.05, 4),
          M,
        ));
    }
    for (let te of [A - 9.5 - 5.4, A + 9.5 + 5.4])
      c(Pe(C - 3.3, 20.4, te - 0.25, C + 3.3, 21.7, te + 0.25), Q);
    let J = A + H;
    (c(Pe(C - 4, 21.9, J - 2.3, C + 4, 22.5, J + 2.3), T),
      c(Pe(C - 2.6, 22.5, J - 1.7, C + 1.4, 24.5, J + 1.7), w),
      c(Pe(C + 1.8, 22.5, J - 0.9, C + 3.4, 23.3, J + 0.9), M),
      c(Pe(C + 4.3, 17.2, J - 1, C + 6.1, 19.5, J + 1), w),
      c(
        Pe(C + 4.4, 18.2, J - 1.02, C + 6.12, 19.2, J + 1.02),
        [0.08, 0.1, 0.12],
      ));
    for (let te of [-0.9, 0.9])
      c(Pe(C + 4.9, 19.5, J + te - 0.06, C + 5.05, 21.9, J + te + 0.06), T);
    let G = 21.9 - N;
    for (let te of [-2.2, 2.2])
      for (let oe of [-0.8, 0.8])
        c(dt([C + te, 21.9, J + oe], [C + te, G, J + oe], 0.03, 4), M);
    (c(Pe(C - 6.1, G - 0.4, J - 1.22, C + 6.1, G, J + 1.22), T),
      c(Pe(C - 2.4, G, J - 0.9, C + 2.4, G + 0.5, J + 0.9), T));
    {
      let te = C - 7.5 - 0.5,
        oe = A - 9.5,
        ee = 1.7;
      for (let le = 0; le < 6; le++) {
        let xe = oe + (le % 2 ? 1.9 : -1.9),
          j = oe + (le % 2 ? -1.9 : 1.9),
          O = Math.min(20.2, ee + 3.1);
        (c(v0([te, ee, xe], [te, O, j], 0.6, 0.07), _),
          c(dt([te - 0.3, ee + 1, xe], [te - 0.3, O + 1, j], 0.03, 4), T),
          c(Pe(te - 0.35, O - 0.04, j - 0.5, te + 0.35, O, j + 0.5), _),
          (ee = O));
      }
      for (let le of [-2.4, 2.4])
        c(Pe(te - 0.3, 1.7, oe + le - 0.05, te - 0.2, 20.2, oe + le + 0.05), W);
      (c(Pt(1.25, 1.25, 0.5, "z", C + 7.5 + 1, 3.3, A + 9.5 + 0.9, 12), T),
        c(Pt(0.5, 0.5, 0.6, "z", C + 7.5 + 1, 3.3, A + 9.5 + 0.9, 8), M));
      for (let le of [-0.2, 0.2])
        c(
          dt(
            [C + 7.5 + 0.45, 1.7, A - 9.5 + le],
            [C + 7.5 + 0.45, 20.2, A - 9.5 + le],
            0.022,
            4,
          ),
          _,
        );
    }
    (e.add(Rn(C, 24.9, J, 0.3), r, 3.1, s(), 0.4),
      e.add(Rn(C - 3.3, 20, A - 4, 0.24), o, 0),
      e.add(Rn(C + 3.3, 20, A + 4, 0.24), o, 0));
  }
  let R = { add: (C, A, F) => c(A, F) },
    z = Ng(6172444, 0.7);
  (S(-61, -52.06, E, -3, 4.5),
    S(-61, 41.1, z, 5, 9),
    S(-103, -10.14, z, 2, 3),
    S(-6, -62.6, E, -6, 7),
    S(-12, 60.1, E, 4, 5));
  for (let [C, A, F] of [
    [-67.5, -22, 32],
    [-67.5, 31, 32],
    [-122, 4, 34],
    [-12.6, -53, 30],
    [-12.6, 51, 30],
    [-140, -84, 34],
    [-96, 96, 34],
    [0.2, -100, 30],
    [-52, -70, 28],
    [-55, 72, 28],
    [-84, -45, 34],
    [-84, 24, 34],
    [-25, -84, 30],
    [-28, 90, 30],
    [-120, 60, 34],
    [10.5, 49, 26],
  ]) {
    (c(Pt(0.14, 0.3, F, "y", C, F / 2, A, 6), _),
      c(Pt(1.5, 1.5, 0.18, "y", C, F - 0.5, A, 8), M));
    for (let [H, N] of [
      [-1.4, 0],
      [1.4, 0],
      [0, -1.4],
      [0, 1.4],
    ])
      (c(
        Pe(
          C + H - 0.25,
          F - 0.95,
          A + N - 0.25,
          C + H + 0.25,
          F - 0.6,
          A + N + 0.25,
        ),
        M,
      ),
        e.add(Rn(C + H, F - 1.05, A + N, 0.2), o, 0));
  }
  for (let [C, A, F] of [
    [-158, -30, 62],
    [-76, -128, 48],
    [-150, 104, 54],
  ]) {
    let N = [
      [-1.1, -0.638],
      [1.1, -0.638],
      [0, 1.265],
    ];
    for (let [Z, Q] of N)
      c(
        dt([C + Z, 0, A + Q], [C + Z * 0.3, F, A + Q * 0.3], 0.07, 4),
        [0.42, 0.14, 0.1],
      );
    for (let Z = 3, Q = 0; Z < F; Z += 6, Q++)
      for (let W = 0; W < 3; W++) {
        let J = N[W],
          G = N[(W + 1) % 3],
          te = 1 - (0.7 * Z) / F,
          oe = 1 - (0.7 * Math.min(F, Z + 6)) / F;
        c(
          dt(
            [C + J[0] * te, Z, A + J[1] * te],
            [C + G[0] * oe, Math.min(F, Z + 6), A + G[1] * oe],
            0.04,
            3,
          ),
          Q % 2 ? w : [0.42, 0.14, 0.1],
        );
      }
    for (let Z of [0.5, 2.6, 4.7])
      c(
        dt(
          [C, F * 0.72, A],
          [C + Math.cos(Z) * F * 0.5, 0, A + Math.sin(Z) * F * 0.5],
          0.025,
          3,
        ),
        M,
      );
    (c(dt([C, F, A], [C, F + 5, A], 0.04, 3), M),
      c(Pe(C - 0.9, F * 0.8, A - 0.25, C + 0.9, F * 0.8 + 1.6, A + 0.25), w),
      e.add(Rn(C, F + 0.4, A, 0.35), r, 2.4, s(), 0.45),
      e.add(Rn(C, F * 0.55, A, 0.28), r, 0));
  }
  for (let [C, A, F] of [
    [-178, -70, 90],
    [-182, 40, 110],
    [-60, -150, 70],
    [-70, 150, 80],
  ]) {
    let H = Math.abs(A) > 120,
      N = (Z, Q, W, J, G, te, oe) =>
        c(
          H
            ? Pe(C + Z, Q, A + W, C + J, G, A + te)
            : Pe(C + W, Q, A + Z, C + te, G, A + J),
          oe,
        );
    (N(-F / 2, 0, -16, F / 2, 9.5, 16, [0.2, 0.22, 0.24]),
      N(-F / 2, 9.5, -16.4, F / 2, 9.9, 16.4, [0.12, 0.12, 0.13]),
      N(-F / 2, 9.9, -10, F / 2, 12.2, 10, [0.17, 0.18, 0.2]),
      N(-F / 2 + 4, 12.2, -1.2, F / 2 - 4, 13.3, 1.2, [0.13, 0.13, 0.14]));
    for (let Z = -F / 2 + 6; Z < F / 2 - 5; Z += 12)
      (N(Z - 0.25, 0, -16.2, Z + 0.25, 9.5, 16.2, [0.13, 0.14, 0.15]),
        (Z | 0) % 3 === 0 &&
          N(Z + 2, 0, -16.1, Z + 8, 6.2, 16.1, [0.06, 0.06, 0.07]));
  }
  (Dg(n, e, { into: t, mat: i, dz: 66 }),
    [
      [-132, 1.15, !0, [0.14, 0.17, 0.21]],
      [-186, 1.25, !1, [0.14, 0.17, 0.21]],
      [-252, 1.35, !0, [0.26, 0.12, 0.06]],
      [-336, 1.4, !1, [0.26, 0.12, 0.06]],
      [128, 1.2, !1, [0.14, 0.17, 0.21]],
      [182, 1.3, !0, [0.24, 0.25, 0.27]],
      [250, 1.4, !1, [0.24, 0.25, 0.27]],
      [330, 1.45, !0, [0.26, 0.12, 0.06]],
    ].forEach(([C, A, F, H], N) => {
      let Z = Mw(t, i, 23.5, C, { s: A, up: F, tint: H });
      e.add(
        Rn(Z[0], Z[1], Z[2], 0.45 * A),
        r,
        2.6 + (N % 3) * 0.35,
        N * 0.37,
        0.45,
      );
    }),
    c(Pe(-230, -1.6, -384, 30, -0.12, 425), [0.24, 0.24, 0.25]));
  function L(C, A, F, H, N, Z, Q) {
    (c(Pe(C, -1.6, F, A, N, H), Z),
      c(Pe(C, -1.6, F, A, 0.8, H + 0.2), [0.42, 0.14, 0.1]));
    let W = H - F,
      J = F + W * Q;
    (c(Pe(C + 2, N, J - 7, A - 2, N + 17, J + 7), [0.72, 0.73, 0.7]),
      c(
        Pe((C + A) / 2 - 3, N + 17, J - 5, (C + A) / 2 + 3, N + 24, J + 1),
        [0.2, 0.3, 0.45],
      ));
    for (let G = F + 12; G < H - 12; G += 13.2) {
      if (Math.abs(G + 6 - J) < 14) continue;
      let te = 2.6 * (2 + Math.floor(s() * 4)),
        oe = Fg[Math.floor(s() * Fg.length)];
      c(Pe(C + 1, N, G, (C + A) / 2 - 0.2, N + te, G + 12.2), oe);
      let ee = Fg[Math.floor(s() * Fg.length)];
      c(
        Pe(
          (C + A) / 2 + 0.2,
          N,
          G,
          A - 1,
          N + te - 2.6 * Math.floor(s() * 2),
          G + 12.2,
        ),
        ee,
      );
    }
    e.add(Rn((C + A) / 2, N + 26, J, 0.4), [5, 4.6, 3.8], 0);
  }
  (L(34, 62, 140, 345, 11, [0.1, 0.13, 0.2], 0.78),
    L(34, 58, -360, -205, 10, [0.2, 0.08, 0.07], 0.2),
    L(470, 500, -190, -40, 9, [0.12, 0.14, 0.17], 0.8),
    L(600, 626, 160, 300, 9, [0.16, 0.12, 0.1], 0.2));
  for (let C = 340; C > -66; C -= 12.5) {
    let A = 398 + Math.sin(C * 0.013) * 14 + (s() - 0.5) * 3,
      F = Pe(-6 - s() * 2, -1.6, -7, 6 + s() * 2, 2.2 + s() * 1.2, 7);
    (F.rotateY((s() - 0.5) * 0.5),
      F.translate(A, 0, C),
      c(F, [0.2, 0.21, 0.22]));
  }
  {
    (c(Pt(5, 6, 3.6, "y", 399, 0.2, -72, 10), [0.3, 0.3, 0.3]),
      c(Pt(1.7, 2.3, 6, "y", 399, 5, -72, 10), [0.85, 0.85, 0.82]),
      c(Pt(1.5, 1.7, 4, "y", 399, 10, -72, 10), [0.62, 0.14, 0.1]),
      c(Pt(1.3, 1.5, 4, "y", 399, 14, -72, 10), [0.85, 0.85, 0.82]),
      c(Pt(2, 2, 0.3, "y", 399, 16.1, -72, 10), [0.3, 0.3, 0.32]),
      c(Pt(0.2, 1.3, 1.2, "y", 399, 18.9, -72, 8), [0.25, 0.25, 0.27]));
    for (let F = 0; F < 6; F++) {
      let H = (F / 6) * 6.283;
      c(
        Pe(
          399 + Math.cos(H) * 1.1 - 0.06,
          16.2,
          -72 + Math.sin(H) * 1.1 - 0.06,
          399 + Math.cos(H) * 1.1 + 0.06,
          18.3,
          -72 + Math.sin(H) * 1.1 + 0.06,
        ),
        [0.25, 0.25, 0.27],
      );
    }
    e.add(Rn(399, 17.25, -72, 0.85), [16, 15, 11], 6, 0, 0.09);
  }
  let U = 300;
  c(Pe(U - 330, -1.6, -520, U + 330, 2.2, -430), [0.16, 0.17, 0.18]);
  for (let [C, A, F, H] of [
    [-150, -452, 17, 15],
    [-112, -458, 17, 15],
    [-76, -450, 13, 18],
    [20, -455, 20, 14],
    [64, -462, 20, 14],
    [104, -452, 14, 19],
    [136, -462, 14, 19],
    [210, -456, 22, 12],
  ])
    (c(Pt(F, F, H, "y", U + C, 2.2 + H / 2, A, 14), [0.62, 0.63, 0.62]),
      c(
        Pt(F * 0.2, F, H * 0.12, "y", U + C, 2.2 + H * 1.06, A, 14),
        [0.52, 0.53, 0.53],
      ));
  for (let [C, A, F, H] of [
    [-32, -470, 96, 3.2],
    [168, -475, 70, 2.6],
  ]) {
    c(Pt(H * 0.62, H, F, "y", U + C, 2.2 + F / 2, A, 10), [0.5, 0.5, 0.5]);
    for (let N of [0.82, 0.94])
      c(
        Pt(H * 0.66, H * 0.7, F * 0.05, "y", U + C, 2.2 + F * N, A, 10),
        [0.6, 0.15, 0.1],
      );
    (e.add(Rn(U + C, 3.2 + F, A, 0.9), r, 2.2, s(), 0.5),
      e.add(Rn(U + C + H, 2.2 + F * 0.55, A, 0.7), r, 2.2, s(), 0.5));
  }
  for (let [C, A, F, H, N] of [
    [-230, -455, 70, 16, 30],
    [-10, -445, 30, 22, 18],
    [0, -452, 8, 44, 8],
    [-18, -450, 5, 36, 5],
    [270, -450, 60, 12, 30],
    [150, -448, 26, 28, 14],
  ])
    c(
      Pe(U + C - F / 2, 2.2, A - N / 2, U + C + F / 2, 2.2 + H, A + N / 2),
      [0.34, 0.36, 0.38],
    );
  for (let C = 0; C < 26; C++)
    e.add(
      Rn(U - 300 + s() * 600, 6 + s() * 26, -436 + s() * 6, 0.55),
      s() > 0.3 ? o : [3, 3.4, 3.8],
      0,
    );
  let k = t.build({ cast: !1, recv: !1 });
  return ((k.name = "skyline"), { root: k, tris: t.tris });
}
function Cw(n, e, t = 12) {
  let i = Rv(5521),
    s = [],
    o = [],
    r = [];
  for (let u = 0; u < t; u++) {
    let h =
        u % 3 === 0
          ? [54 + i() * 30, 9 + i() * 14, -4 + i() * 56]
          : [16 + i() * 26, 33 + i() * 12, -14 + i() * 28],
      p = 9 + i() * 16,
      d = (0.16 + i() * 0.16) * (i() > 0.5 ? 1 : -1),
      m = i() * 6.283,
      x = 5 + i() * 3,
      v = [
        [0.15, 0, 0, 0],
        [-0.13, 0, 0, 0],
        [-0.24, 0, 0.8, 1],
        [0.15, 0, 0, 0],
        [-0.24, 0, -0.8, 1],
        [-0.13, 0, 0, 0],
      ];
    for (let y of v)
      (s.push(y[0], y[1] - 60, y[2]),
        o.push(h[0], h[1], h[2], p),
        r.push(d, m, x, y[3]));
  }
  let a = new pt();
  (a.setAttribute("position", new et(s, 3)),
    a.setAttribute("aOrbit", new et(o, 4)),
    a.setAttribute("aPar", new et(r, 4)));
  let l = new An({ color: new Qe(0.2, 0.21, 0.23), side: ln, fog: !1 });
  ((l.onBeforeCompile = (u) => {
    ((u.uniforms.uTime = e),
      (u.vertexShader =
        `attribute vec4 aOrbit;
attribute vec4 aPar;
uniform float uTime;
` +
        u.vertexShader.replace(
          "#include <begin_vertex>",
          `
      float ga = aPar.y + uTime * aPar.x;
      float gdir = sign(aPar.x);
      vec3 gfw = vec3(-sin(ga), 0.0, cos(ga)) * gdir;
      vec3 grt = vec3(gfw.z, 0.0, -gfw.x);
      vec3 gl = position + vec3(0.0, 60.0, 0.0);
      float glide = smoothstep(-0.2, 0.5, sin(uTime * 0.31 + aPar.y * 3.0));
      float gflap = sin(uTime * aPar.z + aPar.y * 7.0) * mix(0.12, 0.55, glide) + 0.18;
      gl.y += aPar.w * gflap * abs(gl.z);
      gl.z *= mix(1.0, 0.86, aPar.w * abs(gflap));
      vec3 gc = aOrbit.xyz + vec3(cos(ga), 0.0, sin(ga)) * aOrbit.w + vec3(0.0, sin(ga * 0.7 + aPar.y) * 2.2 + sin(uTime * 0.23 + aPar.y) * 1.5, 0.0);
      vec3 transformed = gc + gfw * gl.x + grt * gl.z + vec3(0.0, gl.y - 0.3 * gdir * gl.z, 0.0);`,
        )));
  }),
    (l.customProgramCacheKey = () => "saltline-gulls"));
  let c = new ht(a, l);
  return (
    (c.frustumCulled = !1),
    (c.castShadow = !1),
    (c.receiveShadow = !1),
    (c.name = "gulls"),
    c
  );
}
var MP = ["crane", "ship", "boat", "sky"];
function kw(n, { only: e = null, showcase: t = !1 } = {}) {
  let i = (b) => !e || e === b,
    s = new At();
  s.name = "backdrop";
  let o = bw(),
    r = new K(31.5, -1.6, 21);
  t && r.set(24, 0.34, 15);
  let a = null,
    l = null,
    c = null,
    u = null,
    f = null;
  if (
    (i("boat") &&
      ((a = Ew(n, o)),
      a.root.position.copy(r),
      (a.root.rotation.y = -Math.PI / 2),
      s.add(a.root)),
    a && !t)
  ) {
    let b = new ho(),
      g = n.mats.get("rope");
    (b.add(
      g,
      ia(Ua(Ft(3.2, 0.95, 0.05), Ft(4.6, 2.12, 2.3), 0.22, 7), 0.016, 5),
    ),
      b.add(
        g,
        ia(Ua(Ft(-3.25, 0.82, 0.95), Ft(-4.6, 2.12, 2.3), 0.2, 7), 0.016, 5),
      ),
      a.root.add(b.build({ cast: !1, recv: !1 })));
  }
  (i("crane") && ((l = Dg(n, o)), s.add(l.root)),
    i("ship") && ((c = ww(n, o)), s.add(c.root)),
    i("sky") && ((u = Rw(n, o)), s.add(u.root)),
    (i("sky") || i("crane")) && ((f = Cw(n, o.uTime, 12)), s.add(f)));
  let h = o.build();
  (h && ((h.name = "backdrop-lamps"), (h.frustumCulled = !1), s.add(h)),
    n.scene.add(s));
  let p = [],
    d = (b, g) => {
      n.physics &&
        n.physics.addBox &&
        p.push(
          n.physics.addBox(b.min, b.max, {
            surface: g,
            tag: "backdrop",
            noNav: !!b.noNav,
          }),
        );
    };
  if (l) for (let b of l.colliders) d(b, "metal");
  if (c) for (let b of c.colliders) d(b, "metal");
  a && !t && d({ min: [30.25, -1.7, 17.4], max: [32.8, -0.7, 24.6] }, "rubber");
  let m = 0,
    x = 0;
  s.traverse((b) => {
    if (b.isMesh) {
      x++;
      let g = b.geometry;
      m += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  let v = 0;
  function y(b) {
    if (((v += b), (o.uTime.value = v), l)) {
      let g = l.spreader;
      ((g.rotation.x =
        0.012 * Math.sin(v * 0.52) + 0.004 * Math.sin(v * 1.31 + 1)),
        (g.rotation.z = 0.009 * Math.sin(v * 0.41 + 1.1)));
    }
    (c && (c.radar.rotation.y = v * 1.9),
      a &&
        ((a.root.position.y =
          r.y +
          (t
            ? 0
            : 0.05 * Math.sin(v * 1.15) + 0.025 * Math.sin(v * 2.3 + 1.3))),
        (a.hullGrp.rotation.x =
          0.05 * Math.sin(v * 0.9 + 0.4) + 0.016 * Math.sin(v * 2.1)),
        (a.hullGrp.rotation.z = 0.02 * Math.sin(v * 1.3 + 2))));
  }
  return (
    y(0),
    {
      update: y,
      root: s,
      boat: a ? a.root : new A0(),
      crane: l ? l.root : null,
      ship: c ? c.root : null,
      skyline: u ? u.root : null,
      gulls: f,
      lamps: h,
      colliders: p,
      spreader: l ? l.spreader : null,
      boatBase: r,
      extractionPoint: new K(30, 0, 20),
      shipName: "KITTIWAKE",
      craneId: "SALTLINE 04",
      stats: { tris: Math.round(m), drawCalls: x },
    }
  );
}
async function Iv(n) {
  return kw(n, {});
}
function _P(n) {
  let e = n.params && MP.includes(n.params.bshow) ? n.params.bshow : null,
    t = kw(n, { only: e, showcase: !0 });
  console.log("[backdrop] " + JSON.stringify(t.stats));
  let i = {
    crane: { cam: [0, 1.7, 27], target: [33, 13, 0] },
    ship: { cam: [24, 1.7, -2], target: [38, 9, -24] },
    boat: { cam: [19.5, 1.7, 11.5], target: [24, 0.9, 15] },
    sky: { cam: [-32, 1.7, 6], target: [30, 9, 0] },
  };
  return { ...(i[e] || i.crane), update: (s) => t.update(s) };
}
