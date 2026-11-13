# 开发流程

`main` 就是线上版本：Vercel 接了这个仓库，`main` 上的每个提交都会自动部署到 https://wok-ing-dead.vercel.app 。

有两种发布方式，按改动大小选：

- **小改动直接推 `main`**：改文案、调数值、修小问题、改文档。推上去就上线。
- **大改动走 Pull Request**：新玩法、改菜单或启动流程、动很多文件。好处是有 Vercel 预览地址可以先玩。

推送前钩子和 CI 都会跑 `npm run check`（语法、格式、武器数据、数值护栏），CI 再确认游戏能构建，一共约 1 分钟。
不过就推不上去：格式问题用 `npm run format` 修，改了数值后用 `npm run balance` 重新生成报告。浏览器测试现在暂停使用（见下文）。

## 小改动：直接推 `main`

```sh
git switch main && git pull
# 改完
npm run check && npm run build
git commit -am "Fix the pause menu overlapping the timer"
git push
```

推上去后 CI 会再检查和构建一次，变红就马上修或回滚（见下文）。

## 大改动：走 Pull Request

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
   npm test           # 不开浏览器的测试：僵尸导航和游玩日志（几秒）
   npm run verify     # 以上三步一起跑（约半分钟）
   ```


3. **提交**

   提交信息用英文祈使句，首字母大写，说清楚玩家或开发者能看到的变化，例如
   `Give the menus a wok-kitchen identity of their own`、`Fix touch movement on iPhone`。
   需要解释原因时空一行写正文。一个提交只做一件事；只 `git add` 自己改的文件。

4. **开 Pull Request**

   ```sh
   git push -u origin HEAD
   gh pr create --fill
   ```

   - CI 跑「Check and build」（约 1 分钟）。
   - 游戏本身在 Vercel 预览地址上自己玩一遍。浏览器里的自动测试（`npm run test:e2e`、`npm run arsenal:test`）暂停使用，
     代码还在，以后需要时再拿出来跑。
   - Vercel 会在 PR 里贴出预览地址。在预览地址上实际玩一遍受影响的部分，再按模板勾选验证项。
   - 画面、界面、特效改动附上截图或录屏。

5. **合并**

   「Check and build」通过后用 **Squash and merge** 合并，并删除分支。合并后 Vercel 自动部署生产环境，
   用 `npx vercel@latest ls wok-ing-dead` 确认部署成功，再打开线上地址看一眼。

## 出了问题怎么回滚

- 最快：在 Vercel 控制台把上一个正常的部署 Promote 回生产（或 `npx vercel@latest rollback`）。
- 然后修正 `main`：PR 合进来的就在 GitHub 上对那个 PR 点 Revert；直接推的就 `git revert <提交>` 再推送。

## 几条约定

- `upstream/` 是提取时的原件，不要修改。
- 界面文案只改 `src/i18n/locales/`，四种语言一起改，然后重新生成界面字体子集（见 [素材来源与许可](docs/assets.md#界面字体)）。
- 新增外部素材（贴图、模型、音效、字体）要在 [docs/assets.md](docs/assets.md) 写明来源和许可，只用 CC0 或 OFL 这类允许再分发的素材。
- 依赖需要时手动升级。`three` 不要升级：它的附加模块要和 `src/game.js` 内嵌的 Three.js r180 保持一致。
- 构建产物（`dist/`、`dist-single/`）、测试报告不进仓库。
