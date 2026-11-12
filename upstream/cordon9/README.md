# CORDON 9 素材库（参考用）

来源：<https://cordon9.pplx.app/>，2026-11-12 下载。夜雨中的封锁线 FPS：步枪/手枪、僵尸尸潮、无人机空投，
两张地图（Halsey Street 检查站街道、Thornwake 运动场疏散点）。

**这个站点没有任何素材文件。** 整个游戏只有一个 3 MB 的 HTML（Three.js r180 + 游戏代码，esbuild 打包、未压缩），
站点上其他路径都返回 404。模型、贴图、音效、音乐全部在加载时用代码生成（加载页上自己写着
"No asset files. No models, no image textures, no audio samples"）。所以这里保存的是：

1. 原件，
2. 按打包注释拆回的源码模块（这才是真正的「素材」：每个道具、僵尸、武器、材质、声音都是一段生成器），
3. 用这些生成器离线导出的音效 WAV 和预览图，方便直接翻看和试听。

归档共约 28 MB，其中音效约 10 MB、预览图约 13 MB。

## 许可

站点没有写许可证，也没有署名。目前只能当参考资料：可以学习做法、对照效果，**不要把代码或导出的音效原样放进我们发布的游戏**。
要用的话，先确认作者和授权，或者参照思路自己重写。内嵌的 Three.js 是 MIT。

## 目录

| 路径 | 内容 |
| --- | --- |
| `cordon9.html` | 原件，未改动，双击即可离线运行（sha256 见 `provenance.json`） |
| `provenance.json` | 来源、日期、哈希、许可说明 |
| `index.html` | 本地浏览页：全部预览图和音效播放器 |
| `src/` | 82 个源码模块，按 `// src/...` 打包注释拆出；不含 Three.js。变量名是打包后的（如 `G4`、`R4`），模块间没有 import，只能阅读，不能直接运行 |
| `audio/` | 65 个声音、134 个 WAV（16-bit，单声道；枪声尾音是立体声），按类别分目录；`index.json` 记录采样率、时长、是否循环 |
| `previews/` | 72 张 1600×900 截图（high 画质）；`_capture.json` 记录每张对应的 URL 参数 |
| `tools/` | `split.py` 拆源码、`export-audio.mjs` 导出音效、`capture-previews.mjs` 截预览图、`build-index.py` 生成浏览页 |

## 内容一览

### 武器 `src/weapon/`

| 模块 | 内容 | 预览 |
| --- | --- | --- |
| `rifle.js` | KR-58 Warden 步枪：护木、导轨、红点镜、战术灯、弹匣、枪托，全部程序建模 | `weapon-rifle.jpg` |
| `pistol.js` | M11 Compact 手枪，套筒行程与弹匣位置参数 | `weapon-pistol.jpg` |
| `hands.js` | 第一人称手套与袖子（按握把姿势弯曲） | `hands.jpg` |
| `viewmodel.js`、`view.js` | 持枪、开镜、换弹、冲刺动作与镜头晃动 | `weapon-viewmodel.jpg` |

### 僵尸 `src/zombie/`

三种体型（`anatomy.js` 的 `TYPES`）：walker（通勤装，100 HP）、runner（病号服，60 HP，速度 2.6）、brute（保安背心，320 HP）。
`seed` 改变长相和衣着。每个僵尸都是现场生成的蒙皮网格，带 LOD。

| 模块 | 内容 |
| --- | --- |
| `anatomy.js`、`body.js` | 体型参数、身体基本形 |
| `head.js`、`hair.js` | 头部、五官、发型 |
| `garments.js`、`shoes.js` | 衣服、鞋 |
| `wounds.js`、`paint.js` | 伤口、血迹、皮肤着色 |
| `skinning.js`、`rig.js` | 自动蒙皮、骨骼与程序化步态 |
| `view.js` | 组装、LOD 切换 |

预览：`zombie-walker.jpg`、`zombie-walker-seed2.jpg`、`zombie-runner.jpg`、`zombie-brute.jpg`、`zombie-lods.jpg`。

### 地图与场景道具 `src/world/`、`src/maps/`

- **Halsey Street**（`maps/halsey.js` + `world/arena.js`、`facade.js`、`ground.js`、`backdrop.js`、`kit_*.js`、`vehicle.js`）：
  检查站街道，23 个机位，见 `map-halsey-*.jpg`。
- **Thornwake Athletic Ground**（`maps/field.js` + `world/fg_*.js`）：运动场疏散点，体育馆、看台、帐篷医院、直升机，
  6 个机位，见 `map-field-f01…f06.jpg`。
- **道具组**（`showcase_world.js`、`fg_showcase.js`）：每组一张 `props-<名字>.jpg`。

| 组 | 所属地图 | 内容 |
| --- | --- | --- |
| `barriers` | Halsey | 新泽西护栏、注水护栏、人群隔离栏、混凝土块、拒马、沙袋 |
| `fence` | Halsey | 围栏板、道闸 |
| `booth` | Halsey | 岗亭、配电柜 |
| `tower` | Halsey | 移动照明塔 |
| `tent` | Halsey | 洗消帐篷 |
| `poles` | Halsey | 路灯、红绿灯 |
| `cars` | Halsey | 轿车 ×2（含警车涂装） |
| `ambo` | Halsey | 救护车 |
| `bus` | Halsey | 公交车 |
| `bld` | Halsey | 街边店铺楼 ×2 |
| `clutter` | Halsey | 裹尸袋、木箱、托盘、轮胎、行李箱、旅行包、垃圾桶、垃圾袋、消防栓、纸箱 |
| `street` | Halsey | 大垃圾箱、长椅、担架床、候车亭、邮筒、烧火桶、井盖、雨水口、弹药箱、医疗包 |
| `traffic` | Halsey | 护柱、锥桶、油桶、路障、路牌、立式指示牌 |
| `fstand` | Thornwake | 看台 |
| `fpress` | Thornwake | 记者席 |
| `fmast` | Thornwake | 泛光灯杆（亮/灭） |
| `fheli` | Thornwake | 军用直升机 |
| `fhall` | Thornwake | 体育馆 |
| `fblock` | Thornwake | 更衣楼、门 |
| `fbus` | Thornwake | 校车 ×2（完好/撞毁） |
| `ftruck` | Thornwake | 军用卡车 ×2 |
| `ftent` | Thornwake | 野战医疗帐篷 |
| `fmed` | Thornwake | 病床（躺尸/用过/翻倒）、输液架、担架、裹尸袋、物资堆、氧气推车、屏风、分诊台、监护仪推车、轮椅、医疗废物桶 |
| `fsport` | Thornwake | 球门、记分牌、球员席、广告牌、角旗、训练器材、踢球墙、长椅、划线器、草坪滚筒、手推车 |
| `fcamp` | Thornwake | 照明塔、三脚灯、发电机、配电箱、沙袋墙、隔离栏、垫板、指路牌、道闸、警戒带 |
| `fserv` | Thornwake | 野战厨房、水罐车、流动厕所、棚屋、垃圾箱、自行车架、公告板、候车亭、公园路灯、限高杆 |
| `fnature` | Thornwake | 阔叶树、枯树、针叶树、树篱、杂草、常春藤、倒木 |
| `fback` | Thornwake | 远景住宅、花园围栏、车库排、电线杆、街道片段 |
| `fschool` | Thornwake | 教学楼 |
| `ffar` | Thornwake | 远景板楼、电塔、水塔 |
| `ffence` | Thornwake | 焊接网围栏、门 |

另有 `world/drone.js`（四旋翼无人机，`drone.jpg`）和 `world/decals.js`、`fg_atlas.js`（Canvas 画的标牌、海报、告示图集）。

### 材质与渲染 `src/mat/`、`src/render/`

- `mat/recipes*.js`、`surface.js`、`baker.js`、`bakequeue.js`：GPU 上烘焙 PBR 贴图（颜色/法线/粗糙度），砖、混凝土、金属、
  布料、皮肤等全靠着色器生成；`decals.js` 是贴花。`kit.jpg` 是材质球展示。
- `render/pipeline.js`、`shaders.js`：渲染管线、体积雾、雨、调色；`look.js` 两套画面风格（`cold` 默认、`classic` 首版）。
- `render/safety.js`、`d3dsafe.js`：WebGL 上下文丢失恢复、Windows/D3D 兼容降级、安全模式。

### 音效 `src/audio/audio.js` → `audio/`

全部由 `synthBank()` 合成（噪声、滤波、扫频、共振峰人声），没有采样。

| 目录 | 声音 |
| --- | --- |
| `weapons/` | 步枪、手枪各若干变体，枪声室外尾音（立体声），空仓、换弹全流程（退匣、落地、拍匣、拉栓、上膛）、弹壳 |
| `impacts/` | 命中混凝土、金属、木头、玻璃、肉体，爆头，跳弹 |
| `player/` | 脚步（干/湿）、急停、衣物、受伤、心跳（循环） |
| `zombies/` | 低吼 ×5、咆哮、受伤、死亡、倒地、脚步 |
| `ui/` | 菜单点击、确认/返回、命中/击杀提示、拾取弹药/医疗包、无人机提示 |
| `music/` | 波次开始/清空、死亡，动态配乐的音色：pads ×4、pulse、tick、bell ×6、stab |
| `ambience/` | 雨、城市、发电机、火、电流嗡嗡、无人机（均为循环），警报，雷声 |

配乐不是整段录音，而是 `createAudio()` 里按战斗强度实时排的（BPM 76–120，强度越高加入的层越多），这里只导出了它用的音色。

### 其它

- `game/`：游戏流程与波次（`game.js`）、尸潮 AI（`horde.js`）、玩家与物理、命中材质判定、自动对战测试机器人（`bot.js`）。
- `ui/`：HUD、菜单、小地图、矢量图标（`glyphs.js`）。
- `fx/fx.js`：枪口火焰、弹壳、血雾、火花、雨滴等粒子。

## 在原件里查看

`cordon9.html` 直接用浏览器打开即可游玩。展示模式参数：

| 参数 | 作用 |
| --- | --- |
| `?show=weapon`，`&gun=pistol` | 武器展示 |
| `?show=hand`、`?show=view` | 手部、第一人称持枪 |
| `?show=zombie&ztype=walker\|runner\|brute&zseed=2` | 僵尸，`&lodrow=1&zpose=lod` 并排看 LOD |
| `?show=props&set=<组名>` | 道具组，组名见上表 |
| `?show=arena&map=halsey\|field&pose=<机位>` | 地图机位 |
| `?show=kit`、`?show=drone` | 材质球、无人机 |
| `?map=field` | 直接在运动场开局 |
| `?q=low\|medium\|high` | 画质 |

## 重新生成

在仓库根目录运行（需要 Node 22 和 Chrome）：

```sh
python3 upstream/cordon9/tools/split.py upstream/cordon9/cordon9.html upstream/cordon9
node upstream/cordon9/tools/export-audio.mjs upstream/cordon9/src/audio/audio.js upstream/cordon9/audio
node upstream/cordon9/tools/capture-previews.mjs upstream/cordon9/cordon9.html upstream/cordon9/previews [名字过滤]
python3 upstream/cordon9/tools/build-index.py upstream/cordon9
```
