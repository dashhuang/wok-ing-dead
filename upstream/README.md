# 游戏参考档案

保留原始发布内容、来源记录和研究用派生资料，方便以后按需评估；未接入《行尸走镬》的运行时或部署资源。

| 项目 | 入口 | 优先参考方向 |
| --- | --- | --- |
| CORDON 9 | [说明](cordon9/README.md) · [图片与音效浏览](cordon9/index.html) | 写实夜雨街道、僵尸、枪械、封锁线与野战设施 |
| SUBLEVEL 07 | [说明](sublevel07/README.md) · [游戏原件](sublevel07/original/demos/04-fps/index.html) | 湿地反射、锈蚀金属、地下设施；附材质/模型/音效实验 |
| GOLDEN HOUR | [说明](golden-hour/README.md) · [预览](golden-hour/index.html) | 酒店大堂、石材与木饰面、家具、暖色光照 |

原有 `artifact.html` 与 `provenance.json` 是本项目基于的 Saltline 发布原件，保持不变。此前排除的 Gilt & Gutter、Mini FPS、BLACK DOOR 等候选不收录。

## 使用与许可

先看各项目 README 和 provenance.json。程序生成的几何体、贴图与声音不一定有独立 GLB / PNG / WAV；每份档案已说明哪些导出完成、哪些仅保存生成代码。

SUBLEVEL 07 附 MIT 许可；CORDON 9 与 GOLDEN HOUR 未确认游戏复用授权。归档不等于准许发布，第三方引擎许可不覆盖游戏美术。素材接入须另行评估风格、性能和许可，见 [素材来源与许可](../docs/assets.md)。

本地可在仓库根目录执行 `python3 -m http.server 8877 --directory upstream`，再访问对应子目录。部分原件仍需联网加载引擎；GOLDEN HOUR 使用 `golden-hour/play.html` 运行。
