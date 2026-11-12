var TAU5 = Math.PI * 2;
function rng2(seed) {
  let s = seed >>> 0;
  return () => {
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var buf = (sr, sec) => new Float32Array(Math.max(1, Math.round(sr * sec)));
function biquad(a, sr, type, f3, q = 0.707, gainDb = 0) {
  const w = TAU5 * Math.min(Math.max(f3, 12), sr * 0.46) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") {
    b0 = (1 - c) / 2;
    b1 = 1 - c;
    b2 = b0;
    a0 = 1 + al;
    a1 = -2 * c;
    a2 = 1 - al;
  } else if (type === "hp") {
    b0 = (1 + c) / 2;
    b1 = -(1 + c);
    b2 = b0;
    a0 = 1 + al;
    a1 = -2 * c;
    a2 = 1 - al;
  } else if (type === "bp") {
    b0 = al;
    b1 = 0;
    b2 = -al;
    a0 = 1 + al;
    a1 = -2 * c;
    a2 = 1 - al;
  } else {
    b0 = 1 + al * A;
    b1 = -2 * c;
    b2 = 1 - al * A;
    a0 = 1 + al / A;
    a1 = -2 * c;
    a2 = 1 - al / A;
  }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  a1 /= a0;
  a2 /= a0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    a[i] = y;
  }
  return a;
}
var noise = (sr, sec, r) => {
  const a = buf(sr, sec);
  for (let i = 0; i < a.length; i++) a[i] = r() * 2 - 1;
  return a;
};
var brown = (sr, sec, r) => {
  const a = buf(sr, sec);
  let v = 0;
  for (let i = 0; i < a.length; i++) {
    v = (v + (r() * 2 - 1) * 0.06) * 0.995;
    a[i] = v * 3;
  }
  return a;
};
var env = (a, sr, tau, att = 5e-4, pow = 1) => {
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    a[i] *= Math.min(1, t / att) * Math.pow(Math.exp(-t / tau), pow);
  }
  return a;
};
var fadeEnds = (a, sr, tin = 4e-3, tout = 0.01) => {
  const n = a.length, ni = Math.round(tin * sr), no = Math.round(tout * sr);
  for (let i = 0; i < ni && i < n; i++) a[i] *= i / ni;
  for (let i = 0; i < no && i < n; i++) a[n - 1 - i] *= i / no;
  return a;
};
var sweep2 = (sr, sec, f0, f1, tp, ta, att = 6e-4) => {
  const a = buf(sr, sec);
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    ph += TAU5 * (f1 + (f0 - f1) * Math.exp(-t / tp)) / sr;
    a[i] = Math.sin(ph) * Math.exp(-t / ta) * Math.min(1, t / att);
  }
  return a;
};
var mix3 = (dst, src, sr, at = 0, g2 = 1) => {
  const o = Math.round(at * sr);
  for (let i = 0; i < src.length && i + o < dst.length; i++) dst[i + o] += src[i] * g2;
  return dst;
};
var peak = (a) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const v = Math.abs(a[i]);
    if (v > m) m = v;
  }
  return m;
};
var norm = (a, to = 0.95) => {
  const p = peak(a);
  if (p > 0) for (let i = 0; i < a.length; i++) a[i] *= to / p;
  return a;
};
var drive = (a, k) => {
  for (let i = 0; i < a.length; i++) a[i] = Math.tanh(a[i] * k);
  return a;
};
var nb = (sr, r, sec, tau, o = {}) => {
  const a = noise(sr, sec, r);
  if (o.hp) biquad(a, sr, "hp", o.hp);
  if (o.lp) biquad(a, sr, "lp", o.lp);
  if (o.bp) biquad(a, sr, "bp", o.bp, o.q || 1);
  env(a, sr, tau, o.att || 4e-4);
  return norm(a, 1);
};
var partials = (sr, sec, list, r) => {
  const a = buf(sr, sec);
  for (const [f3, g2, tau] of list) {
    const ph0 = r() * TAU5;
    for (let i = 0; i < a.length; i++) {
      const t = i / sr;
      a[i] += Math.sin(TAU5 * f3 * t + ph0) * g2 * Math.exp(-t / tau);
    }
  }
  return a;
};
function voice(sr, sec, r, pitchFn, formants, o = {}) {
  const a = buf(sr, sec), rough = o.rough ?? 0.3, breath = o.breath ?? 0.25;
  let ph = 0, jit = 0, sub2 = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    if (i % 64 === 0) jit = (r() - 0.5) * rough * 0.12;
    const f3 = pitchFn(t) * (1 + jit);
    ph += f3 / sr;
    sub2 += f3 * 0.5 / sr;
    const p = ph % 1;
    let v = p * 2 - 1 - 0.6 * Math.sin(TAU5 * p);
    v *= 1 - rough * 0.5 * (0.5 + 0.5 * Math.sin(TAU5 * sub2 + Math.sin(t * 31) * 2));
    a[i] = v;
  }
  const out = buf(sr, sec);
  for (const [f3, q, g2] of formants) {
    const b = biquad(a.slice(), sr, "bp", f3, q);
    for (let i = 0; i < out.length; i++) out[i] += b[i] * g2;
  }
  if (breath > 0) {
    const n = biquad(biquad(noise(sr, sec, r), sr, "bp", formants[1] ? formants[1][0] : 1200, 0.8), sr, "hp", 500);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * breath * 0.35;
  }
  if (o.env) for (let i = 0; i < out.length; i++) out[i] *= o.env(i / sr, sec);
  return fadeEnds(norm(drive(out, o.drive || 1.6), 0.9), sr, 0.02, 0.04);
}
var scrape = (sr, r, sec, o = {}) => {
  const a = noise(sr, sec, r);
  biquad(a, sr, "bp", o.bp || 2200, o.q || 1.2);
  if (o.hp) biquad(a, sr, "hp", o.hp);
  let ph = r();
  for (let i = 0; i < a.length; i++) {
    const u = i / a.length;
    ph += (o.rate || 150) * (1 + (o.accel || 0) * u) / sr;
    const ch = 0.3 + 0.7 * Math.pow(Math.abs(Math.sin(Math.PI * ph)), 2.5);
    a[i] *= ch * Math.pow(Math.sin(Math.PI * Math.min(1, u * (1 - (o.lead || 0)) + (o.lead || 0) * 0.5)), o.shape || 0.7) * (1 + (o.rise || 0) * u);
  }
  return norm(a, 1);
};
var twang = (sr, sec, f3, tau, vib = 38, depth = 0.05) => {
  const a = buf(sr, sec);
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr;
    ph += TAU5 * f3 * (1 + depth * Math.sin(TAU5 * vib * t) * Math.exp(-t / tau)) / sr;
    a[i] = (Math.sin(ph) + 0.5 * Math.sin(ph * 2.003) + 0.22 * Math.sin(ph * 3.01)) * Math.exp(-t / tau) * Math.min(1, t / 2e-3);
  }
  return a;
};
var fallLP = (a, sr, f0, f1, tau) => {
  let y = 0, y2 = 0;
  for (let i = 0; i < a.length; i++) {
    const f3 = f1 + (f0 - f1) * Math.exp(-i / sr / tau), k = 1 - Math.exp(-TAU5 * f3 / sr);
    y += (a[i] - y) * k;
    y2 += (y - y2) * k;
    a[i] = y2;
  }
  return a;
};
function synthBank() {
  const B2 = {}, SR = {}, r = rng2(90210);
  const section = (sr, fn) => {
    const had = new Set(Object.keys(B2));
    fn(sr, (sec) => buf(sr, sec));
    for (const k in B2) if (!had.has(k)) SR[k] = sr;
  };
  section(44100, (sr, S4) => {
    const click = (f3, tau, g2 = 1) => {
      const o = S4(0.09);
      mix3(o, nb(sr, r, 0.02, 25e-4, { bp: f3, q: 1.4 }), sr, 0, 1);
      mix3(o, partials(sr, 0.06, [[f3 * 1.31, 0.4, tau], [f3 * 2.17, 0.25, tau * 0.7]], r), sr, 1e-3, 0.5);
      return norm(o, 0.7 * g2);
    };
    const tone = (f3, d, tau, h = 0.3) => {
      const a = S4(d);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr;
        a[i] = (Math.sin(TAU5 * f3 * t) + h * Math.sin(TAU5 * f3 * 2 * t) + h * 0.5 * Math.sin(TAU5 * f3 * 3.01 * t)) * Math.exp(-t / tau) * Math.min(1, t / 4e-3);
      }
      return a;
    };
    const thud = (f0, f1, tp, ta, d = 0.08) => sweep2(sr, d, f0, f1, tp, ta, 1e-3);
    const tick2 = (f3, ms = 3, q = 1.6) => nb(sr, r, 0.03, ms / 1e3, { bp: f3, q });
    B2.rifle = [1, 0.955, 1.04, 0.985, 1.02, 0.97].map((p, v) => {
      const o = S4(0.42), j = () => 0.9 + r() * 0.2;
      mix3(o, nb(sr, r, 0.01, 11e-4, { hp: 3500 }), sr, 0, 2.4 * j());
      mix3(o, nb(sr, r, 0.03, 45e-4, { hp: 1100, lp: 9500 }), sr, 2e-4, 1.4);
      mix3(o, sweep2(sr, 0.16, 172 * p, 44 * p, 0.021, 0.05, 18e-4), sr, 0, 1.05);
      mix3(o, nb(sr, r, 0.2, 0.031 * j(), { hp: 210 * p, lp: 2400 * p, att: 9e-4 }), sr, 0, 1.5);
      mix3(o, nb(sr, r, 0.09, 0.016, { bp: 720 * p, q: 2.6 }), sr, 5e-4, 0.8);
      mix3(o, nb(sr, r, 0.06, 0.01, { bp: 1180 * p, q: 3 }), sr, 1e-3, 0.42);
      mix3(o, nb(sr, r, 0.22, 0.05, { hp: 5200, att: 4e-3 }), sr, 3e-3, 0.22);
      const tb = 0.038 + v % 3 * 15e-4, tf = 0.07 + v % 2 * 2e-3;
      mix3(o, tick2(1850 * p, 3), sr, tb, 0.3);
      mix3(o, partials(sr, 0.05, [[2350 * p, 0.5, 8e-3], [3910, 0.4, 6e-3], [5230, 0.3, 5e-3]], r), sr, tb, 0.2);
      mix3(o, tick2(1320 * p, 4), sr, tf, 0.28);
      mix3(o, thud(185, 92, 0.01, 0.014, 0.05), sr, tf, 0.22);
      mix3(o, partials(sr, 0.04, [[3120 * p, 0.4, 6e-3], [4480, 0.3, 4e-3]], r), sr, tf + 1e-3, 0.14);
      mix3(o, twang(sr, 0.2, 545 * p, 0.07, 41, 0.05), sr, tb + 4e-3, 0.07);
      return fadeEnds(norm(drive(o, 1.8), 0.97), sr, 0, 0.03);
    });
    B2.pistol = [1, 0.96, 1.035, 0.99].map((p, v) => {
      const o = S4(0.3);
      mix3(o, nb(sr, r, 8e-3, 9e-4, { hp: 4e3 }), sr, 0, 2.2);
      mix3(o, nb(sr, r, 0.02, 3e-3, { hp: 1500, lp: 1e4 }), sr, 2e-4, 1.2);
      mix3(o, sweep2(sr, 0.09, 300 * p, 85 * p, 0.01, 0.021, 12e-4), sr, 0, 0.85);
      mix3(o, nb(sr, r, 0.12, 0.017, { hp: 450 * p, lp: 4800 * p }), sr, 0, 1.5);
      mix3(o, nb(sr, r, 0.05, 8e-3, { bp: 1650 * p, q: 2.2 }), sr, 4e-4, 0.7);
      mix3(o, nb(sr, r, 0.12, 0.03, { hp: 6e3, att: 3e-3 }), sr, 2e-3, 0.16);
      const tb = 0.024 + v * 1e-3, tf = 0.052 + v % 2 * 2e-3;
      mix3(o, tick2(2650 * p, 2.5), sr, tb, 0.3);
      mix3(o, partials(sr, 0.04, [[3100 * p, 0.5, 6e-3], [4700, 0.35, 5e-3]], r), sr, tb, 0.22);
      mix3(o, tick2(1900 * p, 3), sr, tf, 0.3);
      mix3(o, thud(240, 120, 8e-3, 0.01, 0.04), sr, tf, 0.18);
      mix3(o, twang(sr, 0.12, 760 * p, 0.035, 55, 0.04), sr, tf, 0.05);
      return fadeEnds(norm(drive(o, 1.6), 0.95), sr, 0, 0.03);
    });
    B2.dry = [0, 1].map((v) => {
      const o = S4(0.15);
      mix3(o, click(1900 + v * 150, 5e-3), sr, 0, 1);
      mix3(o, thud(240, 120, 6e-3, 8e-3, 0.03), sr, 0, 0.5);
      mix3(o, click(3400, 3e-3), sr, 0.045 + v * 6e-3, 0.3);
      return norm(o, 0.5);
    });
    B2.pDry = [0, 1].map((v) => {
      const o = S4(0.17);
      mix3(o, click(2900 + v * 200, 4e-3), sr, 0, 1);
      mix3(o, thud(320, 170, 4e-3, 6e-3, 0.02), sr, 0, 0.35);
      mix3(o, click(4300, 3e-3), sr, 0.07 + v * 8e-3, 0.25);
      return norm(o, 0.42);
    });
    B2.lowMag = [0, 1].map((v) => norm(mix3(mix3(S4(0.13), partials(sr, 0.1, [[1620 + v * 90, 0.5, 0.02], [2940 + v * 120, 0.4, 0.014], [4410, 0.2, 8e-3]], r), sr, 0.03, 1), tick2(2100, 2), sr, 0.03, 0.4), 0.3));
    const magModes = (k, damp2 = 1) => [[410 * k, 0.5, 0.035 * damp2], [655 * k, 0.4, 0.028 * damp2], [1090 * k, 0.35, 0.02 * damp2], [1730 * k, 0.25, 0.014 * damp2], [2890 * k, 0.2, 9e-3 * damp2]];
    const pModes = (k, damp2 = 1) => [[720 * k, 0.5, 0.03 * damp2], [1180 * k, 0.4, 0.025 * damp2], [1950 * k, 0.3, 0.016 * damp2], [3200 * k, 0.2, 0.01 * damp2]];
    B2.rlStart = [0, 1].map((v) => {
      const o = S4(0.36), c = noise(sr, 0.3, r);
      biquad(c, sr, "bp", 1300 + v * 300, 0.6);
      biquad(c, sr, "lp", 4200);
      for (let i = 0; i < c.length; i++) {
        const u = i / c.length;
        c[i] *= Math.pow(Math.sin(Math.PI * u), 1.5) * (0.6 + 0.4 * Math.sin(u * 23 + v));
      }
      mix3(o, norm(c, 1), sr, 0, 0.8);
      for (let i = 0; i < 4; i++) mix3(o, partials(sr, 0.03, [[4200 + r() * 900, 0.5, 4e-3], [6100 + r() * 1200, 0.35, 3e-3]], r), sr, 0.05 + r() * 0.2, 0.12 + r() * 0.14);
      mix3(o, nb(sr, r, 0.08, 0.02, { bp: 420, q: 4, att: 0.01 }), sr, 0.06 + v * 0.03, 0.25);
      return norm(o, 0.36);
    });
    B2.magOut = [0, 1].map((v) => {
      const o = S4(0.36), k = 1 + v * 0.05;
      mix3(o, click(2100 * k, 5e-3), sr, 0, 0.9);
      mix3(o, thud(300, 160, 6e-3, 8e-3, 0.03), sr, 0, 0.3);
      mix3(o, scrape(sr, r, 0.075, { bp: 2600 * k, q: 1.5, rate: 140, accel: 0.6 }), sr, 0.012, 0.36);
      mix3(o, scrape(sr, r, 0.07, { bp: 900, q: 1, rate: 95 }), sr, 0.015, 0.24);
      mix3(o, tick2(1250 * k, 3), sr, 0.062, 0.9);
      mix3(o, partials(sr, 0.16, magModes(k), r), sr, 0.062, 0.75);
      mix3(o, nb(sr, r, 0.14, 0.05, { bp: 700, q: 0.8, att: 0.02 }), sr, 0.09, 0.14);
      return norm(o, 0.72);
    });
    B2.magDrop = [0, 1, 2].map((v) => {
      const o = S4(0.75), k = 0.92 + v * 0.09, t2 = 0.15 + v * 0.025 + r() * 0.02, t3 = t2 + 0.1 + r() * 0.03;
      const hit = (at, g2, kk, br) => {
        mix3(o, thud(190 * kk, 70, 0.02, 0.028), sr, at, g2 * (1 - br) * 0.9);
        mix3(o, tick2(2200 * kk, 4, 1), sr, at, g2 * 0.5);
        mix3(o, partials(sr, 0.3, magModes(kk, 1.9), r), sr, at, g2 * (0.6 + 0.5 * br));
        mix3(o, nb(sr, r, 0.03, 6e-3, { hp: 3500 }), sr, at, g2 * 0.3 * br);
      };
      hit(0, 1, k, 0.2);
      hit(t2, 0.45, k * 1.12, 0.7);
      hit(t3, 0.2, k * 1.21, 0.9);
      mix3(o, nb(sr, r, 0.2, 0.045, { hp: 2800, lp: 9e3, att: 6e-3 }), sr, 4e-3, 0.14);
      mix3(o, scrape(sr, r, 0.09, { bp: 1700, rate: 60, shape: 0.5 }), sr, t3 + 0.02, 0.1);
      return norm(o, 0.7);
    });
    B2.magGrab = [0, 1].map((v) => {
      const o = S4(0.32);
      mix3(o, scrape(sr, r, 0.13, { bp: 3800 - v * 500, q: 0.5, hp: 1800, rate: 240, accel: 1.2, shape: 0.5 }), sr, 0, 0.6);
      mix3(o, nb(sr, r, 0.16, 0.05, { bp: 900, q: 0.7, att: 0.02 }), sr, 0.02, 0.35);
      mix3(o, click(1300 + v * 200, 6e-3), sr, 0.15, 0.3);
      mix3(o, nb(sr, r, 0.05, 0.012, { lp: 600, att: 3e-3 }), sr, 0.15, 0.2);
      return norm(o, 0.4);
    });
    B2.magIn = [0, 1].map((v) => {
      const o = S4(0.44), k = 1 + v * 0.045, ts = 0.06;
      mix3(o, click(2500 * k, 4e-3), sr, 0, 0.5);
      mix3(o, scrape(sr, r, 0.05, { bp: 1900 * k, q: 1.4, rate: 170, accel: 0.8, rise: 0.6 }), sr, 8e-3, 0.36);
      mix3(o, tick2(1500 * k, 3), sr, ts, 1);
      mix3(o, partials(sr, 0.05, [[2250 * k, 0.5, 7e-3], [3380, 0.35, 6e-3], [5100, 0.25, 4e-3]], r), sr, ts, 0.5);
      mix3(o, thud(210, 95, 0.012, 0.02, 0.07), sr, ts, 0.7);
      mix3(o, partials(sr, 0.09, magModes(0.8 * k, 0.5), r), sr, ts, 0.45);
      for (let i = 0; i < 5; i++) mix3(o, partials(sr, 0.02, [[3100 + r() * 1500, 0.5, 3e-3], [5200 + r() * 1800, 0.3, 2e-3]], r), sr, ts + 0.014 + i * 0.017 + r() * 8e-3, 0.2 * (1 - i / 6));
      mix3(o, thud(150, 80, 0.012, 0.016, 0.05), sr, 0.115, 0.3);
      mix3(o, click(1700, 4e-3), sr, 0.135, 0.18);
      return norm(o, 0.8);
    });
    B2.boltBack = [0, 1].map((v) => {
      const o = S4(0.28), k = 1 + v * 0.04, tc = 0.16;
      mix3(o, click(1700 * k, 4e-3), sr, 0, 0.45);
      mix3(o, scrape(sr, r, 0.14, { bp: 2300 * k, q: 1, rate: 190, accel: 0.9, rise: 1.2, shape: 0.5 }), sr, 0.018, 0.4);
      mix3(o, scrape(sr, r, 0.14, { bp: 1050, q: 1.4, rate: 120, accel: 0.5, rise: 1 }), sr, 0.018, 0.22);
      {
        const a = buf(sr, 0.14);
        let ph = 0;
        for (let i = 0; i < a.length; i++) {
          const u = i / a.length;
          ph += TAU5 * (380 + 330 * u) * k / sr;
          a[i] = Math.sin(ph) * u * Math.sin(Math.PI * u);
        }
        mix3(o, a, sr, 0.018, 0.05);
      }
      mix3(o, tick2(1100 * k, 4), sr, tc, 0.9);
      mix3(o, thud(230, 110, 0.012, 0.017, 0.05), sr, tc, 0.6);
      mix3(o, partials(sr, 0.05, [[1480 * k, 0.4, 0.012], [2630, 0.3, 9e-3]], r), sr, tc, 0.4);
      return norm(o, 0.68);
    });
    B2.boltFwd = [0, 1].map((v) => {
      const o = S4(0.42), k = 1 + v * 0.035, ts = 0.048;
      mix3(o, scrape(sr, r, 0.05, { bp: 2800 * k, q: 0.9, rate: 320, accel: 1.5, rise: 2.5, shape: 0.4, lead: 0.3 }), sr, 0, 0.32);
      mix3(o, nb(sr, r, 0.01, 18e-4, { hp: 2200 }), sr, ts, 1);
      mix3(o, tick2(1400 * k, 5, 1.2), sr, ts, 0.9);
      mix3(o, thud(260, 100, 0.012, 0.022, 0.07), sr, ts, 0.8);
      mix3(o, partials(sr, 0.2, [[1320 * k, 0.5, 0.03], [2210 * k, 0.4, 0.024], [3540, 0.3, 0.016], [5870, 0.2, 0.01], [790 * k, 0.3, 0.04]], r), sr, ts, 0.5);
      mix3(o, twang(sr, 0.3, 480 * k, 0.08, 38, 0.06), sr, ts + 4e-3, 0.16);
      mix3(o, click(3600, 3e-3), sr, ts + 0.026, 0.3);
      return norm(o, 0.85);
    });
    B2.pMagOut = [(() => {
      const o = S4(0.24);
      mix3(o, click(2800, 4e-3), sr, 0, 0.7);
      mix3(o, scrape(sr, r, 0.035, { bp: 3200, q: 1.2, rate: 260, accel: 1 }), sr, 0.01, 0.3);
      mix3(o, tick2(1700, 2.5), sr, 0.04, 0.6);
      mix3(o, partials(sr, 0.08, pModes(1, 0.5), r), sr, 0.04, 0.4);
      return norm(o, 0.5);
    })()];
    B2.pMagDrop = [0, 1].map((v) => {
      const o = S4(0.55), k = 0.95 + v * 0.1, t2 = 0.12 + r() * 0.03, t3 = t2 + 0.08 + r() * 0.02;
      for (const [at, g2, kk, br] of [[0, 1, k, 0.25], [t2, 0.42, k * 1.1, 0.7], [t3, 0.18, k * 1.2, 0.9]]) {
        mix3(o, thud(240 * kk, 110, 0.014, 0.02, 0.06), sr, at, g2 * (1 - br) * 0.8);
        mix3(o, tick2(2600 * kk, 3, 1), sr, at, g2 * 0.5);
        mix3(o, partials(sr, 0.2, pModes(kk, 1.6), r), sr, at, g2 * (0.55 + 0.4 * br));
      }
      mix3(o, nb(sr, r, 0.15, 0.035, { hp: 3e3, lp: 9e3, att: 5e-3 }), sr, 4e-3, 0.12);
      return norm(o, 0.55);
    });
    B2.pMagIn = [(() => {
      const o = S4(0.3), ts = 0.06;
      mix3(o, scrape(sr, r, 0.05, { bp: 2600, q: 1.3, rate: 210, accel: 1, rise: 0.8 }), sr, 4e-3, 0.32);
      mix3(o, tick2(2e3, 2.5), sr, ts, 0.95);
      mix3(o, partials(sr, 0.04, [[2700, 0.5, 6e-3], [4100, 0.3, 5e-3]], r), sr, ts, 0.55);
      mix3(o, thud(180, 85, 0.012, 0.018, 0.06), sr, ts, 0.6);
      mix3(o, nb(sr, r, 0.06, 0.014, { lp: 900, att: 2e-3 }), sr, ts, 0.3);
      return norm(o, 0.7);
    })()];
    B2.slide = [0, 1].map((v) => {
      const o = S4(0.32), k = 1 + v * 0.04, ts = 0.032;
      mix3(o, click(2400 * k, 4e-3), sr, 0, 0.5);
      mix3(o, scrape(sr, r, 0.022, { bp: 3e3, q: 1, rate: 380, rise: 2, shape: 0.4, lead: 0.3 }), sr, 8e-3, 0.25);
      mix3(o, nb(sr, r, 8e-3, 15e-4, { hp: 2500 }), sr, ts, 0.9);
      mix3(o, tick2(1800 * k, 4, 1.2), sr, ts, 0.8);
      mix3(o, thud(300, 130, 9e-3, 0.014, 0.05), sr, ts, 0.5);
      mix3(o, partials(sr, 0.14, [[1750 * k, 0.5, 0.022], [2950 * k, 0.4, 0.016], [4650, 0.3, 0.01]], r), sr, ts, 0.5);
      mix3(o, twang(sr, 0.18, 620 * k, 0.05, 52, 0.05), sr, ts + 3e-3, 0.12);
      return norm(o, 0.8);
    });
    B2.stepWet = [0, 1, 2, 3].map((v) => {
      const o = S4(0.3);
      mix3(o, sweep2(sr, 0.07, 125 + v * 11, 58, 0.012, 0.02, 3e-3), sr, 0, 0.7);
      mix3(o, nb(sr, r, 0.05, 0.012, { bp: 650 + v * 80, q: 1.2, att: 2e-3 }), sr, 0, 0.8);
      mix3(o, nb(sr, r, 0.12, 0.022 + v * 3e-3, { hp: 1700, lp: 7500, att: 4e-3 }), sr, 6e-3, 0.55);
      for (let i = 0; i < 3; i++) mix3(o, nb(sr, r, 0.02, 3e-3, { bp: 3e3 + r() * 3500, q: 4 }), sr, 0.05 + r() * 0.14, 0.12 + r() * 0.1);
      return norm(biquad(o, sr, "lp", 8e3), 0.5);
    });
    B2.skid = [0, 1].map((v) => {
      const d = 0.95, o = S4(d), grit = noise(sr, d, r);
      biquad(grit, sr, "bp", 1300 + v * 250, 0.8);
      fallLP(grit, sr, 5200, 700, 0.42);
      for (let i = 0; i < grit.length; i++) {
        const t = i / sr;
        grit[i] *= Math.min(1, t / 0.012) * Math.exp(-t / 0.36) * (0.7 + 0.3 * Math.sin(t * 61 + v) * Math.sin(t * 23));
      }
      mix3(o, grit, sr, 0, 1);
      mix3(o, nb(sr, r, 0.7, 0.22, { hp: 2400, lp: 9e3, att: 0.02 }), sr, 0.01, 0.55);
      mix3(o, nb(sr, r, 0.3, 0.09, { bp: 420, q: 0.8, att: 4e-3 }), sr, 0, 0.6);
      mix3(o, sweep2(sr, 0.12, 95, 50, 0.02, 0.035, 3e-3), sr, 0, 0.7);
      for (let i = 0; i < 7; i++) mix3(o, nb(sr, r, 0.02, 3e-3, { bp: 2500 + r() * 4e3, q: 4 }), sr, 0.05 + r() * 0.5, 0.1 + r() * 0.12);
      return norm(fadeEnds(o, sr, 3e-3, 0.08), 0.6);
    });
    B2.cloth = [0, 1].map(() => norm(env(biquad(biquad(noise(sr, 0.22, r), sr, "bp", 1500, 0.6), sr, "lp", 4e3), sr, 0.08, 0.05), 0.35));
    B2.casing = [0, 1, 2, 3].map((v) => {
      const f3 = 3600 + v * 420, o = S4(0.4);
      for (const [t, g2] of [[0, 1], [0.07 + v * 0.01, 0.5], [0.12 + v * 0.012, 0.28], [0.155, 0.14]]) mix3(o, partials(sr, 0.12, [[f3, 0.6, 0.012], [f3 * 1.48, 0.4, 9e-3], [f3 * 2.31, 0.3, 6e-3], [f3 * 0.52, 0.2, 0.01]], r), sr, t, g2);
      return norm(o, 0.5);
    });
    B2.hitConcrete = [0, 1, 2].map(() => {
      const o = S4(0.35);
      mix3(o, nb(sr, r, 0.03, 5e-3, { hp: 1500 }), sr, 0, 1);
      mix3(o, nb(sr, r, 0.12, 0.03, { bp: 520, q: 1.2 }), sr, 0, 1.2);
      for (let i = 0; i < 6; i++) mix3(o, nb(sr, r, 0.02, 4e-3, { bp: 1800 + r() * 3e3, q: 3 }), sr, 0.03 + r() * 0.2, 0.25);
      return norm(o, 0.8);
    });
    B2.hitMetal = [0, 1, 2].map((v) => {
      const f3 = 900 + v * 370, o = S4(0.5);
      mix3(o, nb(sr, r, 0.01, 15e-4, { hp: 2500 }), sr, 0, 1.2);
      mix3(o, partials(sr, 0.5, [[f3, 0.5, 0.07], [f3 * 2.76, 0.45, 0.05], [f3 * 5.4, 0.3, 0.03], [f3 * 8.93, 0.2, 0.02], [f3 * 1.51, 0.3, 0.09]], r), sr, 0, 1);
      return norm(o, 0.8);
    });
    B2.hitWood = [0, 1].map((v) => {
      const o = S4(0.25);
      mix3(o, sweep2(sr, 0.1, 420 - v * 60, 180, 0.01, 0.022), sr, 0, 1);
      mix3(o, nb(sr, r, 0.06, 0.012, { bp: 1100, q: 1.5 }), sr, 0, 0.9);
      mix3(o, nb(sr, r, 0.04, 6e-3, { hp: 3e3 }), sr, 5e-3, 0.4);
      return norm(o, 0.75);
    });
    B2.hitGlass = [0, 1].map(() => {
      const o = S4(0.8);
      mix3(o, nb(sr, r, 0.02, 3e-3, { hp: 4e3 }), sr, 0, 1.2);
      for (let i = 0; i < 18; i++) mix3(o, partials(sr, 0.1, [[3e3 + r() * 6e3, 0.5, 0.012 + r() * 0.02], [5e3 + r() * 6e3, 0.3, 0.01]], r), sr, r() * r() * 0.6, 0.35 * (1 - i / 22));
      return norm(o, 0.7);
    });
    B2.hitFlesh = [0, 1, 2].map((v) => {
      const o = S4(0.3);
      mix3(o, sweep2(sr, 0.12, 150 - v * 15, 55, 0.02, 0.035, 2e-3), sr, 0, 1);
      mix3(o, nb(sr, r, 0.09, 0.02, { lp: 900, att: 2e-3 }), sr, 0, 1.1);
      mix3(o, nb(sr, r, 0.14, 0.04, { bp: 2400, q: 2.5, att: 0.01 }), sr, 0.012, 0.3);
      return norm(o, 0.85);
    });
    B2.headshot = [(() => {
      const o = S4(0.4);
      mix3(o, B2.hitFlesh[0], sr, 0, 1);
      mix3(o, sweep2(sr, 0.08, 520, 160, 0.012, 0.02), sr, 2e-3, 0.7);
      mix3(o, nb(sr, r, 0.2, 0.06, { bp: 1400, q: 1.5, att: 0.01 }), sr, 0.02, 0.5);
      return norm(o, 0.95);
    })()];
    B2.ricochet = [0, 1].map((v) => {
      const a = S4(0.45);
      let ph = 0;
      for (let i = 0; i < a.length; i++) {
        const t = i / sr, f3 = (v ? 3400 : 2600) * Math.exp(-t * (v ? 2.2 : 3.4)) + 500;
        ph += TAU5 * f3 / sr;
        a[i] = (Math.sin(ph) + 0.4 * Math.sin(ph * 2.01)) * Math.exp(-t / 0.11) * Math.min(1, t / 4e-3);
      }
      return norm(a, 0.45);
    });
    B2.step = [0, 1, 2, 3].map((v) => {
      const o = S4(0.22);
      mix3(o, sweep2(sr, 0.07, 130 + v * 12, 60, 0.012, 0.02, 3e-3), sr, 0, 0.8);
      mix3(o, nb(sr, r, 0.05, 0.012, { bp: 700 + v * 90, q: 1.2, att: 2e-3 }), sr, 0, 0.9);
      mix3(o, nb(sr, r, 0.16, 0.035, { hp: 1100, lp: 4800, att: 0.012 }), sr, 0.01, 0.1);
      return norm(biquad(o, sr, "lp", 5200), 0.5);
    });
    B2.zstep = [0, 1, 2].map((v) => {
      const o = S4(0.3);
      mix3(o, nb(sr, r, 0.08, 0.02, { bp: 380 + v * 70, q: 1, att: 4e-3 }), sr, 0, 1);
      mix3(o, nb(sr, r, 0.22, 0.06, { bp: 1900, q: 0.8, att: 0.03 }), sr, 0.02, 0.3);
      return norm(o, 0.4);
    });
    B2.pickAmmo = [(() => {
      const o = S4(0.35);
      mix3(o, click(1900, 0.015), sr, 0, 1);
      mix3(o, click(2700, 0.01), sr, 0.07, 0.8);
      mix3(o, partials(sr, 0.25, [[1240, 0.4, 0.06], [3350, 0.3, 0.04]], r), sr, 0.07, 0.5);
      return norm(o, 0.6);
    })()];
    B2.pickMed = [(() => {
      const o = S4(0.6);
      mix3(o, tone(660, 0.3, 0.09), sr, 0, 0.7);
      mix3(o, tone(990, 0.45, 0.14), sr, 0.11, 0.7);
      return norm(o, 0.45);
    })()];
    B2.uiTick = [(() => norm(mix3(S4(0.04), click(3100, 6e-3), sr, 0, 1), 0.22))()];
    B2.uiStep = [(() => norm(mix3(S4(0.03), click(2300, 4e-3), sr, 0, 1), 0.16))()];
    B2.uiOk = [(() => {
      const o = S4(0.2);
      mix3(o, click(1700, 0.01), sr, 0, 0.8);
      mix3(o, tone(880, 0.08, 0.03, 0.15), sr, 4e-3, 0.7);
      mix3(o, tone(1320, 0.14, 0.05, 0.15), sr, 0.06, 0.8);
      return norm(o, 0.34);
    })()];
    B2.uiBack = [(() => {
      const o = S4(0.16);
      mix3(o, tone(990, 0.07, 0.03, 0.15), sr, 0, 0.8);
      mix3(o, tone(660, 0.1, 0.04, 0.15), sr, 0.05, 0.7);
      return norm(o, 0.28);
    })()];
    B2.uavPing = [(() => {
      const o = S4(0.3);
      for (const [f3, at] of [[2350, 0], [3140, 0.07]]) mix3(o, tone(f3, 0.12, 0.03, 0.08), sr, at, 0.8);
      mix3(o, nb(sr, r, 0.2, 0.05, { bp: 5200, q: 3, att: 0.01 }), sr, 0.02, 0.07);
      return norm(o, 0.24);
    })()];
    B2.uavCall = [(() => {
      const o = S4(0.7);
      for (const [f3, at] of [[1175, 0], [1568, 0.13], [2093, 0.26]]) mix3(o, tone(f3, 0.3, 0.09, 0.2), sr, at, 0.7);
      mix3(o, nb(sr, r, 0.5, 0.2, { bp: 3e3, q: 2, att: 0.05 }), sr, 0, 0.05);
      return norm(o, 0.34);
    })()];
    B2.uavRelease = [(() => {
      const o = S4(0.3);
      mix3(o, click(1300, 0.012), sr, 0, 1);
      mix3(o, sweep2(sr, 0.08, 260, 110, 0.015, 0.02), sr, 2e-3, 0.8);
      mix3(o, nb(sr, r, 0.2, 0.05, { hp: 1800, lp: 7e3, att: 0.01 }), sr, 0.03, 0.25);
      return norm(o, 0.5);
    })()];
    B2.hitmark = [(() => norm(mix3(S4(0.06), tone(2100, 0.05, 0.012, 0.1), sr, 0, 1), 0.3))()];
    B2.killmark = [(() => {
      const o = S4(0.16);
      mix3(o, tone(1500, 0.08, 0.02, 0.1), sr, 0, 1);
      mix3(o, tone(2250, 0.1, 0.03, 0.1), sr, 0.045, 1);
      return norm(o, 0.34);
    })()];
  });
  section(32e3, (sr, S4) => {
    const tone = (f3, d, tau, h = 0.3) => {
      const a = S4(d);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr;
        a[i] = (Math.sin(TAU5 * f3 * t) + h * Math.sin(TAU5 * f3 * 2 * t) + h * 0.5 * Math.sin(TAU5 * f3 * 3.01 * t)) * Math.exp(-t / tau) * Math.min(1, t / 4e-3);
      }
      return a;
    };
    const brass = (f3, d) => {
      const a = S4(d);
      let p1 = 0, p2 = 0, p3 = 0;
      for (let i = 0; i < a.length; i++) {
        const t = i / sr;
        p1 += f3 / sr;
        p2 += f3 * 1.006 / sr;
        p3 += f3 * 0.5 / sr;
        const e = Math.min(1, t / 0.06) * Math.min(1, (d - t) / 0.5);
        a[i] = (p1 % 1 * 2 - 1 + p2 % 1 * 2 - 1 + 0.8 * Math.sin(TAU5 * p3)) * e;
      }
      return biquad(biquad(a, sr, "lp", 900 + f3 * 2, 0.9), sr, "hp", 60);
    };
    const loopify = (a, xf2 = 0.5) => {
      const n = a.length, x = Math.round(xf2 * sr), out = new Float32Array(n - x);
      for (let i = 0; i < out.length; i++) out[i] = a[i + x];
      for (let i = 0; i < x; i++) {
        const k = i / x;
        out[out.length - x + i] = out[out.length - x + i] * (1 - k) + a[i] * k;
      }
      return out;
    };
    const tail = (o) => {
      const d = o.d, L = S4(d), R4 = S4(d), bark = () => nb(sr, r, 0.14, o.bark, { hp: 150, lp: 2e3 * o.bright, att: 15e-4 });
      o.slaps.forEach(([t, g2, pan], i) => {
        const e = biquad(bark(), sr, "lp", Math.max(500, o.lp0 * Math.pow(0.72, i))), jt = t * (0.96 + r() * 0.08);
        mix3(L, e, sr, jt + (pan > 0 ? 6e-4 * pan : 0), g2 * Math.sqrt(0.5 - 0.5 * pan));
        mix3(R4, e, sr, jt + (pan < 0 ? -6e-4 * pan : 0), g2 * Math.sqrt(0.5 + 0.5 * pan));
      });
      for (const ch of [L, R4]) {
        const n = fallLP(noise(sr, d, r), sr, o.wash0, 320, o.washT * 0.8);
        biquad(n, sr, "hp", 110);
        const ph = ch === L ? 0 : 1.7;
        for (let i = 0; i < n.length; i++) {
          const t = i / sr;
          n[i] *= Math.min(1, t / 0.035) * Math.exp(-t / o.washT) * (0.8 + 0.2 * Math.sin(t * 19 + ph));
        }
        mix3(ch, norm(n, 1), sr, 0.018, o.wash);
      }
      {
        const n = biquad(brown(sr, d, r), sr, "lp", 105), m = biquad(brown(sr, d, r), sr, "lp", 140);
        for (let i = 0; i < n.length; i++) {
          const t = i / sr, e = Math.min(1, t / 0.05) * Math.exp(-t / o.rumT);
          n[i] *= e;
          m[i] *= e;
        }
        norm(n, 1);
        norm(m, 1);
        mix3(L, n, sr, 0.01, o.rum);
        mix3(R4, n, sr, 0.01, o.rum);
        mix3(L, m, sr, 0.03, o.rum * 0.3);
        mix3(R4, m, sr, 0.03, -o.rum * 0.3);
      }
      for (let i = 0; i < 3; i++) {
        const e = biquad(bark(), sr, "lp", 520), t = o.far + i * 0.11 + r() * 0.05, p = r() * 2 - 1, g2 = o.farG * (1 - i * 0.28);
        mix3(L, e, sr, t, g2 * Math.sqrt(0.5 - 0.5 * p));
        mix3(R4, e, sr, t + 4e-3, g2 * Math.sqrt(0.5 + 0.5 * p));
      }
      biquad(L, sr, "hp", 32);
      biquad(R4, sr, "hp", 32);
      const k = o.level / (Math.max(peak(L), peak(R4)) || 1);
      for (let i = 0; i < L.length; i++) {
        L[i] *= k;
        R4[i] *= k;
      }
      fadeEnds(L, sr, 2e-3, 0.25);
      fadeEnds(R4, sr, 2e-3, 0.25);
      return { l: L, r: R4 };
    };
    B2.rifleTail = [0, 1, 2].map((v) => tail({
      d: 1.9,
      bark: 0.03,
      bright: 1,
      lp0: 2600,
      wash0: 4500,
      washT: 0.4,
      wash: 0.5,
      rumT: 0.55,
      rum: 0.55,
      far: 0.56 + v * 0.05,
      farG: 0.16,
      level: 0.7,
      slaps: [[0.041, 0.8, -0.8], [0.052, 0.72, 0.8], [0.097 + v * 4e-3, 0.5, 0.5], [0.118, 0.46, -0.5], [0.171 + v * 6e-3, 0.34, 0.7], [0.203, 0.3, -0.7], [0.262, 0.22, 0.3], [0.31 + v * 0.01, 0.17, -0.3], [0.39, 0.12, 0.1]]
    }));
    B2.pistolTail = [0, 1].map((v) => tail({
      d: 1.25,
      bark: 0.016,
      bright: 1.7,
      lp0: 3600,
      wash0: 6e3,
      washT: 0.26,
      wash: 0.42,
      rumT: 0.3,
      rum: 0.25,
      far: 0.5 + v * 0.06,
      farG: 0.1,
      level: 0.55,
      slaps: [[0.041, 0.8, -0.8], [0.052, 0.7, 0.8], [0.099, 0.45, 0.5], [0.12 + v * 5e-3, 0.4, -0.5], [0.175, 0.26, 0.6], [0.21, 0.2, -0.6], [0.3, 0.1, 0.2]]
    }));
    const F_AH = [[620, 5, 1], [1150, 6, 0.6], [2500, 7, 0.25]], F_OH = [[430, 5, 1], [820, 6, 0.6], [2400, 7, 0.15]], F_EH = [[520, 5, 1], [1750, 7, 0.5], [2600, 7, 0.25]], F_UH = [[330, 4, 1], [650, 5, 0.5], [2200, 7, 0.1]];
    B2.groan = [0, 1, 2, 3, 4].map((v) => {
      const d = 1.1 + r() * 1.1, f0 = 78 + v * 9, bend = r() * 0.5 - 0.25, fm = [F_OH, F_UH, F_AH, F_OH, F_EH][v];
      return voice(sr, d, r, (t) => f0 * (1 + bend * (t / d) + 0.05 * Math.sin(t * (9 + v))) * (0.9 + 0.2 * Math.sin(t / d * Math.PI)), fm, { rough: 0.9, breath: 0.5, drive: 2.2, env: (t, s) => Math.min(1, t / 0.18) * Math.min(1, (s - t) / 0.3) * (0.75 + 0.25 * Math.sin(t * 13)) });
    });
    B2.snarl = [0, 1, 2].map((v) => {
      const d = 0.55 + r() * 0.25, f0 = 120 + v * 22;
      return voice(sr, d, r, (t) => f0 * (1 + 0.9 * Math.exp(-t * 7)) * (1 + 0.08 * Math.sin(t * 70)), F_AH, { rough: 1, breath: 0.7, drive: 3.4, env: (t, s) => Math.min(1, t / 0.03) * Math.pow(Math.max(0, 1 - t / s), 0.7) });
    });
    B2.hurt = [0, 1, 2].map((v) => {
      const d = 0.32 + r() * 0.12, f0 = 150 + v * 30;
      return voice(sr, d, r, (t) => f0 * (1.25 - 0.5 * t / d), F_EH, { rough: 0.8, breath: 0.6, drive: 2.6, env: (t, s) => Math.min(1, t / 0.015) * Math.max(0, 1 - t / s) });
    });
    B2.death = [0, 1, 2].map((v) => {
      const d = 1.3 + r() * 0.5, f0 = 105 + v * 14;
      const a = voice(sr, d, r, (t) => f0 * (1 - 0.55 * t / d) * (1 + 0.1 * Math.sin(t * 24)), F_UH, { rough: 1, breath: 0.8, drive: 2.4, env: (t, s) => Math.min(1, t / 0.04) * Math.pow(Math.max(0, 1 - t / s), 1.2) });
      const g2 = env(biquad(noise(sr, d, r), sr, "bp", 320, 2), sr, 0.4, 0.2);
      for (let i = 0; i < a.length; i++) a[i] += g2[i] * 0.4 * (0.5 + 0.5 * Math.sin(i / sr * 55));
      return norm(a, 0.9);
    });
    B2.bodyfall = [0, 1].map((v) => {
      const o = S4(0.5);
      mix3(o, sweep2(sr, 0.2, 95 - v * 10, 38, 0.04, 0.07, 4e-3), sr, 0, 1);
      mix3(o, nb(sr, r, 0.16, 0.04, { lp: 700, att: 4e-3 }), sr, 0, 0.9);
      mix3(o, nb(sr, r, 0.2, 0.05, { hp: 2e3, att: 0.02 }), sr, 0.03, 0.2);
      mix3(o, nb(sr, r, 0.1, 0.03, { lp: 500 }), sr, 0.16, 0.4);
      return norm(o, 0.85);
    });
    B2.playerHurt = [0, 1].map((v) => {
      const o = S4(0.4);
      mix3(o, sweep2(sr, 0.14, 110, 45, 0.03, 0.05, 2e-3), sr, 0, 1);
      mix3(o, nb(sr, r, 0.08, 0.02, { lp: 1200 }), sr, 0, 0.8);
      mix3(o, voice(sr, 0.3, r, (t) => (140 + v * 20) * (1.1 - 0.5 * t / 0.3), F_UH, { rough: 0.4, breath: 0.6, drive: 1.5, env: (t, s) => Math.min(1, t / 0.02) * Math.max(0, 1 - t / s) }), sr, 0.03, 0.5);
      return norm(o, 0.9);
    });
    B2.heart = [(() => {
      const o = S4(0.9);
      mix3(o, sweep2(sr, 0.12, 72, 38, 0.03, 0.05, 4e-3), sr, 0, 1);
      mix3(o, sweep2(sr, 0.12, 60, 34, 0.03, 0.045, 4e-3), sr, 0.26, 0.7);
      return norm(biquad(o, sr, "lp", 160), 0.9);
    })()];
    B2.waveStart = [(() => {
      const o = S4(2.6);
      mix3(o, brass(73.4, 2.4), sr, 0, 1);
      mix3(o, brass(110, 2.2), sr, 0.02, 0.7);
      mix3(o, brass(87.3, 1.6), sr, 0.9, 0.6);
      mix3(o, nb(sr, r, 1.2, 0.5, { lp: 300, att: 0.3 }), sr, 0, 0.5);
      return norm(biquad(drive(o, 1.4), sr, "hp", 45), 0.55);
    })()];
    B2.waveClear = [(() => {
      const o = S4(2.4);
      for (const [f3, t] of [[146.8, 0], [220, 0.16], [293.7, 0.32], [349.2, 0.48]]) mix3(o, tone(f3, 1.8, 0.5, 0.4), sr, t, 0.6);
      return norm(biquad(o, sr, "lp", 2400), 0.5);
    })()];
    B2.dead = [(() => {
      const o = S4(3.2);
      mix3(o, brass(55, 3), sr, 0, 1);
      mix3(o, brass(58.3, 3), sr, 0, 0.8);
      mix3(o, sweep2(sr, 1.2, 90, 30, 0.4, 0.5, 0.01), sr, 0, 0.9);
      return norm(biquad(drive(o, 1.5), sr, "hp", 40), 0.6);
    })()];
    B2.rainLoop = (() => {
      const d = 7, a = noise(sr, d, r);
      biquad(a, sr, "hp", 900);
      biquad(a, sr, "lp", 9e3);
      const b = biquad(biquad(noise(sr, d, r), sr, "bp", 2600, 0.5), sr, "hp", 1200), c = brown(sr, d, r);
      biquad(c, sr, "lp", 420);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr;
        a[i] = a[i] * 0.3 * (0.85 + 0.15 * Math.sin(t * 0.9)) + b[i] * 0.5 * (0.8 + 0.2 * Math.sin(t * 0.37 + 1)) + c[i] * 0.35;
      }
      for (let k = 0; k < 160; k++) mix3(a, nb(sr, r, 0.03, 4e-3 + r() * 6e-3, { bp: 1500 + r() * 5e3, q: 4 }), sr, r() * (d - 0.1), 0.05 + r() * 0.12);
      return norm(loopify(a), 0.5);
    })();
    B2.siren = [(() => {
      const d = 9, a = S4(d);
      let ph = 0;
      for (let i = 0; i < a.length; i++) {
        const t = i / sr, f3 = 560 + 250 * Math.sin(TAU5 * 0.33 * t);
        ph += TAU5 * f3 / sr;
        a[i] = (Math.sin(ph) + 0.3 * Math.sin(ph * 2) + 0.15 * Math.sin(ph * 3)) * Math.min(1, t / 2) * Math.min(1, (d - t) / 3);
      }
      return norm(biquad(a, sr, "lp", 1100), 0.4);
    })()];
    B2.thunder = [0, 1].map((v) => {
      const d = 5.5, a = brown(sr, d, r);
      biquad(a, sr, "lp", 160 + v * 60);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr;
        a[i] *= Math.min(1, t / 0.08) * Math.exp(-t / 1.6) * (0.6 + 0.4 * Math.sin(t * 9 + v) * Math.sin(t * 3.1));
      }
      mix3(a, nb(sr, r, 0.5, 0.12, { lp: 900, att: 0.01 }), sr, 0, 0.5);
      return norm(a, 0.9);
    });
    B2.pulse = [36.7, 34.6].map((f3) => norm(mix3(mix3(S4(0.5), sweep2(sr, 0.4, f3 * 3.2, f3, 0.03, 0.14, 3e-3), sr, 0, 1), nb(sr, r, 0.03, 5e-3, { lp: 900 }), sr, 0, 0.3), 0.9));
    B2.tick = [norm(nb(sr, r, 0.05, 8e-3, { hp: 6e3 }), 0.25), norm(nb(sr, r, 0.09, 0.02, { bp: 3200, q: 2 }), 0.3)];
    B2.bell = [62, 65, 69, 72, 74, 77].map((m) => {
      const f3 = 440 * Math.pow(2, (m - 69) / 12), a = S4(2.2);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr, mod = Math.sin(TAU5 * f3 * 2.76 * t) * 2.2 * Math.exp(-t / 0.25);
        a[i] = Math.sin(TAU5 * f3 * t + mod) * Math.exp(-t / 0.7) * Math.min(1, t / 3e-3);
      }
      return norm(a, 0.4);
    });
    B2.stab = [(() => {
      const o = S4(2);
      mix3(o, brass(73.4, 1.8), sr, 0, 1);
      mix3(o, brass(77.8, 1.8), sr, 0, 0.8);
      return norm(biquad(drive(o, 2), sr, "hp", 45), 0.5);
    })()];
  });
  section(22050, (sr, S4) => {
    const loopify = (a, xf2 = 0.5) => {
      const n = a.length, x = Math.round(xf2 * sr), out = new Float32Array(n - x);
      for (let i = 0; i < out.length; i++) out[i] = a[i + x];
      for (let i = 0; i < x; i++) {
        const k = i / x;
        out[out.length - x + i] = out[out.length - x + i] * (1 - k) + a[i] * k;
      }
      return out;
    };
    B2.cityLoop = (() => {
      const d = 9, a = brown(sr, d, r);
      biquad(a, sr, "lp", 220);
      biquad(a, sr, "hp", 35);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr;
        a[i] *= 0.7 + 0.3 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1);
        a[i] += 0.05 * Math.sin(TAU5 * 49.5 * t) * (0.6 + 0.4 * Math.sin(t * 0.5));
      }
      return norm(loopify(a, 1), 0.5);
    })();
    B2.genLoop = (() => {
      const d = 2, a = S4(d);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr, ph = TAU5 * 46 * t;
        a[i] = Math.sin(ph) * 0.6 + Math.sin(ph * 2) * 0.5 + Math.sin(ph * 3 + 0.4) * 0.3 + Math.sin(ph * 5.02) * 0.14 + Math.sin(ph * 0.5) * 0.3;
        a[i] *= 0.8 + 0.2 * Math.sin(TAU5 * 23 * t);
      }
      const n = biquad(noise(sr, d, r), sr, "bp", 1900, 1.2);
      for (let i = 0; i < a.length; i++) a[i] += n[i] * 0.22 * (0.6 + 0.4 * Math.sin(TAU5 * 46 * i / sr));
      return norm(biquad(drive(biquad(a, sr, "lp", 2600), 1.5), sr, "hp", 40), 0.5);
    })();
    B2.fireLoop = (() => {
      const d = 4, a = brown(sr, d, r);
      biquad(a, sr, "bp", 500, 0.5);
      for (let i = 0; i < a.length; i++) a[i] *= 0.5 + 0.5 * Math.sin(i / sr * 5) * Math.sin(i / sr * 1.7);
      for (let k = 0; k < 70; k++) mix3(a, nb(sr, r, 0.012, 2e-3, { hp: 1500 + r() * 3e3 }), sr, r() * (d - 0.05), 0.2 + r() * 0.5);
      return norm(loopify(a, 0.4), 0.5);
    })();
    B2.buzzLoop = (() => {
      const d = 1, a = S4(d);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr, p = t * 100 % 1;
        a[i] = ((p < 0.5 ? 1 : -1) * 0.5 + Math.sin(TAU5 * 100 * t) * 0.6) * (0.8 + 0.2 * Math.sin(TAU5 * 7 * t));
      }
      return norm(biquad(biquad(a, sr, "bp", 2900, 0.8), sr, "hp", 300), 0.3);
    })();
    B2.droneLoop = (() => {
      const d = 4, a = S4(d), q = (f3) => Math.round(f3 * d) / d, air = biquad(biquad(noise(sr, d, r), sr, "hp", 500), sr, "lp", 4200);
      for (const [f0, g2] of [[148, 1], [151.5, 0.9], [155.25, 0.85], [143.75, 0.95]]) {
        const f3 = q(f0), w = q(0.25 + r() * 0.75), wp = r() * TAU5, p0 = r() * TAU5;
        for (let i = 0; i < a.length; i++) {
          const t = i / sr, ph = TAU5 * f3 * t + 1.3 * Math.sin(TAU5 * w * t + wp) + p0;
          let v = 0;
          for (let h = 1; h <= 12; h++) v += Math.sin(ph * h + h * h * 0.7) / Math.pow(h, 0.85);
          a[i] += v * g2 * 0.25 + air[i] * 0.09 * g2 * (0.5 + 0.5 * Math.sin(ph));
        }
      }
      for (const [f0, g2] of [[2960, 0.03], [3416, 0.022], [5120, 0.012]]) {
        const f3 = q(f0);
        for (let i = 0; i < a.length; i++) a[i] += Math.sin(TAU5 * f3 * i / sr) * g2 * (0.7 + 0.3 * Math.sin(TAU5 * q(1.25) * i / sr));
      }
      return norm(biquad(drive(a, 1.2), sr, "hp", 90), 0.5);
    })();
    const padChord = (notes, d) => {
      const a = S4(d);
      for (const m of notes) {
        const f3 = 440 * Math.pow(2, (m - 69) / 12);
        for (const det of [-4e-3, 3e-3, 0]) {
          let ph = r();
          const ff = f3 * (1 + det);
          for (let i = 0; i < a.length; i++) {
            ph += ff / sr;
            const p = ph % 1;
            a[i] += ((p * 2 - 1) * 0.6 + Math.sin(TAU5 * p) * 0.5) * 0.12;
          }
        }
      }
      biquad(a, sr, "lp", 620, 0.8);
      biquad(a, sr, "hp", 70);
      for (let i = 0; i < a.length; i++) {
        const t = i / sr;
        a[i] *= Math.min(1, t / 1.6) * Math.min(1, (d - t) / 2.2) * (0.8 + 0.2 * Math.sin(t * 1.3));
      }
      return norm(a, 0.5);
    };
    B2.pads = [[38, 50, 57, 65], [34, 46, 53, 62], [31, 43, 50, 58], [33, 45, 52, 61]].map((n) => padChord(n, 9));
  });
  return { B: B2, SR };
}
var NEAR2 = { bus: "near", max: 3, steal: 1 };
var WORLD = { bus: "world", max: 5 };
var UI = { bus: "ui", max: 3, steal: 1 };
var CUE = { bus: "music", max: 2, steal: 1 };
var RULE = {
  rifle: { bus: "near", max: 5, steal: 1 },
  pistol: { bus: "near", max: 4, steal: 1 },
  rifleTail: { bus: "world", max: 4, steal: 1 },
  pistolTail: { bus: "world", max: 3, steal: 1 },
  dry: NEAR2,
  pDry: NEAR2,
  lowMag: NEAR2,
  rlStart: NEAR2,
  magOut: NEAR2,
  magGrab: NEAR2,
  magIn: NEAR2,
  boltBack: NEAR2,
  boltFwd: NEAR2,
  pMagOut: NEAR2,
  pMagIn: NEAR2,
  slide: NEAR2,
  cloth: NEAR2,
  step: NEAR2,
  stepWet: NEAR2,
  skid: NEAR2,
  uiTick: UI,
  uiStep: { bus: "ui", max: 2, gap: 0.03 },
  uiOk: UI,
  uiBack: UI,
  uavPing: { bus: "ui", max: 1, gap: 0.4 },
  uavCall: CUE,
  uavRelease: { bus: "world", max: 1 },
  magDrop: { bus: "world", max: 3, steal: 1 },
  pMagDrop: { bus: "world", max: 3, steal: 1 },
  casing: { bus: "world", max: 6, gap: 0.03 },
  hitConcrete: { bus: "world", max: 5, gap: 0.02 },
  hitMetal: { bus: "world", max: 5, gap: 0.02 },
  hitWood: { bus: "world", max: 4, gap: 0.02 },
  hitGlass: { bus: "world", max: 3, gap: 0.05 },
  hitFlesh: { bus: "world", max: 5, gap: 0.015 },
  headshot: { bus: "world", max: 3 },
  ricochet: { bus: "world", max: 2, gap: 0.15 },
  groan: { bus: "world", max: 4, gap: 0.25 },
  snarl: { bus: "world", max: 3, gap: 0.1 },
  hurt: { bus: "world", max: 3, gap: 0.08 },
  death: { bus: "world", max: 4 },
  zstep: { bus: "world", max: 6, gap: 0.04 },
  bodyfall: { bus: "world", max: 3 },
  playerHurt: { bus: "ui", max: 2, gap: 0.15 },
  pickAmmo: UI,
  pickMed: UI,
  hitmark: { bus: "ui", max: 3, gap: 0.03 },
  killmark: UI,
  waveStart: CUE,
  waveClear: CUE,
  dead: CUE,
  thunder: { bus: "amb", max: 2 },
  siren: { bus: "amb", max: 1 }
};
function createAudio(G4) {
  const A = { ready: false, muted: false, intensity: 0, stats: {}, played: {}, missing: {}, dropped: 0, stolen: 0, muffled: 0, vol: { master: 0.8, sfx: 1, music: 0.55, amb: 0.7 }, occluded: null, onThunder: null };
  let ctx = null, bank = null, raw = null, master, comp, pre, sfxSum, muffle, duckA, duckM, verb, hidden = false, held = false, lastTail = -9, statT = 0;
  const bus2 = {}, loops = {}, live = {}, lastT = {}, lastV = {}, lis = [0, 1.6, 0], r = Math.random;
  const AC = window.AudioContext || window.webkitAudioContext;
  A.prepare = () => {
    if (raw || bank) return A;
    const t0 = performance.now();
    raw = synthBank();
    A.stats.synthMs = Math.round(performance.now() - t0);
    return A;
  };
  A.init = () => {
    if (ctx || !AC) return A;
    if (!raw) A.prepare();
    const t0 = performance.now();
    ctx = new AC({ latencyHint: "interactive" });
    const sr = ctx.sampleRate;
    bank = {};
    let n = 0, sec = 0, bad = 0, stereo = 0;
    const fin = (a) => {
      for (let i = 0; i < a.length; i += 61) if (!Number.isFinite(a[i])) {
        bad++;
        a.fill(0);
        return;
      }
    };
    const toBuf = (e, rate) => {
      const st = !(e instanceof Float32Array), l = st ? e.l : e;
      fin(l);
      if (st) {
        fin(e.r);
        stereo++;
      }
      const b = ctx.createBuffer(st ? 2 : 1, l.length, rate);
      b.copyToChannel(l, 0);
      if (st) b.copyToChannel(e.r, 1);
      n++;
      sec += l.length / rate;
      return b;
    };
    for (const k in raw.B) {
      const e = raw.B[k];
      bank[k] = (Array.isArray(e) ? e : [e]).map((x) => toBuf(x, raw.SR[k]));
    }
    raw = null;
    const gain = (v, to) => {
      const g2 = ctx.createGain();
      g2.gain.value = v;
      if (to) g2.connect(to);
      return g2;
    };
    master = gain(A.vol.master, ctx.destination);
    const shaper = ctx.createWaveShaper();
    {
      const N = 1024, c = new Float32Array(N), k = 1.5, m = Math.tanh(k);
      for (let i = 0; i < N; i++) c[i] = Math.tanh((i / (N - 1) * 2 - 1) * k) / m;
      shaper.curve = c;
      shaper.oversample = "2x";
    }
    shaper.connect(master);
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -15;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 4e-3;
    comp.release.value = 0.18;
    comp.connect(shaper);
    pre = gain(0.62, comp);
    muffle = ctx.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = 2e4;
    muffle.Q.value = 0.5;
    muffle.connect(pre);
    sfxSum = gain(A.vol.sfx, muffle);
    bus2.near = gain(1, sfxSum);
    bus2.world = gain(1, sfxSum);
    bus2.ui = gain(0.9, pre);
    duckA = gain(1, sfxSum);
    bus2.amb = gain(A.vol.amb, duckA);
    duckM = gain(1, pre);
    bus2.music = gain(A.vol.music, duckM);
    const len = Math.round(sr * 1.7), ir = ctx.createBuffer(2, len, sr), rr = rng2(4242);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        d[i] = (rr() * 2 - 1) * Math.pow(1 - t / 1.7, 2.4) * Math.exp(-t * 2.2) * 0.5;
      }
      for (const [t, g2] of [[0.052, 0.7], [0.071, 0.55], [0.118, 0.4], [0.163, 0.3], [0.21, 0.2]]) d[Math.round((t + ch * 4e-3) * sr)] += g2;
      let y = 0;
      for (let i = 0; i < len; i++) {
        y += (d[i] - y) * 0.32;
        d[i] = y;
      }
    }
    verb = ctx.createConvolver();
    verb.buffer = ir;
    verb.connect(gain(0.5, bus2.world));
    A.ready = true;
    Object.assign(A.stats, { buffers: n, stereo, seconds: +sec.toFixed(1), nonFinite: bad, wrapMs: Math.round(performance.now() - t0), sampleRate: sr, state: ctx.state, voices: 0 });
    document.addEventListener("visibilitychange", () => {
      hidden = document.hidden;
      sync();
    });
    startLoops();
    return A;
  };
  const sync = () => {
    if (!ctx) return;
    if (hidden || held) {
      if (ctx.state === "running") ctx.suspend();
    } else if (ctx.state !== "running") ctx.resume();
  };
  A.resume = () => {
    held = false;
    sync();
  };
  A.suspend = () => {
    held = true;
    sync();
  };
  A.ctxState = () => ctx ? ctx.state : "none";
  const pick = (name) => {
    const a = bank[name];
    if (!a) return null;
    let i = Math.floor(r() * a.length) % a.length;
    if (a.length > 1 && i === lastV[name]) i = (i + 1 + Math.floor(r() * (a.length - 1))) % a.length;
    lastV[name] = i;
    return a[i];
  };
  A.play = (name, o = {}) => {
    if (!A.ready) return null;
    A.played[name] = (A.played[name] || 0) + 1;
    if (A.muted || held) return null;
    const b = pick(name);
    if (!b) {
      A.missing[name] = (A.missing[name] || 0) + 1;
      return null;
    }
    const now2 = ctx.currentTime, R4 = RULE[name] || WORLD, L = live[name] || (live[name] = []);
    if (R4.gap && now2 - (lastT[name] ?? -9) < R4.gap) {
      A.dropped++;
      return null;
    }
    if (L.length >= R4.max) {
      if (!R4.steal) {
        A.dropped++;
        return null;
      }
      const v = L.shift();
      A.stolen++;
      try {
        v.g.gain.setTargetAtTime(0, now2, 0.012);
        v.s.stop(now2 + 0.07);
      } catch {
      }
    }
    lastT[name] = now2;
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = (o.rate || 1) * (1 + (o.jit ?? 0.04) * (r() * 2 - 1));
    const g2 = ctx.createGain(), nodes = [g2];
    s.connect(g2);
    let out = g2, vol = o.vol ?? 1, send = o.verb || 0;
    if (o.pos) {
      const d = Math.hypot(o.pos[0] - lis[0], o.pos[1] - lis[1], o.pos[2] - lis[2]);
      let cut = d > 5 ? Math.max(1100, 17e3 * Math.exp(-(d - 5) / 16)) : 0;
      if (o.occl && A.occluded && d > 2.5 && A.occluded(o.pos)) {
        cut = Math.min(cut || 2e4, 760);
        vol *= 0.62;
        send = Math.min(1, send * 1.6 + 0.1);
        A.muffled++;
      }
      if (cut) {
        const f3 = ctx.createBiquadFilter();
        f3.type = "lowpass";
        f3.frequency.value = cut;
        f3.Q.value = 0.6;
        out.connect(f3);
        out = f3;
        nodes.push(f3);
      }
      const p = ctx.createPanner();
      p.panningModel = "equalpower";
      p.distanceModel = "inverse";
      p.refDistance = o.ref || 3;
      p.rolloffFactor = o.roll || 1.1;
      p.maxDistance = 80;
      p.positionX.value = o.pos[0];
      p.positionY.value = o.pos[1];
      p.positionZ.value = o.pos[2];
      out.connect(p);
      out = p;
      nodes.push(p);
    }
    g2.gain.value = vol;
    out.connect(bus2[o.bus || R4.bus] || bus2.world);
    if (send) {
      const v = ctx.createGain();
      v.gain.value = send;
      out.connect(v);
      v.connect(verb);
      nodes.push(v);
    }
    const rec = { s, g: g2 };
    L.push(rec);
    s.onended = () => {
      const i = L.indexOf(rec);
      if (i >= 0) L.splice(i, 1);
      for (const nd of nodes) {
        try {
          nd.disconnect();
        } catch {
        }
      }
    };
    s.start(o.when || now2);
    return rec;
  };
  const duck = (depth, rel) => {
    const now2 = ctx.currentTime;
    for (const [g2, d] of [[duckA, depth], [duckM, 1 - (1 - depth) * 0.7]]) {
      g2.gain.cancelScheduledValues(now2);
      g2.gain.setTargetAtTime(d, now2, 6e-3);
      g2.gain.setTargetAtTime(1, now2 + 0.08, rel);
    }
  };
  A.shot = (name, o = {}) => {
    if (!A.ready) return;
    const now2 = ctx.currentTime, tn = name + "Tail";
    A.play(name, { vol: o.vol ?? 0.9, jit: 0.025 });
    if (bank[tn] && now2 - lastTail > 0.24) {
      lastTail = now2;
      for (const v of live[tn] || []) v.g.gain.setTargetAtTime(v.g.gain.value * 0.5, now2, 0.06);
      A.play(tn, { vol: o.tail ?? 0.6, jit: 0.03, verb: 0.2 });
    }
    if (o.low > 0) A.play("lowMag", { vol: 0.25 + 0.5 * o.low, jit: 0.02, rate: 1 - 0.12 * o.low });
    if (!A.muted && !held) duck(0.5, 0.3);
  };
  function loop(name, to, vol, pos, ref = 4) {
    const s = ctx.createBufferSource();
    s.buffer = bank[name][0];
    s.loop = true;
    const g2 = ctx.createGain();
    g2.gain.value = vol;
    s.connect(g2);
    let out = g2;
    if (pos) {
      const p = ctx.createPanner();
      p.panningModel = "equalpower";
      p.distanceModel = "inverse";
      p.refDistance = ref;
      p.rolloffFactor = 1.6;
      p.positionX.value = pos[0];
      p.positionY.value = pos[1];
      p.positionZ.value = pos[2];
      g2.connect(p);
      out = p;
    }
    out.connect(to);
    s.start();
    return { s, g: g2, p: pos ? out : null };
  }
  const movers = {};
  A.track = (name, pos, vol = 1, rate = 1, ref = 5) => {
    if (!A.ready || !bank[name]) return;
    const m = movers[name] || (movers[name] = loop(name, bus2.world, 0, pos, ref)), now2 = ctx.currentTime;
    m.g.gain.setTargetAtTime(vol, now2, 0.08);
    m.s.playbackRate.setTargetAtTime(rate, now2, 0.08);
    if (m.p.positionX) {
      m.p.positionX.setTargetAtTime(pos[0], now2, 0.03);
      m.p.positionY.setTargetAtTime(pos[1], now2, 0.03);
      m.p.positionZ.setTargetAtTime(pos[2], now2, 0.03);
    } else m.p.setPosition(pos[0], pos[1], pos[2]);
  };
  function startLoops() {
    loops.rain = loop("rainLoop", bus2.amb, 0.55);
    loops.city = loop("cityLoop", bus2.amb, 0.5);
    loops.heart = loop("heart", bus2.ui, 0);
    const W = G4.world;
    if (W) {
      for (const k of W.keys) loop("genLoop", bus2.amb, 0.5, [k.p[0], 1, k.p[2]], 2.5);
      for (const f3 of W.fires) loop("fireLoop", bus2.amb, 0.6, f3, 1.5);
      let nbz = 0;
      for (const L of W.lights) if (nbz < 5 && L.col[1] !== L.col[0] && (L.power || 0) >= 12 && L.p[1] > 4) {
        loop("buzzLoop", bus2.amb, 0.12, L.p, 1.2);
        nbz++;
      }
    }
  }
  A.setListener = (cam) => {
    if (!A.ready) return;
    const L = ctx.listener, e = cam.matrixWorld.elements;
    lis[0] = e[12];
    lis[1] = e[13];
    lis[2] = e[14];
    if (L.positionX) {
      L.positionX.value = e[12];
      L.positionY.value = e[13];
      L.positionZ.value = e[14];
      L.forwardX.value = -e[8];
      L.forwardY.value = -e[9];
      L.forwardZ.value = -e[10];
      L.upX.value = e[4];
      L.upY.value = e[5];
      L.upZ.value = e[6];
    } else {
      L.setPosition(e[12], e[13], e[14]);
      L.setOrientation(-e[8], -e[9], -e[10], e[4], e[5], e[6]);
    }
  };
  A.listener = lis;
  let next = 0, bar = 0, beat = 0, ambT = 8;
  const at = (name, i, when, vol, rate = 1) => {
    const s = ctx.createBufferSource();
    s.buffer = bank[name][i % bank[name].length];
    s.playbackRate.value = rate;
    const g2 = ctx.createGain();
    g2.gain.value = vol;
    s.connect(g2);
    g2.connect(bus2.music);
    s.onended = () => {
      try {
        g2.disconnect();
      } catch {
      }
    };
    s.start(when);
  };
  A.update = (dt, st = {}) => {
    if (!A.ready) return;
    const now2 = ctx.currentTime, k = A.intensity = A.intensity + ((st.intensity || 0) - A.intensity) * Math.min(1, dt * 0.7), lo = st.lowHp || 0;
    master.gain.value = A.muted ? 0 : A.vol.master;
    sfxSum.gain.value = A.vol.sfx;
    bus2.amb.gain.value = A.vol.amb;
    bus2.music.gain.value = A.vol.music;
    muffle.frequency.setTargetAtTime(st.dead ? 420 : 2e4 * Math.pow(0.045, lo * lo), now2, 0.15);
    loops.heart.g.gain.setTargetAtTime(lo ? 0.9 * lo : 0, now2, 0.1);
    loops.heart.s.playbackRate.value = 1 + 0.5 * lo;
    statT -= dt;
    if (statT <= 0) {
      statT = 0.5;
      let nv = 0;
      for (const q in live) nv += live[q].length;
      A.stats.voices = nv;
      A.stats.state = ctx.state;
      A.stats.dropped = A.dropped;
      A.stats.stolen = A.stolen;
      A.stats.muffled = A.muffled;
      A.stats.missing = Object.keys(A.missing).join(",") || "none";
    }
    if (st.music === false || held || ctx.state !== "running") {
      next = now2 + 0.2;
      return;
    }
    const bpm = 76 + 44 * k, spb = 60 / bpm;
    if (next < now2) next = now2 + 0.05;
    while (next < now2 + 0.35) {
      if (beat === 0) {
        if (bar % 4 === 0) at("pads", bar / 4 | 0, next, 0.75 - 0.2 * k);
        if (k > 0.75 && bar % 8 === 7) at("stab", 0, next + spb * 2, 0.35);
      }
      if (k > 0.12 && (beat === 0 || k > 0.5 && beat === 2 || k > 0.8 && beat === 3 && bar % 2)) at("pulse", bar % 4 < 2 ? 0 : 1, next, 0.35 + 0.4 * k);
      if (k > 0.4) {
        at("tick", 0, next + spb * 0.5, 0.2 + 0.25 * k);
        if (k > 0.65) at("tick", 1, next + spb * 0.75, 0.2 * k);
      }
      if (k < 0.85 && r() < 0.16 + 0.2 * (1 - k)) at("bell", Math.floor(r() * 6), next + spb * (r() < 0.5 ? 0 : 0.5), 0.2 + 0.15 * r());
      next += spb;
      beat = (beat + 1) % 4;
      if (beat === 0) bar++;
    }
    ambT -= dt;
    if (ambT < 0) {
      ambT = 14 + r() * 22;
      const a = r() * 6.28, d = 60 + r() * 40;
      if (r() < 0.45) {
        A.play("thunder", { pos: [lis[0] + Math.cos(a) * d, 30, lis[2] + Math.sin(a) * d], ref: 40, vol: 0.9, jit: 0.15 });
        if (A.onThunder) A.onThunder();
      } else A.play("siren", { pos: [lis[0] + Math.cos(a) * d, 4, lis[2] + Math.sin(a) * d], ref: 22, vol: 0.5, verb: 0.5, jit: 0.1 });
    }
  };
  A.toggleMute = () => {
    A.muted = !A.muted;
    return A.muted;
  };
  A.names = () => bank ? Object.keys(bank) : raw ? Object.keys(raw.B) : [];
  return A;
}

