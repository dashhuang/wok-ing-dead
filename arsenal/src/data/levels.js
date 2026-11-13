// The five levels a weapon climbs in one run, and what each multiplies its damage by.
// On its own (apart from the long weapon descriptions) because the game's loadout reads it
// before the rest of the arsenal is loaded; data/weapons.js hands it on as LEVELS.
// In a run a red envelope raises the weapon in hand one level. Level 3 is the fork; level 5
// unlocks the capstone of the chosen branch.
//   dmg    what a level multiplies damage by
//   bare   the same for a weapon with no forks (the game's own carbine and sidearm): its levels
//          three and five bring no new form, so the level itself is worth that much more. Set so
//          that they grow in the test as much as a fork does (docs/balance.md, 武器的统一标准).
export const LEVELS = [
  { lv: 1, name: "凡品", dmg: 1.0, bare: 1.0, note: "拿到手时的状态" },
  { lv: 2, name: "良品", dmg: 1.2, bare: 1.2, note: "伤害提升" },
  {
    lv: 3,
    name: "岔路",
    dmg: 1.35,
    bare: 1.7,
    note: "二选一：甲 / 乙，外形和打法改变",
  },
  { lv: 4, name: "上品", dmg: 1.6, bare: 2.15, note: "伤害提升" },
  {
    lv: 5,
    name: "极",
    dmg: 1.85,
    bare: 2.6,
    note: "所选岔路的终极词条，武器开光发亮",
  },
];
/** What a level multiplies damage by: `forkless` for a weapon that never forks. */
export const levelMul = (level, forkless = false) =>
  LEVELS[level - 1][forkless ? "bare" : "dmg"];
