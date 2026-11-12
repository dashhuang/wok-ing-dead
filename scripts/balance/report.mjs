// The balance report: what the numbers of the run add up to, as tables.
//
//   npm run balance          write docs/balance-report.md
//   npm run balance:check    fail when a guard that is switched on does not hold, or when the
//                            report in the repository is not what the current numbers give
//                            (part of `npm run check`, so of the pre-push hook and of CI)
//   node scripts/balance/report.mjs --print     to the terminal, nothing written
//
// The report is generated: change the numbers (src/chinatown/runtune.js, zombietune.js,
// loadout.js, the arsenal's weapons) or the assumptions (data.mjs, run.mjs), then run it
// again and read the difference in the pull request.
import fs from "node:fs";
import {
  RUN,
  AMMO,
  ARMS,
  PLAYER,
  POOL,
  LEVELS,
  WEAPON_IDS,
  MEASURED,
  model,
  power,
  betterFork,
  zombieStats,
  ammoPer,
} from "./data.mjs";
import { calibrate, factors } from "./lab.mjs";
import { PROFILES, simulateMany, simulateRun, BUCKET } from "./run.mjs";
import { guards } from "./guards.mjs";
import {
  stageAt,
  crowdOf,
  spawnPace,
  eliteStats,
} from "../../src/chinatown/runflow.js";
import ZH from "../../src/i18n/locales/zh-CN.js";

const OUT = new URL("../../docs/balance-report.md", import.meta.url);
const RUNS = 100; // simulated runs per kind of player
const DIFF = "standard";
const diff = RUN.difficulty[DIFF];

const t = (key) => ZH[key] || key;
const pct = (v, d = 0) => (v * 100).toFixed(d) + "%";
const num = (v, d = 0) => (v == null ? "—" : (+v).toFixed(d));
const mmss = (s) =>
  s == null
    ? "—"
    : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const table = (head, rows) =>
  [
    "| " + head.join(" | ") + " |",
    "| " + head.map(() => "---").join(" | ") + " |",
    ...rows.map((r) => "| " + r.join(" | ") + " |"),
  ].join("\n");

// ---------- what the tables are made of
const cal = factors();
const calRows = calibrate();
const sims = Object.fromEntries(
  Object.keys(PROFILES).map((k) => [k, simulateMany({ profile: k }, RUNS)]),
);

/** The timeline minute by minute, from the rules alone. */
function timeline() {
  const rows = [];
  const brute = zombieStats("brute", true).hp;
  const walker = zombieStats("walker", false).hp;
  for (let m = 0; m < RUN.bossAt / 60; m++) {
    const st = stageAt(m * 60 + 30);
    const desk = spawnPace(st, diff, crowdOf(POOL.desktop));
    const phone = spawnPace(st, diff, crowdOf(POOL.phone));
    const rate = 1 / desk.every;
    const plain = 1 - st.brute - st.bloater;
    rows.push({
      minute: m + 1,
      id: st.id,
      rate,
      capDesk: desk.cap,
      capPhone: phone.cap,
      runner: st.runner,
      brute: st.brute,
      bloater: st.bloater,
      // when three heavies are up, a roll for a heavy raises a bloater instead
      bloaterMax: st.brute + st.bloater,
      hpIn:
        rate *
        (plain * walker +
          st.bloater * walker * RUN.bloater.hp +
          st.brute * brute),
    });
  }
  return rows;
}

/** Peak over mean of the spawn rate inside each course: 1 is a flat line. */
function waves() {
  const out = [];
  RUN.stages.forEach((a, i) => {
    const end = i + 1 < RUN.stages.length ? RUN.stages[i + 1].at : a.at + 60;
    if (a.at >= RUN.bossAt) return;
    const rates = [];
    for (let s = a.at; s < end; s += 5)
      rates.push(1 / (stageAt(s).every * diff.every));
    const mean = rates.reduce((x, y) => x + y, 0) / rates.length;
    out.push({
      id: a.id,
      peak: Math.max(...rates) / mean,
      low: Math.min(...rates) / mean,
    });
  });
  return out;
}

/** What a kind of player gets out of a weapon form per second, reloads included. */
function sustained(id, branch, level, prof) {
  const m = model(id);
  const p = power(id, branch, level) * cal[id];
  const head = Math.min(0.92, prof.head * (m.precise ? prof.precise : 1));
  const perRound =
    m.kind === "stream"
      ? m.damage * Math.min(1, prof.hit + 0.15)
      : m.pellets
        ? m.damage * m.pellets * 0.8
        : m.damage *
          prof.hit *
          (1 + (m.kind === "melee" ? 0 : head * (m.headMul - 1)));
  const rate = m.rate * prof.tempo;
  let duty = 1;
  if (m.kind === "stream")
    duty = m.mag / m.drain / (m.mag / m.drain + m.reload);
  else if (m.regen) duty = Math.min(1, 1 / m.regen / rate);
  else if (m.reload) duty = m.mag / rate / (m.mag / rate + m.reload);
  return { dps: perRound * p * rate * duty, perRound: perRound * p, rate };
}

function weaponRows(prof) {
  const walker = zombieStats("walker", false).hp;
  const brute = zombieStats("brute", true).hp;
  return WEAPON_IDS.map((id) => {
    const m = model(id);
    const fork = betterFork(id);
    const s1 = sustained(id, "base", 1, prof);
    const s5 = sustained(id, fork, 5, prof);
    const per = ARMS[id].ammo ? ammoPer(id, "base", 1) : 0;
    const pool = ARMS[id].ammo ? AMMO[ARMS[id].ammo].cap : 0;
    // rounds a full pool holds, and the walkers that is worth
    const roundsPerUnit = m.kind === "stream" ? m.rate / m.drain : 1;
    const damagePerPool = per
      ? (pool / per) * roundsPerUnit * s1.perRound
      : Infinity;
    return {
      id,
      ammo: ARMS[id].ammo,
      dps1: s1.dps,
      dps5: s5.dps,
      grow: s5.dps / s1.dps,
      fork,
      walker: Math.max(1 / s1.rate, walker / s1.dps),
      brute: brute / s1.dps,
      pool: damagePerPool / walker,
      measured: m.measured,
    };
  });
}

function enemyRows() {
  const w = zombieStats("walker", false);
  const r = zombieStats("walker", true);
  const b = zombieStats("brute", true);
  const dps = (z, dmg = z.damage) =>
    dmg / (z.swing + (z.cool[0] + z.cool[1]) / 2);
  const E = RUN.elite;
  const elites = Math.floor((RUN.bossAt - 20 - E.first) / E.every) + 1;
  const first = eliteStats(0);
  const last = eliteStats(elites - 1);
  const B = RUN.boss;
  return [
    ["行尸（走）", w.hp, w.damage, w.speed, dps(w)],
    ["行尸（跑）", r.hp, r.damage, r.speed, dps(r)],
    ["胀尸", r.hp * RUN.bloater.hp, `自爆 ${RUN.bloater.hurt}`, r.speed, 0],
    ["重型", b.hp, b.damage, b.speed, dps(b)],
    [
      "第 1 只精英",
      b.hp * first.hpMul,
      b.damage * first.dmgMul,
      b.speed * first.speedMul,
      dps(b, b.damage * first.dmgMul),
    ],
    [
      `第 ${elites} 只精英`,
      b.hp * last.hpMul,
      b.damage * last.dmgMul,
      b.speed * last.speedMul,
      dps(b, b.damage * last.dmgMul),
    ],
    [
      "关底",
      diff.bossHp,
      b.damage * B.damage * diff.bossHit,
      b.speed * B.speed * diff.bossSpeed,
      dps(b, b.damage * B.damage * diff.bossHit),
    ],
  ];
}

// ---------- the report
export function build() {
  const TL = timeline();
  const W = waves();
  const prof = PROFILES.focus;
  const WR = weaponRows(prof);
  const facts = { TL, W, WR, sims, calRows, cal };
  const G = guards(facts);
  const stage = (id) => t("run.stage." + id);
  const out = [];
  const say = (...lines) => out.push(...lines, "");

  say(
    "# 数值报告：套餐 · 微辣 · 金龙街",
    "",
    "> 这份文件是生成的，不要手改：改数值后运行 `npm run balance`。怎么读、怎么调见 [balance.md](balance.md)。",
    ">",
    `> 整局模拟每种玩家 ${RUNS} 局，随机种子固定，同样的数值永远得到同样的报告。`,
    "> 第 2–4 节直接由规则算出；第 5–6 节是模拟，**玩家水平是假设出来的**，绝对值（比如通关率）还没用真人或真游戏校准过，",
    "> 目前只适合看方向和前后对比。",
  );

  say(
    "## 1. 护栏",
    "",
    "调数值的目标写成了规则。「已启用」的不满足时 `npm run check` 会失败；「待启用」的是现在还没达到、计划中要解决的，只报告不拦截。",
    "",
    table(
      ["状态", "规则", "现在的值", "目标"],
      G.map((g) => [
        g.ok ? "达标" : g.enforce ? "**未达标**" : "未达标（待启用）",
        g.text,
        g.value,
        g.want,
      ]),
    ),
  );

  say(
    "## 2. 时间线（每分钟）",
    "",
    "「每秒涌入血量」是这一分钟平均每秒刷出的敌人血量之和，玩家的持续输出要高过它才清得动。",
    "",
    table(
      [
        "分钟",
        "菜名",
        "每秒刷出",
        "同屏上限（电脑 / 手机）",
        "跑尸",
        "重型",
        "胀尸",
        "每秒涌入血量",
      ],
      TL.map((r) => [
        r.minute,
        stage(r.id),
        num(r.rate, 2),
        `${r.capDesk} / ${r.capPhone}`,
        pct(r.runner),
        pct(r.brute),
        r.bloater === r.bloaterMax
          ? pct(r.bloater)
          : `${pct(r.bloater)}（重型满 ${RUN.bruteCap} 只时 ${pct(r.bloaterMax)}）`,
        num(r.hpIn),
      ]),
    ),
    "",
    "每道菜内部刷怪速度的起伏（峰值和谷值各是平均值的多少倍，1.00 就是一条平线）：",
    "",
    table(
      ["菜名", "峰值", "谷值"],
      W.map((w) => [stage(w.id), num(w.peak, 2), num(w.low, 2)]),
    ),
  );

  say(
    "## 3. 敌人",
    "",
    "每秒伤害按「挥击一次的时间 + 两次之间的间隔」算，是一只贴身敌人不被打断时的上限。",
    "",
    table(
      ["敌人", "血量", "一击伤害", "速度（米/秒）", "贴身每秒伤害"],
      enemyRows().map((r) => [
        r[0],
        num(r[1]),
        typeof r[2] === "number" ? num(r[2]) : r[2],
        num(r[3], 2),
        r[4] ? num(r[4], 1) : "—",
      ]),
    ),
    "",
    `玩家：生命 ${PLAYER.health}，${
      RUN.heal.regen > 0
        ? `${PLAYER.regenDelay} 秒不受伤后每秒回 ${num(PLAYER.regenRate * RUN.heal.regen)}`
        : `不自动回血（一盒外卖回 ${RUN.heal.food}：行尸 ${pct(RUN.heal.drop)}、重型 ${pct(RUN.heal.bruteDrop)} 掉一盒，血量低于 ${pct(RUN.heal.lowAt)} 时概率 ×${RUN.heal.hurtBoost}，精英必掉 ${RUN.heal.elite} 盒）`
    }；走 ${PLAYER.walk} 米/秒，跑 ${PLAYER.sprint} 米/秒。`,
    "行尸和重型的血量、伤害全程不变；只有精英一只比一只强。",
  );

  say(
    "## 4. 武器",
    "",
    `按「${prof.name}」的命中（${pct(prof.hit)}，其中爆头 ${pct(prof.head)}）计算，含换弹时间。`,
    "5 级取两条岔路里实测更强的一条；「成长」是 5 级输出 ÷ 1 级输出，不含调料。",
    "「一池弹药」是这种弹药装满时，1 级的这把枪能打倒多少只行尸。",
    "",
    table(
      [
        "武器",
        "弹药",
        "1 级持续输出",
        "5 级持续输出",
        "成长",
        "打倒行尸（秒）",
        "打倒重型（秒）",
        "一池弹药",
      ],
      WR.map((r) => [
        t("weapon." + r.id) + (r.measured ? "" : " \\*"),
        r.ammo ? t("run.ammo." + r.ammo) : "不用",
        num(r.dps1),
        `${num(r.dps5)}（${r.fork === "a" ? "甲" : "乙"}）`,
        "×" + num(r.grow, 1),
        num(r.walker, 1),
        num(r.brute, 1),
        r.pool === Infinity ? "—" : num(r.pool) + " 只",
      ]),
    ),
    "",
    "\\* 游戏自带的两把枪没有岔路，也不在试验场的实测表里：只按等级表成长，没有校准系数。",
    "",
    "调料能再叠加的倍率：" +
      RUN.spices
        .filter((s) => typeof s.per === "number" && s.per < 1)
        .map((s) => `${t("run.spice." + s.id)} +${pct(s.per * RUN.spiceMax)}`)
        .join("，") +
      "（三层全满）。",
  );

  const keys = Object.keys(PROFILES);
  say(
    "## 5. 整局模拟",
    "",
    table(
      [
        "玩家",
        "通关",
        "阵亡",
        "阵亡时间（中位）",
        "见到关底",
        "关底战（秒）",
        "结束时等级",
        "选择次数",
        "击杀",
        "主力缺弹",
        "每分钟受伤",
        "吃掉的外卖",
        "武器数",
        "最高武器等级",
      ],
      keys.map((k) => {
        const r = sims[k];
        return [
          PROFILES[k].name,
          pct(r.clear),
          pct(r.dead),
          mmss(r.deathAt),
          pct(r.bossReached),
          num(r.bossSeconds),
          r.level,
          num(r.picks, 1),
          num(r.kills),
          pct(r.dry),
          num(r.hurt),
          num(r.eaten),
          num(r.weapons, 1),
          num(r.top, 1),
        ];
      }),
    ),
    "",
    "「选择次数」是一局里停下来选牌的总次数：点主菜、每次升级、每次岔路。「主力缺弹」是等级最高的那把枪打不响的时间占比。",
    "",
    "### 升级的时间点",
    "",
    "每次升级发生在第几秒（各局的中位数）。",
    "",
    table(
      [
        "玩家",
        ...Array.from({ length: 16 }, (_, i) => "第 " + (i + 1) + " 次"),
      ],
      ["focus", "expertFocus"].map((k) => [
        PROFILES[k].name,
        ...Array.from({ length: 16 }, (_, i) =>
          sims[k].levelAt[i] == null ? "—" : mmss(sims[k].levelAt[i]),
        ),
      ]),
    ),
    "",
    "### 压力曲线",
    "",
    `每 ${BUCKET} 秒一格：场上同时活着的敌人数（平均），括号里是贴到 6 米以内的。`,
    "",
    table(
      [
        "时间",
        ...["focus", "expertFocus", "spread"].map((k) => PROFILES[k].name),
      ],
      Array.from({ length: Math.ceil(RUN.bossAt / BUCKET) + 2 }, (_, i) => [
        mmss(i * BUCKET),
        ...["focus", "expertFocus", "spread"].map((k) =>
          sims[k].curve.alive[i] == null
            ? "—"
            : `${num(sims[k].curve.alive[i], 1)}（${num(sims[k].curve.near[i], 1)}）`,
        ),
      ]),
    ),
    "",
    "### 阵亡发生在什么时候",
    "",
    "每一格是「在这半分钟里阵亡的局」占全部局数的比例。",
    "",
    table(
      ["时间", ...keys.map((k) => PROFILES[k].name)],
      Array.from({ length: Math.ceil(RUN.bossAt / BUCKET) + 2 }, (_, i) => [
        mmss(i * BUCKET),
        ...keys.map((k) => (sims[k].deaths[i] ? pct(sims[k].deaths[i]) : "·")),
      ]),
    ),
  );

  say(
    "## 6. 模型和实测对得上吗",
    "",
    `试验场用真实的武器代码实测过每把武器对尸群一分钟的表现（\`arsenal/scripts/balance.json\`，${MEASURED.date}）。`,
    "模拟器在同样的场景里跑一遍，两者之比就是校准系数：模型没描述到的机制（持续燃烧、跳电、定身……）都折在这一个数里。",
    "系数离 1 越远，说明模型对这把武器漏掉的东西越多。",
    "",
    table(
      [
        "武器",
        "模型输出",
        "实测输出",
        "校准系数",
        "模型击杀/分",
        "校准后击杀/分",
        "实测击杀/分",
      ],
      calRows.map((r) => [
        t("weapon." + r.id),
        num(r.model.dps),
        r.measured.dps,
        num(r.factor, 2),
        num(r.model.kills),
        num(r.after.kills),
        r.measured.kills,
      ]),
    ),
    "",
    "## 7. 假设清单",
    "",
    "模拟器里不是从游戏数据读出来、而是人为设定的东西。真人试玩和报告对不上时，先来这里找。",
    "",
    table(
      [
        "玩家",
        "命中",
        "爆头",
        "躲开挥击",
        "拉开距离",
        "保持射速",
        "残血撤退",
        "捡到弹药包",
        "肯去补给箱",
        "切警报",
        "开武器箱",
        "配法",
      ],
      keys.map((k) => {
        const p = PROFILES[k];
        return [
          p.name,
          pct(p.hit),
          pct(p.head),
          pct(p.dodge),
          pct(p.kite),
          pct(p.tempo),
          "低于 " + pct(p.fleeAt),
          pct(p.collect),
          pct(p.crates),
          p.sirens.length + " 次",
          p.cases.length + " 个",
          { focus: "专精", spread: "全用", random: "随手" }[p.build],
        ];
      }),
    ),
    "",
    "- 没有地图：敌人只有「离玩家多远」，不会被墙挡住，玩家也不会被堵在墙角。最多 5 只能同时贴身。",
    "- 瞄准是一个命中率，不是手感；爆头是命中里的一个比例。",
    "- 岔路和 5 级的强度取自试验场的实测倍率，不逐条模拟每个岔路的机制；元素之间的反应（爆燃、引雷等）没有模拟。",
    "- 调料里的四种附魔按简化规则算：点燃折成一次性伤害，感电跳给最近两只，蚀骨只叠加伤害，贴符只算定身。",
    "- 捡弹药包、去补给箱、切警报、开武器箱都按上表的概率和时间点发生，不模拟走路。",
    `- 玩家的生命、回血、移动速度抄自 \`src/game.js\`（微辣没有额外修正）；开局武器只从首次游玩就有的 ${RUN.unlocks.start.length} 把里出。`,
    `- 电脑的尸群规模（${POOL.desktop} 只行尸的池子）；手机的池子是 ${POOL.phone} 只，同屏上限见第 2 节。`,
  );
  return { text: out.join("\n"), guards: G };
}

// one run twice from the same seed must be the same run
function repeatable() {
  const a = JSON.stringify(simulateRun({ profile: "focus", seed: 7 }));
  const b = JSON.stringify(simulateRun({ profile: "focus", seed: 7 }));
  return a === b;
}

const args = process.argv.slice(2);
const prettier = await import("prettier");
const { text, guards: G } = build();
const md = await prettier.format(text, { parser: "markdown" });
if (args.includes("--print")) console.log(md);
else if (args.includes("--check")) {
  const problems = G.filter((g) => g.enforce && !g.ok).map(
    (g) => `guard: ${g.text} — ${g.value} (wanted ${g.want})`,
  );
  if (!repeatable())
    problems.push("a run from the same seed came out differently");
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (now !== md)
    problems.push(
      "docs/balance-report.md is not what the current numbers give: run `npm run balance` and commit the result",
    );
  if (problems.length) {
    console.error("balance: " + problems.length + " problem(s)");
    for (const p of problems) console.error("  - " + p);
    process.exit(1);
  }
  const todo = G.filter((g) => !g.enforce && !g.ok).length;
  console.log(
    `balance: ${G.filter((g) => g.enforce).length} guards hold, ${todo} not switched on yet; report is up to date`,
  );
} else {
  fs.writeFileSync(OUT, md);
  console.log("wrote docs/balance-report.md");
  for (const g of G)
    console.log(
      `  ${g.ok ? "ok  " : g.enforce ? "FAIL" : "todo"} ${g.text}: ${g.value} (${g.want})`,
    );
}
void LEVELS;
