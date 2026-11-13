// Zombie targets for the firing range: the game's own skinned characters and clips, simple
// behaviour (stand still, shamble towards the shooter, or come on as a horde) and hit volumes.
// What a weapon does to them — damage, the four status effects, the reactions, the seasonings —
// is not written here: that is status.js, the same rules the game runs. Their numbers (health,
// speed, how hard and how often they hit, the size of the weak spot) are the game's own table,
// src/chinatown/zombietune.js.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { rand, srand } from "../fx/core.js";
import { FONT_KAI } from "../kit/index.js";
import { createStatus, clearStatus } from "./status.js";
import { STATUS } from "../data/status.js";
import { bloodOf } from "./fate.js";
import { LIMBS, WITH, createLimbs } from "../fx/limbs.js";
import { ZOMBIES } from "../../../src/chinatown/zombietune.js";

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
const NAMES = { walker: "行尸", brute: "重型僵尸" };
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
// with a melee weapon in hand the first few stand close enough to hit
const NEAR = [
  [-0.5, -2.3],
  [1.3, -2.9],
  [-1.7, -3.3],
  [0.3, -4.6],
];

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
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  // severed limbs lying in the alley
  const limbs = createLimbs({
    scene: root,
    blood: (pos, dir, k) => E.spurt(pos, dir, k),
    splat: (pos, size) => E.splat(pos, size),
  });
  // the rules every weapon's hit goes through, here and in the game
  const rules = createStatus({
    list,
    fx,
    E,
    rng: () => api.rng(), // (a test can load the dice: targets.rng = () => 0.5)
    hurt(z, dmg, o, direct, fate) {
      z.hp -= dmg;
      // (a hit that kills bursts instead: see kill())
      if (direct && o.blood !== false && z.hp > 0)
        E.blood(
          o.point || z.chest,
          o.dir,
          bloodOf(dmg / z.maxHp, o.head, api.rng),
        );
      // any hit knocks a walker off its stride for a moment, as in the game
      const flinch = ZOMBIES[z.type].flinch;
      if (flinch && z.pin <= 0)
        z.stagger = Math.max(z.stagger, o.head ? flinch.weak : flinch.body);
      if (z.hp > 0) return false;
      kill(z, o, fate);
      return true;
    },
  });
  let mode = "advance";
  let layout = "far";
  let clock = 0;
  const home = (z) =>
    layout === "near" && z.id < NEAR.length ? NEAR[z.id] : z.slot;

  function make(slot, idx) {
    const tpl = templates[slot[2]];
    const rig = cloneSkinned(tpl.scene);
    const mats = [];
    const meshes = [];
    rig.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.material.userData.base = {
        emissive: o.material.emissive.clone(),
        ei: o.material.emissiveIntensity,
        color: o.material.color.clone(),
      };
      mats.push(o.material);
      meshes.push(o);
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
    const z = clearStatus({
      id: idx,
      slot,
      type: tpl.type,
      rank: "",
      label: NAMES[tpl.type],
      holder,
      rig,
      mixer,
      actions,
      mats,
      // (for what comes off it: the body it was cloned from, its meshes in order, what is
      // gone and the torn ends that are left)
      tpl,
      meshes,
      lost: {},
      stumps: [],
      head,
      papers,
      paperRoot,
      radius: ZOMBIES[tpl.type].radius,
      scale: 1,
      height: 1.75,
      pos: holder.position,
      hp: 1,
      maxHp: 1,
      alive: true,
      state: "idle",
      current: null,
      vel: new THREE.Vector3(),
      stagger: 0,
      dead: 0,
      stuck: [],
      links: new Set(),
      mark: 0,
      headPos: new THREE.Vector3(),
      chest: new THREE.Vector3(),
      feet: new THREE.Vector3(),
    });
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
    const Z = ZOMBIES[z.type];
    // outside the horde only the first few are in play
    z.parked = mode !== "horde" && z.id >= RANGE_COUNT;
    z.wait = 0;
    z.atk = -1; // progress of the swing in hand, -1 between swings
    z.atkHit = false;
    z.cool = 0;
    z.runner = Math.random() < Z.runnerShare;
    z.speed = z.runner ? Z.runSpeed : Z.walkSpeed;
    z.scale = rand(Z.scale[0], Z.scale[1]);
    z.rig.scale.setScalar(z.scale);
    z.height = 1.75 * z.scale;
    z.radius = Z.radius * Math.max(1, z.scale);
    z.hp = z.maxHp = Z.hp;
    z.alive = true;
    z.dead = 0;
    z.stagger = 0;
    z.mark = 0;
    // whole again
    for (const st of z.stumps) {
      st.bone.scale.set(1, 1, 1);
      root.remove(st.mesh);
    }
    z.stumps.length = 0;
    z.lost = {};
    clearStatus(z);
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
    if (z.head)
      z.head.getWorldPosition(z.headPos).y += ZOMBIES.head.above * z.scale;
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
    // up to where the weak spot begins: no gap at the neck for a shot to slip through
    const top = z.headPos.y - ZOMBIES.head.radius * z.scale;
    if (y < z.lift + 0.02 || y > top) return -1;
    return t;
  }
  const api = {
    rng: Math.random,
    limbs,
    sever,
    // damage, apply, pin, scare, push, inSphere, inCone, nearest, alive, on, setInfusions …
    ...rules,
    rules,
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
    /** First zombie along a ray: { z, dist, point, head } or null. `skip` is a Set of zombies to ignore. */
    raycast(o, d, max = 300, skip = null) {
      let best = null;
      for (const z of list) {
        if (!z.alive || (skip && skip.has(z))) continue;
        let t = raySphere(o, d, z.headPos, ZOMBIES.head.radius * z.scale);
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
    update,
    stats() {
      return { alive: list.filter((z) => z.alive).length, total: list.length };
    },
  };

  // fate: what becomes of the body (combat/fate.js): how it is thrown and what comes off it.
  // The game's zombies do the same.
  function kill(z, o, fate) {
    const launch = fate && fate.launch;
    z.alive = false;
    z.state = "dead";
    z.dead = 0;
    z.mixer.timeScale = 1;
    z.lift = z.liftV = 0;
    z.vel.set(0, 0, 0);
    z.fly = null;
    if (o.dir) {
      E.gore(o.head ? z.headPos : z.chest, o.dir, {
        size: z.scale,
        head: !!o.head,
        thrown: !!launch,
        amount: fate ? fate.gore : 1,
      });
      if (launch) {
        _a.set(o.dir.x, 0, o.dir.z)
          .normalize()
          .applyAxisAngle(UP, launch.turn || 0)
          .multiplyScalar(launch.speed);
        z.fly = { x: _a.x, z: _a.z, up: launch.up, air: true };
      }
      if (fate) {
        if (fate.pop) sever(z, "head", o.dir, { pop: true });
        if (fate.limbs) for (const limb of fate.limbs) sever(z, limb, o.dir);
      }
    }
    const facing = _a.set(
      Math.sin(z.holder.rotation.y),
      0,
      Math.cos(z.holder.rotation.y),
    );
    const fromFront = !o.dir || o.dir.dot(facing) < 0;
    play(z, fromFront ? "death_back" : "death_front", 0.08);
    for (const p of z.papers) p.visible = false;
    fx.audio &&
      fx.after(0.55, () =>
        fx.audio.world("fall", z.pos, { gain: 0.9, gap: 0.06 }),
      );
    rules.died(z);
  }

  // A limb comes off (fx/limbs.js): the bone is shrunk away, a torn end goes over the joint,
  // the limb is thrown unless it burst, and the end spurts for a moment.
  function sever(z, limb, dir, o = {}) {
    if (z.lost[limb]) return false;
    const bone = z.rig.getObjectByName(LIMBS[limb]);
    if (!bone) return false;
    z.holder.updateMatrixWorld(true);
    const cut = limbs.of(z.tpl.scene, bone.name);
    if (!cut.parts.length) return false;
    const at = bone.getWorldPosition(new THREE.Vector3());
    if (!o.pop) {
      const v = new THREE.Vector3(srand(1.2), rand(2.2, 4.6), srand(1.2));
      if (dir) v.addScaledVector(_a.set(dir.x, 0, dir.z), rand(2, 4.8));
      limbs.toss({
        body: z.tpl.scene,
        bone: bone.name,
        matrix: bone.matrixWorld,
        materials: z.meshes.map((m) => m.material),
        vel: v,
        spin: rand(6, 15),
        ground: 0,
      });
    }
    bone.scale.setScalar(1e-4);
    z.lost[limb] = true;
    if (WITH[limb]) z.lost[WITH[limb]] = true;
    const radius = cut.radius * 1.08;
    const mesh = limbs.stump(radius);
    root.add(mesh);
    z.stumps.push({
      limb,
      bone,
      mesh,
      radius,
      bleed: rand(1, 2.4),
      t: 0,
      next: 0,
    });
    E.blood(at, dir || UP, bloodOf(0.6, !!o.pop, api.rng), { quiet: true });
    return true;
  }
  // the torn ends follow the body, and pump for a moment
  function tend(z, dt) {
    z.holder.updateMatrixWorld(true);
    for (const st of z.stumps) {
      limbs.place(st.mesh, st.bone, st.radius);
      if (st.bleed <= 0) continue;
      st.bleed -= dt;
      st.t += dt;
      if ((st.next -= dt) > 0 || Math.sin(st.t * 10.5) < 0.1) continue;
      st.next = 0.06;
      const e = st.mesh.matrix.elements;
      E.spurt(
        _a.set(e[12], e[13], e[14]),
        _b.set(e[4], e[5], e[6]).normalize().multiplyScalar(2.4),
        Math.min(1, st.bleed / 1.5),
      );
    }
  }

  function update(dt, t) {
    clock = t;
    limbs.update(dt);
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
      if (!z.alive) {
        z.dead += dt;
        z.mixer.update(dt);
        const f = z.fly;
        if (f) {
          // through the air, down under gravity, then a skid (between the alley's walls)
          const half = stage.range.bounds.halfW - 0.5;
          z.pos.x = Math.max(-half, Math.min(half, z.pos.x + f.x * dt));
          z.pos.z += f.z * dt;
          if (f.air) {
            f.up -= STATUS.launch.gravity * dt;
            z.lift = Math.max(0, z.lift + f.up * dt);
            if (z.lift === 0 && f.up < 0) {
              f.air = false;
              f.x *= 0.55;
              f.z *= 0.55;
            }
          } else {
            const k = Math.exp(-STATUS.launch.skid * dt);
            f.x *= k;
            f.z *= k;
            if (f.x * f.x + f.z * f.z < 0.01) z.fly = null;
          }
          z.holder.position.set(z.pos.x, z.lift, z.pos.z);
        }
        // all corpses sink after a while and come back at the far end
        refresh(z);
        if (z.stumps.length) tend(z, dt);
        rules.corpse(z, dt, z.dead);
        if (z.dead > 4.5) z.holder.position.y -= dt * 0.5;
        if (z.dead > (mode === "horde" ? 3.2 : 6.5)) respawn(z);
        applyTint(z);
        continue;
      }
      // ---- statuses (the burn may kill)
      rules.tick(z, dt);
      if (!z.alive) continue;
      const shown = rules.papers(z);
      for (let i = 0; i < 3; i++) z.papers[i].visible = i < shown;
      // ---- movement
      const Z = ZOMBIES[z.type];
      const pinned = z.pin > 0;
      z.mixer.timeScale = rules.heldRate(z);
      z.stagger = Math.max(0, z.stagger - dt);
      // knock-back and lift
      z.pos.x += z.vel.x * dt;
      z.pos.z += z.vel.z * dt;
      z.vel.multiplyScalar(Math.exp(-6 * dt));
      const b = stage.range.bounds;
      z.pos.x = Math.max(-b.halfW + 0.5, Math.min(b.halfW - 0.5, z.pos.x));
      z.pos.z = Math.max(b.far + 0.6, z.pos.z);
      z.holder.position.y = z.lift;
      const toEye = _a.set(eye.x - z.pos.x, 0, eye.z - z.pos.z);
      const dist = toEye.length();
      toEye.multiplyScalar(1 / Math.max(0.001, dist));
      let want = Math.atan2(toEye.x, toEye.z);
      if (!pinned) {
        // staggered: it keeps a fraction of its speed and cannot start a swing
        const slow = z.stagger > 0 ? ZOMBIES.staggerSlow : 1;
        if (z.fear > 0) {
          want += Math.PI;
          play(z, "run");
          z.atk = -1;
          z.pos.x -= toEye.x * Z.runSpeed * dt;
          z.pos.z -= toEye.z * Z.runSpeed * dt;
        } else if (mode === "horde" && z.lift <= 0) {
          z.cool -= dt;
          if (z.atk >= 0) {
            // a swing already begun is carried through; it lands if the shooter is still there
            const act = z.actions.attack;
            z.atk += (dt * Z.attackRate) / act.getClip().duration;
            if (!z.atkHit && z.atk >= ZOMBIES.attackHitAt) {
              z.atkHit = true;
              if (dist < Z.reach + 0.55)
                rules.emit("attack", { z, dmg: Z.damage });
            }
            if (z.atk >= 1) {
              z.atk = -1;
              z.cool = rand(Z.cooldown[0], Z.cooldown[1]);
            }
          } else if (dist > Z.reach) {
            const clip = z.runner ? "run" : "walk";
            play(z, clip);
            const sp = z.speed * slow;
            const native =
              (z.actions[clip].getClip().userData.speed || 1) * z.scale;
            z.actions[clip].timeScale = sp / native;
            z.pos.x += toEye.x * sp * dt;
            z.pos.z += toEye.z * sp * dt;
          } else if (z.cool <= 0 && z.stagger <= 0) {
            z.atk = 0;
            z.atkHit = false;
            z.current = null;
            play(z, "attack", 0.12);
            z.actions.attack.timeScale = Z.attackRate;
          } else play(z, "idle");
        } else if (mode === "advance" && z.lift <= 0) {
          if (dist > 1.9) {
            play(z, "walk");
            const sp =
              (z.actions.walk.getClip().userData.speed || 0.8) * z.scale * slow;
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
      } else z.atk = -1;
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
      rules.visuals(z, dt);
      applyTint(z);
    }
  }

  const tint = new THREE.Color();
  const wash = [0, 0, 0];
  function applyTint(z) {
    wash[0] = wash[1] = wash[2] = 0;
    rules.wash(z, clock, z.id, wash);
    // a burnt corpse chars
    const char =
      !z.alive && z.st.burn > 0 ? Math.max(0.15, 1 - z.dead * 0.6) : 1;
    for (const m of z.mats) {
      m.emissive.setRGB(wash[0], wash[1], wash[2]);
      m.emissiveIntensity = 1;
      tint.copy(m.userData.base.color).multiplyScalar(char);
      m.color.copy(tint);
    }
  }

  for (const z of list) refresh(z);
  return api;
}
