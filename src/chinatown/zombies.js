// Zombies: skinned characters with mocap clips, grid pathfinding and melee.
// Implements the same surface the game expects from its enemy system
// (list / spawn / raycast / aliveCount / clear / alert / update / TUNE).
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  ZOMBIES,
  EXTRA_BODIES,
  EXTRA_RIGS,
  BODY_TEX,
  BODY_TEX_HANDHELD,
} from "./zombietune.js";

const ASSETS = "assets/zombies/";
const CHARACTERS = {
  romero: { file: "romero.glb", type: "walker" },
  girl: { file: "girl.glb", type: "walker" },
  cop: { file: "cop.glb", type: "walker" },
  soldier: { file: "soldier.glb", type: "brute" },
};
// name -> looping locomotion clips have their root motion removed and measured
const CLIPS = {
  idle: { loop: true },
  walk: { loop: true, travel: true },
  run: { loop: true, travel: true },
  crawl: { loop: true, travel: true },
  crawl_fast: { loop: true, travel: true },
  attack: {},
  scream: {},
  death_back: {},
  death_front: {},
};

export const TUNE = ZOMBIES;
const HIT = { head: 1, body: 1, arm: 1, leg: 1 };

const PART_DAMAGE = { weak: 1, body: 1, arm: 0.6, leg: 0.7 };

export async function createZombies(G) {
  const T = G.THREE;
  const V3 = T.Vector3;
  const rng = mulberry(+((G.params && G.params.eseed) || 9001));
  const rand = (a, b) => a + (b - a) * rng();
  const root = new T.Group();
  root.name = "zombies";
  G.scene.add(root);

  // ---------- assets ----------
  const loader = new GLTFLoader();
  const base = import.meta.env.BASE_URL || "/";
  const load = (file) => loader.loadAsync(base + ASSETS + file);
  const [charFiles, clipFiles] = await Promise.all([
    Promise.all(Object.values(CHARACTERS).map((c) => load(c.file))),
    Promise.all(Object.keys(CLIPS).map((n) => load(`clip_${n}.glb`))),
  ]);

  const clips = {};
  Object.keys(CLIPS).forEach((name, i) => {
    const gltf = clipFiles[i];
    const hips = gltf.scene.getObjectByName("Hips");
    clips[name] = prepareClip(
      T,
      gltf.animations[0],
      name,
      CLIPS[name],
      hips ? hips.position.y : 1,
    );
  });

  // The characters ship 2048 px maps (about 300 MB of GPU memory for all four). The low
  // preset keeps them at 1024, which is what a phone screen can resolve on a zombie anyway;
  // BODY_TEX has the size for every preset. Read when a body arrives, not once: the ones a
  // run fetches come after the player may have changed the preset.
  const texLimit = (extra) => {
    const i = extra ? 1 : 0;
    const q = (BODY_TEX[G.quality && G.quality.name] || BODY_TEX.high)[i];
    if (!G.handheld) return q;
    return q ? Math.min(q, BODY_TEX_HANDHELD[i]) : BODY_TEX_HANDHELD[i];
  };
  // keyed by image source: the occlusion/roughness/metalness maps share one image
  const toShrink = new Map();
  const wantShrink = (tex, limit) => {
    const img = tex && tex.image;
    if (limit && img && img.width > limit) {
      if (!toShrink.has(tex.source))
        toShrink.set(tex.source, { users: [], limit });
      toShrink.get(tex.source).users.push(tex);
    }
  };
  // Resized by the browser into a new ImageBitmap (same raw, unpremultiplied, unconverted
  // pixels as the GLTF loader's); a canvas is the fallback where resize options are missing.
  async function shrink([source, { users, limit }]) {
    const img = source.data;
    const k = limit / Math.max(img.width, img.height);
    const w = Math.round(img.width * k),
      h = Math.round(img.height * k);
    let out = null;
    try {
      out = await createImageBitmap(img, {
        resizeWidth: w,
        resizeHeight: h,
        resizeQuality: "high",
        premultiplyAlpha: "none",
        colorSpaceConversion: "none",
      });
      if (out.width !== w) out = null;
    } catch {
      out = null;
    }
    if (!out) {
      out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const x = out.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(img, 0, 0, w, h);
    }
    if (typeof img.close === "function") img.close();
    source.data = out;
    source.needsUpdate = true;
    for (const tex of users) tex.needsUpdate = true;
  }
  const MAPS = [
    "map",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "aoMap",
    "emissiveMap",
    "alphaMap",
  ];

  const templates = {};
  // cfg: an entry of CHARACTERS, or of EXTRA_BODIES (extra: true)
  function addTemplate(name, cfg, scene, extra) {
    const hips = scene.getObjectByName("Hips");
    const names = new Set();
    const limit = texLimit(extra);
    scene.traverse((o) => {
      names.add(o.name);
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      for (const k of MAPS) wantShrink(o.material[k], limit);
    });
    const t = (templates[name] = {
      name,
      type: cfg.type,
      extra: !!extra,
      hit: { ...HIT, ...cfg.hit },
      girth: cfg.girth || 1,
      scene,
      hipsY: hips ? hips.position.y : 1,
      clips: {},
    });
    for (const [key, clip] of Object.entries(clips)) {
      const copy = scaleRoot(clip, t.hipsY / clip.userData.hipsY);
      // (a body without finger bones has nothing for those tracks to turn)
      copy.tracks = copy.tracks.filter((k) => names.has(k.name.split(".")[0]));
      t.clips[key] = copy;
    }
    return t;
  }
  async function shrinkPending() {
    const jobs = [...toShrink];
    toShrink.clear();
    await Promise.all(jobs.map(shrink));
  }
  Object.keys(CHARACTERS).forEach((name, i) =>
    addTemplate(name, CHARACTERS[name], charFiles[i].scene, false),
  );
  await shrinkPending();

  // ---------- shared state ----------
  const list = [];
  const corpses = [];
  const pool = [];
  const tmp = {
    a: new V3(),
    b: new V3(),
    c: new V3(),
    d: new V3(),
    e: new V3(),
    q: new T.Quaternion(),
  };
  const UP = new V3(0, 1, 0);
  let clock = 0;
  let nextId = 1;
  let noiseGate = 0;
  // grid searches allowed per frame; the rest wait a frame (straight-line checks are free)
  const PATHS_PER_FRAME = 3;
  let pathBudget = PATHS_PER_FRAME;
  const lowShadows = G.quality && G.quality.name === "low";
  const LOW_SHADOW_D2 = 22 * 22;

  const emit = (name, data) => G.events.emit(name, data);
  const nav = () => G.physics.nav;

  function makeMaterials(rig, tint) {
    const made = new Map();
    rig.traverse((o) => {
      if (!o.isMesh) return;
      let m = made.get(o.material);
      if (!m) {
        m = o.material.clone();
        m.color.copy(tint);
        m.envMapIntensity = 0.9;
        if (G.mats && G.mats.adopt)
          G.mats.adopt(m, { wet: [0.08, 0.72, 0.6, 0.3], macro: [0, 0, 1, 0] });
        made.set(o.material, m);
      }
      o.material = m;
      // bind-pose bounds are useless once the clip moves the hips: use one generous local sphere
      o.boundingSphere = new T.Sphere(new V3(0, 0.9, 0), 2.6);
      o.boundingBox = new T.Box3(new V3(-2.6, -1, -2.6), new V3(2.6, 2.8, 2.6));
    });
  }

  // The clone gives every skinned mesh its own copy of the skeleton, so each zombie would
  // compute and upload the same bone matrices once per mesh (hair, eyes, body, clothes...).
  // Meshes that shared a skeleton in the source share one again.
  function shareSkeletons(source, rig) {
    const src = [];
    const dst = [];
    source.traverse((o) => o.isSkinnedMesh && src.push(o));
    rig.traverse((o) => o.isSkinnedMesh && dst.push(o));
    if (src.length !== dst.length) return;
    const shared = new Map();
    dst.forEach((m, i) => {
      const key = src[i].skeleton;
      const s = shared.get(key);
      if (s) m.skeleton = s;
      else shared.set(key, m.skeleton);
    });
  }

  // Elites and the boss smoulder: an emissive tint on that rig's own materials (a uniform,
  // so no shader is recompiled). null puts the rig back to normal.
  function setGlow(z, glow) {
    for (const m of z.mats) {
      if (!m.emissive) continue;
      const base = (m.userData.baseGlow ??= [
        m.emissive.r,
        m.emissive.g,
        m.emissive.b,
        m.emissiveIntensity,
      ]);
      const g = glow || base;
      m.emissive.setRGB(g[0], g[1], g[2]);
      m.emissiveIntensity = g[3] ?? 1;
    }
  }

  function createZombie(template) {
    const rig = cloneSkinned(template.scene);
    shareSkeletons(template.scene, rig);
    // pallid, slightly green skin and clothes: kept light so they read under street light
    const k = rand(0.92, 1.2);
    const tint = new T.Color()
      .setHSL(rand(0.18, 0.36), rand(0.0, 0.16), 0.8)
      .multiplyScalar(k / 0.8);
    makeMaterials(rig, tint);
    // Pooled rigs join the scene graph only while in use: the renderer walks every child's
    // matrices each frame, visible or not, and a rig is ~70 bones.
    rig.visible = false;
    const meshes = [];
    rig.traverse((o) => o.isMesh && meshes.push(o));
    const mats = [...new Set(meshes.map((m) => m.material))];
    // The skeleton lives outside the scene graph. Skinning only needs each bone's world
    // matrix, so there is no reason for the renderer to walk ~65 bones per zombie every frame
    // (matrix update and culling traversal). Bones are re-posed here, and only on frames where
    // the zombie moved or its animation advanced (see sync()). Each top-level bone hangs from
    // a pivot that keeps the transform of its old parent inside the rig.
    rig.updateMatrixWorld(true);
    const tops = [];
    rig.traverse((o) => o.isBone && !o.parent.isBone && tops.push(o));
    const holder = new T.Object3D();
    holder.name = "skeleton";
    holder.matrixAutoUpdate = false;
    for (const b of tops) {
      const pivot = new T.Object3D();
      pivot.matrixAutoUpdate = false;
      pivot.matrix.copy(b.parent.matrixWorld);
      holder.add(pivot);
      pivot.add(b);
    }
    // local matrices are composed by hand: bones in pose(), the rest of the rig never moves
    rig.traverse((o) => {
      o.updateMatrix();
      o.matrixAutoUpdate = false;
    });
    const skel = [];
    for (const b of tops)
      b.traverse((o) => {
        o.matrixAutoUpdate = false;
        skel.push(o);
      });
    const mixer = new T.AnimationMixer(holder);
    const actions = {};
    for (const [name, clip] of Object.entries(template.clips)) {
      const a = mixer.clipAction(clip);
      if (!CLIPS[name].loop) {
        a.setLoop(T.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      actions[name] = a;
    }
    const bone = (n) => holder.getObjectByName(n);
    const bones = {
      head: bone("Head"),
      neck: bone("Neck"),
      hips: bone("Hips"),
      spine: bone("Spine1"),
      lArm: bone("LeftArm"),
      lFore: bone("LeftForeArm"),
      lHand: bone("LeftHand"),
      rArm: bone("RightArm"),
      rFore: bone("RightForeArm"),
      rHand: bone("RightHand"),
      lUp: bone("LeftUpLeg"),
      lLeg: bone("LeftLeg"),
      lFoot: bone("LeftFoot"),
      rUp: bone("RightUpLeg"),
      rLeg: bone("RightLeg"),
      rFoot: bone("RightFoot"),
    };
    const P = {};
    for (const k of Object.keys(bones)) P[k] = new V3();

    const z = {
      id: 0,
      type: template.type,
      kind: template.name,
      // a body on trial (EXTRA_BODIES): not in the run's pool, and `type` is whatever it was
      // last brought on as
      extra: template.extra,
      hit: template.hit,
      girth: template.girth,
      active: false,
      alive: false,
      passive: false,
      pos: new V3(),
      vel: new V3(),
      yaw: 0,
      hp: 1,
      maxHp: 1,
      mode: "patrol",
      modeT: 0,
      home: new V3(),
      lastKnown: new V3(),
      sensor: new V3(),
      fwd: new V3(0, 0, 1),
      los: false,
      rig,
      mixer,
      actions,
      bones,
      P,
      scale: 1,
      anim: "",
      runner: false,
      crawling: false,
      legDamage: 0,
      speed: 0,
      wantSpeed: 0,
      path: null,
      pathI: 0,
      repathT: 0,
      senseT: 0,
      stuckT: 0,
      attackT: -1,
      attackHit: false,
      cooldown: 0,
      staggerT: 0,
      flinch: 0,
      flinchAxis: new V3(1, 0, 0),
      voiceT: 0,
      stepT: 0,
      deadT: 0,
      sink: 0,
      knock: new V3(),
      lodT: 0,
      lodAcc: 0,
      screamT: 0,
      // run director overrides: "" | "elite" | "boss", and per-spawn multipliers
      rank: "",
      reach: 1.5,
      dmgMul: 1,
      speedMul: 1,
      glow: null,
      // What the run's weapons are doing to this one (written by armory.js each frame):
      // pin = seconds held in place (rate = how fast its animation still plays), fear = seconds
      // it runs from the player, push = knock-back velocity, lift = height it has been thrown to.
      ctl: { pin: 0, rate: 0.25, fear: 0, push: new V3(), lift: 0 },
      mats,
      meshes,
      skel,
      holder,
      dirty: true,
      shadow: true,

      _activate(pos, opts = {}) {
        const tune = TUNE[z.type];
        z.active = true;
        z.alive = true;
        z.passive = !!opts.passive;
        z.dull = !!opts.dull; // a wanderer: see TUNE.wander
        z.pos.copy(pos);
        z.pos.y = G.physics.groundHeight(pos.x, pos.z, 1.5);
        z.vel.set(0, 0, 0);
        z.yaw = opts.yaw !== undefined ? opts.yaw : rand(0, Math.PI * 2);
        z.rank = opts.rank || "";
        z.hp = z.maxHp = Math.round(tune.hp * (opts.hpMul || 1));
        z.dmgMul = opts.dmgMul || 1;
        z.speedMul = opts.speedMul || 1;
        z.home.copy(z.pos);
        z.scale = rand(tune.scale[0], tune.scale[1]) * (opts.scale || 1);
        z.reach = tune.reach * Math.max(1, opts.scale || 1);
        rig.scale.setScalar(z.scale);
        z.glow = opts.glow || null;
        setGlow(z, z.glow);
        z.ctl.pin = z.ctl.fear = z.ctl.lift = 0;
        z.ctl.push.set(0, 0, 0);
        z.runner =
          opts.runner !== undefined ? !!opts.runner : rng() < tune.runnerShare;
        z.crawling = false;
        z.legDamage = 0;
        z.speed = 0;
        z.path = null;
        z.repathT = rand(0, 0.4);
        z.senseT = rand(0, 0.2);
        z.attackT = -1;
        z.cooldown = rand(0.2, 0.8);
        z.staggerT = 0;
        z.flinch = 0;
        z.voiceT = rand(0.5, 4);
        z.deadT = 0;
        z.sink = 0;
        z.knock.set(0, 0, 0);
        z.stuckT = 0;
        z.screamT = 0;
        z.los = false;
        mixer.stopAllAction();
        z.anim = "";
        const alert = opts.state === "alert";
        z.mode = alert ? "engage" : "patrol";
        z.modeT = rand(1, 4);
        if (alert && G.player) z.lastKnown.copy(opts.target || G.player.pos);
        else z.lastKnown.copy(z.pos);
        play(z, "idle", 0);
        actions.idle.time = rand(0, 4);
        rig.visible = true;
        if (rig.parent !== root) root.add(rig);
        place(z);
        mixer.update(0);
        pose(z);
        sync(z);
        readBones(z);
      },

      _deactivate() {
        z.active = false;
        z.alive = false;
        rig.visible = false;
        if (rig.parent) rig.parent.remove(rig);
        mixer.stopAllAction();
        z.anim = "";
      },

      damage(amount, point, dir, part = "body") {
        if (!z.alive) return false;
        const dealt = amount * (PART_DAMAGE[part] ?? 1);
        z.hp -= dealt;
        if (part === "leg") z.legDamage += dealt;
        z.flinch = Math.min(1, z.flinch + (z.type === "brute" ? 0.35 : 0.8));
        if (dir) z.flinchAxis.set(dir.z, 0, -dir.x).normalize();
        const flinch = TUNE[z.type].flinch;
        if (flinch)
          z.staggerT = Math.max(
            z.staggerT,
            part === "weak" ? flinch.weak : flinch.body,
          );
        emit("enemy:hit", {
          enemy: z,
          part,
          pos: point || z.pos,
          amount: dealt,
        });
        if (z.hp <= 0) {
          kill(z, dir, part, dealt);
          return true;
        }
        if (
          !z.crawling &&
          z.type === "walker" &&
          z.legDamage > z.maxHp * 0.55
        ) {
          z.crawling = true;
          z.attackT = -1;
          emit("enemy:voice", {
            enemy: z,
            pos: z.pos,
            kind: "growl",
            type: z.type,
          });
        }
        if (z.mode !== "engage" && !z.passive) engage(z, true);
        return false;
      },

      _raycast(origin, dir, maxDist, out) {
        return raycastZombie(z, origin, dir, maxDist, out);
      },

      _update(dt) {
        updateZombie(z, dt);
      },
    };
    return z;
  }

  if (G.quality && G.quality.name !== "low" && !(G.params && G.params.pool))
    TUNE.pool = { ...TUNE.poolLarge };
  for (const [name, count] of Object.entries(TUNE.pool))
    for (let i = 0; i < count; i++) pool.push(createZombie(templates[name]));

  // when does the swing actually land? sample the clip once and take the furthest forward reach of a hand
  const hitTime = measureHit(pool.find((z) => z.kind === "romero"));

  // One rig per character waits far below the street until the first spawn, so the shader
  // pre-compile at level-ready includes the skinned materials (no hitch on the first wave).
  let warm = [];
  for (const name of Object.keys(CHARACTERS)) {
    const z = pool.find((p) => p.kind === name);
    if (!z) continue;
    z.rig.position.set(0, -200, 0);
    z.rig.updateMatrix();
    sync(z);
    z.rig.visible = true;
    root.add(z.rig);
    warm.push(z);
  }
  function coolDown() {
    for (const z of warm)
      if (!z.active) {
        z.rig.visible = false;
        root.remove(z.rig);
      }
    warm = null;
  }

  // ---------- animation ----------
  function play(z, name, fade = 0.22, timeScale = 1) {
    const next = z.actions[name];
    if (!next) return;
    if (z.anim === name) {
      next.timeScale = timeScale;
      return;
    }
    const prev = z.actions[z.anim];
    next.reset();
    next.timeScale = timeScale;
    next.setEffectiveWeight(1);
    next.play();
    if (prev && fade > 0) prev.crossFadeTo(next, fade, false);
    else if (prev) prev.stop();
    z.anim = name;
  }

  function place(z) {
    const r = z.rig;
    const y = z.pos.y - z.sink + (z.alive ? z.ctl.lift : 0);
    if (
      r.position.x !== z.pos.x ||
      r.position.y !== y ||
      r.position.z !== z.pos.z ||
      r.rotation.y !== z.yaw
    ) {
      r.position.set(z.pos.x, y, z.pos.z);
      r.rotation.y = z.yaw;
      r.updateMatrix();
      z.dirty = true;
    }
    z.fwd.set(Math.sin(z.yaw), 0, Math.cos(z.yaw));
  }

  // after the mixer has written bone rotations
  function pose(z) {
    const s = z.skel;
    for (let i = 0; i < s.length; i++) s[i].updateMatrix();
    z.dirty = true;
  }

  // bone world matrices = rig placement x pose (the zombie root group sits at the origin)
  function sync(z) {
    z.holder.matrix.copy(z.rig.matrix);
    z.holder.updateMatrixWorld(true);
    z.dirty = false;
  }

  function readBones(z) {
    for (const k in z.bones) {
      const b = z.bones[k];
      if (b) z.P[k].setFromMatrixPosition(b.matrixWorld);
    }
    z.sensor.copy(z.P.head);
    z.sensor.y += 0.06;
  }

  function measureHit(z) {
    if (!z) return 0.4;
    const clip = z.actions.attack.getClip();
    const a = z.actions.attack;
    z.rig.position.set(0, 0, 0);
    z.rig.rotation.y = 0;
    z.rig.updateMatrix();
    a.reset().play();
    let best = 0;
    let bestT = clip.duration * 0.4;
    for (let i = 0; i <= 48; i++) {
      const t = (clip.duration * i) / 48;
      a.time = t;
      z.mixer.update(0);
      pose(z);
      sync(z);
      for (const hand of [z.bones.lHand, z.bones.rHand]) {
        if (!hand) continue;
        const p = tmp.a.setFromMatrixPosition(hand.matrixWorld);
        if (p.z > best && p.y > 0.9) {
          best = p.z;
          bestT = t;
        }
      }
    }
    z.mixer.stopAllAction();
    return bestT / clip.duration;
  }

  // ---------- behaviour ----------
  function engage(z, silent) {
    if (z.mode === "engage") return;
    z.mode = "engage";
    z.repathT = 0;
    if (!silent) {
      emit("enemy:alert", { enemy: z });
      emit("enemy:voice", {
        enemy: z,
        pos: z.pos,
        kind: "scream",
        type: z.type,
      });
      // a few of them stop and howl first: it sells the moment and staggers the charge
      if (!z.crawling && rng() < 0.3) {
        z.screamT = z.actions.scream.getClip().duration / 1.5;
        play(z, "scream", 0.2, 1.5);
      }
      rally(z.pos, 16, z);
    }
  }

  function rally(pos, radius, source) {
    for (const o of list) {
      if (o === source || !o.alive || o.passive || o.mode === "engage")
        continue;
      const r = o.dull ? Math.min(radius, TUNE.wander.rally) : radius;
      if (o.pos.distanceToSquared(pos) > r * r) continue;
      o.mode = "investigate";
      o.modeT = rand(8, 12);
      if (G.player) o.lastKnown.copy(G.player.pos);
    }
  }

  function sense(z, dt) {
    const player = G.player;
    if (z.passive || !player || player.alive === false) {
      z.los = false;
      return;
    }
    z.senseT -= dt;
    if (z.senseT > 0) return;
    z.senseT = rand(0.14, 0.24);
    const eye = player.eye || player.pos;
    const dx = eye.x - z.sensor.x;
    const dy = eye.y - z.sensor.y;
    const dz = eye.z - z.sensor.z;
    const dist = Math.hypot(dx, dy, dz);
    let seen = false;
    // a wanderer that has not gone for anyone yet notices far less
    const S = z.dull && z.mode !== "engage" ? TUNE.wander : TUNE;
    if (dist < S.sightRange) {
      const flat = Math.hypot(dx, dz) || 1e-4;
      const facing = (dx * z.fwd.x + dz * z.fwd.z) / flat;
      const cone = Math.cos(((S.sightCone / 2) * Math.PI) / 180);
      if (z.mode === "engage" || facing > cone || dist < S.senseRadius)
        seen = G.physics.lineOfSight(z.sensor, eye);
    }
    z.los = seen;
    if (seen) {
      z.lastKnown.copy(player.pos);
      if (z.mode !== "engage") engage(z, false);
    } else if (z.mode !== "engage" && dist < S.senseRadius * 0.6) {
      // close enough to smell, wall or not
      z.lastKnown.copy(player.pos);
      engage(z, false);
    }
  }

  function steer(z, target, dt, speed) {
    const dx = target.x - z.pos.x;
    const dz = target.z - z.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-3) return d;
    const want = Math.atan2(dx, dz);
    let diff = want - z.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = (z.runner ? 5.5 : 3.6) * dt;
    z.yaw += Math.max(-turn, Math.min(turn, diff));
    // slow down while turning hard so they do not orbit their target
    const align = Math.max(
      0.15,
      Math.cos(Math.min(Math.abs(diff), Math.PI / 2)),
    );
    z.wantSpeed = speed * align;
    return d;
  }

  function follow(z, goal, dt, speed) {
    z.repathT -= dt;
    const n = nav();
    if (z.repathT <= 0 && pathBudget <= 0) z.repathT = 0.016;
    else if (z.repathT <= 0) {
      pathBudget--;
      const dist = Math.hypot(goal.x - z.pos.x, goal.z - z.pos.z);
      z.repathT = dist < 6 ? rand(0.25, 0.45) : rand(0.6, 1.1);
      let direct = false;
      try {
        direct = n.clearLine(z.pos, goal);
      } catch {}
      if (direct) z.path = null;
      else {
        let p = null;
        try {
          p = n.findPath(z.pos, goal);
        } catch {}
        z.path = p && p.length ? p : null;
        z.pathI = 0;
      }
    }
    if (z.path && z.pathI < z.path.length) {
      const wp = z.path[z.pathI];
      const d = steer(z, wp, dt, speed);
      if (d < 0.55 && z.pathI < z.path.length - 1) z.pathI++;
      else if (d < 0.3) z.path = null;
    } else steer(z, goal, dt, speed);
  }

  function gaitSpeed(z) {
    const tune = TUNE[z.type];
    if (z.crawling) return z.runner ? 1.7 : 0.8;
    const engaged = z.mode === "engage";
    if (!engaged)
      return z.mode === "investigate" ? tune.walkSpeed : tune.walkSpeed * 0.6;
    return (z.runner ? tune.runSpeed : tune.walkSpeed) * z.speedMul;
  }

  function locomotionClip(z) {
    if (z.crawling) return z.runner ? "crawl_fast" : "crawl";
    return z.runner && z.mode === "engage" ? "run" : "walk";
  }

  function updateZombie(z, dt) {
    if (!z.active) return;
    if (!z.alive) return updateCorpse(z, dt);
    const player = G.player;
    const tune = TUNE[z.type];
    // hit volumes and the eye follow the pose the renderer last drew
    readBones(z);

    sense(z, dt);
    z.cooldown -= dt;
    z.staggerT -= dt;
    z.wantSpeed = 0;

    const ctl = z.ctl;
    const held = ctl.pin > 0 || ctl.lift > 0.02;
    if (held) {
      // nailed down, sealed or in the air: nothing it wants happens
      z.wantSpeed = 0;
      z.attackT = -1;
      z.screamT = 0;
    } else if (ctl.fear > 0 && player) {
      // frightened: straight away from the player, as fast as it can go
      z.attackT = -1;
      tmp.d.subVectors(z.pos, player.pos).setY(0);
      if (tmp.d.lengthSq() < 1e-4) tmp.d.set(1, 0, 0);
      tmp.d.normalize().multiplyScalar(6).add(z.pos);
      follow(z, tmp.d, dt, tune.runSpeed);
    } else if (z.screamT > 0) {
      z.screamT -= dt;
      if (player) steer(z, player.pos, dt, 0);
      z.wantSpeed = 0;
    } else if (z.attackT >= 0) {
      // committed swing: turn a little, land the hit at the measured frame
      const clip = z.actions.attack.getClip();
      const rate = tune.attackRate;
      z.attackT += (dt * rate) / clip.duration;
      if (player) steer(z, player.pos, dt * 0.6, 0);
      z.wantSpeed = 0;
      if (!z.attackHit && z.attackT >= hitTime) {
        z.attackHit = true;
        if (player && player.alive !== false) {
          const d = Math.hypot(player.pos.x - z.pos.x, player.pos.z - z.pos.z);
          const dy = Math.abs(player.pos.y - z.pos.y);
          const facing =
            ((player.pos.x - z.pos.x) * z.fwd.x +
              (player.pos.z - z.pos.z) * z.fwd.z) /
            (d || 1);
          if (d < z.reach + 0.55 && dy < 1.7 && facing > 0.2) {
            player.damage(tune.damage * z.dmgMul, z.pos);
            emit("enemy:melee", { enemy: z, pos: z.pos, type: z.type });
          }
        }
      }
      if (z.attackT >= 1) {
        z.attackT = -1;
        z.cooldown = rand(tune.cooldown[0], tune.cooldown[1]);
      }
    } else if (z.passive) {
      z.wantSpeed = 0;
    } else if (z.mode === "engage") {
      const target = player ? player.pos : z.lastKnown;
      const d = Math.hypot(target.x - z.pos.x, target.z - z.pos.z);
      const dy = Math.abs(target.y - z.pos.y);
      if (player && player.alive === false) {
        z.mode = "patrol";
        z.home.copy(z.pos);
      } else if (d < z.reach && dy < 1.6) {
        steer(z, target, dt, 0);
        z.wantSpeed = 0;
        if (z.cooldown <= 0 && z.staggerT <= 0) {
          if (z.crawling) {
            // crawlers just bite at ankle height, no wind-up clip
            z.cooldown = rand(tune.cooldown[0], tune.cooldown[1]) + 0.3;
            player.damage(tune.damage * 0.7 * z.dmgMul, z.pos);
            emit("enemy:melee", { enemy: z, pos: z.pos, type: z.type });
          } else if (z.rank === "bloater") {
            // close enough: it goes off (the run turns the death into a blast)
            z.damage(z.hp + 1, z.pos, null, "body");
            return;
          } else {
            z.attackT = 0;
            z.attackHit = false;
            play(z, "attack", 0.12, tune.attackRate);
            emit("enemy:voice", {
              enemy: z,
              pos: z.pos,
              kind: "grunt",
              type: z.type,
            });
          }
        }
      } else follow(z, target, dt, gaitSpeed(z));
    } else if (z.mode === "investigate") {
      z.modeT -= dt;
      const d = Math.hypot(z.lastKnown.x - z.pos.x, z.lastKnown.z - z.pos.z);
      if (d < 1.2 || z.modeT <= 0) {
        z.mode = "patrol";
        z.home.copy(z.pos);
        z.modeT = rand(2, 5);
      } else follow(z, z.lastKnown, dt, gaitSpeed(z));
    } else {
      // patrol: stand and sway, now and then shuffle somewhere nearby
      z.modeT -= dt;
      if (z.modeT <= 0) {
        z.modeT = rand(4, 10);
        if (rng() < 0.65) {
          let p = null;
          try {
            p = nav().randomPoint(z.home, z.dull ? TUNE.wander.roam : 5);
          } catch {}
          if (p) {
            z.lastKnown.copy(p);
            z.wander = true;
            // a wanderer drifts: where it ends up is where it sets out from next
            if (z.dull) z.home.copy(p);
          }
        } else z.wander = false;
      }
      if (z.wander) {
        const d = Math.hypot(z.lastKnown.x - z.pos.x, z.lastKnown.z - z.pos.z);
        if (d < 0.8) z.wander = false;
        else follow(z, z.lastKnown, dt, gaitSpeed(z));
      }
    }

    if (z.staggerT > 0) z.wantSpeed *= TUNE.staggerSlow;

    // ---- move ----
    const accel = z.wantSpeed > z.speed ? 5 : 9;
    z.speed += (z.wantSpeed - z.speed) * Math.min(1, dt * accel);
    if (z.speed > 0.02) {
      const before = tmp.a.copy(z.pos);
      z.vel.set(Math.sin(z.yaw) * z.speed, -2, Math.cos(z.yaw) * z.speed);
      G.physics.moveCapsule(z.pos, z.vel, dt, 0.3, 1.7, true);
      const moved = Math.hypot(z.pos.x - before.x, z.pos.z - before.z);
      // wedged against a corner: force a fresh path, sidestep
      if (moved < z.speed * dt * 0.25) {
        z.stuckT += dt;
        if (z.stuckT > 0.5) {
          z.stuckT = 0;
          z.repathT = 0;
          z.yaw += rng() < 0.5 ? 0.9 : -0.9;
        }
      } else z.stuckT = 0;
    }

    if (ctl.push.lengthSq() > 0.01) {
      z.vel.set(ctl.push.x, -2, ctl.push.z);
      G.physics.moveCapsule(z.pos, z.vel, dt, 0.3, 1.7, true);
      ctl.push.multiplyScalar(Math.exp(-6 * dt));
    } else ctl.push.set(0, 0, 0);

    // ---- animation ----
    if (z.attackT < 0 && z.screamT <= 0) {
      if (z.speed > 0.12 || z.crawling) {
        const name =
          ctl.fear > 0 && !held && !z.crawling ? "run" : locomotionClip(z);
        const native = clips[name].userData.speed || 1;
        // walk mocap is a very slow drag, so let it play faster and accept a little slide
        const slide = name === "walk" ? 0.55 : name === "crawl" ? 0.7 : 1;
        const rate = Math.max(0.5, Math.min(2.6, (z.speed / native) * slide));
        play(z, name, 0.25, z.speed > 0.12 ? rate : 0.35);
      } else play(z, "idle", 0.3, 1);
    }

    place(z);
    tickAnimation(z, ctl.pin > 0 ? dt * ctl.rate : dt);
    if (z.dirty) sync(z);

    // ---- sound ----
    z.voiceT -= dt;
    if (z.voiceT <= 0) {
      z.voiceT = z.mode === "engage" ? rand(1.6, 4.2) : rand(4, 9);
      emit("enemy:voice", {
        enemy: z,
        pos: z.pos,
        kind: z.mode === "engage" ? "growl" : "moan",
        type: z.type,
      });
    }
    if (z.speed > (z.crawling ? 0.25 : 0.4)) {
      z.stepT -= dt * Math.max(1, z.speed);
      if (z.stepT <= 0) {
        // crawlers drag themselves along: slower, wetter beats
        z.stepT = z.crawling ? 1.1 : z.runner ? 1.35 : 0.75;
        emit("enemy:step", {
          enemy: z,
          pos: z.pos,
          type: z.type,
          speed: z.speed,
        });
      }
    }
  }

  const camFwd = new V3();
  let camFwdFrame = -1;
  function tickAnimation(z, dt) {
    // far or unseen zombies animate at a reduced rate
    const cam = G.camera ? G.camera.position : z.pos;
    const d2 = cam.distanceToSquared(z.pos);
    let every = d2 > 1600 ? 3 : d2 > 500 ? 2 : 1;
    if (G.camera && d2 > 9) {
      if (camFwdFrame !== G.time.frame) {
        G.camera.getWorldDirection(camFwd);
        camFwdFrame = G.time.frame;
      }
      const ahead =
        (z.pos.x - cam.x) * camFwd.x +
        (z.pos.y + 0.9 - cam.y) * camFwd.y +
        (z.pos.z - cam.z) * camFwd.z;
      // behind the camera only its shadow can show: a lower rate is enough
      if (ahead < -2) every = Math.max(every, d2 > 400 ? 4 : 2);
    }
    // on the low preset only nearby zombies cast shadows
    const shadow = !lowShadows || d2 < LOW_SHADOW_D2;
    if (shadow !== z.shadow) {
      z.shadow = shadow;
      for (const m of z.meshes) m.castShadow = shadow;
    }
    z.lodAcc += dt;
    if (++z.lodT % every !== 0) return;
    z.mixer.update(z.lodAcc);
    z.lodAcc = 0;
    if (z.flinch > 0.01 && z.bones.spine) {
      tmp.q.setFromAxisAngle(
        tmp.b.copy(z.flinchAxis).applyAxisAngle(UP, -z.yaw),
        -0.5 * z.flinch,
      );
      z.bones.spine.quaternion.premultiply(tmp.q);
      z.flinch *= Math.exp(-dt * every * 9);
    }
    pose(z);
  }

  function kill(z, dir, part, dealt) {
    z.alive = false;
    z.hp = 0;
    z.attackT = -1;
    z.screamT = 0;
    z.deadT = 0;
    z.speed = 0;
    let fromBehind = false;
    if (dir) {
      fromBehind = dir.x * z.fwd.x + dir.z * z.fwd.z > 0.15;
      const push = Math.min(2.6, 0.6 + dealt / 45);
      z.knock.set(dir.x, 0, dir.z).normalize().multiplyScalar(push);
    }
    if (z.crawling) {
      // already on the ground: just go limp where it lies
      const a = z.actions[z.anim];
      if (a) a.paused = true;
    } else
      play(
        z,
        fromBehind ? "death_front" : "death_back",
        0.12,
        part === "weak" ? 1.5 : 1.25,
      );
    corpses.push(z);
    while (corpses.length > TUNE.maxCorpses) {
      const old = corpses.shift();
      if (old.active && !old.alive && old.deadT < TUNE.corpseTime)
        old.deadT = TUNE.corpseTime;
    }
    emit("enemy:killed", {
      enemy: z,
      pos: z.pos,
      type: z.type,
      part,
      rank: z.rank,
    });
  }

  function updateCorpse(z, dt) {
    z.deadT += dt;
    if (z.knock.lengthSq() > 1e-4 && z.deadT < 0.7) {
      z.vel.set(z.knock.x, -2, z.knock.z);
      G.physics.moveCapsule(z.pos, z.vel, dt, 0.3, 1.0, true);
      z.knock.multiplyScalar(Math.exp(-dt * 5));
    }
    if (z.deadT > TUNE.corpseTime) {
      z.sink += dt * 0.35;
      if (z.sink > 0.75) return retire(z);
    }
    place(z);
    if (z.deadT < 4.5) {
      z.mixer.update(dt);
      pose(z);
    }
    if (z.dirty) sync(z);
  }

  function retire(z) {
    z._deactivate();
    let i = list.indexOf(z);
    if (i >= 0) list.splice(i, 1);
    i = corpses.indexOf(z);
    if (i >= 0) corpses.splice(i, 1);
  }

  function separate() {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        const min = 0.62;
        if (d2 > min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        const n = nav();
        if (n.isWalkable(a.pos.x - nx * push, a.pos.z - nz * push)) {
          a.pos.x -= nx * push;
          a.pos.z -= nz * push;
        }
        if (n.isWalkable(b.pos.x + nx * push, b.pos.z + nz * push)) {
          b.pos.x += nx * push;
          b.pos.z += nz * push;
        }
      }
    }
  }

  // ---------- hit detection ----------
  const hit = { t: 0 };
  function raySphere(o, d, c, r, max) {
    const ox = o.x - c.x;
    const oy = o.y - c.y;
    const oz = o.z - c.z;
    const b = ox * d.x + oy * d.y + oz * d.z;
    const cc = ox * ox + oy * oy + oz * oz - r * r;
    const disc = b * b - cc;
    if (disc < 0) return false;
    const t = -b - Math.sqrt(disc);
    if (t < 0 || t > max) return false;
    hit.t = t;
    return true;
  }
  function rayCapsule(o, d, a, b, r, max) {
    // closest point on the segment to the ray, then a sphere test there
    // (ab needs its own scratch vector: the closest point is written to tmp.c below)
    const ab = tmp.e.subVectors(b, a);
    const ao = tmp.d.subVectors(o, a);
    const abab = ab.dot(ab);
    const abd = ab.dot(d);
    const abao = ab.dot(ao);
    const dao = d.dot(ao);
    const den = abab - abd * abd;
    let s = den > 1e-8 ? (abao - abd * dao) / den : 0;
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    tmp.c.copy(a).addScaledVector(ab, s);
    return raySphere(o, d, tmp.c, r, max);
  }

  function raycastZombie(z, o, d, max, out) {
    const P = z.P;
    const s = z.scale;
    const H = z.hit;
    const rb = 0.2 * s * H.body;
    const ra = s * H.arm;
    const rl = s * H.leg;
    let best = out.dist;
    let part = null;
    const test = (ok, name) => {
      if (ok && hit.t < best) {
        best = hit.t;
        part = name;
      }
    };
    tmp.a.copy(P.head);
    tmp.a.y += TUNE.head.above * s;
    test(raySphere(o, d, tmp.a, TUNE.head.radius * s * H.head, max), "weak");
    // the torso capsule stops one radius short of the neck, so its rounded top ends at the
    // neck and does not swallow the head sphere
    tmp.b.subVectors(P.neck, P.hips);
    const torso = tmp.b.length();
    tmp.b.multiplyScalar(Math.max(0, torso - rb) / (torso || 1)).add(P.hips);
    test(rayCapsule(o, d, P.hips, tmp.b, rb, max), "body");
    test(rayCapsule(o, d, P.lArm, P.lFore, 0.075 * ra, max), "arm");
    test(rayCapsule(o, d, P.lFore, P.lHand, 0.065 * ra, max), "arm");
    test(rayCapsule(o, d, P.rArm, P.rFore, 0.075 * ra, max), "arm");
    test(rayCapsule(o, d, P.rFore, P.rHand, 0.065 * ra, max), "arm");
    test(rayCapsule(o, d, P.lUp, P.lLeg, 0.105 * rl, max), "leg");
    test(rayCapsule(o, d, P.lLeg, P.lFoot, 0.085 * rl, max), "leg");
    test(rayCapsule(o, d, P.rUp, P.rLeg, 0.105 * rl, max), "leg");
    test(rayCapsule(o, d, P.rLeg, P.rFoot, 0.085 * rl, max), "leg");
    if (!part) return false;
    out.dist = best;
    out.point.copy(o).addScaledVector(d, best);
    out.normal.copy(d).negate();
    out.enemy = z;
    out.part = part;
    return true;
  }

  // ---------- bodies on trial ----------
  const loading = {};
  const extraRigs = EXTRA_RIGS[lowShadows ? 0 : 1];
  /** Downloads the named trial bodies (EXTRA_BODIES) and makes them ready to spawn. */
  function ensure(names) {
    return Promise.all(
      names
        .filter((n) => EXTRA_BODIES[n])
        .map(
          (n) =>
            (loading[n] ||= load(n + ".glb")
              .then(async (gltf) => {
                addTemplate(n, EXTRA_BODIES[n], gltf.scene, true);
                await shrinkPending();
              })
              .catch((err) => {
                delete loading[n];
                delete templates[n];
                throw err;
              })),
        ),
    );
  }
  const ready = (n) => !!(templates[n] && templates[n].extra);
  // One of the named trial bodies for a spawn: a rig that is free, a new one while there is
  // room, or the oldest of their corpses. null when they are all up and about.
  function trialRig(names) {
    const free = pool.filter((z) => !z.active && names.includes(z.kind));
    if (free.length) return free[Math.floor(rng() * free.length)];
    const room = names.filter(
      (n) => pool.filter((z) => z.kind === n).length < extraRigs,
    );
    if (room.length) {
      const z = createZombie(templates[room[Math.floor(rng() * room.length)]]);
      pool.push(z);
      return z;
    }
    const old = corpses.find((z) => names.includes(z.kind));
    if (old) retire(old);
    return old || null;
  }

  // ---------- public surface ----------
  const api = {
    list,
    TUNE,
    ensure,
    /** Whether a trial body has been downloaded and can be spawned by name. */
    has: ready,
    /**
     * The firing range's choice of models: a list of trial bodies that stand in for the
     * usual ones wherever a spawn does not name its own (null: the usual ones). With more
     * than one in the list each plays the rules it is meant for; one alone plays them all.
     */
    cast: null,
    // opts.body: this trial body and no other (nothing is spawned if it is not loaded)
    spawn(type, pos, opts = {}) {
      if (warm) coolDown();
      const kind = type === "brute" ? "brute" : "walker";
      let z = null;
      if (opts.body) {
        if (!ready(opts.body)) return null;
        z = trialRig([opts.body]);
        if (!z) return null;
      } else if (api.cast) {
        const on = api.cast.filter(ready);
        const fit =
          on.length > 1 ? on.filter((n) => templates[n].type === kind) : on;
        if (fit.length) z = trialRig(fit);
      }
      if (!z) {
        let free = pool.filter((z) => !z.active && !z.extra && z.type === kind);
        if (!free.length) {
          // recycle the oldest corpse of that body type
          const old = corpses.find((z) => !z.extra && z.type === kind);
          if (!old) return null;
          retire(old);
          free = [old];
        }
        z = free[Math.floor(rng() * free.length)];
      }
      if (z.extra) z.type = kind;
      z.id = nextId++;
      list.push(z);
      z._activate(pos, opts);
      emit("enemy:spawn", { enemy: z });
      return z;
    },
    // skip: optional Set of zombies the ray passes through (piercing shots)
    raycast(origin, dir, maxDist = 300, skip = null) {
      let out = null;
      for (const z of list) {
        if (!z.alive || (skip && skip.has(z))) continue;
        const sc = Math.max(z.scale > 1.3 ? z.scale : 1, z.girth);
        const dx = z.pos.x - origin.x;
        const dy = z.pos.y + 0.9 * sc - origin.y;
        const dz = z.pos.z - origin.z;
        const along = dx * dir.x + dy * dir.y + dz * dir.z;
        if (along < -1.5 * sc || along > maxDist + 1.5 * sc) continue;
        if (dx * dx + dy * dy + dz * dz - along * along > 2.6 * sc * sc)
          continue;
        // the pose on screen right now (the renderer updated the bones after our update)
        readBones(z);
        if (!out)
          out = {
            dist: Infinity,
            point: new V3(),
            normal: new V3(),
            enemy: null,
            part: "body",
          };
        z._raycast(origin, dir, maxDist, out);
      }
      return out && out.enemy ? out : null;
    },
    aliveCount() {
      let n = 0;
      for (const z of list) if (z.alive) n++;
      return n;
    },
    clear() {
      for (const z of pool) if (z.active) z._deactivate();
      list.length = 0;
      corpses.length = 0;
    },
    alert(pos, radius = 40) {
      for (const z of list) {
        if (!z.alive || z.passive || z.mode === "engage") continue;
        const r = z.dull ? Math.min(radius, TUNE.wander.hearRadius) : radius;
        if (z.pos.distanceToSquared(pos) > r * r) continue;
        z.lastKnown.set(pos.x, 0, pos.z);
        if (z.mode === "patrol") emit("enemy:alert", { enemy: z, noise: true });
        z.mode = "investigate";
        z.modeT = rand(9, 13);
        // spread the path searches of everyone who heard it over a few frames
        z.repathT = rand(0, 0.35);
      }
    },
    update(dt) {
      if (dt <= 0) return;
      if (dt > 0.05) dt = 0.05;
      clock += dt;
      noiseGate -= dt;
      pathBudget = PATHS_PER_FRAME;
      for (let i = list.length - 1; i >= 0; i--) list[i]._update(dt);
      separate();
    },
    debug: { pool, corpses, templates, clips, hitTime },
  };

  G.events.on("weapon:fire", (e) => {
    if (noiseGate > 0) return;
    noiseGate = 0.3;
    const p = (e && (e.origin || e.muzzle)) || (G.player && G.player.pos);
    if (p) api.alert(p, TUNE.hearRadius);
  });
  G.events.on("explosion", (e) => {
    if (e && e.pos) api.alert(e.pos, 30);
  });
  G.events.on("game:state", (e) => {
    if (e && e.state === "title") api.clear();
  });
  return api;
}

// Keeps bone rotations and the hip translation; looping travel clips lose their forward drift,
// which is recorded as metres per second so movement can be matched to the feet.
function prepareClip(T, clip, name, cfg, hipsY) {
  clip.name = name;
  clip.tracks = clip.tracks.filter(
    (t) => t.name.endsWith(".quaternion") || t.name === "Hips.position",
  );
  clip.userData = { hipsY, speed: 0 };
  const hips = clip.tracks.find((t) => t.name === "Hips.position");
  if (hips && cfg.travel) {
    const v = hips.values;
    const n = hips.times.length;
    const t0 = hips.times[0];
    const dur = hips.times[n - 1] - t0 || 1;
    const dx = v[(n - 1) * 3] - v[0];
    const dz = v[(n - 1) * 3 + 2] - v[2];
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

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
