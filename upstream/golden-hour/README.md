# GOLDEN HOUR — Solstice Hotel

来源：https://claude.ai/artifact/6N9gzgYJDa925a1tVxps2f  
下载日期：2026-11-12。用户指定保留的游戏参考。

[浏览预览](index.html) · [代码定位](CODEMAP.md) · [来源与 SHA-256](provenance.json)

## 收录内容

原始页面与约 2.8 MB 的已发布 JavaScript 包，含酒店场景、程序材质与几何体、武器、人物、K9 单位、玻璃破碎、特效、Web Audio 声音与界面。程序加载时生成资源，本次本地启动资源记录只出现游戏 JS 和 favicon 请求，没有额外下载的模型、贴图或声音文件。

- `original/`：未经修改的下载原件。HTML 含 Claude 注入的宿主运行时。
- `play.html`：移除宿主运行时并修正 JS 相对路径的本地入口，游戏程序未修改。
- `readable/game.js`：格式化后的完整程序，包含第三方引擎；符号仍为压缩名，不是作者原始源码模块。
- `CODEMAP.md`、`code-index.json`：按酒店、家具、材质、武器、声音等用途定位代码。
- `previews/lobby.jpg`：本地渲染的大堂参考图；隐藏过场淡入遮罩，不含 HUD。
- `previews/gameplay.jpg`：进入对局倒计时时的画布记录，画面处于淡入阶段。
- `tools/prepare.py`：验证原件哈希，重建本地入口。

## 适合研究的内容

- 酒店大堂空间：挑高、二层回廊、接待台、座椅组与植物。
- 写实室内材质：石材地面反射、透光石材台面、木饰面、金属与布艺。
- 场景道具与光照：吊灯、台灯、沙发、茶几、花瓶及暖色光照。
- 武器：KR-7 CARBINE、VESPER 9、M12 BREACHER、STRIX 9，以及配件与迷彩相关界面/生成逻辑。
- 动态反馈：玻璃破碎、物理道具与合成音效。

这些仍是参考生成代码，尚未单独导出 GLB、PBR 贴图或 WAV，也没有接入《行尸走镬》。是否复用每项资产还需结合风格与性能评估。

## 本地查看

在仓库根目录执行：

```sh
python3 -m http.server 8877 --directory upstream/golden-hour
```

打开 `http://127.0.0.1:8877/`。首次运行需等待材质、家具与武器生成。

已验证本地 `GH.ready` 为 true，并通过页面 DEPLOY 按钮进入 playing/countdown 状态；未完整测试比赛流程。启动及进入对局时未观察到外部美术依赖，不据此承诺所有未触发功能均无外部依赖。

## 许可

未确认游戏本身的复用许可证，先作内部参考。包内第三方库的许可证不能替代游戏美术与代码的授权。原件字节、来源与派生修改均记录在 provenance.json。
