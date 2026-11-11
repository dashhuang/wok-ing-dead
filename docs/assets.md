# 素材来源与许可

唐人街版本在原版「全部由代码生成」的基础上引入了外部素材。下面列出每一类素材的来源、许可和生成方式；
重新生成所需的脚本都在 `scripts/assets/`。

## 一览

| 类别 | 位置 | 来源 | 许可 |
| --- | --- | --- | --- |
| 墙面、地面、屋瓦等 PBR 贴图（22 套） | `public/assets/textures/` | [Poly Haven](https://polyhaven.com) | CC0 |
| 街头道具模型（43 个） | `public/assets/props/` | [Poly Haven](https://polyhaven.com) | CC0 |
| 僵尸角色与动作 | `public/assets/zombies/` | Adobe Mixamo（经公开 GitHub 仓库获取） | Mixamo 使用条款，**不是 CC0**，见下文 |
| 招牌字体（子集） | `public/assets/fonts/` | Noto Serif TC、LXGW WenKai TC（Google Fonts 仓库） | SIL OFL 1.1 |
| 僵尸嗓音（24 段） | `public/assets/audio/zombie/` | OpenGameArt | CC0，详见 [assets-audio.md](assets-audio.md) |

招牌、霓虹灯、橱窗、海报、血迹、牌楼彩画等图案不是下载的图片，而是加载时用 Canvas 现画的（`src/chinatown/signs.js`）。
店名均为按粤式习惯虚构的名字，没有使用现实中的商号。

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

`ct-serif.woff2`（Noto Serif TC Black）和 `ct-kai.woff2`（LXGW WenKai TC Bold）只保留了招牌里实际出现的汉字，
各几十 KB。许可全文在同目录的 `OFL-*.txt`。新增招牌文字后需要重新生成：

```sh
# 需要 fonttools 和 brotli
python scripts/assets/build-fonts.py <放有两个原始 TTF 的目录> public/assets/fonts
```

脚本会扫描 `src/chinatown/*.js` 里的汉字以及 `src/game.js` 中路面喷字用到的字。字体加载失败时回退到系统中文字体。

## 仍然由代码生成的部分

天空、雨、地面水洼、武器模型、枪声与脚步等沿用原版的程序化实现；警报器、城市环境声、僵尸脚步和击中声也是运行时合成的；建筑、牌楼、庙宇、街市、灯笼、
路灯、电线、军车等几何体由 `src/chinatown/` 下的模块用基础形体搭建，没有使用外部建筑模型。
