# 踩过的坑

开发中真的发生过、下次还可能再犯的问题，以及当时的解法。写新代码前扫一眼相关的几条。

## 画面与特效

- **特效亮度要在游戏靶场里看**：游戏夜街的特效乘 `ARMORY_TUNE.fxGain = 0.3`（码头再乘 `stageGain`），试验场里看着合适的亮度在游戏里几乎看不见；
  反过来，血的颜色 `BLOOD` 是按夜街定的，在试验场里显得很艳。
- **画面中间一大块黑色方块**：是本体自带的步枪模型画在眼前。开局时游戏会把自带的枪和手臂重新显示，`loadout.js` 的 `stowOwn()`
  每帧保证拿着军械库武器时把它们收起。
- **第一次拿新武器卡一下**：预热时要数“武器图层真的画了”的帧；手上的东西室内、室外各要一套着色器（`render.envWarm`）。
  查法：逐帧比较 `renderer.info.programs` 的 `cacheKey`。
- 无头软件渲染分辨率太低，看不出细小的火星。要用显卡渲染截图，用 Playwright 的 `chromium.launch({ channel: "chromium" })`，
  并注入 `tests/support/fake-pointer-lock.js`，不然系统光标会被锁定拉走。逐帧看特效用 `arsenal/tools/shots.mjs play`，或者 `openLab` 加 `lab.advance`。

## 数值

- `scripts/balance/data.mjs` 把每把武器的 `fire.knock` 当作一个数字读（用来模拟击退距离）。有一次把它改成对象，平衡报告的通关率从 91% 掉到 69%（读出 NaN）。
  所以按距离变化的击退另外起名叫 `shove`。改了数据表后如果平衡报告大幅变化，先怀疑模拟器读错了字段。
- 自动对战里打死玩家的主要是精英和关底的爪击。统计伤害来源时，用 `player:hit` 的 `fromPos` 去对僵尸的 `pos` 对象。

## 码头（第二关，暂时不用）

- 相机默认不开渲染层 2，拾取物看不见。黄昏天光下发光颜色要提亮。
- 撤离口通道里的系缆桩让导航把两米宽的通道判成死路，`docks.js` 把它标成不计入导航。
- 刷怪点里有 `type: "air"` 的点，武器箱只能放在地面可走的地方。

## 测试（现在暂停，再用时注意）

- 这台 Mac 忙的时候，无头浏览器每秒不到 1 帧：依赖“游戏内时间”的等待会拖成几分钟。测试里不要等游戏时间推进，靶场补位用现实时间。
- 改窗口尺寸后页面会停顿十几秒，紧跟着的点击要给足等待。新测试尽量共用一次页面加载，慢的测试单独 `test.setTimeout`。
- 同一个工作目录里不要同时跑 `npm run arsenal:test` 和 `npm run test:e2e`：它们共用 `test-results/`，会互相清掉临时文件，造成假失败。
- 端口被别的会话占着时（“is already used”），用 `E2E_PORT` / `ARSENAL_E2E_PORT` 换一个端口。
- Chromium 在 macOS 上真的锁定鼠标会移动系统光标，见 AGENTS.md。

## 仓库与流程

- 好几个会话同时往 `main` 推，推送前先 fetch，必要时 rebase。
- **叠放的 PR**：squash 合并底下的 PR、再删它的分支，GitHub 会把叠在上面的 PR 直接关掉。先把上面的 PR 改成指向 `main`，再合并底下的。
  合并前看一眼有没有别的 PR 叠在它上面，并提前告诉 Dash。
- 仓库是免费版私有仓库：分支保护和规则集的接口永远返回 403（Upgrade to GitHub Pro），`main` 没有强制保护。这一点不用处理。
- Cindy 定时任务的前置检查脚本默认落在主目录的 `scripts/schedule-checks/`，要用 `workingDir` 指到自己的 worktree。
