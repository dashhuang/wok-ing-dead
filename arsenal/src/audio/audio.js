// Sound for the lab, synthesised with Web Audio: no sample files, so it also works in the
// single-file showcase. Three layers:
//   shot(weapon, branch)   the report of each weapon
//   cue(name)              mechanical sounds asked for by the weapon models (magOut, pumpBack, ...)
//   world(name, pos)       things that happen out in the street (explosions, thunder, hits)
// plus loop(name) for sounds that last as long as a trigger is held (flame roar, arc buzz).
//
// Every sound is built from two ingredients: a burst of filtered noise and a swept tone.
import * as THREE from "three";

export const CUES = [
  "magOut",
  "magIn",
  "boltBack",
  "boltFwd",
  "pumpBack",
  "pumpFwd",
  "leverOpen",
  "leverClose",
  "hammerCock",
  "cylOpen",
  "cylClose",
  "cylSpin",
  "shellIn",
  "roundIn",
  "latch",
  "click",
  "canOut",
  "canIn",
  "gasHiss",
  "batteryOut",
  "batteryIn",
  "spark",
  "tubeIn",
  "fuse",
  "woodKnock",
  "stringDraw",
  "stringSnap",
  "paper",
  "cloth",
  "coin",
  "draw",
];

export function createAudio(getCamera) {
  let ctx = null,
    master = null,
    wet = null,
    noiseBuf = null,
    brownBuf = null;
  let muted = false;
  let volume = 0.7;
  const last = new Map(); // name -> time, to stop a burst of identical sounds piling up
  const loops = new Map();
  const _v = new THREE.Vector3();

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(comp).connect(ctx.destination);
    // the alley: a short, dark reverb made from decaying noise with a couple of slap-backs
    const len = Math.floor(ctx.sampleRate * 1.5);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        lp += (Math.random() * 2 - 1 - lp) * (0.5 * Math.exp(-t * 2.2) + 0.06);
        d[i] = lp * Math.exp(-t * 3.6);
      }
      for (const [t, g] of [
        [0.031 + ch * 0.007, 0.5],
        [0.074 - ch * 0.009, 0.32],
        [0.142, 0.2],
      ])
        d[Math.floor(t * ctx.sampleRate)] += g * (ch ? 1 : -1);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    wet = ctx.createGain();
    wet.gain.value = 0.55;
    wet.connect(conv).connect(master);
    // noise sources
    const n = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    brownBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const w = noiseBuf.getChannelData(0),
      b = brownBuf.getChannelData(0);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      w[i] = Math.random() * 2 - 1;
      acc = (acc + 0.02 * w[i]) / 1.02;
      b[i] = acc * 3.5;
    }
    return ctx;
  }

  // one output chain per sound: gain -> stereo pan -> dry + reverb send
  function out(o) {
    const g = ctx.createGain();
    g.gain.value = o.gain ?? 1;
    let node = g;
    if (ctx.createStereoPanner && o.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      g.connect(p);
      node = p;
    }
    node.connect(master);
    if (o.wet) {
      const s = ctx.createGain();
      s.gain.value = o.wet;
      node.connect(s).connect(wet);
    }
    return g;
  }
  /** Filtered noise with an attack/decay envelope. f1 sweeps the filter. */
  function noise(dest, o) {
    const t0 = ctx.currentTime + (o.at || 0);
    const src = ctx.createBufferSource();
    src.buffer = o.brown ? brownBuf : noiseBuf;
    src.loop = true;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = o.type || "bandpass";
    f.frequency.setValueAtTime(o.f, t0);
    if (o.f1)
      f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
    f.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.g ?? 1, t0 + (o.a ?? 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + o.dur + 0.02);
  }
  /** A tone sweeping from f to f1 with an attack/decay envelope. */
  function tone(dest, o) {
    const t0 = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator();
    osc.type = o.wave || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f1)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, o.f1),
        t0 + o.dur,
      );
    if (o.vib) {
      const l = ctx.createOscillator(),
        lg = ctx.createGain();
      l.frequency.value = o.vib[0];
      lg.gain.value = o.vib[1];
      l.connect(lg).connect(osc.frequency);
      l.start(t0);
      l.stop(t0 + o.dur + 0.02);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.g ?? 1, t0 + (o.a ?? 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(dest);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }
  const R = (a, b) => a + Math.random() * (b - a);
  // a small metallic or plastic knock: the building block of every mechanical cue
  function knock(d, f, o = {}) {
    noise(d, {
      f: f * R(0.92, 1.08),
      q: o.q ?? 2.5,
      dur: o.dur ?? 0.035,
      g: o.g ?? 0.8,
      at: o.at,
    });
    tone(d, {
      wave: "triangle",
      f: f * 0.5,
      f1: f * 0.3,
      dur: (o.dur ?? 0.035) * 1.4,
      g: (o.g ?? 0.8) * 0.5,
      at: o.at,
    });
    if (o.ring) tone(d, { f: o.ring, dur: 0.16, g: 0.07, at: o.at });
  }

  // ---------------------------------------------------------------- recipes
  const RECIPES = {
    // ---- mechanical cues
    click: (d) => knock(d, 2600, { dur: 0.018, g: 0.5 }),
    latch: (d) => knock(d, 1900, { dur: 0.025, g: 0.55 }),
    magOut: (d) => {
      knock(d, 1500, { g: 0.6 });
      noise(d, { f: 900, f1: 500, dur: 0.11, g: 0.3, at: 0.02 });
    },
    magIn: (d) => {
      noise(d, { f: 700, f1: 1300, dur: 0.07, g: 0.25 });
      knock(d, 1100, { g: 0.9, at: 0.06, dur: 0.045 });
      tone(d, { f: 170, f1: 90, dur: 0.07, g: 0.5, at: 0.06 });
    },
    boltBack: (d) => {
      noise(d, { f: 1400, f1: 900, dur: 0.06, g: 0.4 });
      knock(d, 1700, { g: 0.7, at: 0.05, ring: 2900 });
    },
    boltFwd: (d) => {
      knock(d, 2100, { g: 0.9, dur: 0.03, ring: 3400 });
      tone(d, { f: 210, f1: 110, dur: 0.05, g: 0.4 });
    },
    pumpBack: (d) => {
      noise(d, { f: 1000, f1: 650, dur: 0.085, g: 0.6 });
      knock(d, 1250, { g: 0.85, at: 0.075, dur: 0.04 });
    },
    pumpFwd: (d) => {
      noise(d, { f: 700, f1: 1100, dur: 0.075, g: 0.55 });
      knock(d, 1500, { g: 1, at: 0.065, dur: 0.04, ring: 2300 });
    },
    leverOpen: (d) => {
      knock(d, 1800, { g: 0.6 });
      noise(d, { f: 1200, f1: 800, dur: 0.09, g: 0.35, at: 0.015 });
      knock(d, 1300, { g: 0.7, at: 0.1 });
    },
    leverClose: (d) => {
      noise(d, { f: 800, f1: 1300, dur: 0.07, g: 0.35 });
      knock(d, 1900, { g: 0.95, at: 0.06, ring: 3100 });
    },
    hammerCock: (d) => {
      knock(d, 2300, { g: 0.4, dur: 0.02 });
      knock(d, 2900, { g: 0.55, dur: 0.02, at: 0.05 });
    },
    cylOpen: (d) => {
      knock(d, 1700, { g: 0.6, ring: 2600 });
      noise(d, { f: 2400, dur: 0.05, g: 0.15, at: 0.03 });
    },
    cylClose: (d) => {
      knock(d, 1400, { g: 0.95, dur: 0.04, ring: 2200 });
      tone(d, { f: 190, f1: 100, dur: 0.06, g: 0.4 });
    },
    cylSpin: (d) => {
      for (let i = 0; i < 7; i++)
        knock(d, 3000 + i * 40, {
          g: 0.4,
          dur: 0.012,
          at: i * 0.028 + i * i * 0.002,
        });
    },
    shellIn: (d) => {
      noise(d, { f: 1100, dur: 0.05, g: 0.3 });
      knock(d, 900, { g: 0.7, at: 0.045, dur: 0.04 });
      tone(d, { f: 240, f1: 150, dur: 0.05, g: 0.3, at: 0.045 });
    },
    roundIn: (d) => {
      knock(d, 2400, { g: 0.45, dur: 0.02, ring: 4200 });
      knock(d, 1300, { g: 0.6, at: 0.04 });
    },
    canOut: (d) => {
      noise(d, { f: 1800, f1: 900, dur: 0.16, g: 0.3, q: 3 });
      knock(d, 800, { g: 0.7, at: 0.15, dur: 0.05, ring: 1250 });
    },
    canIn: (d) => {
      knock(d, 700, { g: 0.8, dur: 0.05, ring: 1100 });
      noise(d, { f: 900, f1: 1900, dur: 0.18, g: 0.3, q: 3, at: 0.04 });
    },
    gasHiss: (d) =>
      noise(d, { type: "highpass", f: 5200, dur: 0.32, a: 0.02, g: 0.35 }),
    batteryOut: (d) => {
      knock(d, 1200, { g: 0.6, dur: 0.04 });
      noise(d, { f: 600, dur: 0.07, g: 0.25, at: 0.03 });
    },
    batteryIn: (d) => {
      noise(d, { f: 600, dur: 0.06, g: 0.25 });
      knock(d, 1000, { g: 0.9, at: 0.05, dur: 0.045 });
    },
    spark: (d) => {
      tone(d, {
        wave: "sawtooth",
        f: R(2600, 3400),
        f1: 500,
        dur: 0.07,
        g: 0.22,
      });
      noise(d, { type: "highpass", f: 3500, dur: 0.06, g: 0.4 });
    },
    tubeIn: (d) => {
      tone(d, { f: 280, f1: 190, dur: 0.07, g: 0.55 });
      noise(d, { type: "lowpass", f: 900, dur: 0.06, g: 0.5 });
    },
    fuse: (d) => {
      noise(d, { type: "highpass", f: 4200, dur: 0.4, a: 0.03, g: 0.3 });
      for (let i = 0; i < 6; i++)
        knock(d, R(3000, 5200), { g: 0.2, dur: 0.01, at: R(0, 0.35) });
    },
    woodKnock: (d) => {
      tone(d, { f: 430, f1: 300, dur: 0.05, g: 0.7 });
      noise(d, { type: "lowpass", f: 1400, dur: 0.035, g: 0.5 });
    },
    stringDraw: (d) => {
      tone(d, { wave: "sawtooth", f: 85, f1: 120, dur: 0.16, g: 0.25 });
      noise(d, { f: 1500, f1: 2400, dur: 0.14, g: 0.3, q: 4 });
    },
    stringSnap: (d) => {
      tone(d, { wave: "triangle", f: 260, f1: 105, dur: 0.16, g: 0.7 });
      noise(d, { f: 2200, dur: 0.035, g: 0.4 });
    },
    paper: (d) => {
      for (let i = 0; i < 3; i++)
        noise(d, {
          f: R(2600, 4200),
          dur: 0.035,
          g: 0.5,
          at: i * 0.03,
          q: 1.5,
        });
    },
    cloth: (d) =>
      noise(d, { type: "lowpass", f: 900, dur: 0.14, a: 0.03, g: 0.6 }),
    coin: (d) => {
      for (let i = 0; i < 3; i++)
        tone(d, {
          f: R(3200, 5600),
          dur: R(0.12, 0.3),
          g: 0.17,
          at: i * R(0.01, 0.04),
        });
    },
    draw: (d) => {
      noise(d, { type: "lowpass", f: 1100, dur: 0.2, a: 0.04, g: 0.55 });
      knock(d, 1500, { g: 0.35, at: 0.2 });
    },
    dry: (d) => knock(d, 2200, { g: 0.5, dur: 0.02 }),

    // ---- reports. Each is a crack (bright noise), a body (band noise) and a thump (falling sine).
    gun: (d, o = {}) => {
      const k = o.size ?? 1;
      noise(d, { type: "highpass", f: 1800 / k, dur: 0.05 + 0.02 * k, g: 0.9 });
      noise(d, {
        f: 950 / k,
        f1: 260 / k,
        dur: 0.16 + 0.14 * k,
        g: 0.9,
        q: 0.6,
      });
      noise(d, {
        brown: true,
        type: "lowpass",
        f: 420 / k,
        f1: 110,
        dur: 0.22 + 0.22 * k,
        g: 1.1 * k,
      });
      tone(d, { f: 150 / k, f1: 42, dur: 0.12 + 0.1 * k, g: 0.9 * k });
    },
    air: (d) => {
      noise(d, { type: "highpass", f: 2600, dur: 0.05, g: 0.7 });
      noise(d, { f: 900, f1: 400, dur: 0.07, g: 0.5 });
      knock(d, 1700, { g: 0.6, at: 0.012 });
    },
    whoosh: (d, o = {}) => {
      const k = o.size ?? 1;
      noise(d, {
        f: 500 / k,
        f1: 2200 / k,
        dur: 0.1 * k,
        a: 0.03,
        g: 0.75,
        q: 1.2,
      });
      noise(d, {
        f: 2200 / k,
        f1: 600 / k,
        dur: 0.16 * k,
        a: 0.01,
        g: 0.85,
        q: 1.2,
        at: 0.08 * k,
      });
    },
    zap: (d) => {
      tone(d, { wave: "sawtooth", f: 2200, f1: 240, dur: 0.11, g: 0.25 });
      noise(d, { type: "highpass", f: 3000, dur: 0.09, g: 0.4 });
    },
    rocket: (d) => {
      noise(d, { f: 700, f1: 2400, dur: 0.35, a: 0.02, g: 0.95, q: 1 });
      tone(d, { f: 900, f1: 2600, dur: 0.5, a: 0.05, g: 0.22, vib: [26, 60] });
    },
    mortar: (d) => {
      tone(d, { f: 120, f1: 45, dur: 0.3, g: 1.2 });
      noise(d, {
        brown: true,
        type: "lowpass",
        f: 500,
        f1: 120,
        dur: 0.4,
        g: 1.2,
      });
      noise(d, { f: 600, f1: 2000, dur: 0.5, a: 0.03, g: 0.35, at: 0.05 });
    },
    talisman: (d) => {
      noise(d, { f: 3200, f1: 900, dur: 0.2, a: 0.01, g: 0.65, q: 1.4 });
      tone(d, { f: 1320, dur: 0.5, g: 0.08 });
      tone(d, { f: 1980, dur: 0.35, g: 0.05 });
    },
    // ---- out in the street
    explosion: (d, o = {}) => {
      const k = Math.min(2.2, o.size ?? 1);
      tone(d, { f: 95 / Math.sqrt(k), f1: 30, dur: 0.5 * k, g: 1.3 });
      noise(d, {
        brown: true,
        type: "lowpass",
        f: 700,
        f1: 80,
        dur: 0.9 * k,
        g: 1.5,
      });
      noise(d, { f: 1500, f1: 300, dur: 0.3, g: 0.7, q: 0.5 });
      for (let i = 0; i < 6; i++)
        knock(d, R(800, 2600), { g: 0.25, dur: 0.02, at: R(0.15, 0.9) });
    },
    burst: (d, o = {}) => {
      tone(d, { f: 130, f1: 40, dur: 0.35, g: 0.9 });
      noise(d, {
        brown: true,
        type: "lowpass",
        f: 900,
        f1: 150,
        dur: 0.5,
        g: 1,
      });
      const n = Math.round(14 * (o.size ?? 1));
      for (let i = 0; i < n; i++)
        noise(d, {
          type: "highpass",
          f: R(2500, 6000),
          dur: R(0.012, 0.03),
          g: R(0.12, 0.3),
          at: R(0.08, 0.9),
        });
    },
    thunder: (d) => {
      noise(d, { type: "highpass", f: 1500, dur: 0.12, g: 1.2 });
      noise(d, { f: 500, f1: 120, dur: 0.6, g: 1.2, q: 0.5, at: 0.02 });
      noise(d, {
        brown: true,
        type: "lowpass",
        f: 300,
        f1: 50,
        dur: 2.2,
        a: 0.05,
        g: 1.6,
        at: 0.05,
      });
      tone(d, { f: 70, f1: 28, dur: 1.2, g: 0.9, at: 0.03 });
    },
    chime: (d) => {
      for (const [f, g, dur] of [
        [660, 0.16, 0.9],
        [990, 0.1, 0.7],
        [1485, 0.06, 0.5],
        [2640, 0.03, 0.3],
      ])
        tone(d, { f, dur, g });
    },
    flesh: (d) => {
      noise(d, { type: "lowpass", f: 520, f1: 160, dur: 0.09, g: 0.8 });
      tone(d, { f: 120, f1: 60, dur: 0.07, g: 0.4 });
    },
    tick: (d) => {
      knock(d, R(1800, 3200), { g: 0.4, dur: 0.02 });
      noise(d, { type: "highpass", f: 2500, dur: 0.05, g: 0.2, at: 0.01 });
    },
    slash: (d) => {
      noise(d, { type: "lowpass", f: 700, f1: 200, dur: 0.1, g: 1.5 });
      tone(d, { f: 2400, f1: 1500, dur: 0.18, g: 0.16 });
    },
    fall: (d) => {
      noise(d, { type: "lowpass", f: 300, f1: 90, dur: 0.22, g: 0.8 });
      tone(d, { f: 70, f1: 38, dur: 0.2, g: 0.6 });
    },
  };

  // what each weapon sounds like when it fires: [recipe, options, gain, extra recipe]
  const SHOTS = {
    shotgun: {
      base: ["gun", { size: 1.5 }, 1],
      a: ["gun", { size: 1.45 }, 1, "whoosh"],
      b: ["gun", { size: 1.75 }, 1.05],
    },
    smg: {
      base: ["gun", { size: 0.62 }, 0.6],
      a: ["gun", { size: 0.62 }, 0.6],
      b: ["gun", { size: 0.62 }, 0.6],
    },
    revolver: {
      base: ["gun", { size: 1.15 }, 0.95],
      a: ["gun", { size: 1.15 }, 0.95],
      b: ["gun", { size: 1.15 }, 0.95, "chime"],
    },
    lever: {
      base: ["gun", { size: 1.3 }, 1],
      a: ["gun", { size: 1.35 }, 1],
      b: ["gun", { size: 1.3 }, 1],
    },
    nailgun: {
      base: ["air", {}, 0.7],
      a: ["air", {}, 0.85],
      b: ["air", {}, 0.7],
    },
    firework: {
      base: ["rocket", {}, 0.7],
      a: ["rocket", {}, 0.7],
      b: ["mortar", {}, 1],
    },
    crossbow: {
      base: ["stringSnap", {}, 0.8],
      a: ["stringSnap", {}, 0.8, "fuse"],
      b: ["stringSnap", {}, 0.8, "paper"],
    },
    talisman: {
      base: ["talisman", {}, 0.7],
      a: ["talisman", {}, 0.7],
      b: ["talisman", {}, 0.7],
    },
  };

  function play(name, o = {}) {
    if (muted || !ensure() || ctx.state !== "running") return;
    const r = RECIPES[name] || RECIPES.click;
    // identical sounds closer together than `gap` are dropped (a volley of pellets is one thud)
    const gap = o.gap ?? 0;
    if (gap) {
      const t = ctx.currentTime;
      if (t - (last.get(name) ?? -9) < gap) return;
      last.set(name, t);
    }
    r(out({ gain: o.gain ?? 1, pan: o.pan, wet: o.wet ?? 0.12 }), o);
  }

  const api = {
    CUES,
    get ready() {
      return !!ctx && ctx.state === "running";
    },
    get muted() {
      return muted;
    },
    /** Browsers only start audio from a user gesture: call from a click or key press. */
    unlock() {
      if (!ensure()) return;
      if (ctx.state === "suspended") ctx.resume();
    },
    setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : volume;
      if (muted) for (const l of loops.values()) l.set(0);
    },
    play,
    /** Mechanical sound requested by a weapon model. */
    cue(name, gain = 1) {
      play(name, { gain: 0.55 * gain, wet: 0.06 });
    },
    /** The report of a weapon. */
    shot(id, branch, o = {}) {
      const s = SHOTS[id] && (SHOTS[id][branch] || SHOTS[id].base);
      if (!s) return;
      play(s[0], { ...s[1], gain: s[2] * (o.gain ?? 1), wet: 0.3 });
      if (s[3]) play(s[3], { gain: 0.5, wet: 0.2 });
      if (o.shock) play("zap", { gain: 0.5, wet: 0.2 });
    },
    /** Something out in the street: quieter and duller with distance, panned by where it is on screen. */
    world(name, pos, o = {}) {
      const cam = getCamera && getCamera();
      let gain = o.gain ?? 1,
        pan = 0;
      if (cam && pos) {
        _v.copy(pos).applyMatrix4(cam.matrixWorldInverse);
        const d = _v.length();
        gain *= 1 / (1 + d * 0.07);
        pan = Math.max(-0.8, Math.min(0.8, (_v.x / Math.max(1, d)) * 1.2));
      }
      play(name, { ...o, gain, pan, wet: o.wet ?? 0.35 });
    },
    /**
     * A sustained sound: loop("flame") returns { set(gain 0..1, pitch = 1), stop() }.
     * kinds: flame, blueflame, arc, charge
     */
    loop(kind) {
      if (loops.has(kind)) return loops.get(kind);
      const h = {
        g: null,
        set(v, pitch = 1) {
          if (!ensure() || ctx.state !== "running") return;
          if (!h.g) build();
          const t = ctx.currentTime;
          h.g.gain.setTargetAtTime(muted ? 0 : v * h.level, t, 0.05);
          for (const f of h.pitched) f(pitch, t);
        },
        stop() {
          if (h.g) h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        },
        level: 1,
        pitched: [],
      };
      const build = () => {
        h.g = ctx.createGain();
        h.g.gain.value = 0;
        h.g.connect(master);
        const send = ctx.createGain();
        send.gain.value = 0.15;
        h.g.connect(send).connect(wet);
        const src = (buf, rate = 1) => {
          const s = ctx.createBufferSource();
          s.buffer = buf;
          s.loop = true;
          s.playbackRate.value = rate;
          s.start(0, Math.random());
          return s;
        };
        const filt = (type, f, q = 0.7) => {
          const b = ctx.createBiquadFilter();
          b.type = type;
          b.frequency.value = f;
          b.Q.value = q;
          return b;
        };
        const lfo = (rate, depth, param) => {
          const o = ctx.createOscillator(),
            g = ctx.createGain();
          o.frequency.value = rate;
          g.gain.value = depth;
          o.connect(g).connect(param);
          o.start();
        };
        if (kind === "flame" || kind === "blueflame") {
          const blue = kind === "blueflame";
          h.level = 0.55;
          const body = filt("bandpass", blue ? 900 : 420, 0.5);
          src(brownBuf).connect(body).connect(h.g);
          lfo(blue ? 13 : 7, blue ? 120 : 160, body.frequency);
          const hiss = filt("highpass", blue ? 2600 : 1700),
            hg = ctx.createGain();
          hg.gain.value = blue ? 0.5 : 0.28;
          src(noiseBuf).connect(hiss).connect(hg).connect(h.g);
          lfo(3.1, 0.08, hg.gain);
        } else if (kind === "arc") {
          h.level = 0.32;
          const o1 = ctx.createOscillator();
          o1.type = "sawtooth";
          o1.frequency.value = 100;
          const o2 = ctx.createOscillator();
          o2.type = "square";
          o2.frequency.value = 151;
          const bp = filt("bandpass", 1400, 0.8),
            og = ctx.createGain();
          og.gain.value = 0.5;
          o1.connect(og);
          o2.connect(og);
          og.connect(bp).connect(h.g);
          o1.start();
          o2.start();
          const crack = filt("highpass", 3000),
            cg = ctx.createGain();
          cg.gain.value = 0.5;
          src(noiseBuf).connect(crack).connect(cg).connect(h.g);
          lfo(50, 0.45, cg.gain);
          lfo(11, 500, bp.frequency);
        } else {
          // charge: a rising hum
          h.level = 0.22;
          const o1 = ctx.createOscillator();
          o1.type = "triangle";
          o1.frequency.value = 110;
          const o2 = ctx.createOscillator();
          o2.type = "sine";
          o2.frequency.value = 222;
          const og = ctx.createGain();
          og.gain.value = 0.6;
          o1.connect(og);
          o2.connect(og);
          og.connect(h.g);
          o1.start();
          o2.start();
          h.pitched.push((p, t) => {
            o1.frequency.setTargetAtTime(110 * p, t, 0.04);
            o2.frequency.setTargetAtTime(222 * p, t, 0.04);
          });
        }
      };
      loops.set(kind, h);
      return h;
    },
    stopLoops() {
      for (const l of loops.values()) l.stop();
    },
    /** For checks: render one recipe offline and report its peak, loudness and length. */
    async measure(name, o = {}) {
      const sr = 44100;
      const off = new OfflineAudioContext(1, sr * 3, sr);
      const keep = { ctx, master, wet, noiseBuf, brownBuf };
      ctx = off;
      master = off.createGain();
      master.connect(off.destination);
      wet = off.createGain();
      wet.gain.value = 0;
      const n = sr * 2;
      noiseBuf = off.createBuffer(1, n, sr);
      brownBuf = off.createBuffer(1, n, sr);
      const w = noiseBuf.getChannelData(0),
        b = brownBuf.getChannelData(0);
      let acc = 0;
      for (let i = 0; i < n; i++) {
        w[i] = Math.random() * 2 - 1;
        acc = (acc + 0.02 * w[i]) / 1.02;
        b[i] = acc * 3.5;
      }
      (RECIPES[name] || RECIPES.click)(master, o);
      const buf = await off.startRendering();
      ({ ctx, master, wet, noiseBuf, brownBuf } = keep);
      const d = buf.getChannelData(0);
      let peak = 0,
        sum = 0,
        lastLoud = 0,
        bad = 0;
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (!Number.isFinite(d[i])) bad++;
        if (a > peak) peak = a;
        sum += d[i] * d[i];
        if (a > 0.01) lastLoud = i;
      }
      return {
        peak: +peak.toFixed(3),
        rms: +Math.sqrt(sum / d.length).toFixed(4),
        seconds: +(lastLoud / sr).toFixed(2),
        bad,
      };
    },
    recipes: () => Object.keys(RECIPES),
  };
  return api;
}
