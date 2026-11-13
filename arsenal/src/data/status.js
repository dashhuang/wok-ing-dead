// The numbers of the four status effects and their reactions. Plain data: the rules that use
// them are combat/status.js, and the texts that describe them (data/weapons.js, the lab's
// rules sheet, the design document) are written from this table, so they cannot disagree.

/** Every number of the status rules. Change one here and both the range and the game follow. */
export const STATUS = {
  burn: { dps: 6, time: 4, max: 5, spread: 3, spreadStacks: 1, tick: 6 },
  shock: { time: 6, jumps: 2, range: 5, share: 0.6 },
  venom: { time: 8, max: 5, taken: 0.08, cloud: { radius: 2, life: 3 } },
  // repin: a talisman on a zombie that is already held tops the hold up to this share of it
  seal: { time: 8, max: 3, pin: 3, repin: 0.6, head: 1.5 },
  reactions: {
    爆燃: { radius: 3, damage: 70, knock: 1 },
    导电雾: { radius: 3, cloud: { radius: 2.6, life: 1.6 } },
    // share: of the target's full health; burn: stacks of 灼烧 left on a survivor
    焚符: { share: 0.3, burn: 2 },
    引雷: { radius: 5, self: 150, others: 90, knock: 0.8 },
  },
  // knock-back, lift and stagger a heavy takes, as a share of what a walker would
  brute: { knock: 0.35, lift: 0.5, stagger: 0.4 },
  // A kill that carries force throws the body. The force is the knock-back the killing hit
  // has (or its `launch`, for a hit that only throws when it kills), after a heavy's share
  // and the body's size: a slight one goes further than a big one, between `small` times as
  // far. Under `from` the body drops where it stands, as it always did. Above it, it leaves
  // the ground at `speed` metres a second per unit of force along the hit and `up[0] + up[1]
  // x force` upwards (a blast throws `blast` times higher), never faster than `max` / `maxUp`.
  // `gravity` brings it down; `skid` is how fast it stops once it has landed.
  launch: {
    from: 0.9,
    speed: 1.9,
    up: [1.6, 0.9],
    max: 8,
    maxUp: 4.6,
    blast: 1.5,
    small: [0.6, 1.5],
    gravity: 14,
    skid: 5,
  },
  // The run's elites and its boss: how much of a hold they sit through, the share of their
  // health 焚符 takes instead of the usual one, and whether a firework can frighten them.
  rank: {
    // (thrown: whether a kill can throw the body; these two fall where they stand)
    elite: { pin: 0.5, 焚符: 0.12, scare: false, thrown: false },
    boss: { pin: 0.25, 焚符: 0.04, scare: false, thrown: false },
    bloater: { scare: false },
  },
};
