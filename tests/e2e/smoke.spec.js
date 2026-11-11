// Plays the real entry path with real mouse clicks and key presses: title → deploy →
// pause → resume → die → retry. Shortcuts like ?autostart skip the title page and once hid
// a fully blocked Deploy button, so this test must keep going through the menus.
import { test, expect } from "@playwright/test";

const state = (page) => page.evaluate(() => window.__G?.game?.state);

/**
 * Lists the visible menu buttons on screen and whether a click at each one's centre would
 * land on it (nothing drawn on top).
 */
const probeButtons = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-act]")]
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
          act: b.dataset.act,
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
async function expectButtonsReachable(page) {
  await expect
    .poll(
      async () =>
        (await probeButtons(page))
          .filter((b) => b.inView && !b.reachable)
          .map((b) => b.act),
      { message: "buttons covered by other elements", timeout: 5_000 },
    )
    .toEqual([]);
}

/** Clicks a menu button with the real mouse once nothing covers it. */
async function clickAct(page, act) {
  let target;
  await expect
    .poll(
      async () => {
        target = (await probeButtons(page)).find((b) => b.act === act);
        return target?.reachable ?? "not on screen";
      },
      { message: `"${act}" button is missing or covered`, timeout: 10_000 },
    )
    .toBe(true);
  await page.mouse.click(target.x, target.y);
}

test("a player can start, pause, die and retry with real input", async ({
  page,
}) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto("/?lang=en");
  await waitForTitle(page);
  await expectButtonsReachable(page);

  // Title → mission.
  await clickAct(page, "deploy");
  await expect.poll(() => state(page)).toBe("playing");

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

  const runtime = await page.evaluate(() => ({
    fatal: window.__fatal,
    errors: window.__errors,
  }));
  expect(runtime.fatal).toBeNull();
  expect(runtime.errors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

for (const [name, viewport] of [
  ["phone portrait", { width: 390, height: 844 }],
  ["phone landscape", { width: 844, height: 390 }],
]) {
  test(`title buttons are reachable on a ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?lang=zh-CN");
    await waitForTitle(page);
    await expectButtonsReachable(page);
  });
}
