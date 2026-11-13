// What the numbers are tuned towards, written as rules that can be checked.
//
// enforce: true  — holds today and must keep holding: `npm run check` fails without it.
// enforce: false — a goal of the tuning plan that is not reached yet: reported, not enforced.
//                  Switch it on in the change that reaches it.
// Each guard: { text, value, want, ok, enforce } (texts are in the report's language).
import { RUN } from "./data.mjs";
import { PROFILES } from "./run.mjs";
import {
  stageAt,
  courseAt,
  clockStep,
  stoveCount,
} from "../../src/chinatown/runflow.js";
import ZH from "../../src/i18n/locales/zh-CN.js";

// What a weapon form may score against the standard line (data.mjs, LINE; 2 is a level-one
// gun). Each is the target with a tenth of slack either side, which is what the lab's test
// moves by from one measurement to the next.
//   gun1    the guns that take ammunition, as picked up
//   fork3   either form at level three (one and a half times the line)
//   fork5   either form at level five (twice the line and a little)
//   forks   how far apart a weapon's two forms may be at level five, as a share
//   pool    of the street's dead, what a full pool of ammunition fells at level one
export const WEAPON_BANDS = {
  gun1: [1.75, 2.45],
  fork3: [2.6, 3.7],
  fork5: [3.5, 4.9],
  forks: 0.25,
  pool: [45, 70],
};

const pct = (v) => (v * 100).toFixed(0) + "%";
const mmss = (s) =>
  `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

/** facts: what report.mjs worked out ({ TL, W, WR, sims, calRows }). */
export function guards({ TL, W, WR, sims, calRows }) {
  const out = [];
  const add = (enforce, text, ok, value, want) =>
    out.push({ enforce, text, ok: !!ok, value, want });
  const name = (k) => PROFILES[k].name;

  // ---------- holds today
  {
    const worst = calRows
      .slice()
      .sort(
        (a, b) => Math.abs(Math.log(b.factor)) - Math.abs(Math.log(a.factor)),
      )[0];
    add(
      true,
      "模型还描述得了每把武器（校准系数在 0.35–2.5 之间）",
      calRows.every((r) => r.factor >= 0.35 && r.factor <= 2.5),
      `最远的是${ZH["weapon." + worst.id]} ${worst.factor.toFixed(2)}`,
      "0.35–2.5",
    );
  }
  {
    // The courses are read at the meal's clock now. In order on it, the last one where the
    // house special's begins; and the clock, however long it is left to run, stays out of
    // a course whose stove is not lit and is in the last one once every dish is packed.
    const st = RUN.stages;
    const last = st.length - 1;
    const rising = st.every((s, i) => i === 0 || s.at > st[i - 1].at);
    let waits = true;
    for (let lit = 0; lit < stoveCount(); lit++)
      for (const cooking of [false, true])
        if (courseAt(clockStep(0, 1e6, { lit, served: lit, cooking })) !== lit)
          waits = false;
    const done = { lit: stoveCount(), served: stoveCount() };
    add(
      true,
      "各道菜按套餐的钟先后排列；钟不走进还没起灶的那道菜，最后一道在关底登场时（最后一道菜打包后）开始",
      rising &&
        st[last].at === RUN.bossAt &&
        waits &&
        courseAt(clockStep(0, 0.1, done)) === last,
      st.map((s) => s.at).join(" → ") + (waits ? "" : "（钟没有停在灶前）"),
      `递增，末尾是 ${RUN.bossAt}`,
    );
  }
  add(
    true,
    `${name("expertFocus")}的玩家多数能撑到关底`,
    sims.expertFocus.bossReached >= 0.5,
    pct(sims.expertFocus.bossReached),
    "≥ 50%",
  );

  // ---------- the weapons against the standard line (docs/balance.md, 武器的统一标准)
  {
    const B = WEAPON_BANDS;
    const wname = (id) => ZH["weapon." + id];
    const M = WR.filter((r) => r.measured);
    const span = (list) => {
      const v = list.map((x) => x.v);
      const lo = list[v.indexOf(Math.min(...v))];
      const hi = list[v.indexOf(Math.max(...v))];
      return { lo, hi };
    };
    const within = (list, [a, b]) => list.every((x) => x.v >= a && x.v <= b);
    const show = ({ lo, hi }, d = 2) =>
      `${lo.v.toFixed(d)}（${lo.n}）到 ${hi.v.toFixed(d)}（${hi.n}）`;
    const forkName = (id, k) => `${wname(id)}·${k[0] === "a" ? "甲" : "乙"}`;

    const guns = M.filter((r) => r.ammo).map((r) => ({
      n: wname(r.id),
      v: r.score.base.total,
    }));
    add(
      true,
      "1 级：用弹药的枪总分都在标准线上下",
      within(guns, B.gun1),
      show(span(guns)),
      B.gun1.join("–"),
    );
    for (const [lv, band] of [
      [3, B.fork3],
      [5, B.fork5],
    ]) {
      const forks = M.flatMap((r) =>
        ["a" + lv, "b" + lv].map((k) => ({
          n: forkName(r.id, k),
          v: r.score[k].total,
        })),
      );
      add(
        true,
        `${lv} 级：每条岔路的总分都在目标带里`,
        within(forks, band),
        show(span(forks)),
        band.join("–"),
      );
    }
    {
      const gaps = M.map((r) => {
        const a = r.score.a5.total,
          b = r.score.b5.total;
        return { n: wname(r.id), v: Math.abs(a - b) / Math.max(a, b) };
      });
      const worst = span(gaps).hi;
      add(
        true,
        "两条岔路都值得选：同一把武器 5 级两条岔路的总分相差不超过四分之一",
        worst.v <= B.forks,
        `最远的是${worst.n} ${pct(worst.v)}`,
        "≤ " + pct(B.forks),
      );
    }
    {
      const pools = M.filter((r) => r.pool != null).map((r) => ({
        n: wname(r.id),
        v: r.pool,
      }));
      add(
        true,
        "一池弹药值同样多：1 级时每把枪一池弹药打倒的数量相近",
        within(pools, B.pool),
        show(span(pools), 0) + " 只",
        B.pool.join("–") + " 只",
      );
    }
  }

  // ---------- the plan (docs/balance.md): not reached yet
  const lv = sims.expertFocus.levelAt.filter((s) => s != null);
  add(
    false,
    "第一次升级不早于 0:40（开局不连着选牌）",
    lv[0] >= 40,
    mmss(lv[0]),
    "≥ 0:40",
  );
  {
    // the house special comes when the third dish is packed, not at a second of the run:
    // counted in each simulated run up to the moment it arrived there (the median of them)
    const n = sims.expertFocus.bossLevels;
    add(
      false,
      "关底之前升级不超过 11 次",
      n != null && n <= 11,
      n == null ? "没有一局见到关底" : n + " 次",
      "≤ 11 次",
    );
  }
  {
    let gap = Infinity;
    for (let i = 1; i < lv.length; i++) gap = Math.min(gap, lv[i] - lv[i - 1]);
    add(
      false,
      "相邻两次升级至少隔 25 秒",
      gap >= 25,
      Math.round(gap) + " 秒",
      "≥ 25 秒",
    );
  }
  {
    const worst = TL.slice().sort(
      (a, b) => b.bloaterMax - b.bloater - (a.bloaterMax - a.bloater),
    )[0];
    add(
      false,
      "胀尸的占比就是表里写的值（重型满员时不顶替成胀尸）",
      worst.bloaterMax - worst.bloater < 0.005,
      `最多 ${pct(worst.bloaterMax)}（写的是 ${pct(worst.bloater)}）`,
      "和写的一致",
    );
  }
  {
    // the last course before the house special's, half a minute before its end on the
    // meal's clock (which minute of the run that is depends on when the stoves are lit)
    const st = RUN.stages;
    const before = st[st.length - 2];
    const grow =
      (stageAt(st[st.length - 1].at - 30).hp ?? 1) / (stageAt(0).hp ?? 1);
    add(
      false,
      `敌人跟着成长：关底前最后一道菜（${ZH["run.stage." + before.id]}）的行尸血量至少是开局的 1.8 倍`,
      grow >= 1.8,
      "×" + grow.toFixed(1),
      "≥ ×1.8",
    );
  }
  {
    const flat = W.slice().sort((a, b) => a.peak - b.peak)[0];
    add(
      false,
      "每道菜有起伏：刷怪速度的峰值至少是这道菜平均值的 1.5 倍",
      flat.peak >= 1.5,
      `最平的是${ZH["run.stage." + flat.id]} ×${flat.peak.toFixed(2)}`,
      "≥ ×1.5",
    );
  }
  {
    const gap = Math.abs(sims.focus.clear - sims.spread.clear);
    add(
      false,
      "专精和全用都走得通：普通玩家两种配法的通关率相差不超过 25 个百分点",
      gap <= 0.25,
      `${pct(sims.focus.clear)} 对 ${pct(sims.spread.clear)}`,
      "相差 ≤ 25 个百分点",
    );
  }
  add(
    false,
    `专精要为弹药奔波：${name("focus")}的主力缺弹时间在 15%–40%`,
    sims.focus.dry >= 0.15 && sims.focus.dry <= 0.4,
    pct(sims.focus.dry),
    "15%–40%",
  );
  {
    const top = WR.filter((r) => r.measured).sort((a, b) => b.grow - a.grow)[0];
    add(
      true,
      "武器成长不失控：5 级最强的岔路不超过 1 级的 4 倍",
      top.grow <= 4,
      `${ZH["weapon." + top.id]} ×${top.grow.toFixed(1)}`,
      "≤ ×4",
    );
  }
  {
    const keys = ["focus", "spread"];
    const at = keys.map((k) => sims[k].bossAt);
    add(
      false,
      "一局的长度：普通玩家见到关底是在街上的第 7:30–10:30",
      at.every((s) => s != null && s >= 450 && s <= 630),
      keys
        .map((k, i) => `${name(k)} ${at[i] == null ? "没见到" : mmss(at[i])}`)
        .join("，"),
      "7:30–10:30",
    );
  }
  add(
    false,
    `通关率（玩家假设校准后再启用）：${name("novice")} 60%–80%`,
    sims.novice.clear >= 0.6 && sims.novice.clear <= 0.8,
    pct(sims.novice.clear),
    "60%–80%",
  );
  return out;
}
