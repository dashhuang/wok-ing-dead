// What the numbers in data/feel.js come to: fires each weapon through the recoil model and
// prints how far the muzzle flips, how far the weapon is driven back, how quickly, and what
// the camera does over a burst. For tuning: nobody has to read springs off a table.
//
//   node arsenal/scripts/feel-report.mjs            every weapon
//   node arsenal/scripts/feel-report.mjs smg lever  some of them
import { createRecoil } from "../src/combat/recoil.js";
import { FEEL } from "../src/data/feel.js";
import { BEHAVIOURS } from "../src/combat/behaviours.js";

const deg = (r) => (r * 180) / Math.PI;
const only = process.argv.slice(2);
const rows = [];
// the same generator every time: the table should not change between two runs
let seed = 12345;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

for (const [id, F] of Object.entries(FEEL)) {
  if (only.length && !only.includes(id)) continue;
  const spec = BEHAVIOURS[id].spec("base", 1);
  const look = { pitch: 0, yaw: 0 };
  const stage = {
    zoomNow: 1,
    nudgeLook(dp, dy) {
      look.pitch += dp;
      look.yaw += dy;
    },
  };
  const R = createRecoil(stage);
  R.use(id);
  const dt = 1 / 240;
  const row = { weapon: id, kind: spec.kind };
  if (spec.kind === "melee") {
    const M = F.melee;
    R.jolt({ back: M.back, roll: M.roll, camYaw: M.cam, camRoll: M.cam * 0.6 });
    let back = 0;
    let roll = 0;
    let cam = 0;
    for (let t = 0; t < 1; t += dt) {
      R.update(dt);
      back = Math.max(back, R.springs.z.x);
      roll = Math.max(roll, Math.abs(R.springs.r.x));
      cam = Math.max(cam, Math.abs(R.cam.y));
    }
    Object.assign(row, {
      "hit stop ms": Math.round(M.stop * 1000),
      "back mm": +(back * 1000).toFixed(1),
      "roll deg": +deg(roll).toFixed(1),
      "cam deg": +deg(cam).toFixed(2),
      "lean deg": +deg(M.follow).toFixed(2),
    });
    rows.push(row);
    continue;
  }
  if (spec.kind === "stream") {
    let back = 0;
    let rise = 0;
    let roll = 0;
    let cam = 0;
    for (let t = 0; t < 2; t += dt) {
      R.stream(dt);
      R.update(dt);
      back = Math.max(back, R.springs.z.x);
      rise = Math.max(rise, Math.abs(R.springs.p.x));
      roll = Math.max(roll, Math.abs(R.springs.r.x));
      cam = Math.max(cam, Math.hypot(R.cam.p, R.cam.y));
    }
    Object.assign(row, {
      "back mm": +(back * 1000).toFixed(1),
      "rise deg": +deg(rise).toFixed(2),
      "roll deg": +deg(roll).toFixed(2),
      "cam deg": +deg(cam).toFixed(2),
    });
    rows.push(row);
    continue;
  }
  // a gun: one shot on its own, then a burst (a second and a half of holding the trigger)
  const gap = 60 / spec.rpm;
  R.shot(F.ref, 1);
  let rise = 0;
  let back = 0;
  let at = 0;
  let settled = 0;
  let camPeak = 0;
  for (let t = 0; t < 1.5; t += dt) {
    R.update(dt);
    if (R.springs.p.x * Math.sign(F.rise || 1) > rise) {
      rise = Math.abs(R.springs.p.x);
      at = t;
    }
    back = Math.max(back, Math.abs(R.springs.z.x));
    camPeak = Math.max(camPeak, Math.abs(R.cam.p));
    if (Math.abs(R.springs.p.x) > rise * 0.1) settled = t;
  }
  const kept1 = look.pitch;
  R.reset();
  look.pitch = look.yaw = 0;
  const n = Math.max(2, Math.round(1.5 / gap));
  let mean = 0;
  let steps = 0;
  let next = 0;
  let shot = 0;
  let wander = 0;
  for (let t = 0; t < n * gap; t += dt) {
    if (t >= next && shot < n) {
      shot++;
      next += gap;
      R.shot(F.ref, shot);
    }
    R.update(dt);
    mean += R.springs.p.x;
    steps++;
    wander = Math.max(wander, Math.abs(look.yaw + R.cam.y));
  }
  Object.assign(row, {
    rpm: spec.rpm,
    "flip deg": +deg(rise).toFixed(2),
    "at ms": Math.round(at * 1000),
    "settle ms": Math.round(settled * 1000),
    "back mm": +(back * 1000).toFixed(1),
    "cam/shot deg": +deg(camPeak + kept1).toFixed(2),
    "kept deg": +deg(kept1).toFixed(2),
    [`burst`]: n,
    "burst climb deg": +deg(look.pitch).toFixed(2),
    "burst weave deg": +deg(wander).toFixed(2),
    "burst mean flip": +deg(mean / steps).toFixed(2),
  });
  rows.push(row);
}
console.table(rows.filter((r) => r.kind === "gun"));
console.table(rows.filter((r) => r.kind === "stream"));
console.table(rows.filter((r) => r.kind === "melee"));
