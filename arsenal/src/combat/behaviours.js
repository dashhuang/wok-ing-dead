// What each weapon does when it fires, in each of its three forms (base / 甲 a / 乙 b) and,
// where it changes what you see, at level 5 (ctx.cap). The base weapon's headline numbers —
// damage, pellets, range, splash, weak-spot multiplier, reach: the ones its card shows — are
// read from data/weapons.js (F.<id> below), so the card cannot say one thing and the weapon do
// another. What a form changes is written here, next to what it does.
//
// A behaviour is { spec(b, lv), fire?, stream?, tick?, swing?, alt?, frame?, hint? }.
//   spec   -> { kind: "gun" | "stream" | "melee", rpm, mag, reload, casing, charge, tickRate, swingTime, hitAt, ... }
//   fire(ctx)            one shot (guns and launchers); ctx.charge is 0..1 for charged shots
//   stream(ctx, dt)      every frame while the trigger is held (visuals); tick(ctx) at spec.tickRate (damage)
//   swing(ctx, n)        the moment a melee swing connects; n = index in the combo
//   alt(ctx, phase, dt)  secondary action: phase "down" | "hold" | "up"
//   frame(ctx, dt)       every frame while equipped (pilot lights, marks, pools)
import * as THREE from "three";
import { C, P, rand, srand, coneDir, randDir } from "../fx/core.js";
import { WEAPONS } from "../data/weapons.js";
import {
  STOCK_GUNS,
  coneOf,
  bloomAfterShot,
  bloomAfter,
  roundDamage,
} from "../../../src/chinatown/stockguns.js";

// the design data of each weapon's fire: F.shotgun.damage, F.lever.range, ...
const F = Object.fromEntries(WEAPONS.map((w) => [w.id, w.fire]));

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const _a = V(),
  _b = V(),
  _c = V();
const FW_PALETTES = [
  [0xff3a2a, 0xffc23a],
  [0x3aff7a, 0xffffff],
  [0xa86bff, 0x35e0ff],
  [0xff3b8d, 0xffd060],
  [0x35a0ff, 0xffffff],
  [0xffc23a, 0xff7a1a],
];
const pick = (a) => a[(Math.random() * a.length) | 0];

// ---------------------------------------------------------------- shared pieces
// o.self: the share of it that reaches back to the shooter, o.selfMax: at most this much
function splash(ctx, pos, radius, dmg, o = {}) {
  if (o.self > 0)
    ctx.blowback(pos, radius, Math.min(dmg * o.self, o.selfMax ?? Infinity));
  for (const h of ctx.targets.inSphere(pos, radius)) {
    const k = 1 - 0.6 * Math.min(1, h.dist / radius);
    ctx.hit(h.z, dmg * k, {
      dir: _a.subVectors(h.z.chest, pos).setY(0.25).normalize().clone(),
      element: o.element,
      knock: o.knock ?? 1,
      blood: false,
      kind: "blast",
      noChain: o.noChain,
      lift: o.lift,
    });
    if (o.status) ctx.targets.apply(h.z, o.status, o.stacks || 1);
    if (o.scare) ctx.targets.scare(h.z, o.scare);
  }
}

function fireRing(ctx, pos, radius, life, dps = 10) {
  ctx.E.firePool(pos, radius, life);
  return ctx.zone({
    pos: pos.clone(),
    radius,
    life,
    dps,
    status: "fire",
    every: 0.5,
    element: "fire",
  });
}

// ---------------------------------------------------------------- behaviours
export const BEHAVIOURS = {
  // ================================================================ 镇街 shotgun
  shotgun: {
    spec: (b) =>
      b === "b"
        ? {
            kind: "gun",
            rpm: 80,
            mag: 6,
            reload: 2.4,
            beats: 3,
            casing: "shell",
            casingAt: 0.3,
            kick: 1.5,
          }
        : {
            kind: "gun",
            rpm: 80,
            mag: 6,
            reload: 2.4,
            beats: 3,
            casing: "shell",
            casingAt: 0.3,
            kick: 1.25,
          },
    fire(ctx) {
      const { E, fx } = ctx;
      const m = ctx.muzzle();
      if (ctx.b === "a") {
        // 龙息: a cone of burning magnesium instead of shot
        E.muzzle(m, ctx.aim.dir, {
          scale: 1.7,
          pal: "fire",
          long: 1,
          sparks: 26,
          smoke: 3,
          light: 40,
        });
        // three quick waves of flame so the breath reads as a jet rather than a puff
        const dir0 = ctx.aim.dir.clone();
        for (let w = 0; w < 3; w++) {
          fx.after(w * 0.035, () => {
            const mm = ctx.muzzle();
            for (let i = 0; i < 14; i++) {
              coneDir(dir0, 0.19, _b).multiplyScalar(rand(19, 36));
              fx.glow({
                pos: _a.copy(mm).addScaledVector(dir0, rand(0.1, 1.2)),
                vel: _b,
                life: rand(0.22, 0.42),
                size: [0.05, rand(0.16, 0.34)],
                color: [E.PAL.fire.core, E.PAL.fire.end],
                alpha: 0.7,
                type: P.FLAME,
                stretch: 2.2,
                drag: 3.4,
                gravity: -1.2,
                turb: 3,
              });
            }
          });
        }
        for (let i = 0; i < 34; i++) {
          coneDir(ctx.aim.dir, 0.24, _b).multiplyScalar(rand(18, 42));
          fx.glow({
            pos: m,
            vel: _b,
            life: rand(0.25, 0.7),
            size: [0.012, 0.004],
            color: [C(0xfff0c0, 5), C(0xff5a10, 1.5)],
            type: P.STREAK,
            stretch: 7,
            drag: 3.4,
            gravity: 3,
            ground: true,
            fadePow: 0.6,
          });
        }
        fx.flash(
          _a.copy(m).addScaledVector(ctx.aim.dir, 3),
          0xff7a22,
          30,
          0.3,
          14,
        );
        for (const h of ctx.targets.inCone(
          ctx.aim.origin,
          ctx.aim.dir,
          10,
          0.3,
        )) {
          const pellets = ctx.cap
            ? 12
            : Math.max(6, Math.round(12 * (1 - h.dist / 20)));
          const killed = ctx.hit(h.z, 16 * pellets, {
            dir: ctx.aim.dir.clone(),
            element: "fire",
            // (a cone of fire: it leans on them, harder the nearer they are)
            knock: 0.5 + 1.1 * Math.max(0, 1 - h.dist / 5),
            point: h.z.chest,
            blood: false,
            spread: ctx.cap ? 4 : 3,
            spreadStacks: ctx.cap ? 5 : 1,
            deathBlast: ctx.cap,
          });
          ctx.targets.apply(h.z, "fire", 3);
          // capstone 火烧连营: what the breath kills goes up and takes its neighbours with it
          if (killed && ctx.cap)
            splash(ctx, h.z.chest.clone(), 4, 50, {
              element: "fire",
              status: "fire",
              stacks: 2,
              knock: 0.6,
            });
        }
        const g = ctx.world(ctx.aim.origin, ctx.aim.dir, 8);
        if (g)
          fx.decal({
            kind: "scorch",
            pos: g.point,
            normal: g.normal,
            size: 1.4,
            life: 14,
            alpha: 0.6,
          });
        ctx.kick(1.2);
        ctx.shake(0.22);
      } else if (ctx.b === "b") {
        // 独头: one heavy slug
        E.muzzle(m, ctx.aim.dir, {
          scale: 1.9,
          brake: true,
          sparks: 12,
          smoke: 5,
          light: 46,
        });
        let n = 0;
        ctx.hitscan({
          dir: ctx.spread(0.004),
          range: 60,
          pierce: ctx.cap ? 99 : 3,
          damage: () => 190 * (ctx.cap ? 1 + 0.25 * n++ : 1),
          knock: 2.2,
          stagger: 0.7,
          tracer: {
            width: 0.07,
            color: C(0xffe0b0, 5),
            smoke: 0.09,
            speed: 320,
          },
          impact: { scale: 2 },
        });
        ctx.kick(1.7);
        ctx.shake(0.3);
      } else {
        E.muzzle(m, ctx.aim.dir, {
          scale: 1.6,
          sparks: 12,
          smoke: 4,
          light: 40,
        });
        // Each pellet hurts; the pattern shoves once, by how close it was fired and how
        // much of it landed. A pellet that kills throws the body with the whole of it.
        const K = F.shotgun.shove;
        const shove = (d) =>
          K.near +
          (K.far - K.near) *
            Math.max(0, Math.min(1, (d - K.from) / (K.to - K.from)));
        const knocked = new Map();
        for (let i = 0; i < F.shotgun.pellets; i++) {
          ctx.hitscan({
            dir: ctx.spread(F.shotgun.spread),
            range: F.shotgun.range,
            falloff: F.shotgun.falloff,
            damage: F.shotgun.damage,
            tracer: { width: 0.014, color: C(0xffd9a0, 2.2), len: 5 },
            impact: { scale: 0.55 },
            onHit: (z, h) => {
              const k = knocked.get(z) || { n: 0, d: h.dist };
              k.n++;
              knocked.set(z, k);
            },
            knock: 0,
            launch: (z, d) => shove(d),
          });
        }
        for (const [z, k] of knocked)
          ctx.push(
            z,
            ctx.aim.dir,
            shove(k.d) * Math.min(1, k.n / (F.shotgun.pellets * 0.5)),
          );
        ctx.kick(1.25);
        ctx.shake(0.2);
      }
    },
  },

  // ================================================================ 蜂巢 SMG
  smg: {
    spec: (b) => ({
      kind: "gun",
      rpm: 1000,
      mag: b === "a" ? 80 : 40,
      reload: b === "a" ? 2.1 : 1.6,
      casing: "pistol",
      casingAt: 0,
      kick: 0.32,
      auto: true,
    }),
    rpm(ctx) {
      // 甲: the drum spins up while the trigger stays down
      return ctx.b === "a" ? 1000 + 400 * (ctx.st.spin || 0) : 1000;
    },
    frame(ctx, dt) {
      if (ctx.b === "b" && ctx.cap) {
        // capstone 雷网: every shocked target is wired to the next; the wires burn whoever they touch
        ctx.st.netT = (ctx.st.netT || 0) - dt;
        if (ctx.st.netT <= 0) {
          ctx.st.netT = 0.12;
          const live = ctx.targets.alive().filter((z) => z.st.shock > 0);
          for (let i = 0; i + 1 < live.length; i++) {
            const a = live[i],
              b2 = live[i + 1];
            if (a.pos.distanceTo(b2.pos) > 10) continue;
            ctx.fx.bolt(a.chest, b2.chest, {
              width: 0.05,
              life: 0.13,
              forks: 1,
              flicker: 2,
            });
            for (const z of [a, b2])
              ctx.hit(z, 2.4, {
                dir: UP.clone(),
                element: "shock",
                blood: false,
                kind: "stream",
                noChain: true,
              });
          }
        }
      }
      if (ctx.b !== "a") return;
      ctx.st.spin = Math.max(
        0,
        Math.min(1, (ctx.st.spin || 0) + (ctx.held ? dt / 1.2 : -dt / 0.5)),
      );
    },
    fire(ctx) {
      const { E, fx } = ctx;
      const m = ctx.muzzle();
      const spin = ctx.st.spin || 0;
      const shockRound = ctx.b === "b" && ctx.shots % 4 === 3;
      if (shockRound) {
        E.muzzle(m, ctx.aim.dir, {
          scale: 0.85,
          pal: "shock",
          sparks: 5,
          smoke: 0,
          light: 22,
        });
        ctx.hitscan({
          dir: ctx.spread(0.016),
          range: F.smg.range,
          falloff: F.smg.falloff,
          damage: F.smg.damage * 2.5,
          element: "shock",
          tracer: { width: 0.03, color: C(0x6fd8ff, 5), core: [4, 6, 8] },
          impact: { pal: "shock", scale: 0.8 },
          onHit: (z, hit) => {
            ctx.targets.apply(z, "shock");
            fx.glow({
              pos: hit.point,
              life: 0.12,
              size: [0.1, 0.6],
              color: E.PAL.shock.core,
              type: P.STAR,
              fadePow: 1,
            });
            if (ctx.cap) ctx.st.net = 3;
          },
        });
      } else {
        E.muzzle(m, ctx.aim.dir, {
          scale: ctx.b === "a" ? 0.8 + spin * 0.25 : 0.7,
          brake: ctx.b === "a",
          sparks: 2,
          smoke: Math.random() < 0.3 ? 1 : 0,
          light: 16,
        });
        ctx.hitscan({
          dir: ctx.spread(ctx.b === "a" ? 0.022 * (1 - 0.7 * spin) : 0.02),
          range: F.smg.range,
          falloff: F.smg.falloff,
          damage: F.smg.damage,
          tracer: { width: 0.016, color: C(0xffd9a0, 3) },
          impact: { scale: 0.6 },
        });
      }
      ctx.kick(0.32 * (1 - 0.4 * spin));
      // 甲 capstone 不歇火: at full spin some rounds are free
      if (ctx.b === "a" && ctx.cap && spin > 0.95 && Math.random() < 0.25)
        ctx.refund(1);
    },
  },

  // ================================================================ 判官 revolver
  revolver: {
    spec: () => ({ kind: "gun", rpm: 150, mag: 6, reload: 2.2, kick: 1.5 }),
    hint: { a: "按住右键点名，松开扇击" },
    shot(ctx, dir, o = {}) {
      const { E } = ctx;
      const m = ctx.muzzle();
      const seal = ctx.b === "b";
      E.muzzle(m, dir, {
        scale: 1.35,
        pal: seal ? "seal" : "none",
        sparks: 9,
        smoke: 4,
        light: 36,
      });
      ctx.hitscan({
        dir,
        range: F.revolver.range,
        pierce: seal ? 1 : 0,
        damage: F.revolver.damage,
        headMul: F.revolver.head,
        forceHead: o.forceHead,
        knock: 0.9,
        stagger: 0.4,
        element: seal ? "seal" : undefined,
        tracer: seal
          ? {
              width: 0.045,
              color: C(0xffb03a, 5),
              core: [8, 5, 2],
              smoke: 0.04,
            }
          : { width: 0.04, color: C(0xffe0b0, 4), smoke: 0.045 },
        impact: { scale: 1.3, pal: seal ? "seal" : "none" },
        onHit: (z, hit) => {
          if (!seal) return;
          const wasPinned = z.pin > 0 && z.pinKind === "seal";
          ctx.targets.apply(z, "seal");
          // 乙 capstone 勾魂: killing a sealed target bursts the seal onto its neighbours
          if (ctx.cap && wasPinned && !z.alive) {
            E.circle(z.pos, { size: 5, life: 1.2, spin: 2 });
            for (const h of ctx.targets.inSphere(z.chest, 4))
              ctx.targets.apply(h.z, "seal", 2);
          }
        },
      });
      ctx.kick(1.5);
      ctx.shake(0.16);
    },
    fire(ctx) {
      BEHAVIOURS.revolver.shot(ctx, ctx.spread(0.004));
    },
    alt(ctx, phase, dt) {
      if (ctx.b !== "a") return;
      const st = ctx.st;
      if (phase === "down") {
        st.marks = [];
        st.markT = 0;
      } else if (phase === "hold") {
        st.markT -= dt;
        if (st.markT <= 0 && st.marks.length < Math.min(6, ctx.rounds)) {
          const cand = ctx.targets
            .inCone(ctx.aim.origin, ctx.aim.dir, 60, 0.5)
            .filter((h) => !st.marks.includes(h.z));
          cand.sort(
            (p, q) => ctx.angleTo(p.z.headPos) - ctx.angleTo(q.z.headPos),
          );
          if (cand.length) {
            st.marks.push(cand[0].z);
            st.markT = 0.16;
            ctx.fx.glow({
              pos: cand[0].z.headPos,
              life: 0.18,
              size: [0.9, 0.25],
              color: C(0xff3020, 5),
              type: P.RING,
              fadePow: 0.4,
            });
            ctx.note("点名 " + st.marks.length);
          }
        }
      } else if (phase === "up" && st.marks && st.marks.length) {
        const marks = st.marks.filter((z) => z.alive);
        st.marks = [];
        let kills = 0;
        marks.forEach((z, i) => {
          ctx.fx.after(i * 0.075, () => {
            if (!z.alive || ctx.rounds <= 0) return;
            const dir = _a
              .subVectors(z.headPos, ctx.aim.origin)
              .normalize()
              .clone();
            ctx.consume(1);
            BEHAVIOURS.revolver.shot(ctx, dir, { forceHead: true });
            ctx.cycleNow();
            if (!z.alive) {
              kills++;
              // 甲 capstone 生死簿: a kill hands the round back
              if (ctx.cap) ctx.refund(1);
            }
          });
        });
      }
    },
    frame(ctx) {
      // keep a red ring on every marked head
      const marks = ctx.st.marks;
      if (!marks) return;
      for (const z of marks) {
        if (!z.alive) continue;
        ctx.fx.glow({
          pos: z.headPos,
          life: 0.04,
          size: 0.24,
          color: C(0xff2a18, 3.5),
          type: P.RING,
          fadeIn: 0,
          fadePow: 0.2,
        });
        ctx.fx.glow({
          pos: z.headPos,
          life: 0.04,
          size: 0.05,
          color: C(0xff5a30, 4),
          type: P.GLOW,
          fadeIn: 0,
          fadePow: 0.2,
        });
      }
    },
  },

  // ================================================================ 更夫 lever rifle
  lever: {
    spec: () => ({
      kind: "gun",
      rpm: 60,
      mag: 7,
      reload: 2.8,
      beats: 3,
      casing: "rifle",
      casingAt: 0.35,
      kick: 1.4,
    }),
    fire(ctx) {
      const { E, fx } = ctx;
      const m = ctx.muzzle();
      const dir = ctx.spread(0.0015);
      if (ctx.b === "b") {
        const charged = ctx.shots % 3 === 2;
        E.muzzle(m, dir, {
          scale: 1.3,
          pal: charged ? "shock" : "none",
          sparks: charged ? 16 : 8,
          smoke: 4,
          light: 36,
        });
        const r = ctx.hitscan({
          dir,
          range: F.lever.range,
          pierce: F.lever.pierce,
          damage: F.lever.damage,
          knock: 1,
          stagger: 0.5,
          tracer: charged
            ? {
                width: 0.06,
                color: C(0x6fd8ff, 5),
                core: [5, 7, 9],
                smoke: 0.05,
              }
            : { width: 0.035, color: C(0xffe0b0, 4), smoke: 0.045 },
          impact: { scale: 1.4, pal: charged ? "shock" : "none" },
        });
        if (charged) {
          // 惊雷: the third round calls a bolt down on whatever it hit
          const at = r.end.clone();
          const strike = (pos, n) => {
            E.lightning(pos, { radius: 4 + (ctx.cap ? n : 0) });
            const struck = new Set();
            for (const h of ctx.targets.inSphere(
              V(pos.x, 1, pos.z),
              4 + (ctx.cap ? n : 0),
            )) {
              struck.add(h.z);
              ctx.hit(h.z, 120, {
                dir: _a
                  .subVectors(h.z.chest, pos)
                  .setY(0.3)
                  .normalize()
                  .clone(),
                element: "shock",
                knock: 0.8,
                blood: false,
                noChain: true,
                kind: "blast",
              });
              ctx.targets.apply(h.z, "shock");
            }
            // capstone 五雷正法: the bolt keeps jumping
            if (ctx.cap && n < 4) {
              const next = ctx.targets.nearest(pos, 12, struck);
              if (next) fx.after(0.16, () => strike(next.pos.clone(), n + 1));
            }
          };
          fx.after(0.05, () => strike(at, 0));
        }
      } else if (ctx.b === "a") {
        E.muzzle(m, dir, { scale: 1.25, sparks: 8, smoke: 4, light: 34 });
        const dist = (z) => z.chest.distanceTo(ctx.aim.origin);
        ctx.hitscan({
          dir,
          range: 260,
          pierce: 99,
          ricochet: 1,
          damage: (z) =>
            F.lever.damage *
            (ctx.cap ? 1 + 1.5 * Math.min(1, dist(z) / 60) : 1),
          headMul: 2.5,
          knock: 1,
          stagger: 0.5,
          tracer: {
            width: 0.035,
            color: C(0xfff0c8, 5),
            smoke: 0.05,
            speed: 420,
          },
          impact: { scale: 1.4 },
        });
      } else {
        E.muzzle(m, dir, { scale: 1.25, sparks: 8, smoke: 4, light: 34 });
        ctx.hitscan({
          dir,
          range: F.lever.range,
          pierce: F.lever.pierce,
          damage: F.lever.damage,
          knock: 1,
          stagger: 0.5,
          tracer: { width: 0.035, color: C(0xffe0b0, 4), smoke: 0.045 },
          impact: { scale: 1.4 },
        });
      }
      ctx.kick(1.4);
      ctx.shake(0.2);
    },
  },

  // ================================================================ 打桩 nail gun
  nailgun: {
    spec: (b) => ({
      kind: "gun",
      smokeless: true,
      rpm: b === "a" ? 170 : b === "b" ? 300 : 480,
      mag: b === "a" ? 60 : 50,
      reload: 1.4,
      kick: b === "a" ? 0.7 : 0.25,
      auto: true,
      cost: b === "a" ? 5 : 1,
    }),
    fire(ctx) {
      const { E, fx, proj } = ctx;
      const m = ctx.muzzle();
      // compressed air, not powder: a sharp puff and a ring, no flame
      fx.puff({
        pos: m,
        vel: _a.copy(ctx.aim.dir).multiplyScalar(3),
        life: 0.25,
        size: [0.02, 0.14],
        color: C(0xd0d4d8, 0.8),
        alpha: 0.35,
        type: P.SMOKE,
        drag: 6,
      });
      const stickFx = (p, hit) => {
        fx.glow({
          pos: hit.point,
          life: 0.06,
          size: [0.02, 0.1],
          color: C(0xffe0b0, 4),
          type: P.STAR,
          fadePow: 1,
        });
        for (let i = 0; i < 3; i++)
          fx.glow({
            pos: hit.point,
            vel: coneDir(hit.normal, 1, _b).multiplyScalar(rand(1, 5)),
            life: rand(0.1, 0.3),
            size: [0.005, 0.002],
            color: C(0xffc070, 5),
            type: P.STREAK,
            stretch: 6,
            gravity: 8,
          });
        fx.puff({
          pos: hit.point,
          vel: _b.copy(hit.normal).multiplyScalar(0.6),
          life: 0.5,
          size: [0.02, 0.12],
          color: C(0x8a8478, 0.7),
          alpha: 0.25,
          type: P.SMOKE,
          drag: 3,
        });
      };
      if (ctx.b === "b") {
        fx.glow({
          pos: m,
          life: 0.07,
          size: [0.03, 0.14],
          color: C(0xff7a20, 5),
          type: P.GLOW,
          fadePow: 1,
        });
        const boom = (pos, z, again) => {
          E.explosion(pos, {
            radius: 1.3,
            smoke: 0.5,
            sparks: 14,
            shake: 0.1,
            scorch: !z,
          });
          splash(ctx, pos, 2.2, 25, {
            element: "fire",
            status: "fire",
            knock: 0.5,
          });
          // capstone 连环爆: each burst throws six more hot nails (which only set alight)
          if (ctx.cap && again) {
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2 + rand(0.5);
              shoot(
                pos.clone().setY(Math.max(0.3, pos.y)),
                V(Math.cos(a), 0.25, Math.sin(a)).normalize(),
                false,
                30,
                z, // they fly out of the one that burst, not into it
              );
            }
          }
        };
        const shoot = (pos, dir, again, speed = 90, from = null) =>
          proj.spawn({
            kind: "hotnail",
            skip: from ? [from] : null,
            pos,
            vel: dir.multiplyScalar(speed),
            gravity: 4,
            life: 2.5,
            radius: 0.03,
            trail: {
              span: 0.12,
              width: 0.03,
              color: C(0xff6a1a, 4),
              kind: "fire",
            },
            onTick: (p, dt) => E.embers(p.pos, dt, 60),
            onHit(p, h) {
              ctx.hit(h.z, F.nailgun.damage, {
                dir: h.dir,
                point: h.point,
                head: h.head,
                element: "fire",
              });
              ctx.targets.apply(h.z, "fire");
              const rec = proj.stick(p, h.z, 1.2, 0.02);
              if (again)
                fx.after(1.2, () =>
                  boom(
                    rec && rec.obj.parent
                      ? rec.obj.getWorldPosition(V())
                      : h.point,
                    h.z,
                    again,
                  ),
                );
              return "stop";
            },
            onWorld(p, w) {
              stickFx(p, w);
              const at = w.point.clone();
              proj.stick(p, null, 1.2, -0.03);
              fx.task(1.2, (k, dt) => E.embers(at, dt, 30));
              if (again)
                fx.after(1.2, () =>
                  boom(at.addScaledVector(w.normal, 0.1), null, again),
                );
              return "stop";
            },
          });
        shoot(
          m,
          ctx.launch(m, 90, { spread: 0.012, gravity: 4 }).normalize(),
          true,
        );
      } else if (ctx.b === "a") {
        // 排钉: five long nails side by side
        const right = _c.crossVectors(ctx.aim.dir, UP).normalize().clone();
        for (let i = 0; i < 5; i++) {
          const k = i - 2;
          const dir = ctx
            .spread(0.006)
            .addScaledVector(right, k * 0.035)
            .normalize();
          const from = ctx.muzzle("m" + i);
          proj.spawn({
            kind: "spike",
            pos: from,
            vel: ctx.launch(from, 95, { dir, gravity: 3 }),
            gravity: 3,
            life: 2.5,
            radius: 0.035,
            trail: { span: 0.06, width: 0.012, color: C(0xe8ecf0, 1.2) },
            onHit(p, h) {
              ctx.hit(h.z, F.nailgun.damage, {
                dir: h.dir,
                point: h.point,
                head: h.head,
                pinBonus: ctx.cap ? 1.25 : 1,
              });
              if (!h.head) ctx.targets.pin(h.z, 2.5, "nail");
              proj.stick(p, h.z, 9, 0.05);
              return "stop";
            },
            onWorld(p, w) {
              stickFx(p, w);
              proj.stick(p, null, 12, -0.05);
              return "stop";
            },
          });
        }
        ctx.shake(0.08);
      } else {
        proj.spawn({
          kind: "nail",
          pos: m,
          vel: ctx.launch(m, 90, { spread: 0.012, gravity: 4 }),
          gravity: 4,
          life: 2.5,
          radius: 0.03,
          trail: { span: 0.05, width: 0.01, color: C(0xe8ecf0, 1.1) },
          onHit(p, h) {
            ctx.hit(h.z, F.nailgun.damage, {
              dir: h.dir,
              point: h.point,
              head: h.head,
            });
            proj.stick(p, h.z, 8, 0.03);
            return "stop";
          },
          onWorld(p, w) {
            stickFx(p, w);
            proj.stick(p, null, 10, -0.03);
            return "stop";
          },
        });
      }
      ctx.kick(ctx.b === "a" ? 0.7 : 0.25);
    },
  },

  // ================================================================ 镬气 flamethrower
  flamer: {
    spec: (b) => ({
      kind: "stream",
      mag: 100,
      reload: 2.4,
      tickRate: 20,
      drain: 20,
    }),
    hint: { b: "右键泼出一勺热油" },
    frame(ctx, dt) {
      ctx.E.pilot(ctx.muzzle("pilot"), dt, {
        pal: ctx.b === "a" ? "blue" : "fire",
      });
      if (!ctx.firing) ctx.st.hot = 0;
    },
    stream(ctx, dt) {
      const { E, fx } = ctx;
      const blue = ctx.b === "a";
      const m = ctx.muzzle();
      const dir = ctx.aimFrom(m, blue ? 14 : F.flamer.range);
      ctx.st.hot = (ctx.st.hot || 0) + dt;
      const white = blue && ctx.cap && ctx.st.hot > 2;
      E.flame(
        m,
        dir,
        dt,
        blue
          ? {
              pal: "blue",
              range: 14,
              cone: 0.06,
              rate: 150,
              scale: white ? 1.5 : 1,
            }
          : {
              range: F.flamer.range,
              cone: F.flamer.cone,
              rate: ctx.b === "b" ? 120 : 110,
            },
      );
      if (blue) {
        // the lance itself: a tight blue-white jet all the way to where it lands
        const w = ctx.world(m, dir, 14);
        const zh = ctx.targets.raycast(m, dir, 14);
        const len = Math.min(14, w ? w.dist : 14);
        const end = m.clone().addScaledVector(dir, len);
        fx.ribbon({
          points: [
            m.clone(),
            m
              .clone()
              .addScaledVector(dir, len * 0.5)
              .add(V(srand(0.03), srand(0.03), 0)),
            end,
          ],
          width: white ? 0.34 : 0.24,
          color: white ? [2.2, 2.6, 3.2] : E.PAL.blue.body,
          core: white ? [5, 5, 5.5] : [2.6, 3.4, 4.5],
          life: 0.05,
          fade: 0.5,
          kind: "fire",
          taper: 0,
        });
        if (zh && Math.random() < 0.6)
          fx.glow({
            pos: zh.point,
            vel: randDir(_b).multiplyScalar(rand(2, 7)),
            life: rand(0.15, 0.4),
            size: [0.01, 0.003],
            color: [E.PAL.blue.spark, E.PAL.blue.end],
            type: P.STREAK,
            stretch: 6,
            gravity: 4,
          });
      }
      ctx.light(
        _a.copy(m).addScaledVector(dir, blue ? 4 : 2.5),
        blue ? 0x4a9cff : 0xff7a22,
        (blue ? 26 : 34) + Math.sin(ctx.t * 31) * 6 + Math.sin(ctx.t * 13) * 5,
        14,
      );
      ctx.shake(0.012);
      // where the stream lands it keeps burning for a moment
      ctx.st.lick = (ctx.st.lick || 0) - dt;
      if (ctx.st.lick <= 0) {
        ctx.st.lick = 0.09;
        const w = ctx.world(m, dir, blue ? 14 : 9);
        if (w) {
          for (let i = 0; i < 2; i++)
            fx.glow({
              pos: _a.copy(w.point).add(_b.set(srand(0.4), 0.05, srand(0.4))),
              vel: _c
                .copy(w.normal)
                .multiplyScalar(rand(0.8, 2))
                .add(V(0, rand(0.5, 1.5), 0)),
              life: rand(0.4, 0.9),
              size: [0.12, rand(0.4, 0.7)],
              color: blue
                ? [E.PAL.blue.core, E.PAL.blue.end]
                : [E.PAL.fire.core, E.PAL.fire.end],
              alpha: 0.6,
              type: P.FLAME,
              gravity: -1.5,
              drag: 1.2,
              turb: 2,
            });
          if (Math.random() < 0.3)
            fx.decal({
              kind: "scorch",
              pos: w.point,
              normal: w.normal,
              size: rand(0.7, 1.3),
              life: 14,
              alpha: 0.5,
            });
        }
      }
    },
    tick(ctx) {
      const blue = ctx.b === "a";
      const m = ctx.muzzle();
      const dir = ctx.aimFrom(m, blue ? 14 : F.flamer.range);
      const white = blue && ctx.cap && ctx.st.hot > 2;
      ctx.st.n = (ctx.st.n || 0) + 1;
      for (const h of ctx.targets.inCone(
        ctx.aim.origin,
        dir,
        blue ? 14 : F.flamer.range,
        blue ? 0.07 : F.flamer.cone,
      )) {
        let d = F.flamer.damage * (blue ? 1.2 : 1);
        if (blue && h.z.st.burn > 0) d *= 1.4;
        // 泼油: whoever stands in the oil takes the flame that much harder
        if (
          ctx.b === "b" &&
          (ctx.st.pools || []).some(
            (p) =>
              !p.done &&
              Math.hypot(p.pos.x - h.z.pos.x, p.pos.z - h.z.pos.z) < p.radius,
          )
        )
          d *= 1.6;
        if (white && h.z.type === "brute") d *= 1.65;
        ctx.hit(h.z, d, {
          dir: dir.clone(),
          element: "fire",
          blood: false,
          kind: "stream",
          noChain: true,
        });
        if (ctx.st.n % 5 === 0) ctx.targets.apply(h.z, "fire");
      }
    },
    alt(ctx, phase) {
      if (ctx.b !== "b" || phase !== "down" || ctx.rounds < 10) return;
      const { fx, E, proj } = ctx;
      ctx.consume(10);
      const m = ctx.muzzle();
      ctx.kick(0.6);
      proj.spawn({
        kind: "oil",
        pos: m,
        vel: ctx.aim.dir
          .clone()
          .multiplyScalar(13)
          .add(V(0, 4.5, 0)),
        gravity: 9.8,
        life: 4,
        radius: 0.1,
        tumble: 6,
        trail: { span: 0.3, width: 0.12, color: C(0xff7a1a, 3), kind: "fire" },
        onTick(p, dt) {
          if (Math.random() < 70 * dt)
            fx.glow({
              pos: p.pos,
              vel: _a.set(srand(0.6), rand(0.2, 1), srand(0.6)),
              life: rand(0.25, 0.5),
              size: [0.1, rand(0.25, 0.4)],
              color: [E.PAL.fire.core, E.PAL.fire.end],
              alpha: 0.7,
              type: P.FLAME,
              gravity: -1,
            });
          if (Math.random() < 30 * dt)
            fx.puff({
              pos: p.pos,
              vel: _a.set(srand(0.4), rand(-1.5, 0), srand(0.4)),
              life: 0.6,
              size: rand(0.012, 0.025),
              color: C(0x8a4a08, 1.5),
              alpha: 0.9,
              type: P.DROP,
              gravity: 9.8,
              ground: true,
            });
        },
        onHit(p, h) {
          land(h.z.pos.clone());
          return "stop";
        },
        onWorld(p, w) {
          land(w.point.clone());
          return "stop";
        },
      });
      const land = (pos) => {
        pos.y = 0;
        E.explosion(pos.clone().setY(0.3), {
          radius: 1.6,
          smoke: 0.6,
          shake: 0.15,
          sparks: 26,
        });
        for (let i = 0; i < 26; i++) {
          const a = rand(6.28);
          fx.puff({
            pos: pos.clone().setY(0.2),
            vel: _a.set(
              Math.cos(a) * rand(1, 5),
              rand(1, 4),
              Math.sin(a) * rand(1, 5),
            ),
            life: rand(0.5, 0.9),
            size: rand(0.015, 0.035),
            color: C(0xff8a18, 3),
            alpha: 1,
            type: P.DROP,
            gravity: 9.8,
            ground: true,
          });
        }
        splash(ctx, pos, 2.2, 60, {
          element: "fire",
          status: "fire",
          stacks: 2,
          knock: 0.3,
        });
        const pools = (ctx.st.pools = (ctx.st.pools || []).filter(
          (p) => !p.done,
        ));
        pools.push(fireRing(ctx, pos, 2, 6, 38));
        // capstone 火烧街: the pool creeps towards whoever is near it
        if (ctx.cap) {
          let last = pos.clone(),
            grown = 0;
          ctx.fx.task(6, () => {
            const z = ctx.targets.nearest(last, 3.2);
            if (z && z.pos.distanceTo(last) > 1.6 && grown < 5) {
              grown++;
              last = z.pos.clone();
              pools.push(fireRing(ctx, last, 1.6, 4, 38));
            }
          });
        }
      };
    },
  },

  // ================================================================ 满堂红 firework battery
  firework: {
    spec: (b) =>
      b === "b"
        ? { kind: "gun", rpm: 60, mag: 4, reload: 2.6, charge: 0.6, kick: 2.2 }
        : {
            kind: "gun",
            rpm: b === "a" ? 150 : 100,
            mag: b === "a" ? 19 : 6,
            reload: 2.6,
            kick: 0.9,
          },
    hint: { b: "按住蓄力，松开发射" },
    fire(ctx) {
      const { E, fx, proj } = ctx;
      const n = ctx.b === "a" ? 19 : 6;
      const tube = ctx.b === "b" ? "muzzle" : "m" + (ctx.shots % n);
      const m = ctx.muzzle(tube);
      const back = _c.copy(ctx.aim.dir).negate();
      // launch: a shower of gold sparks out of the tube and grey powder smoke
      fx.glow({
        pos: m,
        life: 0.09,
        size: [0.08, 0.4],
        color: C(0xfff0c0, 8),
        type: P.GLOW,
        fadePow: 1,
      });
      for (let i = 0; i < 26; i++)
        fx.glow({
          pos: m,
          vel: coneDir(ctx.aim.dir, 0.5, _b).multiplyScalar(rand(3, 16)),
          life: rand(0.2, 0.7),
          size: [0.012, 0.004],
          color: [C(0xffe6a0, 8), C(0xff6a10, 2)],
          type: P.STREAK,
          stretch: 6,
          drag: 3,
          gravity: 5,
          ground: true,
        });
      for (let i = 0; i < 6; i++)
        fx.puff({
          pos: m,
          vel: coneDir(i < 3 ? ctx.aim.dir : back, 0.7, _b).multiplyScalar(
            rand(0.6, 2.4),
          ),
          life: rand(1, 2),
          size: [0.06, rand(0.35, 0.6)],
          color: [C(0xb8b0a4, 0.7), C(0x5a5650, 0.4)],
          alpha: 0.3,
          type: P.SMOKE,
          drag: 2,
          gravity: -0.3,
          turb: 1,
        });
      fx.flash(m, 0xffb060, 40, 0.12, 9);
      const burst = (pos, o = {}) => {
        const pal = o.colors || pick(FW_PALETTES);
        E.firework(pos, {
          colors: pal,
          radius: o.radius ?? 3.6,
          count: o.count ?? 125,
          kind: o.kind || pick(["peony", "peony", "ring", "willow"]),
          crackle: o.crackle,
        });
        if (o.blast !== false)
          E.explosion(pos, {
            radius: (o.radius ?? 3.6) * 0.4,
            smoke: 0.5,
            sparks: 0,
            shake: 0.1,
            scorch: pos.y < 1.5,
          });
      };
      const sparkTrail = (p, dt, col = 0xffd27a, rate = 150) => {
        const k = Math.floor(rate * dt + Math.random());
        for (let i = 0; i < k; i++)
          fx.glow({
            pos: p.pos,
            vel: _a
              .copy(p.vel)
              .multiplyScalar(-0.12)
              .add(_b.set(srand(1.3), srand(1.3), srand(1.3))),
            life: rand(0.25, 0.7),
            size: [0.014, 0.004],
            color: [C(col, 7), C(0xff5a10, 1.5)],
            type: P.STREAK,
            stretch: 4,
            drag: 2,
            gravity: 4,
            fadePow: 0.7,
          });
        if (Math.random() < 40 * dt)
          fx.puff({
            pos: p.pos,
            life: rand(0.7, 1.3),
            size: [0.05, rand(0.2, 0.34)],
            color: C(0xb0aaa0, 0.6),
            alpha: 0.2,
            type: P.SMOKE,
            gravity: -0.2,
            spin: srand(1),
          });
        fx.glow({
          pos: p.pos,
          life: 0.05,
          size: 0.16,
          color: C(col, 5),
          type: P.GLOW,
          fadeIn: 0,
          fadePow: 0.5,
        });
      };
      if (ctx.b === "b") {
        // 冲天炮: one big shell, bigger the longer it was held
        const c = 0.4 + 0.6 * ctx.charge;
        fx.flash(m, 0xffb060, 110, 0.2, 14);
        for (let i = 0; i < 40; i++)
          fx.glow({
            pos: m,
            vel: coneDir(ctx.aim.dir, 0.35, _b).multiplyScalar(rand(6, 26)),
            life: rand(0.3, 0.9),
            size: [0.016, 0.005],
            color: [C(0xffe6a0, 9), C(0xff6a10, 2)],
            type: P.STREAK,
            stretch: 7,
            drag: 2.6,
            gravity: 5,
            ground: true,
          });
        ctx.shake(0.35);
        ctx.kick(2.2);
        const go = (pos) => {
          const pal = pick(FW_PALETTES);
          burst(pos, {
            colors: [...pal, 0xffffff],
            radius: 6.5 * c,
            count: Math.round(260 * c),
            kind: "willow",
            crackle: true,
            blast: false,
          });
          E.explosion(pos, { radius: 4.2 * c, shake: 0.7 });
          fx.after(0.18, () =>
            E.firework(pos.clone().add(V(0, 0.4, 0)), {
              colors: [pal[1], 0xffffff],
              radius: 4.4 * c,
              count: 90,
              kind: "ring",
            }),
          );
          splash(ctx, pos, 7 * c * (ctx.cap ? 1.5 : 1), 420 * c, {
            self: F.firework.self,
            selfMax: F.firework.selfMax,
            element: "fire",
            status: "fire",
            stacks: 2,
            knock: 2,
            lift: 4,
          });
          for (const h of ctx.targets.inSphere(pos, 12))
            ctx.targets.scare(h.z, 2);
        };
        proj.spawn({
          kind: "shell",
          pos: m,
          // (lobbed: it heads for where the crosshair is and falls short of it, as a mortar does)
          vel: ctx.launch(m, 30 + 14 * ctx.charge),
          gravity: 6,
          life: 2.2,
          radius: 0.12,
          tumble: 9,
          trail: { span: 0.5, width: 0.2, color: C(0xff8a2a, 4), kind: "fire" },
          onTick: (p, dt) => sparkTrail(p, dt, 0xffe0a0, 260),
          onHit: (p, h) => (go(h.point.clone()), "stop"),
          onWorld: (p, w) => (
            go(w.point.clone().addScaledVector(w.normal, 0.3)),
            "stop"
          ),
          onExpire: (p) => go(p.pos.clone()),
        });
        return;
      }
      ctx.kick(0.9);
      ctx.shake(0.1);
      // (甲: nineteen thin tubes, a smaller rocket in each)
      const small = ctx.b === "a" ? 0.6 : 1;
      const direct = (p, h) => {
        ctx.hit(h.z, F.firework.damage * small, {
          dir: h.dir,
          point: h.point,
          head: h.head,
          element: "fire",
        });
        boom(h.point.clone());
        return "stop";
      };
      const boom = (pos) => {
        burst(pos);
        splash(ctx, pos, F.firework.radius, F.firework.splash * small, {
          self: F.firework.self,
          selfMax: F.firework.selfMax,
          element: "fire",
          status: "fire",
          knock: 1.2,
        });
      };
      const rocket = proj.spawn({
        kind: "rocket",
        pos: m,
        vel: ctx.launch(m, 38, { spread: 0.02, gravity: 1.2 }),
        gravity: 1.2,
        life: ctx.b === "a" ? 12 / 38 : 1.25,
        radius: 0.06,
        spin: 14,
        wobble: 0.016,
        trail: { span: 0.35, width: 0.09, color: C(0xff8a2a, 4), kind: "fire" },
        onTick: (p, dt) => sparkTrail(p, dt),
        onHit: direct,
        onWorld: (p, w) => (
          boom(w.point.clone().addScaledVector(w.normal, 0.25)),
          "stop"
        ),
        onExpire(p) {
          if (ctx.b !== "a") return boom(p.pos.clone());
          // 万花筒: split into six seeking stars
          const pos = p.pos.clone();
          fx.glow({
            pos,
            life: 0.12,
            size: [0.2, 1.1],
            color: C(0xffffff, 8),
            type: P.STAR,
            fadePow: 1,
          });
          fx.flash(pos, 0xffe0a0, 40, 0.15, 10);
          const taken = new Set();
          for (let i = 0; i < 6; i++) {
            const pal = FW_PALETTES[(i + ctx.shots) % FW_PALETTES.length];
            const dir = coneDir(_a.copy(p.vel).normalize(), 0.9, V());
            proj.spawn({
              kind: null,
              pos,
              vel: dir.multiplyScalar(17),
              gravity: 0.6,
              life: 1.5,
              radius: 0.12,
              trail: { span: 0.3, width: 0.07, color: C(pal[0], 5) },
              homing: {
                turn: 5,
                delay: 0.08,
                acquire() {
                  const c = ctx.targets
                    .inSphere(pos, 24)
                    .filter((h) => !taken.has(h.z));
                  const z = c.length ? pick(c.slice(0, 4)).z : null;
                  if (z) taken.add(z);
                  return z;
                },
              },
              onTick: (q, dt) => sparkTrail(q, dt, pal[0], 70),
              onHit(q, h) {
                star(h.point.clone(), pal);
                return "stop";
              },
              onWorld: (q, w) => (
                star(w.point.clone().addScaledVector(w.normal, 0.2), pal),
                "stop"
              ),
              onExpire: (q) => star(q.pos.clone(), pal),
            });
          }
        },
      });
      const star = (pos, pal) => {
        E.firework(pos, { colors: pal, radius: 1.9, count: 50, kind: "peony" });
        splash(ctx, pos, 1.8, 40, {
          self: F.firework.self,
          selfMax: F.firework.selfMax,
          element: "fire",
          status: "fire",
          knock: 0.5,
        });
        // capstone 火树银花: silver rain keeps falling for three seconds
        if (ctx.cap) {
          fx.task(3, (k, dt) => {
            for (let i = 0; i < Math.floor(60 * dt + Math.random()); i++)
              fx.glow({
                pos: _a.set(
                  pos.x + srand(1.6),
                  pos.y + rand(0.5, 1.6),
                  pos.z + srand(1.6),
                ),
                vel: _b.set(srand(0.3), rand(-3, -1), srand(0.3)),
                life: rand(0.5, 1),
                size: [0.02, 0.005],
                color: C(0xf0f6ff, rand(4, 9)),
                type: P.STAR,
                gravity: 3,
                fadePow: 0.5,
              });
          });
          ctx.zone({
            pos: V(pos.x, 0, pos.z),
            radius: 1.8,
            life: 3,
            dps: 12,
            status: "fire",
            every: 0.6,
            element: "fire",
          });
        }
      };
      return rocket;
    },
  },

  // ================================================================ 霓虹 arc gun
  arc: {
    spec: () => ({
      kind: "stream",
      mag: 100,
      reload: 2.0,
      tickRate: 10,
      drain: 10,
    }),
    hint: { b: "按住右键蓄力，松开放出球状闪电" },
    frame(ctx, dt) {
      // a lazy arc between the electrodes shows the thing is live
      ctx.st.idle = (ctx.st.idle || 0) - dt;
      if (ctx.st.idle <= 0 && !ctx.firing) {
        ctx.st.idle = rand(0.25, 0.9);
        ctx.fx.bolt(ctx.muzzle("e0"), ctx.muzzle("e1"), {
          width: 0.012,
          life: 0.08,
          forks: 0,
          flicker: 2,
          detail: 3,
          amp: 0.25,
          color: C(0x8fe0ff, 3),
        });
      }
    },
    targetsOf(ctx) {
      // the arc grabs whatever is nearest the crosshair, then jumps on from there
      const jumps = ctx.b === "a" ? 6 : F.arc.chain;
      const first = ctx.targets
        .inCone(ctx.aim.origin, ctx.aim.dir, F.arc.range, 0.16)
        .sort((p, q) => ctx.angleTo(p.z.chest) - ctx.angleTo(q.z.chest))[0];
      if (!first) return [];
      const chain = [first.z];
      const seen = new Set(chain);
      for (let i = 0; i < jumps; i++) {
        const n = ctx.targets.nearest(chain[chain.length - 1].pos, 6, seen);
        if (!n) break;
        chain.push(n);
        seen.add(n);
      }
      return chain;
    },
    stream(ctx, dt) {
      const { fx, E } = ctx;
      const m = ctx.muzzle();
      ctx.st.zap = (ctx.st.zap || 0) - dt;
      ctx.shake(0.008);
      ctx.light(m, 0x6fd8ff, 16 + Math.random() * 14, 8);
      if (ctx.st.zap > 0) return;
      ctx.st.zap = 0.045;
      const chain = BEHAVIOURS.arc.targetsOf(ctx);
      ctx.st.chain = chain;
      fx.bolt(ctx.muzzle("e0"), ctx.muzzle("e1"), {
        width: 0.02,
        life: 0.06,
        forks: 0,
        flicker: 1,
        detail: 3,
        amp: 0.3,
      });
      fx.glow({
        pos: m,
        life: 0.07,
        size: [0.03, 0.1],
        color: E.PAL.shock.core,
        type: P.STAR,
        fadePow: 1,
      });
      const cols = [C(0xff3b8d, 3.5), C(0x35e0ff, 3.5), C(0xa86bff, 3.5)];
      if (!chain.length) {
        // nothing to grab: the arc gropes forward and earths itself
        const w = ctx.world(ctx.aim.origin, ctx.aim.dir, 12);
        const end = w
          ? w.point
          : _a
              .copy(m)
              .addScaledVector(ctx.aim.dir, 7)
              .add(randDir(_b).multiplyScalar(1.2))
              .clone();
        fx.bolt(m, end, {
          width: 0.05,
          life: 0.07,
          forks: 2,
          flicker: 1,
          amp: 0.09,
          color: pick(cols),
        });
        if (w) {
          fx.glow({
            pos: w.point,
            life: 0.08,
            size: [0.06, 0.3],
            color: E.PAL.shock.core,
            type: P.STAR,
          });
          for (let i = 0; i < 3; i++)
            fx.glow({
              pos: w.point,
              vel: coneDir(w.normal, 1, _b).multiplyScalar(rand(1, 6)),
              life: rand(0.15, 0.4),
              size: [0.007, 0.003],
              color: [E.PAL.shock.spark, E.PAL.shock.end],
              type: P.STREAK,
              stretch: 6,
              gravity: 7,
            });
        }
        return;
      }
      let from = m;
      chain.forEach((z, i) => {
        fx.bolt(from, z.chest, {
          width: i ? 0.05 : 0.085,
          life: 0.075,
          forks: i ? 1 : 2,
          flicker: 1,
          amp: i ? 0.12 : 0.045,
          color: i ? pick(cols) : [0.5, 1.6, 3.0],
        });
        fx.glow({
          pos: z.chest,
          life: 0.08,
          size: [0.12, 0.5],
          color: E.PAL.shock.core,
          type: P.STAR,
          fadePow: 1,
        });
        if (Math.random() < 0.5)
          fx.glow({
            pos: z.chest,
            vel: randDir(_b).multiplyScalar(rand(2, 7)),
            life: rand(0.15, 0.4),
            size: [0.008, 0.003],
            color: [E.PAL.shock.spark, E.PAL.shock.end],
            type: P.STREAK,
            stretch: 6,
            gravity: 6,
          });
        from = z.chest;
      });
      ctx.light(chain[0].chest, 0x6fd8ff, 30, 9, 1);
    },
    tick(ctx) {
      const chain = ctx.st.chain || [];
      ctx.st.n = (ctx.st.n || 0) + 1;
      chain.forEach((z, i) => {
        if (!z.alive) return;
        const before = z.alive;
        ctx.hit(z, F.arc.damage * (ctx.b === "a" ? 1 + 0.1 * i : 1), {
          dir: _a.subVectors(z.chest, ctx.aim.origin).normalize().clone(),
          element: "shock",
          blood: false,
          kind: "stream",
          noChain: true,
        });
        if (ctx.st.n % 10 === 0 && i === 0) ctx.targets.apply(z, "shock");
        // 甲 capstone 万家灯火: the dead stand as pylons for three seconds
        if (ctx.b === "a" && ctx.cap && before && !z.alive) {
          const at = z.chest.clone();
          ctx.fx.task(3, (k, dt) => {
            if (Math.random() < 5 * dt) {
              const n = ctx.targets.nearest(at, 5);
              if (n) {
                ctx.fx.bolt(at, n.chest, {
                  width: 0.05,
                  life: 0.1,
                  color: C(0xff3b8d, 3.5),
                });
                ctx.hit(n, 12, {
                  dir: _a.subVectors(n.chest, at).normalize().clone(),
                  element: "shock",
                  blood: false,
                  kind: "stream",
                  noChain: true,
                });
              }
              ctx.fx.glow({
                pos: at,
                life: 0.12,
                size: [0.2, 0.7],
                color: ctx.E.PAL.shock.core,
                type: P.STAR,
              });
            }
          });
        }
      });
    },
    alt(ctx, phase, dt) {
      if (ctx.b !== "b") return;
      const { fx, E, proj } = ctx;
      const st = ctx.st;
      if (phase === "down") st.ball = 0;
      else if (phase === "hold") {
        st.ball = Math.min(1, (st.ball || 0) + dt / 1.1);
        ctx.setCharge(st.ball);
        const m = ctx.muzzle();
        fx.glow({
          pos: m,
          life: 0.05,
          size: 0.03 + st.ball * 0.07,
          color: [0.5 + st.ball, 1.2 + st.ball * 1.5, 2 + st.ball * 2],
          type: P.GLOW,
          fadeIn: 0,
          fadePow: 0.4,
        });
        if (Math.random() < (10 + st.ball * 40) * dt)
          fx.bolt(
            m,
            _a
              .copy(m)
              .add(randDir(_b).multiplyScalar(0.08 + st.ball * 0.14))
              .clone(),
            {
              width: 0.008,
              life: 0.07,
              forks: 0,
              flicker: 1,
              detail: 3,
              amp: 0.4,
            },
          );
        ctx.shake(0.01 * st.ball);
      } else if (phase === "up") {
        const c = st.ball || 0;
        ctx.setCharge(0);
        st.ball = 0;
        if (c < 0.35 || ctx.rounds < 25) return;
        ctx.consume(25);
        ctx.kick(1.3);
        ctx.shake(0.2);
        const m = ctx.muzzle();
        fx.flash(m, 0x8fe0ff, 60, 0.15, 10);
        const light = fx.hold(m, 0x6fd8ff, 40, 12);
        let zap = 0,
          trailT = 0;
        const pop = (pos) => {
          light && light.release();
          E.explosion(pos, { radius: 3, pal: "shock", smoke: 0.4 });
          for (let i = 0; i < 9; i++)
            fx.bolt(
              pos,
              pos.clone().add(randDir(V()).multiplyScalar(rand(1.5, 3.5))),
              { width: 0.07, life: rand(0.12, 0.3), forks: 2 },
            );
          fx.decal({
            kind: "field",
            pos: V(pos.x, 0, pos.z),
            size: 7,
            color: [0.25, 0.9, 1.6],
            life: 1.2,
            hold: 0.2,
          });
          splash(ctx, pos, 4.5, 160, {
            element: "shock",
            status: "shock",
            knock: 1.2,
          });
        };
        proj.spawn({
          kind: null,
          pos: m,
          vel: ctx.launch(m, 6.5),
          life: 6,
          radius: 0.35,
          onTick(p, dt) {
            E.orb(p.pos, dt, 0.32 + 0.1 * c);
            if (light) light.light.position.copy(p.pos);
            zap -= dt;
            if (zap <= 0) {
              zap = 0.16;
              for (const h of ctx.targets.inSphere(p.pos, 5)) {
                fx.bolt(p.pos, h.z.chest, { width: 0.05, life: 0.1, forks: 1 });
                ctx.hit(h.z, 28, {
                  dir: _a.subVectors(h.z.chest, p.pos).normalize().clone(),
                  element: "shock",
                  blood: false,
                  kind: "stream",
                  noChain: true,
                });
                ctx.targets.apply(h.z, "shock");
              }
            }
            // capstone 雷池: the ground stays live where the ball has passed
            trailT -= dt;
            if (ctx.cap && trailT <= 0) {
              trailT = 0.35;
              const g = V(p.pos.x, 0, p.pos.z);
              fx.decal({
                kind: "field",
                pos: g,
                size: 3.2,
                color: [0.2, 0.7, 1.3],
                life: 4,
                hold: 0.7,
              });
              ctx.zone({
                pos: g,
                radius: 1.6,
                life: 4,
                dps: 48,
                status: "shock",
                every: 1.5,
                element: "shock",
              });
            }
          },
          onHit: () => "pierce",
          onWorld: (p, w) => (
            pop(w.point.clone().addScaledVector(w.normal, 0.4)),
            "stop"
          ),
          onExpire: (p) => pop(p.pos.clone()),
        });
      }
    },
  },

  // ================================================================ 诸葛 repeating crossbow
  crossbow: {
    spec: () => ({
      kind: "gun",
      smokeless: true,
      rpm: 300,
      mag: 10,
      reload: 1.5,
      kick: 0.35,
      auto: true,
    }),
    fire(ctx) {
      const { fx, E, proj } = ctx;
      const m = ctx.muzzle();
      // no powder: just the slap of the string and a wisp of dust
      fx.puff({
        pos: m,
        vel: _a.copy(ctx.aim.dir).multiplyScalar(1.5),
        life: 0.3,
        size: [0.02, 0.1],
        color: C(0xc8c0b0, 0.7),
        alpha: 0.18,
        type: P.SMOKE,
        drag: 5,
      });
      const common = {
        pos: m,
        vel: ctx.launch(m, 70, { spread: 0.006, gravity: 5 }),
        gravity: 5,
        life: 3,
        radius: 0.04,
      };
      const thud = (w) => {
        fx.puff({
          pos: w.point,
          vel: _b.copy(w.normal).multiplyScalar(0.8),
          life: 0.5,
          size: [0.03, 0.16],
          color: C(0x8a8478, 0.7),
          alpha: 0.3,
          type: P.SMOKE,
          drag: 3,
        });
        for (let i = 0; i < 3; i++)
          fx.puff({
            pos: w.point,
            vel: coneDir(w.normal, 1, _b).multiplyScalar(rand(1, 3)),
            life: 0.6,
            size: rand(0.006, 0.014),
            color: C(0x6a645a, 0.8),
            type: P.SHARD,
            gravity: 9.8,
            ground: true,
            spin: srand(12),
          });
      };
      if (ctx.b === "a") {
        const boom = (pos) => {
          E.explosion(pos, { radius: 1.7, smoke: 0.6, shake: 0.14 });
          splash(ctx, pos, 2.5, 22, {
            element: "fire",
            status: "fire",
            knock: 0.8,
          });
        };
        proj.spawn({
          ...common,
          kind: "firebolt",
          trail: {
            span: 0.14,
            width: 0.03,
            color: C(0xff8a2a, 3.5),
            kind: "fire",
          },
          onTick: (p, dt) => E.embers(p.pos, dt, 90),
          onHit(p, h) {
            ctx.hit(h.z, 30, {
              dir: h.dir,
              point: h.point,
              head: h.head,
              headMul: F.crossbow.head,
            });
            const rec = proj.stick(p, h.z, 0.6, 0.08);
            const z = h.z;
            fx.task(
              0.6,
              (k, dt) =>
                rec &&
                rec.obj.parent &&
                E.embers(rec.obj.getWorldPosition(_a), dt, 80),
            );
            // capstone 火牛阵: the burning one bolts into the others before it blows
            if (ctx.cap) ctx.targets.scare(z, 0.6);
            fx.after(0.6, () =>
              boom(
                rec && rec.obj.parent ? rec.obj.getWorldPosition(V()) : h.point,
              ),
            );
            return "stop";
          },
          onWorld(p, w) {
            thud(w);
            const at = w.point.clone();
            proj.stick(p, null, 0.6, -0.06);
            fx.task(0.6, (k, dt) => E.embers(at, dt, 80));
            fx.after(0.6, () => boom(at.addScaledVector(w.normal, 0.15)));
            return "stop";
          },
        });
      } else if (ctx.b === "b") {
        proj.spawn({
          ...common,
          kind: "sealbolt",
          trail: { span: 0.12, width: 0.02, color: C(0xffc23a, 2.5) },
          onHit(p, h) {
            ctx.hit(h.z, 36, {
              dir: h.dir,
              point: h.point,
              head: h.head,
              headMul: F.crossbow.head,
              element: "seal",
            });
            proj.stick(p, h.z, 10, 0.08);
            ctx.targets.apply(h.z, "seal");
            BEHAVIOURS.crossbow.tether(ctx, h.z);
            return "stop";
          },
          onWorld(p, w) {
            thud(w);
            proj.stick(p, null, 12, -0.06);
            return "stop";
          },
        });
      } else {
        proj.spawn({
          ...common,
          kind: "bolt",
          trail: { span: 0.08, width: 0.012, color: C(0xe8e4d8, 0.9) },
          onHit(p, h) {
            ctx.hit(h.z, F.crossbow.damage, {
              dir: h.dir,
              point: h.point,
              head: h.head,
              headMul: F.crossbow.head,
            });
            proj.stick(p, h.z, 10, 0.08);
            return "stop";
          },
          onWorld(p, w) {
            thud(w);
            proj.stick(p, null, 12, -0.06);
            return "stop";
          },
        });
      }
      ctx.kick(0.35);
    },
    // 符矢: red threads between marked targets; a hit on one is shared with the others
    tether(ctx, z) {
      const st = ctx.st;
      st.marked = (st.marked || []).filter(
        (m) => m.z.alive && m.until > ctx.t && m.z !== z,
      );
      const max = ctx.cap ? 5 : 2;
      st.marked.push({ z, until: ctx.t + 8 });
      while (st.marked.length > max) st.marked.shift();
      st.threads = st.threads || [];
      for (const m of st.marked) {
        if (m.z === z || m.z.pos.distanceTo(z.pos) > 6) continue;
        const a = m.z,
          b = z;
        if (
          st.threads.some(
            (t) => (t.a === a && t.b === b) || (t.a === b && t.b === a),
          )
        )
          continue;
        const pts = [V(), V(), V()];
        const link = { a, b, until: ctx.t + 8 };
        st.threads.push(link);
        ctx.fx.ribbon({
          points: pts,
          width: 0.035,
          color: C(0xff2a18, 3.5),
          core: [6, 2, 1.2],
          life: 8,
          fade: 0.2,
          update(r) {
            const ok =
              a.alive &&
              b.alive &&
              link.until > ctx.t &&
              a.pos.distanceTo(b.pos) < 9;
            if (!ok) {
              if (!link.cut) {
                link.cut = true;
                // capstone 天罗: when the thread snaps everyone still tied is held fast
                if (ctx.cap)
                  for (const z2 of [a, b])
                    if (z2.alive) ctx.targets.pin(z2, 2.5, "seal");
              }
              r.age = r.life;
              return;
            }
            r.pts[0].p.copy(a.chest);
            r.pts[2].p.copy(b.chest);
            r.pts[1].p.lerpVectors(a.chest, b.chest, 0.5).y -=
              0.12 + 0.03 * Math.sin(ctx.t * 9);
          },
        });
      }
    },
    onDamage(ctx, ev) {
      // called for every hit on any zombie while this weapon is out
      const st = ctx.st;
      if (!st.threads || ev.kind === "share" || ev.dmg <= 0) return;
      for (const t of st.threads) {
        if (t.cut || t.until < ctx.t) continue;
        const other = t.a === ev.z ? t.b : t.b === ev.z ? t.a : null;
        if (other && other.alive) {
          ctx.targets.damage(other, ev.dmg * 0.5, {
            element: "seal",
            kind: "share",
            noChain: true,
          });
          ctx.fx.glow({
            pos: other.chest,
            life: 0.1,
            size: [0.1, 0.4],
            color: C(0xff3a20, 4),
            type: P.STAR,
          });
        }
      }
    },
  },

  // ================================================================ 敕令 talismans
  talisman: {
    spec: () => ({
      kind: "gun",
      smokeless: true,
      rpm: 180,
      mag: 12,
      reload: 0,
      regen: 0.45,
      kick: 0.25,
      auto: true,
    }),
    fire(ctx) {
      const { fx, E, proj } = ctx;
      const m = ctx.muzzle();
      const pal = ctx.b === "a" ? "shock" : ctx.b === "b" ? "fire" : "seal";
      const col =
        ctx.b === "a"
          ? C(0x6fb0ff, 4)
          : ctx.b === "b"
            ? C(0xff5a20, 4)
            : C(0xffc23a, 4);
      fx.glow({
        pos: m,
        life: 0.16,
        size: [0.02, 0.1],
        color: col,
        type: P.RING,
        fadePow: 1,
      });
      fx.glow({
        pos: m,
        life: 0.1,
        size: [0.02, 0.07],
        color: E.PAL[pal].core,
        type: P.GLOW,
        fadePow: 1,
      });
      for (let i = 0; i < 6; i++)
        fx.glow({
          pos: m,
          vel: randDir(_b).multiplyScalar(rand(0.3, 1.5)),
          life: rand(0.3, 0.7),
          size: [0.012, 0.003],
          color: col,
          type: P.GLOW,
          drag: 2,
        });
      fx.flash(m, E.PAL[pal].light, 10, 0.12, 5);
      const want = ctx.targets
        .inCone(ctx.aim.origin, ctx.aim.dir, 40, 0.2)
        .sort((p, q) => ctx.angleTo(p.z.headPos) - ctx.angleTo(q.z.headPos))[0];
      proj.spawn({
        kind:
          ctx.b === "a"
            ? "talisman_a"
            : ctx.b === "b"
              ? "talisman_b"
              : "talisman",
        pos: m,
        vel: ctx.launch(m, 26, { spread: 0.01 }),
        life: 2.2,
        radius: 0.09,
        flutter: 0.22,
        trail: { span: 0.22, width: 0.05, color: col },
        homing: want
          ? { target: want.z, turn: 3.2, head: true, delay: 0.05 }
          : null,
        onTick(p, dt) {
          if (Math.random() < 50 * dt)
            fx.glow({
              pos: p.pos,
              vel: _a.set(srand(0.4), srand(0.4), srand(0.4)),
              life: rand(0.3, 0.6),
              size: [0.014, 0.003],
              color: col,
              type: P.GLOW,
              drag: 1,
            });
        },
        onHit(p, h) {
          const z = h.z;
          ctx.hit(z, F.talisman.damage, {
            dir: h.dir,
            point: h.point,
            head: h.head,
            element: pal === "seal" ? "seal" : pal,
            blood: false,
          });
          const wasPinned = z.pin > 0 && z.pinKind === "seal";
          ctx.targets.apply(z, "seal");
          const pinnedNow =
            z.alive && !wasPinned && z.pin > 0 && z.pinKind === "seal";
          if (ctx.b === "a" && pinnedNow) {
            // 雷符: sealing a target calls the thunder down on it
            const strike = (target, n) => {
              const pos = target.pos.clone();
              E.lightning(pos, { radius: 4 });
              let killed = false;
              const seen = new Set();
              for (const s of ctx.targets.inSphere(V(pos.x, 1, pos.z), 4)) {
                seen.add(s.z);
                if (
                  ctx.hit(s.z, 90, {
                    dir: _a
                      .subVectors(s.z.chest, pos)
                      .setY(0.3)
                      .normalize()
                      .clone(),
                    element: "shock",
                    blood: false,
                    noChain: true,
                    kind: "blast",
                    knock: s.z === target ? 0 : 0.8,
                  })
                )
                  killed = true;
                ctx.targets.apply(s.z, "shock");
              }
              // capstone 五雷轰顶: a kill brings down the next bolt
              if (ctx.cap && killed && n < 4) {
                const next = ctx.targets.nearest(pos, 14, seen);
                if (next) fx.after(0.22, () => strike(next, n + 1));
              }
            };
            fx.after(0.25, () => z.alive && strike(z, 0));
          }
          if (ctx.b === "b") {
            // 火符: the paper smoulders for a second, then goes up as a ring of fire
            fx.task(
              1,
              (k, dt) => z.alive && E.embers(z.headPos, dt, 40 + k * 120),
            );
            fx.after(1, () => {
              const pos = z.pos.clone();
              if (z.alive) ctx.targets.apply(z, "fire", 1);
              E.explosion(pos.clone().setY(0.6), {
                radius: 1.4,
                smoke: 0.4,
                shake: 0.1,
                scorch: false,
              });
              fx.decal({
                kind: "ring",
                pos,
                size: 6.5,
                color: C(0xff5a20, 4),
                life: 0.5,
                hold: 0,
              });
              // one ring where one is burning already: it burns on, not twice as hot
              const life = ctx.cap ? 8 : 4;
              const rings = (ctx.st.rings = (ctx.st.rings || []).filter(
                (r) => !r.done,
              ));
              const lit = rings.find((r) => r.pos.distanceTo(pos) < 2);
              if (!lit) rings.push(fireRing(ctx, pos, 3, life, 6));
              else {
                // (flames for the time added, and not a new set for every charm)
                const left = lit.life - lit.age;
                if (left < life - 1) ctx.E.firePool(lit.pos, 3, life - left);
                lit.life = lit.age + life;
              }
            });
          }
          return "stop";
        },
        onWorld(p, w) {
          E.seal(w.point.clone().addScaledVector(w.normal, 0.1), {
            pal,
            size: 0.5,
            scraps: 3,
          });
          return "stop";
        },
      });
      ctx.kick(0.25);
    },
  },

  // ================================================================ 金钱剑 coin sword
  coinsword: {
    spec: () => ({
      kind: "melee",
      swingTime: 0.5,
      hitAt: 0.36,
      reach: 2.9,
      arc: 1.05,
      combo: 3,
      trail: { color: [1.3, 0.75, 0.12], core: [2.6, 2.0, 0.9] },
    }),
    hint: { b: "按住右键蓄力，松开斩出剑气" },
    swing(ctx, n) {
      const { fx, E, proj } = ctx;
      const last = n === 2;
      let any = false;
      for (const h of ctx.targets.inCone(
        ctx.aim.origin,
        ctx.aim.dir,
        F.coinsword.reach,
        1.05,
      )) {
        any = true;
        const dir = _a
          .subVectors(h.z.chest, ctx.aim.origin)
          .setY(0)
          .normalize()
          .clone();
        ctx.hit(h.z, F.coinsword.damage * (last ? 1.5 : 1), {
          dir,
          cut: true,
          point: h.z.chest,
          element: "seal",
          knock: last ? 1.2 : 0.4,
          stagger: 0.3,
        });
        E.slashHit(h.z.chest, dir);
        E.coinSpark(h.z.chest);
        if (last) ctx.targets.apply(h.z, "seal");
      }
      ctx.shake(any ? 0.16 : 0.04);
      if (ctx.b === "a") {
        // 散钱: every swing flings coins off the blade
        const count = last && ctx.cap ? 15 : 5;
        const from = ctx.muzzle("tip");
        const right = _c.crossVectors(ctx.aim.dir, UP).normalize().clone();
        for (let i = 0; i < count; i++) {
          const k = (i / (count - 1) - 0.5) * 2;
          const dir = ctx.aim.dir
            .clone()
            .addScaledVector(right, k * 0.42 * (n === 1 ? -1 : 1))
            .add(V(0, 0.06 + srand(0.04), 0))
            .normalize();
          proj.spawn({
            kind: "coin",
            pos: _a
              .copy(ctx.aim.origin)
              .addScaledVector(ctx.aim.dir, 0.9)
              .addScaledVector(right, k * 0.5)
              .add(V(0, -0.15, 0))
              .lerp(from, 0.3),
            vel: dir.multiplyScalar(26),
            gravity: 3,
            life: 2,
            radius: 0.06,
            tumble: 40,
            bounce: 0.8,
            trail: { span: 0.12, width: 0.022, color: C(0xffd060, 3) },
            homing:
              last && ctx.cap
                ? {
                    turn: 6,
                    delay: 0.1,
                    acquire: (p) => ctx.targets.nearest(p.pos, 14),
                  }
                : null,
            onHit(p, h) {
              ctx.hit(h.z, last && ctx.cap ? 10 : 20, {
                dir: h.dir,
                point: h.point,
                head: h.head,
                element: "seal",
              });
              E.coinSpark(h.point);
              if (Math.random() < 0.35) ctx.targets.apply(h.z, "seal");
              return "stop";
            },
            onWorld(p, w) {
              E.coinSpark(w.point);
              if (p.bounces >= 1) return "stop";
              // one ricochet, steered at the nearest target
              const z = ctx.targets.nearest(w.point, 12);
              if (z) {
                const sp = p.vel.length();
                p.vel
                  .subVectors(z.chest, w.point)
                  .normalize()
                  .multiplyScalar(sp * 1.25);
                p.vel.addScaledVector(
                  w.normal,
                  -2 * Math.min(0, p.vel.dot(w.normal)) + 0.01,
                );
                p.bounces++;
                p.pos.addScaledVector(w.normal, 0.03);
                return "continue";
              }
              return "bounce";
            },
          });
        }
      }
    },
    alt(ctx, phase, dt) {
      if (ctx.b !== "b") return;
      const { fx, E, proj } = ctx;
      const st = ctx.st;
      if (phase === "down") st.qi = 0;
      else if (phase === "hold") {
        st.qi = Math.min(1, (st.qi || 0) + dt / 0.9);
        ctx.setCharge(st.qi);
        const tip = ctx.muzzle("tip"),
          base = ctx.muzzle("base");
        if (Math.random() < (20 + 60 * st.qi) * dt) {
          const p = _a.lerpVectors(base, tip, Math.random()).clone();
          fx.glow({
            pos: p,
            vel: _b.set(srand(0.3), rand(0.2, 0.9), srand(0.3)),
            life: rand(0.3, 0.6),
            size: [0.016, 0.004],
            color: C(0xffd060, 4),
            type: P.GLOW,
            drag: 1,
          });
        }
        if (st.qi >= 1)
          fx.glow({
            pos: tip,
            life: 0.05,
            size: 0.045,
            color: [2.4, 1.9, 0.8],
            type: P.STAR,
            fadeIn: 0,
            fadePow: 0.3,
          });
      } else if (phase === "up") {
        const c = st.qi || 0;
        st.qi = 0;
        ctx.setCharge(0);
        if (c < 0.5) return;
        ctx.swingNow(2);
        fx.after(0.16, () => {
          ctx.shake(0.3);
          const wave = (dir, scale, split) => {
            fx.flash(
              ctx.aim.origin.clone().addScaledVector(dir, 2),
              0xffc23a,
              50,
              0.2,
              12,
            );
            const life = 20 / 32;
            const right = V().crossVectors(dir, UP).normalize();
            const N = 13;
            const tilt = 0.5 * (Math.random() < 0.5 ? 1 : -1);
            const pts = Array.from({ length: N }, () => V());
            // the wave is a slanted arc bulging forward; drawn as a ribbon so it faces the shooter
            const shape = (c) => {
              for (let i = 0; i < N; i++) {
                const a = (i / (N - 1) - 0.5) * 2.3;
                pts[i]
                  .copy(c)
                  .addScaledVector(right, Math.sin(a) * scale)
                  .addScaledVector(UP, Math.sin(a) * scale * tilt)
                  .addScaledVector(dir, (Math.cos(a) - 1) * scale * 0.9);
              }
            };
            const p = proj.spawn({
              kind: null,
              pos: ctx.aim.origin
                .clone()
                .addScaledVector(dir, 1.2)
                .add(V(0, -0.3, 0)),
              vel: dir.clone().multiplyScalar(32),
              life,
              radius: 1.2 * (scale / 1.7),
              onTick(q, dt) {
                shape(q.pos);
                for (let i = 0; i < Math.floor(160 * dt + Math.random()); i++)
                  fx.glow({
                    pos: _a.copy(pts[(Math.random() * N) | 0]),
                    vel: _b
                      .set(srand(1.5), rand(-0.5, 2), srand(1.5))
                      .addScaledVector(dir, -4),
                    life: rand(0.2, 0.55),
                    size: [0.012, 0.004],
                    color: [
                      [3.5, 2.6, 0.9],
                      [1.6, 0.4, 0.03],
                    ],
                    type: P.STREAK,
                    stretch: 5,
                    drag: 2,
                    gravity: 3,
                  });
                if (Math.random() < 30 * dt)
                  fx.decal({
                    kind: "scorch",
                    pos: V(q.pos.x, 0.02, q.pos.z),
                    size: 0.5,
                    life: 6,
                    alpha: 0.35,
                    color: [0.03, 0.02, 0.01],
                  });
              },
              onHit(q, h) {
                const pinned = h.z.pin > 0 && h.z.pinKind === "seal";
                ctx.hit(h.z, 130 * c, {
                  dir: h.dir,
                  point: h.point,
                  element: "seal",
                  knock: 1,
                });
                E.slashHit(h.point, h.dir);
                ctx.targets.apply(h.z, "seal", 2);
                // capstone 一剑开: a sealed target splits the wave in three
                if (ctx.cap && pinned && split) {
                  for (const a of [-0.45, 0.45])
                    wave(
                      V(
                        dir.x * Math.cos(a) - dir.z * Math.sin(a),
                        dir.y,
                        dir.x * Math.sin(a) + dir.z * Math.cos(a),
                      ),
                      scale * 0.75,
                      false,
                    );
                }
                return "pierce";
              },
              onWorld(q, w) {
                E.impact(w, { pal: "seal", scale: 2.5 });
                fx.decal({
                  kind: "scorch",
                  pos: w.point,
                  normal: w.normal,
                  size: 1.6,
                  life: 12,
                  alpha: 0.5,
                });
                return w.surface === "ground" ? "bounce" : "stop";
              },
            });
            p.bounce = 1;
            shape(p.pos);
            for (const [w, col, core, al] of [
              [0.34 * scale, [1.5, 0.95, 0.15], [3.2, 2.6, 1.3], 1],
              [1.1 * scale, [0.5, 0.26, 0.03], [0.9, 0.6, 0.15], 0.5],
            ]) {
              fx.ribbon({
                points: pts,
                width: w,
                color: col,
                core,
                alpha: al,
                life,
                fade: 0.5,
                ends: true,
                update(r) {
                  if (p.dead) return void (r.age = r.life);
                  for (let i = 0; i < N; i++) r.pts[i].p.copy(pts[i]);
                },
              });
            }
          };
          wave(ctx.aim.dir.clone(), 1.7, true);
        });
      }
    },
  },

  // ================================================================ 青龙 guandao
  guandao: {
    spec: (b) => ({
      kind: "melee",
      swingTime: 0.95,
      hitAt: 0.42,
      reach: 3.7,
      arc: 1.5,
      combo: 2,
      heavy: true,
      trail:
        b === "a"
          ? { color: [1.6, 0.4, 0.04], core: [2.8, 1.5, 0.4], kind: "fire" }
          : { color: [0.15, 0.9, 0.6], core: [1.6, 2.4, 2.0] },
    }),
    hint: { a: "按住右键拖刀蓄势，松开上挑", b: "右键掷出回旋刀" },
    swing(ctx, n, o = {}) {
      const { fx, E } = ctx;
      let any = false;
      const up = !!o.uppercut;
      for (const h of ctx.targets.inCone(
        ctx.aim.origin,
        ctx.aim.dir,
        up ? 4.2 * (o.wide || 1) : F.guandao.reach,
        up ? 0.8 * (o.wide || 1) : 1.5,
      )) {
        any = true;
        const dir = _a
          .subVectors(h.z.chest, ctx.aim.origin)
          .setY(0)
          .normalize()
          .clone();
        ctx.hit(h.z, F.guandao.damage * (up ? 1.5 : 1), {
          dir,
          cut: true,
          point: h.z.chest,
          element: ctx.b === "a" ? "fire" : undefined,
          knock: up ? 1 : 2,
          stagger: 0.6,
          lift: up ? 6.5 : 0,
        });
        E.slashHit(h.z.chest, up ? UP : dir, {
          pal: ctx.b === "a" ? "fire" : "none",
        });
        if (ctx.b === "a") ctx.targets.apply(h.z, "fire", up ? 2 : 1);
        if (up) ctx.st.dragHits = (ctx.st.dragHits || 0) + 1;
      }
      ctx.shake(any ? 0.34 : 0.1);
      // the swing kicks spray and grit off the wet ground
      const g = ctx.aim.origin
        .clone()
        .addScaledVector(_a.copy(ctx.aim.dir).setY(0).normalize(), 2.2)
        .setY(0.03);
      for (let i = 0; i < 10; i++)
        fx.puff({
          pos: _b.copy(g).add(V(srand(1.2), 0, srand(0.6))),
          vel: V(srand(2), rand(0.5, 2.5), srand(2)),
          life: rand(0.4, 0.8),
          size: [0.05, rand(0.2, 0.4)],
          color: C(0x9aa4b4, 0.6),
          alpha: 0.22,
          type: P.SMOKE,
          drag: 2.5,
        });
      if (up) {
        // 上挑: a wall of fire runs forward along the ground
        const f = _a.copy(ctx.aim.dir).setY(0).normalize().clone();
        for (let i = 0; i < 9; i++) {
          fx.after(i * 0.035, () => {
            const p = ctx.aim.origin
              .clone()
              .addScaledVector(f, 1.5 + i * 0.9)
              .setY(0.05);
            for (let k = 0; k < 6; k++)
              fx.glow({
                pos: _b.copy(p).add(V(srand(0.35), 0, srand(0.35))),
                vel: V(srand(0.6), rand(3, 7), srand(0.6)),
                life: rand(0.3, 0.6),
                size: [0.2, rand(0.6, 1.1)],
                color: [E.PAL.fire.core, E.PAL.fire.end],
                alpha: 0.8,
                type: P.FLAME,
                gravity: -2,
                drag: 2.5,
                turb: 2,
              });
            for (let k = 0; k < 4; k++)
              fx.glow({
                pos: p,
                vel: V(srand(3), rand(3, 9), srand(3)),
                life: rand(0.4, 0.9),
                size: [0.012, 0.004],
                color: [E.PAL.fire.spark, E.PAL.fire.end],
                type: P.STREAK,
                stretch: 6,
                gravity: 8,
                ground: true,
              });
            fx.decal({
              kind: "scorch",
              pos: p.clone().setY(0),
              size: 1.3,
              life: 14,
              alpha: 0.6,
            });
            if (i % 3 === 0) fx.flash(p.clone().setY(1), 0xff7a22, 40, 0.2, 9);
          });
        }
        ctx.zone({
          pos: ctx.aim.origin.clone().addScaledVector(f, 5).setY(0),
          radius: 4,
          life: 0.5,
          dps: 40,
          status: "fire",
          every: 0.4,
          element: "fire",
        });
      }
    },
    alt(ctx, phase, dt) {
      const { fx, E } = ctx;
      const st = ctx.st;
      if (ctx.b === "a") {
        if (phase === "down") st.drag = 0;
        else if (phase === "hold") {
          st.drag = Math.min(1, (st.drag || 0) + dt / 0.8);
          ctx.setCharge(st.drag);
          ctx.pose("drag", st.drag);
          // the blade point scrapes the road: sparks and a line of fire
          const tip = ctx.muzzle("tip");
          const g = V(tip.x, 0.02, tip.z);
          for (let i = 0; i < Math.floor(90 * dt + Math.random()); i++)
            fx.glow({
              pos: g,
              vel: V(srand(2.5), rand(0.5, 3.5), rand(0, 3)),
              life: rand(0.2, 0.6),
              size: [0.01, 0.003],
              color: [C(0xfff0c0, 8), C(0xff5a10, 2)],
              type: P.STREAK,
              stretch: 6,
              gravity: 9,
              ground: true,
            });
          if (Math.random() < 22 * dt)
            fx.glow({
              pos: g,
              vel: V(srand(0.3), rand(0.8, 1.8), srand(0.3)),
              life: rand(0.3, 0.6),
              size: [0.08, rand(0.2, 0.4)],
              color: [E.PAL.fire.core, E.PAL.fire.end],
              alpha: 0.7,
              type: P.FLAME,
              gravity: -1.2,
            });
          ctx.light(g.clone().setY(0.4), 0xff7a22, 14 + st.drag * 20, 6);
          ctx.shake(0.006 + 0.012 * st.drag);
        } else if (phase === "up") {
          const c = st.drag || 0;
          st.drag = 0;
          ctx.setCharge(0);
          ctx.pose(null);
          if (c < 0.45) return;
          // capstone 过五关: five drag hits widen the next uppercut
          const wide = ctx.cap && (st.dragHits || 0) >= 5 ? 2 : 1;
          if (wide > 1) st.dragHits = 0;
          ctx.swingNow(9, { uppercut: true, wide });
          // the line the blade point scraped catches: a strip of fire on the road in front of the cut
          const f = V(ctx.aim.dir.x, 0, ctx.aim.dir.z).normalize();
          for (const d of [1.6, 3.4])
            fireRing(
              ctx,
              V(ctx.aim.origin.x, 0, ctx.aim.origin.z).addScaledVector(f, d),
              1.2 * wide,
              3,
              14,
            );
        }
        return;
      }
      if (ctx.b !== "b" || phase !== "down" || st.thrown) return;
      // 偃月: the blade leaves the hands, spins out fifteen metres and comes home
      st.thrown = true;
      const bonus = { n: 0 };
      ctx.throwWeapon({
        distance: 15,
        time: 1.5,
        onPass(z, dir) {
          const reach = ctx.cap ? 1 + 0.2 * bonus.n : 1;
          const killed = ctx.hit(z, F.guandao.damage * 0.6 * reach, {
            dir,
            point: z.chest,
            knock: 0.8,
            stagger: 0.5,
          });
          E.slashHit(z.chest, dir, { pal: "none" });
          if (killed) bonus.n++;
        },
        extra: () => (ctx.cap ? bonus.n * 3 : 0),
        onTick(pos, dt) {
          if (Math.random() < 60 * dt)
            fx.glow({
              pos: _a.copy(pos).add(V(srand(0.8), srand(0.1), srand(0.8))),
              vel: V(srand(1), rand(0, 1), srand(1)),
              life: rand(0.2, 0.5),
              size: [0.012, 0.003],
              color: C(0x9affd8, 4),
              type: P.GLOW,
            });
          ctx.light(pos, 0x5affc0, 16, 7);
        },
        onReturn() {
          st.thrown = false;
          ctx.kick(0.9);
          ctx.shake(0.12);
        },
      });
    },
  },

  // ================================================================ the game's own two guns
  // LK-9 carbine and LK-4 sidearm, as the test bench fires them, so that they can sit the
  // same test as the weapons above. The game builds and fires them itself (src/game.js); both
  // go by one table and one set of rules, src/chinatown/stockguns.js: the cone of fire and how
  // sustained fire opens it, what a round does at a distance and to the head, how many of the
  // dead it goes through. Only finding what a round reaches is each side's own (the game's
  // zombies and walls, the bench's). (The cone is theirs, not data/feel.js's: that table is the
  // arsenal weapons' handling.)
  rifle: stockGun("rifle"),
  pistol: stockGun("pistol"),
};

// One of the game's own guns as a behaviour (see the end of BEHAVIOURS).
function stockGun(id) {
  const G = STOCK_GUNS[id];
  return {
    spec: () => ({
      kind: "gun",
      rpm: G.rpm,
      mag: G.mag,
      // (the test empties the magazine before it reloads, so the longer of the two)
      reload: G.reload.empty,
      auto: G.auto,
      // one pull of the trigger, one round: the bench's bot pulls no faster than a hand
      semi: !G.auto,
      // no forks: it climbs by the level table's `bare` column, as it does in a run
      forkless: true,
      kick: id === "rifle" ? 0.45 : 0.8,
    }),
    frame(ctx, dt) {
      ctx.st.bloom = bloomAfter(G.spread, ctx.st.bloom || 0, dt);
    },
    fire(ctx) {
      const st = ctx.st;
      ctx.E.muzzle(ctx.muzzle(), ctx.aim.dir, {
        scale: id === "rifle" ? 0.9 : 0.8,
        sparks: 3,
        smoke: 1,
        light: 20,
      });
      // (the bench's shooter stands still on the ground, from the hip)
      const dir = coneDir(
        ctx.aim.dir,
        coneOf(G.spread, { bloom: st.bloom || 0 }),
        V(),
      );
      st.bloom = bloomAfterShot(G.spread, st.bloom || 0);
      ctx.hitscan({
        dir,
        range: G.range,
        pierce: G.pierce,
        // the level and the seasonings are the controller's (W.mul), as for every weapon
        damage: (z, dist) => roundDamage(G, G.damage, dist),
        headMul: G.head,
        tracer: { width: 0.018, color: C(0xffd9a0, 3) },
        impact: { scale: 0.7 },
      });
      ctx.kick(id === "rifle" ? 0.45 : 0.8);
    },
  };
}
