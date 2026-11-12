var ss7 = sstep;
var cl5 = clamp2;
var PI3 = Math.PI;
var C0 = [0, 0.03, -0.014];
var STYLES = ["crop", "matted", "thin", "long"];
var HAIR_FORCE = { walker: null, runner: null, brute: null };
var COLS = [[0.9, 0.75, 0.62], [0.5, 0.5, 0.55], [1.9, 1.25, 0.72], [2.3, 2.25, 2.3], [1.6, 0.8, 0.5], [1.8, 1.72, 1.68]];
function hairPlan(B2, F2) {
  const R4 = rng(B2.seed * 9173 + 57 + (B2.type === "brute" ? 11 : B2.type === "runner" ? 5 : 0)), rr = (a, b) => a + (b - a) * R4(), old = B2.age > 0.55;
  const force = HAIR_FORCE[B2.type], style = force && force !== "bald" ? force : B2.sex ? R4() < 0.7 ? "long" : "matted" : B2.type === "brute" ? R4() < 0.6 ? "crop" : "thin" : STYLES[Math.floor(R4() * 3)];
  const col = old && R4() < 0.6 ? COLS[R4() < 0.5 ? 3 : 5] : COLS[Math.floor(R4() * 5) % 5 === 3 ? 0 : Math.floor(R4() * 5)];
  const H2 = {
    style,
    col,
    recede: rr(0, 0.5) + (old ? 0.35 : 0) + (style === "thin" ? 0.5 : 0),
    bald: style === "thin" ? rr(0.75, 1) : old ? rr(0, 0.5) : 0,
    part: rr(-1, 1),
    mess: rr(0.5, 1),
    patch: rr(0.25, 0.6),
    len: { crop: rr(0.022, 0.036), matted: rr(0.06, 0.1), thin: rr(0.035, 0.07), long: rr(0.16, 0.24) }[style],
    seed: B2.seed * 4.7 + 13,
    stubble: B2.sex ? 0 : rr(0.2, 1),
    brow: (B2.sex ? 0.7 : 1) * rr(0.8, 1.25) * F2.brow ** 0.3
  };
  H2.crown = [H2.part * 0.022, 0.118, -0.04];
  H2.none = force === "bald";
  return H2;
}
function scalpAt(H2, lx3, ly2, lz3) {
  if (H2.none) return 0;
  const dx = lx3 - C0[0], dy = ly2 - C0[1], dz = lz3 - C0[2], l = Math.hypot(dx, dy, dz) || 1, e = dy / l, a = Math.abs(Math.atan2(dx, dz)) / PI3;
  const temple = Math.exp(-(((a - 0.2) / 0.09) ** 2)) * (0.1 + 0.16 * H2.recede), front = 0.6 + 0.12 * H2.recede + temple, side2 = -0.2, nape = -0.6;
  const lim = a < 0.42 ? front + (side2 - front) * ss7(0.24, 0.42, a) : side2 + (nape - side2) * ss7(0.5, 0.82, a), earGap = Math.exp(-(((a - 0.52) / 0.08) ** 2)) * 0.2;
  let d = ss7(lim + earGap - 0.03, lim + earGap + 0.07, e);
  if (H2.bald > 0) d *= 1 - H2.bald * ss7(0.62, 0.86, e + 0.1 * (dz / l)) * (1 - 0.6 * ss7(0.5, 0.9, a));
  return d;
}
function stubbleAt(H2, lx3, ly2, lz3) {
  if (!H2.stubble) return 0;
  const ax = Math.abs(lx3);
  return H2.stubble * ss7(-0.03, -0.052, ly2) * ss7(0.02, 0.05, lz3 + ax * 0.5) * (1 - 0.8 * Math.exp(-(((ly2 + 0.06) / 7e-3) ** 2)) * ss7(0.03, 0.02, ax)) * ss7(-0.135, -0.11, ly2);
}
function browAt(H2, lx3, ly2, lz3) {
  const ax = Math.abs(lx3), u = (ax - 0.01) / 0.046;
  if (u < 0 || u > 1 || lz3 < 0.04) return 0;
  const yb = EYE[1] + 0.0195 + 6e-3 * Math.sin(u * 2.4) - 7e-3 * u * u, hh = 52e-4 * H2.brow * (1 - 0.6 * u * u) * ss7(0, 0.12, u);
  return cl5(1 - Math.abs(ly2 - yb) / hh);
}
function ribbons() {
  const P3 = [], I = [], C2 = [], F2 = [];
  return { P: P3, I, C: C2, F: F2, mesh() {
    const m = { P: new Float32Array(P3), I: new Uint32Array(I) };
    m.col = new Float32Array(C2);
    m.fade = new Float32Array(F2);
    return m;
  } };
}
function buildHair(ctx) {
  const { B: B2, H: H2, GH, GB, head, lod } = ctx, HK = B2.HK, hc = B2.hc, seed = H2.seed, R4 = rng(B2.seed * 331 + 7), rr = (a, b) => a + (b - a) * R4(), out = [], g2 = [0, 0, 0];
  const loc = (x, y, z, o) => {
    o[0] = (x - hc[0]) / HK;
    o[1] = (y - hc[1]) / HK;
    o[2] = (z - hc[2]) / HK;
    return o;
  }, l3 = [0, 0, 0];
  const dens = (x, y, z) => {
    loc(x, y, z, l3);
    return scalpAt(H2, l3[0], l3[1], l3[2]);
  };
  const dist = (x, y, z) => GH.inside(x, y, z) ? GH.at(x, y, z) : GB.at(x, y, z);
  const nrm4 = (x, y, z, o) => {
    (GH.inside(x, y, z) ? GH : GB).grad(x, y, z, o, 4e-3);
    const l = Math.hypot(o[0], o[1], o[2]) || 1;
    o[0] /= l;
    o[1] /= l;
    o[2] /= l;
    return o;
  };
  const lifted = (pick, lift) => {
    let m = clip({ P: head.P.slice(), I: head.I.slice(), N: head.N.slice() }, pick);
    if (!m.I.length) return null;
    m = compact(m);
    const P3 = m.P;
    gradNormals(m, GH);
    for (let i = 0; i < P3.length; i += 3) {
      P3[i] += m.N[i] * lift;
      P3[i + 1] += m.N[i + 1] * lift;
      P3[i + 2] += m.N[i + 2] * lift;
    }
    return m;
  };
  const thin = (x, y, z) => fbm(x * 38 + seed, y * 38, z * 38, 3), edge = (x, y, z) => fbm(x * 34 + seed, y * 34, z * 34, 2);
  const capPick = (x, y, z) => dens(x, y, z) - 0.5 + 0.16 * (edge(x, y, z) - 0.5) - ss7(1 - H2.patch * 0.55, 1 - H2.patch * 0.55 + 0.08, thin(x, y, z));
  const cap2 = H2.none ? null : lifted(capPick, H2.style === "crop" ? 22e-4 : 14e-4);
  if (cap2) out.push({ bucket: "hair", m: cap2, paint: (i, x, y, z, nx, ny, nz, o) => {
    const n = fbm(x * 55 + seed, y * 55, z * 55, 3), k = 0.42 + 0.5 * n;
    o.c[0] = H2.col[0] * k;
    o.c[1] = H2.col[1] * k;
    o.c[2] = H2.col[2] * k;
    o.m[0] = 0.85 * (1 - ss7(0, 0.14, capPick(x, y, z)));
    o.m[1] = cl5(1.1 - n * 1.4);
  } });
  const cw = [hc[0] + C0[0] * HK, hc[1] + C0[1] * HK, hc[2] + C0[2] * HK], crown = [hc[0] + H2.crown[0] * HK, hc[1] + H2.crown[1] * HK, hc[2] + H2.crown[2] * HK];
  const rootAt = (d) => {
    let t0 = 0.05 * HK, t1 = 0.19 * HK;
    if (dist(cw[0] + d[0] * t1, cw[1] + d[1] * t1, cw[2] + d[2] * t1) < 0) return null;
    for (let i = 0; i < 18; i++) {
      const t = (t0 + t1) / 2;
      if (dist(cw[0] + d[0] * t, cw[1] + d[1] * t, cw[2] + d[2] * t) < 0) t0 = t;
      else t1 = t;
    }
    return [cw[0] + d[0] * t1, cw[1] + d[1] * t1, cw[2] + d[2] * t1];
  };
  const roots = (n, salt, minD2) => {
    const o = [], ga = PI3 * (3 - Math.sqrt(5)), Rj = rng(B2.seed * 77 + salt), dir = (i, N2, j) => {
      const y = 1 - (i + 0.5) / N2 * 1.5, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * ga + salt, d = [Math.cos(a) * r + (Rj() - 0.5) * j, y + (Rj() - 0.5) * j, Math.sin(a) * r + (Rj() - 0.5) * j], l = Math.hypot(d[0], d[1], d[2]);
      d[0] /= l;
      d[1] /= l;
      d[2] /= l;
      return d;
    };
    let hit = 0;
    for (let i = 0; i < 240; i++) {
      const p = rootAt(dir(i, 240, 0));
      if (p && dens(p[0], p[1], p[2]) >= minD2 + 0.15) hit++;
    }
    const N = Math.round(n / Math.max(0.04, hit / 240));
    for (let i = 0; i < N; i++) {
      const p = rootAt(dir(i, N, 0.12));
      if (!p) continue;
      const de = dens(p[0], p[1], p[2]);
      if (de < minD2 + Rj() * 0.3) continue;
      o.push(p);
    }
    return o;
  };
  const nA = [0, 0, 0];
  const guide = (p0, L, lift, o) => {
    const { segs, grav, mess } = o, sl = L / segs, p = p0.slice(), nodes = [];
    let px2 = 0, py2 = 0, pz2 = 0;
    const ph = R4() * 40, sw = (R4() - 0.5) * 2 * mess;
    for (let k = 0; k <= segs; k++) {
      const u = k / segs;
      nrm4(p[0], p[1], p[2], nA);
      let fx = p[0] - crown[0], fy = (p[1] - crown[1]) * 0.6, fz = p[2] - crown[2];
      const fl = Math.hypot(fx, fy, fz) || 1, gk = cl5(grav * (0.25 + 1.3 * u));
      fx = fx / fl + sw * nA[2] * 0.7;
      fz = fz / fl - sw * nA[0] * 0.7;
      fy = fy / fl;
      fz -= 0.5 * Math.abs(nA[0]) * ss7(-0.03, 0.03, (p[2] - cw[2]) / HK);
      fx = fx * (1 - gk) + 0.25 * mess * Math.sin(ph + u * 5);
      fy = fy * (1 - gk) - gk * 1.4;
      fz = fz * (1 - gk) + 0.25 * mess * Math.cos(ph * 1.3 + u * 4);
      const dn = fx * nA[0] + fy * nA[1] + fz * nA[2], d0 = dist(p[0], p[1], p[2]), stick = cl5(1.25 - (d0 - lift) / 0.03);
      fx -= nA[0] * dn * stick;
      fy -= nA[1] * dn * stick;
      fz -= nA[2] * dn * stick;
      if (k) {
        fx = fx * 0.65 + px2 * 0.35;
        fy = fy * 0.65 + py2 * 0.35;
        fz = fz * 0.65 + pz2 * 0.35;
      }
      const l = Math.hypot(fx, fy, fz) || 1;
      fx /= l;
      fy /= l;
      fz /= l;
      px2 = fx;
      py2 = fy;
      pz2 = fz;
      const lk = lift * (0.35 + 0.65 * ss7(0, 0.3, u)) + 4e-3 * mess * u * u;
      for (let it = 0; it < 3; it++) {
        const d = dist(p[0], p[1], p[2]);
        if (d >= lk) break;
        nrm4(p[0], p[1], p[2], nA);
        p[0] += nA[0] * (lk - d);
        p[1] += nA[1] * (lk - d);
        p[2] += nA[2] * (lk - d);
      }
      nrm4(p[0], p[1], p[2], nA);
      let sx = fy * nA[2] - fz * nA[1], sy = fz * nA[0] - fx * nA[2], sz = fx * nA[1] - fy * nA[0];
      const sl2 = Math.hypot(sx, sy, sz) || 1;
      sx /= sl2;
      sy /= sl2;
      sz /= sl2;
      nodes.push([p[0], p[1], p[2], sx, sy, sz, nA[0], nA[1], nA[2], fx, fy, fz]);
      p[0] += fx * sl;
      p[1] += fy * sl;
      p[2] += fz * sl;
    }
    for (let it = 0; it < 2; it++) for (let c = 0; c < 3; c++) {
      let a = nodes[0][c];
      for (let k = 1; k < segs; k++) {
        const b = nodes[k][c];
        nodes[k][c] = 0.25 * a + 0.5 * b + 0.25 * nodes[k + 1][c];
        a = b;
      }
    }
    return nodes;
  };
  const rb = ribbons(), NR2 = [];
  const strands = (nodes, o) => {
    const { n, lockW, lockT, w, clump, wave, shade } = o, rootF = 0.75 * (1 - ss7(minD, minD + 0.45, dens(nodes[0][0], nodes[0][1], nodes[0][2]))), segs = nodes.length - 1, toneL = shade * (0.8 + 0.4 * R4());
    for (let q = 0; q < n; q++) {
      const lat0 = n === 1 ? 0 : (q + R4()) / n * 2 - 1, up0 = R4(), ks = Math.min(segs, Math.max(2, Math.round(segs * (0.62 + 0.42 * R4())))), w0 = w * (0.7 + 0.6 * R4()), ph = R4() * 30, fq = 3 + R4() * 5, tf0 = 0.1 * R4(), tf1 = 0.35 + 0.35 * R4(), tone = toneL * (0.72 + 0.56 * R4()) * (R4() < 0.06 ? 1.7 : 1), base = rb.P.length / 3;
      for (let k = 0; k <= ks; k++) {
        const nd = nodes[k], u = k / ks, sp2 = clump > 0 ? 1 - clump * u : 1 - clump * u * 1.5, lat = lat0 * lockW * 0.5 * sp2 + wave * u * Math.sin(ph + u * fq), up = lockT * up0 * (0.4 + 0.6 * u) + 6e-4 * q / n, hw = Math.max(8e-5, w0 * 0.5 * (0.6 + 0.4 * ss7(0, 0.15, u)) * (1 - 0.72 * u ** 1.6)), fd = Math.max(tf0 + (1 - tf0) * ss7(tf1, 1, u), rootF * (1 - 0.7 * ss7(0, 0.5, u)));
        for (let j = -1; j <= 1; j += 2) {
          rb.P.push(nd[0] + nd[3] * (lat + j * hw) + nd[6] * up, nd[1] + nd[4] * (lat + j * hw) + nd[7] * up, nd[2] + nd[5] * (lat + j * hw) + nd[8] * up);
          const tl = lat0 * 0.55 + j * 0.22;
          let ax = nd[6] + nd[3] * tl, ay = nd[7] + nd[4] * tl, az = nd[8] + nd[5] * tl;
          const al = Math.hypot(ax, ay, az) || 1;
          NR2.push(ax / al, ay / al, az / al);
          const kc = tone * (0.34 + 0.66 * ss7(0, 0.42, u)) * (1 - 0.25 * (1 - up0));
          rb.C.push(kc, kc, kc);
          rb.F.push(fd);
        }
        if (k < ks) {
          const a = base + k * 2;
          rb.I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
    }
  };
  const fringe = (p, L, keep) => {
    const f3 = ss7(0, 0.05, (p[2] - cw[2]) / HK) * ss7(0.075, 0.045, Math.abs(p[0] - cw[0]) / HK);
    return R4() < keep ? L : L + (Math.min(L, 0.05 * HK * rr(0.6, 1.25)) - L) * f3;
  };
  const st = H2.style, nL = H2.none ? [0, 0, 0] : [[64, 84, 40], [40, 52, 22], [24, 24, 0], [12, 0, 0]][lod], nS = [[6, 5, 2], [4, 3, 2], [3, 2, 0], [2, 0, 0]][lod], segK = [1, 0.75, 0.5, 0.4][lod], wide = [1, 1.45, 2.3, 4.2][lod];
  const gv = { crop: 0.3, matted: 0.55, thin: 0.5, long: 0.66 }[st], lenK = st === "long" ? 2.4 : 1, minD = 0.35, wet = st === "crop" ? -0.25 : 0.55 + 0.25 * H2.mess, sw0 = 26e-4 * HK * wide;
  for (const p of roots(nL[0], 1, minD)) strands(guide(p, fringe(p, H2.len * rr(0.75, 1.1), 0), 3e-3, { segs: Math.max(3, Math.round(6 * segK * lenK)), grav: gv, mess: 0.25 * H2.mess }), { n: nS[0], lockW: 0.024 * HK * rr(0.8, 1.2), lockT: 3e-3, w: sw0 * 1.25, clump: wet * 0.5, wave: 12e-4, shade: 0.6 });
  for (const p of roots(nL[1], 2, minD)) strands(guide(p, fringe(p, H2.len * rr(0.6, 1.35), 0.1), 65e-4, { segs: Math.max(3, Math.round(7 * segK * lenK)), grav: gv * 1.1, mess: 0.5 * H2.mess }), { n: nS[1], lockW: 0.016 * HK * rr(0.7, 1.3), lockT: 4e-3, w: sw0, clump: wet, wave: 2e-3 * H2.mess, shade: 0.9 });
  for (const p of roots(nL[2], 3, minD + 0.1)) strands(guide(p, fringe(p, H2.len * rr(0.7, 1.6), 0.3), 9e-3, { segs: Math.max(3, Math.round(7 * segK * lenK)), grav: gv * rr(0.5, 1.2), mess: 1.1 * H2.mess }), { n: nS[2], lockW: 6e-3 * HK, lockT: 3e-3, w: sw0 * 0.8, clump: 0.3, wave: 4e-3 * H2.mess, shade: 1.15 });
  if (lod < 2 && ctx.F) {
    const F2 = ctx.F, drop = (lx3, ly2) => {
      const x = hc[0] + lx3 * HK, y = hc[1] + ly2 * HK;
      let z0 = hc[2] + 0.06 * HK, z1 = hc[2] + 0.15 * HK;
      if (dist(x, y, z1) < 0 || dist(x, y, z0) > 0) return null;
      for (let i = 0; i < 16; i++) {
        const z = (z0 + z1) / 2;
        if (dist(x, y, z) < 0) z0 = z;
        else z1 = z;
      }
      return [x, y, z1];
    };
    const hair = (p0, dir, L, w, lift, tone, segs = 3, hug = 1, f0 = 0) => {
      const p = p0.slice(), base = rb.P.length / 3, d = dir.slice();
      for (let k = 0; k <= segs; k++) {
        const u = k / segs, lk = 3e-4 + lift * u * u;
        nrm4(p[0], p[1], p[2], nA);
        const dd = dist(p[0], p[1], p[2]);
        if (hug || dd < lk) {
          p[0] += nA[0] * (lk - dd);
          p[1] += nA[1] * (lk - dd);
          p[2] += nA[2] * (lk - dd);
        }
        let sx = d[1] * nA[2] - d[2] * nA[1], sy = d[2] * nA[0] - d[0] * nA[2], sz = d[0] * nA[1] - d[1] * nA[0];
        const sl = Math.hypot(sx, sy, sz) || 1, hw = Math.max(6e-5, w * 0.5 * (1 - 0.6 * u ** 1.4));
        sx /= sl;
        sy /= sl;
        sz /= sl;
        for (let j = -1; j <= 1; j += 2) {
          rb.P.push(p[0] + sx * j * hw, p[1] + sy * j * hw, p[2] + sz * j * hw);
          NR2.push(nA[0], nA[1], nA[2]);
          const kc = tone * (0.6 + 0.4 * u);
          rb.C.push(kc, kc, kc);
          rb.F.push(f0 + (1 - f0) * ss7(0.25, 1, u));
        }
        if (k < segs) {
          const a = base + k * 2;
          rb.I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        p[0] += d[0] * L / segs;
        p[1] += d[1] * L / segs;
        p[2] += d[2] * L / segs;
      }
    };
    for (const s of [-1, 1]) {
      const nb2 = Math.round([180, 115][lod] * Math.min(1.3, H2.brow)), bw = [8e-4, 12e-4][lod] * HK;
      for (let i = 0; i < nb2; i++) {
        const u = (i + R4()) / nb2, ax = 0.01 + 0.046 * u, yb = EYE[1] + 0.0195 + 6e-3 * Math.sin(u * 2.4) - 7e-3 * u * u, hh = 52e-4 * H2.brow * (1 - 0.6 * u * u) * ss7(0, 0.12, u), p = drop(s * ax, yb + (R4() - 0.5) * 1.5 * hh);
        if (!p) continue;
        const th = 1 - 1.3 * u + (R4() - 0.5) * 0.7, c = Math.cos(th), sn = Math.sin(th);
        hair(p, [s * c, sn, -0.25 * c], 5e-3 * HK * (0.55 + 0.7 * R4()) * H2.brow ** 0.4, bw, 6e-4 + 8e-4 * R4(), 0.8 + 0.7 * R4(), 3, 1, 0.22 + 0.4 * R4());
      }
      const E = eyeSlit(F2, s), nl = [16, 9][lod], lw = [9e-4, 15e-4][lod] * HK;
      for (let i = 0; i < nl * 2; i++) {
        const lower = i >= nl, t = (i % nl + 0.5 + (R4() - 0.5) * 0.6) / nl * 2 - 1;
        if (lower && R4() < 0.45) continue;
        const e = Math.sqrt(Math.max(0, 1 - t * t * 0.92)), lx3 = E.c[0] + t * E.a * 0.94, ly2 = E.c[1] + (lower ? -1 : 1) * E.b * e * 1.04 + t * s * E.tilt * E.a, p = drop(lx3, ly2);
        if (!p) continue;
        hair(p, [s * (0.25 + 0.5 * t * s), lower ? -0.55 : 0.35, 0.8], (lower ? 3e-3 : 62e-4) * HK * (0.75 + 0.5 * R4()) * e, lower ? lw * 0.55 : lw, lower ? 6e-4 : 22e-4, 0.3, 2, 0);
      }
    }
  }
  if (rb.I.length) {
    const m = rb.mesh(), col = m.col, fade = m.fade;
    m.N = new Float32Array(NR2);
    out.push({ bucket: "hair", m, paint: (i, x, y, z, nx, ny, nz, o) => {
      const k = col[i * 3], n = 0.85 + 0.3 * fbm(x * 120 + seed, y * 30, z * 120, 2);
      o.c[0] = H2.col[0] * k * n;
      o.c[1] = H2.col[1] * k * n;
      o.c[2] = H2.col[2] * k * n;
      o.m[0] = fade[i];
      o.m[1] = cl5(1 - k);
    } });
  }
  return out;
}

