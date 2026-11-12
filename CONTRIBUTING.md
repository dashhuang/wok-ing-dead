# 开发流程

`main` 就是线上版本：Vercel 接了这个仓库，`main` 上的每个提交都会自动部署到 https://wok-ing-dead.vercel.app 。
所以改动一律走分支和 Pull Request，CI 和预览都通过后再合并。

## 一次改动的完整流程

1. **从最新的 `main` 拉分支**

   ```sh
   git switch main && git pull
   git switch -c fix/pause-menu-overlap
   ```

   分支名用 `feat/`（新内容、新玩法）、`fix/`（修问题）、`perf/`（性能）、`docs/`、`chore/`（工具、依赖、仓库维护）开头。

   同时有几件事在做（或几个 AI 会话同时在改）时，每件事用一个独立的 worktree，不要在同一个目录里同时改：

   ```sh
   git worktree add ../Saltline-pause-menu -b fix/pause-menu-overlap origin/main
   ```

2. **开发和自查**

   ```sh
   npm run dev        # 开发服务器 http://127.0.0.1:5173/
   npm run check      # 语法 + 格式（npm run format 自动修格式）
   npm run build      # 生产构建
   npm run test:e2e   # 真实点击冒烟测试，需要先 build；首次运行前 npx playwright install chromium
   npm run verify     # 以上三步一起跑
   ```

   `npm ci` 时会自动启用 `.githooks/`：`git push` 前先跑 `npm run check`，并拒绝直接推送到 `main`。

3. **提交**

   提交信息用英文祈使句，首字母大写，说清楚玩家或开发者能看到的变化，例如
   `Give the menus a wok-kitchen identity of their own`、`Fix touch movement on iPhone`。
   需要解释原因时空一行写正文。一个提交只做一件事；只 `git add` 自己改的文件。

4. **开 Pull Request**

   ```sh
   git push -u origin HEAD
   gh pr create --fill
   ```

   - CI 会跑两项：「Check and build」（语法、格式、生产构建，在 GitHub 的机器上）和「Smoke test」（用真实鼠标点击走标题 → 开镬 → 暂停 → 继续 → 死亡 → 重试，
     并检查手机竖屏、横屏下标题页按钮没有被遮挡，约 5 分钟；
     之后在同一台机器上跑武器试验场的测试 `npm run arsenal:test`，约 2 分钟）。冒烟测试要约 10 GB 内存，GitHub 给私有仓库的机器只有 7 GB，
     所以它跑在 Dash 的 Mac Studio 上的自托管 runner（`mac-studio`，安装在 `~/actions-runner/wok-ing-dead`，
     作为登录项服务运行，登录后自动上线）。runner 离线时这一项会排队等待，超过 24 小时会失败，需要在 PR 页面点 Re-run。
   - Vercel 会在 PR 里贴出预览地址。在预览地址上实际玩一遍受影响的部分，再按模板勾选验证项。
   - 画面、界面、特效改动附上截图或录屏。

5. **合并**

   两项检查都通过后用 **Squash and merge** 合并，并删除分支。合并后 Vercel 自动部署生产环境，
   用 `npx vercel@latest ls wok-ing-dead` 确认部署成功，再打开线上地址看一眼。

## 出了问题怎么回滚

- 最快：在 Vercel 控制台把上一个正常的部署 Promote 回生产（或 `npx vercel@latest rollback`）。
- 然后在 GitHub 上对出问题的 PR 点 Revert，走同样的 PR 流程把 `main` 修正回来。

## 几条约定

- `upstream/` 是提取时的原件，不要修改。
- 界面文案只改 `src/i18n/locales/`，四种语言一起改，然后重新生成界面字体子集（见 [素材来源与许可](docs/assets.md#界面字体)）。
- 新增外部素材（贴图、模型、音效、字体）要在 [docs/assets.md](docs/assets.md) 写明来源和许可，只用 CC0 或 OFL 这类允许再分发的素材。
- 依赖更新由 Dependabot 每月提 PR。`three` 不会自动升级：它的附加模块要和 `src/game.js` 内嵌的 Three.js r180 保持一致。
- 构建产物（`dist/`、`dist-single/`）、测试报告不进仓库。
