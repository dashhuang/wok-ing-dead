// Named combat effects built on the runtime in core.js. Everything takes world-space vectors.
import * as THREE from "three";
import { C, P, rand, srand, randDir, coneDir, jagged } from "./core.js";
import { FONT_KAI } from "../kit/index.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const _a = V(),
  _b = V(),
  _c = V(),
  _d = V();

// palette per element: [hot core, body, dying] in linear HDR
export const PAL = {
  none: {
    core: [3.0, 1.9, 0.6],
    body: [2.2, 0.8, 0.08],
    end: [0.7, 0.08, 0.0],
    light: 0xffb060,
    spark: [4.5, 2.2, 0.4],
  },
  // fire is given in linear values: ACES bleaches anything with much blue in it straight to white
  fire: {
    core: [2.5, 1.0, 0.1],
    body: [1.9, 0.48, 0.03],
    end: [0.6, 0.05, 0.0],
    light: 0xff7a22,
    spark: [4.5, 1.6, 0.2],
  },
  shock: {
    core: [2.2, 3.2, 4.0],
    body: [0.35, 1.6, 2.8],
    end: [0.05, 0.25, 1.2],
    light: 0x6fd8ff,
    spark: [1.6, 3.2, 4.5],
  },
  venom: {
    core: C(0xeaffc0, 3.0),
    body: C(0x8dff4a, 2.0),
    end: C(0x2a8a1a, 0.6),
    light: 0x8dff4a,
    spark: C(0xb0ff70, 3.5),
  },
  seal: {
    core: [3.4, 2.5, 0.8],
    body: [2.4, 1.3, 0.12],
    end: [0.8, 0.14, 0.01],
    light: 0xffc23a,
    spark: [4.5, 2.8, 0.5],
  },
  blue: {
    core: [1.4, 2.4, 3.6],
    body: [0.2, 0.8, 2.8],
    end: [0.03, 0.1, 1.0],
    light: 0x4a9cff,
    spark: [1.2, 2.4, 4.5],
  },
};

export function createEffects(fx, stage) {
  const texCache = new Map();
  function glyphTex(text, { ring = false } = {}) {
    const key = text + (ring ? ":ring" : "");
    if (texCache.has(key)) return texCache.get(key);
    const S = 512;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    g.clearRect(0, 0, S, S);
    g.fillStyle = "#fff";
    g.strokeStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (ring) {
      // ritual circle: two rings, eight trigram marks, characters round the rim
      g.lineWidth = 7;
      g.beginPath();
      g.arc(S / 2, S / 2, S * 0.46, 0, 7);
      g.stroke();
      g.lineWidth = 3;
      g.beginPath();
      g.arc(S / 2, S / 2, S * 0.36, 0, 7);
      g.stroke();
      g.beginPath();
      g.arc(S / 2, S / 2, S * 0.2, 0, 7);
      g.stroke();
      const tri = ["111", "011", "101", "001", "110", "010", "100", "000"];
      for (let i = 0; i < 8; i++) {
        g.save();
        g.translate(S / 2, S / 2);
        g.rotate((i / 8) * Math.PI * 2);
        for (let k = 0; k < 3; k++) {
          const y = -S * 0.33 + k * 13;
          if (tri[i][k] === "1") g.fillRect(-22, y, 44, 7);
          else {
            g.fillRect(-22, y, 18, 7);
            g.fillRect(4, y, 18, 7);
          }
        }
        g.restore();
      }
      const chars = [...text];
      g.font = `700 34px ${FONT_KAI}`;
      chars.forEach((ch, i) => {
        g.save();
        g.translate(S / 2, S / 2);
        g.rotate((i / chars.length) * Math.PI * 2);
        g.fillText(ch, 0, -S * 0.41);
        g.restore();
      });
      g.font = `700 150px ${FONT_KAI}`;
      g.fillText(chars[0] || "", S / 2, S / 2 + 8);
    } else {
      g.font = `700 ${text.length > 1 ? 210 : 380}px ${FONT_KAI}`;
      if (text.length > 1)
        [...text].forEach((ch, i) =>
          g.fillText(ch, S / 2, S * (0.28 + i * 0.44)),
        );
      else g.fillText(text, S / 2, S / 2 + 16);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    texCache.set(key, t);
    return t;
  }

  const E = {
    PAL,
    glyphTex,

    /** Muzzle flash. o: { scale, pal, sparks, smoke, light, long (0..1 dragon-breath length), brake } */
    muzzle(pos, dir, o = {}) {
      const s = o.scale ?? 1;
      const pal = PAL[o.pal || "none"];
      const core = pal.core;
      fx.glow({
        pos: _a.copy(pos).addScaledVector(dir, 0.03 * s),
        life: 0.045,
        size: [0.03 * s, 0.11 * s],
        color: [core, pal.body],
        alpha: 0.9,
        type: P.GLOW,
        fadePow: 1,
      });
      fx.glow({
        pos: _a.copy(pos).addScaledVector(dir, 0.05 * s),
        life: 0.04,
        size: [0.09 * s, 0.2 * s],
        color: core,
        alpha: 0.75,
        type: P.STAR,
        rot: rand(1.6),
        fadePow: 1,
      });
      const n = Math.round(5 * s + 3);
      for (let i = 0; i < n; i++) {
        coneDir(dir, 0.2 + (o.long ? 0.1 : 0), _b).multiplyScalar(
          rand(5, 13) * (1 + (o.long || 0) * 1.6),
        );
        fx.glow({
          pos: _a.copy(pos).addScaledVector(dir, rand(0.01, 0.06) * s),
          vel: _b,
          life: rand(0.03, 0.06) * (1 + (o.long || 0) * 3),
          size: [0.02 * s, rand(0.035, 0.07) * s * (1 + (o.long || 0))],
          color: [core, pal.end],
          alpha: 0.85,
          type: P.FLAME,
          stretch: 2.2,
          drag: 9,
          fadePow: 1.2,
        });
      }
      if (o.brake) {
        // side jets from a ported brake
        for (const sgn of [-1, 1]) {
          _c.crossVectors(dir, UP).normalize().multiplyScalar(sgn);
          for (let i = 0; i < 4; i++) {
            fx.glow({
              pos: _a.copy(pos).addScaledVector(dir, -0.03),
              vel: _b
                .copy(_c)
                .multiplyScalar(rand(3, 8))
                .addScaledVector(dir, rand(0.5, 2))
                .addScaledVector(UP, srand(1)),
              life: rand(0.035, 0.06),
              size: [0.015 * s, 0.05 * s],
              color: [core, pal.end],
              type: P.FLAME,
              stretch: 2.6,
              drag: 8,
            });
          }
        }
      }
      const sp = o.sparks ?? Math.round(5 * s);
      for (let i = 0; i < sp; i++) {
        coneDir(dir, 0.45, _b).multiplyScalar(rand(5, 20));
        fx.glow({
          pos,
          vel: _b,
          life: rand(0.12, 0.4),
          size: [0.005, 0.002],
          color: [pal.spark, pal.end],
          type: P.STREAK,
          stretch: 9,
          drag: 2.5,
          gravity: 6,
          fadePow: 0.7,
        });
      }
      const sm = o.smoke ?? 2;
      for (let i = 0; i < sm; i++) {
        coneDir(dir, 0.5, _b).multiplyScalar(rand(0.5, 1.8));
        _b.y += 0.25;
        fx.puff({
          pos: _a.copy(pos).addScaledVector(dir, 0.08),
          vel: _b,
          life: rand(0.7, 1.4),
          size: [0.03 * s, rand(0.12, 0.22) * s],
          color: [C(0x9a948c, 0.6), C(0x5a5650, 0.4)],
          alpha: 0.13,
          type: P.SMOKE,
          drag: 1.8,
          gravity: -0.25,
          spin: srand(1.2),
          turb: 0.6,
        });
      }
      // keep the light clear of the barrel: a point light touching glossy metal blows out
      fx.flash(
        _a
          .copy(pos)
          .addScaledVector(dir, 0.7)
          .add(_c.set(0, 0.25, 0)),
        pal.light,
        (o.light ?? 26) * s * 0.8,
        0.07,
        9,
      );
    },

    /** Bullet streak from a to b. o: { color, core, width, speed, smoke } */
    tracer(a, b, o = {}) {
      const A = a.clone(),
        B = b.clone();
      const dist = A.distanceTo(B);
      const speed = o.speed ?? 260;
      const life = Math.min(0.2, Math.max(0.045, dist / speed + 0.03));
      const len = Math.min(dist, o.len ?? 9) / dist; // streak length as a fraction of the path
      const pts = [A.clone(), A.clone()];
      fx.ribbon({
        points: pts,
        width: o.width ?? 0.022,
        color: o.color || C(0xffd9a0, 4),
        core: o.core || [6, 5.5, 4.5],
        life,
        fade: 0.35,
        update(r, age) {
          const k = Math.min(1, age / (life - 0.02));
          const head = Math.min(1, k * (1 + len));
          const tail = Math.max(0, head - len);
          r.pts[0].p.lerpVectors(A, B, tail);
          r.pts[1].p.lerpVectors(A, B, head);
        },
      });
      if (o.smoke) {
        fx.ribbon({
          points: [A, A.clone().lerp(B, 0.5), B],
          width: o.smoke,
          color: C(0xb0b4bc, 0.5),
          life: 0.9,
          kind: "smoke",
          fade: 1.2,
          alpha: 0.35,
        });
      }
    },

    /** World hit. hit: { point, normal, surface }. o: { pal, scale, decal } */
    impact(hit, o = {}) {
      fx.audio && fx.audio.world("tick", hit.point, { gain: 0.5, gap: 0.04 });
      const pal = PAL[o.pal || "none"];
      const s = o.scale ?? 1;
      const p = hit.point,
        n = hit.normal;
      fx.glow({
        pos: _a.copy(p).addScaledVector(n, 0.02),
        life: 0.07,
        size: [0.05 * s, 0.2 * s],
        color: [pal.core, pal.body],
        type: P.GLOW,
        fadePow: 1,
      });
      const k = Math.round(7 * s);
      for (let i = 0; i < k; i++) {
        coneDir(n, 1.1, _b).multiplyScalar(rand(2, 11));
        fx.glow({
          pos: p,
          vel: _b,
          life: rand(0.15, 0.5),
          size: [0.007, 0.003],
          color: [pal.spark, pal.end],
          type: P.STREAK,
          stretch: 7,
          drag: 1.6,
          gravity: 9,
          ground: true,
          fadePow: 0.8,
        });
      }
      for (let i = 0; i < 3; i++) {
        coneDir(n, 0.9, _b).multiplyScalar(rand(0.5, 2.5));
        fx.puff({
          pos: p,
          vel: _b,
          life: rand(0.5, 1.1),
          size: [0.04 * s, rand(0.18, 0.34) * s],
          color: [C(0x8a8478, 0.7), C(0x4a463e, 0.5)],
          alpha: 0.28,
          type: P.SMOKE,
          drag: 2.5,
          gravity: -0.15,
          spin: srand(1),
        });
      }
      for (let i = 0; i < Math.round(4 * s); i++) {
        coneDir(n, 1.0, _b).multiplyScalar(rand(1.5, 5));
        fx.puff({
          pos: p,
          vel: _b,
          life: rand(0.5, 1.0),
          size: rand(0.008, 0.018),
          color: C(0x6a645a, 0.8),
          alpha: 1,
          type: P.SHARD,
          gravity: 9.8,
          ground: true,
          spin: srand(14),
          fadePow: 0.4,
        });
      }
      if (o.decal !== false)
        fx.decal({
          kind: "pock",
          pos: p,
          normal: n,
          size: rand(0.07, 0.12) * s,
          life: 22,
          alpha: 0.9,
        });
      if (o.pal && o.pal !== "none")
        fx.flash(_a.copy(p).addScaledVector(n, 0.1), pal.light, 6 * s, 0.1, 5);
    },

    /** Hit on a body: blood spray along `dir` (the bullet's direction). */
    blood(pos, dir, amount = 1) {
      fx.audio && fx.audio.world("flesh", pos, { gain: 0.8, gap: 0.05 });
      const n = Math.round(9 * amount);
      for (let i = 0; i < n; i++) {
        coneDir(dir, 0.6, _b).multiplyScalar(rand(1, 6));
        _b.y += rand(0, 1.5);
        fx.puff({
          pos,
          vel: _b,
          life: rand(0.4, 0.9),
          size: [rand(0.012, 0.03), 0.008],
          color: C(0x5a0606, 0.9),
          alpha: 0.95,
          type: P.DROP,
          gravity: 9.8,
          drag: 0.8,
          ground: true,
          stretch: 0,
          fadePow: 0.5,
        });
      }
      for (let i = 0; i < 2; i++) {
        coneDir(dir, 0.5, _b).multiplyScalar(rand(0.6, 2));
        fx.puff({
          pos,
          vel: _b,
          life: rand(0.35, 0.6),
          size: [0.05, rand(0.22, 0.36) * Math.sqrt(amount)],
          color: [C(0x6a0808, 0.9), C(0x2a0404, 0.6)],
          alpha: 0.5,
          type: P.SMOKE,
          drag: 3,
          spin: srand(2),
        });
      }
      // back-spatter the other way
      for (let i = 0; i < 3; i++) {
        coneDir(_c.copy(dir).negate(), 0.7, _b).multiplyScalar(rand(0.8, 3));
        fx.puff({
          pos,
          vel: _b,
          life: rand(0.3, 0.6),
          size: rand(0.01, 0.02),
          color: C(0x5a0606, 0.9),
          alpha: 0.9,
          type: P.DROP,
          gravity: 9.8,
          ground: true,
          fadePow: 0.5,
        });
      }
      if (amount >= 1 && Math.random() < 0.6) {
        fx.after(0.25, () =>
          fx.decal({
            kind: "splat",
            pos: V(
              pos.x + dir.x * rand(0.3, 1.2),
              0,
              pos.z + dir.z * rand(0.3, 1.2),
            ),
            size: rand(0.25, 0.6),
            color: C(0x3a0404, 0.8),
            life: 18,
            alpha: 0.85,
          }),
        );
      }
    },

    /** Explosion. o: { radius, pal, smoke, shake, scorch, sparks } */
    explosion(pos, o = {}) {
      fx.audio &&
        fx.audio.world("explosion", pos, {
          size: (o.radius ?? 3) / 2.5,
          gap: 0.05,
          gain: 1.1,
        });
      const r = o.radius ?? 3;
      const pal = PAL[o.pal || "fire"];
      const p = pos.clone();
      p.y = Math.max(p.y, 0.15);
      fx.flash(V(p.x, p.y + 0.6, p.z), pal.light, 70 * r, 0.22, 10 + r * 4);
      fx.glow({
        pos: p,
        life: 0.14,
        size: [r * 0.3, r * 1.5],
        color: [pal.core, pal.body],
        alpha: 1,
        type: P.GLOW,
        fadePow: 1.2,
      });
      fx.glow({
        pos: p,
        life: 0.22,
        size: [r * 0.2, r * 1.6],
        color: pal.core,
        alpha: 0.7,
        type: P.RING,
        fadePow: 1,
      });
      const nf = Math.round(10 + r * 5);
      for (let i = 0; i < nf; i++) {
        randDir(_b);
        _b.y = Math.abs(_b.y) * 0.9 + 0.1;
        _b.multiplyScalar(rand(1.2, 3.4) * r);
        fx.glow({
          pos: _a.copy(p).addScaledVector(_b, 0.03),
          vel: _b,
          life: rand(0.3, 0.65),
          size: [r * 0.16, rand(0.4, 0.75) * r],
          color: [pal.core, pal.end],
          alpha: 0.9,
          type: P.FLAME,
          drag: 4.5,
          gravity: -1.2,
          spin: srand(2),
          fadePow: 1.1,
        });
      }
      const ns = Math.round((o.smoke ?? 1) * (7 + r * 3));
      for (let i = 0; i < ns; i++) {
        randDir(_b);
        _b.y = Math.abs(_b.y) + 0.2;
        _b.multiplyScalar(rand(0.6, 2.2) * r);
        fx.puff({
          pos: p,
          vel: _b,
          life: rand(1.4, 2.8),
          size: [r * 0.2, rand(0.6, 1.1) * r],
          color: [C(0x2a2622, 0.9), C(0x4a4640, 0.6)],
          alpha: 0.55,
          type: P.SMOKE,
          drag: 2.4,
          gravity: -0.5,
          spin: srand(0.8),
          fadeIn: 0.12,
          turb: 0.8,
        });
      }
      const nsp = o.sparks ?? Math.round(18 + r * 8);
      for (let i = 0; i < nsp; i++) {
        randDir(_b);
        _b.y = Math.abs(_b.y) * 1.2;
        _b.multiplyScalar(rand(4, 16) * Math.sqrt(r));
        fx.glow({
          pos: p,
          vel: _b,
          life: rand(0.4, 1.3),
          size: [0.012, 0.004],
          color: [pal.spark, pal.end],
          type: P.STREAK,
          stretch: 8,
          drag: 1.2,
          gravity: 10,
          ground: true,
          fadePow: 0.6,
        });
      }
      for (let i = 0; i < 8; i++) {
        randDir(_b);
        _b.y = Math.abs(_b.y) + 0.3;
        _b.multiplyScalar(rand(3, 9));
        fx.puff({
          pos: p,
          vel: _b,
          life: rand(0.8, 1.6),
          size: rand(0.015, 0.04),
          color: C(0x1a1816, 1),
          alpha: 1,
          type: P.SHARD,
          gravity: 9.8,
          ground: true,
          spin: srand(16),
          fadePow: 0.3,
        });
      }
      const g = V(p.x, 0, p.z);
      fx.decal({
        kind: "ring",
        pos: g,
        size: r * 3.2,
        color: pal.body,
        life: 0.45,
        alpha: 0.9,
        hold: 0,
      });
      if (o.scorch !== false)
        fx.decal({
          kind: "scorch",
          pos: g,
          size: r * 1.7,
          color: [0.012, 0.01, 0.009],
          life: 25,
          alpha: 0.85,
        });
      fx.shake(o.shake ?? Math.min(0.8, 0.18 * r));
    },

    /**
     * Firework burst. o: { colors: [hex...], count, radius, kind: "peony" | "willow" | "ring" | "crackle" }
     *
     * These go off a few metres from the eye, so the burst is built the way a shell is, not
     * painted as a puff: stars thrown out evenly at one speed, braked hard by the air so the
     * ball stops growing at about `radius`, then pulled over by gravity. Each sheds a trail of
     * sparks that is left hanging where it was laid and gutters out; the stars come down, hit
     * the street and skip. Round them, a spray of fine sparks that is gone in half a second.
     *   peony   a ball of coloured stars
     *   willow  slower, longer-burning stars with heavy trails that droop into curtains
     *   ring    one circle of stars, tilted
     *   crackle a peony whose embers pop
     */
    firework(pos, o = {}) {
      fx.audio &&
        fx.audio.world("burst", pos, {
          size: (o.radius ?? 3) / 2.4,
          gap: 0.03,
        });
      const colors = o.colors || [0xff3a2a, 0xffc23a];
      const r = o.radius ?? 3;
      const kind = o.kind || "peony";
      const q = fx.detail;
      const count = (o.count ?? 90) * q;
      const p = pos.clone();
      const big = Math.sqrt(r / 2.4); // bigger shells have bigger stars, not just more room
      // the break: a hard white flash, then the colour hanging in the smoke for a moment
      fx.flash(p, colors[0], 45 * r, 0.3, 12 + r * 3);
      fx.glow({
        pos: p,
        life: 0.1,
        size: [r * 0.12, r * 0.5],
        color: C(0xffffff, 3),
        type: P.GLOW,
        fadePow: 1,
      });
      fx.glow({
        pos: p,
        life: 0.09,
        size: [r * 0.25, r * 0.95],
        color: C(0xfff2d8, 2.2),
        type: P.STAR,
        fadePow: 1,
      });
      fx.glow({
        pos: p,
        life: 0.5,
        size: [r * 0.45, r * 1.25],
        color: C(colors[0], 1.4),
        alpha: 0.3,
        type: P.GLOW,
        fadeIn: 0.05,
        fadePow: 1.6,
      });
      // ---- the stars
      const willow = kind === "willow";
      const ring = kind === "ring";
      const brake = willow ? 1.9 : 2.6; // air drag on a star (1/s): it stalls speed / brake out
      const fall = willow ? 4.2 : 5.5;
      const speed = brake * r * (willow ? 0.95 : 1.1);
      const stars = Math.max(8, Math.round(count * (ring ? 0.5 : 0.45)));
      // a ring lies in a plane of its own, tilted at random
      const tilt = _d.set(srand(0.5), 1, srand(0.5)).normalize();
      const u = _a
        .set(1, 0, 0)
        .addScaledVector(tilt, -tilt.x)
        .normalize()
        .clone();
      const w = _a.crossVectors(tilt, u).clone();
      const turn = Math.random() * Math.PI * 2;
      for (let i = 0; i < stars; i++) {
        if (ring) {
          const a = (i / stars) * Math.PI * 2 + turn;
          _b.copy(u)
            .multiplyScalar(Math.cos(a))
            .addScaledVector(w, Math.sin(a));
        } else {
          // packed evenly over the ball, as the stars are in a shell (drawn at random they
          // clump and leave holes)
          const y = 1 - (2 * (i + 0.5)) / stars;
          const s = Math.sqrt(1 - y * y);
          const a = i * 2.39996 + turn + srand(0.25);
          _b.set(Math.cos(a) * s, y, Math.sin(a) * s);
        }
        _b.multiplyScalar(speed * (ring ? rand(0.97, 1.03) : rand(0.9, 1.06)));
        // (as bright as the other sparks in here: the game's night street takes most of it
        // away again, see ARMORY_TUNE.fxGain)
        const mine = colors[i % colors.length];
        const hot = C(mine, rand(6, 7.5));
        fx.glow({
          pos: p,
          vel: _b,
          life: willow ? rand(1.9, 2.7) : rand(1.15, 1.75),
          size: [0.075 * big, 0.03 * big],
          color: [hot, C(mine, 3.2)], // a star burns one colour from first to last
          type: P.STREAK,
          stretch: 2.2,
          drag: brake,
          gravity: fall,
          fadePow: 0.5,
          ground: true,
          trail: {
            rate: willow ? 70 : 55,
            life: willow ? 1.0 : 0.6,
            size: 0.03 * big,
          },
        });
      }
      // ---- the spray: fine sparks, fast and soon spent, that rattle off the ground
      const spray = Math.round(count * (ring ? 0.4 : 0.9));
      for (let i = 0; i < spray; i++) {
        randDir(_b).multiplyScalar(r * rand(2.2, 6.5));
        fx.glow({
          pos: p,
          vel: _b,
          life: rand(0.35, 0.95),
          size: [0.024, 0.007],
          color:
            i % 3 === 0
              ? [C(colors[i % colors.length], 5), C(0xff7a18, 1.4)]
              : [C(0xfff0c8, 6), C(0xff7a18, 1.6)],
          type: P.STREAK,
          stretch: 7,
          drag: 4.2,
          gravity: 9,
          fadePow: 0.7,
          ground: true,
        });
      }
      if (kind === "crackle" || o.crackle) {
        // embers that pop on the way down: under the middle of the burst, where they are falling
        for (let i = 0; i < Math.round(9 * q); i++) {
          fx.after(rand(0.45, 1.3), () => {
            randDir(_b).multiplyScalar(rand(0.3, 1) * r);
            _b.y = -Math.abs(_b.y) * 0.8;
            const at = _a.copy(p).add(_b).clone();
            at.y = Math.max(0.15, at.y);
            fx.glow({
              pos: at,
              life: 0.08,
              size: [0.1, 0.45],
              color: C(0xfff0d0, 3),
              type: P.STAR,
              fadePow: 1,
            });
            for (let k = 0; k < 7; k++)
              fx.glow({
                pos: at,
                vel: randDir(_d).multiplyScalar(rand(2, 7)),
                life: rand(0.15, 0.4),
                size: [0.012, 0.004],
                color: C(0xffe0a0, 6),
                type: P.STREAK,
                stretch: 5,
                drag: 4,
                gravity: 6,
                ground: true,
              });
          });
        }
      }
      // smoke left hanging in the rain, lit by the colour while it is young
      for (let i = 0; i < Math.round(7 * (0.5 + 0.5 * q)); i++) {
        randDir(_b).multiplyScalar(rand(0.3, 1.2) * r);
        fx.puff({
          pos: p,
          vel: _b,
          life: rand(1.8, 3),
          size: [r * 0.2, r * rand(0.6, 0.9)],
          color: [C(colors[i % colors.length], 0.4), C(0x3a3836, 0.4)],
          alpha: 0.2,
          type: P.SMOKE,
          drag: 2.6,
          gravity: 0.15,
          fadeIn: 0.15,
          spin: srand(0.5),
        });
      }
      fx.shake(0.08 * r);
    },

    /** One frame of a flame stream. o: { pal: "fire" | "blue", range, cone, rate } */
    flame(pos, dir, dt, o = {}) {
      const blue = o.pal === "blue";
      const pal = PAL[blue ? "blue" : "fire"];
      const range = o.range ?? 9;
      const cone = o.cone ?? 0.2;
      const drag = blue ? 2.2 : 1.9;
      const speed = range * drag * 1.05;
      const sc = o.scale ?? 1;
      const n = Math.max(
        1,
        Math.round((o.rate ?? 80) * dt + Math.random() - 0.5),
      );
      for (let i = 0; i < n; i++) {
        coneDir(dir, cone * 0.55, _b).multiplyScalar(speed * rand(0.8, 1.1));
        const life = rand(0.5, 0.8) * (blue ? 0.8 : 1);
        fx.glow({
          pos: _a.copy(pos).addScaledVector(dir, rand(0, 0.25)),
          vel: _b,
          life,
          size: blue
            ? [0.025, rand(0.2, 0.34) * sc]
            : [0.03, rand(0.42, 0.8) * sc],
          color: [pal.core, pal.end],
          alpha: blue ? 0.6 : 0.4,
          type: P.FLAME,
          drag,
          gravity: blue ? -0.4 : -2.4,
          spin: srand(2.5),
          turb: blue ? 1 : 4,
          fadeIn: 0.05,
          fadePow: blue ? 1.1 : 1.5,
        });
        if (!blue && Math.random() < 0.2) {
          fx.puff({
            pos: _a,
            vel: _c.copy(_b).multiplyScalar(0.9),
            life: life * 2.2,
            size: [0.1, rand(0.9, 1.5)],
            color: [C(0x1c1a18, 1), C(0x3a3632, 0.7)],
            alpha: 0.3,
            type: P.SMOKE,
            drag: drag * 0.95,
            gravity: -1.6,
            fadeIn: 0.45,
            spin: srand(1),
            turb: 2,
          });
        }
        if (Math.random() < 0.12) {
          coneDir(dir, cone * 1.4, _c).multiplyScalar(speed * rand(0.4, 0.9));
          fx.glow({
            pos: _a,
            vel: _c,
            life: rand(0.5, 1.2),
            size: [0.012, 0.004],
            color: [pal.spark, pal.end],
            type: P.STREAK,
            stretch: 5,
            drag: 1.5,
            gravity: -1 + rand(3),
            turb: 5,
            fadePow: 0.7,
          });
        }
      }
      if (!blue) {
        // the pressurised core of the jet: tight and white-hot at the nozzle, fraying as it slows.
        // Without it a stream seen from behind is just a ball of fire at the far end.
        const L = range * 0.42;
        const t = fx.time;
        const pts = [];
        for (let i = 0; i <= 6; i++) {
          const u = i / 6;
          pts.push(
            new THREE.Vector3()
              .copy(pos)
              .addScaledVector(dir, u * L)
              .add(
                _c.set(
                  Math.sin(t * 23 + u * 9) * 0.05 * u * u,
                  0.16 * u * u + Math.sin(t * 17 + u * 7) * 0.04 * u * u,
                  Math.cos(t * 19 + u * 8) * 0.05 * u * u,
                ),
              ),
          );
        }
        fx.ribbon({
          points: pts,
          width: 0.5 * sc,
          taper: 1.25,
          color: pal.body,
          core: [pal.core[0] * 1.5, pal.core[1] * 1.6, pal.core[2] * 2.5],
          life: 0.055,
          fade: 0.5,
          alpha: 0.85,
          kind: "fire",
        });
      }
      // hot core right at the nozzle
      fx.glow({
        pos: _a.copy(pos).addScaledVector(dir, 0.1),
        vel: _b.copy(dir).multiplyScalar(5),
        life: 0.06,
        size: [0.03, 0.09],
        color: [pal.core, pal.body],
        alpha: 0.7,
        type: P.GLOW,
        fadePow: 1,
      });
    },

    /** Pilot light / idle ember at a nozzle. */
    pilot(pos, dt, o = {}) {
      const pal = PAL[o.pal === "blue" ? "blue" : "fire"];
      if (Math.random() < 40 * dt)
        fx.glow({
          pos,
          vel: _b.set(srand(0.05), rand(0.25, 0.5), srand(0.05)),
          life: rand(0.12, 0.22),
          size: [0.012, 0.028],
          color: [pal.core, pal.end],
          alpha: 0.9,
          type: P.FLAME,
          gravity: -0.6,
          fadePow: 1,
        });
    },

    /** Flames licking a burning body. a/b: two points bounding the body (feet, head). */
    burn(a, b, dt, stacks = 1) {
      const pal = PAL.fire;
      const n = (10 + stacks * 6) * dt + Math.random() * 0.5;
      for (let i = 0; i < Math.floor(n + Math.random()); i++) {
        _a.lerpVectors(a, b, Math.pow(Math.random(), 0.7));
        _a.x += srand(0.2);
        _a.z += srand(0.2);
        fx.glow({
          pos: _a,
          vel: _b.set(srand(0.3), rand(0.9, 2.2), srand(0.3)),
          life: rand(0.3, 0.6),
          size: [0.08, rand(0.3, 0.5)],
          color: [pal.core, pal.end],
          alpha: 0.6,
          type: P.FLAME,
          gravity: -1.5,
          drag: 1,
          spin: srand(2),
          turb: 2,
        });
        if (Math.random() < 0.3)
          fx.glow({
            pos: _a,
            vel: _b.set(srand(0.8), rand(1, 3), srand(0.8)),
            life: rand(0.5, 1.2),
            size: [0.01, 0.003],
            color: [pal.spark, pal.end],
            type: P.STREAK,
            stretch: 4,
            gravity: -1.5,
            turb: 6,
            drag: 0.8,
          });
        if (Math.random() < 0.25)
          fx.puff({
            pos: _a.clone().setY(b.y),
            vel: _b.set(srand(0.2), rand(0.8, 1.5), srand(0.2)),
            life: rand(1, 2),
            size: [0.15, rand(0.5, 0.8)],
            color: [C(0x1a1816, 1), C(0x3a3632, 0.6)],
            alpha: 0.28,
            type: P.SMOKE,
            gravity: -0.8,
            drag: 0.8,
            fadeIn: 0.2,
            spin: srand(0.8),
            turb: 1,
          });
      }
    },

    /** Small arcs crawling over a shocked body. */
    shock(a, b, dt) {
      if (Math.random() < 14 * dt) {
        const p1 = V()
          .lerpVectors(a, b, Math.random())
          .add(V(srand(0.25), 0, srand(0.25)));
        const p2 = V()
          .lerpVectors(a, b, Math.random())
          .add(V(srand(0.3), srand(0.1), srand(0.3)));
        fx.bolt(p1, p2, {
          width: 0.025,
          life: 0.09,
          forks: 0,
          flicker: 2,
          amp: 0.3,
          detail: 3,
          color: PAL.shock.body,
        });
        fx.glow({
          pos: p2,
          life: 0.08,
          size: [0.05, 0.16],
          color: PAL.shock.core,
          type: P.STAR,
          fadePow: 1,
        });
      }
    },

    /** Corrosion dripping off a body. */
    venom(a, b, dt, stacks = 1) {
      const pal = PAL.venom;
      if (Math.random() < (10 + stacks * 4) * dt) {
        _a.lerpVectors(a, b, Math.random());
        _a.x += srand(0.22);
        _a.z += srand(0.22);
        fx.puff({
          pos: _a,
          vel: _b.set(srand(0.2), rand(-0.3, 0.2), srand(0.2)),
          life: rand(0.5, 0.9),
          size: [0.02, 0.012],
          color: C(0x4aa020, 1.2),
          alpha: 0.9,
          type: P.DROP,
          gravity: 6,
          ground: true,
          fadePow: 0.5,
        });
        fx.puff({
          pos: _a,
          vel: _b.set(srand(0.3), rand(0.2, 0.6), srand(0.3)),
          life: rand(0.8, 1.6),
          size: [0.1, rand(0.35, 0.6)],
          color: [C(0x5aa82a, 0.7), C(0x2a4a14, 0.5)],
          alpha: 0.2,
          type: P.SMOKE,
          drag: 1.5,
          spin: srand(1),
          turb: 1,
        });
        if (Math.random() < 0.5)
          fx.glow({
            pos: _a,
            vel: _b.set(srand(0.1), rand(0.2, 0.5), srand(0.1)),
            life: rand(0.4, 0.8),
            size: [0.01, rand(0.03, 0.06)],
            color: pal.body,
            alpha: 0.6,
            type: P.RING,
            fadePow: 0.6,
          });
      }
    },

    /** Lingering gas cloud (venom death, conductive fog). */
    cloud(pos, radius, life, o = {}) {
      const col = o.color || [C(0x6ac030, 0.6), C(0x2a4a14, 0.4)];
      fx.task(life, (k, dt) => {
        if (Math.random() < 26 * dt) {
          _a.set(
            pos.x + srand(radius * 0.8),
            rand(0.1, 1.2),
            pos.z + srand(radius * 0.8),
          );
          fx.puff({
            pos: _a,
            vel: _b.set(srand(0.3), rand(0, 0.25), srand(0.3)),
            life: rand(1.2, 2.2),
            size: [radius * 0.3, radius * rand(0.6, 0.95)],
            color: col,
            alpha: 0.2 * (1 - k * 0.6),
            type: P.SMOKE,
            drag: 1,
            spin: srand(0.5),
            fadeIn: 0.25,
            turb: 0.8,
          });
        }
      });
    },

    /** Lightning bolt from the sky to `pos`. o: { radius, color } */
    lightning(pos, o = {}) {
      fx.audio && fx.audio.world("thunder", pos, { gain: 1.4, gap: 0.08 });
      const r = o.radius ?? 4;
      const g = V(pos.x, 0.02, pos.z);
      const top = V(pos.x + srand(3), 22, pos.z + srand(3));
      const col = o.color || [0.5, 1.5, 3.0];
      // main stroke, a soft wide halo on the same path, and a thinner return stroke
      fx.bolt(top, g, {
        width: 0.95,
        life: 0.34,
        flicker: 5,
        forks: 5,
        amp: 0.1,
        detail: 6,
        color: col,
        core: [4.5, 5, 6.5],
      });
      fx.ribbon({
        points: jagged(top, g, { detail: 4, amp: 0.08 }),
        width: 3.4,
        color: [0.12, 0.4, 0.9],
        core: [0.3, 0.8, 1.6],
        life: 0.3,
        fade: 1.2,
        alpha: 0.7,
      });
      fx.bolt(top.clone().add(V(srand(1), 0, srand(1))), g, {
        width: 0.35,
        life: 0.24,
        flicker: 4,
        forks: 2,
        amp: 0.14,
        detail: 6,
        color: col,
      });
      fx.flash(V(g.x, 2.5, g.z), 0xbfe8ff, 420, 0.32, 40);
      fx.glow({
        pos: V(g.x, 0.4, g.z),
        life: 0.2,
        size: [r * 0.4, r * 1.6],
        color: C(0xdff4ff, 3.5),
        type: P.GLOW,
        fadePow: 1,
      });
      fx.glow({
        pos: V(g.x, 0.5, g.z),
        life: 0.16,
        size: [r * 0.5, r * 2.2],
        color: C(0xffffff, 3),
        type: P.STAR,
        fadePow: 1,
      });
      for (let i = 0; i < 46; i++) {
        randDir(_b);
        _b.y = Math.abs(_b.y) * 1.3 + 0.1;
        _b.multiplyScalar(rand(3, 15));
        fx.glow({
          pos: g,
          vel: _b,
          life: rand(0.3, 1.0),
          size: [0.012, 0.004],
          color: [C(0xdff4ff, 8), C(0x3a80ff, 2)],
          type: P.STREAK,
          stretch: 9,
          drag: 1.4,
          gravity: 9,
          ground: true,
          fadePow: 0.6,
        });
      }
      for (let i = 0; i < 7; i++) {
        const a = rand(6.28);
        const e = V(
          g.x + Math.cos(a) * rand(0.5, 1) * r,
          0.05,
          g.z + Math.sin(a) * rand(0.5, 1) * r,
        );
        fx.bolt(g.clone().setY(0.08), e, {
          width: 0.05,
          life: rand(0.15, 0.35),
          flicker: 3,
          forks: 1,
          amp: 0.25,
          detail: 4,
          color: col,
        });
      }
      for (let i = 0; i < 6; i++) {
        randDir(_b);
        _b.y = Math.abs(_b.y) + 0.4;
        fx.puff({
          pos: g,
          vel: _b.multiplyScalar(rand(0.8, 2.4)),
          life: rand(1.2, 2.2),
          size: [0.3, rand(1.2, 2)],
          color: [C(0x8a94a8, 0.7), C(0x3a3e48, 0.4)],
          alpha: 0.3,
          type: P.SMOKE,
          drag: 1.8,
          gravity: -0.5,
          fadeIn: 0.1,
          spin: srand(0.6),
        });
      }
      fx.decal({
        kind: "ring",
        pos: g,
        size: r * 2.6,
        color: C(0x8fe0ff, 3),
        life: 0.4,
        hold: 0,
      });
      fx.decal({
        kind: "scorch",
        pos: g,
        size: r * 0.9,
        color: [0.01, 0.012, 0.016],
        life: 20,
        alpha: 0.9,
      });
      fx.decal({
        kind: "field",
        pos: g,
        size: r * 2,
        color: C(0x6fd8ff, 2.5),
        life: 1.1,
        hold: 0.2,
      });
      fx.shake(0.55);
      // the whole street whites out for an instant
      const base = stage.renderer.toneMappingExposure;
      fx.task(0.22, (k) => {
        stage.renderer.toneMappingExposure =
          base * (1 + 1.1 * (1 - k) * (1 - k));
      });
      fx.after(0.23, () => (stage.renderer.toneMappingExposure = base));
    },

    /** Talisman seal landing on a target: glyph, ring, paper scraps, slow gold motes. */
    seal(pos, o = {}) {
      fx.audio && fx.audio.world("chime", pos, { gain: 0.6, gap: 0.08 });
      const pal = PAL[o.pal || "seal"];
      const cam = stage.camera.getWorldPosition(V());
      const n = cam.sub(pos).normalize();
      fx.decal({
        kind: "glyph",
        map: glyphTex(o.glyph || "敕"),
        pos: pos.clone().addScaledVector(n, 0.25),
        normal: n,
        rot: 0,
        size: (o.size ?? 0.9) * 0.7,
        grow: 0.9,
        color: pal.body,
        life: 0.55,
        hold: 0.25,
      });
      fx.glow({
        pos,
        life: 0.3,
        size: [0.1, (o.size ?? 0.9) * 1.1],
        color: pal.body,
        alpha: 0.9,
        type: P.RING,
        fadePow: 1,
      });
      fx.glow({
        pos,
        life: 0.12,
        size: [0.1, 0.5],
        color: pal.core,
        type: P.GLOW,
        fadePow: 1,
      });
      for (let i = 0; i < 12; i++) {
        randDir(_b).multiplyScalar(rand(0.3, 1.6));
        fx.glow({
          pos,
          vel: _b,
          life: rand(0.6, 1.4),
          size: [0.014, 0.004],
          color: [pal.spark, pal.end],
          type: P.GLOW,
          gravity: -0.6,
          drag: 1.5,
          turb: 2,
          fadePow: 0.8,
        });
      }
      for (let i = 0; i < (o.scraps ?? 5); i++) {
        randDir(_b).multiplyScalar(rand(0.5, 2));
        _b.y = Math.abs(_b.y);
        fx.puff({
          pos,
          vel: _b,
          life: rand(0.9, 1.8),
          size: rand(0.02, 0.04),
          color: o.paper || C(0xd8b03a, 0.9),
          alpha: 1,
          type: P.PAPER,
          gravity: 1.6,
          drag: 2.5,
          spin: srand(8),
          turb: 3,
          fadePow: 0.4,
        });
      }
      fx.flash(pos, pal.light, 14, 0.18, 6);
    },

    /** Ritual circle on the ground (pinned / sealed target, talisman areas). */
    circle(pos, o = {}) {
      const pal = PAL[o.pal || "seal"];
      return fx.decal({
        kind: "glyph",
        map: glyphTex(o.text || "敕令鎮煞急急如律令", { ring: true }),
        pos: V(pos.x, 0, pos.z),
        size: o.size ?? 1.6,
        color: o.color || pal.body,
        life: o.life ?? 3,
        spin: o.spin ?? 0.5,
        hold: 0.8,
        alpha: o.alpha ?? 0.9,
        follow: o.follow,
      });
    },

    /** Sparks where a blade bites. */
    slashHit(pos, dir, o = {}) {
      fx.audio && fx.audio.world("slash", pos, { gain: 0.9, gap: 0.04 });
      const pal = PAL[o.pal || "seal"];
      fx.glow({
        pos,
        life: 0.09,
        size: [0.1, 0.5],
        color: pal.core,
        type: P.STAR,
        rot: Math.atan2(dir.y, dir.x),
        fadePow: 1,
      });
      for (let i = 0; i < 10; i++) {
        coneDir(dir, 0.7, _b).multiplyScalar(rand(3, 12));
        fx.glow({
          pos,
          vel: _b,
          life: rand(0.15, 0.45),
          size: [0.008, 0.003],
          color: [pal.spark, pal.end],
          type: P.STREAK,
          stretch: 8,
          drag: 2,
          gravity: 7,
          fadePow: 0.7,
        });
      }
    },

    /** Coins ringing off something. */
    coinSpark(pos) {
      fx.audio && fx.audio.world("coin", pos, { gain: 0.6, gap: 0.03 });
      fx.glow({
        pos,
        life: 0.1,
        size: [0.04, 0.2],
        color: C(0xffe8a0, 7),
        type: P.STAR,
        fadePow: 1,
      });
      for (let i = 0; i < 5; i++)
        fx.glow({
          pos,
          vel: randDir(_b).multiplyScalar(rand(1, 5)),
          life: rand(0.15, 0.4),
          size: [0.007, 0.003],
          color: [C(0xffd870, 6), C(0xff8a20, 1)],
          type: P.STREAK,
          stretch: 6,
          gravity: 6,
          drag: 2,
        });
    },

    /** Electric discharge ball: call every frame at its position. */
    orb(pos, dt, radius = 0.35) {
      const pal = PAL.shock;
      fx.glow({
        pos,
        life: 0.09,
        size: [radius * 1.2, radius * 2.3],
        color: [pal.core, pal.body],
        alpha: 0.75,
        type: P.GLOW,
        fadePow: 1,
      });
      if (Math.random() < 30 * dt) {
        const q = pos
          .clone()
          .add(randDir(_b).multiplyScalar(radius * rand(1.5, 3.2)));
        fx.bolt(pos, q, {
          width: 0.035,
          life: 0.08,
          forks: 1,
          flicker: 2,
          amp: 0.35,
          detail: 3,
          color: pal.body,
        });
      }
      if (Math.random() < 20 * dt)
        fx.glow({
          pos,
          vel: randDir(_b).multiplyScalar(rand(1, 4)),
          life: rand(0.2, 0.5),
          size: [0.012, 0.004],
          color: [pal.spark, pal.end],
          type: P.STREAK,
          stretch: 6,
          drag: 2,
        });
    },

    /** Shell of sparks when a hot nail, bolt fuse or oil pool crackles. */
    embers(pos, dt, rate = 20, o = {}) {
      const pal = PAL[o.pal || "fire"];
      if (Math.random() < rate * dt)
        fx.glow({
          pos,
          vel: _b.set(srand(0.6), rand(0.4, 1.6), srand(0.6)),
          life: rand(0.3, 0.8),
          size: [0.01, 0.003],
          color: [pal.spark, pal.end],
          type: P.STREAK,
          stretch: 4,
          gravity: 1.5,
          drag: 1,
          turb: 4,
        });
    },

    /** Burning pool on the ground for `life` seconds. Returns nothing; purely visual. */
    firePool(pos, radius, life, o = {}) {
      const pal = PAL[o.pal || "fire"];
      const g = V(pos.x, 0, pos.z);
      fx.decal({
        kind: "firepool",
        pos: g,
        size: radius * 2.3,
        color: pal.body,
        life,
        hold: 0.85,
        alpha: 1,
      });
      fx.decal({
        kind: "scorch",
        pos: g,
        size: radius * 2.2,
        color: [0.012, 0.01, 0.008],
        life: life + 14,
        alpha: 0.8,
      });
      const light = fx.hold(V(g.x, 0.6, g.z), pal.light, 30, radius * 4 + 3);
      fx.task(life, (k, dt, age) => {
        const str = k > 0.85 ? (1 - k) / 0.15 : 1;
        if (light)
          light.light.intensity =
            (26 + Math.sin(age * 23) * 6 + Math.sin(age * 9.1) * 5) * str;
        const n = radius * radius * 16 * dt * str;
        for (let i = 0; i < Math.floor(n + Math.random()); i++) {
          const a = rand(6.28),
            rr = Math.sqrt(Math.random()) * radius * 0.95;
          _a.set(g.x + Math.cos(a) * rr, 0.05, g.z + Math.sin(a) * rr);
          fx.glow({
            pos: _a,
            vel: _b.set(srand(0.3), rand(1.2, 2.6), srand(0.3)),
            life: rand(0.35, 0.7),
            size: [0.12, rand(0.4, 0.75)],
            color: [pal.core, pal.end],
            alpha: 0.55,
            type: P.FLAME,
            gravity: -1.8,
            drag: 1.2,
            spin: srand(2),
            turb: 2.5,
          });
          if (Math.random() < 0.12)
            fx.puff({
              pos: _a.clone().setY(0.9),
              vel: _b.set(srand(0.3), rand(0.8, 1.6), srand(0.3)),
              life: rand(1.4, 2.6),
              size: [0.25, rand(0.8, 1.3)],
              color: [C(0x1a1816, 1), C(0x3a3632, 0.6)],
              alpha: 0.25,
              type: P.SMOKE,
              gravity: -0.7,
              drag: 0.7,
              fadeIn: 0.2,
              spin: srand(0.6),
              turb: 1,
            });
          if (Math.random() < 0.2)
            fx.glow({
              pos: _a,
              vel: _b.set(srand(1), rand(1.5, 4), srand(1)),
              life: rand(0.6, 1.4),
              size: [0.01, 0.003],
              color: [pal.spark, pal.end],
              type: P.STREAK,
              stretch: 4,
              gravity: -0.8,
              turb: 6,
              drag: 0.8,
            });
        }
        if (k >= 0.999 && light) light.release();
      });
      fx.after(life + 0.05, () => light && light.release());
    },
  };
  return E;
}

export { jagged };
