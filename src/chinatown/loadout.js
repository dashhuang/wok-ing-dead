// What the player carries in a run: any number of weapons, four pools of ammunition, and the
// rules for switching between them.
//
// Two kinds of weapon live here side by side. The carbine and the sidearm are the game's own
// rigs (src/game.js); the other twelve come from arsenal/ through armory.js. This module hides
// the difference from the rest of the run: wield(id) takes any of them in hand, the pools
// feed whichever needs them, and the HUD always reads the weapon that is up.
//
// Ammunition: every weapon that needs any draws on one of four shared pools, at so many
// units per round. A player who leans on one weapon uses a quarter of what the street gives;
// one who carries something for every pool wastes nothing.
//
// AMMO and ARMS are plain data and ammoPer() a plain function: the weapon lab (arsenal/) reads
// them too, so what a round costs on its firing range is what it costs in a run. What a level
// multiplies damage by is the arsenal's own table (LEVELS), the one the lab shows.
import { LEVELS } from "../../arsenal/src/data/levels.js";

export const AMMO = {
  // cap: units carried (the "portion" seasoning raises it), pack: units in one dropped pack
  bullets: { cap: 240, pack: 45, start: 90 },
  heavy: { cap: 60, pack: 12, start: 18 },
  fuel: { cap: 300, pack: 60, start: 90 },
  parts: { cap: 300, pack: 60, start: 90 },
};
export const AMMO_TYPES = Object.keys(AMMO);

// ammo: pool it draws on (null = needs none), per: pool units per round (a form may differ),
// own: one of the game's own rigs
export const ARMS = {
  rifle: { ammo: "bullets", per: 1, own: true },
  smg: { ammo: "bullets", per: 0.75 },
  shotgun: { ammo: "heavy", per: 1 },
  revolver: { ammo: "heavy", per: 1 },
  lever: { ammo: "heavy", per: 1 },
  flamer: { ammo: "fuel", per: 0.5 },
  firework: { ammo: "fuel", per: { base: 12, a: 4, b: 20 } },
  nailgun: { ammo: "parts", per: 1.5 },
  crossbow: { ammo: "parts", per: 4 },
  arc: { ammo: "parts", per: 1 },
  pistol: { ammo: null, own: true },
  talisman: { ammo: null },
  coinsword: { ammo: null },
  guandao: { ammo: null },
};
export const MAX_LEVEL = LEVELS.length;

/** Pool units one round of a weapon costs in a given form (0 for weapons that need none). */
export function ammoPer(id, branch = "base", level = 1) {
  const a = ARMS[id];
  if (!a || !a.ammo) return 0;
  if (typeof a.per === "number") return a.per;
  return a.per[level >= 3 ? branch : "base"] ?? a.per.base;
}

export function createLoadout(G, on = {}) {
  let armory = null;
  let ready = null; // promise of the armoury
  let active = false;
  const inv = new Map(); // id -> { id, level, branch, rounds }
  const order = []; // ids in the order they were picked up
  const pool = { heavy: 0, fuel: 0, parts: 0 };
  let capMul = 1;
  let cur = "pistol";
  let last = null;
  let busy = false; // a weapon is on its way into the hands
  let mods = { damage: 1, rate: 1, reload: 1 };
  let infusions = [];
  const baseDef = {};
  for (const [id, rig] of Object.entries((G.weapon && G.weapon.rigs) || {}))
    baseDef[id] = { damage: rig.def.damage, rpm: rig.def.rpm };

  const rifleSlot = () => G.weapon.slots[0];
  const perOf = (id) => {
    const it = inv.get(id);
    return ammoPer(id, it ? it.branch : "base", it ? it.level : 1);
  };
  const cap = (type) => Math.round(AMMO[type].cap * capMul);
  // the carbine's own reload takes rounds out of its slot, so that slot is the bullets pool
  const have = (type) =>
    type === "bullets" ? rifleSlot().reserve : pool[type] || 0;
  const setPool = (type, v) => {
    v = Math.max(0, Math.min(cap(type), v));
    if (type === "bullets") rifleSlot().reserve = Math.round(v);
    else pool[type] = v;
  };

  // ---------- the armoury's view of things
  // The game brings its own rig and arms back up by itself at times (a run starting, a
  // retry), after a weapon of the arsenal has already been taken in hand: the two would then
  // be drawn together, the rifle at the eye like a wall across the street. While one of the
  // arsenal's is up, the stock pair stays put away. (A rig a thousandth of its size is the
  // armoury's warm-up drawing it ahead of time: left alone.)
  function stowOwn() {
    const W = G.weapon;
    // (the game's own arms hang straight off the camera; the arsenal's are deeper down)
    const arm =
      G.camera && G.camera.children.find((o) => o.name === "arm-right");
    let up = !!arm && arm.visible;
    for (const rig of Object.values(W.rigs || {}))
      if (rig.root.visible && rig.root.scale.x > 0.01) up = true;
    if (!up) return;
    W.setVisible(false);
    for (const rig of Object.values(W.rigs || {}))
      if (rig.root.scale.x > 0.01) rig.root.visible = false;
  }
  const driver = {
    frame(dt, input) {
      if (armory) armory.frame(dt, busy ? null : input);
      if (armory && armory.held) stowOwn();
    },
    get held() {
      return !!armory && armory.held;
    },
    get ads() {
      return armory ? armory.ads : 0;
    },
    get reloading() {
      return !!armory && armory.reloading;
    },
    hud: {
      get id() {
        return cur;
      },
      get ammo() {
        return armory ? Math.max(0, Math.ceil(armory.rounds - 1e-6)) : 0;
      },
      get mag() {
        return armory ? armory.mag || 1 : 1;
      },
      get reserve() {
        const a = ARMS[cur];
        return a && a.ammo ? Math.floor(have(a.ammo) / perOf(cur)) : 1 / 0;
      },
    },
  };
  function load() {
    if (ready) return ready;
    ready = import("./armory.js")
      .then((m) => m.createArmory(G))
      .then((a) => {
        armory = a;
        a.hooks.canReload = (id) => {
          const p = perOf(id);
          return !p || have(ARMS[id].ammo) >= p;
        };
        a.hooks.loaded = (id, W, want) => {
          const p = perOf(id);
          if (!p) return want;
          const type = ARMS[id].ammo;
          const got = Math.min(want, have(type) / p);
          setPool(type, have(type) - got * p);
          reloadRest(id);
          return got;
        };
        a.combat.setMods(mods);
        a.targets.setInfusions(infusions);
        G.weapon.ext = driver;
        // draw every weapon once, tiny, while nothing much is going on: the first time each
        // is taken in hand must not cost a frame (the game's own two rigs included)
        a.warmAll(Object.values(G.weapon.rigs).map((r) => r.root)).catch(
          () => {},
        );
        return a;
      })
      .catch((e) => {
        console.error("[run] armoury failed: " + ((e && e.stack) || e));
        return null;
      });
    return ready;
  }

  // ---------- numbers that follow level and seasonings
  // The arsenal's weapons take level and seasonings inside their own controller (the same
  // code the lab runs): setMods below is all they need. The game's own two rigs are tuned here.
  function tune(id) {
    const it = inv.get(id);
    if (!it || !ARMS[id].own) return;
    const rig = G.weapon.rigs[id];
    rig.def.damage =
      baseDef[id].damage * LEVELS[it.level - 1].dmg * mods.damage;
    rig.def.rpm = baseDef[id].rpm * mods.rate;
  }
  function tuneAll() {
    for (const id of inv.keys()) tune(id);
    G.weapon.reloadScale = mods.reload;
    if (armory) armory.combat.setMods(mods);
  }
  function untune() {
    for (const [id, base] of Object.entries(baseDef)) {
      const rig = G.weapon.rigs[id];
      rig.def.damage = base.damage;
      rig.def.rpm = base.rpm;
    }
    G.weapon.reloadScale = 1;
  }

  // ---------- one reload fills every magazine
  // Reloading the weapon in hand tops up the ones put away too, each from its own pool, so
  // an empty magazine is answered by changing weapon and one quiet moment reloads them all.
  function reloadRest(done) {
    if (!active) return;
    let filled = 0;
    for (const id of owned()) {
      if (id === done) continue;
      if (ARMS[id].own) {
        const slot = G.weapon.rigs[id] && G.weapon.rigs[id].slot;
        if (!slot) continue;
        const want = slot.magSize - slot.ammo;
        // the sidearm's reserve is bottomless; the carbine's is the bullets pool
        const got = slot.reserve == null ? want : Math.min(want, slot.reserve);
        if (got <= 0) continue;
        slot.ammo += got;
        if (slot.reserve != null) slot.reserve -= got;
        filled++;
        continue;
      }
      const it = inv.get(id);
      const spec = armory && armory.spec(id, it.branch, it.level);
      // blades have no magazine, charms come back by themselves
      if (!spec || !spec.mag || spec.mag === Infinity || spec.regen) continue;
      const rounds = it.rounds ?? spec.mag;
      const p = perOf(id);
      const type = ARMS[id].ammo;
      const got = p
        ? Math.min(spec.mag - rounds, have(type) / p)
        : spec.mag - rounds;
      if (got <= 0) continue;
      if (p) setPool(type, have(type) - got * p);
      it.rounds = rounds + got;
      filled++;
    }
    if (filled && on.reloaded) on.reloaded(filled);
  }
  // the game's own two guns say when the fresh magazine goes in
  G.events.on("weapon:reload", (e) => {
    if (
      active &&
      e &&
      e.phase === "magin" &&
      ARMS[e.weapon] &&
      cur === e.weapon
    )
      reloadRest(e.weapon);
  });

  // ---------- taking a weapon in hand
  function stash() {
    const it = inv.get(cur);
    if (it && armory && armory.current === cur) it.rounds = armory.rounds;
  }
  async function wield(id, { quick = false } = {}) {
    if (!inv.has(id) || busy || !G.player.alive) return false;
    if (id === cur && (ARMS[id].own ? !driver.held : driver.held)) return false;
    const a = ARMS[id];
    stash();
    if (id !== cur) last = cur;
    cur = id;
    if (a.own) {
      const was = driver.held;
      if (armory) armory.holster();
      G.weapon.setVisible(true);
      if (was || quick) G.weapon.equip(id);
      else G.weapon.switchTo(id);
      on.changed && on.changed(id);
      return true;
    }
    busy = true;
    try {
      if (!armory) await load();
      if (!armory) throw new Error("no armoury");
      const it = inv.get(id);
      G.weapon.setVisible(false);
      await armory.equip(id, {
        level: it.level,
        branch: it.branch,
        rounds: it.rounds,
      });
      // a run may have ended or moved on while the model was being built
      if (!active || cur !== id) {
        armory.holster();
        if (active && ARMS[cur] && ARMS[cur].own) G.weapon.setVisible(true);
      } else
        G.events.emit("weapon:switch", { from: last, to: id, phase: "draw" });
    } catch (e) {
      console.error("[run] could not take up " + id + ": " + e);
      cur = "pistol";
      G.weapon.setVisible(true);
      G.weapon.equip("pistol");
    }
    busy = false;
    on.changed && on.changed(cur);
    return true;
  }
  const owned = () => order.filter((id) => inv.has(id));
  // has something to fire (melee and self-loading weapons always do)
  function usable(id) {
    const a = ARMS[id];
    if (!a || !inv.has(id)) return false;
    if (!a.ammo) return true;
    const it = inv.get(id);
    const mag =
      id === "rifle"
        ? rifleSlot().ammo
        : armory && armory.current === id
          ? armory.rounds
          : (it.rounds ?? 1);
    return mag >= 1 || have(a.ammo) >= perOf(id);
  }

  const api = {
    ARMS,
    AMMO,
    driver,
    load,
    get armory() {
      return armory;
    },
    get active() {
      return active;
    },
    get cur() {
      return cur;
    },
    get busy() {
      return busy;
    },
    has: (id) => inv.has(id),
    item: (id) => inv.get(id) || null,
    owned,
    usable,
    perOf,
    /** New run: the sidearm and nothing else; pools start part-filled. */
    reset() {
      active = true;
      if (armory) armory.reset();
      inv.clear();
      order.length = 0;
      capMul = 1;
      mods = { damage: 1, rate: 1, reload: 1 };
      for (const t of AMMO_TYPES) setPool(t, AMMO[t].start);
      inv.set("pistol", { id: "pistol", level: 1, branch: "base" });
      order.push("pistol");
      cur = "pistol";
      last = null;
      busy = false;
      G.weapon.setVisible(true);
      G.weapon.equip("pistol");
      untune(); // the rifle is not carried yet: it must not keep the last run's numbers
      tuneAll();
      load();
    },
    /** Leaving the run (title, the endless mode): the game's own pair, untouched numbers. */
    stop() {
      if (!active) return;
      active = false;
      if (armory) armory.reset();
      untune();
      inv.clear();
      order.length = 0;
      cur = "rifle";
      G.weapon.setVisible(true);
    },
    /** The run is over but its last frame stays on screen: stop firing, keep the picture. */
    rest() {
      if (armory && armory.held) {
        armory.combat.release("fire");
        armory.combat.release("alt");
      }
    },
    /** Add a weapon at level 1. Returns false if it is already carried. */
    give(id) {
      if (!ARMS[id] || inv.has(id)) return false;
      const spec = !ARMS[id].own && armory ? armory.spec(id, "base", 1) : null;
      inv.set(id, {
        id,
        level: 1,
        branch: "base",
        rounds: id === "rifle" ? undefined : spec ? spec.mag : undefined,
      });
      order.push(id);
      if (id === "rifle") rifleSlot().ammo = rifleSlot().magSize;
      tune(id);
      return true;
    },
    wield,
    /** Q: back to the weapon held before this one (or on to the next if there was none). */
    swapLast() {
      if (last && inv.has(last) && last !== cur) return wield(last);
      return api.step(1);
    },
    /** Next or previous carried weapon. */
    step(dir) {
      const ids = owned();
      if (ids.length < 2) return false;
      const i = Math.max(0, ids.indexOf(cur));
      return wield(ids[(i + dir + ids.length) % ids.length]);
    },
    /** Number key n: the n-th weapon picked up this run (1 is the sidearm). */
    slot(n) {
      const id = owned()[n - 1];
      return !!id && id !== cur && wield(id);
    },
    // ---------- ammunition
    cap,
    have,
    /** Put units into a pool; returns how many fitted. */
    add(type, units) {
      const got = Math.max(0, Math.min(units, cap(type) - have(type)));
      if (got > 0) setPool(type, have(type) + got);
      return got;
    },
    refill() {
      for (const t of AMMO_TYPES) setPool(t, cap(t));
    },
    room: (type) => cap(type) - have(type),
    /** Pool of the weapon in hand, or null. */
    get curAmmo() {
      const a = ARMS[cur];
      return a ? a.ammo : null;
    },
    /** Rounds in the magazine of the weapon in hand plus what its pool still holds. */
    curRounds() {
      const a = ARMS[cur];
      if (!a || !a.ammo) return 1 / 0;
      const mag =
        cur === "rifle" ? rifleSlot().ammo : armory ? armory.rounds : 0;
      return mag + have(a.ammo) / perOf(cur);
    },
    setCapMul(k) {
      capMul = k;
    },
    // ---------- levels
    /** One level up for a weapon. Returns { id, level, fork } (fork: a form has to be chosen) or null at the cap. */
    upgrade(id) {
      const it = inv.get(id);
      if (!it || it.level >= MAX_LEVEL) return null;
      it.level++;
      const fork = it.level === 3 && !ARMS[id].own;
      if (fork) it.branch = "a";
      if (!ARMS[id].own && armory && armory.current === id)
        armory.regrade(it.level, it.branch);
      tune(id);
      return { id, level: it.level, fork };
    },
    setBranch(id, branch) {
      const it = inv.get(id);
      if (!it || ARMS[id].own) return;
      it.branch = branch === "b" ? "b" : "a";
      if (armory && armory.current === id) armory.regrade(it.level, it.branch);
    },
    /** The first carried weapon below the cap, starting with the one in hand. */
    nextToRaise() {
      const ids = [cur, last, ...owned().slice().reverse()];
      return (
        ids.find((id) => id && inv.has(id) && inv.get(id).level < MAX_LEVEL) ||
        null
      );
    },
    /** Seasonings: { damage, rate, reload } multipliers for every weapon. */
    setMods(m) {
      mods = { ...mods, ...m };
      tuneAll();
    },
    /** The elemental seasonings in force (see runtune.js, infusionsOf). */
    setInfusions(list) {
      infusions = list;
      if (armory) armory.targets.setInfusions(list);
    },
    /** Once a frame (real seconds): reports a weapon that has run dry. */
    update() {
      if (!active || busy) return;
      if (!usable(cur) && G.player.alive) {
        // dry: whatever was held before if that still fires, else anything that does
        const next = [last, ...owned().slice().reverse()].find(
          (id) => id && id !== cur && usable(id) && ARMS[id].ammo,
        );
        const to = next || owned().find((id) => id !== cur && usable(id));
        if (to) {
          const from = cur;
          wield(to).then((ok) => ok && on.dry && on.dry(from, to));
        }
      }
    },
  };
  return api;
}
