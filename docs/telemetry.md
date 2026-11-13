# 游玩日志与数值统计

浏览器 → 同源 `/api/telemetry` → Vercel Function → Neon Postgres。
数据库与游戏绑定，数据库口令只留在服务端。日志失败不会阻塞开局或改变战斗规则。

## 记录内容与口径

每局独立 UUID；同一浏览器用本地随机 UUID 关联重试。清理浏览器数据后会成为新玩家。
不记录姓名、邮箱、完整 User-Agent、网址、键盘原始输入或 IP。
接收端用每日变化的 IP HMAC 做每分钟限流，限流桶保留一天，不写进游玩记录。

开局、死亡、通关、主动重开立即保存累计快照，其余每 30 秒保存一次。
切后台和 pagehide 尝试补传。手机挂起、断网或关闭页面不直接判死亡：
超过五分钟未收到记录的未结算局，在查询视图中显示 `interrupted`；回来补传后恢复。
因此它表示“失联或挂起”，不能当作准确的主动退出原因。

字段包括：

- 构建 commit、关卡、模式、开局难度（中途改难度的局归入 mixed）、画质、输入方式、每局起始时间。
- 游戏内经过时间 `duration`（遵循游戏时钟）；前台操作时间 `activeSeconds`（1 秒采样，排除暂停、选小票）。
- 结局、击杀、累计承受伤害、生命、小票等级、炉灶进度、波次、关底是否出现或被击杀。
- 携带武器、等级与分支、调料、四种弹药池余量、实际捡入的弹药量。
- 小票的候选与选择（最多 128 次），对应的游戏时刻。
- 每把武器的前台持有时长、持有期间发生的击杀、消耗的弹匣单位。

`weaponUse.spent` 是弹匣单位：普通枪为发数，喷火器为燃料刻度，不能直接横向比较。
无弹匣的近战武器不靠这个字段统计攻击次数。返还的弹药不当作负消耗。
`ammoReceived` 统计实际装进弹药池的拾取量；开局配给、调料提升上限、卡片直接补满不算拾取。
`killsWhileHeld` 不是归因伤害：换枪后的燃烧、延迟爆炸等也会贡献击杀；不要用它宣称某枪的精确伤害或命中率。
第一版不采集完整战斗逐帧日志或位置热图。

靶场、调试参数、自动化浏览器、本地版本及非生产环境带 `test=true`，默认汇总排除。
开发模式和单文件离线版不上传。生产构建可设置 `VITE_TELEMETRY_ENABLED=0` 关闭。

## 持久化与保留

- `play_runs`：每局最新累计快照，保留 90 天。
- `play_samples`：过程快照，保留 30 天。
- `play_run_results`：查询视图，计算失联状态，不修改原始结局。
- `play_limits`：按网络来源限流，每分钟 120 次，保留一天。
- 每天 03:17 UTC 由 Vercel Cron 清理过期数据。

按 `(run_id, seq)` 去重；旧快照和结束后到达的心跳不能覆盖结算。
客户端只保留最近 12 局未确认的累计快照，最多七天；成功请求才删缓存，持久化失败则留内存。
离线时过程快照会合并，关闭浏览器、清理缓存或长期断网仍可能丢数据，不能保证每次游玩完整收到。
这是一套浏览器自报的平衡性统计，不用于防作弊、计费或排行榜。

## 部署

1. 给 Vercel 项目 `wok-ing-dead` 连接 Neon，设置生产环境 `DATABASE_URL`。
2. 设置两个独立随机密钥（至少 32 字符）：`TELEMETRY_ADMIN_TOKEN` 和 `CRON_SECRET`。
3. `TELEMETRY_ORIGINS` 代码默认只允许 `https://wok-ing-dead.vercel.app`；生产环境配置为
   `https://wok-ing-dead.vercel.app,https://wok.huang.co`，同时允许新旧域名。变更环境变量后需重新部署。
   预览地址默认不能写生产日志；如需测试，使用单独测试库和允许的预览域名。
4. 拉取环境变量到被 git 忽略的文件后初始化：

   ```sh
   npx vercel@latest env pull .env.telemetry.local --environment=production
   node --env-file=.env.telemetry.local scripts/telemetry/migrate.mjs
   ```

5. 部署代码后先确认 `/api/telemetry-summary` 未认证返回 401，再用管理密钥查汇总。
   数据库表结构不在公开写接口中自动建立；变更表结构应先跑迁移。

Neon 免费套餐有存储额度：快照多于最终记录，应观察使用量，达到容量前缩短过程快照保留期或升级。
不在请求中打印载荷、口令或连接串。服务出错返回 503，浏览器稍后补传。
`Origin` 检查和限流降低误发/滥用，不代表客户端记录可信。

## 查统计

用管理密钥调用 `GET /api/telemetry-summary?days=7&release=<commit>`，`days` 范围 1–90，省略 release 查所有版本。
返回版本 × 关卡 × 模式 × 难度的玩家数、局数、通关/死亡/中断数量、通关率、平均死亡时间，
以及携带武器的局数、等级、结局和死亡分钟分布。

通关率分母只含 `dead + complete`，同时列出未完成局，避免把中断算成失败或隐藏流失。
武器表按“带过最终快照里的这把武器”的局数统计，不能排除玩家水平、解锁进度与存活者偏差。
选用率可以用 `payload->'choices'` 分析候选/选择；调料和武器分支也保存在 payload 中。
详细分析可在 Neon SQL Editor 查询，例如：

```sql
SELECT payload->>'release' AS release,
       payload->>'difficulty' AS difficulty,
       choice->>'id' AS chosen, count(*) AS picks
FROM play_run_results,
     LATERAL jsonb_array_elements(payload->'choices') choice
WHERE NOT (payload->>'test')::boolean
GROUP BY 1, 2, 3;
```

## 验证

`npm run test:telemetry` 验证输入校验、访问限制、离线补传和请求竞态。
有 `DATABASE_URL` 时还会在真实数据库插入测试局，验证重复/乱序/结束后的更新并删除测试记录：

```sh
node --env-file=.env.telemetry.local --test tests/telemetry/*.test.mjs
```

真实点击冒烟测试拦截上传并校验结构，检查死亡局、重试的新 UUID、小票与弹药消耗。
测试不将模拟成绩写入生产统计。

查询脚本：`node --env-file=<管理密钥文件> scripts/telemetry/report.mjs 7`，可在天数后再传 commit。
生产密钥属于 Vercel Secret，env pull 不会取回；管理者应安全保存本地副本，不要将 `[SENSITIVE]` 占位符当作密钥。

## 线上资源（2026-11-13）

- Vercel 项目 `wok-ing-dead`（团队 `dashs-projects-f9665735`）；Neon 资源 `wok-ing-dead-telemetry`（`store_sjjiYmSPeRK6gOSo`），免费方案，只连接 production。
- 生产 Secret：`DATABASE_URL`、`TELEMETRY_ADMIN_TOKEN`、`CRON_SECRET`。管理查询密钥在 Dash 本机的副本是 `~/.config/wok-ing-dead/telemetry.env`（权限 0600）。
  不要把密钥的值输出到聊天、写进代码或文档。
- 上线时（PR #12）用线上的真实鼠标操作开局、选武器、死亡，确认了 5 次快照入库（含结算）、管理查询返回 200、无令牌或错误令牌返回 401，
  测试局也排除在正式统计之外。之后每次改动日志都要核对实时部署。
- 当时 Neon 免费方案的项目数被一个旧库占满：`neon-ai-notify` 是已停服的 Pingro 的业务库（约 3.38 GiB，最后查询记录 2026-05-17）。
  经 Dash 同意已经删除，并断开了 Pingro 的连接。其他旧资源没动。
