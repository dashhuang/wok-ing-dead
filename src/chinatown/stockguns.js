// The game's own two guns, the LK-9 carbine and the LK-4 sidearm: their numbers, and the rules
// of how they fire. Nothing else: no imports, no game objects, so the weapon lab and node
// scripts can import it too.
//
// There is one copy of these. src/game.js builds the two guns and fires them by these rules
// (its own ray test only finds what a round hits); the weapon lab's test bench fires them by the
// same rules from a stand-in model (arsenal/src/combat/behaviours.js, the end), so that they sit
// the test every other weapon sits (arsenal/tools/balance.mjs). Change a number or a rule here
// and both follow. The firing range's number panel (/?range=1, 「数值」) edits the numbers while
// the game runs: damage, rate, range, magazine, reload and spread take hold at once.
//
// In a run a level multiplies `damage` (arsenal/src/data/levels.js, its `bare` column: these two
// never fork) and the seasonings multiply damage, rate and reload, as for every weapon.
//
//   damage   per round            rpm      rounds a minute at most
//   range    metres a round flies
//   head     what a hit to the head multiplies the damage by
//   pierce   how many of the dead a round goes through and on into the next (0: it stops)
//   falloff  [from, to, share]: full damage to `from` metres, down to `share` of it by `to`
//            (null: full damage all the way)
//   auto     the round keeps coming while the trigger is held; false: one pull, one round
//   mag      rounds in the magazine   reserve  rounds carried besides (Infinity: never runs out;
//                                             in a run the carbine's reserve is the bullets pool)
//   reload   seconds: tac with rounds still in it, empty when it ran dry (the hands' animation
//            in src/game.js is played faster or slower to fit them)
//   spread   the cone of fire (radians, from the middle to the edge): hip standing still,
//            moveHip more at a run, air in the air, less crouching; bloom: sustained fire opens it
//            by up to bloomHip, each round adds `shot` of that and `decay` comes off a second.
//            (The ads numbers are the original's sights, which no weapon uses any more.)
export const STOCK_GUNS = {
  rifle: {
    damage: 28,
    rpm: 720,
    range: 300,
    head: 2.2,
    pierce: 0,
    falloff: null,
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
    head: 2.2,
    pierce: 0,
    falloff: null,
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

// ---------------------------------------------------------------- how they fire
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * The cone of fire right now (radians, from the middle to the edge). s: { bloom (0..1),
 * speed (metres a second), ads (0..1), air (in the air), crouch }; whatever is not given is
 * standing still on the ground from the hip.
 */
export function coneOf(spread, s = {}) {
  const ads = s.ads || 0;
  const move = clamp01((s.speed || 0) / 6);
  return (
    lerp(spread.hip, spread.ads, ads) +
    move * lerp(spread.moveHip, spread.moveAds, ads) +
    (s.bloom || 0) * lerp(spread.bloomHip, spread.bloomAds, ads) +
    (s.air ? spread.air : 0) -
    (s.crouch ? spread.crouch * (1 - ads) : 0)
  );
}
/** The bloom after one more round. */
export const bloomAfterShot = (spread, bloom) =>
  Math.min(1, bloom + spread.shot);
/** The bloom after `dt` seconds. */
export const bloomAfter = (spread, bloom, dt) =>
  Math.max(0, bloom - dt * spread.decay);

/**
 * What one round does to one of the dead it reaches: `damage` (the round's, levels and
 * seasonings already in it) at `dist` metres, to the head or not.
 */
export function roundDamage(gun, damage, dist, head = false) {
  let d = damage;
  const f = gun.falloff;
  if (f && dist > f[0])
    d *= 1 - (1 - f[2]) * Math.min(1, (dist - f[0]) / (f[1] - f[0]));
  return head ? d * gun.head : d;
}

/**
 * How long a reload takes by the table, against the length the hands' animation was made for:
 * the animation's clock runs this much faster (more than 1) or slower to fit it.
 */
export const reloadPace = (gun, empty, made) =>
  made / (empty ? gun.reload.empty : gun.reload.tac);
