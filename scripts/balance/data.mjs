// The tables the balance tools read, and the weapon models built from them.
//
// Everything that can be read from the game's own data is read from it (runtune.js,
// zombietune.js, loadout.js, the arsenal's weapons and behaviours, the lab's measured table).
// What cannot is written once here, each with where it comes from, and the report lists it.
import fs from "node:fs";
import { WEAPONS, EXISTING, LEVELS } from "../../arsenal/src/data/weapons.js";
import { BEHAVIOURS } from "../../arsenal/src/combat/behaviours.js";
import { STATUS } from "../../arsenal/src/data/status.js";
import { RUN, spiceValue } from "../../src/chinatown/runtune.js";
import { ZOMBIES } from "../../src/chinatown/zombietune.js";
import {
  AMMO,
  AMMO_TYPES,
  ARMS,
  ammoPer,
} from "../../src/chinatown/loadout.js";

export { RUN, ZOMBIES, AMMO, AMMO_TYPES, ARMS, LEVELS, STATUS, spiceValue };
export { ammoPer };

// ---------- numbers that live in src/game.js (the unpacked original), copied by hand
/** The player on mild ("standard" has no overrides in the game's difficulty table). */
export const PLAYER = {
  health: 100,
  regenDelay: 4, // seconds without a hit before health comes back
  regenRate: 25, // health per second once it does
  walk: 3.8,
  sprint: 6.4,
};
/** Damage multiplier of a hit to the head (the game's "weak" part; combat.js uses the same). */
export const HEAD = 2.2;
/** Length of the swing clip in seconds (public/assets/zombies/clip_attack.glb). */
export const ATTACK_CLIP = 2.625;
/** Uniformed walkers (they carry heavy rounds) as a share of all walkers, from the pool. */
export const COP_SHARE =
  ZOMBIES.pool.cop /
  (ZOMBIES.pool.romero + ZOMBIES.pool.girl + ZOMBIES.pool.cop);
/** Walkers a pool keeps ready: the phone-sized pool and the desktop one. */
export const POOL = {
  phone: ZOMBIES.pool.romero + ZOMBIES.pool.girl + ZOMBIES.pool.cop,
  desktop:
    ZOMBIES.poolLarge.romero + ZOMBIES.poolLarge.girl + ZOMBIES.poolLarge.cop,
};
// the game's own two guns: reload is the empty-magazine time in game.js; a hand does not
// pull a semi-automatic trigger at the pistol's full 420 rpm
const STOCK = {
  rifle: { reload: 2.72, auto: true },
  pistol: { reload: 1.9, handRpm: 300 },
};

// ---------- how a weapon reaches more than one of the dead (assumptions of the model)
// reach: how far away the bot opens fire (metres); more: how many others one shot or tick can
// also hurt, and what share of the damage they take; precise: aimed at the head.
const SHAPE = {
  shotgun: { reach: 14 },
  smg: { reach: 40 },
  revolver: { reach: 60, precise: true },
  lever: { reach: 60, precise: true, more: 1, share: 1 },
  nailgun: { reach: 50 },
  flamer: { reach: 8.5, more: 3, share: 0.7 },
  firework: { reach: 40 },
  arc: { reach: 19, more: 2, share: 0.6 },
  crossbow: { reach: 55, precise: true },
  talisman: { reach: 38 },
  coinsword: { reach: 2.9, more: 1, share: 1 },
  guandao: { reach: 3.7, more: 2, share: 1 },
  rifle: { reach: 55 },
  pistol: { reach: 40 },
};

/** The lab's measured table: how each form did against the firing range's horde. */
export const MEASURED = JSON.parse(
  fs.readFileSync(
    new URL("../../arsenal/scripts/balance.json", import.meta.url),
    "utf8",
  ),
);
const measured = (id, b, lv) =>
  MEASURED.rows.find((r) => r.id === id && r.b === b && r.lv === lv);

function baseModel(id) {
  const w =
    WEAPONS.find((x) => x.id === id) || EXISTING.find((x) => x.id === id);
  if (!w) throw new Error("no such weapon: " + id);
  const f = w.fire;
  const shape = SHAPE[id] || {};
  const beh = BEHAVIOURS[id];
  const spec = beh ? beh.spec("base", 1) : null;
  const m = {
    id,
    ammo: ARMS[id].ammo,
    reach: shape.reach || 40,
    precise: !!shape.precise,
    more: shape.more || 0,
    share: shape.share || 0,
    headMul: f.head || HEAD,
    knock: f.knock || 0, // how far a hit throws a walker back, in the weapon's own units
    measured: !!measured(id, "base", 1),
  };
  if (!spec) {
    // rifle, pistol: the game's own rigs
    const rpm = Math.min(f.rpm, STOCK[id].handRpm || f.rpm);
    return {
      ...m,
      kind: "gun",
      damage: f.damage,
      rate: rpm / 60,
      mag: w.mag,
      reload: STOCK[id].reload,
    };
  }
  if (spec.kind === "stream")
    return {
      ...m,
      kind: "stream",
      damage: f.damage,
      rate: spec.tickRate,
      mag: spec.mag,
      drain: spec.drain,
      reload: spec.reload,
    };
  if (spec.kind === "melee")
    return {
      ...m,
      kind: "melee",
      damage: f.damage,
      rate: 1 / spec.swingTime,
      mag: Infinity,
      reload: 0,
    };
  return {
    ...m,
    kind: "gun",
    damage: f.damage,
    pellets: f.pellets || 0,
    spread: f.spread || 0,
    splash: f.splash ? { damage: f.splash, radius: f.radius } : null,
    rate: spec.rpm / 60,
    mag: spec.mag,
    reload: spec.reload || 0,
    regen: spec.regen || 0, // seconds for one round to come back by itself
  };
}

export const WEAPON_IDS = Object.keys(ARMS);
const MODELS = Object.fromEntries(WEAPON_IDS.map((id) => [id, baseModel(id)]));
export const model = (id) => MODELS[id];

/**
 * How much more a form does than the weapon as picked up (base form, level 1), as a
 * multiplier on damage. Levels 3 and 5 are the lab's measurements of that form against the
 * horde, so a fork's change of mechanics counts for what it was measured to be worth; levels
 * 2 and 4 are the level table applied to the measurement below them. The game's own two guns
 * have no forks and no measurements: the level table alone.
 */
export function power(id, branch = "base", level = 1) {
  const lv = Math.max(1, Math.min(LEVELS.length, level));
  const table = LEVELS[lv - 1].dmg;
  const base = measured(id, "base", 1);
  if (!base || lv < 3) return table;
  const b = branch === "b" ? "b" : "a";
  const at3 = measured(id, b, 3);
  const at5 = measured(id, b, 5);
  if (!at3 || !at5) return table;
  if (lv === 3) return at3.dps / base.dps;
  if (lv === 4) return (at3.dps / base.dps) * (LEVELS[3].dmg / LEVELS[2].dmg);
  return at5.dps / base.dps;
}
/** The better fork of a weapon by the lab's level-five measurement ("a" when unmeasured). */
export function betterFork(id) {
  const a = measured(id, "a", 5);
  const b = measured(id, "b", 5);
  return a && b && b.dps > a.dps ? "b" : "a";
}
export const measuredRow = measured;

/** A zombie's numbers on mild: { hp, damage, speed, reach, swing, hitAt, cool: [a, b] }. */
export function zombieStats(type, runner) {
  const Z = ZOMBIES[type];
  const swing = ATTACK_CLIP / Z.attackRate;
  return {
    hp: Z.hp,
    damage: Z.damage,
    speed: runner ? Z.runSpeed : Z.walkSpeed,
    reach: Z.reach,
    swing,
    hitAt: swing * ZOMBIES.attackHitAt,
    cool: Z.cooldown,
    flinch: Z.flinch ? Z.flinch.body : 0,
  };
}
