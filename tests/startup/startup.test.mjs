import test from "node:test";
import assert from "node:assert/strict";
import {
  createCalibrationWindow,
  prepareStartup,
  waitForGpu,
} from "../../src/chinatown/startup.js";

function sample(window, count, duration, signature = "stable") {
  return Array.from({ length: count }, () =>
    window.observe(signature, duration),
  );
}

test("calibration requires minimum frames AND minimum duration", () => {
  const frames = createCalibrationWindow({ minFrames: 3, minMs: 20 });
  assert.deepEqual(sample(frames, 4, 100), [false, false, false, true]);
  const duration = createCalibrationWindow({ minFrames: 2, minMs: 50 });
  assert.deepEqual(sample(duration, 6, 10), [
    false,
    false,
    false,
    false,
    false,
    true,
  ]);
});

test("signature changes reset both counters", () => {
  const window = createCalibrationWindow({ minFrames: 2, minMs: 30 });
  assert.deepEqual(sample(window, 2, 20, "high"), [false, false]);
  assert.equal(window.observe("low", 1000), false);
  assert.deepEqual(sample(window, 3, 10, "low"), [false, false, true]);
});

test("hidden and invalid samples reset calibration", () => {
  for (const [duration, visible] of [
    [20, false],
    [NaN, true],
    [Infinity, true],
    [-Infinity, true],
    [0, true],
    [-1, true],
    [undefined, true],
    ["20", true],
  ]) {
    const window = createCalibrationWindow({ minFrames: 2, minMs: 40 });
    sample(window, 2, 20);
    assert.equal(window.observe("stable", duration, visible), false);
    assert.deepEqual(sample(window, 3, 20), [false, false, true]);
  }
});

test("fixed calibration uses a small three-frame window", () => {
  const window = createCalibrationWindow({ minFrames: 3, minMs: 0 });
  assert.deepEqual(sample(window, 4, 1), [false, false, false, true]);
});

function value(initial) {
  return {
    ...initial,
    clone() {
      return value(
        Object.fromEntries(
          Object.entries(this).filter(
            ([, entry]) => typeof entry !== "function",
          ),
        ),
      );
    },
    copy(source) {
      for (const [key, entry] of Object.entries(source)) {
        if (typeof entry !== "function") this[key] = entry;
      }
      return this;
    },
  };
}

function startupHarness(context, options = {}) {
  let clock = 0;
  let calibration = false;
  let calibrationFrames = 0;
  let warmups = 0;
  let requests = 0;
  let deliveredFrames = 0;
  const events = [];
  const listeners = new Set();
  const document = {
    hidden: false,
    addEventListener(name, listener) {
      assert.equal(name, "visibilitychange");
      listeners.add(listener);
    },
    removeEventListener(name, listener) {
      assert.equal(name, "visibilitychange");
      listeners.delete(listener);
    },
  };
  function setHidden(hidden) {
    document.hidden = hidden;
    events.push(hidden ? "hidden" : "visible");
    for (const listener of [...listeners]) listener();
  }
  const child = { visible: false };
  const weaponVisible = options.weaponVisible ?? false;
  const weaponRoot = options.missingWeaponRoot
    ? undefined
    : { visible: weaponVisible };
  const weaponVisibilityCalls = [];
  const camera = {
    visible: true,
    position: value({ x: 4, y: 5, z: 6 }),
    quaternion: value({ x: 0, y: 0, z: 0, w: 1 }),
    rotation: {
      y: 0,
      set(pitch, yaw, roll, order) {
        assert.equal(order, "YXZ");
        this.y = yaw;
        camera.quaternion.y = 0.5;
      },
    },
    traverse(visitor) {
      visitor(camera);
      visitor(child);
      if (weaponRoot) visitor(weaponRoot);
    },
  };
  const originalPosition = camera.position.clone();
  const originalQuaternion = camera.quaternion.clone();
  const game = {
    camera,
    level: { playerStart: { pos: { x: 10, y: 2, z: 30 }, yaw: 0.4 } },
    time: { frame: 0 },
    params: options.params ?? { dynres: "0" },
    quality: { name: "high" },
    weapon: {
      root: weaponRoot,
      logicalVisible: weaponVisible,
      setVisible(visible) {
        weaponVisibilityCalls.push(visible);
        this.logicalVisible = visible;
        if (this.root) this.root.visible = visible;
        child.visible = visible;
        camera.visible = false;
      },
    },
    renderer: {
      getContext: () => ({ isContextLost: () => !!options.contextLost }),
    },
    render: {
      preparing: false,
      get calibrationReady() {
        return calibrationFrames >= (options.readyAfter ?? 0);
      },
      frame(delta) {
        assert.equal(delta, 1 / 60);
        events.push(calibration ? "calibration-draw" : "warmup-draw");
        if (!calibration) return;
        calibrationFrames++;
        if (options.changeQuality && calibrationFrames === 2) {
          game.quality.name = "low";
          events.push("quality-change");
        }
      },
      skipFrame() {
        events.push("skip");
      },
      beginCalibration() {
        calibration = true;
        this.preparing = false;
        events.push("calibration-begin");
      },
      endCalibration() {
        calibration = false;
        this.preparing = false;
        events.push("calibration-end");
      },
      stats() {
        return {
          scale: 1,
          res: "800x600",
          programs: options.unstable ? calibrationFrames : 5,
        };
      },
    },
    run: {
      async prepareStartup(draw, progress) {
        warmups++;
        calibration = false;
        events.push("essential-start");
        assert.equal(game.render.preparing, true);
        await draw(2);
        await progress?.();
        if (options.warmupError) throw options.warmupError;
        events.push("essential-finish");
      },
    },
  };
  const replacements = {
    document,
    performance: { now: () => clock },
    requestAnimationFrame(callback) {
      requests++;
      assert.ok(requests < 1000, "mock RAF runaway");
      queueMicrotask(() => {
        clock += options.frameMs ?? 20;
        if (
          (options.hide || options.suspendRaf) &&
          calibration &&
          calibrationFrames === (options.suspendRaf ? 4 : 2) &&
          !events.includes("hidden")
        ) {
          setHidden(true);
          if (options.suspendRaf) {
            const before = deliveredFrames;
            clock += options.hiddenGap ?? 70000;
            assert.equal(deliveredFrames, before);
            events.push("raf-suspended");
            setHidden(false);
          } else {
            deliveredFrames++;
            callback(clock);
            queueMicrotask(() => {
              clock += options.hiddenGap ?? 70000;
              setHidden(false);
            });
            return;
          }
        }
        deliveredFrames++;
        callback(clock);
      });
      return requests;
    },
  };
  for (const [name, replacement] of Object.entries(replacements)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: replacement,
    });
    context.after(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    });
  }
  return {
    game,
    events,
    listeners,
    report: async (phase) => {
      events.push(phase);
    },
    get warmups() {
      return warmups;
    },
    get calibrationFrames() {
      return calibrationFrames;
    },
    assertRestored() {
      for (const key of ["x", "y", "z"]) {
        assert.equal(camera.position[key], originalPosition[key]);
      }
      for (const key of ["x", "y", "z", "w"]) {
        assert.equal(camera.quaternion[key], originalQuaternion[key]);
      }
      assert.equal(camera.visible, true);
      assert.equal(child.visible, false);
      assert.equal(game.weapon.logicalVisible, weaponVisible);
      if (weaponRoot) assert.equal(weaponRoot.visible, weaponVisible);
      assert.deepEqual(weaponVisibilityCalls, [true, weaponVisible]);
      assert.equal(listeners.size, 0);
      assert.equal(game.render.preparing, false);
      assert.equal(events.at(-1), "calibration-end");
    },
  };
}

test("essential and directional draws finish BEFORE calibration", async (context) => {
  const harness = startupHarness(context);
  await prepareStartup(harness.game, harness.report);
  const begin = harness.events.indexOf("calibration-begin");
  const essential = harness.events.indexOf("essential-finish");
  assert.ok(essential < harness.events.indexOf("boot.calibrate"));
  assert.ok(harness.events.indexOf("boot.calibrate") < begin);
  assert.equal(
    harness.events
      .slice(0, essential)
      .filter((event) => event === "warmup-draw").length,
    2,
  );
  assert.equal(
    harness.events
      .slice(essential, begin)
      .filter((event) => event === "warmup-draw").length,
    8,
  );
  assert.equal(harness.calibrationFrames, 5);
  assert.equal(harness.warmups, 1);
  harness.assertRestored();
});

test("quality change rewarms essential draws before fresh calibration", async (context) => {
  const harness = startupHarness(context, { changeQuality: true });
  await prepareStartup(harness.game, harness.report);
  const afterChange = harness.events.slice(
    harness.events.indexOf("quality-change") + 1,
  );
  assert.deepEqual(afterChange.slice(0, 7), [
    "boot.warmup",
    "essential-start",
    "warmup-draw",
    "warmup-draw",
    "essential-finish",
    "boot.calibrate",
    "calibration-begin",
  ]);
  assert.equal(harness.warmups, 2);
  assert.equal(harness.calibrationFrames, 7);
  harness.assertRestored();
});

test("normal calibration waits for duration beyond minimum frame count", async (context) => {
  const harness = startupHarness(context, { params: {}, frameMs: 20 });
  await prepareStartup(harness.game, harness.report);
  assert.equal(harness.calibrationFrames, 92);
  harness.assertRestored();
});

for (const params of [{ shot: "1" }, { show: "1" }, { dynres: "0" }]) {
  test(
    "fixed mode " + JSON.stringify(params) + " uses the small window",
    async (context) => {
      const harness = startupHarness(context, {
        params,
        frameMs: 1,
        readyAfter: Infinity,
      });
      await prepareStartup(harness.game, harness.report);
      assert.equal(harness.calibrationFrames, 5);
      harness.assertRestored();
    },
  );
}

test("hidden gap is excluded from timeout and resets stable samples", async (context) => {
  const harness = startupHarness(context, { hide: true, hiddenGap: 70000 });
  await prepareStartup(harness.game, harness.report);
  assert.equal(harness.events.filter((event) => event === "skip").length, 3);
  const hidden = harness.events.indexOf("hidden");
  const visible = harness.events.indexOf("visible");
  assert.deepEqual(harness.events.slice(hidden, visible + 1), [
    "hidden",
    "skip",
    "skip",
    "visible",
  ]);
  assert.equal(harness.calibrationFrames, 7);
  assert.equal(harness.listeners.size, 0);
  harness.assertRestored();
});

test("warmup rejection restores camera and original visibility", async (context) => {
  const failure = new Error("essential preparation failed");
  const harness = startupHarness(context, { warmupError: failure });
  await assert.rejects(
    prepareStartup(harness.game, harness.report),
    (error) => error === failure,
  );
  assert.equal(harness.events.includes("calibration-begin"), false);
  harness.assertRestored();
});

test("mock context loss rejects and restores camera and visibility", async (context) => {
  const harness = startupHarness(context, { contextLost: true });
  await assert.rejects(
    prepareStartup(harness.game, harness.report),
    /WebGL context lost during preparation/,
  );
  harness.assertRestored();
});

test("unstable calibration rejects after visible-time timeout", async (context) => {
  const harness = startupHarness(context, { unstable: true, frameMs: 1000 });
  await assert.rejects(
    prepareStartup(harness.game, harness.report),
    /Startup calibration did not settle/,
  );
  assert.equal(harness.calibrationFrames, 62);
  harness.assertRestored();
});

test("no RAF during a 70-second hidden interval excludes the gap and resets stability", async (context) => {
  const harness = startupHarness(context, {
    suspendRaf: true,
    hiddenGap: 70000,
  });
  await prepareStartup(harness.game, harness.report);
  const hidden = harness.events.indexOf("hidden");
  const visible = harness.events.indexOf("visible");
  assert.deepEqual(harness.events.slice(hidden, visible + 1), [
    "hidden",
    "skip",
    "raf-suspended",
    "visible",
  ]);
  assert.equal(harness.calibrationFrames, 9);
  harness.assertRestored();
});

test("normal calibration waits for renderer readiness after stable samples", async (context) => {
  const harness = startupHarness(context, { params: {}, readyAfter: 100 });
  await prepareStartup(harness.game, harness.report);
  assert.equal(harness.calibrationFrames, 100);
  harness.assertRestored();
});

test("renderer never ready causes timeout and removes visibility listener", async (context) => {
  const harness = startupHarness(context, {
    params: {},
    readyAfter: Infinity,
    frameMs: 1000,
  });
  await assert.rejects(
    prepareStartup(harness.game, harness.report),
    /Startup calibration did not settle/,
  );
  assert.equal(harness.calibrationFrames, 62);
  harness.assertRestored();
});

test("fixed mode does not wait for adaptive renderer readiness", async (context) => {
  const harness = startupHarness(context, { readyAfter: Infinity });
  await prepareStartup(harness.game, harness.report);
  assert.equal(harness.calibrationFrames, 5);
  harness.assertRestored();
});

for (const weaponVisible of [false, true]) {
  for (const fails of [false, true]) {
    test(
      "weapon logical visibility " +
        weaponVisible +
        " restores on " +
        (fails ? "failure" : "success"),
      async (context) => {
        const failure = new Error("warmup failed");
        const harness = startupHarness(context, {
          weaponVisible,
          warmupError: fails ? failure : undefined,
        });
        if (fails) {
          await assert.rejects(
            prepareStartup(harness.game, harness.report),
            (error) => error === failure,
          );
        } else {
          await prepareStartup(harness.game, harness.report);
        }
        harness.assertRestored();
      },
    );
  }
}

test("missing weapon root restores logical visibility to false", async (context) => {
  const harness = startupHarness(context, { missingWeaponRoot: true });
  await prepareStartup(harness.game, harness.report);
  assert.equal(harness.game.weapon.root, undefined);
  harness.assertRestored();
});

for (const fails of [false, true]) {
  test(
    "startup scene and gameplay FOV restore on " +
      (fails ? "failure" : "success"),
    async (context) => {
      const harness = startupHarness(context, {
        warmupError: fails ? new Error("warmup") : undefined,
      });
      const game = harness.game;
      game.camera.fov = 50;
      game.camera.updateProjectionMatrix = () => {};
      game.player = { baseFov: 74 };
      let staged = false;
      let ambientFrames = 0;
      game.level.update = () => {
        ambientFrames++;
      };
      game.run.stageStartup = async () => {
        assert.equal(game.camera.fov, 74);
        staged = true;
        return () => {
          staged = false;
        };
      };
      if (fails)
        await assert.rejects(prepareStartup(game, harness.report), /warmup/);
      else await prepareStartup(game, harness.report);
      assert.equal(staged, false);
      assert.equal(game.camera.fov, 50);
      assert.ok(ambientFrames > 0);
      harness.assertRestored();
    },
  );
}

for (const failure of [false, true]) {
  test(
    "GPU fence yields and cleans up on " + (failure ? "failure" : "completion"),
    async (context) => {
      startupHarness(context);
      let polls = 0;
      let flushed = false;
      let deleted = false;
      const fence = {};
      const gpu = {
        SYNC_GPU_COMMANDS_COMPLETE: 1,
        ALREADY_SIGNALED: 2,
        CONDITION_SATISFIED: 3,
        WAIT_FAILED: 4,
        fenceSync: () => fence,
        flush() {
          flushed = true;
        },
        clientWaitSync(actual, flags, timeout) {
          assert.equal(actual, fence);
          assert.equal(flags, 0);
          assert.equal(timeout, 0);
          assert.equal(flushed, true);
          return ++polls < 3 ? 0 : failure ? 4 : 3;
        },
        isContextLost: () => false,
        deleteSync(actual) {
          assert.equal(actual, fence);
          deleted = true;
        },
      };
      const renderer = { getContext: () => gpu };
      if (failure)
        await assert.rejects(waitForGpu(renderer), /GPU preparation failed/);
      else await waitForGpu(renderer);
      assert.equal(polls, 3);
      assert.equal(deleted, true);
    },
  );
}
