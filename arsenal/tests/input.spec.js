// The lab driven the way a person drives it: real mouse clicks and key presses, no calls into
// the lab to make things happen (it is only read to see what happened). A button that is
// covered by something else fails here, where a scripted call would pass.
import { test, expect } from "@playwright/test";

const W = 1440,
  H = 810;

async function open(page, query = "") {
  await page.goto("/" + query);
  await page.waitForFunction("window.__ready === true", null, {
    timeout: 90_000,
  });
  await page.waitForTimeout(800);
}

const state = (page) =>
  page.evaluate(() => {
    const lab = window.__lab,
      c = lab.combat;
    return {
      ...lab.state,
      errors: window.__errors.length,
      rounds: c && c.weapon ? Math.ceil(c.weapon.rounds) : null,
      mag: c && c.weapon ? c.weapon.spec.mag : null,
      reload: c && c.weapon ? c.weapon.reload : null,
      total: c ? Math.round(c.meter.total) : null,
      kills: c ? c.meter.kills : null,
      taken: c ? c.meter.taken : null,
      locked: c ? c.locked : null,
      targets: c ? c.targets.mode : null,
      rules: !document.querySelector("#rules").hidden,
    };
  });

/** Click the middle of an element, first making sure the click would land on it. */
async function click(page, selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  expect(box, `${selector} is not on screen`).not.toBeNull();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const reachable = await page.evaluate(
    ([x, y, selector]) => {
      const hit = document.elementFromPoint(x, y);
      const want = document.querySelector(selector);
      return !!hit && (hit === want || want.contains(hit));
    },
    [x, y, selector],
  );
  expect(reachable, `${selector} is covered by something else`).toBe(true);
  await page.mouse.click(x, y);
  await page.waitForTimeout(350);
}

test("showcase and range answer to clicks and keys", async ({ page }) => {
  await open(page);

  // showcase: weapon list, upgrade card, rules drawer, dragging the model
  await click(page, '.item[data-w="revolver"]');
  expect((await state(page)).weapon).toBe("revolver");
  await click(page, '.branch[data-b="b"]');
  expect(await state(page)).toMatchObject({ branch: "b", level: 3 });
  await click(page, '.pip[data-lv="5"]');
  expect(await state(page)).toMatchObject({ branch: "b", level: 5 });
  await click(page, '.pip[data-lv="1"]');
  expect((await state(page)).level).toBe(1);
  await click(page, '.branch[data-b="a"]');
  expect(await state(page)).toMatchObject({ branch: "a", level: 3 });
  await click(page, 'button[data-act="rules"]');
  expect((await state(page)).rules).toBe(true);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  expect((await state(page)).rules).toBe(false);
  const yaw = () => page.evaluate(() => window.__lab.stage.orbit.yaw);
  const before = await yaw();
  await page.mouse.move(700, 420);
  await page.mouse.down();
  await page.mouse.move(820, 430, { steps: 6 });
  await page.mouse.up();
  expect(Math.abs((await yaw()) - before)).toBeGreaterThan(0.3);

  // range: mouse buttons fire, keys reload and switch
  await click(page, '.tabs button[data-mode="fp"]');
  expect((await state(page)).mode).toBe("fp");
  await click(page, '#seg-target button[data-target="stand"]');
  expect((await state(page)).targets).toBe("stand");
  await click(page, '.item[data-w="shotgun"]');
  expect(await state(page)).toMatchObject({ weapon: "shotgun", mode: "fp" });
  await page.mouse.move(W / 2 - 14, H / 2 - 6, { steps: 4 });
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.waitForTimeout(400);
  let s = await state(page);
  expect(s.locked, "a click on the range captures the mouse").toBe(true);
  expect(s.rounds, "left button fires").toBeLessThan(6);
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(2700);
  expect((await state(page)).rounds, "R reloads").toBe(6);
  await page.keyboard.press("Digit3");
  await page.waitForTimeout(400);
  expect((await state(page)).branch, "3 picks 乙").toBe("b");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(600);
  expect((await state(page)).weapon, "E is the next weapon").toBe("smg");
  await page.keyboard.press("Equal");
  await page.keyboard.press("Equal");
  await page.waitForTimeout(300);
  expect((await state(page)).level, "= raises the level").toBe(5);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect((await state(page)).rounds).toBeLessThan(40);
  await page.keyboard.press("KeyE");
  await page.keyboard.press("Digit2");
  await page.waitForTimeout(600);
  expect(await state(page)).toMatchObject({ weapon: "revolver", branch: "a" });
  const dealt = (await state(page)).total;
  await page.mouse.down({ button: "right" });
  await page.waitForTimeout(1100);
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(900);
  expect(
    (await state(page)).total,
    "right button: mark and fan",
  ).toBeGreaterThan(dealt);

  // Esc hands the mouse back (a headless browser has no Esc-to-unlock of its own)
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForTimeout(300);
  expect((await state(page)).locked).toBe(false);
  await click(page, '#seg-infuse button[data-infuse="venom"]');
  expect(
    await page.evaluate(() => window.__lab.combat.infuse.has("venom")),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(400);
  expect((await state(page)).mode, "Tab goes back to the showcase").toBe(
    "show",
  );

  // a small window: the same controls are still reachable
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.waitForTimeout(400);
  await click(page, '.item[data-w="guandao"]');
  expect((await state(page)).weapon).toBe("guandao");
  await click(page, '.tabs button[data-mode="fp"]');
  expect((await state(page)).mode).toBe("fp");
  const dealt2 = (await state(page)).total;
  await page.mouse.move(512, 320);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await page.waitForTimeout(300);
  s = await state(page);
  expect(s.total, "the guandao swings and hits").toBeGreaterThan(dealt2);
  expect(s.errors).toBe(0);
});

test("hands, demo, sound and horde controls", async ({ page }) => {
  await open(page);
  const audio = () =>
    page.evaluate(() => ({
      ready: window.__lab.audio.ready,
      muted: window.__lab.audio.muted,
    }));

  await click(page, "#btn-hands");
  const arms = await page.evaluate(() => {
    let meshes = 0;
    window.__lab.arms.group.traverseVisible((o) => {
      if (o.isMesh) meshes++;
    });
    return { on: window.__lab.state.hands, meshes };
  });
  expect(arms.on).toBe(true);
  expect(arms.meshes, "both arms are drawn").toBe(2);
  expect((await audio()).ready, "the first click starts the sound").toBe(true);

  // 演示动作: the model has to move (one shot, one reload) and come to rest again
  await click(page, '.item[data-w="smg"]');
  await click(page, "#btn-demo");
  const pose = () =>
    page.evaluate(() => {
      let v = 0;
      window.__lab.model.root.traverse((o) => {
        v +=
          o.position.x * 3.1 +
          o.position.y * 5.3 +
          o.position.z * 7.7 +
          o.quaternion.x * 1.3 +
          o.quaternion.y * 2.9 +
          o.quaternion.z * 4.1;
      });
      return {
        v: Math.round(v * 1e5),
        on: typeof window.__lab.demo === "function",
      };
    });
  const poses = new Set();
  let started = false,
    ended = false;
  for (let i = 0; i < 90 && !ended; i++) {
    const p = await pose();
    if (p.on) started = true;
    if (started && !p.on) ended = true;
    poses.add(p.v);
    await page.waitForTimeout(60);
  }
  expect(started && ended, "the demo starts and finishes").toBe(true);
  expect(poses.size, "the parts move during the demo").toBeGreaterThan(12);

  await click(page, "#btn-sound");
  expect((await audio()).muted).toBe(true);
  await click(page, "#btn-sound");
  expect((await audio()).muted).toBe(false);

  // 尸潮: stand still and they arrive and hit; the 受伤 counter shows it; then fight back
  await click(page, '.tabs button[data-mode="fp"]');
  await click(page, '#seg-target button[data-target="horde"]');
  expect((await state(page)).targets).toBe("horde");
  await click(page, '.item[data-w="coinsword"]');
  await expect
    .poll(async () => (await state(page)).taken, { timeout: 60_000 })
    .toBeGreaterThan(0);
  await page.waitForTimeout(600);
  const shown = await page.evaluate(() => ({
    shown: +document.getElementById("m-taken").textContent,
    taken: Math.round(window.__lab.combat.meter.taken),
  }));
  expect(shown.shown).toBe(shown.taken);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  await page.mouse.up();
  const s = await state(page);
  expect(s.total, "left button swings and hits in the horde").toBeGreaterThan(
    0,
  );
  expect(s.errors).toBe(0);
});

// the sounds each reload has to make, in the order the parts move
const RELOADS = {
  shotgun: { time: 2.4, cues: ["shellIn", "shellIn", "shellIn"] },
  smg: { time: 1.6, cues: ["magOut", "magIn", "boltBack", "boltFwd"] },
  revolver: { time: 2.2, cues: ["latch", "cylOpen", "roundIn", "cylClose"] },
  lever: { time: 2.8, cues: ["roundIn", "roundIn", "roundIn"] },
  nailgun: { time: 1.4, cues: ["magOut", "magIn", "latch"] },
  flamer: { time: 2.4, cues: ["gasHiss", "canOut", "canIn"] },
  firework: { time: 2.6, cues: ["tubeIn", "tubeIn", "tubeIn", "fuse"] },
  arc: { time: 2.0, cues: ["batteryOut", "batteryIn"] },
  crossbow: { time: 1.5, cues: ["woodKnock", "woodKnock"] },
};

test("R reloads every gun, with its sounds in order", async ({ page }) => {
  await open(page);
  await click(page, '.tabs button[data-mode="fp"]');
  await click(page, '#seg-target button[data-target="stand"]');
  // listen in on the sounds the weapons ask for
  await page.evaluate(() => {
    const a = window.__lab.audio,
      cue = a.cue.bind(a);
    window.__cues = [];
    a.cue = (name, ...rest) => {
      const w = window.__lab.combat.weapon;
      if (w && w.reload >= 0) window.__cues.push(name);
      return cue(name, ...rest);
    };
  });
  for (const [id, want] of Object.entries(RELOADS)) {
    // Q / E step through the weapons while the mouse is captured by the range
    if (id === "shotgun") await click(page, `.item[data-w="${id}"]`);
    else {
      await page.keyboard.press("KeyE");
      await page.waitForTimeout(500);
    }
    expect((await state(page)).weapon).toBe(id);
    await page.mouse.move(W / 2, H / 2);
    await page.mouse.down();
    await page.waitForTimeout(id === "firework" ? 500 : 350);
    await page.mouse.up();
    await page.waitForTimeout(900);
    const before = await state(page);
    expect(before.rounds, `${id} fired`).toBeLessThan(before.mag);
    await page.evaluate(() => (window.__cues.length = 0));
    await page.keyboard.press("KeyR");
    await page.waitForTimeout(want.time * 1000 + 700);
    const after = await state(page);
    expect(after.rounds, `${id} is full again`).toBe(after.mag);
    expect(after.reload, `${id} has finished reloading`).toBeLessThan(0);
    // every expected sound, in order (others may come between them)
    const heard = await page.evaluate(() => window.__cues.slice());
    let at = 0;
    for (const name of want.cues) {
      at = heard.indexOf(name, at) + 1;
      expect(
        at,
        `${id}: "${name}" missing or out of order in ${heard}`,
      ).toBeGreaterThan(0);
    }
    expect(after.errors).toBe(0);
  }
});

test("phone: every header button can be tapped", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "?w=nailgun&hands=1");
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll("#ui .bar button")]
      .filter((b) => b.getBoundingClientRect().width > 0)
      .map((b) => {
        const r = b.getBoundingClientRect();
        const x = r.left + r.width / 2,
          y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        return {
          label: b.textContent.trim(),
          inView: x > 0 && x < innerWidth && y > 0 && y < innerHeight,
          reachable: !!hit && (hit === b || b.contains(hit)),
        };
      }),
  );
  expect(buttons.length).toBeGreaterThanOrEqual(5);
  for (const b of buttons)
    expect(b, `「${b.label}」 on a phone`).toMatchObject({
      inView: true,
      reachable: true,
    });
  // and the weapon strip under it switches weapons
  await click(page, '.item[data-w="smg"]');
  expect((await state(page)).weapon).toBe("smg");
});
