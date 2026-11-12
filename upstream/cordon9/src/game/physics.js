function createPhysics(W) {
  const NV = W.nav, CELL2 = NV.cell, NX0 = NV.x0, NX1 = NV.x1, NZ0 = NV.z0, NZ1 = NV.z1, GW = Math.round((NX1 - NX0) / CELL2), GH = Math.round((NZ1 - NZ0) / CELL2);
  const cols = W.colliders.filter((c) => c.h[0] > 1e-3 && c.c[1] > -0.5).map((c) => ({ ...c, cs: Math.cos(c.yaw), sn: Math.sin(c.yaw), r: Math.hypot(c.h[0], c.h[2]), y0: c.c[1] - c.h[1], y1: c.c[1] + c.h[1] }));
  const BK = 4, bk = /* @__PURE__ */ new Map(), key = (i, j) => i * 4096 + j;
  for (const c of cols) {
    const i0 = Math.floor((c.c[0] - c.r) / BK), i1 = Math.floor((c.c[0] + c.r) / BK), j0 = Math.floor((c.c[2] - c.r) / BK), j1 = Math.floor((c.c[2] + c.r) / BK);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = key(i + 64, j + 64);
      if (!bk.has(k)) bk.set(k, []);
      bk.get(k).push(c);
    }
  }
  const near = (x, z) => bk.get(key(Math.floor(x / BK) + 64, Math.floor(z / BK) + 64)) || [];
  const groundY2 = W.groundY, surfaceAt2 = W.surfaceAt;
  function moveCircle(p, rad, who = "player", feet = 0, head = 1.75) {
    let hit = false;
    for (let it = 0; it < 3; it++) {
      for (const c of near(p.x, p.z)) {
        if (c.bulletOnly || c.playerOnly && who !== "player" || c.y1 < feet + 0.32 || c.y0 > feet + head) continue;
        const dx = p.x - c.c[0], dz = p.z - c.c[2];
        if (Math.abs(dx) > c.r + rad || Math.abs(dz) > c.r + rad) continue;
        const lx3 = dx * c.cs - dz * c.sn, lz3 = dx * c.sn + dz * c.cs, qx = Math.max(-c.h[0], Math.min(c.h[0], lx3)), qz = Math.max(-c.h[2], Math.min(c.h[2], lz3));
        let ox = lx3 - qx, oz = lz3 - qz, d2 = ox * ox + oz * oz;
        if (d2 >= rad * rad) continue;
        let px2, pz2;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2), k = (rad - d) / d;
          px2 = ox * k;
          pz2 = oz * k;
        } else {
          const ex = c.h[0] - Math.abs(lx3), ez = c.h[2] - Math.abs(lz3);
          if (ex < ez) {
            px2 = (lx3 < 0 ? -1 : 1) * (ex + rad);
            pz2 = 0;
          } else {
            px2 = 0;
            pz2 = (lz3 < 0 ? -1 : 1) * (ez + rad);
          }
        }
        p.x += px2 * c.cs + pz2 * c.sn;
        p.z += -px2 * c.sn + pz2 * c.cs;
        hit = true;
      }
    }
    return hit;
  }
  const R4 = { t: 0, col: null, nx: 0, ny: 1, nz: 0, surface: "asphalt", x: 0, y: 0, z: 0 };
  function raycast(ox, oy, oz, dx, dy, dz, max = 120, who = "bullet") {
    let best = max, bc = null, bn = 0, bs = 1;
    const test = (c) => {
      if (who === "bullet" ? c.noBullet || c.soft || c.playerOnly : who === "walk" ? c.bulletOnly || c.playerOnly : c.bulletOnly || c.playerOnly || c.noBullet) return;
      const rx = ox - c.c[0], rz = oz - c.c[2], lox = rx * c.cs - rz * c.sn, loz = rx * c.sn + rz * c.cs, ldx = dx * c.cs - dz * c.sn, ldz = dx * c.sn + dz * c.cs, loy = oy - c.c[1];
      let t0 = 0, t1 = best, ax = -1, sg = 1;
      for (let a = 0; a < 3; a++) {
        const o = a === 0 ? lox : a === 1 ? loy : loz, dd = a === 0 ? ldx : a === 1 ? dy : ldz, h = c.h[a];
        if (Math.abs(dd) < 1e-9) {
          if (o < -h || o > h) return;
          continue;
        }
        let ta = (-h - o) / dd, tb = (h - o) / dd, s = -1;
        if (ta > tb) {
          const q = ta;
          ta = tb;
          tb = q;
          s = 1;
        }
        if (ta > t0) {
          t0 = ta;
          ax = a;
          sg = s;
        }
        if (tb < t1) t1 = tb;
        if (t0 > t1) return;
      }
      if (ax >= 0 && t0 < best) {
        best = t0;
        bc = c;
        bn = ax;
        bs = sg;
      }
    };
    const seen = /* @__PURE__ */ new Set(), steps = Math.ceil(Math.min(max, NV.ray || 80) / (BK * 0.5));
    for (let i = 0; i <= steps; i++) {
      const t = i * BK * 0.5;
      if (t > best + BK) break;
      const k = key(Math.floor((ox + dx * t) / BK) + 64, Math.floor((oz + dz * t) / BK) + 64);
      if (seen.has(k)) continue;
      seen.add(k);
      const arr = bk.get(k);
      if (arr) for (const c of arr) test(c);
    }
    if (dy < -1e-5) {
      const tg = W.rayGround(ox, oy, oz, dx, dy, dz, best);
      if (tg > 0 && tg < best) {
        R4.t = tg;
        R4.col = null;
        R4.nx = 0;
        R4.ny = 1;
        R4.nz = 0;
        R4.x = ox + dx * tg;
        R4.y = oy + dy * tg;
        R4.z = oz + dz * tg;
        R4.surface = surfaceAt2(R4.x, R4.z);
        return R4;
      }
    }
    if (!bc) return null;
    R4.t = best;
    R4.col = bc;
    R4.surface = bc.surface || "metal";
    R4.x = ox + dx * best;
    R4.y = oy + dy * best;
    R4.z = oz + dz * best;
    if (bn === 1) {
      R4.nx = 0;
      R4.ny = bs;
      R4.nz = 0;
    } else {
      const lx3 = bn === 0 ? bs : 0, lz3 = bn === 2 ? bs : 0;
      R4.nx = lx3 * bc.cs + lz3 * bc.sn;
      R4.ny = 0;
      R4.nz = -lx3 * bc.sn + lz3 * bc.cs;
    }
    return R4;
  }
  const los = (ax, ay, az, bx3, by, bz) => {
    const dx = bx3 - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz) || 1;
    const h = raycast(ax, ay, az, dx / l, dy / l, dz / l, l, "sight");
    return !h || h.t >= l - 0.05;
  };
  const blocked = new Uint8Array(GW * GH), dist = new Float32Array(GW * GH), INF = 1e9, queue = new Int32Array(GW * GH * 2);
  const cx = (i) => NX0 + (i + 0.5) * CELL2, cz = (j) => NZ0 + (j + 0.5) * CELL2, ci = (x) => Math.max(0, Math.min(GW - 1, Math.floor((x - NX0) / CELL2))), cj = (z) => Math.max(0, Math.min(GH - 1, Math.floor((z - NZ0) / CELL2)));
  const tmp2 = new Vector3();
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = cx(i), z = cz(j);
    let b = 0;
    const gy = NV.rel ? groundY2(x, z) : 0;
    for (const c of near(x, z)) {
      if (c.bulletOnly || c.playerOnly || c.noNav || c.y1 < gy + NV.lo || c.y0 > gy + NV.hi) continue;
      const dx = x - c.c[0], dz = z - c.c[2], lx3 = dx * c.cs - dz * c.sn, lz3 = dx * c.sn + dz * c.cs;
      if (Math.abs(lx3) < c.h[0] + 0.42 && Math.abs(lz3) < c.h[2] + 0.42) {
        b = 1;
        break;
      }
    }
    blocked[j * GW + i] = b;
  }
  {
    const comp = new Int32Array(GW * GH).fill(-1), st = [];
    let main = -1, mainN = 0, id = 0;
    const DI2 = [1, -1, 0, 0, 1, 1, -1, -1], DJ2 = [0, 0, 1, -1, 1, -1, 1, -1];
    for (let s = 0; s < GW * GH; s++) {
      if (blocked[s] || comp[s] >= 0) continue;
      let n = 0;
      st.length = 0;
      st.push(s);
      comp[s] = id;
      while (st.length) {
        const c = st.pop();
        n++;
        const i = c % GW, j = c / GW | 0;
        for (let k = 0; k < 8; k++) {
          const ni = i + DI2[k], nj = j + DJ2[k];
          if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
          const m = nj * GW + ni;
          if (blocked[m] || comp[m] >= 0) continue;
          if (k > 3 && (blocked[j * GW + ni] || blocked[nj * GW + i])) continue;
          comp[m] = id;
          st.push(m);
        }
      }
      if (n > mainN) {
        mainN = n;
        main = id;
      }
      id++;
    }
    for (let s = 0; s < GW * GH; s++) if (!blocked[s] && comp[s] !== main) blocked[s] = 2;
  }
  let lastCell = -1;
  const inq = new Uint8Array(GW * GH), QN = GW * GH + 1, DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
  function flow(px2, pz2, force = false) {
    const si = ci(px2), sj = cj(pz2), s = sj * GW + si;
    if (s === lastCell && !force) return;
    lastCell = s;
    dist.fill(INF);
    inq.fill(0);
    let qh = 0, qt = 0, cnt = 0;
    const seed = (n, d) => {
      dist[n] = d;
      if (!inq[n]) {
        queue[qt] = n;
        qt = (qt + 1) % QN;
        cnt++;
        inq[n] = 1;
      }
    };
    if (!blocked[s]) seed(s, 0);
    else {
      const y = groundY2(px2, pz2) + 0.42;
      let any = 0;
      for (let pass = 0; pass < 3 && !any; pass++) {
        const R5 = pass === 0 ? 4 : 8;
        for (let dj = -R5; dj <= R5; dj++) for (let di = -R5; di <= R5; di++) {
          const ni = si + di, nj = sj + dj;
          if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
          const n = nj * GW + ni;
          if (blocked[n]) continue;
          const tx = cx(ni) - px2, tz = cz(nj) - pz2, l = Math.hypot(tx, tz);
          if (pass < 2 && l > 1e-3 && raycast(px2, y, pz2, tx / l, 0, tz / l, l, "walk")) continue;
          seed(n, l / CELL2);
          any++;
        }
      }
      dist[s] = 0;
    }
    while (cnt > 0) {
      const c = queue[qh];
      qh = (qh + 1) % QN;
      cnt--;
      inq[c] = 0;
      const i = c % GW, j = c / GW | 0, d = dist[c];
      for (let k = 0; k < 8; k++) {
        const ni = i + DI[k], nj = j + DJ[k];
        if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
        const n = nj * GW + ni;
        if (blocked[n]) continue;
        if (k > 3 && (blocked[j * GW + ni] || blocked[nj * GW + i])) continue;
        const nd = d + (k > 3 ? 1.414 : 1);
        if (nd < dist[n] - 1e-4) {
          dist[n] = nd;
          if (!inq[n]) {
            queue[qt] = n;
            qt = (qt + 1) % QN;
            cnt++;
            inq[n] = 1;
          }
        }
      }
    }
  }
  function steer(x, z, out, look = 3) {
    let i = ci(x), j = cj(z), c = j * GW + i;
    if (blocked[c] || dist[c] >= INF) {
      let best = INF, bi = -1, bj = -1;
      const y = groundY2(x, z) + 0.42;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
        const n = nj * GW + ni;
        if (blocked[n] || dist[n] >= best) continue;
        const tx = cx(ni) - x, tz = cz(nj) - z, l = Math.hypot(tx, tz);
        if (l > 1e-3 && raycast(x, y, z, tx / l, 0, tz / l, l, "walk")) continue;
        best = dist[n];
        bi = ni;
        bj = nj;
      }
      if (bi < 0) return false;
      out.set(cx(bi), 0, cz(bj));
      return true;
    }
    for (let s = 0; s < look; s++) {
      let best = dist[j * GW + i], bi = i, bj = j;
      for (let k = 0; k < 8; k++) {
        const ni = i + [1, -1, 0, 0, 1, 1, -1, -1][k], nj = j + [0, 0, 1, -1, 1, -1, 1, -1][k];
        if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
        const n = nj * GW + ni;
        if (blocked[n]) continue;
        if (k > 3 && (blocked[j * GW + ni] || blocked[nj * GW + i])) continue;
        if (dist[n] < best) {
          best = dist[n];
          bi = ni;
          bj = nj;
        }
      }
      if (bi === i && bj === j) break;
      i = bi;
      j = bj;
    }
    out.set(cx(i), 0, cz(j));
    return true;
  }
  const free = (x, z) => !blocked[cj(z) * GW + ci(x)], pathDist = (x, z) => dist[cj(z) * GW + ci(x)] * CELL2;
  return { cols, groundY: groundY2, surfaceAt: surfaceAt2, moveCircle, raycast, los, flow, steer, free, pathDist, grid: { GW, GH, CELL: CELL2, blocked, dist, x0: NX0, z0: NZ0 } };
}

