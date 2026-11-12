var ROSTER = [["walker", 1], ["walker", 2], ["walker", 3], ["runner", 4], ["walker", 1], ["runner", 5], ["walker", 2], ["brute", 6], ["runner", 4], ["walker", 3], ["brute", 7], ["runner", 5], ["walker", 1], ["walker", 2], ["runner", 4], ["brute", 6]];
var DMG = { walker: 12, runner: 9, brute: 26 };
var SCORE = { walker: 100, runner: 150, brute: 300 };
var RADK = { walker: 1, runner: 0.92, brute: 1.25 };
var BODY_R = { walker: 0.3, runner: 0.28, brute: 0.38 };
var CAPS = [
  ["hips", "chest", 0.175, "torso"],
  ["chest", "neck", 0.16, "torso"],
  ["armL", "foreL", 0.062, "arm"],
  ["foreL", "handL", 0.055, "arm"],
  ["armR", "foreR", 0.062, "arm"],
  ["foreR", "handR", 0.055, "arm"],
  ["thighL", "shinL", 0.088, "leg"],
  ["shinL", "footL", 0.066, "leg"],
  ["thighR", "shinR", 0.088, "leg"],
  ["shinR", "footR", 0.066, "leg"]
];
function createHorde(G4, W, phys, { size = 16, lods = [0, 1, 2, 3] } = {}) {
  const scene = G4.render.scene, H2 = { list: [], alive: 0, onKill: null, onHurtPlayer: null, sfx: null, fx: null, stats: {} };
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), wp = new Vector3(), tgt = new Vector3(), rnd = Math.random;
  const t0 = performance.now();
  for (let i = 0; i < size; i++) {
    const [type, seed] = ROSTER[i % ROSTER.length], Z = createZombie(G4, { type, seed, lods });
    Z.ground = phys.groundY;
    Z.root.visible = false;
    Z.active = false;
    Z.id = i;
    Z.aiT = rnd() * 0.3;
    Z.voiceT = 2 + rnd() * 6;
    Z.stuckT = 0;
    Z.lastX = 0;
    Z.lastZ = 0;
    Z.direct = false;
    Z.corpseT = 0;
    Z.lod = -1;
    Z.rk = RADK[type];
    Z.bodyR = BODY_R[type];
    Z.onStep = () => {
      if (H2.sfx && Z.distP < 14) H2.sfx("zstep", Z, 0.5 + (type === "brute" ? 0.4 : 0));
    };
    Z.onDead = () => {
      Z.corpseT = 0;
      if (H2.fx) {
        Z.bonePos("hips", a);
        H2.fx.pool(a.x, a.z, type === "brute" ? 1.7 : 1.25);
      }
    };
    scene.add(Z.root);
    H2.list.push(Z);
  }
  H2.stats.buildMs = Math.round(performance.now() - t0);
  H2.stats.pool = size;
  H2.stats.tris = H2.list[0].lods.map((l) => l.stats.total);
  const LOD_D = G4.quality.name === "low" ? [2.6, 8, 18] : [4.2, 11, 24];
  const setLod = (Z, d) => {
    let l = d < LOD_D[0] ? 0 : d < LOD_D[1] ? 1 : d < LOD_D[2] ? 2 : 3;
    l = Math.min(l, Z.lods.length - 1);
    if (Z.lod >= 0 && l > Z.lod && d < LOD_D[Z.lod] * 1.12) l = Z.lod;
    if (l !== Z.lod) {
      Z.lod = l;
      Z.setLod(l);
    }
  };
  H2.spawn = (type, x, z, heading, hpK = 1, speedK = 1) => {
    let Z = H2.list.find((q) => !q.active && q.type === type);
    if (!Z) {
      let best = null;
      for (const q of H2.list) if (q.type === type && q.active && q.state === "dead" && (!best || q.corpseT > best.corpseT)) best = q;
      Z = best;
    }
    if (!Z) Z = H2.list.find((q) => !q.active) || null;
    if (!Z) return null;
    Z.revive(hpK, speedK);
    Z.place(x, z, heading);
    Z.active = true;
    Z.root.visible = true;
    Z.root.position.y = 0;
    Z.sink = 0;
    Z.stuckT = 0;
    Z.stuckN = 0;
    Z.noProg = 0;
    Z.progT = 0;
    Z.lastPd = 1e9;
    Z.bestPd = 1e9;
    Z.gainT = 0;
    Z.lastX = x;
    Z.lastZ = z;
    Z.lod = -1;
    Z.direct = false;
    Z.voiceT = 1 + rnd() * 5;
    Z.dmgK = 1;
    Z.failN = 0;
    Z.hitT = -99;
    return Z;
  };
  H2.relocate = (Z, P3) => {
    let best = null, bd = 1e9;
    for (const sp2 of W.spawns) {
      const dp = Math.hypot(sp2.p[0] - P3.pos.x, sp2.p[1] - P3.pos.z);
      if (dp < 10 || !phys.free(sp2.p[0], sp2.p[1])) continue;
      const pd = phys.pathDist(sp2.p[0], sp2.p[1]);
      if (pd < bd && pd < 1e8) {
        bd = pd;
        best = sp2;
      }
    }
    if (!best) return false;
    let rx = best.p[0] + (rnd() - 0.5), rz = best.p[1] + (rnd() - 0.5);
    if (!phys.free(rx, rz)) {
      rx = best.p[0];
      rz = best.p[1];
    }
    Z.place(rx, rz, Math.atan2(P3.pos.x - best.p[0], P3.pos.z - best.p[1]));
    Z.noProg = 0;
    Z.stuckN = 0;
    Z.lastPd = 1e9;
    Z.bestPd = 1e9;
    Z.gainT = 0;
    H2.stats.relocated = (H2.stats.relocated || 0) + 1;
    return true;
  };
  const _pd = new Vector3(0, 0, 1);
  H2.putDown = (Z) => {
    Z.hp = 0;
    Z.kill(_pd, "torso");
    Z.fallSnd = 0;
    H2.stats.putDown = (H2.stats.putDown || 0) + 1;
  };
  H2.clear = () => {
    for (const Z of H2.list) {
      Z.active = false;
      Z.root.visible = false;
    }
    H2.alive = 0;
  };
  H2.count = () => {
    let n = 0;
    for (const Z of H2.list) if (Z.active && Z.alive) n++;
    return n;
  };
  H2.free = (type) => H2.list.some((q) => q.type === type && (!q.active || q.state === "dead"));
  H2.update = (dt, P3, t) => {
    let alive = 0, near = 0;
    const px2 = P3.pos.x, pz2 = P3.pos.z;
    phys.flow(px2, pz2);
    for (const Z of H2.list) {
      if (!Z.active) continue;
      const dx = px2 - Z.pos.x, dz = pz2 - Z.pos.z, d = Math.hypot(dx, dz);
      Z.distP = d;
      setLod(Z, d);
      if (Z.state === "dead") {
        Z.corpseT += dt;
        if (Z.corpseT > 14) {
          Z.sink = (Z.sink || 0) + dt * 0.25;
          Z.root.position.y = Z.pos.y - Z.sink;
          if (Z.sink > 0.5) {
            Z.active = false;
            Z.root.visible = false;
          }
        }
        continue;
      }
      if (!Z.alive) {
        Z.update(dt, null);
        if (Z.fallSnd === 0 && Z.fall.t > 0.95) {
          Z.fallSnd = 1;
          if (H2.sfx) H2.sfx("bodyfall", Z, 0.9);
        }
        continue;
      }
      alive++;
      if (d < 12) near++;
      Z.aiT -= dt;
      if (Z.aiT <= 0) {
        Z.aiT = 0.18 + rnd() * 0.14;
        Z.direct = P3.alive && d < 10 && !phys.raycast(Z.pos.x, Z.pos.y + 0.42, Z.pos.z, dx / (d || 1), 0, dz / (d || 1), d, "walk");
      }
      if (!P3.alive) {
        tgt.set(Z.pos.x + Math.sin(Z.heading + Math.sin(t * 0.3 + Z.id) * 0.8) * 6, 0, Z.pos.z + Math.cos(Z.heading + Math.sin(t * 0.3 + Z.id) * 0.8) * 6);
        if (d < 1.6) tgt.set(px2, 0, pz2);
      } else if (Z.direct || Z.state === "lunge" || Z.state === "windup") tgt.set(px2, 0, pz2);
      else if (phys.steer(Z.pos.x, Z.pos.z, wp, 4)) {
        a.set(wp.x - Z.pos.x, 0, wp.z - Z.pos.z);
        const l = a.length();
        if (l > 0.05) tgt.set(Z.pos.x + a.x / l * 6, 0, Z.pos.z + a.z / l * 6);
        else tgt.set(px2, 0, pz2);
      } else tgt.set(px2, 0, pz2);
      const st0 = Z.state;
      Z.update(dt, tgt);
      if (Z.state === "windup" && st0 !== "windup" && H2.sfx) H2.sfx("snarl", Z, 1);
      phys.moveCircle(Z.pos, Z.bodyR, "zombie", Z.pos.y, 1.7);
      if (d < 0.5 + Z.bodyR && d > 1e-3) {
        const k = (0.5 + Z.bodyR - d) / d;
        Z.pos.x -= dx * k;
        Z.pos.z -= dz * k;
      }
      if (Z.state === "lunge" && !Z.hitDone && Z.st > 0.1 && P3.alive) {
        const fx = Math.sin(Z.heading), fz = Math.cos(Z.heading), ahead = (dx * fx + dz * fz) / (d || 1);
        if (d < 1.2 + Z.bodyR && ahead > 0.45 && Math.abs(P3.pos.y - Z.pos.y) < 1.2) {
          Z.hitDone = true;
          Z.hitT = t;
          if (H2.onHurtPlayer) H2.onHurtPlayer(Z, DMG[Z.type] * (Z.dmgK || 1));
        }
      }
      Z.voiceT -= dt;
      if (Z.voiceT <= 0) {
        Z.voiceT = 4 + rnd() * 7;
        if (H2.sfx && d < 26) H2.sfx("groan", Z, 0.8);
      }
      Z.stuckT += dt;
      if (Z.stuckT > 1) {
        const mv = Math.hypot(Z.pos.x - Z.lastX, Z.pos.z - Z.lastZ);
        Z.lastX = Z.pos.x;
        Z.lastZ = Z.pos.z;
        Z.stuckT = 0;
        const still = mv < 0.12 && (Z.state === "walk" ? d > 2.2 || !Z.direct : !Z.direct && t - (Z.hitT ?? -99) > 5);
        Z.stuckN = still ? (Z.stuckN || 0) + 1 : 0;
        if (Z.stuckN >= 4) {
          Z.stuckN = 0;
          if (phys.steer(Z.pos.x, Z.pos.z, wp, 2) && Math.hypot(wp.x - Z.pos.x, wp.z - Z.pos.z) > 0.2) {
            Z.place(wp.x, wp.z, Math.atan2(px2 - wp.x, pz2 - wp.z));
            H2.stats.unstuck = (H2.stats.unstuck || 0) + 1;
          } else H2.relocate(Z, P3);
        }
      }
      Z.gainT = (Z.gainT || 0) + dt;
      Z.progT = (Z.progT || 0) + dt;
      if (Z.progT > 4) {
        Z.progT = 0;
        const pd = phys.pathDist(Z.pos.x, Z.pos.z);
        if (pd < (Z.bestPd ?? 1e9) - 0.5) {
          Z.bestPd = pd;
          Z.gainT = 0;
        }
        Z.noProg = d > 3.5 && Z.state === "walk" && !(pd < (Z.lastPd ?? 1e9) - 0.5) ? (Z.noProg || 0) + 1 : 0;
        Z.lastPd = pd;
        if (Z.noProg >= 3 && (d > 16 || !phys.los(P3.eye.x, P3.eye.y, P3.eye.z, Z.pos.x, Z.pos.y + 1.2, Z.pos.z))) H2.relocate(Z, P3);
      }
    }
    const L = H2.list;
    for (let i = 0; i < L.length; i++) {
      const A = L[i];
      if (!A.active || !A.alive) continue;
      for (let j = i + 1; j < L.length; j++) {
        const B2 = L[j];
        if (!B2.active || !B2.alive) continue;
        const dx = B2.pos.x - A.pos.x, dz = B2.pos.z - A.pos.z, rr = A.bodyR + B2.bodyR, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2), k = (rr - d) / d * 0.5;
          A.pos.x -= dx * k;
          A.pos.z -= dz * k;
          B2.pos.x += dx * k;
          B2.pos.z += dz * k;
        }
      }
    }
    H2.alive = alive;
    H2.near = near;
  };
  const hit = { Z: null, t: 0, zone: "torso", x: 0, y: 0, z: 0 }, o = new Vector3(), dv = new Vector3(), ab = new Vector3(), ao = new Vector3();
  function raySeg(pa, pb, r) {
    ab.subVectors(pb, pa);
    ao.subVectors(o, pa);
    const A = 1, B2 = dv.dot(ab), C2 = ab.lengthSq(), D = dv.dot(ao), E = ab.dot(ao), den = A * C2 - B2 * B2;
    let s = den > 1e-9 ? (A * E - B2 * D) / den : 0;
    s = Math.max(0, Math.min(1, s));
    let tr = B2 * s - D;
    if (tr < 0) return -1;
    const qx = pa.x + ab.x * s - (o.x + dv.x * tr), qy = pa.y + ab.y * s - (o.y + dv.y * tr), qz = pa.z + ab.z * s - (o.z + dv.z * tr), d2 = qx * qx + qy * qy + qz * qz;
    if (d2 > r * r) return -1;
    return Math.max(0, tr - Math.sqrt(r * r - d2));
  }
  H2.raycast = (ox, oy, oz, dx, dy, dz, maxT) => {
    o.set(ox, oy, oz);
    dv.set(dx, dy, dz);
    let best = maxT, found = false;
    for (const Z of H2.list) {
      if (!Z.active || !Z.alive) continue;
      c.set(Z.pos.x - ox, Z.pos.y + 0.95 - oy, Z.pos.z - oz);
      const tc = c.dot(dv);
      if (tc < -1.3 || tc > best + 1.3) continue;
      if (c.lengthSq() - tc * tc > 1.3 * 1.3) continue;
      const k = Z.rk;
      Z.bonePos("neck", a);
      Z.bonePos("head", b);
      c.subVectors(b, a).normalize().multiplyScalar(0.105 * k).add(b);
      let t = raySeg(b, c, 0.118 * k);
      if (t >= 0 && t < best) {
        best = t;
        hit.Z = Z;
        hit.zone = "head";
        found = true;
      }
      for (const [na, nb2, r, zone] of CAPS) {
        Z.bonePos(na, a);
        Z.bonePos(nb2, b);
        t = raySeg(a, b, r * k);
        if (t >= 0 && t < best) {
          best = t;
          hit.Z = Z;
          hit.zone = zone;
          found = true;
        }
      }
    }
    if (!found) return null;
    hit.t = best;
    hit.x = ox + dx * best;
    hit.y = oy + dy * best;
    hit.z = oz + dz * best;
    return hit;
  };
  const res = { killed: false, zone: "torso", score: 0 };
  H2.damage = (Z, dmg, zone, dir, headK = 3) => {
    const mult = zone === "head" ? headK : zone === "arm" ? 0.6 : zone === "leg" ? 0.7 : 1;
    Z.hp -= dmg * mult;
    res.zone = zone;
    res.killed = false;
    res.score = 0;
    if (Z.hp <= 0) {
      Z.kill(dir, zone);
      Z.fallSnd = 0;
      res.killed = true;
      res.score = Math.round(SCORE[Z.type] * (zone === "head" ? 1.5 : 1));
      if (H2.sfx) H2.sfx("death", Z, 1);
      if (H2.onKill) H2.onKill(Z, zone, res.score);
    } else {
      Z.hit(dir, zone, Z.type === "brute" ? 0.45 : zone === "head" ? 1.2 : 0.9);
      if (H2.sfx && rnd() < 0.5) H2.sfx("hurt", Z, 0.7);
    }
    return res;
  };
  return H2;
}

