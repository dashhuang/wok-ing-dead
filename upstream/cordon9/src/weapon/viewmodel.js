var VM_POSES = {
  hip: { p: [0.15, -0.132, -0.33], r: [0.06, 0.17, -0.06] },
  ads: { p: [0, -0.1042, -0.15], r: [0, 0, 0] },
  // y is overwritten with -RIFLE.sightY: sight axis exactly on the camera axis; the view camera narrows to adsViewFov so the window reads large
  sprint: { p: [0.06, -0.17, -0.27], r: [-0.25, 0.72, -0.3] },
  slide: { p: [0.115, -0.15, -0.31], r: [0.07, 0.2, -0.58] },
  // canted across the body, muzzle still forward: the rifle can be fired from a slide
  low: { p: [0.1, -0.34, -0.2], r: [-0.75, 0.25, -0.15] }
};
var VM_POSES_PISTOL = {
  hip: { p: [0.085, -0.066, -0.4], r: [0.04, 0.16, -0.1] },
  ads: { p: [0, -0.0258, -0.46], r: [0, 0, 0] },
  sprint: { p: [0.12, -0.13, -0.4], r: [-0.55, 0.35, -0.25] },
  slide: { p: [0.1, -0.085, -0.4], r: [0.05, 0.18, -0.5] },
  low: { p: [0.13, -0.36, -0.3], r: [-0.9, 0.2, -0.1] }
};
var spring = (k, c) => ({ x: 0, v: 0, k, c });
var stepS = (s, dt, target = 0) => {
  s.v += (-s.k * (s.x - target) - s.c * s.v) * dt;
  s.x += s.v * dt;
  return s.x;
};
function track(keys, t, out) {
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  let u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0;
  u = Math.max(0, Math.min(1, u));
  u = u * u * (3 - 2 * u);
  out[0] = a[1] + (b[1] - a[1]) * u;
  out[1] = a[2] + (b[2] - a[2]) * u;
  out[2] = a[3] + (b[3] - a[3]) * u;
  return out;
}
var Z3 = [0, 0, 0];
var R_AT_MAG = [0.016, -0.052, 0.162];
var R_OFF = [-0.14, -0.46, 0.3];
var R_AT_CH = [0.056, 0.068, 0.14];
var RELOAD_RIFLE = {
  dur: 2.45,
  durNoRack: 1.85,
  tOut: 0.5,
  tIn: 1.26,
  tRack: 1.66,
  tFill: 1.3,
  gunP: [[0, 0, 0, 0], [0.26, -0.01, 0.075, 0], [1.4, -0.01, 0.075, 0], [1.6, 0, 0.05, 0.02], [2, 0, 0.05, 0.02], [2.45, 0, 0, 0]],
  gunR: [[0, 0, 0, 0], [0.26, 0.4, 0.15, -0.55], [1.2, 0.4, 0.15, -0.55], [1.27, 0.46, 0.15, -0.52], [1.4, 0.4, 0.15, -0.55], [1.6, 0.3, -0.05, 0.7], [1.72, 0.3, -0.05, 0.7], [1.8, 0.34, -0.05, 0.72], [2, 0.3, -0.05, 0.7], [2.45, 0, 0, 0]],
  gunPn: [[0, 0, 0, 0], [0.26, -0.01, 0.075, 0], [1.4, -0.01, 0.075, 0], [1.85, 0, 0, 0]],
  gunRn: [[0, 0, 0, 0], [0.26, 0.4, 0.15, -0.55], [1.2, 0.4, 0.15, -0.55], [1.27, 0.46, 0.15, -0.52], [1.4, 0.4, 0.15, -0.55], [1.85, 0, 0, 0]],
  lhP: [[0, ...Z3], [0.2, ...Z3], [0.42, ...R_AT_MAG], [0.5, ...R_AT_MAG], [0.62, 0.016, -0.17, 0.15], [0.78, ...R_OFF], [0.98, ...R_OFF], [1.16, 0.016, -0.17, 0.15], [1.26, ...R_AT_MAG], [1.36, ...R_AT_MAG], [1.6, ...R_AT_CH], [1.66, ...R_AT_CH], [1.8, 0.056, 0.068, 0.207], [1.9, 0.04, 0.03, 0.2], [2.4, ...Z3]],
  lhR: [[0, ...Z3], [0.2, ...Z3], [0.42, -0.2, 0, 0.05], [1.36, -0.2, 0, 0.05], [1.6, 0, 0.2, 0.5], [1.9, 0, 0.2, 0.5], [2.4, ...Z3]],
  lhPn: [[0, ...Z3], [0.2, ...Z3], [0.42, ...R_AT_MAG], [0.5, ...R_AT_MAG], [0.62, 0.016, -0.17, 0.15], [0.78, ...R_OFF], [0.98, ...R_OFF], [1.16, 0.016, -0.17, 0.15], [1.26, ...R_AT_MAG], [1.36, ...R_AT_MAG], [1.8, ...Z3]],
  lhRn: [[0, ...Z3], [0.2, ...Z3], [0.42, -0.2, 0, 0.05], [1.36, -0.2, 0, 0.05], [1.8, ...Z3]],
  bolt: [[0, 0, 0, 0], [1.66, 0, 0, 0], [1.8, 1, 0, 0], [1.86, 0, 0, 0]],
  // timed cues [t, name, 'rack' = empty reload only]. Sound cues lead the visible contact by the onset time inside their buffer:
  // magOut clack +62 ms, magIn seat +60 ms, boltBack stop +160 ms, boltFwd slam +48 ms.
  ev: [[0.03, "rlStart"], [0.44, "magOut"], [0.5, "strip"], [0.64, "drop", "rack"], [0.86, "magGrab"], [1.2, "magIn"], [1.26, "seat"], [1.3, "fill"], [1.64, "boltBack", "rack"], [1.812, "boltFwd", "rack"], [1.86, "battery", "rack"]],
  tDrop: 0.64,
  tShow: 0.9,
  dropV: [-0.06, -1.2, 0.1]
  // an empty magazine is let go on the way down; a part-used one is kept
};
var P_AT_MAG = [0.03, -0.085, 0.262];
var P_OFF = [-0.16, -0.5, 0.36];
var RELOAD_PISTOL = {
  dur: 1.55,
  durNoRack: 1.55,
  tOut: 0.2,
  tIn: 0.9,
  tRack: 1.16,
  tFill: 0.95,
  gunP: [[0, 0, 0, 0], [0.2, -0.03, 0.105, 0.03], [1.02, -0.03, 0.105, 0.03], [1.55, 0, 0, 0]],
  gunR: [[0, 0, 0, 0], [0.2, 0.42, 0.22, -0.5], [0.86, 0.42, 0.22, -0.5], [0.92, 0.5, 0.22, -0.46], [1.02, 0.42, 0.22, -0.5], [1.55, 0, 0, 0]],
  lhP: [[0, ...P_OFF], [0.55, ...P_OFF], [0.8, 0.03, -0.2, 0.26], [0.9, ...P_AT_MAG], [1, ...P_AT_MAG], [1.3, ...P_OFF]],
  lhR: [[0, -0.25, 0, 0.1], [1.3, -0.25, 0, 0.1]],
  bolt: [[0, 1, 0, 0], [1.175, 1, 0, 0], [1.21, 0, 0, 0]],
  ev: [[0.02, "rlStart"], [0.16, "magOut"], [0.2, "strip"], [0.3, "drop"], [0.5, "magGrab"], [0.84, "magIn"], [0.9, "seat"], [0.95, "fill"], [1.176, "slide", "rack"], [1.21, "battery", "rack"]],
  tDrop: 0.3,
  tShow: 0.55,
  dropV: [0, -1.12, 0.28]
};
var BUMP = { strip: [0, 0.35, 0.4, -0.12], seat: [0, -0.5, -0.5, 0.2], boltBack: [0.2, 0, 0.6, 0], battery: [-0.3, 0.5, 0.3, 0] };
RELOAD_PISTOL.gunPn = RELOAD_PISTOL.gunP;
RELOAD_PISTOL.gunRn = RELOAD_PISTOL.gunR;
RELOAD_PISTOL.lhPn = RELOAD_PISTOL.lhP;
RELOAD_PISTOL.lhRn = RELOAD_PISTOL.lhR;
function createViewmodel(G4) {
  const R4 = G4.render, root = new Group();
  root.name = "viewmodel";
  const rifle = createRifle(G4, { layer: LAYER_VIEW }), pistol = createPistol(G4, { layer: LAYER_VIEW }), hands = createHands(G4, { layer: LAYER_VIEW });
  const gun = new Group();
  gun.name = "gun";
  root.add(gun);
  const lhPivot = new Vector3(...GRIPS.left.target), leftG = new Group();
  leftG.position.copy(lhPivot);
  hands.left.position.copy(lhPivot).multiplyScalar(-1);
  leftG.add(hands.left);
  gun.add(rifle.root, pistol.root, hands.right, leftG);
  root.traverse((o) => {
    o.layers.set(LAYER_VIEW);
    o.frustumCulled = false;
  });
  if (!R4.camera.parent) R4.scene.add(R4.camera);
  R4.camera.add(root);
  const DEF = {
    rifle: { poses: VM_POSES, rl: RELOAD_RIFLE, obj: rifle, muzzle: rifle.RIFLE.muzzle, eject: rifle.RIFLE.eject, travel: rifle.RIFLE.boltTravel, kick: [0.5, 0.95, 0.5, 0.5], kS: [400, 26, 300, 22], adsT: 0.17 },
    pistol: { poses: VM_POSES_PISTOL, rl: RELOAD_PISTOL, obj: pistol, muzzle: pistol.PISTOL.muzzle, eject: pistol.PISTOL.eject, travel: pistol.PISTOL.slideTravel, kick: [0.42, 2.4, 0.9, 0.9], kS: [330, 24, 240, 19], adsT: 0.13 }
  };
  VM_POSES.ads.p[1] = -rifle.RIFLE.sightY;
  const st = { weapon: "rifle", pose: "hip", ads: 0, sprint: 0, slide: 0, low: 0, recoil: 0, bolt: 0, t: 0, reloadT: -1, rack: true, lock: false, cycleT: 1, switchTo: null, manual: false };
  const S4 = { z: spring(400, 26), p: spring(300, 22), y: spring(220, 18), r: spring(220, 18), swx: spring(90, 16), swy: spring(90, 16), roll: spring(70, 13), land: spring(160, 15) };
  const a = new Vector3(), b = new Vector3(), qa = new Quaternion(), qb = new Quaternion(), e = new Euler(), v32 = [0, 0, 0], v3b = [0, 0, 0], off = new Vector3(), qo = new Quaternion();
  const magHome = { rifle: rifle.mag.position.clone(), pistol: pistol.mag.position.clone() };
  const magMid = {};
  for (const [k, m] of [["rifle", rifle.mag], ["pistol", pistol.mag]]) {
    const bb = new Box3(), b2 = new Box3();
    for (const me of m.children) {
      if (!me.geometry) continue;
      me.geometry.computeBoundingBox();
      me.updateMatrix();
      bb.union(b2.copy(me.geometry.boundingBox).applyMatrix4(me.matrix));
    }
    magMid[k] = bb.getCenter(new Vector3());
    magMid[k].size = bb.getSize(new Vector3());
  }
  const events = [];
  function showWeapon(name) {
    st.weapon = name;
    rifle.root.visible = name === "rifle";
    pistol.root.visible = name === "pistol";
    const d = DEF[name];
    S4.z.k = d.kS[0];
    S4.z.c = d.kS[1];
    S4.p.k = d.kS[2];
    S4.p.c = d.kS[3];
  }
  const setPose = (P3, out, q) => {
    out.set(...P3.p);
    q.setFromEuler(e.set(P3.r[0], P3.r[1], P3.r[2], "YXZ"));
  };
  const sm = (x) => x * x * (3 - 2 * x);
  let bobX = 0, bobY = 0, bobR = 0, breathe = 0;
  function apply() {
    const D = DEF[st.weapon], P3 = D.poses;
    setPose(P3[st.manual ? st.pose : "hip"] || P3.hip, a, qa);
    if (!st.manual && st.sprint > 0) {
      setPose(P3.sprint, b, qb);
      a.lerp(b, sm(st.sprint));
      qa.slerp(qb, sm(st.sprint));
    }
    if (!st.manual && st.slide > 0 && P3.slide) {
      setPose(P3.slide, b, qb);
      a.lerp(b, sm(st.slide));
      qa.slerp(qb, sm(st.slide));
    }
    if (st.ads > 0) {
      setPose(P3.ads, b, qb);
      a.lerp(b, sm(st.ads));
      qa.slerp(qb, sm(st.ads));
    }
    if (st.low > 0) {
      setPose(P3.low, b, qb);
      a.lerp(b, sm(st.low));
      qa.slerp(qb, sm(st.low));
    }
    gun.position.copy(a);
    gun.quaternion.copy(qa);
    const hipK = 1 - 0.82 * st.ads;
    gun.position.x += (S4.swx.x + bobX) * hipK;
    gun.position.y += (S4.swy.x + bobY) * hipK + S4.land.x + Math.sin(breathe) * 11e-4 * hipK;
    qo.setFromEuler(e.set(-S4.swy.x * 1.4 * hipK + Math.sin(breathe * 0.7) * 3e-3 * hipK, S4.swx.x * 1.6 * hipK, (S4.roll.x + bobR) * hipK, "YXZ"));
    gun.quaternion.premultiply(qo);
    let lhVis = st.weapon === "rifle", boltK = st.bolt;
    leftG.position.copy(lhPivot);
    leftG.quaternion.identity();
    D.obj.mag.position.copy(magHome[st.weapon]);
    D.obj.mag.visible = true;
    if (st.reloadT >= 0) {
      const RL = D.rl, t = st.reloadT, rk = st.rack;
      track(rk ? RL.gunP : RL.gunPn, t, v32);
      gun.translateX(v32[0]);
      gun.translateY(v32[1]);
      gun.translateZ(v32[2]);
      track(rk ? RL.gunR : RL.gunRn, t, v32);
      qo.setFromEuler(e.set(v32[0], v32[1], v32[2], "YXZ"));
      gun.quaternion.multiply(qo);
      track(rk ? RL.lhP : RL.lhPn, t, v32);
      leftG.position.set(lhPivot.x + v32[0], lhPivot.y + v32[1], lhPivot.z + v32[2]);
      track(rk ? RL.lhR : RL.lhRn, t, v3b);
      leftG.quaternion.setFromEuler(e.set(v3b[0], v3b[1], v3b[2], "YXZ"));
      lhVis = true;
      if (st.weapon === "rifle") {
        if (t > RL.tOut && t < RL.tIn) {
          const m = R_AT_MAG;
          D.obj.mag.position.set(magHome.rifle.x + v32[0] - m[0], magHome.rifle.y + v32[1] - m[1], magHome.rifle.z + v32[2] - m[2]);
          D.obj.mag.quaternion.copy(leftG.quaternion);
          qo.setFromEuler(e.set(-0.2, 0, 0.05)).invert();
          D.obj.mag.quaternion.multiply(qo);
        } else D.obj.mag.quaternion.identity();
      } else {
        D.obj.mag.quaternion.identity();
        if (t > RL.tOut && t < RL.tShow) {
          const ft = t - RL.tOut, d = 0.5 * 9 * ft * ft + 0.25 * ft;
          D.obj.mag.position.set(magHome.pistol.x, magHome.pistol.y - d * 0.97, magHome.pistol.z + d * 0.24);
        } else if (t >= RL.tShow && t < RL.tIn) {
          const m = P_AT_MAG;
          D.obj.mag.position.set(magHome.pistol.x + v32[0] - m[0], magHome.pistol.y + v32[1] - m[1], magHome.pistol.z + v32[2] - m[2]);
        }
        lhVis = t > 0.5 && t < 1.32;
      }
      if (t >= RL.tDrop && t < RL.tShow && (rk || st.weapon === "pistol") && !st.manual) D.obj.mag.visible = false;
      if (rk || st.weapon === "pistol") {
        track(RL.bolt, t, v32);
        if (st.weapon === "rifle" || st.lock) boltK = Math.max(boltK, v32[0]);
      }
    } else D.obj.mag.quaternion.identity();
    if (st.lock && st.reloadT < 0) boltK = 1;
    hands.left.visible = lhVis && st.low < 0.95;
    gun.translateZ(S4.z.x);
    gun.rotateX(S4.p.x);
    gun.rotateY(S4.y.x);
    gun.rotateZ(S4.r.x);
    if (st.weapon === "rifle") rifle.bolt.position.z = D.travel * boltK;
    else pistol.slide.position.z = D.travel * boltK;
  }
  function update(dt, inp = {}) {
    st.t += dt;
    const D = DEF[st.weapon], busy = st.reloadT >= 0 || st.switchTo;
    const adsT = inp.ads && !busy && !inp.sprint && !inp.lowered ? 1 : 0;
    st.ads += Math.max(-dt / D.adsT, Math.min(dt / D.adsT, adsT - st.ads));
    const spT = inp.sprint && !busy ? 1 : 0;
    st.sprint += Math.max(-dt / 0.2, Math.min(dt / 0.2, spT - st.sprint));
    st.slide += Math.max(-dt / 0.22, Math.min(dt / 0.12, (inp.slide ? 1 : 0) - st.slide));
    let lowT = inp.lowered ? 1 : 0;
    if (st.switchTo) {
      lowT = 1;
      if (st.low > 0.97) {
        showWeapon(st.switchTo);
        st.switchTo = null;
        st.lock = !!st.pendingLock;
        events.push("raised");
      }
    }
    st.low += Math.max(-dt / 0.26, Math.min(dt / 0.2, lowT - st.low));
    const idt = dt > 1e-5 ? 1 / dt : 0, cl8 = (x, m) => Math.max(-m, Math.min(m, x));
    stepS(S4.swx, dt, cl8(-(inp.dYaw || 0) * idt * 42e-4, 0.03));
    stepS(S4.swy, dt, cl8((inp.dPitch || 0) * idt * 42e-4, 0.025));
    stepS(S4.roll, dt, -(inp.strafe || 0) * 0.04 + cl8(-(inp.dYaw || 0) * idt * 0.02, 0.08));
    stepS(S4.z, dt);
    stepS(S4.p, dt);
    stepS(S4.y, dt);
    stepS(S4.r, dt);
    stepS(S4.land, dt);
    const amp = (inp.bobAmp || 0) * (1 + 1.3 * st.sprint), ph = inp.bobPh || 0;
    bobX = Math.sin(ph) * 52e-4 * amp;
    bobY = -Math.abs(Math.cos(ph)) * 46e-4 * amp + 23e-4 * amp;
    bobR = Math.sin(ph) * 0.014 * amp;
    breathe += dt * 1.25;
    if (st.cycleT < 1) {
      st.cycleT = Math.min(1, st.cycleT + dt / 0.075);
      st.bolt = st.cycleT < 0.35 ? st.cycleT / 0.35 : 1 - (st.cycleT - 0.35) / 0.65;
    } else st.bolt = 0;
    if (st.reloadT >= 0) {
      const RL = D.rl, t0 = st.reloadT, t1 = t0 + dt, dur = st.rack ? RL.dur : RL.durNoRack;
      st.reloadT = t1;
      for (const E of RL.ev) {
        if (!(t0 <= E[0] && t1 > E[0]) || E[2] && !st.rack) continue;
        events.push(E[1]);
        const B2 = BUMP[E[1]];
        if (B2) {
          const k = st.weapon === "pistol" ? 0.8 : 1;
          S4.z.v += B2[0] * k;
          S4.p.v += B2[1] * k;
          S4.r.v += B2[2] * k;
          S4.land.v += B2[3] * k;
        }
      }
      if (st.weapon === "pistol" && st.lock && t1 >= 1.21) st.lock = false;
      if (t1 >= dur) {
        st.reloadT = -1;
        st.lock = false;
        events.push("reloaded");
      }
    }
    apply();
  }
  const api = {
    root,
    gun,
    rifle,
    pistol,
    hands,
    state: st,
    apply,
    update,
    events,
    springs: S4,
    DEF,
    set(o) {
      Object.assign(st, o);
      st.manual = true;
      if (o.weapon) showWeapon(o.weapon);
      apply();
    },
    get weapon() {
      return st.weapon;
    },
    get busy() {
      return st.reloadT >= 0 || !!st.switchTo || st.low > 0.3;
    },
    get reloading() {
      return st.reloadT >= 0;
    },
    get reloadK() {
      if (st.reloadT < 0) return -1;
      const RL = DEF[st.weapon].rl;
      return Math.min(1, st.reloadT / (st.rack ? RL.dur : RL.durNoRack));
    },
    fire(adsK = st.ads, empty = false) {
      const D = DEF[st.weapon], k = 1 - 0.45 * adsK;
      S4.z.v += D.kick[0] * k;
      S4.p.v += D.kick[1] * k;
      S4.y.v += (Math.random() - 0.5) * D.kick[2] * k;
      S4.r.v += (Math.random() - 0.5) * D.kick[3] * k;
      st.cycleT = 0;
      if (empty && st.weapon === "pistol") st.lock = true;
    },
    reload(rack = true) {
      if (st.reloadT >= 0 || st.switchTo) return false;
      st.reloadT = 0;
      st.rack = rack || st.weapon === "pistol" && st.lock;
      return true;
    },
    cancelReload() {
      st.reloadT = -1;
    },
    switchTo(name, lock = false) {
      if (name === st.weapon && !st.switchTo) return false;
      st.reloadT = -1;
      st.switchTo = name;
      st.pendingLock = lock;
      return true;
    },
    land(v) {
      S4.land.v -= Math.min(0.6, v * 0.06);
    },
    reset(name = "rifle") {
      showWeapon(name);
      Object.assign(st, { ads: 0, sprint: 0, slide: 0, low: 1, reloadT: -1, lock: false, cycleT: 1, switchTo: null, manual: false });
      for (const k in S4) {
        S4[k].x = 0;
        S4[k].v = 0;
      }
      apply();
    },
    // world-pass position that lands on the same pixel as a weapon-space point drawn by the view camera
    worldPoint(local, out) {
      root.updateMatrixWorld(true);
      out.set(local[0], local[1], local[2]).applyMatrix4(gun.matrix);
      const k = Math.tan(R4.camera.fov * Math.PI / 360) / Math.tan((R4.viewCamera ? R4.viewCamera.fov : VIEW_FOV) * Math.PI / 360);
      out.x *= k;
      out.y *= k;
      return out.applyMatrix4(R4.camera.matrixWorld);
    },
    // where the magazine is right now, for the world pass: centre position, orientation, release velocity and the size ratio between the two passes
    magWorld(pos, quat, vel) {
      const m = DEF[st.weapon].obj.mag, c = magMid[st.weapon];
      a.copy(c).applyQuaternion(m.quaternion).add(m.position);
      api.worldPoint([a.x, a.y, a.z], pos);
      R4.camera.getWorldQuaternion(quat).multiply(gun.quaternion).multiply(m.quaternion);
      const dv = DEF[st.weapon].rl.dropV;
      R4.camera.getWorldQuaternion(qo).multiply(gun.quaternion);
      vel.set(dv[0], dv[1], dv[2]).applyQuaternion(qo);
      return Math.tan(R4.camera.fov * Math.PI / 360) / Math.tan((R4.viewCamera ? R4.viewCamera.fov : VIEW_FOV) * Math.PI / 360);
    },
    magMid,
    muzzle(out) {
      return api.worldPoint(DEF[st.weapon].muzzle, out);
    },
    eject(out) {
      return api.worldPoint(DEF[st.weapon].eject, out);
    },
    stats: { rifle: rifle.stats.total, pistol: pistol.stats.total, right: hands.stats.right.total, left: hands.stats.left.total }
  };
  showWeapon("rifle");
  apply();
  return api;
}

