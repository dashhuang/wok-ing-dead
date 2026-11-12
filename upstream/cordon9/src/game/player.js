var EYE2 = 1.66;
var RAD = 0.34;
var WALK = 4.3;
var SPRINT = 6.5;
var ADS_SPEED = 2.5;
var GRAV = 15;
var JUMP = 4.7;
var spring2 = (k, c) => ({ x: 0, v: 0, k, c });
var stepS2 = (s, dt) => {
  s.v += (-s.k * s.x - s.c * s.v) * dt;
  s.x += s.v * dt;
  return s.x;
};
var CROUCH = 0.62;
var CROUCH_SPEED = 0.52;
var SLIDE_V = 8.4;
var SLIDE_MIN = 3;
var SLIDE_MAX = 1.15;
var SLIDE_CD = 0.55;
function createPlayer(G4, phys) {
  const BOUNDS2 = G4.world.bounds;
  const cam = G4.render.camera, P3 = {
    pos: new Vector3(),
    vel: new Vector3(),
    yaw: 0,
    pitch: 0,
    hp: 100,
    maxHp: 100,
    alive: true,
    onGround: true,
    sprinting: false,
    moving: 0,
    strafe: 0,
    bobPh: 0,
    bobAmp: 0,
    steps: 0,
    dYaw: 0,
    dPitch: 0,
    eye: new Vector3(),
    fwd: new Vector3(),
    deadT: 0,
    hurtT: 9,
    regenT: 0,
    stamina: 1,
    fov: 74,
    fovT: 74,
    onStep: null,
    onLand: null,
    kick: { p: spring2(120, 13), y: spring2(120, 13), r: spring2(90, 10) },
    recoilPitch: 0,
    recoilYaw: 0,
    shake: 0
  };
  const wish = new Vector3(), e = new Euler(0, 0, 0, "YXZ");
  Object.assign(P3, { crouch: 0, sliding: false, slideT: 0, slideCd: 0, slideK: 0, slideN: 0, onSlide: null });
  let slideX = 0, slideZ = 0, slideBlock = 0;
  P3.spawn = (x, z, yaw = 0) => {
    P3.pos.set(x, phys.groundY(x, z), z);
    P3.vel.set(0, 0, 0);
    P3.yaw = yaw;
    P3.pitch = 0;
    P3.hp = P3.maxHp;
    P3.alive = true;
    P3.deadT = 0;
    P3.hurtT = 9;
    P3.recoilPitch = P3.recoilYaw = 0;
    P3.stamina = 1;
    P3.fov = P3.fovT = 74;
    for (const k in P3.kick) {
      P3.kick[k].x = 0;
      P3.kick[k].v = 0;
    }
    P3.apply(0);
  };
  {
    const spawn0 = P3.spawn;
    P3.spawn = (x, z, yaw = 0) => {
      P3.crouch = 0;
      P3.sliding = false;
      P3.slideT = 0;
      P3.slideCd = 0;
      P3.slideK = 0;
      spawn0(x, z, yaw);
    };
  }
  P3.recoil = (pitch, yaw) => {
    P3.recoilPitch += pitch * 0.55;
    P3.recoilYaw += yaw * 0.55;
    P3.kick.p.v += pitch * 9;
    P3.kick.y.v += yaw * 9;
  };
  P3.damage = (amt, fromX, fromZ) => {
    if (!P3.alive) return false;
    P3.hp -= amt;
    P3.hurtT = 0;
    const dx = fromX - P3.pos.x, dz = fromZ - P3.pos.z, side2 = dx * Math.cos(P3.yaw) - dz * Math.sin(P3.yaw), ahead = -dx * Math.sin(P3.yaw) - dz * Math.cos(P3.yaw);
    P3.lastHitDir = Math.atan2(side2, ahead);
    P3.kick.p.v += 1.6;
    P3.kick.r.v += (side2 > 0 ? -1 : 1) * 2.2;
    P3.shake = Math.min(1, P3.shake + 0.6);
    if (P3.hp <= 0) {
      P3.hp = 0;
      P3.alive = false;
      P3.deadT = 0;
      P3.kick.r.v += 3;
    }
    return true;
  };
  P3.heal = (amt) => {
    P3.hp = Math.min(P3.maxHp, P3.hp + amt);
  };
  P3.update = (dt, inp) => {
    P3.hurtT += dt;
    P3.shake = Math.max(0, P3.shake - dt * 2.2);
    if (!P3.alive) {
      P3.deadT += dt;
      P3.vel.x *= Math.exp(-dt * 6);
      P3.vel.z *= Math.exp(-dt * 6);
      P3.pos.addScaledVector(P3.vel, dt);
      P3.dYaw = P3.dPitch = 0;
      P3.bobAmp = 0;
      P3.apply(dt);
      return;
    }
    const rp = P3.recoilPitch * Math.min(1, dt * 7), ry = P3.recoilYaw * Math.min(1, dt * 7);
    P3.recoilPitch -= rp;
    P3.recoilYaw -= ry;
    P3.dYaw = -inp.mx + ry;
    P3.dPitch = -inp.my + rp;
    P3.yaw += P3.dYaw;
    P3.pitch = Math.max(-1.45, Math.min(1.45, P3.pitch + P3.dPitch));
    const sn = Math.sin(P3.yaw), cs = Math.cos(P3.yaw);
    let f3 = inp.fwd, r = inp.right;
    const l = Math.hypot(f3, r);
    if (l > 1) {
      f3 /= l;
      r /= l;
    }
    P3.sprinting = !!inp.sprint && f3 > 0.5 && !inp.ads && P3.onGround && P3.stamina > 0.05;
    P3.stamina = Math.max(0, Math.min(1, P3.stamina + (P3.sprinting ? -dt / 7 : dt / 4)));
    P3.slideCd = Math.max(0, P3.slideCd - dt);
    if (!P3.sliding && inp.crouchPressed && P3.onGround && P3.slideCd <= 0 && P3.stamina > 0.12 && f3 > 0.3 && Math.hypot(P3.vel.x, P3.vel.z) > WALK * 1.02) {
      const sp0 = Math.hypot(P3.vel.x, P3.vel.z), v0 = Math.max(sp0 * 1.12, SLIDE_V);
      P3.sliding = true;
      P3.slideT = 0;
      P3.slideN++;
      P3.vel.x *= v0 / sp0;
      P3.vel.z *= v0 / sp0;
      P3.stamina = Math.max(0, P3.stamina - 0.14);
      P3.kick.p.v -= 1.2;
      if (P3.onSlide) P3.onSlide(v0);
    } else if (P3.sliding) {
      P3.slideT += dt;
      if (!P3.onGround || P3.slideT > SLIDE_MAX || Math.hypot(P3.vel.x, P3.vel.z) < SLIDE_MIN || inp.jump || inp.crouchPressed && P3.slideT > 0.25) {
        P3.sliding = false;
        P3.slideCd = SLIDE_CD;
      }
    }
    const crouching = !P3.sliding && !!inp.crouch && P3.onGround;
    if (P3.sliding || crouching) P3.sprinting = false;
    const top = (P3.sprinting ? SPRINT : inp.ads ? ADS_SPEED : WALK) * (inp.slow ? 0.6 : 1) * (f3 < -0.1 ? 0.8 : 1);
    wish.set((-sn * f3 + cs * r) * top, 0, (-cs * f3 - sn * r) * top);
    if (crouching) wish.multiplyScalar(CROUCH_SPEED);
    const svx = P3.vel.x, svz = P3.vel.z;
    const acc = P3.onGround ? l > 0.01 ? 13 : 10 : 2.2, k = 1 - Math.exp(-dt * acc);
    P3.vel.x += (wish.x - P3.vel.x) * k;
    P3.vel.z += (wish.z - P3.vel.z) * k;
    if (P3.sliding) {
      const sp1 = Math.hypot(svx, svz) || 1, dec = Math.max(0, sp1 * Math.exp(-dt * 0.55) - 2.6 * dt), turn = Math.min(1, dt * 1.6);
      let dx = svx / sp1, dz = svz / sp1;
      if (l > 0.01) {
        const wl = Math.hypot(wish.x, wish.z) || 1;
        dx += (wish.x / wl - dx) * turn;
        dz += (wish.z / wl - dz) * turn;
        const dl = Math.hypot(dx, dz) || 1;
        dx /= dl;
        dz /= dl;
      }
      P3.vel.x = dx * dec;
      P3.vel.z = dz * dec;
    }
    if (inp.jump && P3.onGround) {
      P3.vel.y = JUMP;
      P3.onGround = false;
    }
    P3.vel.y -= GRAV * dt;
    P3.pos.addScaledVector(P3.vel, dt);
    phys.moveCircle(P3.pos, RAD, "player", P3.pos.y, 1.75);
    P3.pos.x = Math.max(BOUNDS2.x0 + RAD, Math.min(BOUNDS2.x1 - RAD, P3.pos.x));
    P3.pos.z = Math.max(BOUNDS2.z0 + RAD, Math.min(BOUNDS2.z1 - RAD, P3.pos.z));
    if (P3.sliding) {
      const mv = Math.hypot(P3.pos.x - slideX, P3.pos.z - slideZ), want = Math.hypot(P3.vel.x, P3.vel.z) * dt;
      slideBlock = mv < want * 0.35 ? slideBlock + dt : 0;
      if (slideBlock > 0.1) {
        P3.sliding = false;
        P3.slideCd = SLIDE_CD;
        P3.vel.x *= 0.3;
        P3.vel.z *= 0.3;
        slideBlock = 0;
      }
    } else slideBlock = 0;
    slideX = P3.pos.x;
    slideZ = P3.pos.z;
    const gy = phys.groundY(P3.pos.x, P3.pos.z);
    if (P3.pos.y <= gy) {
      if (!P3.onGround) {
        if (P3.onLand) P3.onLand(-P3.vel.y);
        P3.kick.p.v += Math.min(3, -P3.vel.y * 0.35);
      }
      P3.pos.y = gy;
      P3.vel.y = 0;
      P3.onGround = true;
    } else if (P3.pos.y > gy + 0.02) P3.onGround = false;
    const sp2 = Math.hypot(P3.vel.x, P3.vel.z);
    P3.moving = sp2;
    P3.strafe = r;
    const tgtAmp = P3.onGround ? Math.min(1, sp2 / WALK) : 0;
    P3.bobAmp += (tgtAmp - P3.bobAmp) * Math.min(1, dt * 9);
    if (P3.onGround && sp2 > 0.4) {
      const prev = Math.floor(P3.bobPh / Math.PI + 0.5);
      P3.bobPh += dt * Math.PI * (1.15 + sp2 * 0.3);
      if (Math.floor(P3.bobPh / Math.PI + 0.5) !== prev) {
        P3.steps++;
        if (P3.onStep) P3.onStep(P3.sprinting, P3.steps);
      }
    }
    if (P3.hurtT > 6 && P3.hp < 40) P3.hp = Math.min(40, P3.hp + dt * 4);
    P3.fov += (P3.fovT - P3.fov) * Math.min(1, dt * 12);
    P3.crouch += ((P3.sliding || crouching ? 1 : 0) - P3.crouch) * Math.min(1, dt * (P3.sliding ? 16 : 10));
    P3.slideK += ((P3.sliding ? 1 : 0) - P3.slideK) * Math.min(1, dt * 12);
    if (P3.sliding) P3.bobAmp *= Math.exp(-dt * 20);
    P3.apply(dt);
  };
  P3.apply = (dt) => {
    for (const k in P3.kick) stepS2(P3.kick[k], dt);
    const amp = P3.bobAmp * (P3.sprinting ? 1.5 : 1), by = -Math.abs(Math.cos(P3.bobPh)) * 0.02 * amp + 0.01 * amp, bx3 = Math.sin(P3.bobPh) * 0.01 * amp;
    let eye = EYE2, roll2 = P3.kick.r.x * 0.03 + Math.sin(P3.bobPh) * 4e-3 * amp, pitch = P3.pitch + P3.kick.p.x * 0.02, yaw = P3.yaw + P3.kick.y.x * 0.02;
    eye -= CROUCH * P3.crouch + 0.07 * P3.slideK;
    roll2 -= 0.06 * P3.slideK;
    pitch += 0.018 * P3.slideK;
    if (P3.shake > 0) {
      const t = performance.now() * 0.04;
      pitch += Math.sin(t * 1.7) * 0.012 * P3.shake;
      roll2 += Math.sin(t * 2.3) * 0.014 * P3.shake;
    }
    if (!P3.alive) {
      const k = Math.min(1, P3.deadT / 0.9), s = k * k * (3 - 2 * k);
      eye = EYE2 - (EYE2 - 0.24) * s;
      roll2 += 1.25 * s;
      pitch = P3.pitch * (1 - s) + 0.1 * s;
    }
    const sn = Math.sin(P3.yaw), cs = Math.cos(P3.yaw);
    P3.eye.set(P3.pos.x + cs * bx3, P3.pos.y + eye + by, P3.pos.z - sn * bx3);
    cam.position.copy(P3.eye);
    cam.quaternion.setFromEuler(e.set(pitch, yaw, roll2));
    if (Math.abs(cam.fov - P3.fov) > 0.01) {
      cam.fov = P3.fov;
      cam.updateProjectionMatrix();
    }
    P3.fwd.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  };
  return P3;
}

