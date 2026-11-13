// The numbers of the game's own two guns, the LK-9 carbine and the LK-4 sidearm, and nothing
// else: no imports, no game objects. src/game.js builds and fires them with its own code and
// reads these numbers from here; the weapon lab's test bench (arsenal/) reads the same table to
// put them through the test every other weapon sits (arsenal/tools/balance.mjs), so the two
// cannot be held to the standard line with numbers the game does not play by.
//
// In a run a level multiplies `damage` (arsenal/src/data/levels.js, applied by loadout.js) and
// the seasonings multiply damage, rate and reload, as they do for every weapon. These two have
// no forks. A hit to the head does 2.2 times the damage (the game's weak spot, src/game.js
// playerShot), the same as for the arsenal's weapons that do not name their own.
//
//   damage   per round            rpm      rounds a minute at most
//   range    metres a round flies, at full damage all the way (no falloff, no pierce)
//   auto     the round keeps coming while the trigger is held; false: one pull, one round
//   mag      rounds in the magazine   reserve  rounds carried besides (Infinity: never runs out;
//                                             in a run the carbine's reserve is the bullets pool)
//   reload   seconds: tac with rounds still in it, empty when it ran dry. The reload animation
//            (src/game.js, the tables after these) is keyed to these lengths: change one and
//            the hands and the magazine have to be re-timed with it.
//   spread   the cone of fire (radians, from the middle to the edge): hip standing still,
//            moveHip more at a run, air in the air, less crouching; bloom: sustained fire opens it
//            by up to bloomHip, each round adds `shot` of that and `decay` comes off a second.
//            (The ads numbers are the original's sights, which no weapon uses any more.)
export const STOCK_GUNS = {
  rifle: {
    damage: 28,
    rpm: 720,
    range: 300,
    auto: true,
    mag: 30,
    reserve: 150,
    reload: { tac: 2.24, empty: 2.72 },
    spread: {
      hip: 0.0125,
      ads: 0.0012,
      moveHip: 0.013,
      moveAds: 0.004,
      bloomHip: 0.0065,
      bloomAds: 0.0022,
      air: 0.022,
      crouch: 0.002,
      shot: 0.17,
      decay: 1.5,
    },
  },
  pistol: {
    damage: 38,
    rpm: 420,
    range: 120,
    auto: false,
    mag: 17,
    reserve: Infinity,
    reload: { tac: 1.5, empty: 1.9 },
    spread: {
      hip: 0.0105,
      ads: 0.0017,
      moveHip: 0.0065,
      moveAds: 0.003,
      bloomHip: 0.0085,
      bloomAds: 0.003,
      air: 0.018,
      crouch: 0.002,
      shot: 0.3,
      decay: 2.8,
    },
  },
};
