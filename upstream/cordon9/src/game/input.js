function createInput(canvas) {
  const down = /* @__PURE__ */ new Set(), pressed = /* @__PURE__ */ new Set(), I = { down, pressed, dx: 0, dy: 0, lmb: false, rmb: false, lmbPressed: false, wheel: 0, locked: false, free: false, playing: false, sens: 21e-4, onLock: null, enabled: true };
  const key = (e) => e.code;
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const k = key(e);
    down.add(k);
    pressed.add(k);
    if ((I.locked || I.free && I.playing) && (["Space", "Tab", "ArrowUp", "ArrowDown"].includes(k) || k.startsWith("Key"))) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => down.delete(key(e)));
  window.addEventListener("blur", () => {
    down.clear();
    I.lmb = I.rmb = false;
  });
  document.addEventListener("mousemove", (e) => {
    if (!I.locked && !I.free) return;
    I.dx += e.movementX || 0;
    I.dy += e.movementY || 0;
  });
  canvas.addEventListener("mousedown", (e) => {
    if (!I.locked && !I.free) return;
    if (e.button === 0) {
      I.lmb = true;
      I.lmbPressed = true;
    }
    if (e.button === 2) I.rmb = true;
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) I.lmb = false;
    if (e.button === 2) I.rmb = false;
  });
  window.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("wheel", (e) => {
    if (I.locked) I.wheel += Math.sign(e.deltaY);
  }, { passive: true });
  document.addEventListener("pointerlockchange", () => {
    I.locked = document.pointerLockElement === canvas;
    if (!I.locked) {
      down.clear();
      I.lmb = I.rmb = false;
    }
    if (I.onLock) I.onLock(I.locked);
  });
  document.addEventListener("pointerlockerror", () => {
    if (I.onLock) I.onLock(false, true);
  });
  I.lock = () => {
    const plain = () => {
      try {
        const q = canvas.requestPointerLock();
        if (q && q.catch) q.catch(() => {
          if (I.onLock) I.onLock(false, true);
        });
      } catch {
      }
    };
    try {
      const p = canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(plain);
    } catch {
      plain();
    }
  };
  I.unlock = () => {
    if (document.exitPointerLock) document.exitPointerLock();
  };
  I.hit = (k) => pressed.has(k);
  I.endFrame = () => {
    pressed.clear();
    I.dx = 0;
    I.dy = 0;
    I.lmbPressed = false;
    I.wheel = 0;
  };
  return I;
}

