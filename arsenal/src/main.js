// Weapon lab entry: builds the kit and the stage, loads weapon models on demand and exposes
// window.__lab so the lab can be scripted (screenshots, checks).
//
// URL parameters:
//   w=<weapon id>   b=base|a|b   mode=show|fp   lv=1..5
//   yaw= pitch= dist=   fix the showcase camera (radians / metres) and stop the turntable
//   ui=0            hide the interface (clean screenshots)
//   spice=chili:2,fire:3   the run's seasonings at those levels   ammo=meal   the run's pools
//   home=<address>  the game this lab was opened from: shows the way back to its title page
import * as THREE from "three";
import { createKit } from "./kit/index.js";
import { createStage } from "./render/stage.js";
import { createArms } from "./kit/hands.js";
import { createAudio } from "./audio/audio.js";
import { WEAPONS, EXISTING, byId } from "./data/weapons.js";
import { standIn } from "./kit/standin.js";
import { createMeal } from "./combat/meal.js";

const builders = import.meta.glob("./weapons/*.js");
// The game's own two guns: the test bench can take them up (on a stand-in, see kit/standin.js)
// so that they sit the same test as the rest; the showcase does not list them.
const STOCK = Object.fromEntries(EXISTING.map((w) => [w.id, w]));
const defOf = (id) => byId[id] || STOCK[id];
const q = new URLSearchParams(location.search);
const canvas = document.getElementById("view");
const errors = [];
window.__errors = errors;
window.addEventListener("error", (e) => errors.push(String(e.message || e)));
window.addEventListener("unhandledrejection", (e) =>
  errors.push(
    String(e.reason && e.reason.message ? e.reason.message : e.reason),
  ),
);

// The single-file build (scripts/single.mjs) defines this: showcase only, no asset folder.
const SOLO = typeof __ARSENAL_SOLO__ !== "undefined" && __ARSENAL_SOLO__;
// Where the game is, when this showcase is a room of it. The game's build puts the showcase
// at gallery/ and says "../" (showcase.mjs); a game on a dev server sends its own address in
// ?home= (vite.config.js). Only ever a web address: it becomes a link.
const HOME = (() => {
  const h =
    typeof __ARSENAL_HOME__ !== "undefined" ? __ARSENAL_HOME__ : q.get("home");
  if (!h) return null;
  try {
    const u = new URL(h, location.href);
    return /^https?:$/.test(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
})();
const kit = createKit();
const stage = createStage(canvas, kit, { bareRange: SOLO });
const models = new Map();
const arms = createArms(kit);
stage.scene.add(arms.group);

const lab = {
  THREE,
  kit,
  stage,
  models,
  weapons: WEAPONS,
  arms,
  solo: SOLO,
  home: HOME,
  state: {
    weapon: null,
    branch: "base",
    level: 1,
    mode: "show",
    hands: q.has("hands") ? q.get("hands") === "1" : SOLO,
  },
  model: null,
  combat: null,
  ui: null,
  listeners: new Set(),
  emit() {
    for (const f of lab.listeners) f(lab.state);
  },
  has(id) {
    return !!builders[`./weapons/${id}.js`];
  },
  async load(id) {
    if (models.has(id)) return models.get(id);
    const imp = builders[`./weapons/${id}.js`];
    if (!imp && !STOCK[id]) throw new Error(`no model for "${id}"`);
    const model = imp ? (await imp()).default(kit) : standIn(kit, id);
    console.log(
      `[lab] ${id}: ${model.info.tris} tris, ${model.info.meshes} meshes`,
    );
    models.set(id, model);
    return model;
  },
  async select(id, branch) {
    const model = await lab.load(id);
    lab.model = model;
    lab.state.weapon = id;
    if (branch) lab.state.branch = branch;
    lab.applyBranch();
    stage.mount(model);
    litForMode();
    lab.combat && lab.combat.equip(model, defOf(id));
    lab.emit();
    return model;
  },
  applyBranch() {
    if (!lab.model) return;
    const lv = lab.state.level;
    // below level 3 the weapon has not forked yet
    const b = lv >= 3 ? lab.state.branch : "base";
    lab.model.setBranch(b);
    // level 5: the weapon is consecrated and every glow part burns brighter
    const boost = lv >= 5 ? 1.8 : 1;
    for (const m of kit.mats.glowMats)
      m.emissiveIntensity = (m.userData.glow || 1) * boost;
  },
  setBranch(b) {
    lab.state.branch = b;
    if (b !== "base" && lab.state.level < 3) lab.state.level = 3;
    if (b === "base" && lab.state.level >= 3) lab.state.level = 2;
    lab.applyBranch();
    const sel = lab.model;
    if (sel && stage.mode === "show") {
      const o = { ...stage.orbit };
      stage.mount(sel);
      stage.orbit.yaw = o.yaw;
      stage.orbit.pitch = o.pitch;
    }
    lab.combat &&
      lab.model &&
      lab.combat.equip(lab.model, defOf(lab.state.weapon));
    lab.emit();
  },
  setLevel(lv) {
    lab.state.level = Math.max(1, Math.min(5, lv | 0));
    if (lab.state.level >= 3 && lab.state.branch === "base")
      lab.state.branch = "a";
    lab.applyBranch();
    lab.combat &&
      lab.model &&
      lab.combat.equip(lab.model, defOf(lab.state.weapon));
    lab.emit();
  },
  setMode(mode) {
    lab.state.mode = mode === "fp" ? "fp" : "show";
    stage.setMode(lab.state.mode);
    stage.mount(lab.model);
    placeArms();
    litForMode();
    lab.combat && lab.combat.setActive(lab.state.mode === "fp");
    lab.emit();
  },
  orbit(yaw, pitch, dist) {
    const o = stage.orbit;
    o.auto = false;
    stage.showMount.rotation.y = 0;
    if (yaw !== undefined) o.yaw = yaw;
    if (pitch !== undefined) o.pitch = pitch;
    if (dist !== undefined) o.dist = dist;
  },
};
// the game's seasonings and ammunition, for the firing range (see combat/meal.js)
lab.meal = createMeal(lab);
lab.supply = lab.meal.supply;
lab.audio = createAudio(() => stage.camera);
// browsers only let sound start from a click or a key press
for (const ev of ["pointerdown", "keydown"])
  window.addEventListener(ev, () => lab.audio.unlock(), { capture: true });
window.__lab = lab;

// The showcase camera has to dodge the UI: panels left and right on a desktop, a strip on top
// and a sheet at the bottom on a phone. Called on start and whenever the window changes.
function layout() {
  const w = window.innerWidth,
    h = window.innerHeight;
  const narrow = w < 760;
  document.getElementById("ui").classList.toggle("narrow", narrow);
  stage.shiftX = narrow ? 0 : -70;
  stage.shiftY = narrow ? Math.round(h * 0.17) : 0;
  // a portrait screen is far narrower than the weapon is long: pull the camera back to fit
  const fit = narrow ? Math.max(1.5, 1.02 / (w / h)) : 1.5;
  const changed = Math.abs(fit - stage.fit) > 0.01;
  stage.fit = fit;
  stage.applyShift();
  if (changed && lab.model && stage.mode === "show") {
    const o = { yaw: stage.orbit.yaw, pitch: stage.orbit.pitch };
    stage.mount(lab.model);
    stage.orbit.yaw = o.yaw;
    stage.orbit.pitch = o.pitch;
  }
}

// ---- showcase camera controls: drag to turn, wheel or two-finger pinch to zoom
let drag = null;
const touches = new Map();
let pinch = 0;
canvas.style.touchAction = "none";
const spread = () => {
  const [a, b] = [...touches.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
};
canvas.addEventListener("pointerdown", (e) => {
  if (stage.mode !== "show") return;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  pinch = touches.size === 2 ? spread() : 0;
  drag = { x: e.clientX, y: e.clientY };
  stage.orbit.auto = false;
  canvas.setPointerCapture(e.pointerId);
});
const lift = (e) => {
  touches.delete(e.pointerId);
  pinch = 0;
  drag = null;
};
canvas.addEventListener("pointercancel", lift);
canvas.addEventListener("pointermove", (e) => {
  if (touches.has(e.pointerId))
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2 && pinch > 0 && stage.mode === "show") {
    const d = spread();
    stage.orbit.dist = Math.max(
      0.25,
      Math.min(8, (stage.orbit.dist * pinch) / Math.max(1, d)),
    );
    pinch = d;
    return;
  }
  if (!drag || stage.mode !== "show") return;
  stage.orbit.yaw -= (e.clientX - drag.x) * 0.006;
  stage.orbit.pitch = Math.max(
    -1.3,
    Math.min(1.4, stage.orbit.pitch + (e.clientY - drag.y) * 0.005),
  );
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerup", lift);
canvas.addEventListener(
  "wheel",
  (e) => {
    if (stage.mode !== "show") return;
    e.preventDefault();
    stage.orbit.dist = Math.max(
      0.25,
      Math.min(8, stage.orbit.dist * Math.exp(e.deltaY * 0.0012)),
    );
  },
  { passive: false },
);

// ---- frame loop
const clock = new THREE.Clock();
let t = 0;
const idle = {
  t: 0,
  cycle: 1,
  trigger: 0,
  shot: 9,
  shots: 0,
  heat: 0,
  charge: 0,
  firing: false,
  rounds: 1,
  mag: 1,
  reload: -1,
  reloadTime: 0,
  swing: -1,
  swingN: 0,
  draw: 1,
  branch: "base",
  level: 1,
  prev: { reload: -1, cycle: 1, swing: -1, charge: 0 },
  cue() {},
};
// The street's image-based light is turned well down so the alley stays dark; the weapon in the
// shooter's hands gets its reflections back or it turns into a black silhouette.
function litForMode() {
  const k = stage.mode === "fp" ? 1.7 : 1;
  for (const m of kit.mats.all()) {
    if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity;
    m.envMapIntensity = m.userData.env0 * k;
  }
}
// ---- canned motion for the showcase: one shot and one reload, or a frozen moment for inspection
const RELOAD_S = {
  shotgun: 2.4,
  smg: 1.6,
  revolver: 2.2,
  lever: 2.8,
  nailgun: 1.4,
  flamer: 2.4,
  firework: 2.6,
  arc: 2.0,
  crossbow: 1.5,
};
const CYCLE_S = {
  shotgun: 0.55,
  lever: 0.55,
  revolver: 0.4,
  firework: 0.4,
  crossbow: 0.2,
};
const MELEE_S = { coinsword: 0.5, guandao: 0.95 };
lab.playDemo = () => {
  const id = lab.state.weapon;
  if (!lab.model || stage.mode !== "show") return;
  const st = {
    ...idle,
    prev: { reload: -1, cycle: 1, swing: -1, charge: 0 },
    cue: (n, g) => lab.audio && lab.audio.cue(n, g, id),
  };
  const t0 = t;
  const cyc = CYCLE_S[id] || 0.22,
    rel = RELOAD_S[id] || 0,
    sw = MELEE_S[id] || 0;
  lab.demo = (now) => {
    const e = now - t0;
    Object.assign(st.prev, {
      reload: st.reload,
      cycle: st.cycle,
      swing: st.swing,
      charge: st.charge,
    });
    st.t = now;
    st.branch = lab.model.branch;
    st.level = lab.state.level;
    const fireAt = 0.35;
    st.trigger = sw
      ? 0
      : Math.max(0, Math.min(1, (e - fireAt + 0.12) / 0.1)) *
        (e < fireAt + 0.25 ? 1 : 0);
    st.shots = e >= fireAt ? 1 : 0;
    st.shot = e >= fireAt ? e - fireAt : 9;
    st.cycle = sw ? 1 : e < fireAt ? 1 : Math.min(1, (e - fireAt) / cyc);
    st.swing = sw && e >= fireAt && e < fireAt + sw ? (e - fireAt) / sw : -1;
    const r0 = fireAt + Math.max(cyc, sw) + 0.5;
    st.reload = rel && e >= r0 && e < r0 + rel ? (e - r0) / rel : -1;
    st.reloadTime = rel;
    st.rounds = st.reload >= 0 && st.reload < 0.6 ? 0 : 1;
    if (e > r0 + rel + 0.4) lab.demo = null;
    return st;
  };
};
/** Hold the weapon at one moment: lab.freeze({ reload: 0.4 }) / ({ cycle: 0.3 }) / (null) to release. */
lab.freeze = (o) => {
  if (!o) return void (lab.demo = null);
  const st = { ...idle, ...o, cue() {} };
  st.prev = {
    reload: st.reload,
    cycle: st.cycle,
    swing: st.swing,
    charge: st.charge,
  };
  lab.demo = (now) => ((st.t = now), (st.branch = lab.model.branch), st);
};
// In first person the arms belong to the body: they hang off the eye, not off the weapon, so the
// shoulders stay put while recoil and melee cuts move the hands (and they keep their place when
// the weapon is thrown). In the showcase they sit in the studio and reach for the weapon from
// where a shooter would stand.
function placeArms() {
  const parent = stage.mode === "fp" ? stage.viewMount : stage.scene;
  if (arms.group.parent !== parent) parent.add(arms.group);
}
/**
 * Development aid: close the fingers of a hand onto the weapon it is holding and return the
 * pose to paste into the weapon file (see kit/fit.js and the README).
 *   await __lab.fitGrip("left")                       fit the grip as written
 *   await __lab.fitGrip("left", { fingers: [..] })    try another palm point / direction first
 * Options: at, palm, fingers (as in a grip), kind ("cradle" | "wrap"), from, to, digits.
 */
lab.fitGrip = async (side = "left", o = {}) => {
  const grip = lab.model && lab.model.grips && lab.model.grips[side];
  if (!grip) return null;
  const { fitFingers, toLabPose } = await import("./kit/fit.js");
  if (o.at) grip.anchor.position.set(o.at[0], o.at[1], o.at[2]);
  if (o.palm || o.fingers) {
    // the same frame kit.weapon() builds: +Z along the fingers, -Y out of the palm
    const z = new THREE.Vector3(
      ...(o.fingers || grip.spec.fingers),
    ).normalize();
    const y = new THREE.Vector3(...(o.palm || grip.spec.palm)).negate();
    y.addScaledVector(z, -y.dot(z)).normalize();
    grip.anchor.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(
        new THREE.Vector3().crossVectors(y, z),
        y,
        z,
      ),
    );
  }
  arms.solve(lab.model, {
    mode: stage.mode === "fp" ? "fp" : "show",
    dt: 1 / 60,
    snap: true,
    visible: true,
  });
  const pose = toLabPose(
    fitFingers({ arm: arms.arms[side], side, model: lab.model, ...o }),
  );
  if (o.apply !== false) grip.pose = pose;
  return pose;
};
lab.setHands = (on) => {
  lab.state.hands = !!on;
  lab.emit();
};
function tick(dt) {
  t += dt;
  idle.t = t;
  const fp = stage.mode === "fp";
  if (lab.combat && fp) lab.combat.update(dt, t);
  else if (lab.model) lab.model.update(lab.demo ? lab.demo(t) : idle, dt);
  if (lab.model) {
    const hs = fp && lab.combat ? lab.combat.handState() : null;
    arms.solve(lab.model, {
      mode: fp ? "fp" : "show",
      dt,
      visible: fp || lab.state.hands,
      trigger: hs ? hs.trigger : 0,
      away: hs ? hs.away : null,
    });
  } else arms.setVisible(false);
  if (lab.fx) lab.fx.update(dt, t);
  stage.update(dt, t);
}
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  if (lab.manual) return; // time is driven by lab.advance()
  tick(dt * (lab.timeScale ?? 1));
  stage.render();
}
// Deterministic stepping for captures: lab.manual = true, then lab.advance(seconds).
lab.advance = (seconds, step = 1 / 60, render = true) => {
  const n = Math.max(1, Math.round(seconds / step));
  for (let i = 0; i < n; i++) tick(step);
  if (render) stage.render();
};

async function boot() {
  try {
    if (q.get("ui") !== "0") {
      const { createUI } = await import("./ui/ui.js").catch(() => ({}));
      if (createUI) {
        lab.ui = createUI(lab);
        layout();
        window.addEventListener("resize", layout);
      }
    }
    // The firing range is optional: a failure there must not stop the showcase from working.
    try {
      if (SOLO) throw new Error("showcase only");
      const { createCombat } = await import("./combat/combat.js");
      await createCombat(lab);
      for (const part of (q.get("spice") || "").split(",")) {
        const [id, lv] = part.split(":");
        if (id) lab.meal.set(id, +(lv || 1));
      }
      if (q.get("ammo")) lab.meal.setAmmo(q.get("ammo"));
      lab.meal.apply();
    } catch (e) {
      if (!SOLO) {
        errors.push("combat: " + String(e && e.stack ? e.stack : e));
        console.error(e);
      }
      lab.combat = null;
    }
    const first =
      q.get("w") && lab.has(q.get("w"))
        ? q.get("w")
        : WEAPONS.find((w) => lab.has(w.id))?.id;
    lab.state.level = q.get("lv")
      ? +q.get("lv")
      : q.get("b") && q.get("b") !== "base"
        ? 3
        : 1;
    lab.state.branch = q.get("b") || "base";
    stage.setMode(q.get("mode") === "fp" ? "fp" : "show");
    lab.state.mode = stage.mode;
    placeArms();
    if (first) await lab.select(first, lab.state.branch);
    lab.combat && lab.combat.setActive(stage.mode === "fp");
    if (q.has("yaw") || q.has("pitch") || q.has("dist")) {
      lab.orbit(
        q.has("yaw") ? +q.get("yaw") : undefined,
        q.has("pitch") ? +q.get("pitch") : undefined,
        q.has("dist") ? +q.get("dist") : undefined,
      );
    }
    renderer_warm();
  } catch (e) {
    errors.push(String(e && e.stack ? e.stack : e));
    console.error(e);
  }
  document.getElementById("boot")?.remove();
  stage.renderer.setAnimationLoop(frame);
  window.__ready = true;
}
function renderer_warm() {
  stage.update(0, 0);
  stage.render();
}
boot();
