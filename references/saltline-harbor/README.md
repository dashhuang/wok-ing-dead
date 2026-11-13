# Saltline 港区场景参考

按 Dash 2026-11-13 的要求保留：港区从《行尸走镬》的可玩地图中移除，场景代码继续作为参考。

## 原始发布包

- 来源：[Claude Artifact — Saltline](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp)
- 完整原件：[upstream/artifact.html](../../upstream/artifact.html)，包含场景、渲染、材质、道具及游戏系统。
- 原件来源与 SHA-256：[upstream/provenance.json](../../upstream/provenance.json)。原件保持逐字节不变。

## 可读场景快照

从移除港区前的 `src/game.js` 提取，保留当时本项目的适配；不等同于未经修改的原始模块源码。具体提交、来源文件和区段见 [source.json](source.json)。

| 文件 | 内容与入口 |
| --- | --- |
| [level.js](level.js) | 港区布局、集装箱、棚屋、围栏、目标、出生点和碰撞；`Pg` 创建场景，`uw` 提供搭建工具 |
| [backdrop.js](backdrop.js) | 起重机、货船、撤离船、天际线、海鸥和灯光；`Iv` / `kw` 创建远景 |

这些文件是供阅读的快照，保留原有变量名，依赖原发布包闭包里的 Three.js 别名、几何与材质工具，以及 `G` 上的场景、道具、物理等系统，不能直接当作独立模块运行。
研究依赖或完整运行方式时，对照原始 HTML 或 `source.json` 对应提交的完整 `src/game.js`。

当前游戏不导入这些参考文件，Vite 也不会将其打入游戏构建；`?lvl=harbor` 仍进入唐人街。
