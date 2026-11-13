// How each weapon form does, measured with the real weapon code. Two tests per form. Every
// weapon a run can carry sits them: the arsenal's twelve, and the game's own carbine and
// sidearm on a stand-in (they have no forks: level 1, 3 and 5 of the one form).
//
//   the street   the range's sixteen dead (thirteen walkers, three heavies) rising at street
//                distance and coming on; a bot aims at the nearest, opens fire once the form
//                can reach it, walks in when nothing is in reach and uses the form's special
//                move on a rhythm. Kills, damage dealt, damage taken and rounds spent a minute.
//   the elite    the run's first elite standing in front (a heavy with `SCENE.elite` times
//                the health and an elite's resistances), replaced the moment it falls: the
//                damage it takes a second, reloads included. What a long fight is worth.
//
// The bot is a steady hand, not a machine: it never misses a body, and with the three weapons
// that are aimed at the head it finds the head `SCENE.head` of the time.
// The numbers in the design doc ("尸潮下的数值") and the calibration of the balance simulator
// (scripts/balance/lab.mjs, which replays SCENE on its model) come from here.
//
//   node arsenal/tools/balance.mjs                     all forms, print only
//   node arsenal/tools/balance.mjs --only shotgun,crossbow --seconds 45
//   node arsenal/tools/balance.mjs --write             also update arsenal/scripts/balance.json
//                                                      (then: npm run balance, scripts/design-doc.mjs)
// Where the dead rise is random: a form's figures for the street move by a tenth or so from
// one measurement to the next (the elite's hardly at all).
import fs from "node:fs";
import { openLab, parseArgs, FORMS } from "./lab.mjs";
import { RUN } from "../../src/chinatown/runtune.js";
import { STOCK_GUNS } from "../../src/chinatown/stockguns.js";

// The game's own two guns have one form: it grows with the level table alone.
const STOCK_FORMS = [
  ["base", 1],
  ["base", 3],
  ["base", 5],
];

// The test, in numbers. Written into balance.json so the simulator replays the same one.
//   from, span   the dead rise this far away (metres): from .. from + span
//   runners      share of walkers that run (the run's is 0.2 at the start, 0.75 at the end)
//   walk         how fast the bot walks in when nothing is in reach (the player's walk)
//   head         share of the time a weapon aimed at the head is on it
//   solo         seconds the test against the elite lasts
//   elite        its health in heavies (the run's first elite: RUN.elite.hp)
//   hand         trigger pulls a second at most, for a weapon that fires one round a pull
//                (the sidearm: the game makes the player click for every round)
export const SCENE = {
  from: 16,
  span: 14,
  runners: 0.5,
  walk: 3.8,
  head: 0.6,
  solo: 30,
  elite: RUN.elite.hp,
  hand: 5,
};

// The standard line every form is scored against: what a level-one gun does in this test,
// the street's dead felled a minute and the damage a second on the elite. They are the
// medians of the arsenal's nine guns that take ammunition, as they stood when the line was
// drawn (2026-11-13), and they stay put: the weapons are tuned to the line, not the line to
// them.
export const LINE = { crowd: 69, single: 138 };

// A player does not open fire before the weapon can reach: effective range (metres).
const REACH = {
  "shotgun:base": 14,
  "shotgun:a": 9.5,
  "shotgun:b": 60,
  smg: 25,
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
  rifle: 55,
  pistol: 40,
  "coinsword:base": 3.0,
  "coinsword:a": 14,
  "coinsword:b": 3.0,
  guandao: 3.8,
};
const ALT_REACH = {
  "coinsword:b": 18,
  "guandao:b": 14,
  "guandao:a": 5,
  "flamer:b": 12,
  "arc:b": 19,
  "revolver:a": 60,
};
const PRECISE = ["revolver", "lever", "crossbow"];

if (import.meta.url === `file://${process.argv[1]}`) await main();

async function main() {
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
  ids.push(...Object.keys(STOCK_GUNS));
  const rows = [];
  for (const id of ids) {
    if (only && !only.includes(id)) continue;
    for (const [b, lv] of STOCK_GUNS[id] ? STOCK_FORMS : FORMS) {
      const key = id + ":" + b;
      const reach = REACH[key] ?? REACH[id] ?? 40;
      const r = await page.evaluate(measure, {
        id,
        b,
        lv,
        seconds,
        reach,
        altReach: ALT_REACH[key] ?? reach,
        precise: PRECISE.includes(id),
        S: SCENE,
      });
      const row = {
        id,
        b,
        lv,
        kills: Math.round((r.kills * 60) / seconds),
        dps: Math.round(r.damage / seconds),
        hurt: Math.round((r.taken * 60) / seconds),
        crowd: +r.crowd.toFixed(2),
        spent: Math.round((r.spent * 60) / seconds),
        solo: Math.round(r.solo / SCENE.solo),
      };
      rows.push(row);
      console.log(
        `${id.padEnd(10)} ${b.padEnd(4)} lv${lv}  kills/min ${String(row.kills).padStart(3)}  dps ${String(row.dps).padStart(4)}  hurt/min ${String(row.hurt).padStart(4)}  crowd ${row.crowd.toFixed(2)}  spent/min ${String(row.spent).padStart(4)}  on one ${String(row.solo).padStart(4)}${r.errors ? "  ERRORS " + r.errors : ""}`,
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
    const keyOf = (r) => `${r.id}:${r.b}:${r.lv}`;
    const merged = new Map(old.rows.map((r) => [keyOf(r), r]));
    for (const r of rows) merged.set(keyOf(r), r);
    // formatted the way the repository's check expects
    const prettier = await import("prettier");
    fs.writeFileSync(
      OUT,
      await prettier.format(
        JSON.stringify({
          seconds,
          date: new Date().toISOString().slice(0, 10),
          scene: SCENE,
          line: LINE,
          rows: [...merged.values()],
        }),
        { parser: "json" },
      ),
    );
    console.log("wrote", OUT.pathname);
  }
}

// Runs in the page: one form through both tests.
async function measure({ id, b, lv, seconds, reach, altReach, precise, S }) {
  const lab = window.__lab,
    c = lab.combat,
    T = c.targets;
  const key = id + ":" + b;
  const dt = 1 / 60;
  let fire = false,
    alt = false,
    clock = 0,
    drag = 0;
  // one round a pull: the bot pulls no faster than a hand does (S.hand a second)
  let pull = 0;
  const set = (name, on) => {
    if (name === "fire" && c.weapon.spec.semi) {
      if (fire) {
        fire = false;
        c.release("fire");
      } else if (on && pull <= 0) {
        fire = true;
        c.press("fire");
        pull = 1 / S.hand;
      }
      return;
    }
    if (name === "fire" && on !== fire) {
      fire = on;
      on ? c.press("fire") : c.release("fire");
    }
    if (name === "alt" && on !== alt) {
      alt = on;
      on ? c.press("alt") : c.release("alt");
    }
  };
  const distOf = (z) => Math.hypot(z.pos.x, z.pos.z);
  const aim = (z) => {
    // on the head for a share of every half second, on the chest for the rest
    const head = precise && (clock * 2) % 1 < S.head;
    c.aimAt(z, head);
    // a hand is never perfectly steady
    const w = precise ? 0.004 : 0.012;
    lab.stage.look.yaw += Math.sin(clock * 7.3) * w;
    lab.stage.look.pitch += Math.cos(clock * 5.1) * w * 0.6;
  };
  // each form's rhythm, only once something is in reach (bd: metres to the nearest)
  const play = (bd) => {
    const inR = bd < reach,
      inA = bd < altReach;
    if (key === "firework:b")
      // the mortar: hold until charged, let go
      set("fire", inR && !(c.weapon.charge >= 0.97));
    else if (key === "revolver:a") {
      // several in sight: mark for a second, fan; reload when nearly empty.
      // One alone is simply shot.
      let seen = 0;
      for (const z of T.list) if (z.alive && distOf(z) < altReach) seen++;
      const p = clock % 2.0;
      set("alt", seen > 1 && inA && p < 1.0);
      set("fire", seen === 1 && inR && !alt);
      if (seen > 1 && c.weapon.rounds <= 2 && p >= 1.1 && c.weapon.reload < 0)
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
          const d = distOf(z);
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
  };
  const rest = () => {
    set("fire", false);
    set("alt", false);
    lab.advance(0.5, dt, false);
  };

  lab.state.level = lv;
  lab.state.branch = b;
  await lab.select(id, b);

  // ---------------- the street
  // The range's horde rises at the far end of the alley; here it rises at street distance
  // (whoever is waiting to rise is moved up), half of the walkers run, and the bot walks in
  // on what it cannot reach, which on a range is the alley coming towards it.
  const speeds = { run: 0, walk: 0 };
  const place = (z) => {
    z.pos.z = -(S.from + Math.random() * S.span);
    if (z.type === "walker") {
      if (!speeds.run) {
        // (read off the dead themselves: the tool has no table of its own)
        const all = T.list.filter((q) => q.type === "walker");
        speeds.run = Math.max(...all.map((q) => q.speed));
        speeds.walk = Math.min(...all.map((q) => q.speed));
      }
      z.runner = Math.random() < S.runners;
      z.speed = z.runner ? speeds.run : speeds.walk;
    }
  };
  T.setMode("horde");
  c.clear();
  for (const z of T.list) place(z);
  const N = Math.round(seconds / dt);
  let near = 0;
  const street = (i) => {
    let best = null,
      bd = 1e9;
    for (const z of T.list) {
      if (z.wait > 0 && z.pos.z < -36.5) place(z);
      if (!z.alive) continue;
      const d = distOf(z);
      if (d < bd) ((bd = d), (best = z));
    }
    if (best) aim(best);
    clock += dt;
    pull -= dt;
    play(bd);
    // nothing in reach: walk in (the dead that are up come that much closer)
    if (best && bd > reach)
      for (const z of T.list) if (z.alive) z.pos.z += S.walk * dt;
    lab.advance(dt, dt, false);
    if (i >= 0 && bd < 5) near++;
  };
  // let the horde get moving before the fight is scored
  for (let i = 0; i < 5 / dt; i++) street(-1);
  c.resetMeter();
  for (let i = 0; i < N; i++) street(i);
  rest();
  const out = {
    kills: c.meter.kills,
    damage: c.meter.total,
    taken: c.meter.taken,
    spent: c.meter.spent,
    crowd: near / N,
  };

  // ---------------- the elite
  T.setMode("stand");
  c.clear();
  const heavy = T.list.find((z) => z.type === "brute" && !z.parked);
  for (const z of T.list)
    if (z !== heavy) {
      z.parked = true;
      z.alive = false;
      z.holder.visible = false;
    }
  const at = Math.max(1.6, Math.min(reach * 0.6, 8));
  const hold = () => {
    heavy.pos.x = 0;
    heavy.pos.z = -at;
    heavy.vel.set(0, 0, 0);
  };
  const health = heavy.maxHp * S.elite;
  const promote = () => {
    heavy.rank = "elite";
    heavy.hp = heavy.maxHp = health;
  };
  let down = false; // the one in front has fallen: the next has to be made an elite
  promote();
  clock = 0;
  hold();
  lab.advance(0.5, dt, false);
  await lab.select(id, b); // a full magazine
  c.resetMeter();
  for (let i = 0; i < S.solo / dt; i++) {
    if (!heavy.alive) {
      // the next one steps up at once
      set("fire", false);
      set("alt", false);
      heavy.dead = 99;
      down = true;
    } else {
      if (down) promote();
      down = false;
      hold();
      aim(heavy);
      play(at);
    }
    clock += dt;
    pull -= dt;
    lab.advance(dt, dt, false);
  }
  rest();
  out.solo = c.meter.total;
  heavy.rank = "";
  T.setMode("horde");
  c.clear();
  out.errors = window.__errors.length;
  return out;
}
