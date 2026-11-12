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
