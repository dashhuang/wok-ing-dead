// The numbers a weapon is described with must be the numbers it plays with. Most of what the
// lab and the game share is one piece of code and cannot drift; what is still written twice
// is checked here, and `npm run check` (and so CI) fails when the two copies disagree:
//
//   - data/weapons.js (the card, the design document) against behaviours.js (what fires):
//     rate of fire, magazine and reload time of every weapon's base form;
//   - the game's loadout (src/chinatown/loadout.js) against the arsenal: every weapon is in
//     both, and every form has a price in ammunition;
//   - the seasonings and kinds of ammunition the lab shows have names in the game's language pack.
//
//   node arsenal/scripts/check-data.mjs
import { WEAPONS, EXISTING, LEVELS } from "../src/data/weapons.js";
import { BEHAVIOURS } from "../src/combat/behaviours.js";
import { RUN } from "../../src/chinatown/runtune.js";
import { AMMO, ARMS, MAX_LEVEL, ammoPer } from "../../src/chinatown/loadout.js";
import ZH from "../../src/i18n/locales/zh-CN.js";

const problems = [];
const bad = (text) => problems.push(text);

for (const w of WEAPONS) {
  const beh = BEHAVIOURS[w.id];
  if (!beh) {
    bad(`${w.id}: in data/weapons.js but has no behaviour`);
    continue;
  }
  const spec = beh.spec("base", 1);
  const f = w.fire;
  if (spec.kind === "gun") {
    if (spec.rpm !== f.rpm)
      bad(
        `${w.id}: rate of fire is ${f.rpm} in data/weapons.js, ${spec.rpm} in behaviours.js`,
      );
    if (spec.mag !== w.mag)
      bad(
        `${w.id}: magazine is ${w.mag} in data/weapons.js, ${spec.mag} in behaviours.js`,
      );
  }
  if (spec.kind === "stream") {
    if (spec.mag !== w.mag)
      bad(
        `${w.id}: fuel is ${w.mag} in data/weapons.js, ${spec.mag} in behaviours.js`,
      );
    if (spec.tickRate !== f.tick)
      bad(
        `${w.id}: ticks per second are ${f.tick} in data/weapons.js, ${spec.tickRate} in behaviours.js`,
      );
  }
  // "换弹匣 1.6 秒": a reload time written into the description
  const said = /(\d+(?:\.\d+)?)\s*秒/.exec(w.reload || "");
  const real = spec.reload || spec.regen;
  if (said && real && Math.abs(+said[1] - real) > 1e-6)
    bad(
      `${w.id}: the description says ${said[1]} s ("${w.reload}"), behaviours.js says ${real}`,
    );
  if (!ARMS[w.id])
    bad(
      `${w.id}: not in ARMS (src/chinatown/loadout.js), so a run cannot carry it`,
    );
}
for (const [id, a] of Object.entries(ARMS)) {
  const known = a.own
    ? EXISTING.some((w) => w.id === id)
    : WEAPONS.some((w) => w.id === id);
  if (!known)
    bad(`${id}: in ARMS (src/chinatown/loadout.js) but not in data/weapons.js`);
  if (a.ammo && !AMMO[a.ammo])
    bad(`${id}: draws on "${a.ammo}", which is not in AMMO`);
  if (a.ammo)
    for (const b of ["base", "a", "b"])
      if (!(ammoPer(id, b, MAX_LEVEL) > 0))
        bad(`${id}: form ${b} has no price in ${a.ammo}`);
}
if (MAX_LEVEL !== LEVELS.length) bad("MAX_LEVEL is not the number of LEVELS");
for (const s of RUN.spices)
  for (const key of [`run.spice.${s.id}`, `run.spice.${s.id}.d`])
    if (!ZH[key])
      bad(`seasoning "${s.id}": no "${key}" in the zh-CN language pack`);
for (const t of Object.keys(AMMO))
  for (const key of [`run.ammo.${t}`, `run.ammo.${t}.s`])
    if (!ZH[key])
      bad(`ammunition "${t}": no "${key}" in the zh-CN language pack`);

if (problems.length) {
  console.error("weapon data out of step:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(
  `weapon data: ${WEAPONS.length} weapons, ${Object.keys(ARMS).length} in the loadout, ${RUN.spices.length} seasonings agree`,
);
