// Signal kit for the weapons' sound: plain arrays of samples, no Web Audio, so the same
// generators run in the lab, in the game (which renders them into its own buffers) and in
// node (scripts and checks). Everything takes the sample rate first and a random source
// where it needs one; nothing here keeps state.

export const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const alloc = (sr, sec) =>
  new Float32Array(Math.max(1, Math.round(sr * sec)));
export const pick = (rng, a, b) => a + (b - a) * rng();

/** A repeatable random source (the game hands its own in; the lab and the scripts use this). */
export function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function white(sr, sec, rng) {
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

/**
 * Filters in place: "lp" | "hp" | "bp". `f` is a frequency, or a function of the position in
 * the sound (0..1) for a sweep.
 */
export function filter(a, type, f, q, sr) {
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

/** Multiplies by a function of time in seconds. */
export function shape(a, sr, fn) {
  for (let i = 0; i < a.length; i++) a[i] *= fn(i / sr);
  return a;
}
/** exp decay with an optional rounded attack: the envelope of almost everything here. */
export const decay =
  (tau, att = 0) =>
  (t) =>
    att > 0
      ? (1 - Math.exp(-t / att)) * Math.exp(-t / tau)
      : Math.exp(-t / tau);
/** A frequency going from a to b over the sound, for sweeps (curve > 1: late). */
export const glide =
  (a, b, curve = 1) =>
  (x) =>
    a * Math.pow(b / a, Math.pow(x, curve));

export function add(dst, src, at, gain, sr) {
  const o = Math.round(at * sr);
  const n = Math.min(src.length, dst.length - o);
  for (let i = Math.max(0, -o); i < n; i++) dst[o + i] += src[i] * gain;
  return dst;
}
export function peak(a) {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const v = Math.abs(a[i]);
    if (v > m) m = v;
  }
  return m;
}
export function gain(a, k) {
  for (let i = 0; i < a.length; i++) a[i] *= k;
  return a;
}
export function unit(a, to = 1) {
  const m = peak(a);
  return m > 0 ? gain(a, to / m) : a;
}
/** Soft saturation that keeps a full-scale input at full scale. */
export function drive(a, k) {
  const n = 1 / Math.tanh(k);
  for (let i = 0; i < a.length; i++) a[i] = Math.tanh(a[i] * k) * n;
  return a;
}
export function rms(a, from = 0, to = a.length) {
  let s = 0;
  from = Math.max(0, from | 0);
  to = Math.min(a.length, to | 0);
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, to - from));
}
export function fade(a, sr, tin, tout) {
  const i = Math.min(a.length >> 1, Math.round(tin * sr));
  const o = Math.min(a.length >> 1, Math.round(tout * sr));
  for (let k = 0; k < i; k++) a[k] *= k / i;
  for (let k = 0; k < o; k++) {
    const x = k / o;
    a[a.length - 1 - k] *= x * x;
  }
  return a;
}

/** A sine falling from f0 to f1: the chest of a gunshot, a body hitting the ground. */
export function thump(sr, sec, f0, f1, tauF, tauA, att = 0.0008) {
  const a = alloc(sr, sec);
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t / tauF))) / sr;
    a[i] = Math.sin(ph) * Math.exp(-t / tauA) * (1 - Math.exp(-t / att));
  }
  return a;
}
/** The pressure pulse of a muzzle blast: up hard, then a shallower trough. */
export function blast(sr, tPlus) {
  const a = alloc(sr, tPlus * 12);
  for (let i = 0; i < a.length; i++) {
    const s = i / sr / tPlus;
    a[i] = (1 - s) * Math.exp(-s);
  }
  return a;
}
/** Filtered noise with a decay: { hp, lp, bp, q, att }. Comes back at full scale. */
export function burst(sr, rng, sec, tau, o = {}) {
  const a = white(sr, sec, rng);
  if (o.hp) filter(a, "hp", o.hp, 0.707, sr);
  if (o.lp) filter(a, "lp", o.lp, 0.707, sr);
  if (o.bp) filter(a, "bp", o.bp, o.q || 1, sr);
  shape(a, sr, decay(tau, o.att || 0));
  return unit(a);
}
/**
 * Decaying partials [frequency, decay seconds, level]: what a struck piece of metal, wood
 * or a bell rings at. With rng the partials start out of phase (no click at the front).
 */
export function modes(sr, sec, list, rng) {
  const a = alloc(sr, sec);
  for (const [f, tau, amp] of list) {
    if (f > sr * 0.46) continue;
    const w = (TAU * f) / sr;
    const ph = rng ? rng() * TAU : 0;
    const r = Math.exp(-1 / (tau * sr));
    const c = 2 * r * Math.cos(w);
    const r2 = r * r;
    const n = Math.min(
      a.length,
      Math.ceil(Math.log(1e-5 / Math.max(amp, 1e-5)) / Math.log(r)) + 1,
    );
    let y1 = (amp / r) * Math.sin(ph - w);
    let y = amp * Math.sin(ph);
    for (let i = 0; i < n; i++) {
      a[i] += y;
      const next = c * y - r2 * y1;
      y1 = y;
      y = next;
    }
  }
  const soft = Math.min(a.length, Math.round(0.0004 * sr));
  for (let i = 0; i < soft; i++) a[i] *= i / soft;
  return a;
}
/**
 * One part knocking against another: its ring and the tick of the contact.
 * o: { ring = 0.6, tick = 0.7, tickTau, hp = 2500, jit = 0.02 }
 */
export function knock(sr, rng, list, o = {}) {
  let longest = 0.004;
  for (const m of list) longest = Math.max(longest, m[1]);
  const a = alloc(sr, Math.min(0.6, longest * 7 + 0.004));
  const jit = o.jit ?? 0.02;
  add(
    a,
    modes(
      sr,
      a.length / sr,
      list.map(([f, tau, amp]) => [f * (1 + (rng() * 2 - 1) * jit), tau, amp]),
      rng,
    ),
    0,
    o.ring ?? 0.6,
    sr,
  );
  if (o.tick !== 0)
    add(
      a,
      burst(sr, rng, 0.006, o.tickTau || 0.0009, { hp: o.hp || 2500 }),
      0,
      o.tick ?? 0.7,
      sr,
    );
  return a;
}
/** Short clicks scattered over a stretch of time: gravel, sparks, crackle. */
export function ticks(sr, rng, sec, count, o = {}) {
  const a = alloc(sr, sec);
  const from = o.from || 0;
  for (let i = 0; i < count; i++) {
    const t = from + (sec - from - 0.02) * Math.pow(rng(), o.fall || 1);
    const at = Math.round(t * sr);
    const len = Math.round(
      pick(rng, o.minLen || 0.001, o.maxLen || 0.004) * sr,
    );
    const amp = pick(rng, 0.2, 1) * (o.ampFall ? Math.exp(-t / o.ampFall) : 1);
    for (let k = 0; k < len && at + k < a.length; k++)
      a[at + k] += (rng() * 2 - 1) * amp * Math.exp((-4 * k) / len);
  }
  if (o.hp) filter(a, "hp", o.hp, 0.707, sr);
  if (o.lp) filter(a, "lp", o.lp, 0.707, sr);
  if (o.bp) filter(a, "bp", o.bp, o.q || 1, sr);
  return a;
}
/**
 * Air moving: band noise whose centre slides from f0 to f1, with a grain to it.
 * o: { q = 1.8, rough = 200 (grains per second), rough1, curve, hi (level of an upper band), env }
 */
export function rush(sr, rng, sec, f0, f1, o = {}) {
  const a = white(sr, sec, rng);
  const q = o.q || 1.8;
  const n = a.length;
  filter(a, "bp", glide(f0, f1, o.curve || 1), q, sr);
  if (o.hi) {
    const b = white(sr, sec, rng);
    filter(b, "bp", glide(f0 * 2.37, f1 * 2.37, o.curve || 1), q * 1.5, sr);
    for (let i = 0; i < n; i++) a[i] += b[i] * o.hi;
  }
  const r0 = o.rough || 200;
  const r1 = o.rough1 || r0;
  const env = o.env || ((x) => Math.sin(Math.PI * Math.pow(x, 0.7)));
  let lvl = 0.5;
  let want = 0.5;
  let next = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    if (i >= next) {
      want = 0.2 + rng() * 0.8;
      next = i + (sr / (r0 + (r1 - r0) * x)) * (0.6 + rng() * 0.8);
    }
    lvl += (want - lvl) * 0.03;
    a[i] *= lvl * env(x);
  }
  return unit(a);
}
/** A feedback comb: the hollow of a tube or a barrel around whatever goes through it. */
export function comb(a, sr, sec, feedback, mix = 1) {
  const d = Math.max(1, Math.round(sec * sr));
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++)
    out[i] = a[i] + (i >= d ? out[i - d] * feedback : 0);
  const k = 1 - feedback * 0.5;
  for (let i = 0; i < a.length; i++) a[i] = a[i] * (1 - mix) + out[i] * k * mix;
  return a;
}
/**
 * A stretch of sound that can be looped without a seam: `make` fills sec + over seconds and
 * the extra is folded back over the start.
 */
export function seamless(sr, sec, make, over = 0.4) {
  const a = alloc(sr, sec + over);
  make(a);
  const n = Math.round(sr * sec);
  const tail = a.length - n;
  const out = new Float32Array(n);
  out.set(a.subarray(0, n));
  for (let i = 0; i < tail; i++) {
    const x = (i + 0.5) / tail;
    out[i] =
      a[i] * Math.sin((x * Math.PI) / 2) +
      a[n + i] * Math.cos((x * Math.PI) / 2);
  }
  return out;
}
/** A slow random wander between lo and hi, `hz` new targets a second. */
export function wander(sr, n, rng, hz, lo, hi, smooth = 0.002) {
  const a = new Float32Array(n);
  let v = (lo + hi) / 2;
  let want = v;
  let next = 0;
  for (let i = 0; i < n; i++) {
    if (i >= next) {
      want = pick(rng, lo, hi);
      next = i + (sr / hz) * (0.5 + rng());
    }
    v += (want - v) * smooth;
    a[i] = v;
  }
  return a;
}
