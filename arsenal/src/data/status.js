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
  // No two bodies go the same way. The force is scaled by how much of its health the blow
  // took (`share`: from a blow that only finished it off to one that took all of it; a
  // pattern of shot landing in the same `window` seconds is one blow), then by a roll of the
  // dice (`vary`); how high it goes by another (`upVary`), and it leaves up to `turn`
  // radians off the line of the hit. What falls under `from` after all that just drops.
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
    share: [0.45, 1],
    vary: [0.45, 1.05],
    upVary: [0.75, 1.1],
    turn: 0.35,
    window: 0.06,
  },
  // How much blood (combat/fate.js bloodOf / goreOf; the amounts are those of the effects
  // blood() and gore(), where 1 is a rifle round in the chest and the whole of a burst).
  //   hit    a hit bleeds hit[0], and hit[1] more for one that takes all its health
  //   kill   a kill bursts kill[0], and kill[1] more if the blow took all its health
  //   head   times this for the head;  blast  times this for an explosion
  //   vary   and then times a roll of the dice between these;  max  never more than this
  blood: {
    hit: [0.3, 1.5],
    kill: [0.3, 0.8],
    head: 1.3,
    blast: 1.3,
    vary: [0.55, 1.35],
    max: 2.2,
  },
  // What a kill takes off the body (combat/fate.js; the limbs are those of fx/limbs.js).
  //   head    a bullet through the head that takes this share of its health in one bursts it
  //   blast   an explosion: up to this many arms and legs at the root (each 85% of the
  //           time), and the head this often
  //   cut     a blade's killing stroke takes a piece this often; this often it is the head,
  //           otherwise an arm at the shoulder
  //   thrown  a body thrown by the hit loses an arm this often, and part of a leg this often
  //   plain   any other kill by a hit of half its health or more: a forearm or a shin
  //   heavy   a heavy's share of those chances
  sever: {
    head: 0.6,
    blast: [2, 0.3],
    cut: [0.85, 0.35],
    thrown: [0.8, 0.35],
    plain: 0.15,
    heavy: 0.5,
  },
  // The run's elites and its boss: how much of a hold they sit through, the share of their
  // health 焚符 takes instead of the usual one, and whether a firework can frighten them.
  rank: {
    // (thrown: whether a kill can throw the body; severed: whether it can take a piece off
    // it. These two fall where they stand, whole)
    elite: {
      pin: 0.5,
      焚符: 0.12,
      scare: false,
      thrown: false,
      severed: false,
    },
    boss: {
      pin: 0.25,
      焚符: 0.04,
      scare: false,
      thrown: false,
      severed: false,
    },
    bloater: { scare: false },
  },
};
