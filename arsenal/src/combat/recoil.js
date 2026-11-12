// Recoil and handling: what a shot, a held stream or a blade biting does to the weapon in the
// hands and to the camera. The numbers are data/feel.js; this plays them.
//
// It is the model of the game's own two guns (src/game.js, "Weapon runtime"), so the armoury's
// weapons answer the trigger the way those do:
//   - the weapon: six damped springs (back, muzzle rise, yaw, roll, up, side) that a shot
//     strikes and that bring it back on their own. The rise, yaw and roll turn it about the
//     grip, not about the eye, so the muzzle flips and the hand stays where it was.
//   - the camera: every shot lifts the view. A share of that stays on the aim (the burst
//     climbs and has to be held down); the rest is put on quickly, held for a moment and let
//     back. Long bursts settle to a smaller kick and walk from side to side.
//   - the picture is punched outwards a little by the big ones.
import * as THREE from "three";
import { FEEL, FEEL_DEFAULT, FEEL_SPRINGS, FEEL_ADS } from "../data/feel.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const srnd = (a) => (Math.random() * 2 - 1) * a;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, k) => a + (b - a) * k;
const ease = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

// one exact step of a damped spring towards `to` (w: rad/s, z: damping ratio)
function step(s, to, dt, w, z) {
  const o = s.x - to;
  const v = s.v;
  if (z >= 0.999) {
    const a = Math.exp(-w * dt);
    const l = v + w * o;
    s.x = to + (o + l * dt) * a;
    s.v = (v - w * l * dt) * a;
  } else {
    const a = w * Math.sqrt(1 - z * z);
    const l = Math.exp(-z * w * dt);
    const c = Math.cos(a * dt);
    const u = Math.sin(a * dt);
    const f = (v + z * w * o) / a;
    s.x = to + l * (o * c + f * u);
    s.v = l * (a * (f * c - o * u) - z * w * (o * c + f * u));
  }
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _r = new THREE.Vector3();

/**
 * stage: the lab's stage or the game's stand-in for it. Read from it:
 *   zoomNow            how far a scope is in (1 = not at all)
 *   steady             a multiplier on every kick (the game: 0.85 crouched), 1 if absent
 *   recoilKeep         a multiplier on the share of the climb that stays on the aim, 1 if absent
 *   nudgeLook(dp, dy)  turns the player's aim (the part of the kick that is not given back)
 */
export function createRecoil(stage) {
  const S = {
    z: { x: 0, v: 0 },
    p: { x: 0, v: 0 },
    y: { x: 0, v: 0 },
    r: { x: 0, v: 0 },
    x: { x: 0, v: 0 },
    u: { x: 0, v: 0 },
  };
  // tp, ty: where the camera is being pushed to; p, y: where it is; r: roll (blades)
  const cam = { tp: 0, ty: 0, p: 0, y: 0, tr: 0, r: 0, hold: 0, fov: 0 };
  let F = FEEL_DEFAULT;
  let phase = 0;
  let push = 0; // a stream leaning on the hands: how far, and for how much longer
  let pushT = 0;
  let shudder = 0;

  const scope = () => clamp(((stage.zoomNow || 1) - 1) / 1.2, 0, 1);
  const spr = (k) => (F.spr && F.spr[k]) || FEEL_SPRINGS[k];

  const api = {
    cam,
    springs: S,
    /**
     * For tuning and pictures: { z, p, y, r, x, u } holds the weapon at that much back, rise,
     * yaw, roll, side and up, whatever the springs are doing. null lets it go.
     */
    freeze: null,
    get feel() {
      return F;
    },
    /** The weapon in hand changed. */
    use(id) {
      F = FEEL[id] || FEEL_DEFAULT;
      phase = Math.random() * Math.PI * 2;
      api.reset();
    },
    reset() {
      for (const s of Object.values(S)) s.x = s.v = 0;
      cam.tp = cam.ty = cam.p = cam.y = cam.tr = cam.r = cam.hold = cam.fov = 0;
      push = pushT = 0;
    },
    /**
     * A shot. a: the strength the behaviour asked for (ctx.kick); n: which shot of the burst
     * this is, 1 for the first (anything that is not a shot from the trigger passes 0).
     */
    shot(a, n = 0) {
      const k = (a / (F.ref || 1)) * (stage.steady ?? 1);
      if (!(k > 0)) return;
      const z = scope();
      const ads = F.ads || FEEL_ADS;
      const first = F.first ?? 1;
      const g =
        k *
        (n === 1 ? first : n === 2 ? 0.5 + 0.5 * first : 1) *
        rnd(0.88, 1.12);
      const rot = g * mix(1, ads[0], z);
      const pos = g * mix(1, ads[1], z);
      S.z.v += (F.back || 0) * pos;
      S.p.v += (F.rise || 0) * rot;
      S.y.v += srnd(0.5) * (F.yaw || 0) * rot;
      S.r.v += srnd(0.5) * (F.roll || 0) * rot;
      S.u.v += (F.up || 0) * pos * rnd(0.7, 1.3);
      S.x.v += srnd(1) * (F.side || 0) * pos;
      const c = F.cam;
      if (c) {
        const ck =
          k *
          mix(1, ads[2], z) *
          (c.sustain && n > c.sustain[0] ? c.sustain[1] : 1);
        const pitch = (c.pitch || 0) * ck * rnd(0.85, 1.15);
        const yaw =
          (c.weave && n >= 4 ? Math.sin(n * 0.57 + phase) * c.weave : 0) * ck +
          srnd(1) * (c.yaw || 0) * ck;
        api.push(pitch, yaw, c.keep || 0, c.hold);
      }
      if (F.fov) cam.fov = Math.min(0.06, cam.fov + F.fov * k);
    },
    /** Lift the camera by hand: keep = the share that stays on the aim. */
    push(pitch, yaw, keep = 0, hold = 0.09) {
      const kept = clamp(keep * (stage.recoilKeep ?? 1), 0, 1);
      if (kept && stage.nudgeLook) stage.nudgeLook(pitch * kept, yaw * kept);
      cam.tp = clamp(cam.tp + pitch * (1 - kept), -0.3, 0.3);
      cam.ty = clamp(cam.ty + yaw * (1 - kept), -0.2, 0.2);
      cam.hold = hold ?? 0.09;
    },
    /** A stream is open this frame. */
    stream(dt) {
      const s = F.stream;
      if (!s) return;
      push = s.push || 0;
      pushT = 0.08;
      shudder -= dt;
      if (shudder > 0) return;
      shudder = rnd(0.6, 1.4) / (s.hz || 24);
      const k = stage.steady ?? 1;
      S.p.v += srnd(1) * (s.rise || 0) * k;
      S.y.v += srnd(1) * (s.yaw || 0) * k;
      S.r.v += srnd(1) * (s.roll || 0) * k;
      if (s.cam) {
        cam.tp = clamp(cam.tp + srnd(1) * s.cam * k, -0.3, 0.3);
        cam.ty = clamp(cam.ty + srnd(1) * s.cam * k, -0.2, 0.2);
        cam.hold = 0.03;
      }
    },
    /**
     * Strike the springs by hand (a blade biting, a heavy thing landing in the hands):
     * { back, rise, yaw, roll, up, side } on the weapon, { pitch, camYaw, camRoll } on the camera.
     */
    jolt(o) {
      S.z.v += o.back || 0;
      S.p.v += o.rise || 0;
      S.y.v += o.yaw || 0;
      S.r.v += o.roll || 0;
      S.u.v += o.up || 0;
      S.x.v += o.side || 0;
      if (o.pitch || o.camYaw) api.push(o.pitch || 0, o.camYaw || 0, 0, 0.05);
      if (o.camRoll) cam.tr = clamp(cam.tr + o.camRoll, -0.12, 0.12);
    },
    update(dt) {
      pushT -= dt;
      step(S.z, pushT > 0 ? push : 0, dt, ...spr("z"));
      step(S.p, 0, dt, ...spr("p"));
      step(S.y, 0, dt, ...spr("y"));
      step(S.r, 0, dt, ...spr("r"));
      step(S.x, 0, dt, ...spr("x"));
      step(S.u, 0, dt, ...spr("x"));
      const c = F.cam || FEEL_DEFAULT.cam;
      cam.hold -= dt;
      if (cam.hold <= 0) {
        const rate = c.recover ?? 6.5;
        cam.tp = ease(cam.tp, 0, rate, dt);
        cam.ty = ease(cam.ty, 0, rate, dt);
        cam.tr = ease(cam.tr, 0, rate * 1.4, dt);
      }
      cam.p = ease(cam.p, cam.tp, 34, dt);
      cam.y = ease(cam.y, cam.ty, 34, dt);
      cam.r = ease(cam.r, cam.tr, 30, dt);
      cam.fov *= Math.exp(-13 * dt);
    },
    /**
     * Adds the recoil to the group that carries the weapon (after sway, reload and the rest
     * have been written to it). grip: where the hand holds it, in that group's own space.
     */
    apply(group, grip) {
      const f = api.freeze;
      const at = (k) => (f ? f[k] || 0 : S[k].x);
      _e.set(at("p"), at("y"), at("r"), "YXZ");
      _q.setFromEuler(_e);
      // turn about a point behind the grip: p' = pivot + q (p - pivot)
      _p.copy(grip);
      _p.z += F.pivot || 0;
      _r.copy(_p).applyQuaternion(_q);
      _p.sub(_r);
      _p.x += at("x");
      _p.y += at("u");
      _p.z += at("z");
      group.position.add(_p.applyQuaternion(group.quaternion));
      group.quaternion.multiply(_q);
    },
  };
  return api;
}
