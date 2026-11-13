import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { parseSnapshot } from "../../server/telemetry/schema.js";
import { database, saveSnapshot } from "../../server/telemetry/db.js";
import handler from "../../api/telemetry.js";
import summary from "../../api/telemetry-summary.js";
const fixture = () => ({
  schema: 1,
  runId: randomUUID(),
  playerId: randomUUID(),
  seq: 1,
  startedAt: Date.now(),
  release: "test",
  stage: "street",
  mode: "mission",
  difficulty: "hard",
  quality: "low",
  input: "mouse",
  test: true,
  outcome: "active",
  duration: 0,
  activeSeconds: 0,
  kills: 0,
  damageTaken: 0,
  health: 100,
  level: 0,
  sirens: 0,
  waves: 0,
  bossSeen: false,
  bossDead: false,
  weapons: [{ id: "pistol", level: 1, branch: "base" }],
  spice: {},
  ammo: {},
  ammoReceived: {},
  weaponUse: {},
  choices: [],
});
const device = {
  os: "android",
  osVersion: "14",
  kind: "Android",
  model: "Pixel 8",
  browser: "chrome",
  browserVersion: "140",
  gpu: "Mali-G715",
  cores: 9,
  memory: 8,
  screen: "412x915",
  dpr: 2.63,
};
const perf = {
  frames: 3600,
  seconds: 72,
  fps: 50,
  p50: 18.5,
  p95: 30.5,
  p99: 48.5,
  slow: 40,
  hitches: 2,
  worst: 180,
  scale: 0.85,
  minScale: 0.7,
  qualityStart: "low",
  autoDrops: 0,
  res: "1080x2400",
  minutes: [{ fps: 50, slow: 1.1, zombies: 12.5 }],
};
const response = () => ({
  code: 200,
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
  },
  status(c) {
    this.code = c;
    return this;
  },
  end() {},
  json(data) {
    this.data = data;
  },
});
test("reject arbitrary fields, invalid counts, stale records and unbounded arrays", () => {
  assert.equal(parseSnapshot(fixture()).schema, 1);
  assert.equal(parseSnapshot({ ...fixture(), device, perf }).perf.fps, 50);
  for (const bad of [
    { device: { ...device, userAgent: "Mozilla/5.0" } },
    { device: { ...device, gpu: "x".repeat(81) } },
    { perf: { ...perf, minutes: Array(61).fill(perf.minutes[0]) } },
  ]) {
    const p = parseSnapshot({ ...fixture(), device, perf, ...bad });
    assert.equal(p.kills, 0);
    assert.equal(bad.device ? p.device : p.perf, undefined);
  }
  for (const extra of [
    { email: "no" },
    { kills: -1 },
    { duration: Infinity },
    { startedAt: 1 },
    { choices: Array(129).fill({}) },
  ])
    assert.throws(() => parseSnapshot({ ...fixture(), ...extra }));
});
test("write endpoint denies foreign origins and summary requires a secret", async () => {
  const r = response();
  await handler(
    { method: "POST", headers: { origin: "https://other.example" } },
    r,
  );
  assert.equal(r.code, 403);
  const a = response();
  await summary({ method: "GET", headers: {} }, a);
  assert.equal(a.code, 401);
  const b = response();
  await handler({ method: "GET", headers: {} }, b);
  assert.equal(b.code, 405);
});
test(
  "database deduplicates retries, ignores older revisions and keeps final outcomes",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const sql = database(),
      p = fixture();
    try {
      await saveSnapshot(sql, p, "development");
      await saveSnapshot(sql, p, "development");
      await saveSnapshot(
        sql,
        { ...p, seq: 3, outcome: "dead", duration: 90 },
        "development",
      );
      await saveSnapshot(sql, { ...p, seq: 2 }, "development");
      await saveSnapshot(sql, { ...p, seq: 4 }, "development");
      const [r] =
        await sql`SELECT seq,payload FROM play_runs WHERE run_id=${p.runId}::uuid`;
      assert.equal(r.seq, 3);
      assert.equal(r.payload.outcome, "dead");
      const [s] =
        await sql`SELECT count(*)::int AS n FROM play_samples WHERE run_id=${p.runId}::uuid`;
      assert.equal(s.n, 2);
    } finally {
      await sql`DELETE FROM play_runs WHERE run_id=${p.runId}::uuid`;
    }
  },
);

test(
  "real ingestion and protected reports agree, excluding test sessions",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const sql = database();
    const p = fixture();
    p.release = `validation-${randomUUID()}`;
    const oldToken = process.env.TELEMETRY_ADMIN_TOKEN;
    const oldEnv = process.env.VERCEL_ENV;
    process.env.TELEMETRY_ADMIN_TOKEN = randomUUID();
    process.env.VERCEL_ENV = "production";
    try {
      const res = response();
      await handler(
        {
          method: "POST",
          headers: {
            origin: "https://wok-ing-dead.vercel.app",
            "content-type": "application/json",
          },
          body: {
            ...p,
            test: false,
            outcome: "complete",
            duration: 600,
            device,
            perf,
          },
          socket: { remoteAddress: "local-test" },
        },
        res,
      );
      assert.equal(res.code, 204);
      const q = fixture();
      await saveSnapshot(
        sql,
        { ...q, runId: randomUUID(), release: p.release, outcome: "dead" },
        "development",
      );
      const report = response();
      await summary(
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${process.env.TELEMETRY_ADMIN_TOKEN}`,
          },
          query: { days: "7", release: p.release },
        },
        report,
      );
      assert.equal(report.code, 200);
      assert.equal(report.data.groups.length, 1);
      assert.equal(report.data.groups[0].runs, 1);
      assert.equal(report.data.groups[0].clears, 1);
      assert.equal(report.data.weapons[0].weapon, "pistol");
      assert.equal(report.data.devices.length, 1);
      assert.equal(report.data.devices[0].model, "Pixel 8");
      assert.equal(Number(report.data.devices[0].fps), 50);
      assert.equal(report.data.fpsByZombies[0].zombies, 10);
    } finally {
      await sql`DELETE FROM play_runs WHERE payload->>'release'=${p.release}`;
      if (oldToken === undefined) delete process.env.TELEMETRY_ADMIN_TOKEN;
      else process.env.TELEMETRY_ADMIN_TOKEN = oldToken;
      if (oldEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = oldEnv;
    }
  },
);
