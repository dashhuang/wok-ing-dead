// What the weapons sound like. Every sound is a generator in the game's own form —
// gen(sampleRate, rng, variant) returns the samples (or is a generator function that yields
// between stages and returns them) — so the lab renders them into its own buffers and the
// game adds them to its sound table and plays them through its buses (src/chinatown/audio.js).
//
// The reports follow the recipe of the game's two stock guns: three bands of noise that hold
// for the length of the blast and then fall away at their own rates, the pressure pulse and a
// falling sine under them, hard saturation, a low-pass that closes as the gas cools, and then
// the weapon's own action over the top. Each weapon is one set of numbers for that recipe;
// the ones that are not firearms (nail gun, fireworks, crossbow, talismans) have their own.
import {
  alloc,
  white,
  filter,
  shape,
  decay,
  glide,
  add,
  gain,
  unit,
  drive,
  rms,
  thump,
  blast,
  burst,
  modes,
  knock,
  ticks,
  rush,
  comb,
  seamless,
  wander,
  pick,
  TAU,
} from "./dsp.js";

const HI = 44100;
const MID = 32000;

// ---------------------------------------------------------------- firearms
// layers: [high-pass, low-pass, level while the blast holds, level of the tail, tail seconds]
const GUNS = {
  // 12 bore pump: the widest and longest of them, most of it below 800 Hz
  shotgun: {
    len: 0.92,
    pitch: [1, 0.96, 1.04],
    bright: [1, 1.06, 0.95],
    layers: [
      [62, 200, 1.9, 0.15, 0.15],
      [200, 860, 2.4, 0.14, 0.078],
      [860, 4300, 1.55, 0.06, 0.036],
    ],
    hold: 0.034,
    holdTau: 0.014,
    drive: 1.9,
    tPlus: 0.0006,
    blast: 2.8,
    f0: 118,
    f1: 46,
    tauF: 0.045,
    tauA: 0.09,
    thump: 0.24,
    lpEnd: 640,
    lpMid: 2100,
    lpMidTau: 0.1,
    lpTop: 13000,
    lpTopTau: 0.0036,
    shelfF: 190,
    shelf: 0.5,
    plateau: 0.85,
    reDrive: 1.7,
    mech: [
      [
        0.03,
        0.05,
        [
          [1240, 0.011, 1],
          [1890, 0.009, 0.6],
          [610, 0.02, 0.5],
        ],
        2200,
      ],
    ],
  },
  // dragon's breath: the same gun with a sheet of burning metal coming out of it
  shotgun_a: {
    base: "shotgun",
    layers: [
      [62, 200, 1.8, 0.15, 0.15],
      [200, 860, 2.4, 0.16, 0.1],
      [820, 5200, 1.7, 0.1, 0.06],
    ],
    lpTop: 15000,
    lpTopTau: 0.006,
    lpMidTau: 0.14,
    extra(sr, rng, out) {
      // the roar of the burning charge, and the sparks landing
      add(
        out,
        rush(sr, rng, 0.5, 500, 1700, {
          q: 0.9,
          rough: 120,
          hi: 0.5,
          env: (x) => (1 - Math.exp(-x / 0.03)) * Math.exp(-x / 0.4),
        }),
        0.012,
        0.42,
        sr,
      );
      add(
        out,
        ticks(sr, rng, 0.7, 60, { hp: 3500, from: 0.05, ampFall: 0.25 }),
        0,
        0.16,
        sr,
      );
    },
  },
  // a slug: one heavy blow, tighter and deeper
  shotgun_b: {
    base: "shotgun",
    len: 1.0,
    layers: [
      [52, 180, 2.1, 0.17, 0.19],
      [180, 740, 2.4, 0.13, 0.09],
      [700, 3600, 1.3, 0.05, 0.03],
    ],
    hold: 0.04,
    f0: 104,
    f1: 40,
    tauA: 0.11,
    thump: 0.32,
    shelf: 0.7,
    lpEnd: 540,
  },
  // 9 mm sub-machine gun: short, bright, the bolt slapping about behind it
  smg: {
    len: 0.3,
    pitch: [1, 1.035, 0.97, 1.015, 0.985],
    bright: [1, 0.95, 1.06, 1.02, 0.97],
    layers: [
      [120, 330, 1.3, 0.13, 0.042],
      [330, 1750, 2.1, 0.17, 0.028],
      [1750, 6600, 1.9, 0.12, 0.012],
    ],
    hold: 0.007,
    holdTau: 0.004,
    drive: 1.5,
    tPlus: 0.00035,
    blast: 2.3,
    f0: 262,
    f1: 122,
    tauF: 0.012,
    tauA: 0.022,
    thump: 0.22,
    lpEnd: 1200,
    lpMid: 2600,
    lpMidTau: 0.03,
    lpTop: 16000,
    lpTopTau: 0.002,
    shelfF: 280,
    shelf: 0.16,
    plateau: 0.76,
    reDrive: 1.4,
    mech: [
      [
        0.013,
        0.1,
        [
          [3120, 0.005, 1],
          [4680, 0.004, 0.8],
          [1780, 0.006, 0.4],
        ],
        3400,
      ],
      [
        0.034,
        0.13,
        [
          [2640, 0.007, 1],
          [3980, 0.006, 0.8],
          [1310, 0.009, 0.4],
        ],
        3000,
      ],
    ],
    spring: [
      [1320, 0.018, 1],
      [2650, 0.011, 0.4],
    ],
    springG: 0.014,
  },
  // .357 revolver: a crack with a long boom behind it, the cylinder ringing
  revolver: {
    len: 0.62,
    pitch: [1, 0.97, 1.03, 0.99],
    bright: [1, 1.05, 0.96, 1.02],
    layers: [
      [80, 255, 1.75, 0.15, 0.092],
      [255, 1320, 2.3, 0.17, 0.05],
      [1320, 6100, 1.9, 0.11, 0.021],
    ],
    hold: 0.014,
    holdTau: 0.007,
    drive: 1.8,
    tPlus: 0.00045,
    blast: 3.0,
    f0: 192,
    f1: 72,
    tauF: 0.02,
    tauA: 0.045,
    thump: 0.22,
    lpEnd: 900,
    lpMid: 2500,
    lpMidTau: 0.055,
    lpTop: 16000,
    lpTopTau: 0.0028,
    shelfF: 240,
    shelf: 0.26,
    plateau: 0.8,
    reDrive: 1.6,
    mech: [
      [
        0.019,
        0.06,
        [
          [2580, 0.016, 1],
          [3890, 0.012, 0.6],
          [5420, 0.008, 0.3],
        ],
        3200,
      ],
    ],
  },
  // big-bore lever rifle: slower and rounder than the service rifle, a long roll
  lever: {
    len: 0.84,
    pitch: [1, 0.965, 1.035],
    bright: [1, 1.06, 0.95],
    layers: [
      [65, 215, 1.9, 0.14, 0.155],
      [215, 920, 2.2, 0.12, 0.072],
      [920, 4900, 1.6, 0.07, 0.03],
    ],
    hold: 0.026,
    holdTau: 0.011,
    drive: 1.7,
    tPlus: 0.0005,
    blast: 2.7,
    f0: 136,
    f1: 55,
    tauF: 0.035,
    tauA: 0.07,
    thump: 0.21,
    lpEnd: 700,
    lpMid: 2400,
    lpMidTau: 0.085,
    lpTop: 14000,
    lpTopTau: 0.003,
    shelfF: 215,
    shelf: 0.46,
    plateau: 0.82,
    reDrive: 1.6,
    mech: [
      [
        0.024,
        0.045,
        [
          [1760, 0.012, 1],
          [2710, 0.009, 0.6],
          [760, 0.018, 0.45],
        ],
        2600,
      ],
    ],
  },
};
const gunOf = (id) => {
  const p = GUNS[id];
  return p.base ? { ...GUNS[p.base], ...p } : p;
};

function* report(sr, rng, v, P) {
  const pitch = P.pitch[v % P.pitch.length];
  const bright = P.bright[v % P.bright.length];
  const lead = 0.0005;
  const out = alloc(sr, P.len);
  const n = out.length - Math.round(0.004 * sr);
  const body = new Float32Array(n);
  const holdN = Math.round(P.hold * sr);
  const kHold = Math.exp(-1 / (P.holdTau * sr));
  for (const [hp, lp, held, tail, tau] of P.layers) {
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = rng() * 2 - 1;
    filter(x, "hp", hp * pitch, 0.707, sr);
    filter(x, "hp", hp * pitch, 0.707, sr);
    filter(x, "lp", lp * pitch * bright, 0.707, sr);
    const g = 1 / (rms(x, 0, Math.min(n, Math.round(0.12 * sr))) + 1e-6);
    const kTail = Math.exp(-1 / (tau * sr));
    let w = tail;
    let s = held;
    for (let i = 0; i < n; i++) {
      body[i] += x[i] * g * (s + w);
      w *= kTail;
      if (i >= holdN) s *= kHold;
    }
    yield;
  }
  add(
    body,
    thump(sr, 0.3, P.f0 * pitch, P.f1 * pitch, P.tauF, P.tauA, 0.001),
    0,
    P.thump,
    sr,
  );
  add(body, blast(sr, P.tPlus / pitch), 0, P.blast, sr);
  for (let i = 0; i < n; i++) body[i] = Math.tanh(body[i] * P.drive);
  // the gas cools: all the way open for a couple of milliseconds, then closing
  const cool = (x) => {
    const t = (x * n) / sr;
    return (
      (P.lpEnd + P.lpMid * Math.exp(-t / P.lpMidTau)) * bright +
      P.lpTop * Math.exp(-t / P.lpTopTau)
    );
  };
  filter(body, "lp", cool, 0.6, sr);
  filter(body, "lp", cool, 0.6, sr);
  yield;
  const low = Float32Array.from(body);
  filter(low, "lp", P.shelfF, 0.707, sr);
  for (let i = 0; i < n; i++) body[i] += low[i] * P.shelf;
  filter(body, "hp", 30, 0.707, sr);
  // the held part of the blast sits at a set level, and is pushed into saturation again
  gain(
    body,
    P.plateau /
      (rms(body, Math.round(0.004 * sr), Math.round((P.hold + 0.004) * sr)) +
        1e-6),
  );
  drive(body, P.reDrive);
  add(out, body, lead, 1, sr);
  const mech = P.mech || [];
  for (let i = 0; i < mech.length; i++) {
    const [at, level, list, hp] = mech[i];
    const t = lead + at * pick(rng, 0.94, 1.06);
    add(
      out,
      knock(
        sr,
        rng,
        list.map(([f, tau, amp]) => [f * pitch, tau, amp]),
        { hp, tick: 0.6, ring: 0.7 },
      ),
      t,
      level,
      sr,
    );
    if (i === mech.length - 1 && P.spring)
      add(
        out,
        modes(
          sr,
          0.22,
          P.spring.map(([f, tau, amp]) => [f * pitch, tau, amp]),
          rng,
        ),
        t + 0.002,
        P.springG,
        sr,
      );
  }
  if (P.extra) P.extra(sr, rng, out, v);
  return out;
}
const gun = (id) =>
  function* (sr, rng, v) {
    return yield* report(sr, rng, v, gunOf(id));
  };

// ---------------------------------------------------------------- the others
const VAR4 = [1, 0.96, 1.05, 0.985];

// pneumatic nailer: a slug of air, the piston meeting its stop, the exhaust
function nailer(heavy) {
  return (sr, rng, v) => {
    const p = VAR4[v % 4];
    const out = alloc(sr, heavy ? 0.36 : 0.27);
    add(
      out,
      burst(sr, rng, 0.09, heavy ? 0.02 : 0.014, {
        bp: (heavy ? 2100 : 2700) * p,
        q: 0.7,
        att: 0.0006,
      }),
      0,
      0.9,
      sr,
    );
    add(
      out,
      knock(
        sr,
        rng,
        [
          [1380 * p, 0.012, 1],
          [2260 * p, 0.009, 0.7],
          [3650 * p, 0.006, 0.5],
          [640 * p, 0.02, 0.55],
        ],
        { hp: 3000, tick: 0.8, ring: 0.85 },
      ),
      0.004,
      0.95,
      sr,
    );
    add(
      out,
      thump(
        sr,
        0.14,
        (heavy ? 205 : 262) * p,
        (heavy ? 92 : 132) * p,
        0.012,
        heavy ? 0.04 : 0.028,
      ),
      0,
      heavy ? 0.95 : 0.6,
      sr,
    );
    // the piston coming back, the spring and the air leaving
    add(
      out,
      knock(
        sr,
        rng,
        [
          [1720 * p, 0.008, 1],
          [2890 * p, 0.006, 0.6],
        ],
        { hp: 3200, tick: 0.5, ring: 0.6 },
      ),
      heavy ? 0.062 : 0.045,
      0.34,
      sr,
    );
    add(
      out,
      modes(
        sr,
        0.2,
        [
          [820 * p, 0.05, 1],
          [1640 * p, 0.03, 0.4],
        ],
        rng,
      ),
      0.03,
      0.05,
      sr,
    );
    add(
      out,
      burst(sr, rng, heavy ? 0.3 : 0.22, heavy ? 0.07 : 0.05, {
        hp: 3600,
        att: 0.004,
      }),
      0.012,
      0.2,
      sr,
    );
    return drive(unit(out), 1.5);
  };
}

// a rocket leaving its tube: the lifting charge, the motor, the whistle
function rocket(sr, rng, v) {
  const p = [1, 0.94, 1.07][v % 3];
  const out = alloc(sr, 0.8);
  add(out, thump(sr, 0.2, 210 * p, 82 * p, 0.02, 0.05), 0, 0.9, sr);
  add(out, burst(sr, rng, 0.12, 0.028, { lp: 1500 }), 0, 0.8, sr);
  add(
    out,
    rush(sr, rng, 0.66, 700 * p, 3300 * p, {
      q: 1.2,
      rough: 260,
      rough1: 430,
      hi: 0.4,
      env: (x) => (1 - Math.exp(-x / 0.04)) * Math.exp(-x / 0.5),
    }),
    0.006,
    0.75,
    sr,
  );
  const w = alloc(sr, 0.7);
  let ph = 0;
  for (let i = 0; i < w.length; i++) {
    const t = i / sr;
    const f =
      (1050 + 1900 * Math.pow(t / 0.7, 0.6)) *
      p *
      (1 + 0.04 * Math.sin(TAU * 27 * t));
    ph += (TAU * f) / sr;
    w[i] =
      (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) *
      (1 - Math.exp(-t / 0.05)) *
      Math.exp(-t / 0.3);
  }
  add(out, w, 0.02, 0.15, sr);
  add(
    out,
    ticks(sr, rng, 0.6, 45, { hp: 4000, from: 0.01, ampFall: 0.3 }),
    0,
    0.22,
    sr,
  );
  return drive(unit(out), 1.3);
}
// a mortar shell: the thoomp of a tube, hollow, with the shell whistling off
function mortar(sr, rng, v) {
  const p = [1, 0.95, 1.05][v % 3];
  const out = alloc(sr, 0.95);
  const body = burst(sr, rng, 0.5, 0.09, { lp: 1100 * p, hp: 90 });
  comb(body, sr, 1 / (172 * p), 0.55, 0.8);
  add(out, body, 0, 1.1, sr);
  add(out, thump(sr, 0.5, 146 * p, 52, 0.05, 0.13), 0, 0.7, sr);
  add(out, burst(sr, rng, 0.2, 0.04, { bp: 700 * p, q: 0.8 }), 0, 0.6, sr);
  add(
    out,
    modes(
      sr,
      0.5,
      [
        [176 * p, 0.12, 1],
        [352 * p, 0.08, 0.5],
        [705 * p, 0.04, 0.3],
      ],
      rng,
    ),
    0.002,
    0.22,
    sr,
  );
  add(out, burst(sr, rng, 0.03, 0.006, { hp: 1800 }), 0, 0.5, sr);
  add(
    out,
    rush(sr, rng, 0.6, 520 * p, 1900 * p, {
      q: 1.6,
      rough: 180,
      env: (x) => (1 - Math.exp(-x / 0.05)) * Math.exp(-x / 0.45),
    }),
    0.04,
    0.3,
    sr,
  );
  return drive(unit(out), 1.8);
}
// crossbow: the string, the string hitting its stops, the limbs, the bolt going
function crossbow(sr, rng, v) {
  const p = [1, 0.95, 1.06][v % 3];
  const out = alloc(sr, 0.5);
  add(
    out,
    modes(
      sr,
      0.45,
      [
        [128 * p, 0.09, 1],
        [257 * p, 0.06, 0.6],
        [389 * p, 0.04, 0.4],
        [771 * p, 0.02, 0.25],
      ],
      rng,
    ),
    0,
    0.55,
    sr,
  );
  add(
    out,
    knock(
      sr,
      rng,
      [
        [640 * p, 0.02, 1],
        [1150 * p, 0.012, 0.6],
        [2100 * p, 0.008, 0.4],
      ],
      { hp: 1800, tick: 0.8, ring: 0.8 },
    ),
    0.006,
    1.15,
    sr,
  );
  add(out, thump(sr, 0.2, 152 * p, 94 * p, 0.02, 0.05), 0.004, 0.55, sr);
  add(
    out,
    rush(sr, rng, 0.13, 1800, 5200, { q: 2, rough: 400 }),
    0.004,
    0.32,
    sr,
  );
  add(out, burst(sr, rng, 0.1, 0.03, { bp: 420 * p, q: 1.5 }), 0.01, 0.25, sr);
  return drive(unit(out), 1.3);
}
// a paper talisman thrown: the snap of paper, the air tearing, a bell far inside it
function talisman(sr, rng, v) {
  const p = [1, 1.06, 0.944][v % 3];
  const out = alloc(sr, 1.1);
  add(out, burst(sr, rng, 0.06, 0.012, { hp: 2200 }), 0, 0.8, sr);
  for (const [at, f] of [
    [0.03, 3000],
    [0.07, 3600],
  ])
    add(out, burst(sr, rng, 0.04, 0.01, { bp: f * p, q: 1.5 }), at, 0.4, sr);
  add(
    out,
    rush(sr, rng, 0.24, 4200 * p, 900 * p, { q: 1.4, rough: 320, hi: 0.3 }),
    0.004,
    0.6,
    sr,
  );
  add(
    out,
    modes(
      sr,
      1.05,
      [
        [1318.5 * p, 0.42, 1],
        [1975.5 * p * 1.003, 0.3, 0.55],
        [2637 * p * 0.997, 0.22, 0.35],
        [3322 * p, 0.16, 0.2],
        [659.3 * p, 0.5, 0.25],
      ],
      rng,
    ),
    0.01,
    0.2,
    sr,
  );
  add(
    out,
    burst(sr, rng, 0.5, 0.18, { bp: 520 * p, q: 2, att: 0.05 }),
    0,
    0.25,
    sr,
  );
  return unit(out);
}
// electricity jumping a gap: the crack, the buzz running down, the air crackling after
function zap(sr, rng, v) {
  const p = [1, 1.08, 0.93][v % 3];
  const out = alloc(sr, 0.36);
  add(out, burst(sr, rng, 0.03, 0.005, { hp: 3000 }), 0, 1, sr);
  const b = alloc(sr, 0.14);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const x = i / b.length;
    ph += (2300 * p * Math.pow(240 / 2300, x)) / sr;
    ph -= Math.floor(ph);
    b[i] =
      (ph * 2 - 1) *
      Math.exp(-x * 4) *
      (0.6 + 0.4 * Math.sin(TAU * 100 * (i / sr)));
  }
  filter(b, "hp", 300, 0.707, sr);
  add(out, b, 0.001, 0.45, sr);
  add(out, thump(sr, 0.1, 210 * p, 90, 0.012, 0.025), 0, 0.22, sr);
  add(
    out,
    ticks(sr, rng, 0.34, 26, { hp: 3500, from: 0.01, ampFall: 0.09 }),
    0,
    0.5,
    sr,
  );
  return drive(unit(out), 1.4);
}
// a blade through the air: light (coin sword) and heavy (guandao)
function whoosh(heavy) {
  return (sr, rng, v) => {
    const p = [1, 0.93, 1.08][v % 3];
    const len = heavy ? 0.46 : 0.28;
    const out = alloc(sr, len);
    const k = heavy ? 0.55 : 1;
    const bell = (x) => Math.pow(Math.sin(Math.PI * Math.pow(x, 0.75)), 1.5);
    add(
      out,
      rush(sr, rng, len, 520 * k * p, 2500 * k * p, {
        q: 1.4,
        rough: heavy ? 110 : 190,
        hi: 0.35,
        curve: 0.7,
        env: bell,
      }),
      0,
      0.9,
      sr,
    );
    add(
      out,
      rush(sr, rng, len, 2300 * k * p, 700 * k * p, {
        q: 1.2,
        rough: 150,
        curve: 1.6,
        env: (x) => bell(x) * x,
      }),
      0,
      0.7,
      sr,
    );
    if (heavy)
      add(out, burst(sr, rng, len, 0.1, { lp: 320, att: 0.06 }), 0.02, 0.8, sr);
    return unit(out);
  };
}

// ---------------------------------------------------------------- out in the street
function explosion(sr, rng, v) {
  const p = [1, 0.9][v % 2];
  const out = alloc(sr, 1.7);
  add(out, thump(sr, 1.2, 104 * p, 34, 0.09, 0.3), 0, 0.9, sr);
  const body = burst(sr, rng, 1.6, 0.42, { lp: 760 * p, hp: 60 });
  add(out, body, 0, 1.4, sr);
  add(out, burst(sr, rng, 0.5, 0.09, { bp: 1300, q: 0.5 }), 0, 1.1, sr);
  add(out, blast(sr, 0.0009), 0, 2.4, sr);
  add(
    out,
    ticks(sr, rng, 1.5, 70, { bp: 1700, q: 0.6, from: 0.15, ampFall: 0.5 }),
    0,
    0.35,
    sr,
  );
  return drive(unit(out), 2.2);
}
// a firework shell bursting: the boom, the stars crackling out, the sizzle
function fireworkBurst(sr, rng, v) {
  const p = [1, 0.9, 1.1][v % 3];
  const out = alloc(sr, 1.5);
  add(out, thump(sr, 0.5, 150 * p, 52, 0.04, 0.11), 0, 0.55, sr);
  add(out, burst(sr, rng, 0.7, 0.13, { lp: 1700 * p, hp: 80 }), 0, 1.1, sr);
  add(out, burst(sr, rng, 0.05, 0.008, { hp: 1500 }), 0, 0.9, sr);
  add(
    out,
    ticks(sr, rng, 1.4, 150, {
      hp: 2600,
      from: 0.07,
      fall: 1.6,
      ampFall: 0.55,
      minLen: 0.0008,
      maxLen: 0.003,
    }),
    0,
    0.85,
    sr,
  );
  add(out, burst(sr, rng, 1.2, 0.4, { hp: 5000, att: 0.12 }), 0.05, 0.12, sr);
  return drive(unit(out), 1.6);
}
// lightning coming down close by
function strike(sr, rng, v) {
  const p = [1, 0.92][v % 2];
  const out = alloc(sr, 2.6);
  add(out, burst(sr, rng, 0.14, 0.03, { hp: 1100 }), 0, 1.6, sr);
  add(
    out,
    rush(sr, rng, 0.34, 5000, 600 * p, {
      q: 0.8,
      rough: 90,
      env: (x) => Math.exp(-x * 2.5),
    }),
    0.004,
    1.4,
    sr,
  );
  const roll = white(sr, 2.5, rng);
  filter(roll, "lp", glide(620 * p, 90), 0.6, sr);
  filter(roll, "hp", 45, 0.707, sr);
  const lvl = wander(sr, roll.length, rng, 7, 0.25, 1, 0.0015);
  for (let i = 0; i < roll.length; i++)
    roll[i] *=
      lvl[i] * (1 - Math.exp(-i / sr / 0.03)) * Math.exp(-i / sr / 0.8);
  add(out, unit(roll), 0.02, 1.2, sr);
  add(out, thump(sr, 1.4, 78 * p, 34, 0.2, 0.4), 0.02, 0.5, sr);
  return drive(unit(out), 1.7);
}
function bell(sr, rng, v) {
  const p = [1, 1.122][v % 2];
  return unit(
    modes(
      sr,
      1.3,
      [
        [660 * p, 0.5, 1],
        [990 * p * 1.004, 0.4, 0.6],
        [1485 * p, 0.3, 0.38],
        [1802 * p, 0.22, 0.2],
        [2640 * p * 0.996, 0.18, 0.18],
      ],
      rng,
    ),
  );
}
// something soft being hit
function flesh(sr, rng, v) {
  const p = VAR4[v % 4];
  const out = alloc(sr, 0.22);
  add(out, thump(sr, 0.16, 190 * p, 72, 0.02, 0.04), 0, 0.6, sr);
  add(out, burst(sr, rng, 0.08, 0.022, { lp: 1300 * p, hp: 110 }), 0, 1, sr);
  const wet = white(sr, 0.14, rng);
  filter(wet, "bp", glide(1300 * p, 380), 3, sr);
  shape(wet, sr, decay(0.035, 0.003));
  add(out, unit(wet), 0.004, 0.85, sr);
  return drive(unit(out), 1.5);
}
// a round or a nail finding the wall
function tick(sr, rng, v) {
  const f = pick(rng, 1800, 3200) * VAR4[v % 4];
  const out = alloc(sr, 0.14);
  add(
    out,
    knock(
      sr,
      rng,
      [
        [f, 0.012, 1],
        [f * 1.62, 0.009, 0.6],
        [f * 2.31, 0.006, 0.3],
      ],
      { hp: 2600, tick: 0.9 },
    ),
    0,
    0.8,
    sr,
  );
  add(out, burst(sr, rng, 0.08, 0.02, { hp: 2500 }), 0.006, 0.3, sr);
  add(out, thump(sr, 0.05, 230, 120, 0.008, 0.012), 0, 0.3, sr);
  return unit(out);
}
// a blade going in: the cut, the wet, the steel still ringing
function slash(sr, rng, v) {
  const p = [1, 0.94, 1.07][v % 3];
  const out = alloc(sr, 0.4);
  add(out, burst(sr, rng, 0.1, 0.03, { lp: 950 * p }), 0, 1, sr);
  add(out, thump(sr, 0.14, 142 * p, 60, 0.02, 0.04), 0, 0.55, sr);
  const wet = white(sr, 0.16, rng);
  filter(wet, "bp", glide(1500 * p, 480), 3, sr);
  shape(wet, sr, decay(0.05, 0.004));
  add(out, unit(wet), 0.006, 0.55, sr);
  add(
    out,
    modes(
      sr,
      0.38,
      [
        [2350 * p, 0.12, 1],
        [3720 * p, 0.08, 0.6],
        [5210 * p, 0.05, 0.35],
      ],
      rng,
    ),
    0.002,
    0.11,
    sr,
  );
  return drive(unit(out), 1.5);
}
function fall(sr, rng, v) {
  const p = [1, 0.9][v % 2];
  const out = alloc(sr, 0.4);
  add(out, thump(sr, 0.35, 98 * p, 46, 0.06, 0.09), 0, 0.7, sr);
  add(out, burst(sr, rng, 0.3, 0.07, { lp: 700, hp: 70 }), 0, 1, sr);
  add(out, burst(sr, rng, 0.14, 0.04, { bp: 1000, q: 0.8 }), 0.015, 0.45, sr);
  return unit(out);
}
function coin(sr, rng, v) {
  const out = alloc(sr, 0.5);
  for (let i = 0; i < 3; i++) {
    const f = pick(rng, 3200, 5600) * VAR4[v % 4];
    add(
      out,
      knock(
        sr,
        rng,
        [
          [f, pick(rng, 0.08, 0.2), 1],
          [f * 1.47, 0.06, 0.5],
          [f * 2.09, 0.04, 0.25],
        ],
        { hp: 4000, tick: 0.5, ring: 0.8, jit: 0.01 },
      ),
      i * pick(rng, 0.012, 0.045),
      0.6,
      sr,
    );
  }
  return unit(out);
}

// ---------------------------------------------------------------- mechanical cues
// What a part rings at when it is knocked: [frequency, decay seconds, level].
const STEEL = [
  [1930, 0.009, 1],
  [2910, 0.007, 0.75],
  [4380, 0.005, 0.5],
  [860, 0.014, 0.4],
];
const SMALL = [
  [2600, 0.006, 1],
  [4100, 0.005, 0.6],
  [1700, 0.008, 0.4],
];
const MAG = [
  [1100, 0.012, 1],
  [1650, 0.01, 0.7],
  [2480, 0.008, 0.5],
  [520, 0.02, 0.5],
];
const TUBE = [
  [1250, 0.012, 1],
  [1900, 0.009, 0.6],
  [2900, 0.006, 0.4],
  [610, 0.02, 0.5],
];
const POLY = [
  [700, 0.012, 1],
  [1150, 0.01, 0.6],
  [1900, 0.006, 0.3],
];
const WOOD = [
  [430, 0.02, 1],
  [640, 0.014, 0.6],
  [980, 0.009, 0.35],
];
const BRASS = [
  [2900, 0.012, 1],
  [4400, 0.01, 0.6],
  [6100, 0.007, 0.3],
];
const TANK = [
  [310, 0.06, 1],
  [620, 0.045, 0.6],
  [1240, 0.03, 0.4],
  [1980, 0.02, 0.2],
];
const at = (list, k) => list.map(([f, tau, amp]) => [f * k, tau, amp]);
// the steps of a cue: a knock, a slide, a low bump, a puff of noise
const K = (t, g, list, o) => ["k", t, g, list, o];
const S = (t, dur, f0, f1, g, o) => ["s", t, g, dur, f0, f1, o];
const T = (t, f0, f1, tau, g) => ["t", t, g, f0, f1, tau];
const N = (t, tau, g, o) => ["n", t, g, tau, o];
const CUE_DEFS = {
  click: [0.08, K(0, 0.9, SMALL)],
  dry: [0.1, K(0, 0.7, at(SMALL, 0.85)), T(0, 300, 200, 0.008, 0.25)],
  latch: [0.1, K(0, 1, at(STEEL, 0.98)), T(0, 260, 150, 0.012, 0.3)],
  magOut: [0.2, K(0, 0.8, MAG), S(0.02, 0.11, 900, 500, 0.35, { rough: 420 })],
  magIn: [
    0.22,
    S(0, 0.07, 700, 1300, 0.3, { rough: 420 }),
    K(0.06, 1, MAG, { hp: 2000 }),
    T(0.06, 170, 90, 0.03, 0.6),
    K(0.078, 0.35, SMALL),
  ],
  boltBack: [
    0.2,
    S(0, 0.06, 1400, 900, 0.45, { rough: 500 }),
    K(0.05, 0.85, STEEL),
    T(0.05, 220, 130, 0.015, 0.25),
  ],
  boltFwd: [
    0.18,
    K(0, 1, at(STEEL, 1.08)),
    T(0, 210, 110, 0.02, 0.45),
    K(0.004, 0.2, [[3400, 0.03, 1]], { tick: 0 }),
  ],
  pumpBack: [
    0.22,
    S(0, 0.085, 1000, 650, 0.65, { rough: 380 }),
    K(0.075, 0.9, TUBE),
    T(0.075, 190, 110, 0.02, 0.35),
  ],
  pumpFwd: [
    0.22,
    S(0, 0.075, 700, 1100, 0.6, { rough: 380 }),
    K(0.065, 1, at(TUBE, 1.2)),
    T(0.065, 200, 100, 0.025, 0.5),
  ],
  leverOpen: [
    0.24,
    K(0, 0.6, at(STEEL, 0.93)),
    S(0.015, 0.09, 1200, 800, 0.4, { rough: 300 }),
    K(0.1, 0.75, at(TUBE, 1.04)),
  ],
  leverClose: [
    0.2,
    S(0, 0.07, 800, 1300, 0.4, { rough: 300 }),
    K(0.06, 1, at(STEEL, 0.98)),
    T(0.06, 200, 110, 0.02, 0.4),
  ],
  hammerCock: [0.14, K(0, 0.5, at(SMALL, 0.88)), K(0.05, 0.7, at(SMALL, 1.12))],
  cylOpen: [
    0.16,
    K(0, 0.7, [
      [1700, 0.01, 1],
      [2600, 0.016, 0.5],
      [3900, 0.006, 0.3],
    ]),
    N(0.03, 0.02, 0.15, { bp: 2400 }),
  ],
  cylClose: [
    0.2,
    K(0, 1, [
      [1400, 0.012, 1],
      [2200, 0.016, 0.6],
      [3300, 0.006, 0.3],
    ]),
    T(0, 190, 100, 0.025, 0.45),
  ],
  cylSpin: [
    0.36,
    ...Array.from({ length: 7 }, (_, i) =>
      K(
        i * 0.028 + i * i * 0.002,
        0.5,
        [
          [3000 + i * 40, 0.004, 1],
          [4500, 0.003, 0.4],
        ],
        { hp: 3500 },
      ),
    ),
  ],
  shellIn: [
    0.2,
    N(0, 0.02, 0.3, { bp: 1100 }),
    K(0.045, 0.8, [
      [900, 0.012, 1],
      [1500, 0.01, 0.5],
      [2900, 0.012, 0.3],
    ]),
    T(0.045, 240, 150, 0.02, 0.4),
  ],
  roundIn: [0.16, K(0, 0.55, BRASS), K(0.04, 0.7, at(TUBE, 1.04))],
  canOut: [
    0.34,
    S(0, 0.16, 1800, 900, 0.3, { q: 3, rough: 260 }),
    K(0.15, 0.8, TANK),
  ],
  canIn: [
    0.36,
    K(0, 0.9, at(TANK, 0.9)),
    S(0.04, 0.18, 900, 1900, 0.3, { q: 3, rough: 260 }),
  ],
  gasHiss: [0.4, N(0, 0.12, 0.45, { hp: 5200, att: 0.02 })],
  batteryOut: [
    0.16,
    K(0, 0.7, at(POLY, 1.7)),
    N(0.03, 0.03, 0.25, { bp: 600 }),
  ],
  batteryIn: [
    0.2,
    N(0, 0.025, 0.25, { bp: 600 }),
    K(0.05, 1, at(POLY, 1.45)),
    T(0.05, 150, 90, 0.02, 0.35),
  ],
  tubeIn: [
    0.24,
    T(0, 280, 190, 0.03, 0.6),
    N(0, 0.025, 0.5, { lp: 900 }),
    K(0.002, 0.4, [
      [230, 0.05, 1],
      [460, 0.03, 0.5],
    ]),
  ],
  woodKnock: [
    0.16,
    K(0, 0.95, WOOD, { hp: 1200, tick: 0.5 }),
    T(0, 220, 150, 0.015, 0.3),
  ],
  stringDraw: [
    0.3,
    S(0, 0.18, 1500, 2400, 0.3, { q: 4, rough: 60 }),
    T(0, 85, 120, 0.08, 0.3),
  ],
  stringSnap: [
    0.36,
    K(
      0,
      0.9,
      [
        [128, 0.09, 1],
        [257, 0.06, 0.6],
        [389, 0.04, 0.4],
      ],
      { hp: 1800, tick: 0.6 },
    ),
    K(0.006, 0.6, at(WOOD, 1.5)),
  ],
  paper: [
    0.16,
    N(0, 0.012, 0.5, { bp: 2700, q: 1.5 }),
    N(0.03, 0.012, 0.5, { bp: 3600, q: 1.5 }),
    N(0.06, 0.012, 0.45, { bp: 3100, q: 1.5 }),
  ],
  cloth: [
    0.26,
    N(0, 0.06, 0.6, { lp: 900, att: 0.03 }),
    S(0, 0.16, 500, 900, 0.3, { rough: 120 }),
  ],
  draw: [
    0.34,
    S(0, 0.2, 600, 1400, 0.5, { rough: 150, q: 1.2 }),
    N(0, 0.07, 0.4, { lp: 1100, att: 0.04 }),
    K(0.2, 0.45, at(STEEL, 0.8)),
  ],
};
function cueGen(name) {
  const [len, ...steps] = CUE_DEFS[name];
  return (sr, rng, v) => {
    const p = [1, 1.045][v % 2];
    const out = alloc(sr, len);
    for (const [kind, t, g, a, b, c, d] of steps) {
      if (kind === "k") add(out, knock(sr, rng, at(a, p), b || {}), t, g, sr);
      else if (kind === "s")
        add(
          out,
          rush(sr, rng, a, b * p, c * p, { q: 2.2, rough: 300, ...(d || {}) }),
          t,
          g,
          sr,
        );
      else if (kind === "t")
        add(out, thump(sr, c * 5 + 0.02, a * p, b * p, c, c), t, g, sr);
      else add(out, burst(sr, rng, a * 6, a, b || {}), t, g, sr);
    }
    return unit(out);
  };
}
// two that are not knocks
function spark(sr, rng, v) {
  const out = alloc(sr, 0.16);
  add(out, burst(sr, rng, 0.03, 0.006, { hp: 3500 }), 0, 0.9, sr);
  add(out, ticks(sr, rng, 0.15, 12, { hp: 4000, ampFall: 0.04 }), 0, 0.6, sr);
  add(
    out,
    modes(sr, 0.1, [[pick(rng, 2600, 3400) * [1, 1.1][v % 2], 0.01, 1]], rng),
    0,
    0.2,
    sr,
  );
  return unit(out);
}
function fuse(sr, rng) {
  const out = alloc(sr, 0.5);
  add(out, burst(sr, rng, 0.48, 0.16, { hp: 4200, att: 0.03 }), 0, 0.5, sr);
  add(out, ticks(sr, rng, 0.46, 30, { hp: 3000, ampFall: 0.3 }), 0, 0.7, sr);
  return unit(out);
}

// ---------------------------------------------------------------- sustained
const LOOP = 2.6;
// a jet of burning fuel: the roar breathing, the hiss on top of it
function flameLoop(blue) {
  return (sr, rng) =>
    unit(
      seamless(sr, LOOP, (a) => {
        const n = a.length;
        const body = white(sr, n / sr, rng);
        filter(body, "lp", blue ? 1500 : 760, 0.6, sr);
        filter(body, "hp", blue ? 260 : 90, 0.7, sr);
        const breath = wander(sr, n, rng, blue ? 13 : 7, 0.45, 1, 0.004);
        const hiss = white(sr, n / sr, rng);
        filter(hiss, "hp", blue ? 2600 : 1700, 0.707, sr);
        const flutter = wander(sr, n, rng, 22, 0.5, 1, 0.01);
        const hl = blue ? 0.16 : 0.07;
        for (let i = 0; i < n; i++)
          a[i] = body[i] * breath[i] + hiss[i] * hl * flutter[i];
        if (blue) {
          // the whine of a tight jet
          let ph = 0;
          for (let i = 0; i < n; i++) {
            ph += (TAU * (610 + 40 * breath[i])) / sr;
            a[i] += Math.sin(ph) * 0.012;
          }
        }
      }),
    );
}
// a live arc: mains hum with its harmonics, torn by crackle
function arcLoop(sr, rng) {
  return unit(
    seamless(sr, LOOP, (a) => {
      const n = a.length;
      const tear = wander(sr, n, rng, 30, 0.2, 1, 0.02);
      const hiss = white(sr, n / sr, rng);
      filter(hiss, "hp", 3000, 0.707, sr);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        let s = 0;
        // (the 100 Hz itself is kept low: small speakers give back only its harmonics)
        for (let h = 1; h <= 11; h += 2)
          s +=
            (Math.sin(TAU * 100 * h * t + h) * (h === 1 ? 0.35 : 1)) /
            Math.sqrt(h);
        s += 0.5 * Math.sign(Math.sin(TAU * 151 * t));
        const gate = 0.55 + 0.45 * Math.sign(Math.sin(TAU * 50 * t));
        a[i] = s * 0.5 * (0.6 + 0.4 * tear[i]) + hiss[i] * 0.7 * gate * tear[i];
      }
      filter(a, "hp", 80, 0.707, sr);
      const c = ticks(sr, rng, n / sr, 140, { hp: 2500, maxLen: 0.006 });
      for (let i = 0; i < n; i++) a[i] += c[i] * 0.8;
    }),
  );
}
// something winding up (the game raises its pitch with the charge)
function chargeLoop(sr) {
  // whole numbers of cycles in the loop, so it closes on itself with no fold
  const a = alloc(sr, 2);
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    const tri = (2 / Math.PI) * Math.asin(Math.sin(TAU * 110 * t));
    a[i] =
      tri * 0.4 +
      Math.sin(TAU * 220.5 * t) * 0.4 +
      Math.sin(TAU * 331 * t) * 0.3 * (1 + 0.5 * Math.sin(TAU * 6 * t)) +
      Math.sin(TAU * 441.5 * t) * 0.2 +
      Math.sin(TAU * 662 * t) * 0.1;
  }
  return unit(a);
}

// ---------------------------------------------------------------- the table
// The game's fields: n variants, sr, peak (level the buffer is normalised to), bus, max (how
// many of it at once), pri (who gives way), ref / roll (distance), defer (may be synthesised
// late: the first asking waits for it rather than holding the frame), loop.
const shot = (gen, n, peak = 0.97, max = 5) => ({
  gen,
  n,
  sr: HI,
  peak,
  bus: "gun",
  max,
  pri: 9,
});
const hand = (gen, n, peak, o = {}) => ({
  gen,
  n,
  sr: MID,
  peak,
  bus: "gun",
  max: 3,
  pri: 5,
  ...o,
});
const street = (gen, n, peak, o = {}) => ({
  gen,
  n,
  sr: MID,
  peak,
  bus: "world",
  max: 4,
  pri: 5,
  ref: 5,
  roll: 0.6,
  defer: 1,
  ...o,
});
const CUE_PEAK = {
  click: 0.3,
  dry: 0.42,
  latch: 0.4,
  hammerCock: 0.34,
  paper: 0.3,
  cloth: 0.3,
  gasHiss: 0.3,
  stringDraw: 0.34,
  cylSpin: 0.32,
};
export const SOUNDS = {
  a_shot_shotgun: shot(gun("shotgun"), 3, 0.97, 4),
  a_shot_shotgun_a: shot(gun("shotgun_a"), 3, 0.97, 4),
  a_shot_shotgun_b: shot(gun("shotgun_b"), 3, 0.97, 4),
  a_shot_smg: shot(gun("smg"), 5, 0.94, 9),
  a_shot_revolver: shot(gun("revolver"), 4, 0.97, 5),
  a_shot_lever: shot(gun("lever"), 3, 0.97, 4),
  a_shot_nailgun: shot(nailer(false), 4, 0.8, 8),
  a_shot_nailgun_a: shot(nailer(true), 4, 0.88, 6),
  a_shot_rocket: shot(rocket, 3, 0.8, 4),
  a_shot_mortar: shot(mortar, 3, 0.95, 4),
  a_shot_crossbow: shot(crossbow, 3, 0.8, 4),
  a_shot_talisman: shot(talisman, 3, 0.7, 5),
  a_zap: hand(zap, 3, 0.6, { sr: HI, max: 4 }),
  a_whoosh: hand(whoosh(false), 3, 0.5),
  a_whoosh_heavy: hand(whoosh(true), 3, 0.7),
  a_spark: hand(spark, 2, 0.4),
  a_fuse: hand(fuse, 2, 0.34),
  ...Object.fromEntries(
    Object.keys(CUE_DEFS).map((name) => [
      "a_" + name,
      hand(cueGen(name), 2, CUE_PEAK[name] ?? 0.5),
    ]),
  ),
  a_explosion: street(explosion, 2, 0.95, { ref: 9, roll: 0.5, pri: 8 }),
  a_burst: street(fireworkBurst, 3, 0.9, { ref: 9, roll: 0.5, pri: 7 }),
  a_thunder: street(strike, 2, 0.95, { ref: 10, roll: 0.45, pri: 8, max: 3 }),
  a_chime: street(bell, 2, 0.45, { max: 3 }),
  a_flesh: street(flesh, 4, 0.6),
  a_tick: street(tick, 4, 0.5, { max: 5, pri: 3 }),
  a_slash: street(slash, 3, 0.8, { ref: 4 }),
  a_fall: street(fall, 2, 0.55),
  a_coin: street(coin, 4, 0.4, { max: 5, pri: 3 }),
  a_loop_flame: { gen: flameLoop(false), n: 1, sr: MID, peak: 0.5, loop: 1 },
  a_loop_blueflame: { gen: flameLoop(true), n: 1, sr: MID, peak: 0.5, loop: 1 },
  a_loop_arc: { gen: arcLoop, n: 1, sr: MID, peak: 0.4, loop: 1 },
  a_loop_charge: { gen: chargeLoop, n: 1, sr: MID, peak: 0.3, loop: 1 },
};

// The names the weapons and effects ask for -> the sound in the table.
export const keyOf = (name) =>
  SOUNDS["a_" + name] ? "a_" + name : name === "gun" ? "a_shot_revolver" : null;

// What each weapon's report is: [sound, level, a second sound played with it].
export const SHOTS = {
  shotgun: {
    base: ["a_shot_shotgun", 1],
    a: ["a_shot_shotgun_a", 1],
    b: ["a_shot_shotgun_b", 1.05],
  },
  smg: { base: ["a_shot_smg", 0.85], b: ["a_shot_smg", 0.85, "zap"] },
  revolver: {
    base: ["a_shot_revolver", 1],
    b: ["a_shot_revolver", 1, "chime"],
  },
  lever: { base: ["a_shot_lever", 1] },
  nailgun: { base: ["a_shot_nailgun", 0.9], a: ["a_shot_nailgun_a", 1] },
  firework: { base: ["a_shot_rocket", 0.9], b: ["a_shot_mortar", 1] },
  crossbow: {
    base: ["a_shot_crossbow", 0.9],
    a: ["a_shot_crossbow", 0.9, "fuse"],
    b: ["a_shot_crossbow", 0.9, "paper"],
  },
  talisman: { base: ["a_shot_talisman", 0.9] },
};
export const shotOf = (id, branch) =>
  SHOTS[id] ? SHOTS[id][branch] || SHOTS[id].base : null;

/** Runs a sound's generator to the end (they may yield between stages) and levels it. */
export function render(key, variant = 0, rate, rng) {
  const def = SOUNDS[key];
  if (!def) return null;
  const sr = rate || def.sr;
  let out = def.gen(sr, rng, variant % def.n);
  if (out && typeof out.next === "function") {
    let step;
    do step = out.next();
    while (!step.done);
    out = step.value;
  }
  if (!def.loop) {
    const i = Math.min(out.length >> 1, Math.round(0.0003 * sr));
    const o = Math.min(out.length >> 1, Math.round(0.012 * sr));
    for (let k = 0; k < i; k++) out[k] *= k / i;
    for (let k = 0; k < o; k++) {
      const x = k / o;
      out[out.length - 1 - k] *= x * x;
    }
  }
  unit(out, def.peak);
  return { data: out, sr };
}
