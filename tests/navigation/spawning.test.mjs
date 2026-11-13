import { test } from "node:test";
import assert from "node:assert/strict";
import { createSpawnPicker, approachOf } from "../../src/chinatown/spawning.js";
import { world, V } from "./world.mjs";

const random = (seed) => () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const region = {
  id: "room",
  x0: -3,
  x1: 3,
  z0: -3,
  z1: 3,
  entrances: [
    { id: "front", a: { x: -1, z: -3 }, b: { x: 1, z: -3 } },
    { id: "side", a: { x: -3, z: -1 }, b: { x: -3, z: 1 } },
  ],
};
function fixture() {
  const physics = world([-20, -20], [20, 20]);
  for (const [a, b] of [
    [
      [-3.2, 0, -3.2],
      [-1, 3, -3],
    ],
    [
      [1, 0, -3.2],
      [3.2, 3, -3],
    ],
    [
      [-3.2, 0, -3],
      [-3, 3, -1],
    ],
    [
      [-3.2, 0, 1],
      [-3, 3, 3.2],
    ],
    [
      [3, 0, -3],
      [3.2, 3, 3.2],
    ],
    [
      [-3, 0, 3],
      [3.2, 3, 3.2],
    ],
  ])
    physics.addBox(a, b);
  const sites = [];
  for (const x of [5, 6, 7, 8])
    for (const z of [-14, -16]) sites.push({ pos: V(x, 0, z) });
  for (const z of [6, 8]) sites.push({ pos: V(-14, 0, z) });
  let time = 0;
  const G = {
    THREE: { Vector3: V().constructor },
    physics,
    player: { pos: V(0, 0, 0), eye: V(0, 1.68, 0), forward: V(0, 0, -1) },
    level: { spawnRegions: [region] },
    enemies: { list: [] },
    rng: random(123),
  };
  const picker = createSpawnPicker(G, {
    sites: () => sites,
    clock: () => time,
  });
  return {
    G,
    picker,
    sites,
    advance: () => {
      time += 1;
    },
  };
}

test("room approaches follow entrance crossings, not the spawn-point bearing", () => {
  const target = V(0, 0, 0),
    start = V(6, 0, -12);
  const front = [V(0, 0, -4), target],
    side = [V(-4, 0, -4), V(-4, 0, 0), target];
  assert.equal(approachOf(start, front, target, region), "room:front");
  assert.equal(approachOf(start, side, target, region), "room:side");
});

test("both entrances get arrivals despite four times as many points on one side", () => {
  const { G, picker, advance } = fixture(),
    counts = {};
  for (let i = 0; i < 160; i++) {
    const p = picker.pick({ minDist: 10 });
    assert.ok(p);
    counts[p.spawnRoute.approach] = (counts[p.spawnRoute.approach] || 0) + 1;
    assert.ok(p.distanceTo(G.player.pos) >= 10);
    assert.ok(G.physics.nav.findPath(p, G.player.pos));
    assert.ok(picker.debug.last.searches <= 5);
    advance();
  }
  assert.ok(counts["room:front"] > 40, JSON.stringify(counts));
  assert.ok(counts["room:side"] > 40, JSON.stringify(counts));
});

test("live attackers lower the chance of sending another batch down their entrance", () => {
  const { G, picker, advance } = fixture();
  let source;
  for (let i = 0; i < 20 && !source; i++) {
    const p = picker.pick({ minDist: 10 });
    if (p?.spawnRoute.approach === "room:front") source = p;
    advance();
  }
  assert.ok(source);
  for (let i = 0; i < 18; i++) {
    const z = { id: i, alive: true, pos: V(0, 0, -6), mode: "engage" };
    G.enemies.list.push(z);
    picker.note(z, source);
  }
  picker.reset();
  let side = 0;
  for (let i = 0; i < 100; i++) {
    const p = picker.pick({ minDist: 10 });
    if (p?.spawnRoute.approach === "room:side") side++;
    advance();
  }
  const baseline = fixture();
  let without = 0;
  for (let i = 0; i < 100; i++) {
    const p = baseline.picker.pick({ minDist: 10 });
    if (p?.spawnRoute.approach === "room:side") without++;
    baseline.advance();
  }
  assert.ok(
    side > without + 10 && side > 55,
    `side arrivals: ${without} without attackers, ${side} with attackers`,
  );
});

test("local repeat pressure also spreads sites within a single approach", () => {
  const { picker, sites, G } = fixture();
  sites.splice(
    0,
    sites.length,
    ...[-18, -9, 0, 9, 18].map((x) => ({ pos: V(x, 0, 17) })),
  );
  G.level.spawnRegions = [];
  G.physics.lineOfSight = () => false;
  const picked = [];
  for (let i = 0; i < 12; i++) {
    const p = picker.pick({ minDist: 10 });
    if (p) picked.push(p.x);
  }
  assert.ok(Math.max(...picked) - Math.min(...picked) > 24);
});

test("close or visible points defer spawning, and pack offsets keep the same safety margin", () => {
  const { picker, sites, G } = fixture();
  sites.splice(0, sites.length, { pos: V(0, 0, -15) }, { pos: V(0, 0, 2) });
  assert.equal(picker.pick({ minDist: 10 }), null);
  assert.equal(picker.debug.last.reason, "no-safe-route");
  G.physics.lineOfSight = () => false;
  sites.splice(0, sites.length, { pos: V(5, 0, -14) });
  const base = picker.pick({ minDist: 14 });
  assert.ok(base);
  for (let i = 0; i < 40; i++) {
    const p = picker.scatter(base, 1.6, { minDist: 14 });
    assert.ok(p);
    assert.ok(p.distanceTo(G.player.pos) >= 14);
    assert.ok(G.physics.nav.clearLine(base, p));
  }
});

test("opening a route invalidates cached failures; reset forgets previous neighborhood pressure", () => {
  const { picker, G, sites } = fixture();
  G.physics.lineOfSight = () => false;
  sites.splice(0, sites.length, { pos: V(-14, 0, 6) });
  const wall = G.physics.addBox([-3.2, 0, -1], [-3, 3, 1]);
  // Also close the other door so a cached failure really is unreachable.
  G.physics.addBox([-1, 0, -3.2], [1, 3, -3]);
  assert.equal(picker.pick({ minDist: 10 }), null);
  G.physics.removeBox(wall);
  assert.ok(picker.pick({ minDist: 10 }));
  picker.reset();
  G.rng = random(42);
  const first = picker.pick({ minDist: 10 }).toArray();
  picker.reset();
  G.rng = random(42);
  assert.deepEqual(picker.pick({ minDist: 10 }).toArray(), first);
});
