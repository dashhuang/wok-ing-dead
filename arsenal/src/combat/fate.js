// What a killing hit does to the body: whether it is thrown, and what comes off it.
// A rule with no state: the weapons' hits come to it through combat/status.js, and the
// game's own two guns, which do not pass through there, through src/chinatown/zombies.js.
// The numbers are STATUS.launch and STATUS.sever (data/status.js).
import { STATUS as S } from "../data/status.js";

const NONE = {};

/**
 * How the body is thrown: { speed (m/s along the hit), up (m/s) }, or null if it only drops.
 * z: { type, rank, scale, pin }. o: the hit ({ knock, launch, kind }).
 */
export function launchOf(z, o) {
  const L = S.launch;
  const rank = S.rank[z.rank] || NONE;
  if (z.pin > 0 || rank.thrown === false) return null;
  const size = z.scale || 1;
  const k =
    (o.launch ?? o.knock ?? 0) *
    (z.type === "brute" ? S.brute.knock : 1) *
    Math.max(L.small[0], Math.min(L.small[1], 1 / (size * size * size)));
  if (!(k >= L.from)) return null;
  return {
    speed: Math.min(L.max, k * L.speed),
    up: Math.min(
      L.maxUp,
      (L.up[0] + k * L.up[1]) * (o.kind === "blast" ? L.blast : 1),
    ),
  };
}

/**
 * What comes off the body: a list of limbs (the names of fx/limbs.js: head, lArm, rFore,
 * lShin, rLeg ...), or null. z: { type, rank, maxHp }. o: the hit ({ head, kind, cut }).
 * dmg: what it took. thrown: whether the body is thrown. rng: 0..1.
 */
export function limbsOf(z, o, dmg, thrown, rng = Math.random) {
  const V = S.sever;
  const rank = S.rank[z.rank] || NONE;
  if (rank.severed === false) return null;
  const k = z.type === "brute" ? V.heavy : 1;
  const out = [];
  const add = (limb) => out.includes(limb) || out.push(limb);
  const side = () => (rng() < 0.5 ? "l" : "r");
  if (o.kind === "blast") {
    // a blast: arms and legs at the root, and now and then the head
    for (let i = 0; i < V.blast[0]; i++)
      if (rng() < 0.85 * k) add(side() + (rng() < 0.5 ? "Arm" : "Leg"));
    if (rng() < V.blast[1] * k) add("head");
  } else if (o.cut) {
    // a blade's killing stroke: the head, or an arm at the shoulder
    if (rng() < V.cut[0] * k) add(rng() < V.cut[1] ? "head" : side() + "Arm");
  } else {
    if (thrown) {
      // thrown by the hit (a blast of shot at arm's length): something goes with it
      if (rng() < V.thrown[0] * k) add(side() + (rng() < 0.6 ? "Arm" : "Fore"));
      if (rng() < V.thrown[1] * k) add(side() + (rng() < 0.5 ? "Shin" : "Leg"));
    } else if (!o.head && dmg >= 0.5 * z.maxHp && rng() < V.plain * k)
      add(side() + (rng() < 0.6 ? "Fore" : "Shin"));
  }
  return out.length ? out : null;
}

/**
 * Everything a killing hit does to the body:
 *   { launch: { speed, up } | null, limbs: [...] | null, pop: the head bursts where it is }
 * pop is a bullet through the head that took a good share of its health in one: there is
 * nothing left of it to fly off.
 */
export function fateOf(z, o, dmg, rng = Math.random) {
  const launch = launchOf(z, o);
  const limbs = limbsOf(z, o, dmg, !!launch, rng);
  const rank = S.rank[z.rank] || NONE;
  const pop =
    !!o.head &&
    !o.cut &&
    o.kind !== "blast" &&
    rank.severed !== false &&
    dmg >= S.sever.head * z.maxHp;
  return { launch, limbs, pop };
}
