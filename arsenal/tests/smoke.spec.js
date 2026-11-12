// Every weapon in every form: fire, use the special move, fire again (which reloads the ones
// that run dry). Nothing may throw, and every form has to hurt something.
import { test, expect } from "./fixtures.js";

const FORMS = [
  ["base", 1],
  ["a", 3],
  ["a", 5],
  ["b", 3],
  ["b", 5],
];

test("all weapon forms fire without errors", async ({ page }) => {
  await page.goto("/?mode=fp&ui=0&w=shotgun");
  await page.waitForFunction("window.__ready === true", null, {
    timeout: 90_000,
  });
  const ids = await page.evaluate(() => {
    window.__lab.manual = true; // time is stepped from here, so the run is the same every time
    window.__lab.combat.targets.setMode("stand");
    return window.__lab.weapons.map((w) => w.id);
  });
  expect(ids.length).toBe(12);
  for (const id of ids)
    for (const [b, lv] of FORMS) {
      const r = await page.evaluate(
        async ([id, b, lv]) => {
          const lab = window.__lab,
            c = lab.combat;
          const before = window.__errors.length;
          lab.state.level = lv;
          lab.state.branch = b;
          await lab.select(id, b);
          c.clear();
          c.resetMeter();
          c.targets.setMode("stand");
          const hold = (name, s) => {
            c.press(name);
            lab.advance(s);
            c.release(name);
          };
          lab.advance(0.3);
          c.aimAt(1);
          hold("fire", 1.5);
          lab.advance(0.3);
          hold("alt", 1.2);
          lab.advance(1.5);
          hold("fire", 0.6);
          lab.advance(0.8);
          return {
            errors: window.__errors.slice(before).map((e) => String(e)),
            damage: Math.round(c.meter.total),
          };
        },
        [id, b, lv],
      );
      expect(r.errors, `${id} ${b} lv${lv}`).toEqual([]);
      expect(r.damage, `${id} ${b} lv${lv} did no damage`).toBeGreaterThan(0);
    }
});
