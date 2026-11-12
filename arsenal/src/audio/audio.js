// Sound for the weapons. Nothing is sampled: every sound is synthesised by the generators
// in sounds.js (so the single-file builds carry no audio files) and played from a buffer.
//   shot(weapon, branch)   the report of each weapon
//   cue(name)              mechanical sounds asked for by the weapon models (magOut, pumpBack, ...)
//   play(name)             a sound from the shooter's hands (a swing, a dry click)
//   world(name, pos)       things that happen out in the street (explosions, thunder, hits)
// plus loop(name) for sounds that last as long as a trigger is held (flame roar, arc buzz).
//
// The lab plays them through a small graph of its own (a compressor and a short alley reverb).
// The game passes its sound system in as `host`: there the same sounds are entries in the
// game's sound table and go out through its buses, so its volume setting, pause, the muffling
// when the player dies, its reverb and the report's echo off the street all apply to them.
import * as THREE from "three";
import { SOUNDS, SHOTS, keyOf, shotOf, render } from "./sounds.js";
import { mulberry, hash } from "./dsp.js";

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

// The same cue on a bigger or a smaller weapon: a pump gun's parts ring lower than an SMG's.
const CUE_PITCH = {
  shotgun: 0.9,
  lever: 0.94,
  smg: 1.1,
  revolver: 1.03,
  nailgun: 1.06,
  crossbow: 0.92,
  flamer: 0.9,
  firework: 0.86,
  arc: 1.12,
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * getCamera: where the listener is (the lab pans and fades street sounds by it).
 * opts.host: the game's sound system, or a function returning it — { play(name, opts),
 * loop(name, opts), shot(voice) }. Without it the lab's own graph is used.
 */
export function createAudio(getCamera, opts = {}) {
  const hostOf =
    typeof opts.host === "function"
      ? opts.host
      : opts.host
        ? () => opts.host
        : null;
  const host = () => {
    const h = hostOf && hostOf();
    return h && h.play && !h.stub && !h.silent ? h : null;
  };
  let ctx = null,
    master = null,
    wet = null;
  let muted = false;
  const volume = 0.7;
  const last = new Map(); // name -> time, to stop a burst of identical sounds piling up
  const loops = new Map();
  const buffers = new Map(); // "key#variant" -> AudioBuffer (the lab's own)
  const turn = new Map(); // key -> the variant played last
  const live = new Map(); // key -> end times of the ones still sounding
  const stats = { played: {} };
  const _v = new THREE.Vector3();
  const now = () => (ctx ? ctx.currentTime : performance.now() / 1000);

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -8;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.15;
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
    warm();
    return ctx;
  }

  // ---------------------------------------------------------------- the lab's buffers
  function buffer(key, v) {
    const id = key + "#" + v;
    let b = buffers.get(id);
    if (!b) {
      const r = render(key, v, 0, mulberry(hash(key) + v * 7919));
      b = ctx.createBuffer(1, r.data.length, r.sr);
      b.getChannelData(0).set(r.data);
      buffers.set(id, b);
    }
    return b;
  }
  // everything is synthesised a little at a time after the first click, so the first shot
  // of a weapon does not wait for its sound to be made
  function warm() {
    const todo = [];
    for (const [key, def] of Object.entries(SOUNDS))
      for (let v = 0; v < def.n; v++) todo.push([key, v]);
    const step = () => {
      const t0 = performance.now();
      while (todo.length && performance.now() - t0 < 5) {
        const [key, v] = todo.shift();
        try {
          buffer(key, v);
        } catch (err) {
          console.error("[audio] synthesis failed for " + key, err);
        }
      }
      if (todo.length) setTimeout(step, 30);
    };
    setTimeout(step, 200);
  }
  const variant = (key) => {
    const n = SOUNDS[key].n;
    const v =
      ((turn.get(key) ?? -1) + 1 + (n > 2 && Math.random() < 0.3 ? 1 : 0)) % n;
    turn.set(key, v);
    return v;
  };

  /**
   * One sound from the table. o: { gain, pitch, jitter, pan, wet, pos }
   * (pos: the game places it in the street; pan and wet are the lab's)
   */
  function fire(key, o = {}) {
    const def = SOUNDS[key];
    if (!def || muted) return;
    stats.played[key] = (stats.played[key] || 0) + 1;
    const h = host();
    if (hostOf) {
      if (!h) return;
      const p = { gain: o.gain ?? 1, pitch: o.pitch || 1 };
      if (o.jitter != null) p.jitter = o.jitter;
      if (o.pos) p.pos = o.pos;
      h.play(key, p);
      return;
    }
    if (!ensure() || ctx.state !== "running") return;
    const t = ctx.currentTime;
    // no more of one sound at once than it allows: the oldest is left to finish
    const ends = (live.get(key) || []).filter((e) => e > t);
    if (ends.length >= (def.max || 4)) return;
    const jit = o.jitter ?? 0.035;
    const rate = clamp(
      (o.pitch || 1) * (1 + (Math.random() * 2 - 1) * jit),
      0.25,
      4,
    );
    const src = ctx.createBufferSource();
    src.buffer = buffer(key, variant(key));
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = (o.gain ?? 1) * (1 - Math.random() * 0.08);
    let node = g;
    src.connect(g);
    if (ctx.createStereoPanner && o.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(o.pan, -1, 1);
      g.connect(p);
      node = p;
    }
    node.connect(master);
    if (o.wet) {
      const s = ctx.createGain();
      s.gain.value = o.wet;
      node.connect(s).connect(wet);
    }
    src.start(t);
    ends.push(t + src.buffer.duration / rate);
    live.set(key, ends);
  }

  // A name the weapons use -> the sound and how it is played. `size` is the old recipes'
  // way of asking for a bigger one.
  function resolve(name, o) {
    const size = o.size ?? 1;
    if (name === "whoosh")
      return [size > 1.3 ? "a_whoosh_heavy" : "a_whoosh", {}];
    if (name === "explosion")
      return [
        "a_explosion",
        {
          gain: clamp(0.42 + 0.4 * size, 0.5, 1),
          pitch: clamp(1.26 - 0.22 * size, 0.82, 1.2),
        },
      ];
    if (name === "burst")
      return ["a_burst", { pitch: clamp(1.15 - 0.15 * size, 0.85, 1.15) }];
    if (name === "gun") return ["a_shot_revolver", { pitch: 1 / size }];
    return [keyOf(name) || "a_click", {}];
  }
  function play(name, o = {}) {
    if (muted) return;
    // identical sounds closer together than `gap` are dropped (a volley of pellets is one thud)
    const gap = o.gap ?? 0;
    if (gap) {
      const t = now();
      if (t - (last.get(name) ?? -9) < gap) return;
      last.set(name, t);
    }
    const [key, how] = resolve(name, o);
    fire(key, {
      gain: (o.gain ?? 1) * (how.gain ?? 1),
      pitch: (o.pitch || 1) * (how.pitch || 1),
      pan: o.pan,
      wet: o.wet ?? 0.12,
      pos: o.pos,
      jitter: o.jitter,
    });
  }

  const api = {
    CUES,
    stats,
    get ready() {
      return hostOf ? !!host() : !!ctx && ctx.state === "running";
    },
    get muted() {
      return muted;
    },
    /** Browsers only start audio from a user gesture: call from a click or key press. */
    unlock() {
      if (hostOf || !ensure()) return;
      if (ctx.state === "suspended") ctx.resume();
    },
    setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : volume;
      if (muted) for (const l of loops.values()) l.set(0);
    },
    play,
    /** Mechanical sound requested by a weapon model. `weapon` tunes it to the weapon's size. */
    cue(name, gain = 1, weapon = "") {
      play(name, { gain, wet: 0.06, pitch: CUE_PITCH[weapon] || 1 });
    },
    /** The report of a weapon. */
    shot(id, branch, o = {}) {
      const s = shotOf(id, branch);
      if (!s || muted) return;
      const h = host();
      if (h && h.shot) {
        // the game's own way with a report: its echo off the street, ambience ducked under it
        stats.played[s[0]] = (stats.played[s[0]] || 0) + 1;
        h.shot(branch !== "base" && SHOTS[id][branch] ? id + ":" + branch : id);
      } else
        fire(s[0], { gain: s[1] * (o.gain ?? 1), wet: 0.3, jitter: 0.012 });
      if (s[2]) play(s[2], { gain: 0.6, wet: 0.2, gap: 0.12 });
      if (o.shock) play("zap", { gain: 0.6, wet: 0.2 });
    },
    /** Something out in the street: quieter and duller with distance, panned by where it is on screen. */
    world(name, pos, o = {}) {
      if (hostOf) {
        const h = host();
        if (!h || muted) return;
        if (name === "explosion" && pos) {
          // the game has explosions of its own, with everything that goes with them
          const gap = o.gap ?? 0;
          const t = now();
          if (gap && t - (last.get(name) ?? -9) < gap) return;
          last.set(name, t);
          const size = clamp(o.size ?? 1, 0.3, 3);
          const big = size >= 1.3;
          stats.played.explosion = (stats.played.explosion || 0) + 1;
          h.play(big ? "explosion_big" : "explosion", {
            pos,
            gain:
              (o.gain ?? 1) *
              (big
                ? clamp(0.7 + 0.18 * size, 0.9, 1.2)
                : clamp(0.42 + 0.4 * size, 0.5, 1)),
            pitch: big
              ? clamp(1.13 - 0.075 * size, 0.92, 1.04)
              : clamp(1.26 - 0.22 * size, 0.82, 1.2),
            jitter: 0.04,
            ...(big ? { ref: 12 + 3 * size } : {}),
          });
          return;
        }
        // (the game already sounds a hit on the dead: this is only the wet of it on top)
        play(name, {
          ...o,
          gain: (o.gain ?? 1) * (name === "flesh" ? 0.6 : 1),
          pos,
        });
        return;
      }
      const cam = getCamera && getCamera();
      let gain = o.gain ?? 1,
        pan = 0;
      if (cam && pos) {
        _v.copy(pos).applyMatrix4(cam.matrixWorldInverse);
        const d = _v.length();
        gain *= 1 / (1 + d * 0.07);
        pan = clamp((_v.x / Math.max(1, d)) * 1.2, -0.8, 0.8);
      }
      play(name, { ...o, gain, pan, wet: o.wet ?? 0.35 });
    },
    /**
     * A sustained sound: loop("flame") returns { set(gain 0..1, pitch = 1), stop() }.
     * kinds: flame, blueflame, arc, charge
     */
    loop(kind) {
      if (loops.has(kind)) return loops.get(kind);
      const key = SOUNDS["a_loop_" + kind] ? "a_loop_" + kind : "a_loop_charge";
      const h = {
        g: null, // the lab's gain node
        src: null,
        voice: null, // the game's loop
        set(v, pitch = 1) {
          if (muted) v = 0;
          if (hostOf) {
            const hh = host();
            if (!hh || !hh.loop) return;
            if (!h.voice || h.voice.alive === false) {
              if (!(v > 0)) return;
              h.voice = hh.loop(key, { gain: 0, bus: "gun", fade: 14 });
            }
            h.voice.setGain(v);
            h.voice.setPitch(pitch);
            return;
          }
          if (!ensure() || ctx.state !== "running") return;
          if (!h.g) {
            if (!(v > 0)) return;
            h.g = ctx.createGain();
            h.g.gain.value = 0;
            h.g.connect(master);
            const send = ctx.createGain();
            send.gain.value = 0.15;
            h.g.connect(send).connect(wet);
            h.src = ctx.createBufferSource();
            h.src.buffer = buffer(key, 0);
            h.src.loop = true;
            h.src.connect(h.g);
            h.src.start(0, Math.random() * h.src.buffer.duration);
          }
          const t = ctx.currentTime;
          h.g.gain.setTargetAtTime(v, t, 0.05);
          h.src.playbackRate.setTargetAtTime(clamp(pitch, 0.25, 4), t, 0.04);
        },
        stop() {
          if (h.voice) {
            h.voice.stop(0.12);
            h.voice = null;
          }
          if (h.g) h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        },
      };
      loops.set(kind, h);
      return h;
    },
    stopLoops() {
      for (const l of loops.values()) l.stop();
    },
    /** For checks: render one sound and report its peak, loudness and length. */
    async measure(name, o = {}) {
      const [key] = SOUNDS[name] ? [name] : resolve(name, o);
      const r = render(key, o.variant || 0, 0, mulberry(hash(key)));
      const d = r.data;
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
        seconds: +(lastLoud / r.sr).toFixed(2),
        bad,
      };
    },
    recipes: () => [
      ...Object.keys(SOUNDS)
        .filter((k) => !SOUNDS[k].loop)
        .map((k) => k.slice(2)),
      "gun",
    ],
  };
  return api;
}
