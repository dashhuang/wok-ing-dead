// How comfortably the arms hold each weapon form: how far past its limits the wrist is bent
// (radians), at rest and at the worst moment while firing, using the special move and reloading.
//
//   node arsenal/tools/arms.mjs [--only id,id]
//
// Wrist limits (the game's): flex -1.22..1.4, deviation -0.61..0.35, twist -1.66..1.66.
// Aim for a hold of 0.15 or less and a worst moment of about 0.5 or less; a hand out of
// reach ("REACH") is always a fault. Fix a strained hold by turning the grip, not the fingers.
import { openLab, parseArgs } from "./lab.mjs";

const { opt } = parseArgs();
const only = opt.only ? opt.only.split(",") : null;
const lab = await openLab({
  query: "w=shotgun&mode=fp&ui=0",
  width: 640,
  height: 360,
});
const { page } = lab;
const ids = await page.evaluate(() => window.__lab.weapons.map((w) => w.id));
for (const id of ids) {
  if (only && !only.includes(id)) continue;
  for (const b of ["base", "a", "b"]) {
    const r = await page.evaluate(
      async ([id, b]) => {
        const lab = window.__lab,
          c = lab.combat,
          A = lab.arms.arms;
        lab.manual = true;
        lab.state.level = b === "base" ? 1 : 3;
        lab.state.branch = b;
        await lab.select(id, b);
        c.targets.setMode("stand");
        c.clear();
        const worst = {};
        for (const s of ["right", "left"])
          worst[s] = { v: 0, at: "", flex: 0, dev: 0, twist: 0, reach: 0 };
        const note = (tag) => {
          for (const s of ["right", "left"]) {
            if (!A[s].group.visible) continue;
            const k = A[s].ik,
              w = worst[s];
            if (k.violation > w.v)
              Object.assign(w, {
                v: k.violation,
                at: tag,
                flex: k.wristFlex,
                dev: k.wristDeviation,
                twist: k.twist,
              });
            if (k.reach > w.reach) w.reach = k.reach;
          }
        };
        const step = (n, tag) => {
          for (let i = 0; i < n; i++) {
            lab.advance(1 / 60, 1 / 60, false);
            note(typeof tag === "function" ? tag() : tag);
          }
        };
        lab.advance(0.6, 1 / 60, false);
        const hold = {};
        for (const s of ["right", "left"])
          hold[s] = A[s].group.visible ? A[s].ik.violation : -1;
        note("hold");
        c.press("fire");
        step(40, "fire");
        c.release("fire");
        step(60, "after firing");
        c.press("alt");
        step(60, "special");
        c.release("alt");
        step(90, "after special");
        c.reload();
        step(200, () =>
          c.weapon.reload >= 0
            ? "reload " + c.weapon.reload.toFixed(2)
            : "idle",
        );
        return { hold, worst };
      },
      [id, b],
    );
    const hand = (s) => {
      const w = r.worst[s];
      return (
        `${s[0].toUpperCase()} hold ${r.hold[s] < 0 ? "  - " : r.hold[s].toFixed(2)} worst ${w.v.toFixed(2)}` +
        (w.v > 0.02
          ? ` @${w.at} (flex ${w.flex.toFixed(2)} dev ${w.dev.toFixed(2)} twist ${w.twist.toFixed(2)})`
          : "") +
        (w.reach > 0.001 ? ` REACH ${w.reach.toFixed(3)}` : "")
      );
    };
    console.log(
      `${id.padEnd(10)} ${b.padEnd(4)} ${hand("right").padEnd(78)} ${hand("left")}`,
    );
  }
}
const errors = await page.evaluate(() => window.__errors.slice(0, 3));
await lab.close();
if (errors.length) {
  console.error("page errors:", errors);
  process.exit(1);
}
