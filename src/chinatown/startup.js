export function createCalibrationWindow({ minFrames = 60, minMs = 1800 } = {}) {
  let previous = null;
  let frames = 0;
  let elapsed = 0;
  return {
    observe(signature, frameMs, visible = true) {
      if (!visible || !Number.isFinite(frameMs) || frameMs <= 0) {
        previous = null;
        frames = 0;
        elapsed = 0;
        return false;
      }
      if (signature !== previous) {
        previous = signature;
        frames = 0;
        elapsed = 0;
        return false;
      }
      frames++;
      elapsed += frameMs;
      return frames >= minFrames && elapsed >= minMs;
    },
  };
}

export async function waitForGpu(renderer) {
  const context = renderer.getContext();
  if (!context.fenceSync) return;
  const fence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!fence) throw new Error("Unable to fence startup rendering");
  const started = performance.now();
  try {
    context.flush();
    while (true) {
      const status = context.clientWaitSync(fence, 0, 0);
      if (
        status === context.ALREADY_SIGNALED ||
        status === context.CONDITION_SATISFIED
      )
        return;
      if (status === context.WAIT_FAILED || context.isContextLost())
        throw new Error("Startup GPU preparation failed");
      if (performance.now() - started > 60000)
        throw new Error("Startup GPU preparation timed out");
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  } finally {
    context.deleteSync(fence);
  }
}

export async function prepareStartup(game, report) {
  if (!game.run) throw new Error("Missing startup preparation");
  const camera = game.camera;
  const render = game.render;
  const originalPosition = camera.position.clone();
  const originalRotation = camera.quaternion.clone();
  const originalFov = camera.fov;
  let restoreScene;
  const visibility = new Map();
  const weaponVisible = game.weapon.root?.visible ?? false;
  camera.traverse((object) => visibility.set(object, object.visible));
  const spawn = game.level.playerStart;
  let previousFrame = null;
  let stable = null;
  const visibilityChanged = () => {
    previousFrame = null;
    render.skipFrame();
    stable?.observe("", 0);
  };
  document.addEventListener("visibilitychange", visibilityChanged);
  const draw = async (count = 1) => {
    let frameMs = 0;
    for (let index = 0; index < count; index++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      while (document.hidden) {
        previousFrame = null;
        render.skipFrame();
        await new Promise((resolve) => {
          const resume = () => {
            if (document.hidden) return;
            document.removeEventListener("visibilitychange", resume);
            resolve();
          };
          document.addEventListener("visibilitychange", resume);
        });
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      const now = performance.now();
      frameMs = previousFrame === null ? 0 : now - previousFrame;
      previousFrame = now;
      game.time.frame++;
      for (const name of ["fx", "ground", "level", "backdrop", "mats"])
        game[name]?.update?.(1 / 60);
      render.frame(1 / 60);
      if (game.renderer.getContext().isContextLost()) {
        throw new Error("WebGL context lost during preparation");
      }
    }
    return frameMs;
  };
  try {
    render.preparing = true;
    camera.position.copy(spawn.pos);
    camera.position.y += 1.65;
    camera.rotation.set(0, spawn.yaw, 0, "YXZ");
    if (game.player) {
      camera.fov = Number(game.params.fov) || game.player.baseFov;
      camera.updateProjectionMatrix();
    }
    restoreScene = await game.run.stageStartup?.(draw);
    game.weapon.setVisible(true);
    await report("boot.warmup", 0.93);
    await game.run.prepareStartup(draw, () => report("boot.warmup", 0.95));
    for (let direction = 0; direction < 4; direction++) {
      camera.rotation.y = spawn.yaw + (direction * Math.PI) / 2;
      await draw(2);
    }
    camera.rotation.y = spawn.yaw;
    await waitForGpu(game.renderer);
    await report("boot.calibrate", 0.97);
    render.beginCalibration();
    previousFrame = null;
    const fixed =
      game.params.shot || game.params.show || game.params.dynres === "0";
    stable = createCalibrationWindow(fixed ? { minFrames: 3, minMs: 0 } : {});
    let quality = game.quality.name;
    let elapsed = 0;
    while (true) {
      const frameMs = await draw();
      elapsed += frameMs;
      if (elapsed > 60000)
        throw new Error("Startup calibration did not settle");
      if (quality !== game.quality.name) {
        quality = game.quality.name;
        render.preparing = true;
        await report("boot.warmup", 0.97);
        await game.run.prepareStartup(draw);
        await waitForGpu(game.renderer);
        await report("boot.calibrate", 0.98);
        render.beginCalibration();
        previousFrame = null;
        stable.observe("", 0);
        continue;
      }
      const stats = render.stats();
      const signature = JSON.stringify([
        quality,
        stats.scale,
        stats.res,
        stats.programs,
      ]);
      if (
        stable.observe(signature, frameMs, !document.hidden) &&
        (fixed || render.calibrationReady)
      )
        break;
    }
  } finally {
    document.removeEventListener("visibilitychange", visibilityChanged);
    restoreScene?.();
    game.weapon.setVisible(weaponVisible);
    camera.position.copy(originalPosition);
    camera.quaternion.copy(originalRotation);
    camera.fov = originalFov;
    camera.updateProjectionMatrix?.();
    for (const [object, visible] of visibility) object.visible = visible;
    render.endCalibration();
  }
}
