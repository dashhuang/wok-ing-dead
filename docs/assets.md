# 素材来源与许可

唐人街版本在原版「全部由代码生成」的基础上引入了外部素材。下面列出每一类素材的来源、许可和生成方式；
重新生成所需的脚本都在 `scripts/assets/`。

## 一览

| 类别 | 位置 | 来源 | 许可 |
| --- | --- | --- | --- |
| 墙面、地面、屋瓦等 PBR 贴图（22 套） | `public/assets/textures/` | [Poly Haven](https://polyhaven.com) | CC0 |
| 街头道具模型（42 个） | `public/assets/props/` | [Poly Haven](https://polyhaven.com) | CC0 |
| 僵尸角色与动作（9 个在用，2 个试用） | `public/assets/zombies/` | Adobe Mixamo（经公开 GitHub 仓库获取） | Mixamo 使用条款，**不是 CC0**，见下文 |
| 招牌字体（子集） | `public/assets/fonts/` | Noto Serif TC、LXGW WenKai TC（Google Fonts 仓库） | SIL OFL 1.1 |
| 界面字体（子集） | `public/assets/fonts/ui/` | Inter、Noto Serif Display、Noto Sans / Serif SC·TC·JP（Google Fonts 仓库） | SIL OFL 1.1 |
| 场景贴图用的拉丁字体 | `public/assets/fonts/world/` | Big Shoulders Display、Barlow Condensed、IBM Plex Mono（Google Fonts，拉丁子集） | SIL OFL 1.1 |
| 僵尸嗓音（24 段） | `public/assets/audio/zombie/` | OpenGameArt | CC0，详见 [assets-audio.md](assets-audio.md) |
| 《尸潮开镬》尸潮摇滚配乐 | `public/assets/audio/music/horde-rock-v1.mp3` | XD Mivo / Suno 生成 | 非 CC0，已选定曲目，商用授权待核实 |
| 《雨夜开镬》第一版配乐 | `public/assets/audio/music/rainy-wok-v1.mp3` | XD Mivo / Suno V5 生成 | 非 CC0；Dash 允许本地接入例外，商用授权待核实，见下文 |

招牌、霓虹灯、亮窗、海报、血迹、牌楼彩画等图案不是下载的图片，而是加载时用 Canvas 现画的（`src/chinatown/signs.js`）；
店铺里的包装、菜单、字画（`shopfit.js`）、街市的货品与档口牌（`market.js`）、车牌和车身文字（`vehicles.js`）也是同样画出来的。
店名均为按粤式习惯虚构的名字，没有使用现实中的商号；例外是 `src/chinatown/eggs.js` 里的彩蛋，引用了心动、TapTap 和 Cindy 的名字以及心动旗下游戏名（只有文字和简单图形，没有使用官方 Logo 图片）。

## 《雨夜开镬》配乐（生成素材，授权待核实）

- 2026-11-13 经 XD Mivo 的 `audio.suno` / Suno V5 生成。任务 `6af6b6156f6eb2da41428978`，第一版素材 `6af6b644d41397e0bc8a0fad`，
  Suno ID `a7fea054-10a5-4f8b-9738-cbda62a04d3d`。文件原样保存：2,393,874 bytes、48 kHz 双声道 MP3、102.432 秒。
  SHA-256：`6828a5d7d6f3bdcd6b01306606dbc35e3edbd4427ef3024465213f5469c3c455`。
- 创作描述：港式僵尸片＋电子 breakbeat，132 BPM、小调五声音阶动机、切分鼓组、克制低音、少量锣 / 木鱼 / 堂鼓与诡异拨弦；
  无人声、无枪声或雨声音效，短引子后进入战斗律动，中段减鼓再回归。不指定模仿歌曲或艺术家。生成服务返回两版，Dash 选第一版；第二版没有入库。
- 这不是 CC0 / OFL 素材。Dash 明确允许作为例外先本地接入，但这不等于确认商用许可。
  [Suno 官方商用说明](https://help.suno.com/en/articles/9601985) 与 [付费订阅权利说明](https://help.suno.com/en/articles/9601665)
  将商用权利与付费方案关联；本次 Mivo 回执没有提供其上游账号 / 授权凭据，不能据此认定取得商用授权。发布前需核实 Mivo 对该产物的授权范围。
- 播放时在内存中将末尾与开头交叉淡化 2 秒，不改磁盘源文件；实际音乐衔接听感仍待试玩。

## 《尸潮开镬》尸潮摇滚配乐（生成素材，授权待核实）

- 2026-11-13 根据「平常还是雨夜开镬这种。而尸潮来的时候更激烈更摇滚」制作，XD Mivo / `audio.suno`。
  任务 `6af6bbc86f6eb2da41428a68`，素材 `6af6bbf94593423a7fe66d84`，Suno ID `e1a575cf-cde4-4222-84d9-312185782ec8`。
  源 MP3 原样保存：4,149,858 bytes；服务回报 186.72 秒。
  SHA-256：`a9fde74429a481dcda1d49b946271f8a8efa003742bd01b159e685e12d41ec8e`。
- 描述要求：132 BPM、电子 breakbeat 融合硬摇滚，强真鼓、失真电吉他切分 riff、低音吉他与密集十六分音符，
  暗色小调五声音阶，少量中式锣与木鱼，起头即高强度、无长铺垫，无人声。不模仿特定歌曲或艺术家。
  Dash 已试听选定第一版；游戏中与日常曲的衔接和混音仍待试玩，不保证严格对拍。
- 服务返回两版，Dash 确认第一版，本地已接入；第二版只交付媒体库。不是 CC0，商用授权同上待核实；没有发布许可凭据，不推送 / 发布。
- 之前试做的安静曲《镬影雨巷》已被否决并移出游戏资源，不再随构建发布。

## Poly Haven 贴图与模型（CC0）

清单在 `scripts/assets/chinatown-manifest.json`，键是游戏里用的名字，`id` 是 Poly Haven 的素材 ID。

```sh
# 需要 @gltf-transform/{core,extensions,functions}、meshoptimizer、sharp
node scripts/assets/fetch-polyhaven.mjs <缓存目录>
node scripts/assets/build-chinatown.mjs <缓存目录> public/assets
```

- 贴图：主要墙面保留 1K 的颜色与法线，其余 512；AO/粗糙度/金属度合并图再减半，全部存为 WebP。
- 模型：焊接顶点后按清单里的面数预算简化，贴图压到 256–512 并转 WebP，每个模型一个 GLB。
- `public/assets/props/index.json` 记录每个模型的部件名和尺寸，摆放代码据此挑选变体。

## 僵尸角色与动作（Mixamo）

四个角色（`romero`、`girl`、`cop`、`soldier`）和九段动作来自 Adobe Mixamo 的「Scary Zombie Pack」等内容，
原始 FBX 取自三个公开的 GitHub 仓库（`Qwerty-coding/Last-Light`、`lauramurinova/ZombieDefense`、`baponkar/zombie-ai`），
用 FBX2glTF 转换后由 `scripts/assets/build-zombies.mjs` 处理：统一骨骼名、材质改为普通 PBR、贴图压到 2K WebP、动作单独成文件。

另有七个角色，开局时不下载。其中五个已经进了套餐（`src/chinatown/runtune.js` 的 `RUN.bodies`：`mutant` 关底、`skeletonzombie` 和 `yaku`
两种精英、`parasite` 胀尸、`prisoner` 成群的快尸），一局开始后才下载，贴图按画质缩小（`low` 和 `medium` 都是 1024，更高用原图）；`whiteclown` 和 `pumpkinhulk` 风格和唐人街不搭，
只留在靶场（`/?range=1` 的「模型」）里。同样是 Mixamo 的角色，
同样的转换流程，动作沿用上面那九段（`prisoner` 和 `mutant` 没有手指骨骼，手指不动）：

| 文件 | Mixamo 角色 | 原始 FBX 取自 |
| --- | --- | --- |
| `yaku.glb` | Yaku J Ignite | `AxelCortes162/Vampiro` |
| `prisoner.glb` | Prisoner B Styperek | `LihinduPerera/Fractured-UnityHDRP` |
| `whiteclown.glb` | Whiteclown N Hallin | `MiloGame/CodeName-Prototype` |
| `parasite.glb` | Parasite L Starkie | `emmmmzc/Table-Archery-by-Proteus-Team` |
| `skeletonzombie.glb` | Skeletonzombie T Avelange | `Terracota1/TowerDefense` |
| `pumpkinhulk.glb` | Pumpkinhulk L Shaw | `chacafdz/The-Hollow-Protocol` |
| `mutant.glb` | Mutant | `GICF-E/Nightmare` |

Mixamo 的角色和动作可以免费用于个人和商业项目，但条款不允许把原始素材单独再分发，也不是 CC0。
这和「新增素材只用 CC0 / OFL」的规则不符：这七个是为了试用才接进来的，和原有四个一样属于公开发布前要处理的问题。
**如果要公开发布这个项目，建议用自己的 Adobe 账号从 mixamo.com 重新下载同名角色与动作再跑一遍转换脚本**，
或者换成明确可再分发的角色（例如 Quaternius、Kenney 的 CC0 角色）。

## 字体（SIL OFL 1.1）

`ct-serif.woff2`（Noto Serif TC Black）和 `ct-kai.woff2`（LXGW WenKai TC Bold）只保留了招牌、货品和告示里实际出现的汉字和可打印 ASCII 字符，
分别约 105 KB 和 155 KB。许可全文在同目录的 `OFL-*.txt`。新增招牌文字后需要重新生成：

```sh
# 需要 fonttools 和 brotli
python scripts/assets/build-fonts.py <放有两个原始 TTF 的目录> public/assets/fonts
```

脚本会扫描 `src/chinatown/*.js` 里的汉字以及 `src/game.js` 中路面喷字用到的字。字体加载失败时回退到系统中文字体。

### 界面字体

| 文件 | 字体 | 用途 |
| --- | --- | --- |
| `gm-sans.woff2` | Inter（可变字重 400–800） | 界面正文、数字、按钮的拉丁字符 |
| `gm-display.woff2` | Noto Serif Display（字重 500–900、字宽 62.5–100%） | 标题、弹药与生命数字、评价 |
| `gm-sans-{sc,tc,jp}.woff2` | Noto Sans SC / TC / JP | 对应语言的界面正文 |
| `gm-serif-{sc,tc,jp}.woff2` | Noto Serif SC / TC / JP（字重 600–900） | 对应语言的标题 |
| `gm-logo.woff2` | Noto Serif TC Black | 四字方印「行屍走鑊」 |
| `gm-names.woff2` | Noto Sans SC | 语言选择器里的「简体中文 / 繁體中文 / 日本語」 |

中日文文件只保留各自语言包（`src/i18n/locales/*.js`）里出现的字，每个 100–160 KB；只有当前语言的文件会被下载。
**改动或新增任何界面文案后都要重新生成**，否则新字会回退到系统字体：

```sh
# 需要 fonttools 和 brotli；源文件来自 github.com/google/fonts 的 ofl/ 目录，脚本开头列出了具体路径
python scripts/assets/build-ui-fonts.py <放有原始可变字体 TTF 的目录>
```

`world/` 下是原版用于在场景贴图上写字（路面喷字、警示牌、枪身刻字）的三款拉丁字体，原先从 Google Fonts 在线加载，
现改为本地文件，取自 Google Fonts 提供的 latin 子集。各目录都附有许可全文 `OFL-*.txt`。

## 仍然由代码生成的部分

天空、雨、地面水洼、武器模型、枪声与脚步等沿用原版的程序化实现；警报器、城市环境声、僵尸脚步和击中声也是运行时合成的；建筑、牌楼、庙宇、街市、灯笼、
路灯、电线等几何体由 `src/chinatown/` 下的模块用基础形体搭建，没有使用外部建筑模型。街上和远景里的车辆（两辆盖着篷布的除外）、
店铺内景和街市里的货品同样是代码生成的，没有使用外部模型或照片。

## 外部游戏参考档案（未接入发布版本）

以下是用户指定保留的内部研究材料，放在 `upstream/`，不被 Vite 入口或 `public/` 引用，不属于已经获准用于发布游戏的素材。新增档案不改变上述正式素材许可要求。

| 档案 | 来源 | 收录内容 | 许可状态 |
| --- | --- | --- | --- |
| [CORDON 9](../upstream/cordon9/README.md) | https://cordon9.pplx.app/ | 原始 HTML、82 个拆分代码模块、模型/场景预览与合成音效 WAV | 未声明游戏复用许可证；仅作参考，不得将内嵌 Three.js 的 MIT 许可当成整个游戏授权 |
| [SUBLEVEL 07](../upstream/sublevel07/README.md) | https://github.com/wquguru/fable52-fps-repro | 游戏原件、材质/模型/音效实验、预览 | MIT，已保留原始 LICENSE；实际接入前仍按项目素材政策单独审查 |
| [GOLDEN HOUR](../upstream/golden-hour/README.md) | https://claude.ai/artifact/6N9gzgYJDa925a1tVxps2f | 发布包、本地运行入口、可读代码、分类索引与大堂预览 | 未确认游戏复用许可证，仅作参考 |

各目录的 `provenance.json` 记录下载日期、来源、原件哈希以及派生内容说明。完整导航见 [参考档案目录](../upstream/README.md)。
