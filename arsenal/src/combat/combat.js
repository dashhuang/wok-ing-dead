// The weapon controller: input, ammunition, reloads, recoil and weapon handling, melee swings,
// thrown weapons, damage zones — and the context object the behaviours in behaviours.js work with.
// The firing range drives it, and so does the game (src/chinatown/armory.js): one controller,
// so a weapon handles the same in both. What differs is handed in on `lab`:
//   lab.makeTargets   the zombies it fires at (the range's own if absent)
//   lab.supply        where a reload gets its rounds: { can(W), take(W, want) -> rounds got }
//                     (absent: magazines fill from nowhere)
// and through setMods(): the run's seasonings for damage, rate of fire and reload speed.
//
// Scripting (also used by the automated checks):
//   __lab.combat.press("fire" | "alt") / release(...) / tap("fire", seconds)
//   __lab.combat.aim(yaw, pitch) / aimAt(zombieIndex) / reload()
import * as THREE from "three";
import { createFx, C, P, rand, srand, coneDir } from "../fx/core.js";
import { createEffects } from "../fx/effects.js";
import { createTargets } from "./targets.js";
import { createProjectiles } from "./projectiles.js";
import { BEHAVIOURS } from "./behaviours.js";
import { LEVELS } from "../data/weapons.js";
import { createRecoil } from "./recoil.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _a = V(),
  _b = V(),
  _c = V();
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.max(0, Math.min(1, k));

// melee swings as rotations of the whole view model about the eye: [pitch, yaw, roll] + [x, y, z] offset
// Wind-ups keep the hand a little out in front rather than beside the head: the arm is a real
// one now and a hand drawn right back lays its forearm across the picture.
const SWINGS = {
  light: [
    {
      from: { r: [0.3, -0.85, -0.5], p: [0.1, 0.05, 0] },
      to: { r: [-0.45, 0.95, 0.75], p: [-0.12, -0.05, -0.16] },
    },
    {
      from: { r: [0.15, 0.8, 0.9], p: [-0.2, 0.03, -0.06] },
      to: { r: [-0.4, -0.75, -0.55], p: [0.05, -0.05, -0.16] },
    },
    {
      from: { r: [0.85, 0.2, 0.25], p: [-0.1, 0.08, -0.06] },
      to: { r: [-0.85, 0.4, 0.3], p: [-0.2, -0.12, -0.26] },
    },
  ],
  heavy: [
    {
      from: { r: [0.2, -1.1, -0.35], p: [0.2, 0.05, 0.1] },
      to: { r: [-0.25, 1.15, 0.5], p: [-0.25, -0.05, -0.2] },
    },
    {
      from: { r: [0.15, 1.05, 0.65], p: [-0.45, 0.05, 0.1] },
      to: { r: [-0.25, -1.0, -0.35], p: [0.1, -0.05, -0.2] },
    },
  ],
  // 9: rising cut from the ground
  9: {
    from: { r: [-0.75, -0.3, -0.25], p: [0.05, -0.2, 0.1] },
    to: { r: [0.9, 0.25, 0.15], p: [-0.1, 0.2, -0.3] },
  },
};
const POSES = { drag: { r: [-0.34, -0.1, -0.62], p: [-0.08, -0.12, 0.05] } };

export async function createCombat(lab) {
  const { stage } = lab;
  const fx = createFx(stage);
  const E = createEffects(fx, stage);
  lab.fx = fx;
  fx.audio = lab.audio || null;
  const audio = lab.audio || null;
  lab.effects = E;
  // (the game supplies its own zombies here: see src/chinatown/armory.js)
  const targets = lab.makeTargets
    ? await lab.makeTargets(lab, fx, E)
    : await createTargets(lab, fx, E);
  const proj = createProjectiles(lab, fx, E, targets);
  const canvas = stage.renderer.domElement;

  let active = false;
  let W = null; // equipped weapon state
  const input = {
    fire: false,
    alt: false,
    fireEdge: false,
    altEdge: false,
    altUp: false,
    fireUp: false,
  };
  const zones = [];
  const lights = [null, null];
  const lightUsed = [false, false];
  // what a shot does to the weapon and the camera (data/feel.js)
  const recoil = createRecoil(stage);
  const view = {
    sx: 0,
    sy: 0,
    lastYaw: 0,
    lastPitch: 0,
    pose: null,
    poseK: 0,
    poseNow: 0,
  };
  // the camera leaning into a blade's swing: [pitch, yaw, roll]
  const lean = [0, 0, 0];
  let struck = 0; // zombies hurt since this was last zeroed (a swing counts what it cut)
  let shownSpread = 0.012;
  // spent: rounds (or units of fuel) fired since the last reset, less any handed back
  const meter = {
    window: [],
    total: 0,
    kills: 0,
    taken: 0,
    spent: 0,
    last: "",
  };
  // the run's seasonings as multipliers; 1 = none (see setMods)
  const mods = { damage: 1, rate: 1, reload: 1 };
  const mulOf = (level) => LEVELS[level - 1].dmg * mods.damage;
  // seconds a reload takes right now
  const reloadTime = () => (W.spec.reload || 0) / mods.reload;
  let thrown = null;
  let note = { text: "", until: 0 };
  let time = 0;

  targets.on("damage", (ev) => {
    if (ev.dmg > 0) {
      struck++;
      meter.window.push({ t: time, d: ev.dmg });
      meter.total += ev.dmg;
    }
    lab.ui && lab.ui.damage && lab.ui.damage(ev);
    if (W && W.beh.onDamage) W.beh.onDamage(ctx, ev);
  });
  targets.on("kill", () => meter.kills++);
  // The shooter is hurt. The game takes it from the player's health (lab.hurt); the range
  // has no health to take it from and counts it.
  function hurtShooter(dmg, from) {
    if (lab.hurt) return void lab.hurt(dmg, from);
    meter.taken += dmg;
    fx.shake(0.3);
    audio && audio.play("flesh", { gain: 1.1 });
    lab.ui && lab.ui.hurt && lab.ui.hurt(dmg);
  }
  targets.on("attack", (ev) => {
    meter.taken += ev.dmg;
    fx.shake(0.3);
    audio && audio.play("flesh", { gain: 1.1 });
    lab.ui && lab.ui.hurt && lab.ui.hurt(ev.dmg);
  });

  // ---------------------------------------------------------------- context handed to behaviours
  const aim = { origin: V(), dir: V(0, 0, -1) };
  const ctx = {
    lab,
    fx,
    E,
    targets,
    proj,
    aim,
    get b() {
      return W.branch;
    },
    get lv() {
      return W.level;
    },
    get cap() {
      return W.level >= 5 && W.branch !== "base";
    },
    get t() {
      return time;
    },
    get shots() {
      return W.shots;
    },
    get rounds() {
      return W.rounds;
    },
    get firing() {
      return W.firing;
    },
    /** True while the trigger is held (guns), unlike `firing` which is only set for streams. */
    get held() {
      return input.fire && W.reload < 0;
    },
    get charge() {
      return W.charge;
    },
    get zoomed() {
      return stage.zoom > 1.5;
    },
    get st() {
      return W.st;
    },
    /** World position of an anchor on the weapon (falls back to the muzzle, then to a point in front of the eye). */
    muzzle(name = "muzzle") {
      const an = W.model.anchors;
      const o = an[name] || an.muzzle || an.tip;
      if (!o) return aim.origin.clone().addScaledVector(aim.dir, 0.6);
      return o.getWorldPosition(V());
    },
    // (the aim opens up under sustained fire: data/feel.js `bloom`)
    spread(angle) {
      W.aimBase = angle;
      const bl = recoil.feel.bloom;
      const a = angle + (bl ? W.bloom * bl.add : 0);
      return a > 0 ? coneDir(aim.dir, a, V()) : aim.dir.clone();
    },
    /** Direction from a muzzle towards the point the crosshair is on (so streams converge on the aim point). */
    aimFrom(pos, range) {
      const zh = targets.raycast(aim.origin, aim.dir, range);
      const wh = stage.range.raycast(aim.origin, aim.dir, range);
      const d = Math.min(zh ? zh.dist : range, wh ? wh.dist : range);
      return V()
        .copy(aim.origin)
        .addScaledVector(aim.dir, Math.max(2, d))
        .sub(pos)
        .normalize();
    },
    world(origin, dir, max) {
      return stage.range.raycast(origin, dir, max);
    },
    angleTo(p) {
      return _a.subVectors(p, aim.origin).normalize().angleTo(aim.dir);
    },
    /**
     * Instant ray from the eye. Draws the tracer from the muzzle to wherever it ends.
     * { dir, range, pierce, ricochet, damage: n | (z) => n, headMul, forceHead, falloff: [start, end, min],
     *   knock, launch: n | (z, metres travelled) => n, stagger, element,
     *   tracer: {...} | false, impact: {...} | false, onHit(z, hit) }
     */
    hitscan(o) {
      const from = o.from || ctx.muzzle();
      let origin = aim.origin.clone();
      let dir = o.dir.clone();
      let left = o.range ?? 200;
      let pierce = o.pierce ?? 0;
      let bounce = o.ricochet ?? 0;
      const skip = new Set();
      const hits = [];
      let end = null;
      let segStart = from;
      const trace = (a, b) =>
        o.tracer !== false && E.tracer(a, b, o.tracer || {});
      for (let guard = 0; guard < 40; guard++) {
        const zh = targets.raycast(origin, dir, left, skip);
        const wh = stage.range.raycast(origin, dir, left);
        if (zh && (!wh || zh.dist < wh.dist)) {
          skip.add(zh.z);
          const travelled = (o.range ?? 200) - left + zh.dist;
          let dmg = typeof o.damage === "function" ? o.damage(zh.z) : o.damage;
          if (o.falloff)
            dmg *=
              1 -
              (1 - o.falloff[2]) *
                clamp01(
                  (travelled - o.falloff[0]) / (o.falloff[1] - o.falloff[0]),
                );
          const head = zh.head || !!o.forceHead;
          ctx.hit(zh.z, dmg, {
            dir: dir.clone(),
            point: zh.point,
            head,
            headMul: o.headMul,
            knock: o.knock,
            launch:
              typeof o.launch === "function"
                ? o.launch(zh.z, travelled)
                : o.launch,
            stagger: o.stagger,
            element: o.element,
          });
          hits.push(zh);
          o.onHit && o.onHit(zh.z, zh);
          if (pierce-- > 0) continue;
          end = zh.point;
          break;
        }
        if (wh) {
          end = wh.point;
          if (o.impact !== false) E.impact(wh, o.impact || {});
          if (bounce-- > 0) {
            trace(segStart, end);
            segStart = end.clone();
            left -= wh.dist;
            dir = dir
              .clone()
              .addScaledVector(wh.normal, -2 * dir.dot(wh.normal))
              .normalize();
            origin = end.clone().addScaledVector(wh.normal, 0.02);
            // a ricochet goes looking for the nearest head
            const z = targets.nearest(origin, 18, skip);
            if (z)
              dir
                .lerp(_a.subVectors(z.headPos, origin).normalize(), 0.75)
                .normalize();
            fx.glow({
              pos: end,
              life: 0.1,
              size: [0.1, 0.5],
              color: C(0xfff0c8, 6),
              type: P.STAR,
              fadePow: 1,
            });
            continue;
          }
          break;
        }
        end = origin.clone().addScaledVector(dir, left);
        break;
      }
      trace(segStart, end);
      return { end, hits };
    },
    /**
     * Damage a zombie with this weapon: level and seasoning scaling, head multiplier. Returns
     * true on a kill. (Statuses, reactions and the elemental seasonings are the targets' rules.)
     */
    hit(z, dmg, o = {}) {
      let d = dmg * W.mul;
      if (o.head) d *= o.headMul ?? 2.2;
      return targets.damage(z, d, o);
    },
    push(z, dir, knock) {
      targets.push(z, dir, knock);
    },
    /**
     * A blast reaches back to whoever set it off: `amount` standing at its centre, less
     * with distance, nothing at `radius` or with a wall in the way. Returns what was taken.
     */
    blowback(pos, radius, amount) {
      // (measured to the chest, as the game's own blasts are)
      const at = _c.copy(aim.origin);
      at.y -= 0.6;
      const d = at.distanceTo(pos);
      if (!(d < radius) || !(amount > 0)) return 0;
      if (d > 0.3) {
        const dir = _b.subVectors(at, pos).multiplyScalar(1 / d);
        const wall = stage.range.raycast(pos, dir, d);
        if (wall && wall.dist < d - 0.3) return 0;
      }
      const dmg = amount * (1 - d / radius);
      hurtShooter(dmg, pos.clone());
      return dmg;
    },
    /**
     * The weapon kicks: a is its strength, on the scale the weapon's numbers in data/feel.js
     * are written for (`ref`). From the trigger it knows which shot of the burst it is.
     */
    kick(a) {
      recoil.shot(a, W.inShot ? W.burst : 0);
      const bl = recoil.feel.bloom;
      if (bl && W.inShot) W.bloom = Math.min(1, W.bloom + bl.shot);
    },
    shake(a) {
      fx.shake(a);
    },
    /** A light that lives as long as it is asked for every frame (streams, charges). */
    light(pos, color, intensity, dist = 10, slot = 0) {
      if (!lights[slot]) lights[slot] = fx.hold(pos, color, intensity, dist);
      const l = lights[slot];
      if (!l) return;
      l.light.color.set(color);
      l.light.position.copy(pos);
      l.light.intensity = intensity;
      l.light.distance = dist;
      lightUsed[slot] = true;
    },
    /** Area that hurts for a while: { pos, radius, life, dps, status, every, element } */
    zone(o) {
      zones.push({ ...o, age: 0, acc: new Map(), next: 0 });
    },
    /** A sound from the shooter's hands. */
    sfx(name, o) {
      audio && audio.play(name, o);
    },
    /** A sound out in the street. */
    sfxAt(name, pos, o) {
      audio && audio.world(name, pos, o);
    },
    refund(n) {
      const to = Math.min(W.spec.mag, W.rounds + n);
      meter.spent -= to - W.rounds;
      W.rounds = to;
    },
    consume(n) {
      const to = Math.max(0, W.rounds - n);
      meter.spent += W.rounds - to;
      W.rounds = to;
    },
    cycleNow() {
      W.cycle = 0;
      W.shots++;
      W.shot = 0;
    },
    note(text) {
      note = { text, until: time + 0.8 };
    },
    setZoom(k) {
      stage.zoom = k;
    },
    setCharge(c) {
      W.charge = c;
    },
    swingNow(n, opts) {
      startSwing(n, opts);
    },
    pose(name, k = 1) {
      view.pose = name;
      view.poseK = k;
    },
    throwWeapon(o) {
      startThrow(o);
    },
  };

  // ---------------------------------------------------------------- equip
  function equip(model, def) {
    endThrow(true);
    for (let i = 0; i < lights.length; i++) {
      if (lights[i]) lights[i].release();
      lights[i] = null;
    }
    stage.zoom = 1;
    view.pose = null;
    recoil.use(def.id);
    const beh = BEHAVIOURS[def.id];
    const branch = lab.state.level >= 3 ? lab.state.branch : "base";
    const level = lab.state.level;
    const spec = beh.spec(branch, level);
    for (const g of Object.values(model.grips || {}))
      if (g) {
        g.mix = 0;
        g.away = 0;
        g.to = null;
      }
    if (lab.audio) lab.audio.cue("draw", 1, def.id);
    // melee weapons need the targets within arm's reach
    targets.setLayout(spec.kind === "melee" ? "near" : "far");
    W = {
      id: def.id,
      def,
      model,
      beh,
      spec,
      branch,
      level,
      mul: mulOf(level),
      rounds: spec.mag ?? 0,
      cooldown: 0.3,
      draw: 0,
      prev: { reload: -1, cycle: 1, swing: -1, charge: 0 },
      cycle: 1,
      cycleDur: 0.3,
      casingDone: true,
      shots: 0,
      shot: 9,
      burst: 0, // which shot of the burst the last one was
      inShot: false,
      bloom: 0, // 0..1 how far sustained fire has opened the aim
      aimBase: undefined, // the spread the weapon last fired with (rad)
      grip: null, // where the hand holds it, in the kick group's space
      gripN: 0,
      hitStop: 0, // seconds a cut that bit still hangs
      swingRate: 1,
      heat: 0,
      charge: 0,
      charging: false,
      reload: -1,
      regen: 0,
      swing: -1,
      swingN: 0,
      swingOpts: null,
      swingHit: false,
      combo: 0,
      comboT: 0,
      trail: null,
      firing: false,
      tickAcc: 0,
      trigger: 0,
      st: {},
    };
    api.weapon = W;
  }

  // ---------------------------------------------------------------- melee
  function startSwing(n, opts) {
    if (!W || W.swing >= 0 || thrown) return;
    W.swing = 0;
    audio &&
      audio.play("whoosh", {
        size: W.spec.heavy ? 1.7 : 1,
        gain: W.spec.heavy ? 0.9 : 0.6,
      });
    W.swingN = n;
    W.swingOpts = opts || null;
    W.swingHit = false;
    W.hitStop = 0;
    W.swingRate = 1;
    W.swingDur = (W.spec.swingTime || 0.5) / mods.rate;
    const tr = W.spec.trail || { color: C(0xffffff, 2) };
    W.trail = null;
    W.trailSpec = tr;
  }
  const swingSet = () =>
    W.swingN === 9
      ? SWINGS[9]
      : (W.spec.heavy ? SWINGS.heavy : SWINGS.light)[
          W.swingN % (W.spec.heavy ? 2 : 3)
        ];
  // which way the cut travels: -1, 0 or 1 about each of pitch, yaw and roll
  const swingDir = (i) => {
    const set = swingSet();
    return Math.sign(set.to.r[i] - set.from.r[i]);
  };
  function swingPose(k) {
    const set = swingSet();
    // wind-up 0–0.2, strike 0.2–0.5, recover 0.5–1
    let r, p, w;
    if (k < 0.2) {
      w = ease(k / 0.2);
      r = set.from.r.map((v) => v * w);
      p = set.from.p.map((v) => v * w);
    } else if (k < 0.5) {
      w = (k - 0.2) / 0.3;
      w = 1 - Math.pow(1 - w, 2.2);
      r = set.from.r.map((v, i) => v + (set.to.r[i] - v) * w);
      p = set.from.p.map((v, i) => v + (set.to.p[i] - v) * w);
    } else {
      w = 1 - ease((k - 0.5) / 0.5);
      r = set.to.r.map((v) => v * w);
      p = set.to.p.map((v) => v * w);
    }
    return { r, p };
  }

  // ---------------------------------------------------------------- thrown weapon (关刀 · 偃月)
  function startThrow(o) {
    if (thrown || !W) return;
    const model = W.model;
    const holder = model.holder;
    const pivot = new THREE.Group();
    stage.scene.add(pivot);
    const an = model.anchors.spin || model.anchors.base;
    stage.scene.updateMatrixWorld(true);
    const start = an.getWorldPosition(V());
    pivot.position.copy(start);
    pivot.attach(holder);
    // lay the weapon flat so it spins like a rotor: blade length along X, flat faces up and down
    holder.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(V(0, -1, 0), V(0, 0, 1), V(-1, 0, 0)),
    );
    pivot.updateMatrixWorld(true);
    holder.position.sub(pivot.worldToLocal(an.getWorldPosition(V())));
    const fwd = V(aim.dir.x, 0, aim.dir.z).normalize();
    const right = V()
      .crossVectors(fwd, V(0, 1, 0))
      .normalize();
    const rib = fx.ribbon({
      span: 0.2,
      width: 1.1,
      color: [0.12, 0.7, 0.45],
      core: [0.8, 1.6, 1.3],
      max: 36,
    });
    thrown = {
      o,
      pivot,
      model,
      start,
      fwd,
      right,
      age: 0,
      hitOut: new Set(),
      hitBack: new Set(),
      rib,
      origin: V(
        stage.eye.x + right.x * 0.35,
        1.15,
        stage.eye.z + right.z * 0.35,
      ),
    };
  }
  function endThrow(silent) {
    if (!thrown) return;
    const t = thrown;
    thrown = null;
    t.rib.release();
    stage.scene.remove(t.pivot);
    if (lab.model === t.model) stage.mount(t.model);
    if (!silent && t.o.onReturn) t.o.onReturn();
    else if (W) W.st.thrown = false;
  }
  function updateThrow(dt) {
    const t = thrown;
    t.age += dt;
    const dur = t.o.time || 1.5;
    const k = t.age / dur;
    if (k >= 1) return endThrow(false);
    const dist = (t.o.distance || 15) + (t.o.extra ? t.o.extra() : 0);
    const s = Math.sin(Math.PI * k);
    const side = Math.sin(Math.PI * 2 * k) * 2.4;
    const pos = t.pivot.position;
    pos
      .copy(t.origin)
      .addScaledVector(t.fwd, 0.6 + dist * s)
      .addScaledVector(t.right, side);
    pos.y = 1.15 + Math.sin(Math.PI * k) * 0.25;
    t.pivot.rotation.y -= dt * 26;
    t.rib.push(pos);
    const pass = k < 0.5 ? t.hitOut : t.hitBack;
    for (const h of targets.inSphere(pos, 1.35)) {
      if (pass.has(h.z)) continue;
      pass.add(h.z);
      t.o.onPass &&
        t.o.onPass(
          h.z,
          _a
            .copy(t.fwd)
            .multiplyScalar(k < 0.5 ? 1 : -1)
            .clone(),
        );
    }
    t.o.onTick && t.o.onTick(pos, dt);
  }

  // ---------------------------------------------------------------- per-frame
  function update(dt, t) {
    time = t;
    // aim ray from last frame's camera
    stage.camera.getWorldPosition(aim.origin);
    stage.camera.getWorldDirection(aim.dir);
    if (W && active) step(dt);
    proj.update(dt, t);
    targets.update(dt, t);
    if (thrown) updateThrow(dt);
    // zones
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      z.age += dt;
      if (z.age >= z.life) {
        zones.splice(i, 1);
        continue;
      }
      const status = z.age >= z.next;
      if (status) z.next = z.age + (z.every || 0.5);
      for (const h of targets.inSphere(V(z.pos.x, 1, z.pos.z), z.radius)) {
        const acc = (z.acc.get(h.z) || 0) + z.dps * dt;
        if (acc >= 4) {
          targets.damage(h.z, acc * (W ? W.mul : 1), {
            element: z.element,
            kind: "dot",
            noChain: true,
          });
          z.acc.set(h.z, 0);
        } else z.acc.set(h.z, acc);
        if (status && z.status) targets.apply(h.z, z.status);
      }
    }
    // stream lights die when nobody asked for them this frame
    for (let i = 0; i < lights.length; i++) {
      if (lights[i] && !lightUsed[i]) {
        lights[i].release();
        lights[i] = null;
      }
      lightUsed[i] = false;
    }
    // camera: the recoil, the lean into a blade's swing, and trauma shaking it
    recoil.update(dt);
    const M = W && active && W.swing >= 0 ? recoil.feel.melee : null;
    if (M && M.follow) {
      // strongest while the edge is travelling, gone by the time the weapon is back
      const b = Math.sin(Math.PI * clamp01((W.swing - 0.08) / 0.6)) ** 2;
      lean[0] = swingDir(0) * M.follow * 0.5 * b;
      lean[1] = swingDir(1) * M.follow * b;
      lean[2] = swingDir(2) * M.follow * 0.7 * b;
    } else for (let i = 0; i < 3; i++) lean[i] *= Math.exp(-12 * dt);
    const rc = recoil.cam;
    const tr = fx.trauma * fx.trauma;
    stage.kick.pitch =
      rc.p +
      lean[0] +
      tr * 0.03 * (Math.sin(t * 43.1) + 0.6 * Math.sin(t * 71.7 + 1.3));
    stage.kick.yaw =
      rc.y +
      lean[1] +
      tr * 0.03 * (Math.sin(t * 37.3 + 2.1) + 0.6 * Math.sin(t * 83.9));
    stage.kick.roll =
      rc.r +
      lean[2] +
      tr * 0.04 * (Math.sin(t * 29.7 + 0.7) + 0.5 * Math.sin(t * 61.3 + 4));
    stage.kick.fov = rc.fov;
    // what the crosshair shows: the spread the weapon last fired with, opened by its bloom
    const bl = recoil.feel.bloom;
    const want =
      W && active && W.spec.kind === "gun"
        ? Math.max(0.004, (W.aimBase ?? 0.012) + (bl ? W.bloom * bl.add : 0))
        : 0.02;
    shownSpread = want + (shownSpread - want) * Math.exp(-18 * dt);
    while (meter.window.length && time - meter.window[0].t > 5)
      meter.window.shift();
    input.fireEdge = input.altEdge = input.altUp = input.fireUp = false;
  }

  function step(dt) {
    const spec = W.spec;
    const beh = W.beh;
    W.shot += dt;
    W.cooldown -= dt;
    W.draw = Math.min(1, W.draw + dt / 0.34);
    W.heat = Math.max(0, W.heat - dt * 0.35);
    if (W.bloom > 0 && recoil.feel.bloom)
      W.bloom = Math.max(0, W.bloom - dt * recoil.feel.bloom.decay);
    W.trigger += ((input.fire ? 1 : 0) - W.trigger) * Math.min(1, dt * 30);
    if (W.cycle < 1) {
      const before = W.cycle;
      W.cycle = Math.min(1, W.cycle + dt / W.cycleDur);
      if (
        spec.casing &&
        !W.casingDone &&
        W.cycle >= (spec.casingAt || 0) &&
        before <= (spec.casingAt || 0) + 0.5
      ) {
        W.casingDone = true;
        const right = _a.set(1, 0, 0).applyQuaternion(stage.camera.quaternion);
        fx.casing(
          spec.casing,
          ctx.muzzle("eject"),
          V()
            .copy(right)
            .multiplyScalar(rand(1.6, 2.6))
            .add(V(srand(0.3), rand(1.4, 2.2), srand(0.3)))
            .addScaledVector(aim.dir, rand(-0.6, 0.2)),
        );
      }
    }
    // reload
    if (W.reload >= 0) {
      reloadSounds();
      W.reload += dt / Math.max(0.2, reloadTime());
      if (W.reload >= 1) {
        W.reload = -1;
        // the range fills the magazine from nowhere; a run has pools to draw on
        const want = spec.mag - W.rounds;
        W.rounds += lab.supply ? lab.supply.take(W, want) : want;
      }
    }
    if (spec.regen && W.rounds < spec.mag) {
      W.regen += dt;
      if (W.regen >= spec.regen) {
        W.regen = 0;
        W.rounds++;
      }
    }
    // a hot barrel keeps breathing smoke for a moment after powder shots
    if (
      spec.kind === "gun" &&
      !spec.smokeless &&
      W.heat > 0.2 &&
      W.shot > 0.09 &&
      W.shot < 1.7 &&
      Math.random() < dt * 26 * W.heat
    ) {
      fx.puff({
        pos: ctx.muzzle(),
        vel: V(srand(0.08), rand(0.22, 0.5), srand(0.08)).addScaledVector(
          aim.dir,
          rand(0.05, 0.3),
        ),
        life: rand(0.9, 1.7),
        size: [0.012, rand(0.07, 0.13)],
        color: [C(0xb8b2a8, 0.7), C(0x6a6660, 0.4)],
        alpha: 0.13,
        type: P.SMOKE,
        drag: 1.2,
        gravity: -0.18,
        spin: srand(1.5),
        turb: 0.5,
        fadeIn: 0.15,
      });
    }
    const busy = W.reload >= 0 || !!thrown;
    if (audio) {
      const kind =
        spec.kind === "stream"
          ? W.id === "arc"
            ? "arc"
            : W.branch === "a"
              ? "blueflame"
              : "flame"
          : null;
      if (kind !== W.loopKind) {
        if (W.loopKind) audio.loop(W.loopKind).stop();
        W.loopKind = kind;
      }
      if (kind) audio.loop(kind).set(W.wasFiring ? 1 : 0);
      audio
        .loop("charge")
        .set(W.charge > 0.02 ? 0.5 + 0.5 * W.charge : 0, 1 + W.charge * 1.3);
    }
    W.firing = false;
    if (beh.frame) beh.frame(ctx, dt);

    if (spec.kind === "gun" && !busy) {
      const cost = spec.cost || 1;
      if (spec.charge) {
        // hold to charge, release to fire
        if (input.fire && W.cooldown <= 0 && W.rounds >= cost) {
          W.charging = true;
          W.charge = Math.min(1, W.charge + (dt * mods.rate) / spec.charge);
          const m = ctx.muzzle("fuse");
          if (Math.random() < 50 * dt)
            fx.glow({
              pos: m,
              vel: V(srand(0.7), rand(0.2, 1.0), srand(0.7)),
              life: rand(0.12, 0.3),
              size: [0.0025, 0.001],
              color: [C(0xffe6a0, 8), C(0xff6a10, 2)],
              type: P.STREAK,
              stretch: 4,
              gravity: 4,
            });
          fx.glow({
            pos: m,
            life: 0.05,
            size: 0.012 + W.charge * 0.02,
            color: C(0xffb040, 3),
            type: P.GLOW,
            fadeIn: 0,
            fadePow: 0.4,
          });
          fx.shake(0.006 * W.charge);
        } else if (W.charging) {
          W.charging = false;
          shoot(cost);
          W.charge = 0;
        }
      } else if (input.fire && W.cooldown <= 0) {
        if (W.rounds >= cost) shoot(cost);
        else if (spec.reload > 0) startReload();
      }
    } else if (spec.kind === "stream" && !busy) {
      if (input.fire && W.rounds > 0) {
        W.firing = true;
        W.heat = Math.min(1, W.heat + dt * 0.9);
        const left = Math.max(0, W.rounds - spec.drain * dt);
        meter.spent += W.rounds - left;
        W.rounds = left;
        beh.stream(ctx, dt);
        W.tickAcc += dt * spec.tickRate * mods.rate;
        while (W.tickAcc >= 1) {
          W.tickAcc -= 1;
          beh.tick && beh.tick(ctx);
        }
        W.shot = 0;
        recoil.stream(dt);
      } else if (input.fire && W.rounds <= 0) startReload();
    } else if (spec.kind === "melee" && !busy) {
      W.comboT -= dt;
      if (input.fire && W.swing < 0 && !view.pose) {
        if (W.comboT <= 0) W.combo = 0;
        startSwing(W.combo % (spec.combo || 2));
        W.combo++;
      }
    }
    if (W.swing >= 0) {
      const before = W.swing;
      // a cut that bit hangs for a moment, then hurries out: the swing takes as long as ever
      if (W.hitStop > 0) {
        W.hitStop -= dt;
        W.swing += (dt / W.swingDur) * 0.08;
      } else W.swing += (dt / W.swingDur) * W.swingRate;
      const hitAt = spec.hitAt || 0.36;
      if (!W.swingHit && W.swing >= hitAt) {
        W.swingHit = true;
        W.shots++;
        W.shot = 0;
        struck = 0;
        beh.swing && beh.swing(ctx, W.swingN, W.swingOpts || {});
        const M = recoil.feel.melee;
        if (M && struck > 0) {
          const k = Math.min(1.5, 1 + 0.15 * (struck - 1));
          W.hitStop = M.stop * k;
          const lost = (W.hitStop * 0.92) / W.swingDur;
          const left = Math.max(0.05, 1 - W.swing);
          W.swingRate = left / Math.max(0.35 * left, left - lost);
          recoil.jolt({
            back: (M.back || 0) * k,
            roll: -swingDir(2) * (M.roll || 0) * k,
            pitch: swingDir(0) * (M.cam || 0) * 0.5 * k,
            camYaw: swingDir(1) * (M.cam || 0) * k,
            camRoll: swingDir(2) * (M.cam || 0) * 0.6 * k,
          });
        }
      }
      // blade trail while the edge is moving fast
      const an = W.model.anchors;
      if (W.swing > 0.18 && W.swing < 0.56 && an.base && an.tip) {
        if (!W.trail)
          W.trail = fx.ribbon({
            edge: true,
            span: 0.13,
            kind: "swipe",
            color: W.trailSpec.color,
            core: W.trailSpec.core,
            life: 0.16,
            max: 36,
          });
        // only the outer part of the blade leaves a trail
        an.tip.getWorldPosition(_b);
        an.base.getWorldPosition(_a).lerp(_b, 0.45);
        W.trail.push(_a, _b);
        if (W.trailSpec.kind === "fire" && Math.random() < 120 * dt)
          fx.glow({
            pos: _c.lerpVectors(_a, _b, rand(0.3, 1)),
            vel: V(srand(0.6), rand(0.4, 1.6), srand(0.6)),
            life: rand(0.25, 0.5),
            size: [0.08, rand(0.22, 0.4)],
            color: [E.PAL.fire.core, E.PAL.fire.end],
            alpha: 0.7,
            type: P.FLAME,
            gravity: -1.2,
          });
      } else if (W.trail && before <= 0.56 && W.swing >= 0.56) {
        W.trail.release();
        W.trail = null;
      }
      if (W.swing >= 1) {
        W.swing = -1;
        W.comboT = 0.45;
        if (W.trail) {
          W.trail.release();
          W.trail = null;
        }
      }
    }
    // secondary action
    if (beh.alt && !busy) {
      if (input.altEdge) beh.alt(ctx, "down", dt);
      if (input.alt) beh.alt(ctx, "hold", dt);
      if (input.altUp) beh.alt(ctx, "up", dt);
    }
    if (input.reloadEdge) {
      input.reloadEdge = false;
      startReload();
    }
    animateView(dt);
    W.wasFiring = W.firing;
    W.model.update(
      {
        t: time,
        shot: W.shot,
        shots: W.shots,
        cycle: W.cycle,
        trigger: W.trigger,
        firing: W.firing,
        heat: W.heat,
        charge: W.charge,
        rounds: Math.ceil(W.rounds),
        mag: spec.mag,
        reload: W.reload,
        reloadTime: reloadTime(),
        swing: W.swing,
        swingN: W.swingN, // which cut: 0, 1, 2 of the combo; 9 is the rising cut
        draw: W.draw,
        branch: W.branch,
        level: W.level,
        // last frame's values, so a weapon can tell when its animation passes a point,
        // and a way to make a sound at that moment (see README)
        prev: W.prev,
        cue,
      },
      dt,
    );
    W.prev.reload = W.reload;
    W.prev.cycle = W.cycle;
    W.prev.swing = W.swing;
    W.prev.charge = W.charge;
  }

  // mechanical sounds asked for by the weapon models (magazine out, bolt forward, ...)
  function cue(name, gain = 1) {
    if (lab.audio) lab.audio.cue(name, gain, W ? W.id : "");
  }

  function shoot(cost) {
    const spec = W.spec;
    const rpm = (W.beh.rpm ? W.beh.rpm(ctx) : spec.rpm) * mods.rate;
    // a burst is shots that follow one another without a real pause
    W.burst = W.shot > Math.max(0.3, 96 / rpm) ? 1 : W.burst + 1;
    W.inShot = true;
    try {
      W.beh.fire(ctx);
    } finally {
      W.inShot = false;
    }
    audio && audio.shot(W.id, W.branch);
    // the hands take the shot: fingers and wrists give a little
    lab.arms &&
      lab.arms.impulse &&
      lab.arms.impulse(Math.min(1, 0.25 + 0.3 * (W.spec.kick ?? 1)));
    W.rounds -= cost;
    meter.spent += cost;
    W.shots++;
    W.shot = 0;
    W.cooldown = 60 / rpm;
    W.cycle = 0;
    W.cycleDur = Math.min(60 / rpm, spec.cycle || 0.55);
    W.casingDone = false;
    W.heat = Math.min(1, W.heat + (spec.auto ? 0.06 : 0.25));
    if (W.rounds < cost && spec.reload > 0)
      fx.after(
        Math.min(0.5, 60 / rpm),
        () => W && W.rounds < cost && startReload(),
      );
  }
  function reloadSounds() {
    // weapons that animate their own reload make their own sounds
    if (!audio || W.model.ownReload || W.reload < 0) return;
    if (W.prev.reload < 0.12 && W.reload >= 0.12) audio.cue("magOut");
    if (W.prev.reload < 0.62 && W.reload >= 0.62) audio.cue("magIn");
  }
  function startReload() {
    if (!W || W.reload >= 0 || !(W.spec.reload > 0) || W.rounds >= W.spec.mag)
      return;
    if (lab.supply && !lab.supply.can(W)) {
      // nothing to load it with: the trigger falls on an empty weapon
      if (audio && input.fireEdge) audio.play("dry", { gap: 0.2 });
      return;
    }
    W.reload = 0;
    W.charge = 0;
    W.charging = false;
  }

  // Where the hand holds the weapon, in the kick group's space: what its recoil turns about.
  // (read for the first few frames after it is taken up, while nothing has kicked yet)
  const GRIP = V(0.14, -0.16, -0.32);
  function gripAt() {
    const k = stage.viewKick;
    if (W.grip && W.gripN >= 3) return W.grip;
    const g = W.model.grips && (W.model.grips.right || W.model.grips.left);
    if (!g || !g.anchor || W.model.holder.parent !== stage.viewPose)
      return W.grip || GRIP;
    W.gripN++;
    k.updateWorldMatrix(true, false);
    g.anchor.updateWorldMatrix(true, false);
    W.grip = k.worldToLocal(g.anchor.getWorldPosition(W.grip || V()));
    return W.grip;
  }

  function animateView(dt) {
    // sway: the weapon lags behind the look direction
    const dyaw = stage.look.yaw - view.lastYaw,
      dpitch = stage.look.pitch - view.lastPitch;
    view.lastYaw = stage.look.yaw;
    view.lastPitch = stage.look.pitch;
    view.sx +=
      (Math.max(-0.06, Math.min(0.06, dyaw * 1.4)) - view.sx) *
      Math.min(1, dt * 8);
    view.sy +=
      (Math.max(-0.06, Math.min(0.06, dpitch * 1.4)) - view.sy) *
      Math.min(1, dt * 8);
    const k = stage.viewKick;
    const breathe = Math.sin(time * 1.3);
    let px = view.sx * 0.25,
      py = breathe * 0.0025 - view.sy * 0.2,
      pz = 0;
    let rx = view.sy * 0.5,
      ry = view.sx * 0.6,
      rz = view.sx * -0.8 + Math.sin(time * 0.9) * 0.004;
    // reload: the weapon stays in view, canted over so the support hand can get at it, and
    // dips a little each time that hand comes back with a round or a magazine
    if (W.reload >= 0) {
      const r = clamp01(W.reload);
      const d = Math.min(1, Math.sin(Math.PI * r) * 2.2);
      let e = d * d * (3 - 2 * d);
      const own = W.model.view && W.model.view.reload;
      // span: [in by, out from, out by] as fractions of the reload, for a weapon that wants to be
      // level again before the hand is back on it
      if (own && own.span) {
        const [a, b, c = 1] = own.span;
        const up = clamp01(r / a),
          dn = clamp01((r - b) / (c - b));
        e = up * up * (3 - 2 * up) * (1 - dn * dn * (3 - 2 * dn));
      }
      if (own) {
        // the weapon says how it wants to be held while it is reloaded
        const p = own.pos || [0, 0, 0],
          q = own.rot || [0, 0, 0];
        px += p[0] * e;
        py += p[1] * e;
        pz += p[2] * e;
        rx += q[0] * e;
        ry += q[1] * e;
        rz += q[2] * e;
      } else {
        const beats = W.spec.beats || 1;
        const ph = (r * beats) % 1;
        const seat = W.model.ownReload
          ? 0
          : Math.exp(-(((ph - 0.62) / 0.07) ** 2)); // the moment the hand arrives
        px -= 0.035 * e;
        py -= 0.05 * e + 0.012 * seat * e;
        pz += 0.03 * e;
        rx += 0.2 * e - 0.03 * seat * e;
        ry += 0.14 * e;
        rz += 0.42 * e;
      }
    }
    // drawing the weapon: it comes up from below when equipped
    if (W.draw < 1) {
      const d = 1 - W.draw;
      const e = d * d;
      py -= 0.26 * e;
      rx -= 0.6 * e;
      rz += 0.3 * e;
    }
    // charging shakes the hands
    if (W.charge > 0) {
      px += srand(0.002) * W.charge;
      py += srand(0.002) * W.charge;
      pz += 0.03 * W.charge;
    }
    // zoomed in: bring the weapon to the eye line and out of the way
    if (stage.zoomNow > 1.05) {
      const z = clamp01((stage.zoomNow - 1) / 1.5);
      px -= 0.1 * z;
      py -= 0.05 * z;
    }
    view.poseNow +=
      ((view.pose ? view.poseK : 0) - view.poseNow) * Math.min(1, dt * 10);
    if (view.poseNow > 0.001) {
      const ps = POSES[view.pose] || POSES.drag;
      rx += ps.r[0] * view.poseNow;
      ry += ps.r[1] * view.poseNow;
      rz += ps.r[2] * view.poseNow;
      px += ps.p[0] * view.poseNow;
      py += ps.p[1] * view.poseNow;
      pz += ps.p[2] * view.poseNow;
    }
    if (W.swing >= 0) {
      const s = swingPose(W.swing);
      rx += s.r[0];
      ry += s.r[1];
      rz += s.r[2];
      px += s.p[0];
      py += s.p[1];
      pz += s.p[2];
    }
    const grip = gripAt();
    k.position.set(px, py, pz);
    k.rotation.set(rx, ry, rz, "YXZ");
    // the recoil goes on last, and turns the weapon about the hand rather than the eye
    recoil.apply(k, grip);
  }

  // ---------------------------------------------------------------- input
  let locked = false;
  const setLook = (dx, dy) => {
    const s = 0.0022 / stage.zoomNow;
    stage.look.yaw = Math.max(-1.25, Math.min(1.25, stage.look.yaw - dx * s));
    stage.look.pitch = Math.max(-0.7, Math.min(0.7, stage.look.pitch - dy * s));
  };
  canvas.addEventListener("mousedown", (e) => {
    if (!active) return;
    if (!locked && canvas.requestPointerLock) {
      try {
        const r = canvas.requestPointerLock();
        if (r && r.catch) r.catch(() => {});
      } catch {}
    }
    if (e.button === 0) {
      input.fire = true;
      input.fireEdge = true;
    } else if (e.button === 2) {
      input.alt = true;
      input.altEdge = true;
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      if (input.fire) input.fireUp = true;
      input.fire = false;
    } else if (e.button === 2) {
      if (input.alt) input.altUp = true;
      input.alt = false;
    }
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === canvas;
    lab.emit();
  });
  window.addEventListener("mousemove", (e) => {
    if (!active) return;
    if (locked) setLook(e.movementX, e.movementY);
    else if (e.target === canvas) {
      // no pointer lock (embedded views): aim follows the cursor
      const r = canvas.getBoundingClientRect();
      stage.look.yaw = -((e.clientX - r.left) / r.width - 0.5) * 1.3;
      stage.look.pitch = -((e.clientY - r.top) / r.height - 0.5) * 0.8;
    }
  });
  window.addEventListener("keydown", (e) => {
    if (!active || e.repeat) return;
    if (e.code === "KeyR") input.reloadEdge = true;
  });

  const api = {
    fx,
    effects: E,
    targets,
    projectiles: proj,
    weapon: null,
    meter,
    recoil,
    /** A blast reaching back to the shooter (see ctx.blowback): for scripts and checks. */
    blowback: (pos, radius, amount) => ctx.blowback(pos, radius, amount),
    /** The spread the crosshair should show (rad): the weapon's own, opened by sustained fire. */
    get spread() {
      return shownSpread;
    },
    get mods() {
      return mods;
    },
    /**
     * The run's seasonings, as multipliers on every weapon: { damage, rate, reload }.
     * rate speeds up shots, stream ticks, melee swings and charging; reload shortens reloads.
     */
    setMods(m) {
      Object.assign(mods, m);
      if (W) W.mul = mulOf(W.level);
    },
    get locked() {
      return locked;
    },
    get active() {
      return active;
    },
    get note() {
      return note.until > time ? note.text : "";
    },
    get dps() {
      let s = 0;
      for (const w of meter.window) s += w.d;
      return s / 5;
    },
    hint() {
      if (!W) return "";
      const h = W.beh.hint;
      return (h && h[W.branch]) || "";
    },
    equip,
    /** What the arms need to know this frame: trigger pull and which hand has let go of the weapon. */
    handState() {
      const away = { left: 0, right: 0 };
      if (!W) return { trigger: 0, away };
      if (thrown) away.left = away.right = 1;
      else if (W.reload >= 0 && W.spec.reload > 0 && !W.model.ownReload) {
        // the support hand goes for a fresh magazine (or one round per beat) and comes back
        const beats = W.spec.beats || 1;
        const ph = (clamp01(W.reload) * beats) % 1;
        away[W.model.grips && W.model.grips.left ? "left" : "right"] =
          ph > 0.06 && ph < 0.56 ? 1 : 0;
      }
      return { trigger: W.trigger, away };
    },
    setActive(on) {
      active = !!on;
      if (!active) {
        input.fire = input.alt = false;
        audio && audio.stopLoops();
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        endThrow(true);
        stage.zoom = 1;
        stage.kick.pitch = stage.kick.yaw = stage.kick.roll = 0;
        stage.kick.fov = 0;
        recoil.reset();
        lean[0] = lean[1] = lean[2] = 0;
        stage.viewKick.position.set(0, 0, 0);
        stage.viewKick.rotation.set(0, 0, 0);
      } else {
        stage.look.yaw = 0;
        stage.look.pitch = -0.02;
      }
    },
    update,
    reload: startReload,
    press(name) {
      if (name === "fire") {
        input.fire = true;
        input.fireEdge = true;
      } else {
        input.alt = true;
        input.altEdge = true;
      }
    },
    release(name) {
      if (name === "fire") {
        if (input.fire) input.fireUp = true;
        input.fire = false;
      } else {
        if (input.alt) input.altUp = true;
        input.alt = false;
      }
    },
    tap(name, seconds = 0.05) {
      api.press(name);
      fx.after(seconds, () => api.release(name));
    },
    aim(yaw, pitch) {
      stage.look.yaw = yaw;
      stage.look.pitch = pitch;
    },
    /** Point the camera at a zombie's chest (index into targets.list) or head. */
    aimAt(i, head = false) {
      const z = typeof i === "number" ? targets.list[i] : i;
      if (!z) return;
      const p = head ? z.headPos : z.chest;
      const d = _a.subVectors(p, stage.eye);
      stage.look.yaw = Math.atan2(-d.x, -d.z);
      stage.look.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    },
    resetMeter() {
      meter.window.length = 0;
      meter.total = 0;
      meter.kills = 0;
      meter.taken = 0;
      meter.spent = 0;
    },
    clear() {
      fx.clear();
      proj.clear();
      targets.limbs?.clear(); // (the bench's own dead: the game's street clears its own)
      zones.length = 0;
      lights[0] = lights[1] = null;
    },
  };
  lab.combat = api;
  return api;
}
