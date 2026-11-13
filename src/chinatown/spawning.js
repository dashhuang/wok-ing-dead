// Choose ground spawns by neighborhood and actual approach route, not simply
// the highest distance/occlusion score. Counts and wave timing stay in run.js.
const MEMORY = 12;
const PATH_BUDGET = 4;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const inside = (p, r) =>
  p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1;

function crosses(a, b, gate) {
  const c = gate.a,
    d = gate.b;
  const rx = b.x - a.x,
    rz = b.z - a.z,
    sx = d.x - c.x,
    sz = d.z - c.z;
  const det = rx * sz - rz * sx;
  if (Math.abs(det) < 1e-8) return false;
  const t = ((c.x - a.x) * sz - (c.z - a.z) * sx) / det;
  const u = ((c.x - a.x) * rz - (c.z - a.z) * rx) / det;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function approachOf(start, path, target, area) {
  if (area) {
    let previous = start,
      entry = null;
    for (const p of path) {
      for (const gate of area.entrances)
        if (crosses(previous, p, gate)) entry = gate.id;
      previous = p;
    }
    if (entry) return `${area.id}:${entry}`;
    if (inside(start, area)) return `${area.id}:inside`;
  }
  // Look back along the last eight metres of the route. This groups enemies
  // approaching the same corner even if their spawn points surround the player.
  let remaining = 8,
    last = target,
    point = start;
  for (let i = path.length - 1; i >= -1; i--) {
    const p = i >= 0 ? path[i] : start,
      d = distance(last, p);
    if (d >= remaining) {
      const t = remaining / d;
      point = {
        x: last.x + (p.x - last.x) * t,
        z: last.z + (p.z - last.z) * t,
      };
      break;
    }
    remaining -= d;
    point = p;
    last = p;
  }
  const angle = Math.atan2(point.z - target.z, point.x - target.x);
  const sector = ((Math.round(angle / (Math.PI / 3)) % 6) + 6) % 6;
  return `${area?.id || "street"}:direction${sector}`;
}

export function createSpawnPicker(G, { sites, clock }) {
  const V = G.THREE.Vector3,
    nav = G.physics.nav;
  const probe = new V(),
    forward = new V(),
    offset = new V();
  const history = [],
    routes = new Map(),
    assignments = new WeakMap();
  let origin = null,
    revision = -1,
    areaKey = "";
  const debug = { last: null };
  const weighted = (items, weight) => {
    let pick = G.rng() * items.reduce((sum, item) => sum + weight(item), 0);
    for (const item of items) {
      pick -= weight(item);
      if (pick <= 0) return item;
    }
    return items.at(-1);
  };
  function visibility(pos) {
    const eye = G.player.eye || G.player.pos;
    let seen = false;
    for (const h of [1, 1.7]) {
      probe.copy(pos);
      probe.y += h;
      if (G.physics.lineOfSight(probe, eye)) {
        seen = true;
        break;
      }
    }
    if (!seen) return "hidden";
    if (G.camera?.getWorldDirection) G.camera.getWorldDirection(forward);
    else forward.copy(G.player.forward || { x: 0, y: 0, z: -1 });
    const d = distance(pos, eye) || 1;
    const facing =
      ((pos.x - eye.x) * forward.x + (pos.z - eye.z) * forward.z) / d;
    // A conservative front half-plane includes peripheral vision at wide FOVs.
    return facing > -0.15 ? "visible" : "behind";
  }
  function safe(pos, { minDist, from = G.player.pos } = {}) {
    return (
      !!pos &&
      distance(pos, from) >= minDist &&
      nav.isWalkable(pos.x, pos.z) &&
      visibility(pos) !== "visible"
    );
  }
  function localPressure(pos, now) {
    let pressure = 0;
    for (const h of history) {
      const d = distance(pos, h.pos);
      if (d < 8) pressure += (1 - d / 8) * (1 - (now - h.time) / MEMORY) * 3;
    }
    for (const z of G.enemies.list)
      if (z.alive) {
        const d = distance(pos, z.pos);
        if (d < 1) return Infinity;
        if (d < 6) pressure += (1 - d / 6) * 0.5;
      }
    return pressure;
  }
  function scatter(base, spread, options) {
    for (let i = 0; i < 6; i++) {
      offset.copy(base);
      offset.x += (G.rng() - 0.5) * spread * 2;
      offset.z += (G.rng() - 0.5) * spread * 2;
      offset.y = G.physics.groundHeight(offset.x, offset.z, 1.5);
      if (
        safe(offset, options) &&
        nav.clearLine(base, offset) &&
        !G.enemies.list.some((z) => z.alive && distance(z.pos, offset) < 0.65)
      ) {
        const out = offset.clone();
        out.spawnRoute = base.spawnRoute;
        return out;
      }
    }
    return safe(base, options) ? base : null;
  }

  const api = {
    debug,
    safe,
    scatter,
    reset() {
      history.length = 0;
      routes.clear();
      origin = null;
      debug.last = null;
    },
    note(z, pos) {
      assignments.delete(z);
      if (pos.spawnRoute) assignments.set(z, { ...pos.spawnRoute, id: z.id });
    },
    pick({ minDist, from = G.player.pos, preferHidden = true } = {}) {
      const now = clock();
      while (history.length && now - history[0].time >= MEMORY) history.shift();
      const area = (G.level.spawnRegions || []).find((r) => inside(from, r));
      const key = area?.id || "street";
      if (
        !origin ||
        distance(origin, from) > 2 ||
        !nav.clearLine(origin, from) ||
        revision !== nav.revision ||
        key !== areaKey
      ) {
        routes.clear();
        origin = from.clone();
        revision = nav.revision;
        areaKey = key;
      }
      const raw = [];
      for (const site of sites()) {
        const pos = site.pos,
          d = distance(pos, from);
        if (d < minDist || !nav.isWalkable(pos.x, pos.z)) continue;
        const view = visibility(pos);
        if (view === "visible") continue;
        const pressure = localPressure(pos, now);
        if (!Number.isFinite(pressure)) continue;
        const weight =
          Math.exp(-Math.max(0, d - minDist - 12) / 35) / (1 + pressure);
        raw.push({
          site,
          pos,
          distance: d,
          view,
          weight,
          order: -Math.log(Math.max(1e-8, G.rng())) / weight,
        });
      }
      const hidden = preferHidden && raw.some((c) => c.view === "hidden");
      const pool = raw
        .filter((c) => !hidden || c.view === "hidden")
        .sort((a, b) => a.order - b.order);
      const groups = new Map();
      let searches = 0;
      for (const c of pool) {
        if (!routes.has(c.site)) {
          if (searches >= PATH_BUDGET) continue;
          searches++;
          routes.set(c.site, nav.findPath(c.pos, from));
        }
        const path = routes.get(c.site);
        if (!path) continue;
        let length = 0,
          last = c.pos;
        for (const p of path) {
          length += distance(last, p);
          last = p;
        }
        c.weight /= 1 + Math.max(0, length - c.distance - 10) / 35;
        c.approach = approachOf(c.pos, path, from, area);
        if (!groups.has(c.approach)) groups.set(c.approach, []);
        groups.get(c.approach).push(c);
      }
      const pressure = new Map();
      const add = (k, amount) =>
        pressure.set(k, (pressure.get(k) || 0) + amount);
      for (const h of history)
        if (distance(h.target, from) < 8)
          add(h.approach, 1 - (now - h.time) / MEMORY);
      for (const z of G.enemies.list)
        if (z.alive && !z.passive) {
          const assignment = assignments.get(z);
          if (
            assignment?.id === z.id &&
            assignment.area === key &&
            distance(assignment.target, from) < 8
          )
            add(assignment.approach, 0.4);
          else if (z.path?.length && z.mode === "engage")
            add(approachOf(z.pos, z.path.slice(z.pathI), from, area), 0.4);
        }
      const choices = [...groups].map(([approach, candidates]) => ({
        approach,
        candidates,
        // Normalize by group size: twenty points feeding one gate aren't twenty
        // votes against the three points feeding another. Keep a soft lottery.
        weight:
          candidates.reduce((sum, c) => sum + c.weight, 0) /
          candidates.length /
          (1 + (pressure.get(approach) || 0)) ** 1.5,
      }));
      const group = weighted(choices, (c) => c.weight);
      if (!group) {
        debug.last = { reason: "no-safe-route", searches };
        return null;
      }
      const selected = weighted(group.candidates, (c) => c.weight);
      const base = selected.pos.clone();
      base.y = G.physics.groundHeight(base.x, base.z, 1.5);
      const out = scatter(base, 1.2, { minDist, from });
      if (!out) {
        debug.last = { reason: "no-safe-offset", searches };
        return null;
      }
      // Refresh the final route against the CURRENT target, including the jitter.
      const path = nav.findPath(out, from);
      if (!path) {
        debug.last = { reason: "route-changed", searches: searches + 1 };
        return null;
      }
      const approach = approachOf(out, path, from, area);
      const record = {
        pos: out.clone(),
        time: now,
        target: from.clone(),
        area: key,
        approach,
      };
      out.spawnRoute = record;
      history.push(record);
      debug.last = {
        pos: out.clone(),
        approach,
        searches: searches + 1,
        groups: choices.map((g) => g.approach),
      };
      return out;
    },
  };
  return api;
}
