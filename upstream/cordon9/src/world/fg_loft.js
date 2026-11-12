function stations(u0, u1, step2, extra = []) {
  const s = /* @__PURE__ */ new Set();
  for (let u = u0; u < u1 - 1e-6; u += step2) s.add(Math.round(u * 1e3) / 1e3);
  s.add(u1);
  for (const e of extra) if (e >= u0 && e <= u1) s.add(Math.round(e * 1e3) / 1e3);
  let xs = [...s].sort((a, b) => a - b);
  return xs.filter((x, i) => i === 0 || x - xs[i - 1] > 0.02 || extra.includes(x));
}
function hullSurf(us, n, ringFn, cell, { open = false, inward = false } = {}) {
  const nu = us.length, nv = open ? n : n + 1, pos = new Float32Array(nu * nv * 3), uv = new Float32Array(nu * nv * 2), o = new Vector3(), prev = new Vector3();
  for (let i = 0; i < nu; i++) {
    let arc2 = 0;
    for (let j = 0; j < nv; j++) {
      ringFn(us[i], j % n, o);
      if (j > 0) arc2 += o.distanceTo(prev);
      prev.copy(o);
      const k = i * nv + j;
      pos[k * 3] = o.x;
      pos[k * 3 + 1] = o.y;
      pos[k * 3 + 2] = o.z;
      uv[k * 2] = us[i];
      uv[k * 2 + 1] = arc2;
    }
  }
  const all = [], by = /* @__PURE__ */ new Map(), quad2 = (i, j) => {
    const A = i * nv + j, B2 = A + 1, C2 = A + nv, D = C2 + 1;
    return [A, B2, C2, B2, D, C2];
  };
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) {
    const q = quad2(i, j);
    all.push(...q);
    const key = cell ? cell(i, j, us[i], us[i + 1]) : "body";
    if (key == null) continue;
    let arr = by.get(key);
    if (!arr) by.set(key, arr = []);
    arr.push(...q);
  }
  const full = new BufferGeometry();
  full.setAttribute("position", new BufferAttribute(pos, 3));
  full.setIndex(all);
  full.computeVertexNormals();
  const N = full.attributes.normal.array;
  if (!open) for (let i = 0; i < nu; i++) {
    const a = i * nv * 3, b = (i * nv + n) * 3;
    for (let k = 0; k < 3; k++) {
      const s = N[a + k] + N[b + k];
      N[a + k] = s;
      N[b + k] = s;
    }
    const l = Math.hypot(N[a], N[a + 1], N[a + 2]) || 1;
    for (let k = 0; k < 3; k++) {
      N[a + k] /= l;
      N[b + k] /= l;
    }
  }
  let acc = 0;
  for (let i = 1; i < nu - 1; i++) {
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < n; j++) {
      const k = (i * nv + j) * 3;
      cx += pos[k];
      cy += pos[k + 1];
      cz += pos[k + 2];
    }
    cx /= n;
    cy /= n;
    cz /= n;
    for (let j = 0; j < n; j++) {
      const k = (i * nv + j) * 3;
      acc += N[k] * (pos[k] - cx) + N[k + 1] * (pos[k + 1] - cy) + N[k + 2] * (pos[k + 2] - cz);
    }
  }
  const flipIt = acc < 0 !== inward;
  if (flipIt) for (let k = 0; k < N.length; k++) N[k] = -N[k];
  const out = {};
  for (const [key, idx] of by) {
    const map = /* @__PURE__ */ new Map(), p2 = [], n2 = [], u2 = [], i2 = [];
    for (let t = 0; t < idx.length; t += 3) {
      const tri = flipIt ? [idx[t], idx[t + 2], idx[t + 1]] : [idx[t], idx[t + 1], idx[t + 2]];
      for (const v of tri) {
        let m = map.get(v);
        if (m == null) {
          m = p2.length / 3;
          map.set(v, m);
          p2.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
          n2.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
          u2.push(uv[v * 2], uv[v * 2 + 1]);
        }
        i2.push(m);
      }
    }
    out[key] = fromArrays(p2, n2, u2, i2);
  }
  return out;
}
function hullTrim(ptFn, ts, r = 0.012, seg = 5) {
  const o = new Vector3(), pts = ts.map((t) => {
    ptFn(t, o);
    return [o.x, o.y, o.z];
  });
  return tube(pts, r, seg, { samples: 0 });
}
function tyreGeo2(r, w, { axis = "z", out = 1, ribs = 5, rimR = r * 0.56, nuts = 6, seg = 28, dual = false } = {}) {
  const hw = w / 2, sh = Math.min(hw * 0.7, r * 0.2), prof = [[rimR - 0.012, -hw + 0.02], [rimR + 0.02, -hw + 5e-3], [r - sh, -hw], [r - sh * 0.35, -hw + sh * 0.18], [r - 0.012, -hw + sh * 0.8]];
  for (let k = 0; k < ribs; k++) {
    const a = -hw + sh * 0.8 + (w - sh * 1.6) * k / ribs, b = -hw + sh * 0.8 + (w - sh * 1.6) * (k + 1) / ribs, g2 = (b - a) * 0.14;
    prof.push([r, a + g2], [r, b - g2]);
    if (k < ribs - 1) prof.push([r - 0.014, b - g2 * 0.4], [r - 0.014, b + g2 * 0.4]);
  }
  prof.push([r - 0.012, hw - sh * 0.8], [r - sh * 0.35, hw - sh * 0.18], [r - sh, hw], [rimR + 0.02, hw - 5e-3], [rimR - 0.012, hw - 0.02]);
  const tyre = lathe(prof, seg, { axis: "z", crease: 50 });
  {
    const P3 = tyre.attributes.position;
    for (let i = 0; i < P3.count; i++) {
      const x = P3.getX(i), y = P3.getY(i), rr = Math.hypot(x, y);
      if (rr > r - sh * 0.5 && rr < r - 4e-3) {
        const a = Math.atan2(y, x), q = Math.floor(a / (PI5 * 2) * seg * 1 + 100.5) % 2;
        if (q) {
          const k = (rr - 8e-3) / rr;
          P3.setXY(i, x * k, y * k);
        }
      }
    }
    tyre.computeVertexNormals();
  }
  const d = out, rimP = [[1e-3, d * hw * 0.2], [rimR * 0.3, d * hw * 0.22], [rimR * 0.34, d * hw * 0.05], [rimR * 0.62, d * hw * -0.1], [rimR * 0.8, d * hw * 0.12], [rimR * 0.94, d * hw * 0.62], [rimR + 0.012, d * hw * 0.8], [rimR + 0.012, d * hw * 0.62], [rimR, d * -hw * 0.8], [rimR + 0.012, d * -hw * 0.82]];
  const parts = [lathe(d > 0 ? rimP : rimP.slice().reverse(), seg, { axis: "z", crease: 40 })];
  for (let k = 0; k < nuts; k++) {
    const a = k / nuts * PI5 * 2, g2 = cyl(Math.max(0.012, r * 0.03), 0.03, 6);
    g2.rotateX(PI5 / 2);
    g2.translate(Math.cos(a) * rimR * 0.46, Math.sin(a) * rimR * 0.46, d * (hw * -0.02 + 0.012));
    parts.push(g2);
  }
  {
    const g2 = cyl(rimR * 0.2, 0.06, 12, { cham: 0.01 });
    g2.rotateX(PI5 / 2);
    g2.translate(0, 0, d * hw * 0.26);
    parts.push(g2);
  }
  const rim2 = merge(parts);
  if (axis === "x") {
    tyre.rotateY(PI5 / 2);
    rim2.rotateY(PI5 / 2);
  }
  return { tyre, rim: rim2 };
}
function addWheel(P3, r, w, x, y, z, o = {}) {
  const { tyre, rim: rim2 } = tyreGeo2(r, w, o), flat = o.flat || 0;
  if (flat) deform(tyre, (v) => {
    if (v.y < -r * 0.55) {
      const k = clamp2((-v.y - r * 0.55) / (r * 0.45));
      v.y += k * flat * r * 0.5;
      if (o.axis === "x") v.x *= 1 + k * flat * 0.35;
      else v.z *= 1 + k * flat * 0.35;
    }
  }, true);
  P3.add("rubber", tyre, o.tyreCol || [0.2, 0.2, 0.2], { p: [x, y - flat * r * 0.22, z], r: o.r || null });
  P3.add(o.rimMat || "paint", rim2, o.rimCol || [0.5, 0.5, 0.5], { p: [x, y - flat * r * 0.22, z], r: o.r || null });
}
function keyCurve(keys) {
  const n = keys.length, m = keys[0].length, tan = keys.map(() => new Array(m).fill(0));
  for (let c = 1; c < m; c++) for (let i = 0; i < n; i++) {
    const d0 = i > 0 ? (keys[i][c] - keys[i - 1][c]) / (keys[i][0] - keys[i - 1][0]) : null, d1 = i < n - 1 ? (keys[i + 1][c] - keys[i][c]) / (keys[i + 1][0] - keys[i][0]) : null;
    tan[i][c] = d0 == null ? d1 : d1 == null ? d0 : d0 * d1 <= 0 ? 0 : 2 * d0 * d1 / (d0 + d1);
  }
  return (u) => {
    let i = 0;
    while (i < n - 2 && u > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], h = b[0] - a[0], t = clamp2((u - a[0]) / h), t2 = t * t, t3 = t2 * t, o = [u];
    for (let c = 1; c < m; c++) o.push((2 * t3 - 3 * t2 + 1) * a[c] + (t3 - 2 * t2 + t) * h * tan[i][c] + (-2 * t3 + 3 * t2) * b[c] + (t3 - t2) * h * tan[i + 1][c]);
    return o;
  };
}

