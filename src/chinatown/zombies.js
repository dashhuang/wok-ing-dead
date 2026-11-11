// Zombies: skinned characters with mocap clips, grid pathfinding and melee.
// Implements the same surface the game expects from its enemy system
// (list / spawn / raycast / aliveCount / clear / alert / update / TUNE).
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

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
  bite: {},
  scream: {},
  death_back: {},
  death_front: {},
};

export const TUNE = {
  walker: {
    hp: 60,
    damage: 12,
    cooldown: [0.7, 1.4],
    walkSpeed: 1.25,
    runSpeed: 4.3,
    runnerShare: 0.3,
    reach: 1.55,
    scale: [0.95, 1.06],
  },
  brute: {
    hp: 320,
    damage: 26,
    cooldown: [1.1, 1.9],
    walkSpeed: 1.5,
    runSpeed: 3.3,
    runnerShare: 1,
    reach: 1.95,
    scale: [1.2, 1.26],
  },
  sightRange: 34,
  sightCone: 150,
  senseRadius: 8,
  hearRadius: 45,
  loseInterest: 14,
  corpseTime: 16,
  maxCorpses: 12,
  pool: { romero: 9, girl: 8, cop: 8, soldier: 5 },
};

const HEAD_R = 0.14;
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
    clips[name] = prepareClip(T, gltf.animations[0], name, CLIPS[name], hips ? hips.position.y : 1);
  });

  const templates = {};
  Object.keys(CHARACTERS).forEach((name, i) => {
    const scene = charFiles[i].scene;
    const hips = scene.getObjectByName("Hips");
    const materials = new Map();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (!materials.has(o.material)) materials.set(o.material, o.material);
    });
    templates[name] = {
      name,
      type: CHARACTERS[name].type,
      scene,
      hipsY: hips ? hips.position.y : 1,
      clips: {},
    };
    for (const [key, clip] of Object.entries(clips))
      templates[name].clips[key] = scaleRoot(clip, templates[name].hipsY / clip.userData.hipsY);
  });

  // ---------- shared state ----------
  const list = [];
  const corpses = [];
  const pool = [];
  const tmp = { a: new V3(), b: new V3(), c: new V3(), d: new V3(), q: new T.Quaternion() };
  const UP = new V3(0, 1, 0);
  let clock = 0;
  let nextId = 1;
  let noiseGate = 0;

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

  function createZombie(template) {
    const rig = cloneSkinned(template.scene);
    // pallid, slightly green skin and clothes: kept light so they read under street light
    const k = rand(0.92, 1.2);
    const tint = new T.Color().setHSL(rand(0.18, 0.36), rand(0.0, 0.16), 0.8).multiplyScalar(k / 0.8);
    makeMaterials(rig, tint);
    rig.visible = false;
    root.add(rig);
    const mixer = new T.AnimationMixer(rig);
    const actions = {};
    for (const [name, clip] of Object.entries(template.clips)) {
      const a = mixer.clipAction(clip);
      if (!CLIPS[name].loop) {
        a.setLoop(T.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      actions[name] = a;
    }
    const bone = (n) => rig.getObjectByName(n);
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

      _activate(pos, opts = {}) {
        const tune = TUNE[z.type];
        z.active = true;
        z.alive = true;
        z.passive = !!opts.passive;
        z.pos.copy(pos);
        z.pos.y = G.physics.groundHeight(pos.x, pos.z, 1.5);
        z.vel.set(0, 0, 0);
        z.yaw = opts.yaw !== undefined ? opts.yaw : rand(0, Math.PI * 2);
        z.hp = z.maxHp = tune.hp;
        z.home.copy(z.pos);
        z.scale = rand(tune.scale[0], tune.scale[1]);
        rig.scale.setScalar(z.scale);
        z.runner = rng() < tune.runnerShare;
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
        place(z);
        mixer.update(0);
        rig.updateMatrixWorld(true);
        readBones(z);
      },

      _deactivate() {
        z.active = false;
        z.alive = false;
        rig.visible = false;
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
        if (z.type !== "brute") z.staggerT = Math.max(z.staggerT, part === "weak" ? 0.45 : 0.28);
        emit("enemy:hit", { enemy: z, part, pos: point || z.pos, amount: dealt });
        if (z.hp <= 0) {
          kill(z, dir, part, dealt);
          return true;
        }
        if (!z.crawling && z.type === "walker" && z.legDamage > z.maxHp * 0.55) {
          z.crawling = true;
          z.attackT = -1;
          emit("enemy:voice", { enemy: z, pos: z.pos, kind: "growl", type: z.type });
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

  for (const [name, count] of Object.entries(TUNE.pool))
    for (let i = 0; i < count; i++) pool.push(createZombie(templates[name]));

  // when does the swing actually land? sample the clip once and take the furthest forward reach of a hand
  const hitTime = measureHit(pool.find((z) => z.kind === "romero"));

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
    z.rig.position.set(z.pos.x, z.pos.y - z.sink, z.pos.z);
    z.rig.rotation.y = z.yaw;
    z.fwd.set(Math.sin(z.yaw), 0, Math.cos(z.yaw));
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
    a.reset().play();
    let best = 0;
    let bestT = clip.duration * 0.4;
    for (let i = 0; i <= 48; i++) {
      const t = (clip.duration * i) / 48;
      a.time = t;
      z.mixer.update(0);
      z.rig.updateMatrixWorld(true);
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
      emit("enemy:voice", { enemy: z, pos: z.pos, kind: "scream", type: z.type });
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
      if (o === source || !o.alive || o.passive || o.mode === "engage") continue;
      if (o.pos.distanceToSquared(pos) > radius * radius) continue;
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
    if (dist < TUNE.sightRange) {
      const flat = Math.hypot(dx, dz) || 1e-4;
      const facing = (dx * z.fwd.x + dz * z.fwd.z) / flat;
      const cone = Math.cos(((TUNE.sightCone / 2) * Math.PI) / 180);
      if (z.mode === "engage" || facing > cone || dist < TUNE.senseRadius)
        seen = G.physics.lineOfSight(z.sensor, eye);
    }
    z.los = seen;
    if (seen) {
      z.lastKnown.copy(player.pos);
      if (z.mode !== "engage") engage(z, false);
    } else if (z.mode !== "engage" && dist < TUNE.senseRadius * 0.6) {
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
    const align = Math.max(0.15, Math.cos(Math.min(Math.abs(diff), Math.PI / 2)));
    z.wantSpeed = speed * align;
    return d;
  }

  function follow(z, goal, dt, speed) {
    z.repathT -= dt;
    const n = nav();
    if (z.repathT <= 0) {
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
    if (!engaged) return z.mode === "investigate" ? tune.walkSpeed : tune.walkSpeed * 0.6;
    return z.runner ? tune.runSpeed : tune.walkSpeed;
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

    sense(z, dt);
    z.cooldown -= dt;
    z.staggerT -= dt;
    z.wantSpeed = 0;

    if (z.screamT > 0) {
      z.screamT -= dt;
      if (player) steer(z, player.pos, dt, 0);
      z.wantSpeed = 0;
    } else if (z.attackT >= 0) {
      // committed swing: turn a little, land the hit at the measured frame
      const clip = z.actions.attack.getClip();
      const rate = z.type === "brute" ? 1.15 : 1.45;
      z.attackT += (dt * rate) / clip.duration;
      if (player) steer(z, player.pos, dt * 0.6, 0);
      z.wantSpeed = 0;
      if (!z.attackHit && z.attackT >= hitTime) {
        z.attackHit = true;
        if (player && player.alive !== false) {
          const d = Math.hypot(player.pos.x - z.pos.x, player.pos.z - z.pos.z);
          const dy = Math.abs(player.pos.y - z.pos.y);
          const facing =
            ((player.pos.x - z.pos.x) * z.fwd.x + (player.pos.z - z.pos.z) * z.fwd.z) / (d || 1);
          if (d < tune.reach + 0.55 && dy < 1.7 && facing > 0.2) {
            player.damage(tune.damage, z.pos);
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
      } else if (d < tune.reach && dy < 1.6) {
        steer(z, target, dt, 0);
        z.wantSpeed = 0;
        if (z.cooldown <= 0 && z.staggerT <= 0) {
          if (z.crawling) {
            // crawlers just bite at ankle height, no wind-up clip
            z.cooldown = rand(tune.cooldown[0], tune.cooldown[1]) + 0.3;
            player.damage(tune.damage * 0.7, z.pos);
            emit("enemy:melee", { enemy: z, pos: z.pos, type: z.type });
          } else {
            z.attackT = 0;
            z.attackHit = false;
            play(z, "attack", 0.12, z.type === "brute" ? 1.15 : 1.45);
            emit("enemy:voice", { enemy: z, pos: z.pos, kind: "grunt", type: z.type });
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
            p = nav().randomPoint(z.home, 5);
          } catch {}
          if (p) {
            z.lastKnown.copy(p);
            z.wander = true;
          }
        } else z.wander = false;
      }
      if (z.wander) {
        const d = Math.hypot(z.lastKnown.x - z.pos.x, z.lastKnown.z - z.pos.z);
        if (d < 0.8) z.wander = false;
        else follow(z, z.lastKnown, dt, gaitSpeed(z));
      }
    }

    if (z.staggerT > 0) z.wantSpeed *= 0.15;

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

    // ---- animation ----
    if (z.attackT < 0 && z.screamT <= 0) {
      if (z.speed > 0.12 || z.crawling) {
        const name = locomotionClip(z);
        const native = clips[name].userData.speed || 1;
        // walk mocap is a very slow drag, so let it play faster and accept a little slide
        const slide = name === "walk" ? 0.55 : name === "crawl" ? 0.7 : 1;
        const rate = Math.max(0.5, Math.min(2.6, (z.speed / native) * slide));
        play(z, name, 0.25, z.speed > 0.12 ? rate : 0.35);
      } else play(z, "idle", 0.3, 1);
    }

    place(z);
    tickAnimation(z, dt);

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
    if (z.speed > 0.4 && !z.crawling) {
      z.stepT -= dt * Math.max(1, z.speed);
      if (z.stepT <= 0) {
        z.stepT = z.runner ? 1.35 : 0.75;
        emit("enemy:step", { enemy: z, pos: z.pos, type: z.type, speed: z.speed });
      }
    }
  }

  function tickAnimation(z, dt) {
    // far or unseen zombies animate at a reduced rate
    const cam = G.camera ? G.camera.position : z.pos;
    const d2 = cam.distanceToSquared(z.pos);
    const every = d2 > 1600 ? 3 : d2 > 500 ? 2 : 1;
    z.lodAcc += dt;
    if (++z.lodT % every !== 0) return;
    z.mixer.update(z.lodAcc);
    z.lodAcc = 0;
    if (z.flinch > 0.01 && z.bones.spine) {
      tmp.q.setFromAxisAngle(tmp.b.copy(z.flinchAxis).applyAxisAngle(UP, -z.yaw), -0.5 * z.flinch);
      z.bones.spine.quaternion.premultiply(tmp.q);
      z.flinch *= Math.exp(-dt * every * 9);
    }
    z.rig.updateMatrixWorld(true);
    readBones(z);
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
    } else play(z, fromBehind ? "death_front" : "death_back", 0.12, part === "weak" ? 1.5 : 1.25);
    corpses.push(z);
    while (corpses.length > TUNE.maxCorpses) {
      const old = corpses.shift();
      if (old.active && !old.alive && old.deadT < TUNE.corpseTime) old.deadT = TUNE.corpseTime;
    }
    emit("enemy:killed", { enemy: z, pos: z.pos, type: z.type, part });
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
      z.rig.updateMatrixWorld(true);
    }
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
    const ab = tmp.c.subVectors(b, a);
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
    let best = out.dist;
    let part = null;
    const test = (ok, name) => {
      if (ok && hit.t < best) {
        best = hit.t;
        part = name;
      }
    };
    tmp.a.copy(P.head);
    tmp.a.y += 0.085 * s;
    test(raySphere(o, d, tmp.a, HEAD_R * s, max), "weak");
    test(rayCapsule(o, d, P.hips, P.neck, 0.2 * s, max), "body");
    test(rayCapsule(o, d, P.lArm, P.lFore, 0.075 * s, max), "arm");
    test(rayCapsule(o, d, P.lFore, P.lHand, 0.065 * s, max), "arm");
    test(rayCapsule(o, d, P.rArm, P.rFore, 0.075 * s, max), "arm");
    test(rayCapsule(o, d, P.rFore, P.rHand, 0.065 * s, max), "arm");
    test(rayCapsule(o, d, P.lUp, P.lLeg, 0.105 * s, max), "leg");
    test(rayCapsule(o, d, P.lLeg, P.lFoot, 0.085 * s, max), "leg");
    test(rayCapsule(o, d, P.rUp, P.rLeg, 0.105 * s, max), "leg");
    test(rayCapsule(o, d, P.rLeg, P.rFoot, 0.085 * s, max), "leg");
    if (!part) return false;
    out.dist = best;
    out.point.copy(o).addScaledVector(d, best);
    out.normal.copy(d).negate();
    out.enemy = z;
    out.part = part;
    return true;
  }

  // ---------- public surface ----------
  const api = {
    list,
    TUNE,
    spawn(type, pos, opts = {}) {
      const kind = type === "brute" ? "brute" : "walker";
      let free = pool.filter((z) => !z.active && z.type === kind);
      if (!free.length) {
        // recycle the oldest corpse of that body type
        const old = corpses.find((z) => z.type === kind);
        if (!old) return null;
        retire(old);
        free = [old];
      }
      const z = free[Math.floor(rng() * free.length)];
      z.id = nextId++;
      list.push(z);
      z._activate(pos, opts);
      emit("enemy:spawn", { enemy: z });
      return z;
    },
    raycast(origin, dir, maxDist = 300) {
      let out = null;
      for (const z of list) {
        if (!z.alive) continue;
        const dx = z.pos.x - origin.x;
        const dy = z.pos.y + 0.9 - origin.y;
        const dz = z.pos.z - origin.z;
        const along = dx * dir.x + dy * dir.y + dz * dir.z;
        if (along < -1.5 || along > maxDist + 1.5) continue;
        if (dx * dx + dy * dy + dz * dz - along * along > 2.6) continue;
        if (!out)
          out = { dist: Infinity, point: new V3(), normal: new V3(), enemy: null, part: "body" };
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
        if (z.pos.distanceToSquared(pos) > radius * radius) continue;
        z.lastKnown.set(pos.x, 0, pos.z);
        if (z.mode === "patrol") emit("enemy:alert", { enemy: z, noise: true });
        z.mode = "investigate";
        z.modeT = rand(9, 13);
        z.repathT = 0;
      }
    },
    update(dt) {
      if (dt <= 0) return;
      if (dt > 0.05) dt = 0.05;
      clock += dt;
      noiseGate -= dt;
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
  if (hips) for (let i = 0; i < hips.values.length; i++) hips.values[i] *= ratio;
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
