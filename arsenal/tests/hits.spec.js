// What a hit does to the dead: it bleeds, a kill bursts, a forceful kill throws the body, a
// blast of shot shoves harder the closer it is fired, and a heavy takes a share of all that.
// The force is the weapons' rule (combat/status.js, numbers in data/status.js `launch` and
// the shotgun's `shove`); here it is checked on the bench's stand-in zombies.
import { test, expect } from "./fixtures.js";
import { STATUS } from "../src/data/status.js";
import { WEAPONS } from "../src/data/weapons.js";
import { launchOf, bloodOf, goreOf } from "../src/combat/fate.js";

test("the rule: how far and how much go by the blow and by the dice", () => {
  const L = STATUS.launch;
  const B = STATUS.blood;
  const walker = { type: "walker", rank: "", scale: 1, maxHp: 100, pin: 0 };
  const dice = (v) => () => v;
  const shot = { knock: 3.2 };

  // the same hit, the best and the worst of the dice: both throw it, far apart
  const best = launchOf(walker, shot, 100, dice(0.999));
  const worst = launchOf(walker, shot, 100, dice(0));
  expect(best.speed).toBeGreaterThan(worst.speed * 1.8);
  expect(best.up).toBeGreaterThan(worst.up);
  expect(best.speed).toBeLessThanOrEqual(L.max);
  // a blow that only finished it off throws it about half as far as one that took it all
  const whole = launchOf(walker, shot, 100, dice(0.5));
  const scrap = launchOf(walker, shot, 5, dice(0.5));
  expect(scrap.speed).toBeLessThan(whole.speed * 0.6);
  expect(scrap.speed).toBeGreaterThan(whole.speed * 0.3);
  // a middling hit throws it only when the dice are kind; a light one never
  expect(launchOf(walker, { knock: 1 }, 100, dice(0.999))).not.toBeNull();
  expect(launchOf(walker, { knock: 1 }, 100, dice(0.3))).toBeNull();
  expect(launchOf(walker, { knock: 1 }, 10, dice(0.999))).toBeNull();
  expect(launchOf(walker, { knock: 0.5 }, 100, dice(0.999))).toBeNull();
  // and it leaves to either side of the line of the hit
  let s = 12345;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
  const turns = Array.from(
    { length: 200 },
    () => launchOf(walker, shot, 100, rng).turn,
  );
  expect(Math.max(...turns)).toBeGreaterThan(L.turn * 0.6);
  expect(Math.min(...turns)).toBeLessThan(-L.turn * 0.6);
  expect(Math.max(...turns.map(Math.abs))).toBeLessThanOrEqual(L.turn);

  // blood: more for a bigger share of its health, for the head, and by the dice
  expect(bloodOf(0.5, false, dice(0.5))).toBeGreaterThan(
    bloodOf(0.05, false, dice(0.5)) * 2,
  );
  expect(bloodOf(0.2, true, dice(0.5))).toBeGreaterThan(
    bloodOf(0.2, false, dice(0.5)),
  );
  expect(bloodOf(0.2, false, dice(0.999))).toBeGreaterThan(
    bloodOf(0.2, false, dice(0)) * 2,
  );
  expect(bloodOf(1, true, dice(0.999))).toBeLessThanOrEqual(B.max);
  // a kill: a body that was only finished off bursts with far less than one killed in a blow
  expect(goreOf(walker, {}, 100, dice(0.5))).toBeGreaterThan(
    goreOf(walker, {}, 5, dice(0.5)) * 2.5,
  );
  expect(goreOf(walker, { kind: "blast" }, 100, dice(0.5))).toBeGreaterThan(
    goreOf(walker, {}, 100, dice(0.5)),
  );
});

async function open(page, query) {
  await page.goto("/?" + query);
  await page.waitForFunction("window.__ready === true", null, {
    timeout: 90_000,
  });
  await page.evaluate(() => {
    window.__lab.manual = true;
    window.__lab.combat.targets.setMode("stand");
  });
}

test("a forceful kill throws the body, a plain one drops it, a heavy stays put", async ({
  page,
}) => {
  await open(page, "mode=fp&ui=0&w=revolver");
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab.combat;
    const T = c.targets;
    const V = lab.stage.THREE.Vector3;
    lab.advance(0.5, 1 / 60, false);
    const away = new V(0, 0, -1);
    // kill one with a hit of this much knock-back, and watch where the body goes. roll: the
    // dice (0..1). left: how much of its health it has left when the hit lands (1: all of it)
    const kill = (z, knock, roll = 0.999, left = 1) => {
      const from = z.pos.clone();
      T.rng = () => roll;
      z.hp = Math.max(1, Math.round(z.maxHp * left));
      T.damage(z, z.hp, { dir: away.clone(), point: z.chest.clone(), knock });
      let high = 0;
      let airborne = 0;
      for (let i = 0; i < 240; i++) {
        lab.advance(1 / 120, 1 / 120, false);
        high = Math.max(high, z.lift);
        if (z.lift > 0.02) airborne += 1 / 120;
      }
      return {
        alive: z.alive,
        moved: Math.hypot(z.pos.x - from.x, z.pos.z - from.z),
        back: from.z - z.pos.z,
        high,
        airborne,
        rest: z.lift,
      };
    };
    const walkers = T.list.filter((z) => z.type === "walker" && z.alive);
    const brute = T.list.find((z) => z.type === "brute" && z.alive);
    return {
      plain: kill(walkers[0], 0),
      nudge: kill(walkers[1], 0.5),
      hard: kill(walkers[2], 3.2),
      unlucky: kill(walkers[3], 3.2, 0),
      scrap: kill(walkers[4], 3.2, 0.999, 0.05),
      heavy: kill(brute, 2),
      walkers: walkers.length,
      errors: window.__errors,
    };
  });
  const L = STATUS.launch;
  for (const k of ["plain", "nudge", "hard", "unlucky", "scrap", "heavy"])
    expect(got[k].alive, k).toBe(false);
  // under the threshold: it drops where it stands
  expect(got.plain.high).toBe(0);
  expect(got.plain.moved).toBeLessThan(0.05);
  expect(got.nudge.high).toBe(0);
  // a blast of shot at arm's length: off its feet, metres back, and down again
  expect(got.hard.high).toBeGreaterThan(0.4);
  expect(got.hard.airborne).toBeGreaterThan(0.3);
  expect(got.hard.back).toBeGreaterThan(3);
  expect(got.hard.back).toBeLessThan(L.max * 1.2);
  expect(got.hard.rest).toBe(0);
  // the same blast with the worst of the dice: still thrown, nowhere near as far
  expect(got.unlucky.high).toBeGreaterThan(0.05);
  expect(got.unlucky.back).toBeGreaterThan(0.3);
  expect(got.unlucky.back).toBeLessThan(got.hard.back * 0.5);
  // and one that only finished off what was left of it, with the best of them
  expect(got.scrap.back).toBeGreaterThan(0.3);
  expect(got.scrap.back).toBeLessThan(got.hard.back * 0.65);
  // a heavy takes a third of the force: the same hit does not lift it
  expect(2 * STATUS.brute.knock).toBeLessThan(L.from);
  expect(got.heavy.high).toBe(0);
  expect(got.errors).toEqual([]);
});

test("a blast of shot shoves harder the closer it is fired", async ({
  page,
}) => {
  await open(page, "mode=fp&ui=0&w=shotgun");
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab.combat;
    const T = c.targets;
    lab.advance(0.5, 1 / 60, false);
    const brute = T.list.find((z) => z.type === "brute" && z.alive);
    // put the heavy (it survives a blast) straight ahead at this distance and fire once
    const shot = (metres) => {
      brute.hp = brute.maxHp;
      brute.vel.set(0, 0, 0);
      brute.pos.set(lab.stage.eye.x, 0, lab.stage.eye.z - metres);
      lab.advance(1 / 60, 1 / 60, false);
      c.aimAt(brute);
      lab.advance(0.05, 1 / 60, false);
      const hp = brute.hp;
      c.weapon.rounds = c.weapon.spec.mag;
      c.weapon.cooldown = 0;
      // (the shove is a speed handed to the zombie: read it before it is spent. A unit of
      // knock-back is 4.2 m/s, which carries a walker about 0.7 m)
      let speed = 0;
      c.press("fire");
      for (let i = 0; i < 4; i++) {
        lab.advance(1 / 240, 1 / 240, false);
        speed = Math.max(speed, Math.hypot(brute.vel.x, brute.vel.z));
      }
      c.release("fire");
      lab.advance(1.2, 1 / 60, false);
      return { knock: speed / 4.2, took: hp - brute.hp };
    };
    for (const z of T.list) if (z !== brute) z.pos.x += 40; // out of the pattern's way
    return { near: shot(2), mid: shot(7), far: shot(14) };
  });
  const K = WEAPONS.find((w) => w.id === "shotgun").fire.shove;
  expect(got.near.took).toBeGreaterThan(0);
  expect(got.far.took).toBeGreaterThan(0);
  expect(got.near.knock).toBeGreaterThan(got.mid.knock * 1.3);
  expect(got.mid.knock).toBeGreaterThan(got.far.knock);
  // the whole pattern at arm's length: the table's `near`, a heavy's share of it
  const full = K.near * STATUS.brute.knock;
  expect(got.near.knock).toBeGreaterThan(full * 0.8);
  expect(got.near.knock).toBeLessThanOrEqual(full * 1.02);
  // and out at the end of its reach, no more than the table's `far`
  expect(got.far.knock).toBeLessThanOrEqual(K.far * STATUS.brute.knock * 1.02);
});

test("a hit bleeds and a kill bursts", async ({ page }) => {
  await open(page, "mode=fp&ui=0&w=revolver");
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab.combat;
    const T = c.targets;
    const V = lab.stage.THREE.Vector3;
    c.clear();
    lab.advance(0.5, 1 / 60, false);
    const drops = () => c.fx.alpha.count;
    T.rng = () => 0.5; // (the dice: how much is spilt varies from hit to hit)
    const [z, y] = T.list.filter((x) => x.type === "walker" && x.alive);
    const dir = new V(0, 0, -1);
    // what one hit of this much throws into the air
    const spilt = (who, dmg) => {
      lab.advance(3, 1 / 30, false);
      const before = drops();
      T.damage(who, dmg, { dir: dir.clone(), point: who.chest.clone() });
      lab.advance(1 / 60, 1 / 60, false);
      return drops() - before;
    };
    const graze = spilt(z, Math.round(z.maxHp * 0.04));
    const hit = spilt(z, Math.round(z.maxHp * 0.5));
    // finished off with what little it had left, against one killed in a single blow
    const scrap = spilt(z, z.hp);
    const kill = spilt(y, y.maxHp);
    // a hit that should not bleed (a burn, a shared hit) does not
    const other = T.list.find((x) => x.type === "walker" && x.alive);
    lab.advance(3, 1 / 30, false);
    const quiet0 = drops();
    T.damage(other, 5, { dir: dir.clone(), blood: false });
    lab.advance(1 / 60, 1 / 60, false);
    return {
      graze,
      hit,
      scrap,
      kill,
      quiet: drops() - quiet0,
      alive: z.alive || y.alive,
    };
  });
  expect(got.graze).toBeGreaterThan(2);
  expect(got.hit).toBeGreaterThan(got.graze * 1.8);
  expect(got.alive).toBe(false);
  expect(got.scrap).toBeGreaterThan(8);
  expect(got.kill).toBeGreaterThan(got.scrap * 1.5);
  expect(got.kill).toBeGreaterThan(got.hit * 1.5);
  expect(got.quiet).toBe(0);
});
