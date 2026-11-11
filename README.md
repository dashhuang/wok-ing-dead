# 鬼市 Ghost Market

雨夜的唐人街已经沦陷。三座疏散警报还在长鸣，把整座城的尸群引进街区——让它们闭嘴，然后冲到东端的检疫关卡。

界面支持简体中文、繁體中文、English、日本語：首次打开按浏览器语言选择，标题页右上角和「设置」里可以随时切换，
`?lang=zh-CN|zh-TW|en|ja` 可直接指定。

本项目基于从 https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp 提取的浏览器 FPS「Saltline」（下载日期 2026-11-11），
保留原版的渲染、武器、输入和任务框架，把场景从集装箱码头换成唐人街，把敌人从机器人换成僵尸，并重做了名称、界面和文案。
原版港口关卡仍可用 `?lvl=harbor` 打开。

## 开始开发

需要 Node.js 22（参见 `.nvmrc`）。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5173/ 。点击「出发」开始：WASD 移动，鼠标瞄准，左键射击，右键开镜，R 换弹，Q 切枪，
按住 E 切断警报器，Shift 冲刺，C 蹲下，Esc 暂停。浏览器需要 WebGL 2；鼠标锁定和声音需要一次真实点击。

```sh
npm run check    # JavaScript 语法和格式检查
npm run build    # 生成 dist/，包含本地调试 source map
npm run preview  # 预览构建产物
npm run format   # 格式化开发文件
npm run build:single  # 生成单文件 dist-single/ghost-market.html（约 35 MB，可直接双击打开或作为文件发送）
```

单文件版把脚本、样式、贴图、模型、音效和字体都以 base64 嵌在页面里，由页面开头的小段代码把 `assets/...` 请求转到这些内嵌数据。
所有字体都是仓库里的本地文件，构建不需要联网，页面运行时也不访问任何外部字体服务。

## 玩法

- **任务（Mission）**：切断路口、街市、关帝庙三处警报器，每切一处就会引来一波尸潮，全部切断后前往东端检疫关卡撤离。
  每切一处可在警报箱旁补充步枪弹药。
- **坚守（Holdout）**：无尽波次，波次间补给和回血，记录最高分。
- 僵尸分两类：普通行尸（部分会奔跑，打断腿后改为爬行）和体型更大的重型僵尸。爆头伤害 2.2 倍。
- 枪口下方有常亮的战术灯；红色油桶和气瓶可以引爆。

## 文件

| 路径 | 内容 |
| --- | --- |
| `index.html`、`src/main.js`、`src/style.css` | 页面、入口、界面样式（标题页、HUD、菜单、设置面板） |
| `src/i18n/` | 多语言：`index.js` 负责语言选择、文案查找、DOM 绑定和按语言加载界面字体；`locales/` 是四份语言包 |
| `src/game.js` | 原版发布包：内嵌 Three.js r180、渲染、武器、输入、HUD、任务状态机；唐人街的世界参数在其中的 `CT` 对象 |
| `src/chinatown/level.js` | 街区布局、人行道、出生点、任务目标，返回游戏要求的关卡接口 |
| `src/chinatown/buildings.js` | 商铺楼生成器：凹窗、店面、招牌、阳台、消防梯、檐顶 |
| `src/chinatown/landmarks.js` | 牌楼、街市大厅、关帝庙、检疫关卡、警报器、灯笼 |
| `src/chinatown/dressing.js` | 路灯、灯笼串、电线、车辆、摊位杂物、后巷与天井 |
| `src/chinatown/backdrop.js` | 街口之外的延伸街区、远处高楼、军车与直升机 |
| `src/chinatown/signs.js` | 用 Canvas 绘制的霓虹招牌、牌匾、橱窗、海报、血迹图集 |
| `src/chinatown/lights.js` | 局部光源调度（固定数量的点光源在所有发光体之间轮换）和枪灯 |
| `src/chinatown/kit.js` | 材质、几何批量合并、GLB 道具、碰撞的工具库 |
| `src/chinatown/zombies.js` | 僵尸：骨骼动画、寻路、感知、近战、分部位命中 |
| `src/chinatown/audio.js` | 僵尸语音、城市环境声、警报器 |
| `src/engine/three.js` | 把内嵌的 Three.js 以 `three` 的名字导出，供官方加载器使用 |
| `src/settings.js` | 设置存储 |
| `public/assets/` | 贴图、道具、僵尸、字体（`fonts/ui` 界面字体，`fonts/world` 场景贴图字体）、音效 |
| `scripts/assets/` | 素材下载与转换脚本、素材清单；`build-ui-fonts.py` 按语言包生成界面字体子集 |
| `upstream/` | 提取时的原件和来源记录，不应直接编辑 |

实现导读见 [架构与代码导航](docs/architecture.md)，素材来源和许可见 [素材来源与许可](docs/assets.md)。

## 调试

- `window.__G`：游戏上下文（player / weapon / level / enemies / game 等）。
- `window.__ready`、`window.__fatal`、`window.__errors`：初始化和运行错误。
- `window.__stats()`：渲染统计和当前游戏状态。
- `/?autostart=1&noaudio=1`：跳过标题直接进入任务，便于冒烟验证。
- `/?cam=x,y,z,lx,ly,lz`：固定相机，`&noweapon=1` 隐藏武器，方便截图检查场景。
- `/?q=low|medium|high|ultra`：指定画质档位；`/?lvl=harbor`：原版港口关卡（敌人仍是僵尸）。
- `/?bench=1`：沿镜头路径巡航并统计帧耗时。
- `/?lang=ja`：指定界面语言（不写入存储）。

后台标签页的帧率会被浏览器限制，不应把自动检查时的后台帧率当作真实性能。
设置和纪录保存在当前站点的 localStorage；为了不丢失旧存档，设置和纪录仍沿用 `saltline.*` 键名，语言选择存于 `ghostmarket.lang`。

## 说明

- 拿到的是公开发布的压缩包，没有原始工程；`src/game.js` 只恢复了排版，压缩后的变量名仍然保留。
- 生产构建首次加载约下载 28 MB（僵尸模型 12 MB，贴图与道具 13 MB，脚本约 1.8 MB，界面字体每种语言约 0.4 MB）。
  原版内嵌的旧版本（v8，约 1.9 MB）没有入口能打开，已不再加载；原件仍保存在 `upstream/`。
- 僵尸角色和动作来自 Mixamo，许可不同于其余 CC0 素材，公开发布前请阅读 [素材来源与许可](docs/assets.md)。
- 原作者的署名与原版链接放在「设置 → 关于」里；未给原游戏另行指定开源许可证。
- 新增或修改界面文案：只改 `src/i18n/locales/` 里的语言包（英文是基准，缺的键回退到英文），然后重新生成界面字体子集，
  见 [素材来源与许可](docs/assets.md#界面字体)。
