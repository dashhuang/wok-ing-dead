// How each weapon handles: what a shot does to the weapon in the hands and to the camera, how
// its aim opens up under sustained fire, how a stream shudders, how a blade bites. Nothing but
// data: combat/recoil.js plays it, in the lab and in the game alike, and the firing range's
// "数值" panel edits it live.
//
// The model is the one the game's own two guns use (src/game.js, "Weapon runtime"): every shot
// is a set of impulses on damped springs, so the weapon snaps and comes back on its own.
//
//   ref     the ctx.kick() strength these numbers are written for; a behaviour that kicks with
//           another value (a heavier form, a charged shot) scales all of them by value / ref
//   back    the weapon driven back along its barrel            (about 0.012 m at the peak per 1)
//   rise    the muzzle flipping up about the grip             (about 0.014 rad, 0.8 deg, per 1)
//   yaw     the muzzle thrown to a random side                (half of that per 1, either way)
//   roll    the weapon twisting in the hands                  (half of that per 1, either way)
//   up      the weapon lifted in the hands                    (about 0.012 m per 1)
//   side    the weapon pushed to a random side                (about 0.012 m per 1, either way)
//           (the peaks above are for the default springs; a slower spring travels further)
//   first   how much harder the first shot of a burst kicks (the second is half way there)
//   spr     the springs, [speed (rad/s), damping (1 = no overshoot)] for z (back), p (rise),
//           y (yaw), r (roll) and x (up and side). Fast and tight is a snap, slow is a shove.
//   pivot   how far behind the grip the weapon turns from (m): 0 for a handgun that flips about
//           the wrist, more for a stock in the shoulder
//   cam     the camera: pitch and yaw per shot (rad), keep = the share of it that stays on the
//           aim (the rest comes back by itself), sustain [n, k] = after n shots of a burst the
//           kick is k of what it was, weave = the side-to-side walk of a long burst (rad),
//           hold = seconds before it starts to come back, recover = how fast it does
//   fov     the picture punched outwards on the shot (a fraction of the field of view)
//   bloom   the aim opening up: shot = how much of it one shot adds (0..1), decay = how much
//           comes off per second (all the time, firing or not: it only builds if shots a
//           second x shot is more than decay), add = the extra spread at full bloom (rad)
//   ads     through a scope, the share that is left: [weapon turn, weapon shove, camera]
//   stream  a held stream: push = how far back it holds the weapon (m), hz = how often it
//           shudders, rise / yaw / roll = how hard, cam = the camera's share of each shudder (rad)
//   melee   a blade: stop = seconds the cut hangs when it bites (made up for on the way out, so
//           a swing takes as long as it always did), cam = how far the camera is thrown the way
//           of the cut on a hit (rad), follow = how far it leans into every swing (rad),
//           back / roll = what the bite does to the weapon in the hands
export const FEEL_DEFAULT = {
  ref: 1,
  back: 0.8,
  rise: 2,
  yaw: 1,
  roll: 1.8,
  up: 0.12,
  side: 0.09,
  cam: { pitch: 0.008, yaw: 0.003, keep: 0.15 },
};
// the springs a weapon gets where it does not name its own
export const FEEL_SPRINGS = {
  z: [46, 0.55],
  p: [38, 0.5],
  y: [32, 0.46],
  r: [32, 0.43],
  x: [42, 0.5],
};
// what is left of a shot through a scope, where a weapon does not say
export const FEEL_ADS = [0.3, 0.8, 0.6];

export const FEEL = {
  // 镇街: a pump gun in the shoulder. One big slow shove and the muzzle well up.
  shotgun: {
    ref: 1.25,
    back: 2.1,
    rise: 5.4,
    yaw: 1.1,
    roll: 3.1,
    up: 0.28,
    side: 0.1,
    spr: { z: [36, 0.55], p: [30, 0.48], y: [26, 0.45], r: [26, 0.42] },
    pivot: 0.12,
    cam: { pitch: 0.03, yaw: 0.006, keep: 0.12, hold: 0.12, recover: 5 },
    fov: 0.02,
  },
  // 蜂巢: a thousand rounds a minute. Each one is small; together they climb and wander.
  smg: {
    ref: 0.32,
    back: 0.5,
    rise: 0.9,
    yaw: 0.75,
    roll: 1.45,
    up: 0.09,
    side: 0.09,
    first: 1.5,
    spr: { z: [52, 0.55], p: [44, 0.5], y: [36, 0.45], r: [36, 0.42] },
    pivot: 0.05,
    cam: {
      pitch: 0.005,
      yaw: 0.0014,
      keep: 0.28,
      sustain: [10, 0.4],
      weave: 0.003,
    },
    bloom: { shot: 0.2, decay: 1.8, add: 0.012 },
  },
  // 判官: a heavy revolver in one hand. The muzzle goes over the top of the wrist.
  revolver: {
    ref: 1.5,
    back: 0.73,
    rise: 8.3,
    yaw: 1.6,
    roll: 3.2,
    up: 0.27,
    side: 0.1,
    spr: { z: [54, 0.55], p: [46, 0.48], y: [38, 0.46], r: [38, 0.44] },
    cam: { pitch: 0.017, yaw: 0.005, keep: 0.18 },
    fov: 0.012,
    bloom: { shot: 0.7, decay: 1.4, add: 0.014 },
  },
  // 更夫: a lever rifle. A hard straight push; through the scope the picture jumps.
  lever: {
    ref: 1.4,
    back: 1.7,
    rise: 4,
    yaw: 0.85,
    roll: 2.2,
    up: 0.23,
    side: 0.1,
    spr: { z: [40, 0.55], p: [34, 0.48], y: [30, 0.45], r: [30, 0.42] },
    pivot: 0.14,
    cam: { pitch: 0.022, yaw: 0.004, keep: 0.12, hold: 0.11, recover: 5.5 },
    fov: 0.016,
    ads: [0.3, 0.7, 0.7],
  },
  // 打桩: compressed air. No flip to speak of, a quick dry thump straight back.
  nailgun: {
    ref: 0.25,
    back: 0.6,
    rise: 1.2,
    yaw: 0.58,
    roll: 1.15,
    up: 0.05,
    side: 0.05,
    first: 1.2,
    spr: { z: [64, 0.6], p: [60, 0.6], y: [50, 0.55], r: [50, 0.55] },
    cam: { pitch: 0.002, yaw: 0.0008, keep: 0.2, sustain: [12, 0.5] },
    bloom: { shot: 0.3, decay: 1.6, add: 0.008 },
  },
  // 满堂红: a tube that pushes. A long shove and a slow roll as the rocket leaves.
  firework: {
    ref: 0.9,
    back: 1.1,
    rise: 2,
    yaw: 0.85,
    roll: 2.4,
    up: 0.2,
    side: 0.12,
    spr: { z: [30, 0.5], p: [28, 0.48], y: [24, 0.45], r: [24, 0.42] },
    pivot: 0.1,
    cam: { pitch: 0.012, yaw: 0.004, keep: 0.1, hold: 0.12, recover: 5 },
    fov: 0.012,
  },
  // 诸葛: a repeating crossbow. The limbs snap forward and take the stock with them: it
  // lurches away and nods, and twists as the lever comes round.
  crossbow: {
    ref: 0.35,
    back: -0.35,
    rise: -0.9,
    yaw: 0.5,
    roll: 2.2,
    up: -0.12,
    side: 0.06,
    spr: { z: [50, 0.55], p: [44, 0.5], y: [40, 0.48], r: [40, 0.45] },
    pivot: 0.06,
    cam: { pitch: 0.0015, yaw: 0.0008, keep: 0.1 },
    bloom: { shot: 0.45, decay: 1.8, add: 0.006 },
  },
  // 敕令: paper thrown with a flick of the wrist: forward and down, not back and up.
  talisman: {
    ref: 0.25,
    back: -0.35,
    rise: -1.2,
    yaw: 0.8,
    roll: 1.6,
    up: -0.06,
    side: 0.05,
    spr: { z: [46, 0.6], p: [40, 0.55], y: [36, 0.5], r: [36, 0.5] },
    cam: { pitch: 0.001, yaw: 0.0006, keep: 0 },
  },
  // 镬气: a flame held open. It leans on the hands and trembles; the oil shot is a short cough.
  flamer: {
    ref: 0.6,
    back: 0.7,
    rise: 1.1,
    yaw: 0.6,
    roll: 1.4,
    up: 0.08,
    side: 0.06,
    cam: { pitch: 0.004, yaw: 0.002, keep: 0 },
    stream: {
      push: 0.014,
      hz: 22,
      rise: 0.5,
      yaw: 0.45,
      roll: 0.9,
      cam: 0.0012,
    },
  },
  // 霓虹: a live wire. A fast nervous jitter while it arcs; the ball lightning kicks like a gun.
  arc: {
    ref: 1.3,
    back: 1.4,
    rise: 3.2,
    yaw: 1.2,
    roll: 3,
    up: 0.18,
    side: 0.1,
    spr: { z: [42, 0.55], p: [36, 0.5], y: [34, 0.46], r: [34, 0.43] },
    cam: { pitch: 0.016, yaw: 0.005, keep: 0.1 },
    fov: 0.014,
    stream: {
      push: 0.006,
      hz: 34,
      rise: 0.35,
      yaw: 0.6,
      roll: 0.9,
      cam: 0.0008,
    },
  },
  // 金钱剑: a light blade. A cut that connects catches for a moment and jars the wrist.
  coinsword: {
    ref: 1,
    melee: { stop: 0.055, cam: 0.016, follow: 0.012, back: 0.6, roll: 1.4 },
  },
  // 青龙: a heavy pole blade. It drags the whole view round with it and stops dead in a body.
  // (its gun numbers are for the catch when it comes back from a throw: it lands in the hands)
  guandao: {
    ref: 0.9,
    back: 1.2,
    rise: -1.6,
    yaw: 0.8,
    roll: 2.4,
    up: -0.2,
    side: 0.08,
    spr: { z: [32, 0.5], p: [28, 0.48], y: [26, 0.45], r: [26, 0.42] },
    cam: { pitch: -0.008, yaw: 0.003, keep: 0 },
    melee: { stop: 0.085, cam: 0.03, follow: 0.028, back: 1.1, roll: 2.2 },
  },
};
