// Pictures for checking a weapon by eye: contact sheets of the showcase from chosen angles, and
// first-person sequences stepped frame by frame (a muzzle flash lasts a few hundredths of a second).
//
//   node arsenal/tools/shots.mjs show <weapon> <out.png> [--views base:l,a:sR@0.4,b:fp] [--freeze '{"reload":0.4}']
//                                     [--hands 0|1] [--cols 3] [--cell 640x400]
//     a view is <form>:<angle>[R|L][@distance]: form base | a | b; angle l left-front, r right-rear,
//     s left side, S right side, t top, u below, b muzzle end, f behind, c close, fp first person.
//     R / L centres on that hand; distance is in metres. --freeze holds a moment of an animation
//     (reload, cycle, swing, charge: 0..1).
//
//   node arsenal/tools/shots.mjs play <weapon> <out.png> --reload <form> [--at 0.1,0.3,0.5,0.7,0.9]
//   node arsenal/tools/shots.mjs play <weapon> <out.png> --steps '<json>' [--form a] [--level 3] [--targets stand]
//     steps: [["look",yaw,pitch],["aim",i],["wait",ms],["down","fire"|"alt"],["up",...],["reload"],["shot","label"]]
//     --reload fires a little, reloads, and captures at those fractions of the reload.
//   both: [--cols 4] [--cell 640x360]
//
// Prints the page's errors; exits 1 if there were any.
import { openLab, contactSheet, parseArgs } from "./lab.mjs";

const { opt, rest } = parseArgs();
const [what, id, out] = rest;
if (!["show", "play"].includes(what) || !id || !out) {
  console.error(
    "usage: shots.mjs show|play <weapon> <out.png> ... (see the top of this file)",
  );
  process.exit(2);
}
const cell = (opt.cell || (what === "show" ? "640x400" : "640x360"))
  .split("x")
  .map(Number);
const shots = [];

// showcase camera angles: [yaw, pitch]
const ANGLES = {
  l: [-0.85, 0.16],
  r: [2.35, 0.14],
  t: [-0.2, 1.25],
  f: [0.25, 0.1],
  c: [-0.6, 0.28],
  u: [-1.2, -0.5],
  s: [-1.5708, 0.02],
  S: [1.5708, 0.02],
  b: [3.0, 0.3],
};
// seconds a reload takes, for --reload
const RELOAD = {
  shotgun: 2.4,
  smg: 1.6,
  revolver: 2.2,
  lever: 2.8,
  nailgun: 1.4,
  flamer: 2.4,
  firework: 2.6,
  arc: 2.0,
  crossbow: 1.5,
};

if (what === "show") {
  const lab = await openLab({
    query: `w=${id}&ui=0&hands=${opt.hands ?? 1}`,
    width: cell[0],
    height: cell[1],
  });
  const { page } = lab;
  const views = (
    opt.views || "base:l,base:r,base:fp,a:l,a:r,a:fp,b:l,b:r,b:fp"
  ).split(",");
  for (const spec of views) {
    const [form, where = "l"] = spec.split(":");
    const [angle, distance] = where.split("@");
    const fp = angle === "fp";
    const focus = !fp && /^[a-zA-Z][RL]$/.test(angle) ? angle[1] : "";
    await page.evaluate(
      ([form, fp, yawPitch, distance, close]) => {
        const lab = window.__lab;
        lab.state.level = form === "base" ? 1 : 3;
        lab.state.branch = form;
        lab.applyBranch();
        lab.setMode(fp ? "fp" : "show");
        if (!fp) {
          const d = lab.stage.orbit.dist;
          lab.orbit(
            yawPitch[0],
            yawPitch[1],
            distance ? +distance : close ? d * 0.5 : d,
          );
        }
      },
      [form, fp, ANGLES[angle[0]] || ANGLES.l, distance, angle[0] === "c"],
    );
    if (opt.freeze && !fp)
      await page.evaluate(
        (f) => window.__lab.freeze(JSON.parse(f)),
        opt.freeze,
      );
    // (in first person the weapon is drawn up from below when it is picked)
    await page.waitForTimeout(fp ? 900 : 300);
    if (focus) {
      await page.evaluate((side) => {
        const lab = window.__lab;
        const hand = lab.arms.arms[side === "R" ? "right" : "left"].hand;
        hand.updateWorldMatrix(true, false);
        // a little way down the fingers rather than on the wrist (the bone's -Z)
        lab.stage.orbit.target.set(0, 0, -0.07).applyMatrix4(hand.matrixWorld);
      }, focus);
      await page.waitForTimeout(200);
    }
    shots.push({ label: `${id} ${spec}`, png: await page.screenshot() });
  }
  await finish(lab, +(opt.cols || 3));
} else {
  const form = opt.reload || opt.form || "base";
  const level = +(opt.level || (form === "base" ? 1 : 3));
  let steps;
  if (opt.reload) {
    const t = (RELOAD[id] || 2) * 1000;
    const at = (opt.at || "0.08,0.2,0.32,0.45,0.58,0.72,0.86,0.97")
      .split(",")
      .map(Number);
    steps = [
      ["look", 0, 0],
      ["wait", 200],
      ["down", "fire"],
      ["wait", 300],
      ["up", "fire"],
      ["wait", 700],
      ["reload"],
    ];
    let done = 0;
    for (const f of at) {
      steps.push(
        ["wait", Math.round(f * t - done)],
        ["shot", `${id} ${form} reload ${f}`],
      );
      done = Math.round(f * t);
    }
  } else steps = JSON.parse(opt.steps || '[["wait",500],["shot","hold"]]');
  const lab = await openLab({
    query: `w=${id}&mode=fp&ui=0`,
    width: cell[0],
    height: cell[1],
  });
  const { page } = lab;
  await page.evaluate(
    async ([id, form, level, targets]) => {
      const lab = window.__lab;
      lab.manual = true; // time moves only when stepped
      lab.state.level = level;
      lab.state.branch = form;
      await lab.select(id, form);
      lab.combat.targets.setMode(targets);
      lab.combat.clear();
      lab.advance(0.35);
    },
    [id, form, level, opt.targets || "stand"],
  );
  let clock = 0;
  for (const [cmd, ...a] of steps) {
    if (cmd === "wait") {
      clock += a[0];
      await page.evaluate((s) => window.__lab.advance(s), a[0] / 1000);
    } else if (cmd === "shot")
      shots.push({
        label: `${a[0] || ""} ${(clock / 1000).toFixed(2)}s`,
        png: await page.screenshot(),
      });
    else
      await page.evaluate(
        ([cmd, a]) => {
          const c = window.__lab.combat;
          if (cmd === "look") c.aim(a[0], a[1]);
          else if (cmd === "aim") c.aimAt(a[0]);
          else if (cmd === "down") c.press(a[0]);
          else if (cmd === "up") c.release(a[0]);
          else if (cmd === "reload") c.reload();
          else throw new Error("unknown step " + cmd);
        },
        [cmd, a],
      );
  }
  await finish(lab, +(opt.cols || 4));
}

async function finish(lab, cols) {
  const errors = await lab.page.evaluate(() => window.__errors.map(String));
  if (shots.length)
    await contactSheet(
      lab.page,
      shots,
      out,
      Math.min(cols, shots.length),
      cell,
    );
  await lab.close();
  console.log(
    `${shots.length} frame(s) -> ${out}; errors: ${JSON.stringify(errors.concat(lab.errors))}`,
  );
  process.exit(errors.length || lab.errors.length ? 1 : 0);
}
