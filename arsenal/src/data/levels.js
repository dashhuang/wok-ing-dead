// The five levels a weapon climbs in one run, and what each multiplies its damage by.
// On its own (apart from the long weapon descriptions) because the game's loadout reads it
// before the rest of the arsenal is loaded; data/weapons.js hands it on as LEVELS.
// In a run a red envelope raises the weapon in hand one level. Level 3 is the fork; level 5
// unlocks the capstone of the chosen branch.
export const LEVELS = [
  { lv: 1, name: "凡品", dmg: 1.0, note: "拿到手时的状态" },
  { lv: 2, name: "良品", dmg: 1.2, note: "伤害提升" },
  { lv: 3, name: "岔路", dmg: 1.35, note: "二选一：甲 / 乙，外形和打法改变" },
  { lv: 4, name: "上品", dmg: 1.6, note: "伤害提升" },
  { lv: 5, name: "极", dmg: 1.85, note: "所选岔路的终极词条，武器开光发亮" },
];
