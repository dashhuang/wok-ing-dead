# 鬼市 · 军械试验场

肉鸽（roguelike）武器的试验场：在这里看模型、试开火、检查战斗特效。它可以单独运行——
不引用 `src/game.js`，只复用 `public/assets/` 里的僵尸模型和贴图。反过来，游戏本体的套餐通过 `src/chinatown/armory.js`
直接导入这里的武器模型、特效、战斗和双手模块，所以改这些模块的接口要同时跑本体的 `npm run test:e2e`。武器设计见 [docs/weapons-roguelike.md](../docs/weapons-roguelike.md)。

```sh
npm run arsenal          # http://127.0.0.1:5311/
npm run arsenal:build    # 产物在 arsenal/dist/
npm run arsenal:single   # 单文件展柜 arsenal/dist-single/arsenal-showcase.html（约 1 MB，可直接发到手机上打开）
npm run arsenal:test     # 试验场自己的测试：全部形态冒烟 + 真实点击和按键（约 2 分钟，首次运行前 npx playwright install chromium）
node arsenal/scripts/design-doc.mjs   # 改了 src/data/weapons.js 之后重新生成设计文档
node arsenal/scripts/extract-hands.mjs   # 本体的手（src/game.js）改了之后重新抽取到试验场
```

![十二把武器](preview/weapons.jpg)

![第一人称里双手握持十二把武器](preview/hands.jpg)

![九把枪各自的换弹动作](preview/reloads.jpg)

![靶场里的战斗特效](preview/effects.jpg)

## 怎么用

- **展柜**：左边选武器，右边是升级卡片——点等级 1–5、点「甲」「乙」切换岔路，模型跟着换；拖动旋转，滚轮缩放。右上角「升级规则」是等级、元素、反应和铭文的总表。
- **靶场**（顶部标签或 Tab）：点一下画面锁定鼠标，左键开火，右键是该形态的特殊动作（点名、开镜、泼油、蓄力、掷刀，屏幕下方有提示），R 换弹，
  1 / 2 / 3 切换基础、甲、乙，− / = 调等级，Q / E 换武器，Esc 释放鼠标后可以点右上角的开关。
- **手机 / 单文件**：单文件版只有展柜（靶场需要僵尸模型和街道贴图，会让文件涨到约 25 MB），默认显示双手；窄屏时武器列表变成顶部横条、
  升级卡片变成底部面板，单指拖动旋转、双指缩放。
- 右上角：每秒伤害、累计伤害、击杀和受伤；靶子「站桩 / 逼近 / 尸潮」；四个元素附魔开关（用来试元素反应，比如给喷火器开「蚀」看爆燃）。拿近战武器时靶子会自动站近。
- **尸潮**：16 只僵尸从巷子尽头一批批走过来，速度、血量和攻击力用的是游戏本体的数字（行尸 55 血、走 1.25 / 跑 4.3 米每秒、每下 12；重型 320 血、每下 26），
  走到跟前会打人，屏幕泛红并计入「受伤」。武器数值就是在这个模式下校的，见设计文档的「尸潮下的数值」。
- **声音**：顶部「声音」开关。枪声、换弹的每一下、近战、爆炸、落雷、持续的火焰和电弧声全部用 WebAudio 现场合成，没有音频文件；浏览器要求先点一下页面才会出声。

## 文件

| 路径 | 内容 |
| --- | --- |
| `src/data/weapons.js` | 武器、岔路、元素、反应、等级、铭文的设计数据（唯一来源，界面和设计文档都读它） |
| `src/kit/geo.js` | 建模基元：带圆角的挤出、车削、扫掠、导轨、螺丝；网格合并 |
| `src/kit/mats.js` | 材质库：三向投影的磨损贴图、边缘掉漆、木纹／滚花／布纹等图案 |
| `src/kit/index.js` | 交给武器模型的工具箱：基元 + 材质 + Canvas 贴标 + `kit.weapon()` 包装 |
| `src/kit/hands.js` | 第一人称双手：手指姿势库，把武器的握法换算成本体那双手的目标（手腕位置、手指角度、肩膀） |
| `src/kit/fit.js` | 手指自动贴合：手从张开逐节收拢，碰到武器表面为止（开发时在控制台里用，不在每帧里跑） |
| `src/kit/gamehands.gen.js` | 游戏本体的手臂（骨骼、蒙皮网格、材质、关节范围、手臂求解），由 `scripts/extract-hands.mjs` 从 `src/game.js` 生成 |
| `src/weapons/<id>.js` | 每把武器的模型，一个文件一把，含三种形态和可动零件 |
| `src/render/stage.js`、`range.js` | 渲染、后处理、环境光；展柜与雨夜靶场 |
| `src/fx/core.js` | 特效运行时：粒子、拖尾与闪电、贴花、光源池、弹壳、镜头震动 |
| `src/fx/effects.js` | 具名特效：枪口焰、曳光、命中、爆炸、烟花、火焰喷射、落雷、符咒、火池等 |
| `src/combat/behaviours.js` | 每把武器每种形态开火时做什么（弹道、伤害、状态、特效编排） |
| `src/combat/combat.js` | 靶场控制器：输入、弹药与换弹、后坐力、近战挥砍、投掷、范围伤害 |
| `src/combat/projectiles.js` | 飞行弹体：钉子、弩箭、铜钱、符纸、烟花、油、剑气 |
| `src/combat/targets.js` | 僵尸靶：命中判定、伤害、四种状态和元素反应 |
| `src/audio/audio.js` | 声音：合成的枪声、换弹动作声、命中与爆炸、循环声，巷子混响 |
| `src/ui/` | 界面与靶场 HUD |
| `scripts/design-doc.mjs` | 从设计数据生成 `docs/weapons-roguelike.md` |
| `scripts/single.mjs` | 生成单文件展柜 |
| `scripts/extract-hands.mjs` | 从本体的打包文件里抽出手部模块（解析后按引用关系取出需要的声明），本体代码不改 |
| `scripts/balance.json` | 尸潮测试的结果，设计文档里的数值表读它（由 `tools/balance.mjs --write` 更新） |
| `tests/`、`playwright.config.js` | 试验场的 Playwright 测试，见下面「测试与工具」 |
| `tools/` | 测量和出图脚本，见下面「测试与工具」 |

## 检查与脚本控制

- 地址参数：`/?w=<id>&b=base|a|b&lv=1..5&mode=show|fp&yaw=&pitch=&dist=&ui=0`。
- `window.__lab`：`select(id)`、`setBranch(b)`、`setLevel(n)`、`setMode("fp")`；`window.__errors` 收集运行错误。
- 靶场：`__lab.combat.press("fire" | "alt")`、`release(...)`、`aimAt(僵尸序号)`、`targets.setMode("stand" | "advance" | "horde")`、`setInfuse("venom", true)`；
  `__lab.combat.meter` 里有累计伤害、击杀和受伤，`resetMeter()` 清零。
- 声音：`__lab.audio.measure("magIn")` 离线渲染一个声音并返回峰值和响度，用来在没有扬声器的环境里检查它确实有内容。
- 逐帧步进（抓枪口焰这类几十毫秒的瞬间）：`__lab.manual = true` 之后用 `__lab.advance(秒)` 推进时间并渲染一帧。
- 开发服务器关掉了热重载，改完文件刷新页面即可；新增武器文件后需要重启服务器。
- 特效亮度的经验：加色混合的粒子叠在一起很快就过曝成白色，ACES 色调映射还会把带蓝分量的亮色洗白。火焰的颜色用线性值直接给（见 `effects.js` 的 `PAL`），
  单个粒子的亮度控制在 1–3；光源不要贴着枪管放。

## 测试与工具

`npm run arsenal:test` 跑 `tests/` 里的两组 Playwright 测试（对着构建产物，端口 5312，和本体的测试互不相干；CI 在本体的冒烟测试之后也会跑）：

- `smoke.spec.js`：12 把武器 × 5 种形态各开火、用特殊动作、再开火，不许报错，每种形态都必须打出伤害。
- `input.spec.js`：用真实鼠标点击和按键走一遍——展柜选武器、点等级和岔路、拖动旋转；靶场左右键、`R`、`Q`/`E`、数字键；
  「双手」「演示动作」「声音」「尸潮」；九把枪按 `R` 换弹并按顺序听到各自的换弹声；手机宽度下顶栏每个按钮都点得到。
  点击前先确认按钮没有被别的元素盖住。

`tools/` 里是测量和出图的脚本，直接用 node 跑；试验场开着（`npm run arsenal`）就用开着的，没开会自己起一个。

| 脚本 | 用途 |
| --- | --- |
| `tools/balance.mjs` | 尸潮下的数值：机器人用每种形态各打一段时间，输出每分钟击杀、伤害和受伤。`--write` 更新 `scripts/balance.json`，再重新生成设计文档 |
| `tools/leak.mjs` | 泄漏和帧耗：每种形态反复打三轮，比较显存里的几何体和贴图、场景对象数、JS 堆，以及每帧逻辑耗时 |
| `tools/arms.mjs` | 手腕超出活动范围多少（弧度）：持握时，以及开火、特殊动作、换弹过程中最糟的一刻 |
| `tools/shots.mjs` | 出图：`show` 是展柜多角度拼图（可以停在换弹的某一刻、镜头对准某只手），`play` 是第一人称逐帧序列 |
| `tools/fit-grip.mjs` | 给一个握点算手指角度（手指收拢到碰到武器为止），打印可以直接贴进武器文件的握法，并报告手腕姿势 |

每个脚本开头有用法。改了握法至少跑 `arms.mjs` 并用 `shots.mjs` 从后方、侧面、上方各看一眼，不要只看第一人称。

## 写一把武器

模型文件默认导出 `build(kit)`，返回 `kit.weapon({...})`。`src/weapons/shotgun.js` 是参考实现。

**坐标**：枪身空间 `+Z` 指向枪口，`+Y` 向上，`+X` 是射手的左手边；单位米；原点在扳机（近战武器在握持点，`+Z` 指向刀尖）。

**基元**（都返回带 `position / normal / uv / color / aWear` 的几何体）

- `prism(pts, depth, { plane, bevel, bevelSeg, holes })`：把二维轮廓挤出。`plane: "side"`（默认）轮廓是 `[z, y]` 侧视图，沿 X 挤出；
  `"front"` 轮廓是 `[x, y]` 截面，沿 Z 挤出；`"top"` 轮廓是 `[x, z]`，沿 Y 挤出。点的第三个数是该拐角的圆角半径。
  `bevel` 是侧壁与两个端面之间的倒角，`bevelSeg: 4` 配大倒角可以做出枪托、握把这类椭圆截面。
- `box(w, h, d, { bevel, r })`、`lathe([[z, 半径, 圆角?]...], { seg, flat, arc, squash })`、`rod(r, z0, z1)`、`tube(rOut, rIn, z0, z1)`、
  `cone(r0, r1, z0, z1)`：绕 Z 轴的回转体；`flat: true` 做六角／八角。
- `sweep(points, r)`：沿路径的圆管（线缆、软管、绳）；`helix(R, wire, z0, z1, turns)`：线圈、弹簧、缠绳。
- `sphere`、`torus`、`rail(z0, z1)`（皮卡汀尼导轨，顶面在 y=0）、`screw(r, { axis, hex })`。
- `adopt(threeGeometry)`：把任意 THREE 几何体转成同样的属性布局。

**装配**：`const m = kit.M(); m.add(geo, "材质名", { at, rot, scale, color, wear, mirror }); const node = m.build("名字")`。
一个 `M()` 按材质合并成几个网格；需要单独运动的零件（套筒、泵、弹巢）各用一个 `M()`。`mirror: true` 同时加一份左右镜像。
小零件整体都是“边缘”，会被磨得发白，给它们 `wear: 0.2~0.4`。

**材质**：`kit.mats.names()` 列出全部。常用：`steel_blued` `steel_park` `steel_bare` `steel_dark` `iron_cast` `iron_rust` `chrome`
`brass` `brass_aged` `copper` `bronze` `gold` `coin` `polymer` `polymer_grip` `polymer_yellow` `rubber` `wood_walnut` `wood_rose` `wood_peach`
`wood_dark` `bamboo` `lacquer_red` `lacquer_black` `paint_red|blue|green|yellow|grey` `enamel_white` `cloth_red` `cloth_black` `cord_red`
`cord_gold` `rope_hemp` `leather` `tape_black` `paper_yellow` `paper_red` `paper_kraft` `ceramic` `jade` `agate_red` `bore`。
`kit.mats.variant("paint_red", { color: 0x224488 })` 做一次性变体；`kit.mats.glow(color, power)` 是自发光（霓虹、烧红的金属、发光符文，
`power` 3 以上会有辉光）；`kit.mats.glass(color)` 是玻璃。

**文字和图案**：`kit.label({ key, w, h, px, face, at, draw(g, W, H), metal, rough, glow })` 在某个面上贴一张 Canvas 画的标签
（`face`: `"x"` 左侧、`"-x"` 右侧、`"y"` 顶面…，文字对着看的人总是正的）；`kit.wrap({ r, z0, z1, draw })` 把图案卷在圆筒上。
中文字体用 `kit.FONT_KAI`（楷体）或 `kit.FONT_SONG`。

**岔路**：`kit.only(node, "a")` 让节点只在甲形态出现，`"base,a"` 表示基础和甲都出现。被替换掉的原件标 `"base"`。

**双手**（`src/kit/hands.js`）：用的就是游戏本体的那双手——战术手套、雨衣袖子、35 根骨骼、从肩膀算起的手臂求解，
由 `scripts/extract-hands.mjs` 从 `src/game.js` 原样抽到 `src/kit/gamehands.gen.js`（生成文件，不要手改；本体的手改了就重新跑一遍脚本）。
`hands.js` 只负责把武器的握法描述换算成这双手的目标。武器不用管骨骼，只描述“怎么握”——

```js
hands: {
  right: { at: [x, y, z], palm: [x, y, z], fingers: [x, y, z], pose: "pistol", trigger: true },
  left:  { parent: pump, at: [...], palm: [...], fingers: [...], pose: { base: "wrap", r: 0.027 } },
},
// 岔路之间握法不同就写成函数： hands: (branch) => ({ right: {...}, left: branch === "a" ? {...} : {...} })
```

- `at`：掌心贴在武器上的那一点（枪身空间）；`palm`：掌心朝哪边（指向武器）；`fingers`：手指伸直时指向哪边。
  三个量就定下了整只手，拇指在哪一侧随之而定（右手拇指侧 = `fingers × palm`，左手相反）。
  握一根半径 R 的柄时，`at` 取柄的轴心沿 `-palm` 方向退 R 的那一点。
- `pose`：`"pistol"`（三指握把、食指搭扳机）、`"cradle"`（托护木）、`"wrap"` 或 `{ base: "wrap", r: 握柄半径 }`、`"fist"`、`"pinch"`、
  `"sword"`（剑指）、`"point"`、`"flat"`、`"relax"`。可以逐指覆盖：`{ base: "pistol", thumb: [dx, dy, dz, 关节, 指尖], index: [指根, 中节, 末节, 张开] }`
  （手指角度是弧度，0 伸直、约 1.5 握到底；拇指前三个数是第一节的朝向，按右手的手部空间给：+X 拇指侧、-Y 掌心外、+Z 指尖方向，左手自动镜像）。
- `trigger: true`：食指跟着扳机动。`parent: 节点`：手跟着这个零件走（泵、杠杆、拉机柄）。
- **托枪的手要斜着托**：护木、泵这类横在掌心里的东西，手指方向别垂直于枪管，朝枪口偏过去（和枪管成 50–55°），
  这样手和从后下方来的前臂在一条线上，手腕是直的；拇指顺着枪管贴在左侧。垂直横握时手腕会被折成直角。
- **手指角度可以自动算**：页面上打开武器和「双手」，在控制台里 `await __lab.fitGrip("left")`，手指会从张开逐节收拢到碰到武器表面为止，
  返回可以直接贴进 `pose` 的角度；想先试别的握点或方向就传 `{ at, palm, fingers }`，握柄用 `{ kind: "wrap" }`。镇街、蜂巢、更夫托枪的手就是这样定的。
  命令行里用 `node arsenal/tools/fit-grip.mjs <武器> <形态> left 图.png --phi 55`，同时出六个角度的图。
- **手臂不用管**：肩膀在眼睛下方两侧（和本体一致），手肘朝外下方，前臂自然从画面下角进来；武器离得比手臂长时肩膀会跟着前探。
  手腕只能弯到一定角度，握点的朝向别让手背折向前臂。关节有活动范围（指根 -0.45~1.6、中节 0~1.95、末节 -0.1~1.45、张开 -0.3~0.4），
  写出界的角度会被夹回去；拇指的朝向只能落在它够得到的范围里（大致从贴着食指到横过掌心）。
- **第二握点**：握点可以带 `alts: { mag: { parent: 弹匣节点, at, palm, fingers, pose }, bolt: {...} }`。在 `update()` 里设
  `model.grips.left.to = "mag"; model.grips.left.mix = 0..1`，手就从主握点平滑移到第二握点；第二握点挂在会动的零件上
  （弹匣、正在装的那发子弹、拉机柄），零件怎么动，手就怎么跟。
- **专属换弹**：武器声明 `ownReload: true` 后自己负责换弹动画（零件和双手），试验场不再自动让托枪的手离开。
  用 `s.reload`（0→1，不在换弹时为 -1）和 `s.reloadTime`（秒）编排；`view.reload = { pos, rot }` 指定换弹时枪在视野里怎么偏，
  可选的 `span: [进入完成, 开始回正, 回正完成]`（换弹进度的分数）让枪在手回到握点之前先回正，免得前臂横在画面里。
- **卡点与声音**：`s.prev.reload / cycle / swing / charge` 是上一帧的值，`if (s.prev.reload < 0.6 && s.reload >= 0.6) s.cue("magIn")`
  就在弹匣到位的那一帧出声。可用的声音名见 `src/audio/audio.js`。
- 展柜顶部「演示动作」会播放一次开火和一次换弹；`__lab.freeze({ reload: 0.4 })` 把动画停在某一刻方便检查。
- 没有这只手就写 `null`。武器的 `update()` 里可以改 `model.grips.left.away`（0→1 松手离开）、`.pose`，或直接动 `.anchor`。
- 换弹时托枪的手会自动松开再回来；武器被掷出时双手自动放下。
- 看握得对不对：`/?w=<id>&hands=1`（展柜里也显示双手），界面顶部也有「双手」开关。

**`kit.weapon({ id, root, anchors, update, view, show })`**

- `anchors`：特效挂点，值是 `[x, y, z]`、按岔路区分的 `{ base, a, b }`，或挂在运动零件上的 `{ parent: node, at }`。
  枪类必须有 `muzzle`，抛壳的有 `eject`；多管武器用 `m0, m1, …`；近战武器用 `base` 和 `tip`（刃的两端，拖尾用）。
- `update(s, dt)`：每帧驱动运动零件。`s` 的字段：`t` 时间；`shot` 距上次开火的秒数；`shots` 累计开火次数；
  `cycle` 开火后机构动作的进度 0→1（闲置时为 1）；`trigger` 扳机 0..1；`firing` 是否在持续喷射；`heat` 0..1 连续开火的热量；
  `charge` 0..1 蓄力；`rounds` / `mag` 弹匣余量与容量；`reload` 换弹进度 0→1（不在换弹时为 -1）；`swing` 近战挥砍进度 0→1（闲置为 -1）；
  `branch`、`level`。
- `view.hip = { pos: [x, y, z], rot: [俯仰, 偏航, 滚转] }`：第一人称里枪身原点在相机空间的位置（x 右、y 上、-z 前）和姿态。
- `show = { yaw, pitch, dist }`：展柜的默认机位。

写完后在展柜和靶场各看一遍三种形态；可动零件用 `__lab.manual` 步进到动作中途检查。
