// First-person arms.
//
// These are the game's own arms: the rig, skinned mesh, glove-and-sleeve material, finger limits
// and two-bone arm solver of src/game.js, lifted unchanged into gamehands.gen.js by
// scripts/extract-hands.mjs. A weapon held here looks the way it will in the game.
// This file is the lab's side of it: it turns a weapon's description of a grip into targets
// for those arms.
//
// A weapon never deals with bones. It describes a grip as "the palm touches the weapon HERE,
// faces THIS way, and the straightened fingers would point THAT way" (see kit.weapon).
// Grip space (right hand): origin at the centre of the palm, +Z towards the fingertips, the palm
// faces -Y, the thumb is on the +X side. The left hand is the mirror image (thumb on -X).
import * as THREE from "three";
import * as GH from "./gamehands.gen.js";

const V3 = THREE.Vector3;
/** Where a held object touches the hand, relative to the wrist, in grip space. */
export const PALM = new V3(0, -0.0165, 0.058);
// The same point in the hand bone of the game's arm (fingers along -Z, palm faces -Y, thumb on -X
// of a right hand), and the turn from grip space to that bone.
const PALM_BONE = new V3(0, -0.0165, -0.062);
const GRIP_TO_BONE = new THREE.Quaternion().setFromAxisAngle(
  new V3(0, 1, 0),
  Math.PI,
);
// Shoulder to wrist, at most: beyond this the shoulder comes forward with the hand, so the
// elbow never locks straight (upper arm 0.30 m + forearm 0.27 m).
const REACH = 0.525;
// Elbow search: candidates round the shoulder-wrist line, how much the default direction is
// preferred (per unit of 1 - cos of the swing away from it), and how much better a new place
// must be before the elbow leaves the one it has.
// Leaning in to a far hand: the angle below the hand the shoulder ends up at, and the
// over-reach (metres) at which it gets there.
const LEAN_ANGLE = 0.9,
  LEAN_OVER = 0.25;
const POLE_STEPS = 24,
  POLE_BIAS = 0.12,
  POLE_STICK = 0.05;

// ---------------------------------------------------------------- poses
// fingers: [knuckle, middle joint, end joint, spread] in radians (0 = straight, ~1.5 = fully bent)
// thumb:   [dx, dy, dz, joint, tip joint] — the direction its first bone points, in hand space of a
//          RIGHT hand (+X thumb side, -Y out of the palm, +Z along the fingers; mirrored for the left),
//          then the bend of its two joints. Resting direction is about [0.68, -0.2, 0.7].
const f = (a, b, c, s = 0) => [a, b, c, s];
const lerp = (a, b, t) => a + (b - a) * t;
/** Fingers closed round a handle of radius r (metres); the thumb comes round the other way to meet them. */
function wrap(r = 0.02) {
  const t = Math.max(0, Math.min(1, (r - 0.012) / 0.03));
  const k = lerp(1.32, 0.62, t),
    m = lerp(1.62, 0.92, t),
    e = lerp(0.95, 0.5, t);
  return {
    index: f(k - 0.06, m - 0.05, e, 0.03),
    middle: f(k, m, e),
    ring: f(k + 0.04, m + 0.02, e, -0.02),
    pinky: f(k + 0.1, m + 0.03, e, -0.05),
    thumb: [
      lerp(0.42, 0.62, t),
      lerp(-0.52, -0.42, t),
      lerp(0.74, 0.66, t),
      lerp(0.7, 0.45, t),
      lerp(0.7, 0.4, t),
    ],
  };
}
export const POSES = {
  relax: {
    index: f(0.3, 0.42, 0.25, 0.03),
    middle: f(0.36, 0.46, 0.3),
    ring: f(0.42, 0.5, 0.3, -0.03),
    pinky: f(0.48, 0.52, 0.3, -0.08),
    thumb: [0.66, -0.3, 0.68, 0.2, 0.2],
  },
  flat: {
    index: f(0.04, 0.08, 0.05, 0.04),
    middle: f(0.04, 0.08, 0.05),
    ring: f(0.05, 0.08, 0.05, -0.04),
    pinky: f(0.06, 0.1, 0.06, -0.1),
    thumb: [0.86, -0.05, 0.5, 0.05, 0.05],
  },
  fist: {
    index: f(1.4, 1.66, 1.0),
    middle: f(1.42, 1.68, 1.0),
    ring: f(1.44, 1.68, 1.0),
    pinky: f(1.48, 1.7, 1.0),
    thumb: [0.36, -0.5, 0.78, 0.8, 0.75],
  },
  // trigger hand: three fingers round the grip, index on the trigger (it curls further as the trigger is pulled),
  // thumb forward along the far side of the frame
  pistol: {
    ...wrap(0.017),
    index: f(0.22, 0.52, 0.3, 0.05),
    thumb: [0.56, -0.36, 0.75, 0.3, 0.3],
  },
  // support hand under a fore-end: fingers up one side, thumb up the other
  cradle: {
    index: f(0.7, 0.92, 0.5, 0.05),
    middle: f(0.74, 0.96, 0.52),
    ring: f(0.78, 0.98, 0.52, -0.03),
    pinky: f(0.84, 1.0, 0.52, -0.06),
    thumb: [0.74, -0.38, 0.55, 0.4, 0.35],
  },
  // thumb and two fingers holding something thin (a paper talisman, a fuse)
  pinch: {
    index: f(0.72, 0.92, 0.35),
    middle: f(0.8, 0.98, 0.4),
    ring: f(1.25, 1.5, 0.85),
    pinky: f(1.3, 1.55, 0.9),
    thumb: [0.48, -0.5, 0.72, 0.5, 0.35],
  },
  // 剑指: index and middle straight together, the others folded under the thumb
  sword: {
    index: f(0.04, 0.05, 0.03, 0.015),
    middle: f(0.04, 0.05, 0.03, -0.015),
    ring: f(1.38, 1.62, 0.92),
    pinky: f(1.42, 1.64, 0.92),
    thumb: [0.36, -0.52, 0.77, 0.85, 0.8],
  },
  point: {
    index: f(0.05, 0.06, 0.04),
    middle: f(1.36, 1.62, 0.95),
    ring: f(1.4, 1.64, 0.95),
    pinky: f(1.44, 1.66, 0.95),
    thumb: [0.36, -0.5, 0.78, 0.8, 0.75],
  },
};
/**
 * Resolve a pose spec: "pistol" | "wrap" | { base: "wrap", r: 0.024, index: [...], thumb: [...] }.
 * Any finger given in the object overrides the base pose.
 */
export function resolvePose(spec) {
  if (!spec) return POSES.relax;
  if (typeof spec === "string")
    return spec === "wrap" ? wrap() : POSES[spec] || POSES.relax;
  const base =
    spec.base === "wrap" || (!spec.base && spec.r)
      ? wrap(spec.r)
      : POSES[spec.base] || POSES.relax;
  const out = { ...base };
  for (const k of ["index", "middle", "ring", "pinky", "thumb"])
    if (spec[k]) out[k] = spec[k];
  return out;
}

// ---------------------------------------------------------------- pose -> the game's 20 joint values
// The game writes a hand pose as 5 digits x [knuckle, middle joint, end joint, spread]. Fingers map
// straight across (spread is "away from the middle finger" there, "towards the thumb" here).
// Its thumb is two swings of the first bone, about the long axis of the hand (opposition) and about
// the back of the hand (abduction), found here from the direction the pose asks for.
const DIGITS = ["index", "middle", "ring", "pinky"];
const SPREAD = [1, 1, -1, -1];
const TH = (() => {
  const d = GH.DIGITS[0];
  const dir0 = new V3(...d.dir).normalize();
  const axis = new V3(0.2, 0, 0.98).normalize();
  return {
    dir0,
    axis,
    // dir0 swung by b about Y, dotted with the axis: P cos b + Q sin b
    P: axis.x * dir0.x + axis.z * dir0.z,
    Q: axis.x * dir0.z - axis.z * dir0.x,
    lim: [
      [GH.LIMITS.min[0], GH.LIMITS.max[0]],
      [GH.LIMITS.min[3], GH.LIMITS.max[3]],
    ],
  };
})();
const _td = new V3(),
  _tu = new V3(),
  _tc = new V3();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sat = (v) => clamp(v, 0, 1);
function thumbToGame(v, out) {
  // the direction, in the bone space of a right hand
  _td.set(-v[0], v[1], -v[2]).normalize();
  const c = clamp(_td.dot(TH.axis) / Math.hypot(TH.P, TH.Q), -1, 1);
  const mid = Math.atan2(TH.Q, TH.P),
    off = Math.acos(c);
  // two abductions give that angle to the axis: take the one inside the joint's range, nearer rest
  let b = mid + off,
    b2 = mid - off;
  const cost = (x) =>
    Math.max(0, TH.lim[1][0] - x, x - TH.lim[1][1]) * 10 + Math.abs(x - 0.5);
  if (cost(b2) < cost(b)) b = b2;
  b = clamp(b, TH.lim[1][0], TH.lim[1][1]);
  const cb = Math.cos(b),
    sb = Math.sin(b);
  _tu.set(
    TH.dir0.x * cb + TH.dir0.z * sb,
    TH.dir0.y,
    -TH.dir0.x * sb + TH.dir0.z * cb,
  );
  // then swing about the axis until it lines up
  _tu.addScaledVector(TH.axis, -_tu.dot(TH.axis));
  _td.addScaledVector(TH.axis, -_td.dot(TH.axis));
  const a = Math.atan2(_tc.crossVectors(_tu, _td).dot(TH.axis), _tu.dot(_td));
  out[0] = clamp(a, TH.lim[0][0], TH.lim[0][1]);
  out[1] = v[3] || 0;
  out[2] = v[4] || 0;
  out[3] = b;
}
/** A lab pose ({ thumb, index, middle, ring, pinky }) as the game's joint values. */
export function toJoints(pose, out = new Float32Array(20)) {
  thumbToGame(pose.thumb || POSES.relax.thumb, out);
  for (let i = 0; i < 4; i++) {
    const v = pose[DIGITS[i]] || POSES.relax[DIGITS[i]];
    const o = (i + 1) * 4;
    out[o] = v[0];
    out[o + 1] = v[1];
    out[o + 2] = v[2];
    out[o + 3] = (v[3] || 0) * SPREAD[i];
  }
  return out;
}

// ---------------------------------------------------------------- the pair of arms and their solver
const _m = new THREE.Matrix4(),
  _inv = new THREE.Matrix4(),
  _view = new THREE.Matrix4(),
  _p = new V3(),
  _q = new THREE.Quaternion(),
  _s = new V3(),
  _p2 = new V3(),
  _q2 = new THREE.Quaternion(),
  _qh = new THREE.Quaternion(),
  _wrist = new V3(),
  _sh = new V3(),
  _pole = new V3(),
  _w = new V3(),
  _axis = new V3(),
  _el = new V3(),
  _base = new V3(),
  _perp = new V3(),
  _eyeInv = new THREE.Matrix4(),
  _e = new THREE.Euler();
// where a hand goes when it lets go of the weapon (reloading, weapon thrown): eye space
const AWAY_VIEW = {
  right: new V3(0.3, -0.52, -0.16),
  left: new V3(-0.3, -0.5, -0.14),
};
// and how it is turned there: fingers continuing the line from the shoulder, palm turned in
// towards the body, so the wrist is straight (grip space: +Z fingers, -Y palm)
const AWAY_TURN = {};
for (const side of ["right", "left"]) {
  const z = new V3()
    .subVectors(AWAY_VIEW[side], new V3().fromArray(GH.SHOULDER[side]))
    .normalize();
  const y = new V3(side === "right" ? 1 : -1, 0.25, 0);
  y.addScaledVector(z, -y.dot(z)).normalize();
  AWAY_TURN[side] = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new V3().crossVectors(y, z), y, z),
  );
}
const WET = { fp: 0.7, show: 0.12 }; // rain beading on the sleeves: the alley is wet, the studio is not
// The lab's alley lights the shooter with a lamp at arm's length, far brighter on the hands than
// the game's night street: the arms' own colours are scaled down there so they read as they do
// in the game (olive and tan, not cream).
const GAIN = { value: 1 };
const GAIN_FOR = { fp: 0.42, show: 0.72 };
// In the showcase there is no body for the arms to end on: the sleeves dissolve above the elbow.
const CUT = { value: 0 };
function labMaterial() {
  const mat = GH.armMaterial();
  if (mat.userData.lab) return mat;
  mat.userData.lab = true;
  const compile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.uniforms.uLabGain = GAIN;
    shader.uniforms.uLabCut = CUT;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "uniform float uArmWet;",
        "uniform float uArmWet; uniform float uLabGain; uniform float uLabCut;",
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
  // (sleeve vertices carry their distance from the cuff in vArmHand.x; the elbow is at 0.27)
  if (uLabCut > 0.5 && vArmRest.w > 0.5) {
    float labFade = smoothstep(0.33, 0.47, vArmHand.x);
    if (labFade > fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;
  }`,
      )
      .replace(
        "diffuseColor.rgb = armCol;",
        "diffuseColor.rgb = armCol * uLabGain;",
      );
  };
  mat.customProgramCacheKey = () => "saltline-arm-lab-2";
  return mat;
}

// In first person an elbow in front of the eye is a grey lump across the picture: how far inside
// the frame it is (eye space; the frame is taken a little generously, the sleeve is thick),
// as a cost on the scale of radians of wrist strain.
function inView(e) {
  const d = -e.z;
  return (
    0.6 *
    sat((d - 0.02) / 0.06) *
    sat((0.62 * d + 0.07 - Math.abs(e.y)) / 0.08) *
    sat((1.1 * d + 0.07 - Math.abs(e.x)) / 0.08)
  );
}

export function createArms(kit) {
  const group = new THREE.Group();
  group.name = "arms";
  const arms = {
    right: GH.createArm(null, { side: "right", material: labMaterial() }),
    left: GH.createArm(null, { side: "left", material: labMaterial() }),
  };
  group.add(arms.right.group, arms.left.group);
  const away = { right: 0, left: 0 };
  const joints = { right: new Float32Array(20), left: new Float32Array(20) };
  const poles = { right: new V3(), left: new V3() };
  let last = null;

  const mixPose = (a, b, e) => {
    const out = {};
    for (const k of ["thumb", "index", "middle", "ring", "pinky"]) {
      const x = a[k],
        y = b[k];
      out[k] = x.map((v, i) => v + ((y[i] ?? v) - v) * e);
    }
    return out;
  };
  // eye space -> the space the arms live in. In first person that is the eye itself; in the
  // showcase there is no body, so the shooter is put where the weapon's hip pose says the eye is.
  function eyeFrame(model, o) {
    if (o.mode === "fp") return _view.identity();
    const hip = (model.view && model.view.hip) || {};
    const p = hip.pos || [0.16, -0.17, -0.4],
      r = hip.rot || [0, 0, 0];
    // eye -> hip pose -> the model's holder (turned to face down the range), as mounted in first person
    _view
      .compose(
        _p2.set(p[0], p[1], p[2]),
        _q2.setFromEuler(_e.set(r[0], r[1], r[2], "YXZ")),
        _s.set(1, 1, 1),
      )
      .multiply(_m.makeRotationY(Math.PI))
      .invert();
    model.holder.updateWorldMatrix(true, false);
    return _view.premultiply(model.holder.matrixWorld).premultiply(_inv);
  }
  function place(side, model, o, dt) {
    const arm = arms[side];
    const grip = model && model.grips ? model.grips[side] : null;
    const show = !!grip && o.visible !== false;
    arm.group.visible = show;
    if (!show) return;
    // grip frame -> the space the arms live in
    grip.anchor.updateWorldMatrix(true, false);
    _m.multiplyMatrices(_inv, grip.anchor.matrixWorld);
    _m.decompose(_p, _q, _s);
    let target = resolvePose(grip.pose);
    // a second grip (the magazine, a bolt handle, a round being loaded): blend across to it
    const alt = grip.to && grip.alts ? grip.alts[grip.to] : null;
    let onAlt = 0;
    if (alt && grip.mix > 0) {
      const m = Math.min(1, grip.mix);
      onAlt = m * m * (3 - 2 * m);
      alt.anchor.updateWorldMatrix(true, false);
      _m.multiplyMatrices(_inv, alt.anchor.matrixWorld);
      _m.decompose(_p2, _q2, _s);
      _p.lerp(_p2, onAlt);
      _q.slerp(_q2, onAlt);
      target = mixPose(target, resolvePose(alt.pose), onAlt);
    }
    const eye = eyeFrame(model, o);
    // letting go: slide down and out of the way, and come back
    const want = Math.max(o.away ? o.away[side] || 0 : 0, grip.away || 0);
    away[side] += (want - away[side]) * (o.snap ? 1 : Math.min(1, dt * 14));
    const k = away[side];
    if (k > 0.001 && o.mode === "fp") {
      const e = k * k * (3 - 2 * k);
      _p.lerp(AWAY_VIEW[side], e);
      _q.slerp(AWAY_TURN[side], e);
    }
    // the hand bone: turned round from grip space, its wrist behind the palm
    _qh.copy(_q).multiply(GRIP_TO_BONE);
    _wrist.copy(PALM_BONE).applyQuaternion(_qh).negate().add(_p);
    // Shoulder. A weapon is often held further out than the arm is long. The shoulder then
    // comes forward (the shooter leans in) and sinks, staying on its own side of the body, so
    // the arm still reaches in from the lower corner on its side: the upper arm and elbow
    // stay under the frame and the forearm rises into the picture at a slant.
    _sh.fromArray(GH.SHOULDER[side]);
    _eyeInv.copy(eye).invert();
    _w.copy(_wrist).applyMatrix4(_eyeInv); // wrist in eye space (x right, y up, -z forward)
    const far = _sh.distanceTo(_w) - REACH;
    if (far > 0) {
      const dx = _w.x - _sh.x;
      if (Math.abs(dx) < REACH * 0.92) {
        // on the circle of reach behind and below the wrist: from the angle the shoulder
        // already sits at below the hand, towards LEAN_ANGLE as the reach gets longer
        const rho = Math.sqrt(REACH * REACH - dx * dx);
        const a0 = Math.atan2(_w.y - _sh.y, _sh.z - _w.z);
        const a = a0 + Math.max(0, LEAN_ANGLE - a0) * sat(far / LEAN_OVER);
        _sh.y = _w.y - rho * Math.sin(a);
        _sh.z = _w.z + rho * Math.cos(a);
      } else {
        // a hand far out to the side: nothing for it but to follow
        _sh.y -= Math.min(0.4, 1.2 * far);
        _sh.sub(_w).setLength(REACH).add(_w);
      }
    }
    _sh.applyMatrix4(eye);
    // Elbow. It points out and down by default, as the game has it, but a hand turned palm-up
    // under a fore-end (or far over on its side) needs the elbow somewhere else or the wrist is
    // bent past what a wrist can do. So the elbow is swung round the shoulder-wrist line to
    // where the wrist is most comfortable, staying near the default when there is little in
    // it, and it moves there smoothly.
    const pole = poles[side];
    _axis.subVectors(_wrist, _sh).normalize();
    _base.fromArray(GH.DEFAULT_POLE[side]).transformDirection(eye);
    _base.addScaledVector(_axis, -_base.dot(_axis)).normalize();
    _perp.crossVectors(_axis, _base);
    if (o.snap || pole.lengthSq() < 0.5) pole.copy(_base);
    pole.addScaledVector(_axis, -pole.dot(_axis)).normalize();
    // (the first solve of the frame also tells the arm how far the wrist has moved, which its
    // own follow-through in update() feeds on, so update() comes straight after it)
    // (the showcase has no eye, but its arms are placed as the shooter's would be, so they are
    // judged from where the shooter's eye would be and come out the same as in first person)
    const seen = (e) => inView(_el.copy(e).applyMatrix4(_eyeInv));
    let ik = arm.solve(_sh, _wrist, _qh, pole, null);
    const before =
      ik.violation + POLE_BIAS * (1 - pole.dot(_base)) + seen(ik.elbow);
    arm.update(dt);
    let best = before - POLE_STICK,
      bestC = 2,
      bestS = 0;
    for (let i = 0; i < POLE_STEPS; i++) {
      const a = (i / POLE_STEPS) * Math.PI * 2,
        c = Math.cos(a),
        sn = Math.sin(a);
      _pole.copy(_base).multiplyScalar(c).addScaledVector(_perp, sn);
      ik = arm.solve(_sh, _wrist, _qh, _pole, null);
      const score = ik.violation + POLE_BIAS * (1 - c) + seen(ik.elbow);
      if (score < best) ((best = score), (bestC = c), (bestS = sn));
    }
    if (bestC <= 1) {
      _pole.copy(_base).multiplyScalar(bestC).addScaledVector(_perp, bestS);
      pole.lerp(_pole, o.snap ? 1 : Math.min(1, dt * 14));
      // (straight through the middle when the target is opposite: step sideways instead)
      if (pole.lengthSq() < 1e-4) pole.copy(_perp);
      pole.normalize();
    }
    arm.solve(_sh, _wrist, _qh, pole, null);
    // fingers
    const held = k < 0.5;
    toJoints(held ? target : POSES.relax, joints[side]);
    arm.setTrigger(grip.trigger && held && onAlt < 0.5 ? o.trigger || 0 : 0);
    arm.setFingers(joints[side], o.snap ? 1 : Math.min(1, dt * 18));
    // puts the follow-through wobble back on top of the final solve
    arm.update(1e-6);
  }

  return {
    group,
    arms,
    POSES,
    /**
     * solve(model, { mode: "fp" | "show", dt, trigger, away: { left, right }, visible })
     * Call after the weapon's own update, once per frame.
     */
    solve(model, o = {}) {
      const snap = model !== last || o.snap;
      last = model;
      const dt = o.dt ?? 1 / 60;
      const where = o.mode === "fp" ? "fp" : "show";
      GH.WETNESS.value = WET[where];
      GAIN.value = o.gain ?? GAIN_FOR[where]; // (the game passes its own: its lighting differs)
      CUT.value = where === "show" ? 1 : 0;
      group.updateWorldMatrix(true, false);
      _inv.copy(group.matrixWorld).invert();
      for (const side of ["right", "left"])
        place(side, model, { ...o, snap }, dt);
    },
    /** A shot: the fingers and wrists give a little (k about 0.3 - 1). */
    impulse(k = 0.6) {
      arms.right.impulse(k);
      arms.left.impulse(k * 0.65);
    },
    setVisible(v) {
      group.visible = !!v;
    },
  };
}
