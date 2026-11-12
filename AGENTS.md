# AGENTS.md

给在这个仓库里工作的 AI 编程助手（Claude Code、Codex、Cindy 等）看的说明。人类开发者看 [README](README.md) 和 [CONTRIBUTING](CONTRIBUTING.md)。

## 项目是什么

《行尸走镬 Wok-ing Dead》：雨夜唐人街打僵尸的浏览器 FPS（Three.js + Vite，纯前端，没有后端）。
基于从 Claude artifact 提取的「Saltline」发布包改造而来，目标是 3A 品质、摆脱原版的复制感。

- 线上：https://wok-ing-dead.vercel.app ，GitHub：`dashhuang/wok-ing-dead`（私有）。
- **`main` 上的每个提交都会被 Vercel 自动部署到生产。** 小改动可以直接推 `main`，大改动走 PR（见下文工作流）。
- 文档和界面默认中文；提交信息用英文。

## 命令

```sh
npm ci                 # 安装依赖（同时启用 .githooks/）
npm run dev            # 开发服务器 http://127.0.0.1:5173/（有热重载）
npm run check          # 全仓库 JS 语法 + Prettier 格式检查
npm run format         # 自动修格式
npm run build          # 生产构建到 dist/
npm run test:e2e       # Playwright 真实点击冒烟测试（先 build；端口 5199；CI 上按需跑，见下文）
npm run verify         # check + build + test:e2e
npm run build:single   # 单文件版 dist-single/wok-ing-dead.html（约 35 MB）
npm run arsenal        # 武器试验场 http://127.0.0.1:5311/（独立于本体，没有热重载）
npm run arsenal:test   # 试验场的冒烟和真实点击测试（端口 5312；改了 arsenal/ 就跑）
```

## 代码地图

先读 [docs/architecture.md](docs/architecture.md)（两部分怎么接、初始化顺序、性能约定、原版系统入口表）。

| 路径 | 说明 |
| --- | --- |
| `src/game.js` | 反压缩后的原版发布包（含内嵌 Three.js r180）。变量名是压缩名（`ov`、`hT`、`pT`…），靠 architecture.md 的入口表和搜索字符串定位 |
| `src/chinatown/` | 唐人街关卡的全部新模块：布局、建筑、店铺、街市、车辆、招牌、灯光、僵尸、音效；套餐（肉鸽关卡）的规则 `run.js`、武器与弹药 `loadout.js`、武器轮盘 `wheel.js`、接入试验场武器的 `armory.js` / `armtargets.js`、第二关的补充 `docks.js` |
| `src/i18n/` | 语言选择和四份语言包（`locales/`，英文是基准） |
| `src/style.css` | 全部界面样式，设计变量在开头 |
| `public/assets/` | 贴图、GLB、僵尸、字体、音效（来源和许可见 docs/assets.md） |
| `scripts/` | 素材下载转换、字体子集、单文件构建、`check-syntax.mjs` |
| `tests/e2e/` | Playwright 冒烟测试 |
| `upstream/` | 提取时的原件，**只读** |
| `arsenal/` | 肉鸽武器的试验场，可单独运行；**本体直接导入它的武器、特效和战斗模块**，规则见 `arsenal/README.md` |

## 修改时的规则

- **新代码放进独立模块**（`src/chinatown/` 或新目录），`src/game.js` 里只做必要的接线；改 `game.js` 前先确认要改的是哪个原版系统。
- **不要升级 `three`**：`three/examples` 的加载器通过 `vite.config.js` 的别名跑在 `game.js` 内嵌的 r180 上。
- **界面文案**：只改 `src/i18n/locales/`，四种语言（zh-CN、zh-TW、en、ja）一起改；改完重新生成字体子集
  （`python scripts/assets/build-ui-fonts.py <字体目录>`，需要 fonttools、brotli 和 Google Fonts 源文件，见 docs/assets.md）。
  做不了就在交付时明确说「字体子集还没重建」。
- **文案语气**：菜单是唐人街炒锅餐馆的厨房双关（点单票、辣度、「开镬」「出餐！」「凉了。」）；HUD 和无线电台词保持严肃。
- **性能约定**（详见 architecture.md）：手机靠 `low` 档；世界和武器两遍渲染的灯光布局必须一致；不用 transmission 材质；
  静态网格标 `userData.staticShadow`，之后改动要调 `G.render.invalidateStaticShadows()`。
- **存档键不改名**：设置和纪录用 `saltline.*`，语言用 `wokingdead.lang`。
- **素材**：新增外部素材要在 docs/assets.md 写清来源和许可，只用 CC0 / OFL。僵尸来自 Mixamo（非 CC0），是已知的待解决问题。
- **arsenal/** 可以单独运行，但本体通过 `src/chinatown/armory.js` 导入它的武器模型、特效、战斗和双手模块（试验场不反过来引用本体）。
  改这些模块的接口（`createCombat(lab)`、`lab` 舞台对象、`kit/hands.js`、`data/weapons.js` 的字段）要同时跑本体的 `npm run test:e2e`。
  `docs/weapons-roguelike.md` 由 `node arsenal/scripts/design-doc.mjs` 生成，改数据不改文档。
- **套餐的数值**只改 `src/chinatown/run.js` 开头的 `RUN` 和 `loadout.js` 的 `AMMO` / `ARMS`。用户定下的四条不要动：
  弹药必须捡、弹药分四种、武器不限数量、红包只升手上那把。

## 工作流

1. 从最新的 `origin/main` 拉分支（`feat/`、`fix/`、`perf/`、`docs/`、`chore/`）。可能有别的会话同时在改这个仓库：
   **用 `git worktree add ../Saltline-<任务> -b <分支> origin/main` 单独开目录**，不要切换主目录的分支，也不要动别人未提交的文件。
2. 提交只 `git add` 自己改的文件；提交信息是英文祈使句、首字母大写、写效果（看 `git log`）。
   AI 协助的提交加上要求的署名 trailer。
3. 用户要求时才 push。用户说直接推 / 直接发布时，在最新的 `main` 上提交并推送（推上去立即上线）；没说清楚的，
   小改动（文案、数值、小修复、文档）问一句，大改动（新玩法、菜单或启动流程、多文件重构）默认开 PR（`gh pr create --fill`）。
   pre-push 钩子会跑 `npm run check`，不要用 `--no-verify` 绕过。
   CI 每次只跑检查和构建；冒烟测试按需跑：改了菜单、标题页、启动或一局的流程时给 PR 加 `e2e` 标签（`gh pr edit <号> --add-label e2e`），
   或 `gh workflow run smoke.yml --ref <分支>`。
4. 合并用 Squash and merge；合并后用 `npx vercel@latest ls wok-ing-dead` 确认生产部署成功。

## 验证（交付前必须做）

- `npm run check`、`npm run build` 必须通过。自动化冒烟测试（`npm run test:e2e`）现阶段不是每次必跑：改动大（菜单、标题页、启动或一局的流程）
  或用户要求时才跑，在本机或按上文在 CI 上跑。
- **必须用真实鼠标点击和按键走入口**，不能只靠 `?autostart=1` 或直接调用 `G.game.start()`——曾经标题页按钮被透明元素挡住，
  脚本直达的检查全部通过，用户一上手就点不动。界面改动走一遍：标题页 → 开镬 → 选主菜 → 数字键换武器 → Esc 暂停 → 设置里换语言 → 继续 →
  死亡重试 → 通关再开 → 换分店，
  桌面、手机竖屏、手机横屏各看一次，确认按钮没有被别的元素盖住。
- 手动验证用 `npm run build` + `npx vite preview --port 5185` 之类的独立端口，不要用开发服务器：别的会话改文件会触发热重载打断测试。
  端口约定：dev 5173、arsenal 5311（测试 5312）、e2e 5199；CI 在同一台 Mac 上跑测试时用 5399 / 5412，不会和本地冲突。
- 后台标签页会被浏览器限帧，自动化里的后台帧率不代表真实性能；性能对比用 `?bench=1`、`?q=low`。
- 调试钩子：`window.__G`（`game.state`、`player`、`game.debugCut()`）、`__ready`、`__fatal`、`__errors`、`__stats()`；
  `?cam=x,y,z,lx,ly,lz&noweapon=1` 固定机位截图，`?lang=` 指定语言。完整列表见 README「调试」。
- 交付时如实说明验证了什么、没验证什么（例如声音没人实际听过、字体子集没重建）。
