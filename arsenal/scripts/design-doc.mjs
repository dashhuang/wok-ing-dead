// Writes docs/weapons-roguelike.md from arsenal/src/data/weapons.js, so the design document
// always matches what the lab shows.   node arsenal/scripts/design-doc.mjs
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  WEAPONS,
  EXISTING,
  CLASSES,
  ELEMENTS,
  REACTIONS,
  LEVELS,
  INSCRIPTIONS,
} from "../src/data/weapons.js";

const out = fileURLToPath(
  new URL("../../docs/weapons-roguelike.md", import.meta.url),
);
const KIND = {
  hitscan: "即时命中",
  projectile: "飞行弹体",
  stream: "持续喷射",
  melee: "近战",
};
const el = (k) => (k && k !== "none" ? ELEMENTS[k].name : "—");
// horde measurements written by the balance run (see the section they are printed in)
const BAL = JSON.parse(
  fs.readFileSync(new URL("./balance.json", import.meta.url), "utf8"),
);
const cell = (id, b, lv) => {
  const r = BAL.rows.find((x) => x.id === id && x.b === b && x.lv === lv);
  return r ? `${r.kills} / ${r.hurt}` : "—";
};
const stats = (w) => {
  const f = w.fire;
  if (f.kind === "melee")
    return `伤害 ${f.damage}，攻速 ${f.rpm}/分，范围 ${f.reach} 米${f.combo ? `，${f.combo} 连段` : ""}`;
  if (f.kind === "stream")
    return `伤害 ${f.damage}×${f.tick}/秒，射程 ${f.range} 米，燃料 ${w.mag}${f.chain ? `，跳电 ${f.chain}` : ""}`;
  const dmg = f.pellets
    ? `${f.damage}×${f.pellets}`
    : f.splash
      ? `${f.damage} 直击 + ${f.splash} 溅射（${f.radius} 米）`
      : f.damage;
  return `伤害 ${dmg}，射速 ${f.rpm}/分，弹匣 ${w.mag === Infinity ? "∞" : w.mag}${f.range ? `，射程 ${f.range} 米` : ""}${f.head ? `，弱点 ×${f.head}` : ""}${f.pierce ? `，穿透 ${f.pierce}` : ""}`;
};

let md = `# 肉鸽武器设计

把《鬼市》改成肉鸽（roguelike）之后的武器池：12 把新武器、现有两把枪的岔路、局内升级规则、元素与铭文。
这份文档由 \`arsenal/scripts/design-doc.mjs\` 从 \`arsenal/src/data/weapons.js\` 生成，改设计请改数据再重新生成。
模型、特效和可试玩的靶场在 [arsenal/](../arsenal/README.md)。十二把武器已经接进游戏本体的套餐（见文末），
本体用的是这里的模型、形态、状态和反应；铭文槽、铜钱和摊位没有接，成长规则以 [README](../README.md) 的「玩法」为准。

## 设计目标

- **每把武器回答一个不同的问题**：清一条巷子（镇街）、压住一个点（蜂巢）、点掉最危险的那个（判官、更夫）、把人钉在原地（打桩、敕令）、
  烧一片（镬气、满堂红）、打一串（霓虹）、不出声（诸葛）、贴身（金钱剑、青龙）。
- **三类来源，三种脾气**：${Object.values(CLASSES)
  .map((c) => `${c.name}——${c.note}`)
  .join("；")}。
- **岔路改变打法而不只是数值**：每把武器 3 级时二选一，外形跟着变；两条岔路通常一条沿着原来的长处走到极致，另一条换一种元素或一种用法。
- **元素之间有反应**：一局里拿到的第二把武器、第一个铭文，都会让人去想“它和我手上这把能配出什么”。
- **参照现有数值**：行尸 55 血、重型僵尸 320 血、爆头 ×2.2；LK-9 每发 26（720 发/分），LK-4 每发 34（420 发/分）。

## 一局里武器怎么成长

每局从一把副武器开始，沿路拾取或在摊位换购，同时带一把主武器、一把副武器、一把近战。武器在局内最多升到 5 级：

| 等级 | 名称 | 伤害 | 铭文槽 | 说明 |
| --- | --- | --- | --- | --- |
${LEVELS.map((l) => `| ${l.lv} | ${l.name} | ×${l.dmg} | ${l.slots} | ${l.note} |`).join("\n")}

## 元素、状态与反应

| 元素 | 状态 | 效果 |
| --- | --- | --- |
${Object.entries(ELEMENTS)
  .filter(([k]) => k !== "none")
  .map(([, e]) => `| ${e.name} | ${e.status} | ${e.hint} |`)
  .join("\n")}

| 反应 | 条件 | 效果 |
| --- | --- | --- |
${REACTIONS.map((r) => `| ${r.name} | ${ELEMENTS[r.a].name} + ${ELEMENTS[r.b].name} | ${r.text} |`).join("\n")}

## 武器一览

| 武器 | 类型 | 来源 | 槽位 | 元素 | 甲 | 乙 |
| --- | --- | --- | --- | --- | --- | --- |
${WEAPONS.map((w) => `| **${w.name}** | ${w.type} | ${CLASSES[w.cls].name} | ${w.slot} | ${el(w.element)} | ${w.branches.a.name}（${el(w.branches.a.element)}） | ${w.branches.b.name}（${el(w.branches.b.element)}） |`).join("\n")}
`;

for (const [cls, c] of Object.entries(CLASSES)) {
  md += `\n## ${c.name}\n\n${c.note}。\n`;
  for (const w of WEAPONS.filter((x) => x.cls === cls)) {
    md += `\n### ${w.name} · ${w.type}\n\n> ${w.tagline}\n\n`;
    md += `- **定位**：${w.slot}武器，${KIND[w.fire.kind]}${w.element !== "none" ? `，${el(w.element)}系` : ""}。${stats(w)}。${w.reload}。\n`;
    md += `- **外形**：${w.look}\n`;
    for (const k of ["a", "b"]) {
      const b = w.branches[k];
      md += `- **${k === "a" ? "甲" : "乙"} · ${b.name}**${b.element && b.element !== "none" ? `（${el(b.element)}）` : ""}：${b.text}\n`;
      md += `  - 外形：${b.look}\n`;
      md += `  - 5 级「${b.cap.name}」：${b.cap.text}\n`;
    }
  }
}

md += `\n## 现有两把枪的岔路\n\n这两把已经在游戏里，没有做新的模型，只设计了岔路。\n\n`;
for (const w of EXISTING) {
  md += `### ${w.name} · ${w.type}\n\n`;
  for (const k of ["a", "b"]) {
    const b = w.branches[k];
    md += `- **${k === "a" ? "甲" : "乙"} · ${b.name}**：${b.text} 5 级「${b.cap.name}」：${b.cap.text}\n`;
  }
  md += "\n";
}

md += `## 铭文\n\n通用的小改造，插进武器的铭文槽（2 级 1 个，4 级 2 个，5 级 3 个）。每条只对合适的开火方式生效。\n\n| 类别 | 铭文 | 效果 | 适用 |\n| --- | --- | --- | --- |\n`;
md += INSCRIPTIONS.map(
  (i) =>
    `| ${i.group} | ${i.name} | ${i.text} | ${i.fits.map((f) => KIND[f]).join("、")} |`,
).join("\n");

md += `

## 试验场里做到了哪一步

- **模型**：12 把新武器各三种形态（基础、甲、乙）都有模型，全部用代码生成，没有外部模型文件。
- **双手**：用的就是游戏本体的那双手——战术手套、雨衣袖子、35 根骨骼、从肩膀算起的手臂求解，由脚本从 \`src/game.js\` 原样抽进试验场
  （本体代码没有改动）。每把武器每种形态都定义了握法；食指跟扳机，托枪的手跟着泵、杠杆这类活动零件走，近战挥砍和掷刀时双手随动作变化。
  手肘的位置每帧自动找：让手腕弯得最少，又不挡在画面里。
- **换弹**：9 把需要换弹的武器各有自己的换弹动作，零件和手一起动——镇街从装弹口一发一发塞弹、蜂巢换弹匣再拉机柄、判官甩出弹巢用快速装弹器、
  更夫从侧面装弹口压弹、打桩换钉排、诸葛换顶上的箭匣、镬气拧下煤气罐换新的、满堂红竖起来从炮口装、霓虹拔电池（霓虹灯随之熄灭再亮起）。
- **声音**：枪声、换弹的每一下、近战、爆炸、落雷、持续的火焰和电弧声都用 WebAudio 现场合成，没有音频文件。每个声音都离线渲染检查过确有内容、
  音量在合理范围，但**还没有人实际听过**，音色需要戴耳机过一遍再调。
- **开火与特效**：12 把 × 3 种形态都能在靶场里开火，带各自的弹道、命中、状态和特效。
- **5 级终极词条**：24 条里 18 条按设计实现，6 条做了简化——蜂巢·不歇火（没有“击杀返还 5 发”）、判官·生死簿（没有“六发全杀下一轮翻倍”）、
  打桩·钉板（钉子不能回收）、满堂红·开门红（只有范围加成）、敕令·三昧真火（火环固定延长到 8 秒）、诸葛·火牛阵（只让目标短暂乱跑）。
- **靶场里的简化**：后备弹药无限；换弹动作是逐发、逐步演出来的，但结算仍按整段时间算（不能打断，中途也不会先装进去几发）；弩箭和钉子不能回收；
  玩家站在原地不能移动。「尸潮」模式下僵尸会走到跟前打人，其余模式不会。
- **状态与反应**：灼烧、感电、蚀骨、镇压四种状态和四种元素反应都已实现。武器本身只带火、雷、镇三系，蚀骨要靠铭文附魔触发。
- **铭文**：只接入了四种元素附魔（炎、霆、蚀、敕），其余 12 条目前只有设计，没有实现。
- **只有设计、没有实现**：武器的获取与掉落、摊位、铜钱经济、三个武器槽位之间的切换、现有 LK-9 和 LK-4 的岔路、
  开门红（冲天炮 5 级）的“每局第一发”这类依赖整局流程的条件。
- **数值**：在尸潮模式下用机器人校过一轮，见下一节；没有真人在真实关卡里打过。

## 尸潮下的数值

靶场的「尸潮」模式用游戏本体的僵尸数值（行尸 55 血、走 1.25 / 跑 4.3 米每秒、每下 12；重型 320 血、每下 26），16 只循环补充。
每种形态让一个机器人打 ${BAL.seconds} 秒：原地不动，瞄最近的僵尸，目标进了这把武器的有效射程才开火，并按各形态的节奏用特殊动作。
表里每格是「每分钟击杀 / 每分钟受到的伤害」。测试脚本是 \`arsenal/tools/balance.mjs\`。

| 武器 | 1 级 | 3 级 · 甲 | 3 级 · 乙 | 5 级 · 甲 | 5 级 · 乙 |
| --- | --- | --- | --- | --- | --- |
${WEAPONS.map(
  (w) =>
    `| ${w.name} | ${[
      ["base", 1],
      ["a", 3],
      ["b", 3],
      ["a", 5],
      ["b", 5],
    ]
      .map(([b, lv]) => cell(w.id, b, lv))
      .join(" | ")} |`,
).join("\n")}

怎么读这张表：

- 僵尸从 40 米外走过来，所以**近距离武器的击杀数有上限**（大约每分钟 35–45，取决于僵尸走到跟前的速度），镇街、镬气和两把近战主要看受伤那一栏；
  远程武器的上限约每分钟 200。
- 机器人不会后退也不会走位，近战和近距离武器的受伤数比真人打要高；同一形态重复测，结果有一成多的浮动。
- 目标区间：1 级远程武器每分钟 40–65 击杀，3 级 60–115，5 级 80–145；近距离武器 1 级受伤不超过每分钟 300。

按第一轮结果改过的数字：

- **镇街**：弹丸伤害 11→15、散布收窄（1 级原来每分钟受伤 1000 以上）；龙息弹每丸 7→10，火焰锥 8→10 米。
- **敕令**：符纸伤害 30→38，补符间隔 0.8→0.45 秒（原来 1 级每分钟只有 17 击杀）。
- **满堂红**：溅射 90→80、范围 3.5→3 米、射速 120→100（原来 1 级就有 89 击杀，压过了所有其他 1 级武器）；大礼花蓄力 1→0.8 秒。
- **诸葛**：弩矢 45→52，换箭匣 1.8→1.5 秒。**霓虹**：每跳伤害 6→8。
- **青龙·拖刀**：上挑斩在身前留下一条烧 3 秒的火线（设计里本来就写了“在地面留下火线”，之前没有做）。

还不够好的地方：镇街·龙息和青龙·拖刀在这个测试里只比 1 级略安全（两者都要贴身打，机器人又不会后退）；5 级里判官·甲、更夫·乙、敕令·乙、满堂红·甲在 135–146 击杀的最高一档，
这些要在本体的真实关卡里再看。

## 怎么接进游戏本体的

本体不复制这里的代码，而是直接导入：\`src/chinatown/armory.js\` 载入 \`arsenal/src/\` 的武器模型、特效、战斗和双手模块，
给它一个「舞台」适配层（见 [架构说明](architecture.md) 的「唐人街模块」）。

- 试验场的战斗逻辑打在本体的僵尸上：\`createCombat(lab)\` 在 \`lab.makeTargets\` 存在时用它提供的靶子，
  本体的实现在 \`src/chinatown/armtargets.js\`（状态、反应、定身、恐惧都落在僵尸对象上）。
- 武器和双手画在本体的武器图层；试验场是按亮巷子调的，本体把所有特效和发光件按场景曝光整体压暗（\`kit/hands.js\` 的 \`solve\` 接受 \`gain\`）。
- 弹药、等级、岔路由本体的 \`src/chinatown/loadout.js\` 和 \`run.js\` 管：四种弹药池、五级、三级时甲乙二选一；
  这里的等级表只取每级的数值和终极词条。
- 握法没有变：试验场里“握法描述 → 手腕位置、手指角度、肩膀和手肘”的换算在 \`arsenal/src/kit/hands.js\`，本体原样使用。
  三把制式长枪托枪的手是对着武器网格收拢手指定下来的（\`__lab.fitGrip\`），其余握持还是手调的手指角度。
- 改这里的模块接口（\`createCombat(lab)\`、\`lab\` 舞台对象、\`kit/hands.js\`、\`data/weapons.js\` 的字段）会影响本体，要同时跑本体的冒烟测试。
`;
fs.writeFileSync(out, md);
console.log("wrote", out, md.length, "chars");
