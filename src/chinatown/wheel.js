// The weapon wheel of the set meal: every carried weapon on a ring in the middle of the
// screen, opened by holding the swap key (Q, the pad's Y, a long press on the touch swap
// button) while the street runs slow behind it.
//
// Choosing: the mouse or the right stick push a pointer out from the centre and the weapon
// in that direction lights up (pointer lock stays on: the look input is read and spent);
// letting go of the key, a click or a number key takes it. On touch screens a weapon is
// tapped, and a tap beside the ring closes it. run.js owns the input; this module draws
// the ring and turns pointer movement into a choice.

import { ammoIcon } from "./icons.js";

const DEAD = 34; // px the pointer must travel before anything is chosen
const REACH = 150; // px it can travel at most

export function createWheel({ root, L10N }) {
  const el = document.createElement("div");
  el.className = "rl-wheel";
  el.innerHTML =
    '<div class="rl-wheel-ring"></div><div class="rl-wheel-mid"><b></b><span></span></div><p class="rl-wheel-hint"></p>';
  root.appendChild(el);
  const ring = el.querySelector(".rl-wheel-ring");
  const midName = el.querySelector(".rl-wheel-mid b");
  const midInfo = el.querySelector(".rl-wheel-mid span");
  const hint = el.querySelector(".rl-wheel-hint");

  let items = []; // { id, n, name, short, level, ammo, have, ok, cur }
  let sel = -1;
  let px = 0;
  let py = 0;
  let onTap = null;
  let keys = true; // number keys shown (not on touch screens or a pad)

  function draw() {
    const n = items.length;
    // big enough that the chips do not touch, small enough to stay on screen
    const short = Math.min(innerWidth, innerHeight);
    const R = Math.min(0.42 * short, Math.max(110, 0.3 * short, 17 * n));
    ring.style.setProperty("--r", R + "px");
    ring.innerHTML = items
      .map((w, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const x = Math.cos(a) * R;
        const y = Math.sin(a) * R;
        const count = w.ammo ? `<em>${ammoIcon(w.ammo)}${w.have}</em>` : "";
        return (
          `<button class="rl-wheel-w a-${w.ammo || "none"}${w.cur ? " cur" : ""}${w.ok ? "" : " dry"}" data-i="${i}" style="transform:translate(calc(${x.toFixed(1)}px - 50%),calc(${y.toFixed(1)}px - 50%))">` +
          (keys && w.n <= 9 ? `<kbd>${w.n}</kbd>` : "") +
          `<b>${w.short}</b><sup>${w.level}</sup>${count}</button>`
        );
      })
      .join("");
    mark();
  }
  function mark() {
    ring.querySelectorAll(".rl-wheel-w").forEach((b, i) => {
      b.classList.toggle("sel", i === sel);
    });
    const w = items[sel] || items.find((x) => x.cur);
    if (!w) return;
    midName.textContent = w.name;
    midInfo.innerHTML = ammoIcon(w.ammo) + (w.ammo ? `<em>${w.have}</em>` : "");
    midInfo.className = "a-" + (w.ammo || "none");
    midInfo.title = w.ammo
      ? `${L10N.t("run.ammo." + w.ammo)} ${w.have}`
      : L10N.t("run.wheel.free");
    midInfo.setAttribute("aria-label", midInfo.title);
    el.classList.toggle("none", sel < 0);
  }

  ring.addEventListener("click", (ev) => {
    const b = ev.target.closest(".rl-wheel-w");
    if (!b || !onTap) return;
    ev.preventDefault();
    ev.stopPropagation();
    onTap(+b.dataset.i);
  });
  // a tap beside the ring (the veil catches it) closes without changing weapon
  const swallow = (ev) => {
    if (ev.target.closest(".rl-wheel-w")) ev.stopPropagation();
  };
  ring.addEventListener("touchstart", swallow, { passive: true });
  ring.addEventListener("mousedown", swallow);

  return {
    get open() {
      return el.classList.contains("on");
    },
    get items() {
      return items;
    },
    /** list: the carried weapons in pickup order; how: "keys", "pad" or "touch". */
    show(list, how, tap) {
      items = list;
      onTap = tap;
      sel = -1;
      px = py = 0;
      keys = how === "keys";
      hint.textContent = L10N.t("run.wheel.hint." + how);
      draw();
      el.classList.add("on");
      root.classList.add("wheel");
    },
    hide() {
      el.classList.remove("on");
      root.classList.remove("wheel");
      items = [];
      sel = -1;
      onTap = null;
    },
    /** Move the pointer by dx, dy screen pixels; returns the chosen index or -1. */
    push(dx, dy) {
      if (!items.length) return -1;
      px += dx;
      py += dy;
      const d = Math.hypot(px, py);
      if (d > REACH) {
        px *= REACH / d;
        py *= REACH / d;
      }
      let next = sel;
      if (d >= DEAD) {
        const n = items.length;
        let a = Math.atan2(py, px) + Math.PI / 2; // 0 at the top, clockwise
        a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        next = Math.round((a / (2 * Math.PI)) * n) % n;
      }
      if (next !== sel) {
        sel = next;
        mark();
      }
      return sel;
    },
    /** Step the choice round the ring (wheel, d-pad). */
    step(dir) {
      const n = items.length;
      if (!n) return -1;
      const from =
        sel >= 0
          ? sel
          : Math.max(
              0,
              items.findIndex((w) => w.cur),
            );
      sel = (from + dir + n) % n;
      px = py = 0;
      mark();
      return sel;
    },
    get chosen() {
      return items[sel] || null;
    },
    relabel() {
      if (this.open) draw();
    },
  };
}
