// The set meal on the firing range: the game's seasonings and its four kinds of ammunition,
// read from the game's own tables (src/chinatown/runtune.js and loadout.js) and applied
// through the same two doors the game uses — combat.setMods() and targets.setInfusions() —
// so a seasoning tried here is the seasoning as it plays in a run.
//
//   __lab.meal.set("chili", 2)        a seasoning at a level (0 takes it off)
//   __lab.meal.setAmmo("meal")        magazines draw on the run's pools ("free": from nowhere)
//   __lab.meal.refill()               fill the pools and forget what was used
// Address: ?spice=chili:2,fire:3&ammo=meal
import {
  RUN,
  spiceValue,
  spiceVars,
  weaponMods,
  infusionsOf,
} from "../../../src/chinatown/runtune.js";
import { AMMO, ARMS, ammoPer } from "../../../src/chinatown/loadout.js";

// What each seasoning acts on. The range has no health, no running about and nothing to pick
// up, so the last four cannot be tried here.
const ON_RANGE = [
  "fire",
  "hands",
  "toss",
  "portion",
  "chili",
  "pepper",
  "vinegar",
  "rice",
];
export const RANGE_SPICES = RUN.spices.filter((s) => ON_RANGE.includes(s.id));
export const OTHER_SPICES = RUN.spices.filter((s) => !ON_RANGE.includes(s.id));
export { RUN, AMMO, ARMS, ammoPer, spiceValue, spiceVars };

export function createMeal(lab) {
  const spice = {}; // id -> level
  const pool = {}; // kind of ammunition -> units left
  let ammo = "free";
  const cap = (type) =>
    Math.round(AMMO[type].cap * (1 + spiceValue("portion", spice.portion)));
  const fill = () => {
    for (const t of Object.keys(AMMO)) pool[t] = cap(t);
  };
  fill();
  const typeOf = (W) => (ARMS[W.id] ? ARMS[W.id].ammo : null);
  const perOf = (W) => ammoPer(W.id, W.branch, W.level);

  function apply() {
    const c = lab.combat;
    if (c) {
      c.setMods(weaponMods(spice));
      c.targets.setInfusions(infusionsOf(spice));
    }
    for (const t of Object.keys(AMMO)) pool[t] = Math.min(pool[t], cap(t));
    lab.emit();
  }

  const api = {
    spice,
    pool,
    get ammo() {
      return ammo;
    },
    level: (id) => spice[id] || 0,
    set(id, level) {
      if (!RUN.spices.some((s) => s.id === id)) return;
      const lv = Math.max(0, Math.min(RUN.spiceMax, level | 0));
      if (lv) spice[id] = lv;
      else delete spice[id];
      apply();
    },
    /** One level up; past the top it comes off again. */
    cycle(id) {
      api.set(id, api.level(id) >= RUN.spiceMax ? 0 : api.level(id) + 1);
    },
    clear() {
      for (const k of Object.keys(spice)) delete spice[k];
      apply();
    },
    setAmmo(mode) {
      ammo = mode === "meal" ? "meal" : "free";
      api.refill();
    },
    refill() {
      fill();
      lab.emit();
    },
    cap,
    /** The pool the weapon in hand draws on: { type, per, have, cap } or null. */
    of(W) {
      const type = W && typeOf(W);
      if (!type) return null;
      return { type, per: perOf(W), have: pool[type], cap: cap(type) };
    },
    // what the weapon controller asks when a magazine wants filling (the game answers the
    // same two questions from its loadout)
    supply: {
      can(W) {
        const per = perOf(W);
        return ammo !== "meal" || !per || pool[typeOf(W)] >= per;
      },
      take(W, want) {
        const per = perOf(W);
        if (ammo !== "meal" || !per) return want;
        const type = typeOf(W);
        const got = Math.min(want, pool[type] / per);
        pool[type] = Math.max(0, pool[type] - got * per);
        return got;
      },
    },
    apply,
  };
  return api;
}
