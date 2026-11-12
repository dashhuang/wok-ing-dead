// The rules of the run that need nothing but numbers: where on the timeline a moment is,
// what rises next, what a kill pays. No imports beyond the table, no game objects.
// run.js plays by these and the balance tools (scripts/balance/) simulate with them, so a
// simulated run and a played one cannot follow different rules.
import { RUN } from "./runtune.js";

const lerp = (a, b, t) => a + (b - a) * t;
const pair = (v, t) => (Array.isArray(v) ? lerp(v[0], v[1], t) : v);

/**
 * The course at second t of a run, with its sliding numbers worked out:
 * { id, quiet, alive, every, runner, brute, bloater }. place: an entry of RUN.places.
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
 * RUN.difficulty; surge: a siren's rush is on; crowd, room: from crowdOf.
 */
export function spawnPace(
  stage,
  diff,
  { surge = false, crowd = 1, room = Infinity } = {},
) {
  let every = stage.every * diff.every;
  let cap = Math.round(stage.alive * diff.alive * crowd);
  if (surge) {
    every *= RUN.surge.every;
    cap += RUN.surge.alive;
  }
  return { every, cap: Math.min(cap, room) };
}

/**
 * What rises next: "brute", "bloater" or "walker". roll: a random number in [0, 1);
 * brutesUp: ordinary heavies standing now.
 */
export function spawnKind(stage, roll, brutesUp) {
  if (roll < stage.brute && brutesUp < RUN.bruteCap) return "brute";
  if (roll < stage.brute + stage.bloater) return "bloater";
  return "walker";
}

/** Seconds until the next spawn, given the pace and a random number in [0, 1). */
export const spawnGap = (every, roll) => every * (0.75 + roll * 0.5);

/** Wok hei a kill pays. rank: "", "elite", "boss" or "bloater"; type: "walker" or "brute". */
export function killXp(rank, type, surge = false) {
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
  return surge ? xp * RUN.surge.xp : xp;
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

/** The elite's health (in heavies' worth) and damage multipliers for the n-th one (from 0). */
export function eliteStats(n) {
  const E = RUN.elite;
  return {
    hpMul: E.hp + E.hpGrow * n,
    dmgMul: E.damage + (E.dmgGrow || 0) * n,
    speedMul: E.speed || 1,
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
