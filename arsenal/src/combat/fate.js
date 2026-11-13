// What a killing hit does to the body: whether it is thrown, and what comes off it.
// A rule with no state: the weapons' hits come to it through combat/status.js, and the
// game's own two guns, which do not pass through there, through src/chinatown/zombies.js.
// The numbers are STATUS.launch and STATUS.sever (data/status.js).
import { STATUS as S } from "../data/status.js";

const NONE = {};

const lerp = (r, t) => r[0] + (r[1] - r[0]) * t;
/** The share of its health a blow of `dmg` is to this body, 0..1. */
const shareOf = (z, dmg) =>
  Math.max(0, Math.min(1, dmg / (z.maxHp || dmg || 1)));

/**
 * How the body is thrown: { speed (m/s along the hit), up (m/s), turn (radians off the line
 * of the hit) }, or null if it only drops. z: { type, rank, scale, maxHp, pin }. o: the hit
 * ({ knock, launch, kind }). dmg: what the blow took (the whole of a pattern of shot, not the
 * one pellet that finished it): a blow that takes all its health throws it the furthest, one
 * that only finishes it off about half as far, and no two go the same.
 */
export function launchOf(z, o, dmg, rng = Math.random) {
  const L = S.launch;
  const rank = S.rank[z.rank] || NONE;
  if (z.pin > 0 || rank.thrown === false) return null;
  const size = z.scale || 1;
  const force =
    (o.launch ?? o.knock ?? 0) *
    (z.type === "brute" ? S.brute.knock : 1) *
    Math.max(L.small[0], Math.min(L.small[1], 1 / (size * size * size)));
  // (nothing to throw it with: no dice rolled, so the rest of its fate reads the same)
  if (!(force * L.share[1] * L.vary[1] >= L.from)) return null;
  const k = force * lerp(L.share, shareOf(z, dmg)) * lerp(L.vary, rng());
  const lift = lerp(L.upVary, rng());
  const turn = (rng() * 2 - 1) * L.turn;
  if (!(k >= L.from)) return null;
  return {
    speed: Math.min(L.max, k * L.speed),
    up: Math.min(
      L.maxUp,
      (L.up[0] + k * L.up[1]) * (o.kind === "blast" ? L.blast : 1) * lift,
    ),
    turn,
  };
}

/**
 * How much a hit bleeds: the amount for the effect (fx/effects.js blood(): 1 is a rifle round
 * in the chest). share: how much of its health the hit took (0..1). More for the head, and
 * never quite the same twice.
 */
export function bloodOf(share, head, rng = Math.random) {
  const B = S.blood;
  return Math.min(
    B.max,
    (B.hit[0] + B.hit[1] * Math.max(0, Math.min(1, share))) *
      (head ? B.head : 1) *
      lerp(B.vary, rng()),
  );
}

/**
 * How much a kill bursts: the amount for the effect (fx/effects.js gore(): 1 is the whole
 * burst). z: { maxHp }. o: the hit ({ head, kind }). dmg: what the blow took.
 */
export function goreOf(z, o, dmg, rng = Math.random) {
  const B = S.blood;
  return Math.min(
    B.max,
    (B.kill[0] + B.kill[1] * shareOf(z, dmg)) *
      (o.head ? B.head : 1) *
      (o.kind === "blast" ? B.blast : 1) *
      lerp(B.vary, rng()),
  );
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
 *   { launch: { speed, up, turn } | null, limbs: [...] | null,
 *     pop: the head bursts where it is, gore: how much it bursts (see goreOf) }
 * dmg is the blow: what this hit took, with whatever landed on it in the same instant.
 * pop is a bullet through the head that took a good share of its health in one: there is
 * nothing left of it to fly off.
 */
export function fateOf(z, o, dmg, rng = Math.random) {
  const launch = launchOf(z, o, dmg, rng);
  const limbs = limbsOf(z, o, dmg, !!launch, rng);
  const rank = S.rank[z.rank] || NONE;
  const pop =
    !!o.head &&
    !o.cut &&
    o.kind !== "blast" &&
    rank.severed !== false &&
    dmg >= S.sever.head * z.maxHp;
  return { launch, limbs, pop, gore: goreOf(z, o, dmg, rng) };
}
