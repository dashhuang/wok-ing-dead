// What a hit does to the dead: it bleeds, a kill bursts, a forceful kill throws the body, a
// blast of shot shoves harder the closer it is fired, and a heavy takes a share of all that.
// The force is the weapons' rule (combat/status.js, numbers in data/status.js `launch` and
// the shotgun's `shove`); here it is checked on the bench's stand-in zombies.
import { test, expect } from "./fixtures.js";
import { STATUS } from "../src/data/status.js";
import { WEAPONS } from "../src/data/weapons.js";

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
    // kill one outright with a hit of this much knock-back, and watch where the body goes
    const kill = (z, knock) => {
      const from = z.pos.clone();
      T.damage(z, 99999, { dir: away.clone(), point: z.chest.clone(), knock });
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
      heavy: kill(brute, 2),
      errors: window.__errors,
    };
  });
  const L = STATUS.launch;
  for (const k of ["plain", "nudge", "hard", "heavy"])
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
    const z = T.list.find((x) => x.type === "walker" && x.alive);
    const dir = new V(0, 0, -1);
    const before = drops();
    T.damage(z, 5, { dir: dir.clone(), point: z.chest.clone() });
    lab.advance(1 / 60, 1 / 60, false);
    const hit = drops() - before;
    lab.advance(3, 1 / 30, false);
    const settled = drops();
    T.damage(z, 99999, { dir: dir.clone(), point: z.chest.clone() });
    lab.advance(1 / 60, 1 / 60, false);
    const kill = drops() - settled;
    // a hit that should not bleed (a burn, a shared hit) does not
    const other = T.list.find((x) => x.type === "walker" && x.alive);
    lab.advance(3, 1 / 30, false);
    const quiet0 = drops();
    T.damage(other, 5, { dir: dir.clone(), blood: false });
    lab.advance(1 / 60, 1 / 60, false);
    return { hit, kill, quiet: drops() - quiet0, alive: z.alive };
  });
  expect(got.hit).toBeGreaterThan(10);
  expect(got.alive).toBe(false);
  expect(got.kill).toBeGreaterThan(got.hit * 2);
  expect(got.quiet).toBe(0);
});
