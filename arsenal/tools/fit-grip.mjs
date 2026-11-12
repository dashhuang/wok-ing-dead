// Works out a hand's finger angles for a grip: the fingers close onto the weapon's surface
// (the lab's __lab.fitGrip, see src/kit/fit.js), and the grip is printed ready to paste into the
// weapon file. Also reports how the wrist sits, and can save pictures from six sides.
//
//   node arsenal/tools/fit-grip.mjs <weapon> <form> <left|right> [out.png]
//        [--phi 55]             turn the hand so its fingers are that many degrees off the barrel
//                               (a support hand under a fore-end wants 50-55, not square across)
//        [--at x,y,z] [--palm x,y,z] [--fingers x,y,z]    try another palm point or direction
//        [--kind cradle|wrap]   cupped under something (default) or a fist round a handle
import { openLab, contactSheet, parseArgs } from "./lab.mjs";

const { opt, rest } = parseArgs();
const [id, form = "base", side = "left", out] = rest;
if (!id) {
  console.error(
    "usage: fit-grip.mjs <weapon> <form> <left|right> [out.png] [--phi 55] ...",
  );
  process.exit(2);
}
const vec = (s) => (s ? s.split(",").map(Number) : null);
const lab = await openLab({
  query: `ui=0&hands=1&w=${id}&b=${form}&lv=${form === "base" ? 1 : 3}`,
  width: 760,
  height: 520,
});
const { page } = lab;
await page.waitForTimeout(600);
const grip = await page.evaluate(
  async ([side, o]) => {
    const lab = window.__lab,
      spec = lab.model.grips[side].spec;
    const unit = (v) => {
      const n = Math.hypot(...v);
      return v.map((c) => c / n);
    };
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const palm = o.palm || spec.palm,
      at = o.at || spec.at;
    let fingers = o.fingers || spec.fingers;
    const fit = { kind: o.kind || "cradle" };
    if (o.phi != null) {
      // fingers at phi degrees from the barrel, leaning to the side they already lean to
      const P = unit(palm),
        B = [0, 0, 1];
      const b = unit(B.map((c, i) => c - dot(B, P) * P[i]));
      const f = fingers.map((c, i) => c - dot(fingers, P) * P[i]);
      const c = unit(f.map((v, i) => v - dot(f, b) * b[i]));
      const a = (o.phi * Math.PI) / 180;
      fingers = b.map((v, i) => Math.cos(a) * v + Math.sin(a) * c[i]);
      if (fit.kind === "cradle") {
        // the thumb lies along the barrel: that far out from the fingers
        const t = Math.max(0.2, Math.min(1, a - 0.3));
        fit.from = {
          thumb: [0.25, -0.1, -0.2, t],
          fingers: [-0.05, 0.04, 0.02, 0.04],
        };
        fit.to = { thumb: [1.2, 0.3, 0.35, t], fingers: [1.5, 1.6, 1, 0] };
      }
    }
    const pose = await lab.fitGrip(side, { ...fit, at, palm, fingers });
    const r3 = (v) => v.map((c) => Math.round(c * 1000) / 1000);
    return { at: r3(at), palm: r3(palm), fingers: r3(fingers), pose };
  },
  [
    side,
    {
      phi: opt.phi != null ? +opt.phi : null,
      at: vec(opt.at),
      palm: vec(opt.palm),
      fingers: vec(opt.fingers),
      kind: opt.kind,
    },
  ],
);
console.log(JSON.stringify(grip));
await page.waitForTimeout(500);
console.log(
  "wrist:",
  await page.evaluate((side) => {
    const k = window.__lab.arms.arms[side].ik;
    return `past its limits by ${k.violation.toFixed(2)} (flex ${k.wristFlex.toFixed(2)}, deviation ${k.wristDeviation.toFixed(2)}, twist ${k.twist.toFixed(2)})${k.reach > 0.001 ? `, OUT OF REACH by ${k.reach.toFixed(3)} m` : ""}`;
  }, side),
);
if (out) {
  const views = [
    ["behind", 0, 0.35, 0.95, false],
    ["behind, close", -0.55, 0.3, 0.55, true],
    ["above", 0.1, 1.25, 0.5, true],
    ["left side", -1.57, 0.05, 0.55, true],
    ["right side", 1.57, 0.1, 0.55, true],
    ["below", 0.2, -0.9, 0.5, true],
  ];
  const shots = [];
  for (const [label, yaw, pitch, dist, onHand] of views) {
    await page.evaluate(
      ([yaw, pitch, dist, side]) => {
        const lab = window.__lab;
        lab.orbit(yaw, pitch, dist);
        if (side) {
          const hand = lab.arms.arms[side].hand;
          hand.updateWorldMatrix(true, false);
          lab.stage.orbit.target
            .set(0, 0, -0.07)
            .applyMatrix4(hand.matrixWorld);
        }
      },
      [yaw, pitch, dist, onHand ? side : null],
    );
    await page.waitForTimeout(400);
    shots.push({
      label: `${id} ${form} ${label}`,
      png: await page.screenshot(),
    });
  }
  await contactSheet(page, shots, out, 3, [760, 520]);
  console.log("pictures ->", out);
}
const errors = await page.evaluate(() => window.__errors.map(String));
await lab.close();
if (errors.length) {
  console.error("page errors:", errors);
  process.exit(1);
}
