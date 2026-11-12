// The firing range plays by the game's rules: its zombies have the game's numbers, a level
// and a seasoning do to a weapon what they do in a run, and a magazine costs what it costs
// there. These read the game's own tables, so a change to a number is not a failure here;
// what fails is the range no longer following the table.
import { test, expect } from "@playwright/test";
import { ZOMBIES } from "../../src/chinatown/zombietune.js";
import { RUN, weaponMods } from "../../src/chinatown/runtune.js";
import { AMMO, ARMS } from "../../src/chinatown/loadout.js";
import { LEVELS } from "../src/data/levels.js";
import { STATUS } from "../src/data/status.js";

async function open(page, query) {
  await page.goto("/?" + query);
  await page.waitForFunction("window.__ready === true", null, {
    timeout: 90_000,
  });
  await page.evaluate(() => {
    window.__lab.manual = true; // time is stepped from here
    window.__lab.combat.targets.setMode("stand");
  });
}

test("the zombies on the range are the game's", async ({ page }) => {
  await open(page, "mode=fp&ui=0&w=smg");
  const seen = await page.evaluate(() => {
    const T = window.__lab.combat.targets;
    T.setMode("horde");
    const pick = (type) => T.list.find((z) => z.type === type);
    const w = pick("walker"),
      b = pick("brute");
    return {
      walker: { hp: w.maxHp, speed: w.speed, radius: w.radius / w.scale },
      brute: { hp: b.maxHp, speed: b.speed },
    };
  });
  expect(seen.walker.hp).toBe(ZOMBIES.walker.hp);
  expect(seen.brute.hp).toBe(ZOMBIES.brute.hp);
  expect([ZOMBIES.walker.walkSpeed, ZOMBIES.walker.runSpeed]).toContain(
    seen.walker.speed,
  );
  expect([ZOMBIES.brute.walkSpeed, ZOMBIES.brute.runSpeed]).toContain(
    seen.brute.speed,
  );
});

test("levels and seasonings change a weapon as they do in a run", async ({
  page,
}) => {
  await open(page, "mode=fp&ui=0&w=smg&lv=2&spice=fire:2,hands:3,toss:1");
  const want = weaponMods({ fire: 2, hands: 3, toss: 1 });
  const got = await page.evaluate(() => {
    const lab = window.__lab,
      c = lab.combat;
    const W = c.weapon;
    lab.advance(0.6, 1 / 60, false); // the weapon is up
    // rate of fire: hold the trigger for a second of stepped time
    c.aim(0, 0.6); // at the sky: nothing is hit, only shots are counted
    const before = W.shots;
    c.press("fire");
    lab.advance(1, 1 / 240, false);
    c.release("fire");
    const shots = W.shots - before;
    lab.advance(0.2, 1 / 60, false);
    // reload: how long it takes
    c.reload();
    let t = 0;
    while (c.weapon.reload >= 0 && t < 10) {
      lab.advance(1 / 60, 1 / 60, false);
      t += 1 / 60;
    }
    return { mods: { ...c.mods }, mul: W.mul, shots, reload: t, spec: W.spec };
  });
  expect(got.mods).toEqual(want);
  expect(got.mul).toBeCloseTo(LEVELS[1].dmg * want.damage, 6);
  const perSecond = (got.spec.rpm * want.rate) / 60;
  expect(Math.abs(got.shots - perSecond)).toBeLessThanOrEqual(2);
  // unseasoned it would be well short of that
  expect(got.shots).toBeGreaterThan(got.spec.rpm / 60 + 2);
  expect(Math.abs(got.reload - got.spec.reload / want.reload)).toBeLessThan(
    0.08,
  );
});

test("an elemental seasoning lands its status on the hit the table says", async ({
  page,
}) => {
  const chili = RUN.spices.find((s) => s.id === "chili");
  await open(page, "mode=fp&ui=0&w=revolver&spice=chili:3");
  const every = chili.every[2];
  const burns = await page.evaluate((every) => {
    const lab = window.__lab,
      c = lab.combat;
    const z = c.targets.list.find((x) => x.type === "brute" && x.alive);
    const out = [];
    for (let i = 1; i <= every; i++) {
      // a plain hit through the rules, as a weapon deals it
      c.targets.damage(z, 1, { dir: new lab.THREE.Vector3(0, 0, -1) });
      out.push(z.st.burn);
    }
    return out;
  }, every);
  expect(burns.slice(0, -1).every((b) => b === 0)).toBe(true);
  expect(burns.at(-1)).toBe(1);
  expect(STATUS.burn.max).toBeGreaterThanOrEqual(1);
});

test("with the run's ammunition a magazine is paid for from its pool", async ({
  page,
}) => {
  await open(page, "mode=fp&ui=0&w=shotgun&ammo=meal");
  const pool = ARMS.shotgun.ammo;
  const per = ARMS.shotgun.per;
  const r = await page.evaluate((pool) => {
    const lab = window.__lab,
      c = lab.combat;
    const W = () => c.weapon;
    const mag = W().spec.mag;
    const full = lab.meal.pool[pool];
    lab.advance(0.6, 1 / 60, false); // the weapon is up
    c.aim(0, 0.6);
    const fire = (n) => {
      for (let i = 0; i < n; i++) {
        c.press("fire");
        lab.advance(0.05, 1 / 60, false);
        c.release("fire");
        lab.advance(1.2, 1 / 60, false);
      }
    };
    const reload = () => {
      c.reload();
      lab.advance(4, 1 / 60, false);
    };
    // a reload takes from the pool exactly what it puts in the magazine
    fire(2);
    const missing = mag - W().rounds;
    reload();
    const paid = full - lab.meal.pool[pool];
    const topped = W().rounds;
    // nearly dry: the next reload only gets what is left
    fire(3);
    const had = W().rounds;
    lab.meal.pool[pool] = 1;
    reload();
    const partial = W().rounds - had;
    const left = lab.meal.pool[pool];
    // dry: nothing to load, and the reload does not even start
    fire(mag);
    const empty = W().rounds;
    c.reload();
    const started = W().reload >= 0;
    return {
      full,
      mag,
      missing,
      paid,
      topped,
      partial,
      left,
      empty,
      started,
      errors: window.__errors.slice(),
    };
  }, pool);
  expect(r.errors).toEqual([]);
  expect(r.full).toBe(AMMO[pool].cap);
  expect(r.missing).toBe(2);
  expect(r.paid).toBeCloseTo(r.missing * per, 6);
  expect(r.topped).toBe(r.mag);
  expect(r.partial).toBeCloseTo(1 / per, 6);
  expect(r.left).toBe(0);
  expect(r.empty).toBe(0);
  expect(r.started, "an empty pool: the reload does not start").toBe(false);
});
