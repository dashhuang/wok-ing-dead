// How each weapon form does against the horde: a bot stands still, aims at the nearest zombie,
// opens fire once the weapon can reach it and uses the form's special move on a rhythm.
// The numbers in the design doc ("尸潮下的数值") come from here.
//
//   node arsenal/tools/balance.mjs                     all forms, 60 s each, print only
//   node arsenal/tools/balance.mjs --seconds 45 --only shotgun,crossbow
//   node arsenal/tools/balance.mjs --write             also update arsenal/scripts/balance.json
//                                                      (then regenerate the doc: scripts/design-doc.mjs)
// The horde is random: a form's figures move by a tenth or so from run to run.
import fs from "node:fs";
import { openLab, parseArgs, FORMS } from "./lab.mjs";

const { opt } = parseArgs();
const seconds = +(opt.seconds || 60);
const only = opt.only ? opt.only.split(",") : null;
const OUT = new URL("../scripts/balance.json", import.meta.url);

const lab = await openLab({
  query: "w=shotgun&mode=fp&ui=0",
  width: 640,
  height: 360,
});
const { page } = lab;
const ids = await page.evaluate(() => {
  window.__lab.manual = true;
  return window.__lab.weapons.map((w) => w.id);
});
const rows = [];
for (const id of ids) {
  if (only && !only.includes(id)) continue;
  for (const [b, lv] of FORMS) {
    const r = await page.evaluate(
      async ([id, b, lv, seconds]) => {
        const lab = window.__lab,
          c = lab.combat,
          T = c.targets;
        lab.state.level = lv;
        lab.state.branch = b;
        await lab.select(id, b);
        T.setMode("horde");
        c.clear();
        const dt = 1 / 60,
          N = Math.round(seconds / dt);
        const precise = ["revolver", "lever", "crossbow"].includes(id);
        const key = id + ":" + b;
        // a player does not open fire before the weapon can reach: effective range (metres)
        const REACH = {
          "shotgun:base": 14,
          "shotgun:a": 9.5,
          "shotgun:b": 60,
          smg: 45,
          revolver: 80,
          lever: 200,
          nailgun: 60,
          "flamer:base": 8.5,
          "flamer:b": 8.5,
          "flamer:a": 13.5,
          firework: 45,
          arc: 19,
          crossbow: 60,
          talisman: 40,
          "coinsword:base": 3.0,
          "coinsword:a": 14,
          "coinsword:b": 3.0,
          guandao: 3.8,
        };
        const reach = REACH[key] ?? REACH[id] ?? 40;
        const altReach =
          {
            "coinsword:b": 18,
            "guandao:b": 14,
            "guandao:a": 5,
            "flamer:b": 12,
            "arc:b": 19,
            "revolver:a": 60,
          }[key] ?? reach;
        // let the horde get moving before the fight is scored
        lab.advance(5, dt, false);
        c.resetMeter();
        let t = 0,
          near = 0,
          fire = false,
          alt = false,
          clock = 0,
          drag = 0;
        const set = (name, on) => {
          if (name === "fire" && on !== fire) {
            fire = on;
            on ? c.press("fire") : c.release("fire");
          }
          if (name === "alt" && on !== alt) {
            alt = on;
            on ? c.press("alt") : c.release("alt");
          }
        };
        for (let i = 0; i < N; i++) {
          let best = null,
            bd = 1e9;
          for (const z of T.list)
            if (z.alive) {
              const d = Math.hypot(z.pos.x, z.pos.z);
              if (d < bd) ((bd = d), (best = z));
            }
          if (best) {
            c.aimAt(best, precise);
            // a hand is never perfectly steady
            const w = precise ? 0.004 : 0.012;
            lab.stage.look.yaw += Math.sin(t * 7.3) * w;
            lab.stage.look.pitch += Math.cos(t * 5.1) * w * 0.6;
          }
          clock += dt;
          const inR = bd < reach,
            inA = bd < altReach;
          // each form's rhythm, only once something is in reach
          if (key === "firework:b")
            // the mortar: hold until charged, let go
            set("fire", inR && !(c.weapon.charge >= 0.97));
          else if (key === "revolver:a") {
            // mark for a second, fan; reload when nearly empty
            const p = clock % 2.0;
            set("alt", inA && p < 1.0);
            set("fire", false);
            if (c.weapon.rounds <= 2 && p >= 1.1 && c.weapon.reload < 0)
              c.reload();
          } else if (key === "arc:b") {
            const p = clock % 4.0;
            set("alt", inA && p < 1.15);
            set("fire", inR && p >= 1.25);
          } else if (key === "flamer:b") {
            set("alt", inA && clock % 5.0 < 0.05);
            set("fire", inR);
          } else if (key === "coinsword:b") {
            const p = clock % 2.2;
            set("alt", inA && p < 0.95);
            set("fire", inR && p >= 1.05);
          } else if (key === "guandao:a") {
            // drag the blade for the rising cut only when it pays: a brute in front, or a knot of them
            let close = 0,
              brute = false;
            for (const z of T.list)
              if (z.alive) {
                const d = Math.hypot(z.pos.x, z.pos.z);
                if (d < 6) close++;
                if (d < 7 && z.type === "brute") brute = true;
              }
            if (!alt && (brute || close >= 3) && c.weapon.swing < 0) {
              set("fire", false);
              set("alt", true);
              drag = 0;
            }
            if (alt) {
              drag += dt;
              if ((drag > 0.8 && bd < 4.2) || drag > 2) set("alt", false);
            } else set("fire", inR);
          } else if (key === "guandao:b") {
            set("alt", inA && clock % 2.2 < 0.05);
            set("fire", inR);
          } else set("fire", inR);
          lab.advance(dt, dt, false);
          t += dt;
          if (bd < 5) near++;
        }
        set("fire", false);
        set("alt", false);
        lab.advance(0.2, dt, false);
        return {
          kills: c.meter.kills,
          damage: c.meter.total,
          taken: c.meter.taken,
          crowd: near / N,
          errors: window.__errors.length,
        };
      },
      [id, b, lv, seconds],
    );
    const row = {
      id,
      b,
      lv,
      kills: Math.round((r.kills * 60) / seconds),
      dps: Math.round(r.damage / seconds),
      hurt: Math.round((r.taken * 60) / seconds),
      crowd: +r.crowd.toFixed(2),
    };
    rows.push(row);
    console.log(
      `${id.padEnd(10)} ${b.padEnd(4)} lv${lv}  kills/min ${String(row.kills).padStart(3)}  dps ${String(row.dps).padStart(4)}  hurt/min ${String(row.hurt).padStart(4)}  crowd ${row.crowd}${r.errors ? "  ERRORS " + r.errors : ""}`,
    );
  }
}
const errors = await page.evaluate(() => window.__errors.slice(0, 3));
await lab.close();
if (errors.length) {
  console.error("page errors:", errors);
  process.exit(1);
}
if ("write" in opt) {
  // replace the rows that were measured, keep the rest
  const old = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const key = (r) => `${r.id}:${r.b}:${r.lv}`;
  const merged = new Map(old.rows.map((r) => [key(r), r]));
  for (const r of rows) merged.set(key(r), r);
  // formatted the way the repository's check expects
  const prettier = await import("prettier");
  fs.writeFileSync(
    OUT,
    await prettier.format(
      JSON.stringify({
        seconds,
        date: new Date().toISOString().slice(0, 10),
        rows: [...merged.values()],
      }),
      { parser: "json" },
    ),
  );
  console.log("wrote", OUT.pathname);
}
