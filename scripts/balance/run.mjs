// A whole run of the set meal on the model: the meal's clock and its courses, the tickets,
// the envelopes, the four pools of ammunition, the crates, the three stoves (every dish
// tossed, held and packed) and the house special that the third dish brings, played by a
// simulated player. Thousands of them in a few seconds, each repeatable from its seed.
//
// The rules are the game's own (src/chinatown/runflow.js and runtune.js); what is assumed is
// the player. A profile says how well one shoots, dodges, keeps their distance and picks
// things up, and how they build: one weapon raised as far as it goes, or one for every pool.
import { createFight, mulberry } from "./engine.mjs";
import { factors } from "./lab.mjs";
import {
  RUN,
  AMMO,
  AMMO_TYPES,
  ARMS,
  LEVELS,
  STATUS,
  PLAYER,
  POOL,
  COP_SHARE,
  ZOMBIES,
  model,
  power,
  betterFork,
  zombieStats,
  ammoPer,
  spiceValue,
} from "./data.mjs";
import { weaponMods } from "../../src/chinatown/runtune.js";
import {
  stageAt,
  crowdOf,
  spawnPace,
  spawnKind,
  spawnGap,
  foodChance,
  clockStep,
  stoveCount,
  newDish,
  dishTake,
  dishPack,
  dishTossed,
  dishHot,
  dishStep,
  dishGrade,
  dishOf,
  killXp,
  gainXp,
  packWeights,
  eliteStats,
  timedElite,
} from "../../src/chinatown/runflow.js";

/**
 * Simulated players. These numbers are assumptions, not measurements: they are the knobs to
 * turn when a real playtest disagrees with the report.
 *   hit      share of rounds that land          head     share of hits that find the head
 *   precise  how much more often with a weapon aimed at the head
 *   dodge    share of swings a moving player slips
 *   kite     share of walking speed spent keeping the dead at a distance
 *   tempo    share of the weapon's rate kept up (looking around, repositioning)
 *   collect  share of dropped packs picked up      crates   chance to go to a crate when short
 *   trip     seconds a trip to a crate takes       build    "focus", "spread" or "random"
 *   cases    when a weapon case is opened (second of the street's time)
 *   fleeAt   share of health below which the player turns and runs to open the distance
 * and how they cook. The house special only comes once the third dish is packed, so every
 * profile lights all three stoves; one that did not would never finish (see LIMIT).
 *   stoves   second of the street's time at which the player goes and lights each stove; when
 *            the dish before it is still on by then, `rest` seconds after that one is served
 *   rest     the breather between a dish served and the next stove lit
 *   react    [a, b] seconds from the wok wanting its next toss (or the dish being ready to
 *            pack) to the player being at the stove with it in hand
 *   lapse    chance a toss is not noticed until the dish has caught (RUN.stove.burn)
 *   carry    [a, b] seconds to walk the tossed wok back to its stove and set it down
 */
export const PROFILES = {
  novice: {
    name: "新手",
    hit: 0.5,
    head: 0.06,
    precise: 3,
    dodge: 0.25,
    kite: 0.3,
    tempo: 0.75,
    collect: 0.5,
    crates: 0.3,
    trip: 18,
    stoves: [180, 380, 580],
    rest: 30,
    react: [3, 8],
    lapse: 0.2,
    carry: [1.5, 3],
    cases: [240],
    fleeAt: 0.25,
    build: "random",
  },
  focus: {
    name: "普通·专精一把",
    hit: 0.68,
    head: 0.15,
    precise: 4,
    dodge: 0.4,
    kite: 0.45,
    tempo: 0.88,
    collect: 0.7,
    crates: 0.7,
    trip: 14,
    stoves: [150, 330, 500],
    rest: 20,
    react: [2, 5],
    lapse: 0.06,
    carry: [1, 2],
    cases: [150],
    fleeAt: 0.35,
    build: "focus",
  },
  spread: {
    name: "普通·每把都用",
    hit: 0.68,
    head: 0.15,
    precise: 4,
    dodge: 0.4,
    kite: 0.45,
    tempo: 0.88,
    collect: 0.7,
    crates: 0.7,
    trip: 14,
    stoves: [150, 330, 500],
    rest: 20,
    react: [2, 5],
    lapse: 0.06,
    carry: [1, 2],
    cases: [70, 150, 230, 310, 400],
    fleeAt: 0.35,
    build: "spread",
  },
  expertFocus: {
    name: "熟手·专精一把",
    hit: 0.85,
    head: 0.35,
    precise: 2.4,
    dodge: 0.55,
    kite: 0.6,
    tempo: 0.95,
    collect: 0.85,
    crates: 0.95,
    trip: 11,
    stoves: [90, 250, 400],
    rest: 12,
    react: [1.5, 3],
    lapse: 0,
    carry: [0.5, 1.5],
    cases: [120],
    fleeAt: 0.4,
    build: "focus",
  },
  expertSpread: {
    name: "熟手·每把都用",
    hit: 0.85,
    head: 0.35,
    precise: 2.4,
    dodge: 0.55,
    kite: 0.6,
    tempo: 0.95,
    collect: 0.85,
    crates: 0.95,
    trip: 11,
    stoves: [90, 250, 400],
    rest: 12,
    react: [1.5, 3],
    lapse: 0,
    carry: [0.5, 1.5],
    cases: [60, 130, 200, 280, 360],
    fleeAt: 0.4,
    build: "spread",
  },
};

// what each build asks the kitchen for first
const WANT = {
  focus: [
    "fire",
    "hands",
    "toss",
    "chili",
    "pepper",
    "portion",
    "soup",
    "vinegar",
    "burst",
    "rice",
    "runner",
    "takeout",
  ],
  spread: [
    "portion",
    "fire",
    "hands",
    "takeout",
    "soup",
    "toss",
    "burst",
    "chili",
    "pepper",
    "vinegar",
    "runner",
    "rice",
  ],
};
const BUCKET = 30; // seconds per column of the pressure curves
// The hard stop. Nothing on the street's own time ends a run any more: the house special
// waits for the third dish, so a player who never packs it would go on for ever. A run still
// going at twenty minutes, twice the length one is meant to have, is a "timeout" and
// counted as lost.
const LIMIT = 1200;

/**
 * One run. o: { seed, profile (a key of PROFILES or an object), place, difficulty, device
 * ("desktop" | "phone"), unlocked ("start" | "all"), dt }.
 * Returns what happened: { outcome: "clear" | "dead" | "timeout", time (of the street),
 * clock (of the meal), where (what was going on when it ended: "street", "dish" or "boss"),
 * level, levelAt[], picks, kills, elites, weapons[], dry, pistol, hurt,
 * packs: { dropped, taken, wasted }, stoves: { lit[], served[] (seconds), scorched (of the
 * dishes served) }, curve: { alive[], near[], hurt[] } by BUCKET seconds, boss: { at,
 * health, seconds, levels (level-ups before it arrived) } or null }.
 */
export function simulateRun(o = {}) {
  const prof =
    typeof o.profile === "object" ? o.profile : PROFILES[o.profile || "focus"];
  const rng = mulberry((o.seed || 1) * 2654435761);
  const rand = (a, b) => a + (b - a) * rng();
  const dt = o.dt || 0.1;
  const diff = RUN.difficulty[o.difficulty || "standard"];
  const place = RUN.places[o.place || "street"] || {};
  const { crowd, room } = crowdOf(POOL[o.device || "desktop"]);
  const cal = factors();
  const open =
    o.unlocked === "all" ? Object.keys(ARMS) : ["pistol", ...RUN.unlocks.start];

  const F = createFight({
    rng,
    health: PLAYER.health,
    regenDelay: PLAYER.regenDelay,
    // wounds do not close by themselves in a run (RUN.heal.regen is the share kept)
    regenRate: PLAYER.regenRate * RUN.heal.regen,
  });
  const R = {
    t: 0, // the street's time
    clock: 0, // the meal's: the courses are read at this one (runflow.js, clockStep)
    xp: 0,
    level: 0,
    pending: 0,
    picks: 0,
    levelAt: [],
    spice: {},
    inv: new Map(),
    order: [],
    cur: null,
    hold: 0, // seconds the hands are busy changing weapon
    stick: 0, // seconds before the "spread" build looks for another weapon
    pools: Object.fromEntries(AMMO_TYPES.map((k) => [k, AMMO[k].start])),
    capMul: 1,
    packs: [],
    food: [], // boxes on the ground: { at: when it is reached, until: when it is gone }
    eaten: 0,
    envelopes: [],
    crates: AMMO_TYPES.flatMap((kind) =>
      Array.from({ length: RUN.ammo.caches }, () => ({
        kind,
        stocked: true,
        timer: 0,
      })),
    ),
    trip: null,
    asked: false, // already decided about a crate for this shortage
    flee: false, // running to get away
    fleeT: 0,
    fleeCool: 0,
    spawnT: 1.2,
    eliteAt: RUN.elite.first,
    eliteN: 0,
    eliteIdle: 0, // timed elites since the last stove was lit
    boss: null,
    bossSeen: false,
    bossDue: Infinity, // set when the third dish is packed
    bossAt: 0,
    bossHealth: 0,
    bossLevel: 0,
    summonT: 0,
    cook: null, // the dish on a stove (runflow.js, newDish)
    lit: 0,
    served: 0,
    scorched: 0, // of the dishes served
    litAt: [],
    servedAt: [],
    handAt: 0, // when the player is at the stove for the toss that is due, or to pack
    homeAt: 0, // when the tossed wok is back at its stove
    restUntil: 0, // no stove is lit before this
    menu: [], // dealt below, once the helpers exist
    bonusHealth: 0,
    bonusCap: 0,
    stoves: prof.stoves.slice(0, stoveCount()),
    cases: prof.cases.slice(0, RUN.cases.count),
    dry: 0,
    pistol: 0,
    dropped: 0,
    taken: 0,
    wasted: 0,
    curve: { alive: [], near: [], hurt: [], n: [] },
    outcome: "",
  };
  const cap = (kind) => AMMO[kind].cap * R.capMul;
  {
    const bag = RUN.dishes.slice();
    while (bag.length)
      R.menu.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
  }
  const roomOf = (kind) => cap(kind) - R.pools[kind];
  const add = (kind, units) => {
    const got = Math.max(0, Math.min(units, roomOf(kind)));
    R.pools[kind] += got;
    return got;
  };
  const mods = () => weaponMods(R.spice);
  const infusions = () => {
    const lv = (id) => R.spice[id] || 0;
    const def = (id) => RUN.spices.find((s) => s.id === id);
    const out = { burn: STATUS.burn.dps * STATUS.burn.time };
    if (lv("chili")) out.fire = def("chili").every[lv("chili") - 1];
    if (lv("pepper")) out.shock = def("pepper").every[lv("pepper") - 1];
    if (lv("vinegar")) out.venom = def("vinegar").every[lv("vinegar") - 1];
    if (lv("rice")) out.seal = def("rice").chance[lv("rice") - 1];
    return out;
  };
  function applySpice() {
    R.capMul = 1 + spiceValue("portion", R.spice.portion) + R.bonusCap;
    const P = F.player;
    const hp = PLAYER.health + spiceValue("soup", R.spice.soup) + R.bonusHealth;
    if (hp > P.maxHp) P.hp += hp - P.maxHp;
    P.maxHp = hp;
    P.regenRate = PLAYER.regenRate * RUN.heal.regen;
  }

  // ---------- weapons
  const perRound = (it) =>
    ARMS[it.id].ammo ? ammoPer(it.id, it.branch, it.level) : 0;
  const strength = (it) => {
    const m = model(it.id);
    return (
      m.damage * (m.pellets || 1) * m.rate * power(it.id, it.branch, it.level)
    );
  };
  function stow() {
    const W = F.weapon;
    if (W && R.inv.has(W.id)) R.inv.get(W.id).rounds = W.rounds;
  }
  function wield(id, quick = false) {
    if (R.cur === id && F.weapon) return;
    stow();
    const it = R.inv.get(id);
    const kind = ARMS[id].ammo;
    const per = perRound(it);
    F.wield({
      id,
      power: power(id, it.branch, it.level) * cal[id],
      rounds: it.rounds,
      supply: kind
        ? (n) => {
            const got = Math.min(n * per, R.pools[kind]);
            R.pools[kind] -= got;
            return got / per;
          }
        : undefined,
      reloaded: () => reloadRest(id),
    });
    R.cur = id;
    if (!quick) R.hold = 0.6;
  }
  // one reload fills every magazine carried, each from its own pool (loadout.js, reloadRest)
  function reloadRest(done) {
    for (const id of R.order) {
      if (id === done) continue;
      const it = R.inv.get(id);
      const m = model(id);
      if (m.mag === Infinity || m.regen || m.kind === "melee") continue;
      const kind = ARMS[id].ammo;
      const per = perRound(it);
      const rounds = it.rounds ?? m.mag;
      const got = kind
        ? Math.min(m.mag - rounds, R.pools[kind] / per)
        : m.mag - rounds;
      if (got <= 0) continue;
      if (kind) R.pools[kind] -= got * per;
      it.rounds = rounds + got;
    }
  }
  // the form or level of the weapon in hand changed: same magazine, new numbers
  function regrade(id) {
    if (R.cur !== id) return;
    R.cur = null;
    wield(id, true);
  }
  function take(id, inHand = true) {
    if (R.inv.has(id)) return false;
    R.inv.set(id, { id, level: 1, branch: "base", rounds: undefined });
    R.order.push(id);
    const kind = ARMS[id].ammo;
    if (kind) add(kind, AMMO[kind].pack);
    if (inHand) wield(id);
    return true;
  }
  const usable = (id) => {
    const it = R.inv.get(id);
    const kind = ARMS[id].ammo;
    if (!kind) return true;
    const rounds = R.cur === id ? F.weapon.rounds : (it.rounds ?? 1);
    return rounds >= 1 || R.pools[kind] >= perRound(it);
  };
  const carried = () => R.order.filter((id) => id !== "pistol");
  const main = () =>
    carried()
      .map((id) => R.inv.get(id))
      .sort((a, b) => b.level - a.level || strength(b) - strength(a))[0];
  function choose() {
    const ids = carried().filter(usable);
    if (!ids.length) return wield("pistol");
    if (prof.build === "spread") {
      // waste nothing: the weapon whose pool is fullest, but not a change every second
      const fill = (id) => R.pools[ARMS[id].ammo] / cap(ARMS[id].ammo);
      const best = ids
        .filter((id) => ARMS[id].ammo)
        .sort((a, b) => fill(b) - fill(a))[0];
      const now = R.cur;
      if (!best) return wield(ids[0]);
      if (
        !ids.includes(now) ||
        (R.stick <= 0 && fill(best) > fill(now) + 0.2)
      ) {
        wield(best);
        R.stick = 6;
      }
      return;
    }
    if (prof.build === "random") {
      // whatever was picked up last, for as long as it fires
      if (!ids.includes(R.cur)) wield(ids[ids.length - 1]);
      return;
    }
    const m = main();
    if (usable(m.id)) return wield(m.id);
    wield(
      ids
        .map((id) => R.inv.get(id))
        .sort((a, b) => strength(b) - strength(a))[0].id,
    );
  }
  const available = () => open.filter((id) => !R.inv.has(id));
  const pickN = (list, n) => {
    const bag = list.slice();
    const out = [];
    while (out.length < n && bag.length)
      out.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
    return out;
  };
  // the game's weaponOffers: one for a pool nothing carried draws on yet comes first
  function weaponOffers(n, mains = false) {
    let ids = available();
    if (mains) ids = ids.filter((id) => ARMS[id].ammo);
    const fed = new Set(R.order.map((id) => ARMS[id].ammo).filter(Boolean));
    const fresh = pickN(
      ids.filter((id) => ARMS[id].ammo && !fed.has(ARMS[id].ammo)),
      1,
    );
    const rest = pickN(
      ids.filter((id) => !fresh.includes(id)),
      n - fresh.length,
    );
    return pickN([...fresh, ...rest], n).map((id) => ({ kind: "weapon", id }));
  }
  function spiceCards(n) {
    const bag = RUN.spices
      .filter((s) => (R.spice[s.id] || 0) < RUN.spiceMax)
      .map((s) => ({ s, w: R.spice[s.id] ? 1.4 : 1 }));
    const cards = [];
    while (cards.length < n && bag.length) {
      let roll = rng() * bag.reduce((a, b) => a + b.w, 0);
      let k = 0;
      while (k < bag.length - 1 && (roll -= bag[k].w) > 0) k++;
      cards.push({ kind: "spice", id: bag.splice(k, 1)[0].s.id });
    }
    return cards;
  }
  function rollCards() {
    let cards;
    if (RUN.weaponPicks.includes(R.level - R.pending + 1)) {
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
    for (const kind of ["heal", "ammo"])
      if (cards.length < 3) cards.push({ kind });
    return cards;
  }
  function pickCard(cards) {
    if (prof.build === "random") return cards[Math.floor(rng() * cards.length)];
    const weapon = cards.find((c) => c.kind === "weapon");
    if (weapon && (prof.build === "spread" || carried().length < 2))
      return weapon;
    const order = WANT[prof.build];
    return (
      cards
        .filter((c) => c.kind === "spice")
        .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))[0] ||
      cards.find((c) => c.kind !== "weapon") ||
      cards[0]
    );
  }
  function serve(c) {
    R.picks++;
    if (c.kind === "spice") {
      R.spice[c.id] = (R.spice[c.id] || 0) + 1;
      applySpice();
    } else if (c.kind === "weapon") take(c.id, prof.build !== "focus");
    else if (c.kind === "heal") F.player.hp = F.player.maxHp;
    else for (const k of AMMO_TYPES) R.pools[k] = cap(k);
  }
  // a red envelope raises the weapon in hand: each build holds the one it wants raised
  function envelope() {
    const ids = carried().length ? carried() : ["pistol"];
    const below = ids
      .map((id) => R.inv.get(id))
      .filter((it) => it.level < LEVELS.length);
    let it = null;
    if (below.length) {
      if (prof.build === "spread")
        it = below.sort((a, b) => a.level - b.level)[0];
      else if (prof.build === "focus")
        it = below.sort((a, b) => b.level - a.level)[0];
      else it = below.find((x) => x.id === R.cur) || below[0];
    }
    if (!it) {
      // everything is at the top: a bowl of soup and a pinch of something
      F.player.hp = F.player.maxHp;
      const left = RUN.spices.filter(
        (s) => (R.spice[s.id] || 0) < RUN.spiceMax,
      );
      if (left.length) {
        const s = left[Math.floor(rng() * left.length)];
        R.spice[s.id] = (R.spice[s.id] || 0) + 1;
        applySpice();
      }
      return;
    }
    it.level++;
    if (it.level === 3) {
      it.branch =
        prof.build === "random" ? (rng() < 0.5 ? "a" : "b") : betterFork(it.id);
      R.picks++;
    }
    regrade(it.id);
  }

  // ---------- the dead
  const far = (min = ZOMBIES_FAR) => rand(min, min + 14);
  function rise(kind, opts = {}) {
    if (kind === "brute")
      return F.add({ type: "brute", ...zombieStats("brute", true), d: far() });
    const runner = kind === "bloater" || kind === "pack" || opts.runner;
    const z = { type: "walker", ...zombieStats("walker", runner), d: far() };
    if (kind === "pack") {
      z.hp *= RUN.pack.hp;
      z.speed *= RUN.pack.speed;
    }
    if (kind === "bloater") {
      z.rank = "bloater";
      z.hp *= RUN.bloater.hp;
    } else z.cop = rng() < COP_SHARE;
    if (opts.d) z.d = opts.d;
    if (opts.dull) z.dull = true;
    return F.add(z);
  }
  function riseElite() {
    const e = eliteStats(R.eliteN);
    const s = zombieStats("brute", true);
    F.add({
      type: "brute",
      rank: "elite",
      ...s,
      hp: s.hp * e.hpMul,
      damage: s.damage * e.dmgMul,
      speed: s.speed * e.speedMul,
      d: far(20),
    });
    R.eliteN++;
  }
  function drop(kind, spread = false) {
    R.dropped++;
    if (rng() > prof.collect) return;
    R.packs.push({
      kind,
      amount: AMMO[kind].pack,
      at: R.t + rand(2, spread ? 5 : 9),
    });
  }
  function rollKind() {
    const need = ARMS[R.cur].ammo;
    const w = packWeights(
      AMMO_TYPES,
      need,
      !!need && R.pools[need] < cap(need) * RUN.ammo.lowAt,
    );
    let roll = rng() * w.reduce((a, b) => a + b, 0);
    let k = 0;
    while (k < w.length - 1 && (roll -= w[k]) > 0) k++;
    const kind = AMMO_TYPES[k];
    if (roomOf(kind) >= AMMO[kind].pack * 0.25) return kind;
    R.wasted++;
    return null;
  }
  F.onKill = (z) => {
    R.pending += gainXp(R, killXp(z.rank, z.type, dishHot(R.cook)));
    const A = RUN.ammo;
    const boost = 1 + spiceValue("takeout", R.spice.takeout);
    if (z.rank === "elite") {
      R.envelopes.push(R.t + 3);
      for (let i = 0; i < RUN.elite.packs; i++) {
        const k = rollKind();
        if (k) drop(k, true);
      }
    } else if (z.rank === "boss") {
      R.outcome = "clear";
    } else if (z.rank === "bloater") {
      const B = RUN.bloater;
      for (const o of F.zombies)
        if (o.alive && o !== z && Math.abs(o.d - z.d) < B.radius)
          F.damage(o, B.damage * (1 - Math.abs(o.d - z.d) / B.radius));
      if (z.d < B.radius) F.hurtPlayer(B.hurt * (1 - z.d / B.radius), z);
    } else if (z.type === "brute") {
      if (rng() < A.bruteDrop * boost) {
        const k = rng() < A.bruteBullets ? "bullets" : rollKind();
        if (k && roomOf(k) >= 1) drop(k);
      }
    } else if (z.cop && rng() < A.copDrop * boost) {
      if (roomOf("heavy") >= 1) drop("heavy");
    } else if (rng() < A.drop * boost) {
      const k = rollKind();
      if (k) drop(k);
    }
    const P = F.player;
    const boxes =
      z.rank === "elite"
        ? RUN.heal.elite
        : z.rank !== "boss" &&
            z.rank !== "bloater" &&
            rng() < foodChance(z.type, P.hp / P.maxHp, boost)
          ? 1
          : 0;
    for (let i = 0; i < boxes; i++)
      // the hurt go out of their way for it
      if (rng() < Math.max(prof.collect, P.hp < P.maxHp * 0.5 ? 0.9 : 0))
        R.food.push({ at: R.t + rand(2, 6), until: R.t + RUN.heal.life });
    const lv = R.spice.burst || 0;
    if (lv && z.rank !== "boss" && !z.burst && rng() < spiceValue("burst", lv))
      for (const o of F.zombies)
        if (o.alive && o !== z && Math.abs(o.d - z.d) < RUN.burst.radius) {
          o.burst = true; // one link of the chain is enough for the model
          F.damage(o, RUN.burst.damage * 0.7);
        }
  };
  let hurtNow = 0;
  F.onHurt = (d) => (hurtNow += d);
  // A flip of the wok: fire out in front of the cook. The model has no directions, so the
  // dead within range are taken to be spread over the half-circle the cook is facing, and
  // the cone catches its share of that. As in the game the "fire" seasoning counts and the
  // weapon in hand does not; what is left standing burns, paid at once as the seasonings' is.
  function flare() {
    const L = RUN.stove.toss.flare;
    const share = Math.min(1, (2 * L.half) / Math.PI);
    const dmg = L.damage * (1 + spiceValue("fire", R.spice.fire));
    const burn = L.burn * STATUS.burn.dps * STATUS.burn.time;
    for (const z of F.zombies.slice())
      if (z.alive && !(z.sleep > 0) && z.d <= L.range && rng() < share) {
        F.shove(z, L.knock);
        if (!F.damage(z, dmg)) F.damage(z, burn);
      }
  }

  // ---------- the run
  take("pistol");
  // the street as the run finds it: wanderers all over it
  for (let i = 0; i < RUN.opening; i++)
    rise("walker", { d: rand(14, 60), dull: true, runner: rng() < 0.2 });
  {
    // the first ticket: three weapons that draw on a pool
    const offers = weaponOffers(3, true);
    const want = offers.find((c) => c.id === o.main);
    if (offers.length)
      take((want || offers[Math.floor(rng() * offers.length)]).id);
    R.picks++;
  }

  while (!R.outcome && R.t < LIMIT) {
    R.t += dt;
    const t = R.t;
    // ---- the meal's clock, and what it brings
    R.clock = clockStep(R.clock, dt, {
      lit: R.lit,
      served: R.served,
      cooking: dishHot(R.cook),
    });
    R.spawnT -= dt;
    if (R.spawnT <= 0) {
      const st = stageAt(R.clock, place);
      const { every, cap: most } = spawnPace(st, diff, {
        cooking: dishHot(R.cook),
        heat: R.cook ? R.cook.n : 0,
        crowd,
        room,
      });
      if (F.alive() >= most) R.spawnT = 0.25;
      else {
        let brutes = 0;
        for (const z of F.zombies)
          if (z.alive && z.type === "brute" && !z.rank) brutes++;
        const kind = spawnKind(st, rng(), brutes);
        const quiet = st.quiet && !R.cook && kind === "walker";
        if (kind === "pack") {
          // they rise at one spot and come on together
          const d = far();
          for (let i = 0; i < RUN.pack.size; i++)
            rise("pack", { d: d + i * 0.6 });
        } else
          rise(kind, {
            runner: kind === "walker" && rng() < st.runner,
            dull: quiet,
            d: quiet ? rand(20, 50) : 0,
          });
        R.spawnT = spawnGap(every, rng());
      }
    }
    // timed elites, on the street's time: not while a dish is on, none once the third is
    // served (the house special is next), and only so many between two stoves
    if (
      timedElite({
        t,
        eliteAt: R.eliteAt,
        cooking: !!R.cook,
        served: R.served,
        idle: R.eliteIdle,
      })
    ) {
      riseElite();
      R.eliteIdle++;
      R.eliteAt += place.eliteEvery || RUN.elite.every;
    }
    if (!R.bossSeen && t >= R.bossDue) {
      const B = RUN.boss;
      const s = zombieStats("brute", true);
      R.boss = F.add({
        type: "brute",
        rank: "boss",
        ...s,
        hp: diff.bossHp * (place.bossHp || 1),
        damage: s.damage * B.damage * (diff.bossHit || 1),
        speed: s.speed * B.speed * (diff.bossSpeed || 1),
        d: far(22),
      });
      R.bossSeen = true;
      R.bossAt = t;
      R.bossLevel = R.level;
      R.bossHealth = F.player.hp / F.player.maxHp;
      if (B.heal) F.player.hp = F.player.maxHp;
      R.summonT = B.summonEvery * 0.6;
    }
    if (R.boss && R.boss.alive) {
      R.summonT -= dt;
      if (R.summonT <= 0) {
        R.summonT = RUN.boss.summonEvery;
        for (let i = 0; i < RUN.boss.summon; i++)
          rise("walker", { runner: true });
      }
    }
    // ---- what lies in the street
    for (let i = R.packs.length - 1; i >= 0; i--)
      if (t >= R.packs[i].at) {
        if (add(R.packs[i].kind, R.packs[i].amount) > 0) R.taken++;
        R.packs.splice(i, 1);
      }
    for (let i = R.food.length - 1; i >= 0; i--) {
      const f = R.food[i];
      const P = F.player;
      if (t > f.until) R.food.splice(i, 1);
      else if (t >= f.at && P.hp < P.maxHp) {
        // (a box is left lying while there is nothing to heal)
        P.hp = Math.min(P.maxHp, P.hp + RUN.heal.food);
        R.eaten++;
        R.food.splice(i, 1);
      }
    }
    for (let i = R.envelopes.length - 1; i >= 0; i--)
      if (t >= R.envelopes[i]) {
        R.envelopes.splice(i, 1);
        envelope();
      }
    for (const c of R.crates)
      if (!c.stocked && (c.timer -= dt) <= 0) c.stocked = true;
    if (R.cases.length && t >= R.cases[0] && !R.bossSeen) {
      R.cases.shift();
      const ids = available();
      if (ids.length)
        take(
          ids[Math.floor(rng() * ids.length)],
          prof.build !== "focus" || carried().length === 0,
        );
      else envelope();
    }
    // ---- the stoves: light one, toss, hold the place, toss again, pack
    // not where the stoves are: off to a crate, or running to open the distance
    const gone = !!R.trip || R.flee;
    if (
      R.stoves.length &&
      !R.cook &&
      !gone &&
      t >= Math.max(R.stoves[0], R.restUntil)
    ) {
      R.stoves.shift();
      R.cook = newDish(R.lit); // in hand at once: the first toss
      R.lit++;
      R.eliteIdle = 0;
      R.litAt.push(t);
      R.spawnT = 0;
      // every wanderer in the street smells it
      for (const z of F.zombies) if (z.alive) z.dull = false;
    }
    if (R.cook) {
      const c = R.cook;
      const K = RUN.stove;
      if (!gone && t >= R.handAt) {
        if (c.phase === "due") dishTake(c);
        else if (c.phase === "ready") dishPack(c);
      }
      const events = dishStep(c, dt, {
        // a trip to a crate is out of the stove's radius; running a few seconds from the
        // dead is taken to stay inside it (thirteen metres is most of the crossing)
        near: !R.trip,
        home: dishTossed(c) && !gone && t >= R.homeAt,
      });
      for (const e of events) {
        if (e === "flip") flare();
        else if (e === "tossed") R.homeAt = t + rand(...prof.carry);
        else if (e === "down") R.spawnT = 0;
        else if (e === "packs")
          for (let n = 0; n < K.packs[c.k]; n++) {
            const d = far();
            for (let i = 0; i < RUN.pack.size; i++)
              rise("pack", { d: d + i * 0.6 });
          }
        else if (e === "elite") {
          riseElite();
          R.eliteAt = Math.max(R.eliteAt, t + K.eliteHold);
        } else if (e === "due")
          R.handAt =
            t +
            (rng() < prof.lapse ? K.burn + rand(0, 8) : rand(...prof.react));
        else if (e === "ready") R.handAt = t + rand(...prof.react);
        else if (e === "served") {
          R.cook = null;
          R.served++;
          R.servedAt.push(t);
          if (c.scorched) R.scorched++;
          const d = dishOf(R.menu.shift() || RUN.dishes[0], dishGrade(c));
          const P = F.player;
          R.bonusHealth += d.health;
          R.bonusCap += d.cap;
          applySpice();
          P.hp = d.full ? P.maxHp : Math.min(P.maxHp, P.hp + P.maxHp * d.heal);
          if (d.refill) for (const k of AMMO_TYPES) R.pools[k] = cap(k);
          for (let i = 0; i < d.envelopes; i++) R.envelopes.push(t + 2 + i);
          R.eliteAt = Math.max(R.eliteAt, t + RUN.stove.eliteAfter);
          R.restUntil = t + prof.rest;
          if (R.served >= stoveCount()) R.bossDue = t + RUN.boss.after;
        }
      }
    }
    // the wok is in both hands (a toss, the walk back) or the dish is being packed
    const wok =
      !!R.cook && (R.cook.phase === "toss" || R.cook.phase === "pack");
    // ---- the tickets
    while (R.pending > 0) {
      serve(pickCard(rollCards()));
      R.pending--;
      R.levelAt.push(Math.round(t));
    }
    // ---- which weapon, and whether to go for a crate
    R.hold = Math.max(0, R.hold - dt);
    R.stick = Math.max(0, R.stick - dt);
    const M = main();
    const kind = M && ARMS[M.id].ammo;
    const short = !!kind && R.pools[kind] < cap(kind) * RUN.ammo.lowAt;
    if (!short) R.asked = false;
    if (R.trip) {
      R.trip.left -= dt;
      if (R.trip.left <= 0) {
        const c = R.trip.crate;
        if (c.stocked) {
          add(c.kind, cap(c.kind) * RUN.ammo.cacheGive);
          c.stocked = false;
          c.timer = RUN.ammo.cacheEvery;
        }
        R.trip = null;
      }
    } else if (short && !R.asked && !wok) {
      R.asked = true;
      const c = R.crates.find((x) => x.stocked && x.kind === kind);
      if (c && rng() < prof.crates) R.trip = { crate: c, left: prof.trip };
    }
    if (R.hold <= 0 && !wok) choose();
    if (M && !usable(M.id)) R.dry += dt;
    if (R.cur === "pistol" && carried().length) R.pistol += dt;
    // ---- the fight
    let near = null;
    for (const z of F.zombies) if (z.alive && (!near || z.d < near.d)) near = z;
    const blade = model(R.cur).kind === "melee" && !wok;
    const speed = PLAYER.walk * (1 + spiceValue("runner", R.spice.runner));
    // a dish on a stove ties the player to the spot: less room to back away
    const away = R.trip ? 1 : prof.kite * (R.cook ? 0.6 : 1);
    // Badly hurt: turn and run to open the distance, then face them again. With wounds that
    // close by themselves the player stays away until they have; without, a few seconds
    // is all it buys (and a chance to reach a box of food).
    const hp = F.player.hp / F.player.maxHp;
    R.fleeT = Math.max(0, R.fleeT - dt);
    R.fleeCool = Math.max(0, R.fleeCool - dt);
    if (F.player.regenRate > 0) {
      if (hp < prof.fleeAt) R.flee = true;
      else if (hp > 0.75) R.flee = false;
    } else {
      if (hp < prof.fleeAt && R.fleeCool <= 0) {
        R.fleeT = 5;
        R.fleeCool = 14;
      }
      R.flee = R.fleeT > 0;
    }
    const flee = R.flee && !blade;
    // nothing is coming: walk up to the nearest wanderer that is out of reach
    let awake = false;
    for (const z of F.zombies) if (z.alive && !z.dull) awake = true;
    const stroll =
      !awake &&
      !R.cook &&
      near &&
      near.dull &&
      near.d > model(R.cur).reach * 0.8;
    const ctx = {
      skill: prof,
      mods: mods(),
      infusions: infusions(),
      dodge: prof.dodge,
      retreat: flee
        ? PLAYER.sprint * (speed / PLAYER.walk)
        : blade
          ? near && near.d > model(R.cur).reach
            ? -2
            : 0
          : stroll
            ? -speed * 0.8
            : near && !near.dull && near.d < 9
              ? away * speed
              : 0,
      flee,
      fire: R.hold <= 0,
      hands: !wok,
      tempo: prof.tempo * (flee ? 0.2 : R.trip ? 0.35 : 1),
    };
    F.step(dt, ctx);
    if (!F.player.alive) R.outcome = "dead";
    // ---- the curves
    const b = Math.floor(t / BUCKET);
    const C = R.curve;
    if (C.n[b] === undefined) {
      C.n[b] = 0;
      C.alive[b] = 0;
      C.near[b] = 0;
      C.hurt[b] = 0;
    }
    C.n[b]++;
    C.hurt[b] += hurtNow;
    hurtNow = 0;
    for (const z of F.zombies)
      if (z.alive) {
        C.alive[b]++;
        if (z.d < 6) C.near[b]++;
      }
  }
  if (!R.outcome) R.outcome = "timeout";
  stow();
  const C = R.curve;
  return {
    outcome: R.outcome,
    time: R.t,
    clock: R.clock,
    where: R.bossSeen ? "boss" : R.cook ? "dish" : "street",
    level: R.level,
    levelAt: R.levelAt,
    picks: R.picks,
    kills: F.stats.kills,
    elites: R.eliteN,
    spice: { ...R.spice },
    weapons: R.order.map((id) => {
      const it = R.inv.get(id);
      return { id, level: it.level, branch: it.branch };
    }),
    dry: R.dry,
    pistol: R.pistol,
    hurt: F.stats.taken,
    eaten: R.eaten,
    served: R.served,
    stoves: { lit: R.litAt, served: R.servedAt, scorched: R.scorched },
    health: F.player.hp / F.player.maxHp,
    packs: { dropped: R.dropped, taken: R.taken, wasted: R.wasted },
    curve: {
      alive: C.alive.map((v, i) => v / C.n[i]),
      near: C.near.map((v, i) => v / C.n[i]),
      hurt: C.hurt.slice(),
    },
    boss: R.bossSeen
      ? {
          at: R.bossAt,
          health: R.bossHealth,
          seconds: R.outcome === "clear" ? R.t - R.bossAt : null,
          levels: R.bossLevel,
        }
      : null,
  };
}
// how far away the dead rise (the game's spawnFar, src/game.js)
const ZOMBIES_FAR = 16;
void ZOMBIES;

const median = (list) => {
  if (!list.length) return null;
  const s = list.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const mean = (list) =>
  list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;

/**
 * Many runs of one kind of player. Returns { n, clear, dead, timeout (shares), deathAt
 * (median second of those who died), clearAt, level (median at the end), levelAt[] (median
 * second of each level-up among runs that got there), picks, kills, dry, pistol, hurt,
 * wasted (share of rolls that came to nothing), curve: { alive[], near[], hurt[] } means,
 * deaths[] (share of all runs that died in each BUCKET), running[] (share still going in
 * it), deadIn: { street, dish, boss } (share of all runs that died there), weapons (mean number carried), top (mean highest weapon level), bossSeconds, and of
 * the meal: litAt[], servedAt[] (median second of each stove among runs that got there),
 * lit[], dished[] (share of runs that did), scorched (share of the dishes served), elites
 * (mean number met), and among the runs that saw the house special: bossAt (median second
 * of the street's time), bossLevels (median level-ups before it), bossElites }.
 */
export function simulateMany(o = {}, n = 200) {
  const runs = [];
  for (let i = 1; i <= n; i++) runs.push(simulateRun({ ...o, seed: i }));
  const share = (what) => runs.filter((r) => r.outcome === what).length / n;
  const dead = runs.filter((r) => r.outcome === "dead");
  const cleared = runs.filter((r) => r.outcome === "clear");
  const cols = Math.max(...runs.map((r) => r.curve.alive.length));
  const col = (key, i) =>
    mean(
      runs
        .filter((r) => r.curve[key][i] !== undefined)
        .map((r) => r.curve[key][i]),
    );
  const levels = Math.max(...runs.map((r) => r.levelAt.length));
  const seen = runs.filter((r) => r.boss);
  const stoves = Array.from({ length: stoveCount() }, (_, i) => i);
  const dishes = runs.reduce((a, r) => a + r.served, 0);
  return {
    n,
    clear: share("clear"),
    dead: share("dead"),
    timeout: share("timeout"),
    deathAt: median(dead.map((r) => r.time)),
    clearAt: median(cleared.map((r) => r.time)),
    level: median(runs.map((r) => r.level)),
    levelAt: Array.from({ length: levels }, (_, i) =>
      median(
        runs.filter((r) => r.levelAt[i] !== undefined).map((r) => r.levelAt[i]),
      ),
    ),
    reached: Array.from(
      { length: levels },
      (_, i) => runs.filter((r) => r.levelAt[i] !== undefined).length / n,
    ),
    picks: mean(runs.map((r) => r.picks)),
    kills: mean(runs.map((r) => r.kills)),
    dry: mean(runs.map((r) => r.dry / r.time)),
    pistol: mean(runs.map((r) => r.pistol / r.time)),
    hurt: mean(runs.map((r) => (r.hurt * 60) / r.time)),
    eaten: mean(runs.map((r) => r.eaten)),
    served: mean(runs.map((r) => r.served)),
    litAt: stoves.map((i) =>
      median(runs.map((r) => r.stoves.lit[i]).filter((v) => v !== undefined)),
    ),
    lit: stoves.map(
      (i) => runs.filter((r) => r.stoves.lit[i] !== undefined).length / n,
    ),
    servedAt: stoves.map((i) =>
      median(
        runs.map((r) => r.stoves.served[i]).filter((v) => v !== undefined),
      ),
    ),
    dished: stoves.map(
      (i) => runs.filter((r) => r.stoves.served[i] !== undefined).length / n,
    ),
    scorched: dishes
      ? runs.reduce((a, r) => a + r.stoves.scorched, 0) / dishes
      : null,
    elites: mean(runs.map((r) => r.elites)),
    bossAt: median(seen.map((r) => r.boss.at)),
    bossLevels: median(seen.map((r) => r.boss.levels)),
    bossElites: median(seen.map((r) => r.elites)),
    healthAtEnd: mean(cleared.map((r) => r.health)),
    wasted: mean(
      runs.map(
        (r) => r.packs.wasted / Math.max(1, r.packs.wasted + r.packs.dropped),
      ),
    ),
    weapons: mean(runs.map((r) => r.weapons.length - 1)),
    top: mean(runs.map((r) => Math.max(...r.weapons.map((w) => w.level)))),
    bossSeconds: median(cleared.map((r) => r.boss.seconds)),
    bossReached: seen.length / n,
    curve: {
      alive: Array.from({ length: cols }, (_, i) => col("alive", i)),
      near: Array.from({ length: cols }, (_, i) => col("near", i)),
      hurt: Array.from({ length: cols }, (_, i) => col("hurt", i)),
    },
    deaths: Array.from(
      { length: cols },
      (_, i) =>
        dead.filter((r) => Math.floor(r.time / BUCKET) === i).length / n,
    ),
    deadIn: Object.fromEntries(
      ["street", "dish", "boss"].map((w) => [
        w,
        dead.filter((r) => r.where === w).length / n,
      ]),
    ),
    running: Array.from(
      { length: cols },
      (_, i) => runs.filter((r) => r.curve.alive[i] !== undefined).length / n,
    ),
  };
}
export { BUCKET, LIMIT };

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = +(process.argv[2] || 200);
  const t0 = Date.now();
  const sec = (v) => (v == null ? "-" : v.toFixed(0));
  for (const key of Object.keys(PROFILES)) {
    const r = simulateMany({ profile: key }, n);
    console.log(
      `${PROFILES[key].name.padEnd(10)} clear ${(r.clear * 100).toFixed(0).padStart(3)}%  dead ${(r.dead * 100).toFixed(0).padStart(3)}% @${sec(r.deathAt)}s  timeout ${(r.timeout * 100).toFixed(0)}%  level ${r.level}  picks ${r.picks.toFixed(1)}  kills ${r.kills.toFixed(0)}  dry ${(r.dry * 100).toFixed(0)}%  pistol ${(r.pistol * 100).toFixed(0)}%  hurt/min ${r.hurt.toFixed(0)}  weapons ${r.weapons.toFixed(1)} top ${r.top.toFixed(1)}`,
    );
    console.log(
      `   stoves lit ${r.litAt.map(sec).join(" ")}  served ${r.servedAt.map(sec).join(" ")} (${r.dished.map((v) => (v * 100).toFixed(0) + "%").join(" ")})  scorched ${r.scorched == null ? "-" : (r.scorched * 100).toFixed(0) + "%"}  elites ${r.elites.toFixed(1)}`,
    );
    console.log(
      `   boss seen ${(r.bossReached * 100).toFixed(0)}% @${sec(r.bossAt)}s after ${r.bossLevels ?? "-"} level-ups, fight ${sec(r.bossSeconds)}s, clear @${sec(r.clearAt)}s`,
    );
    console.log("   alive", r.curve.alive.map((v) => v.toFixed(0)).join(" "));
    console.log("   levelAt", r.levelAt.join(" "));
  }
  console.log(`${n} runs each, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
