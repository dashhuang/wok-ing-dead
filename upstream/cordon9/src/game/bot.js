function createBot(Game, { skill = 1 } = {}) {
  const { P: P3, horde, S: S4, phys, vm, pickups, WEAPONS: WEAPONS2 } = Game, out = { dx: 0, dy: 0, fwd: 0, right: 0, sprint: false, jump: false, ads: false, fire: false, firePressed: false, reload: false, w1: false, w2: false, swap: false, uav: false };
  let strafe = 1, strafeT = 0, tapT = 0, t = 0, uavT = 4;
  const wrap2 = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const HOME = Game.W && Game.W.botHome || [1.2, 10];
  const B2 = (dt) => {
    t += dt;
    Object.assign(out, { dx: 0, dy: 0, fwd: 0, right: 0, sprint: false, jump: false, ads: false, fire: false, firePressed: false, reload: false, w1: false, w2: false, swap: false, uav: false });
    if (!P3.alive || S4.state !== "playing") return out;
    uavT -= dt;
    if (uavT <= 0 && S4.uavN > 0 && Game.drone && !Game.drone.up && horde.alive >= 2 && !B2.noFire) {
      out.uav = true;
      uavT = 4;
    }
    let best = null, bd = 1e9, close = 0;
    for (const Z of horde.list) {
      if (!Z.active || !Z.alive) continue;
      const d = Math.hypot(Z.pos.x - P3.pos.x, Z.pos.z - P3.pos.z);
      if (d < 4) close++;
      if (d < bd && d < 45 && phys.los(P3.eye.x, P3.eye.y, P3.eye.z, Z.pos.x, Z.pos.y + 1.3, Z.pos.z)) {
        bd = d;
        best = Z;
      }
    }
    const k = Game.input.sens * (P3.fov / 74);
    let aimErr = 9;
    if (best) {
      const tx = best.pos.x - P3.eye.x, ty = best.pos.y + (B2.aimHead ? 1.6 : 1.25) * (best.T ? best.T.h : 1) - P3.eye.y, tz = best.pos.z - P3.eye.z, yawT = Math.atan2(-tx, -tz), pitchT = Math.atan2(ty, Math.hypot(tx, tz));
      const dyaw = wrap2(yawT - P3.yaw), dpitch = pitchT - P3.pitch, rate = 7 * skill * dt, sy = Math.max(-rate, Math.min(rate, dyaw)), sp2 = Math.max(-rate, Math.min(rate, dpitch));
      out.dx = -sy / k;
      out.dy = -sp2 / k;
      aimErr = Math.hypot(dyaw - sy, dpitch - sp2);
      out.ads = bd > 7;
      const am2 = S4.ammo[S4.weapon];
      if (aimErr < 0.035 && am2.mag > 0) {
        if (WEAPONS2[S4.weapon].auto) out.fire = true;
        else {
          tapT -= dt;
          if (tapT <= 0) {
            out.fire = true;
            out.firePressed = true;
            tapT = 0.16;
          }
        }
      }
    }
    const am = S4.ammo[S4.weapon];
    if (am.mag === 0 && am.reserve > 0) out.reload = true;
    if (S4.weapon === "rifle" && am.mag === 0 && am.reserve <= 0) out.w2 = true;
    if (S4.weapon === "pistol" && S4.ammo.rifle.reserve + S4.ammo.rifle.mag > 0 && !close) out.w1 = true;
    strafeT -= dt;
    if (strafeT <= 0) {
      strafeT = 1.5 + Math.random() * 2;
      strafe = -strafe;
    }
    const want = pickups.find((p) => p.on && (p.kind === "med" && P3.hp < 60 || p.kind === "ammo" && S4.ammo.rifle.reserve < 90));
    if (bd < 5.5 || close) {
      out.fwd = -1;
      out.right = strafe * 0.6;
      out.sprint = false;
    } else if (want) {
      const yawT = Math.atan2(-(want.x - P3.pos.x), -(want.z - P3.pos.z)), rel = wrap2(yawT - P3.yaw);
      out.fwd = Math.cos(rel);
      out.right = -Math.sin(rel);
    } else if (Math.hypot(P3.pos.x - HOME[0], P3.pos.z - HOME[1]) > 6) {
      const yawT = Math.atan2(-(HOME[0] - P3.pos.x), -(HOME[1] - P3.pos.z)), rel = wrap2(yawT - P3.yaw);
      out.fwd = Math.cos(rel);
      out.right = -Math.sin(rel);
    }
    if (B2.noFire) {
      out.fire = false;
      out.firePressed = false;
      out.fwd = 0;
      out.right = 0;
      out.ads = false;
      out.w1 = out.w2 = false;
    }
    return out;
  };
  return B2;
}

