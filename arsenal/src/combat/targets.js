// Zombie targets for the firing range: the game's own skinned characters and clips, simple
// behaviour (stand still or shamble towards the shooter), hit volumes, damage, the four status
// effects of the roguelike design and the reactions between them.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { C, rand, srand } from "../fx/core.js";
import { FONT_KAI } from "../kit/index.js";

const CHARACTERS = [
  { file: "romero.glb", type: "walker" },
  { file: "girl.glb", type: "walker" },
  { file: "cop.glb", type: "walker" },
  { file: "soldier.glb", type: "brute" },
];
const CLIPS = {
  idle: {},
  walk: { travel: true },
  run: { travel: true },
  attack: {},
  scream: {},
  death_back: {},
  death_front: {},
};
const TYPE = {
  walker: { hp: 55, scale: [0.95, 1.06], r: 0.3, name: "行尸" },
  brute: { hp: 320, scale: [1.2, 1.26], r: 0.38, name: "重型僵尸" },
};
const HEAD_R = 0.17;
// spawn slots: [x, z, character index]
const SLOTS = [
  [-0.4, -8.5, 0],
  [2.3, -11.5, 1],
  [-2.6, -13, 2],
  [0.7, -16.5, 3],
  [-1.5, -19.5, 1],
  [3.1, -21, 0],
  [-3.3, -24.5, 2],
  [1.4, -27.5, 0],
  [-0.6, -31, 3],
  // the rest only join in for the horde
  [2.8, -34, 1],
  [-2.2, -36, 2],
  [0.2, -38, 0],
  [3.4, -40, 2],
  [-3.2, -41, 1],
  [1.2, -42, 0],
  [-1.0, -43, 3],
];
const RANGE_COUNT = 9; // how many stand on the range in the "stand" and "advance" modes
// the horde uses the game's own numbers (src/chinatown/zombies.js): speeds in m/s, damage per swing
const HORDE = {
  walker: { walk: 1.25, run: 4.3, runners: 0.3, damage: 12, cooldown: 1.05 },
  brute: { walk: 1.5, run: 3.3, runners: 1, damage: 26, cooldown: 1.5 },
};

// with a melee weapon in hand the first few stand close enough to hit
const NEAR = [
  [-0.5, -2.3],
  [1.3, -2.9],
  [-1.7, -3.3],
  [0.3, -4.6],
];

const BURN_DPS = 6; // per stack
const BURN_TIME = 4;
const SHOCK_TIME = 6;
const SEAL_TIME = 8;
const PIN_TIME = 3;
const VENOM_TIME = 8;

function prepareClip(clip, name, cfg, hipsY) {
  clip.name = name;
  clip.tracks = clip.tracks.filter(
    (t) => t.name.endsWith(".quaternion") || t.name === "Hips.position",
  );
  clip.userData = { hipsY, speed: 0 };
  const hips = clip.tracks.find((t) => t.name === "Hips.position");
  if (hips && cfg.travel) {
    const v = hips.values,
      n = hips.times.length,
      t0 = hips.times[0];
    const dur = hips.times[n - 1] - t0 || 1;
    const dx = v[(n - 1) * 3] - v[0],
      dz = v[(n - 1) * 3 + 2] - v[2];
    clip.userData.speed = Math.hypot(dx, dz) / dur;
    for (let i = 0; i < n; i++) {
      const k = (hips.times[i] - t0) / dur;
      v[i * 3] -= dx * k;
      v[i * 3 + 2] -= dz * k;
    }
  }
  clip.resetDuration();
  return clip;
}
function scaleRoot(clip, ratio) {
  const copy = clip.clone();
  copy.userData = clip.userData;
  if (Math.abs(ratio - 1) < 0.005) return copy;
  const hips = copy.tracks.find((t) => t.name === "Hips.position");
  if (hips)
    for (let i = 0; i < hips.values.length; i++) hips.values[i] *= ratio;
  return copy;
}

function talismanTexture() {
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#d9b23c";
  g.fillRect(0, 0, 96, 256);
  g.fillStyle = "rgba(120,80,10,0.25)";
  for (let i = 0; i < 60; i++)
    g.fillRect(
      Math.random() * 96,
      Math.random() * 256,
      1 + Math.random() * 3,
      1,
    );
  g.strokeStyle = "#a01208";
  g.fillStyle = "#a01208";
  g.lineWidth = 3;
  g.strokeRect(6, 6, 84, 244);
  g.font = `700 38px ${FONT_KAI}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("敕", 48, 36);
  g.fillText("令", 48, 78);
  g.lineWidth = 5;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(48, 104);
  for (let i = 0; i < 7; i++)
    g.quadraticCurveTo(i % 2 ? 22 : 74, 112 + i * 17, 48, 122 + i * 17);
  g.stroke();
  g.beginPath();
  g.arc(48, 224, 12, 0.6, 6.6);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function createTargets(lab, fx, E) {
  const { stage } = lab;
  const root = new THREE.Group();
  root.name = "targets";
  stage.range.group.add(root);
  const loader = new GLTFLoader();
  const load = (f) => loader.loadAsync(`/assets/zombies/${f}`);
  const [chars, clipFiles] = await Promise.all([
    Promise.all(CHARACTERS.map((c) => load(c.file))),
    Promise.all(Object.keys(CLIPS).map((n) => load(`clip_${n}.glb`))),
  ]);
  const clips = {};
  Object.keys(CLIPS).forEach((name, i) => {
    const g = clipFiles[i];
    const hips = g.scene.getObjectByName("Hips");
    clips[name] = prepareClip(
      g.animations[0],
      name,
      CLIPS[name],
      hips ? hips.position.y : 1,
    );
  });
  const templates = chars.map((g, i) => {
    const hips = g.scene.getObjectByName("Hips");
    const hipsY = hips ? hips.position.y : 1;
    g.scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
    const tc = {};
    for (const [k, clip] of Object.entries(clips))
      tc[k] = scaleRoot(clip, hipsY / clip.userData.hipsY);
    return { ...CHARACTERS[i], scene: g.scene, clips: tc };
  });

  const paperTex = talismanTexture();
  const paperGeo = new THREE.PlaneGeometry(0.075, 0.2);
  paperGeo.translate(0, -0.085, 0);
  const paperMat = new THREE.MeshStandardMaterial({
    map: paperTex,
    side: THREE.DoubleSide,
    roughness: 0.8,
    emissive: 0xffb030,
    emissiveIntensity: 0.25,
    emissiveMap: paperTex,
  });

  const list = [];
  const listeners = { damage: [], kill: [], attack: [] };
  const _a = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _c = new THREE.Vector3(),
    _d = new THREE.Vector3();
  let mode = "advance";
  let layout = "far";
  let clock = 0;
  const home = (z) =>
    layout === "near" && z.id < NEAR.length ? NEAR[z.id] : z.slot;

  function make(slot, idx) {
    const tpl = templates[slot[2]];
    const T = TYPE[tpl.type];
    const rig = cloneSkinned(tpl.scene);
    const mats = [];
    rig.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.material.userData.base = {
        emissive: o.material.emissive.clone(),
        ei: o.material.emissiveIntensity,
        color: o.material.color.clone(),
      };
      mats.push(o.material);
    });
    const holder = new THREE.Group();
    holder.add(rig);
    root.add(holder);
    const mixer = new THREE.AnimationMixer(rig);
    const actions = {};
    for (const [k, clip] of Object.entries(tpl.clips)) {
      const a = mixer.clipAction(clip);
      if (k.startsWith("death") || k === "attack" || k === "scream") {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      actions[k] = a;
    }
    // talismans stuck to the forehead (seal stacks)
    const head = rig.getObjectByName("Head");
    const papers = [];
    const paperRoot = new THREE.Group();
    holder.add(paperRoot);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(paperGeo, paperMat);
      m.rotation.z = (i - 1) * 0.32;
      m.position.set((i - 1) * 0.035, 0, 0.002 * i);
      m.visible = false;
      m.castShadow = true;
      paperRoot.add(m);
      papers.push(m);
    }
    const z = {
      id: idx,
      slot,
      type: tpl.type,
      label: T.name,
      holder,
      rig,
      mixer,
      actions,
      mats,
      head,
      papers,
      paperRoot,
      radius: T.r,
      scale: 1,
      height: 1.75,
      pos: holder.position,
      hp: T.hp,
      maxHp: T.hp,
      alive: true,
      state: "idle",
      current: null,
      vel: new THREE.Vector3(),
      lift: 0,
      liftV: 0,
      flash: 0,
      pin: 0,
      pinKind: "",
      fear: 0,
      stagger: 0,
      dead: 0,
      st: {
        burn: 0,
        burnT: 0,
        shock: 0,
        venom: 0,
        venomT: 0,
        seal: 0,
        sealT: 0,
      },
      burnAcc: 0,
      stuck: [],
      links: new Set(),
      mark: 0,
      headPos: new THREE.Vector3(),
      chest: new THREE.Vector3(),
      feet: new THREE.Vector3(),
    };
    respawn(z, true);
    return z;
  }

  function play(z, name, fade = 0.18) {
    if (z.current === name) return;
    const next = z.actions[name];
    if (!next) return;
    next.reset();
    next.setEffectiveWeight(1);
    next.setEffectiveTimeScale(1);
    next.fadeIn(fade).play();
    if (z.current) z.actions[z.current].fadeOut(fade);
    z.current = name;
  }

  function respawn(z, first = false) {
    const T = TYPE[z.type];
    // outside the horde only the first few are in play
    z.parked = mode !== "horde" && z.id >= RANGE_COUNT;
    z.wait = 0;
    z.atk = 0;
    z.runner = Math.random() < HORDE[z.type].runners;
    z.speed = HORDE[z.type][z.runner ? "run" : "walk"];
    z.scale = rand(T.scale[0], T.scale[1]);
    z.rig.scale.setScalar(z.scale);
    z.height = 1.75 * z.scale;
    z.hp = z.maxHp = T.hp;
    z.alive = true;
    z.dead = 0;
    z.pin = 0;
    z.fear = 0;
    z.stagger = 0;
    z.lift = 0;
    z.liftV = 0;
    z.vel.set(0, 0, 0);
    z.mark = 0;
    Object.assign(z.st, {
      burn: 0,
      burnT: 0,
      shock: 0,
      venom: 0,
      venomT: 0,
      seal: 0,
      sealT: 0,
    });
    for (const s of z.stuck) s.parent && s.parent.remove(s);
    z.stuck.length = 0;
    z.links.clear();
    z.holder.visible = true;
    const h = home(z);
    z.near = 0;
    z.holder.position.set(
      h[0] + (first ? 0 : srand(0.5)),
      0,
      mode === "advance" && !first ? -38 - rand(4) : h[1],
    );
    if (mode === "horde") {
      // they come out of the dark at the far end, a few at a time
      z.holder.position.set(
        srand(stage.range.bounds.halfW - 1),
        0,
        -37 - rand(7),
      );
      z.wait = first ? (z.id < 5 ? z.id * 0.6 : 2 + rand(7)) : rand(0.4, 2.6);
    }
    if (z.parked || z.wait > 0) {
      z.alive = false;
      z.holder.visible = false;
    }
    z.holder.rotation.set(0, 0, 0);
    z.mixer.stopAllAction();
    z.current = null;
    z.mixer.timeScale = 1;
    for (const m of z.mats) {
      m.color.copy(m.userData.base.color);
      m.emissive.copy(m.userData.base.emissive);
      m.emissiveIntensity = m.userData.base.ei;
      m.opacity = 1;
      m.transparent = false;
    }
    for (const p of z.papers) p.visible = false;
    play(z, mode === "stand" ? "idle" : "walk", 0);
    z.actions[z.current].time = rand(0, 2);
    z.state = mode === "stand" ? "idle" : "walk";
  }

  for (let i = 0; i < SLOTS.length; i++) list.push(make(SLOTS[i], i));

  function refresh(z) {
    z.feet.set(z.pos.x, z.lift + 0.1, z.pos.z);
    z.chest.set(z.pos.x, z.lift + z.height * 0.68, z.pos.z);
    if (z.head) z.head.getWorldPosition(z.headPos).y += 0.07 * z.scale;
    else z.headPos.set(z.pos.x, z.lift + z.height * 0.93, z.pos.z);
  }

  // ---------------------------------------------------------------- queries
  function raySphere(o, d, c, r) {
    _a.subVectors(c, o);
    const tca = _a.dot(d);
    const d2 = _a.lengthSq() - tca * tca;
    if (d2 > r * r) return -1;
    const thc = Math.sqrt(r * r - d2);
    const t0 = tca - thc;
    return t0 > 0 ? t0 : tca + thc > 0 ? 0.0001 : -1;
  }
  // ray against a vertical capsule approximated by an infinite cylinder clipped to [y0, y1]
  function rayBody(o, d, z) {
    const dx = d.x,
      dz = d.z;
    const ox = o.x - z.pos.x,
      oz = o.z - z.pos.z;
    const a = dx * dx + dz * dz;
    if (a < 1e-9) return -1;
    const b = ox * dx + oz * dz;
    const c = ox * ox + oz * oz - z.radius * z.radius;
    const disc = b * b - a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / a;
    if (t < 0) return -1;
    const y = o.y + d.y * t;
    if (y < z.lift + 0.02 || y > z.lift + z.height * 0.86) return -1;
    return t;
  }
  const api = {
    list,
    root,
    get mode() {
      return mode;
    },
    setMode(m) {
      mode = m === "stand" || m === "horde" ? m : "advance";
      for (const z of list) respawn(z, true);
    },
    /** "near" brings a few targets within melee reach, "far" spreads them down the range. */
    setLayout(l) {
      if (l === layout) return;
      layout = l;
      for (const z of list) respawn(z, true);
    },
    on(ev, fn) {
      listeners[ev].push(fn);
    },
    alive() {
      return list.filter((z) => z.alive);
    },
    /** First zombie along a ray: { z, dist, point, head } or null. `skip` is a Set of zombies to ignore. */
    raycast(o, d, max = 300, skip = null) {
      let best = null;
      for (const z of list) {
        if (!z.alive || (skip && skip.has(z))) continue;
        let t = raySphere(o, d, z.headPos, HEAD_R * z.scale);
        let head = t >= 0;
        const tb = rayBody(o, d, z);
        if (tb >= 0 && (t < 0 || tb < t)) {
          t = tb;
          head = false;
        }
        if (t >= 0 && t < max && (!best || t < best.dist))
          best = { z, dist: t, head };
      }
      if (best)
        best.point = new THREE.Vector3().copy(o).addScaledVector(d, best.dist);
      return best;
    },
    inSphere(p, r, skip = null) {
      const out = [];
      for (const z of list) {
        if (!z.alive || (skip && skip.has(z))) continue;
        const d = Math.hypot(z.pos.x - p.x, z.pos.z - p.z);
        if (d <= r + z.radius && Math.abs(z.chest.y - p.y) < r + 1.2)
          out.push({ z, dist: d });
      }
      return out.sort((a, b) => a.dist - b.dist);
    },
    /** Zombies inside a cone from o along d (half angle in radians). */
    inCone(o, d, range, half) {
      const out = [];
      const cos = Math.cos(half);
      for (const z of list) {
        if (!z.alive) continue;
        _a.subVectors(z.chest, o);
        const dist = _a.length();
        if (dist > range + z.radius) continue;
        // widen by the body's angular size so near targets are not missed
        const ang = Math.atan2(z.radius + 0.25, Math.max(0.5, dist));
        if (_a.dot(d) / dist >= Math.cos(half + ang) || _a.dot(d) / dist >= cos)
          out.push({ z, dist });
      }
      return out.sort((a, b) => a.dist - b.dist);
    },
    nearest(p, r, skip = null) {
      const l = api.inSphere(p, r, skip);
      return l.length ? l[0].z : null;
    },

    // ---------------------------------------------------------------- damage
    /**
     * damage(z, amount, { dir, point, head, element, kind, knock, lift, source, noChain, color })
     * element: fire | shock | venom | seal — only colours the number; statuses are applied with apply().
     * Returns true when this hit killed the target.
     */
    damage(z, amount, o = {}) {
      if (!z.alive) return false;
      let dmg = amount;
      if (z.st.venom > 0) dmg *= 1 + 0.08 * z.st.venom;
      if (z.pin > 0 && z.pinKind === "seal" && o.head) dmg *= 1.5;
      if (z.pin > 0 && z.pinKind === "nail" && o.pinBonus) dmg *= o.pinBonus;
      dmg = Math.max(1, Math.round(dmg));
      z.hp -= dmg;
      z.flash = 1;
      const at = o.point || z.chest;
      for (const f of listeners.damage)
        f({
          z,
          dmg,
          at,
          head: !!o.head,
          element: o.element || "none",
          kind: o.kind || "hit",
        });
      if (o.dir && o.kind !== "dot") {
        if (o.blood !== false) E.blood(at, o.dir, o.head ? 1.4 : 0.8);
        const k = (o.knock || 0) * (z.type === "brute" ? 0.35 : 1);
        if (k > 0 && z.pin <= 0)
          z.vel.addScaledVector(
            _b.set(o.dir.x, 0, o.dir.z).normalize(),
            k * 4.2,
          );
        if (o.lift && z.pin <= 0)
          z.liftV = Math.max(z.liftV, o.lift * (z.type === "brute" ? 0.5 : 1));
        if ((o.stagger || k > 0.6) && z.pin <= 0)
          z.stagger = Math.max(z.stagger, o.stagger || 0.35);
      }
      // 感电: the next hit arcs to nearby targets
      if (z.st.shock > 0 && !o.noChain && o.kind !== "dot") {
        z.st.shock = 0;
        let from = z;
        const seen = new Set([z]);
        for (let i = 0; i < 2; i++) {
          const n = api.nearest(from.pos, 5, seen);
          if (!n) break;
          seen.add(n);
          fx.bolt(from.chest, n.chest, { width: 0.08, life: 0.16 });
          fx.glow({
            pos: n.chest,
            life: 0.12,
            size: [0.2, 0.9],
            color: E.PAL.shock.core,
            type: fx.P.STAR,
            fadePow: 1,
          });
          fx.flash(n.chest, 0x6fd8ff, 22, 0.12, 7);
          api.damage(n, amount * 0.6, {
            dir: _c.subVectors(n.chest, from.chest).normalize().clone(),
            element: "shock",
            noChain: true,
            blood: false,
            kind: "chain",
          });
          from = n;
        }
      }
      if (z.hp <= 0) {
        kill(z, o);
        return true;
      }
      return false;
    },
    /** Apply a status. apply(z, "fire" | "shock" | "venom" | "seal", stacks = 1) */
    apply(z, element, stacks = 1) {
      if (!z.alive) return;
      const s = z.st;
      if (element === "fire") {
        if (s.seal > 0 || (z.pin > 0 && z.pinKind === "seal"))
          return react(z, "焚符");
        if (s.venom > 0) return react(z, "爆燃");
        s.burn = Math.min(5, s.burn + stacks);
        s.burnT = BURN_TIME;
      } else if (element === "shock") {
        if (s.seal > 0 || (z.pin > 0 && z.pinKind === "seal"))
          return react(z, "引雷");
        if (s.venom > 0) react(z, "导电雾");
        s.shock = SHOCK_TIME;
      } else if (element === "venom") {
        if (s.burn > 0) return react(z, "爆燃");
        s.venom = Math.min(5, s.venom + stacks);
        s.venomT = VENOM_TIME;
        if (s.shock > 0) react(z, "导电雾");
      } else if (element === "seal") {
        if (z.pin > 0 && z.pinKind === "seal") {
          z.pin = Math.max(z.pin, PIN_TIME * 0.6);
          return;
        }
        s.seal = Math.min(3, s.seal + stacks);
        s.sealT = SEAL_TIME;
        E.seal(z.headPos, { size: 0.6, scraps: 2 });
        if (s.seal >= 3) api.pin(z, PIN_TIME, "seal");
      }
    },
    /** Hold a zombie in place. kind "seal" (talisman, ritual circle) or "nail". */
    pin(z, time, kind = "seal") {
      if (!z.alive) return;
      z.pin = Math.max(z.pin, time);
      z.pinKind = kind;
      z.vel.set(0, 0, 0);
      if (kind === "seal") {
        z.st.seal = 0;
        for (const p of z.papers) p.visible = true;
        E.circle(z.pos, {
          size: z.type === "brute" ? 2.6 : 2.0,
          life: time,
          follow: z.pos,
        });
        E.seal(z.headPos, { size: 1.1, glyph: "鎮", scraps: 6 });
        for (const f of listeners.damage)
          f({
            z,
            dmg: 0,
            at: z.headPos,
            text: "鎮壓",
            element: "seal",
            kind: "status",
          });
      }
    },
    /** Make a zombie run away for a moment (firework shell). */
    scare(z, time) {
      if (z.alive && z.pin <= 0) z.fear = Math.max(z.fear, time);
    },
    update,
    stats() {
      return { alive: list.filter((z) => z.alive).length, total: list.length };
    },
  };

  function react(z, name) {
    const s = z.st;
    for (const f of listeners.damage)
      f({
        z,
        dmg: 0,
        at: z.headPos,
        text: name,
        element: "react",
        kind: "status",
      });
    if (name === "爆燃") {
      s.burn = 0;
      s.venom = 0;
      E.explosion(z.chest, { radius: 3, pal: "fire" });
      for (const h of api.inSphere(z.chest, 3))
        api.damage(h.z, 70, {
          dir: _d.subVectors(h.z.chest, z.chest).normalize().clone(),
          element: "fire",
          knock: 1,
          noChain: true,
          kind: "blast",
        });
    } else if (name === "导电雾") {
      E.cloud(z.pos, 2.6, 1.6, { color: [C(0x4ad0ff, 0.7), C(0x1a4a6a, 0.4)] });
      for (const h of api.inSphere(z.chest, 3)) {
        h.z.st.shock = SHOCK_TIME;
        fx.bolt(z.chest, h.z.chest, { width: 0.05, life: 0.14 });
      }
    } else if (name === "焚符") {
      s.seal = 0;
      for (const p of z.papers) p.visible = false;
      E.seal(z.headPos, {
        pal: "fire",
        glyph: "焚",
        paper: C(0x2a1408, 1),
        scraps: 9,
        size: 1.2,
      });
      for (let i = 0; i < 16; i++)
        fx.glow({
          pos: z.headPos,
          vel: _d.set(srand(1.2), rand(0.5, 2.5), srand(1.2)),
          life: rand(0.4, 0.9),
          size: [0.1, rand(0.3, 0.5)],
          color: [E.PAL.fire.core, E.PAL.fire.end],
          alpha: 0.7,
          type: fx.P.FLAME,
          gravity: -1.5,
          drag: 1.5,
        });
      api.damage(z, z.maxHp * 0.3, {
        dir: _d.set(0, 1, 0).clone(),
        element: "fire",
        noChain: true,
        blood: false,
        kind: "react",
      });
      if (z.alive) {
        s.burn = Math.min(5, s.burn + 2);
        s.burnT = BURN_TIME;
      }
    } else if (name === "引雷") {
      s.seal = 0;
      E.lightning(z.pos, { radius: 5 });
      for (const h of api.inSphere(z.chest, 5))
        api.damage(h.z, h.z === z ? 150 : 90, {
          dir: _d.subVectors(h.z.chest, z.chest).setY(0.3).normalize().clone(),
          element: "shock",
          knock: h.z === z ? 0 : 0.8,
          noChain: true,
          blood: false,
          kind: "react",
        });
    }
  }

  function kill(z, o) {
    z.alive = false;
    z.state = "dead";
    z.dead = 0;
    z.pin = 0;
    z.mixer.timeScale = 1;
    const facing = _a.set(
      Math.sin(z.holder.rotation.y),
      0,
      Math.cos(z.holder.rotation.y),
    );
    const fromFront = !o.dir || o.dir.dot(facing) < 0;
    play(z, fromFront ? "death_back" : "death_front", 0.08);
    for (const p of z.papers) p.visible = false;
    for (const f of listeners.kill) f({ z, by: o });
    fx.audio &&
      fx.after(0.55, () =>
        fx.audio.world("fall", z.pos, { gain: 0.9, gap: 0.06 }),
      );
    // 灼烧 spreads on death; 蚀骨 leaves a cloud
    if (z.st.burn > 0) {
      for (const h of api.inSphere(z.chest, o.spread || 3)) {
        if (h.z === z) continue;
        h.z.st.burn = Math.min(5, h.z.st.burn + (o.spreadStacks || 1));
        h.z.st.burnT = BURN_TIME;
        fx.ribbon({
          points: [
            z.chest.clone(),
            z.chest
              .clone()
              .lerp(h.z.chest, 0.5)
              .add(new THREE.Vector3(0, 0.5, 0)),
            h.z.chest.clone(),
          ],
          width: 0.12,
          color: E.PAL.fire.body,
          life: 0.3,
          kind: "fire",
        });
      }
    }
    if (z.st.venom > 0) E.cloud(z.pos, 2, 3);
    if (o.deathBlast && z.st.burn > 0)
      E.explosion(z.chest, { radius: 1.8, smoke: 0.5, shake: 0.12 });
  }

  const tint = new THREE.Color();
  function update(dt, t) {
    clock = t;
    const eye = stage.eye;
    for (const z of list) {
      if (z.parked) continue;
      if (z.wait > 0) {
        z.wait -= dt;
        if (z.wait <= 0) {
          z.alive = true;
          z.holder.visible = true;
          refresh(z);
        }
        continue;
      }
      const s = z.st;
      if (!z.alive) {
        z.dead += dt;
        z.mixer.update(dt);
        // charred corpses smoulder; all corpses sink after a while and come back at the far end
        if (s.burn > 0 && z.dead < 3) {
          refresh(z);
          E.burn(z.feet, _a.set(z.pos.x, 0.5, z.pos.z), dt, 1);
        }
        if (z.dead > 4.5) z.holder.position.y -= dt * 0.5;
        if (z.dead > (mode === "horde" ? 3.2 : 6.5)) respawn(z);
        z.flash = Math.max(0, z.flash - dt * 6);
        applyTint(z);
        continue;
      }
      // ---- statuses
      if (s.burn > 0) {
        s.burnT -= dt;
        z.burnAcc += s.burn * BURN_DPS * dt;
        if (z.burnAcc >= 6) {
          const d = Math.floor(z.burnAcc);
          z.burnAcc -= d;
          api.damage(z, d, { element: "fire", kind: "dot", noChain: true });
        }
        if (s.burnT <= 0) s.burn = 0;
      }
      if (!z.alive) continue;
      if (s.shock > 0) s.shock -= dt;
      if (s.venom > 0 && (s.venomT -= dt) <= 0) s.venom = 0;
      if (s.seal > 0 && (s.sealT -= dt) <= 0) s.seal = 0;
      for (let i = 0; i < 3; i++)
        z.papers[i].visible =
          z.pin > 0 && z.pinKind === "seal" ? true : i < s.seal;
      // ---- movement
      const pinned = z.pin > 0;
      if (pinned) {
        z.pin -= dt;
        z.mixer.timeScale = z.pinKind === "seal" ? 0.04 : 0.25;
        if (z.pin <= 0) z.mixer.timeScale = 1;
      }
      z.stagger = Math.max(0, z.stagger - dt);
      z.fear = Math.max(0, z.fear - dt);
      // knock-back and lift
      z.pos.x += z.vel.x * dt;
      z.pos.z += z.vel.z * dt;
      z.vel.multiplyScalar(Math.exp(-6 * dt));
      if (z.lift > 0 || z.liftV > 0) {
        z.liftV -= 12 * dt;
        z.lift = Math.max(0, z.lift + z.liftV * dt);
        if (z.lift === 0) z.liftV = 0;
      }
      const b = stage.range.bounds;
      z.pos.x = Math.max(-b.halfW + 0.5, Math.min(b.halfW - 0.5, z.pos.x));
      z.pos.z = Math.max(b.far + 0.6, z.pos.z);
      z.holder.position.y = z.lift;
      const toEye = _a.set(eye.x - z.pos.x, 0, eye.z - z.pos.z);
      const dist = toEye.length();
      toEye.multiplyScalar(1 / Math.max(0.001, dist));
      let want = Math.atan2(toEye.x, toEye.z);
      if (!pinned) {
        if (z.fear > 0) {
          want += Math.PI;
          play(z, "run");
          const sp =
            (z.actions.run.getClip().userData.speed || 3) * z.scale * 0.9;
          z.pos.x -= toEye.x * sp * dt;
          z.pos.z -= toEye.z * sp * dt;
        } else if (mode === "horde" && z.stagger <= 0 && z.lift <= 0) {
          if (dist > 1.9) {
            const clip = z.runner ? "run" : "walk";
            play(z, clip);
            const native =
              (z.actions[clip].getClip().userData.speed || 1) * z.scale;
            z.actions[clip].timeScale = z.speed / native;
            z.pos.x += toEye.x * z.speed * dt;
            z.pos.z += toEye.z * z.speed * dt;
          } else {
            // in reach: every swing that lands is reported to whoever is keeping score
            if (z.current !== "attack" || !z.actions.attack.isRunning()) {
              z.current = null;
              play(z, "attack", 0.12);
            }
            z.atk -= dt;
            if (z.atk <= 0) {
              z.atk = HORDE[z.type].cooldown;
              for (const f of listeners.attack)
                f({ z, dmg: HORDE[z.type].damage });
            }
          }
        } else if (mode === "advance" && z.stagger <= 0 && z.lift <= 0) {
          if (dist > 1.9) {
            play(z, "walk");
            const sp =
              (z.actions.walk.getClip().userData.speed || 0.8) * z.scale;
            z.pos.x += toEye.x * sp * dt;
            z.pos.z += toEye.z * sp * dt;
          } else {
            // arrived: claw at the shooter for a while (harmless here), then go round again
            if (z.current !== "attack" || !z.actions.attack.isRunning()) {
              z.current = null;
              play(z, "attack", 0.12);
            }
            z.near += dt;
            if (z.near > 7) respawn(z);
          }
        } else if (mode === "stand") {
          play(z, "idle");
          // drift back to the assigned spot after being knocked around
          if (z.stagger <= 0 && z.lift <= 0) {
            const h = home(z);
            z.pos.x += (h[0] - z.pos.x) * Math.min(1, dt * 0.6);
            z.pos.z += (h[1] - z.pos.z) * Math.min(1, dt * 0.6);
          }
        }
        let dy = want - z.holder.rotation.y;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        z.holder.rotation.y += dy * Math.min(1, dt * 5);
      }
      // a staggered zombie leans back from the hit
      z.rig.rotation.x =
        -Math.min(0.35, z.stagger * 0.9) + (z.lift > 0 ? -0.5 : 0);
      z.mixer.update(dt);
      refresh(z);
      if (z.head) {
        // forehead talismans follow the head
        z.paperRoot.position.copy(z.headPos);
        z.paperRoot.position.y += 0.04 * z.scale;
        z.paperRoot.position.x +=
          Math.sin(z.holder.rotation.y) * 0.12 * z.scale;
        z.paperRoot.position.z +=
          Math.cos(z.holder.rotation.y) * 0.12 * z.scale;
        z.holder.worldToLocal(z.paperRoot.position);
        z.paperRoot.rotation.x = Math.sin(t * 2.3 + z.id) * 0.06;
      }
      // ---- status visuals
      if (s.burn > 0) E.burn(z.feet, z.headPos, dt, s.burn);
      if (s.shock > 0) E.shock(z.feet, z.headPos, dt);
      if (s.venom > 0) E.venom(z.feet, z.headPos, dt, s.venom);
      if (pinned && z.pinKind === "seal" && Math.random() < 12 * dt) {
        fx.glow({
          pos: _b.set(z.pos.x + srand(0.7), 0.05, z.pos.z + srand(0.7)),
          vel: _c.set(0, rand(0.6, 1.6), 0),
          life: rand(0.5, 1.1),
          size: [0.012, 0.004],
          color: [E.PAL.seal.spark, E.PAL.seal.end],
          type: fx.P.GLOW,
          fadePow: 0.8,
        });
      }
      z.flash = Math.max(0, z.flash - dt * 7);
      applyTint(z);
    }
  }

  function applyTint(z) {
    const s = z.st;
    // emissive wash: white hit flash, orange while burning, blue flicker when shocked, gold when sealed
    let r = z.flash * 0.04,
      g = z.flash * 0.03,
      b = z.flash * 0.025;
    if (s.burn > 0) {
      const k = 0.05 + 0.02 * s.burn + 0.02 * Math.sin(clock * 17 + z.id);
      r += k * 0.4;
      g += k * 0.08;
    }
    if (s.shock > 0 && z.alive) {
      const k = Math.sin(clock * 53 + z.id * 3) > 0.3 ? 0.16 : 0.03;
      g += k * 0.6;
      b += k;
    }
    if (s.venom > 0) g += 0.05 * s.venom;
    if (z.pin > 0 && z.pinKind === "seal") {
      r += 0.16;
      g += 0.11;
      b += 0.02;
    }
    const char = !z.alive && s.burn > 0 ? Math.max(0.15, 1 - z.dead * 0.6) : 1;
    for (const m of z.mats) {
      m.emissive.setRGB(r, g, b);
      m.emissiveIntensity = 1;
      tint.copy(m.userData.base.color).multiplyScalar(char);
      m.color.copy(tint);
    }
  }

  for (const z of list) refresh(z);
  return api;
}
