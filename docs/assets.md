# 素材来源与许可

唐人街版本在原版「全部由代码生成」的基础上引入了外部素材。下面列出每一类素材的来源、许可和生成方式；
重新生成所需的脚本都在 `scripts/assets/`。

## 一览

| 类别 | 位置 | 来源 | 许可 |
| --- | --- | --- | --- |
| 墙面、地面、屋瓦等 PBR 贴图（22 套） | `public/assets/textures/` | [Poly Haven](https://polyhaven.com) | CC0 |
| 街头道具模型（42 个） | `public/assets/props/` | [Poly Haven](https://polyhaven.com) | CC0 |
| 僵尸角色与动作 | `public/assets/zombies/` | Adobe Mixamo（经公开 GitHub 仓库获取） | Mixamo 使用条款，**不是 CC0**，见下文 |
| 招牌字体（子集） | `public/assets/fonts/` | Noto Serif TC、LXGW WenKai TC（Google Fonts 仓库） | SIL OFL 1.1 |
| 界面字体（子集） | `public/assets/fonts/ui/` | Inter、Noto Serif Display、Noto Sans / Serif SC·TC·JP（Google Fonts 仓库） | SIL OFL 1.1 |
| 场景贴图用的拉丁字体 | `public/assets/fonts/world/` | Big Shoulders Display、Barlow Condensed、IBM Plex Mono（Google Fonts，拉丁子集） | SIL OFL 1.1 |
| 僵尸嗓音（24 段） | `public/assets/audio/zombie/` | OpenGameArt | CC0，详见 [assets-audio.md](assets-audio.md) |

招牌、霓虹灯、亮窗、海报、血迹、牌楼彩画等图案不是下载的图片，而是加载时用 Canvas 现画的（`src/chinatown/signs.js`）；
店铺里的包装、菜单、字画（`shopfit.js`）、街市的货品与档口牌（`market.js`）、车牌和车身文字（`vehicles.js`）也是同样画出来的。
店名均为按粤式习惯虚构的名字，没有使用现实中的商号；例外是 `src/chinatown/eggs.js` 里的彩蛋，引用了心动、TapTap 和 Cindy 的名字以及心动旗下游戏名（只有文字和简单图形，没有使用官方 Logo 图片）。

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

Mixamo 的角色和动作可以免费用于个人和商业项目，但条款不允许把原始素材单独再分发，也不是 CC0。
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
