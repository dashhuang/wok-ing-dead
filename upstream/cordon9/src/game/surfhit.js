function createSurfHit(W) {
  const soups = /* @__PURE__ */ new Map(), tags = /* @__PURE__ */ new Map(), o = new Vector3(), d = new Vector3(), n = new Vector3(), out = { t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0, mat: "" };
  const stats = { tests: 0, exact: 0, through: 0, ms: 0, soups: 0, tris: 0 };
  function soupOf(prop) {
    let A = soups.get(prop);
    if (A) return A;
    let cnt = 0;
    const parts = [];
    for (const [k, arr] of prop.B.map) {
      if (k === "glow" || k === "flare") continue;
      for (const g2 of arr) {
        const P3 = g2.attributes.position, I = g2.index;
        if (!P3) continue;
        parts.push([P3, I, k]);
        cnt += I ? I.count : P3.count;
      }
    }
    A = new Float32Array(cnt * 3);
    let j = 0;
    const T3 = [];
    for (const [P3, I, k] of parts) {
      T3.push([j, k]);
      const a = P3.array, m = I ? I.count : P3.count;
      for (let i = 0; i < m; i++) {
        const v = (I ? I.array[i] : i) * 3;
        A[j++] = a[v];
        A[j++] = a[v + 1];
        A[j++] = a[v + 2];
      }
    }
    soups.set(prop, A);
    tags.set(prop, T3);
    stats.soups++;
    stats.tris += cnt / 3;
    return A;
  }
  function refine(col, ox, oy, oz, dx, dy, dz, tBox, before = 0.45, after = 1.6) {
    const inst = W.insts[col.inst];
    if (!inst) return null;
    const t0 = performance.now(), A = soupOf(inst.prop);
    stats.tests++;
    o.set(ox, oy, oz).applyMatrix4(inst.inv);
    d.set(dx, dy, dz).transformDirection(inst.inv);
    const px2 = o.x, py2 = o.y, pz2 = o.z, qx = d.x, qy = d.y, qz = d.z, tMin = Math.max(0.02, tBox - before);
    let best = tBox + after, bi = -1;
    for (let i = 0, m = A.length; i < m; i += 9) {
      const ax2 = A[i], ay2 = A[i + 1], az2 = A[i + 2], e1x = A[i + 3] - ax2, e1y = A[i + 4] - ay2, e1z = A[i + 5] - az2, e2x = A[i + 6] - ax2, e2y = A[i + 7] - ay2, e2z = A[i + 8] - az2;
      const hx = qy * e2z - qz * e2y, hy = qz * e2x - qx * e2z, hz = qx * e2y - qy * e2x, det = e1x * hx + e1y * hy + e1z * hz;
      if (det > -1e-12 && det < 1e-12) continue;
      const f3 = 1 / det, sx = px2 - ax2, sy = py2 - ay2, sz = pz2 - az2, u = f3 * (sx * hx + sy * hy + sz * hz);
      if (u < 0 || u > 1) continue;
      const rx = sy * e1z - sz * e1y, ry = sz * e1x - sx * e1z, rz = sx * e1y - sy * e1x, v = f3 * (qx * rx + qy * ry + qz * rz);
      if (v < 0 || u + v > 1) continue;
      const t = f3 * (e2x * rx + e2y * ry + e2z * rz);
      if (t >= tMin && t < best) {
        best = t;
        bi = i;
      }
    }
    stats.ms += performance.now() - t0;
    if (bi < 0) {
      stats.through++;
      return null;
    }
    const ax = A[bi], ay = A[bi + 1], az = A[bi + 2];
    n.set((A[bi + 4] - ay) * (A[bi + 8] - az) - (A[bi + 5] - az) * (A[bi + 7] - ay), (A[bi + 5] - az) * (A[bi + 6] - ax) - (A[bi + 3] - ax) * (A[bi + 8] - az), (A[bi + 3] - ax) * (A[bi + 7] - ay) - (A[bi + 4] - ay) * (A[bi + 6] - ax));
    if (n.x * qx + n.y * qy + n.z * qz > 0) n.negate();
    n.transformDirection(inst.M);
    stats.exact++;
    {
      const T3 = tags.get(inst.prop);
      let m = "";
      for (let q = 0; q < T3.length && T3[q][0] <= bi; q++) m = T3[q][1];
      out.mat = m;
    }
    out.t = best;
    out.x = ox + dx * best;
    out.y = oy + dy * best;
    out.z = oz + dz * best;
    out.nx = n.x;
    out.ny = n.y;
    out.nz = n.z;
    return out;
  }
  return { refine, stats, soups };
}

