// The firing range's horde, replayed on the model: the same sixteen zombies coming out of the
// dark a few at a time, a bot that stands still and fires at the nearest, sixty seconds on
// the clock (arsenal/tools/balance.mjs measures this with the real weapons and writes
// arsenal/scripts/balance.json).
//
// Dividing what was measured by what the model does gives each weapon's calibration factor:
// everything the model does not describe (flames that keep burning, arcs that jump, charms
// that pin) is in that one number. A factor far from 1 says the model misses something big
// about that weapon, and the report says so.
import { createFight, mulberry } from "./engine.mjs";
import {
  WEAPON_IDS,
  model,
  measuredRow,
  zombieStats,
  ZOMBIES,
  PLAYER,
} from "./data.mjs";

// the range's sixteen: thirteen walkers and three heavies (the fourth character is the soldier)
const HORDE = [0, 1, 2, 3, 1, 0, 2, 0, 3, 1, 2, 0, 2, 1, 0, 3].map((c) =>
  c === 3 ? "brute" : "walker",
);
// the bot is a machine: it does not miss a body, and finds the head with the weapons it aims
const BOT = { hit: 0.97, head: 0.04, precise: 22 };

/** One minute on the range with the base form. Returns { dps, kills, hurt } per the lab's units. */
export function rangeMinute(id, { seed = 1, seconds = 60, power = 1 } = {}) {
  const rng = mulberry(seed);
  const F = createFight({ rng, health: 1e9, regenDelay: 0, regenRate: 0 });
  F.wield({ id, power });
  const rise = (type, first, i) => {
    const runner = rng() < ZOMBIES[type].runnerShare;
    F.add({
      type,
      ...zombieStats(type, runner),
      d: 37 + rng() * 7,
      sleep: first
        ? i < 5
          ? i * 0.6
          : 2 + rng() * 7
        : 3.2 + 0.4 + rng() * 2.2,
    });
  };
  HORDE.forEach((type, i) => rise(type, true, i));
  F.onKill = (z) => rise(z.type, false, 0);
  const ctx = { skill: BOT, retreat: 0, dodge: 0 };
  const dt = 1 / 30;
  for (let t = 0; t < 5; t += dt) F.step(dt, ctx);
  const from = { ...F.stats };
  for (let t = 0; t < seconds; t += dt) F.step(dt, ctx);
  return {
    dps: (F.stats.raw - from.raw) / seconds,
    kills: ((F.stats.kills - from.kills) * 60) / seconds,
    hurt: ((F.stats.taken - from.taken) * 60) / seconds,
  };
}

const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;

/**
 * Calibration of every measured weapon: [{ id, model: { dps, kills }, measured: { dps, kills },
 * factor, after: { dps, kills } }]. `after` is the model run again with the factor applied.
 */
export function calibrate(seeds = 12) {
  const rows = [];
  for (const id of WEAPON_IDS) {
    const real = measuredRow(id, "base", 1);
    if (!real) continue;
    const run = (power) => {
      const r = [];
      for (let s = 1; s <= seeds; s++)
        r.push(rangeMinute(id, { seed: s, power }));
      return {
        dps: mean(r.map((x) => x.dps)),
        kills: mean(r.map((x) => x.kills)),
        hurt: mean(r.map((x) => x.hurt)),
      };
    };
    const raw = run(1);
    const factor = real.dps / raw.dps;
    rows.push({
      id,
      model: raw,
      measured: real,
      factor,
      after: run(factor),
    });
  }
  return rows;
}

let cached = null;
/** id → calibration factor (1 for the weapons the lab does not measure). */
export function factors() {
  if (!cached) {
    cached = Object.fromEntries(WEAPON_IDS.map((id) => [id, 1]));
    for (const r of calibrate()) cached[r.id] = r.factor;
  }
  return cached;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const r of calibrate())
    console.log(
      `${r.id.padEnd(10)} model ${r.model.dps.toFixed(0).padStart(4)} dps ${r.model.kills.toFixed(0).padStart(3)} kills | measured ${String(r.measured.dps).padStart(4)} dps ${String(r.measured.kills).padStart(3)} kills hurt ${String(r.measured.hurt).padStart(3)} | factor ${r.factor.toFixed(2)} | after ${r.after.dps.toFixed(0).padStart(4)} dps ${r.after.kills.toFixed(0).padStart(3)} kills hurt ${r.after.hurt.toFixed(0)}`,
    );
  void model;
  void PLAYER;
}
