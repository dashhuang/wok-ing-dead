// Writes docs/weapons-roguelike.md, so the design document always matches what the lab shows
// and what the game plays. The weapons come from arsenal/src/data/weapons.js; what a form
// really carries from its behaviour; the rules of a run (levels, seasonings, ammunition, the
// zombies' numbers) from the game's own tables.   node arsenal/scripts/design-doc.mjs
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
import { BEHAVIOURS } from "../src/combat/behaviours.js";
import { RUN, spiceVars } from "../../src/chinatown/runtune.js";
import { AMMO, ARMS } from "../../src/chinatown/loadout.js";
import { ZOMBIES } from "../../src/chinatown/zombietune.js";
import ZH from "../../src/i18n/locales/zh-CN.js";

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
// the game's own words (its Chinese language pack), with {placeholders} filled in
const tr = (key, vars = {}) =>
  (ZH[key] || key).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
const num = (n) => String(+(+n).toFixed(2));
const ammoName = (type) => tr("run.ammo." + type);
const nameOf = (id) =>
  (WEAPONS.find((w) => w.id === id) || EXISTING.find((w) => w.id === id) || {})
    .name || id;
// a seasoning's levels in the words of the game's tickets (the total at each level)
const spiceLevels = (s) =>
  Array.from({ length: RUN.spiceMax }, (_, i) => {
    const v = spiceVars(s.id, i + 1);
    const total = { ...v, n: s.id === "soup" ? v.n * (i + 1) : v.t };
    return tr(`run.spice.${s.id}.d`, s.per !== undefined ? total : v);
  }).join(" / ");
const cost = (id) => {
  const per = ARMS[id].per;
  return typeof per === "number"
    ? num(per)
    : `${num(per.base)}（甲 ${num(per.a)}、乙 ${num(per.b)}）`;
};
const ammoOf = (id) =>
  ARMS[id] && ARMS[id].ammo
    ? `吃${ammoName(ARMS[id].ammo)}，每发 ${cost(id)}`
    : "不吃弹药";
// the seasonings that only mean something over a whole run (the firing range cannot try them)
const OFF_RANGE = RUN.spices.filter((x) =>
  ["soup", "runner", "burst", "takeout"].includes(x.id),
);
const Zw = ZOMBIES.walker,
  Zb = ZOMBIES.brute;
const zombieLine = `行尸 ${Zw.hp} 血、走 ${Zw.walkSpeed} / 跑 ${Zw.runSpeed} 米每秒、每下 ${Zw.damage}；重型 ${Zb.hp} 血、每下 ${Zb.damage}`;
// horde measurements written by the balance run (see the section they are printed in)
const BAL = JSON.parse(
  fs.readFileSync(new URL("./balance.json", import.meta.url), "utf8"),
);
// the five level-5 forms that kill fastest in that test
const TOP5 = BAL.rows
  .filter((r) => r.lv === 5)
  .sort((p, q) => q.kills - p.kills)
  .slice(0, 5);
const cell = (id, b, lv) => {
  const r = BAL.rows.find((x) => x.id === id && x.b === b && x.lv === lv);
  return r ? `${r.kills} / ${r.hurt}` : "—";
};
// magazine, rate and reload are the base form's real ones, read from its behaviour
const stats = (w) => {
  const f = w.fire;
  const spec = BEHAVIOURS[w.id].spec("base", 1);
  if (f.kind === "melee")
    return `伤害 ${f.damage}，攻速 ${f.rpm}/分，范围 ${f.reach} 米${f.combo ? `，${f.combo} 连段` : ""}`;
  if (f.kind === "stream")
    return `伤害 ${f.damage}×${spec.tickRate}/秒，射程 ${f.range} 米，燃料 ${spec.mag}${f.chain ? `，跳电 ${f.chain}` : ""}`;
  const dmg = f.pellets
    ? `${f.damage}×${f.pellets}`
    : f.splash
      ? `${f.damage} 直击 + ${f.splash} 溅射（${f.radius} 米）`
      : f.damage;
  return `伤害 ${dmg}，射速 ${spec.rpm}/分，弹匣 ${spec.mag}${f.range ? `，射程 ${f.range} 米` : ""}${f.head ? `，弱点 ×${f.head}` : ""}${f.pierce ? `，穿透 ${f.pierce}` : ""}`;
};

let md = `# 肉鸽武器设计

《行尸走镬》套餐（肉鸽关卡）的武器池：12 把新武器、局内升级规则、元素与调料。
这份文档由 \`arsenal/scripts/design-doc.mjs\` 生成，不要手改：武器读自 \`arsenal/src/data/weapons.js\`，弹匣、射速、换弹读自
\`arsenal/src/combat/behaviours.js\`，等级、调料、弹药和僵尸的数字读自游戏本体的数值表。改了数据重新生成即可。
模型、特效和可试玩的靶场在 [arsenal/](../arsenal/README.md)；靶场和本体跑的是同一份规则（见文末）。

## 设计目标

- **每把武器回答一个不同的问题**：清一条巷子（镇街）、压住一个点（蜂巢）、点掉最危险的那个（判官、更夫）、把人钉在原地（打桩、敕令）、
  烧一片（镬气、满堂红）、打一串（霓虹）、不出声（诸葛）、贴身（金钱剑、青龙）。
- **三类来源，三种脾气**：${Object.values(CLASSES)
  .map((c) => `${c.name}——${c.note}`)
  .join("；")}。
- **岔路改变打法而不只是数值**：每把武器 3 级时二选一，外形跟着变；两条岔路通常一条沿着原来的长处走到极致，另一条换一种元素或一种用法。
- **元素之间有反应**：一局里拿到的第二把武器、第一种附魔调料，都会让人去想“它和我手上这把能配出什么”。
- **参照本体的数值**：${zombieLine}；爆头 ×2.2；LK-9 每发 26（720 发/分），LK-4 每发 34（420 发/分）。

## 一局里武器怎么成长

开局三选一，之后能带的武器不限数量（升级小票里会出新武器，街上还有武器箱）。捡到红包，**手上那把**升一级，最高 ${LEVELS.length} 级：

| 等级 | 名称 | 伤害 | 说明 |
| --- | --- | --- | --- |
${LEVELS.map((l) => `| ${l.lv} | ${l.name} | ×${l.dmg} | ${l.note} |`).join("\n")}

### 弹药

四种弹药都要捡，同类武器共用一个池子；一把新武器到手时弹匣是满的，另送一包它吃的弹药。

| 弹药 | 最多带 | 开局 | 一包 | 每发消耗 |
| --- | --- | --- | --- | --- |
${Object.entries(AMMO)
  .map(
    ([type, a]) =>
      `| ${ammoName(type)} | ${a.cap} | ${a.start} | ${a.pack} | ${Object.keys(
        ARMS,
      )
        .filter((id) => ARMS[id].ammo === type)
        .map((id) => `${nameOf(id)} ${cost(id)}`)
        .join("，")} |`,
  )
  .join("\n")}

不吃弹药：${Object.keys(ARMS)
  .filter((id) => !ARMS[id].ammo)
  .map(nameOf)
  .join("、")}。

### 调料

击杀攒镬气，每升一级从小票里选一种调料，每种最多 ${RUN.spiceMax} 层。表里是一层、两层、三层时的总效果。

| 调料 | 一层 / 两层 / 三层 |
| --- | --- |
${RUN.spices.map((s) => `| ${tr("run.spice." + s.id)} | ${spiceLevels(s)} |`).join("\n")}

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

| 武器 | 类型 | 来源 | 弹药 | 元素 | 甲 | 乙 |
| --- | --- | --- | --- | --- | --- | --- |
${WEAPONS.map((w) => `| **${w.name}** | ${w.type} | ${CLASSES[w.cls].name} | ${ARMS[w.id].ammo ? ammoName(ARMS[w.id].ammo) : "—"} | ${el(w.element)} | ${w.branches.a.name}（${el(w.branches.a.element)}） | ${w.branches.b.name}（${el(w.branches.b.element)}） |`).join("\n")}
`;

for (const [cls, c] of Object.entries(CLASSES)) {
  md += `\n## ${c.name}\n\n${c.note}。\n`;
  for (const w of WEAPONS.filter((x) => x.cls === cls)) {
    md += `\n### ${w.name} · ${w.type}\n\n> ${w.tagline}\n\n`;
    md += `- **定位**：${KIND[w.fire.kind]}${w.element !== "none" ? `，${el(w.element)}系` : ""}，${ammoOf(w.id)}。${stats(w)}。${w.reload}。\n`;
    md += `- **外形**：${w.look}\n`;
    for (const k of ["a", "b"]) {
      const b = w.branches[k];
      md += `- **${k === "a" ? "甲" : "乙"} · ${b.name}**${b.element && b.element !== "none" ? `（${el(b.element)}）` : ""}：${b.text}\n`;
      md += `  - 外形：${b.look}\n`;
      md += `  - 5 级「${b.cap.name}」：${b.cap.text}\n`;
    }
  }
}

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
- **换弹的简化**：换弹动作是逐发、逐步演出来的，但结算仍按整段时间算（不能打断，中途也不会先装进去几发）；弩箭和钉子不能回收。本体里也是这样。
- **状态与反应**：灼烧、感电、蚀骨、镇压四种状态和四种元素反应都已实现。武器本身只带火、雷、镇三系，蚀骨要靠调料「${tr("run.spice.vinegar")}」触发。
- **数值**：在尸潮模式下用机器人校过，见「尸潮下的数值」；没有真人在真实关卡里打过。

## 靶场和本体共用什么

靶场不是本体的一份仿制品：下面这些两边跑的是同一份代码、读的是同一张表，改一处两边一起变。

| 内容 | 唯一的出处 |
| --- | --- |
| 武器的模型、握法、换弹动作 | \`arsenal/src/weapons/\`、\`arsenal/src/kit/\` |
| 每种形态开火时做什么、伤害、弹匣、射速、换弹时间 | \`arsenal/src/combat/behaviours.js\` |
| 输入、后坐、换弹、近战挥砍、投掷、范围伤害 | \`arsenal/src/combat/combat.js\`（本体用同一个控制器） |
| 特效和声音 | \`arsenal/src/fx/\`、\`arsenal/src/audio/\` |
| 伤害结算、四种状态、四种反应、精英和关底的抗性、附魔调料怎么触发 | \`arsenal/src/combat/status.js\`，数字在 \`arsenal/src/data/status.js\` |
| 每一级的伤害倍率 | \`arsenal/src/data/levels.js\` |
| 调料的层数和数值、调料对武器的作用 | \`src/chinatown/runtune.js\`（\`RUN.spices\`、\`weaponMods\`、\`infusionsOf\`） |
| 四种弹药的上限、每把武器每发吃多少 | \`src/chinatown/loadout.js\`（\`AMMO\`、\`ARMS\`） |
| 僵尸的血量、速度、每下伤害、出手节奏、受击硬直、弱点大小 | \`src/chinatown/zombietune.js\` |
| 调料和弹药的名字 | \`src/i18n/locales/zh-CN.js\` |

靶场右上角的「调料」就是本体的调料（点一下加一层），「弹药」选「套餐」时换弹从四种弹药池里扣。同一组地址参数两边都认：
\`?w=flamer&b=a&lv=5&spice=chili:2,fire:3\` 在靶场里是这把武器的这个形态加这些调料，在本体里是带着它们开局（跳过开局的三选一）。

**靶场里没有、只能在本体里看的**：走位和捡弹药；精英、关底、胀尸（它们的抗性写在共用规则里，但靶场没有这几种靶子）；
「${OFF_RANGE.map((s) => tr("run.spice." + s.id)).join("」「")}」四种靠整局流程的调料；本体自己的 LK-9 和 LK-4；
靶场是按亮巷子调的光，本体的夜街曝光暗得多，本体把所有特效和发光件整体压暗（\`src/chinatown/armory.js\` 的 \`ARMORY_TUNE\`），所以特效的亮度两边看起来不一样。
靶场里僵尸的命中体积是一根圆柱加一个头，本体按骨骼分头、躯干、四肢；靶场的僵尸只会直线走过来。

**还写了两遍、靠检查保证一致的**：\`data/weapons.js\` 里给卡片和这份文档看的基础数值（射速、弹匣、换弹时间）与 \`behaviours.js\` 里实际开火的数值，
由 \`arsenal/scripts/check-data.mjs\` 核对，对不上 \`npm run check\` 就不过；伤害、射程和各岔路的说明文字是手写的，改数值时要一起改。

## 尸潮下的数值

靶场的「尸潮」模式里，僵尸的数值就是本体的那张表（${zombieLine}；出手节奏和受击硬直也一样），16 只循环补充。
每种形态让一个机器人打 ${BAL.seconds} 秒：原地不动，瞄最近的僵尸，目标进了这把武器的有效射程才开火，并按各形态的节奏用特殊动作。
表里每格是「每分钟击杀 / 每分钟受到的伤害」，不带任何调料。测试脚本是 \`arsenal/tools/balance.mjs\`（最近一次：${BAL.date}）。

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
- 僵尸出手有前摇，挨了打的行尸会被打断一下（和本体一样），所以只要火力压得住，受伤就是 0；受伤那一栏看的是“压不压得住”。
  巷子里只有 16 只、只从正面来，本体里是四面八方二三十只，这张表不能当成本体里的受伤数。
- 目标区间：1 级远程武器每分钟 40–65 击杀，3 级 60–115，5 级 80–145；近距离武器 1 级受伤不超过每分钟 300。

按第一轮结果改过的数字（当时靶场的僵尸出手比本体快得多，所以那一轮的受伤数偏高）：

- **镇街**：弹丸伤害 11→15、散布收窄（1 级原来每分钟受伤 1000 以上）；龙息弹每丸 7→10，火焰锥 8→10 米。
- **敕令**：符纸伤害 30→38，补符间隔 0.8→0.45 秒（原来 1 级每分钟只有 17 击杀）。
- **满堂红**：溅射 90→80、范围 3.5→3 米、射速 120→100（原来 1 级就有 89 击杀，压过了所有其他 1 级武器）；大礼花蓄力 1→0.8 秒。
- **诸葛**：弩矢 45→52，换箭匣 1.8→1.5 秒。**霓虹**：每跳伤害 6→8。
- **青龙·拖刀**：上挑斩在身前留下一条烧 3 秒的火线（设计里本来就写了“在地面留下火线”，之前没有做）。

5 级里击杀最高的一档：${TOP5.map((r) => `${nameOf(r.id)}·${r.b === "a" ? "甲" : "乙"}（${r.kills}）`).join("、")}。
这些要在本体的真实关卡里再看。

## 怎么接进游戏本体的

本体不复制这里的代码，而是直接导入：\`src/chinatown/armory.js\` 载入 \`arsenal/src/\` 的武器模型、特效、战斗和双手模块，
给它一个「舞台」适配层（见 [架构说明](architecture.md) 的「唐人街模块」）。

- 同一个战斗控制器：\`createCombat(lab)\` 在靶场里打靶场的僵尸，在本体里由 \`lab.makeTargets\` 换成本体的僵尸
  （\`src/chinatown/armtargets.js\`）。两种僵尸靶都只管“怎么被射线找到、怎么扣血、怎么动”，伤害和状态的规则都在 \`status.js\`。
- 换弹从哪里拿子弹由 \`lab.supply\` 回答：本体接的是 \`loadout.js\` 的四种弹药池，靶场接的是按同一张表算的池子（或无限）。
- 调料通过两个入口作用到武器上：\`combat.setMods({ damage, rate, reload })\` 和 \`targets.setInfusions([...])\`，本体和靶场都只调这两个。
- 武器和双手画在本体的武器图层；本体把所有特效和发光件按场景曝光整体压暗（\`kit/hands.js\` 的 \`solve\` 接受 \`gain\`）。
- 握法没有变：“握法描述 → 手腕位置、手指角度、肩膀和手肘”的换算在 \`arsenal/src/kit/hands.js\`，本体原样使用。
  三把制式长枪托枪的手是对着武器网格收拢手指定下来的（\`__lab.fitGrip\`），其余握持还是手调的手指角度。
- 改这里的模块接口（\`createCombat(lab)\`、\`lab\` 舞台对象、\`status.js\` 的宿主接口、\`kit/hands.js\`、\`data/weapons.js\` 的字段）会影响本体，
  要同时跑本体的冒烟测试。

## 还没做进游戏的设计

下面两节只是设计稿，本体和靶场里都没有。

### 现有两把枪的岔路

LK-9 和 LK-4 是本体自己的枪，能升级（只涨伤害），没有岔路。

${EXISTING.map(
  (w) =>
    `- **${w.name} · ${w.type}**：${["a", "b"]
      .map((k) => {
        const b = w.branches[k];
        return `${k === "a" ? "甲" : "乙"}「${b.name}」${b.text} 5 级「${b.cap.name}」：${b.cap.text}`;
      })
      .join("　")}`,
).join("\n")}

### 铭文

通用的小改造，原设计是插进武器的铭文槽。本体用调料取代了它；其中四种元素附魔已经以调料的形式做进了游戏。

| 类别 | 铭文 | 效果 | 适用 |
| --- | --- | --- | --- |
${INSCRIPTIONS.map(
  (i) =>
    `| ${i.group} | ${i.name} | ${i.text} | ${i.fits.map((f) => KIND[f]).join("、")} |`,
).join("\n")}
`;
fs.writeFileSync(out, md);
console.log("wrote", out, md.length, "chars");
