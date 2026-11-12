// Fits a hand's fingers to whatever it is holding, the way the game fits its own grips: from an
// open hand, each finger closes joint by joint until that part of it touches, then the joints
// further out carry on. The game does this against simple shapes it is told about; here it is
// done against the weapon's real surface, so a grip only has to say where the palm goes.
//
// A development aid, not part of the frame loop: `__lab.fitGrip("left")` in the console (with the
// weapon on screen and 双手 on) prints the pose to paste into the weapon file. See README.
import * as THREE from "three";
import * as GH from "./gamehands.gen.js";

const V3 = THREE.Vector3;
const CELL = 0.008; // grid the weapon's triangles are sorted into
const REACH = 0.26; // only the surface this close to the wrist matters
const AXIS_X = new V3(1, 0, 0),
  AXIS_Y = new V3(0, 1, 0),
  THUMB_AXIS = new V3(0.2, 0, 0.98).normalize();

/** Open and closed ends of the fit, in the game's joint values (GH.makePose). */
export const FITS = {
  // support hand cupped under a fore-end: fingers up the far side, thumb along the near side
  cradle: {
    from: { thumb: [0.25, -0.1, -0.2, 1], fingers: [-0.05, 0.04, 0.02, 0.04] },
    to: { thumb: [1.2, 0.3, 0.35, 1], fingers: [1.5, 1.6, 1, 0] },
  },
  // a fist round a handle
  wrap: {
    from: { thumb: [0.3, -0.1, -0.2, 0.9], fingers: [-0.05, 0.04, 0.02, 0.02] },
    to: { thumb: [1.25, 0.55, 0.7, 0.1], fingers: [1.5, 1.8, 1.1, 0] },
  },
};

/** The weapon's visible surface near the hand, in the hand bone's space of a right hand. */
function surface(model, hand, mirror) {
  hand.updateWorldMatrix(true, false);
  const toHand = new THREE.Matrix4().copy(hand.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const grid = new Map();
  const tris = [];
  const shown = (o) => {
    for (let p = o; p; p = p.parent)
      if (!p.visible || /^label:/.test(p.name)) return false;
    return true;
  };
  const a = new V3(),
    b = new V3(),
    c = new V3();
  model.root.updateWorldMatrix(true, true);
  model.root.traverse((o) => {
    if (!o.isMesh || !shown(o)) return;
    const pos = o.geometry.attributes.position,
      idx = o.geometry.index;
    m.multiplyMatrices(toHand, o.matrixWorld);
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m);
      b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(m);
      c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(m);
      if (Math.min(a.length(), b.length(), c.length()) > REACH) continue;
      if (mirror) ((a.x = -a.x), (b.x = -b.x), (c.x = -c.x));
      const id =
        tris.push(new THREE.Triangle(a.clone(), b.clone(), c.clone())) - 1;
      const lo = [0, 0, 0],
        hi = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.floor(
          Math.min(a.getComponent(k), b.getComponent(k), c.getComponent(k)) /
            CELL,
        );
        hi[k] = Math.floor(
          Math.max(a.getComponent(k), b.getComponent(k), c.getComponent(k)) /
            CELL,
        );
      }
      if (
        (hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) >
        6000
      )
        continue;
      for (let x = lo[0]; x <= hi[0]; x++)
        for (let y = lo[1]; y <= hi[1]; y++)
          for (let z = lo[2]; z <= hi[2]; z++) {
            const key = x + "," + y + "," + z;
            const cell = grid.get(key);
            if (cell) cell.push(id);
            else grid.set(key, [id]);
          }
    }
  });
  const cp = new V3();
  /** Distance from p to the surface, looked for within `within` metres (returns `within` when further). */
  return function distance(p, within) {
    const k = Math.ceil(within / CELL);
    const cx = Math.floor(p.x / CELL),
      cy = Math.floor(p.y / CELL),
      cz = Math.floor(p.z / CELL);
    let best = within;
    for (let x = cx - k; x <= cx + k; x++)
      for (let y = cy - k; y <= cy + k; y++)
        for (let z = cz - k; z <= cz + k; z++) {
          const cell = grid.get(x + "," + y + "," + z);
          if (!cell) continue;
          for (const id of cell) {
            tris[id].closestPointToPoint(p, cp);
            const d = cp.distanceTo(p);
            if (d < best) best = d;
          }
        }
    return best;
  };
}

// forward kinematics of one digit, as the game's arm does it (right hand, hand bone space)
const _q = [
    new THREE.Quaternion(),
    new THREE.Quaternion(),
    new THREE.Quaternion(),
  ],
  _t = new THREE.Quaternion(),
  _j = [new V3(), new V3(), new V3(), new V3()],
  _s = new V3();
function joints(pose, c) {
  const D = GH.DIGITS[c],
    o = c * 4;
  if (c === 0)
    _q[0]
      .setFromAxisAngle(THUMB_AXIS, pose[0])
      .multiply(_t.setFromAxisAngle(AXIS_Y, pose[3]))
      .multiply(D.q0);
  else
    _q[0]
      .setFromAxisAngle(AXIS_Y, D.yaw + D.sgn * pose[o + 3])
      .multiply(D.qRoll)
      .multiply(_t.setFromAxisAngle(AXIS_X, -pose[o]));
  _q[1].copy(_q[0]).multiply(_t.setFromAxisAngle(AXIS_X, -pose[o + 1]));
  _q[2].copy(_q[1]).multiply(_t.setFromAxisAngle(AXIS_X, -pose[o + 2]));
  _j[0].set(D.base[0], D.base[1], D.base[2]);
  for (let k = 0; k < 3; k++)
    _j[k + 1].copy(_j[k]).add(_s.set(0, 0, -D.len[k]).applyQuaternion(_q[k]));
  return _j;
}

/**
 * fitFingers({ arm, side, model, kind | from / to, digits, skin, steps })
 * The arm must already be solved onto the grip. Returns the game's 20 joint values.
 */
export function fitFingers(o) {
  const kind = FITS[o.kind] || FITS.cradle;
  const from = GH.makePose(o.from || kind.from),
    to = GH.makePose(o.to || kind.to);
  const skin = o.skin ?? 0.0008,
    steps = o.steps || 40;
  const distance = surface(o.model, o.arm.hand, o.side === "left");
  const pose = new Float32Array(20);
  pose.set(from);
  const depth = [0, 0, 0];
  // how deep each of a digit's three segments is in the surface (negative: clear of it)
  const sink = (c) => {
    const D = GH.DIGITS[c],
      j = joints(pose, c);
    for (let k = 0; k < 3; k++) {
      const r = (D.rad[k] + D.rad[k + 1]) / 2;
      // the last segment is measured up to where its rounded end begins
      const end = k === 2 ? 1 - D.rad[3] / D.len[2] : 1;
      let d = 1;
      for (const u of [0.15, 0.5, 0.85, 1]) {
        _s.lerpVectors(j[k], j[k + 1], u * end);
        d = Math.min(d, distance(_s, r + 0.004));
      }
      depth[k] = r - d;
    }
    return depth;
  };
  for (const c of o.digits || [1, 2, 3, 4, 0]) {
    const f = c * 4;
    const prog = [0, 0, 0],
      was = [0, 0, 0];
    // joints up to `locked` stay where they are; the rest advance by v steps
    const set = (v, locked) => {
      for (let b = 0; b < 3; b++) {
        const g = b > locked ? Math.min(1, prog[b] + v / steps) : prog[b];
        pose[f + b] = from[f + b] + (to[f + b] - from[f + b]) * g;
        if (b === 0) pose[f + 3] = from[f + 3] + (to[f + 3] - from[f + 3]) * g;
      }
    };
    // the outermost free segment that has come to touch (or sunk further), -1 if none
    const touched = (locked) => {
      const y = sink(c);
      let hit = -1;
      for (let g = locked + 1; g < 3; g++)
        if (y[g] + skin > 0 && y[g] > was[g] + 1e-7) hit = g;
      return hit;
    };
    const note = () => {
      const y = sink(c);
      was[0] = y[0];
      was[1] = y[1];
      was[2] = y[2];
    };
    set(0, 2);
    note();
    let locked = -1;
    for (let v = 0; v < steps && locked < 2; v++) {
      set(1, locked);
      let hit = touched(locked);
      if (hit < 0) {
        for (let e = locked + 1; e < 3; e++)
          prog[e] = Math.min(1, prog[e] + 1 / steps);
        note();
        continue;
      }
      // the step that made contact: find where in it
      let lo = 0,
        hi = 1;
      for (let e = 0; e < 10; e++) {
        const mid = (lo + hi) / 2;
        set(mid, locked);
        const h = touched(locked);
        if (h < 0) lo = mid;
        else ((hi = mid), (hit = h));
      }
      for (let e = locked + 1; e < 3; e++)
        prog[e] = Math.min(1, prog[e] + lo / steps);
      set(0, 2);
      note();
      locked = hit;
      v--;
    }
    set(0, 2);
  }
  return pose;
}

/** The game's joint values as a lab pose (see hands.js): what gets pasted into a weapon file. */
export function toLabPose(j) {
  const r = (v) => Math.round(v * 100) / 100;
  const d = new V3(...GH.DIGITS[0].dir)
    .normalize()
    .applyAxisAngle(AXIS_Y, j[3])
    .applyAxisAngle(THUMB_AXIS, j[0]);
  const names = ["index", "middle", "ring", "pinky"],
    sign = [1, 1, -1, -1];
  const out = { thumb: [r(-d.x), r(d.y), r(-d.z), r(j[1]), r(j[2])] };
  for (let i = 0; i < 4; i++) {
    const o = (i + 1) * 4;
    out[names[i]] = [r(j[o]), r(j[o + 1]), r(j[o + 2]), r(j[o + 3] * sign[i])];
  }
  return out;
}
