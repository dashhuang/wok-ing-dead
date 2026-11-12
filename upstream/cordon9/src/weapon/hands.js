var V32 = Vector3;
var v3 = (x, y, z) => new V32(x, y, z);
var bell = (x) => Math.exp(-x * x);
var sgn = Math.sign;
var PI = Math.PI;
var C_RUB = [1, 1, 1.02];
var C_RUBP = [0.74, 0.74, 0.76];
var C_SEAM = [1.5, 1.5, 1.5];
var C_TAPE = [0.1, 0.1, 0.097];
var C_TAPE2 = [0.125, 0.125, 0.118];
var C_SLV = [0.25, 0.175, 0.036];
var C_SLV_D = [0.14, 0.1, 0.026];
var C_WEB = [0.06, 0.07, 0.045];
var C_CASE = [0.06, 0.06, 0.062];
var FINGER = [
  // base x, base z, lengths, r0, r1
  { x: 0.0285, z: 0.089, len: [0.043, 0.025, 0.023], r0: 99e-4, r1: 83e-4 },
  { x: 95e-4, z: 0.093, len: [0.047, 0.029, 0.024], r0: 0.0102, r1: 85e-4 },
  { x: -95e-4, z: 0.089, len: [0.043, 0.027, 0.023], r0: 97e-4, r1: 81e-4 },
  { x: -0.0275, z: 0.081, len: [0.034, 0.02, 0.021], r0: 88e-4, r1: 75e-4 }
];
var PZ = [-0.014, -4e-3, 8e-3, 0.02, 0.034, 0.048, 0.06, 0.071, 0.081, 0.089, 0.095, 0.099, 0.1015];
var pHW = (z) => lerp2(0.0285, 0.0425, sstep(-5e-3, 0.05, z)) * (1 - 0.06 * sstep(0.08, 0.1, z));
var pTD = (z) => lerp2(0.0178, 0.0122, sstep(-5e-3, 0.06, z)) * (1 - 0.72 * Math.pow(clamp2((z - 0.086) / 0.0155), 2.2));
var pTP = (z) => lerp2(0.0185, 0.0128, sstep(0, 0.07, z)) * (1 - 0.72 * Math.pow(clamp2((z - 0.086) / 0.0155), 2.2));
var pSlant = (x, z) => 0.011 * (x / 0.04) * sstep(0.045, 0.1, z) - 4e-3 * sstep(0.045, 0.1, z) * (x < -0.015 ? 1 : 0);
function chain(o) {
  const { base, ez, ey, len, curls, r0, r1, n = 16, start = -0.013, wide = 1.07, ribs = true, col = C_RUB, colP = C_RUBP, seamCol = C_SEAM, ds = 26e-4, skinny = 0 } = o;
  const ax = new V32().crossVectors(ey, ez).normalize();
  const j1 = len[0], j2 = len[0] + len[1], total = j2 + len[2], jw = 88e-4, rcap = r1 * 1.02;
  const theta = (s) => curls[0] * sstep(-7e-3, 0.011, s) + curls[1] * sstep(j1 - jw, j1 + jw, s) + curls[2] * sstep(j2 - jw * 0.85, j2 + jw * 0.85, s);
  const bend = (s) => bell((s - 2e-3) / 8e-3) * curls[0] + bell((s - j1) / jw) * curls[1] + bell((s - j2) / (jw * 0.85)) * curls[2];
  const nearJ = (s) => Math.min(Math.abs(s - 3e-3), Math.abs(s - j1));
  const S4 = [];
  for (let s = start; s < total - rcap - 1e-6; s += ribs && nearJ(s) < 95e-4 ? 85e-5 : ds) S4.push([s, 1]);
  for (const a of ds > 3e-3 ? [0, 35, 62, 82] : [0, 20, 40, 58, 73, 84]) S4.push([total - rcap + rcap * Math.sin(a * PI / 180), Math.cos(a * PI / 180)]);
  S4.push([total, 0]);
  const L = new Loft(n), frames = [], p = base.clone().addScaledVector(ez, start);
  let sPrev = start;
  const d = new V32(), nn = new V32(), q = new V32();
  for (let i = 0; i < S4.length; i++) {
    const [s, capK] = S4[i];
    const m = Math.max(1, Math.ceil((s - sPrev) / 6e-4));
    for (let k = 0; k < m; k++) {
      const sm = sPrev + (s - sPrev) * (k + 0.5) / m, t = theta(sm);
      p.addScaledVector(ez, Math.cos(t) * (s - sPrev) / m).addScaledVector(ey, -Math.sin(t) * (s - sPrev) / m);
    }
    sPrev = s;
    const th = theta(s);
    d.copy(ez).multiplyScalar(Math.cos(th)).addScaledVector(ey, -Math.sin(th));
    nn.copy(ey).multiplyScalar(Math.cos(th)).addScaledVector(ez, Math.sin(th));
    const u = clamp2(s / total), rb = lerp2(r0, r1, u), b = Math.min(1, bend(s) / 1.25);
    const knuck = (0.17 + skinny) * bell((s - 3e-3) / 95e-4) + (0.11 + skinny) * bell((s - j1) / 72e-4) + (0.08 + skinny * 0.7) * bell((s - j2) / 6e-3) - skinny * 0.35;
    const seg = s < j1 ? s / j1 : s < j2 ? (s - j1) / len[1] : (s - j2) / len[2], pad = Math.pow(Math.sin(PI * clamp2(seg)), 2);
    const rib = ribs ? 95e-5 * (Math.pow(Math.max(0, Math.cos((s - 3e-3) * 2 * PI / 42e-4)), 0.6) * sstep(88e-4, 66e-4, Math.abs(s - 3e-3)) + Math.pow(Math.max(0, Math.cos((s - j1) * 2 * PI / 42e-4)), 0.6) * sstep(88e-4, 66e-4, Math.abs(s - j1))) : 0;
    const slack = 5e-4 * Math.sin(s * 1500 + i) * bell((s - j2) / 8e-3) + 4e-4 * Math.sin(s * 900) * bell((s - (j1 + j2) / 2) / 0.01);
    const rd = rb * (0.95 + knuck) * (s > j2 ? 1 - 0.1 * sstep(j2, total, s) : 1), rp = rb * (1 + 0.1 * pad) * (1 - 0.26 * b), rw = rb * wide * (1 + 0.05 * knuck);
    const collapse = capK <= 0;
    for (let k = 0; k < n; k++) {
      const a = k / n * PI * 2, c = Math.cos(a), sn = Math.sin(a), seam = !!seamCol && (k === 0 || k === n / 2) && !collapse;
      const top = sstep(0.05, 0.6, sn);
      let x = (rw + rib * top * 0.6) * sgn(c) * Math.pow(Math.abs(c), 0.9), y = sn >= 0 ? (rd + (rib + slack) * top) * Math.pow(sn, 0.86) : -rp * Math.pow(-sn, 0.92);
      if (seam) x += sgn(c) * 4e-4;
      const kk = collapse ? 1e-5 : capK;
      x *= kk;
      y *= kk;
      q.copy(p).addScaledVector(ax, x).addScaledVector(nn, y);
      const wgt = sstep(-0.35, 0.35, sn), ribHi = rib > 5e-4 && sn > 0.1;
      const cc = seam ? seamCol : [lerp2(colP[0], col[0], wgt), lerp2(colP[1], col[1], wgt), lerp2(colP[2], col[2], wgt)];
      const jit = (0.9 + 0.2 * hash3(k * 3.1, i * 1.7, o.seed || 1)) * (ribHi ? 1.25 : 1);
      L.v(q.x, q.y, q.z, [cc[0] * jit, cc[1] * jit, cc[2] * jit], [ribHi ? 0.7 : 0, clamp2((sn < 0 ? b * 0.9 : 0) + (ribs && rib < 2e-4 && nearJ(s) < 8e-3 && sn > 0.1 ? 0.6 : 0))]);
    }
    if (collapse) L.collapse();
    frames.push({ s, p: p.clone(), d: d.clone(), n: nn.clone(), rd, rw, k: capK });
  }
  const at = (s) => {
    let best = frames[0];
    for (const f3 of frames) if (Math.abs(f3.s - s) < Math.abs(best.s - s)) best = f3;
    return best;
  };
  const atL = (s, o2 = {}) => {
    let i = 0;
    while (i < frames.length - 2 && frames[i + 1].s < s) i++;
    const A = frames[i], B2 = frames[i + 1], t = clamp2((s - A.s) / Math.max(1e-6, B2.s - A.s));
    o2.p = (o2.p || new V32()).lerpVectors(A.p, B2.p, t);
    o2.n = (o2.n || new V32()).lerpVectors(A.n, B2.n, t).normalize();
    o2.rd = lerp2(A.rd, B2.rd, t);
    o2.rw = lerp2(A.rw, B2.rw, t);
    o2.k = lerp2(A.k, B2.k, t);
    return o2;
  };
  return { geo: L.geo(), at, atL, ax, j1, j2, total };
}
function fbox(w, h, l, b, p, ax, ay, az, col, seg = 1) {
  const g2 = bevelBox(w, h, l, b, seg);
  paint(g2, col, { jit: 0.05 });
  g2.applyMatrix4(new Matrix4().makeBasis(ax, ay, az).setPosition(p));
  return g2;
}
function buildHand(pose, { mirror = false, seed = 1, rect: rect2 = null } = {}) {
  const B2 = new Bucket();
  const fore = v3(...pose.forearm).normalize(), qF = new Quaternion().setFromUnitVectors(v3(0, 0, -1), fore), qI = new Quaternion(), qT = new Quaternion(), piv = v3(0, 0, -4e-3), tv = new V32();
  const bendPt = (x, y, z) => {
    const t = 1 - sstep(-0.034, 0.016, z);
    qT.slerpQuaternions(qI, qF, t);
    tv.set(x, y, z).sub(piv).applyQuaternion(qT).add(piv);
    return tv;
  };
  const bendGeo = (g2) => {
    const P3 = g2.attributes.position;
    for (let i = 0; i < P3.count; i++) {
      const r = bendPt(P3.getX(i), P3.getY(i), P3.getZ(i));
      P3.setXYZ(i, r.x, r.y, r.z);
    }
    g2.computeVertexNormals();
    return g2;
  };
  {
    const n = 28, L = new Loft(n);
    for (let i = 0; i < PZ.length; i++) {
      const z = PZ[i], hw = pHW(z), td = pTD(z), tp = pTP(z), last = i === PZ.length - 1;
      for (let k = 0; k < n; k++) {
        const a = k / n * PI * 2, c = Math.cos(a), s = Math.sin(a);
        let x = hw * sgn(c) * Math.pow(Math.abs(c), 0.72), y = s >= 0 ? td * Math.pow(s, 0.8) : -tp * Math.pow(-s, 0.8);
        if (s < 0) {
          y -= 85e-4 * sstep(2e-3, 0.03, x) * bell((z - 0.026) / 0.026) * -s;
          y -= 45e-4 * sstep(-4e-3, -0.03, x) * bell((z - 0.02) / 0.03) * -s;
          y += 22e-4 * bell((z - 0.058) / 0.01) * bell(x / 0.03) * -s;
        } else y += 8e-4 * Math.sin(x * 330 + 1.2) * bell((z - 0.045) / 0.03) + 7e-4 * Math.sin(z * 520 + x * 90) * bell((z - 0.012) / 0.014);
        if (last) {
          x *= 0.9;
          y *= 0.25;
        }
        const zz = z + pSlant(x, z), w = sstep(-0.3, 0.3, s), seam = k === 0 || k === n / 2;
        const cc = seam ? C_SEAM : [lerp2(C_RUBP[0], C_RUB[0], w), lerp2(C_RUBP[1], C_RUB[1], w), lerp2(C_RUBP[2], C_RUB[2], w)], jit = 0.9 + 0.2 * hash3(k, i, seed);
        const r = bendPt(x + (seam ? sgn(c) * 4e-4 : 0), y, zz);
        L.v(r.x, r.y, r.z, [cc[0] * jit, cc[1] * jit, cc[2] * jit], [0, s < 0 ? 0.45 : 0]);
      }
    }
    B2.add("glove", L.geo());
  }
  for (let f3 = 0; f3 < 4; f3++) {
    const F2 = FINGER[f3], [c0, c1, c2, sp2 = 0] = pose.fingers[f3];
    const ch = chain({ base: v3(F2.x, 12e-4, F2.z), ez: v3(Math.sin(sp2), 0, Math.cos(sp2)), ey: v3(0, 1, 0), len: F2.len, curls: [c0, c1, c2], r0: F2.r0, r1: F2.r1, seed: seed + f3 });
    B2.add("glove", ch.geo);
  }
  {
    const D = v3(...pose.thumb.dir).normalize(), Tw = v3(...pose.thumb.toward);
    Tw.addScaledVector(D, -Tw.dot(D)).normalize();
    const ch = chain({ base: v3(0.034, -9e-3, 0.034), ez: D, ey: Tw.clone().multiplyScalar(-1), len: [0.03, 0.033, 0.028], curls: pose.thumb.curls, r0: 0.0152, r1: 99e-4, start: -0.02, seed: seed + 9, wide: 1.08, ribs: false });
    B2.add("glove", ch.geo);
    const a0 = ch.at(ch.j1 * 0.9).p, a1 = v3(FINGER[0].x + 8e-3, -4e-3, FINGER[0].z - 0.02), a2 = v3(0.03, -6e-3, 0.04), W = new Loft(12), up = v3(0, 1, 0), side2 = new V32().subVectors(a1, a0).cross(up).normalize();
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, c = new V32().lerpVectors(a0, a1, t).lerp(a2, 0.7 * Math.sin(PI * t)), r = i === 0 || i === 8 ? 1e-5 : 0.0105 - 3e-3 * Math.sin(PI * t);
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * PI * 2;
        const q = c.clone().addScaledVector(side2, Math.cos(a) * r * 0.8).addScaledVector(up, Math.sin(a) * r * 1.25);
        W.v(q.x, q.y, q.z, Math.sin(a) > 0 ? C_RUB : C_RUBP, [0, 0.4]);
      }
      if (i === 0 || i === 8) W.collapse();
    }
    B2.add("glove", W.geo());
  }
  const rx = (z) => 0.0288 + 0.011 * sstep(0, -0.2, z), ry = (z) => 0.0192 + 0.015 * sstep(0, -0.2, z);
  const ring2 = (L, z, off, col, n, fn = null, zs = 0) => {
    for (let k = 0; k < n; k++) {
      const a = k / n * PI * 2, cs = Math.cos(a), sn = Math.sin(a), o = fn ? fn(a, k) : null, e = off + (o ? o[0] : 0), sh = o ? o[1] : 1;
      const r = bendPt((rx(z) + e) * sgn(cs) * Math.pow(Math.abs(cs), 0.86), (ry(z) + e) * sgn(sn) * Math.pow(Math.abs(sn), 0.86), z + zs * (a / (2 * PI) - 0.5));
      L.v(r.x, r.y, r.z, [col[0] * sh, col[1] * sh, col[2] * sh], [o && o[2] ? o[2] : 0, clamp2(1 - sh)]);
    }
  };
  {
    const n = 32, L = new Loft(n);
    for (let z = 0.014; z > -0.1021; z -= 29e-4) {
      const wr = bell((z + 0.01) / 0.013), pl = sstep(-0.028, -0.072, z);
      ring2(L, z, z > 0.01 ? -4e-3 : 22e-4 + 14e-4 * pl, C_RUB, n, (a) => {
        const w = wr * 13e-4 * Math.sin(z * 760 + 2.2 * Math.sin(a + seed)) + pl * 17e-4 * Math.cos(a * 7 + 2.5 * Math.sin(z * 38 + seed));
        return [w, 0.9 + 0.14 * clamp2(w / 17e-4, -1, 1)];
      });
    }
    for (const [z, e] of [[-0.1035, 58e-4], [-0.1052, 72e-4], [-0.1072, 72e-4], [-0.1088, 55e-4], [-0.1092, 2e-3]]) ring2(L, z, e, C_RUB, n, () => [0, 1.2, 0.6]);
    B2.add("glove", L.geo());
  }
  {
    const n = 32;
    for (const [z0, z1, e, col, slant] of [[-0.118, -0.082, 62e-4, C_TAPE, 4e-3], [-0.146, -0.108, 72e-4, C_TAPE2, -5e-3]]) {
      const L = new Loft(n);
      for (const [t, de] of [[0, -12e-4], [0.01, 0], [0.25, 0], [0.5, 0], [0.75, 0], [0.99, 0], [1, -12e-4]]) {
        const z = z0 + (z1 - z0) * t;
        ring2(L, z, e + de, col, n, (a) => {
          const w = 5e-4 * Math.sin(a * 9 + t * 5 + seed) * Math.sin(t * 9 + a * 2);
          return [w, 0.92 + 0.16 * Math.sin(a * 5 + t * 7)];
        }, slant);
      }
      B2.add("tape", L.geo());
    }
    const zA = fore.clone().multiplyScalar(-1), yA = v3(0.35, 0.94, 0).applyQuaternion(qF).normalize(), xA = new V32().crossVectors(yA, zA).normalize(), yB = new V32().crossVectors(zA, xA).normalize();
    const pt = bendPt(0.012, ry(-0.125) + 82e-4, -0.127).clone();
    B2.add("tape", fbox(0.017, 7e-4, 0.03, 3e-4, pt, xA.clone().applyAxisAngle(zA, -0.35), yB.clone().applyAxisAngle(zA, -0.35), zA, C_TAPE2));
  }
  {
    const len = pose.sleeve || 0.34, Z0 = -0.128, AZ = [];
    for (let i = 0; i < 26; i++) {
      AZ.push(i * (360 / 26));
    }
    AZ.push(97, 104);
    AZ.sort((a, b) => a - b);
    const n = AZ.length, sA = AZ.indexOf(97), sB = AZ.indexOf(104), L = new Loft(n);
    const rn = (a, z, f3, r, o) => {
      const v = fbm(Math.cos(a) * r + o, Math.sin(a) * r + o * 0.7, z * f3 + 0.35 * Math.sin(a * 2 + o), 2);
      return 1 - Math.abs(2 * v - 1);
    };
    for (let z = -0.012; z <= len + 1e-6; z += z < 0.02 ? 4e-3 : 42e-4) {
      const C2 = clamp2(z / len), zz = Z0 - z, under = z < 0.016;
      for (let k = 0; k < n; k++) {
        const a = AZ[k] * PI / 180, cs = Math.cos(a), sn = Math.sin(a);
        const amp = 3e-3 + 35e-4 * bell((z - 0.05) / 0.04) + 55e-4 * sstep(0.4, 0.95, C2);
        const c1 = Math.pow(rn(a, z, 30, 0.75, 3.1 + seed * 5), 7), c2 = Math.pow(rn(a, z, 62, 1.5, 9.7 + seed * 3), 7), puff = fbm(Math.cos(a) * 0.9 + seed, Math.sin(a) * 0.9, z * 16, 2) - 0.5;
        const fold = amp * (puff * 1.8 - c1 * 1.1 - c2 * 0.35 + 0.2), sag = sn < 0 ? 7e-3 * C2 * -sn : 0;
        let e = under ? 15e-4 : 85e-4 + 0.013 * Math.pow(C2, 0.8) + 45e-4 * bell((z - 0.05) / 0.022) + fold + sag;
        let sh = under ? 0.5 : clamp2(0.98 - 0.42 * c1 - 0.2 * c2 + 0.25 * puff, 0.45, 1.2), col = C_SLV, wearM = clamp2(0.2 + puff * 1.6 - c1);
        if (!under && (k === sA || k === sB)) {
          e += 12e-4;
          sh *= 1.08;
        } else if (!under && k === sA + 1 && sB === sA + 2) {
          sh *= 0.6;
          col = C_SLV_D;
        }
        const r = bendPt((rx(zz) + e) * cs, (ry(zz) + e) * sn - sag * 0.6, zz);
        L.v(r.x, r.y, r.z, [col[0] * sh, col[1] * sh, col[2] * sh], [wearM, clamp2(c1 * 0.9 + c2 * 0.4)]);
      }
    }
    B2.add("sleeve", L.geo());
  }
  if (pose.watch && rect2) {
    const zA = fore.clone().multiplyScalar(-1), yW = v3(0, 1, 0).applyQuaternion(qF).normalize(), xW = new V32().crossVectors(yW, zA).normalize(), zc = -0.052;
    const SL = new Loft(32);
    for (const [dz, e] of [[-0.0112, 26e-4], [-0.0105, 46e-4], [0, 5e-3], [0.0105, 46e-4], [0.0112, 26e-4]]) ring2(SL, zc + dz, e, C_WEB, 32, (a) => [3e-4 * Math.sin(a * 11), 0.9 + 0.15 * Math.sin(a * 3 + dz * 300)]);
    B2.add("strap", SL.geo());
    const pc = bendPt(0, ry(zc) + 52e-4, zc).clone(), M4 = new Matrix4().makeBasis(xW, yW, zA.clone().multiplyScalar(-1)).setPosition(pc);
    const put = (g2, bucket) => {
      g2.applyMatrix4(M4);
      B2.add(bucket, g2);
    };
    const oct = chamRect(-0.0205, -0.0215, 0.0205, 0.0215, 62e-4);
    {
      const g2 = extrude(oct, 0, 0.0105, 14e-4);
      paint(g2, C_CASE);
      g2.rotateX(-PI / 2);
      put(g2, "hard");
    }
    {
      const g2 = extrude(chamRect(-0.0185, -0.0195, 0.0185, 0.0195, 52e-4), 0.0105, 0.0128, 8e-4, [chamRect(-0.0142, -0.0118, 0.0142, 0.0118, 2e-3)]);
      paint(g2, [1.5, 1.5, 1.5]);
      g2.rotateX(-PI / 2);
      put(g2, "hard");
    }
    for (const [x, z] of [[-0.0162, -0.0165], [0.0162, -0.0165], [-0.0162, 0.0165], [0.0162, 0.0165]]) {
      const g2 = lathe([[16e-4, 0], [16e-4, 8e-4], [1e-3, 12e-4], [0, 12e-4]], 8, { axis: "y" });
      paint(g2, [1, 1, 1]);
      g2.translate(x, 0.0128, z);
      put(g2, "metal");
    }
    for (const [sx, z] of [[-1, -9e-3], [-1, 9e-3], [1, -9e-3], [1, 9e-3]]) {
      const g2 = lathe([[24e-4, 0], [24e-4, 26e-4], [19e-4, 32e-4], [0, 32e-4]], 10, { axis: "x" });
      paint(g2, [1, 1, 1]);
      if (sx < 0) g2.rotateY(PI);
      g2.translate(sx * 0.0205, 58e-4, z);
      put(g2, "metal");
    }
    for (const sz of [-1, 1]) {
      const g2 = bevelBox(0.026, 52e-4, 62e-4, 14e-4);
      paint(g2, C_CASE);
      g2.translate(0, 32e-4, sz * 0.0238);
      put(g2, "hard");
    }
    {
      const q = fromArrays([-0.0142, 0.0116, 0.0118, 0.0142, 0.0116, 0.0118, 0.0142, 0.0116, -0.0118, -0.0142, 0.0116, -0.0118], [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], (() => {
        const r = rect2("watch");
        return mirror ? [r[2], r[1], r[0], r[1], r[0], r[3], r[2], r[3]] : [r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3]];
      })(), [0, 1, 2, 0, 2, 3]);
      put(q, "decal");
    }
  }
  if (mirror) for (const [k, arr] of B2.map) B2.map.set(k, arr.map((g2) => mirrorX(g2)));
  return B2;
}
function placeHand(B2, { mirror = false, anchor, target, fingerDir, thumbDir }) {
  const Z = v3(...fingerDir).normalize(), Tm = v3(...thumbDir);
  Tm.addScaledVector(Z, -Tm.dot(Z)).normalize();
  const X = mirror ? Tm.clone().multiplyScalar(-1) : Tm, Y = new V32().crossVectors(Z, X).normalize();
  const m = new Matrix4().makeBasis(X, Y, Z), a = v3(mirror ? -anchor[0] : anchor[0], anchor[1], anchor[2]).applyMatrix4(m);
  m.setPosition(target[0] - a.x, target[1] - a.y, target[2] - a.z);
  for (const arr of B2.map.values()) for (const g2 of arr) g2.applyMatrix4(m);
  return m;
}
function toHand(dirW, mirror, fingerDir, thumbDir) {
  const Z = v3(...fingerDir).normalize(), Tm = v3(...thumbDir);
  Tm.addScaledVector(Z, -Tm.dot(Z)).normalize();
  const X = mirror ? Tm.clone().multiplyScalar(-1) : Tm, Y = new V32().crossVectors(Z, X).normalize(), d = v3(...dirW);
  const h = [d.dot(X), d.dot(Y), d.dot(Z)];
  if (mirror) h[0] = -h[0];
  return h;
}
var D2R = PI / 180;
var deg = (...a) => a.map((x) => x * D2R);
var GRIPS = {
  right: {
    mirror: false,
    anchor: [95e-4, 12e-4, 0.093],
    target: [0.0245, -0.095, 0.033],
    fingerDir: [-0.1, -0.3, -0.95],
    thumbDir: [0.03, 0.95, -0.3],
    forearmW: [0.33, -0.54, 0.77],
    pose: { fingers: [deg(14, 58, 20, 27), deg(78, 96, 34, 2), deg(80, 96, 36, -1), deg(82, 94, 40, -4)], thumb: { dir: [0.22, -0.74, 0.63], toward: [-0.3, -0.1, 0.95], curls: deg(8, 24, 20) }, sleeve: 0.34 }
  },
  left: {
    mirror: true,
    anchor: [95e-4, 12e-4, 0.093],
    target: [-0.0218, -0.089, -0.2105],
    fingerDir: [0.34, 0.1, -0.93],
    thumbDir: [0.03, 0.99, 0.1],
    forearmW: [-0.4, -0.5, 0.77],
    pose: { fingers: [deg(74, 92, 34, 5), deg(80, 96, 36, 2), deg(82, 96, 38, -1), deg(84, 94, 42, -4)], thumb: { dir: [0.25, -0.74, 0.62], toward: [-0.4, -0.15, 0.9], curls: deg(14, 30, 24) }, sleeve: 0.36, watch: true }
  },
  flat: {
    mirror: false,
    anchor: [0, 0, 0],
    target: [0, 0, 0],
    fingerDir: [0, 0, -1],
    thumbDir: [1, 0, 0],
    forearmW: [0, 0, 1],
    pose: { fingers: [deg(6, 10, 6, 7), deg(5, 9, 5, 2), deg(6, 10, 6, -3), deg(8, 12, 8, -9)], thumb: { dir: [0.74, -0.22, 0.63], toward: [-0.55, -0.45, 0.7], curls: deg(4, 10, 8) }, sleeve: 0.2 }
  }
};
function buildHands({ grips = GRIPS, rect: rect2 = null, sides = ["right", "left"] } = {}) {
  const out = {};
  for (const side2 of sides) {
    const g2 = grips[side2], pose = { ...g2.pose, forearm: toHand(g2.forearmW, g2.mirror, g2.fingerDir, g2.thumbDir) };
    const B2 = buildHand(pose, { mirror: g2.mirror, seed: side2 === "right" ? 1 : 2, rect: rect2 });
    placeHand(B2, g2);
    out[side2] = B2;
  }
  return out;
}

