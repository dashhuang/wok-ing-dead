import { test } from "node:test";
import assert from "node:assert/strict";
import { world, V, walk } from "./world.mjs";

test("player-sized gaps stay connected at different sub-cell alignments", () => {
  for (const gap of [0.65, 0.72, 0.9])
    for (const offset of [0, 0.035, 0.11, 0.21]) {
      const p = world();
      p.addBox([-6, 0, -0.3], [offset, 3, 0.3]);
      p.addBox([offset + gap, 0, -0.3], [6, 3, 0.3]);
      const a = V(offset + gap / 2, 0, -3),
        b = V(offset + gap / 2, 0, 3);
      walk(p, a, [b], 0.32);
      // Force the grid route to bend toward the opening, not just the straight-line shortcut.
      const from = V(-2, 0, -3),
        to = V(2, 0, 3);
      const path = p.nav.findPath(from, to);
      assert.ok(path, `gap ${gap}, offset ${offset}`);
      walk(p, from, path);
      assert.ok(p.nav.reachableFrom(from)(to));
    }
});

test("a gap narrower than a body, thin walls and noNav props remain solid", () => {
  const p = world();
  p.addBox([-6, 0, -0.01], [0, 3, 0.01], { noNav: true });
  p.addBox([0.59, 0, -0.01], [6, 3, 0.01]);
  const a = V(0.295, 0, -2),
    b = V(0.295, 0, 2);
  assert.equal(p.nav.clearLine(a, b), false);
  assert.equal(p.nav.findPath(a, b), null);
});

test("continuous steps reach a platform above one step, but cannot be climbed from its back", () => {
  const p = world();
  p.addBox([-2, 0, -1], [2, 0.3, 0]);
  p.addBox([-2, 0, 0], [2, 0.6, 1]);
  p.addBox([-2, 0, 1], [2, 0.9, 4]);
  const a = V(0, 0, -3),
    b = V(0, 0.9, 3);
  assert.ok(p.nav.clearLine(a, b));
  walk(p, a, [b], 0.32);
  walk(p, a, p.nav.findPath(a, b));
  assert.equal(p.nav.clearLine(V(0, 0, 5), b), false);
  const path = p.nav.findPath(V(0, 0, 5), b);
  assert.ok(path);
  walk(p, V(0, 0, 5), path);
});

test("a jump-only box and a low ceiling do not become ground routes", () => {
  const p = world();
  p.addBox([-2, 0, -1], [2, 0.7, 1]);
  assert.equal(p.nav.findPath(V(0, 0, -3), V(0, 0.7, 0)), null);
  p.addBox([-6, 1.5, -0.5], [6, 3, 0.5]);
  assert.equal(p.nav.findPath(V(0, 0, -3), V(0, 0, 3)), null);
});

test("smoothed paths around concave corners remain walkable by the actual mover", () => {
  const p = world();
  p.addBox([-2, 0, -2], [-1, 3, 2]);
  p.addBox([-2, 0, 1], [2, 3, 2]);
  const a = V(0, 0, 0),
    b = V(-3, 0, 3);
  const path = p.nav.findPath(a, b);
  assert.ok(path?.length > 1);
  walk(p, a, path);
});

test("adding and removing collision boxes invalidates paths", () => {
  const p = world(),
    a = V(0, 0, -2),
    b = V(0, 0, 2);
  assert.ok(p.nav.clearLine(a, b));
  const wall = p.addBox([-6, 0, 0], [6, 3, 0.1]);
  assert.equal(p.nav.findPath(a, b), null);
  p.removeBox(wall);
  assert.ok(p.nav.findPath(a, b));
});

test("local obstacle updates agree with a full rebuild, including reopened regions", () => {
  const p = world();
  p.addBox([-6, 0, -0.2], [-0.34, 3, 0.2]);
  p.addBox([0.34, 0, -0.2], [6, 3, 0.2]);
  const a = V(0, 0, -3),
    b = V(0, 0, 3);
  p.build();
  for (let i = 0; i < 4; i++) {
    const box = p.addBox(
      [-0.2, 0, -0.1 + i * 0.03],
      [0.2, 0.9, 0.3 + i * 0.03],
    );
    for (const remove of [false, true]) {
      if (remove) p.removeBox(box);
      const route = p.nav.findPath(a, b);
      assert.equal(!!route, remove);
      const grid = p.nav._grid().blocked.slice();
      p.build();
      assert.deepEqual(p.nav._grid().blocked, grid);
      assert.deepEqual(p.nav.findPath(a, b), route);
    }
  }
});
