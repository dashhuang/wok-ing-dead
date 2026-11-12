// Plays the real entry path with real mouse clicks and key presses: title (checked at desktop
// and phone sizes) → deploy → choose a weapon → fire → level up → pause → resume → die →
// retry. Shortcuts like ?autostart skip the title page and once hid a fully blocked Deploy
// button, so this test must keep going through the menus.
// Each test loads the whole street (about a minute), so checks share a page where they can.
// The second stage (the docks) is not covered yet: it is not in use.
import { test, expect } from "@playwright/test";

const state = (page) => page.evaluate(() => window.__G?.game?.state);

/**
 * Lists the visible menu buttons on screen (and the branch buttons of the title page) and
 * whether a click at each one's centre would land on it (nothing drawn on top).
 */
const probeButtons = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-act], .seg button[data-p]")]
      .filter(
        (b) =>
          b.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }) && b.getBoundingClientRect().width > 0,
      )
      .map((b) => {
        const r = b.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const inView = x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight;
        const hit = inView && document.elementFromPoint(x, y);
        return {
          act: b.dataset.act || `branch:${b.dataset.p}`,
          hit: hit
            ? `${hit.tagName.toLowerCase()}.${hit.className}`
            : "nothing",
          x,
          y,
          inView,
          reachable: !!hit && (hit === b || b.contains(hit)),
        };
      }),
  );

/** Waits until the title screen is up and the loading overlay has faded away. */
async function waitForTitle(page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__G?.game?.state === "title" &&
          document.getElementById("boot")?.classList.contains("done"),
      ),
    )
    .toBe(true);
}

/**
 * Waits for a menu screen (`data-s`) to be shown. Some appear after a delay in game time,
 * which runs slowly under software rendering on CI.
 */
async function waitForScreen(page, name) {
  await expect
    .poll(() =>
      page.evaluate(
        (name) =>
          !!document
            .querySelector(`.m-screen[data-s="${name}"]`)
            ?.checkVisibility({ opacityProperty: true }),
        name,
      ),
    )
    .toBe(true);
}

/**
 * Every visible on-screen button must take clicks at its centre. Screens animate in, so
 * keep checking for a while; a button that stays covered fails the test.
 */
async function expectButtonsReachable(page, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  let covered;
  do {
    covered = (await probeButtons(page)).filter(
      (b) => b.inView && !b.reachable,
    );
    if (!covered.length) return;
    await page.waitForTimeout(250);
  } while (Date.now() < deadline);
  expect(
    covered.map((b) => `${b.act} (under ${b.hit})`),
    "buttons covered by other elements",
  ).toEqual([]);
}

/**
 * Clicks a menu button with the real mouse once nothing covers it. Give it longer after a
 * change of window size: the renderer rebuilds its buffers and the page can stall meanwhile.
 * (The default allows for a busy machine: the runner shares its processor with other work,
 * and a menu that fades in over a second can take ten times that to appear.)
 */
async function clickAct(page, act, timeout = 30_000) {
  let target;
  await expect
    .poll(
      async () => {
        target = (await probeButtons(page)).find((b) => b.act === act);
        return target?.reachable ?? "not on screen";
      },
      { message: `"${act}" button is missing or covered`, timeout },
    )
    .toBe(true);
  await page.mouse.click(target.x, target.y);
}

/** The tickets on screen: null, or { kind, ids } once they accept a key. */
const tickets = (page) =>
  page.evaluate(() => {
    const p = window.__G?.run?.state?.picking;
    return p && p.guard <= 0
      ? { kind: p.kind, ids: p.cards.map((c) => c.id) }
      : null;
  });
const inHand = (page) => page.evaluate(() => window.__G.run.loadout.cur);

/** A run opens with three weapons on tickets; a number key takes one in hand. */
async function chooseFirstWeapon(page, key) {
  await expect.poll(async () => (await tickets(page))?.kind).toBe("start");
  const offered = (await tickets(page)).ids;
  expect(offered).toHaveLength(3);
  expect(await inHand(page)).toBe("pistol");
  await page.keyboard.press(`Digit${key}`);
  await expect.poll(() => inHand(page)).toBe(offered[key - 1]);
  await expect.poll(() => page.evaluate(() => window.__G.time.scale)).toBe(1);
  return offered[key - 1];
}

test("a player can start, arm, level up, pause, die and retry with real input", async ({
  page,
}) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto("/?lang=zh-CN");
  await waitForTitle(page);
  await expectButtonsReachable(page);

  // The title page at phone sizes, on the same page load.
  for (const viewport of [
    { width: 390, height: 844 }, // portrait
    { width: 844, height: 390 }, // landscape
    { width: 1280, height: 720 }, // back to desktop
  ]) {
    await page.setViewportSize(viewport);
    await expectButtonsReachable(page, 30_000);
  }

  // Title → mission. After a resize the renderer rebuilds its buffers, so allow longer.
  await clickAct(page, "deploy", 60_000);
  await expect.poll(() => state(page)).toBe("playing");

  // The first ticket is a weapon; holding fire spends its rounds.
  await chooseFirstWeapon(page, 2);
  const rounds = () => page.evaluate(() => window.__G.weapon.ammo);
  const full = await rounds();
  await page.keyboard.down("Enter");
  await expect.poll(rounds).toBeLessThan(full);
  await page.keyboard.up("Enter");

  // A level-up: tickets in slow motion, chosen with a number key, without a pause.
  await page.evaluate(() => window.__G.run.debug.addXp(5));
  await expect.poll(async () => (await tickets(page))?.kind).toBe("level");
  expect(await state(page)).toBe("playing");
  await page.keyboard.press("Digit1");
  await expect.poll(() => tickets(page)).toBeNull();
  await expect
    .poll(() => page.evaluate(() => window.__G.run.state.level))
    .toBe(1);

  // Pause and resume.
  await page.keyboard.press("Escape");
  await expect.poll(() => state(page)).toBe("paused");
  await waitForScreen(page, "paused");
  await expectButtonsReachable(page);
  await clickAct(page, "resume");
  await expect.poll(() => state(page)).toBe("playing");

  // Die and retry.
  await page.evaluate(() => window.__G.player.damage(9999));
  await expect.poll(() => state(page)).toBe("dead");
  await waitForScreen(page, "dead");
  await expectButtonsReachable(page);
  await clickAct(page, "retry");
  await expect.poll(() => state(page)).toBe("playing");

  // The new run starts from nothing: the sidearm and a fresh choice of weapon.
  await expect
    .poll(() => page.evaluate(() => window.__G.run.loadout.owned().join()))
    .toBe("pistol");
  await chooseFirstWeapon(page, 1);
  expect(await page.evaluate(() => window.__G.run.state.level)).toBe(0);

  const runtime = await page.evaluate(() => ({
    fatal: window.__fatal,
    errors: window.__errors,
  }));
  expect(runtime.fatal).toBeNull();
  expect(runtime.errors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

// The weapon lab and the game play by one set of rules, and take the same address
// parameters: what was set up on the lab's firing range can be carried into a real run.
test("the lab's address parameters arm a real run", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto("/?lang=en&w=flamer&b=a&lv=5&spice=chili:2,fire:3,hands:1");
  await waitForTitle(page);
  await expectButtonsReachable(page);
  await clickAct(page, "deploy");
  await expect.poll(() => state(page)).toBe("playing");

  // no first ticket: the weapon is already in hand, in its form, with the seasonings on
  await expect.poll(() => inHand(page)).toBe("flamer");
  const run = () =>
    page.evaluate(() => {
      const R = window.__G.run;
      const a = R.armory;
      return {
        ticket: !!R.state.picking,
        item: R.loadout.item("flamer"),
        spice: R.state.spice,
        // what reached the weapon controller and the status rules the lab shares
        mods: a && { ...a.combat.mods },
        infusions: a && a.targets.rules.infusions,
        form: a && a.weapon && [a.weapon.branch, a.weapon.level],
        rounds: a ? a.rounds : null,
        fuel: R.loadout.have("fuel"),
      };
    });
  await expect.poll(async () => (await run()).form).toEqual(["a", 5]);
  const start = await run();
  expect(start.ticket).toBe(false);
  expect(start.item).toMatchObject({ level: 5, branch: "a" });
  expect(start.spice).toEqual({ chili: 2, fire: 3, hands: 1 });
  expect(start.mods.damage).toBeCloseTo(1.45, 6);
  expect(start.mods.rate).toBeCloseTo(1.12, 6);
  expect(start.infusions).toEqual([{ element: "fire", every: 4 }]);
  // only the arsenal's weapon is in the hands: the game's own pair and its arms are put
  // away (they once came back up over it, the rifle like a wall across the view)
  const stock = () =>
    page.evaluate(() => {
      const G = window.__G;
      const arm = G.camera.children.find((c) => c.name === "arm-right");
      return {
        rigs: Object.values(G.weapon.rigs).filter(
          (r) => r.root.visible && r.root.scale.x > 0.01,
        ).length,
        arms: !!arm && arm.visible,
      };
    });
  await expect.poll(stock).toEqual({ rigs: 0, arms: false });

  // holding fire burns fuel; the reload is paid for from the run's pool
  await page.keyboard.down("Enter");
  await expect
    .poll(async () => (await run()).rounds)
    .toBeLessThan(start.rounds);
  await page.keyboard.up("Enter");
  await page.keyboard.press("KeyR");
  await expect.poll(async () => (await run()).fuel).toBeLessThan(start.fuel);

  const runtime = await page.evaluate(() => ({
    fatal: window.__fatal,
    errors: window.__errors,
  }));
  expect(runtime.fatal).toBeNull();
  expect(runtime.errors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

// The firing range is the game itself with the timeline off (src/chinatown/range.js): its
// panel is worked with real clicks, and its state is kept in the address (the page opens
// set up the way the address says, which is how it comes back after a reload).
test("the firing range sets a run up by hand", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const ready = () =>
    page.waitForFunction(
      () =>
        window.__G?.game?.state === "playing" &&
        !!window.__G.run?.range &&
        !!window.__G.run.armory,
      null,
      { timeout: 200_000 },
    );
  /** Click a control of the panel, first making sure the click would land on it. */
  const press = async (selector) => {
    const el = page.locator(".rg " + selector).first();
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    expect(box, `${selector} is not on screen`).not.toBeNull();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const reachable = await page.evaluate(
      ([x, y, selector]) => {
        const hit = document.elementFromPoint(x, y);
        const want = document.querySelector(".rg " + selector);
        return !!hit && (hit === want || want.contains(hit));
      },
      [x, y, selector],
    );
    expect(reachable, `${selector} is covered by something else`).toBe(true);
    await page.mouse.click(x, y);
  };
  const range = () =>
    page.evaluate(() => {
      const G = window.__G;
      const R = G.run;
      const a = R.armory;
      const alive = G.enemies.list.filter((z) => z.alive);
      return {
        state: G.game.state,
        hand: R.loadout.cur,
        form: a.weapon && a.current ? [a.weapon.branch, a.weapon.level] : null,
        spice: R.state.spice,
        mode: R.range.opt.z,
        ammo: R.range.opt.ammo,
        standing: alive.filter((z) => z.passive).length,
        ranks: alive
          .map((z) => z.rank)
          .filter(Boolean)
          .sort()
          .join(),
        alive: alive.length,
        dealt: Math.round(R.range.meter.total),
        timeline: R.state.t,
        invulnerable: G.player.invulnerable,
      };
    });

  // the address sets it up: a weapon at a level, a seasoning, who is on the street, the
  // ammunition. No title, no first ticket, no timeline.
  await page.goto(
    "/?range=1&lang=zh-CN&w=smg&lv=2&spice=fire:1&z=advance&ammo=meal",
  );
  await ready();
  await expect.poll(async () => (await range()).form).toEqual(["base", 2]);
  expect(await range()).toMatchObject({
    hand: "smg",
    spice: { fire: 1 },
    mode: "advance",
    ammo: "meal",
    standing: 0,
    invulnerable: true,
  });
  expect(await tickets(page)).toBeNull();
  await press('[data-spice="fire"]');
  await press('[data-spice="fire"]');
  await press('[data-spice="fire"]'); // past the third level it comes off
  await press('[data-ammo="free"]');
  await press('[data-z="stand"]');
  await expect.poll(async () => (await range()).standing).toBeGreaterThan(3);
  expect(await range()).toMatchObject({ spice: {}, ammo: "free" });

  // a weapon, its form and level, two seasonings
  await press('[data-w="shotgun"]');
  await expect.poll(async () => (await range()).hand).toBe("shotgun");
  await press('[data-b="a"]');
  await press('[data-lv="5"]');
  await expect.poll(async () => (await range()).form).toEqual(["a", 5]);
  await press('[data-spice="vinegar"]');
  await press('[data-spice="vinegar"]');
  await press('[data-spice="chili"]');
  expect((await range()).spice).toEqual({ vinegar: 2, chili: 1 });

  // turn to the nearest target (the mouse would) and fire with the keyboard
  await page.evaluate(() => {
    const G = window.__G;
    const P = G.player;
    let best = null;
    let bd = 1e9;
    for (const z of G.enemies.list) {
      const d = Math.hypot(z.pos.x - P.pos.x, z.pos.z - P.pos.z);
      if (z.alive && d < bd) [bd, best] = [d, z];
    }
    P.yaw = Math.atan2(-(best.pos.x - P.pos.x), -(best.pos.z - P.pos.z));
    P.pitch = 0;
  });
  await page.keyboard.down("Enter");
  await expect.poll(async () => (await range()).dealt).toBeGreaterThan(0);
  await page.keyboard.up("Enter");

  // the special dead on request, then a course of the meal
  await press('[data-spawn="elite"]');
  await press('[data-spawn="bloater"]');
  await press('[data-spawn="boss"]');
  await expect
    .poll(async () => (await range()).ranks)
    .toBe("bloater,boss,elite");
  await press('[data-z="horde"]');
  await press('[data-course="mains"]');
  await expect.poll(async () => (await range()).standing).toBe(0);
  await expect.poll(async () => (await range()).alive).toBeGreaterThan(2);
  expect((await range()).state).toBe("playing");

  // and the address has followed every click
  const url = decodeURIComponent(page.url());
  expect(url).toContain("w=shotgun");
  expect(url).toContain("lv=5");
  expect(url).toContain("b=a");
  expect(url).toContain("spice=vinegar:2,chili:1");
  expect(url).toContain("z=horde");
  expect(url).toContain("course=mains");
  expect(url).not.toContain("ammo=");

  const runtime = await page.evaluate(() => ({
    fatal: window.__fatal,
    errors: window.__errors,
  }));
  expect(runtime.fatal).toBeNull();
  expect(runtime.errors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
