import test from "node:test";
import assert from "node:assert/strict";
import { createFrameBudget } from "../../src/chinatown/frame-budget.js";

function harness(options = {}) {
  let time = 100;
  const scheduler = createFrameBudget({ now: () => time, ...options });
  return {
    scheduler,
    advance(duration) {
      time += duration;
    },
    setTime(value) {
      time = value;
    },
    tick(options = {}) {
      return scheduler.tick({ frameStart: time, frameMs: 16, ...options });
    },
  };
}

test("combat, hidden tabs, busy frames and exhausted budgets block work", async () => {
  const clock = harness();
  let calls = 0;
  const result = clock.scheduler.schedule(() => ++calls);
  for (let frame = 0; frame < 20; frame += 1) {
    assert.equal(clock.tick({ idle: false }), false);
  }
  assert.equal(clock.tick({ visible: false }), false);
  assert.equal(clock.tick({ frameMs: 22.01 }), false);
  assert.equal(clock.tick({ frameStart: 0 }), false);
  clock.setTime(16.67);
  assert.equal(clock.tick({ frameStart: 0 }), false);
  assert.equal(calls, 0);
  assert.equal(clock.scheduler.pending, 1);
  assert.equal(clock.tick({ frameMs: 22 }), true);
  assert.equal(await result, 1);
  assert.equal(clock.scheduler.pending, 0);
});

test("FIFO starts one task per tick and blocks reentrant ticks", async () => {
  const clock = harness();
  const order = [];
  const first = clock.scheduler.schedule(() => {
    order.push(1);
    assert.equal(clock.tick(), false);
    return "first";
  });
  const second = clock.scheduler.schedule(() => order.push(2));
  assert.deepEqual(order, []);
  assert.equal(clock.scheduler.pending, 2);
  assert.equal(clock.tick(), true);
  assert.deepEqual(order, [1]);
  assert.equal(await first, "first");
  assert.equal(clock.scheduler.pending, 1);
  assert.equal(clock.tick(), true);
  await second;
  assert.deepEqual(order, [1, 2]);
  assert.equal(clock.tick(), false);
});

test("indivisible overruns impose proportional cooldown on repeated bursts", async () => {
  for (const cost of [2, 3, 8, 20]) {
    const clock = harness();
    for (let burst = 0; burst < 2; burst += 1) {
      const expensive = clock.scheduler.schedule(() => clock.advance(cost));
      const next = clock.scheduler.schedule(() => "ready");
      assert.equal(clock.tick(), true);
      await expensive;
      assert.equal(clock.tick({ idle: false }), false);
      assert.equal(clock.tick({ visible: false }), false);
      for (let frame = 0; frame < Math.ceil(cost / 2) - 1; frame += 1) {
        assert.equal(clock.tick(), false);
      }
      assert.equal(clock.tick(), true);
      assert.equal(await next, "ready");
    }
  }
});

test("remaining time and smaller configured budgets determine cooldown", async () => {
  for (const options of [{}, { budgetMs: 0.5 }]) {
    const clock = harness(options);
    clock.setTime(16.17);
    const first = clock.scheduler.schedule(() => clock.advance(2));
    const second = clock.scheduler.schedule(() => 2);
    assert.equal(clock.tick({ frameStart: 0 }), true);
    await first;
    for (let frame = 0; frame < 3; frame += 1) {
      assert.equal(clock.tick(), false);
    }
    assert.equal(clock.tick(), true);
    assert.equal(await second, 2);
  }
});

test("configuration cannot loosen the 2 ms and 22 ms ceilings", async () => {
  const clock = harness({ budgetMs: 10, frameLimitMs: 100 });
  const first = clock.scheduler.schedule(() => clock.advance(4));
  const second = clock.scheduler.schedule(() => 2);
  assert.equal(clock.tick({ frameMs: 23 }), false);
  assert.equal(clock.tick(), true);
  await first;
  assert.equal(clock.tick(), false);
  assert.equal(clock.tick(), true);
  await second;
  const strict = harness({ frameLimitMs: 10 });
  const result = strict.scheduler.schedule(() => 1);
  assert.equal(strict.tick(), false);
  assert.equal(strict.tick({ frameMs: 10 }), true);
  await result;
});

test("async waiting never overlaps or counts as synchronous cost", async () => {
  const clock = harness();
  let complete;
  const first = clock.scheduler.schedule(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  let called = false;
  const second = clock.scheduler.schedule(() => {
    called = true;
  });
  assert.equal(clock.tick(), true);
  clock.advance(5000);
  for (let frame = 0; frame < 5; frame += 1) {
    assert.equal(clock.tick(), false);
  }
  assert.equal(clock.scheduler.pending, 2);
  complete(42);
  assert.equal(await first, 42);
  assert.equal(called, false);
  assert.equal(clock.tick({ idle: false }), false);
  assert.equal(clock.tick(), true);
  await second;
  assert.equal(called, true);
});

test("sync errors, async rejection and throwing then getters preserve FIFO", async () => {
  const clock = harness();
  const failure = new Error("task failed");
  for (const task of [
    () => {
      throw failure;
    },
    () => Promise.reject(failure),
    () => ({
      get then() {
        throw failure;
      },
    }),
  ]) {
    const rejected = clock.scheduler.schedule(task);
    const checked = assert.rejects(rejected, (error) => error === failure);
    const next = clock.scheduler.schedule(() => "recovered");
    assert.equal(clock.tick(), true);
    await checked;
    assert.equal(clock.tick(), true);
    assert.equal(await next, "recovered");
  }
  await assert.rejects(clock.scheduler.schedule(null), TypeError);
  assert.equal(clock.scheduler.pending, 0);
});

test("invalid timing fails closed without dropping queued tasks", async () => {
  const clock = harness();
  const result = clock.scheduler.schedule(() => 7);
  for (const value of [NaN, Infinity, -Infinity, undefined, null, "16", -1]) {
    assert.equal(clock.tick({ frameStart: value }), false);
    assert.equal(clock.tick({ frameMs: value }), false);
  }
  assert.equal(clock.scheduler.tick(), false);
  assert.equal(clock.tick({ frameStart: 101 }), false);
  for (const value of [NaN, Infinity, "100", 99, Symbol("clock"), 100n]) {
    clock.setTime(value);
    assert.equal(clock.tick({ frameStart: 100 }), false);
  }
  clock.setTime(100);
  assert.equal(clock.tick(), true);
  assert.equal(await result, 7);
});

test("invalid or throwing clocks cannot strand the queue", async () => {
  for (const invalid of [NaN, 99, "throw", Symbol("clock"), 100n]) {
    let time = 100;
    const clock = harness({
      now: () => {
        if (time === "throw") throw new Error("clock failed");
        return time;
      },
    });
    const first = clock.scheduler.schedule(() => {
      time = invalid;
    });
    const next = clock.scheduler.schedule(() => 3);
    assert.equal(clock.tick(), true);
    await first;
    assert.equal(clock.tick(), false);
    time = 100;
    assert.equal(clock.tick(), false);
    assert.equal(clock.tick(), true);
    assert.equal(await next, 3);
  }
});

test("invalid configuration is rejected immediately", () => {
  assert.throws(() => createFrameBudget({ now: null }), TypeError);
  for (const value of [0, -1, NaN, Infinity, "2", null]) {
    assert.throws(() => createFrameBudget({ budgetMs: value }), RangeError);
    assert.throws(() => createFrameBudget({ frameLimitMs: value }), RangeError);
  }
});
