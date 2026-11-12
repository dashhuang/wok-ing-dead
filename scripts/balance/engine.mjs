// A horde against one shooter, without the picture: every zombie is a distance from the
// player, a speed and a health bar; the weapon is a rate of fire, a magazine and a reload.
// Two scenarios run on it: the lab's firing range (lab.mjs, to calibrate against what the
// real weapons were measured to do) and a whole run of the set meal (run.mjs).
//
// What the model leaves out on purpose: the map (cover, corners, being boxed in), aiming as
// a skill of the hand (it is a hit rate), and the weapons' own mechanics beyond what data.mjs
// describes (those are covered by the calibration factor and the measured power of each form).
import { model, HEAD } from "./data.mjs";

/** A small seeded generator, so a simulated run can be repeated exactly. */
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SURROUND = 5; // how many can reach the player at once; the rest wait behind them
const KNOCK = 1.3; // metres a walker is thrown back per unit of a weapon's knock
const MIN_CLOSE = 0.35; // share of its speed a zombie still closes at, however well it is kited

/**
 * opts: { rng, health, regenDelay, regenRate }.
 * The fight is advanced with step(dt, ctx); what happened is in fight.stats and the callbacks
 * onKill(z) and onHurt(damage, z).
 */
export function createFight(opts) {
  const rng = opts.rng;
  const F = {
    t: 0,
    zombies: [],
    player: {
      hp: opts.health,
      maxHp: opts.health,
      alive: true,
      hurtAt: -99,
      regenDelay: opts.regenDelay,
      regenRate: opts.regenRate,
    },
    weapon: null,
    stats: { raw: 0, kills: 0, taken: 0, rounds: 0 },
    onKill: null,
    onHurt: null,
  };
  let nextId = 1;

  /** z: { type, rank, hp, d, speed, damage, reach, swing, hitAt, cool: [a, b], flinch } */
  F.add = (z) => {
    const q = {
      rank: "",
      atk: -1,
      wait: 0.2 + rng() * 0.4,
      hit: false,
      stun: 0,
      pin: 0,
      sleep: 0,
      seal: 0,
      venom: 0,
      hits: 0,
      ...z,
      id: nextId++,
      maxHp: z.hp,
      alive: true,
    };
    F.zombies.push(q);
    return q;
  };

  F.hurtPlayer = (damage, z) => {
    const P = F.player;
    if (!P.alive || damage <= 0) return;
    P.hp -= damage;
    P.hurtAt = F.t;
    F.stats.taken += damage;
    if (F.onHurt) F.onHurt(damage, z);
    if (P.hp <= 0) {
      P.hp = 0;
      P.alive = false;
    }
  };

  /**
   * Take `amount` off a zombie (already multiplied out). Returns true when that killed it.
   * Counted as it is dealt, overkill included, like the lab's meter.
   */
  F.damage = (z, amount) => {
    if (!z.alive || amount <= 0) return false;
    F.stats.raw += amount;
    z.hp -= amount;
    if (z.flinch) z.stun = Math.max(z.stun, z.flinch);
    if (z.hp > 0) return false;
    z.alive = false;
    F.stats.kills++;
    if (F.onKill) F.onKill(z);
    return true;
  };

  /**
   * Take a weapon in hand. w: { id, power, rounds, supply(units) }: power multiplies its
   * damage (level, form, calibration); rounds is what is in the magazine (undefined = full);
   * supply(n) takes up to n rounds out of the pool and returns how many it gave (omitted:
   * the magazine refills from nowhere, as on the range).
   */
  F.wield = (w) => {
    const m = model(w.id);
    F.weapon = {
      ...w,
      m,
      rounds: w.rounds ?? (m.mag === Infinity ? Infinity : m.mag),
      reload: 0,
      acc: 0,
      count: 0, // hits landed, for the seasonings that work every so many
      dry: false,
    };
    return F.weapon;
  };

  const nearest = (reach) => {
    let best = null;
    for (const z of F.zombies)
      if (z.alive && z.sleep <= 0 && z.d <= reach && (!best || z.d < best.d))
        best = z;
    return best;
  };
  // the others one shot also reaches: the closest to the one that was hit
  const others = (z, n, within) =>
    F.zombies
      .filter(
        (o) =>
          o.alive && o.sleep <= 0 && o !== z && Math.abs(o.d - z.d) <= within,
      )
      .sort((a, b) => Math.abs(a.d - z.d) - Math.abs(b.d - z.d))
      .slice(0, n);

  // one hit on one zombie, with everything the seasonings add to it
  function land(z, amount, ctx, head) {
    const W = F.weapon;
    const mods = ctx.mods || {};
    let dmg = amount * W.power * (mods.damage || 1);
    if (head) dmg *= z.pin > 0 ? 1.5 : 1;
    if (z.venom) dmg *= 1 + 0.08 * z.venom;
    W.count++;
    z.hits++;
    const inf = ctx.infusions;
    if (inf) {
      // burn: a stack is worth its damage over time, paid at once
      if (inf.fire && W.count % inf.fire === 0) dmg += inf.burn;
      if (inf.venom && z.hits % inf.venom === 0)
        z.venom = Math.min(5, z.venom + 1);
      if (inf.shock && W.count % inf.shock === 0)
        for (const o of others(z, 2, 5)) F.damage(o, dmg * 0.6);
      if (inf.seal && head && rng() < inf.seal && ++z.seal >= 3) {
        z.seal = 0;
        z.pin = 3 * (z.rank === "boss" ? 0.25 : z.rank === "elite" ? 0.5 : 1);
      }
    }
    // thrown back (a heavy barely moves, see STATUS.brute.knock)
    if (W.m.knock && z.d > 0)
      z.d += W.m.knock * KNOCK * (z.type === "brute" ? 0.35 : 1);
    return F.damage(z, dmg);
  }

  function shoot(z, ctx) {
    const W = F.weapon;
    const m = W.m;
    const skill = ctx.skill;
    if (m.pellets) {
      // the cone is wider than a body from a few metres out: fewer pellets land, and the
      // ones that miss find the neighbours
      const cone = Math.max(0.01, z.d * m.spread);
      const k = 0.42 / cone;
      const on = Math.min(1, Math.max(0.2, k * k));
      land(z, m.damage * m.pellets * on, ctx, false);
      if (on < 1)
        for (const o of others(z, 2, 2.5))
          land(o, (m.damage * m.pellets * (1 - on)) / 2, ctx, false);
      return;
    }
    const far = z.d > m.reach * 0.75 ? 0.85 : 1;
    if (rng() > skill.hit * far) return;
    const headP = Math.min(0.92, skill.head * (m.precise ? skill.precise : 1));
    const head = m.kind !== "melee" && rng() < headP;
    const dmg = m.damage * (head ? m.headMul : 1);
    land(z, dmg, ctx, head);
    if (m.splash)
      for (const o of others(z, 6, m.splash.radius))
        if (rng() < 0.6)
          land(
            o,
            m.splash.damage *
              (1 - 0.5 * (Math.abs(o.d - z.d) / m.splash.radius)),
            ctx,
            false,
          );
    if (m.more)
      for (const o of others(z, m.more, m.kind === "melee" ? 1.6 : 4))
        if (rng() < 0.6) land(o, dmg * m.share, ctx, false);
  }

  function reload(W, ctx) {
    W.reload = W.m.reload / ((ctx.mods && ctx.mods.reload) || 1);
  }
  function fill(W) {
    const want = W.m.mag - W.rounds;
    const got = W.supply ? W.supply(want) : want;
    W.rounds += got;
    W.dry = W.rounds < 1;
  }

  function fire(dt, ctx) {
    const W = F.weapon;
    if (!W) return;
    const m = W.m;
    const rate = m.rate * ((ctx.mods && ctx.mods.rate) || 1) * (ctx.tempo ?? 1);
    if (m.regen && W.rounds < m.mag)
      W.rounds = Math.min(m.mag, W.rounds + dt / m.regen);
    if (W.reload > 0) {
      W.reload -= dt;
      if (W.reload <= 0) fill(W);
      return;
    }
    const z = ctx.fire === false ? null : nearest(m.reach);
    if (!z) {
      W.acc = Math.min(W.acc, 1);
      // a quiet moment: top the magazine up
      if (m.reload && W.rounds < m.mag * 0.5 && !nearest(m.reach * 1.5))
        reload(W, ctx);
      return;
    }
    if (m.kind === "stream") {
      if (W.rounds <= 0) return void (m.reload && reload(W, ctx));
      const ticks = rate * dt;
      W.rounds -= m.drain * dt;
      F.stats.rounds += m.drain * dt;
      const hitP = Math.min(1, ctx.skill.hit + 0.15); // a stream is swept, not aimed
      land(z, m.damage * ticks * hitP, ctx, false);
      for (const o of others(z, m.more, 4))
        land(o, m.damage * ticks * hitP * m.share, ctx, false);
      return;
    }
    W.acc += rate * dt;
    while (W.acc >= 1) {
      if (W.rounds < 1) {
        W.acc = 0;
        if (m.reload) reload(W, ctx);
        else if (!m.regen) fill(W);
        return;
      }
      W.acc -= 1;
      if (m.mag !== Infinity) {
        W.rounds -= 1;
        F.stats.rounds += 1;
      }
      const t = nearest(m.reach);
      if (!t) break;
      shoot(t, ctx);
    }
  }

  /**
   * ctx: {
   *   skill: { hit, head, precise },  hit rate, share of hits to the head, and how much more
   *                                   often a weapon aimed at the head finds it
   *   retreat,   metres per second the player backs away (negative: walks in, for a blade)
   *   flee,      the player has turned and run: the dead slower than `retreat` fall behind
   *   dodge,     share of swings that miss a moving player
   *   mods,      { damage, rate, reload } from the seasonings
   *   infusions, { fire, shock, venom: every n hits; seal: chance; burn: damage of a stack }
   *   fire,      false to hold fire
   *   tempo,     share of the weapon's rate the player keeps up (busy with something else)
   * }
   */
  F.step = (dt, ctx) => {
    F.t += dt;
    const P = F.player;
    const Z = F.zombies;
    // ---- the dead close in; only so many fit around one person
    Z.sort((a, b) => a.d - b.d);
    let around = 0;
    for (const z of Z) {
      if (!z.alive) continue;
      if (z.sleep > 0) {
        // not risen yet (the range's horde comes out a few at a time)
        z.sleep -= dt;
        continue;
      }
      if (z.pin > 0) {
        z.pin -= dt;
        continue;
      }
      const stop = around < SURROUND ? z.reach : z.reach + 0.9;
      if (z.stun > 0) z.stun -= dt;
      else if (ctx.flee && ctx.retreat > z.speed) {
        // the player runs for it and is the faster: the gap opens (half as fast as on open
        // ground: a street has ends)
        z.d += (ctx.retreat - z.speed) * 0.5 * dt;
        z.atk = -1;
      } else if (z.d > stop) {
        const close =
          ctx.retreat > 0
            ? Math.max(z.speed * MIN_CLOSE, z.speed - ctx.retreat)
            : z.speed - (ctx.retreat || 0);
        z.d = Math.max(stop, z.d - close * dt);
      }
      if (z.d > z.reach + 0.05) continue;
      around++;
      if (z.atk < 0) {
        z.wait -= dt;
        if (z.wait <= 0) {
          z.atk = 0;
          z.hit = false;
        }
        continue;
      }
      z.atk += dt;
      if (!z.hit && z.atk >= z.hitAt) {
        z.hit = true;
        if (rng() >= (ctx.dodge || 0)) F.hurtPlayer(z.damage, z);
      }
      if (z.atk >= z.swing) {
        z.atk = -1;
        z.wait = z.cool[0] + rng() * (z.cool[1] - z.cool[0]);
      }
    }
    if (!P.alive) return;
    if (F.t - P.hurtAt > P.regenDelay && P.hp < P.maxHp)
      P.hp = Math.min(P.maxHp, P.hp + P.regenRate * dt);
    fire(dt, ctx);
    // clear the fallen away now and then
    if (Z.length > F.alive() + 8) F.zombies = Z.filter((z) => z.alive);
  };

  F.alive = () => {
    let n = 0;
    for (const z of F.zombies) if (z.alive) n++;
    return n;
  };
  return F;
}

export { HEAD };
