// Every number of the run (the set meal), and nothing else: no imports, no game objects.
// run.js plays by this table; the weapon lab (arsenal/) reads the same table, so the
// seasonings it lets you try on the firing range are the game's, level for level.
//
// The four things decided by the player are not to be tuned away: ammunition has to be picked
// up, it comes in four kinds, any number of weapons can be carried, and a red envelope raises
// only the weapon in hand.

export const RUN = {
  bossAt: 540,
  // Courses of the meal. Between one entry and the next the numbers slide from the first
  // value to the second: alive = how many may be up at once, every = seconds between spawns,
  // runner = share of walkers that sprint, brute = share of heavies, bloater = share that burst.
  // quiet: what rises does not come for the player; it wanders the street (ZOMBIES.wander)
  // until someone comes close, hurts it or fires nearby.
  // pack = share of spawns that are a pack of the fast dead (RUN.pack) instead of one walker.
  stages: [
    {
      id: "starter",
      at: 0,
      quiet: true,
      alive: [9, 13],
      every: [2.2, 1.6],
      runner: [0.2, 0.3],
      brute: 0,
      bloater: 0,
    },
    {
      id: "stirfry",
      at: 120,
      alive: [14, 19],
      every: [1.5, 1.05],
      runner: [0.3, 0.5],
      brute: 0.06,
      bloater: [0.03, 0.07],
      pack: [0.01, 0.025],
    },
    {
      id: "mains",
      at: 270,
      alive: [20, 25],
      every: [0.95, 0.72],
      runner: [0.5, 0.6],
      brute: 0.1,
      bloater: 0.08,
      pack: 0.03,
    },
    {
      id: "highheat",
      at: 420,
      alive: [25, 28],
      every: [0.65, 0.5],
      runner: [0.65, 0.75],
      brute: 0.14,
      bloater: 0.1,
      pack: 0.04,
    },
    {
      id: "signature",
      at: 540,
      alive: [20, 20],
      every: [0.85, 0.85],
      runner: [0.7, 0.7],
      brute: 0.06,
      bloater: 0.08,
      pack: 0.025,
    },
  ],
  // The street uses the course values without place multipliers.
  places: { street: {} },
  difficulty: {
    // bossHit: how hard the house special claws, on top of boss.damage. On mild it is the
    // climax of a run that should usually be finished, not the wall it ends against.
    standard: {
      every: 1.18,
      alive: 0.88,
      bossHp: 8000,
      bossHit: 0.75,
      bossSpeed: 0.85,
    },
    hard: { every: 1, alive: 1, bossHp: 11000, bossHit: 1, bossSpeed: 1 },
    brutal: {
      every: 0.86,
      alive: 1.1,
      bossHp: 15000,
      bossHit: 1.15,
      bossSpeed: 1.05,
    },
  },
  bruteCap: 3, // ordinary heavies up at once; the rest of the pool is kept for elites and the boss
  opening: 16, // wanderers already about the street when the run starts
  // Wounds do not close by themselves in a run: health comes from what is picked up and
  // what is chosen.
  heal: {
    regen: 0, // share of the game's own regeneration that is kept
    food: 25, // health in one dropped takeaway box
    drop: 0.08, // chance a walker leaves one
    bruteDrop: 0.5, // a heavy
    elite: 3, // boxes an elite leaves, always
    hurtBoost: 2.5, // below `lowAt` of full health a drop is this much more likely
    lowAt: 0.5,
    life: 45, // seconds a box lies there
  },
  xp: {
    walker: 1,
    bloater: 2,
    brute: 5,
    elite: 20,
    need: (level) => 5 + 8 * level,
  },
  // how slow the street runs while tickets are up: all but stopped, never a full stop.
  // There is no time limit; the mouse is let go so a ticket can be clicked.
  pick: {
    slow: 0.05,
    guard: 0.35,
    hold: 0.25,
    gap: 0.5,
    start: { slow: 0.02 }, // choosing the first weapon
    fork: { slow: 0.04 }, // choosing a weapon's form
  },
  // the weapon wheel: how slow the street runs while it is open, and how long the swap key
  // (or the touch swap button) is held before it opens; a shorter press is a quick swap
  wheel: { slow: 0.15, hold: 0.22, touchHold: 0.32 },
  // level-ups (counted from 1) whose three tickets are all weapons, and the chance that
  // one of the three is a weapon on any other level-up
  weaponPicks: [2, 5, 9, 13],
  weaponChance: 0.3,
  ammo: {
    drop: 0.15, // chance a walker leaves a pack; its kind is rolled evenly over the four
    bruteDrop: 0.5, // heavies; theirs is bullets more often than not
    bruteBullets: 0.6,
    copDrop: 0.3, // uniformed walkers carry heavy rounds
    needBoost: 1.6, // the kind the weapon in hand is short of is this much more likely
    lowAt: 0.3, // "short of" = pool below this share of its cap
    packLife: 40,
    reach: 1.6,
    pull: 2.8, // packs slide towards the player from this far
    caches: 2, // crates stocked per kind of ammunition
    cacheGive: 0.5, // share of the cap one crate hands over
    cacheEvery: 60,
    cacheReach: 1.9,
    cacheSpot: 15, // seeing a stocked crate from this close puts it on the compass
    cacheMark: 16, // a known crate is marked on screen only from this close
  },
  cases: { count: 5, reach: 1.7, spot: 12, apart: 14 },
  // The first one comes while every weapon is still at level one, so it is the weakest:
  // a heavy's claw and a little slower than one. Each one after it has hpGrow more health
  // (in heavies' worth) and hits dmgGrow harder.
  // Who plays whom. The names are the bodies of zombietune.js (EXTRA_BODIES); scale replaces
  // the part's own scale, because these models are not the size of the soldier that played
  // every part before. They are fetched when a run starts (on the low preset one at a time;
  // how large their maps are kept is in BODY_TEX); until a part's body is there it is played by
  // the usual body with its coloured glow, as it always was.
  bodies: {
    glow: 0.1, // share of a part's coloured glow that is kept on its own body
    boss: { body: "mutant", scale: 1.3 },
    elite: { body: "skeletonzombie", scale: 1.12 },
    hunter: { body: "yaku", scale: 0.9 },
    bloater: { body: "parasite", scale: 1.05 },
    pack: { body: "prisoner" },
  },
  // A pack: a handful of the fast dead rising at one spot and coming on together. Each is
  // easy to put down and quicker than a runner; the answer is something that hits several.
  pack: { size: 3, hp: 0.55, speed: 1.12, spread: 1.6 },
  elite: {
    // Elites come in turn as these kinds; the numbers multiply the elite's own below.
    // "hunter": less to it, but it runs a person down and hits harder.
    kinds: [
      { id: "elite" },
      { id: "hunter", hp: 0.5, speed: 1.3, damage: 1.15 },
    ],
    first: 110,
    every: 65,
    hp: 3,
    hpGrow: 0.4,
    scale: 1.25,
    damage: 1,
    dmgGrow: 0.06,
    speed: 0.92,
    glow: [0.85, 0.16, 0.03, 1],
    packs: 2,
  },
  boss: {
    heal: true, // full health when it arrives
    scale: 1.6,
    damage: 1.6,
    speed: 0.92,
    glow: [1.1, 0.3, 0.05, 1],
    summonEvery: 18,
    summon: 5,
  },
  bloater: {
    hp: 0.8,
    scale: 1.08,
    glow: [0.04, 0.34, 0.07, 1],
    radius: 3.6,
    damage: 85, // to the dead around it, less with distance
    // To the player at its centre, less with distance (about half of this at arm's length).
    // Late on one arrives every few seconds: it has to sting, not to be the thing that
    // ends the run.
    hurt: 22,
  },
  // The three street stoves. Lighting one puts a dish on: wok hei fills the street and the
  // dead come for it until the dish is served. All three can be lit from the start, in any
  // order; the later the course a dish is started in, the larger the crowd it draws and the
  // better it is.
  stove: {
    seconds: 40, // of cooking, counted only while the player stays within `radius` of it
    radius: 13,
    every: 0.5, // while a dish is on: the spawn interval is multiplied by this,
    alive: 6, // this many more may be up at once,
    xp: 2, // and a kill pays this many times the wok hei
    hotter: { every: 0.85, alive: 3 }, // and again for every stove lit before this one
    eliteFrom: 1, // from this course on (0 is the first) an elite turns up half-way through
    eliteHold: 45, // the next timed elite is put off at least this long after it
    // What every dish gives. Lists are by the course the dish was started in.
    heal: [0.3, 0.4, 0.5, 0.6], // share of full health
    envelopes: 1,
    // The three specials: one to a stove, dealt at random every run and not shown beforehand.
    soup: { health: [10, 15, 20, 25] }, // health back to full, and this much more of it
    stock: { cap: [0.1, 0.15, 0.2, 0.25] }, // every pool filled, and this much more room
    lucky: { envelopes: [1, 1, 2, 2] }, // this many more red envelopes
  },
  dishes: ["soup", "stock", "lucky"],
  burst: { radius: 3.2, damage: 70, delay: 0.14, perFrame: 3 },
  // Seasonings: three levels each. per = what one level adds.
  spices: [
    { id: "fire", per: 0.15 }, // damage
    { id: "hands", per: 0.12 }, // rate of fire
    { id: "portion", per: 0.3 }, // ammunition carried
    { id: "toss", per: 0.22 }, // reload speed
    { id: "soup", per: 25 }, // health
    { id: "runner", per: 0.07 }, // movement
    { id: "burst", per: [0.12, 0.22, 0.32] }, // chance a kill blows up
    { id: "takeout", per: 0.3 }, // drops and pickup reach
    // the four elements: every so many hits (by level) the target takes the status
    { id: "chili", element: "fire", every: [6, 4, 3] },
    { id: "pepper", element: "shock", every: [7, 5, 4] },
    { id: "vinegar", element: "venom", every: [5, 4, 3] },
    { id: "rice", element: "seal", chance: [0.4, 0.7, 1] }, // on a hit to the head
  ],
  spiceMax: 3,
  // Weapons on the menu from the first visit, and what puts the others on it. p is the
  // profile kept between runs: { kills, runs, bossSeen, clears, hardClears, allSirens }.
  unlocks: {
    start: ["rifle", "shotgun", "smg", "nailgun", "flamer", "revolver"],
    rules: [
      { id: "lever", when: (p) => p.kills >= 250 },
      { id: "talisman", when: (p) => p.kills >= 600 },
      { id: "firework", when: (p) => p.bossSeen >= 1 },
      { id: "arc", when: (p) => p.clears >= 1 },
      { id: "crossbow", when: (p) => p.allSirens >= 1 },
      { id: "coinsword", when: (p) => p.kills >= 1500 },
      { id: "guandao", when: (p) => p.hardClears >= 1 },
    ],
  },
};

/** Total effect of `level` levels of a seasoning (0 when it has no `per`). */
export function spiceValue(id, level = 0) {
  const def = RUN.spices.find((s) => s.id === id);
  if (!def || !level || def.per === undefined) return 0;
  return Array.isArray(def.per) ? def.per[level - 1] : def.per * level;
}

/**
 * The numbers a seasoning's description is filled in with when it goes from level - 1 to
 * level. n: what this level adds, t: the total afterwards (percent unless it is flat health),
 * e: every how many hits an element lands, c: its chance in percent.
 */
export function spiceVars(id, level) {
  const s = RUN.spices.find((x) => x.id === id);
  const gain = spiceValue(id, level) - spiceValue(id, level - 1);
  return {
    n: Math.round(gain < 2 ? gain * 100 : gain),
    t: Math.round(spiceValue(id, level) * 100),
    e: s.every ? s.every[level - 1] : 0,
    c: s.chance ? Math.round(s.chance[level - 1] * 100) : 0,
  };
}

/**
 * What the seasonings do to every weapon, as multipliers: { damage, rate, reload }.
 * spice: { id: level }. (The weapon controller takes this as it is: combat.setMods.)
 */
export function weaponMods(spice = {}) {
  return {
    damage: 1 + spiceValue("fire", spice.fire),
    rate: 1 + spiceValue("hands", spice.hands),
    reload: 1 + spiceValue("toss", spice.toss),
  };
}

/**
 * The elemental seasonings in force, in the form the status rules take
 * (arsenal/src/combat/status.js, setInfusions): [{ element, every } | { element, chance }].
 */
export function infusionsOf(spice = {}) {
  const out = [];
  for (const s of RUN.spices) {
    const lv = spice[s.id] || 0;
    if (!lv || !s.element) continue;
    out.push(
      s.every
        ? { element: s.element, every: s.every[lv - 1] }
        : { element: s.element, chance: s.chance[lv - 1] },
    );
  }
  return out;
}
