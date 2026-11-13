// The run: one stage of roughly ten minutes in the manner of survivor games.
//
// - The dead keep coming by the courses of a meal instead of in set waves. Three street
//   stoves each make one dish: three tosses of the wok (taken off the fire in both hands,
//   so no weapon), the stove held after each, then the dish packed and taken along. Every
//   stove lit begins the next course; the third dish packed brings the boss, and the
//   checkpoint only opens once it is down.
// - Kills fill the wok-hei bar. Every level offers three tickets: seasonings, or a new weapon.
//   They are picked in deep slow motion, never a full stop: the player stops to choose
//   (no walking or firing), with the mouse let go to click one, and no time limit.
// - Any number of weapons can be carried (loadout.js). Each draws on one of four pools of
//   ammunition that has to be picked up from the street or fetched from the lit supply crates,
//   so leaning on one weapon means hunting for its ammunition, and carrying one for every
//   pool means wasting nothing.
// - Red envelopes (elites, sirens, the boss) raise the weapon in hand one level, up to five;
//   at level three a weapon forks into one of two forms.
//
// game.js owns the state machine and calls in here; everything tunable is in RUN (runtune.js).
import * as L10N from "../i18n/index.js";
import { createPickups } from "./pickups.js";
import { createRunHud } from "./runhud.js";
import { createWheel } from "./wheel.js";
import { createRange } from "./range.js";
import { createLoadout, ARMS, AMMO, AMMO_TYPES, MAX_LEVEL } from "./loadout.js";
import {
  stageAt as stageOf,
  crowdOf,
  spawnPace,
  spawnKind,
  spawnGap,
  killXp,
  gainXp,
  packWeights,
  eliteStats,
  foodChance,
  dishOf,
  clockStep,
  stoveCount,
  newDish,
  dishTake,
  dishPack,
  dishTossed,
  dishHot,
  dishStep,
  dishLeft,
  dishGrade,
  timedElite,
} from "./runflow.js";
import {
  RUN,
  spiceValue,
  spiceVars,
  weaponMods,
  infusionsOf,
} from "./runtune.js";

export { RUN };

const PROFILE_KEY = "wokingdead.profile.v1";

export function createRun(G, hooks) {
  const V3 = G.THREE.Vector3;
  const rng = G.rng && G.rng.fork ? G.rng.fork() : Math.random;
  const pickups = createPickups(G);
  pickups.setGain((RUN.places[G.stage] || {}).glow || 1);
  const hud = createRunHud(G);
  // the firing range (/?range=1): this same run with the timeline off and a panel instead
  let range = null;
  const sites = (G.level && G.level.supplySites) || [];
  const tmp = new V3();
  const UP = new V3(0, 1, 0);
  // a larger pool of bodies (desktop) carries proportionally more of the dead at once
  const pool = (G.enemies && G.enemies.TUNE && G.enemies.TUNE.pool) || {};
  const { crowd, room: poolRoom } = crowdOf(
    (pool.romero || 0) + (pool.girl || 0) + (pool.cop || 0),
  );

  let baseTune = null;
  const baseHealth = (G.player && G.player.maxHealth) || 100;

  const S = {
    active: false,
    t: 0,
    level: 0,
    xp: 0,
    kills: 0,
    sirens: 0,
    spice: {},
    spawnT: 0,
    eliteAt: 0,
    eliteN: 0,
    eliteIdle: 0, // timed elites since the last stove was lit
    newPlace: false,
    elites: [],
    boss: null,
    bossSeen: false,
    bossDead: false,
    bossRetry: 0,
    summonT: 0,
    clock: 0, // the meal's clock: what the courses are read at (runflow.js, clockStep)
    cook: null, // the dish on a stove: runflow.js's newDish, plus { o, pos, can, beat }
    hands: "", // what the cook's hands are full of instead of a weapon: "wok" | "pack"
    stoves: 0, // lit so far
    served: 0, // dishes packed
    bossDue: -1, // when the boss is to arrive (S.t), once the last dish is packed
    menu: [], // the specials still to come, in the order they will be served
    bonusHealth: 0, // from the soup special
    bonusCap: 0, // from the stock special
    extractOpen: false,
    pending: 0, // level-ups waiting for their tickets
    queue: [], // other picks waiting: { kind: "start" } | { kind: "fork", id }
    picking: null,
    pickHold: 0,
    pickGap: 0,
    caches: [],
    spotT: 0,
    bursts: [],
    burstDepth: 0,
    lowHintT: 0,
    scale: 1,
    unlocked: [],
  };

  const play = (name, opts) => {
    try {
      if (G.audio && G.audio.play) G.audio.play(name, opts);
    } catch {}
  };
  const diff = () =>
    RUN.difficulty[G.game && G.game.difficulty] || RUN.difficulty.hard;
  const place = () => RUN.places[G.stage] || RUN.places.street;
  const dirName = (pos) => {
    const p = G.player.pos;
    const deg =
      ((Math.atan2(pos.x - p.x, -(pos.z - p.z)) * 180) / Math.PI + 360) % 360;
    return L10N.t("dir." + (Math.round(deg / 45) % 8));
  };
  const wname = (id) => L10N.t("weapon." + id);

  // ---------- what was unlocked before, kept between runs
  function loadProfile() {
    const p = {
      kills: 0,
      runs: 0,
      bossSeen: 0,
      clears: 0,
      docksClears: 0,
      hardClears: 0,
      allSirens: 0,
      weapons: [],
    };
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (saved && typeof saved === "object")
        for (const k of Object.keys(p))
          if (typeof saved[k] === typeof p[k]) p[k] = saved[k];
    } catch {}
    return p;
  }
  const profile = loadProfile();
  const saveProfile = () => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {}
  };
  const everything = G.params && G.params.unlock === "all";
  const unlocked = (id) =>
    everything ||
    id === "pistol" ||
    RUN.unlocks.start.includes(id) ||
    profile.weapons.includes(id);
  const placeOpen = (id) =>
    id !== "docks" ||
    everything ||
    profile.clears > 0 ||
    profile.docksClears > 0;
  // fold a finished run into the profile; returns the weapons it put on the menu
  function bank(cleared) {
    if (S.range) return []; // the firing range keeps no record and unlocks nothing
    profile.kills += S.kills;
    profile.runs++;
    if (S.bossSeen) profile.bossSeen++;
    S.newPlace = false;
    if (cleared) {
      // the first meal served on the street opens the docks branch
      if (G.stage !== "docks" && !placeOpen("docks")) S.newPlace = true;
      if (G.stage === "docks") profile.docksClears++;
      profile.clears++;
      if (G.game.difficulty !== "standard") profile.hardClears++;
      if (S.sirens >= 3) profile.allSirens++;
    }
    const fresh = [];
    for (const r of RUN.unlocks.rules)
      if (!unlocked(r.id) && r.when(profile)) {
        profile.weapons.push(r.id);
        fresh.push(r.id);
      }
    saveProfile();
    S.unlocked = fresh;
    return fresh;
  }

  // ---------- weapons and ammunition
  const loadout = createLoadout(G, {
    dry(from, to) {
      hud.toast(
        L10N.t("run.toast.dry", { w: wname(from), to: wname(to) }),
        "warn",
      );
    },
    // one reload filled the weapons that were put away as well
    reloaded() {
      hud.toast(L10N.t("run.toast.reloadAll"));
    },
  });
  loadout.load();
  const available = () =>
    Object.keys(ARMS).filter(
      (id) =>
        unlocked(id) &&
        !loadout.has(id) &&
        (ARMS[id].own || (loadout.armory && loadout.armory.ids.includes(id))),
    );

  // ---------- derived numbers
  function applyStats() {
    const sp = S.active ? S.spice : {};
    loadout.setCapMul(
      1 + spiceValue("portion", sp.portion) + (S.active ? S.bonusCap : 0),
    );
    loadout.setMods(weaponMods(sp));
    loadout.setInfusions(infusionsOf(sp));
    const P = G.player;
    if (P && P.tuning && baseTune) {
      const move = 1 + spiceValue("runner", sp.runner);
      for (const k of ["walk", "sprint", "crouch", "ads"])
        P.tuning[k] = baseTune[k] * move;
      // wounds do not close by themselves in a run (RUN.heal)
      P.tuning.regenRate = baseTune.regenRate * (S.active ? RUN.heal.regen : 1);
    }
    if (P) {
      const hp =
        baseHealth +
        spiceValue("soup", sp.soup) +
        (S.active ? S.bonusHealth : 0);
      if (P.maxHealth !== hp) {
        const gain = hp - P.maxHealth;
        P.maxHealth = hp;
        if (gain > 0) P.heal(gain);
        else P.health = Math.min(P.health, hp);
      }
    }
  }
  function spiceList() {
    return RUN.spices
      .filter((s) => S.spice[s.id] > 0)
      .map((s) => ({ id: s.id, level: S.spice[s.id], max: RUN.spiceMax }));
  }
  function addSpice(id) {
    S.spice[id] = (S.spice[id] || 0) + 1;
    applyStats();
    hud.setSpices(spiceList());
  }
  // a seasoning straight to a level (0 takes it off): the firing range's switches
  function setSpice(id, level) {
    if (!RUN.spices.some((x) => x.id === id)) return;
    const lv = Math.max(0, Math.min(RUN.spiceMax, level | 0));
    if (lv) S.spice[id] = lv;
    else delete S.spice[id];
    applyStats();
    hud.setSpices(spiceList());
  }
  // For trying in a real run what was set up in the weapon lab, the game takes the lab's own
  // address parameters: ?w=flamer&b=a&lv=5 opens the run with that weapon in that form in
  // hand instead of the first ticket, ?spice=chili:2,fire:3 with those seasonings already on.
  function preset() {
    const p = G.params || {};
    const spice = {};
    for (const part of String(p.spice || "").split(",")) {
      const [id, lv] = part.split(":");
      if (RUN.spices.some((x) => x.id === id))
        spice[id] = Math.max(1, Math.min(RUN.spiceMax, +lv || 1));
    }
    const forked = p.b === "a" || p.b === "b";
    const weapon =
      p.w && ARMS[p.w]
        ? {
            id: p.w,
            level: Math.max(1, Math.min(MAX_LEVEL, +p.lv || (forked ? 3 : 1))),
            branch: p.b === "b" ? "b" : "a",
          }
        : null;
    return { weapon, spice };
  }

  // ---------- timeline
  const stageAt = (t) => stageOf(t, place());
  // The street as a run finds it: the dead standing and shuffling about all over it, none of
  // them after anyone yet. Anywhere a person can walk to, but not on top of the player.
  function scatterWanderers(n) {
    const nav = G.physics && G.physics.nav;
    const P = G.player.pos;
    let g = null;
    try {
      g = nav._grid();
    } catch {}
    for (let i = 0; i < n; i++) {
      let pos = null;
      for (let k = 0; k < 40 && !pos && g; k++) {
        tmp.set(
          g.minX + rng() * g.w * g.cell,
          0,
          g.minZ + rng() * g.h * g.cell,
        );
        if (Math.hypot(tmp.x - P.x, tmp.z - P.z) < 14) continue;
        try {
          if (nav.isWalkable(tmp.x, tmp.z) && nav.findPath(P, tmp))
            pos = tmp.clone();
        } catch {}
      }
      hooks.spawn("walker", pos || hooks.pickSpawn("walker", { minDist: 12 }), {
        state: "patrol",
        dull: true,
        runner: rng() < 0.2,
      });
    }
  }
  function brutesAlive() {
    let n = 0;
    for (const z of G.enemies.list)
      if (z.alive && z.type === "brute" && !z.rank) n++;
    return n;
  }
  function spawnOne(type, opts = {}, where) {
    const pos = hooks.pickSpawn(type, where);
    return spawnAt(type, pos, opts);
  }
  // (a part played by one of the new bodies falls back to the usual one when every rig of
  // that body is already up)
  function spawnAt(type, pos, opts = {}) {
    const { plain, ...rest } = opts;
    const base = { state: "alert", target: G.player.pos };
    return (
      hooks.spawn(type, pos, { ...base, ...rest }) ||
      (plain ? hooks.spawn(type, pos, { ...base, ...plain }) : null)
    );
  }
  // The model that plays a part (RUN.bodies), once it has been fetched and unless the firing
  // range has put one model in every part (zombies.cast). opts.plain keeps what the part
  // was without it.
  function withBody(part, opts) {
    const b = RUN.bodies[part];
    const E = G.enemies;
    if (!b || E.cast || !E.has || !E.has(b.body)) return opts;
    // (the glow that marked a part on the usual body would drown these models: a trace of
    // it is left, the model itself says who it is)
    const glow =
      opts.glow && RUN.bodies.glow > 0
        ? opts.glow.map((v, i) => (i < 3 ? v * RUN.bodies.glow : v))
        : null;
    return {
      ...opts,
      body: b.body,
      scale: b.scale ?? opts.scale,
      glow,
      plain: opts,
    };
  }
  function fetchBodies() {
    const E = G.enemies;
    if (!E.ensure) return;
    const names = [
      ...new Set(
        Object.values(RUN.bodies)
          .map((b) => b && b.body)
          .filter(Boolean),
      ),
    ];
    const failed = (e) =>
      console.warn("[run] a body could not be fetched: " + e);
    // A phone gets them one after another: each arrives with full-size maps that are only
    // then made smaller, and five at once would be a couple of hundred megabytes for a moment.
    if (G.quality && G.quality.name === "low")
      names
        .reduce((p, n) => p.then(() => E.ensure([n])), Promise.resolve())
        .catch(failed);
    else E.ensure(names).catch(failed);
  }
  function bloaterOpts() {
    const B = RUN.bloater;
    return withBody("bloater", {
      rank: "bloater",
      runner: true,
      hpMul: B.hp,
      scale: B.scale,
      glow: B.glow,
    });
  }
  // n: how many elites came before this one (each is tougher than the last)
  function eliteOpts(n) {
    const E = RUN.elite;
    const { kind, ...stats } = eliteStats(n);
    return withBody(kind, {
      rank: "elite",
      ...stats,
      // (without its own body a hunter is the same soldier, a size smaller)
      scale: E.scale * (kind === "hunter" ? 0.85 : 1),
      glow: E.glow,
    });
  }
  // one of a pack: quick, and easy to put down
  function packOpts() {
    const K = RUN.pack;
    return withBody("pack", { runner: true, hpMul: K.hp, speedMul: K.speed });
  }
  function bossOpts() {
    const B = RUN.boss;
    const tune = (G.enemies.TUNE && G.enemies.TUNE.brute) || { hp: 320 };
    return withBody("boss", {
      rank: "boss",
      hpMul: (diff().bossHp * (place().bossHp || 1)) / tune.hp,
      scale: B.scale,
      dmgMul: B.damage * (diff().bossHit || 1),
      speedMul: B.speed * (diff().bossSpeed || 1),
      glow: B.glow,
    });
  }
  function spawnTick(dt) {
    S.spawnT -= dt;
    if (S.spawnT > 0) return;
    const st = stageAt(S.clock);
    const { every, cap } = spawnPace(st, diff(), {
      cooking: dishHot(S.cook),
      heat: S.cook ? S.cook.n : 0,
      step: S.cook ? S.cook.k : 0,
      crowd,
      room: poolRoom,
    });
    if (hooks.alive() >= cap) {
      S.spawnT = 0.25;
      return;
    }
    const kind = spawnKind(st, rng(), brutesAlive());
    let z;
    if (kind === "brute") z = spawnOne("brute");
    else if (kind === "bloater") z = spawnOne("walker", bloaterOpts());
    else if (kind === "pack") z = spawnPack();
    else if (st.quiet && !S.cook)
      // a quiet course: it rises somewhere out of the way and wanders
      z = hooks.spawn("walker", hooks.pickSpawn("walker", { minDist: 20 }), {
        state: "patrol",
        dull: true,
        runner: rng() < st.runner,
      });
    else z = spawnOne("walker", { runner: rng() < st.runner });
    S.spawnT = z ? spawnGap(every, rng()) : 0.4;
  }
  // a pack: they rise at one spot, a step apart, and come on together
  function spawnPack() {
    const K = RUN.pack;
    const at = hooks.pickSpawn("walker");
    if (!at) return null;
    let z = null;
    for (let i = 0; i < K.size; i++) {
      const pos = i ? hooks.scatterSpawn(at, K.spread) : at;
      if (pos) z = spawnAt("walker", pos, packOpts()) || z;
    }
    return z;
  }
  function spawnElite() {
    const z = spawnOne("brute", eliteOpts(S.eliteN), { minDist: 20 });
    if (!z) return null;
    S.eliteN++;
    S.elites.push(z);
    hooks.warn(L10N.t("run.elite.warn", { dir: dirName(z.pos) }), 3.2);
    play("mus_hit", { gain: 0.8 });
    hooks.refreshMarkers();
    return z;
  }
  // the timed ones: not while a dish is on (it brings its own), nor once the last is packed,
  // and only so many between one stove and the next (runflow.js, timedElite)
  function eliteTick() {
    if (
      S.bossSeen ||
      !timedElite({
        t: S.t,
        eliteAt: S.eliteAt,
        cooking: !!S.cook,
        served: S.served,
        idle: S.eliteIdle,
      })
    )
      return;
    if (spawnElite()) {
      S.eliteIdle++;
      S.eliteAt += place().eliteEvery || RUN.elite.every;
    } else S.eliteAt = S.t + 2;
  }

  // ---------- the stoves
  const setStove = (o, state) => {
    try {
      const u = o && o.object && o.object.userData;
      if (u && u.setState) u.setState(state);
    } catch {}
    G.events.emit("stove:state", { id: o && o.id, pos: o && o.pos, state });
  };
  // ---------- the cook's hands
  // The wok and the packing are held like a weapon (wokhand.js, through the armoury). Until
  // the armoury is there, or if it never comes, the hands are simply empty.
  // (wokhand.js is fetched with it: like the arsenal's modules it builds on the engine, which
  // game.js has only published once it is running)
  let wokHands = null;
  loadout.load().then(async (a) => {
    if (!a) return;
    try {
      const { createWokHands } = await import("./wokhand.js");
      const made = createWokHands(a);
      // (usable at once; each is also drawn once ahead of time, whenever frames allow)
      wokHands = made;
      // (the dish as it stands on a stove is drawn by the street's pass: a few frames of it
      // a thousandth of its size before the eye, so that the first time it is set down
      // costs nothing)
      const d = made.dish;
      d.scale.setScalar(0.001);
      d.position.set(0, 0, -0.7);
      G.camera.add(d);
      setTimeout(() => {
        if (d.parent === G.camera) G.camera.remove(d);
      }, 2500);
      for (const m of made.models) await a.adopt(m);
    } catch (e) {
      console.error(
        "[run] the wok could not be built: " + ((e && e.stack) || e),
      );
    }
  });
  // charred: (packing) what goes into the pail has gone black
  // The dish in the wok of the street stove: the stove draws a mound of its own, but with
  // the cook's hands there (wokhand.js) what stands in it is the heap that was tossed.
  let plated = null; // the stove it stands on (the userData of its object)
  function plate(o) {
    const u = o && o.object && o.object.userData;
    if (!wokHands || !u || !u.setDish || plated === u) return;
    if (plated) plated.setDish(null);
    u.setDish(wokHands.dish);
    plated = u;
  }
  function unplate() {
    try {
      if (plated) plated.setDish(null);
    } catch {}
    plated = null;
  }
  function fillHands(what, charred = false) {
    S.hands = what;
    closeWheel();
    if (wokHands) {
      if (what === "wok") wokHands.startToss();
      else wokHands.startPack(charred);
    }
    loadout.carry(wokHands ? wokHands[what] : null);
  }
  function freeHands() {
    if (!S.hands) return;
    S.hands = "";
    hud.setHands(false);
    loadout.uncarry();
  }
  // fire off the wok: the dead in front of the cook burn and are thrown back
  function flare() {
    const F = RUN.stove.toss.flare;
    const P = G.player;
    const dir = tmp.set(P.forward.x, 0, P.forward.z);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
    dir.normalize();
    const d = dir.clone();
    play("wok_flip", { gain: 1 });
    try {
      if (wokHands && S.hands === "wok") wokHands.flare(d, F.range);
    } catch {}
    const dmg = F.damage * (1 + spiceValue("fire", S.spice.fire));
    const T = loadout.armory && loadout.armory.targets;
    if (T) {
      // (from the eye, levelled: the cone is about who stands in front, not where the cook looks)
      for (const h of T.inCone(P.eye, d, F.range, F.half)) {
        T.damage(h.z, dmg, {
          dir: d.clone(),
          element: "fire",
          knock: F.knock,
          kind: "blast",
          noChain: true,
        });
        if (h.z.alive) T.apply(h.z, "fire", F.burn);
      }
      return;
    }
    const cos = Math.cos(F.half);
    for (const z of G.enemies.list) {
      if (!z.alive) continue;
      const dx = z.pos.x - P.pos.x;
      const dz = z.pos.z - P.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > F.range || (dist > 0.8 && (dx * d.x + dz * d.z) / dist < cos))
        continue;
      z.damage(dmg, z.pos, d, "body");
    }
  }

  // ---------- a dish on a stove
  // The rules are runflow.js's (newDish, dishStep): three tosses, the dish frying by itself
  // after each, then packing; a dish left waiting catches, and left longer is charred.
  // What is the cook's to do is done here: taking the wok up and starting to pack are one
  // press of the interact key at the stove (no holding: the tossing is what takes the
  // time), and the wok goes back by itself once tossed and carried within reach.
  let useWas = false;
  function cookTick(dt) {
    const c = S.cook;
    if (!c) return;
    const K = RUN.stove;
    const P = G.player;
    const I = G.input;
    const dist = P.alive
      ? Math.hypot(P.pos.x - c.pos.x, P.pos.z - c.pos.z)
      : Infinity;
    const level = Math.abs((c.pos.y || 0) - P.pos.y) < 2.5;
    const home = level && dist < K.toss.reach;
    // the cook's part: one press of the key by the stove
    const can =
      home && !S.picking && (c.phase === "due" || c.phase === "ready");
    const useDown = !!(I && I.down && I.down("interact"));
    const tap =
      (I && I.pressed && I.pressed("interact")) || (useDown && !useWas);
    useWas = useDown;
    if (can && tap) {
      if (c.phase === "due" && dishTake(c)) {
        fillHands("wok");
        setStove(c.o, "toss");
        smell(c);
      } else if (dishPack(c)) {
        fillHands("pack", c.charred);
        setStove(c.o, "served");
        play("gear_rustle", { gain: 0.9 });
        c.beat = 0;
      }
      hooks.refreshMarkers();
      hooks.refreshObjective();
    }
    c.can = can && (c.phase === "due" || c.phase === "ready");
    for (const ev of dishStep(c, dt, { home })) {
      if (ev === "flip") flare();
      else if (ev === "down") {
        freeHands();
        setStove(c.o, "cook");
        play("wok_down", { gain: 1 });
        S.spawnT = 0;
      } else if (ev === "packs") {
        for (let i = 0; i < K.packs[c.k]; i++) spawnPack();
      } else if (ev === "elite") {
        if (!S.bossSeen && spawnElite())
          S.eliteAt = Math.max(S.eliteAt, S.t + K.eliteHold);
      } else if (ev === "due") {
        setStove(c.o, "due");
        play("run_bell", { gain: 0.8, pitch: 1.2 });
      } else if (ev === "ready") {
        setStove(c.o, "ready");
        play("run_bell", { gain: 1 });
      } else if (ev === "scorched") {
        hud.toast(L10N.t("run.toast.scorched"), "warn");
        play("run_bell", { gain: 0.7, pitch: 0.55 });
      } else if (ev === "charred") {
        // (whatever it was waiting for, it can only be packed now)
        setStove(c.o, "ready");
        hud.toast(L10N.t("run.toast.charred"), "warn");
        play("run_bell", { gain: 0.8, pitch: 0.4 });
      } else if (ev === "served") serve(c);
      if (ev !== "flip" && ev !== "served") {
        hooks.refreshObjective();
        hooks.refreshMarkers();
      }
    }
    if (S.cook !== c) return;
    // the hands (the model may only have arrived after they were filled)
    if (S.hands && wokHands && loadout.carried !== wokHands[S.hands])
      loadout.carry(wokHands[S.hands]);
    if (wokHands && S.hands === "wok") {
      wokHands.setToss(c.t / K.toss.seconds, K.toss.flips, dishTossed(c));
      wokHands.steam(dt);
      // the stove it came off burns open meanwhile
      tmp.set(c.pos.x, (c.pos.y || 0) + 0.9, c.pos.z);
      wokHands.burner(tmp, dt);
    } else if (wokHands && S.hands === "pack") {
      const u = c.t / K.pack;
      wokHands.setPack(u);
      if (!c.charred) wokHands.steam(dt, wokHands.pack);
      // the beats of it, heard: the lid, the ticket, the bag
      const beats = [
        [0.6, "wok_down", 0.5, 1.6],
        [0.66, "wok_staple", 1, 1],
        [0.76, "gear_rustle", 1, 1],
      ];
      while (c.beat < beats.length && u >= beats[c.beat][0]) {
        const [, name, gain, pitch] = beats[c.beat++];
        play(name, { gain, pitch });
      }
    }
    // on its stove it is the heap that was tossed, shivering as it fries (harder when it
    // wants tossing again), and black once it is charred
    if (wokHands) {
      plate(c.o);
      wokHands.charDish(c.charred);
      if (c.phase === "fry" || c.phase === "due" || c.phase === "ready")
        wokHands.sizzle(dt, c.charred ? 0 : c.phase === "due" ? 2.4 : 1);
    }
    // a dish that has caught says so where it stands: black smoke off the wok
    if (wokHands && (c.caught || c.charred) && c.phase !== "pack") {
      tmp.set(c.pos.x, (c.pos.y || 0) + 1.1, c.pos.z);
      wokHands.smoke(tmp, dt, c.charred);
    }
    // the line under the course name: what to do now. It is the only place that says it:
    // the radio does not repeat it, and the mark on the stove only shows the way back
    const waits = c.phase === "due" || c.phase === "ready";
    const last = K.fry.length - 1;
    let key = c.phase;
    let s = 0;
    let urgent = false;
    let mark = "";
    if (c.phase === "toss") {
      const tossed = dishTossed(c);
      key = tossed ? "back" : "toss" + Math.min(c.k, last);
      mark = tossed ? "back" : "";
    } else if (c.phase === "fry") {
      key = "fry" + Math.min(c.k, last);
      s = K.fry[c.k] - c.t;
      mark = "fry";
    } else if (waits) {
      key = mark = c.charred ? "charred" : c.caught ? "late" : c.phase;
      s = dishLeft(c) || 0;
      urgent = c.charred || c.caught || s < 6;
    }
    s = Math.max(0, Math.ceil(s));
    hud.setCook({ key, s, urgent });
    // (the mark only says where the stove is: what to do is said once, in the line)
    const markText = mark ? L10N.t("run.mark.wok") : "";
    if (markText !== c.mark) {
      c.mark = markText;
      hooks.refreshMarkers();
    }
    hud.setHands(!!S.hands);
  }
  // The dead already in the street get wind of the dish: those within RUN.stove.smell of the
  // stove at this toss stop wandering and come. Further with every toss: the street does not
  // empty itself onto the cook the moment the wok is first in hand.
  function smell(c) {
    const reach = RUN.stove.smell;
    const r = reach[Math.min(c.k, reach.length - 1)];
    try {
      for (const z of G.enemies.list)
        if (z.alive && Math.hypot(z.pos.x - c.pos.x, z.pos.z - c.pos.z) < r)
          z.dull = false;
      G.enemies.alert(c.pos, r);
    } catch {}
  }
  // what the interact prompt should say by the stove: { text } or null (game.js asks)
  function stovePrompt() {
    const c = S.cook;
    if (!c || !c.can) return null;
    return {
      text: L10N.t(c.phase === "due" ? "run.prompt.toss" : "run.prompt.pack"),
    };
  }
  // packed: the dish is the cook's, and it pays
  function serve(c) {
    unplate();
    S.cook = null;
    S.sirens++;
    S.served++;
    freeHands();
    hud.setCook(null);
    setStove(c.o, "served");
    // (the timed elites start again, but not on the heels of this)
    S.eliteAt = Math.max(S.eliteAt, S.t + RUN.stove.eliteAfter);
    const dish = S.menu.shift() || RUN.dishes[0];
    const d = dishOf(dish, dishGrade(c), c.charred);
    const P = G.player;
    if (d.health) S.bonusHealth += d.health;
    if (d.cap) S.bonusCap += d.cap;
    if (d.health || d.cap) applyStats();
    P.heal(d.full ? P.maxHealth : P.maxHealth * d.heal);
    if (d.refill) loadout.refill();
    // the envelopes land on the player's side of the stove
    for (let i = 0; i < d.envelopes; i++) {
      tmp.set(P.pos.x - c.pos.x, 0, P.pos.z - c.pos.z);
      if (tmp.lengthSq() > 0.01) tmp.setLength(1.2 + 0.5 * i);
      tmp.applyAxisAngle(UP, (i - (d.envelopes - 1) / 2) * 0.7);
      tmp.add(c.pos);
      tmp.y = P.pos.y;
      try {
        if (!G.physics.nav.isWalkable(tmp.x, tmp.z)) tmp.copy(P.pos);
      } catch {}
      dropEnvelope(tmp);
    }
    if (c.charred) hud.toast(L10N.t("run.dish.charred"), "warn");
    else {
      hud.toast(
        L10N.t("run.dish." + dish, {
          n: d.health || Math.round(d.cap * 100) || d.envelopes,
        }),
        "gold",
      );
      if (c.late) hud.toast(L10N.t("run.dish.scorched"), "warn");
    }
    play("complete", { gain: 0.5, pitch: c.charred ? 0.7 : 1.2 });
    G.events.emit("run:dish", {
      n: S.served,
      dish,
      late: c.late,
      charred: c.charred,
      t: S.t,
    });
    if (S.served >= stoveCount()) {
      // the last one: the smell of all three brings the house special
      S.bossDue = S.t + RUN.boss.after;
      hooks.radio(L10N.t("radio.lastDish"), 4);
    } else hooks.radio(L10N.t("radio.served"), 3.6);
    hooks.refreshObjective();
    hooks.refreshMarkers();
  }
  function bossTick(dt) {
    if (S.bossDead) return;
    if (!S.bossSeen) {
      if (S.bossDue < 0 || S.t < S.bossDue) return;
      S.bossRetry -= dt;
      if (S.bossRetry > 0) return;
      const B = RUN.boss;
      const z = spawnOne("brute", bossOpts(), { minDist: 22 });
      if (!z) {
        S.bossRetry = 1;
        return;
      }
      S.boss = z;
      S.bossSeen = true;
      // the ride out brings a bowl of soup: three stoves' worth of wounds are not carried into this
      if (B.heal && G.player.alive) {
        G.player.heal(G.player.maxHealth);
        hud.toast(L10N.t("run.toast.soup"), "gold");
      }
      S.summonT = B.summonEvery * 0.6;
      hooks.warn(L10N.t("run.boss.warn", { dir: dirName(z.pos) }), 3.6);
      hooks.radio(L10N.t("radio.boss"), 4.4);
      G.events.emit("objective:all", {});
      hooks.refreshObjective();
      hooks.refreshMarkers();
      return;
    }
    const z = S.boss;
    if (!z || !z.alive) return;
    S.summonT -= dt;
    if (S.summonT <= 0) {
      S.summonT = RUN.boss.summonEvery;
      G.events.emit("enemy:voice", {
        enemy: z,
        pos: z.pos,
        kind: "scream",
        type: "brute",
      });
      for (let i = 0; i < RUN.boss.summon; i++)
        spawnOne("walker", { runner: true });
    }
  }

  // ---------- experience and the tickets
  function addXp(n) {
    if (S.range && !range.tickets) return; // the range levels nothing up unless asked to
    S.pending += gainXp(S, n);
  }
  const pickN = (list, n) => {
    const bag = list.slice();
    const out = [];
    while (out.length < n && bag.length)
      out.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
    return out;
  };
  function weaponCard(id) {
    const a = ARMS[id];
    return {
      kind: "weapon",
      id,
      nameKey: "weapon." + id,
      descKey: a.ammo ? "run.card.weapon.d" : "run.card.weapon.free",
      varKeys: {
        type: "weapon." + id + ".type",
        ...(a.ammo ? { ammo: "run.ammo." + a.ammo } : {}),
      },
      level: 1,
      max: 1,
    };
  }
  // weapons to offer: one for a pool nothing carried draws on yet comes first, if there is one
  function weaponOffers(n, { mains = false } = {}) {
    let ids = available();
    if (mains) ids = ids.filter((id) => ARMS[id].ammo);
    const fed = new Set(
      loadout
        .owned()
        .map((id) => ARMS[id].ammo)
        .filter(Boolean),
    );
    const fresh = pickN(
      ids.filter((id) => ARMS[id].ammo && !fed.has(ARMS[id].ammo)),
      1,
    );
    const rest = pickN(
      ids.filter((id) => !fresh.includes(id)),
      n - fresh.length,
    );
    return pickN([...fresh, ...rest], n).map(weaponCard);
  }
  function spiceCards(n) {
    const open = RUN.spices.filter((s) => (S.spice[s.id] || 0) < RUN.spiceMax);
    const bag = open.map((s) => ({ s, w: S.spice[s.id] ? 1.4 : 1 }));
    const cards = [];
    while (cards.length < n && bag.length) {
      let roll = rng() * bag.reduce((a, b) => a + b.w, 0);
      let k = 0;
      while (k < bag.length - 1 && (roll -= bag[k].w) > 0) k++;
      const s = bag.splice(k, 1)[0].s;
      const next = (S.spice[s.id] || 0) + 1;
      cards.push({
        kind: "spice",
        id: s.id,
        nameKey: "run.spice." + s.id,
        descKey: "run.spice." + s.id + ".d",
        vars: spiceVars(s.id, next),
        level: next,
        max: RUN.spiceMax,
      });
    }
    return cards;
  }
  function rollCards() {
    let cards;
    if (RUN.weaponPicks.includes(S.level - S.pending + 1)) {
      cards = weaponOffers(3);
      if (cards.length < 3) cards = [...cards, ...spiceCards(3 - cards.length)];
    } else {
      cards = spiceCards(3);
      if (rng() < RUN.weaponChance) {
        const w = weaponOffers(1);
        if (w.length)
          cards[cards.length ? Math.floor(rng() * cards.length) : 0] = w[0];
      }
    }
    // everything maxed: fall back to plain helpings so a level is never wasted
    for (const kind of ["heal", "ammo"])
      if (cards.length < 3)
        cards.push({
          kind,
          nameKey: "run.card." + kind,
          descKey: "run.card." + kind + ".d",
          level: 1,
          max: 1,
        });
    // the house recommendation: a hint for players who do not know the dishes yet
    let rec = cards.findIndex((c) => c.kind === "spice" && S.spice[c.id] > 0);
    if (rec < 0) rec = cards.findIndex((c) => c.kind === "weapon");
    if (rec < 0) rec = 0;
    cards[rec].recommended = true;
    return cards;
  }
  function openPick(req) {
    const P = RUN.pick;
    let cards;
    let o = {};
    let timing = P;
    if (req.kind === "start") {
      cards = weaponOffers(3, { mains: true });
      if (!cards.length) return false;
      cards[0].recommended = true;
      o = { titleKey: "run.cards.start" };
      timing = P.start;
    } else if (req.kind === "fork") {
      if (!loadout.has(req.id)) return false;
      cards = ["a", "b"].map((b) => ({
        kind: "branch",
        id: req.id,
        branch: b,
        tagKey: "run.fork." + b,
        nameKey: `run.branch.${req.id}.${b}`,
        descKey: `run.branch.${req.id}.${b}.d`,
        level: 1,
        max: 1,
      }));
      cards[0].recommended = true;
      o = {
        titleKey: "run.cards.fork",
        titleVarKeys: { w: "weapon." + req.id },
      };
      timing = P.fork;
    } else cards = rollCards();
    S.picking = {
      kind: req.kind,
      cards,
      slow: timing.slow,
      guard: P.guard,
    };
    hud.openCards(cards, (i) => choose(i), o);
    hooks.message("", 0);
    play("run_bell", { gain: 1, pitch: req.kind === "level" ? 1 : 1.12 });
    return true;
  }
  // wield: take it in hand at once (not when the house chose it for a player busy shooting)
  function takeWeapon(id, announce = true, wield = true) {
    if (!loadout.give(id)) return false;
    // a new kind of ammunition comes with a first helping of it
    const a = ARMS[id];
    if (a.ammo) loadout.add(a.ammo, AMMO[a.ammo].pack);
    if (announce)
      hud.toast(L10N.t("run.toast.newWeapon", { w: wname(id) }), "gold");
    if (wield) loadout.wield(id);
    return true;
  }
  function choose(i) {
    const pk = S.picking;
    if (!pk || pk.guard > 0 || !pk.cards[i]) return;
    const c = pk.cards[i];
    if (c.kind === "spice") addSpice(c.id);
    else if (c.kind === "heal") G.player.heal(999);
    else if (c.kind === "ammo") loadout.refill();
    else if (c.kind === "weapon") takeWeapon(c.id, pk.kind !== "start");
    else if (c.kind === "branch") {
      loadout.setBranch(c.id, c.branch);
      hud.toast(
        L10N.t("run.toast.fork", { w: wname(c.id), b: L10N.t(c.nameKey) }),
        "gold",
      );
    }
    S.picking = null;
    if (pk.kind === "level") S.pending = Math.max(0, S.pending - 1);
    S.pickHold = RUN.pick.hold;
    S.pickGap = RUN.pick.gap;
    hud.closeCards(i);
    // back to aiming: take the mouse again (a click or key press just now allows it)
    const I = G.input;
    if (
      I &&
      I.requestLock &&
      I.mode === "lock" &&
      !I.touch &&
      I.device !== "pad"
    )
      I.requestLock();
    play("run_pick", { gain: 1 });
    G.events.emit("run:pick", { card: c, offered: pk.cards });
  }
  function pickTick(real) {
    S.pickHold = Math.max(0, S.pickHold - real);
    const pk = S.picking;
    if (!pk) {
      S.pickGap = Math.max(0, S.pickGap - real);
      if (S.pickGap > 0 || !G.player.alive) return;
      // the start pick waits for the armoury: its weapons are on those tickets
      if (S.queue.length && S.queue[0].kind === "start" && !loadout.armory)
        return;
      while (S.queue.length) if (openPick(S.queue.shift())) return;
      if (S.pending > 0) openPick({ kind: "level" });
      return;
    }
    pk.guard -= real;
    const I = G.input;
    // let the mouse go so a ticket can be clicked (again after a pause hands it back)
    if (I && I.locked && I.exitLock) I.exitLock();
    if (pk.guard <= 0 && I && I.pressed) {
      const pad = I.device === "pad";
      if (I.pressed("weapon1")) return choose(0);
      if (pad ? I.pressed("swap") : I.pressed("weapon2")) return choose(1);
      if (pad ? I.pressed("weapon2") : I.pressed("weapon3")) return choose(2);
    }
  }
  // ---------- weapon keys and the wheel
  // 1-9: the weapons in the order they were picked up; mouse wheel (pad: d-pad left / right):
  // the previous or next one; the swap key (Q, pad Y, touch swap button): a tap goes back to
  // the last weapon (touch: on to the next), holding it opens the wheel.
  const wheel = createWheel({ root: hud.root, L10N });
  // pending: a press of the swap key that is still a tap (not held long enough for the wheel)
  const WK = { down: false, t: 0, pending: false, frame: -1, noFire: false };
  const how = (I) => (I.touch ? "touch" : I.device === "pad" ? "pad" : "keys");
  function wheelItems() {
    const cur = loadout.cur;
    return loadout.owned().map((id, i) => {
      const ammo = ARMS[id].ammo;
      return {
        id,
        n: i + 1,
        name: wname(id),
        short: L10N.t("weapon." + id + ".s"),
        level: loadout.item(id).level,
        ammo,
        have: ammo ? Math.floor(loadout.have(ammo)) : 0,
        ok: loadout.usable(id),
        cur: id === cur,
      };
    });
  }
  // i: the weapon to take; -1 keeps the one in hand
  function closeWheel(i = -1) {
    if (!wheel.open) return;
    const w = i >= 0 ? wheel.items[i] : null;
    wheel.hide();
    if (w && w.id !== loadout.cur) loadout.wield(w.id);
  }
  // a tap beside the ring (on the veil) puts it away
  hud.root.addEventListener("click", (ev) => {
    if (wheel.open && ev.target.classList.contains("rl-veil")) closeWheel();
  });
  function keysTick(real) {
    const I = G.input;
    if (!I || !I.pressed) return;
    const down = !!(I.down && I.down("swap"));
    // a quick tap can start and end between two frames: the latched press still counts
    // (the mouse wheel latches "swap" too, together with next / prev: that is not a tap)
    const latched =
      I.pressed("swap") && !I.pressed("next") && !I.pressed("prev");
    const began = (down && !WK.down) || latched;
    WK.down = down;
    if (began) {
      WK.t = 0;
      WK.pending = true; // a tap until it is held long enough for the wheel
    }
    if (down) WK.t += real;
    // tickets, death or a pause (the run's frames stopped) put the wheel away
    const gap = G.time.frame - WK.frame > 1;
    WK.frame = G.time.frame;
    if (S.picking || S.pickHold > 0 || S.hands || !G.player.alive) {
      closeWheel();
      WK.pending = false; // the press that was going on does not count as a tap
      return;
    }
    if (wheel.open) {
      if (gap) return closeWheel();
      const pad = I.device === "pad";
      // the mouse or right stick point at a weapon; the look input is spent on that
      const L = I.look;
      if (L && !I.touch) {
        const k = 1 / (0.0021 * (I.sensitivity || 1));
        wheel.push(L.dx * k, L.dy * k * (I.invertY ? -1 : 1));
      }
      if (I.pressed("next") || (pad && I.pressed("weapon2"))) wheel.step(1);
      if (I.pressed("prev") || (pad && I.pressed("weapon1"))) wheel.step(-1);
      if (!pad)
        for (let n = 1; n <= 9; n++)
          if (I.pressed("weapon" + n)) return closeWheel(n - 1);
      const sel = wheel.chosen ? wheel.items.indexOf(wheel.chosen) : -1;
      if (I.fire) {
        WK.noFire = true; // the click that chose must not also fire
        return closeWheel(sel);
      }
      // keys and pad: letting go takes what is pointed at (touch waits for a tap)
      if (!I.touch && !down) closeWheel(sel);
      return;
    }
    if (
      down &&
      WK.pending &&
      WK.t >= (I.touch ? RUN.wheel.touchHold : RUN.wheel.hold)
    ) {
      WK.pending = false;
      if (loadout.owned().length > 1)
        wheel.show(wheelItems(), how(I), (i) => closeWheel(i));
      return;
    }
    if (loadout.busy) return;
    if (!down && WK.pending) {
      WK.pending = false;
      if (I.touch) loadout.step(1);
      else loadout.swapLast();
      return;
    }
    if (I.pressed("next")) return void loadout.step(1);
    if (I.pressed("prev")) return void loadout.step(-1);
    if (I.device === "pad") {
      if (I.pressed("weapon1")) loadout.step(-1);
      else if (I.pressed("weapon2")) loadout.step(1);
      return;
    }
    for (let n = 1; n <= 9; n++)
      if (I.pressed("weapon" + n)) return void loadout.slot(n);
  }

  // ---------- ammunition in the street
  function dropPack(pos, kind, spread = false) {
    tmp.copy(pos);
    if (spread) {
      tmp.x += (rng() - 0.5) * 1.6;
      tmp.z += (rng() - 0.5) * 1.6;
    }
    pickups.addPack(tmp, {
      kind,
      amount: AMMO[kind].pack,
      life: RUN.ammo.packLife,
    });
  }
  function dropFood(pos) {
    tmp.copy(pos);
    tmp.x += (rng() - 0.5) * 1.4;
    tmp.z += (rng() - 0.5) * 1.4;
    pickups.addPack(tmp, {
      kind: "food",
      amount: RUN.heal.food,
      life: RUN.heal.life,
    });
  }
  // an even roll over the four kinds; a full pool means that roll comes to nothing
  function rollKind() {
    const A = RUN.ammo;
    const need = loadout.curAmmo;
    const w = packWeights(
      AMMO_TYPES,
      need,
      !!need && loadout.have(need) < loadout.cap(need) * A.lowAt,
    );
    let roll = rng() * w.reduce((a, b) => a + b, 0);
    let k = 0;
    while (k < w.length - 1 && (roll -= w[k]) > 0) k++;
    const kind = AMMO_TYPES[k];
    return loadout.room(kind) >= AMMO[kind].pack * 0.25 ? kind : null;
  }
  function dropEnvelope(pos) {
    pickups.addEnvelope(pos);
    hooks.refreshMarkers();
  }
  function chooseCaches() {
    const want = RUN.ammo.caches * AMMO_TYPES.length;
    const chosen = pickN(sites, Math.min(want, sites.length));
    // deal the kinds round so every kind gets its share, then shuffle who holds what
    const kinds = pickN(
      chosen.map((_, i) => AMMO_TYPES[i % AMMO_TYPES.length]),
      chosen.length,
    );
    S.caches = chosen.map((site, i) => ({
      site,
      kind: kinds[i],
      stocked: true,
      timer: 0,
      known: false,
    }));
    pickups.setLamps(S.caches);
  }
  function placeCases() {
    const C = RUN.cases;
    const P = G.player.pos;
    // where the dead rise, on the ground and somewhere a person can walk to (the docks also
    // list points in the air, some of them over the water)
    const nav = G.physics && G.physics.nav;
    const spots = pickN(
      ((G.level && G.level.enemySpawns) || [])
        .filter((s) => {
          if (s.type && s.type !== "ground") return false;
          try {
            return !nav || !nav.isWalkable || nav.isWalkable(s.pos.x, s.pos.z);
          } catch {
            return true;
          }
        })
        .map((s) => s.pos),
      999,
    );
    const used = [];
    for (const p of spots) {
      if (used.length >= C.count) break;
      if (Math.hypot(p.x - P.x, p.z - P.z) < 12) continue;
      if (used.some((u) => u.distanceTo(p) < C.apart)) continue;
      if (S.caches.some((c) => c.site.pos.distanceTo(p) < 3)) continue;
      used.push(p);
      tmp.copy(p);
      try {
        tmp.y = G.physics.groundHeight(p.x, p.z, 2) || 0;
      } catch {}
      pickups.addCase(tmp);
    }
  }
  // A red envelope raises the weapon in hand; once that one is at the cap it goes to
  // another carried weapon, and once all are, to a random seasoning plus a full heal.
  function openEnvelope() {
    play("run_envelope", { gain: 1 });
    const id = loadout.nextToRaise();
    const up = id ? loadout.upgrade(id) : null;
    if (up) {
      hud.toast(
        L10N.t("run.toast.weapon", { w: wname(up.id), n: up.level }),
        "gold",
      );
      if (up.fork) S.queue.push({ kind: "fork", id: up.id });
      return;
    }
    const open = RUN.spices.filter((s) => (S.spice[s.id] || 0) < RUN.spiceMax);
    G.player.heal(999);
    if (open.length) {
      const s = open[Math.floor(rng() * open.length)];
      addSpice(s.id);
      hud.toast(
        L10N.t("run.toast.spice", { s: L10N.t("run.spice." + s.id) }),
        "gold",
      );
    } else hud.toast(L10N.t("run.toast.heal"), "gold");
  }
  function openCase() {
    const ids = available();
    play("run_case", { gain: 1 });
    if (ids.length) {
      const id = ids[Math.floor(rng() * ids.length)];
      takeWeapon(id, false);
      hud.toast(L10N.t("run.toast.case", { w: wname(id) }), "gold");
      return;
    }
    // nothing left to find: the case holds an envelope's worth instead
    openEnvelope();
  }
  function pickupTick(dt) {
    const A = RUN.ammo;
    const P = G.player;
    const reach = A.reach + 0.6 * (S.spice.takeout || 0);
    for (let i = pickups.packs.length - 1; i >= 0; i--) {
      const p = pickups.packs[i];
      if (p.age > p.life) {
        pickups.removePack(p);
        continue;
      }
      const food = p.kind === "food";
      if (
        (food ? P.health >= P.maxHealth : loadout.room(p.kind) < 1) ||
        Math.abs(P.pos.y - p.pos.y) > 2.2
      )
        continue;
      const dx = P.pos.x - p.pos.x;
      const dz = P.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < reach && food) {
        const got = Math.min(p.amount, P.maxHealth - P.health);
        P.heal(p.amount);
        pickups.removePack(p);
        hud.toast(L10N.t("run.toast.food", { n: Math.round(got) }), "gold");
        play("run_food", { gain: 1 });
      } else if (d < reach) {
        const got = loadout.add(p.kind, p.amount);
        pickups.removePack(p);
        if (got > 0) {
          hud.ammoToast(p.kind, got);
          play("run_ammo", { gain: 0.9 });
        }
      } else if (d < reach + A.pull) {
        const step = Math.min(d, 7 * dt);
        p.pos.x += (dx / d) * step;
        p.pos.z += (dz / d) * step;
      }
    }
    let marks = false;
    for (let i = pickups.envelopes.length - 1; i >= 0; i--) {
      const e = pickups.envelopes[i];
      if (
        Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z) < 1.5 &&
        Math.abs(P.pos.y - e.pos.y) < 2.2
      ) {
        pickups.removeEnvelope(e);
        openEnvelope();
        marks = true;
      }
    }
    S.spotT -= dt;
    const look = S.spotT <= 0;
    if (look) S.spotT = 0.3;
    for (let i = pickups.cases.length - 1; i >= 0; i--) {
      const c = pickups.cases[i];
      const d = Math.hypot(P.pos.x - c.pos.x, P.pos.z - c.pos.z);
      if (d < RUN.cases.reach && Math.abs(P.pos.y - c.pos.y) < 2.2) {
        pickups.removeCase(c);
        openCase();
        marks = true;
      } else if (look && !c.seen && d < RUN.cases.spot) {
        c.seen = true;
        marks = true;
      }
    }
    // supply crates
    let lamps = false;
    S.caches.forEach((c, i) => {
      const lamp = pickups.lamps[i];
      if (!c.stocked) {
        c.timer -= dt;
        if (c.timer <= 0) {
          c.stocked = true;
          if (lamp) lamp.stocked = true;
          lamps = true;
        }
      }
      const d = Math.hypot(P.pos.x - c.site.pos.x, P.pos.z - c.site.pos.z);
      // marked on screen only from close by: from further off its lamp shows the way
      if (look && c.near !== d < A.cacheMark) {
        c.near = d < A.cacheMark;
        marks = marks || c.known;
      }
      if (look && !c.known && d < A.cacheSpot) {
        tmp.copy(c.site.pos);
        tmp.y = c.site.top + 0.4;
        let seen = d < 4;
        try {
          seen = seen || G.physics.lineOfSight(P.eye, tmp);
        } catch {}
        if (seen) {
          c.known = true;
          marks = true;
        }
      }
      if (
        c.stocked &&
        d < A.cacheReach &&
        loadout.room(c.kind) >= loadout.cap(c.kind) * 0.1
      ) {
        const got = loadout.add(c.kind, loadout.cap(c.kind) * A.cacheGive);
        c.stocked = false;
        c.known = true;
        c.timer = A.cacheEvery;
        if (lamp) lamp.stocked = false;
        lamps = true;
        hud.ammoToast(c.kind, got, "cache");
        play("run_ammo", { gain: 1, pitch: 0.86 });
        play("gear_rustle", { gain: 0.9 });
      }
    });
    if (lamps) pickups.refreshLamps();
    if (lamps || marks) hooks.refreshMarkers();
  }
  function lowTick(real) {
    S.lowHintT = Math.max(0, S.lowHintT - real);
    const type = loadout.curAmmo;
    if (!type || S.lowHintT > 0) return;
    if (loadout.have(type) < loadout.cap(type) * 0.12) {
      S.lowHintT = 25;
      hud.ammoToast(type, loadout.have(type), "low");
    }
  }

  // ---------- kills
  function burstAt(pos, depth) {
    S.bursts.push({ pos: pos.clone(), t: RUN.burst.delay, depth });
  }
  function burstTick(dt) {
    if (!S.bursts.length) return;
    const B = RUN.burst;
    let done = 0;
    for (let i = 0; i < S.bursts.length && done < B.perFrame; i++) {
      const b = S.bursts[i];
      b.t -= dt;
      if (b.t > 0) continue;
      S.bursts.splice(i--, 1);
      done++;
      b.pos.y += 0.6;
      try {
        if (G.fx && G.fx.explosion) G.fx.explosion(b.pos, 0.55);
      } catch {}
      const dmg = B.damage * (1 + spiceValue("fire", S.spice.fire));
      S.burstDepth = b.depth + 1;
      for (const z of G.enemies.list) {
        if (!z.alive) continue;
        const d = Math.hypot(z.pos.x - b.pos.x, z.pos.z - b.pos.z);
        if (d >= B.radius) continue;
        tmp.set(z.pos.x - b.pos.x, 0, z.pos.z - b.pos.z);
        if (tmp.lengthSq() < 1e-4) tmp.set(0, 0, 1);
        tmp.normalize();
        z.damage(dmg * (1 - (d / B.radius) * 0.6), z.pos, tmp, "body");
      }
      S.burstDepth = 0;
    }
  }
  function onKill(e) {
    if (!S.active || !e) return;
    S.kills++;
    const rank = e.rank || "";
    addXp(killXp(rank, e.type, dishHot(S.cook)));
    const pos = e.pos || (e.enemy && e.enemy.pos);
    if (!pos) return;
    const A = RUN.ammo;
    const boost = 1 + spiceValue("takeout", S.spice.takeout);
    if (rank === "elite") {
      S.elites = S.elites.filter((z) => z !== e.enemy);
      dropEnvelope(pos);
      for (let i = 0; i < RUN.elite.packs; i++) {
        const k = rollKind();
        if (k) dropPack(pos, k, true);
      }
      hud.toast(L10N.t("run.toast.elite"), "gold");
    } else if (rank === "boss") {
      S.bossDead = true;
      S.boss = null;
      S.extractOpen = true;
      dropEnvelope(pos);
      for (const k of AMMO_TYPES) dropPack(pos, k, true);
      hooks.radio(L10N.t("radio.bossDown"), 4.2);
      play("complete", { gain: 0.6 });
      hooks.refreshObjective();
      hooks.refreshMarkers();
    } else if (rank === "bloater") {
      // it goes off: everything near it is hurt, the player included
      const B = RUN.bloater;
      tmp.copy(pos);
      tmp.y += 0.7;
      const at = tmp.clone();
      try {
        if (G.fx && G.fx.explosion) G.fx.explosion(at, 0.9);
        // (combat.explode would give the player half of what the dead take)
        const P = G.player;
        const was = P.invulnerable;
        P.invulnerable = true;
        try {
          G.combat.explode(at, B.radius, B.damage, "player");
        } finally {
          P.invulnerable = was;
        }
        if (P.alive) {
          const eye = at.clone().set(P.pos.x, P.pos.y + 1, P.pos.z);
          const d = eye.distanceTo(at);
          if (d < B.radius && G.physics.lineOfSight(at, eye))
            P.damage(B.hurt * (1 - d / B.radius), at);
        }
      } catch {}
    } else if (e.type === "brute") {
      if (rng() < A.bruteDrop * boost) {
        const k = rng() < A.bruteBullets ? "bullets" : rollKind();
        if (k && loadout.room(k) >= 1) dropPack(pos, k);
      }
    } else if (e.enemy && e.enemy.kind === "cop" && rng() < A.copDrop * boost) {
      if (loadout.room("heavy") >= 1) dropPack(pos, "heavy");
    } else if (rng() < A.drop * boost) {
      const k = rollKind();
      if (k) dropPack(pos, k);
    }
    // something to eat: more often for the badly hurt, always from an elite
    if (rank === "elite")
      for (let i = 0; i < RUN.heal.elite; i++) dropFood(pos);
    else if (
      rank !== "boss" &&
      rank !== "bloater" &&
      rng() < foodChance(e.type, G.player.health / G.player.maxHealth, boost)
    )
      dropFood(pos);
    const lv = S.spice.burst || 0;
    const depth = S.burstDepth || 0;
    if (lv && rank !== "boss" && depth < 4 && rng() < spiceValue("burst", lv))
      burstAt(pos, depth);
  }
  G.events.on("enemy:killed", onKill);
  // The four elemental seasonings: hits by any weapon in hand leave their status. The rule
  // is in the status rules (arsenal/src/combat/status.js). The arsenal's weapons report their
  // hits to it themselves; the carbine's and the sidearm's are passed on from here.
  G.events.on("player:hitEnemy", (e) => {
    if (!S.active || !e || !e.enemy || e.armory || e.spread || e.killed) return;
    const targets = loadout.armory && loadout.armory.targets;
    if (targets) targets.struck(targets.of(e.enemy), { head: !!e.weak });
  });
  G.events.on("player:dead", () => {
    if (!S.active) return;
    if (S.picking) {
      S.picking = null;
      hud.closeCards(-1);
    }
    S.pending = 0;
    S.queue.length = 0;
    G.time.scale = S.scale = 1;
    freeHands();
    loadout.rest();
    bank(false);
  });

  // ---------- surface used by game.js
  const api = {
    tune: RUN,
    state: S,
    hud,
    pickups,
    loadout,
    profile,
    get armory() {
      return loadout.armory;
    },
    get active() {
      return S.active;
    },
    // true while tickets are up (and a beat after), so number keys do not also swap weapons
    get picking() {
      return !!S.picking || S.pickHold > 0;
    },
    get extractOpen() {
      return S.extractOpen;
    },
    // a dish is on a stove: the next stove cannot be lit until it is packed
    get cooking() {
      return !!S.cook;
    },
    stovePrompt,
    // the firing range's panel is worked with the mouse: letting it go there is not a pause
    get mouseFree() {
      return !!range;
    },
    // difficulty just rewrote the player's tuning: remember the clean values, reapply ours
    onTuning() {
      const t = G.player && G.player.tuning;
      if (t)
        baseTune = {
          walk: t.walk,
          sprint: t.sprint,
          crouch: t.crouch,
          ads: t.ads,
          regenRate: t.regenRate,
        };
      if (S.active) applyStats();
    },
    reset() {
      const pre = preset();
      unplate();
      G.input.setSecondary(false);
      Object.assign(S, {
        active: true,
        range: !!range,
        t: 0,
        level: 0,
        xp: 0,
        kills: 0,
        sirens: 0,
        spice: pre.spice,
        spawnT: 1.2,
        eliteAt: RUN.elite.first,
        eliteN: 0,
        eliteIdle: 0,
        elites: [],
        boss: null,
        bossSeen: false,
        bossDead: false,
        bossRetry: 0,
        clock: 0,
        cook: null,
        hands: "",
        stoves: 0, // lit so far
        served: 0,
        bossDue: -1,
        menu: pickN(RUN.dishes, RUN.dishes.length), // dealt afresh every run
        bonusHealth: 0, // from the soup special
        bonusCap: 0, // from the stock special
        extractOpen: false,
        pending: 0,
        queue: pre.weapon || range ? [] : [{ kind: "start" }],
        picking: null,
        pickHold: 0,
        pickGap: 0.4,
        bursts: [],
        burstDepth: 0,
        lowHintT: 10,
        scale: 1,
        unlocked: [],
      });
      G.time.scale = 1;
      wheel.hide();
      WK.noFire = false;
      pickups.reset();
      hud.reset();
      loadout.reset();
      applyStats();
      chooseCaches();
      placeCases();
      fetchBodies();
      // (the firing range starts empty: its panel puts the dead where they are wanted)
      if (!range) scatterWanderers(RUN.opening);
      hud.show(true);
      hud.setRunLayout(true);
      hud.setSpices(spiceList());
      hud.setXp(0, 1);
      hud.setCourse(range ? "" : "starter");
      hud.setBags(range ? -1 : 0, stoveCount());
      if (pre.weapon)
        api.debug.set(pre.weapon.id, pre.weapon.level, pre.weapon.branch);
      if (range) range.begin();
    },
    // back to the title or into the other mode: undo everything we changed
    stop() {
      wheel.hide();
      G.input.setSecondary(false);
      if (range) range.end();
      hud.setRunLayout(false);
      hud.setNoMag(false);
      if (!S.active && S.scale === 1) {
        hud.show(false);
        return;
      }
      S.active = false;
      unplate();
      S.cook = null;
      S.hands = "";
      S.bonusHealth = S.bonusCap = 0;
      hud.setCook(null);
      S.picking = null;
      S.pending = 0;
      S.queue.length = 0;
      S.spice = {};
      S.extractOpen = false;
      G.time.scale = S.scale = 1;
      applyStats();
      loadout.stop();
      pickups.reset();
      hud.reset();
      hud.show(false);
    },
    // reached the truck: let the street run at full speed behind the receipt
    finish() {
      closeWheel();
      freeHands();
      S.cook = null;
      hud.setCook(null);
      if (S.picking) hud.closeCards(-1);
      S.picking = null;
      S.pending = 0;
      S.queue.length = 0;
      G.time.scale = S.scale = 1;
      loadout.rest();
      if (S.active) bank(true);
    },
    // dt: world seconds (slowed while choosing), real: wall-clock seconds
    update(dt, real) {
      if (!S.active) return;
      hud.update(real);
      pickTick(real);
      keysTick(real);
      // while tickets are up the player only chooses: no walking, firing, aiming or turning
      // (the free mouse is for the tickets). The input is read before the player updates.
      if (S.picking && G.input) {
        const I = G.input;
        if (I.move) I.move.x = I.move.y = 0;
        if (I.look) I.look.dx = I.look.dy = 0;
        I.fire = I.ads = I.sprint = I.crouch = false;
      }
      // the wheel: walking goes on (not on touch screens, where it covers the stick), but
      // the mouse points at weapons instead of turning, and nothing fires
      if (wheel.open && G.input) {
        const I = G.input;
        if (I.look) I.look.dx = I.look.dy = 0;
        if (I.touch && I.move) I.move.x = I.move.y = 0;
        I.fire = I.ads = false;
      }
      if (WK.noFire && G.input) {
        if (G.input.fire) G.input.fire = false;
        else WK.noFire = false;
      }
      // hands full of the wok or the packing: walking, but no running and nothing to fire
      if (S.hands && G.input) {
        const I = G.input;
        I.fire = I.ads = I.sprint = false;
      }
      const target = S.picking
        ? S.picking.slow
        : wheel.open
          ? RUN.wheel.slow
          : 1;
      S.scale += (target - S.scale) * Math.min(1, real * 14);
      if (Math.abs(S.scale - target) < 0.01) S.scale = target;
      G.time.scale = S.scale;

      // (the docks have no updaters of their own: their stoves burn on this clock)
      const stoves = G.level && G.level.stoves;
      if (stoves) for (const st of stoves) st.update(dt);
      if (range) {
        // no timeline on the firing range: the panel decides who is on the street
        range.update(dt, real);
      } else {
        S.t += dt;
        S.clock = clockStep(S.clock, dt, {
          lit: S.stoves,
          served: S.served,
          cooking: dishHot(S.cook),
        });
        cookTick(dt);
        spawnTick(dt);
        eliteTick();
        bossTick(dt);
      }
      burstTick(dt);
      pickups.update(dt);
      pickupTick(dt);
      loadout.update();
      lowTick(real);

      hud.setCourse(
        S.bossSeen || (range && !range.course) ? "" : stageAt(S.clock).id,
      );
      hud.setBags(range || S.bossDead ? -1 : S.served, stoveCount());
      hud.setXp(S.xp / RUN.xp.need(S.level), S.level + 1);
      const cur = loadout.cur;
      const it = loadout.item(cur);
      hud.setWeaponLevel(it ? it.level : 1, MAX_LEVEL);
      // blades and other things without a magazine show no round count
      const arm = loadout.armory;
      G.input.setSecondary(!!arm && !arm.holding && arm.hasSecondary);
      hud.setNoMag(!!arm && (arm.holding || (arm.held && !arm.mag)));
      hud.setWeapons(
        loadout.owned().map((id) => ({
          id,
          ammo: ARMS[id].ammo,
          level: loadout.item(id).level,
          cur: id === cur,
          ok: loadout.usable(id),
        })),
        (id) => loadout.wield(id),
      );
      hud.setPools(
        AMMO_TYPES.map((t) => ({
          type: t,
          have: Math.floor(loadout.have(t)),
          cap: loadout.cap(t),
          cur: t === loadout.curAmmo,
        })),
      );
      hud.setBoss(
        S.boss && S.boss.alive
          ? { key: "run.boss.name", frac: S.boss.hp / S.boss.maxHp }
          : null,
      );
    },
    // a stove was lit (the game's objective code calls this): the dish goes on, and the
    // wok comes straight up for its first toss
    onStove(relay) {
      // (nothing cooks on the firing range: it has no timeline for a dish to run on)
      if (!S.active || range || !relay || !relay.o || S.cook) return;
      S.cook = {
        ...newDish(S.stoves),
        o: relay.o,
        pos: relay.o.pos,
        mark: "",
        can: false,
        beat: 0,
      };
      S.stoves++;
      S.eliteIdle = 0;
      S.spawnT = 0;
      setStove(relay.o, "toss");
      if (G.player.alive) fillHands("wok");
      smell(S.cook);
    },
    /** What the objective line says now. */
    objective() {
      if (S.bossDead) return L10N.t("obj.extract");
      if (S.bossSeen) return L10N.t("run.obj.boss");
      const left = stoveCount() - S.served;
      if (left <= 0) return L10N.t("run.obj.bossDue");
      // (what to do with the dish that is on is said under the course name; how many are
      // packed, by the bags beside it)
      return L10N.t(S.cook ? "run.obj.dish" : "run.obj.light");
    },
    // extra compass and world markers; pos objects are live, so elites are tracked as they move
    markers() {
      const out = [];
      pickups.envelopes.forEach((e, i) =>
        out.push({
          id: "env" + i,
          short: L10N.t("run.mark.envelope"),
          pos: e.pos,
          kind: "loot",
        }),
      );
      pickups.cases.forEach((c, i) => {
        if (c.seen)
          out.push({
            id: "case" + i,
            short: L10N.t("run.mark.case"),
            pos: c.pos,
            kind: "loot",
          });
      });
      S.caches.forEach((c, i) => {
        if (c.known && c.near)
          out.push({
            id: "cache" + i,
            short: L10N.t("run.ammo." + c.kind),
            icon: "ammo-" + c.kind,
            pos: c.site.pos,
            kind: "cache a-" + c.kind + (c.stocked ? "" : " empty"),
          });
      });
      for (const z of S.elites)
        if (z.alive)
          out.push({
            id: "elite" + z.id,
            short: L10N.t("run.mark.elite"),
            pos: z.pos,
            kind: "elite",
          });
      // the stove with the dish on it: how long it has, or what it wants (cookTick words it)
      const c = S.cook;
      if (c && c.mark)
        out.push({
          id: "wok",
          short: c.mark,
          pos: c.pos,
          kind: "relay",
        });
      if (S.boss && S.boss.alive)
        out.push({
          id: "boss",
          short: L10N.t("run.mark.boss"),
          pos: S.boss.pos,
          kind: "elite",
        });
      return out;
    },
    intensity(alive) {
      return S.bossSeen || dishHot(S.cook) || S.served >= stoveCount()
        ? 1
        : alive > 0
          ? 0.6
          : 0.15;
    },
    /** For the receipts: numbers of the run and the names of weapons it unlocked. */
    placeOpen,
    summary() {
      return {
        kills: S.kills,
        level: S.level + 1,
        sirens: S.sirens,
        dishes: S.served,
        weapons: loadout.owned().length,
        unlocked: [
          ...(S.newPlace ? [L10N.t("stage.docks.open")] : []),
          ...S.unlocked.map(wname),
        ],
      };
    },
    // test helpers (window.__G.run.debug)
    debug: {
      addXp,
      // t: the meal's clock. At or past RUN.bossAt it also counts every dish as packed, so
      // the boss comes at once.
      setTime(t) {
        S.clock = t;
        S.eliteAt = Math.max(S.eliteAt, S.t + 5);
        if (t >= RUN.bossAt && S.bossDue < 0) {
          if (S.cook) setStove(S.cook.o, "served");
          unplate();
          S.cook = null;
          freeHands();
          hud.setCook(null);
          S.served = stoveCount();
          S.bossDue = S.t;
        }
      },
      // the dish on the stove, moved on to the end of what it is doing now (a toss made, a
      // fry done, a wait run out so that it catches or chars, the packing done)
      skipDish() {
        const c = S.cook;
        if (!c) return null;
        const K = RUN.stove;
        if (c.phase === "toss") c.t = Math.max(c.t, K.toss.seconds - 0.02);
        else if (c.phase === "fry") c.t = K.fry[c.k] - 0.02;
        else if (c.phase === "due" || c.phase === "ready")
          c.wait = (c.caught ? K.burn + K.char : K.burn) - 0.02;
        else if (c.phase === "pack") c.t = K.pack - 0.02;
        return c.phase;
      },
      flare,
      get wokReady() {
        return !!wokHands;
      },
      // the cook's hands (wokhand.js), for measuring grips
      get wokHands() {
        return wokHands;
      },
      envelope() {
        dropEnvelope(G.player.pos.clone().add(new V3(0, 0, -2.5)));
      },
      pack(kind = "bullets") {
        dropPack(G.player.pos.clone().add(new V3(1.5, 0, -2.5)), kind);
      },
      give: (id) => takeWeapon(id),
      food() {
        dropFood(G.player.pos.clone().add(new V3(0, 0, -2.5)));
      },
      // one of a part, set down at pos and standing still: "bloater", "pack", "boss", or
      // "elite" with n (which elite it would be: even ones are the usual kind, odd hunters)
      bring(part, pos, n = 0) {
        const o =
          part === "boss"
            ? bossOpts()
            : part === "elite"
              ? eliteOpts(n)
              : part === "bloater"
                ? bloaterOpts()
                : packOpts();
        const type = part === "boss" || part === "elite" ? "brute" : "walker";
        return spawnAt(type, pos, { ...o, state: "patrol", passive: true });
      },
      // put a weapon at a given level and form straight into the hands
      async set(id, level = 1, branch = "a") {
        // (not taken in hand yet: it has to come up at the level and in the form set below)
        takeWeapon(id, false, false);
        const it = loadout.item(id);
        if (!it) return false;
        it.level = Math.max(1, Math.min(MAX_LEVEL, level));
        it.branch = it.level >= 3 && !ARMS[id].own ? branch : "base";
        it.rounds = undefined;
        await loadout.wield(id);
        const a = loadout.armory;
        if (a && a.current === id) a.regrade(it.level, it.branch);
        applyStats();
        return true;
      },
      wield: (id) => loadout.wield(id),
      choose,
      openEnvelope,
      stageAt,
      unlocked,
    },
  };
  if (G.params && G.params.range)
    range = api.range = createRange(G, {
      S,
      hud,
      loadout,
      hooks,
      spawnOne,
      spawnTick,
      bloaterOpts,
      eliteOpts,
      bossOpts,
      set: api.debug.set,
      setSpice,
      // the shared numbers were edited: work the weapons' out again
      retune(levels) {
        applyStats();
        const a = loadout.armory;
        const it = loadout.item(loadout.cur);
        if (levels && a && it && a.current === it.id)
          a.regrade(it.level, it.branch);
      },
    });
  L10N.onLocale(() => {
    // (the mark on the stove is worded here: have it worded again)
    if (S.cook) S.cook.mark = null;
    if (S.active) hooks.refreshMarkers();
  });
  return api;
}
