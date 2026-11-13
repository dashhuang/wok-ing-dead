// Reference snapshot only; not a standalone module or a game entry point.
// See README.md for the source and required runtime context.
// === Level: playable layout, objectives and spawn points ===
var Av = {};
ar(Av, { create: () => Pg, showcase: () => mP });
var lP = new Set(["traffic_cone", "jerry_can"]);
function uw(n) {
  let e = new At();
  e.name = "level-static";
  let t = new At();
  t.name = "level-dynamic";
  let i = [],
    s = [],
    o = [],
    r = [],
    a = n.rng && n.rng.fork ? n.rng.fork() : Math.random,
    l = (C, A) => C + (A - C) * a(),
    c = (C, A) => n.mats.get(C, A),
    u = (C, A) => n.mats.get(C, { interior: !0, ...(A || {}) }),
    f = (C) => (typeof C == "string" ? c(C) : C);
  function h(C, A, F = {}) {
    let H = ns(C, f(A), { cast: F.cast !== !1, recv: F.recv !== !1 });
    return (
      F.p && H.position.set(F.p[0], F.p[1], F.p[2]),
      F.r && H.rotation.set(F.r[0] || 0, F.r[1] || 0, F.r[2] || 0),
      (F.parent || e).add(H),
      H
    );
  }
  function p(C, A, F, H, N, Z, Q, W = {}) {
    let J = W.bevel ? Ei(A, F, H, W.bevel) : ot(A, F, H);
    return h(J, C, { ...W, p: [N, Z, Q] });
  }
  function d(C, A, F, H, N, Z, Q, W = {}) {
    return p(
      C,
      Math.abs(N - A),
      Math.abs(Z - F),
      Math.abs(Q - H),
      (A + N) / 2,
      (F + Z) / 2,
      (H + Q) / 2,
      W,
    );
  }
  function m(C, A, F, H, N, Z, Q = {}) {
    let W = vt(Q.rTop ?? A, A, F, Q.seg || 12, !!Q.open),
      J =
        Q.axis === "x"
          ? [0, 0, Math.PI / 2]
          : Q.axis === "z"
            ? [Math.PI / 2, 0, 0]
            : Q.r || [0, 0, 0];
    return h(W, C, { ...Q, p: [H, N, Z], r: J });
  }
  function x(C, A, F = 0.03, H = {}) {
    return h(bn(A, F, H.radial || 6, !1, H.tension ?? 0.5), C, H);
  }
  function v(C, A, F, H = 0.015, N = {}) {
    let Z = new K(...A),
      Q = new K(...F),
      W = Z.distanceTo(Q),
      J = vt(H, H, W, N.seg || 6),
      G = h(J, C, N);
    return (
      G.position.copy(Z).add(Q).multiplyScalar(0.5),
      G.quaternion.setFromUnitVectors(new K(0, 1, 0), Q.sub(Z).normalize()),
      G
    );
  }
  function y(
    C,
    A,
    F,
    H,
    N,
    Z,
    {
      depth: Q = 0.4,
      width: W = 0.2,
      tf: J = 0.02,
      tw: G = 0.012,
      depthAxis: te = null,
      r: oe = null,
    } = {},
  ) {
    let ee = new At();
    (ee.position.set(H, N, Z),
      oe && ee.rotation.set(oe[0] || 0, oe[1] || 0, oe[2] || 0));
    let le = te || (A === "y" ? "z" : "y"),
      xe = ["x", "y", "z"].find((ue) => ue !== A && ue !== le),
      j = (ue, de, $) => {
        let se = {};
        return ((se[A] = ue), (se[le] = de), (se[xe] = $), [se.x, se.y, se.z]);
      },
      O = (ue) => {
        let de = { x: 0, y: 0, z: 0 };
        return ((de[le] = ue), [de.x, de.y, de.z]);
      },
      q = f(C);
    for (let ue of [-1, 1])
      h(ot(...j(F, J, W)), q, { parent: ee, p: O(ue * (Q / 2 - J / 2)) });
    return (h(ot(...j(F, Q - 2 * J, G)), q, { parent: ee }), e.add(ee), ee);
  }
  function b(C, A, F, H, N, Z, Q = "z+", W = 0) {
    let J = new w0(A, F),
      G = new ht(J, C);
    return (
      (G.castShadow = !1),
      (G.receiveShadow = !0),
      G.position.set(H, N, Z),
      Q === "z-"
        ? (G.rotation.y = Math.PI)
        : Q === "x+"
          ? (G.rotation.y = Math.PI / 2)
          : Q === "x-"
            ? (G.rotation.y = -Math.PI / 2)
            : Q === "y+" && ((G.rotation.x = -Math.PI / 2), (G.rotation.z = W)),
      e.add(G),
      G
    );
  }
  function g(C, A, F, H, N, Z, Q) {
    try {
      let W = n.mats.decal(C);
      return !W || !W.material
        ? null
        : b(W.material, A, A / (W.aspect || 1), F, H, N, Z, Q);
    } catch {
      return null;
    }
  }
  function E(C, A, F, H, N, Z, Q) {
    try {
      let W = n.mats.label(C, Q || {});
      return !W || !W.material
        ? null
        : b(W.material, A * (W.aspect || 4), A, F, H, N, Z);
    } catch {
      return null;
    }
  }
  function M(C, A, F, H, N, Z, Q = "concrete", W = {}) {
    return n.physics.addBox([C, A, F], [H, N, Z], { surface: Q, ...W });
  }
  let _ = new B0();
  function T(C, A, F = {}) {
    let H = C.userData.colliders || [],
      N = Math.abs(Math.sin(2 * A)) > 0.2;
    for (let Z of H) {
      let Q = [Z];
      if (N) {
        let W = Z.max[0] - Z.min[0],
          J = Z.max[2] - Z.min[2],
          G = W >= J ? 0 : 2,
          te = Math.max(W, J),
          oe = Math.max(0.25, Math.min(W, J)),
          ee = Math.min(10, Math.max(1, Math.round(te / oe)));
        if (ee > 1) {
          Q = [];
          for (let le = 0; le < ee; le++) {
            let xe = Z.min.slice(),
              j = Z.max.slice();
            ((xe[G] = Z.min[G] + (te * le) / ee),
              (j[G] = Z.min[G] + (te * (le + 1)) / ee),
              Q.push({ min: xe, max: j, surface: Z.surface }));
          }
        }
      }
      for (let W of Q)
        if (
          (_.min.set(W.min[0], W.min[1], W.min[2]),
          _.max.set(W.max[0], W.max[1], W.max[2]),
          _.applyMatrix4(C.matrixWorld),
          !(_.max.y - _.min.y < 0.2 && _.max.y < 0.3))
        ) {
          if (N) {
            let J = (_.max.x - _.min.x) * 0.07,
              G = (_.max.z - _.min.z) * 0.07;
            ((_.min.x += J), (_.max.x -= J), (_.min.z += G), (_.max.z -= G));
          }
          n.physics.addBox(_.min, _.max, {
            surface: W.surface || Z.surface || "metal",
            ...(F.colOpts || {}),
          });
        }
    }
  }
  function w(C, A, F, H = 0, N = {}, Z = 0, Q = {}) {
    if (
      !Q.inert &&
      ((C === "barrel" && N.color === "red" && !N.lying && !N.open) ||
        C === "gas_cylinders")
    )
      return (
        r.push({ name: C, x: A, y: Z, z: F, yaw: H, opts: { ...N } }),
        o.push({ name: C, x: A, y: Z, z: F, yaw: H }),
        new At()
      );
    let W = n.props.build(C, N);
    return (
      W.position.set(A, Z, F),
      (W.rotation.y = H),
      (Q.dynamic ? t : e).add(W),
      W.updateMatrixWorld(!0),
      !Q.noCol && !lP.has(C) && T(W, H, Q),
      typeof W.userData.update == "function" &&
        s.push((J) => W.userData.update(J)),
      o.push({ name: C, x: A, y: Z, z: F, yaw: H }),
      W
    );
  }
  function S(C, A, F = 0, H = 0, N = {}) {
    let Z = w("stairs_metal", C, A, F, N, H),
      Q = Math.abs(Math.cos(F)) > 0.5;
    return (
      i.push(
        Q
          ? [C - 1.5, A - 0.5, C + 1.5, A + 0.5]
          : [C - 0.5, A - 1.5, C + 0.5, A + 1.5],
      ),
      Z
    );
  }
  function R(C, A, F = 0, H = 0, N = {}, Z = [!0, !0]) {
    let Q = Z[0] && Z[1] ? "both" : Z[0] ? "left" : Z[1] ? "right" : "none",
      W = w("catwalk", C, A, F, { ...N, rails: Q }, H),
      J = Math.abs(Math.cos(F)) > 0.5,
      G = J ? 1.5 : 0.6,
      te = J ? 0.6 : 1.5;
    return (i.push([C - G, A - te, C + G, A + te]), W);
  }
  let z = { 20: "container20", 40: "container40", hc: "container40hc" },
    I = { container20: 2.59, container40: 2.59, container40hc: 2.9 },
    L = { container20: 6.06, container40: 12.19, container40hc: 12.19 };
  function U(C, A, F, H = 0, N = 1) {
    let Z = 0,
      Q = [];
    for (let W = 0; W < F.length; W++) {
      let [J, G, te = {}] = F[W],
        oe = z[J],
        ee = (te.dx || 0) + (W ? l(-0.05, 0.05) * N : 0),
        le = (te.dz || 0) + (W ? l(-0.04, 0.04) * N : 0),
        xe = H + l(-1, 1) * 0.022 * N * (W ? 0.6 : 1) + (te.flip ? Math.PI : 0),
        j = w(
          oe,
          C + ee,
          A + le,
          xe,
          {
            color: G,
            seed: Math.floor(l(1, 99999)),
            wear: te.wear ?? l(0.2, 0.85),
            doors: te.doors || 0,
          },
          Z,
        ),
        O = L[oe],
        q = I[oe],
        ue = Math.abs(Math.cos(H)) > 0.5,
        de = (ue ? O : 2.44) / 2,
        $ = (ue ? 2.44 : O) / 2;
      if (
        (i.push([C + ee - de, A + le - $, C + ee + de, A + le + $]), te.reefer)
      ) {
        let se = -(O / 2 + 0.2),
          fe = Math.cos(xe),
          me = Math.sin(xe);
        w(
          "reefer_unit",
          C + ee + se * fe,
          A + le - se * me,
          xe,
          { seed: W + 3 },
          Z + 0.14,
        );
      }
      (Q.push(j), (Z += q));
    }
    return { top: Z, objs: Q };
  }
  function k(C, A) {
    for (let F of i)
      if (C >= F[0] && C <= F[2] && A >= F[1] && A <= F[3]) return !0;
    return !1;
  }
  return {
    G: n,
    THREE: ut,
    staticRoot: e,
    dynRoot: t,
    metalRects: i,
    updaters: s,
    placed: o,
    explosives: r,
    rng: a,
    rnd: l,
    M: c,
    MI: u,
    add: h,
    box: p,
    slab: d,
    cyl: m,
    tube: x,
    rod: v,
    ibeam: y,
    quad: b,
    decal: g,
    label: E,
    col: M,
    place: w,
    stairs: S,
    catwalk: R,
    stack: U,
    isMetal: k,
  };
}
var ta = 4;
function fw(n, { scale: e = 0.5, maxW: t = 2048 } = {}) {
  let i = { count: 0, material: null, update() {} };
  if (typeof document > "u") return i;
  let s = new Map();
  if (
    (n.traverse((b) => {
      if (!b.isMesh || Array.isArray(b.material)) return;
      let g = b.material;
      if (
        !g ||
        g.name !== "label" ||
        !g.map ||
        !g.map.image ||
        !g.map.image.width
      )
        return;
      let E = b,
        M = !1;
      for (; E;) {
        if (E.userData && E.userData.noMerge) {
          M = !0;
          break;
        }
        E = E.parent;
      }
      M || (s.has(g) || s.set(g, []), s.get(g).push(b));
    }),
    s.size < 2)
  )
    return i;
  let o = [...s.keys()].map((b) => {
    let g = b.map.image;
    return {
      m: b,
      img: g,
      w: Math.max(4, Math.ceil(g.width * e)),
      h: Math.max(4, Math.ceil(g.height * e)),
    };
  });
  o.sort((b, g) => g.h - b.h || g.w - b.w);
  let r = 0,
    a = 0,
    l = 0;
  for (let b of o) {
    let g = Math.min(b.w, t - 2 * ta);
    (g < b.w && ((b.h = Math.max(4, Math.round((b.h * g) / b.w))), (b.w = g)),
      r + b.w + 2 * ta > t && ((r = 0), (a += l), (l = 0)),
      (b.x = r + ta),
      (b.y = a + ta),
      (r += b.w + 2 * ta),
      (l = Math.max(l, b.h + 2 * ta)));
  }
  let c = t,
    u = ks.ceilPowerOfTwo(Math.max(16, a + l));
  if (u > 4096) return i;
  let f = document.createElement("canvas");
  ((f.width = c), (f.height = u));
  let h = f.getContext("2d"),
    p = () => {
      (h.setTransform(1, 0, 0, 1, 0, 0),
        (h.globalAlpha = 1),
        (h.globalCompositeOperation = "source-over"),
        h.clearRect(0, 0, c, u));
      for (let b of o)
        (h.drawImage(b.img, b.x - ta, b.y - ta, b.w + 2 * ta, b.h + 2 * ta),
          h.clearRect(b.x, b.y, b.w, b.h),
          h.drawImage(b.img, b.x, b.y, b.w, b.h),
          (b.version = b.m.map.version));
    };
  p();
  let d = o[0].m,
    m = new Rs(f);
  ((m.colorSpace = d.map.colorSpace),
    (m.anisotropy = d.map.anisotropy),
    (m.generateMipmaps = !0),
    (m.minFilter = yn));
  let x = d.clone();
  ((x.map = m), (x.name = "label_atlas"));
  let v = new Map();
  for (let b of o) {
    let g = b.x / c,
      E = (b.x + b.w) / c,
      M = 1 - b.y / u,
      _ = 1 - (b.y + b.h) / u;
    for (let T of s.get(b.m)) {
      let w = T.geometry.uuid + "|" + b.m.uuid,
        S = v.get(w);
      if (!S) {
        S = T.geometry.clone();
        let R = S.attributes.uv;
        if (R) {
          for (let z = 0; z < R.count; z++)
            R.setXY(
              z,
              g + ks.clamp(R.getX(z), 0, 1) * (E - g),
              _ + ks.clamp(R.getY(z), 0, 1) * (M - _),
            );
          R.needsUpdate = !0;
        }
        v.set(w, S);
      }
      ((T.geometry = S), (T.material = x));
    }
  }
  let y = 0;
  return {
    count: o.length,
    material: x,
    size: [c, u],
    update(b) {
      if (!(y > 8)) {
        y += b;
        for (let g of o)
          if (g.m.map.version !== g.version) {
            (p(), (m.needsUpdate = !0));
            break;
          }
      }
    },
  };
}
var cP = {
  FY: 2.6,
  CY: 4.95,
  RY: 5.08,
  TW: 0.08,
  X0: -15.7,
  X1: -10.3,
  Z0: -27.24,
  Z1: -23.8,
  DX0: -11.6,
  DX1: -10.58,
  DH: 2.1,
  SW0: -15.25,
  SW1: -12.45,
  EW0: -26.95,
  EW1: -24.1,
  SILL: 0.9,
  HEAD: 1.95,
  DESK: { x0: -14.95, x1: -12.25, d: 0.76, h: 0.74 },
};
function hw(n, e, t) {
  let {
      M: i,
      MI: s,
      add: o,
      box: r,
      slab: a,
      cyl: l,
      rod: c,
      tube: u,
      col: f,
      G: h,
    } = n,
    { mFrame: p, mGalv: d, mDark: m } = t,
    x = 0.25,
    v = cP,
    y = v.FY,
    b = v.CY,
    g = v.RY,
    E = v.TW,
    M = y,
    _ = e.X0 + x + 0.02,
    T = -10.25,
    w = e.Z0 + x + 0.02,
    S = -23.75,
    R = v.X0,
    z = v.X1,
    I = v.Z0,
    L = v.Z1,
    U = R + E,
    k = z - E,
    C = I + E,
    A = L - E,
    F = y + v.SILL,
    H = y + v.HEAD,
    N = v.DX0,
    Z = v.DX1,
    Q = y + v.DH,
    W = 0.05,
    J = v.SW0,
    G = v.SW1,
    te = v.EW0,
    oe = v.EW1,
    ee = { vertexColors: !0 },
    le = s("armor_white", { color: 13159367, vertexColors: !0 }),
    xe = s("plastic_grey", ee),
    j = s("aluminium"),
    O = s("rubber"),
    q = s("glass"),
    ue = s("wood_dark"),
    de = s("diamond_plate"),
    $ = s("paint_teal"),
    se = s("paint_red"),
    fe = s("paint_yellow"),
    me = s("paint_green"),
    ge = s("cardboard"),
    ce = i("paint_yellow"),
    P = h.mats.emissive(14674420, 1.9),
    D = h.mats.emissive(16773328, 3),
    B = h.mats.emissive(529180, 1),
    X = h.mats.emissive(5810360, 0.8),
    re = h.mats.emissive(13666864, 0.9),
    Y = h.mats.emissive(9411234, 0.55),
    he = (ve) => ((ve = Math.max(0, Math.min(1, ve))), ve * ve * (3 - 2 * ve)),
    V = [-13, b, -25.5],
    ne = [(N + Z) / 2, Q + 0.14, L + 0.06],
    ye = (ve, we, Ae) => {
      let ie = ve - V[0],
        ae = (we - V[1]) * 1.15,
        pe = Ae - V[2],
        Ee = 1.15 + 1.5 / (1 + 0.35 * (ie * ie + ae * ae + pe * pe));
      Ee *= 0.8 + 0.2 * he((we - y) / 0.4);
      let Me = Math.min(ve - U, k - ve),
        Ie = Math.min(Ae - C, A - Ae);
      return (
        (Ee *= 0.86 + 0.14 * he(Math.max(Me, Ie) / 0.45)),
        [Ee * 0.97, Ee, Ee * 1.035]
      );
    },
    Te = (ve, we, Ae) => {
      let ie =
          (0.86 + 0.14 * he((we - y) / 0.6)) *
          (1 - 0.08 * he((we - (b - 0.3)) / 0.4)),
        ae = ve - ne[0],
        pe = we - ne[1],
        Ee = Ae - ne[2],
        Me = 0.6 / (1 + 6 * (ae * ae + pe * pe + Ee * Ee));
      return [
        ie * (1 + Me),
        ie * 0.99 * (1 + Me * 0.85),
        ie * 0.965 * (1 + Me * 0.6),
      ];
    },
    Re = () => [0.7, 0.69, 0.66];
  function Ue(ve) {
    let we = ve.attributes.uv,
      Ae = ve.attributes.position,
      ie = ve.attributes.normal;
    for (let ae = 0; ae < we.count; ae++) {
      let pe = Math.abs(ie.getX(ae)),
        Ee = Math.abs(ie.getY(ae)),
        Me = Ae.getX(ae),
        Ie = Ae.getY(ae),
        Ce = Ae.getZ(ae);
      pe > 0.5
        ? we.setXY(ae, Ce, Ie)
        : Ee > 0.5
          ? we.setXY(ae, Me, Ce)
          : we.setXY(ae, Me, Ie);
    }
    return ve;
  }
  function Ve(ve, we, Ae, ie, ae, pe, Ee, Me, Ie = 0.45, Ce = {}) {
    let Ye = Math.abs(ae - we),
      rt = Math.abs(pe - Ae),
      Be = Math.abs(Ee - ie),
      _t = (z0) => Math.max(1, Math.min(14, Math.round(z0 / Ie))),
      wt = new R0(Ye, rt, Be, _t(Ye), _t(rt), _t(Be));
    return (
      wt.translate((we + ae) / 2, (Ae + pe) / 2, (ie + Ee) / 2),
      o(Kr(Ue(wt), Me), ve, Ce)
    );
  }
  function ze(ve, we, Ae, ie, ae, pe, Ee, Me, Ie = 0.012, Ce = {}) {
    let Ye = Ei(we, Ae, ie, Ie);
    return (Ye.translate(ae, pe, Ee), o(Kr(Ye, Me), ve, Ce));
  }
  function Ge(ve, we, Ae, ie, ae, pe, Ee, Me, Ie = 16) {
    let Ce = vt(we, we, Ae, Ie);
    return (
      Ee === "x"
        ? Ce.rotateZ(Math.PI / 2)
        : Ee === "z" && Ce.rotateX(Math.PI / 2),
      Ce.translate(ie, ae, pe),
      o(Kr(Ce, Me), ve)
    );
  }
  function _e(ve, we, Ae, ie = 0) {
    let ae = new At();
    return (
      ae.position.set(ve, we, Ae),
      (ae.rotation.y = ie),
      n.staticRoot.add(ae),
      ae
    );
  }
  function Ne(ve, we, Ae, ie, ae, pe, Ee) {
    let Me = new ht(new w0(Ae, ie), we);
    return (
      (Me.castShadow = !1),
      (Me.receiveShadow = !1),
      Me.position.set(ae, pe, Ee),
      ve.add(Me),
      Me
    );
  }
  function ke(ve, we, Ae, ie, ae, pe, Ee, Me) {
    try {
      let Ie = h.mats.label(ve, Ee || {});
      if (!Ie || !Ie.material) return 0;
      let Ce = we * (Ie.aspect || 4);
      return (
        Me && Ce > Me && ((we *= Me / Ce), (Ce = Me)),
        pe === "z+"
          ? n.quad(Ie.material, Ce, we, Ae + Ce / 2, ie, ae, pe)
          : pe === "z-"
            ? n.quad(Ie.material, Ce, we, Ae - Ce / 2, ie, ae, pe)
            : pe === "x+"
              ? n.quad(Ie.material, Ce, we, ae, ie, Ae - Ce / 2, pe)
              : n.quad(Ie.material, Ce, we, ae, ie, Ae + Ce / 2, pe),
        Ce
      );
    } catch {
      return 0;
    }
  }
  function je(ve, we, Ae, ie, ae, pe, Ee) {
    try {
      let Me = h.mats.decal(ve);
      if (!Me || !Me.material) return;
      let Ie = Me.aspect || 1,
        Ce = we,
        Ye = Ce / Ie;
      (Ye > Ae && ((Ye = Ae), (Ce = Ye * Ie)),
        n.quad(Me.material, Ce, Ye, ie, ae - Ye / 2, pe, Ee));
    } catch {}
  }
  let Ze = n.staticRoot.children.length;
  (a(de, _, M - 0.1, w, T, M, S),
    a(d, _ + 0.2, M - 0.112, w + 0.1, T - 0.16, M - 0.1, S - 0.16, {
      cast: !1,
    }));
  let qe = [_ + 0.1, -13, T - 0.08];
  for (let ve of qe)
    n.ibeam(p, "z", S - w, ve, M - 0.2, (w + S) / 2, {
      depth: 0.2,
      width: 0.14,
      tf: 0.014,
      tw: 0.01,
    });
  n.ibeam(p, "x", T - _, (_ + T) / 2, M - 0.2, S - 0.08, {
    depth: 0.2,
    width: 0.14,
    tf: 0.014,
    tw: 0.01,
  });
  for (let ve = w + 0.35; ve < S - 0.4; ve += 0.56)
    a(d, _ + 0.17, M - 0.22, ve - 0.025, T - 0.15, M - 0.11, ve + 0.025);
  a(p, T - 0.012, M - 0.3, w, T + 0.012, M + 0.004, S, { bevel: 0.004 });
  for (let ve = w + 0.3; ve < S; ve += 0.62)
    l(d, 0.014, 0.012, T + 0.016, M - 0.15, ve, { axis: "x", seg: 6 });
  let Oe = [
    [T - 0.08, S - 0.08],
    [T - 0.08, w + 0.3],
    [-13, S - 0.08],
  ];
  for (let [ve, we] of Oe) {
    (r(p, 0.14, M - 0.3, 0.14, ve, (M - 0.3) / 2, we, { bevel: 0.01 }),
      f(ve - 0.08, 0, we - 0.08, ve + 0.08, M, we + 0.08, "metal", {
        noNav: !0,
      }),
      r(m, 0.3, 0.02, 0.3, ve, e.FLOOR + 0.01, we, { bevel: 0.004 }));
    for (let Ae of [-1, 1])
      for (let ie of [-1, 1])
        l(d, 0.013, 0.02, ve + Ae * 0.11, e.FLOOR + 0.03, we + ie * 0.11, {
          seg: 6,
        });
    r(p, 0.22, 0.014, 0.22, ve, M - 0.307, we);
  }
  let mt = (ve, we, Ae, ie) =>
    c(
      p,
      [ve + Ae * 0.05, M - 1, we + ie * 0.05],
      [ve + Ae * 0.68, M - 0.31, we + ie * 0.68],
      0.028,
      { seg: 6 },
    );
  (mt(Oe[0][0], Oe[0][1], -1, 0),
    mt(Oe[0][0], Oe[0][1], 0, -1),
    mt(Oe[1][0], Oe[1][1], 0, 1),
    mt(Oe[2][0], Oe[2][1], -1, 0),
    mt(Oe[2][0], Oe[2][1], 1, 0),
    mt(Oe[2][0], Oe[2][1], 0, -1),
    f(_, M - 0.12, w, T, M, S, "metal", { noNav: !0 }));
  let $e = m,
    Ke = 0.9;
  function Bt(ve, we, Ae, ie, ae, pe) {
    let Ee = ve - (we * E) / 2,
      Me = ve - we * E;
    (Ve(le, Ae, ae, Math.min(ve, Ee), ie, pe, Math.max(ve, Ee), Te),
      Ve(le, Ae, ae, Math.min(Ee, Me), ie, pe, Math.max(Ee, Me), ye));
    for (let Ie = R + Ke; Ie < ie - 0.1; Ie += Ke)
      Ie > Ae + 0.1 &&
        (a($e, Ie - 0.009, ae, ve, Ie + 0.009, pe, ve + we * 0.0015, {
          cast: !1,
        }),
        a($e, Ie - 0.006, ae, Me - we * 0.0015, Ie + 0.006, pe, Me, {
          cast: !1,
        }));
  }
  function Gt(ve, we, Ae, ie, ae, pe) {
    let Ee = ve - (we * E) / 2,
      Me = ve - we * E;
    (Ve(le, Math.min(ve, Ee), ae, Ae, Math.max(ve, Ee), pe, ie, Te),
      Ve(le, Math.min(Ee, Me), ae, Ae, Math.max(Ee, Me), pe, ie, ye));
    for (let Ie = I + Ke; Ie < ie - 0.1; Ie += Ke)
      Ie > Ae + 0.1 &&
        (a($e, ve, ae, Ie - 0.009, ve + we * 0.0015, pe, Ie + 0.009, {
          cast: !1,
        }),
        a($e, Me - we * 0.0015, ae, Ie - 0.006, Me, pe, Ie + 0.006, {
          cast: !1,
        }));
  }
  (Bt(L, 1, R, J, y, b),
    Bt(L, 1, J, G, y, F),
    Bt(L, 1, J, G, H, b),
    Bt(L, 1, G, N - W, y, b),
    Bt(L, 1, N - W, Z + W, Q + W, b),
    Bt(L, 1, Z + W, z, y, b),
    Gt(z, 1, I, te, y, b),
    Gt(z, 1, te, oe, y, F),
    Gt(z, 1, te, oe, H, b),
    Gt(z, 1, oe, L, y, b),
    Bt(I, -1, R, z, y, b),
    Gt(R, -1, I, L, y, b),
    Ve(
      xe,
      U,
      y - 0.004,
      C,
      k,
      y + 0.006,
      A,
      (ve, we, Ae) => {
        let ie = ye(ve, y + 0.4, Ae);
        return [ie[0] * 1.25, ie[1] * 1.25, ie[2] * 1.25];
      },
      0.5,
      { cast: !1 },
    ),
    Ve(le, U, b - 0.02, C, k, b, A, ye, 0.4, { cast: !1 }));
  for (let ve = U + 0.62; ve < k - 0.1; ve += 0.6)
    a(j, ve - 0.012, b - 0.024, C, ve + 0.012, b - 0.02, A, { cast: !1 });
  for (let ve = C + 0.58; ve < A - 0.1; ve += 0.6)
    a(j, U, b - 0.0245, ve - 0.012, k, b - 0.0205, ve + 0.012, { cast: !1 });
  (Ve(le, R - 0.03, b, I - 0.02, z + 0.05, g, L + 0.05, Re, 0.7),
    a(d, R - 0.035, g - 0.05, L + 0.05, z + 0.062, g + 0.012, L + 0.062),
    a(d, z + 0.05, g - 0.05, I - 0.02, z + 0.062, g + 0.012, L + 0.05),
    a(d, R - 0.035, b - 0.012, L, z + 0.05, b, L + 0.05, { cast: !1 }),
    a(d, z, b - 0.012, I, z + 0.05, b, L, { cast: !1 }),
    a(d, R, y, L, N - W, y + 0.07, L + 0.012, { bevel: 0.003 }),
    a(d, Z + W, y, L, z, y + 0.07, L + 0.012, { bevel: 0.003 }),
    a(d, z, y, I, z + 0.012, y + 0.07, L + 0.012, { bevel: 0.003 }),
    a(d, z - 0.07, y + 0.07, L - 0.07, z + 0.006, b - 0.012, L + 0.006),
    a(d, R - 0.006, y + 0.07, L - 0.07, R + 0.07, b - 0.012, L + 0.006),
    a(d, z - 0.07, y, I - 0.006, z + 0.006, b - 0.012, I + 0.07));
  let vi =
      (ve, we) =>
      (Ae, ie, ae, pe, Ee, Me, Ie, Ce = {}) =>
        Ce.fn
          ? Ve(
              Ae,
              ie,
              pe,
              ve + we * Math.min(Me, Ie),
              ae,
              Ee,
              ve + we * Math.max(Me, Ie),
              Ce.fn,
              0.4,
            )
          : a(Ae, ie, pe, ve + we * Me, ae, Ee, ve + we * Ie, Ce),
    q0 =
      (ve, we) =>
      (Ae, ie, ae, pe, Ee, Me, Ie, Ce = {}) =>
        Ce.fn
          ? Ve(
              Ae,
              ve + we * Math.min(Me, Ie),
              pe,
              ie,
              ve + we * Math.max(Me, Ie),
              Ee,
              ae,
              Ce.fn,
              0.4,
            )
          : a(Ae, ve + we * Me, pe, ie, ve + we * Ie, Ee, ae, Ce);
  function yi(ve, we, Ae, ie) {
    let ae = E / 2,
      pe = 0.05,
      Ee = { bevel: 0.006 },
      Me = (Ae - we - pe) / ie,
      Ie = 0.012,
      Ce = [];
    (ve(j, we, Ae, H - pe, H, -ae - 0.012, ae + 0.014, Ee),
      ve(j, we, Ae, F, F + pe, -ae - 0.012, ae + 0.014, Ee));
    for (let Ye = 0; Ye <= ie; Ye++) {
      let rt = we + Ye * Me;
      ve(j, rt, rt + pe, F + pe, H - pe, -ae - 0.012, ae + 0.014, Ee);
    }
    for (let Ye = 0; Ye < ie; Ye++) {
      let rt = we + Ye * Me + pe,
        Be = we + (Ye + 1) * Me;
      (Ce.push([rt, Be]),
        ve(q, rt, Be, F + pe, H - pe, -0.004, 0.004, { cast: !1 }),
        ve(O, rt, rt + Ie, F + pe, H - pe, -0.013, 0.013, { cast: !1 }),
        ve(O, Be - Ie, Be, F + pe, H - pe, -0.013, 0.013, { cast: !1 }),
        ve(O, rt, Be, F + pe, F + pe + Ie, -0.013, 0.013, { cast: !1 }),
        ve(O, rt, Be, H - pe - Ie, H - pe, -0.013, 0.013, { cast: !1 }));
    }
    return (
      ve(j, we - 0.03, Ae + 0.03, F - 0.02, F, ae, ae + 0.07, {
        bevel: 0.005,
      }),
      ve(j, we - 0.03, Ae + 0.03, F - 0.05, F - 0.02, ae, ae + 0.012),
      ve(le, we - 0.03, Ae + 0.03, F - 0.03, F, -ae - 0.11, -ae, { fn: ye }),
      Ce
    );
  }
  (yi(vi(L - E / 2, 1), J, G, 3),
    yi(q0(z - E / 2, 1), te, oe, 3),
    r(j, 0.03, 0.06, 0.02, J + 0.95, F + 0.5, A - 0.02),
    r(j, 0.02, 0.06, 0.03, k - 0.02, F + 0.5, te + 0.96),
    a(p, N - W, y, A - 0.015, N, Q + W, L + 0.015, { bevel: 0.006 }),
    a(p, Z, y, A - 0.015, Z + W, Q + W, L + 0.015, { bevel: 0.006 }),
    a(p, N - W, Q, A - 0.015, Z + W, Q + W, L + 0.015, { bevel: 0.006 }),
    a(O, N, y, A + 0.004, N + 0.012, Q, A + 0.02, { cast: !1 }),
    a(O, Z - 0.012, y, A + 0.004, Z, Q, A + 0.02, { cast: !1 }),
    a(O, N, Q - 0.012, A + 0.004, Z, Q, A + 0.02, { cast: !1 }),
    a(j, N, y - 0.002, A - 0.03, Z, y + 0.008, L + 0.04, { bevel: 0.003 }));
  let sn = (98 * Math.PI) / 180,
    P0 = 0.985,
    $t = 0.044,
    Sn = 0.012,
    bi = 2.085,
    oi = _e(N - 0.012, y, A - 0.03, sn),
    xn = (ve, we, Ae, ie, ae, pe, Ee, Me = {}) =>
      r(
        ve,
        Math.abs(ae - we),
        Math.abs(pe - Ae),
        Math.abs(Ee - ie),
        (we + ae) / 2,
        (Ae + pe) / 2,
        (ie + Ee) / 2,
        { ...Me, parent: oi },
      ),
    Zt = { x0: 0.6, x1: 0.84, y0: 1.15, y1: 1.8 };
  (xn($, 0, Sn, -$t / 2, P0, Zt.y0, $t / 2),
    xn($, 0, Zt.y1, -$t / 2, P0, bi, $t / 2),
    xn($, 0, Zt.y0, -$t / 2, Zt.x0, Zt.y1, $t / 2),
    xn($, Zt.x1, Zt.y0, -$t / 2, P0, Zt.y1, $t / 2),
    xn(q, Zt.x0, Zt.y0, -0.004, Zt.x1, Zt.y1, 0.004, { cast: !1 }));
  for (let ve of [-1, 1]) {
    let we = ve * ($t / 2 - 0.004),
      Ae = ve * ($t / 2 + 0.006),
      ie = 0.018;
    (xn(j, Zt.x0 - ie, Zt.y0 - ie, we, Zt.x1 + ie, Zt.y0, Ae),
      xn(j, Zt.x0 - ie, Zt.y1, we, Zt.x1 + ie, Zt.y1 + ie, Ae),
      xn(j, Zt.x0 - ie, Zt.y0, we, Zt.x0, Zt.y1, Ae),
      xn(j, Zt.x1, Zt.y0, we, Zt.x1 + ie, Zt.y1, Ae),
      xn(j, 0.04, 0.05, (ve * $t) / 2, P0 - 0.04, 0.27, ve * ($t / 2 + 0.002)),
      xn(
        j,
        P0 - 0.115,
        0.95,
        (ve * $t) / 2,
        P0 - 0.065,
        1.13,
        ve * ($t / 2 + 0.003),
      ),
      l(j, 0.011, 0.05, P0 - 0.09, 1.07, ve * ($t / 2 + 0.027), {
        axis: "z",
        seg: 8,
        parent: oi,
      }),
      xn(
        j,
        P0 - 0.22,
        1.06,
        ve * ($t / 2 + 0.042),
        P0 - 0.078,
        1.08,
        ve * ($t / 2 + 0.06),
        { bevel: 0.006 },
      ),
      l(m, 0.011, 0.016, P0 - 0.09, 0.985, ve * ($t / 2 + 0.005), {
        axis: "z",
        seg: 8,
        parent: oi,
      }));
  }
  for (let ve of [0.25, 1.05, 1.85])
    l(j, 0.009, 0.1, -0.004, ve, -$t / 2 - 0.004, { seg: 8, parent: oi });
  (xn(j, 0.07, 1.975, -$t / 2 - 0.048, 0.31, 2.035, -$t / 2, {
    bevel: 0.006,
  }),
    xn(j, 0.08, 1.5, $t / 2, 0.54, 1.74, $t / 2 + 0.003));
  for (let [ve, we, Ae] of [
    ["SITE OFFICE", 0.075, 1.665],
    ["BERTH 4", 0.055, 1.565],
  ])
    try {
      let ie = h.mats.label(ve, {
        color: "black",
        font: "sans",
        distress: 0.12,
      });
      if (ie && ie.material) {
        let ae = we,
          pe = ae * (ie.aspect || 4);
        (pe > 0.42 && ((ae *= 0.42 / pe), (pe = 0.42)),
          (Ne(
            oi,
            ie.material,
            pe,
            ae,
            0.1 + pe / 2,
            Ae,
            $t / 2 + 0.0055,
          ).receiveShadow = !0));
      }
    } catch {}
  oi.updateMatrixWorld(!0);
  let Vs = new K(0.12, 2.045, -$t / 2 - 0.03).applyMatrix4(oi.matrixWorld),
    ws = [N + 0.24, Q + 0.022, A - 0.022],
    cl = [N + 0.2, Vs.y + 0.008, A - 0.2];
  (c(j, [Vs.x, Vs.y, Vs.z], cl, 0.007),
    c(j, cl, ws, 0.007),
    r(j, 0.07, 0.02, 0.03, ws[0], ws[1], ws[2] + 0.004),
    l(O, 0.02, 0.035, N - 0.26, y + 0.022, A - 0.93, { seg: 8 }),
    a(O, N + 0.08, y + 0.006, A - 0.78, Z - 0.06, y + 0.016, A - 0.1, {
      bevel: 0.004,
      cast: !1,
    }));
  {
    let ve = (N + Z) / 2,
      we = Q + 0.135,
      Ae = L;
    (r(m, 0.3, 0.13, 0.05, ve, we, Ae + 0.025, { bevel: 0.012 }),
      r(D, 0.23, 0.08, 0.04, ve, we, Ae + 0.055, { cast: !1, recv: !1 }));
    for (let ie of [-0.028, 0, 0.028])
      r(d, 0.27, 0.006, 0.006, ve, we + ie, Ae + 0.082, { cast: !1 });
    for (let ie of [-0.135, 0.135])
      r(d, 0.006, 0.09, 0.05, ve + ie, we, Ae + 0.06, { cast: !1 });
  }
  (a(j, -12.34, y + 1.42, L, -11.76, y + 1.76, L + 0.004),
    ke(
      "SITE OFFICE",
      0.095,
      -12.31,
      y + 1.655,
      L + 0.007,
      "z+",
      { color: "black", font: "sans", distress: 0.15 },
      0.52,
    ),
    ke(
      "BERTH 4 CONTROL",
      0.06,
      -12.31,
      y + 1.515,
      L + 0.007,
      "z+",
      { color: "black", font: "sans", distress: 0.15 },
      0.52,
    ),
    n.decal("hazard_general", 0.2, -12.2, y + 1.2, L + 0.003, "z+"),
    ke(
      "AUTHORISED STAFF ONLY",
      0.04,
      -12.05,
      y + 1.2,
      L + 0.003,
      "z+",
      { color: "red", font: "sans", distress: 0.25 },
      0.34,
    ));
  {
    let we = L + 0.085,
      Ae = y + 0.62;
    (l(se, 0.065, 0.4, -10.425, Ae + 0.2, we, { seg: 14 }),
      l(se, 0.065, 0.05, -10.425, Ae + 0.425, we, { rTop: 0.03, seg: 14 }),
      l(m, 0.02, 0.05, -10.425, Ae + 0.475, we, { seg: 8 }),
      r(m, 0.11, 0.016, 0.022, -10.425 + 0.03, Ae + 0.505, we),
      r(m, 0.09, 0.014, 0.02, -10.425 + 0.035, Ae + 0.535, we, {
        r: [0, 0, 0.25],
      }),
      u(
        O,
        [
          [-10.425 - 0.02, Ae + 0.47, we + 0.01],
          [-10.425 - 0.085, Ae + 0.4, we + 0.01],
          [-10.425 - 0.082, Ae + 0.2, we + 0.02],
          [-10.425 - 0.075, Ae + 0.1, we + 0.02],
        ],
        0.008,
        { cast: !1 },
      ),
      r(d, 0.15, 0.03, 0.006, -10.425, Ae + 0.3, we - 0.07),
      r(d, 0.02, 0.5, 0.008, -10.425, Ae + 0.25, L + 0.006),
      a(
        j,
        -10.425 - 0.045,
        Ae + 0.13,
        we + 0.062,
        -10.425 + 0.045,
        Ae + 0.27,
        we + 0.066,
        { cast: !1 },
      ),
      a(se, -10.425 - 0.085, y + 1.42, L, -10.425 + 0.085, y + 1.62, L + 0.004),
      ke(
        "FIRE",
        0.055,
        -10.425 - 0.07,
        y + 1.52,
        L + 0.007,
        "z+",
        { color: "white", font: "sans", distress: 0.1 },
        0.14,
      ));
  }
  {
    let ve = z,
      we = ve + 0.016;
    (r(p, 0.11, 0.45, 0.38, ve + 0.055, y + 0.575, -24.11, { bevel: 0.012 }),
      a(m, ve + 0.11, y + 0.38, -24.275, ve + 0.1115, y + 0.77, -24.268, {
        cast: !1,
      }),
      r(j, 0.012, 0.05, 0.02, ve + 0.114, y + 0.575, -24.25),
      n.decal("hazard_voltage", 0.16, ve + 0.113, y + 0.6, -24.09, "x+"),
      c(d, [we, y + 0.8, -23.96], [we, Q + 0.135, -23.96], 0.011),
      c(d, [we, Q + 0.135, -23.96], [we, Q + 0.135, L + 0.016], 0.011),
      r(d, 0.04, 0.04, 0.04, we, Q + 0.135, L + 0.016),
      c(
        d,
        [we, Q + 0.135, L + 0.016],
        [(N + Z) / 2 + 0.15, Q + 0.135, L + 0.016],
        0.011,
      ));
    for (let Me of [y + 1.1, y + 1.6, y + 2.05])
      r(d, 0.012, 0.022, 0.05, ve + 0.006, Me, -23.96);
    c(d, [we, y + 0.68, -24.3], [we, y + 0.68, -25.84], 0.011);
    for (let Me of [-24.7, -25.3])
      r(d, 0.012, 0.05, 0.022, ve + 0.006, y + 0.68, Me);
    (r(p, 0.07, 0.14, 0.1, ve + 0.035, y + 0.68, -25.89, { bevel: 0.008 }),
      l(se, 0.022, 0.02, ve + 0.078, y + 0.68, -25.89, {
        axis: "x",
        seg: 10,
      }),
      c(d, [we, y + 0.35, -24.02], [we, y + 0.06, -24.02], 0.011),
      c(d, [we, y + 0.35, -24.12], [we, y + 0.06, -24.12], 0.011));
    let Ae = T + 0.05,
      ie = -24.12,
      ae = M + 0.06,
      pe = 0.16;
    for (let Me of [-1, 1])
      a(
        d,
        Ae - 0.022,
        pe,
        ie + Me * 0.15 - 0.008,
        Ae + 0.03,
        ae,
        ie + Me * 0.15 + 0.008,
      );
    for (let Me = pe + 0.14; Me < ae - 0.05; Me += 0.3)
      a(d, Ae - 0.016, Me - 0.01, ie - 0.15, Ae + 0.004, Me + 0.01, ie + 0.15);
    for (let Me of [0.9, M - 0.5])
      a(d, T - 0.02, Me - 0.02, ie - 0.19, Ae + 0.03, Me + 0.02, ie - 0.158);
    r(d, 0.14, 0.012, 0.4, Ae + 0.02, e.FLOOR + 0.006, ie);
    let Ee = [ie - 0.09, ie - 0.01, ie + 0.085];
    for (let Me = 0; Me < 3; Me++)
      c(
        O,
        [Ae + 0.018, ae, Ee[Me]],
        [Ae + 0.018, 0.34, Ee[Me]],
        Me ? 0.019 : 0.011,
        { cast: !1 },
      );
    (u(
      O,
      [
        [Ae + 0.018, 0.36, Ee[1]],
        [Ae + 0.03, 0.14, Ee[1] - 0.05],
        [Ae + 0.16, 0.05, Ee[1] - 0.5],
        [Ae + 0.1, 0.048, -25.6],
        [Ae + 0.32, 0.048, -26.7],
        [Ae + 0.22, 0.048, -27.45],
      ],
      0.022,
      { cast: !1, radial: 5 },
    ),
      u(
        O,
        [
          [Ae + 0.018, 0.36, Ee[2]],
          [Ae + 0.06, 0.1, Ee[2] + 0.1],
          [Ae + 0.5, 0.05, Ee[2] + 0.5],
          [Ae + 1.3, 0.05, Ee[2] + 0.6],
        ],
        0.02,
        { cast: !1, radial: 5 },
      ));
  }
  {
    let ve = z + 0.07,
      we = z + 0.37,
      Ae = -26.4,
      ie = y + 0.48,
      ae = 0.8,
      pe = 0.55;
    (ze(le, we - ve, pe, ae, (ve + we) / 2, ie, Ae, Te, 0.018),
      l(m, 0.215, 0.006, we + 0.002, ie, Ae - 0.08, {
        axis: "x",
        seg: 20,
        cast: !1,
      }));
    for (let Ee of [0.21, 0.14, 0.07]) {
      let Me = new jn(Ee, 0.006, 4, 20);
      (Me.rotateY(Math.PI / 2),
        o(Me, d, { p: [we + 0.016, ie, Ae - 0.08], cast: !1 }));
    }
    for (let Ee = 0; Ee < 4; Ee++) {
      let Me = (Ee * Math.PI) / 4,
        Ie = Math.cos(Me) * 0.21,
        Ce = Math.sin(Me) * 0.21;
      c(
        d,
        [we + 0.016, ie - Ce, Ae - 0.08 - Ie],
        [we + 0.016, ie + Ce, Ae - 0.08 + Ie],
        0.004,
        { cast: !1, seg: 4 },
      );
    }
    l(m, 0.045, 0.02, we + 0.014, ie, Ae - 0.08, { axis: "x", seg: 10 });
    for (let Ee = 0; Ee < 6; Ee++)
      a(
        m,
        ve + 0.03,
        ie - 0.2 + Ee * 0.07,
        Ae + ae / 2,
        we - 0.03,
        ie - 0.185 + Ee * 0.07,
        Ae + ae / 2 + 0.0015,
        { cast: !1 },
      );
    for (let Ee of [Ae - 0.3, Ae + 0.3])
      (a(
        d,
        z + 0.012,
        ie - pe / 2 - 0.035,
        Ee - 0.02,
        we + 0.03,
        ie - pe / 2 - 0.005,
        Ee + 0.02,
      ),
        c(d, [we, ie - pe / 2 - 0.02, Ee], [z + 0.02, y - 0.22, Ee], 0.012, {
          seg: 5,
        }));
    (u(
      O,
      [
        [ve + 0.12, ie - 0.12, Ae + ae / 2],
        [ve + 0.12, ie - 0.1, Ae + ae / 2 + 0.07],
        [ve + 0.03, ie + 0.12, Ae + ae / 2 + 0.1],
        [z - 0.01, ie + 0.2, Ae + ae / 2 + 0.1],
      ],
      0.014,
      { cast: !1 },
    ),
      u(
        O,
        [
          [z + 0.035, y + 0.63, -25.93],
          [z + 0.1, y + 0.5, -25.96],
          [ve + 0.2, ie - 0.05, Ae + ae / 2 - 0.002],
        ],
        0.008,
        { cast: !1 },
      ),
      f(ve, ie - pe / 2, Ae - ae / 2, we, ie + pe / 2, Ae + ae / 2, "metal", {
        bulletOnly: !0,
      }));
  }
  (je("grime_streak", 0.26, 0.4, -14.5, F - 0.05, L + 0.003, "z+"),
    je("grime_streak", 0.22, 0.34, z + 0.003, F - 0.05, -25.3, "x+"),
    je("rust_run", 0.18, 0.3, z + 0.003, y + 0.2, -26.72, "x+"),
    je("rust_run", 0.16, 0.3, -15.42, b - 0.02, L + 0.003, "z+"),
    je("leak_stain", 0.3, 0.26, z + 0.003, b - 0.02, -26.9, "x+"),
    n.place("cardboard_boxes", -14.5, -26.3, 0.35, { seed: 41 }, g, {
      colOpts: { noNav: !0 },
    }),
    r(s("wood_pallet"), 2.4, 0.045, 0.095, -12.4, g + 0.024, -26.6, {
      r: [0, 0.12, 0],
    }),
    r(s("wood_pallet"), 2.1, 0.045, 0.095, -12.5, g + 0.024, -26.42, {
      r: [0, 0.07, 0],
    }),
    r(s("wood_pallet"), 1.8, 0.045, 0.095, -12.45, g + 0.069, -26.52, {
      r: [0, 0.2, 0],
    }));
  for (let [ve, we] of [
    [0.022, 0.2],
    [0.06, 0.19],
  ]) {
    let Ae = new jn(we, 0.02, 5, 16);
    (Ae.rotateX(Math.PI / 2), o(Ae, O, { p: [-11.2, g + ve, -25.2] }));
  }
  let I0 = y + v.DESK.h,
    Kt = v.DESK,
    be = C + Kt.d;
  r(P, 1.16, 0.006, 0.56, V[0], b - 0.026, V[2], { cast: !1, recv: !1 });
  for (let ve of [-1, 1])
    (a(
      j,
      V[0] - 0.6,
      b - 0.034,
      V[2] + ve * 0.3 - 0.02,
      V[0] + 0.6,
      b - 0.02,
      V[2] + ve * 0.3 + 0.02,
      { cast: !1 },
    ),
      a(
        j,
        V[0] + ve * 0.6 - 0.02,
        b - 0.034,
        V[2] - 0.3,
        V[0] + ve * 0.6 + 0.02,
        b - 0.02,
        V[2] + 0.3,
        { cast: !1 },
      ));
  (ze(le, 0.2, 0.27, 0.8, k - 0.1, H + 0.2, -26.4, ye, 0.03),
    a(m, k - 0.19, H + 0.075, -26.75, k - 0.06, H + 0.085, -26.05, {
      cast: !1,
    }),
    ze(le, 0.07, 0.5, 0.95, k - 0.045, y + 0.42, -25.5, ye, 0.012));
  for (let ve = 0; ve < 8; ve++)
    a(
      m,
      k - 0.07,
      y + 0.672,
      -25.92 + ve * 0.11,
      k - 0.02,
      y + 0.674,
      -25.84 + ve * 0.11,
      { cast: !1 },
    );
  (Ve(le, -15.1, y + 0.98, C, -11, y + 1.045, C + 0.035, ye, 0.5, {
    cast: !1,
  }),
    Ve(le, -11.19, y + 1.045, C, -11.13, b - 0.02, C + 0.03, ye, 0.5, {
      cast: !1,
    }));
  for (let ve of [-14.45, -12.9, -11.6]) {
    Ve(le, ve - 0.075, y + 0.878, C, ve + 0.075, y + 0.962, C + 0.012, ye);
    for (let we of [-0.035, 0.035])
      r(m, 0.012, 0.02, 0.004, ve + we, y + 0.935, C + 0.013, { cast: !1 });
  }
  (Ve(le, -10.512, y + 1.208, A - 0.012, -10.428, y + 1.292, A, ye),
    r(m, 0.012, 0.03, 0.004, -10.47, y + 1.25, A - 0.013, { cast: !1 }),
    a(ue, Kt.x0, I0 - 0.032, C + 0.01, Kt.x1, I0, be, { bevel: 0.008 }));
  for (let ve of [Kt.x0 + 0.04, Kt.x1 - 0.04])
    (a(m, ve - 0.02, y, C + 0.06, ve + 0.02, I0 - 0.032, be - 0.06),
      a(m, ve - 0.03, y, C + 0.04, ve + 0.03, y + 0.02, be - 0.02));
  (a(m, Kt.x0 + 0.06, y + 0.3, C + 0.07, Kt.x1 - 0.06, I0 - 0.05, C + 0.085),
    r(p, 0.42, 0.56, 0.58, Kt.x1 - 0.3, y + 0.32, C + 0.4, { bevel: 0.01 }));
  for (let ve of [y + 0.23, y + 0.42])
    a(m, Kt.x1 - 0.5, ve, be - 0.071, Kt.x1 - 0.1, ve + 0.006, be - 0.0695, {
      cast: !1,
    });
  for (let ve of [y + 0.14, y + 0.33, y + 0.5])
    r(j, 0.14, 0.014, 0.016, Kt.x1 - 0.3, ve, be - 0.062);
  (r(m, 0.19, 0.44, 0.42, Kt.x0 + 0.3, y + 0.24, C + 0.35, { bevel: 0.01 }),
    r(re, 0.006, 0.006, 0.002, Kt.x0 + 0.3, y + 0.4, C + 0.561, {
      cast: !1,
      recv: !1,
    }),
    l(m, 0.13, 0.3, Kt.x1 + 0.22, y + 0.15, C + 0.22, {
      rTop: 0.15,
      seg: 12,
    }),
    u(
      O,
      [
        [Kt.x0 + 0.3, y + 0.3, C + 0.13],
        [Kt.x0 + 0.5, y + 0.05, C + 0.12],
        [Kt.x0 + 1.2, y + 0.03, C + 0.1],
        [Kt.x0 + 1.25, y + 0.5, C + 0.05],
        [Kt.x0 + 1.25, y + 0.98, C + 0.04],
      ],
      0.008,
      { cast: !1 },
    ));
  function Le(ve, we, Ae, ie) {
    let ae = _e(ve, I0, we, Ae),
      pe = { parent: ae };
    (r(m, 0.25, 0.012, 0.18, 0, 0.006, 0, { ...pe, bevel: 0.004 }),
      r(m, 0.05, 0.17, 0.03, 0, 0.09, -0.025, pe),
      r(m, 0.56, 0.335, 0.03, 0, 0.3, 0, { ...pe, bevel: 0.006 }));
    let Ee = 0.0156;
    if (!ie) {
      Ne(ae, O, 0.53, 0.305, 0, 0.3, Ee).receiveShadow = !0;
      return;
    }
    let Me = (Ce, Ye, rt, Be, _t, wt = 1) =>
      Ne(
        ae,
        Ce,
        Math.abs(Be - Ye),
        Math.abs(_t - rt),
        (Ye + Be) / 2,
        0.3 + (rt + _t) / 2,
        Ee + wt * 0.0012,
      );
    (Me(B, -0.265, -0.1525, 0.265, 0.1525, 0),
      Me(X, -0.25, 0.128, -0.12, 0.14),
      Me(Y, -0.105, 0.13, -0.02, 0.138),
      Me(re, 0.205, 0.128, 0.25, 0.14),
      Me(Y, -0.25, 0.1175, 0.25, 0.119),
      Me(Y, 0.082, -0.14, 0.0832, 0.11),
      Me(X, -0.25, -0.0215, 0.07, -0.019));
    for (let Ce = 0; Ce < 5; Ce++)
      Me(
        Y,
        -0.25 + Ce * 0.08 - 8e-4,
        -0.032,
        -0.25 + Ce * 0.08 + 8e-4,
        -0.0215,
      );
    (Me(Y, -0.236, -0.012, -0.106, 0.014),
      Me(Y, -0.106, -0.006, -0.094, 0.008),
      Me(re, -0.074, -0.012, 0.05, 0.017),
      Me(re, 0.05, -0.006, 0.062, 0.011),
      Me(B, -0.225, -0.004, -0.12, 0.006, 2),
      Me(B, -0.066, -0.004, 0.04, 0.009, 2));
    for (let Ce of [-0.19, -0.035, 0.022])
      (Me(X, Ce - 0.002, -0.046, Ce + 0.002, 0.034, 3),
        Me(X, Ce - 0.012, 0.031, Ce + 0.012, 0.034, 3));
    for (let Ce = 0; Ce < 3; Ce++)
      for (let Ye = 0; Ye < 5; Ye++) {
        let rt = -0.245 + Ye * 0.063,
          Be = -0.068 - Ce * 0.027;
        Me(
          (Ce * 5 + Ye) % 7 === 3 ? re : (Ce + Ye) % 4 === 0 ? X : Y,
          rt,
          Be - 0.018,
          rt + 0.05,
          Be,
        );
      }
    (Me(Y, -0.25, 0.09, -0.16, 0.097),
      Me(Y, -0.25, 0.074, -0.19, 0.08),
      Me(Y, -0.04, 0.09, 0.03, 0.097));
    let Ie = [0.11, 0.075, 0.125, 0.09, 0.06, 0.115, 0.082, 0.1];
    for (let Ce = 0; Ce < 8; Ce++) {
      let Ye = 0.098 - Ce * 0.029;
      (Me(
        Ce === 2 || Ce === 5 ? re : Ce === 6 ? Y : X,
        0.096,
        Ye - 0.011,
        0.108,
        Ye,
      ),
        Me(Y, 0.116, Ye - 0.009, 0.116 + Ie[Ce], Ye - 0.002));
    }
  }
  (Le(-13.86, C + 0.24, 0.17, !0),
    Le(-13.22, C + 0.22, -0.15, !1),
    r(m, 0.44, 0.02, 0.14, -13.56, I0 + 0.012, C + 0.56, {
      bevel: 0.005,
      r: [0.03, 0.04, 0],
    }),
    r(O, 0.4, 0.004, 0.1, -13.56, I0 + 0.024, C + 0.555, {
      r: [0.03, 0.04, 0],
      cast: !1,
    }),
    r(m, 0.06, 0.03, 0.1, -13.22, I0 + 0.015, C + 0.58, {
      bevel: 0.012,
      r: [0, -0.2, 0],
    }));
  let Fe = (ve, we, Ae, ie) => {
    (l(ie, 0.04, 0.09, ve, we + 0.045, Ae, { seg: 12 }),
      l(m, 0.034, 0.004, ve, we + 0.089, Ae, { seg: 12, cast: !1 }),
      r(ie, 0.012, 0.05, 0.03, ve + 0.03, we + 0.048, Ae + 0.035));
  };
  (Fe(-12.98, I0, C + 0.52, $),
    r(m, 0.27, 0.085, 0.2, -14.55, I0 + 0.043, C + 0.2, { bevel: 0.008 }),
    r(O, 0.11, 0.05, 0.004, -14.6, I0 + 0.045, C + 0.302, { cast: !1 }),
    r(re, 0.02, 0.008, 0.002, -14.49, I0 + 0.06, C + 0.301, {
      cast: !1,
      recv: !1,
    }),
    l(m, 0.012, 0.012, -14.46, I0 + 0.035, C + 0.303, { axis: "z", seg: 8 }),
    c(O, [-14.44, I0 + 0.085, C + 0.13], [-14.44, I0 + 0.33, C + 0.13], 0.005, {
      cast: !1,
    }),
    r(m, 0.06, 0.035, 0.09, -14.3, I0 + 0.018, C + 0.36, {
      bevel: 0.01,
      r: [0, 0.4, 0],
    }),
    u(
      O,
      [
        [-14.42, I0 + 0.03, C + 0.3],
        [-14.38, I0 + 0.012, C + 0.4],
        [-14.31, I0 + 0.02, C + 0.41],
      ],
      0.004,
      { cast: !1 },
    ));
  {
    let ve = _e(-14.4, I0, C + 0.56, 0.3);
    (r(ue, 0.23, 0.006, 0.32, 0, 0.003, 0, { parent: ve }),
      r(le, 0.21, 0.003, 0.29, 0, 0.0075, 0.008, { parent: ve, cast: !1 }),
      r(j, 0.1, 0.012, 0.03, 0, 0.014, -0.14, { parent: ve }));
  }
  (r(m, 0.25, 0.05, 0.33, -12.72, I0 + 0.025, C + 0.22, { bevel: 0.006 }),
    r(le, 0.22, 0.012, 0.3, -12.72, I0 + 0.054, C + 0.22, {
      r: [0, 0.06, 0],
      cast: !1,
    }));
  {
    let we = C + 0.5,
      Ae = new Gi(0.115, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    (Ae.scale(1, 0.95, 1.18),
      o(Ae, fe, { p: [-12.47, I0 + 0.03, we], r: [0, 0.5, 0] }),
      l(fe, 0.125, 0.03, -12.47, I0 + 0.016, we, { seg: 14, r: [0, 0.5, 0] }),
      r(fe, 0.2, 0.01, 0.1, -12.47 + 0.09, I0 + 0.012, we + 0.05, {
        bevel: 0.004,
        r: [0, 0.5, 0],
      }),
      r(fe, 0.02, 0.022, 0.25, -12.47, I0 + 0.128, we, {
        bevel: 0.008,
        r: [0, 0.5, 0],
      }));
  }
  {
    let ve = _e(-13.52, y, -25.93, 0.5),
      we = { parent: ve };
    for (let Ae = 0; Ae < 5; Ae++) {
      let ie = (Ae * Math.PI * 2) / 5 + 0.3,
        ae = Math.cos(ie),
        pe = Math.sin(ie);
      (c(m, [0, 0.1, 0], [ae * 0.29, 0.065, pe * 0.29], 0.017, {
        ...we,
        seg: 5,
      }),
        l(O, 0.027, 0.04, ae * 0.29, 0.027, pe * 0.29, {
          ...we,
          axis: "x",
          seg: 8,
        }));
    }
    (l(j, 0.024, 0.32, 0, 0.26, 0, { ...we, seg: 8 }),
      r(m, 0.2, 0.03, 0.2, 0, 0.425, 0, we),
      r(O, 0.47, 0.075, 0.45, 0, 0.475, 0, { ...we, bevel: 0.025 }),
      r(O, 0.43, 0.5, 0.06, 0, 0.86, 0.225, {
        ...we,
        bevel: 0.025,
        r: [0.14, 0, 0],
      }),
      r(m, 0.05, 0.3, 0.02, 0, 0.62, 0.245, { ...we, r: [0.1, 0, 0] }));
    for (let Ae of [-1, 1])
      (r(m, 0.02, 0.2, 0.03, Ae * 0.255, 0.56, 0.05, we),
        r(O, 0.05, 0.03, 0.26, Ae * 0.255, 0.67, 0.02, we));
  }
  {
    let ve = U + 0.02,
      we = U + 0.49,
      Ae = C + 0.02,
      ie = C + 0.64,
      ae = 1.32;
    r(p, we - ve, ae, ie - Ae, (ve + we) / 2, y + ae / 2, (Ae + ie) / 2, {
      bevel: 0.012,
    });
    for (let Ie = 0; Ie < 4; Ie++) {
      let Ce = y + 0.04 + Ie * 0.315;
      (Ie &&
        a(m, ve + 0.015, Ce - 0.004, ie, we - 0.015, Ce + 0.004, ie + 0.0015, {
          cast: !1,
        }),
        r(j, 0.15, 0.016, 0.018, (ve + we) / 2, Ce + 0.23, ie + 0.012),
        a(
          le,
          (ve + we) / 2 - 0.04,
          Ce + 0.13,
          ie,
          (ve + we) / 2 + 0.04,
          Ce + 0.17,
          ie + 0.002,
          { cast: !1 },
        ));
    }
    let pe = y + ae,
      Ee = (ve + we) / 2,
      Me = Ae + 0.46;
    r(m, 0.42, 0.05, 0.2, Ee, pe + 0.025, Me, { bevel: 0.008 });
    for (let Ie = 0; Ie < 4; Ie++) {
      let Ce = Ee - 0.15 + Ie * 0.1;
      (Ie !== 2 &&
        (r(m, 0.058, 0.13, 0.036, Ce, pe + 0.105, Me - 0.01, {
          r: [-0.12, 0, 0],
        }),
        c(
          O,
          [Ce + 0.018, pe + 0.16, Me - 0.02],
          [Ce + 0.018, pe + 0.26, Me - 0.035],
          0.005,
          { cast: !1 },
        ),
        l(m, 0.008, 0.014, Ce - 0.015, pe + 0.175, Me - 0.022, { seg: 6 })),
        r(Ie === 2 ? Y : re, 0.008, 0.004, 0.002, Ce, pe + 0.03, Me + 0.101, {
          cast: !1,
          recv: !1,
        }));
    }
    for (let [Ie, Ce, Ye] of [
      [-0.1, $, 0.3],
      [-0.03, se, 0.29],
      [0.04, p, 0.31],
      [0.11, $, 0.3],
    ])
      r(Ce, 0.062, Ye, 0.24, Ee + Ie, pe + Ye / 2, Ae + 0.16, {
        r: [0, 0, Ie > 0.1 ? 0.08 : 0],
      });
    f(U, y, C, we + 0.01, y + ae, ie + 0.01, "metal");
  }
  {
    let ve = U + 0.46,
      we = -26.36,
      Ae = -25.14,
      ie = 1.8;
    (r(
      $,
      ve - U - 0.01,
      ie,
      Ae - we,
      (U + 0.01 + ve) / 2,
      y + 0.03 + ie / 2,
      (we + Ae) / 2,
      { bevel: 0.01 },
    ),
      a(m, U + 0.04, y, we + 0.03, ve - 0.03, y + 0.03, Ae - 0.03),
      a(
        m,
        ve,
        y + 0.05,
        (we + Ae) / 2 - 0.004,
        ve + 0.0015,
        y + ie + 0.01,
        (we + Ae) / 2 + 0.004,
        { cast: !1 },
      ));
    for (let ae of [-1, 1]) {
      let pe = (we + Ae) / 2 + ae * 0.305;
      for (let Ee of [y + 0.2, y + 1.6])
        for (let Me = 0; Me < 3; Me++)
          a(
            m,
            ve,
            Ee + Me * 0.035,
            pe - 0.11,
            ve + 0.0015,
            Ee + Me * 0.035 + 0.012,
            pe + 0.11,
            { cast: !1 },
          );
      (r(j, 0.02, 0.11, 0.022, ve + 0.01, y + 1, (we + Ae) / 2 + ae * 0.06),
        ke(ae < 0 ? "08" : "07", 0.05, pe + 0.04, y + 1.45, ve + 0.003, "x+", {
          color: "white",
          font: "stencil",
          distress: 0.3,
        }));
    }
    f(U, y, we, ve, y + ie + 0.03, Ae, "metal");
  }
  {
    let ve = U + 0.5,
      we = A - 0.92,
      Ae = A - 0.01,
      ie = 0.84;
    (r(
      p,
      ve - U - 0.03,
      ie - 0.03,
      Ae - we - 0.02,
      (U + 0.01 + ve - 0.02) / 2,
      y + (ie - 0.03) / 2,
      (we + Ae) / 2,
      { bevel: 0.008 },
    ),
      a(ue, U + 0.005, y + ie - 0.03, we - 0.01, ve + 0.01, y + ie, Ae, {
        bevel: 0.008,
      }),
      a(
        m,
        ve - 0.02,
        y + 0.06,
        (we + Ae) / 2 - 0.003,
        ve - 0.0185,
        y + ie - 0.05,
        (we + Ae) / 2 + 0.003,
        { cast: !1 },
      ));
    for (let Me of [-1, 1])
      r(j, 0.016, 0.1, 0.014, ve - 0.012, y + 0.62, (we + Ae) / 2 + Me * 0.05);
    let ae = y + ie,
      pe = U + 0.24,
      Ee = we + 0.25;
    (l(j, 0.075, 0.17, pe, ae + 0.085, Ee, { rTop: 0.062, seg: 14 }),
      l(m, 0.064, 0.02, pe, ae + 0.18, Ee, { seg: 14 }),
      l(m, 0.085, 0.02, pe, ae + 0.01, Ee, { seg: 14 }),
      r(m, 0.02, 0.13, 0.03, pe + 0.01, ae + 0.1, Ee + 0.095),
      r(j, 0.03, 0.03, 0.05, pe - 0.01, ae + 0.15, Ee - 0.085),
      Fe(U + 0.3, ae, we + 0.52, le),
      Fe(U + 0.18, ae, we + 0.62, se),
      r(ge, 0.14, 0.2, 0.09, U + 0.12, ae + 0.1, we + 0.8, {
        r: [0, 0.2, 0],
      }),
      f(U, y, we - 0.01, ve + 0.01, y + ie, A, "wood"));
  }
  {
    let ve = U,
      we = -24.74,
      Ae = -24,
      ie = y + 1.12,
      ae = y + 1.74;
    (a(j, ve, ie - 0.02, we - 0.02, ve + 0.012, ae + 0.02, Ae + 0.02),
      a(ge, ve + 0.012, ie, we, ve + 0.016, ae, Ae, { cast: !1 }));
    let pe = (Ee, Me, Ie, Ce, Ye) =>
      r(le, 0.002, Ce, Ie, ve + 0.018, Me, Ee, { r: [Ye, 0, 0], cast: !1 });
    (pe(we + 0.16, ae - 0.2, 0.21, 0.297, 0.03),
      pe(we + 0.42, ae - 0.2, 0.21, 0.297, -0.02),
      pe(we + 0.63, ae - 0.15, 0.18, 0.15, 0.04),
      pe(we + 0.6, ie + 0.14, 0.16, 0.2, -0.05),
      pe(we + 0.3, ie + 0.08, 0.3, 0.1, 0.01),
      ke(
        "SAFETY NOTICE",
        0.035,
        we + 0.71,
        ae - 0.11,
        ve + 0.021,
        "x+",
        { color: "red", font: "sans", distress: 0.1 },
        0.16,
      ),
      ke(
        "TIDE TABLE",
        0.03,
        we + 0.515,
        ae - 0.09,
        ve + 0.021,
        "x+",
        { color: "black", font: "sans", distress: 0.1 },
        0.18,
      ),
      ke(
        "MUSTER  GATE 1",
        0.03,
        we + 0.44,
        ie + 0.085,
        ve + 0.021,
        "x+",
        { color: "black", font: "sans", distress: 0.1 },
        0.27,
      ),
      n.decal("hazard_general", 0.1, ve + 0.021, ie + 0.16, we + 0.6, "x+"));
    for (let Ee = 0; Ee < 6; Ee++)
      (a(
        m,
        ve + 0.019,
        ae - 0.15 - Ee * 0.03,
        we + 0.37 - (Ee % 2) * 0.03,
        ve + 0.0195,
        ae - 0.147 - Ee * 0.03,
        we + 0.51,
        { cast: !1 },
      ),
        a(
          m,
          ve + 0.019,
          ae - 0.1 - Ee * 0.035,
          we + 0.08 + (Ee % 3) * 0.02,
          ve + 0.0195,
          ae - 0.097 - Ee * 0.035,
          we + 0.25,
          { cast: !1 },
        ));
    (r(me, 0.09, 0.26, 0.3, ve + 0.045, y + 1.45, -24.96, { bevel: 0.01 }),
      a(le, ve + 0.09, y + 1.43, -25.025, ve + 0.092, y + 1.47, -24.895, {
        cast: !1,
      }),
      a(le, ve + 0.09, y + 1.385, -24.98, ve + 0.092, y + 1.515, -24.94, {
        cast: !1,
      }));
  }
  {
    let Ae = y + 1.3,
      ie = y + 2,
      ae = C;
    (a(j, -14.8 - 0.02, Ae - 0.02, ae, -13.62 + 0.02, ie + 0.02, ae + 0.014),
      Ve(le, -14.8, Ae, ae + 0.014, -13.62, ie, ae + 0.018, ye, 0.3, {
        cast: !1,
      }));
    let pe = (Lt, o0, g0, M0, on, Tn = 1) =>
      a(
        Lt,
        -14.8 + o0,
        ie - on,
        ae + 0.018,
        -14.8 + M0,
        ie - g0,
        ae + 0.018 + 0.0012 * Tn,
        { cast: !1 },
      );
    (ke(
      "BERTH 4  YARD PLAN",
      0.045,
      -14.8 + 0.04,
      ie - 0.05,
      ae + 0.021,
      "z+",
      { color: "black", font: "sans", distress: 0.1 },
      0.6,
    ),
      pe($, 0.03, 0.1, 1.15, 0.27),
      pe(m, 0.03, 0.27, 1.15, 0.278, 2),
      pe(p, 0.1, 0.15, 0.5, 0.225, 2),
      pe(se, 0.6, 0.15, 1, 0.225, 2));
    for (let Lt of [0.2, 0.68, 0.86]) pe(fe, Lt, 0.24, Lt + 0.03, 0.31, 3);
    let Ee = [$, p, fe, se, p, $, p];
    for (let Lt = 0; Lt < 3; Lt++)
      for (let o0 = 0; o0 < 7; o0++)
        (Lt * 7 + o0) % 5 !== 4 &&
          pe(
            Ee[(o0 + Lt * 3) % 7],
            0.05 + o0 * 0.155,
            0.33 + Lt * 0.075,
            0.05 + o0 * 0.155 + 0.13,
            0.385 + Lt * 0.075,
            2,
          );
    (pe(m, 0.05, 0.57, 0.5, 0.66, 2),
      ke("SHED", 0.035, -14.8 + 0.08, ie - 0.615, ae + 0.0215, "z+", {
        color: "white",
        font: "stencil",
        distress: 0.2,
      }),
      pe(m, 0.6, 0.6, 1.12, 0.606, 2),
      pe(m, 0.6, 0.63, 0.98, 0.636, 2));
    for (let [Lt, o0] of [
      [0.02, 0.02],
      [1.16, 0.02],
      [0.02, 0.68],
      [1.16, 0.68],
    ])
      l(se, 0.008, 0.008, -14.8 + Lt, ie - o0, ae + 0.022, {
        axis: "z",
        seg: 6,
        cast: !1,
      });
    let Me = -13.42,
      Ie = -11.92,
      Ce = y + 1.25,
      Ye = y + 2;
    (a(j, Me - 0.02, Ce - 0.02, ae, Ie + 0.02, Ye + 0.02, ae + 0.014),
      Ve(
        le,
        Me,
        Ce,
        ae + 0.014,
        Ie,
        Ye,
        ae + 0.018,
        (Lt, o0, g0) => {
          let M0 = ye(Lt, o0, g0);
          return [M0[0] * 1.12, M0[1] * 1.12, M0[2] * 1.12];
        },
        0.3,
        { cast: !1 },
      ),
      a(j, Me + 0.3, Ce - 0.04, ae, Ie - 0.3, Ce - 0.02, ae + 0.06),
      l(se, 0.008, 0.12, Me + 0.5, Ce - 0.012, ae + 0.04, {
        axis: "x",
        seg: 6,
      }),
      l(m, 0.008, 0.12, Me + 0.66, Ce - 0.012, ae + 0.035, {
        axis: "x",
        seg: 6,
      }),
      r(O, 0.11, 0.03, 0.045, Ie - 0.45, Ce - 0.005, ae + 0.035));
    let rt = (Lt, o0, g0, M0) =>
      a(m, Me + Lt, Ye - M0, ae + 0.018, Me + g0, Ye - o0, ae + 0.0188, {
        cast: !1,
      });
    for (let Lt of [0.14, 0.28, 0.42, 0.56]) rt(0.04, Lt, 1.46, Lt + 0.004);
    (rt(0.52, 0.14, 0.524, 0.7), rt(1.02, 0.14, 1.024, 0.7));
    let Be = { color: "black", font: "sans", distress: 0.2 },
      _t = { color: "red", font: "sans", distress: 0.2 };
    (ke(
      "BERTH 4  NIGHT SHIFT",
      0.06,
      Me + 0.06,
      Ye - 0.075,
      ae + 0.021,
      "z+",
      Be,
      0.7,
    ),
      [
        ["MV TESSALY", "ETA 0540", "PILOT 0500"],
        ["CRANE 2", "SPREADER FAULT", "TAG OUT"],
        ["RELAY B", "SHED MEZZ", "CHECK 0300"],
        ["GATE 1", "CLOSED 2200", ""],
      ].forEach((Lt, o0) => {
        let g0 = Ye - 0.21 - o0 * 0.14;
        (ke(Lt[0], 0.05, Me + 0.06, g0, ae + 0.021, "z+", Be, 0.42),
          ke(
            Lt[1],
            0.05,
            Me + 0.56,
            g0,
            ae + 0.021,
            "z+",
            o0 === 1 ? _t : Be,
            0.42,
          ),
          Lt[2] &&
            ke(
              Lt[2],
              0.05,
              Me + 1.06,
              g0,
              ae + 0.021,
              "z+",
              o0 === 1 ? _t : Be,
              0.38,
            ));
      }));
    let z0 = -11.5,
      Pi = y + 1.88;
    (l(j, 0.15, 0.035, z0, Pi, ae + 0.0175, { axis: "z", seg: 20 }),
      Ge(le, 0.135, 0.004, z0, Pi, ae + 0.037, "z", ye, 20),
      r(m, 0.009, 0.085, 0.003, z0 - 0.03, Pi + 0.028, ae + 0.041, {
        r: [0, 0, 0.8],
        cast: !1,
      }),
      r(m, 0.007, 0.115, 0.003, z0 + 0.012, Pi + 0.052, ae + 0.042, {
        r: [0, 0, -0.22],
        cast: !1,
      }));
    for (let Lt = 0; Lt < 12; Lt++) {
      let o0 = (Lt * Math.PI) / 6;
      r(
        m,
        0.006,
        0.018,
        0.002,
        z0 + Math.sin(o0) * 0.118,
        Pi + Math.cos(o0) * 0.118,
        ae + 0.04,
        { r: [0, 0, -o0], cast: !1 },
      );
    }
  }
  {
    let ve = k - 0.06,
      we = F,
      Ae = -25.1;
    for (let ie of [-0.035, 0.035])
      (l(m, 0.028, 0.13, ve + ie * 0.3, we + 0.03, Ae + ie, {
        axis: "x",
        seg: 10,
      }),
        l(m, 0.034, 0.04, ve + 0.05 + ie * 0.3, we + 0.035, Ae + ie, {
          axis: "x",
          seg: 10,
        }));
    (r(m, 0.05, 0.02, 0.05, ve, we + 0.04, Ae), Fe(ve - 0.01, we, -26.2, p));
  }
  {
    let ve = new K(),
      we = new B0(),
      Ae = new K();
    for (let ie = Ze; ie < n.staticRoot.children.length; ie++)
      n.staticRoot.children[ie].traverse((ae) => {
        if (
          !ae.isMesh ||
          !ae.material ||
          !ae.material.isMeshStandardMaterial ||
          ae.material.transparent ||
          ae.geometry.attributes.color ||
          (ae.updateWorldMatrix(!0, !1),
          we
            .setFromBufferAttribute(ae.geometry.attributes.position)
            .applyMatrix4(ae.matrixWorld)
            .getCenter(Ae),
          Ae.x < U ||
            Ae.x > k ||
            Ae.z < C ||
            Ae.z > A ||
            Ae.y < y - 0.01 ||
            Ae.y > b)
        )
          return;
        if (!ae.material.vertexColors) {
          let Me = null;
          try {
            Me = h.mats.get(ae.material.name, {
              ...(ae.material.userData && ae.material.userData.interior
                ? { interior: !0 }
                : {}),
              vertexColors: !0,
            });
          } catch {
            Me = null;
          }
          if (!Me || !Me.vertexColors) return;
          ae.material = Me;
        }
        let pe = ae.geometry.attributes.position,
          Ee = new Float32Array(pe.count * 3);
        for (let Me = 0; Me < pe.count; Me++) {
          ve.fromBufferAttribute(pe, Me).applyMatrix4(ae.matrixWorld);
          let Ie = ye(ve.x, ve.y, ve.z);
          ((Ee[Me * 3] = Ie[0]),
            (Ee[Me * 3 + 1] = Ie[1]),
            (Ee[Me * 3 + 2] = Ie[2]));
        }
        ae.geometry.setAttribute("color", new nt(Ee, 3));
      });
  }
  let He = (ve, we, Ae, ie, ae, pe, Ee) =>
    f(ve, we, Ae, ie, ae, pe, "metal", { noNav: !0, ...(Ee || {}) });
  (He(R, y, I, U, g, L),
    He(R, y, I, z, g, C),
    He(k, y, I, z, g, te),
    He(k, y, oe, z, g, L),
    He(k, y, te, z, F + 0.05, oe),
    He(k, H - 0.05, te, z, g, oe),
    He(R, y, A, J, g, L),
    He(J, y, A, G, F + 0.05, L),
    He(J, H - 0.05, A, G, g, L),
    He(G, y, A, N, g, L),
    He(N, Q, A, Z, g, L),
    He(Z, y, A, z, g, L),
    He(R - 0.03, b, I - 0.02, z + 0.05, g, L + 0.05),
    f(k + 0.02, F + 0.05, te, z - 0.02, H - 0.05, oe, "glass", {
      noNav: !0,
      playerOnly: !0,
    }),
    f(J, F + 0.05, A + 0.02, G, H - 0.05, L - 0.02, "glass", {
      noNav: !0,
      playerOnly: !0,
    }),
    He(N - 0.18, y, A - 1, N + 0.01, y + 2.085, A),
    f(Kt.x0, y, C, Kt.x1, I0, be, "wood", { noNav: !0 }),
    f(-13.76, y, -26.17, -13.28, y + 0.5, -25.69, "rubber", { noNav: !0 }));
  let De = S + 0.6;
  (n.catwalk(-14.25, De, 0, M - 0.05, { seed: 2 }, [!1, !0]),
    n.catwalk(-11.25, De, 0, M - 0.05, { seed: 3 }, [!1, !0]));
  for (let ve of [-15.6, -12.75, -9.85])
    (r(p, 0.1, M - 0.12, 0.1, ve, (M - 0.12) / 2, De + 0.5, { bevel: 0.01 }),
      r(m, 0.24, 0.016, 0.24, ve, e.FLOOR + 0.008, De + 0.5));
  a(p, -15.75, M - 0.26, De + 0.44, -9.75, M - 0.12, De + 0.56);
  for (let ve of [-12.75, -9.85])
    for (let we of [-1, 1])
      ve + we * 0.6 > -9.75 ||
        c(
          p,
          [ve + we * 0.04, M - 0.9, De + 0.5],
          [ve + we * 0.6, M - 0.27, De + 0.5],
          0.024,
          { seg: 6 },
        );
  (n.stairs(-8.25, De, Math.PI, 0, { seed: 4 }),
    n.metalRects.push([_, w, -6.7, De + 0.6]));
  {
    let ve = S + 0.02,
      we = z + 0.04,
      Ae = -9.77;
    for (let ie of [we + 0.03, Ae - 0.03])
      r(ce, 0.045, 1.07, 0.045, ie, M + 0.535, ve, { bevel: 0.006 });
    (c(ce, [we, M + 1.05, ve], [Ae, M + 1.05, ve], 0.021, { seg: 7 }),
      c(ce, [we, M + 0.55, ve], [Ae, M + 0.55, ve], 0.016, { seg: 6 }),
      a(m, we, M, ve - 0.004, Ae, M + 0.1, ve + 0.004),
      f(z, M, ve - 0.035, -9.75, M + 1.05, ve + 0.035, "metal", {
        noNav: !0,
      }));
  }
}
var Zs = {
    X0: -16,
    X1: 12,
    Z0: -28,
    Z1: -11,
    EAVE: 7,
    RIDGE: 9.5,
    ZR: -19.5,
    FLOOR: 0.03,
  },
  Yo = [-16, -11.1, -6.2, -0.8, 5.6, 12],
  zt = { x0: -6, x1: -1, h: 5 },
  p0 = { z0: -22, z1: -17, h: 4.5 },
  Mv = [
    ["S", 1, 4],
    ["S", 2, 5],
    ["S", 1, 11],
    ["S", 2, 15],
    ["S", 3, 8],
    ["N", 2, 7],
    ["N", 1, 13],
    ["N", 3, 17],
  ],
  Cg = [-0.04, 0.25, 0.5, 0.75, 1],
  _v = 20;
function dw(n) {
  let {
      M: e,
      MI: t,
      box: i,
      slab: s,
      cyl: o,
      rod: r,
      ibeam: a,
      col: l,
      add: c,
      G: u,
    } = n,
    { X0: f, X1: h, Z0: p, Z1: d, EAVE: m, RIDGE: x, ZR: v, FLOOR: y } = Zs,
    b = (d - p) / 2,
    g = x - m,
    E = Math.atan2(g, b),
    M = Math.hypot(b, g),
    _ = ($) => m + g * (1 - Math.abs($ - v) / b),
    T = e("corrugated_roof"),
    w = t("corrugated_roof"),
    S = e("concrete"),
    R = t("concrete_painted"),
    z = t("paint_grey"),
    I = t("steel_galv"),
    L = e("steel_galv"),
    U = t("steel_dark"),
    k = 0.25;
  (s(t("floor_epoxy"), f, -0.25, p, h, y, d, { cast: !1 }),
    l(f, -0.5, p, h, y, d, "concrete"),
    s(S, zt.x0 - 0.4, -0.2, d, zt.x1 + 0.4, 0.02, d + 1.4, { cast: !1 }),
    s(S, h, -0.2, p0.z0 - 0.4, h + 1.4, 0.02, p0.z1 + 0.4, { cast: !1 }));
  function C($, se, fe, me, ge, ce) {
    if (me - fe < 0.02 || ce - ge < 0.02) return;
    let P = $,
      D = $ - se * k;
    if (ge < 1.2) {
      let X = $ - se * k * 0.5;
      (s(
        S,
        fe,
        y - 0.2,
        Math.min(P, X),
        me,
        Math.min(1.2, ce),
        Math.max(P, X),
        { bevel: 0.015 },
      ),
        s(
          R,
          fe,
          y - 0.2,
          Math.min(X, D),
          me,
          Math.min(1.2, ce),
          Math.max(X, D),
          { bevel: 0.015 },
        ));
    }
    let B = Math.max(ge, 1.2);
    ce <= B ||
      (s(
        T,
        fe,
        B - 0.03,
        Math.min(P + se * 0.02, P + se * 0.06),
        me,
        ce,
        Math.max(P + se * 0.02, P + se * 0.06),
      ),
      s(
        w,
        fe,
        B,
        Math.min(P - se * 0.1, P - se * 0.13),
        me,
        ce,
        Math.max(P - se * 0.1, P - se * 0.13),
      ));
  }
  function A($, se, fe, me, ge, ce) {
    if (me - fe < 0.02 || ce - ge < 0.02) return;
    let P = $,
      D = $ - se * k;
    if (ge < 1.2) {
      let X = $ - se * k * 0.5;
      (s(
        S,
        Math.min(P, X),
        y - 0.2,
        fe,
        Math.max(P, X),
        Math.min(1.2, ce),
        me,
        { bevel: 0.015 },
      ),
        s(
          R,
          Math.min(X, D),
          y - 0.2,
          fe,
          Math.max(X, D),
          Math.min(1.2, ce),
          me,
          { bevel: 0.015 },
        ));
    }
    let B = Math.max(ge, 1.2);
    ce <= B ||
      (s(
        T,
        Math.min(P + se * 0.02, P + se * 0.06),
        B - 0.03,
        fe,
        Math.max(P + se * 0.02, P + se * 0.06),
        ce,
        me,
      ),
      s(
        w,
        Math.min(P - se * 0.1, P - se * 0.13),
        B,
        fe,
        Math.max(P - se * 0.1, P - se * 0.13),
        ce,
        me,
      ));
  }
  function F($, se, fe, me, ge, ce, P = 0.25, D = 0.45, B = 0.26) {
    let X = Math.max(1, Math.floor((ce - ge - 0.1) / D));
    for (let re = 0; re <= X; re++) {
      let Y = ge + 0.08 + ((ce - ge - 0.16) * re) / X;
      i(L, me - fe, 0.018, B, (fe + me) / 2, Y, $ - se * 0.06, {
        r: [se * P, 0, 0],
      });
    }
    for (let re of [fe + 0.03, me - 0.03, (fe + me) / 2])
      s(L, re - 0.03, ge, $ - se * 0.2, re + 0.03, ce, $ + se * 0.06);
    (s(L, fe, ge - 0.05, $ - se * 0.2, me, ge, $ + se * 0.07),
      s(L, fe, ce, $ - se * 0.2, me, ce + 0.05, $ + se * 0.07));
  }
  function H($, se, fe, me, ge, ce, P = 0.5, D = 0.45, B = 0.26) {
    let X = Math.max(1, Math.floor((ce - ge - 0.1) / D));
    for (let re = 0; re <= X; re++) {
      let Y = ge + 0.08 + ((ce - ge - 0.16) * re) / X;
      i(L, B, 0.018, me - fe, $ - se * 0.06, Y, (fe + me) / 2, {
        r: [0, 0, -se * P],
      });
    }
    for (let re of [fe + 0.03, me - 0.03, (fe + me) / 2])
      s(L, $ - se * 0.2, ge, re - 0.03, $ + se * 0.06, ce, re + 0.03);
    (s(L, $ - se * 0.2, ge - 0.05, fe, $ + se * 0.07, ge, me),
      s(L, $ - se * 0.2, ce, fe, $ + se * 0.07, ce + 0.05, me));
  }
  let N = 5.45,
    Z = 6.8;
  for (let $ = 0; $ < Yo.length - 1; $++) {
    let se = Yo[$],
      fe = Yo[$ + 1];
    $ === 2
      ? (C(d, 1, se, zt.x0, 0, m),
        C(d, 1, zt.x1, fe, 0, m),
        C(d, 1, zt.x0, zt.x1, zt.h, m))
      : (C(d, 1, se, fe, 0, N - 0.05),
        C(d, 1, se, fe, Z + 0.05, m),
        F(d, 1, se + 0.15, fe - 0.15, N, Z));
  }
  (C(p, -1, f, h, 0, m),
    s(t("paint_grey"), 6.2, y, p + k, 7.2, 2.1, p + k + 0.04),
    s(e("paint_grey"), 6.2, 0, p - 0.09, 7.2, 2.1, p - 0.05),
    A(f, -1, p, d, 0, m),
    A(h, 1, p, p0.z0, 0, N - 0.05));
  let Q = { z0: -15.55, z1: -13.35, y0: 3.3 };
  (A(h, 1, p0.z1, Q.z0, 0, N - 0.05),
    A(h, 1, Q.z1, d, 0, N - 0.05),
    A(h, 1, Q.z0, Q.z1, 0, Q.y0),
    i(T, 0.03, 1.5, 1.05, h + 0.2, Q.y0 - 0.55, Q.z0 + 0.5, {
      r: [0.25, 0.1, -0.22],
    }),
    i(T, 1, 0.03, 2, h + 1.3, 0.05, Q.z0 + 1.6, { r: [0.02, 0.5, 0.03] }));
  for (let $ of [Q.z0, Q.z1])
    s(I, h - 0.16, Q.y0, $ - 0.03, h - 0.1, N - 0.05, $ + 0.03);
  (A(h, 1, p0.z0, p0.z1, p0.h, N - 0.05), A(h, 1, p, d, Z + 0.05, m));
  for (let [$, se] of [
    [p + 0.3, -22.45],
    [-22.15, -16.85],
    [-16.55, d - 0.3],
  ])
    H(h, 1, $, se, N, Z);
  let W = { y: 8.02, r: 0.56 };
  function J($, se, fe) {
    let me = (ge, ce, P) => {
      let D = new Qi();
      if (
        (D.moveTo(-(d + 0.05), m - 0.02),
        D.lineTo(-v, x),
        D.lineTo(-(p - 0.05), m - 0.02),
        D.closePath(),
        fe)
      ) {
        let X = new xr();
        (X.absarc(-v, W.y, W.r, 0, Math.PI * 2, !0), D.holes.push(X));
      }
      let B = new vr(D, { depth: ge, bevelEnabled: !1, curveSegments: 20 });
      (B.rotateY(Math.PI / 2), B.translate($ + P, 0, 0), c(B, ce));
    };
    (me(0.04, T, se > 0 ? 0.02 : -0.06), me(0.03, w, se > 0 ? -0.13 : 0.1));
  }
  (J(h, 1, !0),
    J(f, -1, !1),
    l(f, 0, d - k, zt.x0, m, d + 0.06, "metal"),
    l(zt.x1, 0, d - k, h, m, d + 0.06, "metal"),
    l(zt.x0, zt.h - 0.5, d - 0.6, zt.x1, m, d + 0.06, "metal"),
    l(f, 0, p - 0.06, h, m, p + k, "metal"),
    l(f - 0.06, 0, p, f + k, x, d, "metal"),
    l(h - k, 0, p, h + 0.06, x, p0.z0, "metal"),
    l(h - k, 0, p0.z1, h + 0.06, x, -15.55, "metal"),
    l(h - k, 0, -13.35, h + 0.06, x, d, "metal"),
    l(h - k, 0, -15.55, h + 0.06, 3.3, -13.35, "metal"),
    l(h - k, 5.4, -15.55, h + 0.06, x, -13.35, "metal"),
    l(h - k, p0.h, p0.z0, h + 0.06, x, p0.z1, "metal"));
  let G = [],
    te = (h - f + 0.6) / _v,
    oe = f - 0.3;
  for (let $ of ["S", "N"]) {
    let se = $ === "S" ? 1 : -1,
      fe = [se * E, 0, 0],
      me = Math.cos(E),
      ge = se * Math.sin(E);
    for (let P = 0; P < 4; P++) {
      let D = Cg[P],
        B = Cg[P + 1],
        X = (D + B) / 2,
        re = (B - D) * M,
        Y = v + se * b * (1 - X),
        he = m + g * X,
        V = 0;
      for (; V < _v;) {
        if (Mv.some((ze) => ze[0] === $ && ze[1] === P && ze[2] === V)) {
          V++;
          continue;
        }
        let ne = V;
        for (
          ;
          ne + 1 < _v &&
          !Mv.some((ze) => ze[0] === $ && ze[1] === P && ze[2] === ne + 1);
        )
          ne++;
        let ye = oe + V * te,
          Te = oe + (ne + 1) * te,
          Re = (ye + Te) / 2;
        (i(T, Te - ye, 0.04, re + 0.02, Re, he + me * 0.03, Y + ge * 0.03, {
          r: fe,
        }),
          i(w, Te - ye, 0.02, re + 0.02, Re, he - me * 0.02, Y - ge * 0.02, {
            r: fe,
          }));
        let Ue = v + se * b * (1 - D),
          Ve = v + se * b * (1 - B);
        (l(
          Math.max(ye, f - 0.3),
          m + g * Math.max(0, D) - 0.05,
          Math.min(Ue, Ve),
          Te,
          m + g * B + 0.08,
          Math.max(Ue, Ve),
          "metal",
          { noNav: !0 },
        ),
          (V = ne + 1));
      }
    }
    for (let P of Mv)
      if (P[0] === $) {
        let D = Cg[P[1]],
          B = Cg[P[1] + 1],
          X = oe + P[2] * te,
          re = (D + B) / 2,
          Y = v + se * b * (1 - re),
          he = m + g * re;
        (G.push({ x: X + te / 2, y: he, z: Y, w: te, d: (B - D) * b }),
          n.decal(
            "leak_stain",
            1.9,
            X + te / 2 + 0.2,
            y + 0.004,
            Y,
            "y+",
            P[2] * 1.7,
          ),
          i(
            I,
            0.05,
            0.05,
            (B - D) * M,
            X + 0.02,
            he - me * 0.06,
            Y - ge * 0.06,
            { r: fe },
          ),
          i(
            I,
            0.05,
            0.05,
            (B - D) * M,
            X + te - 0.02,
            he - me * 0.06,
            Y - ge * 0.06,
            { r: fe },
          ));
      }
    for (let P of [0.03, 0.2, 0.37, 0.54, 0.71, 0.88, 0.985]) {
      let D = v + se * b * (1 - P),
        B = m + g * P;
      i(I, h - f - 0.3, 0.17, 0.06, (f + h) / 2, B - me * 0.13, D - ge * 0.13, {
        r: fe,
      });
    }
    let ce = v + se * (b + 0.38);
    (s(
      L,
      f - 0.3,
      m - 0.22,
      Math.min(ce, ce + se * 0.16),
      h + 0.3,
      m - 0.08,
      Math.max(ce, ce + se * 0.16),
    ),
      s(
        L,
        f - 0.3,
        m - 0.22,
        Math.min(ce - se * 0.05, ce + se * 0.21),
        h + 0.3,
        m - 0.19,
        Math.max(ce - se * 0.05, ce + se * 0.21),
      ));
    for (let P = 0; P < Yo.length; P++) {
      if ($ === "S" && (P === 2 || P === 3)) continue;
      let D = Math.min(h - 0.5, Math.max(f + 0.5, Yo[P])) + 0.42,
        B = v + se * (b + 0.13);
      (o(L, 0.055, m - 0.4, D, (m - 0.4) / 2 + 0.2, B, { seg: 8 }),
        r(L, [D, m - 0.2, B], [D, m - 0.12, ce + se * 0.08], 0.05));
      for (let X of [1.6, 3.6, 5.6])
        i(L, 0.16, 0.04, 0.14, D, X, B - se * 0.02);
      r(L, [D, 0.2, B], [D + 0.02, 0.06, B + se * 0.22], 0.055);
    }
  }
  for (let $ of [-1, 1])
    i(L, h - f + 0.7, 0.03, 0.34, (f + h) / 2, x + 0.03, v + $ * 0.15, {
      r: [$ * E, 0, 0],
    });
  for (let $ of [f - 0.31, h + 0.31])
    for (let se of [-1, 1])
      i(L, 0.04, 0.22, M + 0.4, $, (m + x) / 2 - 0.05, v + se * (b / 2 + 0.1), {
        r: [se * E, 0, 0],
      });
  let ee = [d - k - 0.24, p + k + 0.24];
  for (let $ = 0; $ < Yo.length; $++) {
    let se =
      $ === 0 ? f + k + 0.12 : $ === Yo.length - 1 ? h - k - 0.12 : Yo[$];
    for (let fe of ee)
      (a(z, "y", m - 0.35, se, y + (m - 0.35) / 2, fe, {
        depth: 0.46,
        width: 0.22,
        depthAxis: "z",
      }),
        i(U, 0.36, 0.03, 0.62, se, y + 0.015, fe),
        l(se - 0.12, 0, fe - 0.24, se + 0.12, m, fe + 0.24, "metal"));
    for (let fe of [1, -1]) {
      let me = v + (fe * b) / 2 - fe * 0.14,
        ge = m + g / 2 - 0.42;
      (a(z, "z", M - 0.5, se, ge, me, {
        depth: 0.4,
        width: 0.2,
        depthAxis: "y",
        r: [fe * E, 0, 0],
      }),
        i(z, 0.014, 0.5, 1.5, se, m - 0.55, v + fe * (b - k - 0.9), {
          r: [fe * (E + 0.22), 0, 0],
        }),
        i(z, 0.2, 0.02, 1.55, se, m - 0.82, v + fe * (b - k - 0.95), {
          r: [fe * (E + 0.42), 0, 0],
        }));
    }
    i(z, 0.22, 0.5, 0.03, se, x - 0.55, v);
  }
  for (let $ of [f + k + 0.12, h - k - 0.12])
    for (let se of [-22.3, -16.7]) {
      let fe = _(se) - 0.55;
      (a(z, "y", fe, $, y + fe / 2, se, {
        depth: 0.3,
        width: 0.18,
        depthAxis: "x",
      }),
        l($ - 0.16, 0, se - 0.1, $ + 0.16, fe, se + 0.1, "metal"));
    }
  for (let $ of ee) {
    let se = $ > v ? 1 : -1;
    for (let fe of [2.3, 3.7, 5.15])
      se > 0
        ? (s(I, f + 0.3, fe - 0.08, d - 0.2, zt.x0 - 0.2, fe + 0.08, d - 0.14),
          s(I, zt.x1 + 0.2, fe - 0.08, d - 0.2, h - 0.3, fe + 0.08, d - 0.14))
        : s(I, f + 0.3, fe - 0.08, p + 0.14, h - 0.3, fe + 0.08, p + 0.2);
    i(z, h - f - 0.6, 0.14, 0.14, (f + h) / 2, m - 0.25, $);
  }
  for (let $ of [f + 0.17, h - 0.17])
    for (let se of [2.3, 3.7, 5.15])
      $ > 0
        ? (s(I, $ - 0.03, se - 0.08, p + 0.3, $ + 0.03, se + 0.08, p0.z0 - 0.2),
          s(I, $ - 0.03, se - 0.08, p0.z1 + 0.2, $ + 0.03, se + 0.08, d - 0.3))
        : s(I, $ - 0.03, se - 0.08, p + 0.3, $ + 0.03, se + 0.08, d - 0.3);
  for (let [$, se] of [
    [Yo[0] + 0.4, Yo[1]],
    [Yo[4], Yo[5] - 0.4],
  ]) {
    for (let fe of ee)
      (r(I, [$, 1.35, fe], [se, 5.3, fe], 0.016),
        r(I, [se, 1.35, fe + 0.04], [$, 5.3, fe + 0.04], 0.016));
    for (let fe of [1, -1]) {
      let me = v + fe * (b - 0.6),
        ge = -0.3;
      (r(I, [$, m + ge + 0.1, me], [se, x + ge - 0.1, v + fe * 0.3], 0.014),
        r(I, [se, m + ge + 0.1, me], [$, x + ge - 0.1, v + fe * 0.3], 0.014));
    }
  }
  {
    let $ = d - k;
    for (let se of [zt.x0 - 0.07, zt.x1 + 0.07])
      (s(U, se - 0.07, y, $ - 0.16, se + 0.07, zt.h + 0.75, d + 0.07),
        s(e("hazard_stripes"), se - 0.11, y, $ - 0.2, se + 0.11, 1.3, d + 0.1, {
          bevel: 0.01,
        }));
    (s(U, zt.x0 - 0.2, zt.h, $ - 0.1, zt.x1 + 0.2, zt.h + 0.14, d + 0.08),
      s(I, zt.x0 - 0.25, zt.h + 0.78, $ - 0.72, zt.x1 + 0.25, zt.h + 0.81, $),
      s(
        I,
        zt.x0 - 0.25,
        zt.h + 0.3,
        $ - 0.72,
        zt.x1 + 0.25,
        zt.h + 0.81,
        $ - 0.69,
      ));
    for (let se of [zt.x0 - 0.24, zt.x1 + 0.24])
      s(I, se - 0.012, zt.h + 0.05, $ - 0.72, se + 0.012, zt.h + 0.81, $);
    (o(
      w,
      0.3,
      zt.x1 - zt.x0 + 0.3,
      (zt.x0 + zt.x1) / 2,
      zt.h + 0.44,
      $ - 0.36,
      { axis: "x", seg: 18 },
    ),
      o(
        U,
        0.05,
        zt.x1 - zt.x0 + 0.46,
        (zt.x0 + zt.x1) / 2,
        zt.h + 0.44,
        $ - 0.36,
        { axis: "x", seg: 8 },
      ),
      s(
        w,
        zt.x0 + 0.02,
        zt.h - 0.42,
        $ - 0.09,
        zt.x1 - 0.02,
        zt.h + 0.42,
        $ - 0.06,
      ),
      s(
        e("hazard_stripes"),
        zt.x0 + 0.02,
        zt.h - 0.52,
        $ - 0.12,
        zt.x1 - 0.02,
        zt.h - 0.42,
        $ - 0.03,
      ),
      s(
        U,
        zt.x1 + 0.28,
        zt.h + 0.2,
        $ - 0.6,
        zt.x1 + 0.7,
        zt.h + 0.7,
        $ - 0.15,
        { bevel: 0.02 },
      ),
      r(
        U,
        [zt.x1 + 0.5, zt.h + 0.2, $ - 0.3],
        [zt.x1 + 0.5, 1.2, $ - 0.3],
        0.008,
      ));
    for (let se of [zt.x0 - 0.45, zt.x1 + 0.45])
      n.place("bollard_post", se, d + 0.55, 0, { seed: 5 });
  }
  {
    let $ = h + 0.12,
      se = p0.z0 - 0.25,
      fe = se - 5.1;
    s(T, $, 0.12, fe, $ + 0.05, p0.h + 0.1, se);
    for (let me of [fe, se, (fe + se) / 2])
      s(L, $ - 0.02, 0.1, me - 0.05, $ + 0.09, p0.h + 0.12, me + 0.05);
    for (let me of [0.14, p0.h + 0.08, p0.h * 0.5])
      s(L, $ - 0.02, me - 0.05, fe, $ + 0.09, me + 0.05, se);
    (r(L, [$ + 0.02, 0.2, fe + 0.1], [$ + 0.02, p0.h, (fe + se) / 2], 0.02),
      r(L, [$ + 0.02, 0.2, se - 0.1], [$ + 0.02, p0.h, (fe + se) / 2], 0.02),
      s(U, $ - 0.04, p0.h + 0.16, fe - 0.2, $ + 0.12, p0.h + 0.3, p0.z1 + 0.3),
      s(U, h - k - 0.02, y, p0.z0 - 0.12, h + 0.08, p0.h + 0.1, p0.z0),
      s(U, h - k - 0.02, y, p0.z1, h + 0.08, p0.h + 0.1, p0.z1 + 0.12),
      s(
        U,
        h - k - 0.02,
        p0.h,
        p0.z0 - 0.12,
        h + 0.08,
        p0.h + 0.12,
        p0.z1 + 0.12,
      ));
    for (let me of [p0.z0 - 0.06, p0.z1 + 0.06])
      s(
        e("hazard_stripes"),
        h - k - 0.05,
        y,
        me - 0.1,
        h + 0.1,
        1.3,
        me + 0.1,
        { bevel: 0.01 },
      );
    (l($ - 0.05, 0, fe, $ + 0.12, p0.h + 0.3, se, "metal"),
      n.place("bollard_post", h + 0.6, p0.z0 - 0.4, 0, { seed: 6 }));
  }
  let le = new At();
  (le.position.set(h - 0.05, W.y, v), (le.userData.noMerge = !0));
  {
    let $ = new jn(W.r + 0.02, 0.05, 8, 28);
    ($.rotateY(Math.PI / 2), c($, L, { p: [h + 0.04, W.y, v] }));
    let se = new jn(W.r + 0.02, 0.035, 6, 28);
    (se.rotateY(Math.PI / 2), c(se, I, { p: [h - 0.16, W.y, v] }));
    for (let ge of [0.4, 0.4 + Math.PI / 2])
      r(
        L,
        [h + 0.1, W.y - Math.sin(ge) * W.r, v - Math.cos(ge) * W.r],
        [h + 0.1, W.y + Math.sin(ge) * W.r, v + Math.cos(ge) * W.r],
        0.012,
      );
    for (let ge of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3])
      r(
        I,
        [h - 0.18, W.y + Math.sin(ge) * W.r, v + Math.cos(ge) * W.r],
        [h - 0.18, W.y, v],
        0.014,
      );
    o(U, 0.13, 0.26, h - 0.22, W.y, v, { axis: "x", seg: 12 });
    let fe = t("steel_worn");
    for (let ge = 0; ge < 5; ge++) {
      let ce = ot(0.012, 0.42, 0.2);
      (ce.rotateY(0.5),
        ce.translate(0, 0.3, 0),
        ce.rotateX((ge / 5) * Math.PI * 2));
      let P = new ht(ce, fe);
      ((P.castShadow = !0), (P.receiveShadow = !0), le.add(P));
    }
    let me = new ht(vt(0.1, 0.1, 0.1, 12).rotateZ(Math.PI / 2), U);
    ((me.castShadow = !0), le.add(me), n.dynRoot.add(le));
  }
  let xe = u.mats.emissive(16757864, 7),
    j = t("aluminium"),
    O = [];
  for (let $ of [-15.4, -23.6])
    for (let se of [-13.6, -8.5, -3.5, 2.6, 8.6])
      ($ < -20 && se < -10) || O.push([se, $]);
  for (let [$, se] of O) {
    let fe = _(se) - 0.3,
      me = 6.05;
    (r(U, [$, fe, se], [$, me + 0.3, se], 0.012, { cast: !1 }),
      o(j, 0.33, 0.3, $, me + 0.15, se, { rTop: 0.09, seg: 14 }),
      o(U, 0.09, 0.14, $, me + 0.37, se, { seg: 10 }),
      o(xe, 0.24, 0.02, $, me + 0.02, se, { seg: 14, cast: !1, recv: !1 }));
  }
  let q = [];
  for (let [$, se] of [
    [-8.5, -15.4],
    [2.6, -15.4],
    [-3.5, -23.6],
    [8.6, -23.6],
  ]) {
    let fe = new Aa(16761994, 34, 13, 2);
    (fe.position.set($, 5.75, se),
      (fe.castShadow = !1),
      fe.layers.enable(1),
      n.dynRoot.add(fe),
      q.push(fe));
  }
  hw(n, Zs, { mFrame: z, mGalv: I, mDark: U });
  {
    let fe = d - k - 0.05,
      me = fe - 0.75;
    s(t("wood_dark"), 1.6, 0.88, me, 5, 0.94, fe, { bevel: 0.012 });
    for (let ge of [1.6 + 0.06, 5 - 0.06, (1.6 + 5) / 2])
      for (let ce of [me + 0.06, fe - 0.06])
        i(U, 0.05, 0.86, 0.05, ge, y + 0.43, ce);
    (s(U, 1.6 + 0.04, 0.2, me + 0.06, 5 - 0.04, 0.23, fe - 0.04),
      s(
        t("paint_grey"),
        1.6 + 0.1,
        0.55,
        me + 0.04,
        1.6 + 1.3,
        0.86,
        fe - 0.05,
        { bevel: 0.01 },
      ),
      s(t("wood_pallet"), 1.6, 1.25, fe - 0.02, 5, 2.3, fe + 0.01));
    for (let ge = 0; ge < 7; ge++)
      r(
        I,
        [1.6 + 0.3 + ge * 0.42, 1.5 + (ge % 3) * 0.12, fe - 0.04],
        [1.6 + 0.3 + ge * 0.42, 2.05 + (ge % 2) * 0.1, fe - 0.04],
        0.012 + (ge % 2) * 0.006,
        { cast: !1 },
      );
    (i(U, 0.16, 0.14, 0.3, 5 - 0.5, 1.01, me + 0.2, { bevel: 0.015 }),
      i(I, 0.03, 0.03, 0.34, 5 - 0.5, 1.1, me + 0.12),
      i(t("paint_red"), 0.45, 0.22, 0.24, 1.6 + 1.9, 1.05, me + 0.35, {
        bevel: 0.02,
        r: [0, 0.3, 0],
      }),
      s(U, 1.6, 2.5, fe - 0.3, 5, 2.53, fe),
      i(
        u.mats.emissive(16773328, 3),
        5 - 1.6 - 0.4,
        0.03,
        0.1,
        (1.6 + 5) / 2,
        2.48,
        fe - 0.18,
        { cast: !1, recv: !1 },
      ),
      l(1.6, 0, me, 5, 0.94, fe, "wood"));
  }
  {
    for (let ge of [-1, 1]) {
      let ce = -11.6 + (ge * 2.6) / 2;
      (r(t("paint_yellow"), [ce, y, -17.6 - 0.9], [ce, 3.3, -17.6], 0.045),
        r(t("paint_yellow"), [ce, y, -17.6 + 0.9], [ce, 3.3, -17.6], 0.045),
        r(
          t("paint_yellow"),
          [ce, 1, -17.6 - 0.62],
          [ce, 1, -17.6 + 0.62],
          0.03,
        ));
      for (let P of [-17.6 - 0.9, -17.6 + 0.9])
        o(U, 0.07, 0.1, ce, y + 0.05, P, { axis: "x", seg: 8 });
    }
    (a(t("paint_yellow"), "x", 2.6 + 0.5, -11.6, 3.3 + 0.1, -17.6, {
      depth: 0.22,
      width: 0.14,
    }),
      i(U, 0.3, 0.26, 0.24, -11.6 + 0.2, 3.3 - 0.14, -17.6, { bevel: 0.02 }),
      r(I, [-11.6 + 0.2, 3.3 - 0.26, -17.6], [-11.6 + 0.2, 1.75, -17.6], 0.012),
      r(
        I,
        [-11.6 + 0.32, 3.3 - 0.26, -17.6],
        [-11.6 + 0.34, 2.2, -17.6 + 0.02],
        0.008,
      ),
      i(U, 0.85, 0.5, 0.55, -11.6 + 0.2, 1.42, -17.6, {
        bevel: 0.03,
        r: [0, 0.2, 0.05],
      }),
      i(t("steel_worn"), 0.7, 0.16, 0.42, -11.6 + 0.2, 1.74, -17.6, {
        bevel: 0.02,
        r: [0, 0.2, 0.05],
      }),
      o(t("steel_bare"), 0.16, 0.12, -11.6 - 0.28, 1.4, -17.6 - 0.08, {
        axis: "x",
        seg: 12,
      }),
      l(
        -11.6 - 2.6 / 2 - 0.1,
        0,
        -17.6 - 0.35,
        -11.6 + 2.6 / 2 + 0.1,
        1.9,
        -17.6 + 0.35,
        "metal",
      ));
  }
  let ue = Math.PI / 2,
    de = ($, se, fe, me, ge, ce = y, P) => n.place($, se, fe, me, ge, ce, P);
  for (let $ of [-8.4, -5.6, -2.8, 2.8, 5.6, 8.4])
    de("shelf_rack", $, p + k + 0.62, 0, { seed: Math.round($ * 7 + 90) });
  for (let $ of [2.8, 5.6, 8.4])
    de("shelf_rack", $, -23.45, 0, { seed: Math.round($ * 5 + 40) });
  return (
    de("pallet_stack", 0, -26.9, 0.1, { seed: 3 }),
    de("cardboard_boxes", -0.05, -26.9, 0.5, { seed: 4 }, y + 1.15, {
      noCol: !0,
    }),
    de("crate_stack", 2.9, -15.9, 0.12, { seed: 11 }),
    de("crate_wood", 4.15, -16.3, -0.25, { seed: 12 }),
    de("pallet_stack", 2, -17.3, 1.45, { seed: 13 }),
    de("ibc_tote", 6.9, -19.6, 0.1, { seed: 14 }),
    de("barrel", 7.9, -18.5, 0, { seed: 15, color: "blue" }),
    de("barrel", 6, -18.4, 0.6, { seed: 16, color: "red" }),
    de("ibc_tote", -7.6, -16.4, -0.08, { seed: 17 }),
    de("barrel", -8.6, -15.3, 0, { seed: 18 }),
    de("barrel", -7.9, -15, 0.9, { seed: 19, color: "yellow" }),
    de("sandbags", 10.2, -16.4, ue + 0.05, { seed: 20 }),
    de("forklift", 8.3, -13.9, 2.75, { seed: 21 }),
    de("toolbox_cart", 6, -12.2, 0.15, { seed: 22 }),
    de("gas_cylinders", 10.9, -11.9, 0, { seed: 23 }),
    de("tarp_cargo", -13.2, -13.2, 0.12, { seed: 24 }),
    de("tire_stack", -15, -15.6, 0, { seed: 25 }),
    de("tire_stack", -14.9, -16.6, 0.4, { seed: 26 }),
    de("cardboard_boxes", -14.6, -26.6, 0.2, { seed: 27 }),
    de("crate_wood", -12.4, -26.9, -0.1, { seed: 28 }),
    de("barrel", -10.9, -27, 0, { seed: 29, color: "green" }),
    de("crate_wood", -14.7, -24.6, 0.3, { seed: 30 }),
    de("jerry_can", -9.3, -12, 0.4, { seed: 31 }),
    de("jerry_can", -9.7, -12.1, 1.2, { seed: 32 }),
    de("pallet", 10.6, -13.6, 0.2, { seed: 33 }),
    de("cardboard_boxes", 10.6, -13.6, 0.3, { seed: 34 }, 0.17),
    de("traffic_cone", -6.6, -12.2, 0, { seed: 35 }),
    de("traffic_cone", -0.4, -12.3, 0, { seed: 36 }),
    n.tube(
      t("rubber"),
      [
        [1.7, 0.9, -11.9],
        [1.4, 0.4, -12.3],
        [1.2, 0.06, -13.2],
        [2.4, 0.055, -14],
        [1, 0.055, -14.9],
        [-0.8, 0.055, -14.4],
        [-1.6, 0.055, -15.6],
      ],
      0.018,
      { cast: !1 },
    ),
    s(U, 7.2, y, -14.6, 8.4, y + 0.04, -13.6),
    n.decal("oil_stain", 2.2, 7.6, y + 0.004, -15.2, "y+", 0.6),
    n.decal("oil_stain", 1.6, -3.8, y + 0.004, -13.6, "y+", 2.1),
    n.decal("hazard_voltage", 0.5, -1.25, 1.9, d - k - 0.142, "z-"),
    n.decal("caution_stripes", 2.4, -3.5, y + 0.004, -11.9, "y+", 0),
    {
      fan: le,
      lights: q,
      skylights: G,
      relayPos: new K(-2, y, -19.5),
      update($) {
        le.rotation.x += $ * 1.7;
      },
    }
  );
}
function lh(n, e, t, i, s = 0) {
  let o = new At();
  return (o.position.set(e, s, t), (o.rotation.y = i), n.staticRoot.add(o), o);
}
function fn(n, e, t, i, s, o, r, a, l, c = 0, u = null) {
  let f = ns(
    c ? Ei(i, s, o, c) : ot(i, s, o),
    typeof t == "string" ? n.M(t) : t,
  );
  return (
    f.position.set(r, a, l),
    u && f.rotation.set(u[0], u[1], u[2]),
    e.add(f),
    f
  );
}
function wv(n, e, t, i, s, o, r, a, l = null, c = 8) {
  let u = ns(vt(i, i, s, c), typeof t == "string" ? n.M(t) : t);
  return (
    u.position.set(o, r, a),
    l && u.rotation.set(l[0], l[1], l[2]),
    e.add(u),
    u
  );
}
function Ev(n, e, t, i, s, o, r, a = "metal", l = 0) {
  let c = Math.abs(Math.cos(i)),
    u = Math.abs(Math.sin(i)),
    f = Math.abs(Math.sin(2 * i)) > 0.2 ? 0.9 : 1,
    h = ((s * c + o * u) / 2) * f,
    p = ((s * u + o * c) / 2) * f;
  n.col(e - h, l, t - p, e + h, l + r, t + p, a);
}
function Hl(n, e, t, i = 0, s = "paint_blue", o = 1) {
  let r = lh(n, e, t, i),
    a = 2.2,
    l = 1.2,
    c = 1.25,
    u = n.M(s),
    f = n.M("steel_dark");
  fn(n, r, f, a, 0.05, l, 0, 0.13, 0);
  for (let d of [-1, 1]) fn(n, r, u, 0.1, 0.1, l, d * (a / 2 - 0.25), 0.05, 0);
  for (let d of [-1, 1])
    for (let m of [-1, 1])
      fn(
        n,
        r,
        u,
        0.07,
        c - 0.1,
        0.07,
        d * (a / 2 - 0.035),
        0.1 + (c - 0.1) / 2,
        m * (l / 2 - 0.035),
        0.008,
      );
  for (let d of [-1, 1])
    (fn(n, r, u, a, 0.06, 0.06, 0, c - 0.03, d * (l / 2 - 0.03), 0.008),
      fn(n, r, u, a, 0.05, 0.05, 0, 0.62, d * (l / 2 - 0.03)),
      fn(
        n,
        r,
        n.M("chainlink"),
        a - 0.14,
        c - 0.25,
        0.012,
        0,
        0.15 + (c - 0.25) / 2,
        d * (l / 2 - 0.035),
      ));
  for (let d of [-1, 1])
    (fn(n, r, u, 0.06, 0.06, l, d * (a / 2 - 0.03), c - 0.03, 0, 0.008),
      fn(
        n,
        r,
        n.M("chainlink"),
        0.012,
        c - 0.25,
        l - 0.14,
        d * (a / 2 - 0.035),
        0.15 + (c - 0.25) / 2,
        0,
      ));
  let h = n.M("steel_worn"),
    p = n.M("steel_rust");
  for (let d = 0; d < 14; d++) {
    let m = (d * 0.618 + o * 0.37) % 1,
      x = (d * 0.414 + o * 0.11) % 1,
      v = 1.5 + x * 0.9;
    wv(
      n,
      r,
      d % 3 ? h : p,
      0.014,
      v,
      -a / 2 + 0.25 + m * (a - 0.9),
      0.16 + (v / 2) * 0.96,
      -l / 2 + 0.2 + x * (l - 0.4),
      [0.1 * (x - 0.5), 0, 0.28 * (m - 0.3)],
      5,
    );
  }
  for (let d = 0; d < 6; d++) {
    let m = (d * 0.37 + o * 0.2) % 1;
    wv(
      n,
      r,
      p,
      0.035,
      0.42,
      a / 2 - 0.45 + (m - 0.5) * 0.3,
      0.22 + d * 0.05,
      (m - 0.5) * 0.7,
      [Math.PI / 2 + m, m * 3, 0.2],
      6,
    );
  }
  return (Ev(n, e, t, i, a, l, c, "metal"), r);
}
function Ol(n, e, t, i = 0, s = "paint_red") {
  let o = lh(n, e, t, i),
    r = 1.1,
    a = 0.8,
    l = 0.75,
    c = n.M(s);
  for (let f of [-1, 1]) fn(n, o, c, 0.09, 0.1, a, f * 0.36, 0.05, 0);
  fn(n, o, c, r, 0.04, a, 0, 0.12, 0);
  for (let f of [-1, 1])
    fn(
      n,
      o,
      c,
      r,
      l - 0.1,
      0.03,
      0,
      0.1 + (l - 0.1) / 2,
      f * (a / 2 - 0.015),
      0.006,
    );
  for (let f of [-1, 1])
    fn(
      n,
      o,
      c,
      0.03,
      l - 0.1,
      a,
      f * (r / 2 - 0.015),
      0.1 + (l - 0.1) / 2,
      0,
      0.006,
    );
  for (let f of [-1, 1])
    for (let h of [-1, 1])
      fn(
        n,
        o,
        c,
        0.06,
        l,
        0.06,
        f * (r / 2 - 0.02),
        l / 2,
        h * (a / 2 - 0.02),
        0.01,
      );
  fn(n, o, n.M("steel_dark"), r - 0.08, 0.04, a - 0.08, 0, l - 0.22, 0);
  let u = n.M("steel_worn");
  for (let f = 0; f < 12; f++) {
    let h = (f * 0.618) % 1,
      p = (f * 0.37) % 1;
    fn(
      n,
      o,
      u,
      0.16,
      0.11,
      0.1,
      (h - 0.5) * (r - 0.3),
      l - 0.16 + (f % 3) * 0.03,
      (p - 0.5) * (a - 0.25),
      0.012,
      [p, h * 3, h],
    );
  }
  return (Ev(n, e, t, i, r, a, l, "metal"), o);
}
function r1(n, e, t, i = 0, s = 9) {
  let o = lh(n, e, t, i),
    r = n.M("steel_worn"),
    a = n.M("steel_rust");
  for (let l of [-1.1, 1.1])
    fn(n, o, "wood_dark", 0.1, 0.08, 0.7, l, 0.04, 0, 0.008);
  for (let l = 0; l < s; l++) {
    let c = l < 5 ? 0 : 1,
      u = c ? l - 5 : l;
    wv(
      n,
      o,
      l % 2 ? r : a,
      0.016,
      3.4 + (l % 3) * 0.12,
      ((l % 3) - 1) * 0.06,
      0.1 + c * 0.03,
      (u - (c ? 1.5 : 2)) * 0.045 + c * 0.02,
      [0, 0.01 * (l - 4), Math.PI / 2],
      5,
    );
  }
  for (let l = 0; l < s; l += 3)
    fn(n, o, a, 0.07, 0.05, 0.03, 1.72, 0.11, (l - 4) * 0.02);
  return o;
}
function Vl(n, e, t, i = 0) {
  let s = lh(n, e, t, i),
    o = new Qi();
  (o.moveTo(-0.16, 0),
    o.lineTo(0.16, 0),
    o.lineTo(0.16, 0.05),
    o.lineTo(-0.1, 0.19),
    o.lineTo(-0.16, 0.19),
    o.closePath());
  let r = new vr(o, { depth: 0.2, bevelEnabled: !1 });
  return (
    r.translate(0, 0, -0.1),
    s.add(ns(r, n.M("rubber"))),
    fn(n, s, "paint_yellow", 0.012, 0.16, 0.18, -0.166, 0.1, 0),
    s
  );
}
function a1(n, e, t, i, s = "x-", o = 3.2) {
  let r = s[0] === "x";
  (n.cyl("steel_galv", 0.045, o, e, o / 2, t, { seg: 8 }),
    n.box("steel_dark", 0.3, 0.02, 0.3, e, 0.01, t));
  let a = 1.1,
    l = 0.62,
    c = 0.03;
  n.box("paint_yellow", r ? c : a, l, r ? a : c, e, o - l / 2 - 0.05, t, {
    bevel: 0.01,
  });
  let u = s[1] === "+" ? 1 : -1,
    f = r ? e + u * (c / 2 + 0.003) : e,
    h = r ? t : t + u * (c / 2 + 0.003);
  (n.label(i, 0.4, f, o - l / 2 - 0.05, h, s, {
    color: "black",
    font: "stencil",
    distress: 0.35,
  }),
    n.col(e - 0.06, 0, t - 0.06, e + 0.06, o, t + 0.06, "metal", {
      noNav: !0,
    }));
}
function Sv(n, e, t, i = 2, s = !0, o = 0.02) {
  let u = ["paint_grey", "paint_teal", "paint_grey", "steel_rust"];
  for (let d = 0; d < i; d++) {
    let m = lh(
        n,
        e + (d ? 0.12 * Math.sin(d * 2.1) : 0),
        t + (d ? 0.18 * Math.cos(d * 1.7) : 0),
        (s ? Math.PI / 2 : 0) + o * (d % 2 ? -1 : 1.3),
        0,
      ),
      x = 0.1 + d * (0.5 + 0.1);
    for (let y of [-3.6, 0, 3.6])
      fn(n, m, "wood_dark", 0.14, 0.1, 4.2 - 0.2, y, x - 0.1 / 2, 0, 0.01);
    let v = n.M(u[d % u.length]);
    (fn(n, m, v, 10.4, 0.5 - 0.08, 4.2, 0, x + (0.5 - 0.08) / 2, 0, 0.03),
      fn(n, m, v, 10.4 - 0.5, 0.08, 4.2 - 0.5, 0, x + 0.5 - 0.04, 0, 0.02));
    for (let y of [-1.4, -0.7, 0, 0.7, 1.4])
      fn(n, m, v, 10.4 - 0.9, 0.05, 0.09, 0, x + 0.5 + 0.02, y, 0.01);
    for (let y of [-1, 1])
      for (let b of [-1, 1])
        (fn(
          n,
          m,
          "steel_dark",
          0.32,
          0.12,
          0.32,
          y * (10.4 / 2 - 0.35),
          x + 0.5 - 0.02,
          b * (4.2 / 2 - 0.35),
          0.02,
        ),
          fn(
            n,
            m,
            "paint_yellow",
            0.5,
            0.5 - 0.1,
            0.02,
            y * (10.4 / 2 - 0.5),
            x + (0.5 - 0.08) / 2,
            b * (4.2 / 2 + 0.006),
          ));
    for (let y of [-1, 1])
      fn(
        n,
        m,
        "rubber",
        0.04,
        0.12,
        4.2 - 0.4,
        y * (10.4 / 2 + 0.01),
        x + 0.1,
        0,
      );
  }
  let f = 0.1 + i * (0.5 + 0.1),
    h = (s ? 4.2 : 10.4) / 2 + 0.05,
    p = (s ? 10.4 : 4.2) / 2 + 0.05;
  return (
    n.col(e - h, 0, t - p, e + h, f, t + p, "metal"),
    n.metalRects.push([e - h, t - p, e + h, t + p]),
    f
  );
}
function na(n, e, t = 0.025, i = "rubber", s = null) {
  let o = [];
  for (let r = 0; r < e.length; r++) {
    let a = e[r];
    if (
      (o.push([a[0], a.length > 2 ? a[2] : (s ?? t * 0.9), a[1]]),
      r < e.length - 1)
    ) {
      let l = e[r + 1],
        c = l[0] - a[0],
        u = l[1] - a[1],
        f = Math.hypot(c, u);
      if (f > 2.2 && a.length < 3 && l.length < 3) {
        let h = Math.floor(f / 1.6);
        for (let p = 1; p < h; p++) {
          let d = p / h,
            m = Math.sin((r * 3.1 + p) * 2.3) * Math.min(0.28, f * 0.04);
          o.push([
            a[0] + c * d - (u / f) * m,
            s ?? t * 0.9,
            a[1] + u * d + (c / f) * m,
          ]);
        }
      }
    }
  }
  return n.tube(i, o, t, { radial: 6, cast: !1 });
}
function Tv(n, e, t, i = 0) {
  let s = lh(n, e, t, i);
  return (
    fn(n, s, "concrete", 0.7, 0.12, 0.5, 0, 0.06, 0, 0.015),
    fn(n, s, "paint_grey", 0.55, 0.9, 0.3, 0, 0.57, 0, 0.015),
    fn(n, s, "steel_dark", 0.5, 0.03, 0.34, 0, 1.03, 0),
    fn(n, s, "hazard_stripes", 0.3, 0.12, 0.01, 0, 0.8, 0.156),
    Ev(n, e, t, i, 0.7, 0.5, 1.05, "metal"),
    s
  );
}
var pw = { X: 30, LADDER_Z: 20, RAILS: [18.5, 28.5], Z0: -30, Z1: 28 };
function mw(n) {
  let {
      M: e,
      box: t,
      slab: i,
      cyl: s,
      rod: o,
      tube: r,
      col: a,
      add: l,
      place: c,
    } = n,
    { X: u, LADDER_Z: f, Z0: h, Z1: p } = pw,
    d = e("concrete"),
    m = e("concrete_dirty"),
    x = e("steel_worn"),
    v = e("steel_dark"),
    y = e("steel_galv"),
    b = e("paint_yellow"),
    g = f - 0.42,
    E = f + 0.42;
  for (let [T, w] of [
    [h - 1, g],
    [E, p + 1],
  ])
    (i(d, u - 0.65, -0.7, T, u, 0.028, w, { bevel: 0.03 }),
      i(x, u - 0.07, -0.16, T, u + 0.022, 0.036, w, { bevel: 0.012 }),
      i(b, u - 0.66, 0, T, u - 0.5, 0.032, w),
      i(m, u - 0.55, -4.2, T, u - 0.02, -0.7, w));
  (i(d, u - 0.65, -0.7, g, u - 0.38, 0.028, E),
    i(m, u - 0.55, -4.2, g, u - 0.38, -0.7, E));
  for (let T of [g, E])
    i(x, u - 0.38, -0.16, T - 0.02, u + 0.02, 0.034, T + 0.02);
  for (let T = h + 4; T < p; T += 6)
    Math.abs(T - f) < 1 ||
      (i(v, u - 0.03, -4.2, T - 0.02, u - 0.012, -0.2, T + 0.02, {
        cast: !1,
      }),
      n.decal("rust_run", 0.7, u - 0.015, -1.3, T + 1.4, "x+"));
  (a(u - 0.65, -4.2, h - 1, u, 0.028, p + 1, "concrete", { noNav: !0 }),
    a(u + 0.03, -5, h - 2, u + 0.7, 8, p + 2, "concrete", {
      playerOnly: !0,
    }));
  {
    let T = u - 0.12;
    for (let S of [-1, 1]) {
      let R = f + S * 0.26;
      (r(
        e("paint_yellow"),
        [
          [T, -3.9, R],
          [T, 0.2, R],
          [T, 0.95, R],
          [T - 0.12, 1.12, R],
          [T - 0.5, 1.12, R],
          [T - 0.62, 0.95, R],
          [T - 0.62, 0.03, R],
        ],
        0.024,
        { radial: 7, tension: 0.2 },
      ),
        t(v, 0.12, 0.012, 0.12, T - 0.62, 0.034, R));
    }
    for (let S = -3.7; S < 0; S += 0.3)
      o(y, [T, S, f - 0.26], [T, S, f + 0.26], 0.014, { seg: 6 });
    for (let S of [-3, -1.6, -0.3])
      for (let R of [-1, 1])
        o(y, [T, S, f + R * 0.26], [u - 0.38, S, f + R * 0.26], 0.012);
    let w = [[f - 2.6], [f - 0.9], [f + 0.9], [f + 2.6]];
    for (let [S] of w)
      (s(b, 0.032, 1.05, u - 0.82, 0.525, S, { seg: 8 }),
        s(v, 0.09, 0.02, u - 0.82, 0.01, S, { seg: 10 }),
        s(v, 0.045, 0.03, u - 0.82, 1.06, S, { seg: 8 }));
    for (let [S, R] of [
      [f - 2.6, f - 0.9],
      [f + 0.9, f + 2.6],
    ])
      for (let z of [0.98, 0.55])
        r(
          y,
          [
            [u - 0.82, z, S],
            [u - 0.82, z - 0.1, (S + R) / 2 - 0.3],
            [u - 0.82, z - 0.12, (S + R) / 2 + 0.3],
            [u - 0.82, z, R],
          ],
          0.012,
          { radial: 5 },
        );
    n.label("BOAT STN 4", 0.2, u - 1.3, 0.006, f - 1.4, "y+", {
      color: "yellow",
      font: "stencil",
      distress: 0.4,
    });
  }
  let M = new jn(0.4, 0.16, 8, 16);
  M.rotateY(Math.PI / 2);
  for (let T = h + 2.5, w = 0; T < p; T += 5, w++) {
    if (Math.abs(T - f) < 2) continue;
    (i(e("wood_dark"), u + 0, -3.9, T - 0.16, u + 0.2, -0.25, T + 0.16, {
      bevel: 0.02,
    }),
      i(v, u - 0.01, -0.5, T - 0.2, u + 0.215, -0.42, T + 0.2),
      i(v, u - 0.01, -2.4, T - 0.2, u + 0.215, -2.32, T + 0.2));
    let S = T + 2.4;
    if (Math.abs(S - f) < 1.6 || S > p - 0.5) continue;
    let R = -0.85 - (w % 3) * 0.18;
    (l(M.clone(), e("tire"), { p: [u + 0.17, R, S] }),
      w % 2 && l(M.clone(), e("tire"), { p: [u + 0.17, R - 0.86, S + 0.05] }));
    for (let z of [-1, 1])
      o(
        y,
        [u - 0.02, 0.02, S + z * 0.3],
        [u + 0.17, R + 0.36, S + z * 0.16],
        0.011,
        { seg: 5 },
      );
    t(v, 0.1, 0.03, 0.8, u - 0.06, 0.04, S);
  }
  let _ = [-22, -12, -2, 9, 16.4, 25.6];
  for (let T of _)
    c("bollard_mooring", 29.2, T, 0, { seed: Math.round(T + 40) });
  {
    let T = [..._.map((S) => [S - 1.1, S + 1.1]), [f - 3, f + 3]].sort(
        (S, R) => S[0] - R[0],
      ),
      w = h + 0.3;
    for (let [S, R] of [...T, [p - 0.3, p]]) {
      if (S - w > 1) {
        i(b, u - 0.4, 0.12, w, u - 0.2, 0.3, S, { bevel: 0.02 });
        for (let z = w + 0.3; z < S; z += 1.6)
          i(v, u - 0.42, 0.028, z - 0.12, u - 0.18, 0.12, z + 0.12);
      }
      w = Math.max(w, R);
    }
  }
  for (let T of pw.RAILS) {
    (i(v, T - 0.19, 0, h + 0.4, T + 0.19, 0.007, p - 0.4, { cast: !1 }),
      i(e("steel_rust"), T - 0.075, 0, h + 0.4, T + 0.075, 0.018, p - 0.4, {
        cast: !1,
      }),
      i(x, T - 0.037, 0, h + 0.4, T + 0.037, 0.034, p - 0.4, {
        bevel: 0.008,
        cast: !1,
      }));
    for (let w = h + 0.8; w < p - 0.5; w += 0.9)
      for (let S of [-1, 1])
        t(v, 0.07, 0.022, 0.1, T + S * 0.115, 0.012, w, { cast: !1 });
    for (let [w, S] of [
      [h + 0.75, 1],
      [p - 0.75, -1],
    ])
      (i(b, T - 0.28, 0, w - 0.3, T + 0.28, 0.75, w + 0.3, { bevel: 0.03 }),
        i(
          e("rubber"),
          T - 0.16,
          0.3,
          w + S * 0.3,
          T + 0.16,
          0.62,
          w + S * 0.42,
          { bevel: 0.03 },
        ),
        i(v, T - 0.34, 0, w - 0.38, T + 0.34, 0.04, w + 0.38),
        a(T - 0.28, 0, w - 0.36, T + 0.28, 0.75, w + 0.36, "metal"));
  }
  return (
    Sv(n, 23.3, -15.4, 2, !0, 0.02),
    Sv(n, 23.7, 14.4, 2, !0, -0.025),
    c("jersey_barrier", 20.5, -4.7, Math.PI / 2 + 0.12, { seed: 31 }),
    c("jersey_barrier", 25.3, 3.1, -0.2, { seed: 32 }),
    Hl(n, 25.7, -3.3, 0.08, "paint_blue", 2),
    c("sandbags", 20.6, 3, 1.25, { seed: 33 }),
    c("barrel", 26.5, -1.7, 0, { seed: 34, color: "red" }),
    c("barrel", 26.9, -1.05, 0.5, { seed: 35 }),
    Ol(n, 20.55, 1.35, 0.12),
    c("traffic_cone", 22, -1.9, 0, { seed: 36 }),
    c("traffic_cone", 24.2, 1.7, 0, { seed: 37 }),
    n.stack(23.2, -28.6, [
      [20, "white", { reefer: !0 }],
      [20, "white", { reefer: !0 }],
    ]),
    n.stack(23, -25.95, [[20, "grey", { reefer: !0 }]]),
    c("generator", 15, -26.6, 0.06, { seed: 41 }),
    c("floodlight_stand", 16.4, -23.6, 0.3, { seed: 42 }),
    na(
      n,
      [
        [16.1, -26.6],
        [18, -27.6],
        [19.2, -27.2],
        [19.6, -26.4],
      ],
      0.028,
    ),
    na(
      n,
      [
        [15.6, -26],
        [16.2, -24.6],
        [16.4, -23.9],
      ],
      0.018,
    ),
    Hl(n, 27, -18.1, Math.PI / 2 + 0.05, "paint_orange", 5),
    c("tire_stack", 24.1, -9.5, 0, { seed: 43 }),
    c("tire_stack", 25.05, -9.6, 0.5, { seed: 44 }),
    c("cable_reel", 14.3, -12.9, 0.4, { seed: 45 }),
    c("cable_reel", 15.6, -14.3, 1.9, { seed: 46 }),
    c("pallet_stack", 20.3, -9.3, 0.1, { seed: 47 }),
    c("crate_wood", 19.9, -22.6, 0.3, { seed: 48 }),
    c("barrel", 12.75, -23.3, 0, { seed: 49, color: "blue" }),
    c("barrel", 12.9, -24.1, 0, { seed: 50, color: "blue" }),
    c("light_mast", 26.6, -28.7, 0, { seed: 51 }),
    c("light_mast", 26.6, 26.7, 0, { seed: 52 }),
    Hl(n, 20.6, 22.4, 0.04, "paint_blue", 7),
    Hl(n, 20.7, 24.2, -0.06, "paint_orange", 9),
    Ol(n, 26.6, 5.5, 0.1),
    Ol(n, 26.7, 6.45, -0.15, "paint_blue"),
    c("crate_stack", 26.4, 23.6, 0.2, { seed: 53 }),
    c("ibc_tote", 22.6, 26.3, 0.05, { seed: 54 }),
    c("pallet_stack", 24, 26.2, 0.2, { seed: 55 }),
    c("barrel", 22.6, 20.3, 0, { seed: 56, color: "yellow" }),
    c("barrel", 23.4, 20.4, 0, { seed: 57 }),
    c("tarp_cargo", 20.3, 12.6, Math.PI / 2, { seed: 59 }),
    r1(n, 19.6, 17.5, Math.PI / 2 + 0.05),
    Vl(n, 19.6, 10.4, 0.4),
    Vl(n, 20.5, 16.1, -2.6),
    c("traffic_cone", 28.2, 18.2, 0, { seed: 60 }),
    c("traffic_cone", 28.3, 21.8, 0, { seed: 61 }),
    na(
      n,
      [
        [28.9, 6.2],
        [28.6, 9.5],
        [28.95, 13],
        [28.7, 16.6],
        [28.3, 17.4],
        [28.6, 17.9],
        [28.9, 17.3],
      ],
      0.022,
    ),
    { relayPos: new K(23, 0, 0), extraction: new K(29, 0, f) }
  );
}
var uP = Math.PI,
  ss = uP / 2,
  kg = 0.535,
  Rt = (n, e, t) => new K(n, e, t);
function fP(n) {
  let e = n.place,
    t = n.stack;
  (t(-19.45, -5.12, [
    [20, "green"],
    [20, "grey"],
    [20, "orange"],
  ]),
    t(-13.3, -5.12, [[20, "white", { reefer: !0, flip: !0 }]]),
    t(3.7, -5.12, [
      [20, "blue", { doors: 0.8, flip: !0 }],
      [20, "white"],
    ]),
    t(13.53, -5.12, [
      [20, "teal"],
      [20, "grey"],
    ]),
    t(-19.45, 2.08, [[20, "blue"]]),
    t(-13.35, 2.08, [[20, "red"]]),
    t(0.8, 2.08, [
      [40, "orange"],
      [40, "teal"],
      [20, "blue", { dx: 3 }],
    ]),
    t(12.3, 2.08, [
      [20, "red"],
      [20, "yellow"],
    ]),
    t(-21.1, 9.92, [[20, "yellow"]], 0, 0.3),
    t(
      -13.6,
      9.92,
      [
        [20, "green"],
        [20, "blue"],
        [20, "orange"],
      ],
      0,
      0.3,
    ),
    t(
      -21.6,
      12.42,
      [
        [20, "red"],
        [20, "white"],
        [20, "teal"],
      ],
      0,
      0.3,
    ),
    t(-15.4, 12.42, [[20, "grey", { doors: 0.6 }]], 0, 0.3),
    t(4.43, 12.42, [[20, "blue"]], 0, 0),
    t(13.53, 12.42, [[20, "green"]], 0, 0),
    n.stairs(-0.1, 12.42, 0, 0, { seed: 9 }),
    n.catwalk(8.98, 12.42, 0, 2.54, { seed: 10 }));
  for (let s of [7.6, 10.36])
    for (let o of [11.86, 12.98])
      n.rod("steel_galv", [s, 0, o], [s, 2.5, o], 0.035);
  (e("sandbags", 15.95, 12.42, ss, { seed: 61 }, 2.59),
    e("crate_wood", 14.3, 11.75, 0.1, { seed: 62 }, 2.59),
    e("sandbags", 2.3, 11.75, 0, { seed: 63 }, 2.59),
    t(-16.4, 20.12, [
      [40, "grey"],
      [40, "green"],
    ]),
    t(-2.25, 20.12, [[20, "red"]]),
    t(3.85, 20.12, [
      [20, "white"],
      [20, "blue"],
    ]),
    t(13.53, 20.12, [
      [20, "orange"],
      [20, "teal"],
      [20, "red"],
    ]),
    t(-16.4, 22.62, [
      ["hc", "teal"],
      [40, "yellow"],
      [40, "blue"],
    ]),
    t(0.8, 22.62, [
      [40, "green"],
      ["hc", "orange"],
    ]),
    t(13.53, 22.62, [[20, "grey", { doors: 0.4 }]]),
    t(
      -22.6,
      -19.2,
      [
        [40, "red"],
        [40, "white"],
      ],
      ss,
    ),
    t(-30.2, -18.4, [[20, "yellow", { doors: 0.5 }]], 0.35, 0),
    t(-31.2, 24.7, [
      [40, "teal"],
      [40, "orange"],
    ]));
  for (let [s, o] of [
    [-23.4, 0.5],
    [-23.4, 21.4],
    [17, -8.7],
    [17, 18.6],
    [-20.6, -11.6],
  ])
    e("light_mast", s, o, 0, { seed: Math.round(s * 3 + o) });
  let i = (s, o, r, a = 0.018) => {
    let l = [];
    for (let c = 0; c <= 8; c++) {
      let u = c / 8;
      l.push([
        s[0] + (o[0] - s[0]) * u,
        s[1] + (o[1] - s[1]) * u - r * 4 * u * (1 - u),
        s[2] + (o[2] - s[2]) * u,
      ]);
    }
    n.tube("rubber", l, a, { radial: 5, tension: 0.5 });
  };
  (i([-23.4, 12.4, 0.5], [-20.6, 12.4, -11.6], 1.3),
    i([-20.6, 11.8, -11.6], [-16.2, 7.25, -11.4], 0.9),
    i([-23.4, 12, 0.5], [-27.6, 12.2, -0.9], 0.5),
    i([17, 12.4, -8.7], [12.3, 7.3, -11.3], 1),
    r1(n, -20.9, 8.3, 0.02),
    Vl(n, -18.6, 3.75, 1.7),
    Vl(n, 0.4, 13.3, 0.3),
    e("barrel", -19.6, 3.85, 0, { seed: 1, color: "blue" }),
    e("barrel", -18.9, 3.95, 0.7, { seed: 2, color: "blue" }),
    e("pallet_stack", -17.4, 4, 0.08, { seed: 3 }),
    e("crate_stack", -14.3, 8.05, 0.04, { seed: 4 }),
    e("ibc_tote", -12.95, 7.95, -0.05, { seed: 5 }));
  {
    let a = Math.cos(-0.22),
      l = -Math.sin(-0.22);
    e("forklift", -8.6, 4.5, -0.22, { seed: 6, forksUp: 0.3 });
    let c = -8.6 + a * 1.42,
      u = 4.5 + l * 1.42;
    (e("pallet", c, u, -0.22, { seed: 7 }, kg, { noCol: !0 }),
      e("crate_wood", c, u, -0.22 + 0.05, { seed: 8 }, kg + 0.144, {
        noCol: !0,
      }),
      n.col(
        c - 0.62,
        kg - 0.1,
        u - 0.62,
        c + 0.62,
        kg + 1.15,
        u + 0.62,
        "wood",
      ),
      Vl(n, -8.6 - 1, 4.5 + 0.78, 0.2),
      Vl(n, -11.9, 3.6, 2.4));
  }
  (e("jersey_barrier", -2.9, 5.3, 0.12, { seed: 11 }),
    e("jersey_barrier", 5.6, 5, -0.1, { seed: 12 }),
    e("sandbags", -1.7, 9.7, 0.5, { seed: 13 }),
    e("ibc_tote", 5.9, 8.9, 0.1, { seed: 14 }),
    e("ibc_tote", 5.95, 10.05, -0.05, { seed: 15 }),
    e("barrel", 4.9, 9.7, 0, { seed: 16, color: "red" }),
    e("crate_stack", -3.9, 10.5, 0.1, { seed: 17 }),
    e("crate_wood", -3.8, 9.35, -0.2, { seed: 18 }),
    e("pallet_stack", -4.4, 11.8, 0.02, { seed: 19 }),
    e("cable_reel", 4.2, 10.5, 0.3, { seed: 20 }),
    e("tarp_cargo", 12.9, 10, 0.04, { seed: 21 }),
    e("jersey_barrier", 11.6, 3.95, 0.03, { seed: 81 }),
    e("ibc_tote", 15.2, 10.2, 0.1, { seed: 82 }));
  for (let [s, o] of [
    [0.2, 6.3],
    [2.9, 6.4],
    [2.9, 8.8],
    [0.1, 8.7],
  ])
    e("traffic_cone", s, o, 0, { seed: Math.round(s * 9 + o * 5) });
  (Ol(n, -9.55, 9.3, 0.04),
    r1(n, -7.6, 11.9, ss + 0.06),
    Ol(n, 9.9, 12.9, ss, "paint_blue"),
    e("sign_post", -4.8, 3.72, ss, { seed: 22, sign: "hazard_voltage" }),
    Tv(n, 0.9, 3.62, 0),
    na(
      n,
      [
        [0.9, 3.9],
        [1.2, 5.2],
        [0.8, 6.2],
        [1.5, 7.1],
      ],
      0.03,
    ),
    e("tarp_cargo", -13.5, -3.1, 0.05, { seed: 23 }),
    e("pallet_stack", -20.6, -0.1, 0.2, { seed: 24 }),
    e("tire_stack", -9.6, 0.2, 0, { seed: 25 }),
    e("barrel", 4.5, 0.35, 0, { seed: 26, color: "yellow" }),
    e("barrel", 5.2, 0.3, 0.4, { seed: 27 }),
    e("jersey_barrier", 12.2, 0.4, 0.03, { seed: 28 }),
    e("crate_wood", 11.2, -3.3, 0.3, { seed: 29 }),
    e("cardboard_boxes", -2, 0.3, 0.2, { seed: 30 }),
    Hl(n, -4.2, -3.2, 0.03, "paint_orange", 3),
    e("jersey_barrier", -0.9, -7.5, 0.1, { seed: 31 }),
    e("sandbags", -6.7, -7.8, -0.1, { seed: 32 }),
    e("dumpster", -12.3, -7.05, 0, { seed: 33 }),
    e("gas_cylinders", 9.6, -10.45, 0, { seed: 34 }),
    e("pallet_stack", 1.2, -9.9, 0.1, { seed: 35 }),
    e("barrel", 2.2, -10.3, 0, { seed: 36, color: "green" }),
    e("cable_reel", -18.2, -8, 0.2, { seed: 37 }),
    e("traffic_cone", -6.5, -9.9, 0, { seed: 38 }),
    e("traffic_cone", -0.5, -9.9, 0, { seed: 39 }),
    na(
      n,
      [
        [4.6, -10.9, 0.5],
        [4.7, -10.6, 0.05],
        [4.2, -9.2],
        [1, -8.4],
        [-2.6, -9.1],
        [-4.6, -6.4],
        [-5.9, -5.9],
      ],
      0.024,
    ),
    e("pipe_stack", -16, 14.4, 0, { seed: 41 }),
    e("crate_stack", -10.95, 18.25, 0.06, { seed: 42 }),
    e("barrel", -3, 18.35, 0, { seed: 43, color: "blue" }),
    e("dumpster", 4.2, 14.55, 0.02, { seed: 44 }),
    e("tire_stack", 10.95, 18.3, 0, { seed: 45 }),
    e("ibc_tote", 12, 18.25, 0, { seed: 46 }),
    e("pallet_stack", -12.3, 18.2, 0.1, { seed: 47 }),
    e("tarp_cargo", -20.5, 18.05, 0.03, { seed: 48 }),
    e("jersey_barrier", 0.6, 15.5, 0.12, { seed: 49 }),
    e("tire_stack", -8, 26.9, 0, { seed: 51 }),
    e("pallet_stack", 8.7, 27, 0.3, { seed: 52 }),
    e("crate_wood", -2, 27, 0.2, { seed: 53 }),
    e("barrel", 11.2, 27.1, 0, { seed: 54 }),
    e("cardboard_boxes", -21, 26.9, 0.4, { seed: 55 }),
    Ol(n, 16, 26.9, 0.1),
    e("pipe_stack", -30.5, -27, 0.03, { seed: 56 }),
    e("pipe_stack", -30.2, -25.4, -0.02, { seed: 57 }),
    e("dumpster", -17, -14, ss, { seed: 58 }),
    e("tarp_cargo", -27.5, -11.6, 0.3, { seed: 59 }),
    e("tarp_cargo", -29.9, -11, -0.2, { seed: 60 }),
    e("cable_reel", -34.6, -22.5, 1, { seed: 64 }),
    e("tire_stack", -25.4, -26.9, 0, { seed: 65 }),
    e("gas_cylinders", -16.9, -20.4, ss, { seed: 66 }),
    e("crate_stack", -34.8, -13.5, 0.2, { seed: 67 }),
    e("barrel", -33.6, -13, 0, { seed: 68 }),
    Hl(n, -36.6, -26, ss, "paint_blue", 4),
    e("generator", -34.2, 14.2, 0.15, { seed: 71 }),
    e("floodlight_stand", -31.4, 12.7, 0.55, { seed: 72 }),
    na(
      n,
      [
        [-33.2, 14],
        [-32.4, 13.2],
        [-31.6, 12.9],
      ],
      0.02,
    ),
    e("tire_stack", -36.6, 17.2, 0, { seed: 73 }),
    e("tire_stack", -36.5, 18.3, 0.6, { seed: 74 }),
    e("dumpster", -36.4, 21, ss, { seed: 75 }),
    e("pallet_stack", -27.8, 16.6, 0.4, { seed: 76 }),
    e("jerry_can", -33, 15.2, 0.4, { seed: 77 }),
    e("jerry_can", -33.3, 15.35, 1.9, { seed: 78 }),
    e("crate_wood", -28.6, 20.6, 0.1, { seed: 79 }),
    e("ibc_tote", -26.6, 21.2, 0, { seed: 80 }),
    a1(n, -22.9, -3.62, "LANE 1", "x-"),
    a1(n, -22.95, 3.62, "LANE 2", "x-"),
    a1(n, -25, 14, "LANE 3", "x-"),
    a1(n, 16.9, 9.5, "LANE 2", "x+"),
    n.label("BERTH 4 WORKSHOP", 0.55, 4.2, 4.3, Zs.Z1 + 0.064, "z+", {
      color: "white",
      font: "stencil",
      distress: 0.45,
    }),
    n.decal("berth4", 3.2, -12, 3.4, Zs.Z1 + 0.064, "z+"),
    n.decal("rust_run", 1, 9, 3.2, Zs.Z1 + 0.064, "z+"),
    n.decal("grime_streak", 1.2, -14, 3.9, Zs.Z1 + 0.064, "z+"));
}
function hP(n) {
  let e = n.place,
    t = -38,
    i = 30,
    s = -30,
    o = 28,
    r = 2,
    a = 8;
  function l(c, u, f, h, p) {
    let d = Math.hypot(f - c, h - u),
      m = Math.max(1, Math.round(d / 3.35)),
      x = d / (m * 3),
      v = Math.abs(f - c) > Math.abs(h - u);
    for (let y = 0; y < m; y++) {
      let b = (y + 0.5) / m,
        g = e(
          "fence_panel",
          c + (f - c) * b,
          u + (h - u) * b,
          v ? 0 : ss,
          { seed: p + y, posts: y === m - 1 ? "both" : "left" },
          0,
          { noCol: !0 },
        );
      g.scale.x = x;
    }
    (n.col(
      Math.min(c, f) - 0.05,
      0,
      Math.min(u, h) - 0.05,
      Math.max(c, f) + 0.05,
      2.4,
      Math.max(u, h) + 0.05,
      "metal",
    ),
      n.col(
        Math.min(c, f) - 0.3,
        0,
        Math.min(u, h) - 0.3,
        Math.max(c, f) + 0.3,
        7,
        Math.max(u, h) + 0.3,
        "metal",
        { playerOnly: !0 },
      ));
  }
  (l(t, s, i, s, 100),
    l(t, o, i, o, 200),
    l(t, s, t, r, 300),
    l(t, a, t, o, 400));
  for (let c of [r - 0.1, a + 0.1])
    (n.box("steel_dark", 0.22, 3.4, 0.22, t, 1.7, c, { bevel: 0.02 }),
      n.box("hazard_stripes", 0.26, 1.2, 0.26, t, 0.6, c, { bevel: 0.02 }),
      n.col(t - 0.13, 0, c - 0.13, t + 0.13, 3.4, c + 0.13, "metal"));
  {
    let c = a + 3.3,
      u = t + 0.28;
    n.box("chainlink", 0.012, 2.1, 6, u, 1.25, c);
    for (let f of [c - 3, c, c + 3])
      n.box("steel_galv", 0.06, 2.2, 0.06, u, 1.25, f);
    for (let f of [0.18, 2.32, 1.25])
      n.box("steel_galv", 0.06, 0.06, 6.06, u, f, c);
    (n.rod("steel_galv", [u, 0.2, c - 3], [u, 2.3, c], 0.018),
      n.rod("steel_galv", [u, 0.2, c + 3], [u, 2.3, c], 0.018),
      n.slab("steel_dark", u - 0.05, 0, r - 0.3, u + 0.05, 0.03, c + 3.2, {
        cast: !1,
      }));
    for (let f of [c - 2.4, c + 2.4])
      n.cyl("rubber", 0.09, 0.05, u, 0.1, f, { axis: "x", seg: 10 });
  }
  (n.col(t - 0.4, 0, r, t - 0.1, 7, a, "metal", { playerOnly: !0 }),
    e("guard_booth", -35.2, 0.35, 0, { seed: 1 }),
    e("gate_arm", -36.3, 5, ss, { seed: 2 }));
  for (let [c, u] of [
    [-37, 1.75],
    [-34.4, 2.3],
    [-37, 8.3],
    [-35.6, 8.9],
    [-34.4, 9.9],
    [-33.5, -1.1],
  ])
    e("bollard_post", c, u, 0, { seed: Math.round(c * 11 + u * 7) });
  (e("jersey_barrier", -34.7, 3.75, ss + 0.08, { seed: 3 }),
    e("jersey_barrier", -33.3, 8.3, ss - 0.06, { seed: 4 }),
    e("jersey_barrier", -30.6, 10.4, 0.03, { seed: 5 }),
    e("jersey_barrier", -27.3, 1.45, 0.05, { seed: 6 }),
    e("jersey_barrier", -32.2, 1.45, -0.04, { seed: 7 }),
    e("sign_post", -33.2, 9.6, ss, { seed: 8, sign: "no_entry" }),
    e("sign_post", -25.3, 1.1, ss, { seed: 9, sign: "berth4" }),
    e("sign_post", -36.6, -1.6, ss, { seed: 10, sign: "hazard_general" }));
  for (let [c, u] of [
    [-34.6, 5.6],
    [-28.3, 2],
    [-33.2, 6.5],
    [-26.6, 9.8],
    [-31.8, 9.9],
  ])
    e("traffic_cone", c, u, 0, { seed: Math.round(c * 5 + u * 3) });
  (e("light_mast", -27.6, -0.9, 0, { seed: 11 }),
    e("light_mast", -36.3, 12.4, 0, { seed: 12 }),
    e("barrel", -33.9, 2, 0, { seed: 13, color: "yellow" }),
    e("pallet_stack", -36.4, 10.3, 0.2, { seed: 14 }),
    n.decal("no_entry", 0.7, t + 0.34, 1.5, a + 3.3, "x+"),
    n.decal("arrow", 2.2, -30.5, 0.006, 6, "y+", 0));
}
async function Pg(n) {
  let e = new At();
  ((e.name = "level"), n.scene.add(e));
  let t = uw(n);
  (fP(t), hP(t));
  let i = dw(t),
    s = mw(t),
    o = t.place("relay_node", 1.5, 7.5, 0.35, { seed: 1 }, 0),
    r = t.place(
      "relay_node",
      i.relayPos.x,
      i.relayPos.z,
      ss * 0.9,
      { seed: 2 },
      Zs.FLOOR,
    ),
    a = t.place("relay_node", s.relayPos.x, s.relayPos.z, -0.2, { seed: 3 }, 0);
  (na(
    t,
    [
      [-2, -27.5, 1.2],
      [-2, -27.55, 0.08],
      [-1.4, -25.6],
      [-2.4, -23],
      [-1.9, -20.3],
    ],
    0.03,
    t.MI("rubber"),
    Zs.FLOOR + 0.028,
  ),
    Tv(t, 20.4, -7.3, 0.2),
    na(
      t,
      [
        [20.5, -7],
        [21.4, -4.9],
        [22.4, -2.6],
        [22.9, -0.7],
      ],
      0.03,
    ),
    t.staticRoot.updateMatrixWorld(!0));
  let l = [];
  t.staticRoot.traverse((R) => {
    R.userData &&
      R.userData.noMerge &&
      !(R.parent && dP(R.parent, t.staticRoot)) &&
      l.push(R);
  });
  for (let R of l) t.dynRoot.attach(R);
  let c = new Set();
  t.staticRoot.traverse((R) => {
    R.isMesh && !Array.isArray(R.material) && c.add(R.material);
  });
  let u = new Map();
  for (let R of c)
    if (!(
      !R.isMeshStandardMaterial ||
      R.vertexColors ||
      R.transparent ||
      !R.name ||
      !(n.mats.names || []).includes(R.name)
    ))
      try {
        let z = R.userData && R.userData.interior ? { interior: !0 } : {};
        if (n.mats.get(R.name, z) !== R) continue;
        let I = n.mats.get(R.name, { ...z, vertexColors: !0 });
        I !== R && c.has(I) && u.set(R, I);
      } catch {}
  t.staticRoot.traverse((R) => {
    if (!R.isMesh || Array.isArray(R.material)) return;
    let z = u.get(R.material);
    z && (R.material = z);
    let I = !R.material.transparent && !R.material.isMeshBasicMaterial;
    ((R.castShadow = I), (R.receiveShadow = !R.material.isMeshBasicMaterial));
  });
  let f = { count: 0, update() {} };
  try {
    f = fw(t.staticRoot);
  } catch (R) {
    console.error("[level] label atlas failed", R);
  }
  let h = ig(t.staticRoot);
  ((h.name = "level-merged"), e.add(h), e.add(t.dynRoot));
  for (let R of [o, r, a]) {
    for (let z = R.children.length - 1; z >= 0; z--) R.remove(R.children[z]);
    t.dynRoot.add(R);
  }
  let p = 0;
  h.traverse((R) => {
    if (R.isMesh) {
      let z = R.geometry;
      p += (z.index ? z.index.count : z.attributes.position.count) / 3;
    }
  });
  let d = { pos: Rt(-32, 0, 6), yaw: -ss },
    m = [
      {
        id: "relay_a",
        label: "Relay A \u2014 Yard",
        zone: "yard",
        pos: Rt(1.5, 0, 7.5),
        object: o,
      },
      {
        id: "relay_b",
        label: "Relay B \u2014 Shed",
        zone: "shed",
        pos: Rt(i.relayPos.x, Zs.FLOOR, i.relayPos.z),
        object: r,
      },
      {
        id: "relay_c",
        label: "Relay C \u2014 Quay",
        zone: "quay",
        pos: Rt(s.relayPos.x, 0, s.relayPos.z),
        object: a,
      },
    ],
    x = (R, z, I) => ({ pos: Rt(R, 0, z), zone: I, type: "ground" }),
    v = (R, z, I, L) => ({ pos: Rt(R, z, I), zone: L, type: "air" }),
    y = [
      x(-19, -1.4, "yard"),
      x(3.5, -1.6, "yard"),
      x(14.2, 16.4, "yard"),
      x(-3.2, 16.6, "yard"),
      x(-16, 26, "yard"),
      x(6, 26, "yard"),
      x(4.2, -5.12, "yard"),
      x(-7.8, 21.4, "yard"),
      x(-11.3, 12.5, "yard"),
      x(17.5, 22.2, "yard"),
      v(10, 11, 23.5, "yard"),
      v(2, 11, 21.5, "yard"),
      v(13, 9, 11, "yard"),
      v(-4, 12.5, -4.5, "yard"),
      v(9, 10, 1.5, "yard"),
      v(-10, 12, 24.5, "yard"),
      x(-12.4, -24.8, "shed"),
      x(9.6, -25.3, "shed"),
      x(-13.4, -19.6, "shed"),
      x(4.6, -13.8, "shed"),
      x(-21, -27.2, "shed"),
      x(-18.6, -22, "shed"),
      x(13.6, -24, "shed"),
      x(-26.6, -15, "shed"),
      v(-8, 5.4, -20.5, "shed"),
      v(5, 5.2, -18, "shed"),
      v(-20, 10.5, -20, "shed"),
      v(14.5, 10, -22, "shed"),
      v(-2, 12.5, -8.5, "shed"),
      x(27.7, -24.2, "quay"),
      x(18.3, -25.4, "quay"),
      x(27.2, -12.6, "quay"),
      x(20.2, 14, "quay"),
      x(23.4, 23.2, "quay"),
      x(18, 24.4, "quay"),
      x(27.4, 11.6, "quay"),
      v(36, 9, 4, "quay"),
      v(38, 11, -6, "quay"),
      v(35, 8.5, 16, "quay"),
      v(24, 12.5, 10.5, "quay"),
      v(33.5, 10, 24.5, "quay"),
      v(22, 13, -14, "quay"),
    ],
    b = [
      { name: "gate", min: [-40, -30], max: [-24, 30] },
      { name: "yard", min: [-24, -10], max: [16, 30] },
      { name: "shed", min: [-24, -30], max: [16, -10] },
      { name: "quay", min: [16, -30], max: [40, 30] },
    ],
    g = [{ min: Rt(Zs.X0, 0, Zs.Z0), max: Rt(Zs.X1, Zs.RIDGE, Zs.Z1) }],
    E = [
      { pos: [-34, 1.6, 6.2], look: [-12, 2.6, 6.6] },
      { pos: [-20, 1.3, 5.6], look: [0, 2.2, 7] },
      { pos: [-6.2, 2.1, 7.9], look: [2, 1.6, 7.6] },
      { pos: [-6.6, 2.5, 0.4], look: [-4, 2.6, -12] },
      { pos: [-4.4, 1.9, -8.6], look: [-2.4, 2.8, -19.5] },
      { pos: [-3.2, 2.2, -15], look: [-2, 2.2, -20.5] },
      { pos: [4.2, 2.6, -19.6], look: [12, 3.2, -19.5] },
      { pos: [15, 2, -19.5], look: [24, 3.5, -6] },
      { pos: [20.2, 1.7, -9], look: [23, 1.6, 0] },
      { pos: [25.9, 1.8, 1.5], look: [27.5, 1.2, 12] },
      { pos: [27.3, 1.8, 12], look: [29.6, 0.4, 20] },
      { pos: [28.4, 1.9, 17.2], look: [31.5, -0.8, 21] },
    ],
    M = [
      Rt(-33.9, 0, 3.8),
      Rt(-27.3, 0, 2.3),
      Rt(-19.2, 0, 4.7),
      Rt(-17.4, 0, 4.9),
      Rt(-12.5, 0, 7.2),
      Rt(-9.3, 0, 6.4),
      Rt(-6.3, 0, 7.3),
      Rt(-2.9, 0, 6.1),
      Rt(-2.9, 0, 4.5),
      Rt(5.6, 0, 5.8),
      Rt(5.6, 0, 4.2),
      Rt(-2.2, 0, 10.4),
      Rt(5, 0, 8.9),
      Rt(-4.8, 0, 10.6),
      Rt(7.5, 0, 7.7),
      Rt(9.2, 0, 4.4),
      Rt(-1, 0, 13.6),
      Rt(-13.5, 0, -1.5),
      Rt(-9.6, 0, -0.7),
      Rt(7.8, 0, -1.5),
      Rt(-4.2, 0, -2.2),
      Rt(-0.9, 0, -6.7),
      Rt(-6.7, 0, -7),
      Rt(1.2, 0, -8.9),
      Rt(-8.1, 0, 15.4),
      Rt(0.6, 0, 16.9),
      Rt(4.2, 0, 15.7),
      Rt(-16, 0, 15.6),
      Rt(12, 0, 17.2),
      Rt(2.9, 0, -17),
      Rt(4.2, 0, -15.3),
      Rt(6.9, 0, -20.6),
      Rt(-7.6, 0, -17.4),
      Rt(-8.3, 0, -14.3),
      Rt(9.6, 0, -21.9),
      Rt(-13.2, 0, -14.4),
      Rt(-11.6, 0, -18.6),
      Rt(0, 0, -25.8),
      Rt(-12.4, 0, -25.8),
      Rt(21.4, 0, -4.7),
      Rt(25.3, 0, 3.9),
      Rt(25.7, 0, -4.4),
      Rt(20.2, 0, -15.4),
      Rt(26.4, 0, -15.4),
      Rt(20.6, 0, 14.4),
      Rt(26.8, 0, 14.4),
      Rt(20.6, 0, 21.2),
      Rt(27.4, 0, 22.4),
      Rt(19.6, 0, -21.4),
      Rt(27, 0, -16.2),
      Rt(25.6, 0, 6),
      Rt(13.5, 2.59, 12.4),
      Rt(4.4, 2.59, 12.4),
      Rt(12.9, 0, 8.8),
      Rt(11.6, 0, 4.9),
    ],
    _ = n.physics.nav,
    T = (R) => {
      if (!(!_ || !_.isWalkable || R.y > 0.2 || _.isWalkable(R.x, R.z)))
        for (let z of [0.5, 1, 1.5, 2])
          for (let I = 0; I < 8; I++) {
            let L = R.x + Math.cos(I * 0.7854) * z,
              U = R.z + Math.sin(I * 0.7854) * z;
            if (_.isWalkable(L, U)) {
              ((R.x = L), (R.z = U));
              return;
            }
          }
    };
  (M.forEach(T),
    y.forEach((R) => {
      R.type === "ground" && T(R.pos);
    }));
  let w = !1;
  return {
    root: e,
    playerStart: d,
    objectives: m,
    extraction: { pos: s.extraction.clone(), radius: 2.5 },
    enemySpawns: y,
    zones: b,
    interiorBoxes: g,
    cinematicPath: E,
    coverPoints: M,
    skylights: i.skylights,
    shedLights: i.lights,
    vantage: { stairsFoot: Rt(-2.2, 0, 12.4), roof: Rt(13.5, 2.59, 12.4) },
    stats: {
      labelsAtlased: f.count,
      containers: t.placed.filter((R) => R.name.startsWith("container")).length,
      props: t.placed.length,
      tris: Math.round(p),
      meshes: h.children.length + pP(t.dynRoot),
    },
    placed: t.placed,
    explosives: t.explosives,
    groundSurfaceAt(R, z) {
      return t.isMetal(R, z) ? "metal" : "concrete";
    },
    update(R) {
      (i.update(R), f.update(R));
      for (let z = 0; z < t.updaters.length; z++)
        try {
          t.updaters[z](R);
        } catch (I) {
          w || ((w = !0), console.error("[level] prop update threw", I));
        }
    },
  };
}
function dP(n, e) {
  for (; n && n !== e;) {
    if (n.userData && n.userData.noMerge) return !0;
    n = n.parent;
  }
  return !1;
}
function pP(n) {
  let e = 0;
  return (
    n.traverse((t) => {
      t.isMesh && e++;
    }),
    e
  );
}
async function mP(n) {
  let e = await Pg(n);
  return {
    cam: [-32, 1.7, 6],
    target: [0, 2.4, 6.4],
    update: (t) => e.update(t),
  };
}
