import { test } from "node:test";
import assert from "node:assert/strict";
import { createCrowd } from "../../src/chinatown/crowd.js";
import { world, V } from "./world.mjs";

function setup() {
  const physics = world(),
    list = [];
  const crowd = createCrowd({
    nav: physics.nav,
    list,
    vector: V,
    move: (...args) => physics.moveCapsule(...args),
  });
  const zombie = (id, x, z) => {
    const body = {
      id,
      pos: V(x, 0, z),
      alive: true,
      mode: "engage",
      reach: 1.5,
      ctl: { pin: 0, lift: 0, fear: 0 },
    };
    list.push(body);
    return body;
  };
  return { physics, crowd, zombie };
}

test("an aligned follower chooses space beside the leader before contact", () => {
  const { crowd, zombie } = setup();
  const z = zombie(1, 0, -3);
  zombie(2, 0, -1.8);
  const target = V(0, 0, 4);
  const a = crowd.aim(z, target).clone();
  assert.ok(Math.abs(a.x) > 0.15);
  assert.ok(a.z > z.pos.z);
  assert.deepEqual(crowd.aim(z, target), a);
});

test("approach positions spread out but queue in a narrow passage", () => {
  const { physics, crowd, zombie } = setup();
  const a = zombie(1, 0, -3),
    b = zombie(2, 0, -4),
    target = V(0, 0, 4);
  assert.ok(
    Math.abs(crowd.goal(a, target).clone().x - crowd.goal(b, target).x) > 0.5,
  );
  physics.addBox([-6, 0, -6], [-0.34, 3, 6]);
  physics.addBox([0.34, 0, -6], [6, 3, 6]);
  assert.equal(crowd.goal(a, target), target);
  assert.equal(crowd.aim(b, target), target);
});

test("overlapping spawns separate, stay outside walls and cannot move a pinned zombie", () => {
  const { physics, crowd, zombie } = setup();
  physics.addBox([-6, 0, -6], [-0.31, 3, 6]);
  const a = zombie(1, 0, 0),
    b = zombie(2, 0, 0);
  a.ctl.pin = 2;
  for (let i = 0; i < 60; i++) crowd.separate(1 / 60);
  assert.equal(a.pos.length(), 0);
  assert.ok(a.pos.distanceTo(b.pos) > 0.5);
  assert.ok(b.pos.x >= -0.01);
});
