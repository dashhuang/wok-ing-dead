// The rules of the run that need nothing but numbers: where on the timeline a moment is,
// what rises next, what a kill pays. No imports beyond the table, no game objects.
// run.js plays by these and the balance tools (scripts/balance/) simulate with them, so a
// simulated run and a played one cannot follow different rules.
import { RUN } from "./runtune.js";

const lerp = (a, b, t) => a + (b - a) * t;
const pair = (v, t) => (Array.isArray(v) ? lerp(v[0], v[1], t) : v);

/**
 * The course at second t of the meal's clock (see clockStep), with its sliding numbers worked out:
 * { id, quiet, alive, every, runner, brute, bloater, pack }. place: an entry of RUN.places.
 */
export function stageAt(t, place = {}) {
  const st = RUN.stages;
  let i = st.length - 1;
  while (i > 0 && t < st[i].at) i--;
  const a = st[i];
  const end = i + 1 < st.length ? st[i + 1].at : a.at + 60;
  const k = Math.max(0, Math.min(1, (t - a.at) / Math.max(1, end - a.at)));
  const plus = (v, add) => (v > 0 ? v + (add || 0) : v);
  return {
    id: a.id,
    quiet: !!a.quiet,
    alive: pair(a.alive, k) * (place.alive || 1),
    every: pair(a.every, k) * (place.every || 1),
    runner: Math.min(0.9, plus(pair(a.runner, k), place.runner)),
    brute: plus(pair(a.brute, k), place.brute),
    bloater: plus(pair(a.bloater || 0, k), place.bloater),
    pack: pair(a.pack || 0, k),
  };
}

/**
 * How large a crowd the pool of bodies carries. The stage numbers are written for the
 * phone-sized pool of 25 walkers; a larger pool (desktop) carries proportionally more.
 * Returns { crowd, room }: the multiplier on `alive`, and the most that can be up at all.
 */
export function crowdOf(walkers) {
  const n = walkers || 25;
  return {
    crowd: 1 + Math.max(0, n / 25 - 1) * 0.6,
    room: n + RUN.bruteCap - 1,
  };
}

/**
 * The pace of spawning at this moment: { every, cap }. stage: from stageAt; diff: an entry of
 * RUN.difficulty; cooking: a dish is on a stove and still drawing the dead (dishHot); heat:
 * how many stoves were lit before that one; step: which toss the dish is at (its `k`: the
 * crowd swells with it, RUN.stove.swell; left out, the full crowd); crowd, room: from crowdOf.
 */
export function spawnPace(
  stage,
  diff,
  {
    cooking = false,
    heat = 0,
    step = Infinity,
    crowd = 1,
    room = Infinity,
  } = {},
) {
  let every = stage.every * diff.every;
  let cap = Math.round(stage.alive * diff.alive * crowd);
  if (cooking) {
    const S = RUN.stove;
    const swell = S.swell[Math.max(0, Math.min(step, S.swell.length - 1))];
    every *= (S.every * Math.pow(S.hotter.every, heat)) / swell;
    cap = Math.round((cap + S.alive + S.hotter.alive * heat) * swell);
  }
  return { every, cap: Math.min(cap, room) };
}

/**
 * What rises next: "brute", "bloater", "pack" (RUN.pack.size of the fast dead at once) or
 * "walker". roll: a random number in [0, 1);
 * brutesUp: ordinary heavies standing now.
 */
export function spawnKind(stage, roll, brutesUp) {
  if (roll < stage.brute && brutesUp < RUN.bruteCap) return "brute";
  if (roll < stage.brute + stage.bloater) return "bloater";
  if (roll < stage.brute + stage.bloater + (stage.pack || 0)) return "pack";
  return "walker";
}

/** Seconds until the next spawn, given the pace and a random number in [0, 1). */
export const spawnGap = (every, roll) => every * (0.75 + roll * 0.5);

/**
 * Wok hei a kill pays. rank: "", "elite", "boss" or "bloater"; type: "walker" or "brute";
 * cooking: a dish is on a stove.
 */
export function killXp(rank, type, cooking = false) {
  const X = RUN.xp;
  const xp =
    rank === "boss"
      ? 0
      : rank === "elite"
        ? X.elite
        : rank === "bloater"
          ? X.bloater
          : type === "brute"
            ? X.brute
            : X.walker;
  return cooking ? xp * RUN.stove.xp : xp;
}

/**
 * Add wok hei to { xp, level }; returns how many levels that came to (the state is changed
 * in place).
 */
export function gainXp(state, n) {
  let ups = 0;
  state.xp += n;
  while (state.xp >= RUN.xp.need(state.level)) {
    state.xp -= RUN.xp.need(state.level);
    state.level++;
    ups++;
  }
  return ups;
}

/**
 * Weights of the four kinds of ammunition for a dropped pack, in the order of `kinds`.
 * need: the kind the weapon in hand draws on (or null); short: that pool is running low.
 */
export function packWeights(kinds, need, short) {
  return kinds.map((t) => (t === need && short ? RUN.ammo.needBoost : 1));
}

/**
 * Is a timed elite to come now? t: the street's time; eliteAt: when the next is due;
 * cooking: a dish is on a stove (it brings its own); served: dishes packed; idle: timed
 * elites that have come since the last stove was lit.
 */
export function timedElite({ t, eliteAt, cooking, served, idle }) {
  return (
    !cooking && served < stoveCount() && idle < RUN.elite.idle && t >= eliteAt
  );
}

/** Which kind the n-th elite (from 0) is: an entry of RUN.elite.kinds, taken in turn. */
export function eliteKind(n) {
  const kinds = RUN.elite.kinds || [{ id: "elite" }];
  return kinds[n % kinds.length];
}

/**
 * The n-th elite (from 0): its health (in heavies' worth), damage and speed multipliers, and
 * which kind it is (`kind`, an id of RUN.elite.kinds).
 */
export function eliteStats(n) {
  const E = RUN.elite;
  const K = eliteKind(n);
  return {
    kind: K.id,
    hpMul: (E.hp + E.hpGrow * n) * (K.hp || 1),
    dmgMul: (E.damage + (E.dmgGrow || 0) * n) * (K.damage || 1),
    speedMul: (E.speed || 1) * (K.speed || 1),
  };
}

/**
 * The chance a kill leaves a box of food. type: "walker" or "brute"; health: the player's,
 * as a share of full; boost: the multiplier of the "takeout" seasoning.
 */
export function foodChance(type, health, boost = 1) {
  const H = RUN.heal;
  const base = type === "brute" ? H.bruteDrop : H.drop;
  return base * boost * (health < H.lowAt ? H.hurtBoost : 1);
}

/** Which course second t of the meal's clock falls in, counted from 0 (the house special's own is the last). */
export function courseAt(t) {
  const st = RUN.stages;
  let i = st.length - 1;
  while (i > 0 && t < st[i].at) i--;
  return i;
}

// ---------- the meal's clock
// The courses are read at this clock, not at the street's. Every stove lit begins the next
// course; between stoves the clock only simmers, and it never runs into a course whose
// stove has not been lit. The third dish packed puts it at the house special.

/** How many stoves a run has: every course between the first and the last begins with one. */
export const stoveCount = () => RUN.stages.length - 2;

/**
 * The clock dt seconds on. lit: stoves lit so far; served: dishes packed; cooking: a dish is
 * on a stove.
 */
export function clockStep(
  clock,
  dt,
  { lit = 0, served = 0, cooking = false } = {},
) {
  const st = RUN.stages;
  const last = st.length - 1;
  if (served >= stoveCount()) return Math.max(clock, st[last].at) + dt;
  const from = st[Math.min(lit, last - 1)].at;
  const until = st[Math.min(lit + 1, last)].at - 0.01;
  return Math.min(
    until,
    Math.max(clock, from) + dt * (cooking ? 1 : RUN.simmer),
  );
}

// ---------- a dish on a stove
// Three tosses of the wok, the dish frying by itself on the stove after each, then packing.
// Nothing ties the cook to the stove while it fries; what the cook must do is come back when
// it is time. The phases, in order:
//   "toss"  the wok is in the cook's hands; once tossed it has to be set down on its stove
//   "fry"   it is back on the fire and fries by itself, wherever the cook is
//   "due"   it wants its next toss: the cook has to come back and take the wok up
//   "ready" three tosses done and fried: it waits to be packed
//   "pack"  being packed            "done" served
// Left waiting ("due", "ready") longer than RUN.stove.burn the dish catches: one grade worse
// for every time that happens. Left RUN.stove.char longer still it is charred: there is
// nothing more to do to it but pack it, and it pays nothing (it still counts as a dish
// served, or a run could never end).
// dishStep moves it on and says what happened; taking the wok up and starting to pack are
// the cook's to do (dishTake, dishPack).

/** A dish just put on. n: which stove of the run this is (0 the first). It starts in hand. */
export function newDish(n = 0) {
  return {
    n,
    phase: "toss",
    k: 0, // which toss (0-2) is in hand, frying or wanted
    t: 0, // seconds into the phase
    wait: 0, // seconds it has waited for the cook ("due", "ready")
    flips: 0, // flips made in this toss
    late: 0, // times it was left to catch
    caught: false, // it has caught during this wait
    charred: false,
  };
}

/** The cook takes the wok up for the toss that is due. */
export function dishTake(c) {
  if (c.phase !== "due") return false;
  c.phase = "toss";
  c.t = 0;
  c.flips = 0;
  return true;
}

/** The cook starts packing a finished (or charred) dish. */
export function dishPack(c) {
  if (c.phase !== "ready") return false;
  c.phase = "pack";
  c.t = 0;
  return true;
}

/** The wok has had its toss and waits to be set down on its stove. */
export const dishTossed = (c) =>
  c.phase === "toss" && c.t >= RUN.stove.toss.seconds;

/** The dish draws the dead (the stove's extra crowd): until its last fry is over. */
export const dishHot = (c) =>
  !!c && (c.phase === "due" || c.phase === "toss" || c.phase === "fry");

/**
 * Seconds a waiting dish has left: until it catches, or once it has, until it is charred.
 * null when it is not waiting, or has nothing left to lose.
 */
export function dishLeft(c) {
  const K = RUN.stove;
  if ((c.phase !== "due" && c.phase !== "ready") || c.charred) return null;
  return c.caught ? K.burn + K.char - c.wait : K.burn - c.wait;
}

/**
 * One step of a dish. home: the cook is within RUN.stove.toss.reach of the stove (where a
 * tossed wok is set down). Returns what happened, in order:
 *   "flip"      the wok was flipped (fire goes out in front of the cook)
 *   "tossed"    the toss is done: the wok can go back
 *   "down"      it is back on the stove and fries; with it "packs" and "elite" when that
 *               stretch opens with them
 *   "due"       it has fried: the next toss is wanted
 *   "ready"     the last fry is over: it can be packed
 *   "scorched"  it waited too long and caught
 *   "charred"   and longer still: it is charcoal now, to be packed as it is
 *   "served"    packed
 */
export function dishStep(c, dt, { home = true } = {}) {
  const K = RUN.stove;
  const ev = [];
  if (c.phase === "due" || c.phase === "ready") {
    if (c.charred) return ev;
    c.wait += dt;
    if (!c.caught && c.wait >= K.burn) {
      c.caught = true;
      c.late++;
      ev.push("scorched");
    }
    if (c.wait >= K.burn + K.char) {
      c.charred = true;
      ev.push("charred");
      // (nothing is left to toss: what is in the wok can only be packed)
      if (c.phase === "due") {
        c.phase = "ready";
        c.k = K.fry.length;
      }
    }
  } else if (c.phase === "toss") {
    const T = K.toss;
    if (c.t < T.seconds) {
      c.t = Math.min(T.seconds, c.t + dt);
      // each flip lands a little before the middle of its share of the toss
      const due = Math.min(
        T.flips,
        Math.max(0, Math.floor((c.t / T.seconds) * T.flips + 0.55)),
      );
      while (c.flips < due) {
        c.flips++;
        ev.push("flip");
      }
      if (c.t >= T.seconds) ev.push("tossed");
    }
    if (c.t >= T.seconds && home) {
      c.phase = "fry";
      c.t = 0;
      ev.push("down");
      if (K.packs[c.k]) ev.push("packs");
      if (K.elite[c.k]) ev.push("elite");
    }
  } else if (c.phase === "fry") {
    c.t += dt;
    if (c.t >= K.fry[c.k]) {
      c.k++;
      c.t = 0;
      c.wait = 0;
      c.caught = false;
      if (c.k < K.fry.length) {
        c.phase = "due";
        ev.push("due");
      } else {
        c.phase = "ready";
        ev.push("ready");
      }
    }
  } else if (c.phase === "pack") {
    c.t += dt;
    if (c.t >= K.pack) {
      c.phase = "done";
      ev.push("served");
    }
  }
  return ev;
}

/** The grade of a dish (0-3): which stove it is, one better, less one for every time it caught. */
export const dishGrade = (c) =>
  Math.max(0, Math.min(RUN.stove.heal.length - 1, c.n + 1 - c.late));

/**
 * What a dish gives when it is packed. dish: one of RUN.dishes; grade: from dishGrade;
 * charred: it was left until nothing of it was worth having. Returns { heal (share of full
 * health), envelopes, health (added to the maximum), cap (added to the room in every pool,
 * as a share), refill, full }.
 */
export function dishOf(dish, grade, charred = false) {
  const S = RUN.stove;
  const at = (list) => list[Math.max(0, Math.min(grade, list.length - 1))];
  const out = {
    heal: at(S.heal),
    envelopes: S.envelopes,
    health: 0,
    cap: 0,
    refill: false,
    full: false,
  };
  if (charred) return { ...out, heal: 0, envelopes: 0 };
  if (dish === "soup") {
    out.full = true;
    out.health = at(S.soup.health);
  } else if (dish === "stock") {
    out.refill = true;
    out.cap = at(S.stock.cap);
  } else if (dish === "lucky") out.envelopes += at(S.lucky.envelopes);
  return out;
}
