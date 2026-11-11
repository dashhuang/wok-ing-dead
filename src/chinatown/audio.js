// Chinatown audio: zombie voices and foley, the three evacuation sirens and the night-city bed.
// The audio section of game.js loads this module, merges SOUNDS into its sound table and calls
// create() with its context, buses and event wrapper. Everything here plays through those buses,
// so master volume, pause muting, the death low-pass and the reverb sends apply without extra work.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------------------------------------
// Synthesis kit. Generators follow the game's contract: gen(sampleRate, rng, variant) returns a
// Float32Array (or is a generator function that yields between stages and returns one); the game
// normalises the result to the definition's `peak` and fades the edges.
// ---------------------------------------------------------------------------------------------

const alloc = (sr, sec) => new Float32Array(Math.max(1, Math.round(sr * sec)));
const pick = (rng, a, b) => a + (b - a) * rng();

function white(sr, sec, rng) {
  const a = alloc(sr, sec);
  for (let i = 0; i < a.length; i++) a[i] = rng() * 2 - 1;
  return a;
}

// RBJ biquad coefficients, normalised by a0
function coefs(type, f, q, sr) {
  const w = (TAU * clamp(f, 10, sr * 0.47)) / sr;
  const c = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  const a0 = 1 + al;
  if (type === "lp")
    return [
      (1 - c) / 2 / a0,
      (1 - c) / a0,
      (1 - c) / 2 / a0,
      (-2 * c) / a0,
      (1 - al) / a0,
    ];
  if (type === "hp")
    return [
      (1 + c) / 2 / a0,
      -(1 + c) / a0,
      (1 + c) / 2 / a0,
      (-2 * c) / a0,
      (1 - al) / a0,
    ];
  return [al / a0, 0, -al / a0, (-2 * c) / a0, (1 - al) / a0];
}

// Filters in place. `f` is a frequency, or a function of normalised time (0..1) for a sweep.
function filter(a, type, f, q, sr) {
  const sweep = typeof f === "function";
  const n = a.length;
  let k = sweep ? null : coefs(type, f, q, sr);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < n; i++) {
    if (sweep && (i & 31) === 0) k = coefs(type, f(i / n), q, sr);
    const x = a[i];
    const y = k[0] * x + z1;
    z1 = k[1] * x - k[3] * y + z2;
    z2 = k[2] * x - k[4] * y;
    a[i] = y;
  }
  return a;
}

function shape(a, sr, fn) {
  for (let i = 0; i < a.length; i++) a[i] *= fn(i / sr);
  return a;
}

const strike =
  (tau, att = 0) =>
  (t) =>
    (att > 0 ? 1 - Math.exp(-t / att) : 1) * Math.exp(-t / tau);

function add(dst, src, at, gain, sr) {
  const o = Math.round(at * sr);
  const n = Math.min(src.length, dst.length - o);
  for (let i = Math.max(0, -o); i < n; i++) dst[o + i] += src[i] * gain;
  return dst;
}

function unit(a) {
  let p = 0;
  for (let i = 0; i < a.length; i++) p = Math.max(p, Math.abs(a[i]));
  if (p > 0) for (let i = 0; i < a.length; i++) a[i] /= p;
  return a;
}

function drive(a, k) {
  const m = 1 / Math.tanh(k);
  for (let i = 0; i < a.length; i++) a[i] = Math.tanh(a[i] * k) * m;
  return a;
}

// Sine whose pitch falls from f0 to f1: the body of every thud.
function thump(sr, sec, f0, f1, tauF, tauA, att = 0.0008) {
  const a = alloc(sr, sec);
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t / tauF))) / sr;
    a[i] = Math.sin(ph) * Math.exp(-t / tauA) * (1 - Math.exp(-t / att));
  }
  return a;
}

// Filtered noise burst, peak-normalised.
function burst(sr, rng, sec, tau, o = {}) {
  const a = white(sr, sec, rng);
  if (o.hp) filter(a, "hp", o.hp, 0.707, sr);
  if (o.lp) filter(a, "lp", o.lp, 0.707, sr);
  if (o.bp) filter(a, "bp", o.bp, o.q || 1, sr);
  return unit(shape(a, sr, strike(tau, o.att || 0)));
}

// Decaying sine partials: [frequency, decay time, amplitude].
function modes(sr, sec, list, rng) {
  const a = alloc(sr, sec);
  for (const [f, tau, amp] of list) {
    if (f > sr * 0.45) continue;
    const ph = rng ? rng() * TAU : 0;
    const w = (TAU * f) / sr;
    const n = Math.min(a.length, Math.ceil(tau * sr * 7));
    for (let i = 0; i < n; i++)
      a[i] += amp * Math.sin(w * i + ph) * Math.exp(-i / (tau * sr));
  }
  const fadeIn = Math.min(a.length, Math.round(0.0005 * sr));
  for (let i = 0; i < fadeIn; i++) a[i] *= i / fadeIn;
  const fadeOut = Math.min(a.length, Math.round(0.03 * sr));
  for (let i = 0; i < fadeOut; i++) a[a.length - 1 - i] *= i / fadeOut;
  return a;
}

// Sparse short noise ticks: droplets, grit, rattling slats.
function ticks(sr, rng, sec, count, o = {}) {
  const a = alloc(sr, sec);
  const from = o.from || 0;
  for (let c = 0; c < count; c++) {
    const t = from + (sec - from - 0.01) * Math.pow(rng(), o.fall || 1);
    const start = Math.round(t * sr);
    const len = Math.round(pick(rng, o.min || 0.001, o.max || 0.004) * sr);
    const amp = pick(rng, 0.2, 1) * (o.fade ? Math.exp(-t / o.fade) : 1);
    for (let i = 0; i < len && start + i < a.length; i++)
      a[start + i] += (rng() * 2 - 1) * amp * Math.exp((-4 * i) / len);
  }
  if (o.hp) filter(a, "hp", o.hp, 0.707, sr);
  if (o.lp) filter(a, "lp", o.lp, 0.707, sr);
  if (o.bp) filter(a, "bp", o.bp, o.q || 1, sr);
  return a;
}

// Slowly wandering random gain: turns hiss into something torn or gritty.
function roughen(a, sr, rng, hz, depth = 0.7) {
  const k = 1 - Math.exp((-hz * 6) / sr);
  let g = 1;
  let target = 1;
  let next = 0;
  for (let i = 0; i < a.length; i++) {
    if (i >= next) {
      target = 1 - depth * rng();
      next = i + (sr / hz) * (0.5 + rng());
    }
    g += (target - g) * k;
    a[i] *= g;
  }
  return a;
}

// Wet squelch: resonant noise sweeping down with a fast gurgle on it.
function squelch(sr, rng, sec, f0, f1, q, tau, gurgleHz) {
  const a = white(sr, sec, rng);
  filter(a, "bp", (t) => f0 * Math.pow(f1 / f0, t), q, sr);
  const ph = rng() * TAU;
  shape(
    a,
    sr,
    (t) =>
      (0.55 + 0.45 * Math.sin(TAU * gurgleHz * t + ph)) *
      (1 - Math.exp(-t / 0.003)) *
      Math.exp(-t / tau),
  );
  return unit(a);
}

const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

// ---- generators ----

// Bullet into dead flesh: dull thud, wet slap, a little spatter.
function fleshHit(sr, rng, v) {
  const k = [1, 1.12, 0.9, 1.05][v & 3];
  const a = alloc(sr, 0.3);
  add(a, thump(sr, 0.1, 175 * k, 62, 0.02, 0.03), 0, 0.85, sr);
  add(a, burst(sr, rng, 0.05, 0.011, { lp: 950 * k }), 0, 1, sr);
  add(a, squelch(sr, rng, 0.12, 2600 * k, 800, 1.7, 0.032, 46), 0.004, 0.6, sr);
  add(
    a,
    burst(sr, rng, 0.05, 0.016, { bp: 3600, q: 0.7, att: 0.002 }),
    0.002,
    0.16,
    sr,
  );
  add(
    a,
    ticks(sr, rng, 0.28, 10, {
      from: 0.025,
      fall: 1.7,
      hp: 2400,
      lp: 8000,
      fade: 0.09,
    }),
    0,
    0.26,
    sr,
  );
  return drive(unit(a), 1.25);
}

// Headshot: bone crack, pressure release, then what is left landing on the wet street.
function headshot(sr, rng, v) {
  const k = [1, 0.9, 1.1][v % 3];
  const a = alloc(sr, 0.56);
  add(
    a,
    modes(
      sr,
      0.06,
      [
        [1180 * k, 0.011, 1],
        [1890 * k, 0.009, 0.8],
        [2710 * k, 0.007, 0.6],
        [4020 * k, 0.005, 0.4],
      ],
      rng,
    ),
    0,
    0.7,
    sr,
  );
  add(a, burst(sr, rng, 0.012, 0.0016, { hp: 2800 }), 0, 0.9, sr);
  add(a, thump(sr, 0.16, 150 * k, 46, 0.026, 0.05), 0.002, 1, sr);
  const gush = white(sr, 0.22, rng);
  filter(gush, "lp", (t) => 5200 * Math.pow(0.1, t), 0.8, sr);
  add(a, unit(shape(gush, sr, strike(0.055, 0.002))), 0.003, 0.85, sr);
  add(a, squelch(sr, rng, 0.2, 2100 * k, 480, 2.2, 0.06, 38), 0.012, 0.6, sr);
  add(
    a,
    ticks(sr, rng, 0.5, 24, {
      from: 0.05,
      fall: 1.5,
      hp: 1700,
      lp: 7500,
      fade: 0.17,
      max: 0.006,
    }),
    0,
    0.34,
    sr,
  );
  return drive(unit(a), 1.5);
}

// Dead weight hitting wet pavement, a limb following a moment later.
function bodyFall(sr, rng, v) {
  const k = [1, 0.88, 1.1][v % 3];
  const a = alloc(sr, 0.75);
  add(a, thump(sr, 0.24, 140 * k, 55, 0.035, 0.07, 0.002), 0, 1, sr);
  add(a, burst(sr, rng, 0.14, 0.04, { lp: 520 * k, att: 0.003 }), 0, 0.85, sr);
  add(
    a,
    burst(sr, rng, 0.2, 0.06, { bp: 1900, q: 0.6, att: 0.006 }),
    0.004,
    0.2,
    sr,
  );
  const second = pick(rng, 0.13, 0.21);
  add(a, thump(sr, 0.12, 165 * k, 70, 0.025, 0.035, 0.002), second, 0.42, sr);
  add(a, burst(sr, rng, 0.06, 0.018, { lp: 720 }), second, 0.32, sr);
  add(
    a,
    ticks(sr, rng, 0.6, 9, {
      from: 0.03,
      fall: 1.4,
      hp: 1500,
      lp: 6000,
      fade: 0.2,
      max: 0.006,
    }),
    0,
    0.12,
    sr,
  );
  const cloth = burst(sr, rng, 0.3, 0.09, { bp: 2700, q: 0.6, att: 0.02 });
  add(a, roughen(cloth, sr, rng, 90), 0, 0.07, sr);
  return drive(unit(a), 1.2);
}

// Walker gait: a foot dragged across wet asphalt, then planted.
function shuffle(sr, rng, v) {
  const k = [1, 1.1, 0.92, 1.04][v & 3];
  const len = pick(rng, 0.2, 0.3);
  const att = pick(rng, 0.03, 0.06);
  const a = alloc(sr, len + 0.2);
  const env = (t) =>
    Math.min(1, t / att) * (t > len - 0.07 ? Math.max(0, (len - t) / 0.07) : 1);
  const drag = white(sr, len, rng);
  filter(drag, "bp", (t) => 1350 * k * Math.pow(0.55, t), 0.9, sr);
  add(a, unit(roughen(shape(drag, sr, env), sr, rng, 140, 0.75)), 0, 0.62, sr);
  const grit = white(sr, len, rng);
  filter(grit, "hp", 3400, 0.707, sr);
  add(a, unit(roughen(shape(grit, sr, env), sr, rng, 260, 0.85)), 0, 0.12, sr);
  const plant = len - 0.03;
  add(a, thump(sr, 0.07, 96 * k, 50, 0.02, 0.022, 0.0015), plant, 0.7, sr);
  add(a, burst(sr, rng, 0.05, 0.013, { lp: 640 * k }), plant, 0.5, sr);
  add(
    a,
    ticks(sr, rng, 0.16, 4, { hp: 2200, lp: 7000, max: 0.005 }),
    plant,
    0.14,
    sr,
  );
  return a;
}

// Runner gait: a flat wet footfall.
function slap(sr, rng, v) {
  const k = [1, 1.1, 0.9][v % 3];
  const a = alloc(sr, 0.36);
  add(a, thump(sr, 0.08, 122 * k, 54, 0.018, 0.024, 0.0012), 0, 0.9, sr);
  add(a, burst(sr, rng, 0.05, 0.012, { lp: 820 * k }), 0, 0.85, sr);
  const splash = white(sr, 0.2, rng);
  filter(splash, "bp", (t) => 2500 * Math.pow(0.45, t), 0.8, sr);
  add(a, unit(shape(splash, sr, strike(0.045, 0.004))), 0.004, 0.36, sr);
  add(
    a,
    ticks(sr, rng, 0.3, 7, {
      from: 0.02,
      fall: 1.5,
      hp: 2000,
      lp: 7500,
      fade: 0.1,
      max: 0.005,
    }),
    0,
    0.22,
    sr,
  );
  return a;
}

// A zombie's blow landing on the player: heavy, close, with cloth tearing under it.
function maul(sr, rng, v) {
  const k = [1, 0.9, 1.08][v % 3];
  const a = alloc(sr, 0.5);
  add(a, thump(sr, 0.2, 150 * k, 52, 0.03, 0.055, 0.0012), 0, 1, sr);
  add(
    a,
    burst(sr, rng, 0.08, 0.022, { bp: 640 * k, q: 0.8, att: 0.001 }),
    0,
    0.9,
    sr,
  );
  add(a, burst(sr, rng, 0.16, 0.05, { lp: 300 }), 0, 0.7, sr);
  const rip = white(sr, 0.22, rng);
  filter(rip, "bp", (t) => 2500 * Math.pow(1.7, t), 1.2, sr);
  add(
    a,
    unit(roughen(shape(rip, sr, strike(0.065, 0.008)), sr, rng, 320, 0.9)),
    0.018,
    0.3,
    sr,
  );
  add(a, squelch(sr, rng, 0.14, 1700 * k, 600, 2, 0.045, 52), 0.008, 0.34, sr);
  return drive(unit(a), 1.5);
}

// Wind chimes outside a shopfront: tuned tubes, free-bar partials, a gust's worth of strikes.
const CHIME_NOTES = [659.3, 784, 880, 987.8, 1174.7, 1318.5];
function* chime(sr, rng, v) {
  const a = alloc(sr, 5);
  const tune = [1, 1.122, 0.891][v % 3];
  const hits = 5 + Math.floor(rng() * 5);
  let last = -1;
  for (let h = 0; h < hits; h++) {
    let n = Math.floor(rng() * CHIME_NOTES.length);
    if (n === last) n = (n + 1) % CHIME_NOTES.length;
    last = n;
    const f = CHIME_NOTES[n] * tune;
    const t = 0.02 + 2.6 * Math.pow(rng(), 1.5);
    const amp = pick(rng, 0.25, 1) * Math.exp(-t / 2.2);
    const ring = modes(
      sr,
      2.2,
      [
        [f, 0.55, 1],
        [f * 1.004, 0.5, 0.45],
        [f * 2.756, 0.22, 0.3],
        [f * 5.404, 0.09, 0.12],
      ],
      rng,
    );
    add(a, ring, t, amp, sr);
    add(a, burst(sr, rng, 0.006, 0.001, { hp: 4000 }), t, amp * 0.25, sr);
    yield;
  }
  return a;
}

// A loose roller shutter caught by the wind: sheet-metal bangs with the slats rattling after.
function* shutter(sr, rng, v) {
  const k = [1, 0.86, 1.15][v % 3];
  const a = alloc(sr, 1.9);
  const bangs = [
    [
      [0, 1],
      [0.42, 0.45],
    ],
    [
      [0, 1],
      [0.34, 0.5],
      [0.55, 0.28],
    ],
    [
      [0, 0.8],
      [0.6, 1],
    ],
  ][v % 3];
  for (const [t, amp] of bangs) {
    const body = modes(
      sr,
      0.9,
      [
        [97 * k, 0.2, 1],
        [163 * k, 0.16, 0.8],
        [251 * k, 0.14, 0.7],
        [372 * k, 0.11, 0.55],
        [527 * k, 0.09, 0.45],
        [806 * k, 0.07, 0.35],
        [1193 * k, 0.05, 0.25],
        [1790 * k, 0.035, 0.15],
      ],
      rng,
    );
    add(a, body, t, amp * 0.5, sr);
    add(a, burst(sr, rng, 0.08, 0.02, { lp: 2300 }), t, amp * 0.8, sr);
    add(a, burst(sr, rng, 0.01, 0.002, { hp: 2000 }), t, amp * 0.5, sr);
    add(
      a,
      ticks(sr, rng, 0.4, 16, {
        from: 0.01,
        fall: 1.6,
        bp: 2300 * k,
        q: 1.8,
        fade: 0.12,
        max: 0.006,
      }),
      t,
      amp * 0.5,
      sr,
    );
    yield;
  }
  return a;
}

// Streets between there and here: late reflections, the air taking the top off, wind carrying
// the sound in and out. Shared by everything that is meant to be blocks away.
function* carry(a, sr, rng, len, lp, fadeIn, fadeOut) {
  const dry = a.slice();
  for (const [d, g] of [
    [0.13, 0.55],
    [0.29, 0.4],
    [0.47, 0.3],
    [0.71, 0.2],
  ])
    add(a, dry, d, g, sr);
  yield;
  filter(a, "lp", lp, 0.6, sr);
  filter(a, "hp", 220, 0.7, sr);
  yield;
  let w = 0.6;
  let target = 0.6;
  const k = 1 - Math.exp(-3 / sr);
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    if (i % 4096 === 0) target = 0.35 + 0.65 * rng();
    w += (target - w) * k;
    a[i] *= w * smooth(t / fadeIn) * smooth((len - t) / fadeOut);
  }
  return a;
}

// An emergency vehicle somewhere across the city: wail (0) or two-tone (1), drifting flat.
function* farSiren(sr, rng, v) {
  const len = 11;
  const a = alloc(sr, len);
  const drift = pick(rng, 0.02, 0.045);
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    let f;
    if (v === 0) {
      const c = (t % 4.4) / 4.4;
      f = 520 + 460 * smooth(c < 0.36 ? c / 0.36 : 1 - (c - 0.36) / 0.64);
    } else f = Math.floor(t / 0.62) % 2 ? 466 : 622;
    ph += (TAU * f * (1 - (drift * t) / len)) / sr;
    a[i] =
      Math.sin(ph) +
      0.45 * Math.sin(2 * ph) +
      0.22 * Math.sin(3 * ph) +
      0.1 * Math.sin(4 * ph);
    if ((i & 16383) === 0) yield;
  }
  yield;
  return yield* carry(a, sr, rng, len, 1250, 3.2, 3.6);
}

// A car alarm nobody is coming back for.
function* carAlarm(sr, rng) {
  const len = 9;
  const a = alloc(sr, len);
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    let f;
    let on = 1;
    if (t < 3.2) f = Math.floor(t / 0.2) % 2 ? 1320 : 980;
    else if (t < 6.2) {
      const c = ((t - 3.2) % 0.3) / 0.3;
      f = 700 + 1100 * c;
      on = c < 0.85 ? 1 : 0;
    } else {
      f = 1250;
      on = ((t - 6.2) % 0.5) / 0.5 < 0.5 ? 1 : 0;
    }
    ph += (TAU * f) / sr;
    a[i] =
      on * (Math.sin(ph) + 0.33 * Math.sin(3 * ph) + 0.2 * Math.sin(5 * ph));
    if ((i & 16383) === 0) yield;
  }
  yield;
  return yield* carry(a, sr, rng, len, 1700, 2.4, 3);
}

// Definitions merged into the game's sound table. `impact_enemy` replaces the old armour ping;
// `defer` marks sounds that must never be synthesised on demand in the middle of a frame.
export const SOUNDS = {
  impact_enemy: {
    gen: fleshHit,
    n: 4,
    sr: 44100,
    peak: 0.75,
    bus: "world",
    max: 4,
    pri: 5,
    ref: 5,
    roll: 0.6,
  },
  z_headshot: {
    gen: headshot,
    n: 3,
    sr: 44100,
    peak: 0.9,
    bus: "world",
    max: 3,
    pri: 7,
    ref: 6,
    roll: 0.55,
  },
  z_bodyfall: {
    gen: bodyFall,
    n: 3,
    sr: 32000,
    peak: 0.58,
    bus: "world",
    max: 6,
    pri: 4,
    ref: 4,
    roll: 0.8,
  },
  z_shuffle: {
    gen: shuffle,
    n: 4,
    sr: 32000,
    peak: 0.4,
    bus: "world",
    max: 5,
    pri: 2,
    ref: 2.6,
    roll: 1,
  },
  z_slap: {
    gen: slap,
    n: 3,
    sr: 32000,
    peak: 0.44,
    bus: "world",
    max: 5,
    pri: 2,
    ref: 2.6,
    roll: 1,
  },
  z_maul: {
    gen: maul,
    n: 3,
    sr: 44100,
    peak: 0.6,
    bus: "near",
    max: 2,
    pri: 8,
  },
  z_chime: {
    gen: chime,
    n: 3,
    sr: 32000,
    peak: 0.5,
    bus: "world",
    max: 2,
    pri: 1,
    defer: 1,
  },
  z_shutter: {
    gen: shutter,
    n: 3,
    sr: 32000,
    peak: 0.65,
    bus: "world",
    max: 2,
    pri: 1,
    defer: 1,
  },
  z_farsiren: {
    gen: farSiren,
    n: 2,
    sr: 22050,
    peak: 0.45,
    bus: "world",
    max: 1,
    pri: 1,
    defer: 1,
  },
  z_alarm: {
    gen: carAlarm,
    n: 1,
    sr: 22050,
    peak: 0.4,
    bus: "world",
    max: 1,
    pri: 1,
    defer: 1,
  },
};

// Synthesised early: these are needed within seconds of the first contact.
export const ORDER = [
  "z_shuffle",
  "z_slap",
  "z_bodyfall",
  "z_headshot",
  "z_maul",
];

// ---------------------------------------------------------------------------------------------
// Zombie voice samples (CC0, see docs/assets-audio.md). The number is a loudness trim in dB so
// every file sits at the same perceived level before the per-kind gain is applied.
// ---------------------------------------------------------------------------------------------

const VOICE_DIR = "assets/audio/zombie/";
const VOICE_FILES = {
  moan: [
    ["moan_1", 2.2],
    ["moan_2", -0.6],
    ["moan_3", 2.2],
    ["moan_4", -0.4],
  ],
  growl: [
    ["growl_1", 0.3],
    ["growl_2", 0.4],
    ["growl_3", 1.9],
    ["growl_4", -0.2],
  ],
  scream: [
    ["scream_1", -0.6],
    ["scream_2", -2.4],
    ["scream_3", 0.8],
    ["scream_4", 3.0],
    ["scream_5", 0.1],
  ],
  grunt: [
    ["grunt_1", -0.1],
    ["grunt_2", -1.2],
    ["grunt_3", -1.7],
    ["grunt_4", -1.7],
  ],
  pain: [
    ["pain_1", -1.2],
    ["pain_2", 0.0],
    ["pain_3", 1.3],
    ["pain_4", -0.1],
  ],
  death: [
    ["death_1", 1.1],
    ["death_2", 2.3],
    ["death_3", 2.0],
  ],
};

// gain: level at arm's length. rate: playback speed before per-zombie variation. range: beyond
// this the voice is left to the horde murmur. pri: who wins a voice channel (worth ~12 m each).
// rest: seconds a zombie stays quiet afterwards. max: simultaneous voices of this kind.
const VOICE = {
  moan: { gain: 0.5, rate: 0.9, range: 36, pri: 1, rest: 2.2, max: 3 },
  growl: { gain: 0.72, rate: 0.98, range: 48, pri: 2, rest: 0.9, max: 3 },
  scream: { gain: 1.0, rate: 1.02, range: 75, pri: 4, rest: 0.5, max: 3 },
  grunt: { gain: 0.88, rate: 1.0, range: 32, pri: 3, rest: 0.25, max: 3 },
  pain: { gain: 0.7, rate: 1.03, range: 42, pri: 2, rest: 0.4, max: 3 },
  death: {
    gain: 0.72,
    rate: 0.94,
    range: 52,
    pri: 5,
    rest: 0,
    max: 3,
    fall: 0.66,
  },
};

const MAX_VOICES = 7;
const VOICE_REF = 3; // metres at which a voice is at full level
const VOICE_ROLLOFF = 0.9;
const BRUTE_GAIN = 1.3;
const OCCLUDED_GAIN = 0.5;
const OCCLUDED_CUTOFF = 0.3;
// All voices together may be about as loud as one scream in your face, never more: past that the
// whole group is turned down, so a swarm stays a set of throats instead of a wall.
const HORDE_CEILING = 0.9;

// Air absorption: how bright a voice still is after d metres.
const voiceCutoff = (d) => 1100 + 13500 * Math.exp(-d / 15);

const bank = new Map(); // kind -> [{ name, buffer, gain }]
let bankLoad = null;
let murmurBuffer = null;
let murmurBuild = null;
let murmurInfo = null;

function decode(ctx, data) {
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(data, resolve, reject);
    if (p && p.catch) p.catch(reject);
  });
}

function loadVoices(ctx, base) {
  if (bankLoad) return bankLoad;
  const jobs = [];
  for (const [kind, files] of Object.entries(VOICE_FILES))
    for (const [name, trim] of files)
      jobs.push({ kind, name, gain: Math.pow(10, trim / 20) });
  const status = { loaded: 0, failed: 0 };
  const one = async (job) => {
    try {
      const res = await fetch(base + VOICE_DIR + job.name + ".wav");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buffer = await decode(ctx, await res.arrayBuffer());
      if (!bank.has(job.kind)) bank.set(job.kind, []);
      bank.get(job.kind).push({ name: job.name, buffer, gain: job.gain });
      status.loaded++;
    } catch (err) {
      if (!status.failed++)
        console.warn(
          "[audio] zombie voice " +
            job.name +
            " unavailable: " +
            ((err && err.message) || err),
        );
    }
  };
  bankLoad = (async () => {
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) await one(jobs[next++]);
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return status;
  })();
  bankLoad.status = status;
  return bankLoad;
}

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The horde you cannot see: a seamless loop of the same voices slowed down, piled up and smeared,
// rendered once in the background. Two periods are rendered and the second kept, so every tail
// that runs past the loop point is already present at its start.
const MURMUR_SECONDS = 13;
const MURMUR_RMS = 0.1;
function buildMurmur(ctx) {
  if (murmurBuild) return murmurBuild;
  murmurBuild = (async () => {
    await bankLoad;
    // sorted, so the loop comes out the same whatever order the files arrived in
    const pool = [
      ...(bank.get("moan") || []),
      ...(bank.get("growl") || []),
      ...(bank.get("death") || []),
    ].sort((a, b) => (a.name < b.name ? -1 : 1));
    const Offline =
      window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (pool.length < 3 || !Offline) return null;
    let sr = 24000;
    let off;
    try {
      off = new Offline(1, sr * MURMUR_SECONDS * 2, sr);
    } catch {
      sr = ctx.sampleRate;
      off = new Offline(1, Math.round(sr * MURMUR_SECONDS * 2), sr);
    }
    const sum = off.createGain();
    const hp = off.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 110;
    const lp = off.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 0.5;
    sum.connect(hp);
    hp.connect(lp);
    lp.connect(off.destination);
    for (const [time, feedback] of [
      [0.137, 0.46],
      [0.211, 0.42],
      [0.293, 0.38],
    ]) {
      const delay = off.createDelay(1);
      delay.delayTime.value = time;
      const back = off.createGain();
      back.gain.value = feedback;
      const wet = off.createGain();
      wet.gain.value = 0.45;
      lp.connect(delay);
      delay.connect(back);
      back.connect(delay);
      delay.connect(wet);
      wet.connect(off.destination);
    }
    const rng = mulberry(77123);
    for (let i = 0; i < 64; i++) {
      const s = pool[Math.floor(rng() * pool.length)];
      const rate = 0.5 + 0.36 * rng();
      const at = rng() * MURMUR_SECONDS;
      const level = (0.25 + 0.75 * rng()) * s.gain;
      for (let period = 0; period < 2; period++) {
        const src = off.createBufferSource();
        src.buffer = s.buffer;
        src.playbackRate.value = rate;
        const g = off.createGain();
        g.gain.value = level;
        src.connect(g);
        g.connect(sum);
        src.start(at + period * MURMUR_SECONDS);
      }
    }
    const rendered = await off.startRendering();
    const n = Math.round(sr * MURMUR_SECONDS);
    const loop = rendered.getChannelData(0).slice(n, n * 2);
    let sq = 0;
    for (let i = 0; i < loop.length; i++) sq += loop[i] * loop[i];
    const rms = Math.sqrt(sq / loop.length);
    if (!(rms > 1e-6)) return null;
    const k = MURMUR_RMS / rms;
    let peak = 0;
    let step = 0;
    for (let i = 0; i < loop.length; i++) {
      loop[i] = clamp(loop[i] * k, -1, 1);
      peak = Math.max(peak, Math.abs(loop[i]));
      if (i) step = Math.max(step, Math.abs(loop[i] - loop[i - 1]));
    }
    // `seam` compares the jump across the loop point with the largest jump inside the loop
    murmurInfo = {
      seconds: MURMUR_SECONDS,
      sampleRate: sr,
      peak: +peak.toFixed(3),
      seam: +(Math.abs(loop[0] - loop[loop.length - 1]) / (step || 1)).toFixed(
        3,
      ),
    };
    const buffer = ctx.createBuffer(1, loop.length, sr);
    buffer.getChannelData(0).set(loop);
    murmurBuffer = buffer;
    return buffer;
  })().catch((err) => {
    console.warn(
      "[audio] horde murmur unavailable: " + ((err && err.message) || err),
    );
    return null;
  });
  return murmurBuild;
}

// ---------------------------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------------------------

// Siren tuning. A mechanical siren's pitch is its rotor speed: the motor is switched on and off
// and the rotor follows with inertia, which is what gives the wail its shape. Two rows of ports
// on one shaft give two tones a minor third apart.
const SIREN = {
  top: 720, // Hz of the lower tone at full speed
  ratio: 1.2,
  level: 0.32,
  half: 24, // metres at which the siren has lost half its level
  motorOn: [3.4, 4.2],
  motorOff: [4.6, 5.8],
  rise: 1.45,
  coast: 3.1,
  coastTo: 0.45,
  windDown: 0.7,
  height: 4.8, // the horns sit at the top of the pole (see siren() in landmarks.js)
};

export function create(env) {
  const { G, ctx, buses, listener: L, play, on, running } = env;
  const rnd = env.rnd || Math.random;
  const base = (import.meta.env && import.meta.env.BASE_URL) || "/";
  const stats = {
    spoken: 0,
    dropped: 0,
    stolen: 0,
    steps: 0,
    stepsDropped: 0,
    far: 0,
    setupMs: 0,
  };
  const t0 = performance.now();
  let clock = 0;
  let last = {
    state: "title",
    paused: false,
    intensity: 0,
    interior: 0,
    amb: 0,
    gust: 0.4,
  };

  // Voices load in the background; the horde murmur is built from them once they are in.
  let ready = Promise.resolve(null);
  if (!env.offline) {
    const voicesIn = loadVoices(ctx, base);
    ready = Promise.all([
      voicesIn,
      buildMurmur(ctx).then((buffer) => buffer && startMurmur(buffer)),
    ])
      .then(() => voicesIn)
      .catch(() => null);
  }

  const V3 = G.THREE && G.THREE.Vector3;
  const rayA = V3 ? new V3() : null;
  const rayB = V3 ? new V3() : null;

  const distTo = (p) => Math.hypot(p.x - L.x, (p.y || 0) - L.y, p.z - L.z);

  // Is there open air between a point and the listener? `shy` stops the ray short of the source
  // so a siren does not get blocked by its own pole.
  function openAir(x, y, z, shy = 0) {
    const physics = G.physics;
    if (!rayA || !physics || !physics.lineOfSight) return true;
    try {
      rayA.set(L.x, L.y, L.z);
      rayB.set(x, y, z);
      if (shy > 0) {
        const d = rayA.distanceTo(rayB);
        if (d <= shy + 0.5) return true;
        rayB.lerp(rayA, shy / d);
      }
      return !!physics.lineOfSight(rayA, rayB);
    } catch {
      return true;
    }
  }

  function place(pan, x, y, z) {
    if (!Number.isFinite(x + y + z)) return;
    if (pan.positionX) {
      pan.positionX.value = x;
      pan.positionY.value = y;
      pan.positionZ.value = z;
    } else pan.setPosition(x, y, z);
  }

  // Same panner model the game uses for its own positional sounds.
  function makePanner(hrtf, ref, rolloff) {
    const pan = ctx.createPanner();
    pan.panningModel = hrtf ? "HRTF" : "equalpower";
    pan.distanceModel = "inverse";
    pan.refDistance = ref;
    pan.rolloffFactor = rolloff;
    pan.maxDistance = 400;
    pan.coneInnerAngle = 360;
    return pan;
  }

  // ---------- zombie voices ----------
  const hordeBus = ctx.createGain();
  hordeBus.connect(buses.world);
  let hordeGain = 1;
  const voices = [];
  for (let i = 0; i < MAX_VOICES; i++) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 12000;
    lp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.value = 0;
    const pan = makePanner(true, VOICE_REF, VOICE_ROLLOFF);
    lp.connect(g);
    g.connect(pan);
    pan.connect(hordeBus);
    voices.push({
      lp,
      g,
      pan,
      src: null,
      enemy: null,
      kind: "",
      pri: 0,
      dist: 0,
      start: 0,
      end: 0,
      level: 0,
      open: true,
      lookT: 0,
      x: 0,
      y: 0,
      z: 0,
    });
  }

  const minds = new WeakMap(); // per-zombie voice character and bookkeeping
  function mindOf(z) {
    let m = minds.get(z);
    if (!m) {
      m = { pitch: 1, voice: null, rest: 0, pained: 0 };
      retune(z, m);
      minds.set(z, m);
    }
    return m;
  }
  function retune(z, m) {
    // brutes sit a good third lower; everyone else is spread a little around the recording
    m.pitch = z.type === "brute" ? 0.75 + rnd() * 0.07 : 0.95 + rnd() * 0.1;
  }

  const lastFile = {};
  function choose(kind, set, now) {
    if (set.length === 1) return set[0];
    const busy = new Set();
    for (const v of voices)
      if (v.end > now && v.kind === kind && v.file) busy.add(v.file);
    let options = set.filter(
      (s) => s.name !== lastFile[kind] && !busy.has(s.name),
    );
    if (!options.length) options = set.filter((s) => s.name !== lastFile[kind]);
    const s = options[Math.floor(rnd() * options.length)];
    lastFile[kind] = s.name;
    return s;
  }

  function mouthOf(z, out) {
    const s = z.sensor;
    if (
      s &&
      Number.isFinite(s.x + s.y + s.z) &&
      Math.abs(s.x - z.pos.x) + Math.abs(s.z - z.pos.z) < 3
    ) {
      out.x = s.x;
      out.y = s.y;
      out.z = s.z;
    } else {
      out.x = z.pos.x;
      out.y =
        (z.pos.y || 0) + (z.crawling ? 0.35 : z.type === "brute" ? 1.85 : 1.55);
      out.z = z.pos.z;
    }
    return out;
  }

  function hush(v, fade = 0.04) {
    const now = ctx.currentTime;
    if (v.end <= now) return;
    try {
      v.g.gain.cancelScheduledValues(now);
      v.g.gain.setTargetAtTime(0, now, fade / 3);
      if (v.src) v.src.stop(now + fade + 0.01);
    } catch {}
    v.end = now + fade;
    v.src = null;
    v.enemy = null;
  }

  // Free channel, or the most expendable one if the newcomer matters more. A priority step is
  // worth about 12 m, so a moan at your shoulder still beats a growl across the street.
  function channelFor(kind, d, pri, now) {
    const cfg = VOICE[kind];
    let free = null;
    let worst = null;
    let worstScore = Infinity;
    let same = 0;
    let farSame = null;
    for (const v of voices) {
      if (v.end <= now) {
        free = free || v;
        continue;
      }
      if (v.kind === kind) {
        same++;
        if (!farSame || v.dist > farSame.dist) farSame = v;
      }
      const score = v.pri * 12 - v.dist;
      if (score < worstScore) {
        worstScore = score;
        worst = v;
      }
    }
    if (same >= cfg.max)
      return farSame && farSame.dist > d * 1.5 + 2 ? farSame : null;
    if (free) return free;
    return worst && pri * 12 - d > worstScore + 6 ? worst : null;
  }

  let lastOnset = -1;
  const mouth = { x: 0, y: 0, z: 0 };

  function speak(z, kind, o = {}) {
    const cfg = VOICE[kind];
    const set = bank.get(kind);
    if (!cfg || !set || !set.length || !running() || !z || !z.pos) return false;
    const now = ctx.currentTime;
    const brute = z.type === "brute";
    mouthOf(z, mouth);
    const d = distTo(mouth);
    const range = cfg.range * (brute ? 1.25 : 1);
    if (d > range) return false;
    // thin the far end of the range instead of cutting it off
    if (
      !o.force &&
      d > range * 0.6 &&
      rnd() < (d - range * 0.6) / (range * 0.4)
    )
      return false;
    const mind = mindOf(z);
    if (mind.voice && mind.voice.enemy === z && mind.voice.end > now) {
      if (cfg.pri <= mind.voice.pri) return false;
      hush(mind.voice, 0.04);
    } else if (!o.force && cfg.pri < 3 && now < mind.rest) return false;
    const v = channelFor(kind, d, cfg.pri, now);
    if (!v) {
      stats.dropped++;
      return false;
    }
    // keep onsets apart so a crowd reads as separate throats, not one smear
    let start = Math.max(now, lastOnset + 0.06);
    if (start - now > 0.3) {
      stats.dropped++;
      return false;
    }
    if (v.end > now) {
      stats.stolen++;
      hush(v, 0.03);
      start = Math.max(start, now + 0.045);
    }
    lastOnset = start;

    const sample = choose(kind, set, now);
    const rate = clamp(
      cfg.rate * mind.pitch * (1 + (rnd() * 2 - 1) * 0.03),
      0.4,
      2,
    );
    // the more throats already going, the less each new one adds; the close ones give up least
    let active = 0;
    for (const other of voices) if (other.end > now) active++;
    const crowd = 1 / Math.sqrt(1 + (d > 6 ? 0.3 : 0.12) * active);
    const level =
      cfg.gain *
      sample.gain *
      (brute ? BRUTE_GAIN : 1) *
      (0.86 + 0.28 * rnd()) *
      (o.gain || 1) *
      crowd;
    const open = openAir(mouth.x, mouth.y, mouth.z);

    const src = ctx.createBufferSource();
    src.buffer = sample.buffer;
    src.playbackRate.value = rate;
    let length = sample.buffer.duration / rate;
    if (cfg.fall) {
      // the breath runs out: pitch sags as it goes
      try {
        src.playbackRate.setValueAtTime(rate, start);
        src.playbackRate.exponentialRampToValueAtTime(
          rate * cfg.fall,
          start + length * 1.2,
        );
        length *= 1.22;
      } catch {}
    }
    src.connect(v.lp);
    src.onended = () => {
      try {
        src.disconnect();
      } catch {}
      if (v.src === src) {
        v.src = null;
        v.end = Math.min(v.end, ctx.currentTime);
      }
    };
    v.x = mouth.x;
    v.y = mouth.y;
    v.z = mouth.z;
    place(v.pan, v.x, v.y, v.z);
    const cutoff = voiceCutoff(d) * (open ? 1 : OCCLUDED_CUTOFF);
    try {
      v.lp.frequency.cancelScheduledValues(now);
      v.lp.frequency.setValueAtTime(Math.max(420, cutoff), start);
      v.g.gain.setValueAtTime(level * (open ? 1 : OCCLUDED_GAIN), start);
    } catch {
      v.lp.frequency.value = Math.max(420, cutoff);
      v.g.gain.value = level * (open ? 1 : OCCLUDED_GAIN);
    }
    src.start(start);
    v.src = src;
    v.enemy = z;
    v.kind = kind;
    v.file = sample.name;
    v.rate = +rate.toFixed(3);
    v.pri = cfg.pri;
    v.dist = d;
    v.start = start;
    v.end = start + length + 0.03;
    v.level = level;
    v.open = open;
    v.lookT = 0.15 + rnd() * 0.1;
    mind.voice = v;
    mind.rest = v.end + cfg.rest * (0.6 + 0.8 * rnd());
    stats.spoken++;
    stats.last = `${kind} ${sample.name} x${v.rate} ${level.toFixed(2)}`;
    return true;
  }

  function updateVoices(dt, now) {
    let power = 0;
    for (const v of voices) {
      if (v.end <= now) continue;
      const z = v.enemy;
      if (z && z.pos) {
        mouthOf(z, v);
        place(v.pan, v.x, v.y, v.z);
      }
      v.dist = distTo(v);
      if (now < v.start) continue;
      const heard =
        v.level *
        (v.open ? 1 : OCCLUDED_GAIN) *
        (VOICE_REF /
          (VOICE_REF + VOICE_ROLLOFF * Math.max(0, v.dist - VOICE_REF)));
      power += heard * heard;
      v.lookT -= dt;
      if (v.lookT <= 0) {
        v.lookT = 0.2 + rnd() * 0.1;
        const open = openAir(v.x, v.y, v.z);
        if (open !== v.open) {
          v.open = open;
          v.g.gain.setTargetAtTime(
            v.level * (open ? 1 : OCCLUDED_GAIN),
            now,
            0.1,
          );
        }
      }
      v.lp.frequency.setTargetAtTime(
        Math.max(420, voiceCutoff(v.dist) * (v.open ? 1 : OCCLUDED_CUTOFF)),
        now,
        0.08,
      );
    }
    // duck fast, recover slowly
    const want = Math.min(1, HORDE_CEILING / Math.sqrt(power || 1e-9));
    hordeGain +=
      (want - hordeGain) *
      (1 - Math.exp(-dt / (want < hordeGain ? 0.03 : 0.3)));
    hordeBus.gain.value = hordeGain;
  }

  // Something far off, heard through the streets: one sample, low-passed, mostly reverb, with a
  // slap off a building behind it.
  function farCry(kind, x, y, z, gain, cutoff, rate) {
    const set = bank.get(kind);
    if (!set || !set.length || !running()) return false;
    const sample = set[Math.floor(rnd() * set.length)];
    const now = ctx.currentTime;
    const d = Math.max(1, Math.hypot(x - L.x, y - L.y, z - L.z));
    const pan = makePanner(false, d, 1);
    place(pan, x, y, z);
    pan.connect(buses.world);
    const send = ctx.createGain();
    send.gain.value = 1.3;
    pan.connect(send);
    if (env.reverb) send.connect(env.reverb);
    let pending = 2;
    for (const [delay, level, tone] of [
      [0, 1, 1],
      [0.21 + rnd() * 0.16, 0.42, 0.6],
    ]) {
      const src = ctx.createBufferSource();
      src.buffer = sample.buffer;
      src.playbackRate.value = rate;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = cutoff * tone;
      lp.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.value = gain * level * sample.gain;
      src.connect(lp);
      lp.connect(g);
      g.connect(pan);
      src.onended = () => {
        try {
          src.disconnect();
          lp.disconnect();
          g.disconnect();
          if (--pending <= 0) {
            pan.disconnect();
            send.disconnect();
          }
        } catch {}
      };
      src.start(now + delay);
    }
    stats.far++;
    return true;
  }

  // A few of them howling from one side of the district.
  function farHowl(count, gain) {
    const bearing = rnd() * TAU;
    for (let i = 0; i < count; i++)
      later(0.2 + i * (0.25 + rnd() * 0.5), () => {
        const a = bearing + (rnd() - 0.5) * 0.9;
        const r = 55 + rnd() * 35;
        farCry(
          rnd() < 0.7 ? "scream" : "growl",
          L.x + Math.cos(a) * r,
          2 + rnd() * 3,
          L.z + Math.sin(a) * r,
          gain * (0.7 + 0.5 * rnd()),
          900 + rnd() * 700,
          0.78 + rnd() * 0.2,
        );
      });
  }

  // Small scheduler on game time, so nothing queued fires while paused.
  const queue = [];
  function later(delay, fn) {
    if (queue.length < 24) queue.push({ at: clock + delay, fn });
  }
  function runQueue() {
    for (let i = queue.length - 1; i >= 0; i--)
      if (queue[i].at <= clock) {
        const job = queue[i];
        queue.splice(i, 1);
        try {
          job.fn();
        } catch (err) {
          console.error("[audio] queued sound", err);
        }
      }
  }

  // ---------- foley ----------
  let stepTokens = 4;
  let fallTimes = null;

  // When does the body reach the ground in each death clip? Read once from the hip track: `body`
  // is the moment the hips are all the way down, `knees` an earlier drop to about half height
  // (falling to the knees first) when the clip has one.
  function fallTime(name) {
    if (!fallTimes) {
      fallTimes = {};
      try {
        const clips = G.enemies && G.enemies.debug && G.enemies.debug.clips;
        for (const key of ["death_back", "death_front"]) {
          const track =
            clips &&
            clips[key] &&
            clips[key].tracks.find((t) => t.name === "Hips.position");
          if (!track) continue;
          const y0 = track.values[1];
          let low = Infinity;
          for (let i = 1; i < track.values.length; i += 3)
            low = Math.min(low, track.values[i]);
          const reach = (share) => {
            for (let i = 0; i < track.times.length; i++)
              if (track.values[i * 3 + 1] <= low + share * (y0 - low))
                return track.times[i] - track.times[0];
            return null;
          };
          const body = reach(0.18);
          const knees = reach(0.55);
          if (body != null)
            fallTimes[key] = {
              body,
              knees: knees != null && body - knees > 0.5 ? knees : null,
            };
        }
      } catch {}
    }
    return fallTimes[name] || { body: 0.8, knees: null };
  }

  on("enemy:spawn", (e) => {
    if (e.enemy) retune(e.enemy, mindOf(e.enemy));
  });

  on("enemy:voice", (e) => {
    speak(e.enemy, e.kind);
  });

  // Heard a shot and turned towards it: now and then one within earshot answers.
  let answered = -9;
  on("enemy:alert", (e) => {
    const z = e.enemy;
    if (
      !e.noise ||
      !z ||
      !z.pos ||
      clock - answered < 1.6 ||
      distTo(z.pos) > 26
    )
      return;
    answered = clock;
    later(
      0.25 + rnd() * 0.6,
      () => z.alive && speak(z, "growl", { gain: 0.85 }),
    );
  });

  on("enemy:step", (e) => {
    const p = e.pos;
    if (!p) return;
    const d = distTo(p);
    // near feet always sound; further out they thin, and a crowd cannot flood the channels
    if (
      d > 24 ||
      (d > 7 && rnd() < (d - 7) / 17) ||
      (stepTokens < 1 && d > 4)
    ) {
      stats.stepsDropped++;
      return;
    }
    stepTokens = Math.max(0, stepTokens - 1);
    const brute = e.type === "brute";
    const fast = (+e.speed || 0) > 2.4;
    play(fast ? "z_slap" : "z_shuffle", {
      pos: p,
      gain: (fast ? 0.8 : 0.55) * (brute ? 1.35 : 1),
      pitch: brute ? 0.78 : 1,
      jitter: 0.08,
    });
    stats.steps++;
  });

  on("enemy:hit", (e) => {
    const z = e.enemy;
    if (!z || !z.alive || !(z.hp > 0)) return;
    const mind = mindOf(z);
    if (clock < mind.pained || rnd() > (z.type === "brute" ? 0.3 : 0.5)) return;
    mind.pained = clock + 0.7 + rnd() * 0.8;
    speak(z, "pain", { gain: e.part === "weak" ? 1.1 : 1 });
  });

  on("enemy:killed", (e) => {
    const z = e.enemy;
    const p = e.pos || (z && z.pos);
    if (!z || !p) return;
    const mind = mindOf(z);
    const brute = (e.type || z.type) === "brute";
    const head = e.part === "weak";
    if (mind.voice && mind.voice.enemy === z)
      hush(mind.voice, head ? 0.03 : 0.07);
    if (head) {
      mouthOf(z, mouth);
      play("z_headshot", {
        pos: mouth,
        gain: 1,
        pitch: brute ? 0.84 : 1,
        jitter: 0.06,
      });
    }
    // a headshot mostly drops them without a sound; anything else gets a last breath
    if (!head || rnd() < 0.25)
      speak(z, "death", { force: true, gain: head ? 0.6 : 1 });
    if (!z.crawling) {
      // the death clips play faster after a headshot; the thuds follow the animation
      const fall = fallTime(z.anim);
      const speed = head ? 1.5 : 1.25;
      const weight = brute ? 1.2 : 0.9;
      const pitch = brute ? 0.8 : 1;
      if (fall.knees != null)
        play("z_bodyfall", {
          pos: p,
          delay: fall.knees / speed,
          gain: weight * 0.5,
          pitch: pitch * 1.3,
          jitter: 0.07,
        });
      play("z_bodyfall", {
        pos: p,
        delay: fall.body / speed + rnd() * 0.04,
        gain: weight,
        pitch,
        jitter: 0.07,
      });
    }
  });

  on("enemy:melee", (e) => {
    const brute = (e.type || (e.enemy && e.enemy.type)) === "brute";
    play("z_maul", {
      gain: brute ? 1 : 0.85,
      pitch: brute ? 0.82 : 1,
      jitter: 0.06,
    });
  });

  on("holdout:wave", (e) => {
    farHowl(clamp(2 + Math.floor((+e.wave || 1) / 2), 2, 4), 0.24);
  });
  on("objective:all", () => {
    later(1.4, () => farHowl(4, 0.27));
  });

  // ---------- evacuation sirens ----------
  let sirenWave = null;
  let noiseLoop = null;
  const sirens = [];

  function sirenNodes() {
    if (!sirenWave) {
      const imag = new Float32Array([
        0, 1, 0.5, 0.34, 0.2, 0.13, 0.08, 0.05, 0.03,
      ]);
      sirenWave = ctx.createPeriodicWave(new Float32Array(imag.length), imag);
      const n = Math.round(ctx.sampleRate * 1.5);
      noiseLoop = ctx.createBuffer(1, n, ctx.sampleRate);
      const data = noiseLoop.getChannelData(0);
      const rng = mulberry(4401);
      for (let i = 0; i < n; i++) data[i] = rng() * 2 - 1;
    }
    const tone = (level) => {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(sirenWave);
      osc.frequency.value = 30;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g);
      osc.start();
      return { osc, g };
    };
    const low = tone(0.55);
    const high = tone(0.45);
    const rush = ctx.createBufferSource();
    rush.buffer = noiseLoop;
    rush.loop = true;
    const rushBand = ctx.createBiquadFilter();
    rushBand.type = "bandpass";
    rushBand.frequency.value = 1500;
    rushBand.Q.value = 0.7;
    const rushGain = ctx.createGain();
    rushGain.gain.value = 0;
    rush.connect(rushBand);
    rushBand.connect(rushGain);
    rush.start(0, rnd() * 1.4);
    const horn = ctx.createBiquadFilter();
    horn.type = "peaking";
    horn.frequency.value = 1050;
    horn.Q.value = 1.1;
    horn.gain.value = 7;
    const throat = ctx.createBiquadFilter();
    throat.type = "lowpass";
    throat.frequency.value = 3600;
    throat.Q.value = 0.6;
    const air = ctx.createBiquadFilter();
    air.type = "lowpass";
    air.frequency.value = 8000;
    air.Q.value = 0.5;
    const out = ctx.createGain();
    out.gain.value = 0;
    const pan = makePanner(false, 1, 0); // direction only: distance is handled here
    low.g.connect(horn);
    high.g.connect(horn);
    rushGain.connect(horn);
    horn.connect(throat);
    throat.connect(air);
    air.connect(out);
    out.connect(pan);
    pan.connect(buses.world);
    return { low: low.osc, high: high.osc, rushGain, air, out, pan };
  }

  function resetSirens(state) {
    const objectives = (G.level && G.level.objectives) || [];
    const holdout =
      state !== "title" &&
      G.game &&
      G.game.run &&
      G.game.run.mode === "holdout";
    objectives.forEach((o, i) => {
      if (!o || !o.pos) return;
      let s = sirens[i];
      if (!s) {
        // new sirens start mid-wail, staggered so the three never rise and fall in step
        s = sirens[i] = {
          nodes: sirenNodes(),
          tune: [1, 0.943, 1.06, 0.972, 1.03][i % 5],
          rotRate: 0.8 + 0.25 * ((i * 7) % 3),
          rot: rnd() * TAU,
          lookT: rnd() * 0.5,
          open: true,
          openS: 1,
          dist: 0,
          mode: "live",
          motor: i % 2 === 0,
          phaseT: 1 + ((i * 3.3 + rnd() * 1.5) % 4),
          speed: 0.5 + 0.4 * ((i * 0.61) % 1),
          powerS: 1,
          wow: 0,
        };
      } else if (s.mode !== "live" && !holdout) {
        // re-armed: the rotor spins back up from wherever it had got to
        s.motor = true;
        s.phaseT =
          SIREN.motorOn[0] + rnd() * (SIREN.motorOn[1] - SIREN.motorOn[0]);
      }
      s.id = o.id || "relay_" + i; // the mission falls back to the same id
      s.x = o.pos.x;
      s.y = (o.pos.y || 0) + SIREN.height;
      s.z = o.pos.z;
      place(s.nodes.pan, s.x, s.y, s.z);
      s.mode = holdout ? "off" : "live";
      s.cut = 0;
      s.power = 1;
      s.flickT = 0;
    });
    for (let i = objectives.length; i < sirens.length; i++)
      if (sirens[i]) sirens[i].mode = "off";
  }

  const sirenById = (id) => sirens.find((s) => s && s.id === id);

  // The mission keeps the truth about which sirens are cut. Following it every few frames means
  // no restart path, debug shortcut or missed event can leave a siren in the wrong state.
  let syncT = 0;
  function syncSirens(dt, st) {
    if ((syncT -= dt) > 0) return;
    syncT = 0.25;
    const run = G.game && G.game.run;
    if (!run) return;
    const title = st.state === "title";
    for (const s of sirens) {
      if (!s) continue;
      const relay = (run.relays || []).find((r) => r && r.id === s.id);
      const want = title || (relay && !relay.cut);
      if (want && s.mode !== "live") {
        s.mode = "live";
        s.cut = 0;
        s.motor = true;
        s.phaseT =
          SIREN.motorOn[0] + rnd() * (SIREN.motorOn[1] - SIREN.motorOn[0]);
      } else if (!want && s.mode === "live") s.mode = relay ? "dying" : "off";
    }
  }

  on("objective:progress", (e) => {
    const s = sirenById(e.id);
    if (s && s.mode === "live") s.cut = clamp(+e.t || 0, 0, 1);
  });
  on("objective:done", (e) => {
    const s = sirenById(e.id);
    if (s && s.mode === "live") {
      s.mode = "dying";
      s.cut = 0;
    }
  });

  function updateSirens(dt, st, now) {
    const stateGain =
      st.state === "title" ? 0.5 : st.state === "intro" ? 0.8 : 1;
    for (const s of sirens) {
      if (!s) continue;
      const n = s.nodes;
      if (s.mode === "off") {
        if (!s.silent) {
          s.silent = true;
          s.speed = 0;
          n.out.gain.setTargetAtTime(0, now, 0.05);
          n.rushGain.gain.setTargetAtTime(0, now, 0.05);
        }
        continue;
      }
      s.silent = false;
      let wobble = 1;
      if (s.mode === "live") {
        s.phaseT -= dt;
        if (s.phaseT <= 0) {
          s.motor = !s.motor;
          const span = s.motor ? SIREN.motorOn : SIREN.motorOff;
          s.phaseT = span[0] + rnd() * (span[1] - span[0]);
        }
        let target = s.motor ? 1 : SIREN.coastTo;
        let tau = s.motor ? SIREN.rise : SIREN.coast;
        if (s.cut > 0) {
          // the feed is being cut through: power drops in and out, the rotor sags and flutters
          s.flickT -= dt;
          if (s.flickT <= 0) {
            s.power = rnd() < 0.62 - 0.3 * s.cut ? 1 : 0;
            s.flickT = 0.035 + rnd() * 0.12;
          }
          target = (s.power ? 1 : 0.2) * (1 - 0.3 * s.cut);
          tau = 0.3;
          s.wow += dt * (52 + 30 * s.cut);
          wobble = 1 + 0.03 * Math.sin(s.wow);
        } else s.power = 1;
        s.speed += (target - s.speed) * (1 - Math.exp(-dt / tau));
      } else {
        // cut: nothing drives the rotor any more
        s.power = 1;
        s.speed *= Math.exp(-dt / SIREN.windDown);
        if (s.speed < 0.035) {
          s.mode = "off";
          continue;
        }
      }
      s.powerS +=
        ((s.power ? 1 : 0.35) - s.powerS) * (1 - Math.exp(-dt / 0.025));
      s.rot += dt * s.rotRate;
      s.dist = Math.hypot(s.x - L.x, s.y - L.y, s.z - L.z);
      s.lookT -= dt;
      if (s.lookT <= 0) {
        s.lookT = 0.4 + rnd() * 0.2;
        s.open = openAir(s.x, s.y, s.z, 2.5);
      }
      s.openS += ((s.open ? 1 : 0) - s.openS) * (1 - Math.exp(-dt / 0.35));
      const f = Math.max(18, SIREN.top * s.tune * s.speed * wobble);
      const loud =
        Math.pow(s.speed, 1.4) * s.powerS * (0.82 + 0.18 * Math.sin(s.rot));
      const reach = 1 / (1 + Math.pow(s.dist / SIREN.half, 1.2));
      const walls = (0.72 + 0.28 * s.openS) * (1 - 0.45 * st.interior);
      n.low.frequency.setTargetAtTime(f, now, 0.02);
      n.high.frequency.setTargetAtTime(f * SIREN.ratio, now, 0.02);
      n.out.gain.setTargetAtTime(
        SIREN.level * loud * reach * walls * stateGain,
        now,
        0.03,
      );
      n.rushGain.gain.setTargetAtTime(
        0.1 * Math.pow(s.speed, 3) * s.powerS,
        now,
        0.05,
      );
      n.air.frequency.setTargetAtTime(
        (900 + 15000 * Math.exp(-s.dist / 38)) *
          (0.5 + 0.5 * s.openS) *
          (1 - 0.5 * st.interior),
        now,
        0.1,
      );
    }
  }

  // ---------- city bed ----------
  let murmur = null;
  function startMurmur(buffer) {
    if (murmur) return;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 500;
    tone.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0;
    tone.connect(g);
    g.connect(buses.amb);
    const pans = [];
    const layer = (rate, offset, where) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.playbackRate.value = rate;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = where;
        src.connect(p);
        p.connect(tone);
        pans.push({ node: p, where });
      } else src.connect(tone);
      src.start(0, offset);
    };
    layer(1, 0, -0.55);
    layer(0.917, buffer.duration * 0.53, 0.55);
    murmur = { g, tone, pans, level: 0, lean: 0, leanT: 0, far: 0 };
  }

  function updateMurmur(dt, st, now) {
    if (!murmur) return;
    murmur.leanT -= dt;
    if (murmur.leanT <= 0) {
      // lean the bed towards wherever most of the distant dead actually are
      murmur.leanT = 0.5;
      let far = 0;
      let side = 0;
      const list = G.enemies && G.enemies.list;
      const m =
        G.camera && G.camera.matrixWorld && G.camera.matrixWorld.elements;
      if (Array.isArray(list) && m)
        for (const z of list) {
          if (!z || !z.alive || !z.pos) continue;
          const dx = z.pos.x - L.x;
          const dz = z.pos.z - L.z;
          const d = Math.hypot(dx, dz);
          if (d < 10) continue;
          far++;
          side += (dx * m[0] + dz * m[2]) / d;
        }
      murmur.far = far;
      murmur.lean = far ? clamp((side / far) * 0.45, -0.45, 0.45) : 0;
      for (const p of murmur.pans)
        p.node.pan.setTargetAtTime(
          clamp(p.where + murmur.lean, -1, 1),
          now,
          0.8,
        );
    }
    const swell =
      0.1 +
      0.62 * Math.pow(clamp(st.intensity, 0, 1), 1.3) +
      0.28 * Math.min(1, murmur.far / 12);
    const target = st.amb * (1 - 0.6 * st.interior) * 0.48 * swell;
    murmur.level += (target - murmur.level) * (1 - Math.exp(-dt / 2.2));
    murmur.g.gain.value = murmur.level;
    murmur.tone.frequency.setTargetAtTime(
      420 + 760 * clamp(st.intensity, 0, 1),
      now,
      0.6,
    );
  }
  if (env.offline && murmurBuffer) startMurmur(murmurBuffer);

  // Chimes and shutters belong to places: a hashed grid gives each block its own, so the same
  // doorway rings every time you pass it.
  function hash(ix, iz, salt) {
    let h =
      (Math.imul(ix, 374761393) +
        Math.imul(iz, 668265263) +
        Math.imul(salt, 362437)) |
      0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function anchor(salt, cell, density, reach, height) {
    const cx = Math.floor(L.x / cell);
    const cz = Math.floor(L.z / cell);
    let best = null;
    let near = reach;
    for (let ix = cx - 1; ix <= cx + 1; ix++)
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        if (hash(ix, iz, salt) > density) continue;
        const x = (ix + 0.15 + 0.7 * hash(ix, iz, salt + 1)) * cell;
        const z = (iz + 0.15 + 0.7 * hash(ix, iz, salt + 2)) * cell;
        const d = Math.hypot(x - L.x, z - L.z);
        if (d < near && d > 3) {
          near = d;
          best = { x, y: height + 1.5 * hash(ix, iz, salt + 3), z };
        }
      }
    return best;
  }

  const timers = {
    chime: 4 + rnd() * 10,
    shutter: 12 + rnd() * 20,
    cry: 16 + rnd() * 24,
    siren: 30 + rnd() * 60,
    alarm: 80 + rnd() * 120,
  };

  function updateCity(dt, st) {
    const s = st.state;
    if (
      st.paused ||
      !(s === "playing" || s === "intro" || s === "title" || s === "complete")
    )
      return;
    const k = (s === "title" ? 0.7 : 1) * (1 - 0.7 * st.interior);
    const gust = clamp(st.gust, 0, 1);
    if ((timers.chime -= dt * (0.25 + 1.75 * gust)) <= 0 && gust > 0.45) {
      timers.chime = 18 + rnd() * 30;
      const at = anchor(11, 24, 0.55, 32, 2.8);
      if (at)
        play("z_chime", {
          pos: at,
          ref: 7,
          roll: 0.9,
          gain: (0.45 + 0.55 * rnd()) * (0.5 + 0.5 * gust) * k,
          jitter: 0.015,
        });
    }
    if ((timers.shutter -= dt * (0.2 + 1.8 * gust * gust)) <= 0) {
      timers.shutter = 25 + rnd() * 35;
      const at = anchor(29, 34, 0.6, 60, 2.2);
      if (at)
        play("z_shutter", {
          pos: at,
          ref: 14,
          roll: 0.8,
          gain: (0.5 + 0.5 * rnd()) * (0.45 + 0.55 * gust) * k,
          jitter: 0.07,
        });
    }
    if ((timers.cry -= dt * (0.6 + 1.6 * st.intensity)) <= 0) {
      timers.cry = 30 + rnd() * 45;
      const a = rnd() * TAU;
      const r = 70 + rnd() * 60;
      farCry(
        rnd() < 0.75 ? "scream" : "death",
        L.x + Math.cos(a) * r,
        2 + rnd() * 6,
        L.z + Math.sin(a) * r,
        (0.14 + 0.1 * rnd()) * k,
        800 + rnd() * 600,
        0.8 + rnd() * 0.22,
      );
    }
    if ((timers.siren -= dt) <= 0) {
      timers.siren = 90 + rnd() * 110;
      const a = rnd() * TAU;
      const r = 240 + rnd() * 90;
      play("z_farsiren", {
        pos: [L.x + Math.cos(a) * r, 6, L.z + Math.sin(a) * r],
        ref: r,
        gain: (0.16 + 0.1 * rnd()) * k,
        pitch: 0.94 + rnd() * 0.12,
        jitter: 0.01,
      });
    }
    if ((timers.alarm -= dt) <= 0) {
      timers.alarm = 150 + rnd() * 160;
      const a = rnd() * TAU;
      const r = 140 + rnd() * 70;
      play("z_alarm", {
        pos: [L.x + Math.cos(a) * r, 2, L.z + Math.sin(a) * r],
        ref: r,
        gain: (0.14 + 0.08 * rnd()) * k,
        jitter: 0.02,
      });
    }
  }

  // ---------- lifecycle ----------
  on("game:state", (e) => {
    const s = e.state;
    if (s === "paused" || (e.prev === "paused" && s === "playing")) return;
    if (
      s === "title" ||
      s === "intro" ||
      (s === "playing" && e.prev !== "intro")
    ) {
      // a fresh run: the game has just cleared the dead and re-armed every siren
      for (const v of voices) hush(v, 0.12);
      queue.length = 0;
      resetSirens(s);
    }
  });
  resetSirens((G.game && G.game.state) || "title");
  stats.setupMs = +(performance.now() - t0).toFixed(1);

  let analyser = null;

  return {
    ready,
    update(dt, st) {
      last = st;
      if (!st.paused) clock += dt;
      const now = ctx.currentTime;
      stepTokens = Math.min(4, stepTokens + dt * 8);
      runQueue();
      updateVoices(dt, now);
      syncSirens(dt, st);
      updateSirens(dt, st, now);
      updateMurmur(dt, st, now);
      updateCity(dt, st);
    },
    // test hooks
    speak,
    farCry,
    timers,
    debug() {
      const now = ctx.currentTime;
      const status = (bankLoad && bankLoad.status) || { loaded: 0, failed: 0 };
      const files = {};
      for (const [kind, set] of bank) files[kind] = set.length;
      return {
        samples: status.loaded,
        failed: status.failed,
        files,
        voices: voices
          .filter((v) => v.end > now)
          .map((v) => ({
            kind: v.kind,
            file: v.file,
            rate: v.rate,
            level: +v.level.toFixed(3),
            dist: +v.dist.toFixed(1),
            open: v.open,
          })),
        stats: { ...stats },
        sirens: sirens.map(
          (s) =>
            s && {
              id: s.id,
              mode: s.mode,
              speed: +s.speed.toFixed(3),
              hz: Math.round(SIREN.top * s.tune * s.speed),
              cut: +s.cut.toFixed(2),
              dist: +s.dist.toFixed(1),
              open: s.open,
            },
        ),
        murmur: murmur
          ? {
              level: +murmur.level.toFixed(4),
              far: murmur.far,
              lean: +murmur.lean.toFixed(2),
              loop: murmurInfo,
            }
          : null,
        hordeGain: +hordeGain.toFixed(3),
        queued: queue.length,
        state: last.state,
      };
    },
    // Level of the final mix right now, for automated checks.
    meter() {
      if (!env.master) return null;
      if (!analyser) {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0;
        env.master.connect(analyser);
        analyser.block = new Float32Array(analyser.fftSize);
      }
      analyser.getFloatTimeDomainData(analyser.block);
      let peak = 0;
      let sq = 0;
      for (const v of analyser.block) {
        peak = Math.max(peak, Math.abs(v));
        sq += v * v;
      }
      return { peak, rms: Math.sqrt(sq / analyser.block.length) };
    },
  };
}
