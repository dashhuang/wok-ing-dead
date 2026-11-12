// The numbers of the dead: health, speed, how hard and how often they hit, how big a target
// they are. Nothing but data, so the weapon lab (arsenal/src/combat/targets.js) reads the very
// same table for the zombies on its firing range. zombies.js re-exports it as TUNE.
export const ZOMBIES = {
  walker: {
    hp: 55, // one rifle or pistol round to the head
    damage: 12,
    cooldown: [0.7, 1.4], // seconds between one swing ending and the next starting
    attackRate: 1.45, // how fast the swing clip plays
    walkSpeed: 1.25,
    runSpeed: 4.3,
    runnerShare: 0.3,
    reach: 1.55,
    scale: [0.95, 1.06],
    radius: 0.3, // how wide it is to blasts, cones and flames
    flinch: { body: 0.28, weak: 0.45 }, // seconds a hit knocks it off its stride
  },
  brute: {
    hp: 320,
    damage: 26,
    cooldown: [1.1, 1.9],
    attackRate: 1.15,
    walkSpeed: 1.5,
    runSpeed: 3.3,
    runnerShare: 1,
    reach: 1.95,
    scale: [1.2, 1.26],
    radius: 0.38,
    flinch: null, // heavies walk through it
  },
  // the weak spot: a sphere this big (at scale 1), this far above the head bone
  head: { radius: 0.14, above: 0.085 },
  staggerSlow: 0.15, // share of its speed a staggered zombie keeps
  // how far into the swing clip the hand lands (the game measures its own clip at start-up
  // and uses that, 0.396 at the time of writing; the firing range, which has no such
  // measurement, uses this)
  attackHitAt: 0.4,
  sightRange: 34,
  sightCone: 150,
  senseRadius: 8,
  hearRadius: 45,
  // A wanderer (spawned with { dull: true }) is the dead of the films: it shuffles about the
  // street and takes no notice until someone comes close, hurts it or fires nearby. These
  // replace the four numbers above for as long as it has not gone for anyone; once it has,
  // it is as sharp as the rest. rally: how far its howl carries to other wanderers;
  // roam: how far from where it stood a shuffle takes it.
  wander: {
    sightRange: 9,
    sightCone: 110,
    senseRadius: 5,
    hearRadius: 14,
    rally: 7,
    roam: 9,
  },
  loseInterest: 14,
  corpseTime: 16,
  maxCorpses: 12,
  pool: { romero: 9, girl: 8, cop: 8, soldier: 5 },
  // desktop presets keep more bodies ready: the run wants a real crowd in the late courses
  poolLarge: { romero: 13, girl: 12, cop: 12, soldier: 6 },
};

// Bodies on trial: they are not in the run yet, only on the firing range (/?range=1, "模型"),
// and nothing of theirs is downloaded until one is asked for.
//   type: the rules it takes when it is brought on as itself (any of them can be given either)
//   hit: how much wider than the bodies above its hit shapes are (head, body, arm, leg; 1 where
//        not given), measured on the models
//   girth: the same for blasts, cones and flames (on top of the type's radius)
//   rigs: how many of it may be up at once ([phones, desktop])
export const EXTRA_BODIES = {
  yaku: { type: "walker", hit: { head: 1.15, body: 1.1 } },
  prisoner: { type: "walker" },
  whiteclown: { type: "walker" },
  parasite: { type: "walker", hit: { arm: 1.4, leg: 1.3 } },
  skeletonzombie: { type: "brute", hit: { body: 1.1, arm: 1.6, leg: 1.5 } },
  pumpkinhulk: {
    type: "brute",
    hit: { body: 1.6, arm: 2, leg: 1.4 },
    girth: 1.5,
  },
  mutant: {
    type: "brute",
    hit: { head: 1.2, body: 1.2, arm: 2.2, leg: 1.5 },
    girth: 1.25,
  },
};
export const EXTRA_RIGS = [5, 10];
