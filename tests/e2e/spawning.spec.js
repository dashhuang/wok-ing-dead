import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

test("ground spawns spread across temple entrances and stay out of sight", async ({
  page,
}) => {
  await page.addInitScript({
    path: fileURLToPath(
      new URL("../support/fake-pointer-lock.js", import.meta.url),
    ),
  });
  await page.route("**/api/telemetry", (r) => r.fulfill({ status: 204 }));
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
  const result = await page.evaluate(() => {
    const G = __G,
      picker = G.game.spawnDirector,
      E = G.enemies,
      S = G.run.state;
    G.player.damage = () => false;
    E.clear();
    const place = (x, z) => {
      G.player.pos.set(x, G.physics.groundHeight(x, z, 1.5), z);
      G.player.eye.copy(G.player.pos);
      G.player.eye.y += 1.68;
      G.camera.position.copy(G.player.eye);
      G.camera.lookAt(x, G.player.eye.y, z - 10);
      G.camera.updateMatrixWorld(true);
      picker.reset();
    };
    const scenes = [];
    for (const [x, z] of [
      [10, 20.7],
      [22, 21],
      [15, 15],
    ]) {
      place(x, z);
      const counts = {},
        sites = new Set();
      let unsafe = 0,
        none = 0;
      for (let i = 0; i < 100; i++) {
        G.game.run.time += 0.8;
        const p = picker.pick({ minDist: 16 });
        if (!p) {
          none++;
          continue;
        }
        const key = p.spawnRoute.approach;
        counts[key] = (counts[key] || 0) + 1;
        sites.add(`${Math.round(p.x / 6)},${Math.round(p.z / 6)}`);
        if (
          !picker.safe(p, { minDist: 16 }) ||
          !G.physics.nav.findPath(p, G.player.pos)
        )
          unsafe++;
      }
      scenes.push({
        position: [x, z],
        counts,
        neighborhoods: sites.size,
        unsafe,
        none,
      });
    }
    // Exercise the production run -> pickSpawn -> q -> spawn path, including packs.
    place(22, 21);
    S.t = 210;
    S.eliteAt = Infinity;
    S.picking = null;
    const spawned = [];
    const off = G.events.on("enemy:spawn", ({ enemy }) => {
      const last = picker.debug.last;
      spawned.push({
        distance: enemy.pos.distanceTo(G.player.pos),
        safe: picker.safe(enemy.pos, { minDist: 16 }),
        approach: last?.approach,
      });
    });
    for (let i = 0; i < 50; i++) {
      E.clear();
      S.spawnT = 0;
      G.game.run.time += 0.8;
      G.run.update(0.05, 0.05);
    }
    if (typeof off === "function") off();
    E.clear();
    // A queued point can become unsafe before its turn. Resume through the real
    // button and let the game update drain both that point and an unpicked entry.
    S.spawnT = 60;
    G.game.run.queue.push(
      { type: "walker", pos: G.player.pos.clone(), at: G.game.run.time },
      { type: "walker", pos: null, at: G.game.run.time },
    );
    window.__queuedSpawns = [];
    G.events.on("enemy:spawn", ({ enemy }) => {
      window.__queuedSpawns.push({
        distance: enemy.pos.distanceTo(G.player.pos),
        safe: picker.safe(enemy.pos, { minDist: 16 }),
        reachable: !!G.physics.nav.findPath(enemy.pos, G.player.pos),
      });
    });
    return { scenes, spawned, errors: window.__errors };
  });
  await page.locator('[data-act="resume"]:visible').click();
  await expect
    .poll(() => page.evaluate(() => window.__queuedSpawns.length))
    .toBe(2);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => __G.game.state)).toBe("paused");
  result.queued = await page.evaluate(() => window.__queuedSpawns);
  result.errors = await page.evaluate(() => window.__errors);
  await test.info().attach("spawn-distribution", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  for (const scene of result.scenes) {
    expect(
      scene.counts["temple:front"] || 0,
      JSON.stringify(scene),
    ).toBeGreaterThan(15);
    expect(
      scene.counts["temple:side"] || 0,
      JSON.stringify(scene),
    ).toBeGreaterThan(15);
    expect(scene.neighborhoods).toBeGreaterThan(6);
    expect(scene.unsafe).toBe(0);
    expect(scene.none).toBeLessThan(5);
  }
  expect(result.spawned.length).toBeGreaterThanOrEqual(40);
  expect(result.spawned.every((z) => z.distance >= 16 && z.safe)).toBe(true);
  expect(
    result.queued.every((z) => z.distance >= 16 && z.safe && z.reachable),
  ).toBe(true);
  expect(result.errors).toEqual([]);
});
