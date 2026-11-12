var inR = (rs, a, b) => rs && rs.some(([x0, x1]) => a >= x0 - 1e-4 && b <= x1 + 1e-4);
function shell2(P3, S4) {
  const keys = S4.keys, x0 = keys[0][0], x1 = keys[keys.length - 1][0], gTop = S4.gTop ?? 0.86, rail = S4.rail ?? 0.95, wy = S4.wy ?? 0.33;
  const sample = (x) => {
    let i = 0;
    while (i < keys.length - 2 && x > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], t = clamp2((x - a[0]) / (b[0] - a[0]));
    return a.map((v, k) => lerp2(v, b[k], t));
  };
  const set = /* @__PURE__ */ new Set();
  const addX = (x) => {
    if (x >= x0 - 1e-6 && x <= x1 + 1e-6) set.add(Math.round(x * 1e3) / 1e3);
  };
  for (const k of keys) addX(k[0]);
  for (let x = x0; x <= x1; x += S4.step || 0.12) addX(x);
  for (const rs of [S4.side, S4.sideL, S4.top]) if (rs) for (const [a, b] of rs) {
    addX(a);
    addX(b);
  }
  if (S4.door) {
    addX(S4.door.x0);
    addX(S4.door.x1);
  }
  for (const [ax, R4] of S4.arches || []) for (let i = 0; i <= 14; i++) addX(ax - R4 + 2 * R4 * i / 14);
  let xs = [...set].sort((a, b) => a - b);
  xs = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 0.012 || keys.some((k) => Math.abs(k[0] - x) < 1e-6));
  const arch = (x) => {
    let y = -1;
    for (const [ax, R4] of S4.arches || []) {
      const d = Math.abs(x - ax);
      if (d < R4) y = Math.max(y, wy + Math.sqrt(R4 * R4 - d * d));
    }
    return y;
  };
  const ringPt2 = (x, h, out) => {
    const [, yS, yB, yT, wB, wT] = sample(x), gh = Math.max(0, yT - yB), ws = wB - 0.014;
    let w, y;
    if (h === 0) {
      w = wB - 0.035;
      y = yS;
    } else if (h === 1) {
      w = wB - 4e-3;
      y = yS + 0.09;
    } else if (h === 2) {
      w = wB + 6e-3;
      y = lerp2(yS, yB, 0.55);
    } else if (h === 3) {
      w = wB;
      y = yB - 0.05;
    } else if (h === 4) {
      w = ws;
      y = yB;
    } else if (h === 5) {
      w = lerp2(ws, wT, gTop / rail);
      y = yB + gh * gTop;
    } else if (h === 6) {
      w = wT;
      y = yB + gh * rail;
    } else if (h === 7) {
      w = wT * 0.74;
      y = yB + gh * (rail + (1 - rail) * 0.75);
    } else if (h === 8) {
      w = wT * 0.38;
      y = yB + gh * (rail + (1 - rail) * 0.96);
    } else {
      w = 0;
      y = yT;
    }
    if (h <= 3) {
      const a = arch(x);
      if (a > y) y = Math.min(a, yB - 0.03);
    }
    out[0] = w;
    out[1] = y;
    return out;
  };
  const tmp2 = [0, 0], V = Array.from({ length: 19 }, (_, i) => i), cc = S4.col || [0.5, 0.5, 0.5];
  const g2 = gridSurf(xs, V, (x, j, q) => {
    const h = j <= 9 ? j : 18 - j, sg = j <= 9 ? 1 : -1;
    ringPt2(x, h, tmp2);
    q.set(x, tmp2[1], sg * tmp2[0]);
    return cc;
  });
  const idx = g2.index.array, nu = xs.length, body = [], glass = [], door = [], D = S4.door;
  let doorM = null;
  for (let j = 0; j < 18; j++) for (let i = 0; i < nu - 1; i++) {
    const c = (j * (nu - 1) + i) * 6, tri = [idx[c], idx[c + 1], idx[c + 2], idx[c + 3], idx[c + 4], idx[c + 5]], hc = j <= 8 ? j : 17 - j, sd = j <= 8 ? 1 : -1, a = xs[i], b = xs[i + 1];
    const isG = hc === 4 && inR(sd > 0 ? S4.side : S4.sideL || S4.side, a, b) || hc >= 6 && inR(S4.top, a, b);
    const inDoor = D && sd === D.side && hc <= 4 && a >= D.x0 - 1e-4 && b <= D.x1 + 1e-4;
    if (isG && S4.smashed && S4.smashed((a + b) / 2, sd, hc)) continue;
    if (inDoor) {
      if (!isG) door.push(...tri);
      continue;
    }
    (isG ? glass : body).push(...tri);
  }
  const sub2 = (ix) => {
    const s = g2.clone();
    s.setIndex(ix);
    return s;
  };
  P3.add(S4.mat || "carpaint", sub2(body), null, {});
  if (glass.length) P3.add(S4.glassMat || "glassT", sub2(glass), null, {});
  if (D && door.length) {
    const wB = sample(D.x1)[4], hz = D.side * (wB - 0.01), M = new Matrix4().makeTranslation(D.x1, 0, hz).multiply(new Matrix4().makeRotationY(D.ang * D.side)).multiply(new Matrix4().makeTranslation(-D.x1, 0, -hz));
    const leaf = sub2(door);
    leaf.applyMatrix4(M);
    P3.add(S4.mat || "carpaint", leaf, null, {});
    const [, yS, yB] = sample((D.x0 + D.x1) / 2), cx = (D.x0 + D.x1) / 2, L = D.x1 - D.x0, zi = (d) => D.side * (wB - d), vin = S4.trimCol || [0.17, 0.15, 0.14], hard = [0.07, 0.07, 0.075];
    const put = (mat, g3, col, p, r) => {
      xf(g3, { p, r: r || null });
      g3.applyMatrix4(M);
      P3.add(mat, g3, col, { jit: 0.06 });
    };
    put("canvas", softBox(L - 0.04, yB - yS - 0.06, 0.04, 0.018, 3), vin, [cx, (yS + yB) / 2 + 0.02, zi(0.045)]);
    put("plastic", softBox(L - 0.06, 0.075, 0.07, 0.03, 3), hard, [cx, yB - 0.045, zi(0.075)]);
    put("canvas", softBox(L - 0.22, 0.19, 0.014, 6e-3, 2), [vin[0] * 1.9, vin[1] * 1.8, vin[2] * 1.7], [cx - 0.02, yS + 0.5, zi(0.07)]);
    put("plastic", softBox(0.44, 0.055, 0.095, 0.024, 3), hard, [cx - 0.06, yS + 0.36, zi(0.105)]);
    put("plastic", softBox(0.13, 0.06, 0.05, 0.02, 2), hard, [cx - 0.12, yS + 0.315, zi(0.09)]);
    put("plastic", softBox(L - 0.34, 0.12, 0.045, 0.014, 2), [0.1, 0.095, 0.09], [cx - 0.06, yS + 0.15, zi(0.085)]);
    {
      const sp2 = cyl(0.072, 0.012, 16, { cham: 3e-3 });
      sp2.rotateX(H);
      put("black", sp2, null, [D.x1 - 0.17, yS + 0.2, zi(0.07)]);
      const rg = ring(0.074, 6e-3, { seg: 16 });
      put("plastic", rg, hard, [D.x1 - 0.17, yS + 0.2, zi(0.077)], [H, 0, 0]);
      for (let i = -2; i <= 2; i++) put("plastic", bevelBox(0.11 - Math.abs(i) * 0.016, 6e-3, 6e-3, 2e-3, 1), hard, [D.x1 - 0.17, yS + 0.2 + i * 0.022, zi(0.078)]);
    }
    {
      const wx = cx + 0.14, wyy = yS + 0.41;
      const hub = cyl(0.022, 0.03, 10, { cham: 4e-3 });
      hub.rotateX(H);
      put("plastic", hub, hard, [wx, wyy, zi(0.085)]);
      put("chrome", bevelBox(0.085, 0.014, 8e-3, 3e-3, 1), null, [wx + 0.034, wyy - 0.022, zi(0.103)], [0, 0, -0.6]);
      const kn = cyl(0.012, 0.03, 8, { cham: 3e-3 });
      kn.rotateX(H);
      put("plastic", kn, hard, [wx + 0.068, wyy - 0.046, zi(0.118)]);
    }
    put("black", bevelBox(0.15, 0.055, 0.012, 4e-3, 1), null, [D.x1 - 0.22, yS + 0.53, zi(0.068)]);
    put("chrome", bevelBox(0.1, 0.02, 0.016, 6e-3, 1), null, [D.x1 - 0.22, yS + 0.53, zi(0.08)]);
    put("steel", bevelBox(0.02, 0.075, 0.035, 4e-3, 1), null, [D.x0 + 0.014, yS + 0.42, zi(0.03)]);
    doorM = M;
    const frm = tube([[D.x0 + 0.03, yB, hz], [D.x0 + 0.05, yB + (sample(D.x0)[3] - yB) * gTop - 0.02, D.side * (lerp2(wB, sample(D.x0)[5], gTop / rail) - 0.012)], [D.x1 - 0.25, yB + (sample(D.x1 - 0.25)[3] - yB) * gTop - 0.02, D.side * (lerp2(wB, sample(D.x1)[5], gTop / rail) - 0.012)], [D.x1 - 0.02, yB, hz]], 0.014, 6, { samples: 0 });
    frm.applyMatrix4(M);
    P3.add("black", frm, null, {});
  }
  for (const end of [0, 1]) {
    const x = end ? x1 : x0, sgn2 = end ? 1 : -1, pos = [], id = [];
    let cy = 0;
    const pts = [];
    for (let j = 0; j < 19; j++) {
      const h = j <= 9 ? j : 18 - j, sg = j <= 9 ? 1 : -1;
      ringPt2(x, h, tmp2);
      pts.push([tmp2[1], sg * tmp2[0]]);
      cy += tmp2[1] / 19;
    }
    for (const [y, z] of pts) pos.push(x, y, z);
    for (const [y, z] of pts) pos.push(x + sgn2 * (S4.capOut ?? 0.05), cy + (y - cy) * 0.72, z * 0.74);
    pos.push(x + sgn2 * (S4.capOut ?? 0.05) * 1.3, cy, 0);
    for (let j = 0; j < 18; j++) {
      const a = j, b = j + 1, c = 19 + j, d = 20 + j;
      end ? id.push(a, c, b, b, c, d) : id.push(a, b, c, b, d, c);
      end ? id.push(c, 38, d) : id.push(c, d, 38);
    }
    id.push(...end ? [18, 37, 0, 0, 37, 19, 37, 38, 19] : [18, 0, 37, 0, 19, 37, 37, 19, 38]);
    const cg = fromArrays(pos, null, null, id);
    P3.add(S4.mat || "carpaint", cg, cc, { jit: 0 });
  }
  return { xs, sample, ringPt: ringPt2, doorM };
}
function shellTrim(P3, S4, B2) {
  const { sample } = B2, wy = S4.wy ?? 0.33, keys = S4.keys, x0 = keys[0][0], x1 = keys[keys.length - 1][0];
  for (const s of [-1, 1]) {
    if (S4.beltTrim !== false) {
      const D = S4.door && S4.door.side === s && B2.doorM ? S4.door : null, run = (a, b, M) => {
        const pts = [];
        for (let x = a; x < b - 1e-4; x += 0.2) {
          const k2 = sample(x);
          pts.push([x, k2[2] + 4e-3, s * (k2[4] - 8e-3)]);
        }
        const k = sample(b);
        pts.push([b, k[2] + 4e-3, s * (k[4] - 8e-3)]);
        if (pts.length < 2) return;
        const g2 = tube(pts, 7e-3, 5, { samples: 0 });
        if (M) g2.applyMatrix4(M);
        P3.add(S4.beltMat || "chrome", g2, null, {});
      };
      if (D) {
        run(x0 + 0.25, D.x0 - 0.01, null);
        run(D.x0 + 0.01, D.x1 - 0.01, B2.doorM);
        run(D.x1 + 0.01, x1 - 0.25, null);
      } else run(x0 + 0.25, x1 - 0.25, null);
    }
    for (const [ax, R4] of S4.arches || []) {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const a = PI5 * i / 14, x = ax - Math.cos(a) * R4, k = sample(x);
        pts.push([x, Math.min(wy + Math.sin(a) * R4, k[2] - 0.03) + 4e-3, s * (k[4] + 2e-3)]);
      }
      P3.tube(S4.archMat || "trim", pts, 0.016, { seg: 5, samples: 0 });
      P3.box("black", R4 * 2.1, R4 * 1.6, 0.02, ax, wy + R4 * 0.3, s * (sample(ax)[4] - (S4.well ?? 0.3)), { b: 0 });
    }
    for (const x of S4.seams || []) {
      const k = sample(x);
      P3.box("black", 7e-3, k[2] - k[1] - 0.12, 4e-3, x, (k[1] + k[2]) / 2 + 0.03, s * (k[4] + 35e-4), { b: 0 });
    }
    const ks = sample((x0 + x1) / 2);
    P3.box(S4.sillMat || "trim", S4.sill ? S4.sill[1] - S4.sill[0] : (x1 - x0) * 0.42, 0.07, 0.05, S4.sill ? (S4.sill[0] + S4.sill[1]) / 2 : (x0 + x1) / 2, ks[1] + 0.01, s * (ks[4] - 0.03), { b: 0.015 });
  }
  for (const x of S4.shuts || []) {
    const k = sample(x);
    P3.box("black", 7e-3, 4e-3, k[5] * 1.9, x, k[3] + 1e-3, 0, { b: 0 });
  }
  P3.box("black", x1 - x0 - 0.5, 0.2, sample((x0 + x1) / 2)[4] * 2 - 0.16, (x0 + x1) / 2, S4.floor ?? 0.3, 0, { b: 0.02 });
}
var seat = (P3, x, z, o = {}) => {
  const c = o.col || [0.18, 0.18, 0.2], w = o.w || 0.5, y = o.y || 0.42;
  P3.add("canvas", softBox(0.5, 0.13, w, 0.05, 3), c, { p: [x, y, z] });
  P3.add("canvas", softBox(0.13, o.h || 0.62, w, 0.05, 3), c, { p: [x - 0.24, y + 0.33, z], r: [0, 0, -(o.rake ?? 0.2)] });
  if (o.head !== false) P3.add("canvas", softBox(0.1, 0.17, 0.26, 0.04, 2), c, { p: [x - 0.33, y + 0.76, z], r: [0, 0, -0.15] });
};
var lightBar = (P3, x, y, w, o = {}) => {
  P3.add("trim", softBox(0.3, 0.035, w, 0.012, 2), null, { p: [x, y + 0.02, 0] });
  for (let i = 0; i < 6; i++) {
    const z = -w / 2 + (i + 0.5) * w / 6, m = i === 2 || i === 3 ? "emWhite" : i < 2 ? o.a || "emRedB" : o.b || "emBlueB";
    P3.add(m, softBox(0.26, 0.09, w / 6 - 0.012, 0.02, 2), null, { p: [x, y + 0.08, z] });
  }
  for (const s of [-1, 1]) {
    P3.box("steel", 0.04, 0.05, 0.03, x, y, s * (w / 2 - 0.08), { col: C.dark });
  }
  P3.glow("blink", [x, y + 0.2, -w * 0.3], { col: o.ca || [1, 0.08, 0.05], power: o.power || 6, dist: 9, rate: 1.7, mat: o.a || "emRedB" });
  P3.glow("blink", [x, y + 0.2, w * 0.3], { col: o.cb || [0.1, 0.25, 1], power: (o.power || 6) * 1.4, dist: 9, rate: 1.7, phase: 0.5, mat: o.b || "emBlueB" });
};
var lamp = (P3, mat, x, y, z, w, h, d, dir, col = null) => {
  P3.push({ p: [x, y, z], r: [0, dir > 0 ? H : -H, 0] });
  P3.add(mat, softBox(w, h, d, Math.min(h, d) * 0.4, 3), col, {});
  frameXY(P3, "chrome", -w / 2 - 8e-3, -h / 2 - 8e-3, w / 2 + 8e-3, h / 2 + 8e-3, d * 0.15, 0.012, 0.02, null, 4e-3);
  P3.pop();
};
var plate = (P3, A, name, x, y, dir) => {
  P3.box("trim", 0.014, 0.15, 0.54, x, y, 0, { b: 4e-3 });
  if (A) P3.quad("sign", 0.5, 0.5 / A.aspect(name), A.rect(name), { p: [x + dir * 9e-3, y, 0], r: [0, dir > 0 ? H : -H, 0] });
};
var bumper = (P3, x, y, hw, dir, o = {}) => {
  const d = o.d || 0.1, h = o.h || 0.16, pts = [[x - dir * 0.34, y, -hw - 0.012], [x - dir * 0.08, y, -hw + 0.02], [x + dir * d * 0.75, y, -hw * 0.72], [x + dir * d, y, 0], [x + dir * d * 0.75, y, hw * 0.72], [x - dir * 0.08, y, hw - 0.02], [x - dir * 0.34, y, hw + 0.012]];
  P3.add(o.mat || "trim", sweep(roundRect(-0.05, -h / 2, 0.05, h / 2, 0.03, 3), pts, { samples: 26, crease: 50, tension: 0.4 }), o.col || null, {});
};
var sedan = (seed = 1, o = {}) => proto("sedan" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("sedan", seed), A = o.atlas, kind = o.kind || "civ", R4 = P3.R;
  const col = o.col || P3.pick([[0.42, 0.06, 0.05], [0.12, 0.2, 0.34], [0.55, 0.56, 0.57], [0.1, 0.11, 0.12], [0.62, 0.6, 0.5], [0.16, 0.3, 0.22]]), cc = kind === "patrol" ? [0.9, 0.9, 0.88] : kind === "taxi" ? [0.85, 0.62, 0.05] : col;
  const S4 = {
    col: cc,
    wy: 0.33,
    keys: [[-2.3, 0.38, 0.86, 0.9, 0.72, 0.58], [-2.18, 0.3, 0.92, 0.97, 0.84, 0.7], [-1.85, 0.24, 0.96, 1.01, 0.89, 0.74], [-1.45, 0.22, 0.96, 1.02, 0.9, 0.74], [-0.7, 0.22, 0.95, 1.43, 0.9, 0.62], [0.2, 0.22, 0.94, 1.42, 0.9, 0.62], [0.95, 0.22, 0.93, 0.99, 0.9, 0.74], [1.85, 0.24, 0.84, 0.89, 0.88, 0.72], [2.18, 0.3, 0.76, 0.8, 0.82, 0.66], [2.3, 0.38, 0.68, 0.72, 0.7, 0.54]],
    arches: [[1.45, 0.4], [-1.35, 0.4]],
    side: [[-1.05, -0.76], [-0.68, -0.1], [-0.02, 0.56]],
    top: [[0.22, 0.93], [-1.42, -0.72]],
    seams: [-0.73, -0.06, 0.93],
    shuts: [0.97, -1.47],
    sill: [-0.9, 1],
    smashed: (x, sd, hc) => o.smash && (hc === 4 && sd === (o.smashSide || 1) && x > -0.1 || o.smash > 1 && hc >= 6 && x < 0),
    door: o.door ? { x0: -0.02, x1: 0.93, side: o.doorSide || 1, ang: o.door } : null
  };
  if (o.flat) P3.push({ r: [0.025 * o.flat, 0, -0.012], p: [0, -0.012, 0] });
  const B2 = shell2(P3, S4);
  shellTrim(P3, S4, B2);
  const onLeaf = (x, s, fn) => {
    if (B2.doorM && S4.door && s === S4.door.side && x > S4.door.x0 && x < S4.door.x1) {
      P3.stack.push(P3.M.clone().multiply(B2.doorM));
      fn();
      P3.pop();
    } else fn();
  };
  bumper(P3, 2.27, 0.47, 0.84, 1, { col: cc, mat: "carpaint", h: 0.2 });
  bumper(P3, -2.27, 0.5, 0.84, -1, { col: cc, mat: "carpaint", h: 0.2 });
  bumper(P3, 2.25, 0.3, 0.8, 1, { h: 0.1, d: 0.08 });
  bumper(P3, -2.25, 0.33, 0.8, -1, { h: 0.1, d: 0.06 });
  P3.box("black", 0.04, 0.13, 0.84, 2.335, 0.62, 0, { b: 0.01 });
  for (let i = 0; i < 4; i++) P3.box("chrome", 0.012, 0.012, 0.82, 2.36, 0.575 + i * 0.03, 0, { b: 3e-3 });
  P3.cyl("chrome", 0.045, 0.012, 2.368, 0.62, 0, { axis: "x", seg: 12 });
  for (const s of [-1, 1]) {
    lamp(P3, o.lights ? "emWhite" : "glass", 2.3, 0.63, s * 0.56, 0.26, 0.11, 0.1, 1, [0.9, 0.9, 0.95]);
    lamp(P3, o.hazard ? "emAmberB" : "glass", 2.25, 0.62, s * 0.72, 0.08, 0.09, 0.1, 1, [0.9, 0.5, 0.1]);
    lamp(P3, "glass", -2.3, 0.82, s * 0.56, 0.3, 0.1, 0.08, -1, [0.6, 0.05, 0.04]);
    lamp(P3, o.hazard ? "emAmberB" : "glass", -2.27, 0.82, s * 0.71, 0.07, 0.1, 0.08, -1, [0.9, 0.5, 0.1]);
    if (o.lights) P3.glow("flare", [2.4, 0.63, s * 0.56], { col: [1, 0.95, 0.85], size: 0.9 });
  }
  if (o.hazard) P3.glow("blink", [0, 0.16, 0], { col: [1, 0.5, 0.05], power: 3, dist: 6, rate: 1.4, mat: "emAmberB" });
  if (o.lights) P3.glow("fill", [3.3, 0.7, 0], { col: [1, 0.93, 0.8], power: 14, dist: 12, dir: [1, -0.07, 0], cone: 0.5, back: 0.95, reach: 26, beam: 2.4 });
  plate(P3, A, "plate" + (1 + seed % 3), 2.375, 0.46, 1);
  plate(P3, A, "plate" + (1 + seed % 3), -2.345, 0.6, -1);
  for (const s of [-1, 1]) {
    onLeaf(0.74, s, () => {
      P3.add("carpaint", softBox(0.1, 0.11, 0.19, 0.03, 2), cc, { p: [0.74, 1, s * 0.99] });
      P3.box("trim", 0.06, 0.03, 0.08, 0.72, 0.96, s * 0.9, {});
      P3.box("chrome", 4e-3, 0.08, 0.15, 0.688, 1, s * 0.99, { b: 0 });
    });
    for (const x of [0.02, -0.66]) onLeaf(x + 0.09, s, () => {
      P3.box("black", 0.15, 0.04, 4e-3, x + 0.09, 0.86, s * 0.9, { b: 0 });
      P3.box("chrome", 0.13, 0.025, 0.018, x + 0.09, 0.86, s * 0.9, { b: 6e-3 });
    });
  }
  for (const s of [-1, 1]) P3.bar("black", [0.96, 0.995, s * 0.5 - 0.22], [0.9, 1.03, s * 0.5 + 0.2], 7e-3);
  P3.bar("black", [-1.2, 1.2, 0.5], [-1.5, 1.75, 0.52], 3e-3);
  P3.box("black", 0.143, 0.143, 3e-3, -1.55, 0.8, 0.9015, { b: 0 });
  P3.box("carpaint", 0.136, 0.136, 4e-3, -1.55, 0.8, 0.9025, { col: [cc[0] * 0.92, cc[1] * 0.92, cc[2] * 0.92], b: 15e-4 });
  P3.add("trim", softBox(0.34, 0.24, 1.6, 0.06, 4), null, { p: [0.72, 0.82, 0] });
  P3.add("trim", ring(0.17, 0.016, { seg: 14 }), null, { p: [0.45, 0.93, 0.4], r: [0, H, 0.35] });
  P3.bar("trim", [0.45, 0.93, 0.4], [0.62, 0.86, 0.4], 0.02);
  for (const z of [-0.4, 0.4]) seat(P3, 0.05, z);
  seat(P3, -0.85, 0, { w: 1.4, head: false });
  P3.box("trim", 0.5, 0.12, 0.16, 0.2, 0.42, 0, { b: 0.02 });
  for (const [x, s] of [[1.45, 1], [1.45, -1], [-1.35, 1], [-1.35, -1]]) wheel(P3, 0.33, 0.21, x, 0.33, s * 0.79, { side: s, rimMat: kind === "patrol" ? "steel" : "chrome", rimCol: kind === "patrol" ? [0.12, 0.12, 0.13] : null, flat: false });
  if (kind === "patrol") {
    lightBar(P3, -0.2, 1.43, 1.1);
    for (const s of [-1, 1]) onLeaf(0.45, s, () => {
      P3.box("carpaint", 0.94, 0.5, 4e-3, 0.45, 0.62, s * 0.905, { col: [0.08, 0.1, 0.16], b: 0 });
      if (A) P3.quad("decal", 0.72, 0.72 / A.aspect("police"), A.rect("police"), { p: [0.45, 0.66, s * 0.909], r: [0, s > 0 ? 0 : PI5, 0] });
    });
    for (const s of [-1, 1]) {
      P3.tube("steel", [[2.3, 0.3, s * 0.3], [2.44, 0.4, s * 0.3], [2.46, 0.8, s * 0.3], [2.4, 0.86, s * 0.3]], 0.022, { col: C.dark, seg: 6 });
    }
    for (const y of [0.5, 0.78]) P3.bar("steel", [2.45, y, -0.42], [2.45, y, 0.42], 0.02, { col: C.dark });
    P3.cyl("chrome", 0.06, 0.1, 0.9, 1.08, 0.86, { axis: "x", seg: 10 });
  }
  if (kind === "taxi") {
    P3.add("signLit", softBox(0.16, 0.13, 0.5, 0.03, 2), null, { p: [-0.1, 1.5, 0] });
    P3.add("emAmber", softBox(0.17, 0.11, 0.48, 0.03, 2), null, { p: [-0.1, 1.5, 0] });
    for (const s of [-1, 1]) for (let i = 0; i < 16; i++) {
      const x = -0.57 + i * 0.09;
      if (Math.abs(x + 0.06) < 0.05 || Math.abs(x - 0.02) < 0.03) continue;
      onLeaf(x, s, () => P3.box("carpaint", 0.09, 0.09, 3e-3, x, 0.7 + i % 2 * 0.09, s * 0.905, { col: [0.06, 0.06, 0.06], b: 0 }));
    }
  }
  if (A && o.graf) P3.quad("decal", 0.6, 0.6 / A.aspect(o.graf), A.rect(o.graf), { p: [-0.38, 0.62, -0.909], r: [0, PI5, 0] });
  if (o.flat) P3.pop();
  P3.col([-2.3, 0, -0.9], [-0.75, 1.02, 0.9], { surface: "car" });
  P3.col([-0.75, 0, -0.9], [0.9, 1.43, 0.9], { surface: "car" });
  P3.col([0.9, 0, -0.9], [2.35, 0.95, 0.9], { surface: "car" });
  return P3.finish({ grime: 1, ground: 0.45 });
});
var ambulance = (seed = 1, o = {}) => proto("ambo" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("ambo", seed), A = o.atlas, wc = [0.74, 0.74, 0.72], rd = [0.62, 0.07, 0.05], yl = [0.8, 0.72, 0.1];
  const S4 = {
    col: wc,
    wy: 0.39,
    capOut: 0.02,
    gTop: 0.78,
    rail: 0.93,
    keys: [[0.85, 0.36, 1.28, 2.12, 1, 0.9], [1.45, 0.36, 1.27, 2.1, 1, 0.88], [2.08, 0.36, 1.22, 1.3, 1, 0.9], [2.56, 0.38, 1.08, 1.13, 0.97, 0.85], [2.76, 0.46, 0.9, 0.95, 0.85, 0.68]],
    arches: [[1.98, 0.46]],
    side: [[0.98, 1.42], [1.46, 1.74]],
    top: [[1.48, 2.05]],
    seams: [0.92, 1.44],
    shuts: [2.1],
    sill: [0.9, 1.5],
    well: 0.34,
    floor: 0.42,
    smashed: (x, sd, hc) => o.smash && hc === 4 && sd > 0
  };
  const B2 = shell2(P3, S4);
  shellTrim(P3, S4, B2);
  bumper(P3, 2.72, 0.52, 0.96, 1, { h: 0.24, d: 0.1 });
  P3.box("black", 0.04, 0.2, 1.1, 2.79, 0.8, 0, { b: 0.01 });
  for (let i = 0; i < 5; i++) P3.box("trim", 0.012, 0.014, 1.06, 2.815, 0.72 + i * 0.04, 0, { b: 3e-3 });
  for (const s of [-1, 1]) {
    lamp(P3, o.lights ? "emWhite" : "glass", 2.74, 0.84, s * 0.7, 0.2, 0.2, 0.1, 1, [0.9, 0.9, 0.95]);
    lamp(P3, "emAmberB", 2.7, 0.62, s * 0.78, 0.08, 0.06, 0.08, 1);
    P3.add("carpaint", softBox(0.12, 0.26, 0.16, 0.03, 2), [0.1, 0.1, 0.1], { p: [1.72, 1.5, s * 1.16] });
    P3.bar("black", [1.72, 1.4, s * 1.1], [1.76, 1.32, s * 0.98], 0.012);
    P3.box("chrome", 0.15, 0.03, 0.02, 1, 1.12, s * 0.995, { b: 6e-3 });
    wheel(P3, 0.39, 0.25, 1.98, 0.39, s * 0.86, { side: s, rimCol: [0.8, 0.8, 0.8] });
    for (const dz of [0, -0.27]) wheel(P3, 0.39, 0.25, -1.55, 0.39, s * (0.9 + dz), { side: s, rimCol: [0.8, 0.8, 0.8], blocks: dz ? 0 : 26 });
  }
  for (const s of [-1, 1]) P3.bar("black", [2.1, 1.26, s * 0.55 - 0.3], [2.02, 1.32, s * 0.55 + 0.25], 8e-3);
  plate(P3, A, "plate2", 2.83, 0.5, 1);
  seat(P3, 1.15, 0.5, { y: 0.9 });
  seat(P3, 1.15, -0.5, { y: 0.9 });
  P3.add("trim", softBox(0.3, 0.3, 1.8, 0.06, 3), null, { p: [1.85, 1.12, 0] });
  P3.add("trim", ring(0.19, 0.018, { seg: 14 }), null, { p: [1.56, 1.25, 0.5], r: [0, H, 0.5] });
  const mx0 = -2.95, mx1 = 0.92, mw = 1.12, my0 = 0.62, my1 = 2.62, ml = mx1 - mx0, mc = (mx0 + mx1) / 2;
  P3.add("carpaint", softBox(ml, my1 - my0, mw * 2, 0.07, 6), wc, { p: [mc, (my0 + my1) / 2, 0] });
  for (const s of [-1, 1]) {
    P3.box("carpaint", 1.75, 0.3, 0.04, 0.02, 0.5, s * (mw - 0.03), { col: wc, b: 0.012 });
    P3.box("carpaint", 0.78, 0.3, 0.04, -2.54, 0.5, s * (mw - 0.03), { col: wc, b: 0.012 });
    P3.add("trim", ring(0.47, 0.02, { seg: 12, a0: 0, a1: PI5 }), null, { p: [-1.55, 0.4, s * (mw - 0.012)] });
    P3.box("black", 1, 0.5, 0.02, -1.55, 0.6, s * (mw - 0.36), { b: 0 });
    P3.box("carpaint", ml - 0.1, 0.2, 4e-3, mc, 1.38, s * (mw + 1e-3), { col: rd, b: 0 });
    for (let i = 0; i < 12; i++) P3.box("plastic", 0.28, 0.14, 3e-3, mx0 + 0.25 + i * 0.3, 1.02 + i % 2 * 0.14, s * (mw + 1e-3), { col: i % 2 ? yl : [0.1, 0.35, 0.2], b: 0 });
    if (A) P3.quad("decal", 1.5, 1.5 / A.aspect("ems"), A.rect("ems"), { p: [-0.7, 2, s * (mw + 4e-3)], r: [0, s > 0 ? 0 : PI5, 0] });
    if (s > 0) {
      P3.push({ p: [0.25, 0, s * mw] });
      frameXY(P3, "black", -0.42, 0.7, 0.42, 2.5, 1e-3, 8e-3, 4e-3, null, 0);
      P3.box("glass", 0.5, 0.45, 0.01, 0, 2, 2e-3, { b: 4e-3 });
      frameXY(P3, "rubber", -0.27, 1.76, 0.27, 2.24, 6e-3, 0.022, 0.012, [0.4, 0.4, 0.4]);
      P3.box("chrome", 0.04, 0.16, 0.02, -0.34, 1.3, 0.012, { b: 6e-3 });
      for (const y of [0.9, 1.6, 2.3]) P3.box("steel", 0.03, 0.08, 0.014, 0.435, y, 8e-3, { col: C.steel });
      P3.box("galv", 0.8, 0.03, 0.2, 0, 0.5, 0.08, { b: 6e-3 });
      P3.pop();
    } else for (const [x, w, y0, y1] of [[0.3, 0.7, 0.7, 1.6], [-0.5, 0.7, 0.7, 1.6], [-2.5, 0.6, 0.95, 2.3]]) {
      P3.push({ p: [x, 0, s * mw], r: [0, PI5, 0] });
      frameXY(P3, "black", -w / 2, y0, w / 2, y1, 1e-3, 8e-3, 4e-3, null, 0);
      P3.box("chrome", 0.1, 0.03, 0.016, 0, y0 + 0.12, 0.01, { b: 5e-3 });
      for (const hx of [-w / 2 + 0.12, w / 2 - 0.12]) P3.box("steel", 0.07, 0.025, 0.012, hx, y1 + 4e-3, 7e-3, { col: C.steel });
      P3.pop();
    }
    for (let i = 0; i < 3; i++) lamp(P3, i === 1 ? "emWhite" : "emRedB", -2.3 + i * 1.3, 2.5, s * (mw + 4e-3), 0.22, 0.07, 0.03, 1, null);
    P3.box("galv", ml - 0.3, 0.03, 0.03, mc, my1 + 0.03, s * (mw - 0.12), { b: 8e-3 });
    for (let i = 0; i < 6; i++) P3.bar("galv", [mx0 + 0.3 + i * 0.66, my1 - 0.02, s * (mw - 0.12)], [mx0 + 0.3 + i * 0.66, my1 + 0.03, s * (mw - 0.12)], 0.01);
  }
  lightBar(P3, 0.62, my1 - 0.02, 1.7, { power: 9 });
  P3.add("carpaint", softBox(0.9, 0.16, 1.2, 0.05, 3), wc, { p: [-1.2, my1 + 0.07, 0] });
  louvres(P3, "carpaint", -0.5, 0.01, 0.5, 0.13, 0.605, 4, wc, 0.5, 0.02);
  P3.cyl("trim", 0.14, 0.05, -2.4, my1 + 0.02, 0, { seg: 14 });
  P3.bar("black", [0.3, my1, -0.7], [0.1, my1 + 0.9, -0.72], 4e-3);
  P3.push({ p: [mx0, 0, 0], r: [0, -H, 0] });
  for (const s of [-1, 1]) {
    frameXY(P3, "black", s > 0 ? 0.01 : -0.98, 0.68, s > 0 ? 0.98 : -0.01, 2.5, 1e-3, 8e-3, 4e-3, null, 0);
    P3.box("glass", 0.56, 0.5, 0.01, s * 0.5, 2, 2e-3, { b: 4e-3 });
    frameXY(P3, "rubber", s * 0.5 - 0.3, 1.73, s * 0.5 + 0.3, 2.27, 6e-3, 0.022, 0.012, [0.4, 0.4, 0.4]);
    for (const y of [0.9, 1.6, 2.3]) P3.box("steel", 0.03, 0.09, 0.016, s * 0.985, y, 8e-3, { col: C.steel });
    P3.bar("chrome", [s * 0.08, 1.05, 0.04], [s * 0.08, 1.5, 0.04], 0.012);
    for (const y of [1.05, 1.5]) P3.bar("chrome", [s * 0.08, y, 0.04], [s * 0.08, y, 0], 0.01);
    P3.box("glass", 0.1, 0.34, 0.03, s * 1.06, 1.25, 4e-3, { col: [0.6, 0.05, 0.04], b: 0.01 });
    P3.box("emRedB", 0.14, 0.06, 0.03, s * 0.9, 2.56, 4e-3, { b: 0.01 });
  }
  if (A) {
    P3.quad("decal", 1.9, 0.5, A.rect("chevron"), { p: [0, 0.94, 4e-3] });
  }
  P3.box("galv", 2.1, 0.05, 0.34, 0, 0.5, 0.17, { b: 0.01 });
  for (let i = 0; i < 8; i++) P3.box("galv", 0.012, 0.012, 0.3, -0.9 + i * 0.26, 0.53, 0.17, { b: 3e-3 });
  for (const s of [-1, 1]) P3.beam("steel", [s * 0.7, 0.48, 0], [s * 0.7, 0.48, 0.3], 0.05, 0.06, { col: C.dark });
  P3.pop();
  if (A) P3.quad("sign", 0.5, 0.5 / A.aspect("plate2"), A.rect("plate2"), { p: [mx0 - 0.012, 0.75, 0], r: [0, -H, 0] });
  P3.col([mx0, 0, -mw], [mx1, my1, mw], { surface: "car" });
  P3.col([mx1, 0, -1], [2.1, 2.1, 1], { surface: "car" });
  P3.col([2.1, 0, -1], [2.8, 1.2, 1], { surface: "car" });
  return P3.finish({ grime: 1, ground: 0.5 });
});
var bus = (seed = 1, o = {}) => proto("bus" + seed + JSON.stringify({ ...o, atlas: 0 }), () => {
  const P3 = new Prop("bus", seed), A = o.atlas, L = 11.4, hl = L / 2, bc = o.col || [0.75, 0.74, 0.7], ac = o.accent || [0.1, 0.32, 0.38];
  const win = [];
  for (let x = -5.25; x < 3.9; x += 1.42) win.push([x + 0.05, x + 1.37]);
  const winR = win.filter(([a, b]) => !(b > -0.75 && a < 0.6));
  winR.pop();
  const S4 = {
    col: bc,
    wy: 0.5,
    gTop: 0.57,
    rail: 0.9,
    capOut: 0.06,
    step: 0.2,
    keys: [[-hl, 0.48, 1.22, 2.98, 1.16, 1.08], [-hl + 0.22, 0.4, 1.22, 3.05, 1.25, 1.19], [hl - 0.25, 0.4, 1.22, 3.05, 1.25, 1.19], [hl, 0.48, 1.22, 2.98, 1.17, 1.08]],
    arches: [[3.35, 0.6], [-3.1, 0.6]],
    side: winR,
    sideL: win.concat([[4.1, 5.2]]),
    seams: [-4.6, -2.2, -1, 0.9, 2.4, 4],
    sill: [-2.3, 2.5],
    well: 0.4,
    floor: 0.5,
    beltMat: "black",
    smashed: (x, sd) => hash3(Math.round(x * 3), sd, seed) < (o.smash ?? 0.3)
  };
  const B2 = shell2(P3, S4);
  shellTrim(P3, S4, B2);
  for (const s of [-1, 1]) {
    P3.box("carpaint", L - 0.6, 0.26, 4e-3, 0, 1.02, s * 1.2525, { col: ac, b: 0 });
    P3.box("carpaint", L - 0.6, 0.05, 4e-3, 0, 0.84, s * 1.2525, { col: [0.85, 0.6, 0.1], b: 0 });
    if (A) {
      P3.quad("decal", 1.6, 1.6 / A.aspect("transit"), A.rect("transit"), { p: [s * -3.9, 2.52, s * 1.24], r: [0, s > 0 ? 0 : PI5, 0] });
      P3.quad("decal", 1.3, 1.3 / A.aspect("grafNoCure"), A.rect("grafNoCure"), { p: [s * 1.6, 0.86, s * 1.256], r: [0, s > 0 ? 0 : PI5, 0.03] });
    }
  }
  for (const [x, w] of [[4.65, 1], [-0.08, 1.24]]) {
    P3.push({ p: [x, 0, 1.252] });
    P3.box("black", w + 0.08, 2.05, 0.02, 0, 1.47, -0.012, { b: 0 });
    for (const s of [-1, 1]) {
      P3.box("carpaint", w / 2 - 0.02, 1.96, 0.03, s * w / 4, 1.45, 0, { col: [bc[0] * 0.8, bc[1] * 0.8, bc[2] * 0.8], b: 8e-3 });
      P3.box("glass", w / 2 - 0.12, 1.1, 8e-3, s * w / 4, 1.75, 0.014, { b: 3e-3 });
      P3.box("glass", w / 2 - 0.12, 0.5, 8e-3, s * w / 4, 0.85, 0.014, { b: 3e-3 });
      P3.bar("chrome", [s * (w / 4 - 0.1), 1, 0.035], [s * (w / 4 - 0.1), 1.5, 0.035], 0.012);
    }
    P3.box("rubber", 0.03, 1.96, 0.036, 0, 1.45, 2e-3, { col: [0.3, 0.3, 0.3], b: 0.01 });
    P3.box("galv", w + 0.06, 0.03, 0.12, 0, 0.42, 0.03, { b: 6e-3 });
    P3.pop();
  }
  P3.push({ p: [hl, 0, 0], r: [0, H, 0] });
  P3.add("glass", softBox(2.16, 1.3, 0.05, 0.02, 4), null, { p: [0, 1.95, 0.05] });
  frameXY(P3, "rubber", -1.1, 1.28, 1.1, 2.62, 0.075, 0.035, 0.02, [0.3, 0.3, 0.3]);
  P3.box("rubber", 0.03, 1.3, 0.02, 0, 1.95, 0.078, { col: [0.3, 0.3, 0.3] });
  P3.box("black", 1.9, 0.3, 0.03, 0, 2.8, 0.06, { b: 8e-3 });
  if (A) P3.quad("signLit", 1.7, 1.7 / A.aspect("transit"), A.rect("transit"), { p: [0, 2.8, 0.078] });
  for (const s of [-1, 1]) {
    lamp(P3, "glass", s * 0.86, 0.86, 0.07, 0.24, 0.13, 0.05, 1, [0.9, 0.9, 0.95]);
    P3.box("glass", 0.12, 0.08, 0.03, s * 1.05, 0.86, 0.06, { col: [0.9, 0.5, 0.1], b: 0.01 });
    P3.bar("black", [s * 0.3, 1.27, 0.09], [s * 0.3 + 0.55, 1.75, 0.09], 9e-3);
    P3.tube("steel", [[s * 1.1, 2.55, 0.02], [s * 1.34, 2.6, 0.2], [s * 1.38, 2.3, 0.26]], 0.014, { col: C.dark, seg: 6 });
    P3.add("trim", softBox(0.06, 0.4, 0.2, 0.03, 2), null, { p: [s * 1.38, 2.08, 0.26] });
  }
  P3.box("trim", 2.3, 0.26, 0.1, 0, 0.56, 0.07, { b: 0.03 });
  P3.box("black", 1.2, 0.2, 0.02, 0, 1.02, 0.07, { b: 0 });
  louvres(P3, "trim", -0.58, 0.94, 0.58, 1.1, 0.08, 5, null, 0.5, 0.02);
  P3.pop();
  plate(P3, A, "plate3", hl + 0.125, 0.56, 1);
  P3.push({ p: [-hl, 0, 0], r: [0, -H, 0] });
  P3.add("glass", softBox(1.9, 0.6, 0.04, 0.02, 3), null, { p: [0, 2.2, 0.06] });
  frameXY(P3, "rubber", -0.97, 1.88, 0.97, 2.52, 0.075, 0.03, 0.02, [0.3, 0.3, 0.3]);
  frameXY(P3, "black", -0.9, 0.7, 0.9, 1.6, 0.066, 0.01, 6e-3, null, 0);
  louvres(P3, "carpaint", -0.8, 0.8, 0.8, 1.5, 0.075, 12, bc, 0.6, 0.03);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) P3.cyl("glass", 0.06, 0.03, s * 1.02, 1 + i * 0.16, 0.07, { axis: "z", seg: 12, col: [[0.6, 0.05, 0.04], [0.9, 0.5, 0.1], [0.9, 0.9, 0.9]][i] });
  }
  P3.box("trim", 2.3, 0.24, 0.1, 0, 0.56, 0.07, { b: 0.03 });
  P3.cyl("steel", 0.04, 0.2, -0.8, 0.36, 0.05, { axis: "z", seg: 10, col: [0.4, 0.35, 0.3], capTop: false });
  P3.pop();
  P3.add("carpaint", softBox(2.2, 0.24, 1.7, 0.08, 4), bc, { p: [-2.8, 3.14, 0] });
  louvres(P3, "carpaint", -3.7, 3.08, -1.9, 3.2, 0.86, 3, bc, 0.5, 0.02);
  P3.add("carpaint", softBox(1.4, 0.2, 1.5, 0.07, 3), bc, { p: [2.2, 3.12, 0] });
  for (const x of [-0.3, 4.2]) P3.box("carpaint", 0.7, 0.05, 0.7, x, 3.07, 0, { col: [bc[0] * 0.9, bc[1] * 0.9, bc[2] * 0.9], b: 0.015 });
  P3.box("rubber", L - 0.6, 0.04, 2.3, 0, 0.62, 0, { col: [0.4, 0.4, 0.42], b: 0 });
  for (let i = 0; i < 9; i++) {
    const x = -4.9 + i * 0.95;
    if (x > -1 && x < 0.9) continue;
    for (const s of [-1, 1]) {
      if (s > 0 && x > 3.9) continue;
      seat(P3, x, s * 0.78, { y: 1.05, w: 0.84, col: i % 3 ? [0.12, 0.25, 0.35] : [0.3, 0.12, 0.1], h: 0.56, head: false, rake: 0.1 });
      P3.bar("chrome", [x - 0.3, 1.1, s * 0.34], [x - 0.3, 2.5, s * 0.34], 0.016);
    }
  }
  for (const s of [-1, 1]) {
    P3.bar("chrome", [-5.2, 2.5, s * 0.34], [4.6, 2.5, s * 0.34], 0.016);
    for (let i = 0; i < 6; i++) {
      const lit = (i + seed) % 3 !== 0;
      P3.box(lit ? "lampDim" : "trim", 1.2, 0.02, 0.1, -4.3 + i * 1.6, 2.86, s * 0.5, { b: 0 });
    }
  }
  P3.glow("fill", [-2.4, 2.3, 0], { col: [0.75, 0.9, 1], power: 7, dist: 7 });
  P3.glow("fill", [2.4, 2.3, 0], { col: [0.75, 0.9, 1], power: 5, dist: 7, flicker: 1 });
  P3.add("trim", softBox(0.5, 0.5, 0.9, 0.08, 3), null, { p: [4.9, 1.2, -0.6] });
  P3.add("trim", ring(0.22, 0.02, { seg: 14 }), null, { p: [4.75, 1.55, -0.6], r: [0, H, 0.9] });
  seat(P3, 4.3, -0.6, { y: 1.1, col: [0.1, 0.1, 0.1] });
  for (const [x, s] of [[3.35, 1], [3.35, -1], [-3.1, 1], [-3.1, -1]]) {
    wheel(P3, 0.5, 0.3, x, 0.5, s * 1.08, { side: s, rim: 0.56, rimCol: [0.7, 0.7, 0.7], holes: 8, blocks: 34, dish: 0.07 });
    if (x < 0) wheel(P3, 0.5, 0.3, x, 0.5, s * 0.76, { side: s, rim: 0.56, blocks: 0, flat: true });
  }
  P3.col([-hl, 0, -1.26], [hl, 3.1, 1.26], { surface: "car" });
  return P3.finish({ grime: 1, ground: 0.6 });
});

