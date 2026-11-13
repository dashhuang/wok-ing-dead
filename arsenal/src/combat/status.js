// What the weapons do to the dead: damage, the four status effects, the reactions between
// them and the elemental seasonings. This is the only copy of those rules. The firing range
// (targets.js) and the game (src/chinatown/armtargets.js) both run it; each only supplies its
// own zombies — how one is found by a ray, how it takes the damage, how it moves and dies.
//
//   fire  灼烧: burns over time, stacks, spreads when the host dies
//   shock 感电: the next hit arcs to the nearest others
//   venom 蚀骨: more damage taken per stack, leaves a cloud
//   seal  镇压: enough stacks pin the zombie in place
//   fire + venom = 爆燃, shock + venom = 导电雾, seal + fire = 焚符, seal + shock = 引雷
//
// A zombie, as seen from here (the range's own object, or the game's "mark" on one of its
// zombies), carries: alive, type ("walker" | "brute"), rank ("" | "elite" | "boss" | ...),
// maxHp, radius, pos, chest, headPos, feet, vel, lift, liftV, stagger, pin, pinKind, fear,
// flash, burnAcc and st { burn, burnT, shock, venom, venomT, seal, sealT }.
import * as THREE from "three";
import { C, rand, srand } from "../fx/core.js";
import { STATUS } from "../data/status.js";
import { fateOf } from "./fate.js";

export { STATUS };

const NO_RANK = {};
const fresh = () => ({
  burn: 0,
  burnT: 0,
  shock: 0,
  venom: 0,
  venomT: 0,
  seal: 0,
  sealT: 0,
});

/** The fields the rules keep on a zombie, cleared (a new zombie, or a pooled one come back). */
export function clearStatus(z) {
  if (z.st) Object.assign(z.st, fresh());
  else z.st = fresh();
  z.pin = 0;
  z.pinKind = "";
  z.fear = 0;
  z.flash = 0;
  z.lift = 0;
  z.liftV = 0;
  z.burnAcc = 0;
  z.blow = 0; // what has landed on it in the last instant (a pattern of shot is one blow)
  z.blowT = 0;
  z.vel && z.vel.set(0, 0, 0);
  return z;
}

/**
 * host: {
 *   list            the zombies in play (an array the host keeps up to date)
 *   fx, E           the effects runtime and the named effects
 *   hurt(z, dmg, o, direct, fate) -> true if that killed it. `fate` is what becomes of the
 *     body if it did (combat/fate.js: how it is thrown, what comes off it), null for a hit
 *     that is not a blow (a burn). Takes the health off, shows the blood,
 *                   plays the death; on a death it calls rules.died(z).
 *   rng()           optional; Math.random otherwise
 *   onReaction(name, z)   optional
 * }
 */
export function createStatus(host) {
  const { fx, E } = host;
  const S = STATUS;
  const R = S.reactions;
  const rng = host.rng || Math.random;
  const listeners = { damage: [], kill: [], attack: [] };
  const _a = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _c = new THREE.Vector3(),
    _d = new THREE.Vector3();
  const rankOf = (z) => S.rank[z.rank] || NO_RANK;
  const brute = (z, k) => (z.type === "brute" ? S.brute[k] : 1);
  const sealed = (z) => z.pin > 0 && z.pinKind === "seal";
  let dealing = null; // options of the hit being dealt right now, for the death that may follow
  let infusions = []; // the elemental seasonings in force
  let hits = 0;

  const say = (z, text, element) => {
    for (const f of listeners.damage)
      f({ z, dmg: 0, at: z.headPos, text, element, kind: "status" });
  };

  const api = {
    STATUS,
    on(ev, fn) {
      listeners[ev].push(fn);
    },
    /** Tell whoever keeps score (the range's meter, the HUD) about something. */
    emit(ev, data) {
      for (const f of listeners[ev]) f(data);
    },
    alive() {
      return host.list.filter((z) => z.alive);
    },
    inSphere(p, r, skip = null) {
      const out = [];
      for (const z of host.list) {
        if (!z.alive || (skip && skip.has(z))) continue;
        const d = Math.hypot(z.pos.x - p.x, z.pos.z - p.z);
        if (d <= r + z.radius && Math.abs(z.chest.y - p.y) < r + 1.2)
          out.push({ z, dist: d });
      }
      return out.sort((a, b) => a.dist - b.dist);
    },
    /** Zombies inside a cone from o along d (half angle in radians). */
    inCone(o, d, range, half) {
      const out = [];
      const cos = Math.cos(half);
      for (const z of host.list) {
        if (!z.alive) continue;
        _a.subVectors(z.chest, o);
        const dist = _a.length();
        if (dist > range + z.radius) continue;
        // widen by the body's angular size so near targets are not missed
        const ang = Math.atan2(z.radius + 0.25, Math.max(0.5, dist));
        const c = _a.dot(d) / Math.max(1e-4, dist);
        if (c >= Math.cos(half + ang) || c >= cos) out.push({ z, dist });
      }
      return out.sort((a, b) => a.dist - b.dist);
    },
    nearest(p, r, skip = null) {
      const l = api.inSphere(p, r, skip);
      return l.length ? l[0].z : null;
    },

    /**
     * damage(z, amount, { dir, point, head, element, kind, knock, launch, cut, lift, stagger, noChain, blood, pinBonus })
     * cut: a blade's stroke (what it kills it takes a piece off).
     * launch: the force the hit throws the body with if it kills (as a knock-back; `knock` if absent).
     * element only colours the number; statuses are applied with apply().
     * kind: "hit" (default) | "stream" | "dot" | "share" | "blast" | "chain" | "react".
     * Returns true when this hit killed the target.
     */
    damage(z, amount, o = {}) {
      if (!z.alive) return false;
      let dmg = amount;
      if (z.st.venom > 0) dmg *= 1 + S.venom.taken * z.st.venom;
      if (sealed(z) && o.head) dmg *= S.seal.head;
      if (z.pin > 0 && z.pinKind === "nail" && o.pinBonus) dmg *= o.pinBonus;
      dmg = Math.max(1, Math.round(dmg));
      z.flash = 1;
      const at = o.point || z.chest;
      for (const f of listeners.damage)
        f({
          z,
          dmg,
          at,
          head: !!o.head,
          element: o.element || "none",
          kind: o.kind || "hit",
        });
      const direct = !!o.dir && o.kind !== "dot";
      if (direct && z.pin <= 0) {
        const k = (o.knock || 0) * brute(z, "knock");
        if (k > 0)
          z.vel.addScaledVector(
            _b.set(o.dir.x, 0, o.dir.z).normalize(),
            k * 4.2,
          );
        if (o.lift) z.liftV = Math.max(z.liftV, o.lift * brute(z, "lift"));
        if (o.stagger || k > 0.6)
          z.stagger = Math.max(
            z.stagger,
            (o.stagger || 0.35) * brute(z, "stagger"),
          );
      }
      // 感电: this hit arcs to the nearest others
      const chain = z.st.shock > 0 && !o.noChain && o.kind !== "dot";
      if (chain) z.st.shock = 0;
      dealing = o;
      // (the blow: this hit and whatever landed with it. A body's fate goes by the blow)
      if (direct) {
        z.blow = (z.blowT > 0 ? z.blow : 0) + dmg;
        z.blowT = S.launch.window;
      }
      const killed =
        host.hurt(
          z,
          dmg,
          o,
          direct,
          direct ? fateOf(z, o, z.blow, rng) : null,
        ) === true;
      dealing = null;
      if (chain) {
        let from = z;
        const seen = new Set([z]);
        for (let i = 0; i < S.shock.jumps; i++) {
          const n = api.nearest(from.pos, S.shock.range, seen);
          if (!n) break;
          seen.add(n);
          fx.bolt(from.chest, n.chest, { width: 0.08, life: 0.16 });
          fx.glow({
            pos: n.chest,
            life: 0.12,
            size: [0.2, 0.9],
            color: E.PAL.shock.core,
            type: fx.P.STAR,
            fadePow: 1,
          });
          fx.flash(n.chest, 0x6fd8ff, 22, 0.12, 7);
          api.damage(n, amount * S.shock.share, {
            dir: _c.subVectors(n.chest, from.chest).normalize().clone(),
            element: "shock",
            noChain: true,
            blood: false,
            kind: "chain",
          });
          from = n;
        }
      }
      if (!killed && api.counts(o.kind)) api.struck(z, { head: !!o.head });
      return killed;
    },
    /** Does a hit of this kind count as one of the player's own (for the seasonings)? */
    counts(kind) {
      return (
        kind !== "dot" &&
        kind !== "share" &&
        kind !== "blast" &&
        kind !== "chain" &&
        kind !== "react"
      );
    },
    /** A push without damage (the shotgun's pellets shove once for the whole pattern). */
    push(z, dir, knock) {
      if (!z.alive || z.pin > 0) return;
      z.vel.addScaledVector(
        _a.set(dir.x, 0, dir.z).normalize(),
        knock * 4.2 * brute(z, "knock"),
      );
      z.stagger = Math.max(z.stagger, 0.35 * brute(z, "stagger"));
    },

    /** Apply a status. apply(z, "fire" | "shock" | "venom" | "seal", stacks = 1) */
    apply(z, element, stacks = 1) {
      if (!z.alive) return;
      const s = z.st;
      const held = s.seal > 0 || sealed(z);
      if (element === "fire") {
        if (held) return react(z, "焚符");
        if (s.venom > 0) return react(z, "爆燃");
        s.burn = Math.min(S.burn.max, s.burn + stacks);
        s.burnT = S.burn.time;
      } else if (element === "shock") {
        if (held) return react(z, "引雷");
        if (s.venom > 0) react(z, "导电雾");
        s.shock = S.shock.time;
      } else if (element === "venom") {
        if (s.burn > 0) return react(z, "爆燃");
        s.venom = Math.min(S.venom.max, s.venom + stacks);
        s.venomT = S.venom.time;
        if (s.shock > 0) react(z, "导电雾");
      } else if (element === "seal") {
        if (sealed(z)) {
          z.pin = Math.max(z.pin, S.seal.pin * S.seal.repin);
          return;
        }
        s.seal = Math.min(S.seal.max, s.seal + stacks);
        s.sealT = S.seal.time;
        E.seal(z.headPos, { size: 0.6, scraps: 2 });
        if (s.seal >= S.seal.max) api.pin(z, S.seal.pin, "seal");
      }
    },
    /** Hold a zombie in place. kind "seal" (talisman, ritual circle) or "nail". */
    pin(z, time, kind = "seal") {
      if (!z.alive) return;
      const t = time * (rankOf(z).pin ?? 1);
      z.pin = Math.max(z.pin, t);
      z.pinKind = kind;
      z.vel.set(0, 0, 0);
      if (kind === "seal") {
        z.st.seal = 0;
        E.circle(z.pos, {
          size: z.type === "brute" ? 2.6 : 2.0,
          life: t,
          follow: z.pos,
        });
        E.seal(z.headPos, { size: 1.1, glyph: "鎮", scraps: 6 });
        say(z, "鎮壓", "seal");
      }
    },
    /** Make a zombie run away for a moment (firework shell). */
    scare(z, time) {
      if (z.alive && z.pin <= 0 && rankOf(z).scare !== false)
        z.fear = Math.max(z.fear, time);
    },

    // ---------------------------------------------------------------- seasonings
    /**
     * The elemental seasonings in force: [{ element, every }] lands the status on every
     * n-th hit, [{ element, chance }] on a hit to the head with that chance.
     */
    setInfusions(list) {
      infusions = list || [];
    },
    get infusions() {
      return infusions;
    },
    /** One of the player's own hits landed on z and did not kill it. */
    struck(z, o = {}) {
      if (!infusions.length) return;
      hits++;
      for (const s of infusions) {
        const now = s.every
          ? hits % s.every === 0
          : !!o.head && rng() < (s.chance ?? 1);
        if (now) api.apply(z, s.element);
      }
    },

    // ---------------------------------------------------------------- once a frame, per zombie
    /** Timers and the burn of a living zombie. May kill it (check z.alive afterwards). */
    tick(z, dt) {
      const s = z.st;
      if (s.burn > 0) {
        s.burnT -= dt;
        z.burnAcc += s.burn * S.burn.dps * dt;
        if (z.burnAcc >= S.burn.tick) {
          const d = Math.floor(z.burnAcc);
          z.burnAcc -= d;
          api.damage(z, d, { element: "fire", kind: "dot", noChain: true });
        }
        if (s.burnT <= 0) s.burn = 0;
      }
      if (!z.alive) return;
      if (z.blowT > 0) z.blowT -= dt;
      if (s.shock > 0) s.shock -= dt;
      if (s.venom > 0 && (s.venomT -= dt) <= 0) s.venom = 0;
      if (s.seal > 0 && (s.sealT -= dt) <= 0) s.seal = 0;
      if (z.pin > 0) z.pin = Math.max(0, z.pin - dt);
      z.fear = Math.max(0, z.fear - dt);
      if (z.lift > 0 || z.liftV > 0) {
        z.liftV -= 12 * dt;
        z.lift = Math.max(0, z.lift + z.liftV * dt);
        if (z.lift === 0) z.liftV = 0;
      }
    },
    /** How many talismans to show on a forehead (0–3). */
    papers(z) {
      return sealed(z) ? S.seal.max : z.st.seal;
    },
    /** How fast a held zombie's animation still runs (1 = not held). */
    heldRate(z) {
      return z.pin > 0 ? (z.pinKind === "seal" ? 0.04 : 0.25) : 1;
    },
    /** Flames, sparks and fumes on a living zombie. */
    visuals(z, dt) {
      const s = z.st;
      if (s.burn > 0) E.burn(z.feet, z.headPos, dt, s.burn);
      if (s.shock > 0) E.shock(z.feet, z.headPos, dt);
      if (s.venom > 0) E.venom(z.feet, z.headPos, dt, s.venom);
      if (sealed(z) && Math.random() < 12 * dt)
        fx.glow({
          pos: _b.set(
            z.pos.x + srand(0.7),
            z.feet.y - 0.05,
            z.pos.z + srand(0.7),
          ),
          vel: _c.set(0, rand(0.6, 1.6), 0),
          life: rand(0.5, 1.1),
          size: [0.012, 0.004],
          color: [E.PAL.seal.spark, E.PAL.seal.end],
          type: fx.P.GLOW,
          fadePow: 0.8,
        });
      z.flash = Math.max(0, z.flash - dt * 7);
    },
    /** A charred corpse smoulders for a moment. `age`: seconds since it died. */
    corpse(z, dt, age) {
      if (z.st.burn > 0 && age < 3)
        E.burn(z.feet, _a.set(z.pos.x, z.feet.y + 0.4, z.pos.z), dt, 1);
      z.flash = Math.max(0, z.flash - dt * 6);
    },
    /**
     * The emissive wash the statuses put over a zombie: white hit flash, orange while burning,
     * blue flicker when shocked, green for venom, gold when sealed. Adds to out [r, g, b] and
     * returns true if there is anything to show.
     */
    wash(z, clock, seed, out) {
      const s = z.st;
      let any = false;
      if (z.flash > 0.01) {
        out[0] += z.flash * 0.04;
        out[1] += z.flash * 0.03;
        out[2] += z.flash * 0.025;
        any = true;
      }
      if (s.burn > 0) {
        const k = 0.05 + 0.02 * s.burn + 0.02 * Math.sin(clock * 17 + seed);
        out[0] += k * 0.4;
        out[1] += k * 0.08;
        any = true;
      }
      if (s.shock > 0 && z.alive) {
        const k = Math.sin(clock * 53 + seed * 3) > 0.3 ? 0.16 : 0.03;
        out[1] += k * 0.6;
        out[2] += k;
        any = true;
      }
      if (s.venom > 0) {
        out[1] += 0.05 * s.venom;
        any = true;
      }
      if (sealed(z)) {
        out[0] += 0.16;
        out[1] += 0.11;
        out[2] += 0.02;
        any = true;
      }
      return any;
    },

    /**
     * A zombie died, whoever caused it (the host calls this once per death): fire jumps to
     * the neighbours, venom leaves its cloud.
     */
    died(z) {
      const o = dealing || {};
      z.pin = 0;
      z.fear = 0;
      for (const f of listeners.kill) f({ z, by: o });
      if (z.st.burn > 0) {
        for (const h of api.inSphere(z.chest, o.spread || S.burn.spread)) {
          if (h.z === z) continue;
          h.z.st.burn = Math.min(
            S.burn.max,
            h.z.st.burn + (o.spreadStacks || S.burn.spreadStacks),
          );
          h.z.st.burnT = S.burn.time;
          fx.ribbon({
            points: [
              z.chest.clone(),
              z.chest
                .clone()
                .lerp(h.z.chest, 0.5)
                .add(new THREE.Vector3(0, 0.5, 0)),
              h.z.chest.clone(),
            ],
            width: 0.12,
            color: E.PAL.fire.body,
            life: 0.3,
            kind: "fire",
          });
        }
      }
      if (z.st.venom > 0)
        E.cloud(z.pos, S.venom.cloud.radius, S.venom.cloud.life);
      if (o.deathBlast && z.st.burn > 0)
        E.explosion(z.chest, { radius: 1.8, smoke: 0.5, shake: 0.12 });
    },
  };

  function react(z, name) {
    const s = z.st;
    say(z, name, "react");
    host.onReaction && host.onReaction(name, z);
    if (name === "爆燃") {
      const r = R.爆燃;
      s.burn = 0;
      s.venom = 0;
      E.explosion(z.chest, { radius: r.radius, pal: "fire" });
      for (const h of api.inSphere(z.chest, r.radius))
        api.damage(h.z, r.damage, {
          dir: _d.subVectors(h.z.chest, z.chest).normalize().clone(),
          element: "fire",
          knock: r.knock,
          noChain: true,
          kind: "blast",
        });
    } else if (name === "导电雾") {
      const r = R.导电雾;
      E.cloud(z.pos, r.cloud.radius, r.cloud.life, {
        color: [C(0x4ad0ff, 0.7), C(0x1a4a6a, 0.4)],
      });
      for (const h of api.inSphere(z.chest, r.radius)) {
        h.z.st.shock = S.shock.time;
        fx.bolt(z.chest, h.z.chest, { width: 0.05, life: 0.14 });
      }
    } else if (name === "焚符") {
      const r = R.焚符;
      s.seal = 0;
      E.seal(z.headPos, {
        pal: "fire",
        glyph: "焚",
        paper: C(0x2a1408, 1),
        scraps: 9,
        size: 1.2,
      });
      for (let i = 0; i < 16; i++)
        fx.glow({
          pos: z.headPos,
          vel: _d.set(srand(1.2), rand(0.5, 2.5), srand(1.2)),
          life: rand(0.4, 0.9),
          size: [0.1, rand(0.3, 0.5)],
          color: [E.PAL.fire.core, E.PAL.fire.end],
          alpha: 0.7,
          type: fx.P.FLAME,
          gravity: -1.5,
          drag: 1.5,
        });
      api.damage(z, z.maxHp * (rankOf(z).焚符 ?? r.share), {
        dir: _d.set(0, 1, 0).clone(),
        element: "fire",
        noChain: true,
        blood: false,
        kind: "react",
      });
      if (z.alive) {
        s.burn = Math.min(S.burn.max, s.burn + r.burn);
        s.burnT = S.burn.time;
      }
    } else if (name === "引雷") {
      const r = R.引雷;
      s.seal = 0;
      E.lightning(z.pos, { radius: r.radius });
      for (const h of api.inSphere(z.chest, r.radius))
        api.damage(h.z, h.z === z ? r.self : r.others, {
          dir: _d.subVectors(h.z.chest, z.chest).setY(0.3).normalize().clone(),
          element: "shock",
          knock: h.z === z ? 0 : r.knock,
          noChain: true,
          blood: false,
          kind: "react",
        });
    }
  }

  return api;
}
