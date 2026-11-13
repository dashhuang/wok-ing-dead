// A firework goes off a few metres from the eye, so it has to behave like one: its stars
// leave trails hanging behind them, are braked by the air and pulled over by gravity, and
// come down on the street. And however much is fired, the sparks stay within their pool.
import { test, expect } from "./fixtures.js";

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

test("a firework's stars trail, stall, droop and land", async ({ page }) => {
  await open(page, "mode=fp&ui=0&w=firework");
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const fx = lab.combat.fx;
    const V = lab.stage.THREE.Vector3;
    lab.combat.clear();
    lab.advance(0.3, 1 / 60, false);
    const at = new V(0, 1.4, -8);
    const radius = 2.4;
    // every live spark: where it is, and whether it is a star (it sheds a trail)
    const sparks = () => {
      const P = fx.add;
      const out = [];
      for (let i = 0; i < P.cap; i++) {
        if (!P.alive[i]) continue;
        const k = i * 32;
        out.push({
          x: P.data[k],
          y: P.data[k + 1],
          z: P.data[k + 2],
          star: P.data[k + 28] > 0,
        });
      }
      return out;
    };
    const far = (list) =>
      Math.max(0, ...list.map((s) => Math.hypot(s.x - at.x, s.z - at.z)));
    lab.combat.effects.firework(at, { kind: "peony", radius, count: 90 });
    lab.advance(1 / 60, 1 / 60, false);
    const born = sparks();
    lab.advance(0.4, 1 / 120, false);
    const early = sparks();
    lab.advance(0.5, 1 / 120, false);
    const mid = sparks();
    lab.advance(0.5, 1 / 120, false);
    const late = sparks();
    lab.advance(3, 1 / 60, false);
    const stars = (l) => l.filter((s) => s.star);
    const mean = (l) => l.reduce((a, s) => a + s.y, 0) / (l.length || 1);
    return {
      radius,
      stars: stars(born).length,
      born: born.length,
      early: early.length,
      reach: [far(stars(early)), far(stars(mid)), far(stars(late))],
      height: [mean(stars(born)), mean(stars(mid)), mean(stars(late))],
      landed: stars(late).filter((s) => s.y < 0.1).length,
      under: late.filter((s) => s.y < 0).length,
      left: sparks().length,
      errors: window.__errors,
    };
  });
  expect(got.stars).toBeGreaterThan(25);
  // trails: many more sparks in the air than were thrown out
  expect(got.early).toBeGreaterThan(got.born * 2.5);
  // braked by the air: the ball has all but stopped growing by 0.4 s, at about its radius
  expect(got.reach[0]).toBeGreaterThan(got.radius * 0.55);
  expect(got.reach[2]).toBeLessThan(got.radius * 1.5);
  expect(got.reach[2] - got.reach[1]).toBeLessThan(got.radius * 0.2);
  // pulled over: the stars are lower with every look, some are on the street, none under it
  expect(got.height[1]).toBeLessThan(got.height[0] - 0.2);
  expect(got.height[2]).toBeLessThan(got.height[1]);
  expect(got.landed).toBeGreaterThan(3);
  expect(got.under).toBe(0);
  // and it burns out
  expect(got.left).toBe(0);
  expect(got.errors).toEqual([]);
});

test("the sparks stay within their pool however much is fired", async ({
  page,
}) => {
  await open(page, "mode=fp&ui=0&w=firework&lv=5&b=a");
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab.combat;
    const fx = c.fx;
    c.targets.setMode("horde");
    lab.advance(0.5, 1 / 60, false);
    c.aimAt(0);
    let peak = 0;
    let thinnest = 1;
    c.press("fire");
    for (let i = 0; i < 300; i++) {
      if (c.weapon.rounds < 1) c.weapon.rounds = c.weapon.spec.mag;
      lab.advance(1 / 60, 1 / 60, false);
      peak = Math.max(peak, fx.add.count);
      thinnest = Math.min(thinnest, fx.add.trailScale);
    }
    c.release("fire");
    return { peak, cap: fx.add.cap, thinnest, shots: c.weapon.shots };
  });
  expect(got.shots).toBeGreaterThan(8);
  // a real load, held under the size of the pool by thinning the trails
  expect(got.peak).toBeGreaterThan(1500);
  expect(got.peak).toBeLessThan(got.cap * 0.85);
  expect(got.thinnest).toBeLessThan(0.9);
});
