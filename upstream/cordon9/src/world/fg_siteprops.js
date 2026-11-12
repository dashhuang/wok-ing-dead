var FC = { green: [0.1, 0.26, 0.14], greenDk: [0.06, 0.16, 0.09], galv: [0.9, 0.92, 0.94], dk: [0.12, 0.12, 0.13], olive: [0.3, 0.33, 0.2], oliveDk: [0.2, 0.22, 0.14], sand: [0.62, 0.56, 0.42], white: [0.92, 0.92, 0.9], blue: [0.1, 0.22, 0.5], navy: [0.07, 0.12, 0.26], gold: [0.82, 0.6, 0.08], red: [0.62, 0.08, 0.06], yellow: [0.86, 0.62, 0.04], orange: [0.85, 0.32, 0.04], grey: [0.5, 0.51, 0.52] };
var weldPanel = (seed = 1, o = {}) => proto("weld" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("weldPanel", seed), L = o.len || 2.5, Hh = o.h || 2.4, lean = o.lean || 0, col = FC.green;
  const post = (x) => {
    P3.box("paint", 0.06, Hh + 0.1, 0.06, x, 0, 0, { base: true, col, b: 6e-3 });
    P3.box("plastic", 0.066, 0.02, 0.066, x, Hh + 0.105, 0, { col: [0.05, 0.05, 0.05], b: 6e-3 });
    P3.cyl("concrete", 0.17, 0.07, x, 0.012, 0, { seg: 10, cham: 0.02, col: [0.8, 0.8, 0.78] });
    for (const y of [0.25, 0.85, 1.45, 2.05]) if (y < Hh) {
      P3.box("paint", 0.03, 0.05, 0.02, x + 0.045, y, 0.03, { col, b: 4e-3 });
      hex(P3, x + 0.045, y, 0.044, "z", 9e-3, 8e-3);
    }
    if (o.topper) {
      P3.beam("paint", [x, Hh + 0.1, 0], [x, Hh + 0.5, -0.2], 0.04, 0.04, { col });
    }
  };
  P3.push({ r: [lean, 0, 0] });
  post(-L / 2);
  if (o.end) post(L / 2);
  const ny = Math.round(Hh / 0.6) * 4, g2 = quadXY(L - 0.07, Hh - 0.06, null, 1, ny), Pp = g2.attributes.position;
  for (let i = 0; i < Pp.count; i++) {
    const y = Pp.getY(i) + (Hh - 0.06) / 2, f3 = y / 0.6 % 1, v = Math.abs(f3 - 0.5) < 0.13 ? 0.03 * (1 - Math.abs(f3 - 0.5) / 0.13) : 0;
    let z = v;
    if (o.torn) {
      const t = clamp2((Pp.getX(i) / (L - 0.07) + 0.5 - 0.45) / 0.55) * clamp2(1.2 - y / Hh);
      z += t * t * 0.7;
    }
    Pp.setZ(i, z);
  }
  g2.computeVertexNormals();
  P3.add("meshWeld", g2, null, { p: [0, Hh / 2 + 0.05, 0.034] });
  if (o.topper) for (let k = 0; k < 3; k++) P3.bar("galv", [-L / 2, Hh + 0.2 + k * 0.12, -0.05 - k * 0.06], [L / 2, Hh + 0.2 + k * 0.12, -0.05 - k * 0.06], 3e-3);
  P3.pop();
  P3.col([-L / 2, 0, -0.05], [L / 2, Hh, 0.05], { surface: "mesh" });
  return P3.finish({ grime: 0.8, ground: 0.4 });
});
var weldFlat = (seed = 1) => proto("weldflat" + seed, () => {
  const P3 = new Prop("weldFlat", seed), L = 2.5, Hh = 2.4, g2 = quadXY(L - 0.07, Hh - 0.06, null, 6, 6), Pp = g2.attributes.position;
  for (let i = 0; i < Pp.count; i++) Pp.setZ(i, 0.05 * fbm(Pp.getX(i) * 1.3 + seed, Pp.getY(i) * 1.3, 2.2, 2));
  g2.computeVertexNormals();
  P3.add("meshWeld", g2, null, { p: [0, 0.03, Hh / 2], r: [-H, 0, 0] });
  for (const x of [-L / 2, L / 2]) {
    P3.box("paint", 0.06, 0.06, Hh + 0.1, x, 0.035, Hh / 2 + 0.1, { col: FC.green, b: 6e-3, r: [0.02 * x, 0, 0] });
    P3.add("concrete", deform(bevelBox(0.3, 0.3, 0.42, 0.04, 2), (v) => {
      v.x += (vnoise(v.y * 9, v.z * 9, 1) - 0.5) * 0.05;
    }), [0.74, 0.73, 0.7], { p: [x, 0.1, -0.12], r: [0.5, 0.2 * x, 0] });
  }
  P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
  return P3.finish({ grime: 1, ground: 0.2 });
});
var weldGate = (seed = 1, o = {}) => proto("weldgate" + seed + JSON.stringify(o), () => {
  const P3 = new Prop("weldGate", seed), w = o.w || 3.4, Hh = 2.3, col = o.col || FC.green, a = o.open ?? [1.35, -1.2];
  for (const s of [-1, 1]) {
    const px2 = s * (w + 0.06);
    P3.box("paint", 0.1, Hh + 0.3, 0.1, px2, 0, 0, { base: true, col, b: 8e-3 });
    P3.add("paint", cyl(0.075, 0.03, 4, { cham: 6e-3, r2: 0.01 }), col, { p: [px2, Hh + 0.315, 0], r: [0, PI5 / 4, 0] });
    P3.cyl("concrete", 0.24, 0.08, px2, 0.012, 0, { seg: 10, cham: 0.02, col: [0.8, 0.8, 0.78] });
    P3.col([px2 - 0.06, 0, -0.06], [px2 + 0.06, Hh, 0.06], { surface: "metal" });
    P3.push({ p: [px2 - s * 0.07, 0, 0], r: [0, s > 0 ? a[1] : a[0], 0] });
    const d = -s;
    for (const y of [0.12, Hh]) P3.beam("paint", [0, y, 0], [d * w, y, 0], 0.05, 0.05, { col });
    for (const x of [0.02, w / 2, w - 0.02]) P3.beam("paint", [d * x, 0.12, 0], [d * x, Hh, 0], 0.05, 0.05, { col });
    P3.beam("paint", [0, 0.14, 0], [d * w, Hh - 0.02, 0], 0.03, 0.03, { col });
    P3.add("meshWeld", quadXY(w - 0.08, Hh - 0.16), null, { p: [d * w / 2, Hh / 2 + 0.06, 0.022] });
    for (const y of [0.5, 1.8]) {
      P3.cyl("steel", 0.022, 0.12, -d * 0.03, y, 0, { seg: 8, col: FC.dk });
    }
    P3.bar("galv", [d * (w - 0.1), 0.02, 0.04], [d * (w - 0.1), 0.6, 0.04], 9e-3);
    P3.box("steel", 0.03, 0.08, 0.03, d * (w - 0.1), 0.5, 0.04, { col: FC.dk });
    if (s > 0) P3.tube("steel", catenary([d * (w - 0.04), 1.1, 0.03], [d * (w - 0.3), 0.5, 0.05], 0.25, 10), 7e-3, { col: [0.7, 0.7, 0.72] });
    P3.col([d > 0 ? 0 : -w, 0, -0.05], [d > 0 ? w : 0, Hh, 0.05], { surface: "mesh" });
    P3.pop();
  }
  return P3.finish({ grime: 0.9, ground: 0.4 });
});

