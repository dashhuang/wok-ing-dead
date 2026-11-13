// Ground navigation for the same circle/box collision world as moveCapsule.
// No jump links or climbing. The street has one walkable floor at each x/z.
export const ZOMBIE_BODY = { radius: 0.3, height: 1.7 };
export const STEP_HEIGHT = 0.42;

const CELL = 0.25;
const SKIN = 0.005;
const BUCKET = 2;
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function createNavigation({ boxes, bounds, groundY, quayX, vector }) {
  const radius = ZOMBIE_BODY.radius;
  const height = ZOMBIE_BODY.height;
  const foot = ZOMBIE_BODY.radius * 0.7;
  const minX = bounds.min.x,
    minZ = bounds.min.z;
  const w = Math.ceil((bounds.max.x - minX) / CELL);
  const h = Math.ceil((bounds.max.z - minZ) / CELL);
  const size = w * h;
  const bw = Math.ceil((bounds.max.x - minX) / BUCKET);
  const bh = Math.ceil((bounds.max.z - minZ) / BUCKET);
  const blocked = new Uint8Array(size);
  const xs = new Float32Array(size),
    zs = new Float32Array(size),
    ys = new Float32Array(size);
  const tried = new Uint8Array(size),
    edges = new Uint8Array(size);
  const cost = new Float32Array(size);
  const regions = new Uint32Array(size);
  let nextRegion = 0;
  let buckets,
    dirty = true,
    full = true;
  const changes = [];

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cellAt = (x, z) => {
    const cx = Math.floor((x - minX) / CELL),
      cz = Math.floor((z - minZ) / CELL);
    return cx < 0 || cz < 0 || cx >= w || cz >= h ? -1 : cz * w + cx;
  };
  const nearby = (x, z) => {
    const bx = Math.floor((x - minX) / BUCKET),
      bz = Math.floor((z - minZ) / BUCKET);
    return bx < 0 || bz < 0 || bx >= bw || bz >= bh
      ? []
      : buckets[bz * bw + bx];
  };
  const inside = (x, z) =>
    x >= minX + radius &&
    z >= minZ + radius &&
    x <= Math.min(bounds.max.x, quayX) - radius &&
    z <= bounds.max.z - radius;
  const distance2 = (b, x, z) => {
    const dx = x - clamp(x, b.min.x, b.max.x),
      dz = z - clamp(z, b.min.z, b.max.z);
    return dx * dx + dz * dz;
  };
  const supports = (b, x, z) =>
    x + foot >= b.min.x &&
    x - foot <= b.max.x &&
    z + foot >= b.min.z &&
    z - foot <= b.max.z;

  // One straight movement substep, using the mover's step/foot/headroom rules.
  function step(x, z, y) {
    if (!inside(x, z)) return NaN;
    let floor = groundY;
    const near = nearby(x, z);
    for (const b of near) {
      if (
        b.max.y > y + STEP_HEIGHT + 1e-6 &&
        b.min.y < y + height &&
        distance2(b, x, z) < radius * radius - 1e-8
      )
        return NaN;
      if (supports(b, x, z) && b.max.y <= y + STEP_HEIGHT + 1e-6)
        floor = Math.max(floor, b.max.y);
    }
    if (y - floor > STEP_HEIGHT + 1e-6) return NaN;
    // Stepping up must not put the head through an overhang.
    for (const b of near)
      if (
        b.min.y >= y + height - 0.05 &&
        b.min.y < floor + height &&
        distance2(b, x, z) < radius * radius - 1e-8
      )
        return NaN;
    return floor;
  }

  function surface(x, z) {
    // Match groundHeight(..., 1.5) used when a zombie spawns. High props/roofs
    // are deliberately outside this ground-only graph, even if the player jumps up.
    const levels = [groundY];
    for (const b of nearby(x, z))
      if (b.max.y > groundY && b.max.y <= groundY + 1.5 && supports(b, x, z))
        levels.push(b.max.y);
    levels.sort((a, b) => a - b);
    for (const y of levels) {
      const floor = step(x, z, y);
      if (Number.isFinite(floor)) return floor;
    }
    return NaN;
  }

  function travel(a, b) {
    const count = Math.max(
      1,
      Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.08),
    );
    let y = step(a.x, a.z, a.y);
    if (!Number.isFinite(y)) return false;
    for (let k = 1; k <= count; k++) {
      const t = k / count;
      y = step(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, y);
      if (!Number.isFinite(y)) return false;
    }
    return Math.abs(y - b.y) < 0.05;
  }

  const point = (i) => vector(xs[i], ys[i], zs[i]);
  function build() {
    full = true;
    refresh();
  }
  function refresh() {
    dirty = false;
    buckets = Array.from({ length: bw * bh }, () => []);
    // noNav used to hide solid props from routing. Physical obstacles must now
    // participate, otherwise a path and the mover disagree at precisely those props.
    for (const b of boxes) {
      if (b.bulletOnly) continue;
      const x0 = clamp(
        Math.floor((b.min.x - radius - minX) / BUCKET),
        0,
        bw - 1,
      );
      const x1 = clamp(
        Math.floor((b.max.x + radius - minX) / BUCKET),
        0,
        bw - 1,
      );
      const z0 = clamp(
        Math.floor((b.min.z - radius - minZ) / BUCKET),
        0,
        bh - 1,
      );
      const z1 = clamp(
        Math.floor((b.max.z + radius - minZ) / BUCKET),
        0,
        bh - 1,
      );
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) buckets[z * bw + x].push(b);
    }
    if (full) {
      for (let i = 0; i < size; i++) sampleCell(i);
    } else {
      // An exploded barrel only changes a handful of nodes and incident edges.
      // Keep the rest of the geometry checks; relabeling their graph is cheap.
      const cells = new Set();
      const pad = radius + CELL * 2;
      for (const b of changes) {
        const x0 = clamp(Math.floor((b.min.x - pad - minX) / CELL), 0, w - 1);
        const x1 = clamp(Math.floor((b.max.x + pad - minX) / CELL), 0, w - 1);
        const z0 = clamp(Math.floor((b.min.z - pad - minZ) / CELL), 0, h - 1);
        const z1 = clamp(Math.floor((b.max.z + pad - minZ) / CELL), 0, h - 1);
        for (let z = z0; z <= z1; z++)
          for (let x = x0; x <= x1; x++) cells.add(z * w + x);
      }
      for (const i of cells) sampleCell(i);
    }
    changes.length = 0;
    full = false;
    regions.fill(0);
    nextRegion = 0;
    // Finish connectivity during level loading, not on the first chase frame.
    for (let i = 0; i < size; i++) if (!blocked[i] && !regions[i]) region(i);
  }
  function sampleCell(i) {
    blocked[i] = 1;
    tried[i] = edges[i] = 0;

    const x0 = minX + (i % w) * CELL,
      z0 = minZ + Math.floor(i / w) * CELL;
    const x = x0 + CELL / 2,
      z = z0 + CELL / 2;
    let px = x,
      pz = z,
      y = surface(x, z);
    if (!Number.isFinite(y)) {
      // A narrow passage needn't contain a grid centre. Add clearance-boundary
      // samples INSIDE this cell so sub-cell gaps don't vanish when the map shifts.
      const xx = [x],
        zz = [z];
      for (const b of nearby(x, z)) {
        for (const v of [b.min.x - radius - SKIN, b.max.x + radius + SKIN])
          if (v > x0 && v < x0 + CELL) xx.push(v);
        for (const v of [b.min.z - radius - SKIN, b.max.z + radius + SKIN])
          if (v > z0 && v < z0 + CELL) zz.push(v);
      }
      let best = Infinity;
      for (const sx of xx)
        for (const sz of zz) {
          const d = (sx - x) ** 2 + (sz - z) ** 2;
          if (d >= best) continue;
          const sy = surface(sx, sz);
          if (Number.isFinite(sy)) {
            px = sx;
            pz = sz;
            y = sy;
            best = d;
          }
        }
    }
    xs[i] = px;
    zs[i] = pz;
    ys[i] = y;
    if (!Number.isFinite(y)) return;
    blocked[i] = 0;
    // Prefer a little breathing room, but don't forbid a narrow passage.
    let clearance = 1;
    for (const b of nearby(px, pz))
      if (b.max.y > y + STEP_HEIGHT && b.min.y < y + height)
        clearance = Math.min(
          clearance,
          Math.sqrt(distance2(b, px, pz)) - radius,
        );
    cost[i] = 1 + Math.max(0, 0.4 - clearance) * 0.5;
  }
  const ready = () => {
    if (dirty) refresh();
  };

  function neighbor(i, dir) {
    const [dx, dz] = DIRS[dir],
      j = i + dx + dz * w,
      mask = 1 << dir;
    if (tried[i] & mask) return edges[i] & mask ? j : -1;
    tried[i] |= mask;
    const x = i % w,
      z = Math.floor(i / w);
    if (x + dx < 0 || x + dx >= w || z + dz < 0 || z + dz >= h || blocked[j])
      return -1;
    if (travel(point(i), point(j)) && travel(point(j), point(i)))
      edges[i] |= mask;
    return edges[i] & mask ? j : -1;
  }

  // Connected ground regions keep an unreachable target (e.g. a jump-only prop)
  // from causing a full-map A* search for every zombie on every retry.
  function region(start) {
    if (regions[start]) return regions[start];
    const id = ++nextRegion,
      queue = [start];
    regions[start] = id;
    for (let at = 0; at < queue.length; at++) {
      const i = queue[at];
      if (tried[i] !== 255)
        for (let d = 0; d < DIRS.length; d++) neighbor(i, d);
      for (let d = 0; d < DIRS.length; d++) {
        if (!(edges[i] & (1 << d))) continue;
        const j = i + DIRS[d][0] + DIRS[d][1] * w;
        if (!regions[j]) {
          regions[j] = id;
          queue.push(j);
        }
      }
    }
    return id;
  }

  function anchor(p) {
    const y = surface(p.x, p.z);
    if (!Number.isFinite(y) || (p.y ?? y) > groundY + 1.5) return null;
    return vector(p.x, y, p.z);
  }
  // Endpoints connect through actual walkable space, never through a wall to a
  // merely nearby cell on its other side.
  function attach(p) {
    const centre = cellAt(p.x, p.z);
    if (centre < 0) return -1;
    const cx = centre % w,
      cz = Math.floor(centre / w);
    for (let ring = 0; ring <= 4; ring++) {
      let best = -1,
        distance = Infinity;
      for (let dz = -ring; dz <= ring; dz++)
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          const x = cx + dx,
            z = cz + dz;
          if (x < 0 || z < 0 || x >= w || z >= h) continue;
          const i = z * w + x;
          if (blocked[i]) continue;
          const d = Math.hypot(xs[i] - p.x, zs[i] - p.z);
          if (d < distance && travel(p, point(i)) && travel(point(i), p)) {
            best = i;
            distance = d;
          }
        }
      if (best >= 0) return best;
    }
    return -1;
  }

  const scores = new Float64Array(size),
    parents = new Int32Array(size);
  const seen = new Uint32Array(size),
    closed = new Uint32Array(size);
  let serial = 0;
  function search(start, end) {
    serial++;
    const heap = [];
    const heuristic = (i) => Math.hypot(xs[i] - xs[end], zs[i] - zs[end]) * 1.2;
    function push(i, score) {
      let k = heap.length;
      heap.push({ i, score });
      while (k) {
        const p = (k - 1) >> 1;
        if (heap[p].score <= score) break;
        heap[k] = heap[p];
        k = p;
      }
      heap[k] = { i, score };
    }
    function pop() {
      const first = heap[0],
        last = heap.pop();
      if (heap.length) {
        let k = 0;
        while (k * 2 + 1 < heap.length) {
          let c = k * 2 + 1;
          if (c + 1 < heap.length && heap[c + 1].score < heap[c].score) c++;
          if (heap[c].score >= last.score) break;
          heap[k] = heap[c];
          k = c;
        }
        heap[k] = last;
      }
      return first.i;
    }
    scores[start] = 0;
    parents[start] = -1;
    seen[start] = serial;
    push(start, heuristic(start));
    while (heap.length) {
      const i = pop();
      if (i === end) {
        const path = [];
        for (let k = end; k >= 0; k = parents[k]) path.push(point(k));
        return path.reverse();
      }
      if (closed[i] === serial) continue;
      closed[i] = serial;
      for (let d = 0; d < DIRS.length; d++) {
        if (!(edges[i] & (1 << d))) continue;
        const j = i + DIRS[d][0] + DIRS[d][1] * w;
        if (closed[j] === serial) continue;
        const dx = xs[j] - xs[i],
          dz = zs[j] - zs[i];
        const score =
          scores[i] + (Math.sqrt(dx * dx + dz * dz) * (cost[i] + cost[j])) / 2;
        if (seen[j] === serial && scores[j] <= score) continue;
        scores[j] = score;
        seen[j] = serial;
        parents[j] = i;
        push(j, score + heuristic(j));
      }
    }
    return null;
  }

  const api = {
    cell: CELL,
    invalidate(box) {
      dirty = true;
      if (box) changes.push(box);
      else full = true;
    },
    build,
    isWalkable(x, z) {
      ready();
      return Number.isFinite(surface(x, z));
    },
    clearLine(a, b) {
      ready();
      const from = anchor(a),
        to = anchor(b);
      return !!from && !!to && travel(from, to);
    },
    findPath(a, b) {
      ready();
      const from = anchor(a),
        to = anchor(b);
      if (!from || !to) return null;
      if (travel(from, to)) return [to];
      const start = attach(from),
        end = attach(to);
      if (start < 0 || end < 0 || region(start) !== region(end)) return null;
      const path = search(start, end);
      if (!path) return null;
      path.push(to);
      const result = [];
      let prev = from;
      // Grow a visible prefix exponentially, then bisect its end. Each long
      // straight is swept O(log n) times instead of once for every grid cell.
      for (let i = 0; i < path.length;) {
        let last = i,
          stride = 1,
          next = i;
        while (last < path.length - 1) {
          next = Math.min(path.length - 1, i + stride);
          if (!travel(prev, path[next])) break;
          last = next;
          stride *= 2;
        }
        let lo = last + 1,
          hi = next - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (travel(prev, path[mid])) {
            last = mid;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        result.push(path[last]);
        prev = path[last];
        i = last + 1;
      }
      return result;
    },
    randomPoint(p, range) {
      ready();
      for (let k = 0; k < 24; k++) {
        const a = Math.random() * Math.PI * 2,
          r = Math.sqrt(Math.random()) * range;
        const q = anchor({
          x: p.x + Math.cos(a) * r,
          z: p.z + Math.sin(a) * r,
        });
        if (q && api.clearLine(p, q)) return q;
      }
      return anchor(p) || vector(p.x, p.y || groundY, p.z);
    },
    reachableFrom(p) {
      ready();
      const from = anchor(p),
        start = from ? attach(from) : -1;
      const id = start >= 0 ? region(start) : 0;
      return (p) => {
        const q = anchor(p),
          i = q ? attach(q) : -1;
        return id > 0 && i >= 0 && regions[i] === id;
      };
    },
    _grid: () => {
      ready();
      return { blocked, w, h, minX, minZ, cell: CELL };
    },
  };
  return api;
}
