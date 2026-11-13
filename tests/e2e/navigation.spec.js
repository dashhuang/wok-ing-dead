import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

test("a horde spreads on the street and follows through the market and temple", async ({
  page,
}) => {
  await page.addInitScript({
    path: fileURLToPath(
      new URL("../support/fake-pointer-lock.js", import.meta.url),
    ),
  });
  await page.route("**/api/telemetry", (r) => r.fulfill({ status: 204 }));
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?q=low&lang=zh-CN&noaudio=1");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__G?.game?.state === "title" &&
          document.getElementById("boot")?.classList.contains("done"),
      ),
    )
    .toBe(true);
  await page.locator('[data-act="deploy"]:visible').click();
  await expect
    .poll(() => page.evaluate(() => __G.run.state.picking?.guard <= 0))
    .toBe(true);
  await page.keyboard.press("Digit2");
  await expect
    .poll(() => page.evaluate(() => __G.run.state.picking))
    .toBeNull();
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => __G.game.state)).toBe("paused");

  // After entering by mouse/key, advance the actual enemies deterministically.
  // Rendering and the run director stay paused; there is no test-only steering model.
  const results = await page.evaluate(() => {
    const G = __G,
      V = (x, y, z) => new G.THREE.Vector3(x, y, z);
    const enemies = G.enemies,
      p = G.physics;
    G.player.damage = () => false;
    const tick = () => {
      G.time.t += 0.05;
      G.time.frame++;
      enemies.update(0.05);
    };
    enemies.clear();
    G.player.pos.set(-8, 0, 6);
    const group = [];
    for (let i = 0; i < 10; i++) {
      const z = enemies.spawn("walker", V(-20 - i * 0.65, 0, 6), {
        state: "alert",
        runner: true,
        yaw: Math.PI / 2,
      });
      if (z) group.push(z);
    }
    for (let i = 0; i < 70; i++) tick();
    const positions = group.map((z) => ({ x: z.pos.x, z: z.pos.z }));
    const width =
      Math.max(...positions.map((p) => p.z)) -
      Math.min(...positions.map((p) => p.z));
    enemies.clear();
    G.player.pos.copy(G.level.playerStart.pos);
    const routes = [];
    // Gate, north alley, market interior, temple and east-side stalls.
    for (const xz of [
      [-38, 16.6],
      [2, -27],
      [20, -23],
      [9, 21],
      [28, 21.5],
      [34.2, -12.3],
    ]) {
      const z = enemies.spawn("walker", V(xz[0], 0, xz[1]), {
        state: "alert",
        runner: true,
      });
      let frames = 0;
      const distance = () =>
        Math.hypot(z.pos.x - G.player.pos.x, z.pos.z - G.player.pos.z);
      for (; frames < 2400 && distance() > z.reach + 0.1; frames++) tick();
      routes.push({
        start: xz,
        distance: distance(),
        seconds: frames * 0.05,
        end: z.pos.toArray(),
      });
      enemies.clear();
    }
    // Isolate a body-width L bend to exercise the actual follower's waypoint
    // tolerance (walking the mathematical path alone doesn't catch corner cutting).
    const saved = p.boxes.splice(0);
    let corner;
    try {
      p.addBox([-23, 0, 5.2], [-16.3, 3, 5.66]);
      p.addBox([-23, 0, 6.34], [-17.34, 3, 10]);
      p.addBox([-16.66, 0, 5.2], [-16.3, 3, 10]);
      p.build();
      G.player.pos.set(-17, 0, 8.8);
      const z = enemies.spawn("walker", V(-21.5, 0, 6), {
        state: "alert",
        runner: true,
        yaw: Math.PI / 2,
      });
      for (let i = 0; i < 400; i++) tick();
      corner = z.pos.distanceTo(G.player.pos);
    } finally {
      enemies.clear();
      p.boxes.splice(0, p.boxes.length, ...saved);
      p.build();
    }
    return { width, positions, routes, corner, errors: window.__errors };
  });
  await test.info().attach("navigation-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  expect(results.width).toBeGreaterThan(1.1);
  expect(results.corner).toBeLessThan(1.7);
  expect(results.positions.every((p, i) => p.x > -20 - i * 0.65 + 1)).toBe(
    true,
  );
  for (const r of results.routes)
    expect(r.distance, JSON.stringify(r)).toBeLessThan(1.7);
  expect(results.errors).toEqual([]);
  expect(errors).toEqual([]);
});
