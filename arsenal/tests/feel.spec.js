// How the weapons handle (data/feel.js played by combat/recoil.js): a shot flips the muzzle
// about the hand and lifts the aim, a burst opens the aim and climbs, a blade that bites hangs
// for a moment without the swing taking any longer. Time is stepped by hand, so what is
// measured is the model and not the machine.
import { test, expect } from "./fixtures.js";
import { FEEL } from "../src/data/feel.js";

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

test("a shot flips the muzzle about the hand, lifts the aim and settles", async ({
  page,
}) => {
  await open(page, "mode=fp&ui=0&w=revolver");
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab.combat;
    const R = c.recoil;
    const W = c.weapon;
    const V = lab.stage.THREE.Vector3;
    lab.advance(0.6, 1 / 60, false); // the weapon is up, and its grip has been read
    c.aim(0, 0.3); // at the sky
    lab.advance(0.1, 1 / 60, false);
    const grip = W.model.grips.right.anchor;
    const muzzle = W.model.anchors.muzzle;
    // where the hand and the muzzle are, seen from the eye
    const seen = (o) =>
      lab.stage.camera.worldToLocal(o.getWorldPosition(new V()));
    const rest = { grip: seen(grip), muzzle: seen(muzzle) };
    const look0 = lab.stage.look.pitch;
    c.press("fire");
    lab.advance(1 / 240, 1 / 240, false);
    c.release("fire");
    let rise = 0;
    let at = 0;
    let moved = null;
    let cam = 0;
    for (let i = 1; i <= 48; i++) {
      lab.advance(1 / 240, 1 / 240, false);
      cam = Math.max(cam, lab.stage.kick.pitch);
      if (R.springs.p.x > rise) {
        rise = R.springs.p.x;
        at = i / 240;
        moved = {
          grip: seen(grip).distanceTo(rest.grip),
          muzzle: seen(muzzle).distanceTo(rest.muzzle),
        };
      }
    }
    lab.advance(1.5, 1 / 120, false);
    return {
      shots: W.shots,
      rise,
      at,
      moved,
      cam,
      kept: lab.stage.look.pitch - look0,
      after: {
        rise: Math.abs(R.springs.p.x),
        back: Math.abs(R.springs.z.x),
        cam: Math.abs(lab.stage.kick.pitch),
      },
    };
  });
  const F = FEEL.revolver;
  expect(got.shots).toBe(1);
  // a real flip (several degrees), reached in a few hundredths of a second
  expect(got.rise).toBeGreaterThan(0.06);
  expect(got.rise).toBeLessThan(0.16);
  expect(got.at).toBeLessThan(0.05);
  // about the hand: the muzzle travels, the grip nearly stays
  expect(got.moved.muzzle).toBeGreaterThan(got.moved.grip * 2.5);
  // the camera is lifted, a share of that stays on the aim, the rest and the weapon come back
  expect(got.cam).toBeGreaterThan(F.cam.pitch * 0.4);
  expect(got.kept).toBeGreaterThan(F.cam.pitch * F.cam.keep * 0.7);
  expect(got.kept).toBeLessThan(F.cam.pitch * F.cam.keep * 1.3);
  expect(got.after.rise).toBeLessThan(0.002);
  expect(got.after.back).toBeLessThan(0.0005);
  expect(got.after.cam).toBeLessThan(0.001);
});

test("a burst opens the aim and climbs, and both stop when the trigger is let go", async ({
  page,
}) => {
  await open(page, "mode=fp&ui=0&w=smg");
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab.combat;
    const W = c.weapon;
    lab.advance(0.6, 1 / 60, false);
    c.aim(0, 0.2);
    lab.advance(0.1, 1 / 60, false);
    const look0 = lab.stage.look.pitch;
    const calm = c.spread;
    c.press("fire");
    lab.advance(1, 1 / 240, false);
    c.release("fire");
    const hot = { bloom: W.bloom, spread: c.spread, burst: W.burst };
    const climbed = lab.stage.look.pitch - look0;
    lab.advance(2, 1 / 120, false);
    const settled = lab.stage.look.pitch - look0;
    return { calm, hot, climbed, settled, bloom: W.bloom, spread: c.spread };
  });
  const F = FEEL.smg;
  expect(got.hot.burst).toBeGreaterThan(12);
  expect(got.hot.bloom).toBeGreaterThan(0.5);
  expect(got.hot.spread).toBeGreaterThan(got.calm + F.bloom.add * 0.4);
  // the climb is the share of every shot's kick that is kept: between the whole burst at the
  // sustained rate and the whole burst at the opening rate
  const perShot = F.cam.pitch * F.cam.keep;
  expect(got.climbed).toBeGreaterThan(
    perShot * got.hot.burst * F.cam.sustain[1] * 0.8,
  );
  expect(got.climbed).toBeLessThan(perShot * got.hot.burst * 1.2);
  // what was kept stays kept (it is the player's to pull down); the aim closes again
  expect(got.settled).toBeCloseTo(got.climbed, 4);
  expect(got.bloom).toBe(0);
  expect(got.spread).toBeLessThan(got.hot.spread);
});

test("a blade that bites hangs for a moment and the swing takes no longer", async ({
  page,
}) => {
  await open(page, "mode=fp&ui=0&w=coinsword");
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab.combat;
    const W = c.weapon;
    lab.advance(0.6, 1 / 60, false);
    // one cut: how long it takes, whether it bit, how long it hung
    const cut = () => {
      const before = c.meter.total;
      c.press("fire");
      lab.advance(1 / 240, 1 / 240, false);
      c.release("fire");
      let t = 1 / 240;
      let hung = 0;
      let lean = 0;
      while (W.swing >= 0 && t < 3) {
        lab.advance(1 / 240, 1 / 240, false);
        t += 1 / 240;
        if (W.hitStop > 0) hung += 1 / 240;
        lean = Math.max(lean, Math.abs(lab.stage.kick.yaw));
      }
      lab.advance(0.6, 1 / 60, false); // the combo lapses: the next cut is the same one
      return { t, hung, lean, dealt: c.meter.total - before };
    };
    c.targets.setLayout("far"); // out of reach
    lab.advance(0.1, 1 / 60, false);
    const miss = cut();
    c.targets.setLayout("near");
    lab.advance(0.1, 1 / 60, false);
    c.aimAt(0);
    lab.advance(0.1, 1 / 60, false);
    const hit = cut();
    return { miss, hit, swing: W.spec.swingTime || 0.5 };
  });
  const M = FEEL.coinsword.melee;
  expect(got.miss.dealt).toBe(0);
  expect(got.miss.hung).toBe(0);
  expect(got.hit.dealt).toBeGreaterThan(0);
  expect(got.hit.hung).toBeGreaterThan(M.stop * 0.7);
  // the camera leans into every swing, hit or miss
  expect(got.miss.lean).toBeGreaterThan(M.follow * 0.6);
  // and the pause is made up on the way out
  expect(got.hit.t).toBeGreaterThan(got.miss.t * 0.93);
  expect(got.hit.t).toBeLessThan(got.miss.t * 1.07);
});
