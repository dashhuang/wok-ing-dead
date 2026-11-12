// What the numbers are tuned towards, written as rules that can be checked.
//
// enforce: true  — holds today and must keep holding: `npm run check` fails without it.
// enforce: false — a goal of the tuning plan that is not reached yet: reported, not enforced.
//                  Switch it on in the change that reaches it.
// Each guard: { text, value, want, ok, enforce } (texts are in the report's language).
import { RUN } from "./data.mjs";
import { PROFILES } from "./run.mjs";
import { stageAt } from "../../src/chinatown/runflow.js";
import ZH from "../../src/i18n/locales/zh-CN.js";

const pct = (v) => (v * 100).toFixed(0) + "%";
const mmss = (s) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

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
    const st = RUN.stages;
    const rising = st.every((s, i) => i === 0 || s.at > st[i - 1].at);
    add(
      true,
      "各道菜按时间先后排列，最后一道在关底登场时开始",
      rising && st[st.length - 1].at === RUN.bossAt,
      st.map((s) => s.at).join(" → "),
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
    const n = lv.filter((s) => s < RUN.bossAt).length;
    add(false, "关底之前升级不超过 11 次", n <= 11, n + " 次", "≤ 11 次");
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
    const grow = (stageAt(RUN.bossAt - 30).hp ?? 1) / (stageAt(0).hp ?? 1);
    add(
      false,
      "敌人跟着成长：第 9 分钟的行尸血量至少是开局的 1.8 倍",
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
      false,
      "武器成长不失控：5 级最强的岔路不超过 1 级的 4 倍",
      top.grow <= 4,
      `${ZH["weapon." + top.id]} ×${top.grow.toFixed(1)}`,
      "≤ ×4",
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
