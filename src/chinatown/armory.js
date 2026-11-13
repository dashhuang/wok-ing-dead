// Armoury: the twelve weapons of arsenal/ running inside the game.
//
// The lab under arsenal/ owns the models, the hands' grips, what each weapon does when it
// fires, the effects and the sounds. Nothing of that is copied here: this module builds the
// "stage" those modules expect out of the game (camera, scene, light pool, world raycast,
// zombies) and drives the lab's own combat controller with the game's input.
//
//   camera > view (scaled for the weapon camera) > bob > kick > pose > weapon model
//                                               > arms
// The weapon and the arms are drawn by the game's weapon pass (layer 1, its own narrower field
// of view); everything a weapon throws into the street (particles, projectiles, decals) is an
// ordinary object in the scene.
import { createGameTargets } from "./armtargets.js";
import { bloodOf } from "../../arsenal/src/combat/fate.js";

// a prop is no weapon: neither hand has a trigger to stay on, so both wrists are eased
const BOTH = { left: true, right: true };
const LAB_FOV = 68; // the lab's first-person field of view; every hip pose is written for it
const VIEW_LAYER = 1;
const rad = (deg) => (deg * Math.PI) / 180;

export const ARMORY_TUNE = {
  // The night street is exposed for very dim light, the lab for a lit alley: effects written
  // for the lab are far too bright here without this.
  fxGain: 0.3,
  glowGain: 0.35, // emissive parts on the weapons themselves (neon tubes, pilot lights, runes)
  handGain: 1, // the lab darkens the gloves for its own lighting; the game needs them as they are
};

export async function createArmory(G) {
  const T = G.THREE;
  const V3 = T.Vector3;
  const [kitMod, handsMod, combatMod, audioMod, dataMod, behMod] =
    await Promise.all([
      import("../../arsenal/src/kit/index.js"),
      import("../../arsenal/src/kit/hands.js"),
      import("../../arsenal/src/combat/combat.js"),
      import("../../arsenal/src/audio/audio.js"),
      import("../../arsenal/src/data/weapons.js"),
      import("../../arsenal/src/combat/behaviours.js"),
    ]);
  const behaviours = behMod.BEHAVIOURS;
  const builders = import.meta.glob("../../arsenal/src/weapons/*.js");
  const builderOf = (id) => builders[`../../arsenal/src/weapons/${id}.js`];
  const { byId, WEAPONS } = dataMod;

  const kit = kitMod.createKit();
  const arms = handsMod.createArms(kit);
  // (the weapons' sounds go out through the game's own sound system: its volume, its buses)
  const audio =
    G.params && G.params.noaudio
      ? null
      : audioMod.createAudio(() => G.camera, { host: () => G.audio });
  if (audio)
    for (const ev of ["pointerdown", "keydown", "touchend"])
      window.addEventListener(ev, () => audio.unlock(), { capture: true });

  // ---------------------------------------------------------------- scene graph
  const root = new T.Group(); // everything the weapons put into the street
  root.name = "armory";
  G.scene.add(root);
  const view = new T.Group(); // eye space of the lab, squeezed to the weapon camera's field of view
  view.name = "armory-view";
  view.visible = false;
  G.camera.add(view);
  const bob = new T.Group();
  const kick = new T.Group();
  const pose = new T.Group();
  pose.rotation.order = "YXZ";
  view.add(bob);
  bob.add(kick);
  kick.add(pose);
  view.add(arms.group);
  const setLayer = (o, layer) => o.traverse((n) => n.layers.set(layer));
  const underView = (o) => {
    for (let n = o; n; n = n.parent) if (n === view) return true;
    return false;
  };
  // tan(world fov / 2) / tan(weapon fov / 2): how much further out a point has to sit in the
  // world camera to cover the same spot on screen as it does through the weapon camera
  const fovRatio = () =>
    Math.tan(rad(G.camera.fov) / 2) / Math.tan(rad(G.viewCamera.fov) / 2);

  // ---------------------------------------------------------------- the stage the lab modules see
  const held = new Map(); // light -> handle from the game's pool
  const stage = {
    THREE: T,
    mode: "fp",
    renderer: {
      domElement: document.createElement("canvas"), // the lab's own mouse handling stays idle
      get toneMappingExposure() {
        return G.render.exposure ?? 1;
      },
      set toneMappingExposure(v) {
        G.render.exposure = v;
      },
    },
    scene: root,
    camera: G.camera,
    range: {
      group: root,
      bounds: { halfW: 1e6, far: -1e6, near: 1e6, wallH: 1e6 },
      raycast(o, d, max = 300) {
        let h = null;
        try {
          h = G.physics.raycast(o, d, max);
        } catch {}
        if (!h) return null;
        return {
          dist: h.dist,
          point: new V3().copy(h.point),
          normal: new V3().copy(h.normal),
          surface: h.surface,
        };
      },
    },
    viewMount: view,
    viewKick: kick,
    viewPose: pose,
    look: { yaw: 0, pitch: 0 },
    eye: G.player.eye,
    kick: { pitch: 0, yaw: 0, roll: 0, fov: 0 },
    // what the recoil reads of the player (arsenal/src/combat/recoil.js): crouching steadies
    // the weapon like it does the game's own guns, and the share of a kick that is not given
    // back turns the player's aim. A thumb cannot hold a burst down the way a mouse can, so on
    // a touch screen less of it stays.
    get steady() {
      return G.player.crouching ? 0.85 : 1;
    },
    // how much the effects may spend (arsenal/src/fx/core.js): half as many sparks on the
    // low preset, which is what a phone runs
    get detail() {
      return G.quality && G.quality.name === "low" ? 0.5 : 1;
    },
    get recoilKeep() {
      return G.input && G.input.touch ? 0.4 : 1;
    },
    nudgeLook(dp, dy) {
      const P = G.player;
      P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch + dp));
      P.yaw += dy;
    },
    zoom: 1,
    zoomNow: 1,
    fov: { fp: LAB_FOV },
    get fxLights() {
      return [...held.keys()];
    },
    borrowLight() {
      const pool = G.render && G.render.lightPool;
      const h = pool && pool.acquire ? pool.acquire() : null;
      if (!h) return null;
      h.light.userData.free = false;
      held.set(h.light, h);
      return h.light;
    },
    releaseLight(l) {
      const h = held.get(l);
      if (!h) return;
      held.delete(l);
      h.release();
    },
    /** Put a weapon model in the shooter's hands (the lab's first-person mount). */
    mount(model) {
      for (const c of [...pose.children]) pose.remove(c);
      if (!model) return;
      const v = model.view.hip || {};
      const p = v.pos || [0.16, -0.17, -0.4];
      const r = v.rot || [0, 0, 0];
      pose.position.set(p[0], p[1], p[2]);
      pose.rotation.set(r[0], r[1], r[2], "YXZ");
      const h = model.holder;
      h.position.set(0, 0, 0);
      h.rotation.set(0, Math.PI, 0);
      h.scale.set(1, 1, 1);
      pose.add(h);
      setLayer(h, VIEW_LAYER);
    },
  };

  // ---------------------------------------------------------------- the lab
  const models = new Map();
  const lab = {
    THREE: T,
    kit,
    stage,
    models,
    weapons: WEAPONS,
    arms,
    audio,
    solo: false,
    state: { weapon: null, branch: "base", level: 1, mode: "fp", hands: true },
    model: null,
    combat: null,
    ui: null,
    listeners: new Set(),
    emit() {},
    // the game's zombies instead of the firing range's
    makeTargets: (l, fx, E) => createGameTargets(G, l, fx, E, root),
    // a weapon's own blast catching the player (a firework set off too close)
    hurt: (dmg, from) => G.player.damage(dmg, from),
    // a reload draws on the run's pools instead of filling the magazine from nowhere
    supply: {
      can: (W) => !hooks.canReload || hooks.canReload(W.id, W),
      take: (W, want) => (hooks.loaded ? hooks.loaded(W.id, W, want) : want),
    },
  };
  const combat = await combatMod.createCombat(lab);
  const fx = lab.fx;
  const targets = combat.targets;

  // ---------------------------------------------------------------- blood
  // Every hit on the dead bleeds and every kill bursts, whichever weapon did it: the game's
  // own two guns as well as the armoury's (both announce a hit as an "impact" on an enemy,
  // and a death as "enemy:killed"). This is on top of the game's own small puff.
  {
    const E = lab.effects;
    const UP = new V3(0, 1, 0);
    const at = new V3();
    G.events.on("impact", (e) => {
      if (!e || e.surface !== "enemy" || e.killed || !e.point) return;
      const gz = e.enemy;
      // more for the head, and for a hit that takes a large share of its health (the game's
      // own guns do not say how much: the zombie remembers what it last took)
      const power =
        e.power ?? (gz && gz.maxHp ? (gz.lastDealt || 0) / gz.maxHp : 0.3);
      E.blood(e.point, e.dir || UP, bloodOf(power, e.part === "weak"), {
        quiet: true,
        ground: gz ? gz.pos.y : 0,
      });
    });
    G.events.on("enemy:killed", (e) => {
      const gz = e && e.enemy;
      if (!gz) return;
      const head = e.part === "weak";
      at.copy(gz.pos);
      at.y += (head ? 1.62 : 1.15) * gz.scale;
      E.gore(at, e.dir || UP, {
        size: gz.scale,
        head,
        ground: gz.pos.y,
        thrown: !!e.thrown,
        amount: e.gore ?? 1,
        quiet: true,
      });
    });
    // a limb comes off: a burst where it was torn, then the end pumps and the piece trails
    // (the zombies ask for each spurt and each mark as they happen)
    G.events.on("enemy:severed", (e) => {
      if (!e || !e.pos) return;
      E.blood(e.pos, e.dir || UP, bloodOf(0.6, !!e.pop), {
        quiet: true,
        ground: e.ground ?? 0,
      });
    });
    G.events.on("gore:spurt", (e) => e && E.spurt(e.pos, e.dir, e.k));
    G.events.on("gore:splat", (e) => e && E.splat(e.pos, e.size));
    // a thrown body comes down: the thud of it, and what it leaves where it lands
    G.events.on("enemy:landed", (e) => {
      if (!e || !e.pos) return;
      audio && audio.world("fall", e.pos, { gain: 0.9, gap: 0.06 });
      fx.decal({
        kind: "splat",
        pos: at.copy(e.pos).clone(),
        size: 0.8 + Math.random() * 0.5,
        color: [0.72, 0.01, 0.01],
        life: 22,
        alpha: 0.85,
      });
    });
  }

  // ---------------------------------------------------------------- materials: brightness and blending
  const FX_GAIN = ARMORY_TUNE.fxGain;
  const gain = { value: FX_GAIN };
  const seen = new WeakSet();
  function adopt(m) {
    if (!m || seen.has(m)) return;
    seen.add(m);
    if (m.isShaderMaterial) {
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (shader, renderer) => {
        prev && prev.call(m, shader, renderer);
        shader.uniforms.uArmGain = gain;
        shader.fragmentShader =
          "uniform float uArmGain;\n" +
          shader.fragmentShader.replace(
            /\}\s*$/,
            "  gl_FragColor.rgb *= uArmGain;\n}",
          );
      };
      m.customProgramCacheKey = () => "armgain";
      m.needsUpdate = true;
    } else if (m.emissive && m.emissiveIntensity > 0 && !m.userData.armKeep) {
      // lit materials with a glow of their own (hot nails, talismans, rockets)
      const e = m.emissive;
      if (e.r + e.g + e.b > 0.001) m.emissiveIntensity *= FX_GAIN;
    }
    // see render.onLevelReady: double-sided transparent materials must not be drawn twice
    if (m.transparent && m.side === T.DoubleSide) m.forceSinglePass = true;
  }
  function adoptTree(o) {
    o.traverse((n) => {
      if (!n.material) return;
      if (Array.isArray(n.material)) n.material.forEach(adopt);
      else adopt(n.material);
    });
  }
  adoptTree(root);
  // particles, ribbons and decals never need the wet-street reflection pass
  const fxGroup = root.getObjectByName("fx");
  if (fxGroup) setLayer(fxGroup, 2);

  // ---------------------------------------------------------------- weapon models
  const basePos = T.Object3D.prototype.getWorldPosition;
  // An anchor on the weapon (muzzle, ejection port, blade tip) is drawn by the weapon camera;
  // effects starting there are drawn by the world camera. Hand back the point that covers the
  // same spot on screen.
  function patchAnchor(o) {
    o.getWorldPosition = function (target) {
      basePos.call(this, target);
      if (!underView(this)) return target;
      G.camera.worldToLocal(target);
      const k = fovRatio();
      target.x *= k;
      target.y *= k;
      return G.camera.localToWorld(target);
    };
  }
  let glowScaled = 0;
  async function prepare(id) {
    if (models.has(id)) return models.get(id);
    const imp = builderOf(id);
    if (!imp) throw new Error(`no weapon model "${id}"`);
    const mod = await imp();
    if (models.has(id)) return models.get(id);
    const model = mod.default(kit);
    for (const a of Object.values(model.anchors)) patchAnchor(a);
    model.holder.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = false;
        n.receiveShadow = true;
        n.frustumCulled = false;
      }
    });
    // glow parts are shared through the kit's material library: scale the new ones once
    const glows = kit.mats.glowMats;
    for (; glowScaled < glows.length; glowScaled++) {
      const m = glows[glowScaled];
      m.userData.glow = (m.userData.glow || 1) * ARMORY_TUNE.glowGain;
      m.emissiveIntensity = m.userData.glow;
      m.userData.armKeep = true;
    }
    setLayer(model.holder, VIEW_LAYER);
    // now, not when it is first held: the warm-up has to draw it the way it will be drawn
    adoptTree(model.holder);
    models.set(id, model);
    return model;
  }
  // Draw something for a few frames before it is needed, a thousandth of its size in front of
  // the weapon camera: shaders are compiled, buffers and label textures uploaded, and the
  // first time it is really shown costs nothing. (Compiling alone leaves the uploads for later.)
  const ghost = new T.Group();
  ghost.name = "armory-warm";
  ghost.position.set(0, 0, -0.6);
  ghost.scale.setScalar(0.001);
  G.camera.add(ghost);
  // "A few frames" has to mean frames in which the weapon pass really drew the ghost: while
  // the game is still loading, or showing the title without a weapon, nothing on this layer
  // is drawn at all and waiting on the clock would warm nothing. A triangle that writes
  // nothing rides along and counts the frames it was drawn in.
  let ghostFrames = 0;
  let ghostFrameAt = -1;
  const sentinel = new T.Mesh(
    new T.BufferGeometry().setAttribute(
      "position",
      new T.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
    ),
    new T.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      depthTest: false,
    }),
  );
  sentinel.frustumCulled = false;
  sentinel.layers.set(VIEW_LAYER);
  sentinel.onBeforeRender = () => {
    if (G.time.frame === ghostFrameAt) return;
    ghostFrameAt = G.time.frame;
    ghostFrames++;
  };
  ghost.add(sentinel);
  const frames = (n) =>
    new Promise((done) => {
      const until = ghostFrames + n;
      const step = () =>
        ghostFrames >= until ? done() : requestAnimationFrame(step);
      requestAnimationFrame(step);
    });
  const warmLog = []; // what was drawn ahead of time, for tests
  // The weapon pass lights what is in hand with one environment map outdoors and another
  // inside the hall, and each needs shaders of its own: draw with one, then with the other.
  async function bothEnvs(n) {
    const R = G.render;
    try {
      R.envWarm = "out";
      await frames(n);
      if (R.interiorEnv) {
        R.envWarm = "in";
        await frames(n);
      }
    } finally {
      R.envWarm = null;
    }
  }
  async function ghostDraw(obj, home) {
    if (obj.parent && obj.parent !== home) return false; // in use right now
    ghost.add(obj);
    setLayer(obj, VIEW_LAYER);
    const was = obj.visible;
    obj.visible = true;
    await bothEnvs(3);
    if (obj.parent !== ghost) return false; // taken in hand meanwhile
    ghost.remove(obj);
    if (home) home.add(obj);
    obj.visible = was;
    return true;
  }
  async function warm(id) {
    const model = await prepare(id);
    if (model.warmed) return model;
    model.warmed = true;
    try {
      // both forms as well: their parts are in the same tree, hidden
      const hidden = [];
      model.holder.traverse((n) => {
        if (!n.visible) {
          hidden.push(n);
          n.visible = true;
        }
      });
      const drawn = await ghostDraw(model.holder, null);
      warmLog.push(id + (drawn ? "" : ":in-hand"));
      for (const n of hidden) n.visible = false;
      if (lab.model !== model) model.setBranch("base");
    } catch (e) {
      warmLog.push(id + ":failed");
      console.warn("[armory] warm-up of " + id + " failed: " + e);
    }
    return model;
  }
  /** The arms, and anything else handed in (the game's own rigs), drawn once ahead of time. */
  async function warmAll(extra = []) {
    if (!api.held) {
      arms.setVisible(true);
      await ghostDraw(arms.group, view);
    }
    for (const o of extra) {
      if (o.visible) continue;
      const parent = o.parent;
      const s = o.scale.clone();
      o.scale.setScalar(0.001);
      o.visible = true;
      await bothEnvs(3);
      if (o.scale.x === 0.001) {
        o.scale.copy(s);
        // (the game may have taken it in hand for real in the meantime: then it stays up)
        const arm = G.camera.children.find((c) => c.name === "arm-right");
        const inHand =
          !api.held && G.weapon && G.weapon.root === o && !!arm && arm.visible;
        if (!inHand) o.visible = false;
      }
      if (parent && o.parent !== parent) parent.add(o);
    }
    for (const id of api.ids) {
      await warm(id);
      await frames(2);
    }
  }

  // ---------------------------------------------------------------- state
  const hooks = { canReload: null, loaded: null, changed: null };
  let cur = null; // { id, model }
  // something that is not a weapon, in both hands (the wok of a street stove, a dish being
  // packed): mounted and held like a weapon, but nothing fires
  let prop = null;
  let time = 0;
  let wasFire = false,
    wasAlt = false;
  let thrown = false;
  let bobT = 0;
  let sprintK = 0;
  let landK = 0;
  let wasGround = true;
  let zoomed = false;

  function applyLevel() {
    if (!cur) return;
    const lv = lab.state.level;
    cur.model.setBranch(lv >= 3 ? lab.state.branch : "base");
    setLayer(cur.model.holder, VIEW_LAYER);
    adoptTree(cur.model.holder);
    // level 5: the weapon is consecrated and every glow part burns brighter
    const boost = lv >= 5 ? 1.8 : 1;
    for (const m of kit.mats.glowMats)
      m.emissiveIntensity = (m.userData.glow || 1) * boost;
  }

  const api = {
    lab,
    stage,
    combat,
    targets,
    fx,
    audio,
    tune: ARMORY_TUNE,
    ids: WEAPONS.map((w) => w.id).filter((id) => !!builderOf(id)),
    def: (id) => byId[id] || null,
    /** What the lab says about a weapon in a given form: { kind, mag, rpm, reload, ... }. */
    spec(id, branch = "base", level = 1) {
      const beh = behaviours[id];
      return beh ? beh.spec(level >= 3 ? branch : "base", level) : null;
    },
    hooks,
    prepare,
    warm,
    warmAll,
    get held() {
      return !!cur;
    },
    get current() {
      return cur ? cur.id : null;
    },
    get weapon() {
      return cur ? combat.weapon : null;
    },
    get hasSecondary() {
      const w = api.weapon;
      // Branch hints describe the unlocked action. Require its handler too: the
      // firework's charge hint belongs to primary fire, not secondary fire.
      return !!(w && w.beh.alt && w.beh.hint?.[w.branch]);
    },
    /**
     * Take a weapon in hand. o: { level, branch, rounds }. Resolves once it is up (the model
     * is built on first use).
     */
    async equip(id, o = {}) {
      const model = await prepare(id);
      api.holster(true);
      prop = null;
      cur = { id, model };
      lab.model = model;
      lab.state.weapon = id;
      lab.state.level = Math.max(1, Math.min(5, o.level || 1));
      lab.state.branch =
        o.branch === "b" ? "b" : o.branch === "a" ? "a" : "base";
      applyLevel();
      stage.mount(model);
      combat.equip(model, byId[id]);
      combat.setActive(true);
      const W = combat.weapon;
      if (o.rounds !== undefined && W.spec.mag)
        W.rounds = Math.max(0, Math.min(W.spec.mag, o.rounds));
      thrown = false;
      wasFire = wasAlt = false;
      view.visible = true;
      arms.setVisible(true);
      hooks.changed && hooks.changed(id);
      return model;
    },
    /** Level or branch of the weapon in hand changed (a red envelope): keep the magazine. */
    regrade(level, branch) {
      if (!cur) return;
      const W0 = combat.weapon;
      const rounds = W0 ? W0.rounds : undefined;
      lab.state.level = Math.max(1, Math.min(5, level));
      lab.state.branch = branch === "b" ? "b" : branch === "a" ? "a" : "base";
      applyLevel();
      stage.mount(cur.model);
      combat.equip(cur.model, byId[cur.id]);
      const W = combat.weapon;
      if (rounds !== undefined && W.spec.mag)
        W.rounds = Math.max(0, Math.min(W.spec.mag, rounds));
      W.draw = 1;
    },
    /**
     * Get something that is not a weapon ready to be held: a model from kit.weapon. Its
     * anchors, layers and materials are treated like a weapon's, and it is drawn once ahead
     * of time so that taking it up costs no frame.
     */
    async adopt(model) {
      for (const a of Object.values(model.anchors)) patchAnchor(a);
      model.holder.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = false;
          n.receiveShadow = true;
          n.frustumCulled = false;
        }
      });
      setLayer(model.holder, VIEW_LAYER);
      adoptTree(model.holder);
      try {
        const hidden = [];
        model.holder.traverse((n) => {
          if (!n.visible) {
            hidden.push(n);
            n.visible = true;
          }
        });
        await ghostDraw(model.holder, null);
        for (const n of hidden) n.visible = false;
      } catch (e) {
        console.warn("[armory] warm-up of a prop failed: " + e);
      }
      return model;
    },
    /**
     * Both hands take `model` (from adopt) instead of a weapon; null lets go of it. The
     * weapon that was up is put away: the caller takes it up again afterwards (equip).
     */
    hold(model) {
      if (model) {
        api.holster(true);
        prop = model;
        stage.mount(model);
        setLayer(model.holder, VIEW_LAYER);
        view.visible = true;
        arms.setVisible(true);
      } else if (prop) {
        prop = null;
        stage.mount(null);
        if (!cur) view.visible = false;
      }
    },
    get holding() {
      return !!prop;
    },
    /** Put it away (the game's own guns come back, or nothing is held). */
    holster(silent) {
      if (!cur) return;
      combat.release("fire");
      combat.release("alt");
      combat.setActive(false);
      cur = null;
      lab.model = null;
      view.visible = false;
      stage.zoom = stage.zoomNow = 1;
      stage.kick.pitch = stage.kick.yaw = stage.kick.roll = stage.kick.fov = 0;
      zoomed = false;
      if (!silent) hooks.changed && hooks.changed(null);
    },
    /** Clear the street of everything the weapons left in it (a new run). */
    reset() {
      api.holster(true);
      combat.clear();
    },
    /** Rounds in the magazine of the weapon in hand (fuel for the streams), and its size. */
    get rounds() {
      const W = cur && combat.weapon;
      return W ? W.rounds : 0;
    },
    set rounds(v) {
      const W = cur && combat.weapon;
      if (W) W.rounds = v;
    },
    get mag() {
      const W = cur && combat.weapon;
      return W ? W.spec.mag || 0 : 0;
    },
    get reloading() {
      const W = cur && combat.weapon;
      return !!W && W.reload >= 0;
    },
    reload() {
      if (cur) combat.reload();
    },
    setMuted(m) {
      audio && audio.setMuted(m);
    },
    /**
     * Every frame of play, whether or not one of these weapons is in hand: projectiles in
     * flight, burning ground and afflicted zombies carry on regardless.
     * dt: real seconds. input: the game's input, or null when the player cannot act.
     */
    frame(dt, input) {
      const spentBefore = combat.meter.spent;
      time += dt;
      const P = G.player;
      if (cur) {
        const k =
          Math.tan(rad(G.viewCamera.fov) / 2) / Math.tan(rad(LAB_FOV) / 2);
        view.scale.set(k, k, 1);
        stage.look.yaw = P.yaw;
        stage.look.pitch = P.pitch;
        const act = !!input && P.alive;
        const fire = act && !!input.fire && !api.debug.noFire;
        const alt = act && !!input.ads;
        if (fire !== wasFire) combat[fire ? "press" : "release"]("fire");
        if (alt !== wasAlt) combat[alt ? "press" : "release"]("alt");
        wasFire = fire;
        wasAlt = alt;
        if (act && input.pressed && input.pressed("reload")) combat.reload();
        motion(dt, P);
      }
      if (prop && !cur) {
        const k =
          Math.tan(rad(G.viewCamera.fov) / 2) / Math.tan(rad(LAB_FOV) / 2);
        view.scale.set(k, k, 1);
        motion(dt, P);
      }
      combat.update(dt, time);
      const spent = combat.meter.spent - spentBefore;
      if (cur && spent > 0)
        G.events.emit("telemetry:spent", { weapon: cur.id, amount: spent });
      fx.update(dt, time);
      if (prop && !cur) {
        prop.update({ t: time }, dt);
        arms.solve(prop, {
          mode: "fp",
          dt,
          visible: P.alive,
          gain: ARMORY_TUNE.handGain,
          eased: BOTH,
        });
        setLayer(arms.group, VIEW_LAYER);
        adoptTree(root);
        return;
      }
      if (!cur) return;
      const model = cur.model;
      // ---- a thrown weapon leaves the hands: draw it with the street until it is caught
      const away = model.holder.parent !== pose;
      if (away !== thrown) {
        thrown = away;
        if (away) {
          model.holder.scale.set(1, 1, 1);
          setLayer(model.holder, 0);
        } else setLayer(model.holder, VIEW_LAYER);
      }
      // ---- arms
      const hs = combat.handState();
      arms.solve(model, {
        mode: "fp",
        dt,
        visible: P.alive,
        trigger: hs.trigger,
        away: hs.away,
        gain: ARMORY_TUNE.handGain,
      });
      setLayer(arms.group, VIEW_LAYER);
      // ---- camera: recoil and shake on top of where the player is looking, and scopes
      const kk = stage.kick;
      G.camera.rotation.x += kk.pitch;
      G.camera.rotation.y += kk.yaw;
      G.camera.rotation.z += kk.roll;
      stage.zoomNow += (stage.zoom - stage.zoomNow) * Math.min(1, dt * 12);
      if (stage.zoomNow > 1.01) {
        zoomed = true;
        G.camera.fov =
          (2 *
            Math.atan(Math.tan(rad(G.camera.fov) / 2) / stage.zoomNow) *
            180) /
          Math.PI;
        G.camera.updateProjectionMatrix();
      } else if (zoomed) zoomed = false;
      // the big ones punch the picture outwards for a moment (the game puts the field of
      // view back itself on the next frame)
      if (kk.fov > 0.0005) {
        G.camera.fov *= 1 + kk.fov;
        G.camera.updateProjectionMatrix();
      }
      // anything a weapon built this frame (a sword wave, a new ribbon) gets the same treatment
      adoptTree(root);
    },
    kit,
    arms,
    /** 0..1 how far a scope is in (slows the look and the walk like the game's own sights). */
    get ads() {
      return Math.max(0, Math.min(1, (stage.zoomNow - 1) / 1.2));
    },
    /** The spread the crosshair should show for the weapon in hand (rad). */
    get spread() {
      return combat.spread;
    },
    debug: { kit, models, view, root, gain, warmLog, noFire: false },
  };

  // walking, sprinting and landing move the weapon about; the lab stands still, so this is ours
  function motion(dt, P) {
    const speed = P.onGround ? Math.min(1.4, P.speed / 3.8) : 0;
    bobT += dt * (P.sprinting ? 11.5 : 8.2) * Math.min(1, speed + 0.15);
    sprintK += ((P.sprinting ? 1 : 0) - sprintK) * Math.min(1, dt * 9);
    if (P.onGround && !wasGround) landK = 1;
    wasGround = P.onGround;
    landK *= Math.exp(-8 * dt);
    const a = speed * (1 - 0.6 * api.ads);
    bob.position.set(
      Math.sin(bobT) * 0.006 * a + sprintK * 0.03,
      -Math.abs(Math.cos(bobT)) * 0.007 * a - sprintK * 0.06 - landK * 0.03,
      sprintK * 0.04,
    );
    bob.rotation.set(
      -sprintK * 0.32 + landK * 0.06,
      sprintK * 0.5 + Math.sin(bobT) * 0.006 * a,
      Math.sin(bobT) * 0.012 * a + sprintK * 0.25,
    );
  }

  G.events.on("game:state", (e) => {
    if (!audio) return;
    if (
      e &&
      (e.state === "paused" || e.state === "dead" || e.state === "complete")
    )
      audio.stopLoops();
  });
  return api;
}
