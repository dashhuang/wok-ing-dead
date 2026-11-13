// The support hand holds every weapon with a wrist that looks like a wrist: not folded
// towards a right angle, and not past what a wrist can do. (The arm solver may bend a wrist
// seventy or eighty degrees and still call it within limits; kit/hands.js counts the bend
// itself as a strain and lets the hand turn a little on its grip.)
import { test, expect } from "./fixtures.js";

test("the support hand's wrist is nearly straight on every weapon", async ({
  page,
}) => {
  await page.goto("/?mode=fp&ui=0&w=shotgun");
  await page.waitForFunction("window.__ready === true", null, {
    timeout: 90_000,
  });
  const rows = await page.evaluate(async () => {
    const lab = window.__lab;
    lab.manual = true;
    const out = [];
    for (const { id } of lab.weapons)
      for (const b of ["base", "a", "b"]) {
        lab.state.level = b === "base" ? 1 : 3;
        lab.state.branch = b;
        await lab.select(id, b);
        lab.advance(0.8, 1 / 60, false);
        const arm = lab.arms.arms.left;
        if (!arm.group.visible) continue;
        const k = arm.ik;
        out.push({
          form: id + ":" + b,
          bend: Math.hypot(k.wristFlex, k.wristDeviation),
          past: k.violation,
          give: [...lab.arms.give.left],
          right: lab.arms.give.right.some((v) => v !== 0),
        });
      }
    return out;
  });
  expect(rows.length).toBeGreaterThan(20);
  for (const r of rows) {
    // (forty degrees: before the bend was counted, half of them were between 45 and 77)
    expect(r.bend, `${r.form}: the wrist is bent`).toBeLessThan(0.7);
    expect(r.past, `${r.form}: the wrist is past its limits`).toBeLessThan(
      0.05,
    );
    // the hand has not turned further on its grip than it is allowed
    expect(Math.abs(r.give[0])).toBeLessThanOrEqual(0.3 + 1e-6);
    expect(Math.abs(r.give[1])).toBeLessThanOrEqual(0.45 + 1e-6);
    // and the trigger hand stays exactly where the weapon put it
    expect(r.right, `${r.form}: the trigger hand moved`).toBe(false);
  }
  expect(await page.evaluate(() => window.__errors)).toEqual([]);
});
