# 音频素材

游戏里只有僵尸的嗓音是录音素材，其余声音（枪声、脚步、雨、警报器、城市环境声、音乐）都在运行时合成，不占包体。

## 僵尸嗓音：`public/assets/audio/zombie/`

- 来源：OpenGameArt 的 “Zombies Sound Pack”（下载包 `zombies.zip`，内含 `zombie-1.wav` … `zombie-24.wav`，44.1 kHz / 24-bit / 立体声）。
- 许可：CC0（公有领域），无需署名。
- 页面地址应为 <https://opengameart.org/content/zombies-sound-pack>。该站拒绝自动化访问，地址和作者名没有在本机核对过，发布前请人工确认一次。
- 24 个源文件全部用上，没有多余文件。另一个 CC0 素材包 “80 CC0 creature SFX” 评估后没有采用：全是不到 1.3 秒的卡通化怪物音，和这套嗓音不是同一个声线。

处理流程：左右声道取平均 → 45 Hz 高通去掉低频隆隆声 → 按 -38 dB 门限裁掉首尾静音（前留 12 ms、后留 50 ms）→ 4 ms 淡入、35 ms 淡出 →
峰值归一到 -1.5 dBFS → `afconvert` 以最高质量重采样到 24 kHz / 16-bit / 单声道 → 重写为标准 44 字节 RIFF 头。合计 24 个文件、约 0.9 MB、18.7 秒。

“响度修正”是按 ITU-R BS.1770 K 计权量出的各文件响度与中位数之差，写在 `src/chinatown/audio.js` 的 `VOICE_FILES` 里，播放时补偿，文件本身不改。

| 文件 | 源文件 | 时长 | 响度修正 | 用途 |
| --- | --- | --- | --- | --- |
| `moan_1.wav` | `zombie-16.wav` | 1.42 s | +2.2 dB | 游荡时的呻吟（`enemy:voice` kind `moan`） |
| `moan_2.wav` | `zombie-18.wav` | 1.10 s | -0.6 dB | 同上 |
| `moan_3.wav` | `zombie-1.wav` | 0.81 s | +2.2 dB | 同上 |
| `moan_4.wav` | `zombie-15.wav` | 0.84 s | -0.4 dB | 同上 |
| `growl_1.wav` | `zombie-17.wav` | 1.55 s | +0.3 dB | 追击时的低吼（`growl`）；听到枪声转向时也用 |
| `growl_2.wav` | `zombie-21.wav` | 1.07 s | +0.4 dB | 同上 |
| `growl_3.wav` | `zombie-19.wav` | 0.96 s | +1.9 dB | 同上 |
| `growl_4.wav` | `zombie-14.wav` | 0.65 s | -0.2 dB | 同上 |
| `scream_1.wav` | `zombie-8.wav` | 0.80 s | -0.6 dB | 发现玩家时的尖叫（`scream`）；远处的嚎叫也取自这一组 |
| `scream_2.wav` | `zombie-10.wav` | 0.66 s | -2.4 dB | 同上 |
| `scream_3.wav` | `zombie-12.wav` | 0.77 s | +0.8 dB | 同上 |
| `scream_4.wav` | `zombie-9.wav` | 0.84 s | +3.0 dB | 同上 |
| `scream_5.wav` | `zombie-2.wav` | 0.68 s | +0.1 dB | 同上 |
| `grunt_1.wav` | `zombie-3.wav` | 0.57 s | -0.1 dB | 出手前的闷哼（`grunt`） |
| `grunt_2.wav` | `zombie-4.wav` | 0.72 s | -1.2 dB | 同上 |
| `grunt_3.wav` | `zombie-6.wav` | 0.52 s | -1.7 dB | 同上 |
| `grunt_4.wav` | `zombie-7.wav` | 0.57 s | -1.7 dB | 同上 |
| `pain_1.wav` | `zombie-5.wav` | 0.47 s | -1.2 dB | 中弹未死时的短叫（`enemy:hit`） |
| `pain_2.wav` | `zombie-11.wav` | 0.50 s | +0.0 dB | 同上 |
| `pain_3.wav` | `zombie-13.wav` | 0.54 s | +1.3 dB | 同上 |
| `pain_4.wav` | `zombie-24.wav` | 0.33 s | -0.1 dB | 同上 |
| `death_1.wav` | `zombie-20.wav` | 0.93 s | +1.1 dB | 断气声（`enemy:killed`），播放时音高逐渐下滑 |
| `death_2.wav` | `zombie-23.wav` | 0.78 s | +2.3 dB | 同上 |
| `death_3.wav` | `zombie-22.wav` | 0.65 s | +2.0 dB | 同上 |

分类依据是对每个文件的时长、包络、音高轨迹和频谱重心的分析（稳定的 80–95 Hz 长音归为呻吟，沙哑的持续音归为低吼，
400–600 Hz 的高亮音归为尖叫，起音陡的短音归为闷哼和痛叫，逐渐衰减的归为断气），没有经过人耳试听。如果某个文件听起来放错了组，
只需在 `VOICE_FILES` 里挪动它并相应改文件名。

远处的尸群低语没有单独的文件：加载完成后，用呻吟、低吼和断气三组素材降速叠加，离线渲染成一段 13 秒的无缝循环。

## 运行时合成的声音（无素材文件）

定义在 `src/chinatown/audio.js` 的 `SOUNDS` 表里，由 `game.js` 音频分区的合成队列生成：

| 名称 | 内容 |
| --- | --- |
| `impact_enemy` | 子弹打进尸体（替换原来的金属装甲声） |
| `z_headshot` | 爆头：骨裂、喷溅、落在湿地上的碎屑 |
| `z_bodyfall` | 尸体倒地 |
| `z_shuffle` / `z_slap` | 僵尸拖步 / 奔跑时的湿脚步 |
| `z_maul` | 僵尸打中玩家 |
| `z_chime` / `z_shutter` | 铺面的风铃 / 被风吹动的卷帘门 |
| `z_farsiren` / `z_alarm` | 远处的警车警笛 / 无人理会的汽车防盗器 |

三个疏散警报器不是采样也不是预先合成的缓冲，而是实时振荡器：按“电机通断、转子带惯性”的模型驱动两个相差小三度的音，
所以剪线时的抖动和断电后的降速都是连续算出来的。
