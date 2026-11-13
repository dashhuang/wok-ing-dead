import { readFileSync } from "node:fs";
import { Vector3 } from "three";
import {
  createNavigation,
  STEP_HEIGHT,
} from "../../src/chinatown/navigation.js";

// Run the production collision mover, not a second implementation of its rules.
// It still lives in the extracted bundle; this boundary also catches wiring regressions.
const source = readFileSync(
  new URL("../../src/game.js", import.meta.url),
  "utf8",
);
const start = source.indexOf("  function v_(n) {");
const end = source.indexOf("  // === Procedural props", start);
if (start < 0 || end < 0) throw new Error("Physics module boundary changed");
const factory = new Function(
  "K",
  "Kn",
  "hg",
  "createNavigation",
  `${source.slice(start, end)}; return v_({});`,
);

export const V = (x, y, z) => new Vector3(x, y, z);
export function world(min = [-6, -6], max = [6, 6]) {
  return factory(
    Vector3,
    {
      min: V(min[0], 0, min[1]),
      max: V(max[0], 30, max[1]),
      groundY: 0,
      seaY: -4,
      quayX: 1000,
    },
    STEP_HEIGHT,
    createNavigation,
  );
}

export function walk(physics, start, path, radius = 0.3) {
  const pos = start.clone();
  for (const to of path) {
    for (let i = 0; pos.distanceTo(to) > 0.025 && i < 10000; i++) {
      const dx = to.x - pos.x,
        dz = to.z - pos.z;
      const d = Math.hypot(dx, dz);
      const amount = Math.min(d, 0.025);
      physics.moveCapsule(
        pos,
        V((dx / (d || 1)) * amount, -0.04, (dz / (d || 1)) * amount),
        1,
        radius,
        1.7,
        true,
      );
    }
    if (pos.distanceTo(to) > 0.04)
      throw new Error(
        `Mover stuck at ${pos.toArray()} aiming for ${to.toArray()}`,
      );
  }
  return pos;
}
