import { ZOMBIE_BODY } from "./navigation.js";

// A stable side preference plus short-range anticipation. This is not a formation:
// a narrow doorway takes precedence over spreading out, and attacks still aim at the player.
export function createCrowd({ nav, list, vector, move }) {
  const aim = vector(0, 0, 0),
    goal = vector(0, 0, 0),
    velocity = vector(0, 0, 0);
  const side = (z) =>
    ((Math.imul(z.id, 2654435761) >>> 0) / 4294967296 - 0.5) * 2;

  return {
    goal(z, target) {
      const dx = target.x - z.pos.x,
        dz = target.z - z.pos.z;
      const d = Math.hypot(dx, dz);
      const spread =
        side(z) * 2 * Math.min(1, Math.max(0, (d - z.reach - 0.5) / 4));
      if (!d || !spread || z.mode !== "engage" || z.ctl.fear > 0) return target;
      goal.set(
        target.x + (dz / d) * spread,
        target.y,
        target.z - (dx / d) * spread,
      );
      // Offset goals must belong to the same unobstructed approach, never across a wall.
      return nav.clearLine(z.pos, goal) && nav.clearLine(goal, target)
        ? goal
        : target;
    },
    aim(z, target) {
      const dx = target.x - z.pos.x,
        dz = target.z - z.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) return target;
      const fx = dx / d,
        fz = dz / d,
        sx = fz,
        sz = -fx;
      let lateral = 0;
      for (const other of list) {
        if (
          other === z ||
          !other.alive ||
          Math.abs(other.pos.y - z.pos.y) > 0.6
        )
          continue;
        const ox = other.pos.x - z.pos.x,
          oz = other.pos.z - z.pos.z;
        const ahead = ox * fx + oz * fz,
          across = ox * sx + oz * sz;
        if (ahead < -0.35 || ahead > 2 || Math.abs(across) > 1.05) continue;
        const direction =
          Math.abs(across) > 0.12
            ? -Math.sign(across)
            : Math.sign(side(z)) || 1;
        lateral +=
          direction *
          (1 - Math.abs(across) / 1.05) *
          (1 - Math.max(0, ahead) / 2);
      }
      if (Math.abs(lateral) < 0.02) return target;
      const forward = Math.min(d, 1.3);
      const offset = Math.max(-0.8, Math.min(0.8, lateral)) * Math.min(1, d);
      aim.set(
        z.pos.x + fx * forward + sx * offset,
        z.pos.y,
        z.pos.z + fz * forward + sz * offset,
      );
      // Both halves must fit: otherwise stay in the corridor and queue.
      return nav.clearLine(z.pos, aim) && nav.clearLine(aim, target)
        ? aim
        : target;
    },
    separate(dt) {
      const touched = new Set();
      const movable = (z) => !z.passive && z.ctl.pin <= 0 && z.ctl.lift <= 0.02;
      const displace = (z, dx, dz) => {
        aim.set(z.pos.x + dx, z.pos.y, z.pos.z + dz);
        if (!nav.clearLine(z.pos, aim)) return;
        velocity.set(dx, 0, dz);
        move(z.pos, velocity, 1, ZOMBIE_BODY.radius, ZOMBIE_BODY.height, true);
        touched.add(z);
      };
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a.alive || a.ctl.lift > 0.02) continue;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (
            !b.alive ||
            b.ctl.lift > 0.02 ||
            Math.abs(a.pos.y - b.pos.y) > 0.6
          )
            continue;
          const dx = b.pos.x - a.pos.x,
            dz = b.pos.z - a.pos.z,
            d = Math.hypot(dx, dz);
          if (d >= 0.64 || (!movable(a) && !movable(b))) continue;
          // Exact-overlap spawns used to be skipped forever. Break the tie deterministically.
          const angle = side(a) * Math.PI;
          const nx = d > 1e-5 ? dx / d : Math.cos(angle),
            nz = d > 1e-5 ? dz / d : Math.sin(angle);
          const push =
            Math.min(0.64 - d, dt * 2.5) / (movable(a) && movable(b) ? 2 : 1);
          if (movable(a)) displace(a, -nx * push, -nz * push);
          if (movable(b)) displace(b, nx * push, nz * push);
        }
      }
      return touched;
    },
  };
}
