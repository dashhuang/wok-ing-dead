# AGENTS.md

给在这个仓库里工作的 AI 编程助手（Claude Code、Codex、Cindy 等）看的说明。人类开发者看 [README](README.md) 和 [CONTRIBUTING](CONTRIBUTING.md)。

## 项目是什么

《行尸走镬 Wok-ing Dead》：雨夜唐人街打僵尸的浏览器 FPS（Three.js + Vite，玩法纯前端；游玩日志由 Vercel Functions + Neon 保存，见 docs/telemetry.md）。
基于从 Claude artifact 提取的「Saltline」发布包改造而来，目标是 3A 品质、摆脱原版的复制感。

- 线上：https://wok-ing-dead.vercel.app ，GitHub：`dashhuang/wok-ing-dead`（私有）。
- **`main` 上的每个提交都会被 Vercel 自动部署到生产。** 小改动可以直接推 `main`，大改动走 PR（见下文工作流）。
- 文档和界面默认中文；提交信息用英文。

## 命令

```sh
npm ci                 # 安装依赖（同时启用 .githooks/：推送前自动跑 npm run check）
npm run dev            # 开发服务器 http://127.0.0.1:5173/（有热重载）
npm run check          # 全仓库 JS 语法 + Prettier 格式检查 + 数值护栏（见 docs/balance.md）
npm run balance        # 改了数值后重新生成 docs/balance-report.md（不是最新的话 check 会失败）
npm run format         # 自动修格式
npm run build          # 生产构建到 dist/
npm test               # 不开浏览器的测试：僵尸导航和游玩日志（几秒）
npm run verify         # check + build + npm test
npm run test:e2e       # 浏览器里跑游戏的冒烟测试（暂停使用：只在用户要求时跑；先 build；端口 5199）
npm run build:single   # 单文件版 dist-single/wok-ing-dead.html（约 35 MB）
npm run arsenal        # 武器试验场 http://127.0.0.1:5311/（独立于本体，没有热重载）
npm run arsenal:test   # 浏览器里跑试验场的测试（暂停使用：只在用户要求时跑；端口 5312）
```

## 项目知识写进仓库

**跟这个游戏有关的信息一律写进本仓库，不写进 AI 助手的个人记忆**（Dash 2026-11-13 的要求）。仓库是唯一的事实来源，换一个会话、
换一个助手都从这里读：

- [docs/decisions.md](docs/decisions.md)：Dash 拍板的方向与偏好（美术、界面、玩法、武器、流程），带日期和原话。**改相关内容前必读**，想推翻先问。
- [docs/status.md](docs/status.md)：各功能做到哪一步、哪些没人上手验证、已知瑕疵、等 Dash 决定的事。
- [docs/pitfalls.md](docs/pitfalls.md)：踩过的坑和解法。
- 机制和代码怎么接看 [docs/architecture.md](docs/architecture.md)，数值看 [docs/balance.md](docs/balance.md)，素材和许可看 [docs/assets.md](docs/assets.md)。

Dash 定了新的方向、某件事做完或留下没验证的部分、踩到值得记的坑，就在同一次改动里更新对应文档；过时的条目直接改掉或删掉。

## 代码地图

先读 [docs/architecture.md](docs/architecture.md)（两部分怎么接、初始化顺序、性能约定、原版系统入口表）。

| 路径 | 说明 |
| --- | --- |
| `src/game.js` | 反压缩后的原版发布包（含内嵌 Three.js r180）。变量名是压缩名（`ov`、`hT`、`pT`…），靠 architecture.md 的入口表和搜索字符串定位 |
| `src/chinatown/` | 唐人街关卡的全部新模块：布局、建筑、店铺、街市、车辆、招牌、灯光、僵尸、音效；套餐（肉鸽关卡）的规则 `run.js`、纯规则 `runflow.js` 和数值 `runtune.js`、武器与弹药 `loadout.js`、武器轮盘 `wheel.js`、僵尸数值 `zombietune.js`、接入试验场武器的 `armory.js` / `armtargets.js`、首页 / 靶场 / 陈列馆之间跳转的地址 `doors.js` |
| `src/telemetry/`、`api/`、`server/telemetry/` | 游玩日志客户端、Vercel 接口与校验/存储；数据库迁移和查询脚本在 `scripts/telemetry/`，日志测试用 `npm run test:telemetry` |
| `src/i18n/` | 语言选择和四份语言包（`locales/`，英文是基准） |
| `src/style.css` | 全部界面样式，设计变量在开头 |
| `public/assets/` | 贴图、GLB、僵尸、字体、音效（来源和许可见 docs/assets.md） |
| `scripts/balance/` | 数值工具：整局模拟器、护栏、报告生成，用法见 docs/balance.md |
| `scripts/` | 素材下载转换、字体子集、单文件构建、`check-syntax.mjs` |
| `tests/e2e/` | Playwright 冒烟测试 |
| `upstream/` | 提取时的原件，**只读** |
| `arsenal/` | 肉鸽武器的试验场，可单独运行；**本体直接导入它的武器、特效和战斗模块，它读本体的数值表**，两边跑同一份规则，见 `arsenal/README.md` |

## 修改时的规则

- **新代码放进独立模块**（`src/chinatown/` 或新目录），`src/game.js` 里只做必要的接线；改 `game.js` 前先确认要改的是哪个原版系统。
- **不要升级 `three`**：`three/examples` 的加载器通过 `vite.config.js` 的别名跑在 `game.js` 内嵌的 r180 上。
- **界面文案**：只改 `src/i18n/locales/`，四种语言（zh-CN、zh-TW、en、ja）一起改；改完重新生成字体子集
  （`python scripts/assets/build-ui-fonts.py <字体目录>`，需要 fonttools、brotli 和 Google Fonts 源文件，见 docs/assets.md）。
  做不了就在交付时明确说「字体子集还没重建」。
- **文案语气**：菜单是唐人街炒锅餐馆的厨房双关（点单票、辣度、「开镬」「出餐！」「凉了。」）；HUD 和无线电台词保持严肃。
  例外是炒菜那一行提示和它的弹出提示（`run.cook.*`、糊了和烧焦的 `run.toast.*` / `run.dish.*`）：用后厨喊话的口气，不报「1/3」这类计数。
- **性能约定**（详见 architecture.md）：手机靠 `low` 档；世界和武器两遍渲染的灯光布局必须一致；不用 transmission 材质；
  静态网格标 `userData.staticShadow`，之后改动要调 `G.render.invalidateStaticShadows()`。
- **存档键不改名**：设置和纪录用 `saltline.*`，语言用 `wokingdead.lang`。
- **素材**：新增外部素材要在 docs/assets.md 写清来源和许可，只用 CC0 / OFL。僵尸来自 Mixamo（非 CC0），是已知的待解决问题。
- **试验场和本体是同一份规则**（对照表在 docs/architecture.md「试验场和本体共用的规则」）。本体通过 `src/chinatown/armory.js`
  导入 `arsenal/` 的武器模型、特效、战斗控制器和双手；伤害、四种状态、反应和附魔调料的规则只有一份，在 `arsenal/src/combat/status.js`；
  试验场读本体的四张纯数据表：`src/chinatown/runtune.js`、`loadout.js`（`AMMO` / `ARMS`）、`zombietune.js`，
  以及本体两把枪（LK-9、LK-4）的 `stockguns.js`（`src/game.js` 也读它；测试台用替身模型按它开火，只为把它们放进同一场测量）。
  - **靶场在游戏里**：`/?range=1`（`src/chinatown/range.js`），是关掉时间线的套餐加一块调试面板，街道、僵尸、画面都是真的。
    调武器手感、调料、状态、僵尸数值、特效亮度都在这里做；面板状态记在地址里，开发服务器存盘刷新后回到同一个场面，
    「数值」一栏可以边玩边改共用数值表，再用「复制改动」把结果写回文件。面板是调试工具：只有中文、用系统字体、不进语言包。
    **陈列馆也在游戏里**：`/gallery/` 是试验场的展柜，`npm run build` 时自动生成进 `dist/gallery/`（`vite.config.js` 的插件调
    `arsenal/scripts/showcase.mjs`）；首页顶栏有两个入口，三个页面互相跳转的地址在 `src/chinatown/doors.js`。
    试验场（`arsenal/`）只用来看模型和握法；它里面的「测试台」（`?mode=fp`）是给自动测试和测量脚本用的简化巷子，不要拿它调手感。
  - **不要在任何一边再写一份规则或数字**。测试台缺什么，就把本体那部分抽成两边共用的代码，而不是在 `arsenal/` 里照抄。
  - 这几张表所在的文件不能导入游戏对象或 DOM（试验场和 node 脚本都要能直接导入）。试验场不引用 `src/game.js`。
  - 改 `arsenal/src/combat/`、`arsenal/src/data/` 或这几张表的结构、或改接口（`createCombat(lab)`、`lab` 舞台对象、`createStatus(host)`、
    `kit/hands.js`、`data/weapons.js` 的字段）时，浏览器测试（`npm run arsenal:test`、`npm run test:e2e`）暂停使用，交付时说明“没跑浏览器测试”。
  - 武器基础形态的伤害、弹丸数、射程、溅射、弱点倍率、挥砍范围只写在 `arsenal/src/data/weapons.js` 的 `fire` 里，`behaviours.js` 读它（`F.<武器>`），
    不要在 `behaviours.js` 里再写一遍。射速、弹匣、换弹时间写在 `behaviours.js` 的 `spec()` 里，数据里的那份由 `npm run check` 核对。
    岔路说明文字里的数字是手写的，改岔路的数值时一起改。
  - `docs/weapons-roguelike.md` 由 `node arsenal/scripts/design-doc.mjs` 生成，改数据不改文档；改了武器数据或这几张表之后重新生成。
- **套餐的数值**只改 `src/chinatown/runtune.js` 的 `RUN` 和 `loadout.js` 的 `AMMO` / `ARMS`；僵尸的数值改 `zombietune.js`；
  LK-9、LK-4 的伤害、射速、弹匣、换弹时间、散布改 `stockguns.js`（换弹时间连着本体的换弹动画，改了要重新对动画）；
  每级伤害倍率改 `arsenal/src/data/levels.js`；状态和反应的数字改 `arsenal/src/data/status.js`；
  后坐力、镜头上抬、散布扩张、近战顿挫这些手感改 `arsenal/src/data/feel.js`（`node arsenal/scripts/feel-report.mjs` 看换算后的幅度）。用户定下的四条不要动：
  弹药必须捡、弹药分四种、武器不限数量、红包只升手上那把。
- **调数值看 [docs/balance.md](docs/balance.md)**：现在只调微辣（中辣和变态辣在菜单上锁着，`src/settings.js` 的 `openDifficulties`）。
  改了上面任何一张数值表或 `runflow.js` 的规则，运行 `npm run balance` 并把 `docs/balance-report.md` 一起提交，
  否则 `npm run check` 不过。目标写成了护栏（`scripts/balance/guards.mjs`）；达到了哪条，就在那次改动里把它启用。
  **武器对同一条标准线**（docs/balance.md「武器的统一标准」，LK-9、LK-4 也在内）：改了武器的伤害、射速、弹匣或岔路的效果，
  先重新实测（`node arsenal/tools/balance.mjs --seconds 120 --write`，约 2 分钟，开的是不显示窗口的试验场测试台，不是游戏），
  再 `npm run balance` 和 `node arsenal/scripts/design-doc.mjs`；出了目标带的形态护栏会拦。

## 工作流

1. **开工前先 `git fetch origin`**，再从刚拉下来的 `origin/main` 拉分支（`feat/`、`fix/`、`perf/`、`docs/`、`chore/`）。
   不 fetch 的话，`origin/main` 只是上次拉取时的样子，可能已经落后好几个提交。可能有别的会话同时在改这个仓库：
   **用 `git worktree add ../Saltline-<任务> -b <分支> origin/main` 单独开目录**，不要切换主目录的分支，也不要动别人未提交的文件。
   主目录 `~/Code/Saltline` 只当干净的基准，由 Cindy 定时任务每小时跑 `scripts/sync-main-folder.sh` 快进到最新 `main`（有未提交改动或本地提交时不动它）；不要在主目录里改东西，开工以 fetch 下来的 `origin/main` 为准。
   AGENTS.md 和 docs/ 也以最新的 `origin/main` 为准，在旧分支上读到的可能是旧规则。
2. **推送或开 PR 前再 `git fetch origin`**，把最新的 `origin/main` 合进自己的分支（`git merge origin/main`；还没推过的分支也可以 rebase），
   解决冲突后重跑 `npm run verify`。直接推 `main` 时同样先 fetch 再 rebase。
   提交只 `git add` 自己改的文件；提交信息是英文祈使句、首字母大写、写效果（看 `git log`）。
   AI 协助的提交加上要求的署名 trailer。
3. 用户要求时才 push。用户说直接推 / 直接发布时，在最新的 `main` 上提交并推送（推上去立即上线）；没说清楚的，
   小改动（文案、数值、小修复、文档）问一句，大改动（新玩法、菜单或启动流程、多文件重构）默认开 PR（`gh pr create --fill`）。
   pre-push 钩子和 CI 都跑 `npm run check`（CI 再跑构建），不过就推不上去；不要用 `--no-verify` 绕过。
   浏览器测试不在 CI 里，本机也暂时不跑（见下文「验证」）。
4. 合并用 Squash and merge；合并后用 `npx vercel@latest ls wok-ing-dead` 确认生产部署成功。
   **自己发的 PR，检查没问题就自己合并**，不用再问：条件是 CI 全绿、没有未解决的评审线程、可以干净合并、head 没变。
   检查失败或有需要 Dash 拍板的产品问题时不要合并；别人发的 PR 仍要 Dash 授权。合并前看有没有别的 PR 叠在它上面（见 docs/pitfalls.md）。
5. 修瞄准偏移、特效、手感、数值微调这类小问题，**不新增长期保留的自动测试**，也不在文档里登记测试（已有的不删）。

## 验证（交付前必须做）

- **现阶段的验证：`npm run check`、`npm run build`、`npm test` 通过即可**（`npm run verify` 一次跑完，约半分钟）。
- **暂时不要在浏览器里跑游戏**（用户 2026-11-13 的决定）：不跑 `npm run test:e2e`、`npm run arsenal:test`，也不开浏览器手动点。
  游戏由用户自己在 Vercel 预览地址或线上实际玩。交付时说明“没有在浏览器里验证”，并写出用户试玩时该重点看哪里。
- 用户明确要求在浏览器里验证时，按下面做：用真实鼠标点击和按键走入口，不能只靠 `?autostart=1` 或直接调用 `G.game.start()`
  （曾经标题页按钮被透明元素挡住，脚本直达的检查全部通过，用户一上手就点不动）。界面改动走一遍：标题页 → 开镬 → 选主菜 → 数字键换武器 →
  Esc 暂停 → 设置里换语言 → 继续 → 死亡重试 → 通关再开，桌面、手机竖屏、手机横屏各看一次。
- 手动验证用 `npm run build` + `npx vite preview --port 5185` 之类的独立端口，不要用开发服务器：别的会话改文件会触发热重载打断测试。
  端口约定：dev 5173、arsenal 5311（测试 5312）、e2e 5199。
- **这台 Mac 有人在用：浏览器自动化不能真的锁定鼠标。** Chromium 在 macOS 上执行 `requestPointerLock()` 会移动系统光标（无头模式也会），
  用户的鼠标会乱跳。用 Playwright 默认的无头浏览器（headless shell，锁定会失败，不影响光标），或在页面里注入
  `tests/support/fake-pointer-lock.js`（`page.addInitScript({ path })`，试验场的测试已经这样做）；不要用系统 Chrome 开有窗口的浏览器做验证。
  需要真实锁定的测试只在隔离的机器上跑（Linux 虚拟机或容器，`REAL_POINTER_LOCK=1`）。
- 后台标签页会被浏览器限帧，自动化里的后台帧率不代表真实性能；性能对比用 `?bench=1`、`?q=low`。
- 调试钩子：`window.__G`（`game.state`、`player`、`game.debugCut()`）、`__ready`、`__fatal`、`__errors`、`__stats()`；
  `?cam=x,y,z,lx,ly,lz&noweapon=1` 固定机位截图，`?lang=` 指定语言。完整列表见 README「调试」。
- 交付时如实说明验证了什么、没验证什么（例如声音没人实际听过、字体子集没重建）。
