// How the shooter's arms stand in the showcase (the game's weapon gallery), where they are
// seen to past the elbow and from every side: for every weapon form, where each shoulder
// and elbow ended up, at rest and at the worst moment of the canned shot and reload.
//
//   node arsenal/tools/posture.mjs [--only id,id] [--fp]
//
// In the shooter's own frame (x to her right, y up, the eye at the origin):
//   drop   how far the shoulder is below the wrist (cm). A shoulder a hand's width under the
//          hand is a person; one at the waist is first person's trick for keeping the upper
//          arm out of the picture, and looks it when the arm is on show.
//   elbow  which way the elbow points off the line from shoulder to wrist: 0 straight down,
//          90 straight out to its own side, 180 straight up, negative inwards across the body.
//          An elbow hangs between about -30 and 90.
//   upper  how steeply the upper arm climbs from the elbow to the shoulder (degrees). Negative:
//          the shoulder is below the elbow.
//   wrist  how far the wrist is bent (degrees) and how far past its limits (radians).
// A line is marked with "!" when the elbow is over 100 or under -50, the shoulder more than
// 20 degrees below the elbow or more than 20 cm below the wrist, or the wrist bent past 70.
// --fp measures the bench instead: there the shoulder is meant to sink and the elbow to keep
// out of the frame, so the marks mean nothing; it is for seeing that first person has not moved.
import { openLab, parseArgs } from "./lab.mjs";

const { opt } = parseArgs();
const only = opt.only ? opt.only.split(",") : null;
const FP = "fp" in opt;
const lab = await openLab({
  query: "w=shotgun&ui=0" + (FP ? "&mode=fp" : "&hands=1"),
  width: 640,
  height: 360,
});
const { page } = lab;
const ids = await page.evaluate(() => window.__lab.weapons.map((w) => w.id));
console.log(
  "weapon     form  arm    at     drop  elbow  upper  wrist  past   (worst moment of the shot and reload)",
);
let marked = 0;
for (const id of ids) {
  if (only && !only.includes(id)) continue;
  for (const b of ["base", "a", "b"]) {
    const rows = await page.evaluate(
      async ([id, b, fp]) => {
        const lab = window.__lab,
          T = lab.THREE,
          A = lab.arms.arms;
        lab.manual = true;
        lab.state.level = b === "base" ? 1 : 3;
        lab.state.branch = b;
        await lab.select(id, b);
        const read = () => {
          const eyeInv = lab.arms.frame.clone().invert();
          lab.arms.group.updateWorldMatrix(true, true);
          const gInv = lab.arms.group.matrixWorld.clone().invert();
          const out = {};
          for (const s of ["right", "left"]) {
            const a = A[s];
            if (!a.group.visible) continue;
            const k = a.ik,
              side = s === "right" ? 1 : -1;
            const sh = k.shoulder.clone().applyMatrix4(eyeInv),
              el = k.elbow.clone().applyMatrix4(eyeInv);
            let hand = null;
            a.group.traverse((o) => {
              if (o.isBone && o.name === "hand") hand = o;
            });
            const wr = hand
              .getWorldPosition(new T.Vector3())
              .applyMatrix4(gInv)
              .applyMatrix4(eyeInv);
            const axis = wr.clone().sub(sh).normalize();
            const off = el.clone().sub(sh);
            off.addScaledVector(axis, -off.dot(axis));
            const up = sh.clone().sub(el);
            const r = {
              drop: (wr.y - sh.y) * 100,
              elbow: Math.atan2(side * off.x, -off.y) * 57.3,
              upper: Math.atan2(up.y, Math.hypot(up.x, up.z)) * 57.3,
              wrist: Math.hypot(k.wristFlex, k.wristDeviation) * 57.3,
              past: k.violation,
            };
            r.bad =
              Math.max(0, r.elbow - 100, -50 - r.elbow) +
              Math.max(0, -20 - r.upper) +
              Math.max(0, r.drop - 20) +
              Math.max(0, r.wrist - 70);
            out[s] = r;
          }
          return out;
        };
        lab.advance(1.2, 1 / 60, false);
        const hold = read();
        const worst = {};
        if (!fp) {
          lab.playDemo();
          for (let i = 0; i < 420 && (i < 5 || lab.demo); i++) {
            lab.advance(1 / 60, 1 / 60, false);
            const now = read();
            for (const s in now)
              if (!worst[s] || now[s].bad > worst[s].bad) worst[s] = now[s];
          }
        }
        return { hold, worst };
      },
      [id, b, FP],
    );
    const n = (v, w, d = 0) => v.toFixed(d).padStart(w);
    const line = (r) =>
      `${n(r.drop, 5)}  ${n(r.elbow, 5)}  ${n(r.upper, 5)}  ${n(r.wrist, 5)}  ${n(r.past, 4, 2)}`;
    for (const s of ["right", "left"]) {
      const h = rows.hold[s];
      if (!h) continue;
      const w = rows.worst[s];
      const flag = !FP && (h.bad > 0 || (w && w.bad > 0));
      if (flag) marked++;
      console.log(
        `${id.padEnd(10)} ${b.padEnd(5)} ${s.padEnd(6)} rest ${line(h)}${w && w.bad > 0 ? `   (${line(w).trim().replace(/\s+/g, " / ")})` : ""}${flag ? "  !" : ""}`,
      );
    }
  }
}
if (!FP) console.log(marked ? `${marked} marked` : "none marked");
if (lab.errors.length) console.log("page errors:", lab.errors);
await lab.close();
