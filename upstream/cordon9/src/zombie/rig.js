var V33 = Vector3;
var Q = Quaternion;
var PI4 = Math.PI;
var clamp3 = (x, a, b) => x < a ? a : x > b ? b : x;
var lerp3 = (a, b, t) => a + (b - a) * t;
var ss10 = (a, b, x) => {
  const t = clamp3((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
var _a = new V33();
var _b = new V33();
var _c = new V33();
var _d = new V33();
var _q2 = new Q();
var _q22 = new Q();
var _e2 = new Euler();
var YUP = new V33(0, 1, 0);
var Spring = class {
  constructor(k = 60, c = 9) {
    this.x = 0;
    this.v = 0;
    this.k = k;
    this.c = c;
  }
  step(dt, target = 0) {
    this.v += (-this.k * (this.x - target) - this.c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
  kick(v) {
    this.v += v;
  }
};
function createSkeleton(J) {
  const bones = BONES.map((n) => {
    const b = new Bone();
    b.name = n;
    return b;
  });
  BONES.forEach((n, i) => {
    const p = PARENT[n], j = J[n];
    if (p) {
      const pj = J[p];
      bones[i].position.set(j[0] - pj[0], j[1] - pj[1], j[2] - pj[2]);
      bones[BI[p]].add(bones[i]);
    } else bones[i].position.set(j[0], j[1], j[2]);
  });
  return bones;
}
function createRig(J, type = "walker", seed = 1) {
  const T3 = TYPES[type], root = new Group(), bones = createSkeleton(J);
  root.add(bones[0]);
  root.updateMatrixWorld(true);
  const skeleton = new Skeleton(bones), bn = Object.fromEntries(BONES.map((n, i) => [n, bones[i]]));
  let s0 = seed * 9301 + 49297;
  const rnd = () => {
    s0 = (s0 * 9301 + 49297) % 233280;
    return s0 / 233280;
  };
  const L1 = Math.hypot(J.shinL[0] - J.thighL[0], J.shinL[1] - J.thighL[1], J.shinL[2] - J.thighL[2]), L2 = Math.hypot(J.footL[0] - J.shinL[0], J.footL[1] - J.shinL[1], J.footL[2] - J.shinL[2]);
  const SOLE_TOE = 0.2, SOLE_HEEL = 0.091;
  const ankleY = J.footL[1], hipH = J.hips[1], restThigh = [-1, 1].map((s) => new V33((s > 0 ? J.shinL : J.shinR)[0] - (s > 0 ? J.thighL : J.thighR)[0], J.shinL[1] - J.thighL[1], J.shinL[2] - J.thighL[2]).normalize()), restShin = [-1, 1].map((s) => new V33((s > 0 ? J.footL : J.footR)[0] - (s > 0 ? J.shinL : J.shinR)[0], J.footL[1] - J.shinL[1], J.footL[2] - J.shinL[2]).normalize());
  const Z = {
    root,
    bones,
    bn,
    skeleton,
    type,
    T: T3,
    pos: new V33(),
    heading: 0,
    vel: new V33(),
    speed: T3.speed * (0.85 + 0.3 * rnd()),
    state: "walk",
    st: 0,
    hp: T3.hp,
    alive: true,
    lame: rnd() < 0.5 ? 1 : 0,
    limp: 0.35 + 0.5 * rnd(),
    phase: rnd() * 10,
    reach: rnd() < 0.5 ? 1 : 0,
    tilt: (rnd() - 0.5) * 0.5,
    stepHalf: 0.17 + 0.07 * rnd() + (type === "runner" ? 0.16 : 0),
    feet: [0, 1].map((i) => ({ side: i === 0 ? -1 : 1, w: new V33(), yaw: 0, sw: -1, from: new V33(), to: new V33(), cur: new V33(), T: 0.3, lift: 0.05, pitch: 0 })),
    sp: { pitch: new Spring(55, 7), roll: new Spring(55, 7), yaw: new Spring(45, 6), headYaw: new Spring(34, 5), headPitch: new Spring(34, 5), armL: new Spring(26, 3.2), armR: new Spring(26, 3.2), drop: new Spring(90, 12) },
    lookYaw: 0,
    lookPitch: 0,
    hipY: hipH,
    sway: 0,
    jaw: 0.15,
    kick: new V33(),
    fall: { dir: 1, pitch: 0, t: 0 },
    t: 0,
    prevVel: new V33(),
    moved: 0,
    lunge: 0,
    slideLog: null
  };
  const fwd = (h, out) => out.set(Math.sin(h), 0, Math.cos(h)), right = (h, out) => out.set(Math.cos(h), 0, -Math.sin(h));
  const toModel = (w, out) => {
    out.copy(w).sub(Z.pos);
    const c = Math.cos(-Z.heading), s = Math.sin(-Z.heading), x = out.x * c + out.z * s, z = -out.x * s + out.z * c;
    out.x = x;
    out.z = z;
    return out;
  };
  const home = (f3, out) => {
    right(Z.heading, _c);
    return out.copy(Z.pos).addScaledVector(_c, f3.side * (J.thighL[0] + 0.012));
  };
  Z.ground = null;
  const gnd = (x, z) => Z.ground ? Z.ground(x, z) : 0;
  Z.place = (x, z, heading = 0) => {
    Z.pos.set(x, gnd(x, z), z);
    Z.heading = heading;
    for (const f3 of Z.feet) {
      home(f3, f3.w);
      fwd(heading, _c);
      f3.w.addScaledVector(_c, f3.side * 0.06);
      f3.w.y = gnd(f3.w.x, f3.w.z);
      f3.cur.copy(f3.w);
      f3.yaw = heading;
      f3.sw = -1;
    }
    Z.apply(0);
    return Z;
  };
  const hq = new Q(), q1 = new Q(), q2 = new Q(), H2 = new V33(), Kn = new V33(), A = new V33(), dirD = new V33(), perp2 = new V33();
  function legIK(side2, ankle, footPitch, footYawLocal, kneeOut = 0) {
    const i = side2 > 0 ? 1 : 0, th = bn[side2 > 0 ? "thighL" : "thighR"], sh = bn[side2 > 0 ? "shinL" : "shinR"], ft = bn[side2 > 0 ? "footL" : "footR"], hips = bn.hips;
    hq.copy(hips.quaternion);
    H2.copy(th.position).applyQuaternion(hq).add(hips.position);
    A.copy(ankle);
    dirD.subVectors(A, H2);
    let dist = dirD.length();
    const maxR = (L1 + L2) * 0.998;
    if (dist > maxR) {
      dirD.multiplyScalar(maxR / dist);
      A.addVectors(H2, dirD);
      dist = maxR;
    }
    dist = Math.max(dist, Math.abs(L1 - L2) + 0.01);
    dirD.normalize();
    const cosA = clamp3((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    perp2.set(side2 * kneeOut, 0.15, 1).addScaledVector(dirD, -perp2.dot(dirD)).normalize();
    Kn.copy(H2).addScaledVector(dirD, L1 * cosA).addScaledVector(perp2, L1 * sinA);
    q1.setFromUnitVectors(restThigh[i], _a.subVectors(Kn, H2).normalize());
    q2.setFromUnitVectors(restShin[i], _a.subVectors(A, Kn).normalize());
    th.quaternion.copy(_q2.copy(hq).invert()).multiply(q1);
    sh.quaternion.copy(_q2.copy(q1).invert()).multiply(q2);
    _q22.setFromEuler(_e2.set(footPitch, footYawLocal, 0, "YXZ"));
    ft.quaternion.copy(_q2.copy(q2).invert()).multiply(_q22);
    return A;
  }
  Z.legIK = legIK;
  const OLD_ARM = [-1, 1].map((s) => new V33(s * 0.027, -0.27, -2e-3).normalize()), fixQ = [0, 1].map((i) => {
    const sf = i ? "L" : "R";
    return new Q().setFromUnitVectors(OLD_ARM[i], new V33(J["fore" + sf][0] - J["arm" + sf][0], J["fore" + sf][1] - J["arm" + sf][1], J["fore" + sf][2] - J["arm" + sf][2]).normalize());
  }), fixI = fixQ.map((q) => q.clone().invert());
  const restFix = () => {
    for (let i = 0; i < 2; i++) {
      const sf = i ? "L" : "R";
      bn["arm" + sf].quaternion.multiply(fixI[i]);
      for (const n of ["fore", "hand"]) {
        const b = bn[n + sf];
        b.quaternion.premultiply(fixQ[i]).multiply(fixI[i]);
      }
    }
  };
  const twistOf = (q, a, out) => {
    const d = q.x * a.x + q.y * a.y + q.z * a.z;
    out.set(a.x * d, a.y * d, a.z * d, q.w);
    const l = out.length();
    if (l < 1e-6) return out.identity();
    if (out.w < 0) {
      out.x = -out.x;
      out.y = -out.y;
      out.z = -out.z;
      out.w = -out.w;
    }
    return out.normalize();
  };
  const axis = (a, b) => new V33(J[b][0] - J[a][0], J[b][1] - J[a][1], J[b][2] - J[a][2]).normalize(), AX = {};
  for (const sf of ["L", "R"]) {
    AX["arm" + sf] = axis("arm" + sf, "fore" + sf);
    AX["fore" + sf] = axis("fore" + sf, "hand" + sf);
    AX["thigh" + sf] = axis("thigh" + sf, "shin" + sf);
  }
  const _tw = new Q(), IDQ = new Q(), hasHelpers = !!bn.elbowL;
  const helpers = () => {
    if (!hasHelpers) return;
    for (const sf of ["L", "R"]) {
      twistOf(bn["arm" + sf].quaternion, AX["arm" + sf], _tw);
      bn["armTw" + sf].quaternion.copy(bn["arm" + sf].quaternion).multiply(_tw.invert());
      twistOf(bn["thigh" + sf].quaternion, AX["thigh" + sf], _tw);
      bn["thighTw" + sf].quaternion.copy(bn["thigh" + sf].quaternion).multiply(_tw.invert());
      twistOf(bn["hand" + sf].quaternion, AX["fore" + sf], _tw);
      bn["foreTw" + sf].quaternion.copy(_tw);
      bn["elbow" + sf].quaternion.copy(IDQ).slerp(bn["fore" + sf].quaternion, 0.5);
      bn["knee" + sf].quaternion.copy(IDQ).slerp(bn["shin" + sf].quaternion, 0.5);
    }
  };
  Z.helpers = helpers;
  Z.apply = (dt) => {
    const S4 = Z.sp, t = Z.t, dying = Z.state === "dying" || Z.state === "dead", fl = Z.fall;
    root.position.copy(Z.pos);
    root.rotation.set(0, Z.heading, 0);
    const fm = Z.feet.map((f3) => toModel(f3.cur, new V33()));
    let hy = hipH - 0.025 - 0.012 * Math.abs(Math.sin(Z.phase * 2));
    const reachMax = (L1 + L2) * 0.985;
    for (const m of fm) {
      const dx = m.x - Math.sign(m.x) * J.thighL[0], dz = m.z, hd = Math.hypot(dx, dz), lim = Math.sqrt(Math.max(0.02, reachMax * reachMax - hd * hd)) + ankleY + m.y * 0.6 + (hipH - J.thighL[1]);
      if (lim < hy) hy = lim;
    }
    const stance = Z.feet[0].sw >= 0 ? 1 : Z.feet[1].sw >= 0 ? 0 : -1, lameDip = stance === Z.lame ? 0.035 * Z.limp : 0;
    const dropT = Z.state === "dying" ? fl.buckle : 0;
    hy -= lameDip + S4.drop.x + dropT;
    Z.hipY = dt > 0 ? lerp3(Z.hipY, hy, 1 - Math.exp(-dt * 14)) : hy;
    if (Z.hipY > hy + 4e-3) Z.hipY = hy + 4e-3;
    const swayT = stance >= 0 ? Z.feet[stance].side * 0.028 : 0;
    Z.sway = dt > 0 ? lerp3(Z.sway, swayT, 1 - Math.exp(-dt * 5)) : swayT;
    const hips = bn.hips;
    hips.position.set(Z.sway + fl.side * 0, Z.hipY, dying ? fl.hipZ : 0);
    const stepYaw = (fm[1].z - fm[0].z) * 0.5;
    _e2.set(0.06 + S4.pitch.x * 0.3 + (dying ? fl.hipPitch : 0), clamp3(stepYaw, -0.3, 0.3), -Z.sway * 2.2 + S4.roll.x * 0.3, "YXZ");
    hips.quaternion.setFromEuler(_e2);
    for (let i = 0; i < 2; i++) {
      const f3 = Z.feet[i], m = fm[i];
      m.y += ankleY;
      legIK(f3.side, m, f3.pitch, f3.yaw - Z.heading, 0.12);
    }
    if (dying && fl.legBlend > 0) {
      for (const [n, rx] of [["thighL", fl.thigh], ["thighR", fl.thigh * 0.6], ["shinL", fl.shin], ["shinR", fl.shin * 1.5]]) {
        _q2.setFromEuler(_e2.set(rx, 0, n.endsWith("L") ? 0.08 : -0.12));
        bn[n].quaternion.slerp(_q2, fl.legBlend);
      }
      for (const n of ["footL", "footR"]) {
        _q2.setFromEuler(_e2.set(0.7, 0, 0));
        bn[n].quaternion.slerp(_q2, fl.legBlend);
      }
    }
    const hunch = Z.T.hunch, br = Math.sin(t * 1.3 + Z.phase) * 0.02, lg = Z.lunge, pitchAdd = dying ? fl.spine : lg * 0.5;
    bn.spine.rotation.set(hunch * 0.55 + S4.pitch.x * 0.6 + pitchAdd * 0.5 + br, -stepYaw * 0.5 + S4.yaw.x * 0.5, S4.roll.x * 0.5 + Z.tilt * 0.15);
    bn.chest.rotation.set(hunch * 0.6 + S4.pitch.x * 0.6 + pitchAdd * 0.5 - br, -stepYaw * 0.9 + S4.yaw.x * 0.6, S4.roll.x * 0.6 + Z.tilt * 0.2);
    const tw = Math.pow(Math.max(0, Math.sin(t * 0.9 + Z.phase * 3)), 24) * 0.25;
    bn.neck.rotation.set(-hunch * 0.3 + S4.headPitch.x * 0.5 + (dying ? fl.head * 0.5 : 0), S4.headYaw.x * 0.5, Z.tilt * 0.4 + tw);
    bn.head.rotation.set(-hunch * 0.55 + S4.headPitch.x * 0.5 - S4.pitch.x * 0.5 - lg * 0.35 + (dying ? fl.head * 0.5 : 0), S4.headYaw.x * 0.5 + (dying ? fl.headYaw : 0), Z.tilt * 0.5 + S4.roll.x * -0.4 + tw);
    bn.jaw.rotation.set(Z.jaw + lg * 0.3 + (dying ? 0.25 : 0), 0, 0);
    const reachL = Z.reach ? 1 : 0.25, reachR = Z.reach ? 0.25 : 1, sw = Math.sin(Z.phase * 2) * 0.12;
    const armPose = (sfx, s, reach, spring3) => {
      const up = dying ? fl.arm * (s > 0 ? 1 : 0.55) : lerp3(reach * (1.05 + 0.1 * Math.sin(t * 0.7 + s)), 1.45, lg), lagX = spring3.x;
      bn["arm" + sfx].rotation.set(-up + lagX + (reach < 0.5 ? s * sw : 0) + (dying ? 0 : 0.1), 0, s * (0.1 + 0.22 * reach * (1 - lg) + (dying ? fl.armOut : 0)));
      bn["fore" + sfx].rotation.set(-(0.3 + 0.35 * (1 - reach) + Math.max(0, -lagX) * 0.6) * (1 - lg * 0.6) - (dying ? fl.elbow : 0), 0, 0);
      bn["hand" + sfx].rotation.set(0.25 * reach - lagX * 0.8, 0, s * 0.2);
    };
    armPose("L", 1, reachL, S4.armL);
    armPose("R", -1, reachR, S4.armR);
    restFix();
    if (dying) {
      root.rotation.set(fl.pitch * fl.dir, Z.heading, fl.rollZ, "YXZ");
      root.position.y = Z.pos.y + fl.rootY;
      fwd(Z.heading, _c);
      root.position.addScaledVector(_c, fl.rootZ);
    }
    helpers();
    root.updateMatrixWorld(true);
  };
  Z.update = (dt, target) => {
    Z.t += dt;
    Z.st += dt;
    const S4 = Z.sp;
    if (Z.state === "dying" || Z.state === "dead") {
      stepDeath(dt);
      for (const k in S4) S4[k].step(dt);
      Z.apply(dt);
      return;
    }
    let want = 0, dist = 1e9;
    if (target) {
      _a.subVectors(target, Z.pos);
      _a.y = 0;
      dist = _a.length();
      const th = Math.atan2(_a.x, _a.z);
      let dh = th - Z.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      Z.heading += clamp3(dh, -1, 1) * Math.min(1, dt * (Z.state === "lunge" ? 1 : 2.6));
      want = Z.speed;
      Z.lookYaw = clamp3(dh, -0.9, 0.9);
    }
    if (Z.state === "walk") {
      if (dist < 1.85 && target) {
        Z.state = "windup";
        Z.st = 0;
      }
      if (dist < 0.9) want = 0;
    } else if (Z.state === "windup") {
      want = Z.speed * 0.25;
      Z.lunge = lerp3(Z.lunge, -0.45, 1 - Math.exp(-dt * 12));
      if (Z.st > 0.28) {
        Z.state = "lunge";
        Z.st = 0;
        Z.hitDone = false;
      }
    } else if (Z.state === "lunge") {
      want = dist > 0.55 ? Z.speed + 1.7 * ss10(0, 0.08, Z.st) * (1 - ss10(0.2, 0.36, Z.st)) : 0;
      Z.lunge = lerp3(Z.lunge, 1, 1 - Math.exp(-dt * 16));
      if (Z.st > 0.42) {
        Z.state = "recover";
        Z.st = 0;
      }
    } else if (Z.state === "recover") {
      want = Z.speed * 0.3;
      Z.lunge = lerp3(Z.lunge, 0, 1 - Math.exp(-dt * 5));
      if (Z.st > 0.55) {
        Z.state = "walk";
        Z.st = 0;
      }
    } else if (Z.state === "stagger") {
      want = 0;
      if (Z.st > 0.45) {
        Z.state = "walk";
        Z.st = 0;
      }
    }
    if (Z.state === "walk") Z.lunge = lerp3(Z.lunge, 0, 1 - Math.exp(-dt * 6));
    const surge = 1 - 0.35 * Z.limp * (Z.feet[Z.lame].sw >= 0 ? 0 : 1) * (Z.feet[1 - Z.lame].sw >= 0 ? 0 : 1);
    fwd(Z.heading, _b);
    _a.copy(_b).multiplyScalar(want * surge).add(Z.kick);
    Z.kick.multiplyScalar(Math.exp(-dt * 5));
    Z.vel.lerp(_a, 1 - Math.exp(-dt * 7));
    Z.pos.addScaledVector(Z.vel, dt);
    const spd = Z.vel.length();
    Z.moved += spd * dt;
    Z.phase += dt * (1.2 + spd * 2.2);
    _c.subVectors(Z.vel, Z.prevVel).multiplyScalar(1 / Math.max(dt, 1e-4));
    Z.prevVel.copy(Z.vel);
    const aF = _c.dot(_b);
    right(Z.heading, _d);
    const aS = _c.dot(_d);
    S4.pitch.step(dt, clamp3(-aF * 0.035, -0.3, 0.3) + spd * 0.06);
    S4.roll.step(dt, clamp3(aS * 0.03, -0.25, 0.25));
    S4.yaw.step(dt, 0);
    S4.drop.step(dt, 0);
    S4.headYaw.step(dt, Z.lookYaw + Math.sin(Z.t * 0.6 + Z.phase) * 0.12);
    S4.headPitch.step(dt, Z.lookPitch + clamp3(aF * 0.03, -0.3, 0.3));
    S4.armL.step(dt, clamp3(aF * 0.05, -0.5, 0.5));
    S4.armR.step(dt, clamp3(aF * 0.05, -0.5, 0.5));
    Z.jaw = 0.14 + 0.1 * Math.sin(Z.t * 1.7 + Z.phase) + (Z.state === "lunge" ? 0.25 : 0);
    stepFeet(dt, spd);
    if (Z.ground) {
      const gy = Math.min(Z.feet[0].sw < 0 ? Z.feet[0].w.y : Z.feet[0].to.y, Z.feet[1].sw < 0 ? Z.feet[1].w.y : Z.feet[1].to.y) * 0.5 + gnd(Z.pos.x, Z.pos.z) * 0.5;
      Z.pos.y = lerp3(Z.pos.y, gy, 1 - Math.exp(-dt * 9));
    }
    Z.apply(dt);
  };
  function stepFeet(dt, spd) {
    const f0 = Z.feet[0], f1 = Z.feet[1], vdir = _a.copy(Z.vel);
    if (spd > 1e-3) vdir.multiplyScalar(1 / spd);
    else fwd(Z.heading, vdir);
    for (const f3 of Z.feet) {
      const other = f3 === f0 ? f1 : f0, lame = Z.feet.indexOf(f3) === Z.lame;
      if (f3.sw < 0) {
        home(f3, _b);
        _c.subVectors(_b, f3.w);
        _c.y = 0;
        const along = _c.dot(vdir), err = _c.length();
        let dy = f3.yaw - Z.heading;
        dy = Math.abs(Math.atan2(Math.sin(dy), Math.cos(dy)));
        const lim = Z.stepHalf * (lame ? 0.7 : 1), need = along > lim || err > lim * 1.35 || dy > 0.7 || spd < 0.05 && err > 0.07 && other.sw < 0 && Z.st > 0.25;
        const stretched = along > lim * 1.7 && other.sw > 0.35;
        if (need && other.sw < 0 || stretched) {
          f3.sw = 0;
          f3.from.copy(f3.w);
          f3.T = clamp3((lame ? 0.52 : 0.36) * (0.9 / Math.max(0.6, spd)), 0.16, 0.62);
          f3.lift = lame ? 0.022 : 0.05 + 0.03 * Math.min(1, spd);
        }
      }
      if (f3.sw >= 0) {
        f3.sw += dt / f3.T;
        const u = Math.min(1, f3.sw), e = u * u * (3 - 2 * u);
        home(f3, _b);
        _b.addScaledVector(vdir, Z.stepHalf * (lame ? 0.45 : 0.95) * Math.min(1, spd / 0.5 + 0.15)).addScaledVector(vdir, Math.min(0.32, spd * f3.T * (1 - u)));
        _b.y = gnd(_b.x, _b.z);
        f3.to.copy(_b);
        f3.cur.lerpVectors(f3.from, f3.to, e);
        const baseY = f3.cur.y;
        f3.cur.y = baseY + f3.lift * Math.sin(PI4 * u) * (lame ? 0.6 + 0.4 * u : 1);
        f3.pitch = lame ? 0.35 * Math.sin(PI4 * u) : lerp3(0.5, -0.22, u) * Math.sin(PI4 * Math.min(1, u * 1.15));
        {
          const sp2 = Math.sin(f3.pitch), needY = ankleY * (Math.cos(f3.pitch) - 1) + (sp2 > 0 ? SOLE_TOE * sp2 : -SOLE_HEEL * sp2);
          if (f3.cur.y < baseY + needY) f3.cur.y = baseY + needY;
        }
        let dy = Z.heading - f3.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        f3.yawT = f3.yaw + dy * e;
        if (u >= 1) {
          f3.sw = -1;
          f3.w.copy(f3.to);
          f3.cur.copy(f3.w);
          f3.yaw = Z.heading;
          f3.pitch = 0;
          Z.sp.drop.kick(lame ? 0.5 : 0.25);
          if (Z.onStep) Z.onStep(f3, lame);
        }
      } else {
        f3.cur.copy(f3.w);
        f3.pitch = 0;
      }
    }
  }
  Z.hit = (dir, zone = "torso", force = 1) => {
    const S4 = Z.sp;
    fwd(Z.heading, _b);
    right(Z.heading, _d);
    const f3 = dir.dot(_b), s = dir.dot(_d);
    S4.pitch.kick(f3 * 5.5 * force * (zone === "leg" ? -0.6 : 1));
    S4.roll.kick(-s * 4 * force);
    S4.yaw.kick((zone === "arm" ? 5 : 2) * s * force);
    S4.headPitch.kick(f3 * (zone === "head" ? 11 : 5) * force);
    S4.headYaw.kick(s * (zone === "head" ? 8 : 3) * force);
    S4.armL.kick(-f3 * 5 * force);
    S4.armR.kick(-f3 * 4 * force);
    Z.kick.addScaledVector(dir, 0.9 * force * (zone === "leg" ? 0.4 : 1));
    if (zone === "leg") {
      S4.drop.kick(1.6 * force);
      Z.limp = Math.min(1, Z.limp + 0.3);
    }
    if (Z.state === "walk" || Z.state === "windup") {
      Z.state = "stagger";
      Z.st = 0;
    }
  };
  Z.kill = (dir, zone = "torso") => {
    if (!Z.alive) return;
    Z.alive = false;
    fwd(Z.heading, _b);
    const f3 = dir ? dir.dot(_b) : -1;
    const fl = Z.fall;
    fl.dir = f3 < -0.2 && (zone === "head" || rnd() < 0.65) ? -1 : 1;
    fl.t = 0;
    fl.rollEnd = (rnd() - 0.5) * 0.5;
    fl.headYawEnd = (rnd() < 0.5 ? -1 : 1) * (0.5 + 0.5 * rnd());
    fl.armK = 0.6 + 0.8 * rnd();
    if (dir) Z.hit(dir, zone, 1.6);
    Z.state = "dying";
    Z.st = 0;
    Z.kick.multiplyScalar(0.4);
  };
  Object.assign(Z.fall, { buckle: 0, pitch: 0, rootY: 0, rootZ: 0, rollZ: 0, hipZ: 0, hipPitch: 0, spine: 0, head: 0, headYaw: 0, arm: 0.3, armOut: 0, elbow: 0, legBlend: 0, thigh: 0, shin: 0, side: 0 });
  function stepDeath(dt) {
    const fl = Z.fall;
    fl.t += dt;
    const t = fl.t, back = fl.dir < 0;
    Z.pos.addScaledVector(Z.kick, dt);
    Z.kick.multiplyScalar(Math.exp(-dt * 6));
    const bk = ss10(0.06, 0.52, t);
    fl.buckle = 0.4 * bk * bk * (1 - 0.92 * ss10(0.5, 1, t));
    const tp = clamp3((t - 0.34) / 0.62, 0, 1), fallK = tp * tp * (0.4 + 0.6 * tp);
    const bounce = t > 0.96 ? Math.exp(-(t - 0.96) * 9) * Math.sin((t - 0.96) * 30) * 0.045 : 0;
    fl.pitch = PI4 / 2 * Math.min(1, fallK) - bounce;
    fl.rootY = 0.1 * Math.sin(Math.min(fl.pitch, PI4 / 2)) + Math.max(0, bounce) * 0.3;
    fl.rootZ = back ? -0.12 * fallK : 0.05 * fallK;
    fl.rollZ = fl.rollEnd * fallK * 0.3;
    fl.hipZ = (back ? -0.1 : 0.06) * bk * (1 - fallK);
    fl.hipPitch = (back ? -0.3 : 0.35) * bk * (1 - fallK * 0.8);
    fl.spine = (back ? -0.5 : 0.55) * bk * (1 - fallK) + (back ? 0.12 : -0.2) * fallK;
    fl.head = (back ? -0.5 : 0.4) * ss10(0, 0.25, t) * (1 - fallK) + (back ? 0.25 : -0.3) * fallK;
    fl.headYaw = fl.headYawEnd * fallK;
    fl.legBlend = ss10(0.42, 0.95, t);
    fl.thigh = back ? -0.55 * (1 - ss10(0.9, 1.6, t)) - 0.05 : 0.1;
    fl.shin = back ? 0.9 * (1 - ss10(0.9, 1.6, t)) + 0.08 : 0.22;
    fl.arm = lerp3(0.35, back ? 0.25 : 2.3 * fl.armK, fallK) + (1 - fallK) * bk * 0.6;
    fl.armOut = (back ? 1 : 0.5) * fallK * fl.armK;
    fl.elbow = lerp3(0.2, back ? 0.5 : 0.9, fallK);
    if (t > 1.7 && Z.state !== "dead") {
      Z.state = "dead";
      if (Z.onDead) Z.onDead(Z);
    }
  }
  const baseSpeed = Z.speed;
  Z.revive = (hpK = 1, speedK = 1) => {
    Z.alive = true;
    Z.state = "walk";
    Z.st = 0;
    Z.hp = T3.hp * hpK;
    Z.speed = baseSpeed * speedK;
    Z.lunge = 0;
    Z.kick.set(0, 0, 0);
    Z.vel.set(0, 0, 0);
    Z.prevVel.set(0, 0, 0);
    Z.hitDone = false;
    Z.lookYaw = 0;
    Z.limp = Math.min(Z.limp, 0.85);
    for (const k in Z.sp) {
      Z.sp[k].x = 0;
      Z.sp[k].v = 0;
    }
    Object.assign(Z.fall, { t: 0, buckle: 0, pitch: 0, rootY: 0, rootZ: 0, rollZ: 0, hipZ: 0, hipPitch: 0, spine: 0, head: 0, headYaw: 0, arm: 0.3, armOut: 0, elbow: 0, legBlend: 0, thigh: 0, shin: 0, side: 0 });
    Z.hipY = hipH;
    return Z;
  };
  Z.bonePos = (name, out) => out.setFromMatrixPosition(bn[name].matrixWorld);
  return Z;
}

